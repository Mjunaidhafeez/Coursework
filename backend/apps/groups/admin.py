from django.contrib import admin

from .models import GroupMember, StudentGroup

admin.site.register(StudentGroup)
admin.site.register(GroupMember)
