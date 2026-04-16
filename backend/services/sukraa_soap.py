import requests
import xml.etree.ElementTree as ET
import logging
import json

logger = logging.getLogger(__name__)

class SukraaSOAPClient:
    """
    Client for interacting with Sukraa's Autocompleted.asmx SOAP web service.
    """
    def __init__(self, base_url="http://41.173.250.126:8081/UAT/forms/Autocompleted.asmx"):
        self.base_url = base_url

    def _call_method(self, method_name, prefix_text="", count=100, context_key=""):
        """Executes a SOAP 1.1 request to the ASMX service with minimal headers to ensure compatibility."""
        soap_body = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
            '<soap:Body>'
            f'<{method_name} xmlns="http://tempuri.org/">'
            f'<prefixText>{prefix_text}</prefixText>'
            f'<count>{count}</count>'
            f'<contextKey>{context_key}</contextKey>'
            f'</{method_name}>'
            '</soap:Body>'
            '</soap:Envelope>'
        ).encode('utf-8')

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f'"http://tempuri.org/{method_name}"',
            "User-Agent": "curl/8.5.0",
            "Accept": "*/*",
            "Content-Length": str(len(soap_body))
        }

        try:
            # Use requests.post directly for simplicity in this case
            response = requests.post(self.base_url, data=soap_body, headers=headers, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"SOAP Service Error {response.status_code}: {response.text[:500]}")
                return []
            
            return self._parse_response(response.text, method_name)
        except Exception as e:
            logger.error(f"Failed to call Sukraa SOAP method {method_name}: {e}")
            return []

    def _parse_response(self, xml_text, method_name):
        """Parses the ASMX response which is an ArrayOfString containing JSON-like strings."""
        try:
            root = ET.fromstring(xml_text)
            string_tag = "{http://tempuri.org/}string"
            
            items = []
            for string_node in root.iter(string_tag):
                if string_node.text:
                    try:
                        # The text is a JSON string: {"First": "...", "Second": "..."}
                        data = json.loads(string_node.text)
                        items.append(data)
                    except:
                        # Fallback to raw text if not JSON
                        items.append({"First": string_node.text, "Second": string_node.text})
            return items
        except Exception as e:
            logger.error(f"Failed to parse Sukraa XML response: {e}")
            return []

    def get_patients(self, query="", count=10):
        """Search for patients. Returns list of parsed patient objects."""
        results = self._call_method("SearchPatient", prefix_text=query, count=count)
        parsed = []
        for item in results:
            first = item.get("First", "")
            # Format Example: "· 17001249  |GATERA JOHN|57 Y|01/01/1969|Male|0788301138|||"
            # Parts: MRN | NAME | AGE | DOB | GENDER | PHONE
            parts = [p.strip() for p in first.split('|')]
            if len(parts) >= 2:
                # Part 0 has the MRN and a bullet point
                sub_parts = parts[0].split(' ')
                # Get the last non-empty part which should be the MRN
                mrn_candidates = [p.strip() for p in sub_parts if p.strip() and p.strip() != '·']
                mrn = mrn_candidates[0] if mrn_candidates else parts[0]
                
                parsed.append({
                    "mrn": mrn,
                    "name": parts[1],
                    "age": parts[2] if len(parts) > 2 else "",
                    "dob": parts[3] if len(parts) > 3 else "",
                    "gender": parts[4] if len(parts) > 4 else "",
                    "phone": parts[5] if len(parts) > 5 else "",
                    "id": item.get("Second", "").strip()
                })
        return parsed

    def get_doctors(self, query="", count=50):
        """Search for doctors/staff."""
        results = self._call_method("SearchDoctor", prefix_text=query, count=count)
        parsed = []
        for item in results:
            first = item.get("First", "")
            # Assume similar format or just Name
            parsed.append({
                "name": first.replace('·', '').strip(),
                "id": item.get("Second", "").strip()
            })
        return parsed

    def get_inventory_items(self, query="", count=100):
        """Search for inventory items (consumables/drugs)."""
        results = self._call_method("SearchInventoryItem", prefix_text=query, count=count)
        parsed = []
        for item in results:
            first = item.get("First", "")
            # Format Example: "· 0001 | PARACETAMOL 500MG | 100.00 | ..."
            parts = [p.strip() for p in first.split('|')]
            if len(parts) >= 3:
                parsed.append({
                    "code": parts[0].replace('·', '').strip(),
                    "name": parts[1],
                    "price": parts[2],
                    "id": item.get("Second", "").strip()
                })
            else:
                parsed.append({
                    "name": first.replace('·', '').strip(),
                    "id": item.get("Second", "").strip()
                })
        return parsed
