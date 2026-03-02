import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import {
    LayoutGrid, Users, Building2, BarChart3, Activity, LogOut,
    Smartphone, Stethoscope, Monitor, Baby, ArrowRight,
    PenSquare, UserPlus, Mail, Phone, Eye, EyeOff,
    Key, CheckCircle2, Ban, Trash2, Edit, AlertTriangle,
    DoorOpen, Hourglass, Volume2, Flag, Settings, Save, X, Calendar,
    CalendarDays, Search, MapPin, Clock3, UserCircle, History, FileText
} from 'lucide-react';
import Clock from '../components/Clock';
import DutyRosterPanel from '../components/DutyRosterPanel';

const API_URL = "https://" + window.location.hostname + ":8000";

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('panels');
    const [stats, setStats] = useState(null);

    // Data State
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [roles, setRoles] = useState([]);
    const [history, setHistory] = useState([]);
    const [reportSummary, setReportSummary] = useState(null);
    const [filterDept, setFilterDept] = useState('');
    const [filterDoctor, setFilterDoctor] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [selectedPatientModal, setSelectedPatientModal] = useState(null);
    const [usersError, setUsersError] = useState(null);

    // Password Reset State
    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Delete Confirmation State
    const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
    const [adminPasswordDelete, setAdminPasswordDelete] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [isHistoryPurgeModalOpen, setIsHistoryPurgeModalOpen] = useState(false);
    const [purgePassword, setPurgePassword] = useState('');
    const [purgeReason, setPurgeReason] = useState('');

    // Helpdesk Stations
    const helpdeskStations = ['Ground Floor', 'First Floor', 'Pediatrics', 'VIP'];

    // Form State
    const [newUser, setNewUser] = useState({ username: '', password: '', role_id: 1, department_id: '', room_number: '', full_name: '', email: '', phone_number: '', salutation: '' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const salutationOptions = ["Dr.", "Mr.", "Mrs.", "Ms."];
    const [newDept, setNewDept] = useState({ name: '' });
    const [newRoom, setNewRoom] = useState({ name: '', department_id: '', floor: '' });
    const [editingRoom, setEditingRoom] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Panel Selection
    const [selectedPanel, setSelectedPanel] = useState('');

    useEffect(() => {
        document.title = 'Admin Panel - Legacy Clinics'
        fetchStats();
        if (activeTab === 'users') { fetchUsers(); fetchRoles(); fetchDepartments(); fetchRooms(); }
        if (activeTab === 'room_dept') { fetchDepartments(); fetchRooms(); }
        if (activeTab === 'reports') {
            fetchHistory();
            fetchReportSummary();
            fetchDepartments();
            fetchUsers(); // To get doctor names for filter
        }

        // Greeting Logic
        if (user?.first_login_today) {
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            const name = user.salutation ? `${user.salutation} ${user.full_name || user.username}` : (user.full_name || user.username);

            // Allow time for UI to mount
            setTimeout(() => {
                // Check if already greeted to prevent double toasts if re-renders occurring
                if (!sessionStorage.getItem('greeted')) {
                    alert(`${timeGreeting}, ${name}! Welcome back.`);
                    sessionStorage.setItem('greeted', 'true');
                }
            }, 500);
        }
    }, [activeTab, filterStatus, filterDept, filterDoctor, filterStartDate, filterEndDate, user]);

    const authHeader = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats`, { headers: authHeader });
            setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchUsers = async () => {
        setUsersError(null);
        try {
            const res = await fetch(`${API_URL}/users`, { headers: authHeader });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: "Failed to fetch users" }));
                throw new Error(errorData.detail || `Server error: ${res.status}`);
            }
            setUsers(await res.json());
        } catch (e) {
            console.error(e);
            setUsersError(e.message === 'Failed to fetch'
                ? "Connection lost to backend. This is likely caused by a browser security setting or a required SSL certificate that hasn't been accepted."
                : e.message
            );
        }
    };
    const fetchRoles = async () => {
        const res = await fetch(`${API_URL}/roles`, { headers: authHeader });
        setRoles(await res.json());
    };
    const fetchDepartments = async () => {
        const res = await fetch(`${API_URL}/departments`, { headers: authHeader });
        setDepartments(await res.json());
    };
    const fetchRooms = async () => {
        const res = await fetch(`${API_URL}/rooms`, { headers: authHeader });
        setRooms(await res.json());
    };
    const fetchHistory = async () => {
        let params = new URLSearchParams({ limit: 1000 });
        if (filterStatus) params.append('status', filterStatus);
        if (filterDept) params.append('department_id', filterDept);
        if (filterDoctor) params.append('doctor_id', filterDoctor);
        if (filterStartDate) params.append('start_date', new Date(filterStartDate).toISOString());
        if (filterEndDate) params.append('end_date', new Date(filterEndDate).toISOString());

        const res = await fetch(`${API_URL}/history?${params.toString()}`, { headers: authHeader });
        if (res.ok) setHistory(await res.json());
    };

    const fetchReportSummary = async () => {
        let params = new URLSearchParams();
        if (filterStartDate) params.append('start_date', new Date(filterStartDate).toISOString());
        if (filterEndDate) params.append('end_date', new Date(filterEndDate).toISOString());

        const res = await fetch(`${API_URL}/reports/summary?${params.toString()}`, { headers: authHeader });
        if (res.ok) setReportSummary(await res.json());
    };

    const handleExportDOCX = async () => {
        let params = new URLSearchParams();
        if (filterStatus) params.append('status', filterStatus);
        if (filterDept) params.append('department_id', filterDept);
        if (filterStartDate) params.append('start_date', new Date(filterStartDate).toISOString());
        if (filterEndDate) params.append('end_date', new Date(filterEndDate).toISOString());

        // We use fetch to ensure auth headers are sent properly, then download the blob
        try {
            const response = await fetch(`${API_URL}/reports/export?${params.toString()}`, {
                headers: authHeader
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
                throw new Error(errorData.detail || "Server error during export");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Report_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error("Export failed", e);
            alert(`Failed to export .docx report: ${e.message}`);
        }
    };

    // --- Settings State and Logic ---
    const [marqueeMessage, setMarqueeMessage] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/settings/marquee_messages`, { headers: authHeader });
            if (res.ok) {
                const data = await res.json();
                setMarqueeMessage(data.value || '');
            }
        } catch (e) { console.error('Error fetching settings:', e); }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'marquee_messages',
                    value: marqueeMessage,
                    description: 'Scrolling messages at the bottom of the Queue displays'
                })
            });

            if (res.ok) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings.');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving settings.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'settings') {
            fetchSettings();
        }
    }, [activeTab]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (newUser.password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        if (newUser.password.length < 4) {
            alert('Password must be at least 4 characters');
            return;
        }
        const payload = {
            ...newUser,
            department_id: newUser.department_id || null,
            room_number: newUser.room_number || null
        };
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setNewUser({ username: '', password: '', role_id: 1, department_id: '', room_number: '', full_name: '', email: '', phone_number: '', salutation: '' });
            setConfirmPassword('');
            setShowPassword(false);
            setIsCreateModalOpen(false);
            fetchUsers();
            alert('User created successfully');
        } else {
            const data = await res.json();
            alert(data.detail || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                department_id: editingUser.department_id,
                room_number: editingUser.room_number,
                is_active: editingUser.is_active,
                full_name: editingUser.full_name,
                email: editingUser.email,
                phone_number: editingUser.phone_number,
                salutation: editingUser.salutation
            })
        });
        setEditingUser(null);
        fetchUsers();
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 4) {
            alert('Password must be at least 4 characters');
            return;
        }
        await fetch(`${API_URL}/users/${resetPasswordUser.id}`, {
            method: 'PUT',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        setResetPasswordUser(null);
        setNewPassword('');
        alert('Password reset successfully!');
        fetchUsers();
    };

    const handleDeleteUser = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/users/${deleteConfirmUser.id}`, {
                method: 'DELETE',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_password: adminPasswordDelete,
                    reason: deleteReason
                })
            });

            if (res.ok) {
                setDeleteConfirmUser(null);
                setAdminPasswordDelete('');
                setDeleteReason('');
                fetchUsers();
                alert('User deleted successfully');
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to delete user');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        }
    };

    const handlePurgeHistory = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/history`, {
                method: 'DELETE',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_password: purgePassword,
                    reason: purgeReason,
                    start_date: new Date(filterStartDate).toISOString(),
                    end_date: new Date(filterEndDate).toISOString()
                })
            });

            if (res.ok) {
                setIsHistoryPurgeModalOpen(false);
                setPurgePassword('');
                setPurgeReason('');
                fetchHistory();
                fetchReportSummary();
                alert('History purged successfully');
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to purge history');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !currentStatus })
        });
        fetchUsers();
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/departments`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(newDept)
        });
        setNewDept({ name: '' });
        fetchDepartments();
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const payload = { ...newRoom, floor: newRoom.floor || null };
        await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setNewRoom({ name: '', department_id: '', floor: '' });
        fetchRooms();
    };

    const handleUpdateRoom = async (e) => {
        e.preventDefault();
        const payload = {
            name: editingRoom.name,
            department_id: editingRoom.department_id,
            floor: editingRoom.floor || null
        };
        await fetch(`${API_URL}/rooms/${editingRoom.id}`, {
            method: 'PUT',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setEditingRoom(null);
        fetchRooms();
    };

    const openPanel = () => {
        if (selectedPanel) window.open(selectedPanel, '_blank');
    };

    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
                ${activeTab === id
                    ? 'bg-gradient-to-r from-[#065590] to-[#04437a] text-white shadow-lg shadow-blue-900/20 transform -translate-y-0.5'
                    : 'bg-white/50 text-slate-600 hover:text-[#065590] hover:bg-white border border-white/50 shadow-sm backdrop-blur-sm'}
            `}
        >
            <span>{icon}</span>
            {label}
        </button>
    );

    const inputClasses = "w-full p-3 border border-slate-200 rounded-xl bg-white/50 focus:bg-white focus:ring-4 focus:ring-[#065590]/20 focus:border-[#065590] outline-none transition-all placeholder:text-slate-400";
    const labelClasses = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1";
    const cardClasses = "bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white/50";

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 relative selection:bg-[#065590]/20 selection:text-[#065590]">
            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[100px]" />
            </div>

            {/* Header */}
            <header className="relative flex justify-between items-center bg-white/80 backdrop-blur-xl px-8 py-4 shadow-sm border-b border-white/50 z-20 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-12 object-contain" />
                    <div className="h-8 w-px bg-slate-200" />
                    <h1 className="text-slate-700 text-lg font-bold tracking-tight">System Administration</h1>
                </div>
                <div className="flex items-center gap-6">
                    <Clock />
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-slate-50/80 rounded-full border border-slate-200/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#065590] to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                            {(user?.username || 'A')[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col text-sm mr-2">
                            <span className="font-bold text-slate-700 leading-none">{user?.salutation} {user?.full_name || user?.username}</span>
                            <span className="text-[10px] bg-[#065590]/10 text-[#065590] px-1.5 py-0.5 rounded font-bold uppercase w-fit mt-0.5 tracking-wider">{user?.role}</span>
                        </div>
                    </div>
                    <button onClick={logout} className="px-5 py-2.5 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-bold border border-slate-200 shadow-sm hover:shadow-md hover:border-red-100 group flex items-center gap-2">
                        <LogOut size={16} />
                        <span className="hidden lg:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="relative z-10 flex justify-center gap-4 py-6 flex-shrink-0 overflow-x-auto px-6">
                <TabButton id="panels" label="Access Panels" icon={<LayoutGrid size={18} />} />
                <TabButton id="users" label="Manage Users" icon={<Users size={18} />} />
                <TabButton id="room_dept" label="Room & Dept." icon={<Building2 size={18} />} />
                <TabButton id="duty_roster" label="Duty Roster" icon={<CalendarDays size={18} />} />
                <TabButton id="reports" label="Reports" icon={<BarChart3 size={18} />} />
                <TabButton id="settings" label="Settings" icon={<Settings size={18} />} />
                <TabButton id="troubleshoot" label="System Dashboard" icon={<Activity size={18} />} />
            </div>

            {/* Content Area */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                <div className="max-w-7xl mx-auto pb-12">

                    {activeTab === 'panels' && (
                        <div className={cardClasses}>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <span className="p-2 bg-blue-100 rounded-lg text-[#065590]"><LayoutGrid size={24} /></span>
                                Select Panel to Launch
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {[
                                    { val: '/kiosk', label: 'Kiosk Station', desc: 'Patient Check-in', icon: <Smartphone size={24} />, color: 'bg-blue-500' },
                                    { val: '/dashboard', label: "Doctor Dashboard", desc: 'Queue View', icon: <Stethoscope size={24} />, color: 'bg-emerald-500' },
                                    { val: '/display?floor=ground', label: 'Ground Floor', desc: 'Public Display', icon: <Monitor size={24} />, color: 'bg-purple-500' },
                                    { val: '/display?floor=first', label: 'First Floor', desc: 'Public Display', icon: <Monitor size={24} />, color: 'bg-purple-500' },
                                    { val: '/display?department=Pediatrics', label: 'Pediatrics', desc: "Children's Display", icon: <Baby size={24} />, color: 'bg-orange-500' },
                                    { val: '/display', label: 'Master Display', desc: 'All Queues', icon: <Monitor size={24} />, color: 'bg-slate-800' }
                                ].map(opt => (
                                    <label key={opt.val} className={`
                                        group relative flex items-center gap-4 p-6 rounded-2xl cursor-pointer transition-all border overflow-hidden
                                        ${selectedPanel === opt.val
                                            ? 'border-[#065590] bg-white ring-4 ring-[#065590]/20 shadow-xl transform -translate-y-1'
                                            : 'border-slate-200 bg-white/50 hover:bg-white hover:shadow-lg hover:border-[#065590]/30'}
                                    `}>
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${opt.color}`}></div>
                                        <input type="radio" name="panel" value={opt.val} onChange={(e) => setSelectedPanel(e.target.value)} className="hidden" />
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${selectedPanel === opt.val ? 'bg-[#065590] text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>
                                            {opt.icon}
                                        </div>
                                        <div>
                                            <strong className={`block text-lg ${selectedPanel === opt.val ? 'text-[#065590]' : 'text-slate-800'}`}>{opt.label}</strong>
                                            <span className="text-sm text-slate-500">{opt.desc}</span>
                                        </div>
                                        {selectedPanel === opt.val && (
                                            <div className="absolute top-4 right-4 text-[#065590] animate-in zoom-in spin-in-90 duration-300">
                                                <CheckCircle2 size={24} />
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={openPanel}
                                disabled={!selectedPanel}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${selectedPanel ? 'bg-gradient-to-r from-[#065590] to-[#04437a] text-white hover:shadow-xl hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                Open Selected Panel <span className="text-xl">➔</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            {/* User List & Toolbar */}
                            <div className={cardClasses}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h3 className="font-bold text-2xl text-slate-800 tracking-tight">User Management</h3>
                                        <p className="text-sm text-slate-500 font-medium">Manage clinic staff, roles, and access credentials</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative flex-1 md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={`${inputClasses} pl-10 bg-slate-50 border-slate-200 focus:bg-white`}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="bg-[#065590] hover:bg-[#04437a] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <UserPlus size={18} /> Add New User
                                        </button>
                                    </div>
                                </div>

                                {usersError && (
                                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-5 animate-in slide-in-from-top-4 duration-500">
                                        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h4 className="font-bold text-amber-900 text-lg mb-1">Backend Connection Issue</h4>
                                            <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                                {usersError} <br className="hidden lg:block" />
                                                Please click the button to the right, then click <strong>"Advanced"</strong> and <strong>"Proceed to..."</strong> to authorize the connection.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => window.open(`${API_URL}/stats`, '_blank')}
                                            className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xl shadow-amber-600/30 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <Activity size={18} /> Authorize Connection
                                        </button>
                                    </div>
                                )}

                                <div className="overflow-x-auto -mx-6">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50/80 text-[11px] text-slate-500 uppercase tracking-wider font-bold border-y border-slate-200">
                                                <th className="py-4 px-6">User Profile</th>
                                                <th className="py-4 px-4">Contact Details</th>
                                                <th className="py-4 px-4">Role & Location</th>
                                                <th className="py-4 px-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.filter(u =>
                                                u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            ).map(u => {
                                                const roleName = roles.find(r => r.id === u.role_id)?.name;
                                                return (
                                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="py-5 px-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm
                                                                    ${roleName === 'Admin' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                                                                        roleName === 'Doctor' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                                                                            roleName === 'Helpdesk' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                                                                                'bg-gradient-to-br from-slate-500 to-slate-700'}`}>
                                                                    {(u.username || 'U')[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                                                        {u.username}
                                                                        {!u.is_active && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-red-100">Inactive</span>}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 font-medium">{u.salutation} {u.full_name || '-'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-4 text-sm text-slate-600">
                                                            <div className="flex flex-col gap-1.5">
                                                                {u.email && <span className="flex items-center gap-2 text-xs"><Mail size={13} className="text-slate-400" /> {u.email}</span>}
                                                                {u.phone_number && <span className="flex items-center gap-2 text-xs"><Phone size={13} className="text-slate-400" /> {u.phone_number}</span>}
                                                                {!u.email && !u.phone_number && <span className="text-slate-300 italic text-xs">No contact info</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${roleName === 'Admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : roleName === 'Doctor' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                    {roleName}
                                                                </span>
                                                                <div className="text-[11px] text-slate-400 font-medium ml-1">
                                                                    {roleName === 'Doctor' ? (
                                                                        <>
                                                                            {departments.find(d => d.id === u.department_id)?.name || "No Dept"}
                                                                            {u.room_number ? ` • Rm ${u.room_number}` : ''}
                                                                        </>
                                                                    ) : roleName === 'Helpdesk' ? (
                                                                        u.room_number || "No Station"
                                                                    ) : '-'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-6 text-right">
                                                            <div className="flex justify-end gap-1 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setResetPasswordUser(u)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Reset Password">
                                                                    <Key size={18} />
                                                                </button>
                                                                <button onClick={() => handleToggleActive(u.id, u.is_active)} className={`p-2.5 rounded-xl transition-colors ${u.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`} title={u.is_active ? "Deactivate" : "Activate"}>
                                                                    {u.is_active ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                                                                </button>
                                                                <button onClick={() => setEditingUser(u)} className="p-2.5 text-slate-400 hover:text-[#065590] hover:bg-blue-50 rounded-xl transition-colors" title="Edit">
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button onClick={() => setDeleteConfirmUser(u)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Delete">
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modals */}
                    {(resetPasswordUser || deleteConfirmUser || isCreateModalOpen || editingUser) && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            {/* Password Reset Modal */}
                            {resetPasswordUser && (
                                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 transform animate-in zoom-in-95 duration-200">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Key size={24} /></div>
                                    <h3 className="font-bold text-2xl mb-2 text-slate-800">Reset Password</h3>
                                    <p className="text-slate-500 mb-6 text-sm">Set a new password for <strong className="text-slate-800">{resetPasswordUser.username}</strong>.</p>
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClasses} autoFocus required />
                                        <div className="flex gap-3 mt-6">
                                            <button type="button" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancel</button>
                                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">Reset Password</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Delete Confirmation Modal */}
                            {deleteConfirmUser && (
                                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-red-500 transform animate-in zoom-in-95 duration-200">
                                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                                    <h3 className="font-bold text-2xl text-slate-800 mb-2">Confirm Delete</h3>
                                    <p className="text-slate-500 mb-6 font-medium">
                                        Are you sure you want to delete <strong className="text-slate-900">{deleteConfirmUser.username}</strong>? This action cannot be undone.
                                    </p>

                                    <form onSubmit={handleDeleteUser} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400">Reason for Deletion</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Staff resigned, incorrect entry..."
                                                value={deleteReason}
                                                onChange={(e) => setDeleteReason(e.target.value)}
                                                className={`${inputClasses}`}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400">Confirm with your Admin Password</label>
                                            <input
                                                type="password"
                                                placeholder="Enter your password"
                                                value={adminPasswordDelete}
                                                onChange={(e) => setAdminPasswordDelete(e.target.value)}
                                                className={`${inputClasses} border-red-100 focus:border-red-400 focus:ring-red-100`}
                                                required
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setDeleteConfirmUser(null); setAdminPasswordDelete(''); }}
                                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!adminPasswordDelete}
                                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                                            >
                                                Confirm Delete
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Create User Modal */}
                            {isCreateModalOpen && (
                                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xl border border-white/50 transform animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-2xl text-[#065590] flex items-center gap-2">
                                            <span className="p-2 bg-blue-100 rounded-xl text-[#065590]"><UserPlus size={24} /></span> Create New Staff
                                        </h3>
                                        <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                                    </div>
                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <div>
                                            <label className={labelClasses}>Username</label>
                                            <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className={inputClasses} placeholder="lc_yourname" required />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className={labelClasses}>Salutation</label>
                                                <select value={newUser.salutation} onChange={e => setNewUser({ ...newUser, salutation: e.target.value })} className={inputClasses}>
                                                    <option value="">Select...</option>
                                                    {salutationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className={labelClasses}>Full Name</label>
                                                <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className={inputClasses} placeholder="e.g. Joy Catherine" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Email Address</label>
                                                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={inputClasses} placeholder="staff@legacyclinics.rw" />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Phone Number</label>
                                                <input value={newUser.phone_number} onChange={e => setNewUser({ ...newUser, phone_number: e.target.value })} className={inputClasses} placeholder="+250 7..." />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Password</label>
                                                <div className="relative">
                                                    <input type={showPassword ? 'text' : 'password'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={`${inputClasses} pr-10`} required />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Confirm Password</label>
                                                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClasses} required />
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <label className={labelClasses}>Role Assignment</label>
                                            <select value={newUser.role_id} onChange={e => setNewUser({ ...newUser, role_id: parseInt(e.target.value) })} className={inputClasses}>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>

                                        {(roles.find(r => r.id === newUser.role_id)?.name === 'Doctor' || roles.find(r => r.id === newUser.role_id)?.name === 'Nurse') && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                <div>
                                                    <label className={labelClasses}>Department</label>
                                                    <select value={newUser.department_id || ''} onChange={e => setNewUser({ ...newUser, department_id: parseInt(e.target.value) || null })} className={inputClasses}>
                                                        <option value="">No Department</option>
                                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Assigned Room</label>
                                                    <select value={newUser.room_number || ''} onChange={e => setNewUser({ ...newUser, room_number: e.target.value })} className={inputClasses}>
                                                        <option value="">No Room</option>
                                                        {rooms.filter(r => !newUser.department_id || r.department_id === newUser.department_id).map(r => (
                                                            <option key={r.id} value={r.name}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" className="w-full bg-[#065590] hover:bg-[#04437a] text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4">Create User Account</button>
                                    </form>
                                </div>
                            )}

                            {/* Edit User Modal */}
                            {editingUser && (
                                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xl border border-white/50 transform animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
                                            <span className="p-2 bg-blue-100 rounded-xl text-[#065590]"><Edit size={24} /></span> Edit User
                                        </h3>
                                        <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                                    </div>
                                    <form onSubmit={handleUpdateUser} className="space-y-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-[#065590] text-white flex items-center justify-center font-bold font-lg shadow-sm">
                                                {(editingUser.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase text-slate-400">Account Username</div>
                                                <div className="font-bold text-slate-800">{editingUser.username}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className={labelClasses}>Salutation</label>
                                                <select value={editingUser.salutation || ''} onChange={e => setEditingUser({ ...editingUser, salutation: e.target.value })} className={inputClasses}>
                                                    <option value="">Select...</option>
                                                    {salutationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className={labelClasses}>Full Name</label>
                                                <input value={editingUser.full_name || ''} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className={inputClasses} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Email</label>
                                                <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={inputClasses} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Phone</label>
                                                <input value={editingUser.phone_number || ''} onChange={e => setEditingUser({ ...editingUser, phone_number: e.target.value })} className={inputClasses} />
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className={labelClasses}>Role Assignment</label>
                                            <select value={editingUser.role_id} onChange={e => setEditingUser({ ...editingUser, role_id: parseInt(e.target.value) })} className={inputClasses}>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>

                                        {(roles.find(r => r.id === editingUser.role_id)?.name === 'Doctor' || roles.find(r => r.id === editingUser.role_id)?.name === 'Nurse') && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                <div>
                                                    <label className={labelClasses}>Department</label>
                                                    <select value={editingUser.department_id || ''} onChange={e => setEditingUser({ ...editingUser, department_id: parseInt(e.target.value) || null })} className={inputClasses}>
                                                        <option value="">No Department</option>
                                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Assigned Room</label>
                                                    <select value={editingUser.room_number || ''} onChange={e => setEditingUser({ ...editingUser, room_number: e.target.value })} className={inputClasses}>
                                                        <option value="">No Room</option>
                                                        {rooms.filter(r => !editingUser.department_id || r.department_id === editingUser.department_id).map(r => (
                                                            <option key={r.id} value={r.name}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-slate-800">Account Status</div>
                                                <div className="text-xs text-slate-500 font-medium">{editingUser.is_active ? 'Active and can access portal' : 'Account is currently disabled'}</div>
                                            </div>
                                            <div className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${editingUser.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} onClick={() => setEditingUser({ ...editingUser, is_active: !editingUser.is_active })}>
                                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${editingUser.is_active ? 'translate-x-5' : ''}`} />
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-[#065590] hover:bg-[#04437a] text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4">Save Changes</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'room_dept' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className={cardClasses}>
                                <h3 className="font-bold text-lg mb-4 text-emerald-800 flex items-center gap-2">
                                    <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800"><Building2 size={20} /></span> Clinic Departments
                                </h3>
                                <div className="flex gap-3 mb-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <input placeholder="New Department Name" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} className={inputClasses} />
                                    <button onClick={handleCreateDept} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-bold shadow-md hover:shadow-lg transition-all" disabled={!newDept.name}>Add</button>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto border rounded-xl border-slate-200 bg-white/50">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Department Name</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Settings</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {departments.map(d => (
                                                <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                                        {d.name}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-bold border border-slate-200">
                                                            ID: {d.id}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={cardClasses}>
                                <h3 className="font-bold text-lg mb-4 text-[#065590] flex items-center gap-2">
                                    <span className="p-1.5 bg-blue-100 rounded-lg text-[#065590]"><DoorOpen size={20} /></span> Consultation Rooms
                                </h3>
                                <div className="flex flex-col gap-3 mb-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input placeholder="Room Number / Name" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} className={inputClasses} />
                                        <select value={newRoom.department_id} onChange={e => setNewRoom({ ...newRoom, department_id: parseInt(e.target.value) })} className={inputClasses}>
                                            <option value="">Select Department...</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <select value={newRoom.floor} onChange={e => setNewRoom({ ...newRoom, floor: e.target.value })} className={inputClasses}>
                                            <option value="">No Floor Assignment</option>
                                            <option value="ground">Ground Floor</option>
                                            <option value="first">First Floor</option>
                                            <option value="pediatrics">Pediatrics</option>
                                        </select>
                                    </div>
                                    <button onClick={handleCreateRoom} className="w-full bg-[#065590] hover:bg-[#04437a] text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all mt-2" disabled={!newRoom.name || !newRoom.department_id}>
                                        + Add New Room
                                    </button>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto border rounded-xl border-slate-200 bg-white/50">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Room</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Assigned Dept.</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Floor</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rooms.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                                    {editingRoom && editingRoom.id === r.id ? (
                                                        <td colSpan="4" className="p-4 bg-blue-50/30">
                                                            <div className="flex gap-3">
                                                                <input value={editingRoom.name} onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })} className={`${inputClasses} flex-1`} />
                                                                <select value={editingRoom.department_id} onChange={e => setEditingRoom({ ...editingRoom, department_id: parseInt(e.target.value) })} className={`${inputClasses} flex-1`}>
                                                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                                </select>
                                                                <select value={editingRoom.floor || ''} onChange={e => setEditingRoom({ ...editingRoom, floor: e.target.value })} className={`${inputClasses} flex-1`}>
                                                                    <option value="">No Floor</option>
                                                                    <option value="ground">Ground Floor</option>
                                                                    <option value="first">First Floor</option>
                                                                    <option value="pediatrics">Pediatrics</option>
                                                                </select>
                                                                <div className="flex gap-2 items-center">
                                                                    <button onClick={handleUpdateRoom} className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"><Save size={18} /></button>
                                                                    <button onClick={() => setEditingRoom(null)} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"><LogOut size={18} className="rotate-180" /></button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td className="p-4 font-bold text-slate-800">{r.name}</td>
                                                            <td className="p-4">
                                                                {departments.find(d => d.id === r.department_id) ? (
                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-200">
                                                                        {departments.find(d => d.id === r.department_id).name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {r.floor === 'ground' ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold border border-purple-200">Ground Floor</span>
                                                                    : r.floor === 'first' ? <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold border border-indigo-200">First Floor</span>
                                                                        : r.floor === 'pediatrics' ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold border border-orange-200">Pediatrics</span>
                                                                            : <span className="text-xs text-slate-400 italic">None</span>}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button onClick={() => setEditingRoom(r)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Edit size={16} />
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'troubleshoot' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className={`${cardClasses} flex items-center gap-4 !p-6`}>
                                    <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl"><Hourglass size={24} /></div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800">{stats?.queue?.waiting || 0}</div>
                                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wide">Waiting Now</div>
                                    </div>
                                </div>
                                <div className={`${cardClasses} flex items-center gap-4 !p-6`}>
                                    <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><Volume2 size={24} /></div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800">{stats?.queue?.calling || 0}</div>
                                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wide">Active Calls</div>
                                    </div>
                                </div>
                                <div className={`${cardClasses} flex items-center gap-4 !p-6`}>
                                    <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><Flag size={24} /></div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800">{stats?.history_count_today || '0'}</div>
                                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wide">Completed Today</div>
                                    </div>
                                </div>
                                <div className={`${cardClasses} flex items-center gap-4 !p-6`}>
                                    <div className="bg-purple-100 text-purple-600 p-4 rounded-2xl"><Stethoscope size={24} /></div>
                                    <div>
                                        <div className="text-3xl font-bold text-slate-800">{users.filter(u => u.role_id === 2 && u.is_active).length}</div>
                                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wide">Active Doctors</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className={cardClasses}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="font-bold text-xl text-slate-800">System Metrics</h2>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 animate-pulse">● System Online</span>
                                    </div>
                                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner border border-slate-700">
                                        <pre>{JSON.stringify(stats, null, 2)}</pre>
                                    </div>
                                </div>

                                <div className={`${cardClasses} border-red-100 relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 p-32 bg-red-50 rounded-full blur-3xl opacity-50 pointer-events-none -mr-16 -mt-16"></div>
                                    <h3 className="text-red-700 font-bold text-xl mb-2 relative z-10 flex items-center gap-2"><AlertTriangle size={24} /> Danger Zone</h3>
                                    <p className="text-slate-500 mb-8 text-sm relative z-10">Administrative actions that affect live data. Proceed with caution.</p>

                                    <div className="space-y-4 relative z-10">
                                        <button onClick={async () => {
                                            if (confirm('Clear ALL waiting patients from the queue? This cannot be undone.')) {
                                                await fetch(`${API_URL}/reset-queue`, { method: 'POST', headers: authHeader });
                                                fetchStats(); alert('Queue Cleared');
                                            }
                                        }} className="w-full flex items-center justify-between px-6 py-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shadow-sm group">
                                            <span>Clear Waiting Queue</span>
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs group-hover:bg-red-200 transition">Reset</span>
                                        </button>

                                        <button onClick={async () => {
                                            if (confirm('Clear ALL active calls? Monitors will stop showing current calls.')) {
                                                const res = await fetch(`${API_URL}/reset-calling`, { method: 'POST', headers: authHeader });
                                                const data = await res.json(); fetchStats(); alert(data.message);
                                            }
                                        }} className="w-full flex items-center justify-between px-6 py-4 bg-white border border-orange-200 text-orange-600 font-bold rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all shadow-sm group">
                                            <span>Reset Active Calls</span>
                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs group-hover:bg-orange-200 transition">Reset</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="space-y-6">
                            {/* Reports Dashboard */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => { setFilterStatus(''); setFilterDept(''); setFilterStartDate(''); setFilterEndDate(''); setSearchTerm(''); }}
                                    className={`${cardClasses} p-6 border-l-4 border-l-indigo-500 text-left transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-indigo-500/10 group active:scale-95`}
                                >
                                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">Total Visits</div>
                                    <div className="text-3xl font-black text-slate-800">{reportSummary?.total || 0}</div>
                                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                                        <Activity size={12} className="text-indigo-400" /> View All Records
                                    </div>
                                </button>

                                <button
                                    onClick={() => setFilterStatus('completed')}
                                    className={`${cardClasses} p-6 border-l-4 border-l-emerald-500 text-left transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-emerald-500/10 group active:scale-95`}
                                >
                                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Completion Rate</div>
                                    <div className="text-3xl font-black text-slate-800">
                                        {reportSummary ? Math.round((reportSummary.completed / reportSummary.total) * 100) || 0 : 0}%
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                                        <CheckCircle2 size={12} className="text-emerald-500" /> {reportSummary?.completed || 0} Successful
                                    </div>
                                </button>

                                <button
                                    onClick={() => setFilterStatus('waiting')}
                                    className={`${cardClasses} p-6 border-l-4 border-l-amber-500 text-left transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-amber-500/10 group active:scale-95`}
                                >
                                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Avg Wait Time</div>
                                    <div className="text-3xl font-black text-slate-800">{reportSummary?.avg_wait_time || 0}<span className="text-lg font-bold ml-1 text-slate-400">m</span></div>
                                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                                        <Hourglass size={12} className="text-amber-500" /> Wait Metrics
                                    </div>
                                </button>

                                <button
                                    onClick={() => setFilterStatus('in-consultation')}
                                    className={`${cardClasses} p-6 border-l-4 border-l-blue-500 text-left transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-blue-500/10 group active:scale-95`}
                                >
                                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 group-hover:text-blue-600 transition-colors">Avg Service Time</div>
                                    <div className="text-3xl font-black text-slate-800">{reportSummary?.avg_service_time || 0}<span className="text-lg font-bold ml-1 text-slate-400">m</span></div>
                                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                                        <Stethoscope size={12} className="text-blue-500" /> Service Speed
                                    </div>
                                </button>
                            </div>

                            <div className={cardClasses}>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                                            <span className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20"><BarChart3 size={24} /></span>
                                            Global Patient History
                                        </h3>
                                        <button
                                            onClick={handleExportDOCX}
                                            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                                        >
                                            <FileText size={18} /> Export as .docx
                                        </button>
                                    </div>

                                    {/* Advanced Filters */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></span>
                                            <input type="text" placeholder="Search tokens/names..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputClasses} py-2 !pl-9 shadow-sm border-white`} />
                                        </div>
                                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputClasses} py-2 shadow-sm border-white`}>
                                            <option value="">All Statuses</option>
                                            <option value="completed">✅ Completed</option>
                                            <option value="no-show">👻 No-Show</option>
                                            <option value="expired">⏳ Expired</option>
                                        </select>
                                        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={`${inputClasses} py-2 shadow-sm border-white`}>
                                            <option value="">All Departments</option>
                                            {departments
                                                .filter(d => ![
                                                    'Admin', 'Administration', 'Finance', 'HR', 'Human Resources',
                                                    'Call center', 'Customer Care', 'Marketing', 'Stock',
                                                    'Archive', 'Auditor', 'Operations', 'Team Leader',
                                                    'Internal Auditor', 'Finance', 'Stock'
                                                ].some(keyword => d.name.toLowerCase().includes(keyword.toLowerCase())))
                                                .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                                            }
                                        </select>
                                        <div className="flex items-center gap-2 lg:col-span-2 bg-white px-3 py-1 rounded-xl border border-white shadow-sm">
                                            <Calendar size={16} className="text-slate-400 shrink-0" />
                                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm py-1" />
                                            <span className="text-slate-300">→</span>
                                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-sm py-1" />
                                        </div>
                                    </div>

                                    {/* Purge Control */}
                                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2 text-red-800 font-bold text-[10px] uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-red-100">
                                            <Trash2 size={14} /> Data Retention
                                        </div>
                                        <p className="text-xs text-red-600/70 font-medium max-w-sm">Use the dates above to select a range, then click purge to permanently delete historical records.</p>
                                        <button onClick={() => {
                                            if (!filterStartDate || !filterEndDate) return alert("Please select a date range using the filters above first.");
                                            setIsHistoryPurgeModalOpen(true);
                                        }} className="ml-auto bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-200 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-red-200/50">
                                            Purge Selected Range
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800 text-[10px] font-black text-slate-200 uppercase tracking-widest border-b border-slate-700">
                                                    <th className="p-5">Token</th>
                                                    <th className="p-5">Patient Details</th>
                                                    <th className="p-5">Process Status</th>
                                                    <th className="p-5">Created</th>
                                                    <th className="p-5 text-amber-300">Wait Duration</th>
                                                    <th className="p-5 text-sky-300">Service Duration</th>
                                                    <th className="p-5">Attending Staff</th>
                                                    <th className="p-5 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-600">
                                                {history.filter(h =>
                                                    (h.patient_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                                    (h.token_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                                                ).map(h => {
                                                    // Calculate Wait Time
                                                    let waitDisp = '-';
                                                    if (h.created_at && h.called_at) {
                                                        const start = new Date(h.created_at + (h.created_at.endsWith('Z') ? '' : 'Z'));
                                                        const end = new Date(h.called_at + (h.called_at.endsWith('Z') ? '' : 'Z'));
                                                        const mins = Math.floor((end - start) / 60000);
                                                        waitDisp = `${mins}m`;
                                                    }

                                                    // Calculate Service Time
                                                    let servDisp = '-';
                                                    if (h.called_at && h.completed_at) {
                                                        const start = new Date(h.called_at + (h.called_at.endsWith('Z') ? '' : 'Z'));
                                                        const end = new Date(h.completed_at + (h.completed_at.endsWith('Z') ? '' : 'Z'));
                                                        const mins = Math.floor((end - start) / 60000);
                                                        const secs = Math.floor(((end - start) % 60000) / 1000);
                                                        servDisp = `${mins}m ${secs}s`;
                                                    }

                                                    return (
                                                        <tr key={h.id}
                                                            onClick={() => setSelectedPatientModal(h)}
                                                            className="group cursor-pointer hover:bg-indigo-50/50 even:bg-slate-50/30 transition-all duration-200">
                                                            <td className="p-4">
                                                                <div className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block text-xs border border-indigo-100">{h.token_number}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800">{h.patient_name}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{h.visit_type || 'General'}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                                                    ${h.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                        h.status === 'no-show' ? 'bg-slate-100 text-slate-700' :
                                                                            h.status === 'calling' ? 'bg-indigo-100 text-indigo-700' :
                                                                                'bg-amber-100 text-amber-700'}`}>
                                                                    {h.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="text-slate-700 font-bold">{h.created_at ? new Date(h.created_at + (h.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">{h.created_at ? new Date(h.created_at + (h.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString() : ''}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className={`font-black text-xs ${parseInt(waitDisp) > 15 ? 'text-amber-600' : 'text-slate-500'}`}>{waitDisp}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-black text-xs text-indigo-500">{servDisp}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">{(h.doctor_name || 'U')[0]}</div>
                                                                    <div className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{h.doctor_name || '-'}</div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Delete this historical record permanently?')) {
                                                                        fetch(`${API_URL}/history/${h.id}`, { method: 'DELETE', headers: authHeader }).then(() => {
                                                                            fetchHistory();
                                                                            fetchReportSummary();
                                                                        })
                                                                    }
                                                                }} className="text-slate-300 hover:text-red-600 p-2 transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {history.length === 0 && (
                                                    <tr>
                                                        <td colSpan="8" className="p-16 text-center">
                                                            <div className="text-slate-300 mb-2 font-black text-4xl">📭</div>
                                                            <div className="text-slate-400 font-bold">No records matching your filters.</div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'duty_roster' && (
                        <div className="max-w-7xl mx-auto">
                            <DutyRosterPanel authHeader={authHeader} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-4xl mx-auto">
                            <div className={cardClasses}>
                                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                                    <div className="p-3 bg-blue-50 text-[#065590] rounded-xl"><Settings size={24} /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h2>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Configure global display and application parameters.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveSettings} className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors">
                                        <label className={labelClasses}>
                                            Display Screen Marquee Messages
                                        </label>
                                        <p className="text-xs text-slate-500 mb-3 ml-1 font-medium">
                                            These messages will scroll continuously at the bottom of the TV displays. Enter each message on a <strong className="text-slate-800">new line</strong>.
                                        </p>
                                        <textarea
                                            value={marqueeMessage}
                                            onChange={(e) => setMarqueeMessage(e.target.value)}
                                            rows="8"
                                            className={`${inputClasses} font-mono text-sm leading-relaxed resize-y`}
                                            placeholder="Welcome to Legacy Clinics...&#10;Please have your insurance card ready..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSavingSettings}
                                            className="px-8 py-3.5 bg-gradient-to-r from-[#065590] to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Save size={18} />
                                            {isSavingSettings ? 'Saving...' : 'Save Settings'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Patient Details Modal */}
            {selectedPatientModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-[#065590] to-[#04437a] p-6 relative">
                            <button
                                onClick={() => setSelectedPatientModal(null)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-white text-2xl font-black tracking-tight">{selectedPatientModal.token_number}</h2>
                            <p className="text-blue-100 font-medium mt-1">{selectedPatientModal.patient_name || 'Walk-in Patient'}</p>

                            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-white text-sm font-semibold border border-white/10">
                                <Activity size={14} />
                                {selectedPatientModal.status.toUpperCase()}
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Journey Timeline */}
                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">

                                {/* 1. Registration */}
                                <div className="relative flex items-center justify-between gap-4 group">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 z-10 shrink-0 ring-4 ring-white">
                                            <UserPlus size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-1">Registered</div>
                                            <div className="text-sm font-bold text-slate-800">Arrival & Token Issued</div>
                                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                <UserCircle size={10} /> Received by: <span className="text-slate-700 font-bold">{selectedPatientModal.registrar_name || 'System / Kiosk'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-slate-800">{new Date(selectedPatientModal.created_at + (selectedPatientModal.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(selectedPatientModal.created_at + (selectedPatientModal.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                </div>

                                {/* 2. In Queue */}
                                {selectedPatientModal.called_at && (
                                    <div className="relative flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-200 z-10 shrink-0 ring-4 ring-white">
                                                <Hourglass size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-amber-600 tracking-widest leading-none mb-1">Queueing</div>
                                                <div className="text-sm font-bold text-slate-800">Time Spent in Waiting Area</div>
                                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                    <Clock3 size={10} /> Duration: <span className="text-amber-700 font-black">
                                                        {Math.floor((new Date(selectedPatientModal.called_at + (selectedPatientModal.called_at.endsWith('Z') ? '' : 'Z')) - new Date(selectedPatientModal.created_at + (selectedPatientModal.created_at.endsWith('Z') ? '' : 'Z'))) / 60000)} mins
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Called / With Staff */}
                                {selectedPatientModal.called_at && (
                                    <div className="relative flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 z-10 shrink-0 ring-4 ring-white">
                                                <Stethoscope size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-blue-500 tracking-widest leading-none mb-1">Consultation</div>
                                                <div className="text-sm font-bold text-slate-800">Medical Service Initiated</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                        <MapPin size={10} /> Room: <span className="text-slate-700 font-bold">{selectedPatientModal.room_number || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                        <UserCircle size={10} /> Staff: <span className="text-slate-700 font-bold">{selectedPatientModal.doctor_name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right self-start mt-2">
                                            <div className="text-xs font-black text-slate-800">{new Date(selectedPatientModal.called_at + (selectedPatientModal.called_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. End of Service */}
                                {selectedPatientModal.completed_at && (
                                    <div className="relative flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200 z-10 shrink-0 ring-4 ring-white">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-emerald-600 tracking-widest leading-none mb-1">Completed</div>
                                                <div className="text-sm font-bold text-emerald-800">Session Closed</div>
                                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                    <Activity size={10} /> Total Service Time: <span className="text-emerald-700 font-black">
                                                        {Math.floor((new Date(selectedPatientModal.completed_at + (selectedPatientModal.completed_at.endsWith('Z') ? '' : 'Z')) - new Date(selectedPatientModal.called_at + (selectedPatientModal.called_at.endsWith('Z') ? '' : 'Z'))) / 60000)}m {Math.floor(((new Date(selectedPatientModal.completed_at + (selectedPatientModal.completed_at.endsWith('Z') ? '' : 'Z')) - new Date(selectedPatientModal.called_at + (selectedPatientModal.called_at.endsWith('Z') ? '' : 'Z'))) % 60000) / 1000)}s
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-slate-800">{new Date(selectedPatientModal.completed_at + (selectedPatientModal.completed_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Info Footer */}
                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Category</div>
                                    <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                        {selectedPatientModal.visit_type || 'General'}
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Class</div>
                                    <div className={`text-sm font-bold ${selectedPatientModal.priority_name === 'Emergency' ? 'text-red-600' : 'text-slate-700'}`}>
                                        {selectedPatientModal.priority_name || 'Standard'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Purge Modal */}
            {isHistoryPurgeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-amber-500 transform animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                        <h3 className="font-bold text-2xl text-slate-800 mb-2">Critical Purge</h3>
                        <p className="text-slate-500 mb-6 font-medium">
                            You are about to permanently delete history from <strong className="text-slate-900">{filterStartDate}</strong> to <strong className="text-slate-900">{filterEndDate}</strong>. This cannot be undone.
                        </p>

                        <form onSubmit={handlePurgeHistory} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">Reason for Purge</label>
                                <input
                                    type="text"
                                    placeholder="e.g. End of month cleanup, GDPR compliance..."
                                    value={purgeReason}
                                    onChange={(e) => setPurgeReason(e.target.value)}
                                    className={`${inputClasses}`}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">Admin Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={purgePassword}
                                    onChange={(e) => setPurgePassword(e.target.value)}
                                    className={`${inputClasses} border-amber-100 focus:border-amber-400 focus:ring-amber-100`}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsHistoryPurgeModalOpen(false); setPurgePassword(''); setPurgeReason(''); }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!purgePassword || !purgeReason}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-[0.98]"
                                >
                                    Purge Records
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
