from django.urls import path
from . import views

urlpatterns = [
    # Legacy – frontend depends on these exact paths
    path("start-tracking", views.start_tracking, name="start-tracking"),
    path("location", views.location_update, name="location"),
    path("risk", views.current_risk, name="risk"),

    # New persistent endpoints
    path("location/update/", views.location_log, name="location-log"),
    path("location/history/", views.location_history, name="location-history"),
    path("location/safezones/", views.safe_zones, name="safe-zones"),
    path("risk/analyze/", views.risk_analyze, name="risk-analyze"),
    path("risk/history/", views.risk_history, name="risk-history"),
]
