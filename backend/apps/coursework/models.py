from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Coursework(TimeStampedModel):
    class CourseworkType(models.TextChoices):
        ASSIGNMENT = "assignment", "Assignment"
        QUIZ = "quiz", "Quiz"
        EXAM = "exam", "Exam"
        PRESENTATION = "presentation", "Presentation"
        PROJECT = "project", "Project"

    class SubmissionType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        GROUP = "group", "Group"
        BOTH = "both", "Both"

    course = models.ForeignKey("academics.Course", on_delete=models.CASCADE, related_name="courseworks")
    title = models.CharField(max_length=200)
    description = models.TextField()
    coursework_type = models.CharField(max_length=20, choices=CourseworkType.choices)
    submission_type = models.CharField(max_length=20, choices=SubmissionType.choices)
    max_group_members = models.PositiveIntegerField(null=True, blank=True)
    lock_at_due_time = models.BooleanField(default=False)
    deadline = models.DateTimeField()
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_courseworks")

    class Meta:
        ordering = ["deadline"]

    def __str__(self):
        return self.title


def submission_upload_path(instance, filename):
    return f"submissions/coursework_{instance.coursework_id}/{filename}"


class Submission(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUBMITTED = "submitted", "Submitted"
        LATE = "late", "Late"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    coursework = models.ForeignKey(Coursework, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions", null=True, blank=True
    )
    group = models.ForeignKey("groups.StudentGroup", on_delete=models.CASCADE, related_name="submissions", null=True, blank=True)
    requested_member_ids = models.JSONField(default=list, blank=True)
    topic = models.CharField(max_length=200, default="")
    file = models.FileField(
        upload_to=submission_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=["pdf", "docx", "zip", "pptx"])],
        null=True,
        blank=True,
    )
    submitted_at = models.DateTimeField(default=timezone.now)
    is_late = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING
    )

    class Meta:
        ordering = ["submitted_at"]

    def save(self, *args, **kwargs):
        self.is_late = self.submitted_at > self.coursework.deadline
        self.status = Submission.Status.LATE if self.is_late else Submission.Status.SUBMITTED
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Submission<{self.id}> for {self.coursework.title}"


def submission_file_upload_path(instance, filename):
    return f"submissions/coursework_{instance.submission.coursework_id}/submission_{instance.submission_id}/{filename}"


class SubmissionFile(TimeStampedModel):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="submission_files")
    file = models.FileField(
        upload_to=submission_file_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=["pdf", "docx", "zip", "pptx"])],
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_submission_files",
    )
    uploaded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["uploaded_at", "created_at"]

    def __str__(self):
        return f"SubmissionFile<{self.id}> for submission {self.submission_id}"


class FeedbackGrade(TimeStampedModel):
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name="feedback_grade")
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="given_feedback")
    feedback = models.TextField(blank=True)
    marks = models.DecimalField(max_digits=6, decimal_places=2)
    overridden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="overridden_feedback"
    )
    override_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["updated_at"]

    def __str__(self):
        return f"Feedback<{self.submission_id}>: {self.marks}"
