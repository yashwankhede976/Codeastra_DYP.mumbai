from django.urls import path
from . import views

urlpatterns = [
    path("routes/safest/", views.safest_route, name="routes-safest"),
]
