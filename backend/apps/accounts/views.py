from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsSuperAdmin
from .serializers import CustomTokenObtainPairSerializer, SelfProfileUpdateSerializer, UserCreateUpdateSerializer, UserSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        serializer = SelfProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(UserSerializer(request.user, context={"request": request}).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "email", "phone", "first_name", "last_name", "student_profile__student_id"]
    ordering_fields = ["id", "username", "first_name", "last_name", "email", "role", "date_joined"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = User.objects.select_related(
            "teacher_profile",
            "teacher_profile__department_ref",
            "student_profile",
            "student_profile__semester",
            "student_profile__department",
            "student_profile__school_class",
            "student_profile__section",
        ).prefetch_related("teaching_courses", "enrollments__course")
        params = self.request.query_params
        if self.action == "list" and params.get("is_active") is None:
            qs = qs.filter(is_active=True)
        department = params.get("department")
        if department:
            qs = qs.filter(Q(teacher_profile__department_ref_id=department) | Q(student_profile__department_id=department))
        semester = params.get("semester")
        if semester:
            qs = qs.filter(Q(student_profile__semester_id=semester) | Q(teaching_courses__semester_id=semester))
        school_class = params.get("school_class") or params.get("class")
        if school_class:
            qs = qs.filter(student_profile__school_class_id=school_class)
        section = params.get("section")
        if section:
            qs = qs.filter(student_profile__section_id=section)
        course = params.get("course")
        if course:
            qs = qs.filter(Q(enrollments__course_id=course) | Q(teaching_courses__id=course))
        website = str(params.get("show_on_website") or "").lower()
        if website in ("1", "true", "yes"):
            qs = qs.filter(Q(teacher_profile__show_on_website=True) | Q(student_profile__show_on_website=True))
        elif website in ("0", "false", "no"):
            qs = qs.filter(Q(teacher_profile__show_on_website=False) | Q(student_profile__show_on_website=False))
        return qs.distinct().order_by("-id")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserCreateUpdateSerializer
        return UserSerializer

    def perform_destroy(self, instance):
        if instance.role == User.Role.SUPER_ADMIN:
            instance.delete()
            return
        instance.is_active = False
        instance.save(update_fields=["is_active"])
