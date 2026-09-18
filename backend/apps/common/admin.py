from django.contrib import admin

from .models import AuditLog, Notification, WhatsAppSettings

admin.site.register(AuditLog)
admin.site.register(Notification)
admin.site.register(WhatsAppSettings)
