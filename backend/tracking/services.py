from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Literal
import uuid

TimeOfDay = Literal["day", "night"]
AreaType = Literal["normal", "isolated", "crowded"]
Status = Literal["Safe", "Moderate", "High Risk"]


@dataclass
class SafeHerLocation:
    latitude: float
    longitude: float
    label: str
    areaType: AreaType
    timeOfDay: TimeOfDay


@dataclass
class SafeHerSnapshot:
    sessionId: str
    safetyScore: int
    riskScore: int
    status: Status
    alertTriggered: bool
    emergencyMessage: str
    alertChannel: str
    location: SafeHerLocation
    timestamp: str


DEFAULT_LOCATION = SafeHerLocation(
    latitude=28.6139,
    longitude=77.209,
    label="Connaught Place",
    areaType="normal",
    timeOfDay="day",
)


def status_for_risk(risk_score: int) -> Status:
    if risk_score >= 70:
        return "High Risk"
    if risk_score >= 40:
        return "Moderate"
    return "Safe"


def risk_from_context(*, demo_night: bool, demo_isolated: bool, location: SafeHerLocation, source: str = "auto", sos_triggered: bool = False) -> SafeHerSnapshot:
    time_risk = 35 if demo_night or location.timeOfDay == "night" else 15
    area_risk = 45 if demo_isolated else 12 if location.areaType == "crowded" else 38 if location.areaType == "isolated" else 20
    manual_risk = 90 if sos_triggered else 6 if source == "manual" else 0

    risk_score = min(100, max(0, time_risk + area_risk + manual_risk))
    safety_score = max(0, 100 - risk_score)
    alert_triggered = risk_score > 70

    return SafeHerSnapshot(
        sessionId=str(uuid.uuid4()),
        safetyScore=safety_score,
        riskScore=risk_score,
        status=status_for_risk(risk_score),
        alertTriggered=alert_triggered,
        emergencyMessage=(
            "Emergency alert generated. Trusted contacts and emergency services should be notified immediately."
            if alert_triggered
            else "Tracking is active and conditions remain within the expected safety range."
        ),
        alertChannel="SOS" if sos_triggered else "Autonomous" if alert_triggered else "Monitoring",
        location=location,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def snapshot_to_dict(snapshot: SafeHerSnapshot) -> dict:
    data = asdict(snapshot)
    data["location"] = asdict(snapshot.location)
    return data
