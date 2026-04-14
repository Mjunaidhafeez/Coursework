from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import TimeStampedModel


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        TEACHER = "teacher", "Teacher"
        STUDENT = "student", "Student"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class TeacherProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    department = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return self.user.username


class StudentProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_id = models.CharField(max_length=40, unique=True)
    semester = models.ForeignKey("academics.Semester", on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.student_id}"
