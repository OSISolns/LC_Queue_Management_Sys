import os

data = """import React, { useState } from 'react';
import { Star, MapPin, Calendar, Clock, MessageSquare, ShieldCheck, ChevronRight, Phone, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const SPECIALTIES = [
  {
    name: "Internal Medicine",
    doctors: [
      { name: "Dr. Nshuti Shema David", schedule: "Mon, Tue, Wed, Fri : 8:00 AM - 5:00 PM" },
      { name: "Dr. Kabakambira Jean Damascene", schedule: "Mon - Fri : 8:00 AM - 4:00 PM" },
      { name: "Dr. Anthony Bazatsinda", schedule: "Wed: 8:00 AM - 9:00 PM, Sat: 8:00 AM - 9:00 PM" },
      { name: "Dr. Oswald Habyarimana", schedule: "Tue: 8:00 AM - 9:00 PM, Sun: 8:00 AM - 5:00 PM" },
      { name: "Dr. Sebatunzi Osee", schedule: "Thu: 8:00 AM - 9:00 PM, Sat: 8:00 AM - 5:00 PM" },
      { name: "Dr. Maguy Mbabazi", schedule: "Fri: 8:00 AM - 9:00 PM, Sun: 8:00 AM - 5:00 PM" },
      { name: "Dr. David Turatsinze", schedule: "Not Available" },
      { name: "Dr. Rutaganda Eric", schedule: "Thu: 9:00 AM - 5:00 PM, Sun: 9:00 AM - 5:00 PM" },
      { name: "Dr. Masaisa Florence", schedule: "Mon: 9:00 AM - 9:00 PM" }
    ]
  },
  {
    name: "Gynecology",
    doctors: [
      { name: "Dr. Gakindi Leonard", schedule: "Mon - Fri: 9:00 AM - 5:00 PM" },
      { name: "Dr. Nkubito Valens", schedule: "Sat: 8:00 AM - 5:00 PM" },
      { name: "Dr. Mohamed", schedule: "Not Available" },
      { name: "Dr. Ntirushwa David", schedule: "Fri: 9:00 AM - 5:00 PM, Sun: 9:00 AM - 5:00 PM" },
      { name: "Dr. Sitini Bertin", schedule: "Mon: 8:00 AM - 5:00 PM, Sun: 8:00 AM - 5:00 PM" },
      { name: "Dr. Butoyi Alphonse", schedule: "Tue, Thu: 9:00 AM - 9:00 PM\\nWed, Fri, Sat: 9:00 AM - 5:00 PM" },
      { name: "Dr. Heba", schedule: "Not Available" }
    ]
  },
  {
    name: "Pediatrics",
    doctors: [
      { name: "Dr. Kabayiza Jean Claude", schedule: "According to weekly roster" },
      { name: "Dr. Umuhoza Christian", schedule: "According to weekly roster" },
      { name: "Dr. Aimable Kanyamuhunga", schedule: "According to weekly roster" },
      { name: "Dr. Karangwa Valens", schedule: "According to weekly roster" },
      { name: "Dr. Mukaruziga Agnes", schedule: "Thu: 8:00 AM - 5:00 PM" }
    ]
  },
  {
    name: "Neuro-Surgeon",
    doctors: [
      { name: "Dr. Karekezi Claire", schedule: "Wed, Sat: 9:00 AM - 2:00 PM" }
    ]
  },
  {
    name: "General Surgeon",
    doctors: [
      { name: "Dr. Desire Rubanguka", schedule: "Tue : 9:00 AM - 4:00 PM" }
    ]
  },
  {
    name: "Chiropractic",
    doctors: [
      { name: "Dr. Noella Kanyabutembo", schedule: "Thu and Fri: 9:00 AM - 3:00 PM" }
    ]
  },
  {
    name: "Neurology",
    doctors: [
      { name: "Dr. Ndayisenga Arlene", schedule: "Not Available" },
      { name: "Dr. Mutungirehe Sylvestre", schedule: "Mon, Thu: 5:00 PM - 9:00 PM\\nSat: 3:00 PM - 9:00 PM\\nSun: 9:00 AM - 9:00 PM" }
    ]
  },
  {
    name: "ENT",
    doctors: [
      { name: "Dr. Dushimiyimana JMV", schedule: "Thu & Sun: 9:00 AM - 4:00 PM" },
      { name: "Dr. Charles Nkurunziza", schedule: "Not Available" },
      { name: "Dr. Hakizimana Aristote", schedule: "Mon & Tue: 5:00 PM - 9:00 PM\\nWed: 9:00 AM - 4:00 PM\\nSat: 8:00 AM - 5:00 PM" }
    ]
  },
  {
    name: "Clinical Psychology",
    doctors: [
      { name: "Mr. Innocent Nsengiyumva", schedule: "Mon, Wed, Thu, Fri: 5:00 PM - 9:00 PM" }
    ]
  },
  {
    name: "Family Medicine",
    doctors: [
      { name: "Dr Nkera Gihana Jacques", schedule: "Mon, Tue, Wed, Fri: 8:00 AM - 5:00 PM" }
    ]
  },
  {
    name: "Orthopedics",
    doctors: [
      { name: "Dr. Kwesiga Stephen", schedule: "Mon: 4:00 PM - 9:00 PM\\nWed: 3:00 PM - 9:00 PM\\nThu: 9:00 AM - 9:00 PM\\nSat: 3:00 PM - 4:00 PM" },
      { name: "Dr. Ingabire Allen", schedule: "Mon: 9:00 AM - 2:00 PM, Wed: 5:00 PM - 7:00 PM, Fri: 1:00 PM - 6:00 PM" }
    ]
  },
  {
    name: "Urology",
    doctors: [
      { name: "Dr. Africa Gasana", schedule: "Wed: 5:00 PM - 9:00 PM, Sat: 8:00 AM - 5:00 PM" },
      { name: "Dr. Nyirimodoka Alexandre", schedule: "Tue: 2:00 PM - 7:00 PM, Sun: 9:00 AM - 3:00 PM" }
    ]
  },
  {
    name: "Cardiology",
    doctors: [
      { name: "Dr. Gapira Ganza JMV", schedule: "Mon, Tue, Thu, Fri, Sat: 8:00 AM - 4:00 PM" },
      { name: "Dr. Dufatanye Darius", schedule: "Wed: 9:00 AM - 5:00 PM, Sun: 9:00 AM - 2:00 PM" }
    ]
  },
  {
    name: "General Practitioners",
    doctors: [
      { name: "Dr. Yves Laurent", schedule: "According to Weekly Roster" },
      { name: "Dr. Fabrice Ntare Ngabo", schedule: "According to Weekly Roster" }
    ]
  },
  {
    name: "Dermatology",
    doctors: [
      { name: "Dr. Kanimba Emmanuel", schedule: "Mon, Thu, Fri, Sat: 8:00 AM - 3:00 PM" },
      { name: "Dr. Moses Isyagi", schedule: "According to the monthly roster" },
      { name: "Dr. Roger Anamali", schedule: "Mon: 3:00 PM - 9:00 PM\\nTue: 8:00 AM - 2:00 PM\\nWed: 10:00 AM - 8:00 PM\\nFri: 8:00 AM - 5:00 PM\\nSat: 8:00 AM - 2:00 PM\\nSun: 10:00 AM - 8:00 PM" },
      { name: "Dr. Nyiraneza Esperance", schedule: "Mon - Fri: 9:00 AM - 3:00 PM" },
      { name: "Mr. Ishimwe Gilbert", schedule: "Tue: 3:00 PM - 9:00 PM, Sat: 8:00 AM - 9:00 PM" },
      { name: "Mr. Eric Rutaganda", schedule: "Mon/Wed: 8:00 AM - 3:00 PM\\nTue/Thu: 3:00 PM - 9:00 PM" },
      { name: "Mr. Gilbert Ndayisenga", schedule: "Tue/Thu/Sat: 8:00 AM - 3:00 PM\\nMon/Wed/Fri: 3:00 PM - 9:00 PM" },
      { name: "Dr. Mugesera Ernest", schedule: "Mon/Sun: 8:00 AM - 3:00 PM\\nTue: 3:00 PM - 9:00 PM\\nThu/Sat: 8:00 PM - 9:00 PM" },
      { name: "Dr. Sandeep Goyal", schedule: "Tue: 2:00 PM - 5:00 PM, Fri: 9:00 AM - 5:00 PM" },
      { name: "Dr. Bede Bana", schedule: "Mon - Fri: 8:00 AM - 3:00 PM, Sun: 3:00 PM - 9:00 PM" },
      { name: "Dr. Jayakar G. Sargunar", schedule: "According to the monthly roster" }
    ]
  }
];

const DoctorCard = ({ doctor, departmentName }) => {
  const isAvailable = doctor.schedule !== "Not Available";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="glass doctor-card"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
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
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{doctor.name}</h3>
            <p style={{ color: 'var(--primary-light)', fontSize: '0.85rem', fontWeight: 600, margin: '0.2rem 0 0 0' }}>{departmentName}</p>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Clock size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
          <div style={{ whiteSpace: 'pre-line' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>Consultation Hours</span>
            {doctor.schedule}
          </div>
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
            {isAvailable ? 'Book Appointment' : 'Not Available'}
          </button>
        </Link>
      </div>
    </motion.div>
  );
};

const Doctors = () => {
  const [activeTab, setActiveTab] = useState(SPECIALTIES[0].name);

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
            // hide scrollbar cross browser
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }} className="hide-scrollbar">
            {SPECIALTIES.map((dept) => (
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
                gap: '2rem'
              }}
            >
              {SPECIALTIES.find(d => d.name === activeTab)?.doctors.map((doc, idx) => (
                <DoctorCard key={idx} doctor={doc} departmentName={activeTab} />
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

with open('/home/noble/Documents/LC_APPS/LC_Queuing-Sys/patient-portal/src/pages/Doctors.jsx', 'w') as f:
    f.write(data)
