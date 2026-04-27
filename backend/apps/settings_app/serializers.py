"""
Serializers for the settings app.
"""

from rest_framework import serializers


class ApplicationSettingsSerializer(serializers.Serializer):
    """
    Serializer for reading and writing application settings.
    All fields are optional on write (partial updates allowed).
    """

    # Business settings
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

    # White-label / Branding settings
    primary_color = serializers.CharField(
        max_length=20,
        required=False,
        trim_whitespace=True,
        help_text='CSS color value for the primary brand color (e.g., #6366f1).',
    )
    primary_hover_color = serializers.CharField(
        max_length=20,
        required=False,
        trim_whitespace=True,
        help_text='CSS color value for the primary hover state.',
    )
    logo_url = serializers.CharField(
        max_length=500,
        required=False,
        trim_whitespace=True,
        help_text='URL path or full URL to the business logo image.',
    )
    app_title = serializers.CharField(
        max_length=100,
        required=False,
        trim_whitespace=True,
        help_text='Application title shown in browser tab and login screen.',
    )
