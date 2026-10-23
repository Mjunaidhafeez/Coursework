import re

from apps.accounts.models import User
from apps.academics.models import Course, Department
from apps.common.uploads import media_field_url
from apps.groups.models import StudentGroup

from .media import public_media_url
from .models import WebsiteStudent, WebsiteTeacher


def _natural_key(*parts):
    key = []
    for part in parts:
        for token in re.split(r"(\d+)", str(part or "").upper()):
            if token.isdigit():
                key.append(int(token))
            elif token:
                key.append(token)
    return tuple(key)


def _label(user):
    return user.get_full_name().strip() or user.username


def _photo(user, request=None):
    return public_media_url(request, media_field_url(getattr(user, "avatar", None), request) or "")


def portal_teachers(request=None):
    people = (
        User.objects.filter(role=User.Role.TEACHER, is_active=True, teacher_profile__show_on_website=True)
        .select_related("teacher_profile__department_ref")
        .prefetch_related("teaching_courses__semester")
        .order_by("first_name", "last_name", "username")
    )
    rows = []
    for person in people:
        profile = getattr(person, "teacher_profile", None)
        courses = list(person.teaching_courses.all())
        rows.append(
            {
                "id": f"u-{person.id}",
                "source": "portal",
                "name": _label(person),
                "designation": "Faculty",
                "department": (getattr(getattr(profile, "department_ref", None), "name", None) or getattr(profile, "department", "") or ""),
                "degrees": "",
                "bio": "",
                "photo_url": _photo(person, request),
                "subjects": [f"{item.code} — {item.title}" for item in courses],
                "semesters": list(dict.fromkeys(f"Semester {item.semester.number}" for item in courses if item.semester_id)),
            }
        )
    return rows


def portal_students(request=None):
    people = (
        User.objects.filter(role=User.Role.STUDENT, is_active=True, student_profile__show_on_website=True)
        .select_related(
            "student_profile__semester",
            "student_profile__department",
            "student_profile__school_class",
            "student_profile__section",
        )
        .prefetch_related("enrollments__course", "group_memberships__group")
        .order_by(*User.LIST_ORDER)
    )
    rows = []
    for person in people:
        profile = getattr(person, "student_profile", None)
        courses = [item.course for item in person.enrollments.all() if item.course_id]
        groups = [
            item.group.name
            for item in person.group_memberships.all()
            if item.group_id and item.accepted is not False and getattr(item.group, "status", "") == "approved"
        ]
        rows.append(
            {
                "id": f"u-{person.id}",
                "source": "portal",
                "name": _label(person),
                "roll_no": getattr(profile, "student_id", "") or "",
                "semester": f"Semester {profile.semester.number}" if profile and profile.semester_id else "",
                "class_name": getattr(getattr(profile, "school_class", None), "name", "") or "",
                "section": getattr(getattr(profile, "section", None), "name", "") or "",
                "department": getattr(getattr(profile, "department", None), "name", "") or "",
                "note": "",
                "photo_url": _photo(person, request),
                "subjects": [f"{item.code} — {item.title}" for item in courses],
                "groups": groups,
            }
        )
    return rows


def portal_groups(request=None):
    rows = []
    groups = (
        StudentGroup.objects.filter(status=StudentGroup.Status.APPROVED)
        .select_related("course", "course__semester", "course__department")
        .prefetch_related("members__student__student_profile")
    )
    for group in groups:
        members = []
        for item in group.members.all():
            student = item.student
            if not student or not student.is_active or item.accepted is False:
                continue
            profile = getattr(student, "student_profile", None)
            members.append(
                {
                    "name": _label(student),
                    "roll_no": getattr(profile, "student_id", "") or "",
                    "photo_url": _photo(student, request),
                    "is_lead": bool(getattr(item, "is_lead", False)),
                }
            )
        if not members:
            continue
        members.sort(key=lambda row: (not row.get("is_lead"), _natural_key(row.get("roll_no"), row.get("name"))))
        course = group.course
        rows.append(
            {
                "id": group.id,
                "name": group.name,
                "course": f"{course.code} — {course.title}" if course else "",
                "semester": f"Semester {course.semester.number}" if course and course.semester_id else "",
                "department": getattr(getattr(course, "department", None), "name", "") or "",
                "members": members,
            }
        )
    return rows


def merged_directory(request=None):
    teachers = portal_teachers(request)
    students = portal_students(request)
    seen_teacher_names = {item["name"].strip().lower() for item in teachers}
    seen_rolls = {item["roll_no"].strip().lower() for item in students if item.get("roll_no")}
    for item in WebsiteTeacher.objects.filter(published=True):
        key = item.name.strip().lower()
        if key in seen_teacher_names:
            continue
        seen_teacher_names.add(key)
        teachers.append(
            {
                "id": item.id,
                "source": "cms",
                "name": item.name,
                "designation": item.designation,
                "department": item.department,
                "degrees": item.degrees,
                "bio": item.bio,
                "photo_url": public_media_url(request, item.photo_url),
                "subjects": [],
                "semesters": [],
            }
        )
    for item in WebsiteStudent.objects.filter(published=True):
        roll = (item.roll_no or "").strip().lower()
        if roll and roll in seen_rolls:
            continue
        if roll:
            seen_rolls.add(roll)
        students.append(
            {
                "id": item.id,
                "source": "cms",
                "name": item.name,
                "roll_no": item.roll_no,
                "semester": item.semester,
                "class_name": item.class_name,
                "section": "",
                "department": "",
                "note": item.note,
                "photo_url": public_media_url(request, item.photo_url),
                "subjects": [],
                "groups": [],
            }
        )
    teachers.sort(key=lambda row: _natural_key(row.get("name")))
    students.sort(key=lambda row: _natural_key(row.get("roll_no"), row.get("name")))
    groups = portal_groups(request)
    groups.sort(key=lambda row: _natural_key(row.get("name")))
    return {"teachers": teachers, "students": students, "groups": groups}


def portal_counts():
    programmes = Department.objects.count() or Course.objects.count()
    return {
        "students": User.objects.filter(role=User.Role.STUDENT, is_active=True).count(),
        "faculty": User.objects.filter(role=User.Role.TEACHER, is_active=True).count(),
        "programmes": programmes,
    }
