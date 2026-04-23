import sqlite3
import os

def migrate_data():
    old_db_path = os.path.join('instance', 'playarea.db')
    new_db_path = os.path.join('backend', 'db.sqlite3')

    if not os.path.exists(old_db_path):
        print(f"Old database not found at {old_db_path}")
        return
    
    if not os.path.exists(new_db_path):
        print(f"New database not found at {new_db_path}")
        return

    old_conn = sqlite3.connect(old_db_path)
    new_conn = sqlite3.connect(new_db_path)

    old_cur = old_conn.cursor()
    new_cur = new_conn.cursor()

    try:
        # Migrate Settings
        print("Migrating settings...")
        settings = old_cur.execute("SELECT key, value FROM setting").fetchall()
        for key, value in settings:
            # check if exists
            exists = new_cur.execute("SELECT 1 FROM core_setting WHERE key=?", (key,)).fetchone()
            if not exists:
                new_cur.execute("INSERT INTO core_setting (key, value) VALUES (?, ?)", (key, value))
            else:
                new_cur.execute("UPDATE core_setting SET value=? WHERE key=?", (value, key))
        
        # Migrate Customers
        print("Migrating customers...")
        customers = old_cur.execute("SELECT id, name, balance, created_at FROM customer").fetchall()
        for cid, name, balance, created_at in customers:
            # Remove hyphens for Django UUIDField
            new_cid = cid.replace('-', '')
            
            exists = new_cur.execute("SELECT 1 FROM core_customer WHERE id=?", (new_cid,)).fetchone()
            if not exists:
                new_cur.execute(
                    "INSERT INTO core_customer (id, name, balance, created_at) VALUES (?, ?, ?, ?)",
                    (new_cid, name, balance, created_at)
                )

        # Migrate Transactions
        print("Migrating transactions...")
        transactions = old_cur.execute("SELECT id, customer_id, amount, type, created_at FROM 'transaction'").fetchall()
        for tid, cid, amount, tx_type, created_at in transactions:
            new_cid = cid.replace('-', '')
            
            exists = new_cur.execute("SELECT 1 FROM core_transaction WHERE id=?", (tid,)).fetchone()
            if not exists:
                new_cur.execute(
                    "INSERT INTO core_transaction (id, customer_id, amount, type, created_at) VALUES (?, ?, ?, ?, ?)",
                    (tid, new_cid, amount, tx_type, created_at)
                )

        new_conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        new_conn.rollback()
        print(f"Error during migration: {e}")
    finally:
        old_conn.close()
        new_conn.close()

if __name__ == '__main__':
    migrate_data()
