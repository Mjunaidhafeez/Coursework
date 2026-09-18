import django.core.validators
from django.db import migrations, models

import apps.coursework.models


class Migration(migrations.Migration):

    dependencies = [
        ("coursework", "0007_submissionfile_cloud_title"),
    ]

    operations = [
        migrations.AlterField(
            model_name="submissionfile",
            name="file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=apps.coursework.models.submission_file_upload_path,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=["pdf", "docx", "zip", "pptx"]
                    )
                ],
            ),
        ),
        migrations.AlterModelOptions(
            name="submissionfile",
            options={"ordering": ["uploaded_at", "created_at"]},
        ),
    ]
