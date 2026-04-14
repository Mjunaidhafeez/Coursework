from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import StudentProfile, TeacherProfile, User


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
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "full_name": self.user.get_full_name().strip() or self.user.username,
            "avatar": avatar_url,
            "role": self.user.role,
        }
        return data


class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = ["id", "department"]


class StudentProfileSerializer(serializers.ModelSerializer):
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "student_id", "semester", "semester_number"]
        extra_kwargs = {
            # Handled in parent serializer to support update-on-self without false duplicate error.
            "student_id": {"validators": []},
        }


class UserSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    student_profile = StudentProfileSerializer(required=False)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "role",
            "avatar",
            "teacher_profile",
            "student_profile",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class SelfProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "avatar", "password"]

    def validate(self, attrs):
        request = self.context["request"]
        password = attrs.get("password")
        if password and request.user.role not in [User.Role.STUDENT, User.Role.TEACHER]:
            raise serializers.ValidationError({"password": "Only student/teacher can change password from this profile form."})
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    student_profile = StudentProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "password",
            "teacher_profile",
            "student_profile",
        ]

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", User.Role.STUDENT))
        email = attrs.get("email", getattr(self.instance, "email", "")).strip().lower()
        teacher_profile_data = attrs.get("teacher_profile", None)
        student_profile_data = attrs.get("student_profile", None)

        if not email:
            raise serializers.ValidationError({"email": "Email is required."})

        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"email": "This email is already in use."})

        if role == User.Role.TEACHER:
            if teacher_profile_data is None:
                raise serializers.ValidationError({"teacher_profile": "Teacher profile is required for teacher role."})
            if not (teacher_profile_data.get("department") or "").strip():
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
            if profile_qs.exists():
                raise serializers.ValidationError({"student_profile": {"student_id": "Student profile with this student id already exists."}})

        return attrs

    def create(self, validated_data):
        teacher_profile_data = validated_data.pop("teacher_profile", None)
        student_profile_data = validated_data.pop("student_profile", None)
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
        return user

    def update(self, instance, validated_data):
        teacher_profile_data = validated_data.pop("teacher_profile", None)
        student_profile_data = validated_data.pop("student_profile", None)
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
        return instance
