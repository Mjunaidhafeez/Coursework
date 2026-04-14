from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GroupMemberViewSet, StudentGroupViewSet

router = DefaultRouter()
router.register("groups", StudentGroupViewSet, basename="groups")
router.register("members", GroupMemberViewSet, basename="group-members")

urlpatterns = [path("", include(router.urls))]
