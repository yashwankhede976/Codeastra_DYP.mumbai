from django.urls import path
from . import views

urlpatterns = [
    path("sos/activate/", views.sos_activate, name="sos-activate"),
    path("alerts/send/", views.alert_send, name="alert-send"),
    path("alerts/", views.alert_list, name="alert-list"),
    path("voice/detect/", views.voice_detect, name="voice-detect"),
]
