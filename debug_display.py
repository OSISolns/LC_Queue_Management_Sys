import requests
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
        for row in cursor.fetchall():
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
try:
    print("\nChecking API /queue:")
    r = requests.get('http://127.0.0.1:8000/queue')
    print(f"Status: {r.status_code}")
    print(f"Data: {r.json()[:3] if r.status_code == 200 else r.text}")
    
    print("\nChecking API /history?status=calling:")
    r = requests.get('http://127.0.0.1:8000/history?status=calling')
    print(f"Status: {r.status_code}")
    print(f"Data: {r.json()[:3] if r.status_code == 200 else r.text}")

except Exception as e:
    print(f"API Error: {e}")
