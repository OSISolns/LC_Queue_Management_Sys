import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Kiosk from './pages/Kiosk'
import Dashboard from './pages/Dashboard'
import Display from './pages/Display'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import SMSOfficer from './pages/SMSOfficer'
import FileHubDashboard from './pages/FileHubDashboard'
import AdminFileManager from './pages/AdminFileManager'
import QualityDashboard from './pages/QualityDashboard'
import { Lock, Monitor, Baby, Smartphone, Stethoscope, Wrench, Settings, MessageSquare, LogOut, FileText, ShieldCheck } from 'lucide-react'

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (role && !allowedRoles.includes(user.role) && user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-[#065590]">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />

          <Route path="/kiosk" element={
            <RequireAuth role="Helpdesk">
              <Kiosk />
            </RequireAuth>
          } />

          <Route path="/dashboard" element={
            <RequireAuth role={['Doctor', 'Technician']}>
              <Dashboard />
            </RequireAuth>
          } />

          <Route path="/display" element={<Display />} />

          <Route path="/admin" element={
            <RequireAuth role="Admin">
              <AdminDashboard />
            </RequireAuth>
          } />

          <Route path="/sms" element={
            <RequireAuth role="SMS Officer">
              <SMSOfficer />
            </RequireAuth>
          } />

          {/* File Hub Routes */}
          <Route path="/files" element={
            <RequireAuth role={['Doctor', 'Technician', 'Nurse', 'Admin', 'Helpdesk']}>
              <FileHubDashboard />
            </RequireAuth>
          } />

          <Route path="/admin/files" element={
            <RequireAuth role="Admin">
              <AdminFileManager />
            </RequireAuth>
          } />

          {/* Quality Dashboard Route */}
          <Route path="/quality" element={
            <RequireAuth role={['Quality', 'Admin']}>
              <QualityDashboard />
            </RequireAuth>
          } />
        </Routes>
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          fontSize: '8px',
          opacity: 0.5,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 9999,
          fontFamily: 'monospace'
        }}>
          VmFsZXJ5IFN0cnVjdHVyZQ==
        </div>
      </div>
    </AuthProvider>
  )
}

function Home() {
  const { user, logout } = useAuth();

  const Card = ({ to, title, desc, icon, bg = "bg-white", onClick }) => {
    const content = (
      <div className={`p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col items-center text-center ${bg}`}>
        <div className="mb-4 flex items-center justify-center p-3 rounded-full bg-white shadow-sm border border-slate-50">{icon}</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm font-medium">{desc}</p>
      </div>
    );

    if (onClick) return <div onClick={onClick} className="w-full h-full">{content}</div>;
    return <Link to={to} className="w-full h-full block">{content}</Link>;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">

        <img src="/logo.png" alt="Legacy Clinics" className="h-24 mb-6 object-contain" />

        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 text-center">
          Queue Management System
        </h1>
        <p className="text-lg text-slate-500 mb-12 font-medium text-center max-w-2xl">
          Welcome to the central hub. Please access your designated panel below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">

          {!user ? (
            <>
              <Card to="/login" title="Staff Login" desc="Sign in to access secure panels" icon={<Lock size={36} className="text-slate-700" />} bg="bg-white" />
              <Card to="/display?floor=ground" title="Ground Floor" desc="Neurology, Cardiology" icon={<Monitor size={36} className="text-emerald-700" />} bg="bg-emerald-50/50" />
              <Card to="/display?floor=first" title="First Floor" desc="General & Specialized Depts" icon={<Monitor size={36} className="text-blue-700" />} bg="bg-blue-50/50" />
              <Card to="/display?department=Pediatrics" title="Pediatrics" desc="Children's Department display" icon={<Baby size={36} className="text-amber-500" />} bg="bg-amber-50/50" />
            </>
          ) : (
            <>
              {user.role === 'Helpdesk' && (
                <Card to="/kiosk" title="Kiosk Station" desc="Patient Self-Registration" icon={<Smartphone size={36} className="text-[#065590]" />} />
              )}

              {(user.role === 'Doctor' || user.role === 'Technician') && (
                <Card to="/dashboard"
                  title={user.role === 'Technician' ? 'Technician Dashboard' : 'Doctor Dashboard'}
                  desc="Manage your patient queue"
                  icon={user.role === 'Technician' ? <Wrench size={36} className="text-slate-700" /> : <Stethoscope size={36} className="text-[#065590]" />}
                />
              )}

              {user.role === 'Admin' && (
                <Card to="/admin" title="System Admin" desc="Manage users, rooms & settings" icon={<Settings size={36} className="text-amber-700" />} bg="bg-amber-50" />
              )}

              {user.role === 'SMS Officer' && (
                <Card to="/sms" title="SMS Communications" desc="Send notifications to patients" icon={<MessageSquare size={36} className="text-blue-600" />} bg="bg-blue-50" />
              )}

              {user.role === 'Quality' && (
                <Card to="/quality" title="Quality Dashboard" desc="Monitor compliance and stats" icon={<ShieldCheck size={36} className="text-emerald-600" />} bg="bg-emerald-50" />
              )}

              {user.role !== 'Admin' && (
                <Card to="/files" title="Document Hub" desc="Access secure organization files" icon={<FileText size={36} className="text-emerald-600" />} bg="bg-white" />
              )}

              {user.role === 'Admin' && (
                <Card to="/admin/files" title="Admin File Manager" desc="Upload and share secure files" icon={<FileText size={36} className="text-[#065590]" />} bg="bg-blue-50 hover:bg-blue-100" />
              )}

              <Card to="/display?floor=ground" title="Ground Floor" desc="Public Display Screen" icon={<Monitor size={36} className="text-emerald-700" />} bg="bg-emerald-50" />
              <Card to="/display?floor=first" title="First Floor" desc="Public Display Screen" icon={<Monitor size={36} className="text-blue-700" />} bg="bg-blue-50" />
              <Card to="/display?department=Pediatrics" title="Pediatrics" desc="Children's Display" icon={<Baby size={36} className="text-amber-500" />} bg="bg-amber-50" />

              <Card onClick={logout} title="Logout" desc="Sign out of the system" icon={<LogOut size={36} className="text-red-500" />} bg="bg-red-50 hover:bg-red-100" />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default App
