from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UserViewSet, me

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path("me/", me, name="me"),
    path("", include(router.urls)),
]
