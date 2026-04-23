"""
Admin registration for the customers app.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'balance', 'public_id', 'qr_id', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'public_id', 'qr_id')
    readonly_fields = ('public_id', 'qr_id', 'created_at')
    ordering = ('-created_at',)

    fieldsets = (
        (_('Customer Info'), {'fields': ('name', 'balance')}),
        (_('Identifiers'), {'fields': ('public_id', 'qr_id')}),
        (_('Timestamps'), {'fields': ('created_at',)}),
    )
