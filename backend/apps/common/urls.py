from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .messaging_views import ConversationViewSet
from .portal_views import portal_branding_upload, portal_settings_admin, portal_settings_public
from .views import NotificationViewSet
from .whatsapp_views import send_whatsapp_messages, whatsapp_settings, whatsapp_webhook

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("conversations", ConversationViewSet, basename="conversations")

urlpatterns = [
    path("portal-settings/public/", portal_settings_public, name="portal-settings-public"),
    path("portal-settings/", portal_settings_admin, name="portal-settings-admin"),
    path("portal-settings/upload/", portal_branding_upload, name="portal-settings-upload"),
    path("whatsapp/webhook/", whatsapp_webhook, name="whatsapp-webhook"),
    path("whatsapp/webhook", whatsapp_webhook, name="whatsapp-webhook-noslash"),
    path("whatsapp/settings/", whatsapp_settings, name="whatsapp-settings"),
    path("whatsapp/send/", send_whatsapp_messages, name="whatsapp-send"),
    path("", include(router.urls)),
]
