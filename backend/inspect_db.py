from backend.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
try:
    print("Tables in database:")
    for table_name in inspector.get_table_names():
        print(f" - {table_name}")
        
    if "queue" in inspector.get_table_names():
        print("\nColumns in 'queue' table:")
        for column in inspector.get_columns("queue"):
            print(f" - {column['name']} ({column['type']})")
    else:
        print("\n'queue' table NOT FOUND!")

except Exception as e:
    print(f"Error: {e}")
