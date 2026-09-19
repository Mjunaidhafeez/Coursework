from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(TimeStampedModel):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=120)
    object_type = models.CharField(max_length=120)
    object_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} by {self.actor_id}"


class Notification(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification<{self.user_id}>: {self.title}"


class Conversation(TimeStampedModel):
    class Kind(models.TextChoices):
        DIRECT = "direct", "Direct"
        BROADCAST = "broadcast", "Broadcast"

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.DIRECT)
    title = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="started_conversations",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.title or f"Conversation {self.pk}"


class ConversationMember(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversation_memberships")
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("conversation", "user")]
        ordering = ["id"]

    def __str__(self):
        return f"{self.user_id} in {self.conversation_id}"


class ChatMessage(TimeStampedModel):
    class Source(models.TextChoices):
        PORTAL = "portal", "Portal"
        WHATSAPP = "whatsapp", "WhatsApp"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    body = models.TextField()
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.PORTAL)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.pk} in {self.conversation_id}"


class WhatsAppSettings(TimeStampedModel):
    enabled = models.BooleanField(default=False)
    token = models.TextField(blank=True)
    phone_number_id = models.CharField(max_length=80, blank=True)
    verify_token = models.CharField(max_length=80, default="mba-whatsapp", blank=True)
    last_webhook_at = models.DateTimeField(null=True, blank=True)
    last_webhook_note = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "WhatsApp settings"

    def __str__(self):
        return "WhatsApp settings"

    @classmethod
    def load(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row


class PortalSettings(TimeStampedModel):
    class Theme(models.TextChoices):
        NAVY = "navy", "Navy"
        EMERALD = "emerald", "Emerald"
        ROYAL = "royal", "Royal"
        SLATE = "slate", "Slate"

    app_name = models.CharField(max_length=120, default="MBA Coursework Portal")
    university_name = models.CharField(max_length=160, default="Superior University Lahore")
    tagline = models.CharField(max_length=160, default="Student Assessment Tracking")
    login_subtitle = models.CharField(
        max_length=240,
        default="Sign in to manage coursework, submissions, and results.",
    )
    footer_text = models.CharField(
        max_length=240,
        default="Developed by : Junaid Hafeez (SVL) MBA NON Business 2025-2027",
        blank=True,
    )
    sidebar_title = models.CharField(max_length=80, blank=True)
    admin_header = models.CharField(max_length=160, default="Student Assessment Submission Portal")
    teacher_header = models.CharField(max_length=160, default="Teacher Dashboard")
    student_header = models.CharField(max_length=160, default="Student Dashboard")
    login_button_text = models.CharField(max_length=40, default="Sign in")
    theme = models.CharField(max_length=20, choices=Theme.choices, default=Theme.NAVY)
    logo_url = models.URLField(max_length=500, blank=True)
    login_background_url = models.URLField(max_length=500, blank=True)
    modules = models.JSONField(default=dict, blank=True)
    labels = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Portal settings"

    def __str__(self):
        return self.app_name or "Portal settings"

    @classmethod
    def load(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row
