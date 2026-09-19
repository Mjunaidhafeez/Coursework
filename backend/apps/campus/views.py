import csv
import io
import json
from calendar import monthrange
from datetime import date, datetime, timedelta

from django.db.models import Count, Prefetch, Q
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
from apps.common.uploads import media_field_url
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


def _parse_iso_date(value, fallback=None):
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return fallback


def _attendance_percent(present, late, absent, leave=0):
    counted = present + late + absent
    if counted <= 0:
        return 100.0 if leave else 0.0
    return round(((present + late) / counted) * 100, 1)


def _student_roll(user):
    return getattr(getattr(user, "student_profile", None), "student_id", "") or ""


def _student_avatar(user, request):
    return media_field_url(getattr(user, "avatar", None), request)


def _student_label(user):
    return user.get_full_name().strip() or user.username


def _period_bounds(period, anchor, date_from, date_to):
    today = timezone.localdate()
    anchor = _parse_iso_date(anchor, today)
    if period == "week":
        weekday = anchor.weekday()
        start = anchor - timedelta(days=weekday)
        return start, start + timedelta(days=6)
    if period == "month":
        last = monthrange(anchor.year, anchor.month)[1]
        return date(anchor.year, anchor.month, 1), date(anchor.year, anchor.month, last)
    start = _parse_iso_date(date_from, anchor)
    end = _parse_iso_date(date_to, today)
    if start > end:
        start, end = end, start
    return start, end


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["course", "session_date"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "mark"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        records = AttendanceRecord.objects.select_related("student", "student__student_profile")
        if user.role == User.Role.STUDENT:
            records = records.filter(student=user)
        qs = AttendanceSession.objects.select_related("course", "marked_by").prefetch_related(Prefetch("records", queryset=records))
        if _is_admin(user):
            return qs
        if _is_teacher(user):
            return qs.filter(course__teachers=user)
        return qs.filter(course__enrollments__student=user).distinct()

    def create(self, request, *args, **kwargs):
        course = request.data.get("course")
        session_date = request.data.get("session_date")
        existing = self.get_queryset().filter(course_id=course, session_date=session_date).first()
        if existing:
            existing.topic = str(request.data.get("topic") or existing.topic or "")[:200]
            existing.marked_by = request.user
            existing.save(update_fields=["topic", "marked_by", "updated_at"])
            return Response(self.get_serializer(existing).data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    @action(detail=True, methods=["post"])
    def mark(self, request, pk=None):
        session = self.get_object()
        allowed = set(AttendanceRecord.Status.values)
        enrolled = set(Enrollment.objects.filter(course=session.course).values_list("student_id", flat=True))
        rows = request.data.get("records") or []
        for row in rows:
            student_id = row.get("student")
            try:
                student_id = int(student_id)
            except (TypeError, ValueError):
                continue
            if student_id not in enrolled:
                continue
            status_value = str(row.get("status") or AttendanceRecord.Status.PRESENT).lower()
            if status_value not in allowed:
                status_value = AttendanceRecord.Status.PRESENT
            AttendanceRecord.objects.update_or_create(
                session=session,
                student_id=student_id,
                defaults={"status": status_value, "remark": str(row.get("remark") or "")[:240]},
            )
        session.marked_by = request.user
        session.save(update_fields=["marked_by", "updated_at"])
        return Response(self.get_serializer(session).data)

    def _scoped_records(self, request, course_id=None, start=None, end=None, student_id=None):
        user = request.user
        qs = AttendanceRecord.objects.select_related(
            "student",
            "student__student_profile",
            "session",
            "session__course",
        )
        if user.role == User.Role.STUDENT:
            qs = qs.filter(student=user)
        elif _is_teacher(user):
            qs = qs.filter(session__course__teachers=user)
        if course_id:
            qs = qs.filter(session__course_id=course_id)
        if start:
            qs = qs.filter(session__session_date__gte=start)
        if end:
            qs = qs.filter(session__session_date__lte=end)
        if student_id and user.role != User.Role.STUDENT:
            qs = qs.filter(student_id=student_id)
        return qs

    def _counts(self, records):
        present = sum(1 for item in records if item.status == AttendanceRecord.Status.PRESENT)
        leave = sum(1 for item in records if item.status == AttendanceRecord.Status.LEAVE)
        absent = sum(1 for item in records if item.status == AttendanceRecord.Status.ABSENT)
        late = sum(1 for item in records if item.status == AttendanceRecord.Status.LATE)
        total = len(records)
        return {
            "present": present,
            "leave": leave,
            "absent": absent,
            "late": late,
            "total": total,
            "percent": _attendance_percent(present, late, absent, leave),
        }

    @action(detail=False, methods=["get"])
    def summary(self, request):
        user = request.user
        if user.role == User.Role.STUDENT:
            counts = self._counts(list(self._scoped_records(request)))
            return Response(counts)
        course_id = request.query_params.get("course")
        qs = self._scoped_records(request, course_id=course_id)
        grouped = {}
        for record in qs:
            bucket = grouped.setdefault(record.student_id, {"student": record.student, "records": []})
            bucket["records"].append(record)
        results = []
        for student_id, bucket in grouped.items():
            person = bucket["student"]
            results.append(
                {
                    "student_id": student_id,
                    "student__first_name": person.first_name,
                    "student__last_name": person.last_name,
                    "student__username": person.username,
                    "name": _student_label(person),
                    "roll_no": _student_roll(person),
                    **self._counts(bucket["records"]),
                }
            )
        results.sort(key=lambda row: (row.get("roll_no") or "", row.get("name") or ""))
        return Response({"results": results})

    @action(detail=False, methods=["get"])
    def report(self, request):
        course_id = request.query_params.get("course")
        student_id = request.query_params.get("student")
        period = str(request.query_params.get("period") or "range").lower()
        start, end = _period_bounds(
            period,
            request.query_params.get("date"),
            request.query_params.get("from") or request.query_params.get("date_from"),
            request.query_params.get("to") or request.query_params.get("date_to"),
        )
        sessions_qs = self.get_queryset().filter(session_date__gte=start, session_date__lte=end)
        if course_id:
            sessions_qs = sessions_qs.filter(course_id=course_id)
        sessions = list(sessions_qs.order_by("session_date", "id"))
        records = list(self._scoped_records(request, course_id=course_id, start=start, end=end, student_id=student_id))
        students_map = {}
        if course_id and request.user.role != User.Role.STUDENT:
            enrollments = (
                Enrollment.objects.filter(course_id=course_id)
                .select_related("student", "student__student_profile")
                .order_by("student__student_profile__student_id", "student__first_name")
            )
            if student_id:
                enrollments = enrollments.filter(student_id=student_id)
            for enrollment in enrollments:
                person = enrollment.student
                students_map[person.id] = {
                    "student_id": person.id,
                    "name": _student_label(person),
                    "roll_no": _student_roll(person),
                    "avatar": _student_avatar(person, request),
                    "records": [],
                }
        for record in records:
            person = record.student
            bucket = students_map.setdefault(
                person.id,
                {
                    "student_id": person.id,
                    "name": _student_label(person),
                    "roll_no": _student_roll(person),
                    "avatar": _student_avatar(person, request),
                    "records": [],
                },
            )
            bucket["records"].append(record)

        session_payload = [
            {
                "id": item.id,
                "session_date": item.session_date,
                "topic": item.topic,
                "course": item.course_id,
                "course_code": item.course.code,
                "course_title": item.course.title,
            }
            for item in sessions
        ]
        students = []
        for bucket in students_map.values():
            days = {}
            for record in bucket["records"]:
                key = str(record.session.session_date)
                days[key] = {
                    "status": record.status,
                    "remark": record.remark,
                    "session_id": record.session_id,
                    "course_code": record.session.course.code,
                    "topic": record.session.topic,
                }
            students.append(
                {
                    "student_id": bucket["student_id"],
                    "name": bucket["name"],
                    "roll_no": bucket["roll_no"],
                    "avatar": bucket["avatar"],
                    "days": days,
                    **self._counts(bucket["records"]),
                }
            )
        students.sort(key=lambda row: (row.get("roll_no") or "", row.get("name") or ""))
        course = Course.objects.filter(id=course_id).first() if course_id else None
        return Response(
            {
                "period": period,
                "from": start,
                "to": end,
                "course": course.id if course else None,
                "course_code": course.code if course else "",
                "course_title": course.title if course else "",
                "sessions": session_payload,
                "students": students,
            }
        )


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
