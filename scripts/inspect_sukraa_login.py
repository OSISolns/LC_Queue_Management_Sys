import asyncio
import sys
import os
import httpx
from bs4 import BeautifulSoup

# Ensure we can import backend
sys.path.insert(0, os.path.abspath('.'))
from backend.routers.sukraa import sukraa_session, SUKRAA_BASE, SUKRAA_LOGIN_URL

async def inspect_login_form():
    print(f"Inspecting login form at {SUKRAA_BASE}...")
    try:
        if sukraa_session._client is None:
            sukraa_session._client = await sukraa_session._create_client()
            
        client = sukraa_session._client
        
        # Fetch login page
        resp = await client.get(SUKRAA_LOGIN_URL)
        print(f"GET Login status: {resp.status_code}")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # List all inputs
        print("Inputs found in login form:")
        for input_tag in soup.find_all('input'):
            input_name = input_tag.get('name', 'N/A')
            input_type = input_tag.get('type', 'N/A')
            input_id = input_tag.get('id', 'N/A')
            input_value = input_tag.get('value', '')
            print(f"  Name: {input_name}, Type: {input_type}, Id: {input_id}, Value: {input_value[:30]}...")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_login_form())
