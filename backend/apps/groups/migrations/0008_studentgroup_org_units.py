from django.db import migrations, models
import django.db.models.deletion


def backfill_group_org(apps, schema_editor):
    StudentGroup = apps.get_model("groups", "StudentGroup")
    for group in StudentGroup.objects.select_related("course", "course__semester", "course__department").iterator():
        semester_id = group.semester_id
        department_id = group.department_id
        school_class_id = group.school_class_id
        section_id = group.section_id
        course = group.course
        if course:
            semester_id = semester_id or course.semester_id
            department_id = department_id or course.department_id
        if not all([semester_id, department_id, school_class_id, section_id]):
            member = group.members.select_related(
                "student__student_profile",
                "student__student_profile__semester",
                "student__student_profile__department",
                "student__student_profile__school_class",
                "student__student_profile__section",
            ).first()
            profile = getattr(getattr(member, "student", None), "student_profile", None)
            if profile:
                semester_id = semester_id or profile.semester_id
                department_id = department_id or profile.department_id
                school_class_id = school_class_id or profile.school_class_id
                section_id = section_id or profile.section_id
        if (
            semester_id != group.semester_id
            or department_id != group.department_id
            or school_class_id != group.school_class_id
            or section_id != group.section_id
        ):
            group.semester_id = semester_id
            group.department_id = department_id
            group.school_class_id = school_class_id
            group.section_id = section_id
            group.save(update_fields=["semester_id", "department_id", "school_class_id", "section_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0006_org_units"),
        ("groups", "0007_studentgroup_ordering"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentgroup",
            name="semester",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="student_groups",
                to="academics.semester",
            ),
        ),
        migrations.AddField(
            model_name="studentgroup",
            name="department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="student_groups",
                to="academics.department",
            ),
        ),
        migrations.AddField(
            model_name="studentgroup",
            name="school_class",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="student_groups",
                to="academics.schoolclass",
            ),
        ),
        migrations.AddField(
            model_name="studentgroup",
            name="section",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="student_groups",
                to="academics.section",
            ),
        ),
        migrations.RunPython(backfill_group_org, migrations.RunPython.noop),
    ]
