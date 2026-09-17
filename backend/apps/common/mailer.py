from email.utils import formataddr
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection


def _role_label(role):
    return {
        "super_admin": "Administrator",
        "teacher": "Teacher",
        "student": "Student",
    }.get(str(role or ""), "Portal user")


def render_student_email_html(sender, student, subject, message):
    sender_name = sender.get_full_name().strip() or sender.username
    sender_email = (sender.email or "").strip()
    student_name = student.get_full_name().strip() or student.username
    body = escape(message or "").replace("\n", "<br />")
    portal_name = getattr(settings, "PORTAL_PUBLIC_NAME", "MBA Coursework Portal")
    portal_url = getattr(settings, "PORTAL_PUBLIC_URL", "")
    return f"""<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#eef3fb;font-family:Segoe UI,Arial,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbeafe;">
            <tr>
              <td style="background:linear-gradient(135deg,#102a5c,#1d4ed8);padding:22px 28px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:.85;">Superior University Lahore</div>
                <div style="font-size:22px;font-weight:700;margin-top:4px;">{escape(portal_name)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px 28px;">
                <div style="font-size:13px;color:#64748b;margin-bottom:6px;">Official message</div>
                <div style="font-size:20px;font-weight:700;color:#102a5c;">{escape(subject)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0 28px;">
                <table role="presentation" width="100%" style="background:#f8fbff;border:1px solid #e2e8f0;border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px;font-size:13px;color:#334155;">
                      <strong>From:</strong> {escape(sender_name)} ({escape(_role_label(sender.role))})<br />
                      <strong>Email:</strong> {escape(sender_email or "-")}<br />
                      <strong>To:</strong> {escape(student_name)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;font-size:15px;line-height:1.7;color:#1e293b;">
                <p style="margin:0 0 14px 0;">Dear {escape(student_name)},</p>
                <div>{body}</div>
                <p style="margin:22px 0 0 0;">Regards,<br /><strong>{escape(sender_name)}</strong><br />{escape(_role_label(sender.role))}<br />{escape(sender_email)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 22px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                This email was sent from {escape(portal_name)} using {escape(sender_name)}'s portal email.
                Reply directly to this message to contact the sender.
                {f'<br /><a href="{escape(portal_url)}" style="color:#1d4ed8;">{escape(portal_url)}</a>' if portal_url else ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def render_student_email_text(sender, student, subject, message):
    sender_name = sender.get_full_name().strip() or sender.username
    student_name = student.get_full_name().strip() or student.username
    return (
        f"{subject}\n\n"
        f"Dear {student_name},\n\n"
        f"{message}\n\n"
        f"Regards,\n{sender_name}\n{_role_label(sender.role)}\n{sender.email}\n"
    )


def send_student_emails(sender, students, subject, message):
    sender_email = (sender.email or "").strip()
    sender_name = sender.get_full_name().strip() or sender.username
    from_email = formataddr((sender_name, sender_email))
    connection = get_connection()
    sent = 0
    failed = []
    skipped = []

    for student in students:
        to_email = (student.email or "").strip()
        if not to_email:
            skipped.append(student.get_full_name().strip() or student.username)
            continue
        html = render_student_email_html(sender, student, subject, message)
        text = render_student_email_text(sender, student, subject, message)
        email = EmailMultiAlternatives(
            subject=subject,
            body=text,
            from_email=from_email,
            to=[to_email],
            reply_to=[sender_email],
            connection=connection,
        )
        email.attach_alternative(html, "text/html")
        try:
            email.send()
            sent += 1
        except Exception as exc:
            failed.append({"email": to_email, "detail": str(exc)})
    return {"sent": sent, "failed": failed, "skipped": skipped}
