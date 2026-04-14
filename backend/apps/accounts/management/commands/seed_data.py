from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.academics.models import Course, Enrollment, Semester
from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.coursework.models import Coursework


class Command(BaseCommand):
    help = "Seed demo data for the MBA coursework portal."

    def handle(self, *args, **kwargs):
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@example.com", "role": User.Role.SUPER_ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin.set_password("AdminPass123!")
        admin.save()

        semesters = [Semester.objects.get_or_create(number=i)[0] for i in range(1, 9)]

        teacher, _ = User.objects.get_or_create(
            username="teacher1", defaults={"email": "teacher1@example.com", "role": User.Role.TEACHER}
        )
        teacher.set_password("TeacherPass123!")
        teacher.save()
        TeacherProfile.objects.get_or_create(user=teacher, defaults={"department": "Business Administration"})

        student, _ = User.objects.get_or_create(
            username="student1", defaults={"email": "student1@example.com", "role": User.Role.STUDENT}
        )
        student.set_password("StudentPass123!")
        student.save()
        StudentProfile.objects.get_or_create(user=student, defaults={"student_id": "MBA001", "semester": semesters[0]})

        course, _ = Course.objects.get_or_create(
            code="MBA101", defaults={"title": "Strategic Management", "semester": semesters[0]}
        )
        course.teachers.add(teacher)
        Enrollment.objects.get_or_create(student=student, course=course)

        Coursework.objects.get_or_create(
            course=course,
            title="Case Study Report",
            defaults={
                "description": "Submit a case analysis.",
                "coursework_type": Coursework.CourseworkType.ASSIGNMENT,
                "submission_type": Coursework.SubmissionType.INDIVIDUAL,
                "deadline": timezone.now() + timedelta(days=7),
                "max_marks": 100,
                "created_by": teacher,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
