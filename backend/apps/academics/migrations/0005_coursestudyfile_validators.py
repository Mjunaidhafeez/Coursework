import django.core.validators
from django.db import migrations, models

import apps.academics.models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0004_coursestudyfile_cloud"),
    ]

    operations = [
        migrations.AlterField(
            model_name="coursestudyfile",
            name="file",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=apps.academics.models.course_study_file_path,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=[
                            "pdf",
                            "doc",
                            "docx",
                            "zip",
                            "ppt",
                            "pptx",
                            "xlsx",
                            "xls",
                            "png",
                            "jpg",
                            "jpeg",
                        ]
                    )
                ],
            ),
        ),
    ]
