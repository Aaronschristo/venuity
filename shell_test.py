from apps.analytics import services
from datetime import date
try:
    print(services.get_hourly_analytics(date.today(), 'revenue'))
except Exception as e:
    import traceback
    traceback.print_exc()
