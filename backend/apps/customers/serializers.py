"""
Serializers for the customers app.

Serializer design rules:
    - `public_id` is always used as the external identifier (never expose `id`).
    - Write serializers are separate from read serializers when field sets differ.
    - Validation logic that doesn't require DB access belongs in the serializer.
    - Business logic (balance deduction, QR generation) belongs in services.py.
"""

from decimal import Decimal
from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    """
    Full read serializer for a customer.

    Used in list and detail views. Exposes public_id as the primary identifier.
    """

    class Meta:
        model = Customer
        fields = [
            'public_id',
            'name',
            'balance',
            'qr_id',
            'created_at',
        ]
        read_only_fields = fields


class CustomerCreateSerializer(serializers.Serializer):
    """
    Write serializer for creating a new customer.

    Separate from the model serializer so we can accept `initial_balance`
    (a transient field, not a model field) and `qr_id` (optional pre-printed UUID).
    """

    name = serializers.CharField(max_length=150, trim_whitespace=True)
    initial_balance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        min_value=Decimal('0.00'),
    )
    qr_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class CustomerLookupSerializer(serializers.Serializer):
    """
    For endpoints that look up a customer by QR scan.
    Accepts either public_id or qr_id.
    """

    public_id = serializers.UUIDField(required=False)
    qr_id = serializers.UUIDField(required=False)

    def validate(self, data):
        if not data.get('public_id') and not data.get('qr_id'):
            raise serializers.ValidationError(
                'Either public_id or qr_id must be provided.'
            )
        return data


class RechargeSerializer(serializers.Serializer):
    """
    Input serializer for the recharge endpoint.
    """

    customer_id = serializers.UUIDField(
        help_text='The customer\'s public_id (UUID from the API).',
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
        help_text='Amount to add to the customer\'s balance.',
    )


class CheckinSerializer(serializers.Serializer):
    """
    Input serializer for the check-in endpoint.

    Accepts either public_id (for manual entry) or qr_id (from scanner).
    """

    customer_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text='The customer\'s public_id. Use this for manual check-in.',
    )
    qr_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text='The UUID from the scanned QR code.',
    )

    def validate(self, data):
        if not data.get('customer_id') and not data.get('qr_id'):
            raise serializers.ValidationError(
                'Either customer_id or qr_id must be provided.'
            )
        return data
