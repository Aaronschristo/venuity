"""
Transaction model.

Design decisions:
    - `id`               : Auto-incremented integer PK (internal, fast ordering).
    - `transaction_type` : Uses TextChoices enum for type safety (not raw strings).
    - `amount`           : DecimalField — exact financial storage.
    - `notes`            : Optional text for audit trail context.
    - Composite index on (transaction_type, created_at) — used by analytics queries.
"""

from decimal import Decimal

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.customers.models import Customer


class Transaction(models.Model):
    """
    Records a single financial event for a customer.

    All monetary operations (recharge, check-in) create a Transaction row.
    This table is the authoritative ledger — the balance on Customer is
    a cached denormalization of the sum of all transactions.
    """

    class TransactionType(models.TextChoices):
        RECHARGE = 'recharge', _('Recharge')
        CHECKIN  = 'checkin',  _('Check-in')

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name=_('customer'),
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        db_index=True,
        verbose_name=_('type'),
    )

    # DecimalField for exact monetary values
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_('amount'),
    )

    notes = models.TextField(
        blank=True,
        default='',
        verbose_name=_('notes'),
        help_text=_('Optional context for the audit trail.'),
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name=_('created at'),
    )

    class Meta:
        verbose_name = _('transaction')
        verbose_name_plural = _('transactions')
        ordering = ['-created_at']
        indexes = [
            # Used by analytics: filter by type then group by date
            models.Index(
                fields=['transaction_type', 'created_at'],
                name='ix_tx_type_created_at',
            ),
            # Used by dashboard stats: filter recharge transactions by date range
            models.Index(
                fields=['created_at'],
                name='ix_tx_created_at',
            ),
        ]

    def __str__(self):
        return (
            f'{self.transaction_type} | {self.amount} | '
            f'{self.customer.name} | {self.created_at:%Y-%m-%d %H:%M}'
        )
