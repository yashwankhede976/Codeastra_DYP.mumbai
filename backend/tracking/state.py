from .services import DEFAULT_LOCATION, SafeHerSnapshot, snapshot_to_dict


CURRENT_STATE = snapshot_to_dict(
    SafeHerSnapshot(
        sessionId="idle",
        safetyScore=94,
        riskScore=6,
        status="Safe",
        alertTriggered=False,
        emergencyMessage="Tracking is idle. Start monitoring to evaluate the route in real time.",
        alertChannel="Monitoring",
        location=DEFAULT_LOCATION,
        timestamp="",
    )
)
