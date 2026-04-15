from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coursework", "0007_coursework_approval_required"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coursework",
            name="approval_required",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="coursework",
            name="lock_at_due_time",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="coursework",
            name="topic_duplication_allowed",
            field=models.BooleanField(default=False),
        ),
    ]
