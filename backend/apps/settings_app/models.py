"""
ApplicationSetting model.

A flexible key-value store for business configuration that can be
changed at runtime without a code deploy.

This is NOT a general-purpose config store — it's for business settings
that the operator changes via the frontend (business name, checkin fee, etc.)

Design considerations:
    - Primary key is the `key` string itself (no surrogate PK needed).
    - The value is always stored as a string; cast in service layer.
    - The model's __str__ is the key, so admin display is clean.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class ApplicationSetting(models.Model):
    """
    Stores a single named application setting.

    Pre-defined keys:
        business_name    — Display name of the business
        currency_symbol  — e.g., ₹, $, €
        checkin_fee      — Decimal string, e.g., '100.00'
    """

    key = models.CharField(
        max_length=100,
        primary_key=True,
        verbose_name=_('key'),
    )

    value = models.TextField(
        verbose_name=_('value'),
        help_text=_('All values are stored as strings. Type casting happens in the service layer.'),
    )

    class Meta:
        verbose_name = _('application setting')
        verbose_name_plural = _('application settings')

    def __str__(self):
        return f'{self.key} = {self.value}'
