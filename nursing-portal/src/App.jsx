import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ClinicalSheetPage from './ClinicalSheetPage';
import { 
  fetchNurses, 
  fetchQueue, 
  fetchStats, 
  callNextPatient, 
  completePatient, 
  fetchPatientDetail,
  fetchPatientVisits,
  fetchAllPatients,
  createObservationNote,
  fetchObservationNotes,
  administerMedication,
  fetchMedications,
  fetchMySchedule,
  updateUserRoom,
  uploadUserProfilePicture,
  fetchPatientVitals,
  recordPatientVitals,
  analyzeVitalsAI,
  checkAllergyAI,
  fetchRecommendedPatient,
  skipPatient,
  undoPatientStatus,
  fetchActiveCounters,
  fetchNurseLogs, 
  fetchNotifications, 
  fetchConsumables,
  markNotificationRead,
  createPatientCharge,
  fetchPatientCharges
} from './services/api';
import PatientTokenCard from './components/PatientTokenCard';
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Stethoscope,
  Info,
  Pill,
  ClipboardList,
  History,
  Plus,
  Camera,
  FileText,
  ArrowRight,
  MapPin,
  Thermometer,
  Weight,
  Ruler,
  Activity,
  RotateCcw,
  SkipForward,
  BrainCircuit,
  Wind,
  ShoppingCart,
  Receipt,
  Eye
} from 'lucide-react';

const calculateAge = (dobString) => {
  if (!dobString) return "—";
  try {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : "—";
  } catch (e) {
    return "—";
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [nurses, setNurses] = useState([]);
  const [error, setError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({
    total_waiting: 0,
    total_completed: 0,
    total_calling: 0
  });
  const [loading, setLoading] = useState(true);
  const [servingPatient, setServingPatient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [modalTab, setModalTab] = useState('summary'); // summary, observation, vitals, medication, clinical_sheet, visits
  const [obsNotes, setObsNotes] = useState([]);
  const [obsMeds, setObsMeds] = useState([]);
  const [mySchedule, setMySchedule] = useState([]);
  const [newNote, setNewNote] = useState('');

  const [newMed, setNewMed] = useState({ medication_name: '', dosage: '', route: '', notes: '' });
  const [vitalsForm, setVitalsForm] = useState({
    temperature: '', weight: '', height: '', 
    blood_pressure: '', heart_rate: '', 
    respiratory_rate: '', spo2: '', notes: ''
  });
  const [tariff, setTariff] = useState([]);
  const [patientCharges, setPatientCharges] = useState([]);
  const [selectedChargeItem, setSelectedChargeItem] = useState('');
  const [chargeQty, setChargeQty] = useState(1);
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
      date: '',
      time: '',
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
  const [patientVitals, setPatientVitals] = useState([]);
  const [nurseLogs, setNurseLogs] = useState([]);
  const [savingAction, setSavingAction] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('nursing_portal_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [recommendedPatient, setRecommendedPatient] = useState(null);
  const [activeCounters, setActiveCounters] = useState([]);
  const [lastAction, setLastAction] = useState(null); // Track last skipping/calling for undo
  const [selectedForLogin, setSelectedForLogin] = useState(null);
  const [selectedStation, setSelectedStation] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [weightCustom, setWeightCustom] = useState(false);
  const [heightCustom, setHeightCustom] = useState(false);
  const rowsPerPage = 20;

  const filteredQueue = React.useMemo(() => queue.filter(patient => {
    // 1. Check Search Query
    const matchesSearch = patient.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (patient.token_number && patient.token_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // 2. Check Clinical Assignment (Station Filtering)
    if (!currentUser || !currentUser.room_number) return true;
    
    const station = currentUser.room_number;
    const patientDept = (patient.target_dept || "").toLowerCase();
    const patientRoom = (patient.target_room || "").toLowerCase();

    if (station === "Station 1(GF)") {
        return patientDept === "triage" || patientRoom === "station 1(gf)";
    } else if (station === "Station 2(1F)") {
        return patientDept === "triage" || patientRoom === "station 2(1f)";
    } else if (station === "Station 3(PED)") {
        // Enforce age limit: <= 15 years old, NO EXCEPTIONS
        const age = calculateAge(patient.patient?.date_of_birth);
        const isChild = typeof age === 'number' && age <= 15;
        // Also allow if it's explicitly pediatric dept and age is unknown (fallback) or explicitly child
        return (isChild) && (patientDept === "pediatrics" || patientDept === "triage" || patientRoom === "station 3(ped)");
    }
    
    return true;
  }), [queue, searchQuery, currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedForLogin(null);
    setSelectedStation("");
    localStorage.removeItem('nursing_portal_user');
    setActiveTab('dashboard'); // Reset tab
  };

  const handleLogin = async (nurse) => {
    if (!selectedStation) {
      alert("Please select a Nursing Station.");
      return;
    }
    const updatedNurse = { ...nurse, room_number: selectedStation };
    try {
      await updateUserRoom(nurse.id, selectedStation);
    } catch (err) {
      console.error("Failed to sync room update to server", err);
    }
    setCurrentUser(updatedNurse);
    localStorage.setItem('nursing_portal_user', JSON.stringify(updatedNurse));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    if (currentUser) {
      const now = Date.now();
      const lastLoginStr = localStorage.getItem('nursing_portal_last_toast');
      const twoHours = 2 * 60 * 60 * 1000;
      
      if (!lastLoginStr || (now - parseInt(lastLoginStr)) > twoHours) {
        const greeting = getGreeting();
        const firstName = currentUser.full_name.split(' ')[0];
        // Show a temporary session alert
        setTimeout(() => {
          alert(`${greeting}, ${firstName}! Welcome to your shift.`);
        }, 1000);
        localStorage.setItem('nursing_portal_last_toast', now.toString());
      }
    }
  }, [currentUser]);
  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [nurseData, queueData, statsData] = await Promise.all([
        fetchNurses(),
        fetchQueue(),
        fetchStats()
      ]);
      setNurses(nurseData);
      setQueue(queueData);
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load data", err);
      const msg = err.response ? `Gateway Error: ${err.response.status} ${err.response.statusText}` : "Unable to reach the clinical gateway. Please check your connection.";
      setError(msg);
      setLoading(false);
    }
  };

  const loadActiveCounters = async () => {
    try {
      const counters = await fetchActiveCounters();
      setActiveCounters(counters);
    } catch (err) {
      console.error("Failed to load active counters", err);
    }
  };

  const getRecommendation = async () => {
    if (!currentUser) return;
    try {
      const rec = await fetchRecommendedPatient(currentUser.room_number, currentUser.id);
      setRecommendedPatient(rec);
    } catch (err) {
      setRecommendedPatient(null);
    }
  };

  const loadAllPatients = async () => {
    try {
      const patients = await fetchAllPatients();
      setAllPatients(patients);
    } catch (err) {
      console.error("Failed to load all patients", err);
    }
  };

  const loadSchedule = async () => {
    if (!currentUser) return;
    try {
      const schedule = await fetchMySchedule(currentUser.id);
      setMySchedule(schedule);
    } catch (err) {
      console.error("Failed to load schedule", err);
    }
  };

  const loadNurseLogs = async () => {
    if (!currentUser) return;
    try {
      const logs = await fetchNurseLogs(currentUser.id);
      setNurseLogs(logs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  useEffect(() => {
    loadData();
    if (currentUser) {
       loadActiveCounters();
       getRecommendation();
       loadNotifications();
       loadTariff();
       loadAllPatients(); // Initial load
    }
    const interval = setInterval(() => {
       loadData();
       loadActiveCounters();
       getRecommendation();
       loadNotifications();
    }, 5000);

    // Refresh all patients list every 5 minutes (reduced frequency for 268k records)
    const patientRefreshInterval = setInterval(() => {
       if (currentUser) {
         loadAllPatients();
       }
    }, 300000);

    return () => {
      clearInterval(interval);
      clearInterval(patientRefreshInterval);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'patients') {
        loadAllPatients();
      } else if (activeTab === 'schedule' || activeTab === 'dashboard') {
        loadSchedule();
      } else if (activeTab === 'logs') {
        loadNurseLogs();
      }
    }
  }, [activeTab, currentUser]);

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return (w / (h * h)).toFixed(1);
  };

  const handleVitalsSubmit = async () => {
    if (!selectedPatient) return;
    // Require at least one vital to be filled in
    const hasAnyVital = Object.entries(vitalsForm).some(([k, v]) => k !== 'notes' && v && v.trim() !== '');
    if (!hasAnyVital) {
      alert('Please enter at least one vital sign before saving.');
      return;
    }
    try {
      setSavingAction(true);
      // Compute BMI from the form values here (not from JSX)
      const bmiVal = calculateBMI(vitalsForm.weight, vitalsForm.height);
      // Find if this patient is currently in the queue to link the vitals to this visit session
      const activeQueueEntry = queue.find(q => (q.patient_id === selectedPatient.id || (q.patient_name === `${selectedPatient.first_name} ${selectedPatient.last_name}`)) && q.status !== 'completed');
      
      const res = await recordPatientVitals(selectedPatient.id, {
         ...vitalsForm,
         bmi: bmiVal,
         patient_id: selectedPatient.id,
         nurse_id: currentUser?.id,
         queue_id: activeQueueEntry?.id
      });
      setPatientVitals([res, ...patientVitals]);
      setVitalsForm({
        temperature: '', weight: '', height: '', 
        blood_pressure: '', heart_rate: '', 
        respiratory_rate: '', spo2: '', notes: ''
      });
      setWeightCustom(false);
      setHeightCustom(false);
      alert("Triage/Vitals recorded successfully!");
      
      // Perform AI Analysis on the new vitals
      const aiResult = await analyzeVitalsAI(vitalsForm, patientVitals);
      if (aiResult && aiResult.is_problematic) {
        let aiMsg = "🚨 AI CLINICAL ALERT\n\n";
        aiMsg += aiResult.alerts.map(a => `• ${a}`).join("\n");
        if (aiResult.findings.length > 0) {
          aiMsg += "\n\n🔍 HISTORICAL CONTEXT:\n" + aiResult.findings.map(f => `• ${f}`).join("\n");
        }
        aiMsg += "\n\nRecommendation: " + aiResult.recommendation;
        alert(aiMsg);
      }
    } catch (err) {
      console.error("Failed to record vitals", err);
    } finally {
      setSavingAction(false);
    }
  };

  const loadTariff = async () => {
    try {
      const data = await fetchConsumables();
      setTariff(data);
    } catch (err) {
      console.error("Failed to load tariff", err);
    }
  };

  const handleSaveCharge = async () => {
    if (!selectedChargeItem || !selectedPatient) return;
    setSavingAction(true);
    try {
      const activeEntry = queue.find(q => q.patient_id === selectedPatient.id && q.status !== 'completed');
      
      await createPatientCharge(selectedPatient.id, {
        patient_id: selectedPatient.id,
        queue_id: activeEntry ? activeEntry.id : null,
        consumable_id: parseInt(selectedChargeItem),
        quantity: chargeQty,
        nurse_id: currentUser.id
      });
      
      const updatedCharges = await fetchPatientCharges(selectedPatient.id);
      setPatientCharges(updatedCharges);
      setSelectedChargeItem('');
      setChargeQty(1);
    } catch (err) {
      console.error("Failed to save charge", err);
    } finally {
      setSavingAction(false);
    }
  };

  const handlePatientClick = async (patientId) => {
    if (!patientId) return;
    setDetailLoading(true);
    setIsModalOpen(true);
    setModalTab('summary');
    try {
      const [detail, history, notes, meds, vitalsData, charges] = await Promise.all([
        fetchPatientDetail(patientId),
        fetchPatientVisits(patientId).catch(() => []),
        fetchObservationNotes(patientId).catch(() => []),
        fetchMedications(patientId).catch(() => []),
        fetchPatientVitals(patientId).catch(() => []),
        fetchPatientCharges(patientId).catch(() => [])
      ]);
      setSelectedPatient(detail);
      setPatientHistory(history);
      setObsNotes(notes);
      setObsMeds(meds);
      setPatientVitals(vitalsData);
      setPatientCharges(charges);
    } catch (err) {
      console.error("Failed to load patient details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedPatient) return;
    setSavingAction(true);
    try {
      const savedNote = await createObservationNote(selectedPatient.id, newNote, currentUser?.id);
      setObsNotes([savedNote, ...obsNotes]);
      setNewNote('');
    } catch (err) {
      alert("Failed to save note");
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveMed = async () => {
    if (!newMed.medication_name || !selectedPatient) return;
    setSavingAction(true);
    try {
      // Check for Allergy Risks via AI
      const allergyResult = await checkAllergyAI(newMed.medication_name, selectedPatient?.allergies);
      if (allergyResult && (allergyResult.risk === 'high' || allergyResult.risk === 'moderate')) {
        const proceed = window.confirm(`${allergyResult.warning}\n\nDo you want to override this warning and proceed?`);
        if (!proceed) {
           setSavingAction(false);
           return;
        }
      }

      const savedMed = await administerMedication(selectedPatient.id, {
        ...newMed,
        nurse_id: currentUser?.id
      });
      setObsMeds([savedMed, ...obsMeds]);
      setNewMed({ medication_name: '', dosage: '', route: '', notes: '' });
    } catch (err) {
      alert("Failed to save medication record");
    } finally {
      setSavingAction(false);
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

  const handleCallNext = async () => {
    if (!currentUser) return;
    try {
      const patient = await callNextPatient(currentUser.room_number || "Triage-1", currentUser.id);
      setServingPatient(patient);
      loadData();
    } catch (err) {
      alert("No patients waiting in your room/department.");
    }
  };

  const handleComplete = async (patientId) => {
    try {
      await completePatient(patientId);
      if (servingPatient && servingPatient.id === patientId) {
        setServingPatient(null);
      }
      loadData();
    } catch (err) {
      console.error("Failed to complete patient", err);
    }
  };

  const handleSkip = async (patientId) => {
    try {
      setSavingAction(true);
      await skipPatient(patientId);
      setLastAction({ type: 'skip', patientId });
      loadData();
    } catch (err) {
      alert("Failed to skip patient");
    } finally {
      setSavingAction(false);
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    try {
      setSavingAction(true);
      await undoPatientStatus(lastAction.patientId);
      setLastAction(null);
      loadData();
    } catch (err) {
      alert("Nothing to undo.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleCallRecommended = async () => {
    if (!recommendedPatient) {
       alert("No recommendation available.");
       return;
    }
    try {
      await callNextPatient(currentUser.room_number || "Triage-1", currentUser.id, recommendedPatient.id);
      setServingPatient(recommendedPatient);
      setLastAction({ type: 'call', patientId: recommendedPatient.id });
      loadData();
    } catch (err) {
      alert("Could not call recommended patient.");
    }
  };

  const filteredAllPatients = React.useMemo(() => allPatients.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );
  }), [allPatients, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredAllPatients.length / rowsPerPage);
  const currentPatients = filteredAllPatients.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (!currentUser) {
    return (
      <div className="login-screen-outer">
        <div className="login-container glass">
          <div className="login-brand">
            <img src="/logo.png" alt="Legacy Clinics" className="login-logo-img" />
            <h2>Legacy Clinics</h2>
            <p>Nursing Portal Access Control</p>
          </div>
          <div className="login-form">
            {error && (
              <div className="login-error-alert glass">
                <p>{error}</p>
                <button onClick={loadData} className="retry-btn">Retry Connection</button>
              </div>
            )}
            <div className="dropdown-container glass">
              <Users size={20} className="field-icon" />
              <select 
                className="premium-dropdown"
                value={selectedForLogin?.id || ""}
                onChange={(e) => {
                  const nurse = nurses.find(n => n.id === parseInt(e.target.value));
                  setSelectedForLogin(nurse);
                }}
              >
                <option value="" disabled>Select Your Profile...</option>
                {nurses.map(nurse => (
                  <option key={nurse.id} value={nurse.id}>{nurse.full_name}</option>
                ))}
              </select>
            </div>

            <div className="dropdown-container glass" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <MapPin size={20} className="field-icon" />
              <select 
                className="premium-dropdown"
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
              >
                <option value="" disabled>Select Working Station...</option>
                <option value="Station 1(GF)">Station 1(GF)</option>
                <option value="Station 2(1F)">Station 2(1F)</option>
                <option value="Station 3(PED)">Station 3(PED)</option>
              </select>
            </div>
            
            <AnimatePresence mode='wait'>
              {(selectedForLogin && selectedStation) ? (
                <motion.div 
                  key={selectedForLogin.id}
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="login-action-area"
                >
                  <div className="selected-nurse-brief">
                    <span>{selectedForLogin.role_title || "Clinical Staff"} • {selectedStation}</span>
                  </div>
                  <button className="primary-btn login-btn-large" onClick={() => handleLogin(selectedForLogin)}>
                    <span>Access Nursing Portal</span>
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="login-prompt-text"
                >
                  Please choose your identity and station.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="login-footer">
            <p>Authorized access only • Legacy Clinics QMS</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon">
            <img src="/w_logo.png" alt="Legacy Clinics" style={{ height: '32px', objectFit: 'contain' }} />
          </div>
          <h1>Legacy Clinics</h1>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            <Users size={20} />
            <span>Patients</span>
          </button>
          <button className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
            <CalendarDays size={20} />
            <span>My Schedule</span>
          </button>
          <button className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <Bell size={20} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="user-profile">
          {currentUser && (
            <>
              {currentUser.profile_picture ? (
                <img src={currentUser.profile_picture} alt="Avatar" className="avatar" />
              ) : (
                <div className="avatar-placeholder-sm">
                  {currentUser.full_name ? currentUser.full_name.split(' ').map(n=>n[0]).join('').toUpperCase() : 'N'}
                </div>
              )}
              <div className="user-info">
                <span className="user-name">{currentUser.full_name || currentUser.username}</span>
                <span className="user-role">
                  {currentUser.role_title || "Staff"} • 
                  {currentUser.room_number ? (currentUser.room_number.toLowerCase().includes('room') || currentUser.room_number.toLowerCase().includes('station') ? currentUser.room_number : `Room ${currentUser.room_number}`) : "Station"}
                </span>
              </div>
            </>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="top-title">
            <h2 className="tab-title-text">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          </div>
          <div className="top-actions">
            <div className="current-station glass shadow-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', color: '#065590', border: '1px solid rgba(6, 85, 144, 0.1)' }}>
              <MapPin size={18} />
              <span>{currentUser?.room_number || 'No Station'}</span>
            </div>
            <div className="sync-status">
              <div className="sync-indicator glass shadow-sm">
                 <span className={`sync-dot ${stats.total_waiting >= 0 ? 'synced' : 'pending'}`} />
                 <span>Sukraa: {stats.total_waiting >= 0 ? '🟢 Synced' : '🟡 Pending'}</span>
              </div>
            </div>
            <button className="icon-btn notification-btn" onClick={() => setActiveTab('notifications')}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            <div className="date-display">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' ? (
            <div className="dashboard-content">
              <div className="welcome-banner">
                <div>
                  <h2>{getGreeting()}{currentUser ? `, ${currentUser.full_name.split(' ')[0]}` : ''}! 👋</h2>
                  <p>There are {stats.total_waiting} patients waiting in the queue today.</p>
                </div>
                <div className="controls-row">
                    {lastAction && (
                        <button className="undo-btn" onClick={handleUndo} title="Undo last skip/call">
                           <RotateCcw size={18} />
                           Undo Action
                        </button>
                    )}
                    <button className="primary-btn pulse-glow" onClick={handleCallNext}>
                      <Stethoscope size={18} />
                      Call Next Patient
                    </button>
                </div>
              </div>

              {recommendedPatient && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="recommendation-banner"
                >
                    <div className="rec-text">
                        <p style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 700 }}>AI RECOMMENDATION</p>
                        <p><strong>{recommendedPatient.patient_name}</strong> is the optimal next patient based on urgency & wait time.</p>
                    </div>
                    <button className="recommend-btn" onClick={handleCallRecommended}>
                        <BrainCircuit size={18} />
                        Call Recommended
                    </button>
                </motion.div>
              )}

              <div className="stats-grid">
                <motion.div whileHover={{ y: -5 }} className="stat-card glass">
                  <div className="stat-icon red-glow">
                    <Clock size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{stats.total_waiting}</h3>
                    <p>Waiting Now</p>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="stat-card glass">
                  <div className="stat-icon green-glow">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{stats.total_completed}</h3>
                    <p>Finished Today</p>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="stat-card glass">
                  <div className="stat-icon blue-glow">
                    <Stethoscope size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{stats.total_calling}</h3>
                    <p>Actively Serving</p>
                  </div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="stat-card glass shadow-sm" style={{ background: '#f0f9ff' }}>
                  <div className="stat-icon" style={{ background: 'var(--brand-color)' }}>
                    <Activity size={24} color="white" />
                  </div>
                  <div className="stat-details">
                    <h3>{stats.avg_wait_time || 0}m</h3>
                    <p>Avg Wait Time</p>
                  </div>
                </motion.div>
              </div>

              <div className="dashboard-grid-row">
                <div className="dashboard-main-col">
                  <div className="queue-section">
                    <div className="section-header">
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3>Live Queue Overview ({filteredQueue.length})</h3>
                          <div className="status-badge waiting">Waiting</div>
                       </div>
                       <button className="text-btn" onClick={loadData}>Refresh Queue</button>
                    </div>
                    
                    <div className="queue-list">
                      <AnimatePresence>
                        {servingPatient && (
                          <div className="active-patient-container">
                            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3>Current Session</h3>
                                <div className="status-badge serving">Active</div>
                              </div>
                            </div>
                            <PatientTokenCard 
                              patient={servingPatient} 
                              onComplete={handleComplete} 
                              isLoading={savingAction}
                            />
                            
                            <div className="card-quick-actions" style={{ marginTop: '1.5rem' }}>
                              <button 
                                className="action-card-btn" 
                                style={{ width: '100%', color: '#1a1a1a', fontWeight: '500', marginBottom: '8px' }}
                                onClick={() => handlePatientClick(servingPatient.patient_id)}
                              >
                                <Eye size={18} /> View Clinical History
                              </button>
                              <button 
                                className="action-card-btn" 
                                style={{ width: '100%', color: '#1a1a1a', fontWeight: '500' }}
                                onClick={() => {
                                  handlePatientClick(servingPatient.patient_id);
                                  setModalTab('vitals');
                                }}
                              >
                                <Activity size={18} /> Record Vitals
                              </button>
                            </div>
                          </div>
                        )}

                        {filteredQueue.length === 0 && !servingPatient ? (
                          <div className="empty-state">
                            <p>No patients currently waiting.</p>
                          </div>
                        ) : (
                          filteredQueue.map((patient, idx) => (
                            <motion.div 
                              key={patient.id} 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`queue-item ${patient.priority_name === 'Emergency' ? 'high-priority' : ''} ${patient.status}`}
                              onClick={() => handlePatientClick(patient.patient_id)}
                            >
                              <div className="patient-info">
                                <div className={`status-indicator ${patient.status || 'waiting'}`} />
                                <div>
                                  <h4>
                                    {patient.patient_name} 
                                    <span className="patient-id">#{patient.token_number}</span>
                                    <Link 
                                      to={`/clinical-sheet/${patient.patient_id}?appt=${patient.id + 843000}&queue_id=${patient.id}`} 
                                      target="_blank" 
                                      className="appt-link"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {patient.id + 843000}
                                    </Link>
                                  </h4>
                                  <p className="patient-meta">
                                     {patient.priority_name === 'Emergency' && <span style={{ color: '#ef4444', fontWeight: 700, marginRight: '8px' }}>🚨 URGENT</span>}
                                     Age: {calculateAge(patient.patient_dob)} • Dept: {patient.target_dept}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="wait-time">
                                <Clock size={16} /> <span>{patient.wait_duration || 0} mins wait</span>
                              </div>

                              <div className="action-area">
                                <button className="skip-btn" onClick={(e) => { e.stopPropagation(); handleSkip(patient.id); }}>Skip</button>
                                <button className="call-btn" style={{ background: '#0ea5e9', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleCallNext(); }}>Call Patient</button>
                                <button className="icon-btn arrow-btn"><Eye size={20} /></button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="dashboard-side-col">
                  {/* Multi-Counter Status */}
                  <div className="dashboard-widget glass">
                    <div className="widget-header">
                      <h4><Activity size={18} /> Other Counter Activity</h4>
                    </div>
                    <div className="widget-body">
                      <div className="counters-sidebar">
                        {activeCounters.length > 0 ? activeCounters.map((counter, idx) => (
                           <div key={idx} className="counter-card shadow-sm">
                              <div className="counter-header">
                                 <span>{counter.room}</span>
                                 <span className="counter-status">{counter.status}</span>
                              </div>
                              <div className="counter-patient">
                                 {counter.patient_name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                 Served by {counter.doctor}
                              </div>
                           </div>
                        )) : (
                          <p className="empty-widget-text">No other active counters.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-widget glass">
                    <div className="widget-header">
                      <h4><MapPin size={18} /> Active Assignment</h4>
                    </div>
                    <div className="widget-body">
                      {mySchedule.find(s => new Date(s.date).toDateString() === new Date().toDateString()) ? (
                        <div className="assignment-brief">
                          <p className="primary-text"><strong>{mySchedule.find(s => new Date(s.date).toDateString() === new Date().toDateString()).department_name}</strong></p>
                          <p className="muted-text">{(currentUser.room_number && (currentUser.room_number.toLowerCase().includes('room') || currentUser.room_number.toLowerCase().includes('station'))) ? currentUser.room_number : `Room ${currentUser.room_number || 'Not Set'}`}</p>
                          <div className="time-badge">
                            {mySchedule.find(s => new Date(s.date).toDateString() === new Date().toDateString()).shift_label} Shift
                          </div>
                        </div>
                      ) : (
                        <p className="empty-widget-text">No shift assigned for today.</p>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-widget glass">
                    <div className="widget-header">
                      <h4><FileText size={18} /> Recent Clinical Activity</h4>
                    </div>
                    <div className="widget-body">
                      <div className="activity-mini-list">
                         <div className="activity-item-mini">
                            <span className="dot current" />
                            <div>
                               <p>Queue heart-beat active</p>
                               <span className="time">Just now</span>
                            </div>
                         </div>
                         <div className="activity-item-mini">
                            <span className="dot" />
                            <div>
                               <p>System sync completed</p>
                               <span className="time">5 mins ago</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'patients' ? (
            <div className="patients-registry-area">
              <div className="section-header-row">
                <div className="section-header">
                  <h3>Patient Master Registry ({filteredAllPatients.length})</h3>
                  <p>Database of all clinical patient records</p>
                </div>
                <div className="search-bar registry-search">
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by Name or PID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="registry-table-container glass">
                <table className="registry-excel-table">
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>Patient Name</th>
                      <th>Gender</th>
                      <th>Age</th>
                      <th>Date of Birth</th>
                      <th>Phone Number</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPatients.map(patient => (
                      <tr 
                        key={patient.id} 
                        onClick={() => handlePatientClick(patient.id)}
                        className="registry-row"
                      >
                        <td className="mrn-cell"><code>{patient.mrn}</code></td>
                        <td className="name-cell">
                          <div className="patient-name-wrapper">
                            <div className="avatar-micro">{patient.first_name[0]}{patient.last_name[0]}</div>
                            <span>{patient.first_name} {patient.last_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`gender-tag ${patient.gender?.toLowerCase()}`}>
                            {patient.gender}
                          </span>
                        </td>
                        <td><strong>{calculateAge(patient.date_of_birth)}</strong></td>
                        <td>{patient.date_of_birth || '—'}</td>
                        <td>{patient.phone_number || '—'}</td>
                        <td className="text-center">
                          <button 
                            className="view-mini-btn"
                            onClick={(e) => { e.stopPropagation(); handlePatientClick(patient.id); }}
                          >
                            <FileText size={14} /> Records
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAllPatients.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-table-msg">No patients found matching your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-bar glass">
                    <div className="pagination-info">
                      Showing <span>{(currentPage - 1) * rowsPerPage + 1}</span> - <span>{Math.min(currentPage * rowsPerPage, filteredAllPatients.length)}</span> of <span>{filteredAllPatients.length}</span>
                    </div>
                    <div className="pagination-actions">
                      <button 
                        className="page-btn" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      
                      <div className="page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          
                          return (
                            <button 
                              key={pageNum}
                              className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button 
                        className="page-btn" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'schedule' ? (
            <div className="schedule-area">
              <div className="schedule-header-row">
                <div className="section-header">
                  <h3>My Clinical Duty Roster</h3>
                  <p>Assigned shifts and workstation assignments</p>
                </div>
                <button className="primary-btn" onClick={loadSchedule}>
                  <RotateCcw size={18} /> Refresh Roster
                </button>
              </div>
              
              <div className="duty-calendar-grid">
                {mySchedule.length === 0 ? (
                  <div className="empty-state glass" style={{ gridColumn: '1 / -1' }}>
                    <CalendarDays size={48} className="muted-icon" />
                    <p>No shifts found in the current roster.</p>
                  </div>
                ) : (
                  mySchedule.map(shift => {
                    const shiftDate = new Date(shift.date);
                    const isPast = shiftDate < new Date().setHours(0,0,0,0);
                    return (
                      <motion.div 
                        key={shift.id} 
                        className={`schedule-card glass ${isPast ? 'past' : 'upcoming'} shift-${shift.shift_label?.toLowerCase()}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="shift-date-stack">
                           <div className="day-badge">{shiftDate.toLocaleDateString(undefined, { weekday: 'long' })}</div>
                           <span className="notif-time-large">{shiftDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        
                        <div className="shift-time-block">
                           <Clock size={20} color="var(--brand-color)" />
                           <span>{shift.shift_start_time.slice(0, 5)} - {shift.shift_end_time.slice(0, 5)}</span>
                           <span className="shift-badge">{shift.shift_label}</span>
                        </div>

                        <div className="shift-meta-pills">
                           <div className="meta-pill">
                              <MapPin size={14} />
                              {shift.department_name}
                           </div>
                           {shift.unit_name && (
                             <div className="meta-pill">
                               <Users size={14} />
                               {shift.unit_name}
                             </div>
                           )}
                           <div className="meta-pill" style={{ color: 'var(--brand-color)', background: 'rgba(6, 85, 144, 0.05)', borderColor: 'rgba(6, 85, 144, 0.1)' }}>
                              <Info size={14} />
                              {shift.room_number ? `Station ${shift.room_number}` : 'No Station Linked'}
                           </div>
                        </div>

                        {isPast && <div className="past-overlay">Archived Shift</div>}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="logs-area">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>My Clinical Logs</h3>
                <button className="icon-btn" onClick={loadNurseLogs} title="Refresh Logs"><Activity size={18}/></button>
              </div>
              <div className="history-scroll-large" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', paddingRight: '10px' }}>
                {nurseLogs.length === 0 ? (
                  <p className="muted-text text-center">No logs recorded yet.</p>
                ) : (
                  nurseLogs.map((log, idx) => (
                    <div key={idx} className="history-item-large shadow-sm" style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '12px', background: 'var(--surface-color)', borderLeft: `4px solid ${log.type === 'vital' ? '#065590' : log.type === 'note' ? '#3B82F6' : '#10B981'}` }}>
                      <div className="h-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div className="h-date-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {log.type === 'vital' ? <HeartPulse size={16} color="#065590" /> : log.type === 'note' ? <Info size={16} color="#3B82F6" /> : <Activity size={16} color="#10B981" />}
                          <span className="h-date" style={{ fontWeight: 600 }}>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="visit-type-badge">{log.type.toUpperCase()}</span>
                      </div>
                      <div className="log-details" style={{ fontSize: '0.9rem' }}>
                        <p style={{ margin: '0 0 8px 0' }}><strong>Patient:</strong> {log.patient_name} (PID: {log.mrn})</p>
                        {log.type === 'vital' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'var(--bg-color)', padding: '8px', borderRadius: '8px' }}>
                            <span>BP: {log.data.blood_pressure || '--'}</span>
                            <span>Temp: {log.data.temperature ? log.data.temperature + '°C' : '--'}</span>
                            <span>HR: {log.data.heart_rate || '--'}</span>
                            <span>SpO2: {log.data.spo2 ? log.data.spo2 + '%' : '--'}</span>
                          </div>
                        )}
                        {log.type === 'note' && (
                          <p style={{ fontStyle: 'italic', background: 'var(--bg-color)', padding: '8px', borderRadius: '8px', margin: 0 }}>"{log.data.content}"</p>
                        )}
                        {log.type === 'med' && (
                          <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: '8px' }}>
                            <strong>{log.data.medication_name}</strong> - {log.data.dosage} ({log.data.route})
                            {log.data.notes && <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>Note: {log.data.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="settings-area">
              <div className="section-header">
                <h3>Settings & Profile</h3>
              </div>
              <div className="settings-grid">
                {/* Profile Card */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="settings-card glass profile-main-card"
                >
                  <div className="card-header">
                    <h4>Clinical Identity</h4>
                  </div>
                  <div className="profile-edit-form">
                    {currentUser && (
                      <>
                        <div className="current-user-banner">
                          <div className="avatar-edit-wrapper">
                            <img src={currentUser.profile_picture || "https://i.pravatar.cc/150?u=nurse"} alt="" className="avatar-xl" />
                            <div className="avatar-overlay">
                              <label htmlFor="pfp-upload" className="pfp-label">
                                <Camera size={24} />
                              </label>
                              <input 
                                id="pfp-upload" 
                                type="file" 
                                hidden 
                                accept="image/*"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    try {
                                      setSavingAction(true);
                                      const res = await uploadUserProfilePicture(currentUser.id, e.target.files[0]);
                                      setCurrentUser({...currentUser, profile_picture: res.profile_picture});
                                    } catch(err) {
                                      alert("Upload failed.");
                                    } finally {
                                      setSavingAction(false);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div className="user-details">
                            <h5>{currentUser.full_name}</h5>
                            <span className="user-role-badge">{currentUser.role_title}</span>
                            <p className="muted-text">Staff ID: {currentUser.id} • Rwanda MOH Certified</p>
                          </div>
                        </div>
                        <div className="setting-input-group">
                          <label>Workstation/Room</label>
                          <div className="input-with-action">
                            <input 
                              type="text" 
                              placeholder="e.g. Room 1" 
                              value={currentUser.room_number || ''} 
                              onChange={(e) => setCurrentUser({...currentUser, room_number: e.target.value})}
                            />
                            <button className="primary-btn" onClick={async () => {
                              try {
                                setSavingAction(true);
                                const res = await updateUserRoom(currentUser.id, currentUser.room_number);
                                // Sync local state and storage to avoid UI duplication or reversion
                                const updatedUser = {...currentUser, room_number: res.room_number};
                                setCurrentUser(updatedUser);
                                localStorage.setItem('nursing_portal_user', JSON.stringify(updatedUser));
                                alert("Workstation setting saved!");
                              } catch(e) {
                                alert("Failed to save setting.");
                              } finally {
                                setSavingAction(false);
                              }
                            }}>
                              {savingAction ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                          <p className="helper-text">This room is displayed on screens when you call a patient.</p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Notifications & Toggles */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="settings-card glass"
                >
                  <div className="card-header">
                    <h4>Clinical Preferences</h4>
                  </div>
                  <div className="preferences-stack">
                    <div className="pref-row">
                      <div className="pref-text">
                        <h5>Alert Sound</h5>
                        <p>Play sound for emergency arrivals</p>
                      </div>
                      <div className="toggle-wrapper">
                        <input type="checkbox" id="alert-sound" defaultChecked />
                        <label htmlFor="alert-sound" className="check-label"></label>
                      </div>
                    </div>
                    <div className="pref-row">
                      <div className="pref-text">
                        <h5>Dashboard Auto-refresh</h5>
                        <p>Automatically update patient queue</p>
                      </div>
                      <div className="toggle-wrapper">
                        <input type="checkbox" id="auto-refresh" defaultChecked />
                        <label htmlFor="auto-refresh" className="check-label"></label>
                      </div>
                    </div>
                    <div className="pref-row">
                      <div className="pref-text">
                        <h5>Dark Mode Sync</h5>
                        <p>Follow system UI theme</p>
                      </div>
                      <div className="toggle-wrapper">
                        <input type="checkbox" id="dark-mode" defaultChecked />
                        <label htmlFor="dark-mode" className="check-label"></label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : activeTab === 'notifications' ? (
            <div className="notifications-portal-area">
              <div className="section-header-row">
                <div className="section-header">
                  <h3>Clinical Alerts & Notifications</h3>
                  <p>Permanent audit trail of emergency and system events</p>
                </div>
                <div className="notif-filters glass">
                  <button className={`filter-chip ${notifFilter === 'all' ? 'active' : ''}`} onClick={() => setNotifFilter('all')}>All</button>
                  <button className={`filter-chip ${notifFilter === 'emergency' ? 'active' : ''}`} onClick={() => setNotifFilter('emergency')}>Emergencies</button>
                  <button className={`filter-chip ${notifFilter === 'death' ? 'active' : ''}`} onClick={() => setNotifFilter('death')}>Incident Reports</button>
                  <button className={`filter-chip ${notifFilter === 'legal' ? 'active' : ''}`} onClick={() => setNotifFilter('legal')}>Medicolegal</button>
                </div>
              </div>
              
              <div className="notif-list-large">
                {notifications.filter(n => notifFilter === 'all' || n.type === notifFilter).length === 0 ? (
                  <div className="empty-state glass">
                    <Bell size={48} className="muted-icon" />
                    <p>No notifications matching your filter.</p>
                  </div>
                ) : (
                  notifications.filter(n => notifFilter === 'all' || n.type === notifFilter).map(notif => (
                    <motion.div 
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`notif-card-large glass ${!notif.is_read ? 'unread' : ''}`}
                    >
                      <div className={`notif-icon-large ${notif.type}`}>
                        {notif.type === 'emergency' ? <Activity size={24} /> : 
                         notif.type === 'death' ? <FileText size={24} /> : 
                         notif.type === 'legal' ? <ClipboardList size={24} /> : <Bell size={24} />}
                      </div>
                      <div className="notif-content-large">
                        <div className="notif-header-large">
                          <h4>{notif.title}</h4>
                          <span className="notif-time-large">{new Date(notif.created_at).toLocaleString()}</span>
                        </div>
                        <p className="notif-msg-large">{notif.message}</p>
                        <div className="notif-meta-large">
                          {notif.patient_name && <span>Patient: <strong>{notif.patient_name}</strong></span>}
                          {notif.room_number && <span>Station: <strong>{notif.room_number}</strong></span>}
                          <span>Status: <strong>{notif.is_read ? 'Archived' : 'New'}</strong></span>
                        </div>
                      </div>
                      {!notif.is_read && (
                        <button className="notif-mark-read" onClick={() => handleMarkRead(notif.id)}>Mark Archive</button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Module coming soon...</p>
            </div>
          )}
        </div>
      </main>


      {/* Patient Detail Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="patient-modal" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Patient Records</h3>
                <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
              </div>
              
              {detailLoading ? (
                <div className="loader-container"><div className="loader" /></div>
              ) : selectedPatient ? (
                <div className="modal-body">
                  <div className="detail-section main-info">
                    <div className="avatar-large">
                      {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                    </div>
                    <div className="patient-header-info">
                      <h2>{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                      <p className="mrn-badge">PID: {selectedPatient.mrn}</p>
                      <div className="meta-grid">
                        <div className="meta-item"><Users size={16}/> <span>{selectedPatient.gender}</span></div>
                        <div className="meta-item"><CalendarDays size={16}/> <span>{selectedPatient.date_of_birth || 'N/A'}</span></div>
                        <div className="meta-item"><Bell size={16}/> <span>{selectedPatient.phone_number}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-tabs">
                    <button className={`m-tab ${modalTab === 'summary' ? 'active' : ''}`} onClick={() => setModalTab('summary')}>
                      <Info size={16} /> Summary
                    </button>
                    <button className={`m-tab ${modalTab === 'observation' ? 'active' : ''}`} onClick={() => setModalTab('observation')}>
                       <ClipboardList size={16} /> Observations
                    </button>
                    <button className={`m-tab ${modalTab === 'vitals' ? 'active' : ''}`} onClick={() => setModalTab('vitals')}>
                       <Stethoscope size={16} /> Triage / Vitals
                    </button>
                    <button className={`m-tab ${modalTab === 'billing' ? 'active' : ''}`} onClick={() => setModalTab('billing')}>
                       <ShoppingCart size={16} /> Used Consumables
                    </button>
                    <button className={`m-tab ${modalTab === 'medication' ? 'active' : ''}`} onClick={() => setModalTab('medication')}>
                       <Pill size={16} /> Medications
                    </button>
                    <button className={`m-tab ${modalTab === 'clinical_sheet' ? 'active' : ''}`} onClick={() => setModalTab('clinical_sheet')}>
                       <FileText size={16} /> Clinical Sheet
                    </button>
                    <button className={`m-tab ${modalTab === 'visits' ? 'active' : ''}`} onClick={() => setModalTab('visits')}>
                       <History size={16} /> Visit History
                    </button>
                  </div>

                  <div className="detail-content-area">
                    {modalTab === 'summary' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="detail-content-grid">
                        <div className="clinical-history">
                          <h4>Clinical Summary</h4>
                          <div className="info-card">
                            <label>Allergies</label>
                            <p className={selectedPatient.allergies ? 'warning-text' : 'muted-text'}>
                              {selectedPatient.allergies || 'No known allergies'}
                            </p>
                          </div>
                          <div className="info-card">
                            <label>Current Medical Notes</label>
                            <p>{selectedPatient.medical_notes || 'No notes available'}</p>
                          </div>
                          <div className="info-card">
                            <label>Insurance Provider</label>
                            <p className="insurance-badge">{selectedPatient.insurance || 'Self Pay / Cash'}</p>
                          </div>
                        </div>

                        <div className="quick-actions">
                          <h4>Quick Actions</h4>
                          <div className="actions-stack">
                            <button className="action-card-btn" style={{ color: '#1a1a1a', fontWeight: '500' }} onClick={() => setModalTab('vitals')}>
                              <Plus size={18} /> Perform Triage / Vitals
                            </button>
                            <button className="action-card-btn" style={{ color: '#1a1a1a', fontWeight: '500' }} onClick={() => setModalTab('observation')}>
                              <Plus size={18} /> Add Observation Note
                            </button>
                            <button className="action-card-btn" style={{ color: '#1a1a1a', fontWeight: '500' }} onClick={() => setModalTab('medication')}>
                              <Plus size={18} /> Record Medication
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'observation' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tab-section">
                        <h4>Nursing Observation Notes</h4>
                        <div className="note-form glass">
                          <textarea 
                            placeholder="Type clinical observation here..." 
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                          />
                          <button 
                            className="primary-btn" 
                            onClick={handleSaveNote}
                            disabled={savingAction || !newNote.trim()}
                          >
                            {savingAction ? 'Saving...' : 'Add Observation'}
                          </button>
                        </div>
                        <div className="records-list">
                          {obsNotes.map(note => (
                            <div key={note.id} className="record-item">
                              <div className="record-header">
                                <span className="record-nurse">{note.nurse_name}</span>
                                <span className="record-date">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="record-content">{note.content}</p>
                            </div>
                          ))}
                          {obsNotes.length === 0 && <p className="muted-text">No observation records yet.</p>}
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'medication' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tab-section">
                        <h4>Medication Administration Record (MAR)</h4>
                        <div className="med-form glass">
                          <div className="form-row">
                            <input 
                              type="text" 
                              placeholder="Medication Name" 
                              value={newMed.medication_name}
                              onChange={(e) => setNewMed({...newMed, medication_name: e.target.value})}
                            />
                            <input 
                              type="text" 
                              placeholder="Dosage (e.g. 500mg)" 
                              value={newMed.dosage}
                              onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                            />
                          </div>
                          <div className="form-row">
                            <select 
                              value={newMed.route}
                              onChange={(e) => setNewMed({...newMed, route: e.target.value})}
                            >
                              <option value="">Select Route</option>
                              <option value="Oral">Oral</option>
                              <option value="IV">Intravenous (IV)</option>
                              <option value="IM">Intramuscular (IM)</option>
                              <option value="Topical">Topical</option>
                              <option value="SC">Subcutaneous</option>
                            </select>
                            <input 
                              type="text" 
                              placeholder="Brief Notes" 
                              value={newMed.notes}
                              onChange={(e) => setNewMed({...newMed, notes: e.target.value})}
                            />
                          </div>
                          <button 
                            className="primary-btn" 
                            onClick={handleSaveMed}
                            disabled={savingAction || !newMed.medication_name}
                          >
                            {savingAction ? 'Recording...' : 'Record Administration'}
                          </button>
                        </div>
                        <div className="records-list">
                          {obsMeds.map(med => (
                            <div key={med.id} className="record-item med">
                              <div className="record-header">
                                <span className="record-nurse">{med.nurse_name}</span>
                                <span className="record-date">{new Date(med.administered_at).toLocaleString()}</span>
                              </div>
                              <div className="record-med-details">
                                <Pill size={16} />
                                <strong>{med.medication_name}</strong> - {med.dosage} ({med.route})
                              </div>
                              {med.notes && <p className="record-content">Note: {med.notes}</p>}
                            </div>
                          ))}
                          {obsMeds.length === 0 && <p className="muted-text">No medication records yet.</p>}
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'vitals' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tab-section">
                        <h4>Patient Triage & Vitals</h4>
                        <div className="vitals-form glass">
                          <div className="form-grid-3">
                             <div className="v-input">
                               <label><Thermometer size={14}/> TEMP (°C)</label>
                               <div className="ai-input-group">
                                 <input type="text" value={vitalsForm.temperature} onChange={(e) => setVitalsForm({...vitalsForm, temperature: e.target.value})} />
                                 <button title="Suggest" onClick={() => setVitalsForm({...vitalsForm, temperature: '36.5'})}><BrainCircuit size={14}/></button>
                               </div>
                             </div>
                             <div className="v-input">
                               <label><Weight size={14}/> WEIGHT (KG)</label>
                               {weightCustom ? (
                                 <div className="ai-input-group">
                                   <input 
                                     type="text" 
                                     placeholder="Enter Weight" 
                                     autoFocus 
                                     value={vitalsForm.weight}
                                     onChange={(e) => setVitalsForm({...vitalsForm, weight: e.target.value})} 
                                   />
                                   <button title="Reset" onClick={() => { setVitalsForm({...vitalsForm, weight: ''}); setWeightCustom(false); }}>×</button>
                                 </div>
                               ) : (
                                 <select 
                                   value={vitalsForm.weight} 
                                   onChange={(e) => {
                                     if (e.target.value === 'custom') {
                                       setWeightCustom(true);
                                       setVitalsForm({...vitalsForm, weight: ''});
                                     } else {
                                       setVitalsForm({...vitalsForm, weight: e.target.value});
                                     }
                                   }}
                                 >
                                   <option value="">Select Weight</option>
                                   {[...Array(200).keys()].map(n => (
                                     <option key={n} value={n + 1}>{n + 1} kg</option>
                                   ))}
                                   <option value="custom">Other / Custom...</option>
                                 </select>
                               )}
                             </div>
                             <div className="v-input">
                               <label><Ruler size={14}/> HEIGHT (CM)</label>
                               {heightCustom ? (
                                 <div className="ai-input-group">
                                   <input 
                                     type="text" 
                                     placeholder="Enter Height" 
                                     autoFocus 
                                     value={vitalsForm.height}
                                     onChange={(e) => setVitalsForm({...vitalsForm, height: e.target.value})} 
                                   />
                                   <button title="Reset" onClick={() => { setVitalsForm({...vitalsForm, height: ''}); setHeightCustom(false); }}>×</button>
                                 </div>
                               ) : (
                                 <select 
                                   value={vitalsForm.height} 
                                   onChange={(e) => {
                                     if (e.target.value === 'custom') {
                                       setHeightCustom(true);
                                       setVitalsForm({...vitalsForm, height: ''});
                                     } else {
                                       setVitalsForm({...vitalsForm, height: e.target.value});
                                     }
                                   }}
                                 >
                                   <option value="">Select Height</option>
                                   {[...Array(150).keys()].map(n => (
                                     <option key={n} value={n + 100}>{n + 100} cm</option>
                                   ))}
                                   <option value="custom">Other / Custom...</option>
                                 </select>
                               )}
                             </div>
                          </div>
                          <div className="form-grid-3">
                             <div className="v-input">
                               <label><Activity size={14}/> BLOOD PRESSURE</label>
                               <div className="ai-input-group">
                                 <input type="text" value={vitalsForm.blood_pressure} onChange={(e) => setVitalsForm({...vitalsForm, blood_pressure: e.target.value})} />
                                 <button title="Suggest" onClick={() => setVitalsForm({...vitalsForm, blood_pressure: '120/80'})}><BrainCircuit size={14}/></button>
                               </div>
                             </div>
                             <div className="v-input">
                               <label><HeartPulse size={14}/> HEART RATE (BPM)</label>
                               <div className="ai-input-group">
                                 <input type="text" value={vitalsForm.heart_rate} onChange={(e) => setVitalsForm({...vitalsForm, heart_rate: e.target.value})} />
                                 <button title="Suggest" onClick={() => setVitalsForm({...vitalsForm, heart_rate: '72'})}><BrainCircuit size={14}/></button>
                               </div>
                             </div>
                             <div className="v-input">
                               <label><Info size={14}/> SPO2 (%)</label>
                               <select value={vitalsForm.spo2} onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})}>
                                 <option value="">Select SPO2</option>
                                 {[...Array(30).keys()].map(n => (
                                   <option key={n} value={100 - n}>{100 - n}%</option>
                                 ))}
                               </select>
                             </div>
                          </div>
                          <div className="form-grid-3">
                             <div className="v-input">
                               <label><Wind size={14}/> RESPIRATION RATE (BPM)</label>
                               <div className="ai-input-group">
                                 <input 
                                   type="text" 
                                   placeholder="e.g. 16"
                                   value={vitalsForm.respiratory_rate} 
                                   onChange={(e) => setVitalsForm({...vitalsForm, respiratory_rate: e.target.value})} 
                                 />
                                 <button title="Normal" onClick={() => setVitalsForm({...vitalsForm, respiratory_rate: '18'})}><BrainCircuit size={14}/></button>
                               </div>
                             </div>
                          </div>
                          <div className="bmi_calc_row">
                             <div className="bmi_tag">
                                BMI: <strong>{calculateBMI(vitalsForm.weight, vitalsForm.height) || '--'}</strong>
                             </div>
                             <button className="primary-btn triage-submit-btn" onClick={handleVitalsSubmit} disabled={savingAction}>
                                {savingAction ? 'Saving...' : 'Record Vitals'}
                             </button>
                          </div>
                        </div>

                        <div className="records-list grouped-vitals">
                           {patientVitals.length === 0 ? (
                             <p className="muted-text">No triage records found for this patient.</p>
                           ) : (
                             Object.entries(patientVitals.reduce((groups, v) => {
                               const date = new Date(v.recorded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                               if (!groups[date]) groups[date] = [];
                               groups[date].push(v);
                               return groups;
                             }, {})).map(([date, vitals]) => (
                               <div key={date} className="vitals-date-group">
                                 <div className="vitals-group-header">
                                   <CalendarDays size={14} />
                                   <span>{date}</span>
                                 </div>
                                 {vitals.map(v => (
                                   <div key={v.id} className="record-item triage-card shadow-sm">
                                      <div className="record-header">
                                         <span className="record-nurse">{v.nurse_name}</span>
                                         <span className="record-time">{new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <div className="vitals-summary-grid">
                                         <div className="v-summary-item">BP: <strong>{v.blood_pressure || '--'}</strong></div>
                                         <div className="v-summary-item">Temp: <strong>{v.temperature}°C</strong></div>
                                         <div className="v-summary-item">SpO2: <strong>{v.spo2}%</strong></div>
                                         <div className="v-summary-item">BMI: <strong>{v.bmi || '--'}</strong></div>
                                         <div className="v-summary-item">HR: <strong>{v.heart_rate || '--'}</strong></div>
                                         <div className="v-summary-item">Resp: <strong>{v.respiratory_rate || '--'}</strong></div>
                                      </div>
                                   </div>
                                 ))}
                               </div>
                             ))
                           )}
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'billing' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tab-section">
                        <h4>Inventory / Used Consumables</h4>
                        <div className="billing-form glass">
                          <div className="form-row" style={{ gap: '12px', display: 'flex', alignItems: 'center' }}>
                            <select 
                              value={selectedChargeItem}
                              onChange={(e) => setSelectedChargeItem(e.target.value)}
                              style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            >
                              <option value="">Select Item Used...</option>
                              {tariff.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '0.8rem', color: '#666' }}>Qty:</label>
                              <input 
                                type="number" 
                                min="1"
                                value={chargeQty}
                                onChange={(e) => setChargeQty(parseInt(e.target.value) || 1)}
                                style={{ width: '70px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                              />
                            </div>
                            <button 
                              className="primary-btn" 
                              onClick={handleSaveCharge}
                              disabled={savingAction || !selectedChargeItem}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <Plus size={16} /> {savingAction ? 'Recording...' : 'Record Usage'}
                            </button>
                          </div>
                        </div>

                        <div className="records-list charges-list">
                           {patientCharges.length === 0 ? (
                             <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0', marginTop: '20px' }}>
                               <ShoppingCart size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                               <p className="muted-text">No consumables or items recorded for this visit.</p>
                             </div>
                           ) : (
                             <div className="billing-summary" style={{ marginTop: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                               <div className="billing-items-header" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '0.85rem', color: '#475569' }}>
                                 <span>Item Description</span>
                                 <span style={{ textAlign: 'center' }}>Quantity</span>
                                 <span style={{ textAlign: 'right' }}>Recorded At</span>
                               </div>
                               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                 {patientCharges.map((charge, idx) => (
                                   <div key={charge.id} className="billing-item-row" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', padding: '15px 20px', borderBottom: idx === patientCharges.length - 1 ? 'none' : '1px solid #f1f5f9', alignItems: 'center', transition: 'background 0.2s' }}>
                                     <div className="b-item-name">
                                       <div style={{ fontWeight: '600', color: '#1e293b' }}>{charge.consumable_name}</div>
                                       <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recorded by {charge.nurse_name}</div>
                                     </div>
                                     <div style={{ textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{charge.quantity}</div>
                                     <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>{new Date(charge.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                   </div>
                                 ))}
                               </div>
                               <div className="billing-total-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                                 <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>End of usage logs for current visit</span>
                               </div>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'visits' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="visit-history-tab">
                        <h4>Complete Visit History</h4>
                        <div className="history-scroll-large">
                          {patientHistory.length === 0 ? (
                            <p className="muted-text">No previous visits recorded.</p>
                          ) : (
                            patientHistory.map(visit => (
                                <div key={visit.id} className="history-item-large shadow-sm">
                                  <div className="h-header">
                                    <div className="h-date-group">
                                      <CalendarDays size={14}/>
                                      <span className="h-date">{new Date(visit.visit_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    <span className="visit-type-badge">{visit.visit_type}</span>
                                    <span className="dept-name">{visit.department}</span>
                                  </div>
                                  <div className="h-body">
                                    <div className="h-entry-row">
                                      <div className="h-entry">
                                        <label>Diagnosis</label>
                                        <p>{visit.diagnosis || 'No diagnosis recorded'}</p>
                                      </div>
                                      <div className="h-entry">
                                        <label>Prescription</label>
                                        <p>{visit.prescription || 'No prescription recorded'}</p>
                                      </div>
                                    </div>
                                    
                                    {/* Link and display vitals for this visit if they exist */}
                                    {patientVitals.filter(v => v.visit_id === visit.id).length > 0 && (
                                      <div className="h-entry-vitals-inline">
                                        <label>Triaged Vitals for this visit:</label>
                                        <div className="v-pills-container">
                                          {patientVitals.filter(v => v.visit_id === visit.id).map(v => (
                                            <div key={v.id} className="v-pill-micro">
                                              <span>{v.temperature}°C</span>
                                              <span>{v.blood_pressure} BP</span>
                                              <span>{v.heart_rate} HR</span>
                                              <span>{v.spo2}% SpO2</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}

                    {modalTab === 'clinical_sheet' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tab-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0 }}>Patient Observation Records Sheet</h4>
                          <Link to={`/clinical-sheet/${selectedPatient.id}?queue_id=${activeQueueEntry?.id}`} target="_blank" className="primary-btn" style={{ fontSize: '0.85rem', padding: '6px 12px', background: 'var(--brand-color)', color: 'white' }}>
                            <FileText size={16} /> Open in New Page
                          </Link>
                        </div>
                        <div className="clinical-report-container">
                          <h3 className="report-title-main">Patient Observation Records</h3>

                          <div className="patient-id-block">
                            <div className="block-header-blue">I. Patient Identification</div>
                            <div className="info-grid-row">
                              <div className="info-cell">
                                <span className="info-label">Last name</span>
                                <input value={selectedPatient.last_name || ''} readOnly />
                              </div>
                              <div className="info-cell">
                                <span className="info-label">First name</span>
                                <input value={selectedPatient.first_name || ''} readOnly />
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
                                <input value={selectedPatient.date_of_birth || ''} readOnly />
                              </div>
                              <div className="info-cell">
                                <span className="info-label">Gender</span>
                                <input value={selectedPatient.gender || ''} readOnly />
                              </div>
                            </div>
                            <div className="info-grid-row">
                              <div className="info-cell">
                                <span className="info-label">Patient ID (PID)</span>
                                <input value={selectedPatient.mrn || ''} readOnly />
                              </div>
                              <div className="info-cell">
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
                            <button className="primary-btn" style={{ marginTop: '10px' }} onClick={addProgressNoteRow}>
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
                                    <td>
                                      <input
                                        value={row.time}
                                        onChange={(e) => updateAdminRow(idx, 'time', e.target.value)}
                                        placeholder="HH:MM"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        value={row.initials}
                                        onChange={(e) => updateAdminRow(idx, 'initials', e.target.value)}
                                        placeholder="Initials"
                                      />
                                    </td>
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
                                    <td>
                                      <input
                                        value={row.initials}
                                        onChange={(e) => updateInitialInterpretation(idx, 'initials', e.target.value)}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        value={row.full_name}
                                        onChange={(e) => updateInitialInterpretation(idx, 'full_name', e.target.value)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button className="primary-btn" style={{ marginTop: '10px' }} onClick={addInitialInterpretationRow}>
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
                    )}
                  </div>
                </div>
              ) : (
                <div className="error-state">Failed to load patient details.</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      } />
      <Route path="/clinical-sheet/:patientId" element={<ClinicalSheetPage />} />
    </Routes>
  );
}

