from django.urls import path

from .views import current_risk, location_update, start_tracking

urlpatterns = [
    path("start-tracking", start_tracking, name="start-tracking"),
    path("location", location_update, name="location"),
    path("risk", current_risk, name="risk"),
]
