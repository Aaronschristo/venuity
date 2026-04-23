"""
Views for the settings app.

Endpoints:
    GET  /api/v1/settings/ — Get all settings (staff)
    POST /api/v1/settings/ — Update settings (admin only)
"""

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
