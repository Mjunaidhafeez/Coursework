from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Notice(TimeStampedModel):
    class Kind(models.TextChoices):
        NOTICE = "notice", "Notice"
        EVENT = "event", "Calendar event"

    class Audience(models.TextChoices):
        ALL = "all", "All"
        STUDENTS = "students", "Students"
        TEACHERS = "teachers", "Teachers"

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NOTICE)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    course = models.ForeignKey("academics.Course", on_delete=models.SET_NULL, null=True, blank=True, related_name="notices")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_notices")
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-starts_at", "-created_at"]


class AttendanceSession(TimeStampedModel):
    course = models.ForeignKey("academics.Course", on_delete=models.CASCADE, related_name="attendance_sessions")
    session_date = models.DateField()
    topic = models.CharField(max_length=200, blank=True)
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="marked_attendance")

    class Meta:
        ordering = ["-session_date", "-created_at"]
        unique_together = ("course", "session_date")


class AttendanceRecord(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"

    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)

    class Meta:
        unique_together = ("session", "student")


class Appeal(TimeStampedModel):
    class Kind(models.TextChoices):
        REMARK = "remark", "Remark request"
        EXTENSION = "extension", "Deadline extension"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appeals")
    coursework = models.ForeignKey("coursework.Coursework", on_delete=models.CASCADE, related_name="appeals")
    reason = models.TextField()
    teacher_note = models.TextField(blank=True)
    extra_days = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]


class HelpPage(TimeStampedModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    body = models.TextField()
    audience = models.CharField(max_length=20, default="all")
    is_published = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["title"]


class CourseworkTemplate(TimeStampedModel):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    coursework_type = models.CharField(max_length=50, blank=True)
    submission_type = models.CharField(max_length=20, default="individual")
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    lock_at_due_time = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coursework_templates")
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]


class CommentPhrase(TimeStampedModel):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comment_phrases")
    phrase = models.CharField(max_length=400)

    class Meta:
        ordering = ["phrase"]


class RubricItem(TimeStampedModel):
    coursework = models.ForeignKey("coursework.Coursework", on_delete=models.CASCADE, related_name="rubric_items")
    title = models.CharField(max_length=160)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]
