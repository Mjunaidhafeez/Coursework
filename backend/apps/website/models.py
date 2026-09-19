from django.db import models

from apps.common.models import TimeStampedModel


def default_nav():
    return [
        {"label": "Home", "path": "/"},
        {"label": "About", "path": "/about"},
        {"label": "VC Message", "path": "/vc"},
        {"label": "Programs", "path": "/programs"},
        {"label": "Admissions", "path": "/admissions"},
        {"label": "Announcements", "path": "/announcements"},
        {"label": "Gallery", "path": "/gallery"},
        {"label": "Downloads", "path": "/downloads"},
    ]


def default_pages():
    return {}


class WebsiteSettings(TimeStampedModel):
    site_name = models.CharField(max_length=160, default="Superior University")
    tagline = models.CharField(max_length=240, default="Excellence in professional education")
    primary_color = models.CharField(max_length=20, default="#102a5c")
    accent_color = models.CharField(max_length=20, default="#c9a227")
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
