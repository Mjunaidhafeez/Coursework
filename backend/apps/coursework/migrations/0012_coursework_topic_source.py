from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coursework", "0011_submission_feedback_ordering"),
    ]

    operations = [
        migrations.AddField(
            model_name="coursework",
            name="topic_source",
            field=models.CharField(
                choices=[
                    ("student", "Students choose their topic"),
                    ("teacher_student", "Teacher allots a topic to each student"),
                    ("teacher_group", "Teacher allots a topic to each group"),
                ],
                default="student",
                max_length=20,
            ),
        ),
    ]
