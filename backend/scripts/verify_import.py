import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, 'backend')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()

from apps.customers.models import Customer
from apps.transactions.models import Transaction
from apps.settings_app.models import ApplicationSetting

print(f'Customers:    {Customer.objects.count()}')
print(f'Transactions: {Transaction.objects.count()}')
print('Settings:')
for s in ApplicationSetting.objects.all():
    print(f'  {s.key} = {s.value}')

# Verify IDs are separate
c = Customer.objects.first()
print(f'\nSample customer:')
print(f'  DB id (int):  {c.id}')
print(f'  public_id:    {c.public_id}')
print(f'  qr_id:        {c.qr_id}')
print(f'  balance:      {c.balance}')
