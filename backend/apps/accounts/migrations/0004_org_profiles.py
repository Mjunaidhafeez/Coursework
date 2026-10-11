from django.db import migrations, models
import django.db.models.deletion


def copy_teacher_departments(apps, schema_editor):
    Department = apps.get_model("academics", "Department")
    TeacherProfile = apps.get_model("accounts", "TeacherProfile")
    for row in TeacherProfile.objects.exclude(department=""):
        name = (row.department or "").strip()[:120]
        if not name:
            continue
        dept, _ = Department.objects.get_or_create(name=name)
        row.department_ref_id = dept.id
        row.save(update_fields=["department_ref_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0006_org_units"),
        ("accounts", "0003_user_phone_student_mailing"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacherprofile",
            name="department_ref",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="teachers",
                to="academics.department",
            ),
        ),
        migrations.AddField(
            model_name="teacherprofile",
            name="show_on_website",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="students",
                to="academics.department",
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="school_class",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="students",
                to="academics.schoolclass",
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="section",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="students",
                to="academics.section",
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="show_on_website",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(copy_teacher_departments, migrations.RunPython.noop),
    ]
