from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("campus", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancerecord",
            name="remark",
            field=models.CharField(blank=True, max_length=240),
        ),
        migrations.AlterField(
            model_name="attendancerecord",
            name="status",
            field=models.CharField(
                choices=[
                    ("present", "Present"),
                    ("leave", "Leave"),
                    ("absent", "Absent"),
                    ("late", "Late"),
                ],
                default="present",
                max_length=20,
            ),
        ),
    ]
