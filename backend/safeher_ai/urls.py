from django.urls import include, path
from django.contrib import admin

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("tracking.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("agents.urls")),
    path("api/", include("alerts.urls")),
    path("api/", include("routes.urls")),
]
