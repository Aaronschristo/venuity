"""
URL patterns for the users app.

Mounted at: /api/v1/auth/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import CustomTokenObtainPairView, MeView

urlpatterns = [
    # Obtain JWT (Login)
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # Refresh access token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Logout (blacklist the refresh token)
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),

    # Get current user profile
    path('me/', MeView.as_view(), name='user_me'),
]
