"""
URL patterns for the transactions app.

Mounted at: /api/v1/transactions/
"""

from django.urls import path
from .views import TransactionListView, DashboardStatsView

urlpatterns = [
    path('', TransactionListView.as_view(), name='transaction-list'),
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
