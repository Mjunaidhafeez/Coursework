from urllib.parse import quote

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin, IsTeacherOrAdmin
from apps.common.uploads import delete_stored_file, file_response_for_instance, public_file_url, store_upload, validate_upload
from apps.common.whatsapp import notify_event

from .models import Course, CourseStudyFile, Enrollment, Semester
from .serializers import CourseSerializer, CourseStudyFileSerializer, EnrollmentSerializer, SemesterSerializer

STUDY_FILE_SIGNER = TimestampSigner(salt="mba-course-study-file")
STUDY_FILE_TOKEN_MAX_AGE = 2 * 60 * 60
OFFICE_PREVIEW_EXT = {"doc", "docx", "ppt", "pptx", "xls", "xlsx"}


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
        if self.action in ["create", "update", "partial_update", "destroy", "upload_study_file", "delete_study_file", "rename_study_file"]:
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
        try:
            validate_upload(upload)
        except ValidationError as exc:
            return Response({"detail": exc.detail if hasattr(exc, "detail") else str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if not title:
            title = upload.name.rsplit(".", 1)[0]
        study_file = CourseStudyFile(course=course, title=title, uploaded_by=request.user)
        store_upload(study_file, upload, folder=f"mba-portal/courses/{course.id}")
        study_file.save()
        students = User.objects.filter(enrollments__course=course, is_active=True).distinct()
        notify_event(students, f"New study file in {course.code}: {study_file.title}")
        return Response(CourseStudyFileSerializer(study_file, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="study-files/(?P<file_id>[^/.]+)")
    def delete_study_file(self, request, pk=None, file_id=None):
        course = self.get_object()
        if not self._can_manage_course_files(request.user, course):
            return Response({"detail": "You can only remove files from your courses."}, status=status.HTTP_403_FORBIDDEN)
        study_file = CourseStudyFile.objects.filter(course=course, id=file_id).first()
        if not study_file:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        delete_stored_file(study_file)
        study_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="study-files/(?P<file_id>[^/.]+)")
    def rename_study_file(self, request, pk=None, file_id=None):
        course = self.get_object()
        if not self._can_manage_course_files(request.user, course):
            return Response({"detail": "You can only rename files for your courses."}, status=status.HTTP_403_FORBIDDEN)
        study_file = CourseStudyFile.objects.filter(course=course, id=file_id).first()
        if not study_file:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        title = str(request.data.get("title") or "").strip()
        if not title:
            return Response({"detail": "File name is required."}, status=status.HTTP_400_BAD_REQUEST)
        study_file.title = title[:200]
        study_file.save(update_fields=["title"])
        return Response(CourseStudyFileSerializer(study_file, context={"request": request}).data)

    def _study_file_or_404(self, course, file_id):
        return CourseStudyFile.objects.filter(course=course, id=file_id).first()

    def _study_file_name(self, study_file):
        if study_file.original_name:
            return study_file.original_name
        if study_file.file:
            return study_file.file.name.split("/")[-1]
        url = public_file_url(study_file)
        return url.split("/")[-1] if url else (study_file.title or "file")

    def _serve_study_file(self, course, file_id, as_attachment):
        study_file = self._study_file_or_404(course, file_id)
        if not study_file:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            response = file_response_for_instance(study_file, as_attachment=as_attachment)
        except ValidationError as exc:
            detail = exc.detail[0] if isinstance(exc.detail, (list, tuple)) else exc.detail
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
        if not response:
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        return response

    @action(detail=True, methods=["get"], url_path="study-files/(?P<file_id>[^/.]+)/view")
    def view_study_file(self, request, pk=None, file_id=None):
        return self._serve_study_file(self.get_object(), file_id, as_attachment=False)

    @action(detail=True, methods=["get"], url_path="study-files/(?P<file_id>[^/.]+)/download")
    def download_study_file(self, request, pk=None, file_id=None):
        return self._serve_study_file(self.get_object(), file_id, as_attachment=True)

    @action(detail=True, methods=["get"], url_path="study-files/(?P<file_id>[^/.]+)/preview-link")
    def study_file_preview_link(self, request, pk=None, file_id=None):
        course = self.get_object()
        study_file = self._study_file_or_404(course, file_id)
        if not study_file or (not study_file.file and not study_file.file_url):
            return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
        filename = self._study_file_name(study_file)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        token = STUDY_FILE_SIGNER.sign(f"{course.id}:{study_file.id}")
        base = (getattr(settings, "PORTAL_PUBLIC_URL", "") or request.build_absolute_uri("/")).rstrip("/")
        public_url = f"{base}/api/academics/study-files/public/?token={quote(token, safe='')}"
        viewer_url = (
            f"https://view.officeapps.live.com/op/embed.aspx?src={quote(public_url, safe='')}"
            if ext in OFFICE_PREVIEW_EXT
            else public_url
        )
        return Response(
            {
                "public_url": public_url,
                "viewer_url": viewer_url,
                "kind": "office" if ext in OFFICE_PREVIEW_EXT else "file",
                "file_name": filename,
            }
        )

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


@api_view(["GET"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def public_study_file(request):
    token = str(request.query_params.get("token") or "").strip()
    if not token:
        return Response({"detail": "Preview token is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        value = STUDY_FILE_SIGNER.unsign(token, max_age=STUDY_FILE_TOKEN_MAX_AGE)
        course_id, file_id = str(value).split(":", 1)
    except SignatureExpired:
        return Response({"detail": "This preview link has expired. Open the file again."}, status=status.HTTP_400_BAD_REQUEST)
    except (BadSignature, ValueError):
        return Response({"detail": "Invalid preview link."}, status=status.HTTP_404_NOT_FOUND)
    study_file = CourseStudyFile.objects.filter(course_id=course_id, id=file_id).first()
    if not study_file:
        return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        response = file_response_for_instance(
            study_file,
            as_attachment=False,
            extra_headers={"Access-Control-Allow-Origin": "*"},
        )
    except ValidationError as exc:
        detail = exc.detail[0] if isinstance(exc.detail, (list, tuple)) else exc.detail
        return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
    if not response:
        return Response({"detail": "Study file not found."}, status=status.HTTP_404_NOT_FOUND)
    return response
