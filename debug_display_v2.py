import urllib.request
import json
import sqlite3
import os

# Check DB
db_path = 'queue.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT status, count(*) FROM queue GROUP BY status")
        print("Database Queue Summary:")
        rows = cursor.fetchall()
        if not rows:
            print("  (Table is empty)")
        for row in rows:
            print(f"  {row[0]}: {row[1]}")
            
        cursor.execute("SELECT * FROM queue LIMIT 5")
        print("\nFirst 5 patients:")
        rows = cursor.fetchall()
        for r in rows:
            print(r)
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        conn.close()
else:
    print("queue.db not found!")

# Check API
def check_url(url):
    print(f"\nChecking API {url}:")
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Status: {response.getcode()}")
            data = json.loads(response.read().decode())
            print(f"Data: {data[:3]}") # Show first 3 items
    except Exception as e:
        print(f"API Error: {e}")

check_url('http://127.0.0.1:8000/queue')
check_url('http://127.0.0.1:8000/history?status=calling')
