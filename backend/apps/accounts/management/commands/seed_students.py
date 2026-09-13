from django.core.management.base import BaseCommand

from apps.academics.models import Course, Enrollment, Semester
from apps.accounts.data.mba_f25_students import DEFAULT_PASSWORD, student_records
from apps.accounts.models import StudentProfile, User


class Command(BaseCommand):
    help = "Seed MBA F25 students from the class roll list."

    def add_arguments(self, parser):
        parser.add_argument("--semester", type=int, default=3)

    def handle(self, *args, **options):
        semester, _ = Semester.objects.get_or_create(number=options["semester"])
        created = 0
        updated = 0

        for row in student_records():
            user, was_created = User.objects.get_or_create(
                username=row["username"],
                defaults={
                    "email": row["email"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "role": User.Role.STUDENT,
                },
            )
            user.email = row["email"]
            user.first_name = row["first_name"]
            user.last_name = row["last_name"]
            user.role = User.Role.STUDENT
            user.set_password(DEFAULT_PASSWORD)
            user.save()

            StudentProfile.objects.update_or_create(
                user=user,
                defaults={"student_id": row["roll_no"], "semester": semester},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        semester_courses = list(Course.objects.filter(semester=semester))
        semester_student_ids = list(
            User.objects.filter(role=User.Role.STUDENT, student_profile__semester=semester).values_list("id", flat=True)
        )
        enrollments = [
            Enrollment(student_id=student_id, course=course)
            for course in semester_courses
            for student_id in semester_student_ids
        ]
        if enrollments:
            Enrollment.objects.bulk_create(enrollments, ignore_conflicts=True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created + updated} students ({created} created, {updated} updated). "
                f"Username = padded roll no. Password = {DEFAULT_PASSWORD}."
            )
        )
