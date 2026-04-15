from decimal import Decimal, InvalidOperation

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.permissions import IsTeacherOrAdmin
from apps.academics.models import Enrollment
from apps.common.mixins import AuditLogMixin
from apps.common.models import Notification
from apps.groups.models import GroupMember

from .models import Coursework, FeedbackGrade, Submission, SubmissionFile
from .serializers import CourseworkSerializer, FeedbackGradeSerializer, SubmissionSerializer


class CourseworkViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Coursework.objects.select_related("course", "created_by").prefetch_related("course__teachers")
    serializer_class = CourseworkSerializer
    filterset_fields = ["course", "coursework_type", "submission_type"]
    search_fields = ["title", "description"]
    ordering_fields = ["deadline", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsTeacherOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        deadline_state = str(self.request.query_params.get("deadline_state", "")).lower()
        now = timezone.now()
        if deadline_state in ["opening", "open"]:
            queryset = queryset.filter(deadline__gte=now)
        elif deadline_state in ["closed", "close"]:
            queryset = queryset.filter(deadline__lt=now)
        if user.role == User.Role.TEACHER:
            return queryset.filter(course__teachers=user)
        if user.role == User.Role.STUDENT:
            return queryset.filter(course__enrollments__student=user)
        return queryset

    def perform_create(self, serializer):
        obj = serializer.save()
        if obj.auto_approve_all_students:
            enrolled_student_ids = list(
                Enrollment.objects.filter(course_id=obj.course_id).values_list("student_id", flat=True).distinct()
            )
            now = timezone.now()
            submissions_to_create = [
                Submission(
                    coursework=obj,
                    student_id=student_id,
                    topic=obj.title or "",
                    submitted_at=now,
                    approval_status=Submission.ApprovalStatus.APPROVED,
                )
                for student_id in enrolled_student_ids
            ]
            if submissions_to_create:
                Submission.objects.bulk_create(submissions_to_create)
        self.create_audit_log(self.request, "coursework_created", obj, {"coursework_type": obj.coursework_type})

    def destroy(self, request, *args, **kwargs):
        coursework = self.get_object()
        user = request.user
        if user.role == User.Role.TEACHER and FeedbackGrade.objects.filter(submission__coursework=coursework).exists():
            raise PermissionDenied("Coursework cannot be deleted because one or more submissions are already marked.")
        return super().destroy(request, *args, **kwargs)


class SubmissionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Submission.objects.select_related("coursework", "student", "group", "feedback_grade").prefetch_related(
        "submission_files"
    )
    serializer_class = SubmissionSerializer
    filterset_fields = ["coursework", "status", "group", "approval_status"]
    search_fields = ["status", "coursework__title", "student__username", "group__name"]
    ordering_fields = ["submitted_at", "created_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            member_based_ids = []
            for row in queryset.filter(group__isnull=True).values("id", "student_id", "requested_member_ids"):
                participant_ids = set(row.get("requested_member_ids") or [])
                if row.get("student_id"):
                    participant_ids.add(row["student_id"])
                if user.id in participant_ids:
                    member_based_ids.append(row["id"])
            return queryset.filter(
                Q(student=user)
                | Q(group__members__student=user, group__members__accepted=True)
                | Q(id__in=member_based_ids)
            ).distinct()
        elif user.role == User.Role.TEACHER:
            queryset = queryset.filter(coursework__course__teachers=user)

        workflow_state = str(self.request.query_params.get("workflow_state", "")).lower().strip()
        if workflow_state == "request_pending":
            queryset = queryset.filter(
                approval_status=Submission.ApprovalStatus.PENDING,
                feedback_grade__isnull=True,
            )
        elif workflow_state == "request_rejected":
            queryset = queryset.filter(
                approval_status=Submission.ApprovalStatus.REJECTED,
                feedback_grade__isnull=True,
            )
        elif workflow_state == "ready_for_upload":
            queryset = queryset.filter(
                approval_status=Submission.ApprovalStatus.APPROVED,
                feedback_grade__isnull=True,
            ).filter(Q(file__isnull=True) | Q(file=""), submission_files__isnull=True)
        elif workflow_state == "file_submitted":
            queryset = queryset.filter(
                approval_status=Submission.ApprovalStatus.APPROVED,
                feedback_grade__isnull=True,
            ).filter(Q(submission_files__isnull=False) | (~Q(file__isnull=True) & ~Q(file=""))).distinct()
        elif workflow_state == "marked":
            queryset = queryset.filter(feedback_grade__isnull=False)

        return queryset

    def perform_create(self, serializer):
        submission = serializer.save()
        self.create_audit_log(self.request, "submission_created", submission, {"status": submission.status})
        teacher_ids = submission.coursework.course.teachers.values_list("id", flat=True)
        notifications = [
            Notification(
                user_id=teacher_id,
                title=f"New submission for {submission.coursework.title}",
                body=f"Submission #{submission.id} requires review.",
            )
            for teacher_id in teacher_ids
        ]
        Notification.objects.bulk_create(notifications)

    def _get_scope_submissions(self, submission, scope):
        if scope == "group" and submission.group_id:
            return self._ensure_group_member_submissions(submission)
        return Submission.objects.filter(id=submission.id)

    def _ensure_moderation_permission(self, user, submission):
        if user.role not in [User.Role.TEACHER, User.Role.SUPER_ADMIN]:
            raise PermissionDenied("Only teacher/admin can manage submissions.")
        if user.role == User.Role.TEACHER and not submission.coursework.course.teachers.filter(id=user.id).exists():
            raise PermissionDenied("You can only manage submissions for your courses.")

    def _ensure_group_member_submissions(self, submission):
        if not submission.group_id:
            return Submission.objects.filter(id=submission.id)

        accepted_member_ids = list(
            GroupMember.objects.filter(group_id=submission.group_id, accepted=True).values_list("student_id", flat=True)
        )
        existing_student_ids = set(
            Submission.objects.filter(coursework=submission.coursework, group_id=submission.group_id)
            .exclude(student_id__isnull=True)
            .values_list("student_id", flat=True)
        )
        to_create = []
        for student_id in accepted_member_ids:
            if student_id in existing_student_ids:
                continue
            clone = Submission(
                coursework=submission.coursework,
                student_id=student_id,
                group_id=submission.group_id,
                requested_member_ids=submission.requested_member_ids or [],
                topic=submission.topic or "",
                submitted_at=submission.submitted_at,
                file=submission.file.name if submission.file else None,
                is_late=submission.is_late,
                status=submission.status,
                approval_status=submission.approval_status,
                version=submission.version,
            )
            to_create.append(clone)
        if to_create:
            Submission.objects.bulk_create(to_create)

        return Submission.objects.filter(coursework=submission.coursework, group_id=submission.group_id)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        submission = self.get_object()
        user = request.user
        self._ensure_moderation_permission(user, submission)
        scope = str(request.query_params.get("scope") or request.data.get("scope") or "").strip().lower()
        targets = self._get_scope_submissions(submission, scope)
        updated = targets.update(approval_status=Submission.ApprovalStatus.APPROVED)
        submission.refresh_from_db()
        return Response(
            {
                "submission": self.get_serializer(submission).data,
                "updated_count": updated,
                "scope": "group" if scope == "group" and submission.group_id else "single",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        submission = self.get_object()
        user = request.user
        self._ensure_moderation_permission(user, submission)
        scope = str(request.query_params.get("scope") or request.data.get("scope") or "").strip().lower()
        targets = self._get_scope_submissions(submission, scope)
        updated = targets.update(approval_status=Submission.ApprovalStatus.REJECTED)
        submission.refresh_from_db()
        return Response(
            {
                "submission": self.get_serializer(submission).data,
                "updated_count": updated,
                "scope": "group" if scope == "group" and submission.group_id else "single",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def bulk_approve(self, request):
        items = request.data.get("items") or []
        if not isinstance(items, list) or not items:
            return Response({"detail": "items list is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.role not in [User.Role.TEACHER, User.Role.SUPER_ADMIN]:
            raise PermissionDenied("Only teacher/admin can manage submissions.")
        teacher_course_ids = (
            set(user.teaching_courses.values_list("id", flat=True))
            if user.role == User.Role.TEACHER
            else None
        )
        requested_ids = [item.get("id") for item in items if item.get("id")]
        submissions_by_id = {
            submission.id: submission
            for submission in Submission.objects.select_related("coursework__course").filter(id__in=requested_ids)
        }

        updated_count = 0
        errors = []
        for index, item in enumerate(items):
            submission_id = item.get("id")
            scope = str(item.get("scope") or "").strip().lower()
            submission = submissions_by_id.get(submission_id)
            if not submission:
                errors.append({"index": index, "id": submission_id, "detail": "Submission not found."})
                continue
            if teacher_course_ids is not None and submission.coursework.course_id not in teacher_course_ids:
                errors.append({"index": index, "id": submission_id, "detail": "Not allowed for this course."})
                continue
            targets = self._get_scope_submissions(submission, scope)
            updated_count += targets.update(approval_status=Submission.ApprovalStatus.APPROVED)

        return Response(
            {
                "updated_count": updated_count,
                "error_count": len(errors),
                "errors": errors,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        if request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Only admin can bulk delete submissions.")
        ids = request.data.get("ids") or []
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "ids list is required."}, status=status.HTTP_400_BAD_REQUEST)
        target_qs = Submission.objects.filter(id__in=ids)
        deleted_count = target_qs.count()
        target_qs.delete()
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)

    def _can_student_edit_submission(self, user, submission):
        if submission.student_id == user.id:
            return True
        if user.id in (submission.requested_member_ids or []):
            return True
        return submission.group and submission.group.members.filter(student_id=user.id, accepted=True).exists()

    def _ensure_upload_permission(self, user, submission):
        if user.role == User.Role.SUPER_ADMIN:
            return
        if user.role == User.Role.TEACHER:
            if not submission.coursework.course.teachers.filter(id=user.id).exists():
                raise PermissionDenied("You can only manage files for your courses.")
            return
        if user.role == User.Role.STUDENT:
            if not self._can_student_edit_submission(user, submission):
                raise PermissionDenied("You do not have permission to upload/delete files for this submission.")
            if submission.approval_status != Submission.ApprovalStatus.APPROVED:
                raise PermissionDenied("Files can be managed only after request approval.")
            if getattr(submission, "feedback_grade", None):
                raise PermissionDenied("Files cannot be changed after marking.")
            if submission.coursework.lock_at_due_time and timezone.now() > submission.coursework.deadline:
                raise PermissionDenied("Submission is locked because due time has passed.")
            return
        raise PermissionDenied("You do not have permission to manage files.")

    def _sync_primary_file_from_uploaded_files(self, submission):
        latest = submission.submission_files.order_by("-uploaded_at", "-created_at").first()
        if latest:
            submission.file = latest.file.name
            submission.submitted_at = latest.uploaded_at
            if latest.uploaded_by_id:
                submission.student_id = latest.uploaded_by_id
        else:
            submission.file = None
        submission.save()

    @action(detail=True, methods=["post"])
    def upload_files(self, request, pk=None):
        submission = self.get_object()
        self._ensure_upload_permission(request.user, submission)

        files = request.FILES.getlist("files")
        if not files and request.FILES.get("file"):
            files = [request.FILES["file"]]
        if not files:
            return Response({"detail": "No files provided."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for file_obj in files:
            created.append(
                SubmissionFile.objects.create(
                    submission=submission,
                    file=file_obj,
                    uploaded_by=request.user,
                    uploaded_at=timezone.now(),
                )
            )
        self._sync_primary_file_from_uploaded_files(submission)
        submission.refresh_from_db()
        return Response(
            {
                "submission": self.get_serializer(submission).data,
                "uploaded_count": len(created),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def delete_file(self, request, pk=None):
        submission = self.get_object()
        self._ensure_upload_permission(request.user, submission)
        file_id = request.data.get("file_id") or request.query_params.get("file_id")
        if not file_id:
            return Response({"detail": "file_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        target = submission.submission_files.filter(id=file_id).first()
        if not target:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        if target.file:
            target.file.delete(save=False)
        target.delete()
        self._sync_primary_file_from_uploaded_files(submission)
        submission.refresh_from_db()
        return Response(
            {
                "submission": self.get_serializer(submission).data,
            },
            status=status.HTTP_200_OK,
        )

    def perform_update(self, serializer):
        submission = self.get_object()
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.TEACHER]:
            serializer.save()
            return
        if user.role == User.Role.STUDENT and self._can_student_edit_submission(user, submission):
            serializer.save()
            return
        raise PermissionDenied("You do not have permission to update this submission.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role in [User.Role.SUPER_ADMIN, User.Role.TEACHER]:
            instance.delete()
            return
        if user.role == User.Role.STUDENT and self._can_student_edit_submission(user, instance):
            instance.delete()
            return
        raise PermissionDenied("You do not have permission to delete this submission.")


class FeedbackGradeViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FeedbackGrade.objects.select_related("submission", "teacher", "overridden_by")
    serializer_class = FeedbackGradeSerializer
    filterset_fields = ["teacher", "submission__coursework__course"]
    search_fields = ["feedback", "submission__coursework__title", "submission__student__username"]
    ordering_fields = ["updated_at", "created_at"]

    def get_permissions(self):
        return [IsTeacherOrAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.TEACHER:
            return queryset.filter(submission__coursework__course__teachers=user)
        return queryset

    def _ensure_group_member_submissions(self, submission):
        if not submission.group_id:
            return [submission]

        accepted_member_ids = list(
            GroupMember.objects.filter(group_id=submission.group_id, accepted=True).values_list("student_id", flat=True)
        )
        existing_by_student = {
            item.student_id: item
            for item in Submission.objects.filter(coursework=submission.coursework, group_id=submission.group_id)
            if item.student_id
        }

        to_create = []
        for student_id in accepted_member_ids:
            if student_id in existing_by_student:
                continue
            clone = Submission(
                coursework=submission.coursework,
                student_id=student_id,
                group_id=submission.group_id,
                requested_member_ids=submission.requested_member_ids or [],
                topic=submission.topic or "",
                submitted_at=submission.submitted_at,
                file=submission.file.name if submission.file else None,
                is_late=submission.is_late,
                status=submission.status,
                approval_status=submission.approval_status,
                version=submission.version,
            )
            to_create.append(clone)

        if to_create:
            Submission.objects.bulk_create(to_create)

        return list(Submission.objects.filter(coursework=submission.coursework, group_id=submission.group_id))

    def _ensure_member_request_submissions(self, submission):
        participant_ids = set(submission.requested_member_ids or [])
        if submission.student_id:
            participant_ids.add(submission.student_id)
        if not participant_ids:
            return [submission]

        request_topic = (submission.topic or "").strip()
        request_member_ids = set(submission.requested_member_ids or [])

        candidates = Submission.objects.filter(coursework=submission.coursework, group__isnull=True)
        matching_rows = []
        for item in candidates:
            item_topic = (item.topic or "").strip()
            item_member_ids = set(item.requested_member_ids or [])
            if item_topic == request_topic and item_member_ids == request_member_ids:
                matching_rows.append(item)

        existing_by_student = {item.student_id: item for item in matching_rows if item.student_id}
        to_create = []
        for student_id in participant_ids:
            if student_id in existing_by_student:
                continue
            to_create.append(
                Submission(
                    coursework=submission.coursework,
                    student_id=student_id,
                    group_id=None,
                    requested_member_ids=submission.requested_member_ids or [],
                    topic=submission.topic or "",
                    submitted_at=submission.submitted_at,
                    file=submission.file.name if submission.file else None,
                    is_late=submission.is_late,
                    status=submission.status,
                    approval_status=submission.approval_status,
                    version=submission.version,
                )
            )
        if to_create:
            Submission.objects.bulk_create(to_create)

        refreshed = Submission.objects.filter(coursework=submission.coursework, group__isnull=True)
        result = []
        for item in refreshed:
            item_topic = (item.topic or "").strip()
            item_member_ids = set(item.requested_member_ids or [])
            if item_topic == request_topic and item_member_ids == request_member_ids and item.student_id in participant_ids:
                result.append(item)
        return result or [submission]

    def _requested_scope(self):
        scope = self.request.query_params.get("scope") or self.request.data.get("scope")
        return "group" if scope == "group" else "single"

    def _requested_target_student_id(self):
        raw_value = self.request.query_params.get("target_student_id") or self.request.data.get("target_student_id")
        if raw_value in (None, ""):
            return None

    def _effective_scope_from_values(self, submission, scope, target_student_id):
        requested_scope = "group" if scope == "group" else "single"
        if requested_scope == "group":
            return "group"
        has_explicit_target = target_student_id is not None
        is_collaborative = bool(submission.group_id) or bool(submission.requested_member_ids)
        if not has_explicit_target and is_collaborative:
            return "group"
        return "single"
        try:
            return int(raw_value)
        except (TypeError, ValueError):
            return None

    def _effective_scope(self, submission):
        return self._effective_scope_from_values(
            submission,
            self._requested_scope(),
            self._requested_target_student_id(),
        )

    def _resolve_target_submission_for_values(self, submission, target_student_id):
        if not target_student_id:
            return submission
        if submission.student_id == target_student_id:
            return submission
        if not submission.group_id:
            same_request_rows = self._ensure_member_request_submissions(submission)
            for item in same_request_rows:
                if item.student_id == target_student_id:
                    return item

            return Submission.objects.create(
                coursework=submission.coursework,
                student_id=target_student_id,
                group_id=None,
                requested_member_ids=submission.requested_member_ids or [],
                topic=submission.topic or "",
                submitted_at=submission.submitted_at,
                file=submission.file.name if submission.file else None,
                is_late=submission.is_late,
                status=submission.status,
                approval_status=submission.approval_status,
                version=submission.version,
            )
        group_submissions = self._ensure_group_member_submissions(submission)
        for item in group_submissions:
            if item.student_id == target_student_id:
                return item
        return submission

    def _resolve_target_submission(self, submission):
        return self._resolve_target_submission_for_values(submission, self._requested_target_student_id())

    def _scope_targets_from_values(self, submission, scope, target_student_id):
        if self._effective_scope_from_values(submission, scope, target_student_id) != "group":
            return [submission]
        if submission.group_id:
            return self._ensure_group_member_submissions(submission)
        return self._ensure_member_request_submissions(submission)

    def _scope_targets(self, submission):
        return self._scope_targets_from_values(
            submission,
            self._requested_scope(),
            self._requested_target_student_id(),
        )

    def create(self, request, *args, **kwargs):
        incoming_submission_id = request.data.get("submission")
        if not incoming_submission_id:
            return super().create(request, *args, **kwargs)

        try:
            base_submission = Submission.objects.get(pk=incoming_submission_id)
        except Submission.DoesNotExist:
            return super().create(request, *args, **kwargs)

        target_submission = self._resolve_target_submission(base_submission)
        payload = request.data.copy()
        payload["submission"] = target_submission.id

        existing_feedback = FeedbackGrade.objects.filter(submission=target_submission).first()
        if existing_feedback:
            serializer = self.get_serializer(existing_feedback, data=payload, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            self.create_audit_log(
                request,
                "feedback_updated",
                existing_feedback,
                {"marks": str(serializer.validated_data.get("marks", existing_feedback.marks))},
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _propagate_group_feedback(self, feedback):
        submission = feedback.submission
        if self._effective_scope(submission) != "group":
            return

        group_submissions = self._scope_targets(submission)
        for item in group_submissions:
            if item.id == submission.id:
                continue
            FeedbackGrade.objects.update_or_create(
                submission=item,
                defaults={
                    "teacher": feedback.teacher,
                    "feedback": feedback.feedback,
                    "marks": feedback.marks,
                    "overridden_by": feedback.overridden_by,
                    "override_reason": feedback.override_reason,
                },
            )

    def perform_create(self, serializer):
        target_submission = self._resolve_target_submission(serializer.validated_data["submission"])
        feedback, _created = FeedbackGrade.objects.update_or_create(
            submission=target_submission,
            defaults={
                "teacher": self.request.user,
                "feedback": serializer.validated_data.get("feedback", ""),
                "marks": serializer.validated_data["marks"],
                "overridden_by": serializer.validated_data.get("overridden_by"),
                "override_reason": serializer.validated_data.get("override_reason", ""),
            },
        )
        self._propagate_group_feedback(feedback)
        self.create_audit_log(self.request, "feedback_created", feedback, {"marks": str(feedback.marks)})

        targets = self._scope_targets(feedback.submission)
        notifications = []
        for submission in targets:
            if not submission.student_id:
                continue
            notifications.append(
                Notification(
                    user_id=submission.student_id,
                    title=f"Grade published: {submission.coursework.title}",
                    body=f"You received {feedback.marks}/{submission.coursework.max_marks}.",
                )
            )
        if notifications:
            Notification.objects.bulk_create(notifications)

    def perform_update(self, serializer):
        feedback = serializer.save()
        self._propagate_group_feedback(feedback)

    @action(detail=False, methods=["post"])
    def bulk_upsert(self, request):
        items = request.data.get("items") or []
        if not isinstance(items, list) or not items:
            return Response({"detail": "items list is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        teacher_course_ids = (
            set(user.teaching_courses.values_list("id", flat=True))
            if user.role == User.Role.TEACHER
            else None
        )
        requested_ids = [item.get("submission") for item in items if item.get("submission")]
        submissions_by_id = {
            submission.id: submission
            for submission in Submission.objects.select_related("coursework__course").filter(id__in=requested_ids)
        }

        updated_count = 0
        errors = []
        for index, item in enumerate(items):
            submission_id = item.get("submission")
            submission = submissions_by_id.get(submission_id)
            if not submission:
                errors.append({"index": index, "submission": submission_id, "detail": "Submission not found."})
                continue
            if teacher_course_ids is not None and submission.coursework.course_id not in teacher_course_ids:
                errors.append({"index": index, "submission": submission_id, "detail": "Not allowed for this course."})
                continue

            raw_marks = item.get("marks")
            try:
                marks_value = Decimal(str(raw_marks))
            except (InvalidOperation, TypeError):
                errors.append({"index": index, "submission": submission_id, "detail": "Invalid marks value."})
                continue
            if marks_value > submission.coursework.max_marks:
                errors.append(
                    {
                        "index": index,
                        "submission": submission_id,
                        "detail": f"Marks cannot exceed {submission.coursework.max_marks}.",
                    }
                )
                continue

            scope = str(item.get("scope") or "single").strip().lower()
            target_student_id = item.get("target_student_id")
            try:
                target_student_id = int(target_student_id) if target_student_id not in [None, ""] else None
            except (TypeError, ValueError):
                target_student_id = None

            target_submission = self._resolve_target_submission_for_values(submission, target_student_id)
            feedback_obj, _ = FeedbackGrade.objects.update_or_create(
                submission=target_submission,
                defaults={
                    "teacher": request.user,
                    "feedback": item.get("feedback", "") or "",
                    "marks": marks_value,
                },
            )

            targets = self._scope_targets_from_values(target_submission, scope, target_student_id)
            if len(targets) > 1:
                for peer in targets:
                    if peer.id == target_submission.id:
                        continue
                    FeedbackGrade.objects.update_or_create(
                        submission=peer,
                        defaults={
                            "teacher": request.user,
                            "feedback": feedback_obj.feedback,
                            "marks": feedback_obj.marks,
                        },
                    )
            updated_count += 1

        return Response(
            {
                "updated_count": updated_count,
                "error_count": len(errors),
                "errors": errors,
            },
            status=status.HTTP_200_OK,
        )
