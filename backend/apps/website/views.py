from django.conf import settings as django_settings
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.accounts.permissions import IsSuperAdmin
from apps.common.uploads import cloudinary_enabled, upload_to_cloudinary, validate_upload
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .defaults import DEFAULT_PAGES
from .models import WebsiteAnnouncement, WebsiteDownload, WebsiteGalleryItem, WebsiteSettings


def _public_payload():
    row = WebsiteSettings.load()
    pages = {**DEFAULT_PAGES, **(row.pages or {})}
    return {
        "site_name": row.site_name,
        "tagline": row.tagline,
        "primary_color": row.primary_color,
        "accent_color": row.accent_color,
        "logo_url": row.logo_url,
        "hero_image_url": row.hero_image_url,
        "show_login_button": row.show_login_button,
        "login_path": row.login_path or "/login",
        "login_label": row.login_label or "Login",
        "footer_text": row.footer_text,
        "phone": row.phone,
        "email": row.email,
        "address": row.address,
        "facebook": row.facebook,
        "twitter": row.twitter,
        "instagram": row.instagram,
        "youtube": row.youtube,
        "nav": row.nav or [],
        "pages": pages,
        "announcements": [
            {
                "id": item.id,
                "title": item.title,
                "excerpt": item.excerpt,
                "body": item.body,
                "image_url": item.image_url,
                "published_at": item.published_at,
            }
            for item in WebsiteAnnouncement.objects.filter(published=True)[:24]
        ],
        "gallery": [
            {"id": item.id, "title": item.title, "album": item.album, "image_url": item.image_url}
            for item in WebsiteGalleryItem.objects.filter(published=True)[:60]
        ],
        "downloads": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "file_url": item.file_url,
                "original_name": item.original_name,
            }
            for item in WebsiteDownload.objects.filter(published=True)[:40]
        ],
    }


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def website_public(request):
    return Response(_public_payload())


@api_view(["GET", "PATCH"])
@permission_classes([IsSuperAdmin])
def website_settings(request):
    row = WebsiteSettings.load()
    if request.method == "GET":
        data = _public_payload()
        data["pages"] = {**DEFAULT_PAGES, **(row.pages or {})}
        return Response(data)
    fields = [
        "site_name",
        "tagline",
        "primary_color",
        "accent_color",
        "logo_url",
        "hero_image_url",
        "show_login_button",
        "login_path",
        "login_label",
        "footer_text",
        "phone",
        "email",
        "address",
        "facebook",
        "twitter",
        "instagram",
        "youtube",
    ]
    for field in fields:
        if field in request.data:
            setattr(row, field, request.data.get(field))
    if "nav" in request.data and isinstance(request.data.get("nav"), list):
        row.nav = request.data.get("nav")
    if "pages" in request.data and isinstance(request.data.get("pages"), dict):
        row.pages = request.data.get("pages")
    row.save()
    return Response(_public_payload())


def _store_site_file(request, upload, folder="mba-portal/website"):
    validate_upload(upload)
    if hasattr(upload, "seek"):
        upload.seek(0)
    if cloudinary_enabled():
        stored = upload_to_cloudinary(upload, folder=folder)
        return stored.get("url") or "", upload.name
    path = default_storage.save(f"website/{upload.name}", ContentFile(upload.read()))
    return request.build_absolute_uri(f"{django_settings.MEDIA_URL}{path}"), upload.name


@api_view(["POST"])
@permission_classes([IsSuperAdmin])
def website_upload(request):
    upload = request.FILES.get("file")
    if not upload:
        return Response({"detail": "A file is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        url, name = _store_site_file(request, upload)
    except ValidationError as exc:
        detail = exc.detail[0] if isinstance(exc.detail, (list, tuple)) else exc.detail
        return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"url": url, "name": name})


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = WebsiteAnnouncement.objects.all()
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        from rest_framework import serializers

        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteAnnouncement
                fields = ["id", "title", "excerpt", "body", "image_url", "published", "published_at"]

        return S


class GalleryViewSet(viewsets.ModelViewSet):
    queryset = WebsiteGalleryItem.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        from rest_framework import serializers

        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteGalleryItem
                fields = ["id", "title", "album", "image_url", "published", "created_at"]

        return S


class DownloadViewSet(viewsets.ModelViewSet):
    queryset = WebsiteDownload.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        from rest_framework import serializers

        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteDownload
                fields = ["id", "title", "description", "file_url", "original_name", "published", "created_at"]

        return S
