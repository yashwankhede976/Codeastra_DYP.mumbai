from django.urls import path
from . import views

urlpatterns = [
    path("agent/trigger/", views.agent_trigger, name="agent-trigger"),
    path("agent/actions/", views.agent_actions, name="agent-actions"),
]
