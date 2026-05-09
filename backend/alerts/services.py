"""
SafeHer AI – Alert Services
=============================
Handles SOS dispatch, alert creation, and voice keyword detection.
The ``_dispatch_alert`` function is intentionally a stub — plug in
Twilio/Firebase/SendGrid credentials here for production SMS/push delivery.
"""
from __future__ import annotations

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _dispatch_alert(*, contact_name: str, contact_phone: str, message: str, location: dict) -> dict:
    """
    Stub dispatcher — replace with Twilio/Firebase for real delivery.
    Returns a result dict describing the simulated dispatch.
    """
    logger.info(
        "ALERT DISPATCH [SIMULATED]: '%s' → %s | msg: %s",
        contact_name, contact_phone, message
    )
    return {
        "contact": contact_name,
        "phone": contact_phone,
        "delivered": True,
        "channel": "simulated_sms",
    }


def dispatch_sos(*, user, session_id: str, latitude: float, longitude: float,
                 risk_score: int = 0, message: str = "") -> dict:
    """
    Create an SOS EmergencyAlert, notify all emergency contacts (simulated),
    and return a summary enriched with Google Maps location data.
    """
    from .models import EmergencyAlert
    from tracking.google_maps import reverse_geocode, static_map_url, _is_configured

    # Enrich with real location label via Google Maps
    area_label = reverse_geocode(latitude, longitude) if _is_configured() else f"({latitude:.5f}, {longitude:.5f})"
    map_url = static_map_url(latitude, longitude) if _is_configured() else ""

    default_message = (
        message
        or f"🚨 SOS ALERT: Your contact may be in danger near {area_label}, Mumbai. "
           "Please call them immediately or contact emergency services (100/112)."
    )

    contacts_notified = []
    if user and user.is_authenticated:
        from accounts.models import EmergencyContact
        contacts = EmergencyContact.objects.filter(user=user)
        for contact in contacts:
            result = _dispatch_alert(
                contact_name=contact.name,
                contact_phone=contact.phone,
                message=default_message + (f"\n📍 Map: {map_url}" if map_url else ""),
                location={"latitude": latitude, "longitude": longitude, "label": area_label},
            )
            contacts_notified.append(result)

    alert = EmergencyAlert.objects.create(
        user=user if (user and user.is_authenticated) else None,
        session_id=session_id,
        alert_type="SOS",
        status="ACTIVE",
        latitude=latitude,
        longitude=longitude,
        message=default_message,
        risk_score=risk_score,
        contacts_notified=contacts_notified,
    )

    return {
        "alert_id": alert.id,
        "alert_type": "SOS",
        "status": "ACTIVE",
        "message": default_message,
        "contacts_notified": contacts_notified,
        "location": {"latitude": latitude, "longitude": longitude, "label": area_label},
        "static_map_url": map_url,
        "created_at": alert.created_at.isoformat(),
    }



def process_voice(*, raw_text: str, user=None, session_id: str = "anonymous") -> dict:
    """
    Detect emergency keywords in transcribed voice text.
    Returns a trigger result with the matched keyword and confidence.
    """
    from .models import VoiceTrigger

    keywords = getattr(settings, "SAFEHER_VOICE_KEYWORDS", ["help", "emergency", "save me", "sos"])
    text_lower = raw_text.lower().strip()

    matched_keyword = None
    confidence = 0.0
    for keyword in keywords:
        if keyword.lower() in text_lower:
            matched_keyword = keyword
            # Confidence: exact match scores higher than substring match
            confidence = 1.0 if text_lower == keyword.lower() else 0.85
            break

    if not matched_keyword:
        return {
            "triggered": False,
            "keyword": None,
            "confidence": 0.0,
            "action_taken": "NONE",
            "message": "No emergency keyword detected.",
        }

    trigger = VoiceTrigger.objects.create(
        user=user if (user and user.is_authenticated) else None,
        session_id=session_id,
        keyword=matched_keyword,
        raw_text=raw_text,
        confidence=confidence,
        action_taken="ALERT_TRIGGERED",
    )

    return {
        "triggered": True,
        "trigger_id": trigger.id,
        "keyword": matched_keyword,
        "confidence": confidence,
        "action_taken": "ALERT_TRIGGERED",
        "message": f"Emergency keyword '{matched_keyword}' detected. SOS workflow initiated.",
    }
