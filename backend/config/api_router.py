"""
Central API router for /api/v1/.

Register all app-level URL includes here. This gives a single place to
audit every route in the system and enforce versioning discipline.
"""

from django.urls import path, include

urlpatterns = [
    # Authentication (JWT obtain/refresh/blacklist)
    path('auth/', include('apps.users.urls')),

    # Business domain
    path('customers/', include('apps.customers.urls')),
    path('transactions/', include('apps.transactions.urls')),
    path('settings/', include('apps.settings_app.urls')),
    path('analytics/', include('apps.analytics.urls')),
]
