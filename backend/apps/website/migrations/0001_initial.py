from django.db import migrations, models

from apps.website.models import default_nav, default_pages


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="WebsiteSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("site_name", models.CharField(default="Superior University", max_length=160)),
                ("tagline", models.CharField(default="Excellence in professional education", max_length=240)),
                ("primary_color", models.CharField(default="#102a5c", max_length=20)),
                ("accent_color", models.CharField(default="#c9a227", max_length=20)),
                ("logo_url", models.URLField(blank=True, max_length=500)),
                ("hero_image_url", models.URLField(blank=True, max_length=500)),
                ("show_login_button", models.BooleanField(default=True)),
                ("login_path", models.CharField(default="/login", max_length=80)),
                ("login_label", models.CharField(default="Student / Staff Login", max_length=40)),
                ("footer_text", models.CharField(blank=True, default="© Superior University. All rights reserved.", max_length=300)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("email", models.CharField(blank=True, max_length=120)),
                ("address", models.CharField(blank=True, max_length=240)),
                ("facebook", models.URLField(blank=True, max_length=300)),
                ("twitter", models.URLField(blank=True, max_length=300)),
                ("instagram", models.URLField(blank=True, max_length=300)),
                ("youtube", models.URLField(blank=True, max_length=300)),
                ("nav", models.JSONField(blank=True, default=default_nav)),
                ("pages", models.JSONField(blank=True, default=default_pages)),
            ],
            options={"verbose_name": "Website settings"},
        ),
        migrations.CreateModel(
            name="WebsiteAnnouncement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("excerpt", models.CharField(blank=True, max_length=300)),
                ("body", models.TextField()),
                ("image_url", models.URLField(blank=True, max_length=500)),
                ("published", models.BooleanField(default=True)),
                ("published_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-published_at", "-created_at"]},
        ),
        migrations.CreateModel(
            name="WebsiteGalleryItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(blank=True, max_length=160)),
                ("album", models.CharField(default="Campus", max_length=80)),
                ("image_url", models.URLField(max_length=500)),
                ("published", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="WebsiteDownload",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.CharField(blank=True, max_length=300)),
                ("file_url", models.URLField(max_length=500)),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("published", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
