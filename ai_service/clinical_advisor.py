from typing import List, Dict, Any, Optional
import re

class ClinicalAdvisor:
    """Enterprise AI Clinical Advisor for vitals analysis and allergy checking."""
    
    # Simple medical range thresholds for demonstration
    THRESHOLDS = {
        "temperature": {"high": 38.5, "low": 35.0},
        "heart_rate": {"high": 100, "low": 50},
        "spo2": {"low": 94},
        "systolic_bp": {"high": 140, "low": 100},
        "diastolic_bp": {"high": 90, "low": 60}
    }

    def analyze_vitals(self, current: Dict[str, Any], history: List[Dict[str, Any]] = []) -> Dict[str, Any]:
        alerts = []
        is_problematic = False
        findings = []
        
        # 1. Analyze Temperature
        temp = self._to_float(current.get("temperature"))
        if temp:
            if temp >= self.THRESHOLDS["temperature"]["high"]:
                alerts.append(f"Fever detected: {temp}°C")
                is_problematic = True
            elif temp <= self.THRESHOLDS["temperature"]["low"]:
                alerts.append(f"Hypothermia risk: {temp}°C")
                is_problematic = True

        # 2. Analyze BP
        bp = current.get("blood_pressure")
        if bp and "/" in str(bp):
            try:
                sys, dia = map(float, str(bp).split("/"))
                if sys >= self.THRESHOLDS["systolic_bp"]["high"] or dia >= self.THRESHOLDS["diastolic_bp"]["high"]:
                    alerts.append(f"Hypertension detected: {bp}")
                    is_problematic = True
                elif sys <= self.THRESHOLDS["systolic_bp"]["low"] or dia <= self.THRESHOLDS["diastolic_bp"]["low"]:
                    alerts.append(f"Hypotension risk: {bp}")
                    is_problematic = True
            except:
                pass

        # 3. Analyze SpO2
        spo2 = self._to_float(current.get("spo2"))
        if spo2 and spo2 <= self.THRESHOLDS["spo2"]["low"]:
            alerts.append(f"Low SpO2: {spo2}% (Risk of respiratory distress)")
            is_problematic = True

        # 4. History Comparison (Occurrence Tracking)
        if is_problematic and history:
            occurrence_count = 0
            for h in history:
                h_temp = self._to_float(h.get("temperature"))
                if h_temp and h_temp >= self.THRESHOLDS["temperature"]["high"]:
                    occurrence_count += 1
            
            if occurrence_count >= 2:
                findings.append(f"Chronic pattern: This patient has shown problematic vitals {occurrence_count} times in previous visits.")

        return {
            "is_problematic": is_problematic,
            "alerts": alerts,
            "findings": findings,
            "recommendation": "Escalate to Physician" if is_problematic else "Stable"
        }

    def check_allergy_risk(self, medication: str, allergies: str) -> Dict[str, Any]:
        if not allergies or not medication:
            return {"risk": "low", "warning": None}
        
        # Simple fuzzy matching for common drug classes
        med_normalized = medication.lower()
        all_normalized = allergies.lower()
        
        warning = None
        risk = "low"
        
        # Check for direct matches or common drug families
        common_drug_families = ["penicillin", "aspirin", "sulfa", "ibuprofen", "nsaid"]
        
        for family in common_drug_families:
            if family in med_normalized and family in all_normalized:
                risk = "high"
                warning = f"CRITICAL ALLERGY ALERT: Patient is allergic to {family}, and you are attempting to record {medication}."
                break
        
        # Fallback keyword matching
        if risk == "low":
            # Search for the medication name in the allergies string
            words = re.findall(r'\w+', med_normalized)
            for word in words:
                if len(word) > 3 and word in all_normalized:
                    risk = "moderate"
                    warning = f"POTENTIAL ALLERGY: '{medication}' matches keyword in patient's allergy records: '{allergies}'"
                    break
                    
        return {"risk": risk, "warning": warning}

    def _to_float(self, val: Any) -> Optional[float]:
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

clinical_advisor = ClinicalAdvisor()
