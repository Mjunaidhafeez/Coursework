from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, DownloadViewSet, GalleryViewSet, website_public, website_settings, website_upload

router = DefaultRouter()
router.register("announcements", AnnouncementViewSet, basename="website-announcements")
router.register("gallery", GalleryViewSet, basename="website-gallery")
router.register("downloads", DownloadViewSet, basename="website-downloads")

urlpatterns = [
    path("public/", website_public, name="website-public"),
    path("settings/", website_settings, name="website-settings"),
    path("upload/", website_upload, name="website-upload"),
    path("", include(router.urls)),
]
