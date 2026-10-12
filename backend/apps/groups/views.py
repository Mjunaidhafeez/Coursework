from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.academics.models import Course, Enrollment
from apps.common.mixins import BulkActionMixin
from apps.common.notify import push_notifications
from apps.common.uploads import media_field_url
from apps.coursework.models import Coursework

from .models import GroupMember, StudentGroup
from .serializers import GroupMemberSerializer, StudentGroupSerializer


class StudentGroupViewSet(BulkActionMixin, viewsets.ModelViewSet):
    queryset = StudentGroup.objects.select_related(
        "course",
        "course__semester",
        "course__department",
        "coursework",
        "semester",
        "department",
        "school_class",
        "section",
        "creator",
    ).prefetch_related(
        Prefetch(
            "members",
            queryset=GroupMember.objects.select_related("student", "student__student_profile").order_by(*User.AS_MEMBER_ORDER),
        )
    )
    serializer_class = StudentGroupSerializer
    filterset_fields = ["course", "status", "scope", "coursework"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    bulk_update_fields = ("status",)

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
            return queryset.filter(
                Q(status=StudentGroup.Status.APPROVED) | Q(creator=user) | Q(members__student=user)
            ).distinct()
        if user.role == User.Role.TEACHER:
            queryset = queryset.filter(
                Q(scope=StudentGroup.Scope.GLOBAL)
                | Q(course__teachers=user)
                | Q(coursework__course__teachers=user)
            ).distinct()
        semester = self.request.query_params.get("semester")
        if semester:
            queryset = queryset.filter(
                Q(semester_id=semester)
                | Q(course__semester_id=semester)
                | Q(coursework__course__semester_id=semester)
            )
        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(Q(department_id=department) | Q(course__department_id=department))
        school_class = self.request.query_params.get("school_class") or self.request.query_params.get("class")
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        section = self.request.query_params.get("section")
        if section:
            queryset = queryset.filter(section_id=section)
        return queryset

    def _can_review_group(self, user, group):
        if user.role == User.Role.SUPER_ADMIN:
            return True
        if user.role != User.Role.TEACHER:
            return False
        if group.scope == StudentGroup.Scope.GLOBAL:
            return True
        course = group.course or getattr(group.coursework, "course", None)
        return bool(course and course.teachers.filter(id=user.id).exists())

    def _validate_student_group_write(self, request, obj):
        if request.user.role == User.Role.SUPER_ADMIN:
            return
        if (
            request.user.role == User.Role.STUDENT
            and obj.creator_id == request.user.id
            and obj.status in [StudentGroup.Status.PENDING, StudentGroup.Status.REJECTED]
        ):
            return
        raise PermissionDenied("You do not have permission to modify this group.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.STUDENT]:
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

    def _eligible_student_row(self, student):
        profile = getattr(student, "student_profile", None)
        semester = getattr(profile, "semester", None)
        department = getattr(profile, "department", None)
        school_class = getattr(profile, "school_class", None)
        section = getattr(profile, "section", None)
        return {
            "id": student.id,
            "username": student.username,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "full_name": student.get_full_name().strip(),
            "student_id": getattr(profile, "student_id", "") or "",
            "avatar": media_field_url(getattr(student, "avatar", None), self.request),
            "semester": getattr(semester, "id", None),
            "semester_number": getattr(semester, "number", None),
            "department": getattr(department, "id", None),
            "department_name": getattr(department, "name", "") or "",
            "school_class": getattr(school_class, "id", None),
            "school_class_name": getattr(school_class, "name", "") or "",
            "section": getattr(section, "id", None),
            "section_name": getattr(section, "name", "") or "",
            "assigned_group_id": None,
            "assigned_group_name": "",
            "assigned_group_status": "",
        }

    def _filter_eligible_students(self, student_qs):
        params = self.request.query_params
        qs = student_qs.filter(role=User.Role.STUDENT, is_active=True).select_related(
            "student_profile__semester",
            "student_profile__department",
            "student_profile__school_class",
            "student_profile__section",
        )
        semester = params.get("semester")
        if semester:
            qs = qs.filter(student_profile__semester_id=semester)
        department = params.get("department")
        if department:
            qs = qs.filter(student_profile__department_id=department)
        school_class = params.get("school_class") or params.get("class")
        if school_class:
            qs = qs.filter(student_profile__school_class_id=school_class)
        section = params.get("section")
        if section:
            qs = qs.filter(student_profile__section_id=section)
        search = (params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(username__icontains=search)
                | Q(student_profile__student_id__icontains=search)
            )
        user = self.request.user
        if user.role == User.Role.STUDENT:
            profile = getattr(user, "student_profile", None)
            if not profile:
                return qs.none()
            if profile.semester_id:
                qs = qs.filter(student_profile__semester_id=profile.semester_id)
            if profile.department_id:
                qs = qs.filter(student_profile__department_id=profile.department_id)
            if profile.school_class_id:
                qs = qs.filter(student_profile__school_class_id=profile.school_class_id)
            if profile.section_id:
                qs = qs.filter(student_profile__section_id=profile.section_id)
        return qs.order_by(*User.LIST_ORDER)

    def _eligible_students_response(self, student_qs):
        students = list(self._filter_eligible_students(student_qs))
        occupancy = {
            row.student_id: row.group
            for row in GroupMember.active_for_students([student.id for student in students])
        }
        payload = []
        for student in students:
            item = self._eligible_student_row(student)
            group = occupancy.get(student.id)
            if group:
                item["assigned_group_id"] = group.id
                item["assigned_group_name"] = group.name
                item["assigned_group_status"] = group.status
            payload.append(item)
        return Response(payload)

    @action(detail=False, methods=["get"])
    def eligible_students(self, request):
        user = request.user
        if user.role not in [User.Role.SUPER_ADMIN, User.Role.TEACHER, User.Role.STUDENT]:
            raise PermissionDenied("You do not have permission to view students.")

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
                return Response(
                    {"detail": "course query param is required for course scope."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                course = Course.objects.get(pk=course_id)
            except Course.DoesNotExist:
                return Response({"detail": "Selected course does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        if scope == StudentGroup.Scope.GLOBAL:
            return self._eligible_students_response(User.objects.all())

        enrollment_qs = Enrollment.objects.filter(course=course, student__is_active=True)
        if user.role == User.Role.TEACHER:
            if not course.teachers.filter(id=user.id).exists():
                raise PermissionDenied("You can only view students for your assigned courses.")
            enrollment_qs = enrollment_qs.filter(course__teachers=user)
        elif user.role == User.Role.STUDENT:
            if not Enrollment.objects.filter(course=course, student=user).exists():
                raise PermissionDenied("You can only view classmates for your enrolled courses.")

        enrolled_ids = list(enrollment_qs.values_list("student_id", flat=True))
        if enrolled_ids:
            return self._eligible_students_response(User.objects.filter(id__in=enrolled_ids))
        if user.role in [User.Role.SUPER_ADMIN, User.Role.TEACHER]:
            return self._eligible_students_response(User.objects.all())
        return Response([])

    def _moderate_group(self, request, new_status):
        group = self.get_object()
        if not self._can_review_group(request.user, group):
            raise PermissionDenied("You do not have permission to review this group.")
        group.status = new_status
        group.save(update_fields=["status", "updated_at"])
        if new_status == StudentGroup.Status.APPROVED:
            group.members.exclude(invitation_status=GroupMember.InvitationStatus.REJECTED).update(
                accepted=True,
                invitation_status=GroupMember.InvitationStatus.ACCEPTED,
            )
        target_label = (
            group.coursework.title if group.coursework else (group.course.title if group.course else "all courses")
        )
        actor = "admin" if request.user.role == User.Role.SUPER_ADMIN else "a teacher"
        if new_status == StudentGroup.Status.APPROVED:
            title = f"Group approved: {group.name}"
            body = f"Your group request for {target_label} was approved by {actor}."
        else:
            title = f"Group rejected: {group.name}"
            body = f"Your group request for {target_label} was rejected by {actor}. Please update and resubmit."
        push_notifications([group.creator], title, body)
        return Response(self.get_serializer(group).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._moderate_group(request, StudentGroup.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._moderate_group(request, StudentGroup.Status.REJECTED)


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
        push_notifications(
            [member.group.creator],
            f"Invitation accepted: {member.group.name}",
            f"{member.student.get_full_name().strip() or member.student.username} accepted the invitation for group '{member.group.name}'.",
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
        push_notifications(
            [member.group.creator],
            f"Invitation rejected: {member.group.name}",
            f"{member.student.get_full_name().strip() or member.student.username} rejected the invitation for group '{member.group.name}'.",
        )
        return Response(self.get_serializer(member).data, status=status.HTTP_200_OK)
