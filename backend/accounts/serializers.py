from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, EmergencyContact


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    emergency_contact_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    emergency_contact_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    emergency_contact_relationship = serializers.ChoiceField(
        write_only=True,
        required=False,
        choices=EmergencyContact.RELATIONSHIP_CHOICES,
        default="other",
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "phone",
            "first_name",
            "last_name",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_email",
            "emergency_contact_relationship",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        contact_name = (attrs.get("emergency_contact_name") or "").strip()
        contact_phone = (attrs.get("emergency_contact_phone") or "").strip()
        contact_email = (attrs.get("emergency_contact_email") or "").strip()

        if any((contact_name, contact_phone, contact_email)) and (not contact_name or not contact_phone):
            raise serializers.ValidationError(
                {
                    "emergency_contact_name": "Provide both name and phone for the emergency contact.",
                    "emergency_contact_phone": "Provide both name and phone for the emergency contact.",
                }
            )
        return attrs

    def create(self, validated_data):
        contact_name = validated_data.pop("emergency_contact_name", "").strip()
        contact_phone = validated_data.pop("emergency_contact_phone", "").strip()
        contact_email = validated_data.pop("emergency_contact_email", "").strip()
        contact_relationship = validated_data.pop("emergency_contact_relationship", "other")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            phone=validated_data.get("phone", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        if contact_name and contact_phone:
            EmergencyContact.objects.create(
                user=user,
                name=contact_name,
                phone=contact_phone,
                email=contact_email,
                relationship=contact_relationship,
                is_primary=True,
            )

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        attrs["user"] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "phone", "is_verified", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "username", "is_verified", "created_at", "updated_at"]


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["id", "name", "phone", "email", "relationship", "is_primary", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        # Only one primary contact allowed
        if validated_data.get("is_primary"):
            EmergencyContact.objects.filter(user=user, is_primary=True).update(is_primary=False)
        return EmergencyContact.objects.create(user=user, **validated_data)
