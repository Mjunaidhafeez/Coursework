from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone

from apps.academics.models import Enrollment
from apps.accounts.models import User
from apps.common.models import ChatMessage, Conversation, ConversationMember, Notification
from apps.common.whatsapp import notify_users_whatsapp


def _name(user):
    return user.get_full_name().strip() or user.username


def _role_label(role):
    return {
        User.Role.SUPER_ADMIN: "Administrator",
        User.Role.TEACHER: "Teacher",
        User.Role.STUDENT: "Student",
    }.get(str(role or ""), "Portal user")


def allowed_direct_ids(user):
    if user.role == User.Role.SUPER_ADMIN:
        return set(
            User.objects.filter(is_active=True, role__in=[User.Role.STUDENT, User.Role.TEACHER])
            .exclude(id=user.id)
            .values_list("id", flat=True)
        )
    if user.role == User.Role.TEACHER:
        student_ids = Enrollment.objects.filter(course__teachers=user).values_list("student_id", flat=True)
        admin_ids = User.objects.filter(is_active=True, role=User.Role.SUPER_ADMIN).values_list("id", flat=True)
        return set(student_ids) | set(admin_ids)
    if user.role == User.Role.STUDENT:
        teacher_ids = Enrollment.objects.filter(student=user).values_list("course__teachers", flat=True)
        admin_ids = User.objects.filter(is_active=True, role=User.Role.SUPER_ADMIN).values_list("id", flat=True)
        return set(id for id in teacher_ids if id) | set(admin_ids)
    return set()


def recipient_queryset(user, role=None, semester=None, course=None, search=""):
    allowed = allowed_direct_ids(user)
    queryset = User.objects.filter(id__in=allowed, is_active=True).select_related(
        "student_profile", "student_profile__semester"
    )
    if role:
        queryset = queryset.filter(role=role)
    if semester and (not role or role == User.Role.STUDENT):
        queryset = queryset.filter(student_profile__semester_id=semester)
    if course:
        if role == User.Role.TEACHER:
            queryset = queryset.filter(teaching_courses__id=course)
        else:
            queryset = queryset.filter(Q(enrollments__course_id=course) | Q(teaching_courses__id=course))
    query = str(search or "").strip()
    if query:
        queryset = queryset.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(username__icontains=query)
            | Q(student_profile__student_id__icontains=query)
        )
    return queryset.distinct().order_by("first_name", "last_name", "username")


def broadcast_targets(user, audience, semester=None, course=None):
    if user.role == User.Role.SUPER_ADMIN:
        if audience == "teachers":
            return User.objects.filter(role=User.Role.TEACHER, is_active=True)
        queryset = User.objects.filter(role=User.Role.STUDENT, is_active=True)
        if semester:
            queryset = queryset.filter(student_profile__semester_id=semester)
        if course:
            queryset = queryset.filter(enrollments__course_id=course)
        return queryset.distinct()
    if user.role == User.Role.TEACHER and audience == "students":
        queryset = User.objects.filter(
            role=User.Role.STUDENT,
            is_active=True,
            enrollments__course__teachers=user,
        )
        if semester:
            queryset = queryset.filter(student_profile__semester_id=semester)
        if course:
            if not user.teaching_courses.filter(id=course).exists():
                return User.objects.none()
            queryset = queryset.filter(enrollments__course_id=course)
        return queryset.distinct()
    return User.objects.none()


def find_direct_conversation(user, other):
    mine = ConversationMember.objects.filter(user=user).values("conversation_id")
    theirs = ConversationMember.objects.filter(user=other).values("conversation_id")
    return (
        Conversation.objects.filter(kind=Conversation.Kind.DIRECT, id__in=mine)
        .filter(id__in=theirs)
        .annotate(member_count=Count("memberships", distinct=True))
        .filter(member_count=2)
        .first()
    )


def add_members(conversation, users):
    ConversationMember.objects.bulk_create(
        [ConversationMember(conversation=conversation, user=person) for person in users],
        ignore_conflicts=True,
    )


def notify_members(conversation, sender, body):
    others = User.objects.filter(conversation_memberships__conversation=conversation).exclude(id=sender.id)
    preview = (body or "")[:180]
    title = f"Message from {_name(sender)}"
    Notification.objects.bulk_create(
        [Notification(user=person, title=title, body=preview) for person in others]
    )


def post_message(conversation, sender, body, source=ChatMessage.Source.PORTAL):
    text = str(body or "").strip()
    if not text:
        raise ValueError("Message is required.")
    if len(text) > 4000:
        raise ValueError("Message is too long.")
    if not conversation.memberships.filter(user=sender).exists():
        raise PermissionError("You are not in this conversation.")
    message = ChatMessage.objects.create(
        conversation=conversation,
        sender=sender,
        body=text,
        source=source or ChatMessage.Source.PORTAL,
    )
    now = timezone.now()
    conversation.last_message_at = now
    conversation.save(update_fields=["last_message_at", "updated_at"])
    ConversationMember.objects.filter(conversation=conversation, user=sender).update(last_read_at=now)
    notify_members(conversation, sender, text)
    if message.source != ChatMessage.Source.WHATSAPP:
        portal = getattr(settings, "PORTAL_PUBLIC_URL", "")
        others = User.objects.filter(conversation_memberships__conversation=conversation).exclude(id=sender.id)
        notify_users_whatsapp(
            others,
            f"{_name(sender)} ({_role_label(sender.role)}): {text}\n\nOpen portal: {portal}",
        )
    return message


def unread_for_member(membership):
    queryset = membership.conversation.messages.exclude(sender=membership.user)
    if membership.last_read_at:
        queryset = queryset.filter(created_at__gt=membership.last_read_at)
    return queryset.count()


def serialize_user(user):
    profile = getattr(user, "student_profile", None)
    return {
        "id": user.id,
        "name": _name(user),
        "role": user.role,
        "role_label": _role_label(user.role),
        "roll_no": getattr(profile, "student_id", "") or "",
        "semester": getattr(getattr(profile, "semester", None), "number", None),
    }


def serialize_conversation(conversation, current_user):
    members = list(
        User.objects.filter(conversation_memberships__conversation=conversation)
        .select_related("student_profile", "student_profile__semester")
        .distinct()
    )
    others = [person for person in members if person.id != current_user.id]
    membership = conversation.memberships.filter(user=current_user).first()
    last = conversation.messages.order_by("-created_at").first()
    if conversation.kind == Conversation.Kind.BROADCAST:
        title = conversation.title or "Group message"
    elif others:
        title = _name(others[0])
    else:
        title = "Conversation"
    return {
        "id": conversation.id,
        "kind": conversation.kind,
        "title": title,
        "member_count": len(members),
        "other": serialize_user(others[0]) if len(others) == 1 else None,
        "unread_count": unread_for_member(membership) if membership else 0,
        "last_message": last.body if last else "",
        "last_message_at": (last.created_at if last else conversation.last_message_at or conversation.created_at),
        "updated_at": conversation.updated_at,
    }


def serialize_message(message):
    return {
        "id": message.id,
        "body": message.body,
        "source": message.source,
        "created_at": message.created_at,
        "sender": serialize_user(message.sender),
    }
