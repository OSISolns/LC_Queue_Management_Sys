import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const API_URL = "http://" + window.location.hostname + ":8000";
const socket = io(API_URL);

export default function Kiosk() {
    const { user, logout } = useAuth();

    // Form State
    const [name, setName] = useState('');
    const [visitType, setVisitType] = useState('consultation');
    const [dept, setDept] = useState('');
    const [room, setRoom] = useState('');
    const [procedure, setProcedure] = useState('');
    const [priority, setPriority] = useState(3);
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Suggestion State
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    // Tabs & Lists
    const [activeTab, setActiveTab] = useState('register');
    const [waitingList, setWaitingList] = useState([]);
    const [callingList, setCallingList] = useState([]);
    const [completedList, setCompletedList] = useState([]);
    const [noShowList, setNoShowList] = useState([]);

    // Reference Data
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');

    const priorities = [
        { id: 1, name: 'Emergency', color: 'bg-[#64af45] text-white border-[#64af45]', activeClass: 'ring-4 ring-[#64af45]/30 scale-105' },
        { id: 2, name: 'VIP', color: 'bg-[#64af45] text-white border-[#64af45]', activeClass: 'ring-4 ring-[#64af45]/30 scale-105' },
        { id: 3, name: 'Standard', color: 'bg-[#065590] text-white border-[#04437a]', activeClass: 'ring-4 ring-[#065590]/30 scale-105' }
    ];

    const procedures = [
        { name: 'Phlebotomy', room: '1' },
        { name: 'CT-Scan', room: '2' },
        { name: 'MRI', room: '4' },
        { name: 'X-Ray', room: '5' },
        { name: 'Ultrasound', room: '7' }
    ];

    useEffect(() => {
        document.title = 'Kiosk - Legacy Clinics';
        // Initial Fetch
        fetchQueue();
        fetchReferenceData();
    }, []);

    // Unified Fetch Function
    const refreshData = () => {
        if (activeTab === 'list') fetchQueue();
        else if (activeTab === 'calling' || activeTab === 'completed') fetchLists();
        else if (activeTab === 'noshow') fetchNoShows();
    };

    useEffect(() => {
        // Initial fetch
        refreshData();

        // Socket Listeners
        socket.on('queue_update', refreshData);
        socket.on('call_patient', refreshData);

        // Fallback Polling
        const interval = setInterval(refreshData, 10000);

        return () => {
            clearInterval(interval);
            socket.off('queue_update', refreshData);
            socket.off('call_patient', refreshData);
        };
    }, [activeTab]);

    useEffect(() => {
        if (voucher) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [voucher]);

    // Reset dependent fields when visit type changes
    useEffect(() => {
        setRoom('');
        setDept('');
        setSelectedDoctorId('');
        setProcedure('');
    }, [visitType]);

    const fetchReferenceData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [resUsers, resRoles, resDepts] = await Promise.all([
                fetch('http://localhost:8000/users', { headers }),
                fetch('http://localhost:8000/roles', { headers }),
                fetch('http://localhost:8000/departments', { headers })
            ]);

            const users = await resUsers.json();
            const roles = await resRoles.json();
            const depts = await resDepts.json();
            setDepartments(depts);

            const docRole = roles.find(r => r.name === 'Doctor');
            if (docRole) {
                setDoctors(users.filter(u => u.role_id === docRole.id));
            }
        } catch (e) {
            console.error("Failed to load reference data", e);
        }
    };

    const fetchQueue = async () => {
        try {
            const res = await fetch(`http://localhost:8000/queue?t=${Date.now()}`);
            const data = await res.json();
            setWaitingList(data.filter(p => p.status === 'waiting'));
        } catch (e) { console.error(e); }
    };

    const fetchLists = async () => {
        try {
            const [resCall, resComp] = await Promise.all([
                fetch(`http://localhost:8000/history?status=calling&t=${Date.now()}`),
                fetch(`http://localhost:8000/history?status=completed&t=${Date.now()}`)
            ]);
            setCallingList(await resCall.json());
            setCompletedList(await resComp.json());
        } catch (e) { console.error(e); }
    };

    const fetchNoShows = async () => {
        try {
            const res = await fetch(`http://localhost:8000/history?status=no-show&t=${Date.now()}`);
            setNoShowList(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('http://localhost:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: name,
                    patient_id: selectedPatientId,
                    priority_id: priority,
                    target_dept: visitType === 'procedure' ? 'Radiology & Laboratory' : dept,
                    target_room: visitType === 'procedure' ? procedures.find(p => p.name === procedure)?.room : room,
                    doctor_id: selectedDoctorId || null
                })
            });

            if (!res.ok) throw new Error('Registration failed');
            const data = await res.json();
            setVoucher(data);
            setName('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tab Button Component
    const TabBtn = ({ id, label, colorClass }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                px-4 py-3 rounded-lg font-bold text-sm md:text-base flex-1 transition-all shadow-sm
                ${activeTab === id ? colorClass + ' text-white transform -translate-y-0.5 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}
            `}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-8 font-sans text-[#065590] overflow-hidden">

            {/* Navigation Tabs */}
            <div className="w-full max-w-5xl mb-8 flex flex-wrap gap-2 md:gap-4 justify-center no-print">
                <TabBtn id="register" label="Registration" colorClass="bg-[#065590]" />
                <TabBtn id="list" label="Waiting List" colorClass="bg-[#065590]" />
                <TabBtn id="calling" label="Serving" colorClass="bg-[#64af45]" />
                <TabBtn id="completed" label="Completed" colorClass="bg-[#64af45]" />
                <TabBtn id="noshow" label="No Shows" colorClass="bg-[#64af45]" />
                <button
                    onClick={logout}
                    className="px-4 py-3 rounded-lg font-bold text-sm md:text-base bg-red-100 text-red-600 hover:bg-red-200 border border-red-200 ml-auto transition-colors"
                >
                    Logout
                </button>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-4xl flex-1 flex flex-col">

                {/* Registration Form */}
                {activeTab === 'register' && !voucher && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
                                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Patient Check-in</h1>
                            </div>
                            {user?.room_number && (
                                <div className="bg-[#065590]/10 text-[#065590] px-4 py-2 rounded-full text-sm font-bold border border-[#065590]/20">
                                    📍 Room {user.room_number}
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            {/* Patient Name with Suggestions */}
                            <div className="relative">
                                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Patient Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setName(val);
                                        setSelectedPatientId(null); // Reset selection on edit

                                        if (val.length > 2) {
                                            fetch(`http://localhost:8000/patients/search?q=${val}`)
                                                .then(res => res.json())
                                                .then(data => {
                                                    setSuggestions(data);
                                                    setShowSuggestions(true);
                                                })
                                                .catch(err => console.error(err));
                                        } else {
                                            setSuggestions([]);
                                            setShowSuggestions(false);
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Enter Name or MRN"
                                    className="w-full text-xl p-4 rounded-xl border border-slate-300 focus:ring-4 focus:ring-[#065590]/20 focus:border-[#065590] outline-none transition-all placeholder:text-slate-300"
                                    required
                                    autoComplete="off"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto">
                                        {suggestions.map(s => (
                                            <div
                                                key={s.id}
                                                className="p-4 hover:bg-[#065590]/5 cursor-pointer border-b border-slate-100 last:border-0"
                                                onMouseDown={() => {
                                                    setName(`${s.first_name} ${s.last_name}`);
                                                    setSelectedPatientId(s.id);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <div className="font-bold text-slate-800">{s.first_name} {s.last_name}</div>
                                                <div className="text-xs text-slate-500 font-mono">MRN: {s.mrn} • {s.gender} • {s.date_of_birth}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Visit Type */}
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Visit Type</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['consultation', 'procedure', 'review'].map(type => (
                                        <label key={type} className={`
                                            cursor-pointer p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-lg transition-all
                                            ${visitType === type
                                                ? 'border-[#065590] bg-[#065590]/5 text-[#065590] ring-2 ring-[#065590]/20'
                                                : 'border-slate-200 hover:border-[#065590]/30 hover:bg-slate-50 text-slate-600'}
                                        `}>
                                            <input
                                                type="radio"
                                                name="visitType"
                                                value={type}
                                                checked={visitType === type}
                                                onChange={() => setVisitType(type)}
                                                className="hidden"
                                            />
                                            <span className="capitalize">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Logic Switch: Doctor vs Procedure */}
                            {(visitType === 'consultation' || visitType === 'review') ? (
                                <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Select Doctor</label>
                                        <select
                                            value={selectedDoctorId}
                                            onChange={(e) => {
                                                const docId = parseInt(e.target.value);
                                                setSelectedDoctorId(docId);
                                                const doc = doctors.find(d => d.id === docId);
                                                if (doc) {
                                                    setRoom(doc.room_number || '');
                                                    const dName = departments.find(dep => dep.id === doc.department_id)?.name || '';
                                                    setDept(dName);
                                                }
                                            }}
                                            required
                                            className="w-full p-4 rounded-xl border border-slate-300 text-lg bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                                        >
                                            <option value="">-- Choose Doctor --</option>
                                            {doctors.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.username} {d.room_number ? `(Rm ${d.room_number})` : ''}
                                                    {departments.find(dep => dep.id === d.department_id) ? ` - ${departments.find(dep => dep.id === d.department_id).name}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedDoctorId && (
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                                                <span className="block text-xs font-bold text-slate-400 uppercase">Department</span>
                                                <div className="font-bold text-slate-800 text-lg">{dept || 'N/A'}</div>
                                            </div>
                                            <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                                                <span className="block text-xs font-bold text-slate-400 uppercase">Room</span>
                                                <div className="font-bold text-slate-800 text-lg">{room || 'N/A'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Select Procedure</label>
                                    <select
                                        value={procedure}
                                        onChange={(e) => setProcedure(e.target.value)}
                                        required
                                        className="w-full p-4 rounded-xl border border-slate-300 text-lg bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                                    >
                                        <option value="">-- Select Procedure --</option>
                                        {procedures.map(p => (
                                            <option key={p.name} value={p.name}>{p.name} (Room {p.room})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Priority Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Priority Category</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {priorities.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPriority(p.id)}
                                            className={`
                                                p-4 rounded-xl font-bold text-lg transition-all border-b-4
                                                ${priority === p.id
                                                    ? p.color + ' ' + p.activeClass
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                            `}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-10 bg-[#065590] text-white font-bold text-xl py-5 rounded-xl hover:bg-[#04437a] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Get Ticket ➔'}
                        </button>

                        {error && <p className="mt-4 text-center text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                    </form>
                )}

                {/* Ticket Voucher Display */}
                {activeTab === 'register' && voucher && (
                    <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md mx-auto w-full animate-in zoom-in-95 duration-300 border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
                        <div className="print-header hidden print:block border-b-2 border-dashed border-black mb-4 pb-4">
                            <h2 className="text-xl font-bold">Legacy Clinics</h2>
                            <p className="text-sm">{new Date().toLocaleString()}</p>
                        </div>

                        <h2 className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Your Token Number</h2>
                        <h1 className="text-8xl font-black text-[#065590] mb-6">{voucher.token_number}</h1>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8 print:border-none">
                            <p className="text-slate-500 text-sm font-bold uppercase mb-1">Please proceed to</p>
                            <p className="text-2xl font-bold text-slate-800">{voucher.target_room ? `Room ${voucher.target_room}` : voucher.target_dept}</p>
                        </div>

                        <p className="text-slate-400 text-sm mb-8 print:hidden">Please wait for your number to be called.</p>

                        <button
                            onClick={() => setVoucher(null)}
                            className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition print:hidden"
                        >
                            Register Another Patient
                        </button>

                        <style>{`
                            @media print {
                                body { background: white; }
                                .no-print, nav, header { display: none !important; }
                                .print:shadow-none { box-shadow: none; }
                            }
                        `}</style>
                    </div>
                )}

                {/* List Views */}
                {activeTab !== 'register' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-xl text-slate-800 capitalize">{activeTab === 'list' ? 'Waiting Queue' : activeTab.replace('-', ' ')}</h2>
                            <button onClick={refreshData} className="text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 font-medium text-slate-600 transition-colors active:bg-slate-100">
                                ↻ Refresh
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Token</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Patient</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Doctor</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Room</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                        {activeTab === 'noshow' && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(activeTab === 'list' ? waitingList : activeTab === 'calling' ? callingList : activeTab === 'completed' ? completedList : noShowList).map((p, i) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <td className={`p-4 font-bold text-lg ${p.token_number.startsWith('E') ? 'text-red-600' : p.token_number.startsWith('V') ? 'text-purple-600' : 'text-slate-700'}`}>
                                                {p.token_number}
                                            </td>
                                            <td className="p-4 font-medium text-slate-700">
                                                <div className="flex flex-col">
                                                    <span>{p.patient_name}</span>
                                                    {p.priority_id !== 3 && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${p.priority_id === 1 ? 'text-red-500' : 'text-purple-500'}`}>
                                                            {priorities.find(pr => pr.id === p.priority_id)?.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                {p.doctor_name ? `Dr. ${p.doctor_name}` : <span className="text-slate-400 italic">--</span>}
                                            </td>
                                            <td className="p-4 text-slate-600 font-bold">
                                                {p.room_number || p.target_room || <span className="text-slate-400 italic">--</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${p.status === 'waiting' ? 'bg-sky-100 text-sky-700' :
                                                    p.status === 'calling' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                            </td>

                                            {activeTab === 'noshow' && (
                                                <td className="p-4">
                                                    {p.recalled ? (
                                                        <span className="text-amber-500 font-bold text-sm">Recalled</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                fetch(`http://localhost:8000/recall/${p.id}`, { method: 'POST' })
                                                                    .then(() => setNoShowList(prev => prev.map(item => item.id === p.id ? { ...item, recalled: true } : item)));
                                                            }}
                                                            className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-200 transition"
                                                        >
                                                            Recall
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {(activeTab === 'list' ? waitingList : activeTab === 'calling' ? callingList : activeTab === 'completed' ? completedList : noShowList).length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-400 italic">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
