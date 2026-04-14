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
