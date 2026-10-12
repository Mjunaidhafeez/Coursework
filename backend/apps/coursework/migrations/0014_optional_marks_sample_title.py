from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coursework", "0013_coursework_sample_file"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coursework",
            name="max_marks",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name="coursework",
            name="sample_file_title",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
