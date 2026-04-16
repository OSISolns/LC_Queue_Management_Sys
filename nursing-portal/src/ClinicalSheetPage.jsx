import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  fetchPatientDetail, 
  saveClinicalSheet, 
  fetchClinicalSheet,
  fetchPatientVitals
} from './services/api';
import { FileText, ArrowLeft, Printer, Plus, Save, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClinicalSheetPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const apptNo = queryParams.get('appt');
  const queueId = queryParams.get('queue_id');

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  const [clinicalSheet, setClinicalSheet] = useState({
    patient_identification: {
      occupation: '',
      national_id: '',
      country: '',
      province: '',
      district: '',
      sector: '',
      next_of_kin_name: '',
      next_of_kin_phone: '',
      next_of_kin_relationship: '',
      insurance: ''
    },
    nursing_assessment: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      rn: '',
      previous_illness_medical: '',
      previous_illness_surgical: '',
      allergy_1: '',
      allergy_2: '',
      temp: '',
      pulse: '',
      respiratory_rate: '',
      bp: '',
      weight: '',
      spo2: '',
      pain_scale: '',
      pain_location: '',
      pain_type: '',
      comments: '',
      integumentary: '',
      neurological: '',
      ent: '',
      respiratory: '',
      cardiovascular: '',
      genito_urinary: '',
      gastrointestinal: '',
      musculoskeletal: '',
      intake: '',
      other_comments: ''
    },
    progress_notes: [{ datetime: '', note: '', nurse_signature: '' }],
    medication_record: {
      prescriber_name_signature: '',
      medications: [
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' },
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' },
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' },
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' },
        { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' }
      ],
      administration_rows: Array.from({ length: 8 }, () => ({ time: '', initials: '' })),
      initials_interpretation: [{ initials: '', full_name: '' }]
    },
    sbar_handover: {
      report_text: '',
      reported_by: '',
      reported_sign_time: '',
      received_by: '',
      received_sign_time: ''
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Load Patient Details
        const patientData = await fetchPatientDetail(patientId);
        setPatient(patientData);

        // 2. Load Existing Clinical Sheet
        const existingSheet = await fetchClinicalSheet(patientId, { queue_id: queueId });
        if (existingSheet) {
            setClinicalSheet(JSON.parse(existingSheet.data));
            setLastSaved(new Date(existingSheet.updated_at));
        } else {
            // 3. Pre-populate from Patient and Vitals if new sheet
            setClinicalSheet(prev => ({
                ...prev,
                patient_identification: {
                    ...prev.patient_identification,
                    occupation: patientData.occupation || '',
                    national_id: patientData.national_id || '',
                    country: patientData.nationality || '',
                    province: patientData.province || '',
                    district: patientData.district || '',
                    sector: patientData.sector || '',
                    next_of_kin_relationship: patientData.next_of_kin_relationship || '',
                    insurance: patientData.insurance || ''
                }
            }));

            // Try to get latest vitals for today
            const vitals = await fetchPatientVitals(patientId);
            if (vitals && vitals.length > 0) {
                const latest = vitals[0];
                setClinicalSheet(prev => ({
                    ...prev,
                    nursing_assessment: {
                        ...prev.nursing_assessment,
                        temp: latest.temperature || '',
                        pulse: latest.heart_rate || '',
                        respiratory_rate: latest.respiratory_rate || '',
                        bp: latest.blood_pressure || '',
                        weight: latest.weight || '',
                        spo2: latest.spo2 || ''
                    }
                }));
            }
        }
      } catch (err) {
        console.error("Failed to load clinical data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [patientId, queueId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await saveClinicalSheet(patientId, {
        patient_id: parseInt(patientId),
        queue_id: queueId ? parseInt(queueId) : null,
        data: JSON.stringify(clinicalSheet)
      });
      setLastSaved(new Date(res.updated_at));
      // alert("Clinical Sheet saved successfully.");
    } catch (err) {
      alert("Failed to save clinical sheet.");
    } finally {
      setSaving(false);
    }
  };

  const updateClinicalSection = (sectionKey, field, value) => {
    setClinicalSheet(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }));
  };

  const updateProgressNote = (idx, field, value) => {
    setClinicalSheet(prev => {
      const nextNotes = [...prev.progress_notes];
      nextNotes[idx] = { ...nextNotes[idx], [field]: value };
      return { ...prev, progress_notes: nextNotes };
    });
  };

  const addProgressNoteRow = () => {
    setClinicalSheet(prev => ({
      ...prev,
      progress_notes: [...prev.progress_notes, { datetime: '', note: '', nurse_signature: '' }]
    }));
  };

  const updateMedicationCell = (medIdx, field, value) => {
    setClinicalSheet(prev => {
      const nextMeds = [...prev.medication_record.medications];
      nextMeds[medIdx] = { ...nextMeds[medIdx], [field]: value };
      return {
        ...prev,
        medication_record: {
          ...prev.medication_record,
          medications: nextMeds
        }
      };
    });
  };

  const updateAdminRow = (rowIdx, field, value) => {
    setClinicalSheet(prev => {
      const nextRows = [...prev.medication_record.administration_rows];
      nextRows[rowIdx] = { ...nextRows[rowIdx], [field]: value };
      return {
        ...prev,
        medication_record: {
          ...prev.medication_record,
          administration_rows: nextRows
        }
      };
    });
  };

  const updateInitialInterpretation = (idx, field, value) => {
    setClinicalSheet(prev => {
      const nextRows = [...prev.medication_record.initials_interpretation];
      nextRows[idx] = { ...nextRows[idx], [field]: value };
      return {
        ...prev,
        medication_record: {
          ...prev.medication_record,
          initials_interpretation: nextRows
        }
      };
    });
  };

  const addInitialInterpretationRow = () => {
    setClinicalSheet(prev => ({
      ...prev,
      medication_record: {
        ...prev.medication_record,
        initials_interpretation: [...prev.medication_record.initials_interpretation, { initials: '', full_name: '' }]
      }
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-container">Loading Clinical Sheet...</div>;
  if (!patient) return <div className="error-container">Patient not found.</div>;

  return (
    <div className="full-page-clinical">
      <header className="clinical-header no-print">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <div className="clinical-header-title">
          <FileText size={24} />
          <h2>Clinical Sheet</h2>
        </div>
        <div className="clinical-header-actions">
          {lastSaved && (
            <span className="last-saved-tag">
               <CheckCircle size={14} /> Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button onClick={handleSave} className="save-btn-premium" disabled={saving}>
            <Save size={20} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handlePrint} className="print-btn">
            <Printer size={20} /> Print Sheet
          </button>
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="clinical-container-wide">
        <div className="clinical-report-container">
          <div className="report-header-labels">
            <h3 className="report-title-main">Patient Observation Records Sheet</h3>
            <p className="report-subtitle">Legacy Clinics & Diagnostics • Nurse Assessment</p>
          </div>

          <div className="patient-id-block">
            <div className="block-header-blue">I. Patient Identification</div>
            <div className="info-grid-row">
              <div className="info-cell">
                <span className="info-label">Last name</span>
                <input value={patient.last_name || ''} readOnly />
              </div>
              <div className="info-cell">
                <span className="info-label">First name</span>
                <input value={patient.first_name || ''} readOnly />
              </div>
            </div>
            <div className="info-grid-row">
              <div className="info-cell">
                <span className="info-label">Occupation</span>
                <input value={clinicalSheet.patient_identification.occupation} onChange={(e) => updateClinicalSection('patient_identification', 'occupation', e.target.value)} />
              </div>
              <div className="info-cell">
                <span className="info-label">National ID / Passport</span>
                <input value={clinicalSheet.patient_identification.national_id} onChange={(e) => updateClinicalSection('patient_identification', 'national_id', e.target.value)} />
              </div>
            </div>
            <div className="info-grid-row">
              <div className="info-cell">
                <span className="info-label">Date of birth</span>
                <input value={patient.date_of_birth || ''} readOnly />
              </div>
              <div className="info-cell">
                <span className="info-label">Gender</span>
                <input value={patient.gender || ''} readOnly />
              </div>
            </div>
            <div className="info-grid-row">
              <div className="info-cell">
                <span className="info-label">Patient ID (PID)</span>
                <input value={patient.mrn || ''} readOnly />
              </div>
              <div className="info-cell">
                <span className="info-label">Appt. Date & No.</span>
                <input value={apptNo ? `${new Date().toLocaleDateString()} • #${apptNo}` : 'Walk-in / No Appointment'} readOnly />
              </div>
            </div>
            <div className="info-grid-row">
              <div className="info-cell" style={{ gridColumn: '1 / span 2' }}>
                <span className="info-label">Health insurance</span>
                <input value={clinicalSheet.patient_identification.insurance} onChange={(e) => updateClinicalSection('patient_identification', 'insurance', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="assessment-grid">
            <div className="asmt-item">
              <div className="asmt-num">Date/Time/RN</div>
              <div className="asmt-content">
                <div className="form-row">
                  <input type="date" value={clinicalSheet.nursing_assessment.date} onChange={(e) => updateClinicalSection('nursing_assessment', 'date', e.target.value)} />
                  <input type="time" value={clinicalSheet.nursing_assessment.time} onChange={(e) => updateClinicalSection('nursing_assessment', 'time', e.target.value)} />
                </div>
                <input style={{ marginTop: '8px' }} placeholder="RN" value={clinicalSheet.nursing_assessment.rn} onChange={(e) => updateClinicalSection('nursing_assessment', 'rn', e.target.value)} />
              </div>
            </div>

            <div className="asmt-item">
              <div className="asmt-num">Nursing Assessment</div>
              <div className="asmt-content">
                <div className="form-row">
                  <input placeholder="Previous illness (Medical)" value={clinicalSheet.nursing_assessment.previous_illness_medical} onChange={(e) => updateClinicalSection('nursing_assessment', 'previous_illness_medical', e.target.value)} />
                  <input placeholder="Previous illness (Surgical)" value={clinicalSheet.nursing_assessment.previous_illness_surgical} onChange={(e) => updateClinicalSection('nursing_assessment', 'previous_illness_surgical', e.target.value)} />
                </div>
                <div className="form-row" style={{ marginTop: '8px' }}>
                  <input placeholder="Allergy (1)" value={clinicalSheet.nursing_assessment.allergy_1} onChange={(e) => updateClinicalSection('nursing_assessment', 'allergy_1', e.target.value)} />
                  <input placeholder="Allergy (2)" value={clinicalSheet.nursing_assessment.allergy_2} onChange={(e) => updateClinicalSection('nursing_assessment', 'allergy_2', e.target.value)} />
                </div>
                <div className="form-grid-3" style={{ marginTop: '8px' }}>
                  <input placeholder="Temp" value={clinicalSheet.nursing_assessment.temp} onChange={(e) => updateClinicalSection('nursing_assessment', 'temp', e.target.value)} />
                  <input placeholder="Pulse" value={clinicalSheet.nursing_assessment.pulse} onChange={(e) => updateClinicalSection('nursing_assessment', 'pulse', e.target.value)} />
                  <input placeholder="Respiratory Rate" value={clinicalSheet.nursing_assessment.respiratory_rate} onChange={(e) => updateClinicalSection('nursing_assessment', 'respiratory_rate', e.target.value)} />
                </div>
                <div className="form-grid-3" style={{ marginTop: '8px' }}>
                  <input placeholder="Blood Pressure" value={clinicalSheet.nursing_assessment.bp} onChange={(e) => updateClinicalSection('nursing_assessment', 'bp', e.target.value)} />
                  <input placeholder="Weight (Kg)" value={clinicalSheet.nursing_assessment.weight} onChange={(e) => updateClinicalSection('nursing_assessment', 'weight', e.target.value)} />
                  <input placeholder="SpO2" value={clinicalSheet.nursing_assessment.spo2} onChange={(e) => updateClinicalSection('nursing_assessment', 'spo2', e.target.value)} />
                </div>
                <textarea style={{ marginTop: '8px', width: '100%', minHeight: '70px' }} placeholder="General comments" value={clinicalSheet.nursing_assessment.comments} onChange={(e) => updateClinicalSection('nursing_assessment', 'comments', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="clinical-notes-log">
            <div className="block-header-blue">Progress / Clinical Notes</div>
            <table className="notes-table-clinical">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Clinical Note</th>
                  <th>Name / Signature</th>
                </tr>
              </thead>
              <tbody>
                {clinicalSheet.progress_notes.map((row, idx) => (
                  <tr key={`progress-${idx}`}>
                    <td><input type="datetime-local" value={row.datetime} onChange={(e) => updateProgressNote(idx, 'datetime', e.target.value)} /></td>
                    <td><textarea value={row.note} onChange={(e) => updateProgressNote(idx, 'note', e.target.value)} style={{ width: '100%', minHeight: '56px' }} /></td>
                    <td><input value={row.nurse_signature} onChange={(e) => updateProgressNote(idx, 'nurse_signature', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="primary-btn no-print" style={{ marginTop: '10px' }} onClick={addProgressNoteRow}>
              <Plus size={16} /> Add Note Row
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div className="block-header-blue">Prescription and Medication Record Sheet</div>
            <table className="med-table-clinical">
              <thead>
                <tr>
                  <th>Field</th>
                  {clinicalSheet.medication_record.medications.map((_, i) => (
                    <th key={`med-head-${i}`}>Medication {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['name', 'dose', 'frequency', 'route', 'start_time', 'end_time'].map((field) => (
                  <tr key={field}>
                    <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{field.replace('_', ' ')}</td>
                    {clinicalSheet.medication_record.medications.map((med, i) => (
                      <td key={`${field}-${i}`}>
                        <input value={med[field]} onChange={(e) => updateMedicationCell(i, field, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="form-row" style={{ marginTop: '8px' }}>
              <input
                placeholder="Prescriber Name & Signature"
                value={clinicalSheet.medication_record.prescriber_name_signature}
                onChange={(e) => setClinicalSheet(prev => ({
                  ...prev,
                  medication_record: {
                    ...prev.medication_record,
                    prescriber_name_signature: e.target.value
                  }
                }))}
              />
            </div>

            <table className="notes-table-clinical" style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Administered by (Initials)</th>
                </tr>
              </thead>
              <tbody>
                {clinicalSheet.medication_record.administration_rows.map((row, idx) => (
                  <tr key={`admin-${idx}`}>
                    <td><input value={row.time} onChange={(e) => updateAdminRow(idx, 'time', e.target.value)} placeholder="HH:MM" /></td>
                    <td><input value={row.initials} onChange={(e) => updateAdminRow(idx, 'initials', e.target.value)} placeholder="Initials" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="notes-table-clinical" style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Initials</th>
                  <th>Initials Interpretation (Full Names)</th>
                </tr>
              </thead>
              <tbody>
                {clinicalSheet.medication_record.initials_interpretation.map((row, idx) => (
                  <tr key={`initials-${idx}`}>
                    <td><input value={row.initials} onChange={(e) => updateInitialInterpretation(idx, 'initials', e.target.value)} /></td>
                    <td><input value={row.full_name} onChange={(e) => updateInitialInterpretation(idx, 'full_name', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="primary-btn no-print" style={{ marginTop: '10px' }} onClick={addInitialInterpretationRow}>
              <Plus size={16} /> Add Initials Row
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div className="block-header-blue">SBAR Hand Over Report</div>
            <div className="info-grid-row">
              <div className="info-cell" style={{ gridColumn: '1 / span 2' }}>
                <span className="info-label">Situation, Background, Assessment & Recommendation</span>
                <textarea style={{ width: '100%', minHeight: '110px' }} value={clinicalSheet.sbar_handover.report_text} onChange={(e) => updateClinicalSection('sbar_handover', 'report_text', e.target.value)} />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '8px' }}>
              <input placeholder="Reported by" value={clinicalSheet.sbar_handover.reported_by} onChange={(e) => updateClinicalSection('sbar_handover', 'reported_by', e.target.value)} />
              <input placeholder="Reported sign. & time" value={clinicalSheet.sbar_handover.reported_sign_time} onChange={(e) => updateClinicalSection('sbar_handover', 'reported_sign_time', e.target.value)} />
            </div>
            <div className="form-row" style={{ marginTop: '8px' }}>
              <input placeholder="Received by" value={clinicalSheet.sbar_handover.received_by} onChange={(e) => updateClinicalSection('sbar_handover', 'received_by', e.target.value)} />
              <input placeholder="Received sign. & time" value={clinicalSheet.sbar_handover.received_sign_time} onChange={(e) => updateClinicalSection('sbar_handover', 'received_sign_time', e.target.value)} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
