from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .messaging_views import ConversationViewSet
from .views import NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("conversations", ConversationViewSet, basename="conversations")

urlpatterns = [path("", include(router.urls))]
