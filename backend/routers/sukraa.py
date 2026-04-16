"""
Sukraa HMS Integration Router
Proxies requests to Sukraa's ASMX web services, managing session lifecycle.
"""
__author__ = "Valery Structure"
import httpx
import asyncio
import logging
import json as json_lib
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from bs4 import BeautifulSoup
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import threading
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sukraa", tags=["Sukraa HMS"])

# ─────────────────────────────────────────────────────────────
# Sukraa Config
# ─────────────────────────────────────────────────────────────
SUKRAA_BASE = "http://41.173.250.126:8081/UAT"
SUKRAA_LOGIN_URL = f"{SUKRAA_BASE}/forms/fm_login.aspx"
SUKRAA_ASMX_URL = f"{SUKRAA_BASE}/forms/Autocompleted.asmx"

# Credentials loaded from environment — never hardcoded
SUKRAA_USER = os.getenv("SUKRAA_USER", "lc_valery")
SUKRAA_PASS = os.getenv("SUKRAA_PASS", "")
if not SUKRAA_PASS:
    logger.warning("SUKRAA_PASS is not set in environment. Sukraa HMS authentication will fail.")

# ─────────────────────────────────────────────────────────────
# Session Manager (in-memory singleton)
# ─────────────────────────────────────────────────────────────
class SukraaSession:
    """Manages a reusable, auto-refreshing session with Sukraa HMS."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._session_id: Optional[str] = None
        self._last_auth: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self.SESSION_TTL_MINUTES = 25  # Refresh before Sukraa's ~30 min timeout

    @property
    def is_valid(self) -> bool:
        if not self._session_id or not self._last_auth:
            return False
        return datetime.utcnow() - self._last_auth < timedelta(minutes=self.SESSION_TTL_MINUTES)

    async def _create_client(self) -> httpx.AsyncClient:
        if self._client:
            await self._client.aclose()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        return httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=15.0),
            verify=False,
            follow_redirects=True,
            headers=headers
        )

    async def authenticate(self) -> bool:
        """Log in to Sukraa and cache the session cookie."""
        try:
            self._client = await self._create_client()

            # Step 1: Fetch the login page to get ViewState tokens
            resp = await self._client.get(SUKRAA_LOGIN_URL)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            hidden_fields = {}
            for field in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
                tag = soup.find("input", attrs={"name": field})
                if tag:
                    hidden_fields[field] = tag.get("value", "")

            if not hidden_fields:
                logger.error("Sukraa: Could not extract hidden form fields from login page.")
                return False

            logger.info(f"Sukraa: Extracted {len(hidden_fields)} hidden fields from login page.")

            # Stage 2: Attempt Authenticted Login
            self._client.headers.update({
                "Referer": SUKRAA_LOGIN_URL,
                "Origin": SUKRAA_BASE.split("/UAT")[0],
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            })

            login_payload = {**hidden_fields, "txtUserName": SUKRAA_USER, "txtPassword": SUKRAA_PASS, "butLogin": "Login"}
            
            resp = await self._client.post(SUKRAA_LOGIN_URL, data=login_payload)
            logger.info(f"Sukraa: Login POST -> Status: {resp.status_code}, Final URL: {resp.url}")

            # Check for explicit success landing page or Logout indicator
            is_success = "Main.aspx" in str(resp.url) or "Logout" in resp.text
            
            if is_success:
                self._session_id = next((c.value for c in self._client.cookies.jar if c.name == "ASP.NET_SessionId"), "unknown")
                self._last_auth = datetime.utcnow()
                logger.info(f"Sukraa: Login successful. Session: ...{self._session_id[-8:] if self._session_id else ''}")
                return True
            
            # Diagnostic: check for invalid password message in the response
            if "Invalid password" in resp.text:
                logger.error(f"Sukraa: Authentication rejected for user '{SUKRAA_USER}' - Invalid password.")
            else:
                logger.error(f"Sukraa: Authentication failed for user '{SUKRAA_USER}'. Redirected to: {resp.url}")
                # Save failure page to /tmp for expert analysis
                with open("/tmp/sukraa_login_failure.html", "w") as f:
                    f.write(resp.text)
            
            return False
            
            # Since the user sent an example showing only ASP.NET_SessionId, if the POST gave us one, accept it
            session_cookie = next((c.value for c in self._client.cookies.jar if c.name == "ASP.NET_SessionId"), None)
            if session_cookie:
                self._session_id = session_cookie
                self._last_auth = datetime.utcnow()
                logger.warning(f"Sukraa: Bypassed redirect check, using SessionId: ...{self._session_id[-8:]}")
                return True
                
            logger.error(f"Sukraa: Login failed. Final URL: {resp.url}.")
            return False

        except Exception as e:
            logger.error(f"Sukraa: Authentication error: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def ensure_session(self):
        """Guarantee a valid session exists, refreshing if needed."""
        async with self._lock:
            if not self.is_valid:
                logger.info("Sukraa: Session expired or missing — re-authenticating...")
                ok = await self.authenticate()
                if not ok:
                    raise HTTPException(
                        status_code=503,
                        detail="Sukraa HMS is temporarily unreachable. Please try again shortly.",
                    )

    async def call_asmx(self, method: str, payload: dict) -> list:
        """Call an ASMX method and return the JSON result array."""
        await self.ensure_session()
        url = f"{SUKRAA_ASMX_URL}/{method}"
        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json, text/javascript, */*",
        }
        try:
            resp = await self._client.post(url, json=payload, headers=headers)
            if resp.status_code == 401:
                # Session may have expired mid-use; force re-auth and retry once
                logger.warning("Sukraa: 401 received — forcing re-auth and retrying.")
                self._session_id = None
                await self.ensure_session()
                resp = await self._client.post(url, json=payload, headers=headers)

            resp.raise_for_status()
            data = resp.json()

            # ASMX wraps response in {"d": [...]}
            if isinstance(data, dict) and "d" in data:
                return data["d"] or []
            if isinstance(data, list):
                return data
            return []

        except httpx.HTTPStatusError as e:
            logger.error(f"Sukraa ASMX error [{method}]: {e.response.status_code} - {e.response.text[:300]}")
            raise HTTPException(status_code=502, detail=f"Sukraa HMS error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Sukraa ASMX call failed [{method}]: {e}")
            raise HTTPException(status_code=502, detail="Failed to reach Sukraa HMS.")


# Singleton instance
sukraa_session = SukraaSession()


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def parse_pipe_values(raw_items: list) -> list:
    """Parse Sukraa's autocomplete response strings.
    
    Sukraa returns items as JSON objects: {"First": "· MRN|NAME|AGE|DOB|GENDER|PHONE", "Second": "MRN"}
    Or as plain pipe-delimited strings: "Display Name|ID|MRN|Extra..."
    """
    results = []
    for item in raw_items:
        if not item:
            continue
        try:
            # Try parsing as JSON object (Sukraa's newer format)
            obj = json_lib.loads(item)
            first = obj.get("First", "")
            second = obj.get("Second", "").strip()
            # First format: "· MRN  |NAME|AGE|DOB|GENDER|PHONE|||"
            first_clean = first.lstrip("· ").strip()
            parts = [p.strip() for p in first_clean.split("|")]
            mrn = parts[0] if len(parts) > 0 else second
            name = parts[1] if len(parts) > 1 else ""
            age = parts[2] if len(parts) > 2 else ""
            dob = parts[3] if len(parts) > 3 else ""
            gender = parts[4] if len(parts) > 4 else ""
            phone = parts[5] if len(parts) > 5 else ""
            results.append({
                "label": name,
                "id": second or mrn,
                "mrn": mrn,
                "age": age,
                "dob": dob,
                "gender": gender,
                "phone": phone,
                "raw": item,
            })
        except (json_lib.JSONDecodeError, ValueError):
            # Fallback: plain pipe-delimited string
            parts = [p.strip() for p in item.split("|")]
            results.append({
                "label": parts[0] if len(parts) > 0 else item,
                "id": parts[1] if len(parts) > 1 else None,
                "mrn": parts[2] if len(parts) > 2 else None,
                "extra": parts[3] if len(parts) > 3 else None,
                "raw": item,
            })
    return results


def _scrape_insurance_fields(soup: BeautifulSoup) -> Dict[str, Any]:
    """Extract insurance/coverage fields from Sukraa patient registration page HTML."""
    insurance: Dict[str, Any] = {}

    # Field name patterns to look for (covers various Sukraa versions)
    # Maps our key -> list of possible ID/name suffixes Sukraa uses
    field_map = {
        "scheme": ["ddlScheme", "ddl_Scheme", "txtScheme", "cboScheme", "ddlDiscountScheme"],
        "scheme_id": ["hdnSchemeId", "hdn_SchemeId", "hidSchemeId"],
        "insurance_company": ["txtInsuranceComp", "txtInsurance", "ddlInsuranceComp", "ddlInsurance"],
        "policy_number": ["txtPolicyNo", "txtPolicy", "txtInsuranceNo"],
        "card_number": ["txtCardNo", "txtCard", "txtInsuranceCard"],
        "coverage_limit": ["txtCovAmt", "txtCoverageAmt", "txtLimit"],
        "coverage_pct": ["txtCovPct", "txtCoverPct", "txtInsurancePct"],
        "community": ["ddlCommunity", "txtCommunity", "ddlCommunityDiscount"],
        "nationality": ["ddlNationality", "txtNationality", "ddlCountry"],
        "blood_group": ["ddlBloodGroup", "txtBloodGroup", "ddlBlood"],
        "address": ["txtAddress", "txtAddr", "txtAddress1"],
        "dob": ["txtDOB", "txtDateOfBirth", "dtpDOB"],
        "email": ["txtEmail", "txtEmailId"],
        "employer": ["txtEmployer", "txtCompany", "txtOrganization"],
        "occupation": ["txtOccupation", "ddlOccupation"],
        "marital_status": ["ddlMaritalStatus", "ddlMarital"],
        "religion": ["ddlReligion", "txtReligion"],
        "emergency_contact": ["txtEmergencyContact", "txtNextOfKin", "txtNOK"],
        "emergency_phone": ["txtEmergencyPhone", "txtNOKPhone"],
    }

    all_inputs = {}
    for tag in soup.find_all(["input", "select"]):
        name = tag.get("name", "") or tag.get("id", "")
        if not name:
            continue
        # Get value
        if tag.name == "select":
            selected_opt = tag.find("option", selected=True)
            val = selected_opt.get_text(strip=True) if selected_opt else ""
        else:
            val = tag.get("value", "")
        all_inputs[name.lower()] = val

    for our_key, candidates in field_map.items():
        for candidate in candidates:
            val = all_inputs.get(candidate.lower(), "")
            if val:
                insurance[our_key] = val
                break
        # Also do suffix-based matching
        if our_key not in insurance:
            for full_key, val in all_inputs.items():
                for candidate in candidates:
                    if full_key.endswith(candidate.lower()) and val:
                        insurance[our_key] = val
                        break

    # Also extract visible label → value pairs from table rows
    label_value_pairs = {}
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        for i in range(len(cells) - 1):
            label_text = cells[i].get_text(strip=True).rstrip(":")
            value_text = cells[i+1].get_text(strip=True)
            if label_text and value_text and len(label_text) < 40:
                label_value_pairs[label_text] = value_text

    # Map visible labels to insurance keys
    label_key_map = {
        "scheme": "scheme",
        "discount scheme": "scheme",
        "insurance": "insurance_company",
        "insurance company": "insurance_company",
        "policy": "policy_number",
        "policy no": "policy_number",
        "policy number": "policy_number",
        "card no": "card_number",
        "card number": "card_number",
        "coverage": "coverage_pct",
        "coverage %": "coverage_pct",
        "coverage amount": "coverage_limit",
        "community": "community",
        "nationality": "nationality",
        "blood group": "blood_group",
        "address": "address",
        "email": "email",
        "employer": "employer",
        "occupation": "occupation",
        "marital status": "marital_status",
        "religion": "religion",
        "emergency contact": "emergency_contact",
        "emergency phone": "emergency_phone",
    }
    for label, value in label_value_pairs.items():
        mapped = label_key_map.get(label.lower())
        if mapped and mapped not in insurance and value:
            insurance[mapped] = value

    return insurance


# ─────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────
class BillPaymentRequest(BaseModel):
    patient_id: str
    patient_mrn: str
    amount: float
    payment_mode: str  # Cash, Card, Insurance
    card_type: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@router.get("/status")
async def check_sukraa_status():
    """Check connectivity to Sukraa HMS."""
    try:
        async with httpx.AsyncClient(timeout=8.0, verify=False, follow_redirects=True) as client:
            resp = await client.get(f"{SUKRAA_BASE}/forms/Main.aspx")
            return {
                "reachable": resp.status_code in (200, 302),
                "http_status": resp.status_code,
                "url": SUKRAA_BASE,
                "session_active": sukraa_session.is_valid,
                "session_age_minutes": (
                    round((datetime.utcnow() - sukraa_session._last_auth).total_seconds() / 60, 1)
                    if sukraa_session._last_auth else None
                ),
            }
    except Exception as e:
        return {"reachable": False, "error": str(e)}


@router.get("/auth")
async def force_authenticate():
    """Force a fresh authentication with Sukraa HMS."""
    sukraa_session._session_id = None  # Invalidate current
    ok = await sukraa_session.authenticate()
    if not ok:
        raise HTTPException(status_code=503, detail="Sukraa authentication failed.")
    return {"success": True, "message": "Authenticated with Sukraa HMS."}


@router.get("/patients")
async def search_patients(q: str = Query(..., min_length=2, description="Patient name or MRN prefix")):
    """Search for patients in Sukraa by name or MRN.
    
    Returns a list of matching patients with their IDs and MRNs.
    """
    # Limit count to 8 to avoid Sukraa's maxJsonLength serialization error
    raw = await sukraa_session.call_asmx("SearchPatient", {
        "prefixText": q,
        "count": 8,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/patients/op")
async def search_op_patients(q: str = Query(..., min_length=2)):
    """Search Outpatient patients specifically (for billing context)."""
    raw = await sukraa_session.call_asmx("Search_OutPatient", {
        "prefixText": q,
        "count": 8,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/doctors")
async def search_doctors(q: str = Query("", description="Doctor name prefix (empty returns all)")):
    """Search for doctors in Sukraa."""
    raw = await sukraa_session.call_asmx("SearchDoctor", {
        "prefixText": q or "Dr",
        "count": 20,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/departments")
async def search_departments(q: str = Query("", description="Department name prefix")):
    """Get departments from Sukraa."""
    raw = await sukraa_session.call_asmx("SearchDept", {
        "prefixText": q or "a",
        "count": 50,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/services")
async def search_services(q: str = Query("", description="Service/charge name prefix")):
    """Search billable services/items from Sukraa."""
    raw = await sukraa_session.call_asmx("SearchItem", {
        "prefixText": q or "a",
        "count": 50,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/income-heads")
async def get_income_heads(q: str = Query("", description="Income head prefix")):
    """Get active billing income heads from Sukraa."""
    raw = await sukraa_session.call_asmx("SearchIncomeActive", {
        "prefixText": q or "a",
        "count": 100,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/discount-schemes")
async def get_discount_schemes(q: str = Query("", description="Scheme name prefix")):
    """Get available discount/insurance schemes from Sukraa."""
    raw = await sukraa_session.call_asmx("Search_Discout_Scheme", {
        "prefixText": q or "a",
        "count": 50,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/insurance-schemes")
async def get_insurance_schemes(q: str = Query("", description="Insurance scheme name prefix")):
    """Get all available insurance / discount schemes from Sukraa (alias combining both scheme lists)."""
    schemes = []
    for prefix in [q or "a", q or "R", q or "M", q or "C", q or "N"]:
        try:
            raw = await sukraa_session.call_asmx("Search_Discout_Scheme", {
                "prefixText": prefix,
                "count": 50,
                "contextKey": "01",
            })
            parsed = parse_pipe_values(raw)
            for item in parsed:
                if not any(s.get("id") == item.get("id") for s in schemes):
                    schemes.append(item)
            if schemes:
                break
        except Exception:
            pass
    return schemes


@router.get("/appointments")
async def search_appointments(q: str = Query(..., min_length=2, description="Patient name prefix")):
    """Search existing Sukraa appointments."""
    raw = await sukraa_session.call_asmx("SearchAppoint", {
        "prefixText": q,
        "count": 15,
        "contextKey": "01",
    })
    return parse_pipe_values(raw)


@router.get("/patient/balance")
async def get_patient_balance(mrn: str = Query(..., description="Patient MRN")):
    """
    Get outstanding balance for a patient.
    Searches for the patient's open bills in Sukraa.
    Note: Full balance retrieval requires ASPX postback — this returns available info.
    """
    patients = await search_patients(q=mrn)
    if not patients:
        raise HTTPException(status_code=404, detail=f"No patient found with MRN: {mrn}")

    patient = patients[0]
    return {
        "patient": patient,
        "mrn": mrn,
        "billing_url": f"{SUKRAA_BASE}/forms/fm_HM_Due_Close.aspx",
        "note": "Navigate to billing URL for detailed balance. Full API integration requires ASPX session.",
    }


@router.get("/patient/insurance")
async def get_patient_insurance(
    patient_id: str = Query(..., description="Sukraa patient ID (Second field)"),
    mrn: str = Query("", description="Patient MRN for fallback search"),
):
    """
    Retrieve insurance and extended demographic details for a Sukraa patient.

    Loads the Sukraa patient registration ASPX page for the given patient_id and
    scrapes insurance scheme, policy number, card number, coverage percentage,
    and extended demographic fields (nationality, blood group, address, email,
    employer, etc.).

    Falls back to the SearchPatient ASMX data if the ASPX page is unavailable.
    """
    await sukraa_session.ensure_session()

    # The registration page URL — Sukraa uses ?Id=<patient_id> or ?pid=<patient_id>
    page_urls = [
        f"{SUKRAA_BASE}/forms/fm_Patient_Regn.aspx?Id={patient_id}",
        f"{SUKRAA_BASE}/forms/fm_Patient_Regn.aspx?pid={patient_id}",
        f"{SUKRAA_BASE}/forms/fm_Patient_Regn.aspx?PatientId={patient_id}",
        f"{SUKRAA_BASE}/forms/fm_Patient_Regn.aspx?HisNo={mrn}",
    ]

    insurance_data: Dict[str, Any] = {}
    page_loaded = False
    error_msg = None

    for url in page_urls:
        try:
            resp = await sukraa_session._client.get(url, timeout=25.0)
            if resp.status_code == 200 and len(resp.text) > 500:
                soup = BeautifulSoup(resp.text, "html.parser")
                # Check we're actually on a patient page (not redirected to login)
                page_title = soup.find("title")
                title_text = page_title.get_text() if page_title else ""
                if "login" in title_text.lower() or "fm_login" in str(resp.url).lower():
                    logger.warning(f"Sukraa: Insurance fetch redirected to login. Re-authenticating.")
                    sukraa_session._session_id = None
                    await sukraa_session.ensure_session()
                    resp = await sukraa_session._client.get(url, timeout=25.0)
                    soup = BeautifulSoup(resp.text, "html.parser")

                insurance_data = _scrape_insurance_fields(soup)
                page_loaded = True
                logger.info(f"Sukraa: Insurance data loaded for patient_id={patient_id}, url={url}, fields={list(insurance_data.keys())}")
                break
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Sukraa: Failed to load {url}: {e}")
            continue

    # ─────────────── NEW PATIENT QUERY SCRAPING ───────────────
    try:
        from backend.routers.sukraa_insurance import map_insurance_name_to_code
        query_url = f"{SUKRAA_BASE}/forms/Fm_Patient_Query.aspx"
        resp = await sukraa_session._client.get(query_url, timeout=25.0)
        soup = BeautifulSoup(resp.text, 'html.parser')

        # Collect postback fields
        hidden_fields = {}
        for field in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
            tag = soup.find("input", attrs={"name": field})
            if tag: hidden_fields[field] = tag.get("value", "")
            
        # Find the text input representing PID / HIS No / Patient Name
        search_input_name = None
        for tag in soup.find_all("input"):
            t_id = tag.get("id", "").lower()
            t_name = tag.get("name", "").lower()
            if tag.get("type", "text") == "text":
                if any(k in t_id or k in t_name for k in ["pno", "hisno", "patient", "name", "search", "pid"]):
                    # Prioritize the one that looks most like Patient ID / Name
                    search_input_name = tag.get("name")
                    if "pno" in t_id or "pid" in t_id or "hisno" in t_id:
                        break # Perfect match
        
        # Find the magnify glass button (usually an input type=image or submit)
        search_btn_name = None
        for tag in soup.find_all("input"):
            t_type = tag.get("type", "").lower()
            t_id = tag.get("id", "").lower()
            t_name = tag.get("name", "").lower()
            if t_type in ["image", "submit", "button"] and any(k in t_id or k in t_name for k in ["search", "btn", "view", "img"]):
                search_btn_name = tag.get("name")
                break

        if search_input_name and search_btn_name:
            # For ASP.NET ImageButtons, clicking them submits the name with .x and .y
            payload = {**hidden_fields, search_input_name: mrn or patient_id}
            payload[f"{search_btn_name}.x"] = "10"
            payload[f"{search_btn_name}.y"] = "10"
            # Also just submit the name in case it's a regular submit button
            payload[search_btn_name] = "Search"
            
            resp = await sukraa_session._client.post(query_url, data=payload, timeout=25.0)
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Scrape the results table for HIS No and extract Ref Type / Referrer Name
            for row in soup.find_all("tr"):
                cells = row.find_all(["td", "th"])
                cell_texts = [c.get_text(strip=True) for c in cells]
                
                patient_matches = (mrn in cell_texts) or (patient_id in cell_texts)
                if len(cell_texts) > 6 and patient_matches:
                    # Found the patient row! Now map the insurance.
                    for text in cell_texts:
                        code = map_insurance_name_to_code(text)
                        if code:
                            if not insurance_data.get("scheme_id"):
                                insurance_data["scheme_id"] = code
                                insurance_data["insurance_company"] = text
                                page_loaded = True
                            break
                    
                    if "Insurance" in cell_texts:
                        insurance_data["ref_type"] = "Insurance"
        else:
            found_inputs = [tag.get('name') for tag in soup.find_all("input")]
            logger.warning(f"Sukraa: Could not identify search inputs on Fm_Patient_Query. Found inputs: {found_inputs}")
            with open("/tmp/fm_patient_query_dump.html", "w") as f:
                f.write(resp.text)

    except Exception as e:
        logger.error(f"Sukraa: Failed to scrape Fm_Patient_Query.aspx: {e}")
        if not error_msg: error_msg = str(e)

    # Always include the base patient info from ASMX search (fast, cached by session)
    base_patient = {}
    try:
        search_q = mrn if mrn else patient_id
        patients = await search_patients(q=search_q)
        if patients:
            base_patient = patients[0]
            # Try to map insurance name if returned as part of ASMX fallback
            if "extra" in base_patient:
                code = map_insurance_name_to_code(base_patient["extra"])
                if code and not insurance_data.get("scheme_id"):
                    insurance_data["scheme_id"] = code
                    insurance_data["insurance_company"] = base_patient["extra"]
    except Exception:
        pass

    return {
        "patient_id": patient_id,
        "mrn": mrn or base_patient.get("mrn", ""),
        "base_info": base_patient,
        "insurance": insurance_data,
        "page_loaded": page_loaded,
        "source_url": f"{SUKRAA_BASE}/forms/fm_Patient_Regn.aspx",
        "error": error_msg if not page_loaded else None,
        "note": (
            "Insurance details scraped from Sukraa patient registration page."
            if page_loaded else
            "Could not load patient detail page — insurance fields may be unavailable. Check Sukraa connectivity."
        ),
    }


@router.post("/bill/initiate")
async def initiate_bill(request: BillPaymentRequest):
    """
    Initiate a billing record in Sukraa.
    
    Note: For now this validates the patient exists and returns the Sukraa billing
    URL for reference. Full automated bill submission requires reverse-engineering the
    ASPX postback chain (Phase 2 of integration).
    """
    # Validate the patient exists in Sukraa
    patients = await search_patients(q=request.patient_mrn)
    matched = [p for p in patients if p.get("mrn") == request.patient_mrn or p.get("id") == request.patient_id]

    if not matched:
        raise HTTPException(status_code=404, detail="Patient not found in Sukraa HMS.")

    return {
        "success": True,
        "status": "validated",
        "patient": matched[0],
        "amount": request.amount,
        "payment_mode": request.payment_mode,
        "billing_portal_url": f"{SUKRAA_BASE}/forms/fm_HM_Due_close.aspx",
        "message": "Patient validated in Sukraa. Please complete payment in the billing portal.",
    }


@router.get("/patient/billing-details")
async def get_patient_bill_details(mrn: str = Query(..., description="Patient MRN")):
    """
    Retrieve real-time billing info for a patient from Sukraa's 'Due Close' page.
    Scrapes Bill Amount, Already Paid, and Balance to be paid.
    """
    await sukraa_session.ensure_session()
    
    url = f"{SUKRAA_BASE}/forms/fm_HM_Due_close.aspx"
    
    try:
        # Step 1: Get the page to get ViewState
        resp = await sukraa_session._client.get(url, timeout=30.0)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Collect hidden fields
        hidden_fields = {}
        for field in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
            tag = soup.find("input", attrs={"name": field})
            if tag: hidden_fields[field] = tag.get("value", "")
            
        # Step 2: POST to search for the patient (using the magnifying glass logic)
        # Found from inspection: ctl00_Main_Content_txtPatient (Search Text)
        # and ctl00_Main_Content_imgPatient (Magnifying glass image button)
        
        # IDs from browser subagent were: ctl00_Main_Content_txtPatient, etc.
        # But for POST we need the 'name' attribute. Often it's the same.
        
        payload = {
            **hidden_fields,
            "ctl00$Main_Content$txtPatient": mrn,
            "ctl00$Main_Content$imgPatient.x": "10",
            "ctl00$Main_Content$imgPatient.y": "10",
        }
        
        resp = await sukraa_session._client.post(url, data=payload, timeout=30.0)
        resp.raise_for_status()
        
        # Step 3: Parse the results
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Extract fields
        def get_val_by_id(id_suffix):
            tag = soup.find(id=re.compile(f"{id_suffix}$"))
            if tag:
                return tag.get("value", "0.00")
            return "0.00"

        bill_amount = get_val_by_id("txtBillAmt")
        already_paid = get_val_by_id("txtAlreadyPaid")
        balance = get_val_by_id("txtBalance")
        total_amount = get_val_by_id("txtTotalAmt")
        
        # Referrer logic
        referrer = ""
        ref_dropdown = soup.find(id=re.compile("ddlReferrer$"))
        if ref_dropdown:
            selected = ref_dropdown.find("option", selected=True)
            if selected:
                referrer = selected.get_text(strip=True)
        
        if not referrer:
            ref_txt = soup.find(id=re.compile("txtReferrer$"))
            if ref_txt:
                referrer = ref_txt.get("value", "")

        # Compute percentage
        try:
            total = float(total_amount.replace(",", ""))
            paid = float(already_paid.replace(",", ""))
            paid_pct = (paid / total * 100) if total > 0 else 0
        except:
            paid_pct = 0

        return {
            "mrn": mrn,
            "bill_amount": bill_amount,
            "already_paid": already_paid,
            "total_amount": total_amount,
            "balance": balance,
            "paid_percentage": round(paid_pct, 2),
            "referrer": referrer,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Sukraa: Failed to fetch billing details for {mrn}: {e}")
        # Fallback empty response
        return {
            "mrn": mrn,
            "bill_amount": "0.00",
            "already_paid": "0.00",
            "total_amount": "0.00",
            "balance": "0.00",
            "paid_percentage": 0,
            "referrer": "Self",
            "success": False,
            "error": str(e)
        }

