"""
URL patterns for the customers app.

Mounted at: /api/v1/customers/
"""

from django.urls import path
from .views import (
    CustomerListCreateView,
    CustomerDetailView,
    CustomerRechargeView,
    CustomerCheckinView,
    CustomerQRCodeView,
)

urlpatterns = [
    # Collection
    path('', CustomerListCreateView.as_view(), name='customer-list-create'),

    # Business operations (before <public_id> to avoid routing conflicts)
    path('recharge/', CustomerRechargeView.as_view(), name='customer-recharge'),
    path('checkin/', CustomerCheckinView.as_view(), name='customer-checkin'),

    # Single resource
    path('<uuid:public_id>/', CustomerDetailView.as_view(), name='customer-detail'),
    path('<uuid:public_id>/qr/', CustomerQRCodeView.as_view(), name='customer-qr'),
]
