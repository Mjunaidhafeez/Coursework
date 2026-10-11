from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class StudentGroup(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class CourseworkType(models.TextChoices):
        ASSIGNMENT = "assignment", "Assignment"
        QUIZ = "quiz", "Quiz"
        EXAM = "exam", "Exam"
        PRESENTATION = "presentation", "Presentation"
        PROJECT = "project", "Project"

    class Scope(models.TextChoices):
        GLOBAL = "global", "Overall (All Courses)"
        COURSE = "course", "Per Course"
        COURSEWORK = "coursework", "Per Coursework"

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        COURSEWORK_SUBMISSION = "coursework_submission", "Coursework Submission"

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.MANUAL)
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.COURSE)
    course = models.ForeignKey(
        "academics.Course", on_delete=models.CASCADE, related_name="student_groups", null=True, blank=True
    )
    coursework = models.ForeignKey(
        "coursework.Coursework", on_delete=models.CASCADE, related_name="student_groups", null=True, blank=True
    )
    semester = models.ForeignKey(
        "academics.Semester", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_groups"
    )
    department = models.ForeignKey(
        "academics.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_groups"
    )
    school_class = models.ForeignKey(
        "academics.SchoolClass", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_groups"
    )
    section = models.ForeignKey(
        "academics.Section", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_groups"
    )
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_groups")
    coursework_type = models.CharField(max_length=20, choices=CourseworkType.choices, default=CourseworkType.PROJECT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["name", "created_at"]

    def __str__(self):
        return self.name


class GroupMember(TimeStampedModel):
    class InvitationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships")
    accepted = models.BooleanField(default=True)
    invitation_status = models.CharField(
        max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.ACCEPTED
    )

    class Meta:
        unique_together = ("group", "student")

    def __str__(self):
        return f"{self.student.username} in {self.group.name}"

    @classmethod
    def active_for_students(cls, student_ids, exclude_group_id=None):
        qs = cls.objects.filter(
            student_id__in=student_ids,
            group__source=StudentGroup.Source.MANUAL,
            group__status__in=[StudentGroup.Status.PENDING, StudentGroup.Status.APPROVED],
        ).exclude(invitation_status=cls.InvitationStatus.REJECTED).select_related("group", "student")
        if exclude_group_id:
            qs = qs.exclude(group_id=exclude_group_id)
        return qs
