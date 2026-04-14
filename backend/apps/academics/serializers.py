from rest_framework import serializers

from .models import Course, Enrollment, Semester


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ["id", "number", "created_at", "updated_at"]


class CourseSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)
    semester_name = serializers.SerializerMethodField()
    teacher_names = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "semester",
            "semester_number",
            "semester_name",
            "teachers",
            "teacher_names",
            "created_at",
            "updated_at",
        ]

    def get_semester_name(self, obj):
        return f"Semester {obj.semester.number}"

    def get_teacher_names(self, obj):
        names = []
        for teacher in obj.teachers.all():
            full_name = teacher.get_full_name().strip()
            names.append(full_name or teacher.username)
        return names

    def validate(self, attrs):
        teachers = attrs.get("teachers")
        if teachers is not None and len(teachers) == 0:
            raise serializers.ValidationError({"teachers": "At least one teacher must be assigned."})

        code = attrs.get("code")
        semester = attrs.get("semester")
        if code and semester:
            qs = Course.objects.filter(code__iexact=code.strip(), semester=semester)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"code": "This course code already exists in selected semester."})
        return attrs


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()
    student_roll_no = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        return obj.student.get_full_name().strip() or obj.student.username

    def get_student_roll_no(self, obj):
        return getattr(getattr(obj.student, "student_profile", None), "student_id", "") or ""

    class Meta:
        model = Enrollment
        fields = ["id", "student", "student_name", "student_roll_no", "course", "course_title", "created_at"]
