"""
Direct test of password verification with passlib and bcrypt
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test password hashing and verification
password = "admin123"
print(f"Testing password: {password}")

# Hash the password
hashed = pwd_context.hash(password)
print(f"Hashed password: {hashed}")
print(f"Hash type: {type(hashed)}")

# Verify the password
try:
    result = pwd_context.verify(password, hashed)
    print(f"Verification result: {result}")
    
    # Test with the actual hash from database
    db_hash = "$2b$12$rcaCLZ9qCxTEj3TacmbLRKhpKe.7lZ3"  # Truncated from earlier output
    print(f"\nTesting with database hash...")
    print(f"Database hash: {db_hash}")
    
    # This might fail because the hash is truncated, but let's see the error
    try:
        result2 = pwd_context.verify(password, db_hash)
        print(f"Verification result: {result2}")
    except Exception as e:
        print(f"Error verifying with DB hash: {e}")
        
except Exception as e:
    print(f"Error during verification: {e}")
    import traceback
    traceback.print_exc()
