from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import DEFAULT_LOCATION, SafeHerLocation, risk_from_context, snapshot_to_dict
from .state import CURRENT_STATE


def _location_from_payload(payload: dict) -> SafeHerLocation:
    location = payload.get("location") or {}
    return SafeHerLocation(
        latitude=float(location.get("latitude", DEFAULT_LOCATION.latitude)),
        longitude=float(location.get("longitude", DEFAULT_LOCATION.longitude)),
        label=str(location.get("label", DEFAULT_LOCATION.label)),
        areaType=str(location.get("areaType", DEFAULT_LOCATION.areaType)),
        timeOfDay=str(location.get("timeOfDay", DEFAULT_LOCATION.timeOfDay)),
    )


@api_view(["POST"])
def start_tracking(request):
    payload = request.data or {}
    demo_night = bool(payload.get("demoNight", False))
    demo_isolated = bool(payload.get("demoIsolated", False))
    location = _location_from_payload(payload)

    snapshot = risk_from_context(
        demo_night=demo_night,
        demo_isolated=demo_isolated,
        location=location,
        source=str(payload.get("source", "manual")),
        sos_triggered=bool(payload.get("sosTriggered", False)),
    )

    CURRENT_STATE.clear()
    CURRENT_STATE.update(snapshot_to_dict(snapshot))
    return Response(CURRENT_STATE)


@api_view(["POST"])
def location_update(request):
    payload = request.data or {}
    demo_night = bool(payload.get("demoNight", False))
    demo_isolated = bool(payload.get("demoIsolated", False))
    location = _location_from_payload(payload)

    snapshot = risk_from_context(
        demo_night=demo_night,
        demo_isolated=demo_isolated,
        location=location,
        source=str(payload.get("source", "auto")),
        sos_triggered=bool(payload.get("sosTriggered", False)),
    )

    CURRENT_STATE.clear()
    CURRENT_STATE.update(snapshot_to_dict(snapshot))
    return Response(CURRENT_STATE)


@api_view(["GET"])
def current_risk(request):
    return Response(CURRENT_STATE)
