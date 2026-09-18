import base64
import hashlib
import json
import mimetypes
import time
from io import BytesIO
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import FileResponse
from rest_framework.exceptions import ValidationError

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
IMAGE_EXT = {"png", "jpg", "jpeg", "gif", "webp"}


def resource_type_for_name(filename):
    ext = str(filename or "").rsplit(".", 1)[-1].lower() if "." in str(filename or "") else ""
    return "image" if ext in IMAGE_EXT else "raw"


def parse_storage_key(storage_key, file_url=""):
    key = str(storage_key or "")
    resource_type = ""
    if key.startswith(("raw:", "image:", "video:")):
        resource_type, key = key.split(":", 1)
    if not key and file_url:
        url = str(file_url)
        for item in ("raw", "image", "video"):
            marker = f"/{item}/upload/"
            if marker in url:
                resource_type = resource_type or item
                tail = url.split(marker, 1)[1]
                parts = [part for part in tail.split("/") if part]
                if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
                    parts = parts[1:]
                key = "/".join(parts)
                if "." in key:
                    key = key.rsplit(".", 1)[0]
                break
    if not resource_type and "/raw/" in str(file_url):
        resource_type = "raw"
    elif not resource_type and "/image/" in str(file_url):
        resource_type = "image"
    return resource_type or "raw", key


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
    filename = getattr(upload, "name", "file") or "file"
    resource_type = resource_type_for_name(filename)
    params = {"folder": folder, "timestamp": timestamp}
    signature = _cloudinary_sign(params)
    boundary = f"----mba{timestamp}"
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
        f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/upload",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urlopen(request, timeout=60) as response:
        raw = response.read().decode("utf-8")
    data = json.loads(raw)
    if data.get("error"):
        raise ValidationError(data["error"].get("message") or "Cloud upload failed.")
    return {
        "url": data.get("secure_url") or data.get("url") or "",
        "public_id": data.get("public_id") or "",
        "resource_type": data.get("resource_type") or resource_type,
        "original_name": filename,
    }


def delete_from_cloudinary(public_id, resource_type=""):
    if not public_id or not cloudinary_enabled():
        return
    parsed_type, parsed_id = parse_storage_key(public_id)
    public_id = parsed_id
    timestamp = str(int(time.time()))
    params = {"public_id": public_id, "timestamp": timestamp}
    signature = _cloudinary_sign(params)
    body = urlencode({**params, "api_key": settings.CLOUDINARY_API_KEY, "signature": signature}).encode()
    types = [resource_type or parsed_type, "raw", "image", "video"]
    seen = set()
    for item in types:
        if not item or item in seen:
            continue
        seen.add(item)
        request = Request(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{item}/destroy",
            data=body,
            method="POST",
        )
        try:
            urlopen(request, timeout=20).read()
        except Exception:
            continue


def _fetch_url_bytes(url):
    request = Request(url, method="GET")
    with urlopen(request, timeout=60) as response:
        content_type = response.headers.get_content_type() or "application/octet-stream"
        data = response.read()
    if not data:
        raise URLError("empty file")
    return data, content_type


def _signed_delivery_url(public_id, resource_type, file_format="", transformation=""):
    to_sign = f"{transformation}/{public_id}" if transformation else public_id
    digest = hashlib.sha1(f"{to_sign}{settings.CLOUDINARY_API_SECRET}".encode("utf-8")).digest()
    signature = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")[:8]
    ext = f".{file_format}" if file_format else ""
    trans = f"{transformation}/" if transformation else ""
    return (
        f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/"
        f"{resource_type}/upload/s--{signature}--/{trans}{public_id}{ext}"
    )


def _admin_resource(public_id, resource_type):
    encoded = quote(public_id, safe="")
    auth = base64.b64encode(
        f"{settings.CLOUDINARY_API_KEY}:{settings.CLOUDINARY_API_SECRET}".encode("ascii")
    ).decode("ascii")
    request = Request(
        f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/resources/{resource_type}/upload/{encoded}",
        headers={"Authorization": f"Basic {auth}"},
        method="GET",
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _blocked_file_error():
    return ValidationError(
        "Cloudinary is blocking PDF/ZIP links on the free plan. "
        "Open Cloudinary Dashboard → Settings → Security → enable "
        "'Allow delivery of PDF and ZIP files' → Save. Wait one minute, then try again."
    )


def download_from_cloudinary(public_id, resource_type="", file_format="", as_attachment=False, file_url=""):
    parsed_type, parsed_id = parse_storage_key(public_id, file_url)
    public_id = parsed_id
    types = []
    for item in (resource_type or parsed_type, "image", "raw"):
        if item and item not in types:
            types.append(item)
    urls = []
    if file_url:
        urls.append(file_url)
        if "/image/upload/" in file_url:
            urls.append(file_url.replace("/image/upload/", "/raw/upload/"))
        if as_attachment and "/upload/" in file_url and "/fl_attachment/" not in file_url:
            urls.append(file_url.replace("/upload/", "/upload/fl_attachment/"))
    for item in types:
        if not public_id:
            break
        urls.append(_signed_delivery_url(public_id, item, file_format=file_format))
        if file_format:
            urls.append(
                f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/{item}/upload/{public_id}.{file_format}"
            )
        urls.append(f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/{item}/upload/{public_id}")
    saw_blocked = False
    last_error = None
    for url in urls:
        try:
            return _fetch_url_bytes(url)
        except HTTPError as exc:
            last_error = exc
            if exc.code == 401:
                saw_blocked = True
            continue
        except Exception as exc:
            last_error = exc
            continue
    for item in types:
        try:
            resource = _admin_resource(public_id, item)
            secure = resource.get("secure_url") or resource.get("url") or ""
            if secure:
                return _fetch_url_bytes(secure)
        except HTTPError as exc:
            last_error = exc
            if exc.code == 401:
                saw_blocked = True
            continue
        except Exception as exc:
            last_error = exc
            continue
        timestamp = str(int(time.time()))
        params = {"public_id": public_id, "timestamp": timestamp}
        signature = _cloudinary_sign(params)
        body = urlencode({**params, "api_key": settings.CLOUDINARY_API_KEY, "signature": signature}).encode()
        request = Request(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{item}/download",
            data=body,
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                data = response.read()
                if data:
                    return data, response.headers.get_content_type() or "application/octet-stream"
        except HTTPError as exc:
            last_error = exc
            if exc.code == 401:
                saw_blocked = True
            continue
        except Exception as exc:
            last_error = exc
            continue
    if saw_blocked:
        raise _blocked_file_error() from last_error
    raise ValidationError("Could not open the stored file.") from last_error


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
            resource_type = stored.get("resource_type") or resource_type_for_name(filename)
            instance.storage_key = f"{resource_type}:{stored['public_id']}" if stored["public_id"] else ""
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


def stored_file_name(instance, fallback="file"):
    return (
        getattr(instance, "original_name", "")
        or getattr(instance, "title", "")
        or fallback
    )


def file_response_for_instance(instance, as_attachment=False, extra_headers=None):
    filename = stored_file_name(instance)
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    field = getattr(instance, "file", None)
    if field:
        handle = field.open("rb")
        response = FileResponse(handle, as_attachment=as_attachment, filename=filename, content_type=content_type)
    elif getattr(instance, "storage_key", "") or getattr(instance, "file_url", ""):
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        resource_type, public_id = parse_storage_key(
            getattr(instance, "storage_key", "") or "",
            getattr(instance, "file_url", "") or "",
        )
        data, fetched_type = download_from_cloudinary(
            public_id,
            resource_type=resource_type,
            file_format=ext,
            as_attachment=as_attachment,
            file_url=getattr(instance, "file_url", "") or "",
        )
        response = FileResponse(
            BytesIO(data),
            as_attachment=as_attachment,
            filename=filename,
            content_type=fetched_type or content_type,
        )
    else:
        return None
    disposition = "attachment" if as_attachment else "inline"
    response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
    for key, value in (extra_headers or {}).items():
        response[key] = value
    return response
