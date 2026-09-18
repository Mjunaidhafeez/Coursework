import apps.academics.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0003_coursestudyfile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coursestudyfile",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to=apps.academics.models.course_study_file_path),
        ),
        migrations.AddField(
            model_name="coursestudyfile",
            name="file_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="coursestudyfile",
            name="storage_key",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="coursestudyfile",
            name="original_name",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
