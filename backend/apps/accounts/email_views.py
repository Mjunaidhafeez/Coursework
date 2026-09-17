import json
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.academics.models import Enrollment
from apps.accounts.models import User
from apps.accounts.permissions import IsTeacherOrAdmin
from apps.common.mailer import send_student_emails

MAX_EMAIL_FILES = 5
MAX_EMAIL_FILE_BYTES = 8 * 1024 * 1024
MAX_EMAIL_TOTAL_BYTES = 15 * 1024 * 1024
ALLOWED_EMAIL_FILE_TYPES = {
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt",
    ".csv",
}


def _emailable_students(user, course=None, semester=None, search=""):
    queryset = User.objects.filter(role=User.Role.STUDENT, is_active=True).select_related(
        "student_profile", "student_profile__semester"
    )
    if user.role == User.Role.TEACHER:
        course_ids = list(user.teaching_courses.values_list("id", flat=True))
        student_ids = Enrollment.objects.filter(course_id__in=course_ids).values_list("student_id", flat=True)
        queryset = queryset.filter(id__in=student_ids)
        if course:
            try:
                if int(course) not in course_ids:
                    return queryset.none()
            except (TypeError, ValueError):
                return queryset.none()
    if course:
        queryset = queryset.filter(enrollments__course_id=course)
    if semester:
        queryset = queryset.filter(student_profile__semester_id=semester)
    query = str(search or "").strip()
    if query:
        queryset = queryset.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(username__icontains=query)
            | Q(email__icontains=query)
            | Q(student_profile__student_id__icontains=query)
        )
    return queryset.distinct().order_by("student_profile__student_id", "first_name", "last_name")


def _parse_student_ids(data):
    raw = []
    if hasattr(data, "getlist"):
        raw = [item for item in data.getlist("student_ids") if item not in (None, "")]
    elif data.get("student_ids") not in (None, ""):
        raw = data.get("student_ids")
        raw = raw if isinstance(raw, (list, tuple)) else [raw]
    if len(raw) == 1 and isinstance(raw[0], str):
        value = raw[0].strip()
        if value.startswith("["):
            try:
                raw = json.loads(value)
            except json.JSONDecodeError:
                raw = [item.strip() for item in value.split(",") if item.strip()]
        elif "," in value:
            raw = [item.strip() for item in value.split(",") if item.strip()]
    try:
        return [int(item) for item in raw]
    except (TypeError, ValueError):
        raise ValueError("student_ids must be a list of IDs.")


def _collect_email_attachments(files):
    uploads = []
    if hasattr(files, "getlist"):
        uploads = list(files.getlist("files")) + list(files.getlist("file"))
    else:
        item = files.get("files") or files.get("file")
        if item:
            uploads = item if isinstance(item, (list, tuple)) else [item]
    seen = set()
    unique = []
    for upload in uploads:
        marker = id(upload)
        if marker in seen:
            continue
        seen.add(marker)
        unique.append(upload)
    if len(unique) > MAX_EMAIL_FILES:
        raise ValueError(f"Attach up to {MAX_EMAIL_FILES} files.")
    attachments = []
    total = 0
    for upload in unique:
        name = Path(getattr(upload, "name", "") or "attachment").name.replace("\x00", "").strip() or "attachment"
        suffix = Path(name).suffix.lower()
        if suffix not in ALLOWED_EMAIL_FILE_TYPES:
            raise ValueError(f"{name} is not allowed. Use PDF, Word, PowerPoint, Excel, ZIP, image, TXT or CSV.")
        size = int(getattr(upload, "size", 0) or 0)
        if size <= 0:
            raise ValueError(f"{name} is empty.")
        if size > MAX_EMAIL_FILE_BYTES:
            raise ValueError(f"{name} is larger than 8 MB.")
        total += size
        if total > MAX_EMAIL_TOTAL_BYTES:
            raise ValueError("Attachments together must stay under 15 MB.")
        content = upload.read()
        content_type = getattr(upload, "content_type", "") or "application/octet-stream"
        attachments.append((name, content, content_type))
    return attachments


def _serialize_student(student):
    profile = getattr(student, "student_profile", None)
    return {
        "id": student.id,
        "name": student.get_full_name().strip() or student.username,
        "email": student.email or "",
        "roll_no": getattr(profile, "student_id", "") or "",
        "semester": getattr(getattr(profile, "semester", None), "number", None),
        "has_email": bool((student.email or "").strip()),
    }


@api_view(["GET"])
@permission_classes([IsTeacherOrAdmin])
def email_recipients(request):
    students = _emailable_students(
        request.user,
        course=request.query_params.get("course") or None,
        semester=request.query_params.get("semester") or None,
        search=request.query_params.get("search") or "",
    )
    rows = [_serialize_student(student) for student in students]
    return Response(
        {
            "count": len(rows),
            "with_email": sum(1 for row in rows if row["has_email"]),
            "results": rows,
            "sender": {
                "name": request.user.get_full_name().strip() or request.user.username,
                "email": request.user.email or "",
                "role": request.user.role,
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsTeacherOrAdmin])
def send_student_email(request):
    sender = request.user
    sender_email = (sender.email or "").strip()
    if not sender_email:
        return Response(
            {"detail": "Add your email address first. Emails are sent from your portal email."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    subject = str(request.data.get("subject") or "").strip()
    message = str(request.data.get("message") or "").strip()
    if not subject:
        return Response({"detail": "Subject is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not message:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    mode = str(request.data.get("mode") or "selected").strip().lower()
    students = _emailable_students(
        sender,
        course=request.data.get("course") or None,
        semester=request.data.get("semester") or None,
        search=request.data.get("search") or "",
    )
    if mode != "all":
        try:
            student_ids = _parse_student_ids(request.data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not student_ids:
            return Response({"detail": "Select at least one student."}, status=status.HTTP_400_BAD_REQUEST)
        students = students.filter(id__in=student_ids)

    try:
        attachments = _collect_email_attachments(request.FILES)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    students = list(students)
    if not students:
        return Response({"detail": "No students match this selection."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.EMAIL_HOST and "console" not in str(settings.EMAIL_BACKEND):
        return Response(
            {"detail": "Email server is not configured. Add EMAIL_HOST settings on the server."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = send_student_emails(sender, students, subject, message, attachments=attachments)
    failed_count = len(result["failed"])
    first_error = (result["failed"][0].get("detail") if result["failed"] else "") or ""
    attached_names = [item[0] for item in attachments]
    attached_note = f" with {len(attached_names)} attachment(s)" if attached_names else ""
    return Response(
        {
            "sent_count": result["sent"],
            "failed_count": failed_count,
            "skipped_count": len(result["skipped"]),
            "skipped": result["skipped"][:20],
            "failed": result["failed"][:5],
            "from_email": sender_email,
            "attachments": attached_names,
            "detail": (
                f"Sent {result['sent']} email(s) from {sender_email}{attached_note}."
                + (f" {failed_count} failed. {first_error}" if failed_count else "")
            ),
        },
        status=status.HTTP_200_OK,
    )
