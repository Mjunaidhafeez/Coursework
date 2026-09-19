from copy import deepcopy

from django.conf import settings as django_settings

DEFAULT_MODULES = {
    "teacher": {
        "courses": True,
        "coursework": True,
        "groups": True,
        "submissions": True,
        "grading": True,
        "email": True,
        "whatsapp": True,
        "messages": True,
        "calendar": True,
        "attendance": True,
        "appeals": True,
        "help": True,
        "templates": True,
        "comments": True,
        "queue": True,
        "rubric": True,
    },
    "student": {
        "courses": True,
        "groups": True,
        "grades": True,
        "submit": True,
        "messages": True,
        "calendar": True,
        "attendance": True,
        "transcript": True,
        "appeals": True,
        "help": True,
        "deadlines": True,
    },
}

DEFAULT_LABELS = {
    "admin": {
        "dashboard": "Dashboard",
        "users": "User Center",
        "super_admins": "Manage Super Admins",
        "semesters": "Semesters",
        "students": "Manage Students",
        "teachers": "Manage Teachers",
        "courses": "Manage Courses",
        "coursework": "Assessment Creation",
        "approvals": "Assessment Approvals",
        "groups": "Group Approvals",
        "reports": "Course Result",
        "email": "Email",
        "whatsapp": "WhatsApp",
        "messages": "Messages",
        "settings": "Settings",
        "website": "Website",
        "calendar": "Calendar",
        "import": "Bulk import",
        "audit": "Audit log",
        "backup": "Backup",
        "recycle": "Recycle bin",
        "help": "Help guides",
        "search": "Search",
    },
    "teacher": {
        "dashboard": "Dashboard",
        "courses": "My Courses",
        "coursework": "Assessment",
        "groups": "Student Groups",
        "submissions": "Submissions",
        "grading": "Course Result",
        "email": "Email",
        "whatsapp": "WhatsApp",
        "messages": "Messages",
        "calendar": "Calendar",
        "attendance": "Attendance",
        "appeals": "Appeals",
        "help": "Help",
        "templates": "Templates",
        "comments": "Comment bank",
        "queue": "Grading queue",
        "rubric": "Rubric",
    },
    "student": {
        "dashboard": "Dashboard",
        "courses": "My Courses",
        "groups": "Class Groups",
        "grades": "Course Result",
        "submit": "Assessment Workflow",
        "messages": "Messages",
        "calendar": "Calendar",
        "attendance": "Attendance",
        "transcript": "Transcript",
        "appeals": "Appeals",
        "help": "Help",
        "deadlines": "My deadlines",
    },
}

LOCKED_KEYS = {"dashboard"}


def _merge_map(defaults, raw):
    merged = deepcopy(defaults)
    if not isinstance(raw, dict):
        return merged
    for role, values in raw.items():
        if role not in merged or not isinstance(values, dict):
            continue
        for key, value in values.items():
            if key not in merged[role]:
                continue
            if isinstance(merged[role][key], bool):
                merged[role][key] = bool(value)
            else:
                text = str(value or "").strip()
                if text:
                    merged[role][key] = text[:80]
    return merged


def branding_payload(row):
    return {
        "app_name": row.app_name or "MBA Coursework Portal",
        "university_name": row.university_name or "Superior University Lahore",
        "tagline": row.tagline or "Student Assessment Tracking",
        "login_subtitle": row.login_subtitle or "Sign in to manage coursework, submissions, and results.",
        "footer_text": row.footer_text or "",
        "sidebar_title": row.sidebar_title or "",
        "admin_header": row.admin_header or row.app_name,
        "teacher_header": row.teacher_header or "Teacher Dashboard",
        "student_header": row.student_header or "Student Dashboard",
        "login_button_text": row.login_button_text or "Sign in",
        "theme": row.theme or "navy",
        "logo_url": row.logo_url or "",
        "login_background_url": row.login_background_url or "",
        "modules": _merge_map(DEFAULT_MODULES, row.modules),
        "labels": _merge_map(DEFAULT_LABELS, row.labels),
        "weekly_digest": bool(row.weekly_digest),
    }


def full_payload(row):
    data = branding_payload(row)
    data["defaults"] = {
        "modules": DEFAULT_MODULES,
        "labels": DEFAULT_LABELS,
        "locked": sorted(LOCKED_KEYS),
    }
    return data


def apply_updates(row, data):
    text_fields = [
        "app_name",
        "university_name",
        "tagline",
        "login_subtitle",
        "footer_text",
        "sidebar_title",
        "admin_header",
        "teacher_header",
        "student_header",
        "login_button_text",
        "logo_url",
        "login_background_url",
    ]
    for field in text_fields:
        if field in data and data[field] is not None:
            setattr(row, field, str(data[field]).strip())
    if data.get("theme") in {choice[0] for choice in row.Theme.choices}:
        row.theme = data["theme"]
    if "modules" in data:
        row.modules = _merge_map(DEFAULT_MODULES, data.get("modules"))
        for role in row.modules:
            for key in LOCKED_KEYS:
                if key in row.modules[role]:
                    row.modules[role][key] = True
    if "labels" in data:
        row.labels = _merge_map(DEFAULT_LABELS, data.get("labels"))
    if "weekly_digest" in data:
        row.weekly_digest = bool(data.get("weekly_digest"))
    row.save()
    return row


def portal_name():
    try:
        from .models import PortalSettings

        return PortalSettings.load().app_name or getattr(django_settings, "PORTAL_PUBLIC_NAME", "MBA Coursework Portal")
    except Exception:
        return getattr(django_settings, "PORTAL_PUBLIC_NAME", "MBA Coursework Portal")


def portal_university():
    try:
        from .models import PortalSettings

        return PortalSettings.load().university_name or "Superior University Lahore"
    except Exception:
        return "Superior University Lahore"
