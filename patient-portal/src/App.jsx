import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Booking from './pages/Booking';
import PatientAccess from './pages/PatientAccess';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main style={{ flex: 1, position: 'relative' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/profile" element={<PatientAccess />} />
          </Routes>
        </main>
        
        <footer style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)' }}>
          <p>© 2026 Legacy Patient Portal. Powering Modern Healthcare.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
