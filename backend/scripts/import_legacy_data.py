# -*- coding: utf-8 -*-
"""
Data import script for the new backend schema.

Reads the JSON file produced by export_legacy_data.py and imports
customers and transactions into the new Django schema.

Run AFTER:
    1. Running export_legacy_data.py
    2. Deleting db.sqlite3
    3. Running: python manage.py migrate
    4. Running: python manage.py createsuperuser

Usage (from project root):
    .\\venv\\Scripts\\python.exe backend\\scripts\\import_legacy_data.py
"""

import sys
import io
import json
import uuid
import os
import django
from decimal import Decimal
from pathlib import Path
from datetime import datetime, timezone as dt_timezone

# Bootstrap Django
sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from apps.customers.models import Customer
from apps.transactions.models import Transaction
from apps.settings_app.models import ApplicationSetting

DATA_PATH = Path(__file__).parent / 'legacy_data_export.json'

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def run():
    if not DATA_PATH.exists():
        print(f'ERROR: Export file not found at {DATA_PATH}')
        print('Run export_legacy_data.py first.')
        sys.exit(1)

    with open(DATA_PATH) as f:
        data = json.load(f)

    customers_data = data.get('customers', [])
    transactions_data = data.get('transactions', [])
    settings_data = data.get('settings', [])

    print(f'Importing {len(customers_data)} customers...')
    print(f'Importing {len(transactions_data)} transactions...')

    # Map: old_id -> new Customer instance
    customer_map = {}

    with transaction.atomic():
        # Import customers
        for c in customers_data:
            old_id = c['id']  # Was UUID primary key in old schema

            # In the new schema, `qr_id` is the QR code identifier.
            # The old `id` WAS the UUID used in QR codes, so we preserve it.
            qr_uuid = uuid.UUID(str(old_id))

            customer = Customer.objects.create(
                name=c['name'],
                balance=Decimal(str(c.get('balance', '0.00'))),
                qr_id=qr_uuid,
                # created_at is set by default; we override it
            )

            # Preserve the original registration date (make it timezone-aware)
            if c.get('created_at'):
                try:
                    dt_str = c['created_at']
                    # Parse and make timezone-aware
                    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_timezone.utc)
                    Customer.objects.filter(pk=customer.pk).update(created_at=dt)
                except Exception:
                    pass  # Keep default created_at

            customer_map[old_id] = customer.pk
            print(f'  OK Customer: {c["name"]} (qr_id={qr_uuid})')

        # Import transactions
        for tx in transactions_data:
            old_customer_id = tx.get('customer_id')
            if old_customer_id not in customer_map:
                print(f'  ! Skipping transaction — customer {old_customer_id} not found.')
                continue

            customer_pk = customer_map[old_customer_id]

            # Map old type field name
            raw_type = tx.get('type', 'recharge')
            if raw_type == 'recharge':
                tx_type = Transaction.TransactionType.RECHARGE
            elif raw_type == 'checkin':
                tx_type = Transaction.TransactionType.CHECKIN
            else:
                tx_type = Transaction.TransactionType.RECHARGE

            t = Transaction.objects.create(
                customer_id=customer_pk,
                transaction_type=tx_type,
                amount=Decimal(str(tx.get('amount', '0.00'))),
                notes='Imported from legacy database.',
            )

            if tx.get('created_at'):
                try:
                    dt_str = tx['created_at']
                    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_timezone.utc)
                    Transaction.objects.filter(pk=t.pk).update(created_at=dt)
                except Exception:
                    pass

        # Import settings
        for s in settings_data:
            key = s.get('key')
            value = s.get('value', '')
            if key:
                ApplicationSetting.objects.update_or_create(
                    key=key,
                    defaults={'value': value},
                )
                print(f'  OK Setting: {key} = {value}')

    print(f'\nDone! Imported {len(customer_map)} customers.')


if __name__ == '__main__':
    run()
