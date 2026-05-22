"""
SafeHer AI – Agentic Decision Engine (v2)
==========================================
Autonomously decides which protective actions to take based on the risk
snapshot returned by the ML engine.

Risk thresholds:
  risk ≥ 85  → FULL EMERGENCY: SOS + alert authorities + notify contacts + record + share + safe place
  risk ≥ 71  → HIGH RISK:      notify contacts + share location + safe place + increase monitoring
  risk ≥ 31  → MEDIUM RISK:    share location + increase monitoring
  risk < 31  → LOW RISK:       standard monitoring only

Additional rule:
  route_deviation_km ≥ 0.5  → prepend RECOMMEND_SAFE_ROUTE at priority 1 (any risk level ≥ medium)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List

# ── Action constants ──────────────────────────────────────────────────────────

ACTION_SEND_SOS             = "SEND_SOS"
ACTION_ALERT_AUTHORITIES    = "ALERT_AUTHORITIES"
ACTION_NOTIFY_CONTACTS      = "NOTIFY_CONTACTS"
ACTION_SHARE_LOCATION       = "SHARE_LOCATION"
ACTION_START_RECORDING      = "START_RECORDING"
ACTION_RECOMMEND_SAFE_PLACE = "RECOMMEND_SAFE_PLACE"
ACTION_RECOMMEND_SAFE_ROUTE = "RECOMMEND_SAFE_ROUTE"
ACTION_INCREASE_MONITORING  = "INCREASE_MONITORING"


@dataclass
class Action:
    action_type: str
    priority: int          # 1 = highest
    reason: str
    payload: dict = field(default_factory=dict)


class AgenticEngine:
    """Core decision engine.  ``evaluate()`` returns an ordered list of actions."""

    FULL_EMERGENCY_THRESHOLD = 85
    HIGH_RISK_THRESHOLD      = 71
    MEDIUM_RISK_THRESHOLD    = 31
    ROUTE_DEVIATION_THRESHOLD = 0.5   # km — triggers RECOMMEND_SAFE_ROUTE

    def evaluate(
        self,
        *,
        risk_score: int,
        risk_level: str,
        latitude: float,
        longitude: float,
        session_id: str = "anonymous",
        sos_triggered: bool = False,
        factors: dict | None = None,
    ) -> List[Action]:
        actions: List[Action] = []
        factors = factors or {}

        # Extract structured context from factors when available
        route_deviation_km    = float(factors.get("_route_deviation_km", 0.0))
        unsafe_zone_proximity = str(factors.get("_unsafe_zone_proximity", "none"))

        if sos_triggered or risk_score >= self.FULL_EMERGENCY_THRESHOLD:
            actions = self._full_emergency_plan(risk_score, latitude, longitude, factors)

        elif risk_score >= self.HIGH_RISK_THRESHOLD:
            actions = self._high_risk_plan(risk_score, latitude, longitude, factors)

        elif risk_score >= self.MEDIUM_RISK_THRESHOLD:
            actions = self._medium_risk_plan(risk_score, latitude, longitude, factors)

        else:
            actions = self._low_risk_plan(risk_score)

        # Inject route deviation action when deviation is significant
        if route_deviation_km >= self.ROUTE_DEVIATION_THRESHOLD and risk_score >= self.MEDIUM_RISK_THRESHOLD:
            actions.insert(0, Action(
                action_type=ACTION_RECOMMEND_SAFE_ROUTE,
                priority=1,
                reason=(
                    f"Route deviation of {route_deviation_km:.1f} km detected. "
                    "Recalculating safest path back to planned route."
                ),
                payload={
                    "deviation_km": route_deviation_km,
                    "latitude": latitude,
                    "longitude": longitude,
                },
            ))
            # Re-number priorities after inserting at front
            for i, a in enumerate(actions[1:], start=2):
                a.priority = i

        # Sort by priority before returning
        actions.sort(key=lambda a: a.priority)
        return actions

    # ── Action Plans ──────────────────────────────────────────────────────────

    def _full_emergency_plan(self, risk_score: int, lat: float, lng: float, factors: dict) -> List[Action]:
        reasons_extra = _build_factor_reason(factors)
        return [
            Action(
                action_type=ACTION_SEND_SOS,
                priority=1,
                reason=f"Risk score {risk_score} exceeded critical threshold (≥85). SOS activated autonomously. {reasons_extra}",
                payload={"latitude": lat, "longitude": lng, "risk_score": risk_score},
            ),
            Action(
                action_type=ACTION_ALERT_AUTHORITIES,
                priority=2,
                reason="Critical risk level requires immediate law enforcement notification.",
                payload={"latitude": lat, "longitude": lng, "emergency_number": "112"},
            ),
            Action(
                action_type=ACTION_NOTIFY_CONTACTS,
                priority=3,
                reason="Emergency contacts are being alerted with live location.",
                payload={
                    "latitude": lat,
                    "longitude": lng,
                    "message": "🚨 EMERGENCY: Your contact may be in danger. Please call immediately.",
                },
            ),
            Action(
                action_type=ACTION_START_RECORDING,
                priority=4,
                reason="Audio/video evidence collection initiated automatically.",
                payload={"mode": "audio_video", "duration_seconds": 300},
            ),
            Action(
                action_type=ACTION_SHARE_LOCATION,
                priority=5,
                reason="Live location sharing enabled for all emergency contacts.",
                payload={"latitude": lat, "longitude": lng, "live": True},
            ),
            Action(
                action_type=ACTION_RECOMMEND_SAFE_PLACE,
                priority=6,
                reason="Routing to nearest verified safe location (hospital / police station).",
                payload={"latitude": lat, "longitude": lng, "radius_m": 1000},
            ),
        ]

    def _high_risk_plan(self, risk_score: int, lat: float, lng: float, factors: dict) -> List[Action]:
        reasons_extra = _build_factor_reason(factors)
        return [
            Action(
                action_type=ACTION_NOTIFY_CONTACTS,
                priority=1,
                reason=f"Risk score {risk_score} — high risk. Emergency contacts notified. {reasons_extra}",
                payload={
                    "latitude": lat,
                    "longitude": lng,
                    "message": "⚠️ Alert: Your contact is in a high-risk area.",
                },
            ),
            Action(
                action_type=ACTION_SHARE_LOCATION,
                priority=2,
                reason="Sharing live location with trusted contacts.",
                payload={"latitude": lat, "longitude": lng, "live": True},
            ),
            Action(
                action_type=ACTION_RECOMMEND_SAFE_PLACE,
                priority=3,
                reason="Suggesting nearest safe location (hospital / police station).",
                payload={"latitude": lat, "longitude": lng, "radius_m": 1500},
            ),
            Action(
                action_type=ACTION_INCREASE_MONITORING,
                priority=4,
                reason="Increasing location polling frequency to every 10 seconds.",
                payload={"interval_seconds": 10},
            ),
        ]

    def _medium_risk_plan(self, risk_score: int, lat: float, lng: float, factors: dict) -> List[Action]:
        return [
            Action(
                action_type=ACTION_SHARE_LOCATION,
                priority=1,
                reason=f"Moderate risk ({risk_score}) — location shared with primary contact.",
                payload={"latitude": lat, "longitude": lng, "live": False},
            ),
            Action(
                action_type=ACTION_INCREASE_MONITORING,
                priority=2,
                reason="Monitoring frequency increased to every 30 seconds.",
                payload={"interval_seconds": 30},
            ),
        ]

    def _low_risk_plan(self, risk_score: int) -> List[Action]:
        return [
            Action(
                action_type=ACTION_INCREASE_MONITORING,
                priority=1,
                reason=f"Low risk ({risk_score}) — standard monitoring active.",
                payload={"interval_seconds": 60},
            ),
        ]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_factor_reason(factors: dict) -> str:
    """Build a human-readable reason suffix from ML factor keys."""
    parts = []
    if factors.get("time_of_day"):
        parts.append("Night hours detected.")
    if factors.get("area_type"):
        parts.append("Isolated area.")
    if factors.get("route_deviation"):
        parts.append("Route deviation.")
    if factors.get("unsafe_zone"):
        parts.append(factors["unsafe_zone"] + ".")
    return " ".join(parts)


# ── Module-level singleton ────────────────────────────────────────────────────

_engine = AgenticEngine()


def evaluate_risk(
    *,
    risk_score: int,
    risk_level: str,
    latitude: float,
    longitude: float,
    session_id: str = "anonymous",
    sos_triggered: bool = False,
    factors: dict | None = None,
) -> List[Action]:
    """Convenience function to call the singleton engine."""
    return _engine.evaluate(
        risk_score=risk_score,
        risk_level=risk_level,
        latitude=latitude,
        longitude=longitude,
        session_id=session_id,
        sos_triggered=sos_triggered,
        factors=factors,
    )
