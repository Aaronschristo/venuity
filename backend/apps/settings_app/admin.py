"""
Admin registration for the settings app.
"""

from django.contrib import admin
from .models import ApplicationSetting


@admin.register(ApplicationSetting)
class ApplicationSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value')
    search_fields = ('key',)
