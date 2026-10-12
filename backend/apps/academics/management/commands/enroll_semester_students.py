from django.core.management.base import BaseCommand

from apps.academics.enrollment import enroll_course_semester_students
from apps.academics.models import Course, Enrollment


class Command(BaseCommand):
    help = "Enroll students into courses that match their semester and department."

    def handle(self, *args, **options):
        before = Enrollment.objects.count()
        for course in Course.objects.all():
            enroll_course_semester_students(course)
        created = Enrollment.objects.count() - before
        self.stdout.write(self.style.SUCCESS(f"Created {created} missing course enrollments."))
