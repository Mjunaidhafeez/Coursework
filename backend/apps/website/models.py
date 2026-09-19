from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel
from .defaults import PAGE_CATALOG, default_page_flags


def default_nav():
    return [{"label": item["label"], "path": item["path"]} for item in PAGE_CATALOG]


def default_pages():
    return {}


class WebsiteSettings(TimeStampedModel):
    site_name = models.CharField(max_length=160, default="Superior University")
    tagline = models.CharField(max_length=240, default="Excellence in professional education")
    primary_color = models.CharField(max_length=20, default="#102a5c")
    accent_color = models.CharField(max_length=20, default="#c9a227")
    secondary_color = models.CharField(max_length=20, default="#8c1d2c")
    header_color = models.CharField(max_length=20, default="#0b1c40")
    footer_color = models.CharField(max_length=20, default="#071428")
    page_flags = models.JSONField(default=default_page_flags, blank=True)
    logo_url = models.URLField(max_length=500, blank=True)
    hero_image_url = models.URLField(max_length=500, blank=True)
    show_login_button = models.BooleanField(default=True)
    login_path = models.CharField(max_length=80, default="/login")
    login_label = models.CharField(max_length=40, default="Student / Staff Login")
    footer_text = models.CharField(max_length=300, blank=True, default="© Superior University. All rights reserved.")
    phone = models.CharField(max_length=40, blank=True)
    email = models.CharField(max_length=120, blank=True)
    address = models.CharField(max_length=240, blank=True)
    facebook = models.URLField(max_length=300, blank=True)
    twitter = models.URLField(max_length=300, blank=True)
    instagram = models.URLField(max_length=300, blank=True)
    youtube = models.URLField(max_length=300, blank=True)
    nav = models.JSONField(default=default_nav, blank=True)
    pages = models.JSONField(default=default_pages, blank=True)

    class Meta:
        verbose_name = "Website settings"

    def __str__(self):
        return self.site_name

    @classmethod
    def load(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row


class WebsiteAnnouncement(TimeStampedModel):
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    image_url = models.URLField(max_length=500, blank=True)
    published = models.BooleanField(default=True)
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class WebsiteGalleryItem(TimeStampedModel):
    title = models.CharField(max_length=160, blank=True)
    album = models.CharField(max_length=80, default="Campus")
    image_url = models.URLField(max_length=500)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]


class WebsiteDownload(TimeStampedModel):
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    file_url = models.URLField(max_length=500)
    original_name = models.CharField(max_length=255, blank=True)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]


class WebsiteTeacher(TimeStampedModel):
    name = models.CharField(max_length=160)
    designation = models.CharField(max_length=160, blank=True)
    department = models.CharField(max_length=160, blank=True)
    degrees = models.CharField(max_length=300, blank=True)
    bio = models.TextField(blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    published = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]


class WebsiteAlumnus(TimeStampedModel):
    name = models.CharField(max_length=160)
    batch = models.CharField(max_length=40, blank=True)
    program = models.CharField(max_length=120, blank=True)
    current_role = models.CharField(max_length=200, blank=True)
    story = models.TextField(blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]


class WebsiteResult(TimeStampedModel):
    student_name = models.CharField(max_length=160)
    roll_no = models.CharField(max_length=60)
    program = models.CharField(max_length=120, blank=True)
    year = models.CharField(max_length=20, blank=True)
    grade = models.CharField(max_length=40, blank=True)
    marks = models.CharField(max_length=40, blank=True)
    teacher_names = models.CharField(max_length=300, blank=True)
    degrees = models.CharField(max_length=300, blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-year", "student_name"]


class WebsiteStudent(TimeStampedModel):
    name = models.CharField(max_length=160)
    roll_no = models.CharField(max_length=60)
    semester = models.CharField(max_length=40, blank=True)
    class_name = models.CharField(max_length=160, blank=True)
    note = models.CharField(max_length=240, blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    published = models.BooleanField(default=True)
    source_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="website_profiles",
    )

    class Meta:
        ordering = ["semester", "class_name", "name"]


class WebsiteActivity(TimeStampedModel):
    title = models.CharField(max_length=200)
    body = models.TextField()
    image_url = models.URLField(max_length=500, blank=True)
    posted_on = models.DateField(default=timezone.now)
    semester = models.CharField(max_length=40, blank=True)
    class_name = models.CharField(max_length=160, blank=True)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-posted_on", "-created_at"]


class WebsiteInquiry(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        REPLIED = "replied", "Replied"

    name = models.CharField(max_length=160)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    admin_reply = models.TextField(blank=True)
    conversation = models.ForeignKey(
        "common.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="website_inquiries",
    )

    class Meta:
        ordering = ["-created_at"]
