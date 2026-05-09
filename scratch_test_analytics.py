import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.analytics import services

try:
    print("Testing get_hourly_analytics...")
    res = services.get_hourly_analytics(date.today(), 'revenue')
    print("Hourly Result Keys:", res.keys())
    print("Hourly Result Labels:", res['labels'][:5])
    
    print("\nTesting get_weekly_analytics...")
    res = services.get_weekly_analytics(date.today(), 'revenue')
    print("Weekly Result Keys:", res.keys())
    
    print("\nTesting get_monthly_analytics...")
    res = services.get_monthly_analytics(date.today(), 'revenue')
    print("Monthly Result Keys:", res.keys())
    
except Exception as e:
    import traceback
    traceback.print_exc()
