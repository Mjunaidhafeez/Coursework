from rest_framework.permissions import BasePermission

from .models import User


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.SUPER_ADMIN)


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.TEACHER)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.STUDENT)


class IsTeacherOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in [User.Role.TEACHER, User.Role.SUPER_ADMIN]
        )
