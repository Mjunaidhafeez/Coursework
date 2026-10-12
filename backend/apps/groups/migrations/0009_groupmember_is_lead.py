from django.db import migrations, models


def backfill_group_leads(apps, schema_editor):
    StudentGroup = apps.get_model("groups", "StudentGroup")
    for group in StudentGroup.objects.iterator():
        members = list(group.members.order_by("id"))
        if not members:
            continue
        if any(member.is_lead for member in members):
            continue
        lead = next((member for member in members if member.student_id == group.creator_id), members[0])
        group.members.update(is_lead=False)
        group.members.filter(pk=lead.pk).update(is_lead=True)


class Migration(migrations.Migration):
    dependencies = [
        ("groups", "0008_studentgroup_org_units"),
    ]

    operations = [
        migrations.AddField(
            model_name="groupmember",
            name="is_lead",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_group_leads, migrations.RunPython.noop),
    ]
