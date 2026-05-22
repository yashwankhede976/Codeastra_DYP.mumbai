from __future__ import annotations

from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .engine import evaluate_risk
from .models import AgentAction


@api_view(["POST"])
def agent_trigger(request):
    """
    POST /api/agent/trigger/
    Run the agentic decision engine against a risk context and return the
    ordered action plan.  All decisions are persisted to the database.
    """
    payload = request.data or {}
    risk_score = int(payload.get("riskScore", 0))
    risk_level = str(payload.get("riskLevel", "Low"))
    lat = float(payload.get("latitude", 28.6139))
    lng = float(payload.get("longitude", 77.209))
    session_id = str(payload.get("sessionId", "anonymous"))
    sos_triggered = bool(payload.get("sosTriggered", False))
    factors = payload.get("factors", {})

    actions = evaluate_risk(
        risk_score=risk_score,
        risk_level=risk_level,
        latitude=lat,
        longitude=lng,
        session_id=session_id,
        sos_triggered=sos_triggered,
        factors=factors,
    )

    now = datetime.now(timezone.utc)

    # Persist all decided actions
    db_actions = []
    for action in actions:
        db_action = AgentAction.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            action_type=action.action_type,
            status="EXECUTED",
            risk_score=risk_score,
            risk_level=risk_level,
            payload=action.payload,
            reason=action.reason,
            completed_at=now,
        )
        db_actions.append({
            "id": db_action.id,
            "action_type": action.action_type,
            "priority": action.priority,
            "reason": action.reason,
            "payload": action.payload,
            "status": "EXECUTED",
            "executed_at": now.isoformat(),
        })

    return Response(
        {
            "session_id": session_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "actions_count": len(db_actions),
            "actions": db_actions,
            "autonomous": True,
            "timestamp": now.isoformat(),
        }
    )


@api_view(["GET"])
def agent_actions(request):
    """GET /api/agent/actions/ — List persisted agent action history."""
    limit = int(request.query_params.get("limit", 50))
    qs = AgentAction.objects.all()
    if request.user.is_authenticated:
        qs = qs.filter(user=request.user)

    records = list(
        qs[:limit].values(
            "id", "session_id", "action_type", "status",
            "risk_score", "risk_level", "reason", "payload", "created_at"
        )
    )
    return Response({"actions": records, "count": len(records)})
