"""
SafeHer AI – Agentic Decision Engine
======================================
Autonomously decides which protective actions to take based on the risk
snapshot returned by the ML engine. Uses a threshold-based rule tree:

  risk ≥ 85 → FULL EMERGENCY: SOS + notify contacts + alert authorities + share location + record
  risk ≥ 70 → HIGH RISK:      notify contacts + share location + recommend safe place
  risk ≥ 50 → MEDIUM RISK:    share location + increase monitoring
  risk < 50 → LOW RISK:       increase monitoring only
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List


@dataclass
class Action:
    action_type: str
    priority: int          # 1 = highest
    reason: str
    payload: dict = field(default_factory=dict)


class AgenticEngine:
    """Core decision engine.  ``evaluate()`` returns an ordered list of actions."""

    FULL_EMERGENCY_THRESHOLD = 85
    HIGH_RISK_THRESHOLD = 70
    MEDIUM_RISK_THRESHOLD = 50

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

        if sos_triggered or risk_score >= self.FULL_EMERGENCY_THRESHOLD:
            actions = self._full_emergency_plan(risk_score, latitude, longitude, factors)

        elif risk_score >= self.HIGH_RISK_THRESHOLD:
            actions = self._high_risk_plan(risk_score, latitude, longitude, factors)

        elif risk_score >= self.MEDIUM_RISK_THRESHOLD:
            actions = self._medium_risk_plan(risk_score, latitude, longitude)

        else:
            actions = self._low_risk_plan(risk_score)

        # Always sort by priority
        actions.sort(key=lambda a: a.priority)
        return actions

    # ── Action Plans ──────────────────────────────────────────────────────────

    def _full_emergency_plan(self, risk_score, lat, lng, factors) -> List[Action]:
        return [
            Action(
                action_type="SEND_SOS",
                priority=1,
                reason="Risk score exceeded critical threshold (≥85). SOS activated autonomously.",
                payload={"latitude": lat, "longitude": lng, "risk_score": risk_score},
            ),
            Action(
                action_type="ALERT_AUTHORITIES",
                priority=2,
                reason="Critical risk level requires immediate law enforcement notification.",
                payload={"latitude": lat, "longitude": lng},
            ),
            Action(
                action_type="NOTIFY_CONTACTS",
                priority=3,
                reason="Emergency contacts are being alerted with your live location.",
                payload={"latitude": lat, "longitude": lng, "message": "EMERGENCY: User may be in danger."},
            ),
            Action(
                action_type="START_RECORDING",
                priority=4,
                reason="Audio/video evidence collection initiated automatically.",
                payload={"mode": "audio_video"},
            ),
            Action(
                action_type="SHARE_LOCATION",
                priority=5,
                reason="Live location sharing enabled for all contacts.",
                payload={"latitude": lat, "longitude": lng, "live": True},
            ),
            Action(
                action_type="RECOMMEND_SAFE_PLACE",
                priority=6,
                reason="Routing to nearest verified safe location.",
                payload={"latitude": lat, "longitude": lng},
            ),
        ]

    def _high_risk_plan(self, risk_score, lat, lng, factors) -> List[Action]:
        return [
            Action(
                action_type="NOTIFY_CONTACTS",
                priority=1,
                reason=f"Risk score {risk_score} — emergency contacts notified.",
                payload={"latitude": lat, "longitude": lng, "message": "Alert: User is in a high-risk area."},
            ),
            Action(
                action_type="SHARE_LOCATION",
                priority=2,
                reason="Sharing live location with trusted contacts.",
                payload={"latitude": lat, "longitude": lng, "live": True},
            ),
            Action(
                action_type="RECOMMEND_SAFE_PLACE",
                priority=3,
                reason="Suggesting nearest safe location.",
                payload={"latitude": lat, "longitude": lng},
            ),
            Action(
                action_type="INCREASE_MONITORING",
                priority=4,
                reason="Increasing location polling frequency to every 10 seconds.",
                payload={"interval_seconds": 10},
            ),
        ]

    def _medium_risk_plan(self, risk_score, lat, lng) -> List[Action]:
        return [
            Action(
                action_type="SHARE_LOCATION",
                priority=1,
                reason=f"Moderate risk ({risk_score}) — location shared with primary contact.",
                payload={"latitude": lat, "longitude": lng, "live": False},
            ),
            Action(
                action_type="INCREASE_MONITORING",
                priority=2,
                reason="Monitoring frequency increased to every 30 seconds.",
                payload={"interval_seconds": 30},
            ),
        ]

    def _low_risk_plan(self, risk_score) -> List[Action]:
        return [
            Action(
                action_type="INCREASE_MONITORING",
                priority=1,
                reason=f"Low risk ({risk_score}) — standard monitoring active.",
                payload={"interval_seconds": 60},
            ),
        ]


# Module-level singleton
_engine = AgenticEngine()


def evaluate_risk(*, risk_score: int, risk_level: str, latitude: float, longitude: float,
                  session_id: str = "anonymous", sos_triggered: bool = False,
                  factors: dict | None = None) -> List[Action]:
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
