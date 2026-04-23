"""
Serializers for the settings app.
"""

from rest_framework import serializers


class ApplicationSettingsSerializer(serializers.Serializer):
    """
    Serializer for reading and writing application settings.
    All fields are optional on write (partial updates allowed).
    """

    business_name = serializers.CharField(
        max_length=150,
        required=False,
        trim_whitespace=True,
    )
    currency_symbol = serializers.CharField(
        max_length=10,
        required=False,
        trim_whitespace=True,
    )
    checkin_fee = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        min_value=0,
        required=False,
    )
