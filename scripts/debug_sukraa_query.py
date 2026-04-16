import asyncio
import sys
import os
import httpx
from bs4 import BeautifulSoup

# Fix IP
SUKRAA_BASE = "http://41.173.250.126:8081/UAT"
SUKRAA_LOGIN_URL = f"{SUKRAA_BASE}/forms/fm_login.aspx"

sys.path.insert(0, os.path.abspath('.'))
from backend.routers.sukraa import SUKRAA_USER, SUKRAA_PASS, sukraa_session

async def debug_query():
    client = await sukraa_session._create_client()
    
    # 1. Login
    resp = await client.get(SUKRAA_LOGIN_URL)
    soup = BeautifulSoup(resp.text, "html.parser")
    hidden_fields = {
        f: (soup.find("input", attrs={"name": f}) or {}).get("value", "") 
        for f in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]
    }
    
    print(f"Logging into {SUKRAA_BASE}...")
    login_payload = {**hidden_fields, "txtUserName": SUKRAA_USER, "txtPassword": SUKRAA_PASS, "butLogin": "Login"}
    resp = await client.post(SUKRAA_LOGIN_URL, data=login_payload, follow_redirects=True)
    
    # 2. Check if login was successful
    title = BeautifulSoup(resp.text, 'html.parser').find('title')
    print(f"Post-Login Title: {title.get_text().strip() if title else 'None'}")
    
    if "Main.aspx" in str(resp.url) or "Logout" in resp.text:
        print("Login SUCCESSFUL!")
    else:
        print("Login FAILED. Error on page:")
        soup = BeautifulSoup(resp.text, "html.parser")
        # Find warning labels
        for lbl in soup.find_all("span"):
            if lbl.get("id") and "msg" in lbl.get("id").lower():
                print(f"MSG: {lbl.text.strip()}")
        # Also print the whole response
        with open("/tmp/login_fail.html", "w") as f:
            f.write(resp.text)
        print("Wrote response to /tmp/login_fail.html")
        return

    # 3. Hit Fm_Patient_Query.aspx
    query_url = f"{SUKRAA_BASE}/forms/Fm_Patient_Query.aspx"
    print(f"Fetching {query_url}...")
    resp = await client.get(query_url)
    
    soup = BeautifulSoup(resp.text, "html.parser")
    # Finding forms
    print("Testing Patient Query Search...")
    hidden_fields = {
        f: (soup.find("input", attrs={"name": f}) or {}).get("value", "") 
        for f in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]
    }
    
    for tag in soup.find_all(["input", "select"]):
        if 'txt' in tag.get('id', '').lower() or 'btn' in tag.get('id', '').lower():
            print(f"Input: name={tag.get('name')}, id={tag.get('id')}, type={tag.get('type')}, value={tag.get('value', '')}")

if __name__ == "__main__":
    asyncio.run(debug_query())
