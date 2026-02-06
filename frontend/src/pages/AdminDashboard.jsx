import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000';

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
    const [editingUser, setEditingUser] = useState(null);

    // Password Reset State
    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Delete Confirmation State
    const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

    // Helpdesk Stations
    const helpdeskStations = ['Ground Floor', 'First Floor', 'VIP'];

    // Form State
    const [newUser, setNewUser] = useState({ username: '', password: '', role_id: 1, department_id: '', room_number: '' });
    const [newDept, setNewDept] = useState({ name: '' });
    const [newRoom, setNewRoom] = useState({ name: '', department_id: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Panel Selection
    const [selectedPanel, setSelectedPanel] = useState('');

    useEffect(() => {
        document.title = 'Admin Panel - Legacy Clinics'
        fetchStats();
        if (activeTab === 'users') { fetchUsers(); fetchRoles(); fetchDepartments(); fetchRooms(); }
        if (activeTab === 'room_dept') { fetchDepartments(); fetchRooms(); }
        if (activeTab === 'reports') fetchHistory();
    }, [activeTab, filterStatus]);

    const authHeader = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats`, { headers: authHeader });
            setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchUsers = async () => {
        const res = await fetch(`${API_URL}/users`, { headers: authHeader });
        setUsers(await res.json());
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
        let url = `${API_URL}/history?limit=1000`;
        if (filterStatus) url += `&status=${filterStatus}`;
        const res = await fetch(url, { headers: authHeader });
        setHistory(await res.json());
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        setNewUser({ username: '', password: '', role_id: 1 });
        fetchUsers();
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                department_id: editingUser.department_id,
                room_number: editingUser.room_number,
                is_active: editingUser.is_active
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

    const handleDeleteUser = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${deleteConfirmUser.id}`, {
                method: 'DELETE',
                headers: authHeader
            });
            if (res.ok) {
                alert('User deleted successfully!');
                setDeleteConfirmUser(null);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to delete user');
            }
        } catch (e) {
            alert('Error deleting user');
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
        await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(newRoom)
        });
        setNewRoom({ name: '', department_id: '' });
        fetchRooms();
    };

    const openPanel = () => {
        if (selectedPanel) window.open(selectedPanel, '_blank');
    };

    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                px-5 py-2.5 rounded-xl font-bold text-sm transition-all
                ${activeTab === id
                    ? 'bg-[#065590] text-white shadow-md transform -translate-y-0.5'
                    : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm'}
            `}
        >
            {label}
        </button>
    );

    const inputClasses = "w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-4 focus:ring-[#065590]/20 focus:border-[#065590] outline-none transition-all placeholder:text-slate-400";
    const labelClasses = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";
    const cardClasses = "bg-white p-8 rounded-2xl shadow-xl border border-slate-200";

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans text-[#065590]">
            {/* Header */}
            <header className="flex justify-between items-center bg-white px-6 py-3 shadow-sm border-b border-slate-200 z-20 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 object-contain" />
                    <h1 className="text-slate-800 text-lg font-bold tracking-tight">System Administration</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        {user?.username} <span className="text-slate-300">|</span> <span className="text-[#065590] font-bold">{user?.role}</span>
                    </span>
                    <button onClick={logout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition text-sm font-bold border border-red-100">
                        Logout
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex justify-center gap-3 py-4 z-10 flex-shrink-0 overflow-x-auto px-4">
                <TabButton id="panels" label="Access Panels" />
                <TabButton id="users" label="Manage Users" />
                <TabButton id="room_dept" label="Room & Dept. Management" />
                <TabButton id="reports" label="Reports (History)" />
                <TabButton id="troubleshoot" label="Troubleshoot" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto">

                    {activeTab === 'panels' && (
                        <div className={cardClasses}>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Select Panel to Launch</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {[
                                    { val: '/kiosk', label: 'Kiosk Station', desc: 'Patient Check-in', icon: '📱' },
                                    { val: '/dashboard', label: "Doctor Dashboard", desc: 'Queue View', icon: '👨‍⚕️' },
                                    { val: '/display?floor=ground', label: 'Ground Floor', desc: 'Public Display', icon: '📺' },
                                    { val: '/display?floor=first', label: 'First Floor', desc: 'Public Display', icon: '📺' },
                                    { val: '/display?department=Pediatrics', label: 'Pediatrics', desc: "Children's Display", icon: '👶' },
                                    { val: '/display', label: 'Master Display', desc: 'All Queues', icon: '📺' }
                                ].map(opt => (
                                    <label key={opt.val} className={`
                                        flex items-center gap-4 p-6 rounded-2xl cursor-pointer transition-all border
                                        ${selectedPanel === opt.val
                                            ? 'border-[#065590] bg-[#065590] text-white shadow-xl ring-4 ring-slate-200 transform -translate-y-1'
                                            : 'border-slate-200 bg-white hover:border-[#065590]/50 hover:bg-slate-50 hover:shadow-lg'}
                                    `}>
                                        <input type="radio" name="panel" value={opt.val} onChange={(e) => setSelectedPanel(e.target.value)} className="hidden" />
                                        <div className="text-4xl">{opt.icon}</div>
                                        <div>
                                            <strong className={`block text-lg ${selectedPanel === opt.val ? 'text-white' : 'text-slate-800'}`}>{opt.label}</strong>
                                            <span className={`text-sm ${selectedPanel === opt.val ? 'text-slate-300' : 'text-slate-500'}`}>{opt.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={openPanel}
                                disabled={!selectedPanel}
                                className={`w-full py-5 rounded-2xl font-bold text-xl shadow-xl transition-all ${selectedPanel ? 'bg-[#065590] text-white hover:bg-[#04437a] hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                            >
                                Open Selected Panel ➔
                            </button>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-6">
                            {/* User Form */}
                            <div className={`${cardClasses} h-fit`}>
                                {editingUser ? (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-lg">Edit User</h3>
                                            <button onClick={() => setEditingUser(null)} className="text-sm bg-slate-100 px-3 py-1 rounded hover:bg-slate-200">Cancel</button>
                                        </div>
                                        <form onSubmit={handleUpdateUser} className="space-y-4">
                                            <div className="p-3 bg-slate-100 rounded font-bold text-slate-700 border border-slate-200">{editingUser.username}</div>

                                            <div>
                                                <label className={labelClasses}>Role</label>
                                                <select value={editingUser.role_id} onChange={e => setEditingUser({ ...editingUser, role_id: parseInt(e.target.value) })} className={inputClasses}>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>

                                            {roles.find(r => r.id === editingUser.role_id)?.name === 'Doctor' && (
                                                <>
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
                                                </>
                                            )}

                                            {roles.find(r => r.id === editingUser.role_id)?.name === 'Helpdesk' && (
                                                <div>
                                                    <label className={labelClasses}>Station</label>
                                                    <select value={editingUser.room_number || ''} onChange={e => setEditingUser({ ...editingUser, room_number: e.target.value })} className={inputClasses}>
                                                        <option value="">Select Station</option>
                                                        {helpdeskStations.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                                                <input
                                                    type="checkbox"
                                                    id="isActiveEdit"
                                                    checked={editingUser.is_active}
                                                    onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                                                />
                                                <label htmlFor="isActiveEdit" className="font-medium text-slate-700 cursor-pointer select-none">Active Account</label>
                                            </div>

                                            <button type="submit" className="w-full bg-[#065590] hover:bg-[#04437a] text-white font-bold py-3 rounded-xl shadow-md transition-all">Save Changes</button>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-bold text-lg mb-4 text-[#065590]">Create User</h3>
                                        <form onSubmit={handleCreateUser} className="space-y-4">
                                            <div>
                                                <label className={labelClasses}>Username</label>
                                                <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className={inputClasses} placeholder="e.g. nurse_joy" required />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Password</label>
                                                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={inputClasses} placeholder="•••••••" required />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Role</label>
                                                <select value={newUser.role_id} onChange={e => setNewUser({ ...newUser, role_id: parseInt(e.target.value) })} className={inputClasses}>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>

                                            {roles.find(r => r.id === newUser.role_id)?.name === 'Doctor' && (
                                                <>
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
                                                </>
                                            )}

                                            {roles.find(r => r.id === newUser.role_id)?.name === 'Helpdesk' && (
                                                <div>
                                                    <label className={labelClasses}>Station</label>
                                                    <select value={newUser.room_number || ''} onChange={e => setNewUser({ ...newUser, room_number: e.target.value })} className={inputClasses}>
                                                        <option value="">Select Station</option>
                                                        {helpdeskStations.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <button type="submit" className="w-full bg-[#065590] hover:bg-[#04437a] text-white font-bold py-3 rounded-xl shadow-md transition-all">Create User</button>
                                        </form>
                                    </>
                                )}
                            </div>

                            {/* User List */}
                            <div className={cardClasses}>
                                <h3 className="font-bold text-lg mb-4 text-slate-800">All Users</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                                                <th className="p-4">Username</th>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">Dept / Station</th>
                                                <th className="p-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.map(u => {
                                                const roleName = roles.find(r => r.id === u.role_id)?.name;
                                                return (
                                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 font-medium text-[#065590]">
                                                            {u.username}
                                                            {!u.is_active && <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded font-bold uppercase">Inactive</span>}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${roleName === 'Admin' ? 'bg-purple-100 text-purple-700' : roleName === 'Doctor' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {roleName}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-sm text-slate-600">
                                                            {roleName === 'Doctor' ? (
                                                                <>
                                                                    {departments.find(d => d.id === u.department_id)?.name || '-'}
                                                                    {u.room_number ? <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Rm {u.room_number}</span> : ''}
                                                                </>
                                                            ) : roleName === 'Helpdesk' ? (
                                                                u.room_number || '-'
                                                            ) : '-'}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setResetPasswordUser(u)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Reset Password">🔑</button>
                                                                <button onClick={() => setDeleteConfirmUser(u)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete">🗑️</button>
                                                                <button onClick={() => handleToggleActive(u.id, u.is_active)} className={`p-2 rounded ${u.is_active ? 'bg-[#065590]/10 text-[#065590] hover:bg-[#065590]/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={u.is_active ? "Deactivate" : "Activate"}>
                                                                    {u.is_active ? '✓' : '✗'}
                                                                </button>
                                                                <button onClick={() => setEditingUser(u)} className="p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100" title="Edit">✏️</button>
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
                    {(resetPasswordUser || deleteConfirmUser) && (
                        <div className="fixed inset-0 bg-[#065590]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
                            {resetPasswordUser && (
                                <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                                    <h3 className="font-bold text-xl mb-4">Reset Password</h3>
                                    <p className="text-slate-500 mb-4 text-sm">Set a new password for <strong>{resetPasswordUser.username}</strong>.</p>
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClasses} autoFocus required />
                                        <div className="flex gap-3">
                                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors">Reset</button>
                                            <button type="button" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors">Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {deleteConfirmUser && (
                                <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border-t-8 border-red-500">
                                    <h3 className="font-bold text-xl text-red-600 mb-2">Delete User?</h3>
                                    <p className="text-slate-600 mb-6">
                                        Are you sure you want to delete <strong>{deleteConfirmUser.username}</strong>? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={handleDeleteUser} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">Yes, Delete</button>
                                        <button onClick={() => setDeleteConfirmUser(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'room_dept' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className={cardClasses}>
                                <h3 className="font-bold text-lg mb-4 text-emerald-800">Departments</h3>
                                <div className="flex gap-3 mb-6">
                                    <input placeholder="New Department" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} className={inputClasses} />
                                    <button onClick={handleCreateDept} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-lg font-bold" disabled={!newDept.name}>Add</button>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto border rounded-xl border-slate-200">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Name</th>
                                                <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {departments.map(d => (
                                                <tr key={d.id}>
                                                    <td className="p-3 font-medium text-slate-800">{d.name}</td>
                                                    <td className="p-3 text-slate-400 font-mono text-right">{d.id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={cardClasses}>
                                <h3 className="font-bold text-lg mb-4 text-[#065590]">Rooms</h3>
                                <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex gap-3">
                                        <input placeholder="Room No." value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} className={`${inputClasses} flex-1`} />
                                        <select value={newRoom.department_id} onChange={e => setNewRoom({ ...newRoom, department_id: parseInt(e.target.value) })} className={`${inputClasses} flex-[2]`}>
                                            <option value="">Select Dept...</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleCreateRoom} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold" disabled={!newRoom.name || !newRoom.department_id}>Add Room</button>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto border rounded-xl border-slate-200">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Room</th>
                                                <th className="p-3 text-xs font-bold text-slate-500 uppercase">Department</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rooms.map(r => (
                                                <tr key={r.id}>
                                                    <td className="p-3 font-bold text-slate-800">{r.name}</td>
                                                    <td className="p-3 text-slate-600">{departments.find(d => d.id === r.department_id)?.name || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'troubleshoot' && (
                        <div className={cardClasses}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-bold text-xl">System Health</h2>
                                <span className="bg-[#065590]/10 text-[#065590] px-3 py-1 rounded-full text-sm font-bold border border-[#065590]/20 animate-pulse">● Online</span>
                            </div>

                            <div className="bg-[#065590] rounded-xl p-6 font-mono text-sm text-white overflow-x-auto mb-8 shadow-inner">
                                <pre>{JSON.stringify(stats, null, 2)}</pre>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-red-600 font-bold mb-2">⚠️ Danger Zone</h3>
                                <p className="text-slate-500 mb-4 text-sm">Destructive actions. Proceed with caution.</p>
                                <div className="flex gap-4">
                                    <button onClick={async () => {
                                        if (confirm('Clear ALL waiting patients?')) {
                                            await fetch(`${API_URL}/reset-queue`, { method: 'POST', headers: authHeader });
                                            fetchStats(); alert('Queue Cleared');
                                        }
                                    }} className="px-6 py-3 bg-[#64af45]/10 text-[#64af45] font-bold rounded-xl hover:bg-[#64af45]/20 border border-[#64af45]/20 transition">
                                        Clear Waiting Queue
                                    </button>
                                    <button onClick={async () => {
                                        if (confirm('Clear ALL active calls?')) {
                                            const res = await fetch(`${API_URL}/reset-calling`, { method: 'POST', headers: authHeader });
                                            const data = await res.json(); fetchStats(); alert(data.message);
                                        }
                                    }} className="px-6 py-3 bg-[#64af45]/10 text-[#64af45] font-bold rounded-xl hover:bg-[#64af45]/20 border border-[#64af45]/20 transition">
                                        Reset Active Calls
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className={cardClasses}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <h3 className="font-bold text-xl text-slate-800">Global Patient History</h3>
                                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputClasses} py-2 !w-40`} />
                                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputClasses} py-2 !w-40`}>
                                        <option value="">All Statuses</option>
                                        <option value="completed">Completed</option>
                                        <option value="no-show">No-Show</option>
                                        <option value="expired">Expired</option>
                                        <option value="calling">Calling</option>
                                        <option value="waiting">Waiting</option>
                                    </select>
                                </div>
                            </div>

                            {/* Purge Control */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
                                <span className="font-bold text-xs uppercase text-slate-500">Purge Records:</span>
                                <input type="date" id="start_date" className="p-2 border rounded text-sm text-slate-700" />
                                <span className="text-slate-400">to</span>
                                <input type="date" id="end_date" className="p-2 border rounded text-sm text-slate-700" />
                                <button onClick={async () => {
                                    const startInput = document.getElementById('start_date').value;
                                    const endInput = document.getElementById('end_date').value;
                                    if (!startInput || !endInput) return alert("Select dates.");
                                    if (confirm(`PERMANENTLY DELETE history from ${startInput} to ${endInput}?`)) {
                                        const startDate = new Date(startInput); startDate.setHours(0, 0, 0, 0);
                                        const endDate = new Date(endInput); endDate.setHours(23, 59, 59, 999);
                                        const params = new URLSearchParams({ start_date: startDate.toISOString(), end_date: endDate.toISOString() });
                                        await fetch(`${API_URL}/history?${params}`, { method: 'DELETE', headers: authHeader });
                                        alert("Records deleted."); fetchHistory();
                                    }
                                }} className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm shadow-sm transition-colors">
                                    Purge Data
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="p-3">Token</th>
                                            <th className="p-3">Patient</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Time</th>
                                            <th className="p-3">Doctor</th>
                                            <th className="p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {history.filter(h =>
                                            h.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            h.token_number?.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map(h => (
                                            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-bold text-slate-800">{h.token_number}</td>
                                                <td className="p-3 text-slate-600">{h.patient_name}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${h.status === 'completed' ? 'bg-[#065590]/5 text-[#065590] border-[#065590]/20' :
                                                        h.status === 'no_show' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {h.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono text-slate-500">
                                                    {new Date(h.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-slate-600">
                                                    {users.find(u => u.id === h.doctor_id)?.username || '-'}
                                                </td>
                                                <td className="p-3">
                                                    <button onClick={() => {
                                                        if (confirm('Delete record?')) {
                                                            fetch(`${API_URL}/history/${h.id}`, { method: 'DELETE', headers: authHeader }).then(() => {
                                                                fetchHistory();
                                                            })
                                                        }
                                                    }} className="text-red-400 hover:text-red-600">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
