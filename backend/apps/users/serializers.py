"""
Serializers for the users app.

Serializers here handle authentication responses and user profile data.
Password write is handled via separate serializers to prevent accidental exposure.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the authenticated user's profile.

    Exposes only safe, non-sensitive fields.
    The `public_id` is used as the API-facing identifier (not the integer `id`).
    """

    class Meta:
        model = User
        fields = [
            'public_id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
            'last_login',
            'date_joined',
        ]
        read_only_fields = fields


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT token serializer to include user profile
    data in the token response.

    The frontend receives tokens + basic user info in a single request,
    eliminating the need for an immediate follow-up /me call.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserProfileSerializer(self.user).data
        return data
