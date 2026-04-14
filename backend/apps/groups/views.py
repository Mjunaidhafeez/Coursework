from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsTeacherOrAdmin
from apps.academics.models import Course, Enrollment
from apps.common.models import Notification
from apps.coursework.models import Coursework

from .models import GroupMember, StudentGroup
from .serializers import GroupMemberSerializer, StudentGroupSerializer


class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.select_related("course", "coursework", "creator").prefetch_related("members")
    serializer_class = StudentGroupSerializer
    filterset_fields = ["course", "status", "scope", "coursework"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def _exclude_coursework_generated_groups(self, queryset):
        """
        Keep group-management lists focused on manually/originally created groups.
        Coursework-scoped/generated groups are hidden from this listing by default.
        """
        include_coursework_groups = str(self.request.query_params.get("include_coursework_groups", "")).lower() in [
            "1",
            "true",
            "yes",
        ]
        if include_coursework_groups:
            return queryset
        return queryset.filter(source=StudentGroup.Source.MANUAL)

    def get_queryset(self):
        queryset = self._exclude_coursework_generated_groups(super().get_queryset())
        user = self.request.user
        if user.role == User.Role.STUDENT:
            # Students are view-only for groups and can browse all approved groups.
            return queryset.filter(status=StudentGroup.Status.APPROVED).distinct()
        if user.role == User.Role.TEACHER:
            return queryset.filter(
                Q(scope=StudentGroup.Scope.GLOBAL)
                | Q(course__teachers=user)
                | Q(coursework__course__teachers=user)
            ).distinct()
        return queryset

    def _validate_student_group_write(self, request, obj):
        if request.user.role == User.Role.SUPER_ADMIN:
            return
        raise PermissionDenied("You do not have permission to modify this group.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("You do not have permission to create groups.")
        serializer.save()

    def perform_update(self, serializer):
        obj = self.get_object()
        self._validate_student_group_write(self.request, obj)
        if self.request.user.role == User.Role.STUDENT:
            serializer.save(status=StudentGroup.Status.PENDING)
            return
        serializer.save()

    def perform_destroy(self, instance):
        self._validate_student_group_write(self.request, instance)
        instance.delete()

    @action(detail=False, methods=["get"])
    def my_requests(self, request):
        if request.user.role != User.Role.STUDENT:
            raise PermissionDenied("Only students can view group requests.")
        queryset = (
            StudentGroup.objects.filter(creator=request.user, status__in=[StudentGroup.Status.PENDING, StudentGroup.Status.REJECTED])
            .select_related("course", "coursework", "creator")
            .prefetch_related("members")
        )
        queryset = self._exclude_coursework_generated_groups(queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def eligible_students(self, request):
        user = request.user
        scope = request.query_params.get("scope", StudentGroup.Scope.COURSE)
        course_id = request.query_params.get("course")
        coursework_id = request.query_params.get("coursework")
        course = None

        if scope == StudentGroup.Scope.COURSEWORK:
            if not coursework_id:
                return Response(
                    {"detail": "coursework query param is required for coursework scope."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                selected_coursework = Coursework.objects.select_related("course").get(pk=coursework_id)
            except Coursework.DoesNotExist:
                return Response({"detail": "Selected coursework does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            course = selected_coursework.course
        elif scope == StudentGroup.Scope.COURSE:
            if not course_id:
                return Response({"detail": "course query param is required for course scope."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                course = Course.objects.get(pk=course_id)
            except Course.DoesNotExist:
                return Response({"detail": "Selected course does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        if scope == StudentGroup.Scope.GLOBAL:
            if user.role == User.Role.SUPER_ADMIN:
                student_qs = User.objects.filter(role=User.Role.STUDENT).order_by("first_name", "last_name", "username")
            elif user.role == User.Role.TEACHER:
                student_qs = User.objects.filter(role=User.Role.STUDENT).order_by("first_name", "last_name", "username")
            elif user.role == User.Role.STUDENT:
                student_qs = User.objects.filter(role=User.Role.STUDENT).order_by("first_name", "last_name", "username")
            else:
                raise PermissionDenied("You do not have permission to view students.")
            results = []
            for student in student_qs:
                results.append(
                    {
                        "id": student.id,
                        "username": student.username,
                        "full_name": student.get_full_name().strip(),
                        "student_id": getattr(getattr(student, "student_profile", None), "student_id", ""),
                    }
                )
            return Response(results)

        enrollment_qs = Enrollment.objects.filter(course=course).select_related("student")
        if user.role == User.Role.TEACHER:
            if not course.teachers.filter(id=user.id).exists():
                raise PermissionDenied("You can only view students for your assigned courses.")
            enrollment_qs = enrollment_qs.filter(course__teachers=user)
        elif user.role == User.Role.STUDENT:
            if not Enrollment.objects.filter(course=course, student=user).exists():
                raise PermissionDenied("You can only view classmates for your enrolled courses.")
        elif user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("You do not have permission to view students.")

        # If enrollments are not configured yet, let admins/teachers pick from all students.
        if user.role in [User.Role.SUPER_ADMIN, User.Role.TEACHER] and not enrollment_qs.exists():
            student_qs = User.objects.filter(role=User.Role.STUDENT).order_by("first_name", "last_name", "username")
            results = []
            for student in student_qs:
                results.append(
                    {
                        "id": student.id,
                        "username": student.username,
                        "full_name": student.get_full_name().strip(),
                        "student_id": getattr(getattr(student, "student_profile", None), "student_id", ""),
                    }
                )
            return Response(results)

        results = []
        for enrollment in enrollment_qs:
            student = enrollment.student
            results.append(
                {
                    "id": student.id,
                    "username": student.username,
                    "full_name": student.get_full_name().strip(),
                    "student_id": getattr(getattr(student, "student_profile", None), "student_id", ""),
                }
            )
        return Response(results)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Only admins can approve requests.")
        group = self.get_object()
        group.status = StudentGroup.Status.APPROVED
        group.save(update_fields=["status", "updated_at"])
        target_label = (
            group.coursework.title if group.coursework else (group.course.title if group.course else "all courses")
        )
        Notification.objects.create(
            user=group.creator,
            title=f"Group approved: {group.name}",
            body=f"Your group request for {target_label} was approved by admin.",
        )
        return Response(self.get_serializer(group).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Only admins can reject requests.")
        group = self.get_object()
        group.status = StudentGroup.Status.REJECTED
        group.save(update_fields=["status", "updated_at"])
        target_label = (
            group.coursework.title if group.coursework else (group.course.title if group.course else "all courses")
        )
        Notification.objects.create(
            user=group.creator,
            title=f"Group rejected: {group.name}",
            body=f"Your group request for {target_label} was rejected by admin. Please update and resubmit.",
        )
        return Response(self.get_serializer(group).data, status=status.HTTP_200_OK)


class GroupMemberViewSet(viewsets.ModelViewSet):
    queryset = GroupMember.objects.select_related("group", "student")
    serializer_class = GroupMemberSerializer
    filterset_fields = ["group", "student", "accepted", "invitation_status"]
    ordering_fields = ["created_at"]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        if user.role == User.Role.TEACHER:
            return queryset.filter(group__course__teachers=user).distinct()
        if user.role == User.Role.STUDENT:
            return queryset.filter(student=user, group__status=StudentGroup.Status.APPROVED).distinct()
        return queryset.none()

    @action(detail=True, methods=["post"])
    def accept_invite(self, request, pk=None):
        member = self.get_object()
        if request.user.role != User.Role.STUDENT or member.student_id != request.user.id:
            raise PermissionDenied("You can only accept your own invites.")
        member.invitation_status = GroupMember.InvitationStatus.ACCEPTED
        member.accepted = True
        member.save(update_fields=["invitation_status", "accepted", "updated_at"])
        Notification.objects.create(
            user=member.group.creator,
            title=f"Invitation accepted: {member.group.name}",
            body=f"{member.student.username} accepted the invitation for group '{member.group.name}'.",
        )
        return Response(self.get_serializer(member).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def reject_invite(self, request, pk=None):
        member = self.get_object()
        if request.user.role != User.Role.STUDENT or member.student_id != request.user.id:
            raise PermissionDenied("You can only reject your own invites.")
        member.invitation_status = GroupMember.InvitationStatus.REJECTED
        member.accepted = False
        member.save(update_fields=["invitation_status", "accepted", "updated_at"])
        Notification.objects.create(
            user=member.group.creator,
            title=f"Invitation rejected: {member.group.name}",
            body=f"{member.student.username} rejected the invitation for group '{member.group.name}'.",
        )
        return Response(self.get_serializer(member).data, status=status.HTTP_200_OK)
