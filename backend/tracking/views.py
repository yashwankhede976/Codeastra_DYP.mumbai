from __future__ import annotations

from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import DEFAULT_LOCATION, SafeHerLocation, risk_from_context, snapshot_to_dict
from .state import CURRENT_STATE
from .ml_engine import RiskMLEngine


def _location_from_payload(payload: dict) -> SafeHerLocation:
    location = payload.get("location") or {}
    return SafeHerLocation(
        latitude=float(location.get("latitude", DEFAULT_LOCATION.latitude)),
        longitude=float(location.get("longitude", DEFAULT_LOCATION.longitude)),
        label=str(location.get("label", DEFAULT_LOCATION.label)),
        areaType=str(location.get("areaType", DEFAULT_LOCATION.areaType)),
        timeOfDay=str(location.get("timeOfDay", DEFAULT_LOCATION.timeOfDay)),
    )


# ── Legacy endpoints (unchanged – frontend depends on these) ──────────────────

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


# ── New endpoints ─────────────────────────────────────────────────────────────

@api_view(["POST"])
def location_log(request):
    """POST /api/location/update/ — Persist a GPS sample to the database."""
    from .models import LocationLog

    payload = request.data or {}
    loc = payload.get("location") or {}

    log = LocationLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        session_id=payload.get("sessionId", "anonymous"),
        latitude=float(loc.get("latitude", DEFAULT_LOCATION.latitude)),
        longitude=float(loc.get("longitude", DEFAULT_LOCATION.longitude)),
        label=str(loc.get("label", "")),
        area_type=str(loc.get("areaType", "normal")),
        time_of_day=str(loc.get("timeOfDay", "day")),
        speed_kmh=float(payload.get("speedKmh", 0.0)),
    )

    return Response(
        {
            "id": log.id,
            "message": "Location logged.",
            "latitude": log.latitude,
            "longitude": log.longitude,
            "timestamp": log.timestamp.isoformat(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def location_history(request):
    """GET /api/location/history/ — Return recent location logs."""
    from .models import LocationLog
    from django.conf import settings

    limit = int(request.query_params.get("limit", 50))
    limit = min(limit, getattr(settings, "SAFEHER_MAX_LOCATION_HISTORY", 500))

    qs = LocationLog.objects.all()
    if request.user.is_authenticated:
        qs = qs.filter(user=request.user)

    logs = list(
        qs[:limit].values(
            "id", "session_id", "latitude", "longitude",
            "label", "area_type", "time_of_day", "speed_kmh", "timestamp"
        )
    )
    return Response({"history": logs, "count": len(logs)})


@api_view(["GET"])
def safe_zones(request):
    """GET /api/location/safezones/ — Return known safe locations."""
    from django.conf import settings

    zones = getattr(settings, "SAFEHER_SAFE_ZONES", [])
    return Response({"safe_zones": zones, "count": len(zones)})


@api_view(["POST"])
def risk_analyze(request):
    """POST /api/risk/analyze/ — ML-enhanced risk analysis, persisted to DB."""
    from .models import LocationLog, RiskAnalysis

    payload = request.data or {}
    loc = payload.get("location") or {}

    latitude = float(loc.get("latitude", DEFAULT_LOCATION.latitude))
    longitude = float(loc.get("longitude", DEFAULT_LOCATION.longitude))
    area_type = str(loc.get("areaType", "normal"))
    time_of_day = str(loc.get("timeOfDay", "day"))
    hour_of_day = int(payload.get("hourOfDay", datetime.now(timezone.utc).hour))
    speed_kmh = float(payload.get("speedKmh", 0.0))
    sos_triggered = bool(payload.get("sosTriggered", False))
    demo_night = bool(payload.get("demoNight", False))
    demo_isolated = bool(payload.get("demoIsolated", False))

    engine = RiskMLEngine.get()
    result = engine.predict(
        latitude=latitude,
        longitude=longitude,
        hour_of_day=hour_of_day,
        area_type=area_type,
        speed_kmh=speed_kmh,
        sos_triggered=sos_triggered,
        demo_night=demo_night,
        demo_isolated=demo_isolated,
    )

    # Persist
    analysis = RiskAnalysis.objects.create(
        user=request.user if request.user.is_authenticated else None,
        session_id=payload.get("sessionId", "anonymous"),
        risk_score=result["risk_score"],
        safety_score=result["safety_score"],
        risk_level=result["risk_level"],
        latitude=latitude,
        longitude=longitude,
        label=str(loc.get("label", "")),
        factors=result["factors"],
        alert_triggered=result["alert_triggered"],
    )

    return Response(
        {
            **result,
            "analysis_id": analysis.id,
            "location": {"latitude": latitude, "longitude": longitude, "label": analysis.label},
            "analyzed_at": analysis.analyzed_at.isoformat(),
            "recommended_action": _recommended_action(result["risk_score"]),
        }
    )


@api_view(["GET"])
def risk_history(request):
    """GET /api/risk/history/ — Recent persisted risk analyses."""
    from .models import RiskAnalysis

    limit = int(request.query_params.get("limit", 50))
    qs = RiskAnalysis.objects.all()
    if request.user.is_authenticated:
        qs = qs.filter(user=request.user)

    records = list(
        qs[:limit].values(
            "id", "session_id", "risk_score", "safety_score", "risk_level",
            "latitude", "longitude", "label", "alert_triggered", "analyzed_at"
        )
    )
    return Response({"history": records, "count": len(records)})


def _recommended_action(risk_score: int) -> str:
    if risk_score >= 85:
        return "Activate SOS immediately and notify emergency contacts."
    if risk_score >= 70:
        return "Alert trusted contacts and share live location."
    if risk_score >= 50:
        return "Share location with a trusted contact and stay alert."
    return "Conditions are safe. Continue monitoring."
