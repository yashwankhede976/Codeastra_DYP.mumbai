from __future__ import annotations

from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import DEFAULT_LOCATION, SafeHerLocation, risk_from_context, snapshot_to_dict
from .state import CURRENT_STATE
from .ml_engine import RiskMLEngine
from . import google_maps as gmap


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
    """GET /api/location/safezones/ — Return nearby safe locations via Google Places API."""
    lat = float(request.query_params.get("lat", DEFAULT_LOCATION.latitude))
    lng = float(request.query_params.get("lng", DEFAULT_LOCATION.longitude))
    radius = int(request.query_params.get("radius", 1500))

    places = gmap.nearby_safe_places(lat, lng, radius_m=radius)

    return Response({
        "safe_zones": places,
        "count": len(places),
        "center": {"latitude": lat, "longitude": lng},
        "radius_m": radius,
        "source": "google_places" if gmap._is_configured() else "fallback_config",
    })


@api_view(["POST"])
def risk_analyze(request):
    """POST /api/risk/analyze/ — ML-enhanced risk analysis with Google Maps enrichment."""
    from .models import LocationLog, RiskAnalysis
    from agents.engine import evaluate_risk as agent_evaluate

    payload = request.data or {}
    loc = payload.get("location") or {}

    latitude               = float(loc.get("latitude", DEFAULT_LOCATION.latitude))
    longitude              = float(loc.get("longitude", DEFAULT_LOCATION.longitude))
    area_type              = str(loc.get("areaType", "normal"))
    time_of_day            = str(loc.get("timeOfDay", "day"))
    hour_of_day            = int(payload.get("hourOfDay", datetime.now(timezone.utc).hour))
    speed_kmh              = float(payload.get("speedKmh", 0.0))
    sos_triggered          = bool(payload.get("sosTriggered", False))
    demo_night             = bool(payload.get("demoNight", False))
    demo_isolated          = bool(payload.get("demoIsolated", False))
    route_deviation_km     = float(payload.get("routeDeviationKm", 0.0))
    unsafe_zone_proximity  = str(payload.get("unsafeZoneProximity", "none"))

    # ─ Google Maps enrichment ─────────────────────────────────────────
    label = str(loc.get("label", ""))
    if not label or label in ("CST, Mumbai", "Unknown Area"):
        label = gmap.reverse_geocode(latitude, longitude)

    if not demo_isolated and area_type == "normal":
        area_type = gmap.classify_area_type(latitude, longitude)

    # ─ ML prediction ───────────────────────────────────────────────
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
        route_deviation_km=route_deviation_km,
        unsafe_zone_proximity=unsafe_zone_proximity,
    )

    # ─ Persist ─────────────────────────────────────────────────────
    analysis = RiskAnalysis.objects.create(
        user=request.user if request.user.is_authenticated else None,
        session_id=payload.get("sessionId", "anonymous"),
        risk_score=result["risk_score"],
        safety_score=result["safety_score"],
        risk_level=result["risk_level"],
        latitude=latitude,
        longitude=longitude,
        label=label,
        factors=result["factors"],
        alert_triggered=result["alert_triggered"],
    )

    # ─ Nearby safe places (when risk is high) ─────────────────────
    nearby = []
    if result["alert_triggered"]:
        nearby = gmap.nearby_safe_places(latitude, longitude, radius_m=1000)

    # ─ Agentic Action Engine — auto-chain when alert triggered ─────
    # When risk is HIGH (≥71) or SOS is triggered, the agentic engine
    # autonomously decides and persists the action plan.  We embed
    # the result directly in the risk analysis response so the frontend
    # only needs one API call.
    agent_actions_response = []
    if result["alert_triggered"] or sos_triggered:
        try:
            from datetime import datetime as _dt
            actions = agent_evaluate(
                risk_score=result["risk_score"],
                risk_level=result["risk_level"],
                latitude=latitude,
                longitude=longitude,
                session_id=str(payload.get("sessionId", "anonymous")),
                sos_triggered=sos_triggered,
                factors=result["factors"],
            )
            now_ts = _dt.now(timezone.utc)
            from agents.models import AgentAction
            for action in actions:
                db_action = AgentAction.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    session_id=payload.get("sessionId", "anonymous"),
                    action_type=action.action_type,
                    status="EXECUTED",
                    risk_score=result["risk_score"],
                    risk_level=result["risk_level"],
                    payload=action.payload,
                    reason=action.reason,
                    completed_at=now_ts,
                )
                agent_actions_response.append({
                    "id":          db_action.id,
                    "action_type": action.action_type,
                    "priority":    action.priority,
                    "reason":      action.reason,
                    "payload":     action.payload,
                    "status":      "EXECUTED",
                    "executed_at": now_ts.isoformat(),
                })
        except Exception as exc:
            import logging as _log
            _log.getLogger(__name__).warning("Agentic engine error in risk_analyze: %s", exc)

    return Response(
        {
            **result,
            "analysis_id":         analysis.id,
            "location":            {"latitude": latitude, "longitude": longitude, "label": label},
            "area_type_detected":  area_type,
            "analyzed_at":         analysis.analyzed_at.isoformat(),
            "recommended_action":  _recommended_action(result["risk_score"]),
            "nearby_safe_places":  nearby,
            "maps_enriched":       gmap._is_configured(),
            "agent_actions":       agent_actions_response,
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
        return "Activate SOS immediately. Emergency contacts and authorities are being notified."
    if risk_score >= 71:
        return "High risk detected. Contacting emergency contacts and sharing live location."
    if risk_score >= 31:
        return "Moderate risk. Share your location with a trusted contact and stay alert."
    return "Conditions are safe. Continue standard monitoring."

