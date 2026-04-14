from django.conf import settings
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


class Enrollment(TimeStampedModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")

    class Meta:
        unique_together = ("student", "course")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student.username} -> {self.course.code}"
