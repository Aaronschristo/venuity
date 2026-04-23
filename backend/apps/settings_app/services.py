"""
Service layer for the settings app.

Provides typed accessors for individual settings.
All casting and defaults live here — callers get Python types, not strings.

When adding a new setting:
    1. Add a DEFAULTS entry.
    2. Add a typed getter function.
    3. Include the key in update_settings validation.
"""

import logging
from decimal import Decimal, InvalidOperation

from .models import ApplicationSetting

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Canonical keys and defaults
# ---------------------------------------------------------------------------

SETTING_BUSINESS_NAME   = 'business_name'
SETTING_CURRENCY_SYMBOL = 'currency_symbol'
SETTING_CHECKIN_FEE     = 'checkin_fee'

DEFAULTS = {
    SETTING_BUSINESS_NAME:   'PlayArea Manager',
    SETTING_CURRENCY_SYMBOL: '₹',
    SETTING_CHECKIN_FEE:     '100.00',
}


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _get(key: str) -> str:
    """Return a setting value by key, falling back to the hardcoded default."""
    try:
        return ApplicationSetting.objects.get(key=key).value
    except ApplicationSetting.DoesNotExist:
        return DEFAULTS.get(key, '')


def _set(key: str, value: str) -> None:
    """Upsert a setting value."""
    ApplicationSetting.objects.update_or_create(
        key=key,
        defaults={'value': value},
    )


# ---------------------------------------------------------------------------
# Typed accessors
# ---------------------------------------------------------------------------

def get_all_settings() -> dict:
    """
    Return all application settings as a dict with Python-typed values.

    Missing keys fall back to defaults.
    """
    return {
        SETTING_BUSINESS_NAME:   _get(SETTING_BUSINESS_NAME),
        SETTING_CURRENCY_SYMBOL: _get(SETTING_CURRENCY_SYMBOL),
        SETTING_CHECKIN_FEE:     _get(SETTING_CHECKIN_FEE),
    }


def get_checkin_fee() -> Decimal:
    """Return the check-in fee as a Decimal. Falls back to 100.00."""
    raw = _get(SETTING_CHECKIN_FEE)
    try:
        return Decimal(raw)
    except InvalidOperation:
        logger.error('Invalid checkin_fee setting: %r — using default 100.00', raw)
        return Decimal('100.00')


def update_settings(data: dict) -> dict:
    """
    Bulk-update application settings from a validated data dict.

    Only known keys are updated (unknown keys are silently ignored).
    Values are validated before writing.

    Args:
        data: Dict of {key: value} pairs.

    Returns:
        The updated settings dict.

    Raises:
        ValueError: If checkin_fee is not a valid non-negative decimal.
    """
    allowed_keys = set(DEFAULTS.keys())

    if SETTING_CHECKIN_FEE in data:
        try:
            fee = Decimal(str(data[SETTING_CHECKIN_FEE]))
            if fee < 0:
                raise ValueError('checkin_fee cannot be negative.')
        except InvalidOperation:
            raise ValueError(f'Invalid checkin_fee: {data[SETTING_CHECKIN_FEE]!r}')

    for key in allowed_keys:
        if key in data:
            _set(key, str(data[key]).strip())

    return get_all_settings()
