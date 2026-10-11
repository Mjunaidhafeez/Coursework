from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CourseViewSet,
    DepartmentViewSet,
    EnrollmentViewSet,
    SchoolClassViewSet,
    SectionViewSet,
    SemesterViewSet,
    public_study_file,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("classes", SchoolClassViewSet, basename="school-class")
router.register("sections", SectionViewSet, basename="section")
router.register("semesters", SemesterViewSet, basename="semester")
router.register("courses", CourseViewSet, basename="course")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("study-files/public/", public_study_file, name="study-file-public"),
    path("", include(router.urls)),
]
