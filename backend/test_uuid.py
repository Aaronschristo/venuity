import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Customer
import uuid

# Create a test customer
uid = uuid.uuid4()
print("Python UUID:", uid)
c = Customer.objects.create(id=uid, name="Test")
print("Django Customer ID:", c.id)

# Fetch it using sqlite3 to see how it's stored
import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
row = cur.execute("SELECT id FROM core_customer WHERE name='Test'").fetchone()
print("Stored in SQLite as:", row[0])

# Clean up
c.delete()
