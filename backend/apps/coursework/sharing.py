from django.db.models import Q

from apps.groups.models import GroupMember

from .models import Submission, SubmissionFile


def sibling_submission_qs(submission):
    base = Submission.objects.filter(coursework_id=submission.coursework_id)
    if submission.group_id:
        return base.filter(group_id=submission.group_id)
    member_ids = set(submission.requested_member_ids or [])
    if submission.student_id:
        member_ids.add(submission.student_id)
    if len(member_ids) <= 1:
        return base.filter(id=submission.id)
    return base.filter(Q(id=submission.id) | Q(student_id__in=member_ids))


def sibling_files_qs(submission):
    return (
        SubmissionFile.objects.filter(submission__in=sibling_submission_qs(submission))
        .select_related("uploaded_by")
        .order_by("uploaded_at", "created_at")
    )


def peer_student_ids(submission, exclude_id=None):
    ids = set(submission.requested_member_ids or [])
    if submission.student_id:
        ids.add(submission.student_id)
    if submission.group_id:
        ids.update(
            GroupMember.objects.filter(group_id=submission.group_id, accepted=True).values_list("student_id", flat=True)
        )
    if exclude_id:
        ids.discard(exclude_id)
    return ids
