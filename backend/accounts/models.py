from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user model with phone and verification status."""
    phone = models.CharField(max_length=20, blank=True, default="")
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "safeher_user"
        verbose_name = "User"

    def __str__(self):
        return f"{self.username} ({self.email})"


class EmergencyContact(models.Model):
    """Trusted contact that will be notified during an emergency."""
    RELATIONSHIP_CHOICES = [
        ("parent", "Parent"),
        ("sibling", "Sibling"),
        ("friend", "Friend"),
        ("partner", "Partner"),
        ("colleague", "Colleague"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="emergency_contacts"
    )
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, default="")
    relationship = models.CharField(
        max_length=20, choices=RELATIONSHIP_CHOICES, default="other"
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safeher_emergency_contact"
        ordering = ["-is_primary", "name"]

    def __str__(self):
        return f"{self.name} ({self.relationship}) – {self.user.username}"
