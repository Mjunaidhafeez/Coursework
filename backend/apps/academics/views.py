from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin, IsTeacherOrAdmin

from .models import Course, Enrollment, Semester
from .serializers import CourseSerializer, EnrollmentSerializer, SemesterSerializer


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    filterset_fields = ["number"]
    ordering_fields = ["number", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"], permission_classes=[IsSuperAdmin])
    def create_defaults(self, request):
        created = 0
        for number in range(1, 9):
            _, is_created = Semester.objects.get_or_create(number=number)
            if is_created:
                created += 1
        return Response({"created": created, "total": Semester.objects.count()}, status=status.HTTP_200_OK)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("semester").prefetch_related("teachers")
    serializer_class = CourseSerializer
    filterset_fields = ["semester", "teachers"]
    search_fields = ["title", "code"]
    ordering_fields = ["code", "title", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.TEACHER:
            return queryset.filter(teachers=user)
        if user.role == User.Role.STUDENT:
            all_semesters = str(self.request.query_params.get("all_semesters", "")).lower() in ["1", "true", "yes"]
            requested_semester = self.request.query_params.get("semester")
            if all_semesters:
                return queryset
            if requested_semester:
                return queryset.filter(semester_id=requested_semester)
            semester_id = getattr(getattr(user, "student_profile", None), "semester_id", None)
            if semester_id:
                return queryset.filter(semester_id=semester_id)
            return queryset.filter(enrollments__student=user)
        return queryset


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("student", "course")
    serializer_class = EnrollmentSerializer
    filterset_fields = ["course", "student"]
    ordering_fields = ["created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "list", "retrieve"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]
