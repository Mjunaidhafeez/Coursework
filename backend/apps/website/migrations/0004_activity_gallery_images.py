from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0003_students_activities"),
    ]

    operations = [
        migrations.AddField(
            model_name="websiteactivity",
            name="image_urls",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="websiteannouncement",
            name="image_urls",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="websiteactivity",
            name="image_url",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="websiteannouncement",
            name="image_url",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="websitegalleryitem",
            name="image_url",
            field=models.CharField(max_length=500),
        ),
        migrations.AlterField(
            model_name="websitedownload",
            name="file_url",
            field=models.CharField(max_length=500),
        ),
    ]
