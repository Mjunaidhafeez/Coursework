import json

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.email_views import _emailable_recipients, _parse_audience, _parse_recipient_ids
from apps.accounts.models import User
from apps.accounts.permissions import IsTeacherOrAdmin
from apps.common.messaging import add_members, find_direct_conversation, post_message
from apps.common.models import ChatMessage, Conversation, WhatsAppSettings
from apps.common.uploads import normalize_phone
from apps.common.whatsapp import (
    get_whatsapp_config,
    mark_webhook,
    send_whatsapp,
    subscribe_whatsapp_app,
    user_for_whatsapp_phone,
)


def _admins():
    return list(User.objects.filter(role=User.Role.SUPER_ADMIN, is_active=True).order_by("id"))


def _inbound_conversation(user):
    last = (
        ChatMessage.objects.filter(conversation__memberships__user=user)
        .exclude(sender=user)
        .select_related("conversation")
        .order_by("-created_at")
        .first()
    )
    if last:
        return last.conversation
    admins = _admins()
    admin = next((person for person in admins if person.id != user.id), admins[0] if admins else None)
    if not admin:
        return None
    if admin.id == user.id:
        conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT, created_by=user, title="WhatsApp")
        add_members(conversation, [user])
        return conversation
    existing = find_direct_conversation(user, admin)
    if existing:
        return existing
    conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT, created_by=user, title="WhatsApp")
    add_members(conversation, [user, admin])
    return conversation


def _unmatched_inbox(phone, body):
    admins = _admins()
    if not admins:
        return False
    title = f"WhatsApp {phone}"
    conversation = Conversation.objects.filter(kind=Conversation.Kind.BROADCAST, title=title).first()
    if not conversation:
        conversation = Conversation.objects.create(
            kind=Conversation.Kind.BROADCAST,
            created_by=admins[0],
            title=title,
        )
        add_members(conversation, admins)
    post_message(conversation, admins[0], body, source=ChatMessage.Source.WHATSAPP, skip_whatsapp=True)
    return True


def _serialize_settings(request, subscribe_detail=""):
    config = get_whatsapp_config()
    token = config["token"]
    base = request.build_absolute_uri("/").rstrip("/")
    from django.conf import settings as django_settings

    public = str(getattr(django_settings, "PORTAL_PUBLIC_URL", "") or base).rstrip("/")
    row = WhatsAppSettings.load()
    return {
        "enabled": config["enabled"],
        "configured": bool(token and config["phone_number_id"]),
        "token_set": bool(token),
        "token_hint": f"••••{token[-4:]}" if len(token) >= 4 else "",
        "phone_number_id": config["phone_number_id"],
        "verify_token": config["verify_token"],
        "webhook_url": f"{public}/api/common/whatsapp/webhook/",
        "last_webhook_at": row.last_webhook_at,
        "last_webhook_note": row.last_webhook_note or "",
        "subscribe_detail": subscribe_detail,
    }


@csrf_exempt
@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_webhook(request):
    config = get_whatsapp_config()
    if request.method == "GET":
        mode = str(request.query_params.get("hub.mode") or "")
        token = str(request.query_params.get("hub.verify_token") or "")
        challenge = str(request.query_params.get("hub.challenge") or "")
        if mode == "subscribe" and token and token == config["verify_token"]:
            return HttpResponse(challenge, content_type="text/plain")
        return Response({"detail": "Invalid verify token."}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data if isinstance(request.data, dict) else {}
    if not payload.get("entry"):
        try:
            payload = json.loads((request.body or b"").decode("utf-8") or "{}")
        except Exception:
            payload = {}
    stored = 0
    incoming = 0
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for item in value.get("messages") or []:
                incoming += 1
                phone = normalize_phone(item.get("from"))
                msg_type = str(item.get("type") or "text")
                if msg_type == "text":
                    body = ((item.get("text") or {}).get("body") or "").strip()
                else:
                    payload_item = item.get(msg_type) or {}
                    body = str(payload_item.get("caption") or "").strip() or f"[WhatsApp {msg_type}]"
                if not body:
                    continue
                sender = user_for_whatsapp_phone(phone)
                try:
                    if sender:
                        conversation = _inbound_conversation(sender)
                        if not conversation:
                            continue
                        post_message(conversation, sender, body, source=ChatMessage.Source.WHATSAPP)
                    elif phone and _unmatched_inbox(phone, body):
                        pass
                    else:
                        continue
                    stored += 1
                except (ValueError, PermissionError):
                    continue
    if incoming:
        mark_webhook(f"Received {incoming} WhatsApp reply(ies), saved {stored}.")
    elif payload.get("entry"):
        mark_webhook("Meta reached the portal, but no reply text was in this event.")
    else:
        mark_webhook("Meta reached the portal with an empty webhook.")
    return Response({"status": "ok", "stored": stored})


@api_view(["GET", "PATCH"])
@permission_classes([IsTeacherOrAdmin])
def whatsapp_settings(request):
    if request.method == "PATCH":
        if request.user.role != User.Role.SUPER_ADMIN:
            return Response({"detail": "Only admin can change WhatsApp settings."}, status=status.HTTP_403_FORBIDDEN)
        row = WhatsAppSettings.load()
        if "enabled" in request.data:
            row.enabled = str(request.data.get("enabled")).lower() in {"1", "true", "yes", "on"}
        if "phone_number_id" in request.data:
            row.phone_number_id = str(request.data.get("phone_number_id") or "").strip()
        if "verify_token" in request.data:
            row.verify_token = str(request.data.get("verify_token") or "mba-whatsapp").strip() or "mba-whatsapp"
        token = str(request.data.get("token") or "").strip()
        if token:
            row.token = token
        row.save()
        _ok, subscribe_detail = subscribe_whatsapp_app()
        return Response(_serialize_settings(request, subscribe_detail))
    return Response(_serialize_settings(request))


@api_view(["POST"])
@permission_classes([IsTeacherOrAdmin])
def send_whatsapp_messages(request):
    config = get_whatsapp_config()
    if not config["enabled"]:
        return Response(
            {"detail": "WhatsApp is not connected. Admin must save the WhatsApp API settings first."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    message = str(request.data.get("message") or request.data.get("body") or "").strip()
    if not message:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    test_phone = normalize_phone(request.data.get("test_phone") or "")
    if test_phone:
        ok, error = send_whatsapp(test_phone, message)
        if not ok:
            return Response({"detail": error or "Test message failed."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"sent_count": 1, "failed_count": 0, "skipped_count": 0, "detail": "Test WhatsApp sent."})

    mode = str(request.data.get("mode") or "selected").strip().lower()
    audience = _parse_audience(request.data.get("audience"), request.user)
    if request.user.role == User.Role.TEACHER:
        audience = "students"
    recipients = _emailable_recipients(
        request.user,
        audience=audience,
        course=request.data.get("course") or None,
        semester=request.data.get("semester") or None,
        search=request.data.get("search") or "",
    )
    if mode != "all":
        try:
            recipient_ids = set(_parse_recipient_ids(request.data))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not recipient_ids:
            return Response({"detail": "Select at least one recipient."}, status=status.HTTP_400_BAD_REQUEST)
        recipients = [person for person in recipients if person.id in recipient_ids]
    if not recipients:
        return Response({"detail": "No recipients match this selection."}, status=status.HTTP_400_BAD_REQUEST)

    sent = 0
    skipped = []
    failed = []
    for person in recipients:
        phone = normalize_phone(person.phone)
        if not phone:
            skipped.append({"id": person.id, "name": person.get_full_name() or person.username, "detail": "No phone"})
            continue
        conversation = find_direct_conversation(request.user, person)
        if not conversation:
            conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT, created_by=request.user)
            add_members(conversation, [request.user, person])
        try:
            post_message(conversation, request.user, message, skip_whatsapp=True)
        except Exception as exc:
            failed.append({"id": person.id, "name": person.get_full_name() or person.username, "detail": str(exc)})
            continue
        ok, error = send_whatsapp(phone, f"{request.user.get_full_name().strip() or request.user.username}: {message}")
        if ok:
            sent += 1
        else:
            failed.append({"id": person.id, "name": person.get_full_name() or person.username, "detail": error})
    return Response(
        {
            "sent_count": sent,
            "failed_count": len(failed),
            "skipped_count": len(skipped),
            "skipped": skipped[:20],
            "failed": failed[:5],
            "detail": (
                f"Sent {sent} WhatsApp message(s)."
                + (f" {len(failed)} failed." if failed else "")
                + (f" {len(skipped)} skipped (no phone)." if skipped else "")
            ),
        }
    )
