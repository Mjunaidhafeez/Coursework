from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0004_whatsapp_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappsettings",
            name="last_webhook_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="whatsappsettings",
            name="last_webhook_note",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
