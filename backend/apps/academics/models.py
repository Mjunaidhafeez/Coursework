from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models

from apps.common.models import TimeStampedModel


class Semester(TimeStampedModel):
    number = models.PositiveSmallIntegerField(unique=True)

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"Semester {self.number}"


class Course(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=200)
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name="courses")
    teachers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="teaching_courses", blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.title}"


def course_study_file_path(instance, filename):
    return f"courses/{instance.course_id}/study/{filename}"


class CourseStudyFile(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="study_files")
    title = models.CharField(max_length=200)
    file = models.FileField(
        upload_to=course_study_file_path,
        validators=[FileExtensionValidator(allowed_extensions=["pdf", "docx", "zip", "pptx", "xlsx", "xls", "png", "jpg", "jpeg"])],
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_course_study_files",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.course_id})"


class Enrollment(TimeStampedModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")

    class Meta:
        unique_together = ("student", "course")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student.username} -> {self.course.code}"
