from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.academics.models import Enrollment
from apps.accounts.models import User
from apps.accounts.permissions import IsTeacherOrAdmin
from apps.common.mailer import send_student_emails


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
        raw_ids = request.data.get("student_ids") or []
        try:
            student_ids = [int(item) for item in raw_ids]
        except (TypeError, ValueError):
            return Response({"detail": "student_ids must be a list of IDs."}, status=status.HTTP_400_BAD_REQUEST)
        if not student_ids:
            return Response({"detail": "Select at least one student."}, status=status.HTTP_400_BAD_REQUEST)
        students = students.filter(id__in=student_ids)

    students = list(students)
    if not students:
        return Response({"detail": "No students match this selection."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.EMAIL_HOST and "console" not in str(settings.EMAIL_BACKEND):
        return Response(
            {"detail": "Email server is not configured. Add EMAIL_HOST settings on the server."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = send_student_emails(sender, students, subject, message)
    failed_count = len(result["failed"])
    first_error = (result["failed"][0].get("detail") if result["failed"] else "") or ""
    return Response(
        {
            "sent_count": result["sent"],
            "failed_count": failed_count,
            "skipped_count": len(result["skipped"]),
            "skipped": result["skipped"][:20],
            "failed": result["failed"][:5],
            "from_email": sender_email,
            "detail": (
                f"Sent {result['sent']} email(s) from {sender_email}."
                + (f" {failed_count} failed. {first_error}" if failed_count else "")
            ),
        },
        status=status.HTTP_200_OK,
    )
