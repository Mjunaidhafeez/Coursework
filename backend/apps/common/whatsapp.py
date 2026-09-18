import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from apps.accounts.models import User
from apps.common.uploads import normalize_phone


def get_whatsapp_config():
    token = str(getattr(settings, "WHATSAPP_TOKEN", "") or "")
    phone_id = str(getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "") or "")
    verify = str(getattr(settings, "WHATSAPP_VERIFY_TOKEN", "") or "mba-whatsapp")
    env_enabled = bool(getattr(settings, "WHATSAPP_ENABLED", False))
    try:
        from apps.common.models import WhatsAppSettings

        row = WhatsAppSettings.load()
        if row.token:
            token = row.token
        if row.phone_number_id:
            phone_id = row.phone_number_id
        if row.verify_token:
            verify = row.verify_token
        portal_configured = bool(row.token or row.phone_number_id or row.enabled)
        enabled = bool((row.enabled if portal_configured else env_enabled) and token and phone_id)
    except Exception:
        enabled = bool(env_enabled and token and phone_id)
    return {
        "enabled": enabled,
        "token": token,
        "phone_number_id": phone_id,
        "verify_token": verify or "mba-whatsapp",
    }


def whatsapp_enabled():
    return get_whatsapp_config()["enabled"]


def _graph(path, method="GET", payload=None):
    config = get_whatsapp_config()
    if not config["token"]:
        return None, "WhatsApp token is missing."
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    request = Request(
        f"https://graph.facebook.com/v21.0/{path.lstrip('/')}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {config['token']}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8") or "{}"
            return json.loads(raw), ""
    except HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("error", {}).get("message") or ""
        except Exception:
            detail = str(exc.reason or exc)
        return None, detail or "WhatsApp API request failed."
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        return None, str(exc) or "Could not reach WhatsApp."


def subscribe_whatsapp_app():
    config = get_whatsapp_config()
    if not config["token"] or not config["phone_number_id"]:
        return False, "Save Phone number ID and token first."
    data, error = _graph(f"{config['phone_number_id']}?fields=whatsapp_business_account")
    waba = ((data or {}).get("whatsapp_business_account") or {}).get("id")
    if not waba:
        return False, error or "Could not read the WhatsApp Business account."
    data, error = _graph(f"{waba}/subscribed_apps", method="POST")
    if data is None:
        return False, error
    return True, "WhatsApp replies are subscribed."


def mark_webhook(note):
    try:
        from django.utils import timezone

        from apps.common.models import WhatsAppSettings

        row = WhatsAppSettings.load()
        row.last_webhook_at = timezone.now()
        row.last_webhook_note = str(note or "")[:200]
        row.save(update_fields=["last_webhook_at", "last_webhook_note", "updated_at"])
    except Exception:
        pass


def send_whatsapp(phone, body):
    to = normalize_phone(phone)
    text = str(body or "").strip()
    config = get_whatsapp_config()
    if not config["enabled"] or not to or not text:
        return False, "WhatsApp is not connected or the phone number is missing."
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text[:4000], "preview_url": False},
    }
    request = Request(
        f"https://graph.facebook.com/v21.0/{config['phone_number_id']}/messages",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {config['token']}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            if 200 <= response.status < 300:
                return True, ""
            return False, "WhatsApp did not accept the message."
    except HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("error", {}).get("message") or ""
        except Exception:
            detail = str(exc.reason or exc)
        return False, detail or "WhatsApp API rejected the message."
    except (URLError, TimeoutError, OSError) as exc:
        return False, str(exc) or "Could not reach WhatsApp."


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
