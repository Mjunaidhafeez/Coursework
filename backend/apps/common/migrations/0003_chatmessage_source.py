from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0002_messaging"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="source",
            field=models.CharField(choices=[("portal", "Portal"), ("whatsapp", "WhatsApp")], default="portal", max_length=20),
        ),
    ]
