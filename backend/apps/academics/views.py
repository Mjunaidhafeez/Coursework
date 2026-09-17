import mimetypes

from django.http import FileResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin, IsTeacherOrAdmin

from .models import Course, CourseStudyFile, Enrollment, Semester
from .serializers import CourseSerializer, CourseStudyFileSerializer, EnrollmentSerializer, SemesterSerializer


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    filterset_fields = ["number"]
    ordering_fields = ["number", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"], permission_classes=[IsSuperAdmin])
    def create_defaults(self, request):
        created = 0
        for number in range(1, 9):
            _, is_created = Semester.objects.get_or_create(number=number)
            if is_created:
                created += 1
        return Response({"created": created, "total": Semester.objects.count()}, status=status.HTTP_200_OK)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("semester").prefetch_related("teachers", "study_files")
    serializer_class = CourseSerializer
    filterset_fields = ["semester", "teachers"]
    search_fields = ["title", "code"]
    ordering_fields = ["code", "title", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "upload_study_file", "delete_study_file"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]

    def _can_manage_course_files(self, user, course):
        if user.role == User.Role.SUPER_ADMIN:
            return True
        return user.role == User.Role.TEACHER and course.teachers.filter(id=user.id).exists()

    @action(detail=True, methods=["post"], url_path="study-files")
    def upload_study_file(self, request, pk=None):
        course = self.get_object()
        if not self._can_manage_course_files(request.user, course):
            return Response({"detail": "You can only upload files for your courses."}, status=status.HTTP_403_FORBIDDEN)
        title = str(request.data.get("title") or "").strip()
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "A study file is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not title:
            title = upload.name.rsplit(".", 1)[0]
        study_file = CourseStudyFile.objects.create(
            course=course,
            title=title,
            file=upload,
            uploaded_by=request.user,
        )
        return Response(CourseStudyFileSerializer(study_file, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="study-files/(?P<file_id>[^/.]+)")
    def delete_study_file(self, request, pk=None, file_id=None):
        course = self.get_object()
        if not self._can_manage_course_files(request.user, course):
            return Response({"detail": "You can only remove files from your courses."}, status=status.HTTP_403_FORBIDDEN)
        study_file = CourseStudyFile.objects.filter(course=course, id=file_id).first()
        if not study_file:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        study_file.file.delete(save=False)
        study_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _study_file_or_404(self, course, file_id):
        return CourseStudyFile.objects.filter(course=course, id=file_id).first()

    def _serve_study_file(self, course, file_id, as_attachment):
        study_file = self._study_file_or_404(course, file_id)
        if not study_file or not study_file.file:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        filename = study_file.file.name.split("/")[-1]
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        handle = study_file.file.open("rb")
        response = FileResponse(handle, as_attachment=as_attachment, filename=filename, content_type=content_type)
        if as_attachment:
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
        else:
            response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=True, methods=["get"], url_path="study-files/(?P<file_id>[^/.]+)/view")
    def view_study_file(self, request, pk=None, file_id=None):
        return self._serve_study_file(self.get_object(), file_id, as_attachment=False)

    @action(detail=True, methods=["get"], url_path="study-files/(?P<file_id>[^/.]+)/download")
    def download_study_file(self, request, pk=None, file_id=None):
        return self._serve_study_file(self.get_object(), file_id, as_attachment=True)

    def _enroll_semester_students(self, course):
        student_ids = User.objects.filter(
            role=User.Role.STUDENT,
            student_profile__semester_id=course.semester_id,
        ).values_list("id", flat=True)
        Enrollment.objects.bulk_create(
            [Enrollment(student_id=student_id, course=course) for student_id in student_ids],
            ignore_conflicts=True,
        )

    def perform_create(self, serializer):
        course = serializer.save()
        self._enroll_semester_students(course)

    def perform_update(self, serializer):
        course = serializer.save()
        self._enroll_semester_students(course)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.TEACHER:
            return queryset.filter(teachers=user)
        if user.role == User.Role.STUDENT:
            all_semesters = str(self.request.query_params.get("all_semesters", "")).lower() in ["1", "true", "yes"]
            requested_semester = self.request.query_params.get("semester")
            if all_semesters:
                return queryset
            if requested_semester:
                return queryset.filter(semester_id=requested_semester)
            semester_id = getattr(getattr(user, "student_profile", None), "semester_id", None)
            if semester_id:
                return queryset.filter(semester_id=semester_id)
            return queryset.filter(enrollments__student=user)
        return queryset


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("student", "student__student_profile", "course")
    serializer_class = EnrollmentSerializer
    filterset_fields = ["course", "student"]
    ordering_fields = ["created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "list", "retrieve"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]
