from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("website", "0002_site_pages"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebsiteStudent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("roll_no", models.CharField(max_length=60)),
                ("semester", models.CharField(blank=True, max_length=40)),
                ("class_name", models.CharField(blank=True, max_length=160)),
                ("note", models.CharField(blank=True, max_length=240)),
                ("photo_url", models.URLField(blank=True, max_length=500)),
                ("published", models.BooleanField(default=True)),
                (
                    "source_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="website_profiles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["semester", "class_name", "name"]},
        ),
        migrations.CreateModel(
            name="WebsiteActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField()),
                ("image_url", models.URLField(blank=True, max_length=500)),
                ("posted_on", models.DateField(default=django.utils.timezone.now)),
                ("semester", models.CharField(blank=True, max_length=40)),
                ("class_name", models.CharField(blank=True, max_length=160)),
                ("published", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-posted_on", "-created_at"]},
        ),
    ]
