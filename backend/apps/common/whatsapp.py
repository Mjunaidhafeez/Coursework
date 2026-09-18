import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from apps.accounts.models import User
from apps.common.uploads import normalize_phone


def whatsapp_enabled():
    return bool(
        getattr(settings, "WHATSAPP_ENABLED", False)
        and getattr(settings, "WHATSAPP_TOKEN", "")
        and getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")
    )


def send_whatsapp(phone, body):
    to = normalize_phone(phone)
    text = str(body or "").strip()
    if not whatsapp_enabled() or not to or not text:
        return False
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text[:4000], "preview_url": False},
    }
    request = Request(
        f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return 200 <= response.status < 300
    except (HTTPError, URLError, TimeoutError, OSError):
        return False


def notify_users_whatsapp(users, body):
    seen = set()
    for user in users:
        phone = normalize_phone(getattr(user, "phone", ""))
        if not phone or phone in seen:
            continue
        seen.add(phone)
        send_whatsapp(phone, body)


def portal_url():
    return str(getattr(settings, "PORTAL_PUBLIC_URL", "") or "").rstrip("/")


def notify_event(users, body):
    suffix = portal_url()
    text = str(body or "").strip()
    if suffix and suffix not in text:
        text = f"{text}\n\nOpen portal: {suffix}"
    notify_users_whatsapp(users, text)


def user_for_whatsapp_phone(phone):
    digits = normalize_phone(phone)
    if not digits:
        return None
    matches = []
    for user in User.objects.exclude(phone="").iterator():
        stored = normalize_phone(user.phone)
        if stored and (stored == digits or stored.endswith(digits[-10:]) or digits.endswith(stored[-10:])):
            matches.append(user)
    return matches[0] if matches else None
