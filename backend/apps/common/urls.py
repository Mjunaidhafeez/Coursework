from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .messaging_views import ConversationViewSet
from .views import NotificationViewSet
from .whatsapp_views import whatsapp_webhook

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("conversations", ConversationViewSet, basename="conversations")

urlpatterns = [
    path("whatsapp/webhook/", whatsapp_webhook, name="whatsapp-webhook"),
    path("", include(router.urls)),
]
