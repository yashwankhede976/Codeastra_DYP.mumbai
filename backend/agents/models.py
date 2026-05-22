from django.db import models


class AgentAction(models.Model):
    """An autonomous action decided and executed by the agentic engine."""

    ACTION_CHOICES = [
        ("SEND_SOS",              "Send SOS"),
        ("NOTIFY_CONTACTS",       "Notify Emergency Contacts"),
        ("SHARE_LOCATION",        "Share Live Location"),
        ("RECOMMEND_SAFE_PLACE",  "Recommend Safe Place"),
        ("RECOMMEND_SAFE_ROUTE",  "Recommend Safe Route"),
        ("START_RECORDING",       "Start Audio/Video Recording"),
        ("INCREASE_MONITORING",   "Increase Monitoring Frequency"),
        ("ALERT_AUTHORITIES",     "Alert Authorities"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("EXECUTED", "Executed"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
    ]

    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="agent_actions",
    )
    session_id = models.CharField(max_length=64, default="anonymous")
    action_type = models.CharField(max_length=40, choices=ACTION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="EXECUTED")
    risk_score = models.IntegerField(default=0)
    risk_level = models.CharField(max_length=10, default="Low")
    payload = models.JSONField(default=dict)
    reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "safeher_agent_action"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.action_type}] {self.status} – risk {self.risk_score}"
