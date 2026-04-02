import httpx
import asyncio
from bs4 import BeautifulSoup
try:
    import models
    from database import SessionLocal
except ImportError:
    from . import models
    from .database import SessionLocal
from datetime import datetime
import os

HIMS_BASE = "http://41.173.250.126:8081/UAT"
LOGIN_URL = f"{HIMS_BASE}/forms/fm_login.aspx"
QUERY_URL = f"{HIMS_BASE}/forms/fm_Patient_Query.aspx"

async def sync_patients():
    print(f"Starting sync from Sukraa HIMS: {HIMS_BASE}")
    async with httpx.AsyncClient(timeout=300.0, verify=False, follow_redirects=True) as client:

        try:
            # 1. Step 1: GET login page to extract hidden fields
            resp = await client.get(LOGIN_URL)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            def extract_hidden_fields(s):
                fields = {}
                for field in ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION']:
                    input_tag = s.find('input', dict(name=field))
                    if input_tag:
                        fields[field] = input_tag['value']
                return fields

            hidden_fields = extract_hidden_fields(soup)
            print(f"Extracted fields: {list(hidden_fields.keys())}")

            # 2. Step 2: POST login credentials + hidden fields
            login_data = {
                **hidden_fields,
                "txtUserName": "lc_valery",
                "txtPassword": "Amahamba@2",
                "butLogin": "Login"
            }




            resp = await client.post(LOGIN_URL, data=login_data)
            
            # Check if login worked - look for signs of being logged in
            if "Logout" not in resp.text and "fm_login.aspx" in str(resp.url):
                print(f"Login failed - status: {resp.status_code}")
                print(f"Current URL: {resp.url}")
                # print(f"Response snippet: {resp.text[:500]}")
                return


            print("Successfully authenticated with Sukraa HIMS")

            # 3. Step 3: Access protected page (Query Page)
            # First GET the query page to get its specific ViewState
            resp = await client.get(QUERY_URL)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Extract ALL form fields to be safe
            all_inputs = {}
            for inp in soup.find_all(['input', 'select']):
                name = inp.get('name')
                if not name: continue
                
                if inp.name == 'select':
                    # Get first option or selected one
                    opt = inp.find('option', selected=True) or inp.find('option')
                    value = opt.get('value', '') if opt else ''
                else:
                    value = inp.get('value', '')
                
                all_inputs[name] = value

            # Override/Set specific search parameters
            query_data = {
                **all_inputs,
                "ctl00$Main_Content$txtFromDate": "01/01/2020",
                "ctl00$Main_Content$txtToDate": datetime.now().strftime("%d/%m/%Y"),
                "ctl00$Main_Content$butView": "View",
                "ctl00$Main_Content$butView.x": "10",
                "ctl00$Main_Content$butView.y": "10"
            }


            # Trigger the query as a standard POST
            print("Fetching patient data (broad search, full HTML)...")
            resp = await client.post(QUERY_URL, data=query_data, timeout=300.0)



            
            # 4. Parse the resulting patient table
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Debug: List all tables found
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables in response.")
            for t in tables:
                if t.get('id'): print(f"Table ID: {t.get('id')}")

            table = soup.find('table', id='ctl00_Main_Content_grdPatientQuery')
            
            if not table:
                print("Data grid table not found on query page results.")
                # print(f"First 1000 chars of body: {str(soup.body)[:1000]}")
                return


            rows = table.find_all('tr')
            # Identify data rows (usually skip header)
            data_rows = []
            for row in rows:
                if row.find('td') and "HIS No" not in row.text:
                    data_rows.append(row)

            print(f"Found {len(data_rows)} patients in query results.")
            
            db = SessionLocal()
            count = 0
            processed_mrns = set()
            for row in data_rows:
                cols = row.find_all('td')
                if len(cols) < 6: continue # HIS No, Name, InvNo, InvDate, Age/Sex, Mobile
                
                mrn = cols[0].get_text(strip=True)
                fullname = cols[1].get_text(strip=True)
                
                if not mrn or mrn == "HIS No" or mrn in processed_mrns: continue
                processed_mrns.add(mrn)

                # Clean name: remove prefix
                clean_name = fullname
                for prefix in ["Mr. ", "Mrs. ", "Ms. ", "Miss. ", "Dr. ", "Baby of "]:
                    if clean_name.startswith(prefix):
                        clean_name = clean_name[len(prefix):]
                        break
                
                parts = clean_name.split(' ', 1)
                first_name = parts[0][:100]
                last_name = parts[1][:100] if len(parts) > 1 else ""
                
                age_sex = cols[4].get_text(strip=True) # Index 4: Age/Sex
                gender = "Male" if "/ M" in age_sex or " M" in age_sex else "Female" if "/ F" in age_sex or " F" in age_sex else "Other"
                
                phone = cols[5].get_text(strip=True) # Index 5: Mobile No
                
                # Database Upsert
                patient = db.query(models.Patient).filter(models.Patient.mrn == mrn).first()
                if not patient:
                    patient = models.Patient(
                        mrn=mrn,
                        first_name=first_name,
                        last_name=last_name,
                        gender=gender,
                        phone_number=phone[:20] if phone else None
                    )
                    db.add(patient)
                else:
                    patient.first_name = first_name
                    patient.last_name = last_name
                    patient.gender = gender
                    patient.phone_number = phone[:20] if phone else None
                
                count += 1
            
            db.commit()

            db.close()
            print(f"Successfully synchronized {count} patients into local registry.")


        except Exception as e:
            print(f"Critical sync failure: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(sync_patients())

