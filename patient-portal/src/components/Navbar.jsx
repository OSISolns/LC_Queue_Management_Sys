import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserSquare, CalendarCheck, Stethoscope, LayoutGrid, X, Menu } from 'lucide-react';

const navLinks = [
  { to: '/doctors',  icon: Stethoscope,   label: 'Our Doctors' },
  { to: '/booking',  icon: CalendarCheck, label: 'Book Now' },
  { to: '/profile',  icon: UserSquare,    label: 'My Portal' },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className="glass"
        style={{
          margin: '1rem 1.5rem',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: '1rem',
          zIndex: 1000,
          borderColor: 'rgba(6, 85, 144, 0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="Legacy Clinics"
            style={{ height: '38px', objectFit: 'contain' }}
          />
          <div style={{ borderLeft: '1px solid rgba(6, 85, 144, 0.3)', paddingLeft: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Legacy Clinics
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Patient Portal
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
             className="desktop-nav">
          {navLinks.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  background:    active ? 'rgba(6, 85, 144, 0.2)' : 'transparent',
                  color:         active ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom:  active ? '2px solid var(--primary-light)' : '2px solid transparent',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}

          <Link to="/booking" style={{ textDecoration: 'none', marginLeft: '0.5rem' }}>
            <button className="btn btn-success" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={16} />
              Book Appointment
            </button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="mobile-menu-btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="glass" style={{
          position: 'fixed', top: '5rem', left: '1rem', right: '1rem',
          zIndex: 999, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.6rem', color: 'var(--text-main)', background: 'rgba(6,85,144,0.1)' }}>
              <Icon size={18} style={{ color: 'var(--primary-light)' }} />
              {label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-menu-btn { display: none !important; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
