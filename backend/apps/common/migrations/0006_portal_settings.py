from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("common", "0005_whatsapp_webhook_log"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortalSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("app_name", models.CharField(default="MBA Coursework Portal", max_length=120)),
                ("university_name", models.CharField(default="Superior University Lahore", max_length=160)),
                ("tagline", models.CharField(default="Student Assessment Tracking", max_length=160)),
                (
                    "login_subtitle",
                    models.CharField(
                        default="Sign in to manage coursework, submissions, and results.",
                        max_length=240,
                    ),
                ),
                (
                    "footer_text",
                    models.CharField(
                        blank=True,
                        default="Developed by : Junaid Hafeez (SVL) MBA NON Business 2025-2027",
                        max_length=240,
                    ),
                ),
                ("sidebar_title", models.CharField(blank=True, max_length=80)),
                (
                    "admin_header",
                    models.CharField(default="Student Assessment Submission Portal", max_length=160),
                ),
                ("teacher_header", models.CharField(default="Teacher Dashboard", max_length=160)),
                ("student_header", models.CharField(default="Student Dashboard", max_length=160)),
                ("login_button_text", models.CharField(default="Sign in", max_length=40)),
                (
                    "theme",
                    models.CharField(
                        choices=[
                            ("navy", "Navy"),
                            ("emerald", "Emerald"),
                            ("royal", "Royal"),
                            ("slate", "Slate"),
                        ],
                        default="navy",
                        max_length=20,
                    ),
                ),
                ("logo_url", models.URLField(blank=True, max_length=500)),
                ("login_background_url", models.URLField(blank=True, max_length=500)),
                ("modules", models.JSONField(blank=True, default=dict)),
                ("labels", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "verbose_name": "Portal settings",
            },
        ),
    ]
