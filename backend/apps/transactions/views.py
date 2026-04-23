"""
Views for the transactions app.

Endpoints:
    GET /api/v1/transactions/        — Paginated transaction log
    GET /api/v1/transactions/stats/  — Dashboard stats (totals + recent transactions)
"""

import logging

from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardResultsPagination
from common.permissions import IsStaffUser
from .models import Transaction
from .serializers import TransactionSerializer, DashboardStatsSerializer
from . import services

logger = logging.getLogger(__name__)


class TransactionListView(generics.ListAPIView):
    """
    GET /api/v1/transactions/

    Returns the full transaction log, paginated.
    Supports filtering by transaction type via ?type=recharge|checkin.
    """

    serializer_class = TransactionSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        qs = Transaction.objects.select_related('customer').all()
        tx_type = self.request.query_params.get('type')
        if tx_type in (Transaction.TransactionType.RECHARGE, Transaction.TransactionType.CHECKIN):
            qs = qs.filter(transaction_type=tx_type)
        return qs


class DashboardStatsView(APIView):
    """
    GET /api/v1/transactions/stats/

    Returns aggregated statistics for the dashboard plus the first page
    of recent transactions.

    Response shape:
        {
            "total_customers": 120,
            "total_revenue": "14500.00",
            "recent_transactions": [...],
            "next_offset": 10
        }
    """

    permission_classes = [IsStaffUser]

    def get(self, request):
        stats = services.get_dashboard_stats()

        # First page of recent transactions (no pagination for this quick view)
        recent_qs = services.get_recent_transactions(offset=0, limit=10)
        recent_data = TransactionSerializer(recent_qs, many=True).data

        return Response({
            **stats,
            'recent_transactions': recent_data,
        })
