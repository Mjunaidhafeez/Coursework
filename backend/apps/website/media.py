def collected_images(*parts):
    urls = []
    for part in parts:
        if isinstance(part, (list, tuple)):
            urls.extend(part)
        elif part:
            urls.append(part)
    seen = set()
    out = []
    for url in urls:
        value = str(url or "").strip()
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def public_media_url(request, url):
    value = str(url or "").strip()
    if not value:
        return ""
    if value.startswith("//"):
        value = f"https:{value}"
    forwarded = ""
    if request:
        forwarded = str(request.META.get("HTTP_X_FORWARDED_PROTO") or "").split(",")[0].strip()
    secure = bool(request and (request.is_secure() or forwarded == "https"))
    if value.startswith("/"):
        value = request.build_absolute_uri(value) if request else value
    if value.startswith("http://") and secure:
        value = f"https://{value[len('http://'):]}"
    return value
