from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.academics.enrollment import enroll_student_in_home_courses, sync_student_enrollments
from apps.academics.models import Department
from apps.common.uploads import media_field_url, normalize_phone

from .models import StudentProfile, TeacherProfile, User


def _taken_error(label, inactive=False):
    if inactive:
        return f"This {label} is in the recycle bin. Restore that account or permanently delete it first."
    return f"This {label} is already in use."


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        # Allow case-insensitive username login (helpful for roll-no style usernames).
        username = (attrs.get(self.username_field) or "").strip()
        if username:
            user_obj = User.objects.filter(username__iexact=username).first()
            if user_obj:
                attrs[self.username_field] = user_obj.username

        data = super().validate(attrs)
        avatar_url = self.user.avatar.url if self.user.avatar else None
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "phone": self.user.phone,
            "mailing_address": getattr(getattr(self.user, "student_profile", None), "mailing_address", "") or "",
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "full_name": self.user.get_full_name().strip() or self.user.username,
            "avatar": avatar_url,
            "role": self.user.role,
        }
        return data


class TeacherProfileSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(source="department_ref_id", required=False, allow_null=True)
    department_name = serializers.CharField(source="department_ref.name", read_only=True)

    class Meta:
        model = TeacherProfile
        fields = ["id", "department", "department_id", "department_name", "show_on_website"]

    def validate(self, attrs):
        raw = attrs.pop("department_ref_id", serializers.empty)
        if raw is serializers.empty:
            raw = attrs.get("department")
        dept = Department.resolve(None if raw is serializers.empty else raw)
        if dept:
            attrs["department_ref"] = dept
            attrs["department"] = dept.name
        return attrs


class StudentProfileSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    school_class_name = serializers.CharField(source="school_class.name", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "student_id",
            "semester",
            "semester_number",
            "department",
            "department_name",
            "school_class",
            "school_class_name",
            "section",
            "section_name",
            "mailing_address",
            "show_on_website",
        ]
        extra_kwargs = {
            "student_id": {"validators": []},
        }


class UserSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    student_profile = StudentProfileSerializer(required=False)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    mailing_address = serializers.SerializerMethodField()
    enrolled_course_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "mailing_address",
            "role",
            "avatar",
            "teacher_profile",
            "student_profile",
            "enrolled_course_ids",
            "is_active",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_avatar(self, obj):
        return media_field_url(obj.avatar, self.context.get("request"))

    def get_mailing_address(self, obj):
        return getattr(getattr(obj, "student_profile", None), "mailing_address", "") or ""

    def get_enrolled_course_ids(self, obj):
        enrollments = getattr(obj, "enrollments", None)
        if enrollments is None:
            return []
        return [enrollment.course_id for enrollment in enrollments.all()]


class SelfProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    mailing_address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "phone", "avatar", "password", "mailing_address"]

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        qs = User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This email is already in use.")
        return email

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate(self, attrs):
        request = self.context["request"]
        password = attrs.get("password")
        if password and request.user.role not in [User.Role.STUDENT, User.Role.TEACHER]:
            raise serializers.ValidationError({"password": "Only student/teacher can change password from this profile form."})
        return attrs

    def update(self, instance, validated_data):
        mailing_address = validated_data.pop("mailing_address", None)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if mailing_address is not None and instance.role == User.Role.STUDENT:
            profile = getattr(instance, "student_profile", None)
            if profile:
                profile.mailing_address = mailing_address
                profile.save(update_fields=["mailing_address"])
        return instance


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    student_profile = StudentProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    avatar = serializers.ImageField(required=False, allow_null=True)
    enrolled_course_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "password",
            "avatar",
            "teacher_profile",
            "student_profile",
            "enrolled_course_ids",
        ]

    def validate_username(self, value):
        username = (value or "").strip()
        if not username:
            raise serializers.ValidationError("Username is required.")
        qs = User.objects.filter(username__iexact=username)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        conflict = qs.first()
        if conflict:
            raise serializers.ValidationError(_taken_error("username", not conflict.is_active))
        return username

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", User.Role.STUDENT))
        if "phone" in attrs:
            attrs["phone"] = normalize_phone(attrs.get("phone"))
        email = attrs.get("email", getattr(self.instance, "email", "")).strip().lower()
        teacher_profile_data = attrs.get("teacher_profile", None)
        student_profile_data = attrs.get("student_profile", None)

        if not email:
            raise serializers.ValidationError({"email": "Email is required."})

        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        conflict = qs.first()
        if conflict:
            raise serializers.ValidationError({"email": _taken_error("email", not conflict.is_active)})

        if role == User.Role.TEACHER:
            if teacher_profile_data is None:
                raise serializers.ValidationError({"teacher_profile": "Teacher profile is required for teacher role."})
            if not (teacher_profile_data.get("department") or teacher_profile_data.get("department_id")):
                raise serializers.ValidationError({"teacher_profile": {"department": "Department is required."}})

        if role == User.Role.STUDENT:
            if student_profile_data is None:
                raise serializers.ValidationError({"student_profile": "Student profile is required for student role."})
            student_id = (student_profile_data.get("student_id") or "").strip()
            if not student_id:
                raise serializers.ValidationError({"student_profile": {"student_id": "Student ID is required."}})
            if not student_profile_data.get("semester"):
                raise serializers.ValidationError({"student_profile": {"semester": "Semester is required."}})

            profile_qs = StudentProfile.objects.filter(student_id=student_id)
            if self.instance and hasattr(self.instance, "student_profile"):
                profile_qs = profile_qs.exclude(pk=self.instance.student_profile.pk)
            conflict = profile_qs.select_related("user").first()
            if conflict:
                raise serializers.ValidationError({
                    "student_profile": {"student_id": _taken_error("student ID", not conflict.user.is_active)},
                })

        return attrs

    def _apply_enrollments(self, user, course_ids, *, created):
        if user.role != User.Role.STUDENT:
            return
        if course_ids is None:
            if created:
                enroll_student_in_home_courses(user)
            return
        sync_student_enrollments(user, course_ids)

    def create(self, validated_data):
        teacher_profile_data = validated_data.pop("teacher_profile", None)
        student_profile_data = validated_data.pop("student_profile", None)
        course_ids = validated_data.pop("enrolled_course_ids", None)
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password("ChangeMe123!")
        user.save()

        if user.role == User.Role.TEACHER and teacher_profile_data:
            TeacherProfile.objects.create(user=user, **teacher_profile_data)
        if user.role == User.Role.STUDENT and student_profile_data:
            StudentProfile.objects.create(user=user, **student_profile_data)
        self._apply_enrollments(user, course_ids, created=True)
        return user

    def update(self, instance, validated_data):
        teacher_profile_data = validated_data.pop("teacher_profile", None)
        student_profile_data = validated_data.pop("student_profile", None)
        course_ids = validated_data.pop("enrolled_course_ids", None)
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        if instance.role == User.Role.TEACHER and teacher_profile_data is not None:
            TeacherProfile.objects.update_or_create(user=instance, defaults=teacher_profile_data)
        if instance.role == User.Role.STUDENT and student_profile_data is not None:
            StudentProfile.objects.update_or_create(user=instance, defaults=student_profile_data)
        self._apply_enrollments(instance, course_ids, created=False)
        return instance
