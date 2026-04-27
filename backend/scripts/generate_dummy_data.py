import os
import sys
import uuid
import random
from datetime import timedelta
from decimal import Decimal

# Set up Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.utils import timezone
from apps.customers.models import Customer
from apps.transactions.models import Transaction

def run():
    print("Starting generation...")
    days_back = 3 * 365 # 1095 days
    now = timezone.now()

    first_names = ["John", "Jane", "Alex", "Emily", "Michael", "Sarah", "Chris", "Jessica", "David", "Ashley", "Aaron", "Adithya", "Hishal", "Manu", "Sarang", "Kevin", "Gautham", "Danjith"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Christo", "D S", "Mehta", "Sharma", "Nair", "Iyer", "Patel"]

    print("Generating Customers...")
    customers_to_create = []
    for day in range(days_back, -1, -1):
        target_date = now - timedelta(days=day)
        for _ in range(199):
            name = f"{random.choice(first_names)} {random.choice(last_names)} {random.randint(1, 9999)}"
            customers_to_create.append(Customer(
                name=name,
                balance=Decimal(random.randint(100, 5000)),
                created_at=target_date,
                qr_id=uuid.uuid4(),
                public_id=uuid.uuid4()
            ))

        if len(customers_to_create) >= 10000:
            Customer.objects.bulk_create(customers_to_create, batch_size=2000)
            print(f"Inserted 10000 customers. Last date: {target_date.date()}")
            customers_to_create = []

    if customers_to_create:
        Customer.objects.bulk_create(customers_to_create, batch_size=2000)

    print("Fetching all customer IDs...")
    customer_ids = list(Customer.objects.values_list('id', flat=True))
    if not customer_ids:
        print("No customers found?!")
        return

    print("Generating Transactions...")
    transactions_to_create = []
    
    # 399 per day
    for day in range(days_back, -1, -1):
        target_date = now - timedelta(days=day)
        for _ in range(399):
            t_type = random.choice([Transaction.TransactionType.RECHARGE, Transaction.TransactionType.CHECKIN])
            amount = Decimal(random.randint(10, 500)) if t_type == Transaction.TransactionType.RECHARGE else Decimal('-100.00')
            transactions_to_create.append(Transaction(
                customer_id=random.choice(customer_ids),
                transaction_type=t_type,
                amount=amount,
                created_at=target_date
            ))
            
        if len(transactions_to_create) >= 20000:
            Transaction.objects.bulk_create(transactions_to_create, batch_size=2000)
            print(f"Inserted 20000 transactions. Last date: {target_date.date()}")
            transactions_to_create = []

    if transactions_to_create:
        Transaction.objects.bulk_create(transactions_to_create, batch_size=2000)

    print("Done!")

if __name__ == '__main__':
    run()
