from email.utils import formataddr, formatdate, make_msgid
from html import escape
from urllib.parse import urlparse

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection


def _role_label(role):
    return {
        "super_admin": "Administrator",
        "teacher": "Teacher",
        "student": "Student",
    }.get(str(role or ""), "Portal user")


def _smtp_from():
    return (getattr(settings, "EMAIL_HOST_USER", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()


def _message_id_domain():
    smtp_from = _smtp_from()
    if "@" in smtp_from:
        return smtp_from.rsplit("@", 1)[-1].strip().lower()
    portal_url = getattr(settings, "PORTAL_PUBLIC_URL", "") or ""
    host = urlparse(portal_url).hostname or ""
    return host or "mba.pythonanywhere.com"


def default_email_template(sender=None):
    sender_name = ""
    if sender:
        sender_name = sender.get_full_name().strip() or sender.username
    portal_name = getattr(settings, "PORTAL_PUBLIC_NAME", "MBA Coursework Portal")
    portal_url = getattr(settings, "PORTAL_PUBLIC_URL", "")
    footer = f"This is a coursework notice from {portal_name}.\nReply to this email to contact {sender_name or 'the sender'}."
    if portal_url:
        footer = f"{footer}\n{portal_url}"
    return {
        "header_top": "Superior University Lahore",
        "header_title": portal_name,
        "footer": footer,
    }


def _template_text(template, key, fallback, limit):
    value = str((template or {}).get(key) or "").strip()
    if not value:
        return fallback
    return value[:limit]


def render_student_email_html(sender, student, subject, message, attachment_names=None, template=None):
    sender_name = sender.get_full_name().strip() or sender.username
    sender_email = (sender.email or "").strip()
    student_name = student.get_full_name().strip() or student.username
    body = escape(message or "").replace("\n", "<br />")
    defaults = default_email_template(sender)
    header_top = escape(_template_text(template, "header_top", defaults["header_top"], 120))
    header_title = escape(_template_text(template, "header_title", defaults["header_title"], 120))
    footer = escape(_template_text(template, "footer", defaults["footer"], 1000)).replace("\n", "<br />")
    names = [escape(name) for name in (attachment_names or []) if name]
    attachments_html = ""
    if names:
        attachments_html = (
            "<p style=\"margin:16px 0 0 0;font-size:13px;color:#334155;\">"
            f"Attached: {', '.join(names)}</p>"
        )
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:20px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #d7dee8;">
            <tr>
              <td style="background:#102a5c;padding:18px 24px;color:#ffffff;">
                {f'<div style="font-size:12px;letter-spacing:0.4px;">{header_top}</div>' if header_top else ""}
                {f'<div style="font-size:20px;font-weight:700;margin-top:4px;">{header_title}</div>' if header_title else ""}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px 8px 24px;">
                <div style="font-size:18px;font-weight:700;color:#102a5c;">{escape(subject)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;font-size:13px;color:#334155;line-height:1.6;">
                From: {escape(sender_name)} ({escape(_role_label(sender.role))})<br />
                Reply to: {escape(sender_email or "-")}<br />
                To: {escape(student_name)}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;font-size:15px;line-height:1.7;color:#1f2937;">
                <p style="margin:0 0 14px 0;">Dear {escape(student_name)},</p>
                <div>{body}</div>
                {attachments_html}
                <p style="margin:22px 0 0 0;">
                  Regards,<br />
                  {escape(sender_name)}<br />
                  {escape(_role_label(sender.role))}<br />
                  {escape(sender_email)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 18px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
                {footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def render_student_email_text(sender, student, subject, message, attachment_names=None, template=None):
    sender_name = sender.get_full_name().strip() or sender.username
    student_name = student.get_full_name().strip() or student.username
    defaults = default_email_template(sender)
    header_top = _template_text(template, "header_top", defaults["header_top"], 120)
    header_title = _template_text(template, "header_title", defaults["header_title"], 120)
    footer = _template_text(template, "footer", defaults["footer"], 1000)
    names = [name for name in (attachment_names or []) if name]
    attached = f"\nAttached: {', '.join(names)}\n" if names else ""
    heading = " / ".join(part for part in (header_top, header_title) if part)
    return (
        f"{heading}\n{subject}\n\n"
        f"Dear {student_name},\n\n"
        f"{message}\n"
        f"{attached}\n"
        f"Regards,\n{sender_name}\n{_role_label(sender.role)}\n{sender.email}\n\n"
        f"{footer}\n"
    )


def send_student_emails(sender, students, subject, message, attachments=None, template=None):
    sender_email = (sender.email or "").strip()
    sender_name = sender.get_full_name().strip() or sender.username
    defaults = default_email_template(sender)
    header_title = _template_text(template, "header_title", defaults["header_title"], 120)
    smtp_from = _smtp_from() or sender_email
    from_email = formataddr((f"{sender_name} via {header_title}", smtp_from))
    connection = get_connection()
    sent = 0
    failed = []
    skipped = []
    msgid_domain = _message_id_domain()
    attachments = list(attachments or [])
    attachment_names = [item[0] for item in attachments if item and item[0]]

    for student in students:
        to_email = (student.email or "").strip()
        if not to_email:
            skipped.append(student.get_full_name().strip() or student.username)
            continue
        html = render_student_email_html(sender, student, subject, message, attachment_names, template)
        text = render_student_email_text(sender, student, subject, message, attachment_names, template)
        headers = {
            "Date": formatdate(localtime=True),
            "Message-ID": make_msgid(domain=msgid_domain),
        }
        if sender_email:
            headers["Reply-To"] = formataddr((sender_name, sender_email))
        email = EmailMultiAlternatives(
            subject=subject,
            body=text,
            from_email=from_email,
            to=[to_email],
            reply_to=[formataddr((sender_name, sender_email))] if sender_email else None,
            connection=connection,
            headers=headers,
        )
        email.attach_alternative(html, "text/html")
        for filename, content, content_type in attachments:
            email.attach(filename, content, content_type or "application/octet-stream")
        try:
            email.send()
            sent += 1
        except Exception as exc:
            failed.append({"email": to_email, "detail": str(exc)})
    return {"sent": sent, "failed": failed, "skipped": skipped}
