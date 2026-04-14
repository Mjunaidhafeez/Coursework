from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseworkViewSet, FeedbackGradeViewSet, SubmissionViewSet

router = DefaultRouter()
router.register("courseworks", CourseworkViewSet, basename="courseworks")
router.register("submissions", SubmissionViewSet, basename="submissions")
router.register("feedback", FeedbackGradeViewSet, basename="feedback")

urlpatterns = [path("", include(router.urls))]
