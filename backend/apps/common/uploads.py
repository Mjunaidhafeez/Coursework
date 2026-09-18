import hashlib
import mimetypes
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import ValidationError

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def normalize_phone(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    return digits


def validate_upload(upload, max_bytes=MAX_UPLOAD_BYTES):
    if not upload:
        raise ValidationError("A file is required.")
    size = int(getattr(upload, "size", 0) or 0)
    if size <= 0:
        raise ValidationError(f"{getattr(upload, 'name', 'File')} is empty.")
    if size > max_bytes:
        raise ValidationError(f"{getattr(upload, 'name', 'File')} is larger than 25 MB.")
    return upload


def cloudinary_enabled():
    return bool(
        getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        and getattr(settings, "CLOUDINARY_API_KEY", "")
        and getattr(settings, "CLOUDINARY_API_SECRET", "")
    )


def _cloudinary_sign(params):
    secret = settings.CLOUDINARY_API_SECRET
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params) if params[key] not in (None, ""))
    return hashlib.sha1(f"{payload}{secret}".encode("utf-8")).hexdigest()


def upload_to_cloudinary(upload, folder="mba-portal"):
    timestamp = str(int(time.time()))
    params = {"folder": folder, "timestamp": timestamp}
    signature = _cloudinary_sign(params)
    boundary = f"----mba{timestamp}"
    filename = getattr(upload, "name", "file") or "file"
    content_type = getattr(upload, "content_type", "") or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    if hasattr(upload, "seek"):
        upload.seek(0)
    file_bytes = upload.read()
    fields = {
        **params,
        "api_key": settings.CLOUDINARY_API_KEY,
        "signature": signature,
    }
    parts = []
    for key, value in fields.items():
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode())
    parts.append(
        (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode()
        + file_bytes
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    request = Request(
        f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urlopen(request, timeout=60) as response:
        raw = response.read().decode("utf-8")
    import json

    data = json.loads(raw)
    if data.get("error"):
        raise ValidationError(data["error"].get("message") or "Cloud upload failed.")
    return {
        "url": data.get("secure_url") or data.get("url") or "",
        "public_id": data.get("public_id") or "",
        "original_name": filename,
    }


def delete_from_cloudinary(public_id):
    if not public_id or not cloudinary_enabled():
        return
    timestamp = str(int(time.time()))
    params = {"public_id": public_id, "timestamp": timestamp}
    signature = _cloudinary_sign(params)
    body = urlencode({**params, "api_key": settings.CLOUDINARY_API_KEY, "signature": signature}).encode()
    for resource_type in ("raw", "image", "video"):
        request = Request(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/destroy",
            data=body,
            method="POST",
        )
        try:
            urlopen(request, timeout=20).read()
        except Exception:
            continue


def store_upload(instance, upload, field_name="file", folder="mba-portal"):
    validate_upload(upload)
    filename = getattr(upload, "name", "file") or "file"
    if hasattr(instance, "original_name"):
        instance.original_name = filename
    if hasattr(instance, "title") and not getattr(instance, "title", ""):
        instance.title = filename.rsplit(".", 1)[0]
    if cloudinary_enabled():
        stored = upload_to_cloudinary(upload, folder=folder)
        if hasattr(instance, "file_url"):
            instance.file_url = stored["url"]
        if hasattr(instance, "storage_key"):
            instance.storage_key = stored["public_id"]
        setattr(instance, field_name, None)
        return stored
    setattr(instance, field_name, upload)
    return {"url": "", "public_id": "", "original_name": filename}


def delete_stored_file(instance, field_name="file"):
    if getattr(instance, "storage_key", ""):
        delete_from_cloudinary(instance.storage_key)
    field = getattr(instance, field_name, None)
    if field:
        field.delete(save=False)


def public_file_url(instance, request=None):
    url = getattr(instance, "file_url", "") or ""
    if url:
        return url
    field = getattr(instance, "file", None)
    if not field:
        return ""
    try:
        relative = field.url
    except ValueError:
        return ""
    if request:
        return request.build_absolute_uri(relative)
    return relative
