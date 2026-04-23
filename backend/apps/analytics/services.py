"""
Analytics service layer.

All chart data computation lives here.
Views call these functions and return the results directly.

Performance notes:
    - Each chart period is computed with a single aggregate query per data point.
    - For large datasets, these loops (24 hourly, 7 daily) would benefit from
      a single annotated GROUP BY query. That optimization is noted in comments.
    - SQLite does not support TruncHour natively, so we use a Python loop.
      When migrating to PostgreSQL, replace with TruncHour/TruncDay annotations.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)


def get_hourly_analytics(target_date: date, metric: str) -> dict:
    """
    Compute per-hour analytics data for a given date and metric.

    Covers business hours: 9 AM – 8 PM (inclusive).

    Args:
        target_date: The date to analyze (date object, in server timezone).
        metric:      'revenue' → sum of recharge amounts
                     'checkins' → count of check-in transactions

    Returns:
        {
            'labels': ['9:00', '10:00', ...],
            'data':   [1500.00, 200.00, ...],
            'display_date': 'April 24, 2026',
        }
    """
    labels = []
    data = []

    for hour in range(9, 21):  # 9:00 – 20:00
        labels.append(f'{hour}:00')

        qs = Transaction.objects.filter(
            created_at__date=target_date,
            created_at__hour=hour,
        )
        val = _compute_metric(qs, metric)
        data.append(val)

    return {
        'labels': labels,
        'data': data,
        'display_date': target_date.strftime('%B %d, %Y'),
        'interval': 'hourly',
        'metric': metric,
    }


def get_weekly_analytics(target_date: date, metric: str) -> dict:
    """
    Compute per-day analytics for the calendar week containing target_date.

    Week starts on Monday (ISO convention).

    Args:
        target_date: Any date within the desired week.
        metric:      'revenue' | 'checkins'

    Returns:
        Same shape as get_hourly_analytics.
    """
    # Monday of the target week
    start_date = target_date - timedelta(days=target_date.weekday())
    labels = []
    data = []

    for i in range(7):
        day = start_date + timedelta(days=i)
        labels.append(day.strftime('%a %d'))

        qs = Transaction.objects.filter(created_at__date=day)
        val = _compute_metric(qs, metric)
        data.append(val)

    return {
        'labels': labels,
        'data': data,
        'display_date': target_date.strftime('%B %d, %Y'),
        'interval': 'weekly',
        'metric': metric,
    }


def get_monthly_analytics(target_date: date, metric: str) -> dict:
    """
    Compute per-day analytics for the entire calendar month of target_date.

    Args:
        target_date: Any date within the desired month.
        metric:      'revenue' | 'checkins'

    Returns:
        Same shape as get_hourly_analytics.
    """
    import calendar

    year = target_date.year
    month = target_date.month
    _, days_in_month = calendar.monthrange(year, month)

    labels = []
    data = []

    for day_num in range(1, days_in_month + 1):
        day = date(year, month, day_num)
        labels.append(str(day_num))

        qs = Transaction.objects.filter(created_at__date=day)
        val = _compute_metric(qs, metric)
        data.append(val)

    return {
        'labels': labels,
        'data': data,
        'display_date': target_date.strftime('%B %Y'),
        'interval': 'monthly',
        'metric': metric,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_metric(qs, metric: str):
    """
    Given a filtered Transaction queryset and a metric name,
    return the computed value.

    Returns float for JSON serialization compatibility.
    """
    if metric == 'revenue':
        result = (
            qs.filter(transaction_type=Transaction.TransactionType.RECHARGE)
            .aggregate(total=Sum('amount'))
            ['total'] or Decimal('0.00')
        )
        return float(result)
    else:
        # Default: checkin count
        return qs.filter(
            transaction_type=Transaction.TransactionType.CHECKIN
        ).count()


def parse_date(date_str: str) -> date:
    """
    Parse a YYYY-MM-DD string to a date object.
    Returns today's date if parsing fails.
    """
    if not date_str:
        return timezone.localdate()
    try:
        from datetime import datetime
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        logger.warning('Invalid date string for analytics: %r — using today.', date_str)
        return timezone.localdate()
