from django.db import migrations, models
import django.db.models.deletion

from apps.website.defaults import default_page_flags


class Migration(migrations.Migration):
    dependencies = [
        ("common", "0007_weekly_digest"),
        ("website", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitesettings",
            name="secondary_color",
            field=models.CharField(default="#8c1d2c", max_length=20),
        ),
        migrations.AddField(
            model_name="websitesettings",
            name="header_color",
            field=models.CharField(default="#0b1c40", max_length=20),
        ),
        migrations.AddField(
            model_name="websitesettings",
            name="footer_color",
            field=models.CharField(default="#071428", max_length=20),
        ),
        migrations.AddField(
            model_name="websitesettings",
            name="page_flags",
            field=models.JSONField(blank=True, default=default_page_flags),
        ),
        migrations.CreateModel(
            name="WebsiteTeacher",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("designation", models.CharField(blank=True, max_length=160)),
                ("department", models.CharField(blank=True, max_length=160)),
                ("degrees", models.CharField(blank=True, max_length=300)),
                ("bio", models.TextField(blank=True)),
                ("photo_url", models.URLField(blank=True, max_length=500)),
                ("published", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.CreateModel(
            name="WebsiteAlumnus",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("batch", models.CharField(blank=True, max_length=40)),
                ("program", models.CharField(blank=True, max_length=120)),
                ("current_role", models.CharField(blank=True, max_length=200)),
                ("story", models.TextField(blank=True)),
                ("photo_url", models.URLField(blank=True, max_length=500)),
                ("published", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="WebsiteResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student_name", models.CharField(max_length=160)),
                ("roll_no", models.CharField(max_length=60)),
                ("program", models.CharField(blank=True, max_length=120)),
                ("year", models.CharField(blank=True, max_length=20)),
                ("grade", models.CharField(blank=True, max_length=40)),
                ("marks", models.CharField(blank=True, max_length=40)),
                ("teacher_names", models.CharField(blank=True, max_length=300)),
                ("degrees", models.CharField(blank=True, max_length=300)),
                ("photo_url", models.URLField(blank=True, max_length=500)),
                ("published", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-year", "student_name"]},
        ),
        migrations.CreateModel(
            name="WebsiteInquiry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("subject", models.CharField(blank=True, max_length=200)),
                ("message", models.TextField()),
                ("status", models.CharField(choices=[("new", "New"), ("replied", "Replied")], default="new", max_length=20)),
                ("admin_reply", models.TextField(blank=True)),
                (
                    "conversation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="website_inquiries",
                        to="common.conversation",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
