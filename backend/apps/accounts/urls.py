from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .email_views import email_recipients, send_student_email
from .views import UserViewSet, me

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path("me/", me, name="me"),
    path("email-recipients/", email_recipients, name="email-recipients"),
    path("send-email/", send_student_email, name="send-student-email"),
    path("", include(router.urls)),
]
