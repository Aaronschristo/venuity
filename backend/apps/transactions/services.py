"""
Service layer for the transactions app.

Query logic for the transaction ledger and dashboard stats.
All DB aggregations live here — views just call these functions.
"""

import logging
from decimal import Decimal

from django.db.models import Sum, Count, Q

from apps.customers.models import Customer
from .models import Transaction

logger = logging.getLogger(__name__)


def get_dashboard_stats() -> dict:
    """
    Compute dashboard summary statistics in a single optimized query pass.

    Returns:
        {
            'total_customers': int,
            'total_revenue': Decimal,  # Sum of all recharge transactions
        }

    Performance notes:
        - Two separate aggregate queries are faster than one with annotation
          when the dataset is large, because SQLite can use the index on
          transaction_type for the recharge filter.
    """
    total_customers = Customer.objects.count()

    total_revenue = (
        Transaction.objects
        .filter(transaction_type=Transaction.TransactionType.RECHARGE)
        .aggregate(total=Sum('amount'))
        ['total'] or Decimal('0.00')
    )

    return {
        'total_customers': total_customers,
        'total_revenue': total_revenue,
    }


def get_recent_transactions(offset: int = 0, limit: int = 10):
    """
    Return the most recent transactions, paginated, with customer data prefetched.

    Uses select_related to avoid N+1 queries when serializing customer names.

    Args:
        offset: Number of rows to skip.
        limit:  Maximum rows to return.

    Returns:
        QuerySet of Transaction objects.
    """
    return (
        Transaction.objects
        .select_related('customer')
        .all()[offset:offset + limit]
    )


def get_transactions_for_customer(customer_public_id: str):
    """
    Return all transactions for a specific customer, ordered newest first.

    Args:
        customer_public_id: The customer's API-facing UUID.

    Returns:
        QuerySet of Transaction objects.
    """
    return (
        Transaction.objects
        .filter(customer__public_id=customer_public_id)
        .select_related('customer')
    )
