from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseViewSet, EnrollmentViewSet, SemesterViewSet

router = DefaultRouter()
router.register("semesters", SemesterViewSet, basename="semester")
router.register("courses", CourseViewSet, basename="course")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = [path("", include(router.urls))]
