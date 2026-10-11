from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.models import AuditLog


class AuditLogMixin:
    def create_audit_log(self, request, action, obj, metadata=None):
        AuditLog.objects.create(
            actor=request.user,
            action=action,
            object_type=obj.__class__.__name__,
            object_id=str(obj.pk),
            metadata=metadata or {},
        )


def parse_bulk_ids(data):
    ids = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(ids, list) or not ids:
        return None
    return ids


class BulkActionMixin:
    bulk_update_fields = ()

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        ids = parse_bulk_ids(request.data)
        if ids is None:
            return Response({"detail": "ids list is required."}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.filter_queryset(self.get_queryset()).filter(pk__in=ids)
        deleted = 0
        for instance in qs:
            self.perform_destroy(instance)
            deleted += 1
        return Response({"deleted_count": deleted})

    @action(detail=False, methods=["post"])
    def bulk_update(self, request):
        ids = parse_bulk_ids(request.data)
        if ids is None:
            return Response({"detail": "ids list is required."}, status=status.HTTP_400_BAD_REQUEST)
        allowed = set(self.bulk_update_fields or ())
        fields = {key: value for key, value in (request.data.get("fields") or {}).items() if key in allowed}
        if not fields:
            return Response({"detail": "No updatable fields provided."}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.filter_queryset(self.get_queryset()).filter(pk__in=ids)
        updated = 0
        for instance in qs:
            serializer = self.get_serializer(instance, data=fields, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            updated += 1
        return Response({"updated_count": updated})
