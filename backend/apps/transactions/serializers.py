"""
Serializers for the transactions app.
"""

from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    """
    Full read serializer for a transaction.

    Includes denormalized customer_name for display in the frontend
    without requiring a separate customer fetch.
    """

    # Denormalized read-only field — avoids N+1 in list views when
    # combined with select_related('customer') in the queryset.
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_id = serializers.UUIDField(source='customer.public_id', read_only=True)

    # Expose the TextChoices value (e.g., 'recharge') not the label ('Recharge')
    type = serializers.CharField(source='transaction_type', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'customer_id',
            'customer_name',
            'type',
            'amount',
            'notes',
            'created_at',
        ]
        read_only_fields = fields


class DashboardStatsSerializer(serializers.Serializer):
    """
    Shape of the /api/v1/transactions/stats/ response.
    Used for documentation — not for DB serialization.
    """

    total_customers = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    recent_transactions = TransactionSerializer(many=True)
