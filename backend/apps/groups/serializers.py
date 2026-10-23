from rest_framework import serializers

from apps.accounts.models import User
from apps.academics.models import Enrollment
from apps.common.notify import push_notifications
from apps.common.uploads import media_field_url

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
        return media_field_url(getattr(obj.student, "avatar", None), self.context.get("request"))

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
            "is_lead",
            "accepted",
            "invitation_status",
            "created_at",
        ]


class StudentGroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), write_only=True, required=False)
    creator_name = serializers.CharField(source="creator.username", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_semester = serializers.IntegerField(source="course.semester.number", read_only=True, allow_null=True)
    course_department = serializers.CharField(source="course.department.name", read_only=True, allow_null=True, default="")
    coursework_title = serializers.CharField(source="coursework.title", read_only=True)
    semester_number = serializers.IntegerField(source="semester.number", read_only=True, allow_null=True)
    department_name = serializers.CharField(source="department.name", read_only=True, allow_null=True, default="")
    school_class_name = serializers.CharField(source="school_class.name", read_only=True, allow_null=True, default="")
    section_name = serializers.CharField(source="section.name", read_only=True, allow_null=True, default="")
    lead_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    lead_name = serializers.SerializerMethodField()
    lead_roll_no = serializers.SerializerMethodField()

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
            "course_semester",
            "course_department",
            "coursework",
            "coursework_title",
            "semester",
            "semester_number",
            "department",
            "department_name",
            "school_class",
            "school_class_name",
            "section",
            "section_name",
            "creator",
            "creator_name",
            "coursework_type",
            "status",
            "member_ids",
            "members",
            "lead_id",
            "lead_name",
            "lead_roll_no",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["creator"]
        extra_kwargs = {
            "semester": {"required": False, "allow_null": True},
            "department": {"required": False, "allow_null": True},
            "school_class": {"required": False, "allow_null": True},
            "section": {"required": False, "allow_null": True},
        }

    def to_internal_value(self, data):
        payload = data.copy() if hasattr(data, "copy") else dict(data)
        for key in ("semester", "department", "school_class", "section", "course", "coursework"):
            if payload.get(key) in ("", "null", "undefined"):
                payload[key] = None
        return super().to_internal_value(payload)

    def _apply_org_defaults(self, group, member_ids=None):
        fields = []
        course = group.course
        if course:
            if not group.semester_id and course.semester_id:
                group.semester_id = course.semester_id
                fields.append("semester")
            if not group.department_id and getattr(course, "department_id", None):
                group.department_id = course.department_id
                fields.append("department")
        if not all([group.semester_id, group.department_id, group.school_class_id, group.section_id]):
            profile = None
            if member_ids:
                user = User.objects.filter(id__in=member_ids).select_related("student_profile").first()
                profile = getattr(user, "student_profile", None)
            if profile is None and group.pk:
                member = group.members.select_related("student__student_profile").first()
                profile = getattr(getattr(member, "student", None), "student_profile", None)
            if profile:
                for attr, value in (
                    ("semester_id", profile.semester_id),
                    ("department_id", profile.department_id),
                    ("school_class_id", profile.school_class_id),
                    ("section_id", profile.section_id),
                ):
                    if value and not getattr(group, attr):
                        setattr(group, attr, value)
                        fields.append(attr[:-3] if attr.endswith("_id") else attr)
        if fields:
            group.save(update_fields=list(dict.fromkeys(fields)))
        return group

    def _lead_member(self, obj):
        for member in obj.members.all():
            if member.is_lead:
                return member
        return None

    def get_lead_name(self, obj):
        member = self._lead_member(obj)
        if not member:
            return ""
        return (member.student.get_full_name() or "").strip() or member.student.username

    def get_lead_roll_no(self, obj):
        member = self._lead_member(obj)
        if not member:
            return ""
        return getattr(getattr(member.student, "student_profile", None), "student_id", "") or ""

    def _apply_lead(self, group, lead_id=None):
        member_ids = set(group.members.values_list("student_id", flat=True))
        if not member_ids:
            return group
        chosen = None
        if lead_id and int(lead_id) in member_ids:
            chosen = int(lead_id)
        else:
            existing = group.members.filter(is_lead=True, student_id__in=member_ids).first()
            if existing:
                chosen = existing.student_id
            elif group.creator_id in member_ids:
                chosen = group.creator_id
            else:
                chosen = min(member_ids)
        group.members.update(is_lead=False)
        group.members.filter(student_id=chosen).update(is_lead=True)
        return group

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

            candidate_ids = set(member_ids)
            if request.user.role == User.Role.STUDENT:
                candidate_ids.add(request.user.id)
                if len(candidate_ids) < 2:
                    raise serializers.ValidationError(
                        {"member_ids": "Select at least one classmate besides yourself."}
                    )
                profile = getattr(request.user, "student_profile", None)
                locks = {
                    key: getattr(profile, key, None)
                    for key in ("semester_id", "department_id", "school_class_id", "section_id")
                    if getattr(profile, key, None)
                }
                if locks:
                    peers = User.objects.filter(id__in=candidate_ids, role=User.Role.STUDENT).select_related("student_profile")
                    for student in peers:
                        peer_profile = getattr(student, "student_profile", None)
                        if any(getattr(peer_profile, key, None) != value for key, value in locks.items()):
                            raise serializers.ValidationError(
                                {
                                    "member_ids": "You can only add classmates from your own semester, class and section."
                                }
                            )

            active_memberships = GroupMember.active_for_students(
                candidate_ids, exclude_group_id=getattr(self.instance, "id", None)
            )
            first_conflict = active_memberships.order_by("student_id", "created_at").first()
            if first_conflict:
                student_label = first_conflict.student.get_full_name().strip() or first_conflict.student.username
                state = "already in" if first_conflict.group.status == StudentGroup.Status.APPROVED else "already listed on a pending request for"
                raise serializers.ValidationError(
                    {
                        "member_ids": (
                            f"{student_label} is {state} '{first_conflict.group.name}'. "
                            "A student can belong to only one class group."
                        )
                    }
                )

        lead_id = attrs.get("lead_id")
        check_ids = member_ids
        if check_ids is None and self.instance:
            check_ids = list(self.instance.members.values_list("student_id", flat=True))
        if lead_id and check_ids is not None and int(lead_id) not in {int(sid) for sid in check_ids}:
            raise serializers.ValidationError({"lead_id": "Group lead must be one of the selected members."})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        member_ids = validated_data.pop("member_ids", [])
        lead_id = validated_data.pop("lead_id", None)
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
                push_notifications(
                    [student_id],
                    f"Group invitation: {group.name}",
                    f"You were invited to join group '{group.name}' for {target_label}.",
                )

        if request.user.role == User.Role.STUDENT:
            reviewer_ids = list(User.objects.filter(role=User.Role.SUPER_ADMIN, is_active=True).values_list("id", flat=True))
            if group.course_id:
                reviewer_ids.extend(group.course.teachers.filter(is_active=True).values_list("id", flat=True))
            else:
                reviewer_ids.extend(User.objects.filter(role=User.Role.TEACHER, is_active=True).values_list("id", flat=True))
            push_notifications(
                reviewer_ids,
                "New group request submitted",
                f"{request.user.get_full_name().strip() or request.user.username} requested group '{group.name}' for {target_label}.",
            )
        self._apply_lead(group, lead_id)
        return self._apply_org_defaults(group, member_set)

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        lead_id = validated_data.pop("lead_id", None)
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
            request = self.context.get("request")
            admin_edit = getattr(getattr(request, "user", None), "role", None) == User.Role.SUPER_ADMIN
            auto_accept = admin_edit or instance.status == StudentGroup.Status.APPROVED
            for student_id in desired_ids - existing:
                is_creator = student_id == instance.creator_id
                accept = auto_accept or is_creator
                GroupMember.objects.create(
                    group=instance,
                    student_id=student_id,
                    accepted=accept,
                    invitation_status=(
                        GroupMember.InvitationStatus.ACCEPTED if accept else GroupMember.InvitationStatus.PENDING
                    ),
                )
                if not is_creator:
                    push_notifications(
                        [student_id],
                        f"Group invitation: {instance.name}",
                        f"You were invited to join group '{instance.name}' for {target_label}.",
                    )
            instance.members.exclude(student_id__in=desired_ids).delete()

        if member_ids is not None or lead_id is not None:
            self._apply_lead(instance, lead_id)
        return self._apply_org_defaults(instance, member_ids)
