import asyncio
import sys
import logging
import httpx
from bs4 import BeautifulSoup
import os

# Ensure we can import backend
sys.path.insert(0, os.path.abspath('.'))
from backend.routers.sukraa import sukraa_session, SUKRAA_BASE

async def main():
    print(f"Connecting to Sukraa at {SUKRAA_BASE}...")
    try:
        ok = await sukraa_session.authenticate()
        if not ok:
            print("Authentication failed.")
            return
    except Exception as e:
        print(f"Authentication exception: {e}")
        return
    
    print("Authentication successful.")
    
    # List of pages to check
    pages = [
        "forms/Fm_Patient_Query.aspx",
        "forms/Fm_Patient_Regn.aspx",
        "forms/Fm_Patient_Registration.aspx",
        "forms/fm_Patient_Regn.aspx",
        "forms/Main.aspx"
    ]
    
    for page in pages:
        url = f"{SUKRAA_BASE}/{page}"
        try:
            resp = await sukraa_session._client.get(url, timeout=10.0)
            print(f"Page: {page} -> Status: {resp.status_code}")
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                title = soup.find('title')
                title_text = title.get_text().strip() if title else "No Title"
                print(f"  Title: {title_text}")
                
                # If it's the query page, let's look for the HIS No field
                if "Query" in page:
                    for input_tag in soup.find_all('input'):
                        if input_tag.get('type') == 'text' or input_tag.get('id', '').startswith('txt'):
                            print(f"  Input: id={input_tag.get('id')} name={input_tag.get('name')}")
        except Exception as e:
            print(f"  Error fetching {page}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
