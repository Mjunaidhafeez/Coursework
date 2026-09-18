import apps.coursework.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coursework", "0006_submissionfile"),
    ]

    operations = [
        migrations.AddField(
            model_name="submissionfile",
            name="title",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="submissionfile",
            name="file_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="submissionfile",
            name="storage_key",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="submissionfile",
            name="original_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="submissionfile",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to=apps.coursework.models.submission_file_upload_path),
        ),
    ]
