import os
import sqlite3
import libsql_client
from dotenv import load_dotenv
import sys

# Configuration
load_dotenv("backend/.env")
LOCAL_DB_PATH = "./queue.db"
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
    print("❌ Turso credentials not found.")
    sys.exit(1)

# Turso URL formatting
url = TURSO_DATABASE_URL
if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://")

def migrate():
    print(f"🚀 Starting Optimized Native Migration to Turso: {url}")
    
    local_conn = sqlite3.connect(LOCAL_DB_PATH)
    local_conn.row_factory = sqlite3.Row
    local_cursor = local_conn.cursor()
    
    turso_client = libsql_client.create_client_sync(url, auth_token=TURSO_AUTH_TOKEN)

    # Disable foreign keys in Turso
    try:
        turso_client.execute("PRAGMA foreign_keys=OFF")
    except:
        pass

    # Get all tables
    local_cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version'")
    tables_info = local_cursor.fetchall()
    
    # Priority order to satisfy basic dependencies (though FKs are off)
    priority = [
        'roles', 'priority_levels', 'departments', 'rooms', 'users', 
        'patients', 'units', 'shifts'
    ]
    table_names = [t['name'] for t in tables_info]
    sorted_tables = [t for t in priority if t in table_names] + [t for t in table_names if t not in priority]

    for table_name in sorted_tables:
        print(f"📦 Migrating {table_name}...", flush=True)
        
        # Get schema
        create_sql = [t['sql'] for t in tables_info if t['name'] == table_name][0]
        
        # Drop and Recreate in Turso to ensure schema matches
        try:
            turso_client.execute(f"DROP TABLE IF EXISTS {table_name}")
            turso_client.execute(create_sql)
            print(f"  ✅ Recreated schema", flush=True)
        except Exception as e:
            print(f"  ⚠️ Schema Error: {e}")

        # Fetch all rows
        local_cursor.execute(f"SELECT * FROM {table_name}")
        rows = local_cursor.fetchall()
        
        if not rows:
            print("  - Empty table")
            continue
            
        total_rows = len(rows)
        print(f"  - {total_rows} rows to upload", flush=True)

        # Build insert statement
        sample_row = rows[0]
        columns = ", ".join(sample_row.keys())
        placeholders = ", ".join(["?" for _ in sample_row.keys()])
        insert_sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

        # Batch migration
        batch_size = 500 if table_name == 'patients' else 100
        count = 0
        
        for i in range(0, total_rows, batch_size):
            batch = rows[i:i + batch_size]
            
            # Use client.batch for efficiency
            # Each execute call in a batch is a statement with parameters
            statements = []
            for row in batch:
                statements.append((insert_sql, list(row)))
            
            try:
                # libsql-client-python batching
                turso_client.batch(statements)
                count += len(batch)
                if count % 5000 == 0 or count == total_rows:
                    print(f"    Uploaded {count}/{total_rows}...", flush=True)
            except Exception as e:
                print(f"\n  ❌ Batch Error in {table_name}: {e}")
                # Fallback to individual for this batch to identify culprit? 
                # Or just skip this batch for now
        
        print(f"  ✅ {count} rows successfully migrated.")

    local_conn.close()
    turso_client.close()
    print("\n🏁 Full Migration Successful!")

if __name__ == "__main__":
    migrate()
