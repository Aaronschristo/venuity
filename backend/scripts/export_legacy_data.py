"""
Data preservation script for the backend migration.

This script reads all customer and transaction data from the OLD db.sqlite3
(using the original schema) and saves it to a JSON file.
Run this BEFORE deleting the old database.

Usage:
    python backend/scripts/export_legacy_data.py
"""

import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / 'db.sqlite3'
OUTPUT_PATH = Path(__file__).parent / 'legacy_data_export.json'


def export():
    if not DB_PATH.exists():
        print(f'ERROR: Database not found at {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Export customers
    customers = []
    try:
        cur.execute('SELECT * FROM core_customer')
        for row in cur.fetchall():
            customers.append(dict(row))
    except Exception as e:
        print(f'WARNING: Could not read core_customer: {e}')

    # Export transactions
    transactions = []
    try:
        cur.execute('SELECT * FROM core_transaction')
        for row in cur.fetchall():
            transactions.append(dict(row))
    except Exception as e:
        print(f'WARNING: Could not read core_transaction: {e}')

    # Export settings
    settings_data = []
    try:
        cur.execute('SELECT * FROM core_setting')
        for row in cur.fetchall():
            settings_data.append(dict(row))
    except Exception as e:
        print(f'WARNING: Could not read core_setting: {e}')

    conn.close()

    output = {
        'exported_at': datetime.now().isoformat(),
        'customers': customers,
        'transactions': transactions,
        'settings': settings_data,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    print(f'Exported {len(customers)} customers, {len(transactions)} transactions.')
    print(f'Saved to: {OUTPUT_PATH}')


if __name__ == '__main__':
    export()
