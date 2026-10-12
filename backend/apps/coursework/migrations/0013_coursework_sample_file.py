from django.db import migrations, models
import apps.coursework.models


class Migration(migrations.Migration):
    dependencies = [
        ("coursework", "0012_coursework_topic_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="coursework",
            name="sample_file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=apps.coursework.models.coursework_sample_path,
            ),
        ),
        migrations.AddField(
            model_name="coursework",
            name="sample_file_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="coursework",
            name="sample_original_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="coursework",
            name="sample_storage_key",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
