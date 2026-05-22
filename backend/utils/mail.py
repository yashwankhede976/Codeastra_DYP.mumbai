"""Lightweight SMTP fallback mailer using smtplib.

This module sends multipart (plain+html) messages by reading SMTP
configuration from Django settings. It is intended as an emergency
fallback when the Django email backend fails or when you prefer to
explicitly control the SMTP connection.

Do NOT store credentials in code. Configure the following in your
environment or settings:

- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USE_TLS (True/False)
- EMAIL_HOST_USER
- EMAIL_HOST_PASSWORD
- DEFAULT_FROM_EMAIL

"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from django.conf import settings

logger = logging.getLogger(__name__)


def send_via_smtp(subject: str, from_email: str, to_email: str, plain_text: str, html_content: str) -> int:
    """Send an email via smtplib using settings-defined SMTP server.

    Returns the number of recipients successfully accepted by the SMTP
    server (value returned by ``smtplib.sendmail``).
    Raises exceptions from the smtplib layer so callers can log them.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    # Attach plain and html alternatives
    msg.attach(MIMEText(plain_text or "", "plain"))
    if html_content:
        msg.attach(MIMEText(html_content, "html"))

    host = getattr(settings, "EMAIL_HOST", "")
    port = int(getattr(settings, "EMAIL_PORT", 587) or 587)
    use_tls = bool(getattr(settings, "EMAIL_USE_TLS", True))
    user = getattr(settings, "EMAIL_HOST_USER", "")
    password = getattr(settings, "EMAIL_HOST_PASSWORD", "")

    if not host:
        raise ValueError("EMAIL_HOST is not configured in settings")

    logger.info("SMTP fallback: connecting to %s:%s (tls=%s) as %s", host, port, use_tls, bool(user))

    server = smtplib.SMTP(host, port, timeout=20)
    try:
        server.ehlo()
        if use_tls:
            server.starttls()
            server.ehlo()

        if user and password:
            server.login(user, password)

        # sendmail returns a dict of failed recipients; to keep parity with
        # Django's send() which returns number of messages sent, we return
        # the count of accepted recipients (0 on failure).
        res = server.sendmail(from_email, [to_email], msg.as_string())
        failures = len(res) if isinstance(res, dict) else 0
        accepted = 0 if failures else 1
        logger.info("SMTP fallback: sendmail result failures=%s", res)
        return accepted
    finally:
        try:
            server.quit()
        except Exception:
            logger.debug("SMTP fallback: quit() raised", exc_info=True)
