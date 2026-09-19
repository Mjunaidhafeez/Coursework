from rest_framework import serializers

from apps.common.uploads import media_field_url

from .models import (
    Appeal,
    AttendanceRecord,
    AttendanceSession,
    CommentPhrase,
    CourseworkTemplate,
    HelpPage,
    Notice,
    RubricItem,
)


class NoticeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = Notice
        fields = [
            "id",
            "kind",
            "title",
            "body",
            "starts_at",
            "ends_at",
            "audience",
            "course",
            "course_code",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["created_by"]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    username = serializers.CharField(source="student.username", read_only=True)
    roll_no = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = ["id", "student", "student_name", "username", "roll_no", "avatar", "status", "remark"]

    def get_student_name(self, obj):
        return obj.student.get_full_name().strip() or obj.student.username

    def get_roll_no(self, obj):
        return getattr(getattr(obj.student, "student_profile", None), "student_id", "") or ""

    def get_avatar(self, obj):
        return media_field_url(getattr(obj.student, "avatar", None), self.context.get("request"))


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "session_date",
            "topic",
            "marked_by",
            "marked_by_name",
            "records",
            "created_at",
        ]
        read_only_fields = ["marked_by"]

    def get_marked_by_name(self, obj):
        if not obj.marked_by:
            return ""
        return obj.marked_by.get_full_name().strip() or obj.marked_by.username


class AppealSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    coursework_title = serializers.CharField(source="coursework.title", read_only=True)

    class Meta:
        model = Appeal
        fields = [
            "id",
            "kind",
            "status",
            "student",
            "student_name",
            "coursework",
            "coursework_title",
            "reason",
            "teacher_note",
            "extra_days",
            "created_at",
        ]
        read_only_fields = ["student", "status"]


class HelpPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpPage
        fields = ["id", "title", "slug", "body", "audience", "is_published", "created_at"]


class CourseworkTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseworkTemplate
        fields = [
            "id",
            "title",
            "description",
            "coursework_type",
            "submission_type",
            "max_marks",
            "lock_at_due_time",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by"]


class CommentPhraseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentPhrase
        fields = ["id", "phrase", "created_at"]
        read_only_fields = ["id", "created_at"]


class RubricItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricItem
        fields = ["id", "coursework", "title", "weight", "max_marks"]
