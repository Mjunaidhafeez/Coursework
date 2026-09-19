import csv
import io
import json
from datetime import timedelta

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.accounts.permissions import IsSuperAdmin, IsTeacherOrAdmin
from apps.academics.models import Course, Enrollment, Semester
from apps.common.models import AuditLog
from apps.common.notify import push_notifications
from apps.coursework.models import Coursework, FeedbackGrade, Submission

from .models import (
    Appeal,
    AttendanceRecord,
    AttendanceSession,
    CommentPhrase,
    CourseworkTemplate,
    HelpPage,
    Notice,
    RubricItem,
)
from .serializers import (
    AppealSerializer,
    AttendanceSessionSerializer,
    CommentPhraseSerializer,
    CourseworkTemplateSerializer,
    HelpPageSerializer,
    NoticeSerializer,
    RubricItemSerializer,
)


def _is_admin(user):
    return user.role == User.Role.SUPER_ADMIN


def _is_teacher(user):
    return user.role == User.Role.TEACHER


class NoticeViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["kind", "audience"]
    search_fields = ["title", "body"]
    ordering_fields = ["starts_at", "created_at"]

    def get_queryset(self):
        qs = Notice.objects.filter(is_deleted=False).select_related("course", "created_by")
        user = self.request.user
        if _is_admin(user):
            return qs
        if _is_teacher(user):
            return qs.filter(Q(audience__in=["all", "teachers"]) | Q(course__teachers=user)).distinct()
        return qs.filter(Q(audience__in=["all", "students"]) | Q(course__enrollments__student=user)).distinct()

    def perform_create(self, serializer):
        notice = serializer.save(created_by=self.request.user)
        people = User.objects.filter(is_active=True)
        if notice.audience == "students":
            people = people.filter(role=User.Role.STUDENT)
        elif notice.audience == "teachers":
            people = people.filter(role=User.Role.TEACHER)
        push_notifications(people, notice.title, notice.body[:400])

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "session_date"]

    def get_queryset(self):
        qs = AttendanceSession.objects.select_related("course").prefetch_related("records__student")
        user = self.request.user
        if _is_admin(user):
            return qs
        if _is_teacher(user):
            return qs.filter(course__teachers=user)
        return qs.filter(course__enrollments__student=user).distinct()

    def create(self, request, *args, **kwargs):
        course = request.data.get("course")
        session_date = request.data.get("session_date")
        existing = AttendanceSession.objects.filter(course_id=course, session_date=session_date).first()
        if existing:
            if request.data.get("topic"):
                existing.topic = request.data.get("topic")
                existing.save(update_fields=["topic"])
            return Response(self.get_serializer(existing).data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    @action(detail=True, methods=["post"])
    def mark(self, request, pk=None):
        session = self.get_object()
        rows = request.data.get("records") or []
        for row in rows:
            student_id = row.get("student")
            status_value = row.get("status") or AttendanceRecord.Status.PRESENT
            if not student_id:
                continue
            AttendanceRecord.objects.update_or_create(
                session=session,
                student_id=student_id,
                defaults={"status": status_value},
            )
        return Response(self.get_serializer(session).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        user = request.user
        if user.role == User.Role.STUDENT:
            total = AttendanceRecord.objects.filter(student=user).count()
            present = AttendanceRecord.objects.filter(student=user, status=AttendanceRecord.Status.PRESENT).count()
            late = AttendanceRecord.objects.filter(student=user, status=AttendanceRecord.Status.LATE).count()
            percent = round(((present + late * 0.5) / total) * 100, 1) if total else 0
            return Response({"total": total, "present": present, "late": late, "percent": percent})
        course_id = request.query_params.get("course")
        qs = AttendanceRecord.objects.all()
        if course_id:
            qs = qs.filter(session__course_id=course_id)
        if _is_teacher(user):
            qs = qs.filter(session__course__teachers=user)
        grouped = (
            qs.values("student_id", "student__first_name", "student__last_name", "student__username")
            .annotate(total=Count("id"), present=Count("id", filter=Q(status="present")))
        )
        return Response({"results": list(grouped)})


class AppealViewSet(viewsets.ModelViewSet):
    serializer_class = AppealSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "kind"]

    def get_queryset(self):
        qs = Appeal.objects.select_related("student", "coursework")
        user = self.request.user
        if _is_admin(user):
            return qs
        if _is_teacher(user):
            return qs.filter(coursework__course__teachers=user)
        return qs.filter(student=user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def get_permissions(self):
        if self.action in ["create"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        if request.user.role not in [User.Role.TEACHER, User.Role.SUPER_ADMIN]:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        appeal = self.get_object()
        next_status = str(request.data.get("status") or "").lower()
        if next_status not in ["approved", "rejected"]:
            return Response({"detail": "status must be approved or rejected."}, status=status.HTTP_400_BAD_REQUEST)
        appeal.status = next_status
        appeal.teacher_note = str(request.data.get("teacher_note") or "")[:1000]
        extra = int(request.data.get("extra_days") or appeal.extra_days or 0)
        appeal.extra_days = extra
        if next_status == "approved" and appeal.kind == Appeal.Kind.EXTENSION and extra:
            appeal.coursework.deadline = appeal.coursework.deadline + timedelta(days=extra)
            appeal.coursework.save(update_fields=["deadline"])
        appeal.save()
        push_notifications([appeal.student], f"Appeal {next_status}", appeal.teacher_note or appeal.reason)
        return Response(AppealSerializer(appeal).data)


class HelpPageViewSet(viewsets.ModelViewSet):
    serializer_class = HelpPageSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "slug"

    def get_queryset(self):
        qs = HelpPage.objects.filter(is_deleted=False)
        if not _is_admin(self.request.user):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        slug = serializer.validated_data.get("slug") or slugify(serializer.validated_data.get("title") or "guide")
        serializer.save(slug=slug)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = CourseworkTemplateSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        qs = CourseworkTemplate.objects.filter(is_deleted=False)
        if _is_teacher(self.request.user):
            return qs.filter(created_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class CommentPhraseViewSet(viewsets.ModelViewSet):
    serializer_class = CommentPhraseSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        return CommentPhrase.objects.filter(teacher=self.request.user)

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class RubricViewSet(viewsets.ModelViewSet):
    serializer_class = RubricItemSerializer
    permission_classes = [IsTeacherOrAdmin]
    filterset_fields = ["coursework"]

    def get_queryset(self):
        qs = RubricItem.objects.select_related("coursework")
        if _is_teacher(self.request.user):
            return qs.filter(coursework__course__teachers=self.request.user)
        return qs


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def transcript(request):
    student_id = request.query_params.get("student")
    if request.user.role == User.Role.STUDENT:
        student = request.user
    elif student_id and request.user.role in [User.Role.SUPER_ADMIN, User.Role.TEACHER]:
        student = User.objects.filter(id=student_id, role=User.Role.STUDENT).first()
        if not student:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({"detail": "student is required."}, status=status.HTTP_400_BAD_REQUEST)

    grades = (
        FeedbackGrade.objects.filter(submission__student=student)
        .select_related("submission__coursework__course", "submission")
        .order_by("submission__coursework__course__code")
    )
    rows = []
    obtained = 0
    total = 0
    for item in grades:
        cw = item.submission.coursework
        max_marks = float(cw.max_marks or 0)
        marks = float(item.marks or 0)
        obtained += marks
        total += max_marks
        rows.append(
            {
                "course": cw.course.code,
                "course_title": cw.course.title,
                "assessment": cw.title,
                "marks": marks,
                "max_marks": max_marks,
                "feedback": item.feedback,
            }
        )
    percent = round((obtained / total) * 100, 1) if total else 0
    payload = {
        "student": student.get_full_name().strip() or student.username,
        "username": student.username,
        "rows": rows,
        "obtained": obtained,
        "total": total,
        "percent": percent,
        "generated_at": timezone.now().isoformat(),
    }
    if request.query_params.get("format") == "html":
        lines = "".join(
            f"<tr><td>{r['course']}</td><td>{r['assessment']}</td><td>{r['marks']}</td><td>{r['max_marks']}</td></tr>"
            for r in rows
        )
        html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Transcript</title>
        <style>body{{font-family:Arial;padding:24px}} table{{border-collapse:collapse;width:100%}}
        td,th{{border:1px solid #ccc;padding:8px;text-align:left}}</style></head><body>
        <h1>Official marksheet</h1><p>{payload['student']} ({payload['username']})</p>
        <table><tr><th>Course</th><th>Assessment</th><th>Marks</th><th>Max</th></tr>{lines}</table>
        <p>Total {obtained} / {total} ({percent}%)</p></body></html>"""
        return HttpResponse(html)
    return Response(payload)


@api_view(["POST"])
@permission_classes([IsSuperAdmin])
def bulk_import(request):
    kind = str(request.data.get("kind") or "students").lower()
    upload = request.FILES.get("file")
    if not upload:
        return Response({"detail": "CSV file is required."}, status=status.HTTP_400_BAD_REQUEST)
    text = upload.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    created = 0
    skipped = 0
    errors = []
    for index, row in enumerate(reader, start=2):
        try:
            if kind == "students":
                username = (row.get("username") or row.get("roll") or "").strip()
                if not username:
                    skipped += 1
                    continue
                user, is_new = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "first_name": (row.get("first_name") or "").strip(),
                        "last_name": (row.get("last_name") or "").strip(),
                        "email": (row.get("email") or "").strip(),
                        "phone": (row.get("phone") or "").strip(),
                        "role": User.Role.STUDENT,
                    },
                )
                if is_new:
                    user.set_password(row.get("password") or username)
                    user.save()
                    created += 1
                semester = None
                sem_no = row.get("semester")
                if sem_no:
                    semester = Semester.objects.filter(number=int(sem_no)).first()
                StudentProfile.objects.get_or_create(
                    user=user,
                    defaults={"student_id": row.get("student_id") or username, "semester": semester},
                )
                course_code = (row.get("course") or "").strip()
                if course_code:
                    course = Course.objects.filter(code__iexact=course_code).first()
                    if course:
                        Enrollment.objects.get_or_create(student=user, course=course)
            elif kind == "teachers":
                username = (row.get("username") or row.get("email") or "").strip()
                if not username:
                    skipped += 1
                    continue
                user, is_new = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "first_name": (row.get("first_name") or "").strip(),
                        "last_name": (row.get("last_name") or "").strip(),
                        "email": (row.get("email") or username),
                        "phone": (row.get("phone") or "").strip(),
                        "role": User.Role.TEACHER,
                    },
                )
                if is_new:
                    user.set_password(row.get("password") or "Teacher@123")
                    user.save()
                    created += 1
                TeacherProfile.objects.get_or_create(user=user, defaults={"department": row.get("department") or ""})
            elif kind == "enrollments":
                username = (row.get("username") or row.get("student") or "").strip()
                code = (row.get("course") or row.get("code") or "").strip()
                user = User.objects.filter(username__iexact=username).first()
                course = Course.objects.filter(code__iexact=code).first()
                if user and course:
                    _, is_new = Enrollment.objects.get_or_create(student=user, course=course)
                    if is_new:
                        created += 1
                else:
                    skipped += 1
            else:
                return Response({"detail": "kind must be students, teachers, or enrollments."}, status=400)
        except Exception as exc:
            errors.append({"row": index, "detail": str(exc)})
    return Response({"created": created, "skipped": skipped, "errors": errors})


@api_view(["GET"])
@permission_classes([IsSuperAdmin])
def audit_logs(request):
    qs = AuditLog.objects.select_related("actor").order_by("-created_at")[:300]
    return Response(
        {
            "results": [
                {
                    "id": item.id,
                    "action": item.action,
                    "object_type": item.object_type,
                    "object_id": item.object_id,
                    "actor": item.actor.get_full_name() if item.actor else "",
                    "metadata": item.metadata,
                    "created_at": item.created_at,
                }
                for item in qs
            ]
        }
    )


@api_view(["GET"])
@permission_classes([IsSuperAdmin])
def backup_export(request):
    payload = {
        "users": list(User.objects.values("id", "username", "email", "role", "first_name", "last_name", "phone", "is_active")),
        "courses": list(Course.objects.values("id", "code", "title", "semester_id")),
        "enrollments": list(Enrollment.objects.values("student_id", "course_id")),
        "courseworks": list(Coursework.objects.values("id", "title", "course_id", "deadline", "max_marks")),
        "exported_at": timezone.now().isoformat(),
    }
    response = HttpResponse(json.dumps(payload, default=str, indent=2), content_type="application/json")
    response["Content-Disposition"] = 'attachment; filename="portal-backup.json"'
    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def global_search(request):
    q = str(request.query_params.get("q") or "").strip()
    if len(q) < 2:
        return Response({"results": []})
    user = request.user
    results = []
    courses = Course.objects.filter(Q(code__icontains=q) | Q(title__icontains=q))[:8]
    if user.role == User.Role.TEACHER:
        courses = courses.filter(teachers=user)
    elif user.role == User.Role.STUDENT:
        courses = courses.filter(enrollments__student=user)
    for course in courses.distinct():
        results.append({"type": "course", "id": course.id, "label": f"{course.code} — {course.title}"})
    works = Coursework.objects.filter(title__icontains=q)
    if user.role == User.Role.TEACHER:
        works = works.filter(course__teachers=user)
    elif user.role == User.Role.STUDENT:
        works = works.filter(course__enrollments__student=user)
    for item in works.distinct()[:8]:
        results.append({"type": "assessment", "id": item.id, "label": item.title})
    if user.role == User.Role.SUPER_ADMIN:
        for person in User.objects.filter(
            Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
        )[:8]:
            results.append({"type": "user", "id": person.id, "label": f"{person.get_full_name() or person.username} ({person.role})"})
    return Response({"results": results})


@api_view(["GET", "POST"])
@permission_classes([IsSuperAdmin])
def recycle_bin(request):
    if request.method == "POST":
        notice_id = request.data.get("notice_id")
        if notice_id:
            notice = Notice.objects.filter(id=notice_id, is_deleted=True).first()
            if not notice:
                return Response({"detail": "Notice not found."}, status=404)
            notice.is_deleted = False
            notice.save(update_fields=["is_deleted"])
            return Response({"detail": "Notice restored."})
        user_id = request.data.get("user_id")
        person = User.objects.filter(id=user_id).exclude(role=User.Role.SUPER_ADMIN).first()
        if not person:
            return Response({"detail": "User not found."}, status=404)
        person.is_active = True
        person.save(update_fields=["is_active"])
        return Response({"detail": "User restored."})
    inactive = User.objects.filter(is_active=False).order_by("-id")[:200]
    notices = Notice.objects.filter(is_deleted=True).order_by("-updated_at")[:100]
    return Response(
        {
            "users": [
                {"id": item.id, "username": item.username, "name": item.get_full_name(), "role": item.role}
                for item in inactive
            ],
            "notices": [{"id": item.id, "title": item.title} for item in notices],
        }
    )
