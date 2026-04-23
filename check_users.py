import sqlite3
import os

db_path = 'backend/db.sqlite3'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        users = cur.execute('SELECT username, is_superuser FROM auth_user').fetchall()
        print(f"Users found: {users}")
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
    conn.close()
