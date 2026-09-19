from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityViewSet,
    AlumnusViewSet,
    AnnouncementViewSet,
    DownloadViewSet,
    GalleryViewSet,
    InquiryViewSet,
    ResultViewSet,
    StudentViewSet,
    TeacherViewSet,
    website_contact,
    website_public,
    website_settings,
    website_upload,
)

router = DefaultRouter()
router.register("announcements", AnnouncementViewSet, basename="website-announcements")
router.register("gallery", GalleryViewSet, basename="website-gallery")
router.register("downloads", DownloadViewSet, basename="website-downloads")
router.register("teachers", TeacherViewSet, basename="website-teachers")
router.register("alumni", AlumnusViewSet, basename="website-alumni")
router.register("results", ResultViewSet, basename="website-results")
router.register("students", StudentViewSet, basename="website-students")
router.register("activities", ActivityViewSet, basename="website-activities")
router.register("inquiries", InquiryViewSet, basename="website-inquiries")

urlpatterns = [
    path("public/", website_public, name="website-public"),
    path("settings/", website_settings, name="website-settings"),
    path("upload/", website_upload, name="website-upload"),
    path("contact/", website_contact, name="website-contact"),
    path("", include(router.urls)),
]
