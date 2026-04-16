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




            # Add headers to mimic a real browser
            client.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Referer": LOGIN_URL
            })

            resp = await client.post(LOGIN_URL, data=login_data)
            
            # Check if login worked - look for signs of being logged in
            if "Logout" not in resp.text and "fm_login.aspx" in str(resp.url):
                print(f"Login failed - status: {resp.status_code}")
                # print(f"Current URL: {resp.url}")
                with open("login_fail.html", "w") as f:
                    f.write(resp.text)
                print("Saved failure page to login_fail.html")
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
            from datetime import timedelta
            
            start_date = datetime(2024, 1, 1)
            end_date = datetime.now()
            
            chunk_size = timedelta(days=60)
            current_start = start_date
            
            db = SessionLocal()
            total_count = 0
            processed_mrns = set()

            while current_start <= end_date:
                current_end = current_start + chunk_size
                if current_end > end_date:
                    current_end = end_date
                    
                str_from = current_start.strftime("%d/%m/%Y")
                str_to = current_end.strftime("%d/%m/%Y")
                
                print(f"Fetching patient data from {str_from} to {str_to}...")
                
                query_data = {
                    **all_inputs,
                    "ctl00$Main_Content$txtFromDate": str_from,
                    "ctl00$Main_Content$txtToDate": str_to,
                    "ctl00$Main_Content$butView": "View",
                    "ctl00$Main_Content$butView.x": "10",
                    "ctl00$Main_Content$butView.y": "10"
                }

                resp = await client.post(QUERY_URL, data=query_data, timeout=300.0)
                soup = BeautifulSoup(resp.text, 'html.parser')

                table = soup.find('table', id='ctl00_Main_Content_grdPatientQuery')
                if table:
                    rows = table.find_all('tr')
                    data_rows = [row for row in rows if row.find('td') and "HIS No" not in row.text]
                    
                    count = 0
                    for row in data_rows:
                        cols = row.find_all('td')
                        if len(cols) < 6: continue
                        
                        mrn = cols[0].get_text(strip=True)
                        fullname = cols[1].get_text(strip=True)
                        if not mrn or mrn == "HIS No" or mrn in processed_mrns: continue
                        processed_mrns.add(mrn)

                        clean_name = fullname
                        for prefix in ["Mr. ", "Mrs. ", "Ms. ", "Miss. ", "Dr. ", "Baby of "]:
                            if clean_name.startswith(prefix):
                                clean_name = clean_name[len(prefix):]
                                break
                        
                        parts = clean_name.split(' ', 1)
                        first_name = parts[0][:100]
                        last_name = parts[1][:100] if len(parts) > 1 else ""
                        
                        age_sex = cols[4].get_text(strip=True)
                        import re
                        age_match = re.search(r'(\d+)\s*[Yy]', age_sex)
                        estimated_dob = None
                        if age_match:
                            try:
                                age_yrs = int(age_match.group(1))
                                # Estimates DOB to January 1st of the calculated birth year
                                estimated_dob = datetime(datetime.now().year - age_yrs, 1, 1).date()
                            except: pass

                        gender = "Male" if "/ M" in age_sex or " M" in age_sex else "Female" if "/ F" in age_sex or " F" in age_sex else "Other"
                        phone = cols[5].get_text(strip=True)
                        
                        # Extra data from the Sukraa Patient Query screenshot
                        ref_type = cols[6].get_text(strip=True) if len(cols) > 6 else ""
                        referrer = cols[7].get_text(strip=True) if len(cols) > 7 else ""
                        insurance = referrer if ref_type.lower() == "insurance" else None
                        
                        patient = db.query(models.Patient).filter(models.Patient.mrn == mrn).first()
                        if not patient:
                            patient = models.Patient(
                                mrn=mrn,
                                first_name=first_name,
                                last_name=last_name,
                                gender=gender,
                                date_of_birth=estimated_dob,
                                phone_number=phone[:20] if phone else None,
                                insurance=insurance
                            )
                            db.add(patient)
                        else:
                            patient.first_name = first_name
                            patient.last_name = last_name
                            patient.gender = gender
                            if estimated_dob:
                                patient.date_of_birth = estimated_dob
                            patient.phone_number = phone[:20] if phone else None
                            if insurance:
                                patient.insurance = insurance
                        count += 1
                        total_count += 1
                    
                    db.commit()
                    print(f"Processed {count} unique patients in this chunk.")
                else:
                    print("Data grid table not found on query page results.")
                
                current_start = current_end + timedelta(days=1)
                
            db.close()
            print(f"Successfully synchronized {total_count} patients into local registry.")


        except Exception as e:
            print(f"Critical sync failure: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(sync_patients())

