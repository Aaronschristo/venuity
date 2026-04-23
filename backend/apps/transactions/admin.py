"""
Admin registration for the transactions app.
"""

from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'transaction_type', 'amount', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('customer__name',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
