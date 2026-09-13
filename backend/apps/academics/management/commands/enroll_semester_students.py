from django.core.management.base import BaseCommand

from apps.academics.models import Course, Enrollment
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Enroll every student into all courses of their semester."

    def handle(self, *args, **options):
        created = 0
        for course in Course.objects.all():
            student_ids = User.objects.filter(
                role=User.Role.STUDENT,
                student_profile__semester_id=course.semester_id,
            ).values_list("id", flat=True)
            enrollments = [
                Enrollment(student_id=student_id, course=course)
                for student_id in student_ids
            ]
            if not enrollments:
                continue
            created += len(Enrollment.objects.bulk_create(enrollments, ignore_conflicts=True))

        self.stdout.write(self.style.SUCCESS(f"Created {created} missing course enrollments."))
