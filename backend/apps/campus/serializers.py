from rest_framework import serializers

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
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    username = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ["id", "student", "student_name", "username", "status"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ["id", "course", "course_code", "session_date", "topic", "marked_by", "records", "created_at"]
        read_only_fields = ["marked_by"]


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
