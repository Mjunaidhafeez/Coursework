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
from apps.common.mailer import default_email_template, send_student_emails

MAX_EMAIL_FILES = 5
MAX_EMAIL_FILE_BYTES = 25 * 1024 * 1024
MAX_EMAIL_TOTAL_BYTES = 25 * 1024 * 1024
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


def _allowed_course_ids(user):
    if user.role == User.Role.TEACHER:
        return list(user.teaching_courses.values_list("id", flat=True))
    return None


def _course_in_scope(user, course):
    if not course:
        return True
    allowed = _allowed_course_ids(user)
    if allowed is None:
        return True
    try:
        return int(course) in allowed
    except (TypeError, ValueError):
        return False


def _search_q(query):
    query = str(query or "").strip()
    if not query:
        return Q()
    return (
        Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
        | Q(username__icontains=query)
        | Q(email__icontains=query)
        | Q(phone__icontains=query)
        | Q(student_profile__student_id__icontains=query)
    )


def _emailable_students(user, course=None, semester=None, search=""):
    queryset = User.objects.filter(role=User.Role.STUDENT, is_active=True).select_related(
        "student_profile", "student_profile__semester"
    )
    allowed = _allowed_course_ids(user)
    if allowed is not None:
        student_ids = Enrollment.objects.filter(course_id__in=allowed).values_list("student_id", flat=True)
        queryset = queryset.filter(id__in=student_ids)
    if not _course_in_scope(user, course):
        return queryset.none()
    if course:
        queryset = queryset.filter(enrollments__course_id=course)
    if semester:
        queryset = queryset.filter(student_profile__semester_id=semester)
    queryset = queryset.filter(_search_q(search))
    return queryset.distinct().order_by("student_profile__student_id", "first_name", "last_name")


def _emailable_teachers(user, course=None, search=""):
    queryset = User.objects.filter(role=User.Role.TEACHER, is_active=True).prefetch_related("teaching_courses")
    allowed = _allowed_course_ids(user)
    if allowed is not None:
        queryset = queryset.filter(teaching_courses__id__in=allowed)
    queryset = queryset.exclude(id=user.id)
    if not _course_in_scope(user, course):
        return queryset.none()
    if course:
        queryset = queryset.filter(teaching_courses__id=course)
    queryset = queryset.filter(_search_q(search))
    return queryset.distinct().order_by("first_name", "last_name", "username")


def _parse_audience(value, user=None):
    audience = str(value or "students").strip().lower()
    if audience not in {"students", "teachers", "both"}:
        return "students"
    return audience


def _emailable_recipients(user, audience="students", course=None, semester=None, search=""):
    audience = _parse_audience(audience, user)
    people = []
    if audience in {"students", "both"}:
        people.extend(list(_emailable_students(user, course=course, semester=semester, search=search)))
    if audience in {"teachers", "both"}:
        people.extend(list(_emailable_teachers(user, course=course, search=search)))
    seen = set()
    unique = []
    for person in people:
        if person.id in seen:
            continue
        seen.add(person.id)
        unique.append(person)
    return unique


def _parse_recipient_ids(data):
    raw = []
    for key in ("recipient_ids", "student_ids"):
        if hasattr(data, "getlist"):
            raw = [item for item in data.getlist(key) if item not in (None, "")]
        elif data.get(key) not in (None, ""):
            raw = data.get(key)
            raw = raw if isinstance(raw, (list, tuple)) else [raw]
        if raw:
            break
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
        raise ValueError("recipient_ids must be a list of IDs.")


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


def _email_template_from_request(data, sender):
    defaults = default_email_template(sender)
    return {
        "header_top": str(data.get("header_top") or defaults["header_top"]).strip()[:120],
        "header_title": str(data.get("header_title") or defaults["header_title"]).strip()[:120],
        "footer": str(data.get("footer") or defaults["footer"]).strip()[:1000],
    }


def _serialize_recipient(person):
    profile = getattr(person, "student_profile", None)
    courses = []
    if getattr(person, "role", "") == User.Role.TEACHER:
        courses = [
            f"{course.code} — {course.title}".strip(" —")
            for course in person.teaching_courses.all()
        ]
    return {
        "id": person.id,
        "name": person.get_full_name().strip() or person.username,
        "email": person.email or "",
        "phone": person.phone or "",
        "role": person.role,
        "roll_no": getattr(profile, "student_id", "") or "",
        "semester": getattr(getattr(profile, "semester", None), "number", None),
        "courses": courses,
        "has_email": bool((person.email or "").strip()),
        "has_phone": bool((person.phone or "").strip()),
    }


@api_view(["GET"])
@permission_classes([IsTeacherOrAdmin])
def email_recipients(request):
    audience = _parse_audience(request.query_params.get("audience"), request.user)
    people = _emailable_recipients(
        request.user,
        audience=audience,
        course=request.query_params.get("course") or None,
        semester=request.query_params.get("semester") or None,
        search=request.query_params.get("search") or "",
    )
    rows = [_serialize_recipient(person) for person in people]
    return Response(
        {
            "count": len(rows),
            "with_email": sum(1 for row in rows if row["has_email"]),
            "student_count": sum(1 for row in rows if row["role"] == User.Role.STUDENT),
            "teacher_count": sum(1 for row in rows if row["role"] == User.Role.TEACHER),
            "audience": audience,
            "results": rows,
            "sender": {
                "name": request.user.get_full_name().strip() or request.user.username,
                "email": request.user.email or "",
                "role": request.user.role,
            },
            "template": default_email_template(request.user),
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
    audience = _parse_audience(request.data.get("audience"), sender)
    recipients = _emailable_recipients(
        sender,
        audience=audience,
        course=request.data.get("course") or None,
        semester=request.data.get("semester") or None,
        search=request.data.get("search") or "",
    )
    if mode != "all":
        try:
            recipient_ids = set(_parse_recipient_ids(request.data))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not recipient_ids:
            return Response({"detail": "Select at least one recipient."}, status=status.HTTP_400_BAD_REQUEST)
        recipients = [person for person in recipients if person.id in recipient_ids]

    try:
        attachments = _collect_email_attachments(request.FILES)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if not recipients:
        return Response({"detail": "No recipients match this selection."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.EMAIL_HOST and "console" not in str(settings.EMAIL_BACKEND):
        return Response(
            {"detail": "Email server is not configured. Add EMAIL_HOST settings on the server."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    template = _email_template_from_request(request.data, sender)
    result = send_student_emails(sender, recipients, subject, message, attachments=attachments, template=template)
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
