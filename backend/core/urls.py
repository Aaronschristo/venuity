from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, TransactionViewSet, SettingViewSet, ExportAPIView, AnalyticsAPIView

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'settings', SettingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('export/<str:format_type>/', ExportAPIView.as_view(), name='export'),
    path('analytics/', AnalyticsAPIView.as_view(), name='analytics'),
]
