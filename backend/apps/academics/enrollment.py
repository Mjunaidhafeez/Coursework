from django.db.models import Q

from apps.accounts.models import User

from .models import Course, Enrollment


def sync_student_enrollments(student, course_ids):
    wanted = set(Course.objects.filter(id__in=course_ids).values_list("id", flat=True))
    existing = set(Enrollment.objects.filter(student=student).values_list("course_id", flat=True))
    Enrollment.objects.filter(student=student, course_id__in=(existing - wanted)).delete()
    Enrollment.objects.bulk_create(
        [Enrollment(student=student, course_id=course_id) for course_id in (wanted - existing)],
        ignore_conflicts=True,
    )


def home_courses_for_student(student):
    profile = getattr(student, "student_profile", None)
    if not profile or not profile.semester_id:
        return Course.objects.none()
    qs = Course.objects.filter(semester_id=profile.semester_id)
    if getattr(profile, "department_id", None):
        qs = qs.filter(Q(department_id=profile.department_id) | Q(department__isnull=True))
    return qs


def enroll_student_in_home_courses(student):
    Enrollment.objects.bulk_create(
        [Enrollment(student=student, course_id=course.id) for course in home_courses_for_student(student)],
        ignore_conflicts=True,
    )


def enroll_course_semester_students(course):
    qs = User.objects.filter(
        role=User.Role.STUDENT,
        is_active=True,
        student_profile__semester_id=course.semester_id,
    )
    if course.department_id:
        qs = qs.filter(student_profile__department_id=course.department_id)
    Enrollment.objects.bulk_create(
        [Enrollment(student_id=student_id, course=course) for student_id in qs.values_list("id", flat=True)],
        ignore_conflicts=True,
    )
