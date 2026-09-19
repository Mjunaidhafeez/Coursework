from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.common.mailer import default_email_template, send_student_emails
from apps.common.models import PortalSettings
from apps.common.notify import push_notifications
from apps.coursework.models import Coursework


class Command(BaseCommand):
    help = "Email and notify students about assessments due in the next 7 days."

    def handle(self, *args, **options):
        settings_row = PortalSettings.load()
        if not settings_row.weekly_digest:
            self.stdout.write("Weekly digest is disabled in Settings.")
            return
        now = timezone.now()
        upcoming = Coursework.objects.filter(deadline__gte=now, deadline__lte=now + timedelta(days=7)).select_related("course")
        if not upcoming.exists():
            self.stdout.write("No upcoming deadlines.")
            return
        lines = [f"- {item.course.code}: {item.title} due {item.deadline:%d %b %Y}" for item in upcoming]
        body = "Assessments due this week:\n" + "\n".join(lines)
        students = User.objects.filter(role=User.Role.STUDENT, is_active=True)
        push_notifications(students, "Weekly deadline digest", body[:400])
        sender = User.objects.filter(role=User.Role.SUPER_ADMIN, is_active=True).first()
        if sender:
            send_student_emails(sender, students, "Weekly deadline digest", body, template=default_email_template(sender))
        self.stdout.write(f"Digest sent to {students.count()} students ({upcoming.count()} assessments).")
