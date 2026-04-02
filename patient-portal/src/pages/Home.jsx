import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, Star, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass" 
    style={{ padding: '2rem', flex: 1, minWidth: '250px' }}
  >
    <div style={{ background: 'rgba(6, 85, 144, 0.12)', color: 'var(--primary-light)', padding: '1rem', borderRadius: '1rem', width: 'fit-content', marginBottom: '1.5rem' }}>
      <Icon size={32} />
    </div>
    <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{description}</p>
  </motion.div>
);

const Home = () => {
  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center', 
        paddingTop: '6rem',
        paddingBottom: '8rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Gradients */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(6, 85, 144, 0.15) 0%, transparent 70%)', zIndex: -1 }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)', zIndex: -1 }}></div>

        {/* LC Logo */}
        <motion.img
          src="/logo.png"
          alt="Legacy Clinics"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ height: '64px', objectFit: 'contain', marginBottom: '2rem', filter: 'drop-shadow(0 4px 16px rgba(6,85,144,0.4))' }}
        />

        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.1 }}
           style={{ background: 'rgba(6, 85, 144, 0.12)', padding: '0.5rem 1.25rem', borderRadius: '2rem', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}
        >
          <ShieldCheck size={16} />
          <span>Legacy Clinics — Verified Healthcare</span>
        </motion.div>

        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', maxWidth: '800px', lineHeight: 1.1 }}>
          Your Health, Our <span style={{ color: 'var(--primary-light)' }}>Priority</span>—Modern 
          Patient Care Redefined.
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', marginBottom: '2.5rem' }}>
          Seamless healthcare management at your fingertips. Book appointments, connect with specialist doctors, and track your wellness journey within our secure, premium portal.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/booking">
            <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Book an Appointment <ArrowRight size={20} />
            </button>
          </Link>
          <Link to="/doctors">
            <button className="btn btn-ghost" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              View Our Specialists
            </button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ paddingTop: '0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <FeatureCard 
            icon={Calendar} 
            title="Online Appointments" 
            description="Book and manage your doctor visits from anywhere. Choose your preferred time and specialist."
          />
          <FeatureCard 
            icon={UserCheck} 
            title="Expert Doctors" 
            description="Our team consist of board-certified specialists across various medical fields ready to assist you."
          />
          <FeatureCard 
            icon={Clock} 
            title="Real-time Tracking" 
            description="Monitor your queue status and health records instantly through our patient-centric interface."
          />
          <FeatureCard 
            icon={Star} 
            title="Patient Reviews" 
            description="Experience transparency. Read trusted reviews from other patients and leave your own feedback."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <div className="glass" style={{ padding: '4rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--primary)' }}>10k+</h2>
            <p style={{ color: 'var(--text-muted)' }}>Registered Patients</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--primary)' }}>50+</h2>
            <p style={{ color: 'var(--text-muted)' }}>Specialist Doctors</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--primary)' }}>98%</h2>
            <p style={{ color: 'var(--text-muted)' }}>Patient Satisfaction</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
