from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("register/", views.register, name="auth-register"),
    path("login/", views.login, name="auth-login"),
    path("logout/", views.logout, name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("profile/", views.profile, name="auth-profile"),
    path("emergency/contacts/", views.emergency_contacts, name="emergency-contacts"),
    path("emergency/contacts/<int:pk>/", views.emergency_contact_detail, name="emergency-contact-detail"),
]
