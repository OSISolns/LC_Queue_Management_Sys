import os
import libsql_client
from dotenv import load_dotenv
from backend.auth_utils import get_password_hash

load_dotenv("backend/.env")

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
    print("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not found in environment.")
    exit(1)

# Ensure URL is in https format for the client if it's libsql://
url = TURSO_DATABASE_URL
if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://")

def seed():
    print(f"🚀 Seeding Turso via Native Client: {url}")
    client = libsql_client.create_client_sync(url, auth_token=TURSO_AUTH_TOKEN)

    try:
        # Create tables (Extracted from models)
        print("🌱 Creating tables...")
        
        # We can't easily generate ALL tables without SQLAlchemy, 
        # but we can run the core ones needed for the app to start.
        
        statements = [
            "CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT, category TEXT)",
            "CREATE TABLE IF NOT EXISTS priority_levels (id INTEGER PRIMARY KEY, name TEXT, weight INTEGER)",
            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, hashed_password TEXT, full_name TEXT, role_id INTEGER, is_active BOOLEAN, is_available BOOLEAN, created_at DATETIME, updated_at DATETIME, last_login DATETIME, salutation TEXT, email TEXT, phone_number TEXT, department_id INTEGER, room_number TEXT)",
            "CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY, name TEXT)",
            "CREATE TABLE IF NOT EXISTS queues (id INTEGER PRIMARY KEY AUTOINCREMENT, token_number TEXT, patient_name TEXT, status TEXT, priority_id INTEGER, target_dept_id INTEGER, created_at DATETIME)",
            # Add others as needed, but let's stick to core for now to verify connection
        ]
        
        for stmt in statements:
            client.execute(stmt)

        print("✅ Core tables created.")

        # Seed data
        print("🌱 Seeding Roles...")
        roles = [
            (1, "Admin", "Admin"),
            (2, "Doctor", "Doctor"),
            (3, "Helpdesk", "Helpdesk"),
            (100, "Quality", "Quality")
        ]
        for r in roles:
            client.execute("INSERT OR IGNORE INTO roles (id, name, category) VALUES (?, ?, ?)", r)

        print("🌱 Seeding Priorities...")
        priorities = [
            (1, "Emergency", 0),
            (2, "VIP", 1),
            (3, "Standard", 2)
        ]
        for p in priorities:
            client.execute("INSERT OR IGNORE INTO priority_levels (id, name, weight) VALUES (?, ?, ?)", p)

        print("🌱 Seeding Admin...")
        admin_pass = get_password_hash("admin123")
        client.execute(
            "INSERT OR IGNORE INTO users (username, hashed_password, role_id, is_active, full_name) VALUES (?, ?, ?, ?, ?)",
            ("admin", admin_pass, 1, True, "System Administrator")
        )

        print("✅ Native seeding complete!")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    seed()
