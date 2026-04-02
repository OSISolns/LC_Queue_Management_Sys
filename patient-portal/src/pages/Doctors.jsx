import React, { useState, useEffect } from 'react';
import { getDoctors, getDoctorReviews } from '../services/api';
import { Star, MapPin, Calendar, Clock, MessageSquare, ShieldCheck, ChevronRight, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const DoctorCard = ({ doctor, onShowReviews }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass doctor-card"
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '1rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(6,85,144,0.3)' }}>
          {doctor.full_name?.split(' ').map(n => n[0]).join('') || 'DR'}
        </div>
        <div>
          <h3 style={{ fontSize: '1.25rem' }}>{doctor.salutation || 'Dr.'} {doctor.full_name}</h3>
          <p style={{ color: 'var(--primary-light)', fontSize: '0.9rem', fontWeight: 500 }}>{doctor.department_name}</p>
          <div className="rating-stars" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            <Star size={14} fill="#fbbf24" strokeWidth={0} />
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{doctor.average_rating.toFixed(1)}</span>
            <span style={{ color: 'var(--text-muted)' }}>({doctor.review_count} reviews)</span>
          </div>
        </div>
      </div>
      <div style={{ 
        background: doctor.is_available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
        color: doctor.is_available ? 'var(--secondary)' : '#ef4444',
        padding: '0.25rem 0.75rem',
        borderRadius: '1rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
        {doctor.is_available ? 'Available' : 'Busy'}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <MapPin size={16} style={{ flexShrink: 0 }} />
        <span title={doctor.room_number ? `Room ${doctor.room_number}` : 'Main Hospital, Lobby B'}>
          {doctor.room_number ? `Room ${doctor.room_number}` : 'Main Hospital, Lobby B'}
        </span>
      </div>
      {(doctor.phone_number || doctor.email) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {doctor.phone_number ? <Phone size={16} style={{ flexShrink: 0 }} /> : <Mail size={16} style={{ flexShrink: 0 }} />}
          <span title={doctor.phone_number || doctor.email}>{doctor.phone_number || doctor.email}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Clock size={16} style={{ flexShrink: 0 }} />
          <span>09:00 AM - 05:30 PM</span>
        </div>
      )}
    </div>

    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
      <Link to="/booking" style={{ flex: 1, textDecoration: 'none' }}>
        <button className="btn btn-success" style={{ width: '100%', fontSize: '0.9rem' }}>
          Schedule Visit
        </button>
      </Link>
      <button className="btn btn-ghost" style={{ padding: '0 1rem' }} onClick={() => onShowReviews(doctor.id)}>
         <MessageSquare size={18} />
      </button>
    </div>
  </motion.div>
);

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowReviews = async (id) => {
    setSelectedDoctorId(id);
    try {
      const data = await getDoctorReviews(id);
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      <section style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Our <span style={{ color: 'var(--primary-light)' }}>Healthcare</span> Experts.</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Connect with world-class specialists who are dedicated to providing you with the highest standard of personalized medical care and expertise.
        </p>
      </section>

      <section style={{ paddingTop: '0' }}>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
           {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', gridColumn: '1/-1', opacity: 0.5, padding: '4rem' }}>
                <Clock size={40} className="spin" />
                <p>Curating specialist list...</p>
             </div>
           ) : doctors.map(doc => (
             <DoctorCard key={doc.id} doctor={doc} onShowReviews={handleShowReviews} />
           ))}
         </div>
      </section>

      {/* Reviews Modal Backdrop */}
      <AnimatePresence>
        {selectedDoctorId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoctorId(null)}
              style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1100, backdropFilter: 'blur(5px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '600px', height: '80vh', background: 'var(--bg-dark)', borderRadius: '1.5rem', border: '1px solid var(--glass-border)', zIndex: 1200, padding: '2rem', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h3>Doctor Reviews</h3>
                <button 
                  onClick={() => setSelectedDoctorId(null)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                {reviews.length === 0 ? (
                   <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>No reviews yet for this doctor.</p>
                ) : reviews.map(r => (
                  <div key={r.id} className="glass" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: 600 }}>{r.patient_name}</p>
                      <div className="rating-stars">
                         {[...Array(5)].map((_, i) => (
                           <Star key={i} size={14} fill={i < r.rating ? '#fbbf24' : 'transparent'} strokeWidth={i < r.rating ? 0 : 1} />
                         ))}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.9rem' }}>{r.comment}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '2rem' }}>
                <Link to="/profile" style={{ textDecoration: 'none' }}>
                  <button className="btn btn-success" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Leave Your Review <ChevronRight size={18} />
                  </button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default Doctors;
