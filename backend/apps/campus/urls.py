from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AppealViewSet,
    AttendanceViewSet,
    CommentPhraseViewSet,
    HelpPageViewSet,
    NoticeViewSet,
    RubricViewSet,
    TemplateViewSet,
    audit_logs,
    backup_export,
    bulk_import,
    global_search,
    recycle_bin,
    transcript,
)

router = DefaultRouter()
router.register("notices", NoticeViewSet, basename="notices")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("appeals", AppealViewSet, basename="appeals")
router.register("help", HelpPageViewSet, basename="help")
router.register("templates", TemplateViewSet, basename="templates")
router.register("comments", CommentPhraseViewSet, basename="comments")
router.register("rubrics", RubricViewSet, basename="rubrics")

urlpatterns = [
    path("transcript/", transcript, name="transcript"),
    path("import/", bulk_import, name="bulk-import"),
    path("audit/", audit_logs, name="audit-logs"),
    path("backup/", backup_export, name="backup-export"),
    path("search/", global_search, name="global-search"),
    path("recycle/", recycle_bin, name="recycle-bin"),
    path("", include(router.urls)),
]
