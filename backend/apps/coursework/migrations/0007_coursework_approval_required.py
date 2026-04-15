from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coursework", "0006_submissionfile"),
    ]

    operations = [
        migrations.AddField(
            model_name="coursework",
            name="approval_required",
            field=models.BooleanField(default=True),
        ),
    ]
