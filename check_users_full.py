import sqlite3
import os

def check_db(db_path):
    print(f"--- Checking {db_path} ---")
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        print(f"Tables: {[t[0] for t in tables]}")
        if any('user' in t[0].lower() for t in tables):
            for t in tables:
                if 'user' in t[0].lower():
                    try:
                        data = cur.execute(f"SELECT * FROM {t[0]}").fetchall()
                        print(f"Data in {t[0]}: {data}")
                    except:
                        pass
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
    conn.close()

check_db('instance/playarea.db')
check_db('backend/db.sqlite3')
