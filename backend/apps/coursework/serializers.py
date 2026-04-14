from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.groups.models import GroupMember, StudentGroup

from .models import Coursework, FeedbackGrade, Submission, SubmissionFile


class CourseworkSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    teacher_names = serializers.SerializerMethodField()

    class Meta:
        model = Coursework
        fields = [
            "id",
            "course",
            "course_title",
            "title",
            "description",
            "coursework_type",
            "submission_type",
            "max_group_members",
            "teacher_names",
            "lock_at_due_time",
            "deadline",
            "max_marks",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_teacher_names(self, obj):
        names = []
        for teacher in obj.course.teachers.all():
            full_name = teacher.get_full_name().strip()
            names.append(full_name or teacher.username)
        return names

    def validate(self, attrs):
        submission_type = attrs.get("submission_type") or getattr(self.instance, "submission_type", None)
        max_group_members = attrs.get("max_group_members", getattr(self.instance, "max_group_members", None))

        if submission_type in [Coursework.SubmissionType.GROUP, Coursework.SubmissionType.BOTH]:
            if not max_group_members:
                raise serializers.ValidationError({"max_group_members": "Max members is required for group/both submission type."})
            if max_group_members < 2:
                raise serializers.ValidationError({"max_group_members": "Max members should be at least 2."})
        elif submission_type == Coursework.SubmissionType.INDIVIDUAL:
            attrs["max_group_members"] = None

        return attrs

    def validate_deadline(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future.")
        return value

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class SubmissionFileSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionFile
        fields = ["id", "file", "file_name", "uploaded_by", "uploaded_at", "created_at"]
        read_only_fields = fields

    def get_file_name(self, obj):
        return obj.file.name.split("/")[-1] if obj.file else ""


class SubmissionSerializer(serializers.ModelSerializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, write_only=True
    )
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_roll_no = serializers.SerializerMethodField()
    student_avatar = serializers.SerializerMethodField()
    group_name = serializers.CharField(source="group.name", read_only=True)
    coursework_title = serializers.CharField(source="coursework.title", read_only=True)
    requested_member_names = serializers.SerializerMethodField()
    requested_member_details = serializers.SerializerMethodField()
    group_member_ids = serializers.SerializerMethodField()
    group_member_details = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    last_file_updated_by_name = serializers.SerializerMethodField()
    last_file_updated_at = serializers.SerializerMethodField()
    is_marked = serializers.SerializerMethodField()
    obtained_marks = serializers.SerializerMethodField()
    submitted_files = SubmissionFileSerializer(many=True, read_only=True, source="submission_files")

    class Meta:
        model = Submission
        fields = [
            "id",
            "coursework",
            "coursework_title",
            "student",
            "student_name",
            "student_roll_no",
            "student_avatar",
            "group",
            "group_name",
            "member_ids",
            "requested_member_ids",
            "requested_member_names",
            "requested_member_details",
            "group_member_ids",
            "group_member_details",
            "submitted_by_name",
            "last_file_updated_by_name",
            "last_file_updated_at",
            "topic",
            "file",
            "submitted_files",
            "submitted_at",
            "is_late",
            "version",
            "status",
            "approval_status",
            "is_marked",
            "obtained_marks",
            "created_at",
        ]
        read_only_fields = ["student", "submitted_at", "is_late", "version", "status", "approval_status", "requested_member_ids"]

    def get_student_roll_no(self, obj):
        student = getattr(obj, "student", None)
        return getattr(getattr(student, "student_profile", None), "student_id", "") or ""

    def get_student_avatar(self, obj):
        student = getattr(obj, "student", None)
        avatar = getattr(student, "avatar", None)
        return avatar.url if avatar else None

    def get_requested_member_names(self, obj):
        if not obj.requested_member_ids:
            return []
        users = User.objects.filter(id__in=obj.requested_member_ids).order_by("first_name", "last_name", "username")
        result = []
        for user in users:
            full_name = user.get_full_name().strip()
            result.append(full_name or user.username)
        return result

    def get_requested_member_details(self, obj):
        if not obj.requested_member_ids:
            return []
        users = User.objects.filter(id__in=obj.requested_member_ids).order_by("first_name", "last_name", "username")
        result = []
        for user in users:
            full_name = user.get_full_name().strip() or user.username
            avatar = getattr(user, "avatar", None)
            result.append(
                {
                    "id": user.id,
                    "name": full_name,
                    "roll_no": getattr(getattr(user, "student_profile", None), "student_id", "") or "",
                    "avatar": avatar.url if avatar else None,
                }
            )
        return result

    def get_group_member_ids(self, obj):
        group = getattr(obj, "group", None)
        if not group:
            return []
        return list(
            GroupMember.objects.filter(group=group, accepted=True)
            .values_list("student_id", flat=True)
        )

    def get_group_member_details(self, obj):
        group = getattr(obj, "group", None)
        if not group:
            return []
        result = []
        members = GroupMember.objects.filter(group=group, accepted=True).select_related("student")
        for member in members:
            student = member.student
            avatar = getattr(student, "avatar", None)
            full_name = student.get_full_name().strip() or student.username
            result.append(
                {
                    "id": student.id,
                    "name": full_name,
                    "roll_no": getattr(getattr(student, "student_profile", None), "student_id", "") or "",
                    "avatar": avatar.url if avatar else None,
                }
            )
        return result

    def get_submitted_by_name(self, obj):
        if not obj.student:
            return "-"
        full_name = obj.student.get_full_name().strip()
        return full_name or obj.student.username

    def get_last_file_updated_by_name(self, obj):
        if not obj.file:
            return "-"
        return self.get_submitted_by_name(obj)

    def get_last_file_updated_at(self, obj):
        if not obj.file:
            return None
        return obj.submitted_at

    def get_is_marked(self, obj):
        return bool(getattr(obj, "feedback_grade", None))

    def get_obtained_marks(self, obj):
        feedback = getattr(obj, "feedback_grade", None)
        return str(feedback.marks) if feedback else None

    def validate(self, attrs):
        request = self.context["request"]
        coursework = attrs.get("coursework") or getattr(self.instance, "coursework", None)
        if not coursework:
            raise serializers.ValidationError({"coursework": "Coursework is required."})
        group = attrs.get("group", getattr(self.instance, "group", None))
        member_ids = attrs.get("member_ids", [])
        existing_requested_members = getattr(self.instance, "requested_member_ids", []) if self.instance else []
        user = request.user
        now = timezone.now()
        topic = (attrs.get("topic") or getattr(self.instance, "topic", "") or "").strip()

        if not topic:
            raise serializers.ValidationError({"topic": "Topic is required."})

        if coursework.lock_at_due_time and now > coursework.deadline:
            raise serializers.ValidationError("Submission is locked because the due time has passed.")

        if (
            self.instance
            and request.user.role == User.Role.STUDENT
            and "file" in attrs
            and self.instance.approval_status != Submission.ApprovalStatus.APPROVED
        ):
            raise serializers.ValidationError(
                {"file": "You can upload file only after teacher/admin approval of your request."}
            )

        if group:
            if group.scope == StudentGroup.Scope.COURSE and group.course_id != coursework.course_id:
                raise serializers.ValidationError("Selected group course does not match coursework course.")
            if group.scope == StudentGroup.Scope.COURSEWORK and group.coursework_id != coursework.id:
                raise serializers.ValidationError("Selected group is not for this coursework.")

        if coursework.submission_type == Coursework.SubmissionType.GROUP:
            has_member_context = bool(member_ids) or bool(existing_requested_members)
            if not group and not has_member_context:
                raise serializers.ValidationError({"group": "Select existing group or choose new members."})
            if not GroupMember.objects.filter(group=group, student=user, accepted=True).exists():
                if group:
                    raise serializers.ValidationError("You are not a member of this group.")
        elif coursework.submission_type == Coursework.SubmissionType.INDIVIDUAL:
            if group or member_ids:
                raise serializers.ValidationError("Group cannot be set for individual coursework.")
        elif coursework.submission_type == Coursework.SubmissionType.BOTH and group:
            if not GroupMember.objects.filter(group=group, student=user, accepted=True).exists():
                raise serializers.ValidationError("You are not a member of this group.")

        if member_ids:
            if group:
                raise serializers.ValidationError({"member_ids": "Use either existing group or new members, not both."})
            students_qs = User.objects.filter(id__in=member_ids, role=User.Role.STUDENT)
            if students_qs.count() != len(member_ids):
                raise serializers.ValidationError({"member_ids": "One or more selected members are invalid."})
            if coursework.max_group_members:
                total_members = len(set(member_ids)) + 1  # include current student
                if total_members > coursework.max_group_members:
                    raise serializers.ValidationError(
                        {"member_ids": f"Max allowed members are {coursework.max_group_members}."}
                    )

        if group and coursework.max_group_members:
            accepted_members_count = GroupMember.objects.filter(group=group, accepted=True).count()
            if accepted_members_count > coursework.max_group_members:
                raise serializers.ValidationError(
                    f"Selected group has {accepted_members_count} members, but max allowed is {coursework.max_group_members}."
                )

        # Prevent duplicate coursework requests/submissions for the same participant context.
        if self.instance is None:
            existing = None
            if coursework.submission_type == Coursework.SubmissionType.GROUP or group or member_ids:
                existing = self._find_existing_group_context_submission(coursework, user.id, group)
            else:
                existing = Submission.objects.filter(
                    coursework=coursework,
                    student=user,
                    group__isnull=True,
                ).order_by("-submitted_at").first()
            if existing:
                approval = existing.approval_status or Submission.ApprovalStatus.PENDING
                raise serializers.ValidationError(
                    {
                        "coursework": (
                            f"Request already exists for this coursework (status: {approval}). "
                            "Duplicate request is not allowed."
                        )
                    }
                )

        return attrs

    def _find_existing_group_context_submission(self, coursework, user_id, group):
        if group:
            return (
                Submission.objects.filter(coursework=coursework, group=group)
                .order_by("-submitted_at")
                .first()
            )

        # Existing group-based submission for any group where current user is a member.
        by_group_membership = (
            Submission.objects.filter(
                coursework=coursework,
                group__members__student_id=user_id,
                group__members__accepted=True,
            )
            .order_by("-submitted_at")
            .first()
        )
        if by_group_membership:
            return by_group_membership

        # Existing member-based (group-less) submission where user is creator or selected member.
        for submission in Submission.objects.filter(coursework=coursework, group__isnull=True).order_by("-submitted_at"):
            participant_ids = set(submission.requested_member_ids or [])
            if submission.student_id:
                participant_ids.add(submission.student_id)
            if user_id in participant_ids:
                return submission
        return None

    def create(self, validated_data):
        request = self.context["request"]
        coursework = validated_data["coursework"]
        user = request.user
        group = validated_data.get("group")
        member_ids = validated_data.pop("member_ids", [])

        existing = Submission.objects.filter(coursework=coursework, group=group, student=user if not group else user).first()
        next_version = (existing.version + 1) if existing else 1
        # Keep submitter reference for both individual and group workflows.
        validated_data["student"] = user
        validated_data["version"] = next_version
        validated_data["approval_status"] = Submission.ApprovalStatus.PENDING
        validated_data["requested_member_ids"] = list(dict.fromkeys([int(mid) for mid in member_ids]))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # If file is uploaded/replaced, refresh submitted_at to reflect actual file submission time.
        if validated_data.get("file") is not None:
            validated_data["submitted_at"] = timezone.now()
            # Track who last uploaded/replaced the file.
            validated_data["student"] = self.context["request"].user
        return super().update(instance, validated_data)


class FeedbackGradeSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    overridden_by_name = serializers.SerializerMethodField()

    def get_teacher_name(self, obj):
        teacher = getattr(obj, "teacher", None)
        if not teacher:
            return "-"
        return teacher.get_full_name().strip() or teacher.username

    def get_overridden_by_name(self, obj):
        user = getattr(obj, "overridden_by", None)
        if not user:
            return None
        return user.get_full_name().strip() or user.username

    class Meta:
        model = FeedbackGrade
        fields = [
            "id",
            "submission",
            "teacher",
            "teacher_name",
            "feedback",
            "marks",
            "overridden_by",
            "overridden_by_name",
            "override_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["teacher", "overridden_by"]

    def validate_marks(self, value):
        submission = self.initial_data.get("submission")
        if submission:
            submission_obj = Submission.objects.get(pk=submission)
            if value > submission_obj.coursework.max_marks:
                raise serializers.ValidationError("Marks cannot exceed coursework max marks.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["teacher"] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if user.role == User.Role.SUPER_ADMIN and "marks" in validated_data:
            validated_data["overridden_by"] = user
        return super().update(instance, validated_data)
