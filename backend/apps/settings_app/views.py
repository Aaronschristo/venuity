"""
Views for the settings app.

Endpoints:
    GET  /api/v1/settings/          — Get all settings (staff)
    POST /api/v1/settings/          — Update settings (admin only)
    GET  /api/v1/settings/branding/ — Get branding settings (public, no auth)
"""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from common.permissions import IsStaffUser, IsAdminUser
from .serializers import ApplicationSettingsSerializer
from . import services


class ApplicationSettingsView(APIView):
    """
    GET  /api/v1/settings/ — Returns the current application settings.
    POST /api/v1/settings/ — Updates one or more settings (admin only).
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsStaffUser()]
        return [IsAdminUser()]

    def get(self, request):
        settings_data = services.get_all_settings()
        return Response(settings_data)

    def post(self, request):
        serializer = ApplicationSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = services.update_settings(serializer.validated_data)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(updated)


class BrandingSettingsView(APIView):
    """
    GET /api/v1/settings/branding/

    Returns branding/white-label settings WITHOUT requiring authentication.
    This endpoint is called by the frontend login page to display the
    correct logo, business name, and theme colors before the user logs in.

    Response:
        {
            "business_name": "PlayArea Manager",
            "primary_color": "#6366f1",
            "primary_hover_color": "#4f46e5",
            "logo_url": "/logo.png",
            "app_title": "Venuity"
        }
    """

    permission_classes = [AllowAny]

    def get(self, request):
        branding = services.get_branding_settings()
        return Response(branding)
