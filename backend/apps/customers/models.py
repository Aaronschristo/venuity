"""
Customer model.

Design decisions:
    - `id`        : Django's auto-incremented BigAutoField (internal PK, fast JOINs).
    - `public_id` : UUID exposed in all API responses (prevents ID enumeration).
    - `balance`   : Uses DecimalField instead of FloatField.
                    FloatField is IEEE 754 and has rounding errors with money.
                    DecimalField stores exact values — critical for financial data.
    - `qr_id`     : The UUID embedded in the printed QR code. Stored separately
                    so a QR card can be reassigned or replaced without changing
                    the customer record's identity.
"""

import uuid

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Customer(models.Model):
    """
    Represents a registered customer (play area member).

    Each customer has a unique QR card (qr_id). When a QR is scanned,
    the system looks up the customer by this field.
    """

    # Internal integer PK — never exposed in the API
    # (Django creates this automatically as BigAutoField per DEFAULT_AUTO_FIELD)

    # External-facing identifier
    public_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name=_('public ID'),
        help_text=_('UUID used in API responses. Not the database primary key.'),
    )

    name = models.CharField(
        max_length=150,
        verbose_name=_('full name'),
    )

    # IMPORTANT: Use DecimalField for money, never FloatField.
    balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default='0.00',
        verbose_name=_('balance'),
        help_text=_('Current prepaid balance in the local currency.'),
    )

    # The UUID encoded in the physical QR sticker.
    # Unique and indexed for fast lookups on scan.
    qr_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        verbose_name=_('QR code ID'),
        help_text=_('UUID encoded in the customer\'s physical QR code.'),
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name=_('registered at'),
    )

    class Meta:
        verbose_name = _('customer')
        verbose_name_plural = _('customers')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name'], name='ix_customer_name'),
        ]

    def __str__(self):
        return f'{self.name} (balance: {self.balance})'
