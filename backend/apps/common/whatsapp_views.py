from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.models import User
from apps.common.messaging import add_members, find_direct_conversation, post_message
from apps.common.models import ChatMessage, Conversation
from apps.common.whatsapp import user_for_whatsapp_phone


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
    admin = User.objects.filter(role=User.Role.SUPER_ADMIN, is_active=True).order_by("id").first()
    if not admin:
        return None
    existing = find_direct_conversation(user, admin)
    if existing:
        return existing
    conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT, created_by=user, title="WhatsApp")
    add_members(conversation, [user, admin])
    return conversation


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_webhook(request):
    if request.method == "GET":
        mode = str(request.query_params.get("hub.mode") or "")
        token = str(request.query_params.get("hub.verify_token") or "")
        challenge = str(request.query_params.get("hub.challenge") or "")
        if mode == "subscribe" and token and token == getattr(settings, "WHATSAPP_VERIFY_TOKEN", ""):
            return HttpResponse(challenge, content_type="text/plain")
        return Response({"detail": "Invalid verify token."}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data if isinstance(request.data, dict) else {}
    entries = payload.get("entry") or []
    stored = 0
    for entry in entries:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for item in value.get("messages") or []:
                if item.get("type") != "text":
                    continue
                sender = user_for_whatsapp_phone(item.get("from"))
                if not sender:
                    continue
                body = ((item.get("text") or {}).get("body") or "").strip()
                if not body:
                    continue
                conversation = _inbound_conversation(sender)
                if not conversation:
                    continue
                try:
                    post_message(conversation, sender, body, source=ChatMessage.Source.WHATSAPP)
                    stored += 1
                except (ValueError, PermissionError):
                    continue
    return Response({"status": "ok", "stored": stored})
