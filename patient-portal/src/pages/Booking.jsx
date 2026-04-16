import React, { useState, useEffect } from 'react';
import { getDoctors, bookAppointment, findPatient, registerPatient } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Clock, Heart, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const Booking = () => {
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [patientId, setPatientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientData, setPatientData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    gender: 'Other',
    date_of_birth: ''
  });
  
  const [bookingData, setBookingData] = useState({
    doctor_id: '',
    appointment_date: '',
    reason: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (err) { console.error(err); }
  };

  const handlePatientSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await findPatient(searchQuery);
      setPatientId(p.id);
      setPatientData(p);
      setStep(2);
    } catch (err) {
      setError('No patient found with this ID or phone. Please register.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await registerPatient(patientData);
      setPatientId(p.id);
      setStep(2);
    } catch (err) {
      setError('Registration failed. Please check your data.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    setLoading(true);
    setError('');
    try {
      if (!bookingData.doctor_id || !bookingData.appointment_date) {
        throw new Error('Please select a doctor and date.');
      }
      
      await bookAppointment({
        patient_id: patientId,
        ...bookingData
      });
      setSuccess(true);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <div className="glass" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>

        {/* LC Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <img src="/logo.png" alt="Legacy Clinics" style={{ height: '36px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Legacy Clinics</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Appointment Booking</div>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ 
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: step >= s
                ? 'var(--secondary)'
                : 'rgba(59,130,246,0.12)',
              boxShadow: step >= s ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
              transition: 'all 0.4s ease'
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Find Your Record or <span style={{ color: 'var(--primary)' }}>Register</span></h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>To begin, we need to locate your existing medical record or create a new one.</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  placeholder="Enter Phone or PID" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handlePatientSearch} disabled={loading}>
                  {loading ? 'Searching...' : <Search size={20} />}
                </button>
              </div>

              {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

              <div style={{ padding: '2rem', border: '1px dashed var(--glass-border)', borderRadius: '1rem', textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem' }}>Never been with us before?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" value={patientData.first_name} onChange={(e) => setPatientData({...patientData, first_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" value={patientData.last_name} onChange={(e) => setPatientData({...patientData, last_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={patientData.phone_number} onChange={(e) => setPatientData({...patientData, phone_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={patientData.email} onChange={(e) => setPatientData({...patientData, email: e.target.value})} />
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }} onClick={handleRegister}>
                  Register and Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Schedule <span style={{ color: 'var(--primary)' }}>Appointment</span></h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Welcome back, {patientData.first_name}. Now, choose your specialist and preferred date.</p>

              <div className="form-group">
                <label>Select Specialist</label>
                <select value={bookingData.doctor_id} onChange={(e) => setBookingData({...bookingData, doctor_id: e.target.value})}>
                  <option value="">-- Choose a Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.salutation || 'Dr.'} {doc.full_name} ({doc.department_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Appointment Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={bookingData.appointment_date}
                  onChange={(e) => setBookingData({...bookingData, appointment_date: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Reason for Visit (Optional)</label>
                <textarea 
                  rows="3" 
                  placeholder="e.g. Regular checkup, Follow-up for labs..."
                  value={bookingData.reason}
                  onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                />
              </div>

              {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
                <button className="btn btn-success" onClick={handleBooking} disabled={loading} style={{ flex: 2 }}>
                  {loading ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '2rem' }}
            >
               <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', padding: '2rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 2rem' }}>
                 <CheckCircle2 size={64} />
               </div>
               <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Success!</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                  Your appointment has been successfully scheduled. We have sent a confirmation to your phone. 
                  Please arrive 15 minutes before your scheduled time.
               </p>
               <div className="glass" style={{ padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
                 <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>DETAILS:</p>
                 <div style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 500 }}>
                   <p>Date: {format(new Date(bookingData.appointment_date), 'PPP p')}</p>
                   <p>Specialist: {doctors.find(d => d.id == bookingData.doctor_id)?.salutation || 'Dr.'} {doctors.find(d => d.id == bookingData.doctor_id)?.full_name}</p>
                 </div>
               </div>
               <button className="btn btn-primary" onClick={() => { setStep(1); setSuccess(false); setBookingData({doctor_id: '', appointment_date: '', reason: ''}); }} style={{ width: '100%' }}>
                  Back to Portal Home
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Booking;
