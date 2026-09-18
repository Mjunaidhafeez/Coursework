from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0003_chatmessage_source"),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("enabled", models.BooleanField(default=False)),
                ("token", models.TextField(blank=True)),
                ("phone_number_id", models.CharField(blank=True, max_length=80)),
                ("verify_token", models.CharField(blank=True, default="mba-whatsapp", max_length=80)),
            ],
            options={
                "verbose_name": "WhatsApp settings",
            },
        ),
    ]
