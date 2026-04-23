"""
Root URL configuration for the Venuity backend.

All API routes are versioned under /api/v1/.
This makes future non-breaking v2 endpoints trivial to add.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include('config.api_router')),

    # Media files (development only — use a CDN/nginx in production)
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]
