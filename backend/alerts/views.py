from __future__ import annotations

from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status

from .models import EmergencyAlert
from .services import dispatch_sos, process_voice


@api_view(["POST"])
def sos_activate(request):
    """POST /api/sos/activate/ — Trigger an SOS alert."""
    payload = request.data or {}
    lat = float(payload.get("latitude", 0.0))
    lng = float(payload.get("longitude", 0.0))
    session_id = str(payload.get("sessionId", "anonymous"))
    risk_score = int(payload.get("riskScore", 95))
    message = str(payload.get("message", ""))

    result = dispatch_sos(
        user=request.user,
        session_id=session_id,
        latitude=lat,
        longitude=lng,
        risk_score=risk_score,
        message=message,
    )
    return Response(result, status=http_status.HTTP_201_CREATED)


@api_view(["POST"])
def alert_send(request):
    """POST /api/alerts/send/ — Send a custom alert to emergency contacts."""
    payload = request.data or {}
    lat = float(payload.get("latitude", 0.0))
    lng = float(payload.get("longitude", 0.0))
    session_id = str(payload.get("sessionId", "anonymous"))
    alert_type = str(payload.get("alertType", "MANUAL"))
    message = str(payload.get("message", "Safety alert from SafeHer AI."))
    risk_score = int(payload.get("riskScore", 0))

    alert = EmergencyAlert.objects.create(
        user=request.user if request.user.is_authenticated else None,
        session_id=session_id,
        alert_type=alert_type,
        status="ACTIVE",
        latitude=lat,
        longitude=lng,
        message=message,
        risk_score=risk_score,
    )

    return Response(
        {
            "alert_id": alert.id,
            "alert_type": alert_type,
            "status": "ACTIVE",
            "message": message,
            "created_at": alert.created_at.isoformat(),
        },
        status=http_status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def alert_list(request):
    """GET /api/alerts/ — List recent emergency alerts."""
    limit = int(request.query_params.get("limit", 50))
    qs = EmergencyAlert.objects.all()
    if request.user.is_authenticated:
        qs = qs.filter(user=request.user)

    records = list(
        qs[:limit].values(
            "id", "session_id", "alert_type", "status",
            "latitude", "longitude", "message", "risk_score", "created_at"
        )
    )
    return Response({"alerts": records, "count": len(records)})


@api_view(["POST"])
def voice_detect(request):
    """
    POST /api/voice/detect/
    Detect emergency keywords in voice-transcribed text.
    If triggered, the SOS workflow is automatically initiated.
    """
    payload = request.data or {}
    raw_text = str(payload.get("text", ""))
    session_id = str(payload.get("sessionId", "anonymous"))

    if not raw_text:
        return Response(
            {"error": "Field 'text' is required (transcribed voice content)."},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    result = process_voice(user=request.user, raw_text=raw_text, session_id=session_id)

    # Auto-trigger SOS if keyword detected and location is provided
    if result["triggered"] and payload.get("latitude"):
        sos_result = dispatch_sos(
            user=request.user,
            session_id=session_id,
            latitude=float(payload.get("latitude", 0.0)),
            longitude=float(payload.get("longitude", 0.0)),
            risk_score=95,
            message=f"Voice emergency keyword '{result['keyword']}' detected.",
        )
        result["sos_dispatched"] = True
        result["sos_alert_id"] = sos_result.get("alert_id")
    else:
        result["sos_dispatched"] = False

    return Response(result)
