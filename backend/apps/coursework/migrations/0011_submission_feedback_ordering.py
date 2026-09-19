from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("coursework", "0010_submissionfile_options"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="submission",
            options={"ordering": ["submitted_at"]},
        ),
        migrations.AlterModelOptions(
            name="feedbackgrade",
            options={"ordering": ["updated_at"]},
        ),
    ]
