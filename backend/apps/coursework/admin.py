from django.contrib import admin

from .models import Coursework, FeedbackGrade, Submission

admin.site.register(Coursework)
admin.site.register(Submission)
admin.site.register(FeedbackGrade)
