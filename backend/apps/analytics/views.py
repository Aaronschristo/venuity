"""
Views for the analytics app.

Endpoints:
    GET /api/v1/analytics/?interval=hourly|weekly|monthly&metric=revenue|checkins&date=YYYY-MM-DD
"""

from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStaffUser
from . import services


class AnalyticsView(APIView):
    """
    GET /api/v1/analytics/

    Returns chart data for the given interval and metric.

    Query parameters:
        interval  — 'hourly' (default) | 'weekly' | 'monthly'
        metric    — 'revenue' (default) | 'checkins'
        date      — YYYY-MM-DD (default: today)

    Response:
        {
            "labels": [...],
            "data": [...],
            "display_date": "April 24, 2026",
            "interval": "hourly",
            "metric": "revenue"
        }
    """

    permission_classes = [IsStaffUser]

    def get(self, request):
        interval = request.query_params.get('interval', 'hourly')
        metric = request.query_params.get('metric', 'revenue')
        date_str = request.query_params.get('date', '')

        # Validate metric
        if metric not in ('revenue', 'checkins'):
            metric = 'revenue'

        target_date = services.parse_date(date_str)

        if interval == 'weekly':
            result = services.get_weekly_analytics(target_date, metric)
        elif interval == 'monthly':
            result = services.get_monthly_analytics(target_date, metric)
        else:
            result = services.get_hourly_analytics(target_date, metric)

        return Response(result)
