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
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger(__name__)


def _google_maps_link(latitude: float, longitude: float) -> str:
        return f"https://www.google.com/maps/search/?api=1&query={latitude:.6f},{longitude:.6f}"


def _send_email_alert(*, recipient_email: str, recipient_name: str, message: str, latitude: float, longitude: float, area_label: str, map_url: str) -> dict:
        if not recipient_email:
                return {
                        "channel": "email",
                        "contact": recipient_name,
                        "email": "",
                        "delivered": False,
                        "reason": "missing_email",
                }
        backend = getattr(settings, "EMAIL_BACKEND", "(not set)")
        logger.info(
            "Preparing email to %s <%s> via backend=%s: %s",
            recipient_name,
            recipient_email,
            backend,
            area_label,
        )
        subject = "SafeHer SOS Alert - Live Location"
        now = timezone.now().isoformat()
        plain_text = (
                f"Hello {recipient_name or 'there'},\n\n"
                f"{message}\n\n"
                f"Location: {area_label}\n"
                f"Coordinates: {latitude:.6f}, {longitude:.6f}\n"
                f"Maps link: {map_url}\n"
                f"Time: {now}\n"
        )
        html_content = f"""
        <html>
            <body style=\"font-family: Arial, sans-serif; background:#f5f5f5; padding:24px;\">
                <div style=\"max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border-top:6px solid #c11325;\">
                    <h2 style=\"margin-top:0;color:#c11325;\">SafeHer SOS Alert</h2>
                    <p>Hello {recipient_name or 'there'},</p>
                    <p>{message}</p>
                    <div style=\"margin:20px 0;padding:16px;border-radius:12px;background:#fff3f3;border:1px solid #f2b8b8;\">
                        <p style=\"margin:0 0 8px 0;\"><strong>Location:</strong> {area_label}</p>
                        <p style=\"margin:0 0 8px 0;\"><strong>Coordinates:</strong> {latitude:.6f}, {longitude:.6f}</p>
                        <p style=\"margin:0;\"><strong>Live map:</strong> <a href=\"{map_url}\">Open location</a></p>
                    </div>
                    <p style=\"color:#666;font-size:12px;\">Sent at {now}</p>
                </div>
            </body>
        </html>
        """

        email = EmailMultiAlternatives(subject, plain_text, settings.DEFAULT_FROM_EMAIL, [recipient_email])
        email.attach_alternative(html_content, "text/html")

        try:
            sent = email.send(fail_silently=False)
            logger.info("Email send result for %s: %s", recipient_email, sent)
            return {
                "channel": "email",
                "contact": recipient_name,
                "email": recipient_email,
                "delivered": True,
                "backend": backend,
                "sent_result": sent,
            }
        except Exception as exc:
            # Primary backend failed — log and attempt smtplib fallback if
            # SMTP credentials are present in settings. This uses the
            # lightweight fallback in backend.utils.mail to send the same
            # HTML/plain payload directly.
            logger.exception("Email dispatch failed for %s using backend=%s", recipient_email, backend)

            # Attempt smtplib fallback when credentials are available
            smtp_user = getattr(settings, "EMAIL_HOST_USER", "")
            smtp_pwd = getattr(settings, "EMAIL_HOST_PASSWORD", "")
            smtp_host = getattr(settings, "EMAIL_HOST", "")
            if smtp_host and smtp_user and smtp_pwd:
                try:
                    from utils.mail import send_via_smtp

                    sent_fallback = send_via_smtp(subject, settings.DEFAULT_FROM_EMAIL, recipient_email, plain_text, html_content)
                    logger.info("SMTP fallback send result for %s: %s", recipient_email, sent_fallback)
                    return {
                        "channel": "email",
                        "contact": recipient_name,
                        "email": recipient_email,
                        "delivered": True,
                        "backend": "smtplib_fallback",
                        "sent_result": sent_fallback,
                    }
                except Exception as exc2:
                    logger.exception("SMTP fallback failed for %s", recipient_email)
                    return {
                        "channel": "email",
                        "contact": recipient_name,
                        "email": recipient_email,
                        "delivered": False,
                        "reason": f"primary_error={str(exc)}; fallback_error={str(exc2)}",
                        "backend": f"primary={backend}; fallback=smtplib",
                    }

            return {
                "channel": "email",
                "contact": recipient_name,
                "email": recipient_email,
                "delivered": False,
                "reason": str(exc),
                "backend": backend,
            }


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
        contacts = EmergencyContact.objects.filter(user=user).order_by("-is_primary", "name")

        logger.info(
            "Dispatching SOS for user=%s session=%s lat=%.6f lng=%.6f contacts=%d",
            getattr(user, "id", None),
            session_id,
            latitude,
            longitude,
            contacts.count(),
        )

        for contact in contacts:
            map_link = map_url or _google_maps_link(latitude, longitude)
            # Attempt email first (if provided) then the simulated dispatcher
            email_result = _send_email_alert(
                recipient_email=contact.email,
                recipient_name=contact.name,
                message=default_message,
                latitude=latitude,
                longitude=longitude,
                area_label=area_label,
                map_url=map_link,
            )

            result = _dispatch_alert(
                contact_name=contact.name,
                contact_phone=contact.phone,
                message=default_message + (f"\n📍 Map: {map_link}" if map_link else ""),
                location={"latitude": latitude, "longitude": longitude, "label": area_label},
            )

            merged = {**result, **email_result, "relationship": contact.relationship, "is_primary": contact.is_primary}
            contacts_notified.append(merged)
            logger.info("Notified contact: %s — %s", contact.name, merged)

        # If user has no contacts with delivery, also send to user's own email as fallback
        if not contacts_notified and getattr(user, "email", ""):
            fallback = _send_email_alert(
                recipient_email=user.email,
                recipient_name=getattr(user, "get_full_name", lambda: "")() or getattr(user, "username", "User"),
                message=default_message,
                latitude=latitude,
                longitude=longitude,
                area_label=area_label,
                map_url=map_url or _google_maps_link(latitude, longitude),
            )
            contacts_notified.append(fallback)
            logger.info("Sent fallback email to user: %s", user.email)

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
