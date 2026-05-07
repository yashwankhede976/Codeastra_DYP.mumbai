from django.db import models


class LocationLog(models.Model):
    """Persisted GPS location sample."""
    AREA_CHOICES = [("normal", "Normal"), ("isolated", "Isolated"), ("crowded", "Crowded")]
    TIME_CHOICES = [("day", "Day"), ("night", "Night")]

    # user is nullable so anonymous (frontend) sessions can also log
    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="location_logs",
    )
    session_id = models.CharField(max_length=64, default="anonymous")
    latitude = models.FloatField()
    longitude = models.FloatField()
    label = models.CharField(max_length=200, blank=True, default="")
    area_type = models.CharField(max_length=20, choices=AREA_CHOICES, default="normal")
    time_of_day = models.CharField(max_length=10, choices=TIME_CHOICES, default="day")
    speed_kmh = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safeher_location_log"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] ({self.latitude:.4f}, {self.longitude:.4f})"


class RiskAnalysis(models.Model):
    """Persisted AI risk assessment result."""
    LEVEL_CHOICES = [("Low", "Low"), ("Medium", "Medium"), ("High", "High")]

    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="risk_analyses",
    )
    session_id = models.CharField(max_length=64, default="anonymous")
    risk_score = models.IntegerField()
    safety_score = models.IntegerField()
    risk_level = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    label = models.CharField(max_length=200, blank=True, default="")
    factors = models.JSONField(default=dict)
    alert_triggered = models.BooleanField(default=False)
    analyzed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safeher_risk_analysis"
        ordering = ["-analyzed_at"]

    def __str__(self):
        return f"[{self.analyzed_at:%H:%M}] {self.risk_level} – score {self.risk_score}"
