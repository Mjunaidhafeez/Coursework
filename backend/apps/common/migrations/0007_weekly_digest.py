from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("common", "0006_portal_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="portalsettings",
            name="weekly_digest",
            field=models.BooleanField(default=False),
        ),
    ]
