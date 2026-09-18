from django.db.models import Max
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User

from .messaging import (
    allowed_direct_ids,
    broadcast_targets,
    find_direct_conversation,
    post_message,
    recipient_queryset,
    serialize_conversation,
    serialize_message,
    serialize_user,
    add_members,
    unread_for_member,
)
from .models import Conversation, ConversationMember


class ConversationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _conversations(self, user):
        return (
            Conversation.objects.filter(memberships__user=user)
            .annotate(latest=Max("messages__created_at"))
            .distinct()
            .order_by("-latest", "-created_at")
        )

    def _owned(self, user, pk):
        return Conversation.objects.filter(id=pk, memberships__user=user).first()

    def list(self, request):
        rows = [serialize_conversation(item, request.user) for item in self._conversations(request.user)]
        return Response({"count": len(rows), "results": rows})

    def retrieve(self, request, pk=None):
        conversation = self._owned(request.user, pk)
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_conversation(conversation, request.user))

    def create(self, request):
        user = request.user
        kind = str(request.data.get("kind") or "direct").strip().lower()
        body = str(request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        if kind == "broadcast":
            audience = str(request.data.get("audience") or "students").strip().lower()
            if user.role == User.Role.STUDENT:
                return Response({"detail": "Students can only message a person."}, status=status.HTTP_403_FORBIDDEN)
            if user.role == User.Role.TEACHER and audience != "students":
                return Response({"detail": "Teachers can only message their students."}, status=status.HTTP_403_FORBIDDEN)
            targets = list(
                broadcast_targets(
                    user,
                    audience=audience,
                    semester=request.data.get("semester") or None,
                    course=request.data.get("course") or None,
                ).exclude(id=user.id)
            )
            if not targets:
                return Response({"detail": "No recipients match this selection."}, status=status.HTTP_400_BAD_REQUEST)
            if audience == "teachers":
                title = "All teachers"
            elif request.data.get("semester"):
                title = f"Semester {request.data.get('semester')} students"
            elif request.data.get("course"):
                title = "Course students"
            else:
                title = "All students"
            conversation = Conversation.objects.create(
                kind=Conversation.Kind.BROADCAST,
                title=str(request.data.get("title") or title)[:200],
                created_by=user,
            )
            add_members(conversation, [user, *targets])
            post_message(conversation, user, body)
            return Response(serialize_conversation(conversation, user), status=status.HTTP_201_CREATED)

        try:
            other_id = int(request.data.get("user_id"))
        except (TypeError, ValueError):
            return Response({"detail": "Select a person to message."}, status=status.HTTP_400_BAD_REQUEST)
        if other_id not in allowed_direct_ids(user):
            return Response({"detail": "You cannot message this user."}, status=status.HTTP_403_FORBIDDEN)
        other = User.objects.filter(id=other_id, is_active=True).first()
        if not other:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        conversation = find_direct_conversation(user, other)
        if not conversation:
            conversation = Conversation.objects.create(kind=Conversation.Kind.DIRECT, created_by=user)
            add_members(conversation, [user, other])
        post_message(conversation, user, body)
        return Response(serialize_conversation(conversation, user), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self._owned(request.user, pk)
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.method == "POST":
            try:
                message = post_message(conversation, request.user, request.data.get("body"))
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            except PermissionError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
            return Response(serialize_message(message), status=status.HTTP_201_CREATED)
        rows = [serialize_message(item) for item in conversation.messages.select_related("sender", "sender__student_profile")[:400]]
        return Response({"count": len(rows), "results": rows})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        conversation = self._owned(request.user, pk)
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        ConversationMember.objects.filter(conversation=conversation, user=request.user).update(last_read_at=timezone.now())
        return Response({"status": "ok"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        total = 0
        for membership in request.user.conversation_memberships.select_related("conversation"):
            total += unread_for_member(membership)
        return Response({"unread_count": total})

    @action(detail=False, methods=["get"])
    def recipients(self, request):
        rows = [
            serialize_user(person)
            for person in recipient_queryset(
                request.user,
                role=request.query_params.get("role") or None,
                semester=request.query_params.get("semester") or None,
                course=request.query_params.get("course") or None,
                search=request.query_params.get("search") or "",
            )[:300]
        ]
        return Response({"count": len(rows), "results": rows})
