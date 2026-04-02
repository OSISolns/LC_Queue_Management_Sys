import React, { useState, useEffect } from 'react';
import { findPatient, leaveReview, getDoctors, getPatientAppointments, getPatientVisits } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, User, Search, ShieldCheck, CheckCircle2, Calendar, History, FileText, Droplet, Phone, Mail, Activity } from 'lucide-react';

const PatientAccess = () => {
  const [patient, setPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);

  const [reviewForm, setReviewForm] = useState({ doctor_id: '', rating: 5, comment: '' });
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (patient) {
      loadPatientData(patient.id);
    }
  }, [patient]);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (err) { console.error(err); }
  };

  const loadPatientData = async (patientId) => {
    setLoading(true);
    try {
      const [appts, vsts] = await Promise.all([
        getPatientAppointments(patientId),
        getPatientVisits(patientId)
      ]);
      setAppointments(appts || []);
      setVisits(vsts || []);
    } catch (err) {
      console.error("Error loading patient extra data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await findPatient(searchQuery);
      setPatient(p);
      setActiveTab('profile');
    } catch (err) {
      setError('Patient record not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setLoading(true);
    try {
      if (!reviewForm.doctor_id) throw new Error('Please select a doctor');
      await leaveReview({
        patient_id: patient.id,
        ...reviewForm
      });
      setReviewSuccess(true);
      setReviewForm({ doctor_id: '', rating: 5, comment: '' });
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Review failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="fade-in" style={{ maxWidth: '600px', margin: '6rem auto', textAlign: 'center' }}>
        <div style={{ background: 'var(--primary)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 2rem', boxShadow: '0 4px 20px rgba(6,85,144,0.3)' }}>
           <User size={48} fill="white" />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Access Your <span style={{ color: 'var(--primary)' }}>Portal</span>.</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Enter your Phone Number or Medical Record Number (MRN) to access your personalized health dashboard and history.</p>
        
        <div className="glass" style={{ padding: '2rem' }}>
           <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="0712 XXX XXX or MRN000..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                 {loading ? 'Searching...' : 'Access My Portal'}
              </button>
           </div>
           {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 2rem' }}>
      <header className="glass" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
         <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem', boxShadow: '0 4px 14px rgba(6,85,144,0.3)' }}>
               {patient.first_name?.[0] || ''}{patient.last_name?.[0] || ''}
            </div>
            <div>
               <h2 style={{ fontSize: '1.5rem' }}>{patient.first_name} {patient.last_name}</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>MRN: {patient.mrn} • Patient since {new Date(patient.created_at).getFullYear()}</p>
            </div>
         </div>
         <button className="btn btn-ghost btn-sm" onClick={() => {setPatient(null); setAppointments([]); setVisits([]);}}>Logout</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
         <div className="glass" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('profile')} style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <User size={18} /> My Profile
            </button>
            <button className={`btn ${activeTab === 'appointments' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('appointments')} style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <Calendar size={18} /> Appointments
            </button>
            <button className={`btn ${activeTab === 'visits' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('visits')} style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <History size={18} /> Past Visits
            </button>
            <button className={`btn ${activeTab === 'review' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('review')} style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <MessageSquare size={18} /> Review Specialists
            </button>
            <button className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('security')} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <ShieldCheck size={18} /> Security Settings
            </button>
         </div>

         <div className="glass" style={{ padding: '2rem', minHeight: '400px' }}>
            {activeTab === 'profile' && (
                <div className="fade-in">
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User className="text-primary" size={24} /> Profile Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date of Birth</p>
                             <p style={{ fontWeight: 600 }}>{patient.date_of_birth || 'Not Specified'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gender</p>
                             <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{patient.gender || 'Not Specified'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14}/> Phone Number</p>
                             <p style={{ fontWeight: 600 }}>{patient.phone_number || 'Not Specified'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={14}/> Email Address</p>
                             <p style={{ fontWeight: 600 }}>{patient.email || 'Not Specified'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', background: 'var(--bg-accent)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Droplet size={14} color="#ef4444"/> Blood Type</p>
                             <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{patient.blood_type || 'Unknown'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', background: 'var(--bg-accent)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={14} color="#f59e0b"/> Allergies</p>
                             <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{patient.allergies || 'None Known'}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Emergency Contact</p>
                             <p style={{ fontWeight: 600 }}>{patient.emergency_contact_name || 'Not Provided'} {patient.emergency_contact_phone ? `(${patient.emergency_contact_phone})` : ''}</p>
                        </div>
                        <div className="glass" style={{ padding: '1.5rem', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.5)' }}>
                             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Residential Address</p>
                             <p style={{ fontWeight: 600 }}>{patient.address || 'Not Provided'}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'appointments' && (
               <div className="fade-in">
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar className="text-primary" size={24} /> Appointments
                    </h3>
                    {loading ? (
                       <p style={{ color: 'var(--text-muted)' }}>Loading appointments...</p>
                    ) : appointments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem' }}>
                          <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                          <p style={{ color: 'var(--text-muted)' }}>You have no upcoming or past appointments.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {appointments.map(app => (
                                <div key={app.id} className="glass" style={{ padding: '1.5rem', borderLeft: `4px solid ${app.status === 'scheduled' ? 'var(--primary)' : 'var(--text-muted)'}`, background: 'rgba(255,255,255,0.8)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                              {new Date(app.appointment_date).toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})} at {new Date(app.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </h4>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{app.doctor_name}</p>
                                            {app.reason && <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong style={{fontWeight: 500}}>Reason:</strong> {app.reason}</p>}
                                        </div>
                                        <span style={{ 
                                            padding: '0.35rem 0.85rem', 
                                            borderRadius: '2rem', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 700,
                                            letterSpacing: '0.05em',
                                            background: app.status === 'scheduled' ? 'rgba(6, 85, 144, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                                            color: app.status === 'scheduled' ? 'var(--primary)' : 'var(--text-muted)'
                                        }}>
                                            {app.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
               </div>
            )}

            {activeTab === 'visits' && (
               <div className="fade-in">
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <History className="text-primary" size={24} /> Past Discharges & Visits
                    </h3>
                    {loading ? (
                       <p style={{ color: 'var(--text-muted)' }}>Loading visit history...</p>
                    ) : visits.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem' }}>
                          <History size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                          <p style={{ color: 'var(--text-muted)' }}>You have no clinical history on record.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {visits.map(visit => (
                                <div key={visit.id} className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.8)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={16} color="var(--text-muted)" />
                                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{new Date(visit.visit_date).toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})}</span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', background: 'var(--bg-accent)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 500 }}>
                                           {visit.department || 'General Practice'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '1.5rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Attending Specialist</p>
                                            <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>{visit.doctor_name}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Diagnosis</p>
                                            <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>{visit.diagnosis || 'No Diagnosis Recorded'}</p>
                                        </div>
                                    </div>
                                    {visit.treatment && (
                                        <div style={{ marginTop: '1.5rem', background: 'rgba(6,85,144,0.04)', padding: '1.25rem', borderRadius: '0.5rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <FileText size={14} /> Treatment & Record
                                            </p>
                                            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-main)' }}>{visit.treatment}</p>
                                            {visit.prescription && <p style={{ fontSize: '0.95rem', marginTop: '0.75rem', borderTop: '1px dashed rgba(6,85,144,0.2)', paddingTop: '0.75rem' }}><strong style={{color: 'var(--primary)'}}>Rx:</strong> {visit.prescription}</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
               </div>
            )}

            {activeTab === 'review' && (
               <div className="fade-in">
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MessageSquare className="text-primary" size={24} /> Share Your Experience
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your feedback helps us improve our services and helps other patients choose the right specialist.</p>
                  
                  {reviewSuccess ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
                       <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
                       <h4 style={{ fontSize: '1.25rem' }}>Review Submitted!</h4>
                       <p>Thank you for your valuable feedback.</p>
                    </motion.div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                       <div className="form-group">
                          <label>Choose Specialist</label>
                          <select value={reviewForm.doctor_id} onChange={(e) => setReviewForm({...reviewForm, doctor_id: e.target.value})} style={{ background: 'rgba(255,255,255,0.7)' }}>
                             <option value="">-- Select Specialist --</option>
                             {doctors.map(doc => (
                               <option key={doc.id} value={doc.id}>{doc.salutation || 'Dr.'} {doc.full_name}</option>
                             ))}
                          </select>
                       </div>

                       <div className="form-group">
                          <label>Overall Satisfaction</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                             {[1, 2, 3, 4, 5].map(star => (
                               <Star 
                                 key={star} 
                                 size={32} 
                                 fill={reviewForm.rating >= star ? '#fbbf24' : 'transparent'} 
                                 strokeWidth={reviewForm.rating >= star ? 0 : 1}
                                 style={{ cursor: 'pointer', transition: 'all 0.2s', filter: reviewForm.rating >= star ? 'drop-shadow(0 2px 4px rgba(251,191,36,0.3))' : 'none' }}
                                 onClick={() => setReviewForm({...reviewForm, rating: star})}
                               />
                             ))}
                          </div>
                       </div>

                       <div className="form-group">
                          <label>Detailed Feedback</label>
                          <textarea 
                             rows="4" 
                             placeholder="What was your experience like? (Optional)"
                             value={reviewForm.comment}
                             onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                             style={{ background: 'rgba(255,255,255,0.7)', resize: 'vertical' }}
                          />
                       </div>

                       <button className="btn btn-success" onClick={handleSubmitReview} disabled={loading || !reviewForm.doctor_id} style={{ marginTop: '0.5rem' }}>
                          {loading ? 'Submitting...' : 'Post My Review'}
                       </button>
                    </div>
                  )}
               </div>
            )}
            
            {activeTab === 'security' && (
               <div className="fade-in">
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck className="text-primary" size={24} /> Security Settings
                  </h3>
                  <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.8)' }}>
                     <div>
                        <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>Two-Factor Identification</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verify access via SMS to your registered phone number.</p>
                     </div>
                     <button className="btn btn-primary btn-sm">Enable</button>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default PatientAccess;
