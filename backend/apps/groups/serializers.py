from rest_framework import serializers

from apps.accounts.models import User
from apps.academics.models import Enrollment
from apps.common.models import Notification

from .models import GroupMember, StudentGroup


class GroupMemberSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_roll_no = serializers.SerializerMethodField()
    student_avatar = serializers.SerializerMethodField()
    group_name = serializers.CharField(source="group.name", read_only=True)
    course_title = serializers.CharField(source="group.course.title", read_only=True)

    def get_student_roll_no(self, obj):
        return getattr(getattr(obj.student, "student_profile", None), "student_id", "") or ""

    def get_student_avatar(self, obj):
        avatar = getattr(obj.student, "avatar", None)
        return avatar.url if avatar else None

    class Meta:
        model = GroupMember
        fields = [
            "id",
            "group",
            "group_name",
            "course_title",
            "student",
            "student_name",
            "student_roll_no",
            "student_avatar",
            "accepted",
            "invitation_status",
            "created_at",
        ]


class StudentGroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), write_only=True, required=False)
    creator_name = serializers.CharField(source="creator.username", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    coursework_title = serializers.CharField(source="coursework.title", read_only=True)

    class Meta:
        model = StudentGroup
        fields = [
            "id",
            "name",
            "description",
            "source",
            "scope",
            "course",
            "course_title",
            "coursework",
            "coursework_title",
            "creator",
            "creator_name",
            "coursework_type",
            "status",
            "member_ids",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["creator"]

    def validate_member_ids(self, value):
        if not value:
            return []
        return list(dict.fromkeys(value))

    def validate(self, attrs):
        request = self.context["request"]
        source = attrs.get("source") or getattr(self.instance, "source", StudentGroup.Source.MANUAL)
        scope = attrs.get("scope") or getattr(self.instance, "scope", StudentGroup.Scope.COURSE)
        course = attrs.get("course") or getattr(self.instance, "course", None)
        coursework = attrs.get("coursework") or getattr(self.instance, "coursework", None)
        member_ids = attrs.get("member_ids", None)

        if source == StudentGroup.Source.COURSEWORK_SUBMISSION and scope == StudentGroup.Scope.GLOBAL:
            if coursework:
                attrs["scope"] = StudentGroup.Scope.COURSEWORK
                attrs["course"] = coursework.course
                scope = attrs["scope"]
                course = attrs["course"]
            elif course:
                attrs["scope"] = StudentGroup.Scope.COURSE
                scope = attrs["scope"]
            else:
                raise serializers.ValidationError(
                    {"scope": "Course/coursework scoped group is required for coursework submission flow."}
                )

        if scope == StudentGroup.Scope.GLOBAL:
            attrs["course"] = None
            attrs["coursework"] = None
            course = None
        elif scope == StudentGroup.Scope.COURSE:
            attrs["coursework"] = None
            if not course:
                raise serializers.ValidationError({"course": "Course is required for course-wise groups."})
        elif scope == StudentGroup.Scope.COURSEWORK:
            if not coursework:
                raise serializers.ValidationError({"coursework": "Coursework is required for coursework-wise groups."})
            attrs["course"] = coursework.course
            course = coursework.course
        else:
            raise serializers.ValidationError({"scope": "Invalid group scope selected."})

        if (
            request.user.role == User.Role.STUDENT
            and course
            and not Enrollment.objects.filter(course=course, student=request.user).exists()
        ):
            raise serializers.ValidationError({"course": "You can only request group for your enrolled courses."})

        if request.user.role == User.Role.TEACHER and course and not course.teachers.filter(id=request.user.id).exists():
            raise serializers.ValidationError({"course": "You can only manage groups for your assigned courses."})

        if member_ids is not None:
            students_qs = User.objects.filter(id__in=member_ids, role=User.Role.STUDENT)
            if students_qs.count() != len(member_ids):
                raise serializers.ValidationError({"member_ids": "One or more selected students are invalid."})

            # Keep student requests course-aware, but allow admin/teacher operational flexibility
            # (especially during setup when enrollments are not fully mapped yet).
            if request.user.role == User.Role.STUDENT and course:
                enrolled_ids = set(
                    Enrollment.objects.filter(course=course, student_id__in=member_ids).values_list("student_id", flat=True)
                )
                missing = [sid for sid in member_ids if sid not in enrolled_ids]
                if missing:
                    raise serializers.ValidationError(
                        {"member_ids": "All selected students must be enrolled in this course."}
                    )

            # Class-group guard: one student can belong to only one active manual group.
            # Exclude the current group on edit so existing members can be retained.
            candidate_ids = set(member_ids)
            if request.user.role == User.Role.STUDENT:
                candidate_ids.add(request.user.id)

            active_memberships = GroupMember.objects.filter(
                student_id__in=candidate_ids,
                accepted=True,
                group__source=StudentGroup.Source.MANUAL,
                group__status__in=[StudentGroup.Status.PENDING, StudentGroup.Status.APPROVED],
            ).select_related("group", "student")
            if self.instance:
                active_memberships = active_memberships.exclude(group_id=self.instance.id)

            first_conflict = active_memberships.order_by("student_id", "created_at").first()
            if first_conflict:
                student_label = first_conflict.student.get_full_name().strip() or first_conflict.student.username
                raise serializers.ValidationError(
                    {
                        "member_ids": (
                            f"{student_label} is already part of '{first_conflict.group.name}'. "
                            "A student can belong to only one class group."
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        member_ids = validated_data.pop("member_ids", [])
        if request.user.role == User.Role.STUDENT:
            validated_data["status"] = StudentGroup.Status.PENDING
        elif request.user.role == User.Role.SUPER_ADMIN:
            validated_data["status"] = StudentGroup.Status.APPROVED

        group = StudentGroup.objects.create(creator=request.user, **validated_data)
        target_label = (
            group.coursework.title
            if group.coursework
            else (group.course.title if group.course else "all courses")
        )

        member_set = set(member_ids)
        if request.user.role == User.Role.STUDENT:
            member_set.add(request.user.id)

        for student_id in member_set:
            is_creator = student_id == request.user.id
            auto_accept = request.user.role == User.Role.SUPER_ADMIN
            defaults = {
                "accepted": True if auto_accept else is_creator,
                "invitation_status": (
                    GroupMember.InvitationStatus.ACCEPTED
                    if (is_creator or auto_accept)
                    else GroupMember.InvitationStatus.PENDING
                ),
            }
            GroupMember.objects.get_or_create(group=group, student_id=student_id, defaults=defaults)

            if not is_creator and not auto_accept:
                Notification.objects.create(
                    user_id=student_id,
                    title=f"Group invitation: {group.name}",
                    body=f"You were invited to join group '{group.name}' for {target_label}.",
                )

        if request.user.role == User.Role.STUDENT:
            admin_ids = User.objects.filter(role=User.Role.SUPER_ADMIN).values_list("id", flat=True)
            Notification.objects.bulk_create(
                [
                    Notification(
                        user_id=admin_id,
                        title="New group request submitted",
                        body=f"{request.user.username} requested group '{group.name}' for {target_label}.",
                    )
                    for admin_id in admin_ids
                ]
            )
        return group

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        target_label = (
            instance.coursework.title
            if instance.coursework
            else (instance.course.title if instance.course else "all courses")
        )

        if member_ids is not None:
            desired_ids = set(member_ids)
            if instance.creator.role == User.Role.STUDENT:
                desired_ids.add(instance.creator_id)

            existing = set(instance.members.values_list("student_id", flat=True))
            for student_id in desired_ids - existing:
                is_creator = student_id == instance.creator_id
                GroupMember.objects.create(
                    group=instance,
                    student_id=student_id,
                    accepted=is_creator,
                    invitation_status=(
                        GroupMember.InvitationStatus.ACCEPTED if is_creator else GroupMember.InvitationStatus.PENDING
                    ),
                )
                if not is_creator:
                    Notification.objects.create(
                        user_id=student_id,
                        title=f"Group invitation: {instance.name}",
                        body=f"You were invited to join group '{instance.name}' for {target_label}.",
                    )
            instance.members.exclude(student_id__in=desired_ids).delete()

        return instance
