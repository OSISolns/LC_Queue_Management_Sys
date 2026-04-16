import asyncio
import sys
import os
import httpx
from bs4 import BeautifulSoup

SUKRAA_BASE = "http://41.173.250.126:8081/UAT"

async def extract_query_fields():
    # Login again with httpx without using sukraa_session just to be 100% sure we capture the cookie.
    client = httpx.AsyncClient(verify=False, follow_redirects=True)
    
    resp = await client.get(f"{SUKRAA_BASE}/forms/fm_login.aspx")
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    payload = {
        "txtUserName": "lc_valery",
        "txtPassword": "Amahamba@2110",
        "butLogin": "Login"
    }
    for field in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
        tag = soup.find("input", attrs={"name": field})
        if tag: payload[field] = tag.get("value", "")
        
    resp = await client.post(f"{SUKRAA_BASE}/forms/fm_login.aspx", data=payload)
    
    # Get Fm_Patient_Query.aspx
    resp = await client.get(f"{SUKRAA_BASE}/forms/Fm_Patient_Query.aspx")
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    for tag in soup.find_all("input"):
        print(f"[{tag.get('type')}] Name: {tag.get('name')} | ID: {tag.get('id')} | Value: {tag.get('value')}")
        
    for tag in soup.find_all("select"):
        print(f"[select] Name: {tag.get('name')} | ID: {tag.get('id')}")

if __name__ == "__main__":
    asyncio.run(extract_query_fields())
