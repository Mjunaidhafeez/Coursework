from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0006_studentgroup_source"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="studentgroup",
            options={"ordering": ["name", "created_at"]},
        ),
    ]
