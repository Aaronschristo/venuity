"""
Views for the users app.

Endpoints:
    POST /api/v1/auth/token/          — Obtain JWT token pair
    POST /api/v1/auth/token/refresh/  — Refresh access token
    POST /api/v1/auth/token/blacklist/— Logout (blacklist refresh token)
    GET  /api/v1/auth/me/             — Get current user's profile
"""

from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.views import TokenBlacklistView

from django.contrib.auth import get_user_model

from .serializers import CustomTokenObtainPairSerializer, UserProfileSerializer

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint.

    Returns access token, refresh token, and user profile in one response.
    POST body: { "username": "...", "password": "..." }
    """

    serializer_class = CustomTokenObtainPairSerializer


class MeView(generics.RetrieveAPIView):
    """
    Returns the currently authenticated user's profile.

    Use this on app startup to verify the token is still valid
    and to refresh cached user information.
    GET /api/v1/auth/me/
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
