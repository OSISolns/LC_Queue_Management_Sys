import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  checkAllergyAI
} from './services/api';
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
  Activity
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [nurses, setNurses] = useState([]);
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
  const [modalTab, setModalTab] = useState('summary'); // summary, observation, medication, visits
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
  const [patientVitals, setPatientVitals] = useState([]);
  const [savingAction, setSavingAction] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('nursing_portal_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedForLogin, setSelectedForLogin] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedForLogin(null);
    localStorage.removeItem('nursing_portal_user');
    setActiveTab('dashboard'); // Reset tab
  };

  const handleLogin = (nurse) => {
    setCurrentUser(nurse);
    localStorage.setItem('nursing_portal_user', JSON.stringify(nurse));
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
      setLoading(false);
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

  useEffect(() => {
    loadData();
    // Poll every 5 seconds for updates (simple fallback to websockets for now)
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'patients') {
        loadAllPatients();
      } else if (activeTab === 'schedule' || activeTab === 'dashboard') {
        loadSchedule();
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

  const handlePatientClick = async (patientId) => {
    if (!patientId) return;
    setDetailLoading(true);
    setIsModalOpen(true);
    setModalTab('summary');
    try {
      const [detail, history, notes, meds, vitalsData] = await Promise.all([
        fetchPatientDetail(patientId),
        fetchPatientVisits(patientId).catch(() => []),
        fetchObservationNotes(patientId).catch(() => []),
        fetchMedications(patientId).catch(() => []),
        fetchPatientVitals(patientId).catch(() => [])
      ]);
      setSelectedPatient(detail);
      setPatientHistory(history);
      setObsNotes(notes);
      setObsMeds(meds);
      setPatientVitals(vitalsData);
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

  const filteredQueue = queue.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.token_number && p.token_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAllPatients = allPatients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            
            <AnimatePresence mode='wait'>
              {selectedForLogin ? (
                <motion.div 
                  key={selectedForLogin.id}
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="login-action-area"
                >
                  <div className="selected-nurse-brief">
                    <span>{selectedForLogin.role_title || "Clinical Staff"}</span>
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
                  Please choose your identity to enter the station.
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
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon">
            <HeartPulse size={28} color="#fff" />
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
                  {currentUser.room_number ? (currentUser.room_number.toLowerCase().includes('room') ? currentUser.room_number : `Room ${currentUser.room_number}`) : "Station"}
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
            <button className="icon-btn notification-btn">
              <Bell size={20} />
              {stats.total_waiting > 0 && <span className="badge">{stats.total_waiting}</span>}
            </button>
            <div className="date-display">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' ? (
            <>
              <div className="welcome-banner">
                <div>
                  <h2>{getGreeting()}{currentUser ? `, ${currentUser.full_name.split(' ')[0]}` : ''}! 👋</h2>
                  <p>There are {stats.total_waiting} patients waiting in the queue today.</p>
                </div>
                <button className="primary-btn pulse-glow" onClick={handleCallNext}>
                  <Stethoscope size={18} />
                  Call Next Patient
                </button>
              </div>

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
              </div>

              <div className="dashboard-grid-row">
                <div className="dashboard-main-col">
                  <div className="queue-section">
                    <div className="section-header">
                      <h3>Live Queue Overview ({filteredQueue.length})</h3>
                      <button className="text-btn" onClick={loadData}>Refresh Queue</button>
                    </div>
                    
                    <div className="queue-list">
                      <AnimatePresence>
                        {servingPatient && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="queue-item active-serving"
                            onClick={() => handlePatientClick(servingPatient.patient_id)}
                          >
                            <div className="patient-info">
                              <div className="status-indicator serving" />
                              <div>
                                <h4>{servingPatient.patient_name} <span className="patient-id">#{servingPatient.token_number}</span></h4>
                                <p className="patient-meta">NOW SERVING • {(servingPatient.room_number && servingPatient.room_number.toLowerCase().includes('room')) ? servingPatient.room_number : `Room ${servingPatient.room_number}`}</p>
                              </div>
                            </div>
                            <div className="action-area">
                              <button className="complete-btn" onClick={(e) => { e.stopPropagation(); handleComplete(servingPatient.id); }}>Complete Consultation</button>
                            </div>
                          </motion.div>
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
                              className={`queue-item ${patient.priority_name === 'Emergency' ? 'high-priority' : ''}`}
                              onClick={() => handlePatientClick(patient.patient_id)}
                            >
                              <div className="patient-info">
                                <div className="status-indicator waiting" />
                                <div>
                                  <h4>{patient.patient_name} <span className="patient-id">#{patient.token_number}</span></h4>
                                  <p className="patient-meta">Age: {patient.patient_dob || 'N/A'} • Dept: {patient.target_dept}</p>
                                </div>
                              </div>
                              
                              <div className="wait-time">
                                <Clock size={16} /> <span>{patient.wait_duration || 0} mins wait</span>
                              </div>

                              <div className="action-area">
                                <button className="call-btn" onClick={(e) => { e.stopPropagation(); handleCallNext(); }}>Call Next</button>
                                <button className="icon-btn arrow-btn"><ChevronRight size={20} /></button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="dashboard-side-col">
                  <div className="dashboard-widget glass">
                    <div className="widget-header">
                      <h4><MapPin size={18} /> Active Assignment</h4>
                    </div>
                    <div className="widget-body">
                      {mySchedule.find(s => new Date(s.date).toDateString() === new Date().toDateString()) ? (
                        <div className="assignment-brief">
                          <p className="primary-text"><strong>{mySchedule.find(s => new Date(s.date).toDateString() === new Date().toDateString()).department_name}</strong></p>
                          <p className="muted-text">{(currentUser.room_number && currentUser.room_number.toLowerCase().includes('room')) ? currentUser.room_number : `Room ${currentUser.room_number || 'Not Set'}`}</p>
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
            </>
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
                    placeholder="Search by Name or MRN..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="registry-table-container glass">
                <table className="registry-excel-table">
                  <thead>
                    <tr>
                      <th>MRN</th>
                      <th>Patient Name</th>
                      <th>Gender</th>
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
              <div className="section-header">
                <h3>My Duty Roster</h3>
                <button className="text-btn" onClick={loadSchedule}>Refresh</button>
              </div>
              <div className="schedule-list">
                {mySchedule.length === 0 ? (
                  <div className="empty-state glass">
                    <CalendarDays size={48} className="muted-icon" />
                    <p>You have no shifts assigned in the system.</p>
                  </div>
                ) : (
                  mySchedule.map(shift => {
                    const shiftDate = new Date(shift.date);
                    const isPast = shiftDate < new Date().setHours(0,0,0,0);
                    return (
                      <motion.div 
                        key={shift.id} 
                        className={`schedule-card glass ${isPast ? 'past' : 'upcoming'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="shift-date">
                          <span className="day">{shiftDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <span className="date">{shiftDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {isPast && <span className="past-badge">Past</span>}
                        </div>
                        <div className="shift-details">
                          <div className="shift-time">
                            <Clock size={16} /> 
                            <span>{shift.shift_start_time.slice(0, 5)} - {shift.shift_end_time.slice(0, 5)}</span>
                            <span className="shift-badge">{shift.shift_label}</span>
                          </div>
                          <div className="shift-location">
                            <Users size={16} /> 
                            <span>{shift.department_name}{shift.unit_name ? ` • ${shift.unit_name}` : ''}</span>
                          </div>
                          {shift.room_number && (
                            <div className="shift-room">
                              <Info size={16} /> 
                              <span>Assigned to Room {shift.room_number}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
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
                      <p className="mrn-badge">MRN: {selectedPatient.mrn}</p>
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
                    <button className={`m-tab ${modalTab === 'medication' ? 'active' : ''}`} onClick={() => setModalTab('medication')}>
                       <Pill size={16} /> Medications
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
                        </div>

                        <div className="quick-actions">
                          <h4>Quick Actions</h4>
                          <div className="actions-stack">
                            <button className="action-card-btn" onClick={() => setModalTab('vitals')}>
                              <Plus size={18} /> Perform Triage / Vitals
                            </button>
                            <button className="action-card-btn" onClick={() => setModalTab('observation')}>
                              <Plus size={18} /> Add Observation Note
                            </button>
                            <button className="action-card-btn" onClick={() => setModalTab('medication')}>
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
                               <input type="text" placeholder="36.5" value={vitalsForm.temperature} onChange={(e) => setVitalsForm({...vitalsForm, temperature: e.target.value})} />
                             </div>
                             <div className="v-input">
                               <label><Weight size={14}/> WEIGHT (KG)</label>
                               <input type="text" placeholder="70" value={vitalsForm.weight} onChange={(e) => setVitalsForm({...vitalsForm, weight: e.target.value})} />
                             </div>
                             <div className="v-input">
                               <label><Ruler size={14}/> HEIGHT (CM)</label>
                               <input type="text" placeholder="175" value={vitalsForm.height} onChange={(e) => setVitalsForm({...vitalsForm, height: e.target.value})} />
                             </div>
                          </div>
                          <div className="form-grid-3">
                             <div className="v-input">
                               <label><Activity size={14}/> BLOOD PRESSURE</label>
                               <input type="text" placeholder="120/80" value={vitalsForm.blood_pressure} onChange={(e) => setVitalsForm({...vitalsForm, blood_pressure: e.target.value})} />
                             </div>
                             <div className="v-input">
                               <label><HeartPulse size={14}/> HEART RATE (BPM)</label>
                               <input type="text" placeholder="72" value={vitalsForm.heart_rate} onChange={(e) => setVitalsForm({...vitalsForm, heart_rate: e.target.value})} />
                             </div>
                             <div className="v-input">
                               <label><Info size={14}/> SPO2 (%)</label>
                               <input type="text" placeholder="98" value={vitalsForm.spo2} onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})} />
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
                                      </div>
                                   </div>
                                 ))}
                               </div>
                             ))
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
  );
}

