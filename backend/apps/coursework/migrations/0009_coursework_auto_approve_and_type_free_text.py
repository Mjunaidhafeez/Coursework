from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coursework", "0008_coursework_topic_duplication_and_defaults"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coursework",
            name="coursework_type",
            field=models.CharField(max_length=50),
        ),
        migrations.AddField(
            model_name="coursework",
            name="auto_approve_all_students",
            field=models.BooleanField(default=False),
        ),
    ]
