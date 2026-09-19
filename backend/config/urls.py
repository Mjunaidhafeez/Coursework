from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import CustomTokenObtainPairView


def serve_spa(dist_dir):
    def _view(_request):
        index = Path(dist_dir) / "index.html"
        if not index.exists():
            return HttpResponse("The site is being published. Please try again shortly.", status=503)
        return HttpResponse(index.read_text(encoding="utf-8"), content_type="text/html")

    return _view

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/common/", include("apps.common.urls")),
    path("api/academics/", include("apps.academics.urls")),
    path("api/groups/", include("apps.groups.urls")),
    path("api/coursework/", include("apps.coursework.urls")),
    path("api/campus/", include("apps.campus.urls")),
    path("api/website/", include("apps.website.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif not getattr(settings, "USE_S3", False):
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]

urlpatterns += [
    re_path(r"^site-static/(?P<path>.*)$", serve, {"document_root": settings.WEBSITE_DIST}),
    re_path(r"^login/?$", serve_spa(settings.FRONTEND_DIST), name="portal-login"),
    re_path(r"^admin/.*$", serve_spa(settings.FRONTEND_DIST), name="portal-admin"),
    re_path(r"^teacher/.*$", serve_spa(settings.FRONTEND_DIST), name="portal-teacher"),
    re_path(r"^student/.*$", serve_spa(settings.FRONTEND_DIST), name="portal-student"),
    re_path(
        r"^(?!static/|media/|api/|django-admin/|site-static/).*$",
        serve_spa(settings.WEBSITE_DIST),
        name="website-spa",
    ),
]
