import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("academics", "0001_initial"),
        ("coursework", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("kind", models.CharField(choices=[("notice", "Notice"), ("event", "Calendar event")], default="notice", max_length=20)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(blank=True)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("audience", models.CharField(choices=[("all", "All"), ("students", "Students"), ("teachers", "Teachers")], default="all", max_length=20)),
                ("is_deleted", models.BooleanField(default=False)),
                ("course", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="notices", to="academics.course")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_notices", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-starts_at", "-created_at"]},
        ),
        migrations.CreateModel(
            name="AttendanceSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("session_date", models.DateField()),
                ("topic", models.CharField(blank=True, max_length=200)),
                ("course", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_sessions", to="academics.course")),
                ("marked_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="marked_attendance", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-session_date", "-created_at"], "unique_together": {("course", "session_date")}},
        ),
        migrations.CreateModel(
            name="AttendanceRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("present", "Present"), ("absent", "Absent"), ("late", "Late")], default="present", max_length=20)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="records", to="campus.attendancesession")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("session", "student")}},
        ),
        migrations.CreateModel(
            name="Appeal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("kind", models.CharField(choices=[("remark", "Remark request"), ("extension", "Deadline extension")], max_length=20)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending", max_length=20)),
                ("reason", models.TextField()),
                ("teacher_note", models.TextField(blank=True)),
                ("extra_days", models.PositiveSmallIntegerField(default=0)),
                ("coursework", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="appeals", to="coursework.coursework")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="appeals", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="HelpPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("body", models.TextField()),
                ("audience", models.CharField(default="all", max_length=20)),
                ("is_published", models.BooleanField(default=True)),
                ("is_deleted", models.BooleanField(default=False)),
            ],
            options={"ordering": ["title"]},
        ),
        migrations.CreateModel(
            name="CourseworkTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("coursework_type", models.CharField(blank=True, max_length=50)),
                ("submission_type", models.CharField(default="individual", max_length=20)),
                ("max_marks", models.DecimalField(decimal_places=2, default=100, max_digits=6)),
                ("lock_at_due_time", models.BooleanField(default=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="coursework_templates", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CommentPhrase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("phrase", models.CharField(max_length=400)),
                ("teacher", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comment_phrases", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["phrase"]},
        ),
        migrations.CreateModel(
            name="RubricItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=160)),
                ("weight", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("max_marks", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("coursework", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rubric_items", to="coursework.coursework")),
            ],
            options={"ordering": ["id"]},
        ),
    ]
