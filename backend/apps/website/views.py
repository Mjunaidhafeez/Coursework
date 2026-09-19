from copy import deepcopy

from django.conf import settings as django_settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import EmailMultiAlternatives
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsSuperAdmin
from apps.common.mailer import _smtp_from
from apps.common.messaging import add_members, post_message
from apps.common.models import Conversation
from apps.common.notify import push_notifications
from apps.common.uploads import cloudinary_enabled, media_field_url, upload_to_cloudinary, validate_upload

from .defaults import DEFAULT_PAGES, PAGE_CATALOG, default_page_flags
from .models import (
    WebsiteActivity,
    WebsiteAlumnus,
    WebsiteAnnouncement,
    WebsiteDownload,
    WebsiteGalleryItem,
    WebsiteInquiry,
    WebsiteResult,
    WebsiteSettings,
    WebsiteStudent,
    WebsiteTeacher,
)


def merge_pages(stored):
    merged = deepcopy(DEFAULT_PAGES)
    if not isinstance(stored, dict):
        return merged
    for key, value in stored.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        elif key in merged or isinstance(value, dict):
            merged[key] = value
    return merged


def merge_flags(stored):
    flags = default_page_flags()
    if isinstance(stored, dict):
        for key in flags:
            if key in stored:
                flags[key] = bool(stored.get(key))
    flags["home"] = True
    return flags


def build_nav(pages, flags):
    items = []
    for item in PAGE_CATALOG:
        if not flags.get(item["key"], True):
            continue
        label = (pages.get(item["key"]) or {}).get("nav_label") or item["label"]
        items.append({"key": item["key"], "label": label, "path": item["path"]})
    return items


def _public_payload():
    row = WebsiteSettings.load()
    pages = merge_pages(row.pages)
    flags = merge_flags(row.page_flags)
    return {
        "site_name": row.site_name,
        "tagline": row.tagline,
        "primary_color": row.primary_color,
        "accent_color": row.accent_color,
        "secondary_color": row.secondary_color,
        "header_color": row.header_color,
        "footer_color": row.footer_color,
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
        "page_flags": flags,
        "page_catalog": PAGE_CATALOG,
        "nav": build_nav(pages, flags),
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
        "teachers": [
            {
                "id": item.id,
                "name": item.name,
                "designation": item.designation,
                "department": item.department,
                "degrees": item.degrees,
                "bio": item.bio,
                "photo_url": item.photo_url,
            }
            for item in WebsiteTeacher.objects.filter(published=True)
        ],
        "alumni": [
            {
                "id": item.id,
                "name": item.name,
                "batch": item.batch,
                "program": item.program,
                "current_role": item.current_role,
                "story": item.story,
                "photo_url": item.photo_url,
            }
            for item in WebsiteAlumnus.objects.filter(published=True)
        ],
        "results": [
            {
                "id": item.id,
                "student_name": item.student_name,
                "roll_no": item.roll_no,
                "program": item.program,
                "year": item.year,
                "grade": item.grade,
                "marks": item.marks,
                "teacher_names": item.teacher_names,
                "degrees": item.degrees,
                "photo_url": item.photo_url,
            }
            for item in WebsiteResult.objects.filter(published=True)
        ],
        "students": [
            {
                "id": item.id,
                "name": item.name,
                "roll_no": item.roll_no,
                "semester": item.semester,
                "class_name": item.class_name,
                "note": item.note,
                "photo_url": item.photo_url,
            }
            for item in WebsiteStudent.objects.filter(published=True)[:400]
        ],
        "activities": [
            {
                "id": item.id,
                "title": item.title,
                "body": item.body,
                "image_url": item.image_url,
                "posted_on": item.posted_on,
                "semester": item.semester,
                "class_name": item.class_name,
            }
            for item in WebsiteActivity.objects.filter(published=True)[:80]
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
        return Response(_public_payload())
    fields = [
        "site_name",
        "tagline",
        "primary_color",
        "accent_color",
        "secondary_color",
        "header_color",
        "footer_color",
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
    if "page_flags" in request.data and isinstance(request.data.get("page_flags"), dict):
        row.page_flags = merge_flags(request.data.get("page_flags"))
    if "pages" in request.data and isinstance(request.data.get("pages"), dict):
        row.pages = merge_pages(request.data.get("pages"))
    row.nav = build_nav(merge_pages(row.pages), merge_flags(row.page_flags))
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


def _send_mail(to_email, subject, body, reply_to=None):
    smtp = _smtp_from()
    if not smtp or not to_email:
        return False
    email = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=smtp,
        to=[to_email],
        reply_to=[reply_to] if reply_to else None,
    )
    email.send(fail_silently=True)
    return True


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def website_contact(request):
    name = str(request.data.get("name") or "").strip()
    email = str(request.data.get("email") or "").strip()
    message = str(request.data.get("message") or "").strip()
    if not name or not email or not message:
        return Response({"detail": "Name, email and message are required."}, status=400)
    inquiry = WebsiteInquiry.objects.create(
        name=name[:160],
        email=email[:120],
        phone=str(request.data.get("phone") or "")[:40],
        subject=str(request.data.get("subject") or "Website enquiry")[:200],
        message=message[:4000],
    )
    admins = list(User.objects.filter(role=User.Role.SUPER_ADMIN, is_active=True))
    owner = admins[0] if admins else None
    if owner:
        conversation = Conversation.objects.create(
            kind=Conversation.Kind.DIRECT,
            title=f"Website: {inquiry.name}"[:200],
            created_by=owner,
        )
        add_members(conversation, admins)
        post_message(
            conversation,
            owner,
            f"Website enquiry from {inquiry.name} <{inquiry.email}>\nPhone: {inquiry.phone or '-'}\nSubject: {inquiry.subject}\n\n{inquiry.message}",
        )
        inquiry.conversation = conversation
        inquiry.save(update_fields=["conversation"])
        push_notifications(admins, "Website enquiry", f"{inquiry.name}: {inquiry.subject}")
    site = WebsiteSettings.load()
    office = site.email or (owner.email if owner else "")
    if office:
        _send_mail(
            office,
            f"Website enquiry: {inquiry.subject}",
            f"From: {inquiry.name} <{inquiry.email}>\nPhone: {inquiry.phone}\n\n{inquiry.message}",
            reply_to=inquiry.email,
        )
    return Response({"detail": "Thank you. The university office will reply by email."}, status=201)


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = WebsiteTeacher.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteTeacher
                fields = ["id", "name", "designation", "department", "degrees", "bio", "photo_url", "published", "sort_order"]

        return S


class AlumnusViewSet(viewsets.ModelViewSet):
    queryset = WebsiteAlumnus.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteAlumnus
                fields = ["id", "name", "batch", "program", "current_role", "story", "photo_url", "published"]

        return S


class ResultViewSet(viewsets.ModelViewSet):
    queryset = WebsiteResult.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteResult
                fields = [
                    "id",
                    "student_name",
                    "roll_no",
                    "program",
                    "year",
                    "grade",
                    "marks",
                    "teacher_names",
                    "degrees",
                    "photo_url",
                    "published",
                ]

        return S


class StudentViewSet(viewsets.ModelViewSet):
    queryset = WebsiteStudent.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteStudent
                fields = ["id", "name", "roll_no", "semester", "class_name", "note", "photo_url", "published", "source_user"]

        return S

    @action(detail=False, methods=["post"], url_path="import-portal")
    def import_portal(self, request):
        created = 0
        skipped = 0
        people = User.objects.filter(role=User.Role.STUDENT, is_active=True).select_related("student_profile__semester").prefetch_related("enrollments__course")
        for person in people:
            profile = getattr(person, "student_profile", None)
            roll = (getattr(profile, "student_id", None) or person.username).strip()
            if WebsiteStudent.objects.filter(roll_no__iexact=roll).exists():
                skipped += 1
                continue
            semester = ""
            if profile and profile.semester_id:
                semester = f"Semester {profile.semester.number}"
            course = person.enrollments.select_related("course").first()
            class_name = f"{course.course.code} — {course.course.title}" if course else ""
            photo = media_field_url(person.avatar, request) or ""
            WebsiteStudent.objects.create(
                name=person.get_full_name().strip() or person.username,
                roll_no=roll[:60],
                semester=semester,
                class_name=class_name[:160],
                photo_url=photo,
                published=True,
                source_user=person,
            )
            created += 1
        return Response({"created": created, "skipped": skipped})


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = WebsiteActivity.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteActivity
                fields = ["id", "title", "body", "image_url", "posted_on", "semester", "class_name", "published"]

        return S


class InquiryViewSet(viewsets.ModelViewSet):
    queryset = WebsiteInquiry.objects.all()
    permission_classes = [IsSuperAdmin]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteInquiry
                fields = [
                    "id",
                    "name",
                    "email",
                    "phone",
                    "subject",
                    "message",
                    "status",
                    "admin_reply",
                    "conversation",
                    "created_at",
                ]
                read_only_fields = fields

        return S

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        inquiry = self.get_object()
        body = str(request.data.get("body") or request.data.get("admin_reply") or "").strip()
        if not body:
            return Response({"detail": "Reply is required."}, status=400)
        inquiry.admin_reply = body[:4000]
        inquiry.status = WebsiteInquiry.Status.REPLIED
        inquiry.save(update_fields=["admin_reply", "status"])
        _send_mail(
            inquiry.email,
            f"Re: {inquiry.subject or 'Your enquiry'}",
            f"Dear {inquiry.name},\n\n{body}\n\n— {WebsiteSettings.load().site_name}",
            reply_to=WebsiteSettings.load().email or request.user.email,
        )
        if inquiry.conversation_id:
            add_members(inquiry.conversation, [request.user])
            post_message(inquiry.conversation, request.user, f"Reply emailed to {inquiry.email}:\n\n{body}")
        return Response(self.get_serializer(inquiry).data)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = WebsiteAnnouncement.objects.all()
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteAnnouncement
                fields = ["id", "title", "excerpt", "body", "image_url", "published", "published_at"]

        return S


class GalleryViewSet(viewsets.ModelViewSet):
    queryset = WebsiteGalleryItem.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteGalleryItem
                fields = ["id", "title", "album", "image_url", "published", "created_at"]

        return S


class DownloadViewSet(viewsets.ModelViewSet):
    queryset = WebsiteDownload.objects.all()
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        class S(serializers.ModelSerializer):
            class Meta:
                model = WebsiteDownload
                fields = ["id", "title", "description", "file_url", "original_name", "published", "created_at"]

        return S
