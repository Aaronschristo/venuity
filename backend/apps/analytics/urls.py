"""
URL patterns for the analytics app.

Mounted at: /api/v1/analytics/
"""

from django.urls import path
from .views import AnalyticsView

urlpatterns = [
    path('', AnalyticsView.as_view(), name='analytics'),
]
