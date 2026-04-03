import os

file_path = "/home/noble/Documents/LC_APPS/LC_Queuing-Sys/patient-portal/src/pages/Doctors.jsx"

content = """import React, { useState, useEffect } from 'react';
import { Star, MapPin, Calendar, Clock, MessageSquare, ShieldCheck, ChevronRight, Phone, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getDoctors } from '../services/api';

const DoctorCard = ({ doctor }) => {
  const isAvailable = doctor.is_available;
  const name = `${doctor.salutation || 'Dr.'} ${doctor.full_name || 'Unknown'}`;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="glass doctor-card"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '1rem', 
            background: 'var(--primary-light)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            boxShadow: '0 4px 14px rgba(6,85,144,0.2)' 
          }}>
            <User size={30} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{name}</h3>
            <p style={{ color: 'var(--primary-light)', fontSize: '0.85rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>{doctor.department_name}</p>
          </div>
        </div>
        <div style={{ 
          background: isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          color: isAvailable ? 'var(--secondary)' : '#ef4444',
          padding: '0.25rem 0.6rem',
          borderRadius: '1rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
          {isAvailable ? 'Active' : 'Unavailable'}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Star size={16} fill="#fbbf24" color="#fbbf24" style={{ flexShrink: 0 }} />
          <span>{doctor.average_rating ? doctor.average_rating.toFixed(1) : 'New'} ({doctor.review_count || 0} reviews)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          <Clock size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
          <span>According to dynamic roster schedule</span>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', pt: '1rem', borderTop: '1px solid var(--glass-border)' }}>
        <Link to="/booking" onClick={(e) => !isAvailable && e.preventDefault()} style={{ textDecoration: 'none' }}>
          <button 
            className="btn" 
            style={{ 
              width: '100%', 
              background: isAvailable ? 'var(--primary)' : 'var(--glass-bg)',
              color: isAvailable ? 'white' : 'var(--text-muted)',
              cursor: isAvailable ? 'pointer' : 'not-allowed',
              opacity: isAvailable ? 1 : 0.7,
              border: isAvailable ? 'none' : '1px solid var(--glass-border)'
            }}
            disabled={!isAvailable}
          >
            {isAvailable ? 'Book Appointment' : 'Currently Unavailable'}
          </button>
        </Link>
      </div>
    </motion.div>
  );
};

const Doctors = () => {
  const [activeTab, setActiveTab] = useState('');
  const [doctorData, setDoctorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const payload = await getDoctors();
        // Exclude specific departments
        const excludedDepts = ["Administration", "Physiotherapy", "Tabara"];
        const filtered = payload.filter(doc => !excludedDepts.includes(doc.department_name));
        
        // Group by department
        const groupedMap = {};
        filtered.forEach(doc => {
          if (!groupedMap[doc.department_name]) groupedMap[doc.department_name] = [];
          groupedMap[doc.department_name].push(doc);
        });

        const groupedArray = Object.keys(groupedMap).map(key => ({
          name: key,
          doctors: groupedMap[key]
        }));
        
        // Sort departments alphabetically
        groupedArray.sort((a, b) => a.name.localeCompare(b.name));

        setDoctorData(groupedArray);
        if (groupedArray.length > 0) setActiveTab(groupedArray[0].name);
      } catch (err) {
        console.error("Failed to load doctors:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spin"><Clock size={32} color="var(--primary)" /></div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 2s linear infinite; }`}</style>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem', minHeight: '80vh' }}>
      <section style={{ textAlign: 'center', paddingBottom: '3rem', paddingTop: '2rem' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>
            Our <span style={{ color: 'var(--primary-light)' }}>Specialists</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Browse through our dedicated team of medical professionals across various departments and finding the right care for your needs.
          </p>
        </motion.div>
      </section>

      <section style={{ paddingTop: '0', maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Department Tabs */}
          <div style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '0.5rem', 
            paddingBottom: '1rem',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }} className="hide-scrollbar">
            {doctorData.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setActiveTab(dept.name)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '2rem',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  border: activeTab === dept.name ? 'none' : '1px solid var(--glass-border)',
                  background: activeTab === dept.name ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === dept.name ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  boxShadow: activeTab === dept.name ? '0 4px 15px rgba(23, 169, 168, 0.3)' : 'none'
                }}
              >
                {dept.name} ({dept.doctors.length})
              </button>
            ))}
          </div>

          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* Doctors Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '2rem',
                alignItems: 'stretch'
              }}
            >
              {doctorData.find(d => d.name === activeTab)?.doctors.map((doc, idx) => (
                <DoctorCard key={doc.id || idx} doctor={doc} />
              ))}
            </motion.div>
          </AnimatePresence>

        </div>
      </section>
    </div>
  );
};

export default Doctors;
"""

with open(file_path, "w") as f:
    f.write(content)

print("Updated Doctors.jsx to fetch dynamically from API.")
