from django.db import models
from django.utils import timezone
import uuid

class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    balance = models.FloatField(default=0.0)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    def __str__(self):
        return self.name

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('recharge', 'Recharge'),
        ('checkin', 'Checkin'),
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='transactions')
    amount = models.FloatField()
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['type', 'created_at'], name='ix_tx_type_created'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} - {self.amount} for {self.customer.name}"

class Setting(models.Model):
    key = models.CharField(max_length=50, primary_key=True)
    value = models.CharField(max_length=255)

    def __str__(self):
        return self.key
