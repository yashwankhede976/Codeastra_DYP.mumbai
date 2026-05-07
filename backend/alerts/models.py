from django.db import models


class EmergencyAlert(models.Model):
    """A recorded emergency alert event."""
    ALERT_TYPE_CHOICES = [
        ("SOS", "SOS"),
        ("AUTONOMOUS", "Autonomous AI"),
        ("VOICE", "Voice Trigger"),
        ("MANUAL", "Manual"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("RESOLVED", "Resolved"),
        ("CANCELLED", "Cancelled"),
    ]

    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emergency_alerts",
    )
    session_id = models.CharField(max_length=64, default="anonymous")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    message = models.TextField(blank=True, default="")
    risk_score = models.IntegerField(default=0)
    contacts_notified = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "safeher_emergency_alert"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.alert_type}] {self.status} – {self.created_at:%Y-%m-%d %H:%M}"


class VoiceTrigger(models.Model):
    """A recorded voice keyword detection event."""
    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="voice_triggers",
    )
    session_id = models.CharField(max_length=64, default="anonymous")
    keyword = models.CharField(max_length=100)
    raw_text = models.TextField(blank=True, default="")
    confidence = models.FloatField(default=1.0)
    action_taken = models.CharField(max_length=50, default="ALERT_TRIGGERED")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safeher_voice_trigger"
        ordering = ["-timestamp"]

    def __str__(self):
        return f'"{self.keyword}" – {self.timestamp:%H:%M}'
