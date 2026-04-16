import asyncio
import sys
import os
import httpx
from bs4 import BeautifulSoup

# Ensure we can import backend
sys.path.insert(0, os.path.abspath('.'))
from backend.routers.sukraa import sukraa_session, SUKRAA_BASE, SUKRAA_LOGIN_URL

async def debug_login():
    print(f"Connecting to Sukraa at {SUKRAA_BASE}...")
    try:
        # We need to initialize the client
        if sukraa_session._client is None:
            sukraa_session._client = await sukraa_session._create_client()
            
        client = sukraa_session._client
        
        # Step 1: Fetch login page
        resp = await client.get(SUKRAA_LOGIN_URL)
        print(f"GET Login status: {resp.status_code}")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        hidden_fields = {}
        for field in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
            tag = soup.find("input", attrs={"name": field})
            if tag:
                hidden_fields[field] = tag.get("value", "")
        
        print(f"Hidden fields: {list(hidden_fields.keys())}")
        
        # Step 2: POST login
        from backend.routers.sukraa import SUKRAA_USER, SUKRAA_PASS
        login_payload = {
            **hidden_fields,
            "txtUserName": SUKRAA_USER,
            "txtPassword": SUKRAA_PASS,
            "butLogin": "Login",
        }
        resp = await client.post(SUKRAA_LOGIN_URL, data=login_payload, follow_redirects=True)
        print(f"POST Login status: {resp.status_code}, URL: {resp.url}")
        
        # Check title
        soup = BeautifulSoup(resp.text, 'html.parser')
        title_tag = soup.find('title')
        title_str = title_tag.get_text().strip() if title_tag else 'No Title'
        print(f"New page Title: {title_str}")
        
        # Check if login was successful
        if "Main.aspx" in str(resp.url) or "Logout" in resp.text:
            print("Login successful (found Main.aspx or Logout in text)")
        else:
            print("Login failed (no redirect or Logout string found)")
            
        # Check cookies
        print("Cookies in jar:")
        for cookie in client.cookies.jar:
            print(f"  {cookie.name}={cookie.value}")
            
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_login())
