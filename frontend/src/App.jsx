import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Kiosk from './pages/Kiosk'
import Dashboard from './pages/Dashboard'
import Display from './pages/Display'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'

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
        <div className="text-4xl mb-4">{icon}</div>
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
              <Card to="/login" title="Staff Login" desc="Sign in to access secure panels" icon="🔐" bg="bg-white" />
              <Card to="/display?floor=ground" title="Ground Floor" desc="Neurology, Cardiology" icon="📺" bg="bg-emerald-50/50" />
              <Card to="/display?floor=first" title="First Floor" desc="General & Specialized Depts" icon="📺" bg="bg-blue-50/50" />
              <Card to="/display?department=Pediatrics" title="Pediatrics" desc="Children's Department display" icon="👶" bg="bg-amber-50/50" />
            </>
          ) : (
            <>
              {(user.role === 'Helpdesk' || user.role === 'Admin') && (
                <Card to="/kiosk" title="Kiosk Station" desc="Patient Self-Registration" icon="📱" />
              )}

              {(user.role === 'Doctor' || user.role === 'Technician' || user.role === 'Admin') && (
                <Card to="/dashboard"
                  title={user.role === 'Technician' ? 'Technician Dashboard' : 'Doctor Dashboard'}
                  desc="Manage your patient queue"
                  icon={user.role === 'Technician' ? '🔧' : '👨‍⚕️'}
                />
              )}

              {user.role === 'Admin' && (
                <Card to="/admin" title="System Admin" desc="Manage users, rooms & settings" icon="🛠️" bg="bg-amber-50" />
              )}

              <Card to="/display?floor=ground" title="Ground Floor" desc="Public Display Screen" icon="📺" bg="bg-emerald-50" />
              <Card to="/display?floor=first" title="First Floor" desc="Public Display Screen" icon="📺" bg="bg-blue-50" />
              <Card to="/display?department=Pediatrics" title="Pediatrics" desc="Children's Display" icon="👶" bg="bg-amber-50" />

              <Card onClick={logout} title="Logout" desc="Sign out of the system" icon="🚪" bg="bg-red-50 hover:bg-red-100" />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default App
