from django.urls import path
from . import views

urlpatterns = [
    path("routes/safest/", views.safest_route, name="routes-safest"),
    path("routes/nearby-safe-places/", views.nearby_safe_places, name="routes-nearby-safe-places"),
    path("routes/geocode/", views.geocode_location, name="routes-geocode"),
    path("routes/maps-status/", views.maps_status, name="routes-maps-status"),
]
