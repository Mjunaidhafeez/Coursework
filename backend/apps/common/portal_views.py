from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsSuperAdmin
from apps.common.models import PortalSettings
from apps.common.portal import apply_updates, branding_payload, full_payload
from apps.common.uploads import cloudinary_enabled, upload_to_cloudinary, validate_upload

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


@api_view(["GET"])
@permission_classes([AllowAny])
def portal_settings_public(request):
    return Response(branding_payload(PortalSettings.load()))


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def portal_settings_admin(request):
    row = PortalSettings.load()
    if request.method == "GET":
        return Response(full_payload(row))
    apply_updates(row, request.data or {})
    return Response(full_payload(row))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def portal_branding_upload(request):
    upload = request.FILES.get("file")
    kind = str(request.data.get("kind") or "logo").strip().lower()
    if kind not in {"logo", "login_background"}:
        return Response({"detail": "kind must be logo or login_background."}, status=status.HTTP_400_BAD_REQUEST)
    if not upload:
        return Response({"detail": "An image file is required."}, status=status.HTTP_400_BAD_REQUEST)
    ext = f".{(upload.name or '').rsplit('.', 1)[-1].lower()}"
    if ext not in IMAGE_EXT:
        return Response({"detail": "Use PNG, JPG, WEBP or GIF."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_upload(upload)
        if hasattr(upload, "seek"):
            upload.seek(0)
        if cloudinary_enabled():
            stored = upload_to_cloudinary(upload, folder="mba-portal/branding")
            url = stored.get("url") or ""
        else:
            filename = f"portal/{kind}_{upload.name}"
            path = default_storage.save(filename, ContentFile(upload.read()))
            url = request.build_absolute_uri(f"{settings.MEDIA_URL}{path}")
    except ValidationError as exc:
        detail = exc.detail[0] if isinstance(exc.detail, (list, tuple)) else exc.detail
        return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
    if not url:
        return Response({"detail": "Could not store the image."}, status=status.HTTP_400_BAD_REQUEST)
    row = PortalSettings.load()
    if kind == "logo":
        row.logo_url = url
    else:
        row.login_background_url = url
    row.save(update_fields=["logo_url", "login_background_url", "updated_at"])
    return Response({"url": url, "kind": kind, "settings": full_payload(row)})
