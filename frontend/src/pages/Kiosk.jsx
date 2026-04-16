import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import QRCode from 'react-qr-code';
import {
    ClipboardList, Hourglass, Volume2, CheckCircle, Ghost, LogOut,
    User, Phone, MapPin, Stethoscope, Syringe, Clipboard,
    ArrowRight, AlertTriangle, CalendarDays, CreditCard, Search,
    Receipt, ShieldCheck, Banknote, Loader2, CheckCircle2, XCircle, RefreshCw,
    HeartPulse, Building2, FileText, Globe, BookUser, AlertCircle, BadgeInfo,
    LockKeyhole, LockKeyholeOpen
} from 'lucide-react';
import Clock from '../components/Clock';
import RosterViewer from '../components/RosterViewer';

const API_URL = "https://" + window.location.hostname + ":8000";

export default function Kiosk() {
    const { user, logout } = useAuth();

    const getTriageStation = (roomNum, deptName) => {
        const dName = (deptName || '').toLowerCase();
        if (dName.includes('pediatric')) return 'Station 3';
        if (!roomNum) return 'Station 1(GF)';
        
        const numStr = roomNum.toString().toUpperCase().trim();
        if (numStr.startsWith('D')) return 'Station 1(GF)';
        if (numStr.startsWith('PED')) return 'Station 3';
        
        const numInt = parseInt(numStr.replace(/[^\d]/g, ''), 10);
        if (numInt >= 1 && numInt <= 11) return 'Station 1(GF)';
        if (numInt >= 13 && numInt <= 23) return 'Station 2(1F)';
        if (/^1\d{2}$/.test(numStr) || numStr.includes('1F') || numStr.includes('FIRST')) return 'Station 2(1F)';
        
        return 'Station 1(GF)';
    };

    // Form State
    const [name, setName] = useState('');
    const [countryCode, setCountryCode] = useState('+250');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [gender, setGender] = useState('');
    const [visitType, setVisitType] = useState('consultation');
    const [dept, setDept] = useState('');
    const [room, setRoom] = useState('');
    const [procedure, setProcedure] = useState('');
    const [priority, setPriority] = useState(3);
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');

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

    // Sukraa Billing State 
    const [billingSearch, setBillingSearch] = useState('');
    const [billingSuggestions, setBillingSuggestions] = useState([]);
    const [billingSearching, setBillingSearching] = useState(false);
    const [selectedBillingPatient, setSelectedBillingPatient] = useState(null);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [cardType, setCardType] = useState('Visa');
    const [billingAmount, setBillingAmount] = useState('');
    const [billingNotes, setBillingNotes] = useState('');
    const [billingStatus, setBillingStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [billingResult, setBillingResult] = useState(null);
    const [sukraaOnline, setSukraaOnline] = useState(null); 
    const [insuranceDetails, setInsuranceDetails] = useState(null); 
    const [insuranceLoading, setInsuranceLoading] = useState(false);
    const [insuranceScheme, setInsuranceScheme] = useState(''); 
    const [billDetails, setBillDetails] = useState(null);
    const [billLoading, setBillLoading] = useState(false);

    const priorities = [
        { id: 1, name: 'Emergency', color: 'bg-[#64af45] text-white border-[#64af45]', activeClass: 'ring-4 ring-[#64af45]/30' },
        { id: 2, name: 'VIP', color: 'bg-[#64af45] text-white border-[#64af45]', activeClass: 'ring-4 ring-[#64af45]/30' },
        { id: 3, name: 'Standard', color: 'bg-[#065590] text-white border-[#04437a]', activeClass: 'ring-4 ring-[#065590]/30' }
    ];

    const procedures = [
        { name: 'Phlebotomy', room: '1' },
        { name: 'CT-Scan', room: '2' },
        { name: 'MRI', room: '4' },
        { name: 'X-Ray', room: '5' },
        { name: 'Ultrasound', room: '7' }
    ];

    const fetchQueue = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/queue?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setWaitingList(data.filter(p => p.status === 'waiting'));
            }
        } catch (e) { console.error(e); }
    }, []);

    const fetchLists = useCallback(async () => {
        try {
            const [resCall, resComp] = await Promise.all([
                fetch(`${API_URL}/history?status=calling&t=${Date.now()}`),
                fetch(`${API_URL}/history?status=completed&t=${Date.now()}`)
            ]);
            if (resCall.ok) setCallingList(await resCall.json());
            if (resComp.ok) setCompletedList(await resComp.json());
        } catch (e) { console.error(e); }
    }, []);

    const fetchNoShows = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/history?status=no-show&t=${Date.now()}`);
            if (res.ok) setNoShowList(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    const refreshData = useCallback(() => {
        if (activeTab === 'list') fetchQueue();
        else if (activeTab === 'calling' || activeTab === 'completed') fetchLists();
        else if (activeTab === 'noshow') fetchNoShows();
    }, [activeTab, fetchQueue, fetchLists, fetchNoShows]);

    const fetchReferenceData = async () => {
        try {
            const [resDepts, resDoctors] = await Promise.all([
                fetch(`${API_URL}/departments`),
                fetch(`${API_URL}/public/doctors`)
            ]);

            if (resDepts.ok) setDepartments(await resDepts.json());
            if (resDoctors.ok) setDoctors(await resDoctors.json());
        } catch (e) {
            console.error("Failed to load reference data", e);
        }
    };

    useEffect(() => {
        document.title = 'Kiosk - Legacy Clinics';
        fetchReferenceData();
        fetchQueue();
    }, [fetchQueue]);

    useEffect(() => {
        const socket = io(API_URL);
        
        socket.on('queue_update', refreshData);
        socket.on('call_patient', refreshData);

        const interval = setInterval(refreshData, 30000);

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [activeTab, refreshData]);

    useEffect(() => {
        if (voucher) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [voucher]);

    useEffect(() => {
        setRoom('');
        setDept('');
        setSelectedDoctorId('');
        setProcedure('');
    }, [visitType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPhoneError('');

        if (!name.trim()) {
            setError('Patient Name is required.');
            setLoading(false);
            return;
        }

        if (!gender) {
            setError('Please select a Gender.');
            setLoading(false);
            return;
        }

        if (visitType === 'consultation' || visitType === 'review') {
            if (!selectedDoctorId) {
                setError('Please select a Doctor.');
                setLoading(false);
                return;
            }
            if (!dept || !room) {
                setError('Selected doctor must have a department and room assigned.');
                setLoading(false);
                return;
            }
        } else if (visitType === 'procedure') {
            if (!procedure) {
                setError('Please select a Procedure.');
                setLoading(false);
                return;
            }
        }

        if (!phoneNumber?.trim()) {
            setPhoneError('Phone number is required');
            setError('Phone number is required');
            setLoading(false);
            return;
        }

        const digits = phoneNumber.replace(/\D/g, '');
        if (countryCode === '+250') {
            const isValidRwanda = (digits.length === 10 && /^(078|079|072|073)/.test(digits)) || (digits.length === 9 && /^(78|79|72|73)/.test(digits));
            if (!isValidRwanda) {
                setPhoneError('Rwandan numbers must start with 078, 079, 072, or 073');
                setLoading(false);
                return;
            }
        }

        try {
            let finalTargetDept = dept;
            let finalTargetRoom = room;

            const isDental = dept && dept.toLowerCase().includes('dental');
            
            if (visitType === 'procedure') {
                finalTargetDept = 'Radiology & Laboratory';
                finalTargetRoom = procedures.find(p => p.name === procedure)?.room || '';
            } else if (visitType === 'review' || isDental) {
                // By-passes Triage entirely
                finalTargetDept = dept;
                finalTargetRoom = room;
            } else if (visitType === 'consultation') {
                // Default consultation passes through Triage
                finalTargetDept = 'Triage';
                finalTargetRoom = getTriageStation(room, dept);
            }

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: name.trim(),
                    patient_id: selectedPatientId,
                    priority_id: priority,
                    target_dept: finalTargetDept,
                    target_room: finalTargetRoom,
                    doctor_id: selectedDoctorId || null,
                    phone_number: `${countryCode}${digits}`,
                    gender: gender,
                    visit_type: visitType
                })
            });

            if (res.ok) {
                const data = await res.json();
                setVoucher(data);

                // AI Shift Memory: Overwrite doctor's default room natively for future logins
                if (selectedDoctorId) {
                    const docInfo = doctors.find(d => d.id === selectedDoctorId);
                    if (docInfo && docInfo.room_number !== room && room) {
                        fetch(`${API_URL}/users/${selectedDoctorId}/room`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ room_number: room })
                        }).catch(err => console.error("Could not update doctor room", err));
                        // Update local cache seamlessly without reload
                        setDoctors(prev => prev.map(d => d.id === selectedDoctorId ? { ...d, room_number: room } : d));
                    }
                }

                setName('');
                setPhoneNumber('');
                setGender('');
            } else {
                const errData = await res.json();
                setError(errData.detail || 'Registration failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkoutSukraaStatus = async () => {
        setSukraaOnline(null);
        try {
            const res = await fetch(`${API_URL}/sukraa/status`);
            if (res.ok) {
                const d = await res.json();
                setSukraaOnline(d.reachable);
            }
        } catch { setSukraaOnline(false); }
    };

    const TabBtn = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeTab === id
                    ? 'bg-gradient-to-r from-[#065590] to-blue-700 text-white shadow-md'
                    : 'bg-white/70 text-slate-600 hover:bg-white border border-white/50 shadow-sm'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[100px]"></div>
            </div>

            <main className="relative z-10 flex-1 flex flex-col p-4 lg:p-6 h-full max-w-7xl mx-auto w-full">
                
                {/* Navigation Bar */}
                {(!voucher || activeTab !== 'register') && (
                    <header className="flex flex-wrap items-center gap-3 mb-6 no-print">
                        <Clock />
                        <div className="h-8 w-px bg-slate-300 mx-1 hidden sm:block"></div>
                        <TabBtn id="register" label="Registration" icon={<ClipboardList size={18} />} />
                        <TabBtn id="list" label="Waiting Queue" icon={<Hourglass size={18} />} />
                        <TabBtn id="calling" label="Now Serving" icon={<Volume2 size={18} />} />
                        <TabBtn id="completed" label="Completed" icon={<CheckCircle size={18} />} />
                        <TabBtn id="noshow" label="No Shows" icon={<Ghost size={18} />} />
                        <TabBtn id="roster" label="Duty Roster" icon={<CalendarDays size={18} />} />
                        <TabBtn id="billing" label="Pay Bill" icon={<CreditCard size={18} />} />
                        <div className="ml-auto flex items-center gap-4 pl-2 py-1">
                            <p className="text-sm font-medium text-slate-700 hidden md:block">
                                Hello, <span className="font-black tracking-tight text-[#065590]">{user?.full_name || user?.username || "Staff"}</span>
                            </p>
                            <button onClick={logout} className="px-4 py-2 rounded-full bg-white/50 text-slate-500 hover:text-red-500 hover:bg-white border border-white/50 shadow-sm font-bold text-sm flex items-center gap-2">
                                <LogOut size={16} /> Log Out
                            </button>
                        </div>
                    </header>
                )}

                {/* Content Container */}
                <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Registration Logic */}
                    {activeTab === 'register' && !voucher && (
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white p-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <img src="/logo.png" alt="Legacy" className="h-10 w-auto" />
                                <div>
                                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Health Hub Check-in</h1>
                                    <p className="text-[10px] font-bold text-[#065590] uppercase tracking-widest">Standalone Kiosk Portal</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Patient Name / PID</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></span>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setName(val);
                                                    if (val.trim().length > 2) {
                                                        fetch(`${API_URL}/patients/search?q=${encodeURIComponent(val)}`)
                                                            .then(res => res.ok ? res.json() : [])
                                                            .then(d => { setSuggestions(d); setShowSuggestions(true); });
                                                    } else { setSuggestions([]); }
                                                }}
                                                placeholder="Type name or search MRN..."
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none font-bold text-sm"
                                            />
                                        </div>
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-[100] top-full left-0 w-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95">
                                                {suggestions.map(s => (
                                                    <div key={s.id} onMouseDown={() => {
                                                        setName(`${s.first_name} ${s.last_name}`);
                                                        setSelectedPatientId(s.id);
                                                        setGender(s.gender || '');
                                                        if (s.phone_number) setPhoneNumber(s.phone_number.replace(/^\+250/, ''));
                                                        setShowSuggestions(false);
                                                    }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                                                        <p className="font-bold text-sm">{s.first_name} {s.last_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">PID: {s.mrn} • {s.gender}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                                        <div className="flex gap-2">
                                            <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-24 px-3 py-3 rounded-xl border border-slate-200 bg-white/50 outline-none font-bold text-sm">
                                                <option value="+250">+250</option>
                                                <option value="+1">+1</option>
                                                <option value="+44">+44</option>
                                            </select>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={e => setPhoneNumber(e.target.value)}
                                                placeholder="788 000 000"
                                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white/50 outline-none font-bold text-sm"
                                            />
                                        </div>
                                        {phoneError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{phoneError}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Select Gender</label>
                                    <div className="flex gap-6 pl-1">
                                        {['Male', 'Female'].map(g => (
                                            <label key={g} className="flex items-center gap-2 cursor-pointer group">
                                                <input type="radio" value={g} checked={gender === g} onChange={e => setGender(e.target.value)} className="hidden" />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === g ? 'border-[#065590] bg-[#065590]' : 'border-slate-300'}`}>
                                                    {gender === g && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                </div>
                                                <span className={`text-sm font-bold ${gender === g ? 'text-slate-800' : 'text-slate-400'}`}>{g}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Service Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['consultation', 'procedure', 'review'].map(t => (
                                                <button key={t} type="button" onClick={() => setVisitType(t)} className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${visitType === t ? 'border-[#065590] bg-blue-50 text-[#065590]' : 'border-slate-100 text-slate-400'}`}>
                                                    {t === 'consultation' ? <Stethoscope size={20} /> : t === 'procedure' ? <Syringe size={20} /> : <Clipboard size={20} />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Priority Level</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {priorities.map(p => (
                                                <button key={p.id} type="button" onClick={() => setPriority(p.id)} className={`py-4 rounded-xl border-2 font-bold text-xs transition-all ${priority === p.id ? p.color + ' ' + p.activeClass : 'border-slate-100 text-slate-400 bg-white'}`}>
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    {visitType === 'procedure' ? (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Clinical Procedure</label>
                                            <select value={procedure} onChange={e => setProcedure(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm">
                                                <option value="">-- Choose Procedure --</option>
                                                {procedures.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Available Doctors</label>
                                                <select
                                                    value={selectedDoctorId}
                                                    onChange={e => {
                                                        const id = parseInt(e.target.value);
                                                        setSelectedDoctorId(id);
                                                        const d = doctors.find(doc => doc.id === id);
                                                        if (d) {
                                                            setRoom(d.room_number || '');
                                                            setDept(departments.find(dep => dep.id === d.department_id)?.name || '');
                                                        }
                                                    }}
                                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm"
                                                >
                                                    <option value="">-- Select Doctor --</option>
                                                    {doctors.map(d => (
                                                        <option key={d.id} value={d.id}>
                                                            Dr. {d.full_name || d.username} — {departments.find(dep => dep.id === d.department_id)?.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedDoctorId && (() => {
                                                const selDoc = doctors.find(d => d.id === selectedDoctorId);
                                                const hasLockedRoom = selDoc?.room_number && selDoc.room_number !== '';
                                                const isAdmin = user?.role_name === 'Admin' || user?.role?.category === 'Admin' || user?.role === 'Admin';
                                                const canOverride = isAdmin;

                                                return (
                                                    <div className="p-4 border border-emerald-500/30 bg-emerald-50/30 rounded-xl relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                        <div className="absolute top-0 right-0 px-2 py-1 bg-emerald-500 text-white text-[9px] font-black tracking-widest rounded-bl-xl shadow-sm flex items-center gap-1">
                                                            {hasLockedRoom && !canOverride ? <LockKeyhole size={9}/> : <LockKeyholeOpen size={9}/>} AI SHIFT MEMORY
                                                        </div>
                                                        <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-3">Assigned Room</label>

                                                        {hasLockedRoom && !canOverride ? (
                                                            /* LOCKED STATE — Customer Care view */
                                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-emerald-500/40 shadow-sm">
                                                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow">
                                                                    <LockKeyhole size={18} className="text-white"/>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-slate-800">Room <span className="text-emerald-700">{selDoc.room_number}</span> is locked for this shift</p>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5">Only an Admin can override this assignment</p>
                                                                </div>
                                                                <span className="text-[9px] font-black tracking-widest uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-300">Locked</span>
                                                            </div>
                                                        ) : (
                                                            /* OPEN / ADMIN OVERRIDE — radio picker */
                                                            <>
                                                                {hasLockedRoom && canOverride && (
                                                                    <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 border border-amber-300 rounded-lg">
                                                                        <LockKeyholeOpen size={13} className="text-amber-600 flex-shrink-0"/>
                                                                        <p className="text-[10px] font-bold text-amber-700">Admin Override — Current room: <span className="font-black">{selDoc.room_number}</span>. Select a new room below.</p>
                                                                    </div>
                                                                )}

                                                                {/* Ground Floor */}
                                                                <div className="mb-3">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">🏢 Ground Floor — Station 1</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {[1,2,3,4,5,6,7,8,9,10,11].map(n => (
                                                                            <label key={n} className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all select-none ${room === n.toString() ? 'border-[#065590] bg-[#065590] text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-[#065590]/50 hover:bg-blue-50'}`}>
                                                                                <input type="radio" name="room_select" value={n.toString()} checked={room === n.toString()} onChange={() => setRoom(n.toString())} className="hidden" />
                                                                                Rm {n}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* First Floor */}
                                                                <div className="mb-3">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">🏬 First Floor — Station 2</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {[13,14,15,16,17,18,19,20,21,22,23].map(n => (
                                                                            <label key={n} className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all select-none ${room === n.toString() ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50'}`}>
                                                                                <input type="radio" name="room_select" value={n.toString()} checked={room === n.toString()} onChange={() => setRoom(n.toString())} className="hidden" />
                                                                                Rm {n}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Dental */}
                                                                <div className="mb-3">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">🦷 Dental — Station 1</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {['D1','D2','D3','D4'].map(r => (
                                                                            <label key={r} className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all select-none ${room === r ? 'border-amber-500 bg-amber-500 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50'}`}>
                                                                                <input type="radio" name="room_select" value={r} checked={room === r} onChange={() => setRoom(r)} className="hidden" />
                                                                                {r}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Pediatrics */}
                                                                <div className="mb-2">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">🧸 Pediatrics — Station 3</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {['Ped 1','Ped 2'].map(r => (
                                                                            <label key={r} className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all select-none ${room === r ? 'border-pink-500 bg-pink-500 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-pink-400 hover:bg-pink-50'}`}>
                                                                                <input type="radio" name="room_select" value={r} checked={room === r} onChange={() => setRoom(r)} className="hidden" />
                                                                                {r}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {room && (
                                                                    <p className="text-[10px] text-emerald-600 mt-3 flex items-center gap-1 font-bold border-t border-emerald-200 pt-2">
                                                                        <CheckCircle2 size={12}/> Room <span className="bg-emerald-100 px-1.5 py-0.5 rounded font-black">{room}</span> will be locked for this shift.
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <button disabled={loading} className="w-full bg-[#065590] text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group mt-6">
                                    {loading ? <Loader2 className="animate-spin" /> : <><RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> Collect Ticket</>}
                                </button>
                                {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold text-xs flex items-center gap-2 animate-bounce"><AlertCircle size={16} />{error}</div>}
                            </form>
                        </div>
                    )}

                    {/* Voucher Result */}
                    {activeTab === 'register' && voucher && (
                        <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                            {(() => {
                                const doctorInfo = doctors.find(d => d.id === selectedDoctorId);
                                const doctorNameStr = doctorInfo ? (doctorInfo.full_name || doctorInfo.username) : 'N/A';
                                const staffName = user?.full_name || user?.username || 'Front Desk';
                                const triageRoom = (visitType === 'consultation' || visitType === 'review') ? getTriageStation(room, dept) : 'N/A';
                                
                                const qrPayload = `Token: ${voucher.token_number}
Patient: ${voucher.patient_name}
Doctor: ${doctorNameStr !== 'N/A' ? (doctorNameStr.startsWith('Dr') ? doctorNameStr : `Dr. ${doctorNameStr}`) : 'Any Available'}
Room: ${room || 'TBD'}
Triage Station: ${triageRoom}
Generated By: ${staffName}`;

                                return (
                                    <>
                                        <div className="bg-white p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-2 border-slate-50 text-center max-w-sm w-full relative overflow-hidden print:shadow-none print:border-none print:p-2">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-[#065590]"></div>
                                            <div className="mb-6 flex flex-col items-center">
                                                <img src="/logo.png" alt="Logo" className="h-10 w-auto mb-3" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Token</p>
                                                <h1 className="text-7xl font-black text-[#065590] my-2">{voucher.token_number}</h1>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mb-6 flex flex-col items-center">
                                                <QRCode value={qrPayload} size={120} />
                                                <div className="mt-4 text-center">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proceed to</p>
                                                    <p className="text-xl font-black text-slate-800">{room ? `Room ${room}` : 'TBD (Wait for assignment)'}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Small character meta details */}
                                            <div className="flex flex-col gap-1.5 text-left mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="font-bold text-slate-400">Doctor/Room:</span>
                                                    <span className="font-black text-slate-700">{doctorNameStr !== 'N/A' ? (doctorNameStr.startsWith('Dr') ? doctorNameStr : `Dr. ${doctorNameStr}`) : 'Any Available'} — {room || 'TBD'}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="font-bold text-slate-400">Triage Station:</span>
                                                    <span className="font-black text-slate-700">{triageRoom}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="font-bold text-slate-400">Generated By:</span>
                                                    <span className="font-black text-slate-700">{staffName}</span>
                                                </div>
                                            </div>

                                            <button onClick={() => setVoucher(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all no-print">Finish & New Patient</button>
                                        </div>
                                        <p className="mt-8 text-slate-400 font-bold text-sm flex items-center gap-2 no-print"><BadgeInfo size={16} /> Please take your ticket and wait for the display announcement.</p>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Pay Bill Module */}
                    {activeTab === 'billing' && (
                        <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gradient-to-r from-[#065590] to-blue-700 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                                <div className="absolute top-[-20%] right-[-10%] w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="relative z-10 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                        <Receipt size={32} />
                                        <h2 className="text-3xl font-black tracking-tight">Kiosk Billing Portal</h2>
                                    </div>
                                    <p className="text-blue-100 font-medium">Real-time payment settlemet via Sukraa HMS Integration</p>
                                </div>
                                <button onClick={checkoutSukraaStatus} className={`relative z-10 px-6 py-3 rounded-2xl border-2 font-black text-sm flex items-center gap-2 transition-all ${sukraaOnline ? 'bg-green-500/20 border-green-400/30 text-green-100' : 'bg-white/10 border-white/20 text-white/70'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${sukraaOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    {sukraaOnline === true ? 'HMS CONNECTED' : sukraaOnline === false ? 'HMS OFFLINE' : 'CHECKING HMS...'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Search Panel */}
                                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-xl flex flex-col gap-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-blue-50 text-[#065590] rounded-xl flex items-center justify-center"><Search size={22} /></div>
                                        <h3 className="text-lg font-black text-slate-800">1. Locate Patient</h3>
                                    </div>
                                    
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={billingSearch}
                                            onChange={e => {
                                                const v = e.target.value;
                                                setBillingSearch(v);
                                                setSelectedBillingPatient(null);
                                                if (v.trim().length >= 2) {
                                                    setBillingSearching(true);
                                                    fetch(`${API_URL}/sukraa/patients?q=${encodeURIComponent(v)}`)
                                                        .then(res => res.ok ? res.json() : [])
                                                        .then(d => { setBillingSuggestions(d); setBillingSearching(false); })
                                                        .catch(() => { setBillingSearching(false); });
                                                } else { setBillingSuggestions([]); }
                                            }}
                                            placeholder="Enter Patient Name or MRN Number..."
                                            className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-[#065590] focus:bg-white transition-all font-bold text-lg"
                                        />
                                        {billingSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                                    </div>

                                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2">
                                        {billingSuggestions.map(s => (
                                            <button 
                                                key={s.id} 
                                                onClick={async () => {
                                                    setSelectedBillingPatient(s);
                                                    setBillingSearch(s.label);
                                                    setBillingSuggestions([]);
                                                    setInsuranceLoading(true);
                                                    setBillLoading(true);
                                                    
                                                    const insP = fetch(`${API_URL}/sukraa/patient/insurance?patient_id=${s.id}&mrn=${s.mrn || ''}`);
                                                    const billP = fetch(`${API_URL}/sukraa/patient/billing-details?mrn=${s.mrn || s.id}`);
                                                    
                                                    try {
                                                        const [resIns, resBill] = await Promise.all([insP, billP]);
                                                        if (resIns.ok) setInsuranceDetails(await resIns.json());
                                                        if (resBill.ok) {
                                                            const d = await resBill.json();
                                                            setBillDetails(d);
                                                            if (d.balance) setBillingAmount(d.balance.replace(/,/g, ''));
                                                            if (d.referrer) {
                                                                setInsuranceScheme(d.referrer);
                                                                setPaymentMode('Insurance');
                                                            }
                                                        }
                                                    } finally {
                                                        setInsuranceLoading(false);
                                                        setBillLoading(false);
                                                    }
                                                }}
                                                className="w-full p-4 rounded-2xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="font-black text-slate-800">{s.label}</p>
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">{s.mrn || 'HMS RECORD'} • {s.gender}</p>
                                                </div>
                                                <ArrowRight size={20} className="text-slate-300 group-hover:text-[#065590] transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Billing Details Panel */}
                                <div className="space-y-6">
                                    {selectedBillingPatient ? (
                                        <>
                                            <div className="bg-[#065590] p-6 rounded-3xl text-white shadow-xl animate-in fade-in zoom-in-95">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl">{selectedBillingPatient.label[0]}</div>
                                                    <div>
                                                        <h4 className="text-xl font-black">{selectedBillingPatient.label}</h4>
                                                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">{selectedBillingPatient.mrn}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/10 p-3 rounded-2xl">
                                                        <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Total Bill Amount</p>
                                                        <p className="text-lg font-black tracking-tight">{billDetails?.bill_amount || '...'}</p>
                                                    </div>
                                                    <div className="bg-white/10 p-3 rounded-2xl">
                                                        <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Balance to Pay</p>
                                                        <p className="text-lg font-black tracking-tight text-white">{billDetails?.balance || '...'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-black text-slate-800">2. Payment Action</h3>
                                                    <div className="text-[10px] bg-slate-100 px-3 py-1 rounded-full font-black text-slate-400 uppercase tracking-widest">Sukraa Sync Mode</div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['Cash', 'Card', 'Insurance'].map(m => (
                                                            <button key={m} onClick={() => setPaymentMode(m)} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMode === m ? 'border-[#065590] bg-blue-50 text-[#065590]' : 'border-slate-50 text-slate-400 bg-slate-50'}`}>
                                                                {m === 'Cash' ? <Banknote size={20} /> : m === 'Card' ? <CreditCard size={20} /> : <ShieldCheck size={20} />}
                                                                <span className="text-[10px] font-black uppercase">{m}</span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="relative">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Amount in RWF</label>
                                                        <input 
                                                            type="text" 
                                                            value={billingAmount} 
                                                            onChange={e => setBillingAmount(e.target.value)} 
                                                            className="w-full bg-slate-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-[#065590] font-black text-xl" 
                                                        />
                                                    </div>

                                                    <button 
                                                        disabled={billingStatus === 'loading'}
                                                        onClick={async () => {
                                                            if (!billingAmount || parseFloat(billingAmount) <= 0) return alert('Invalid Amount');
                                                            setBillingStatus('loading');
                                                            try {
                                                                const r = await fetch(`${API_URL}/sukraa/bill/initiate`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        patient_id: selectedBillingPatient.id,
                                                                        amount: billingAmount,
                                                                        payment_mode: paymentMode,
                                                                        notes: billingNotes,
                                                                        insurance_scheme: paymentMode === 'Insurance' ? insuranceScheme : null
                                                                    })
                                                                });
                                                                if (r.ok) {
                                                                    setBillingResult(await r.json());
                                                                    setBillingStatus('success');
                                                                } else { setBillingStatus('error'); }
                                                            } catch { setBillingStatus('error'); }
                                                        }}
                                                        className="w-full bg-[#065590] text-white py-5 rounded-2xl shadow-xl hover:-translate-y-1 transition-all font-black text-lg flex items-center justify-center gap-2"
                                                    >
                                                        {billingStatus === 'loading' ? <Loader2 className="animate-spin" /> : 'Settle Bill in HMS'}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center p-12 text-slate-300 text-center">
                                            <HeartPulse size={80} className="mb-4 opacity-50" />
                                            <p className="font-black text-xl">Waiting for patient selection</p>
                                            <p className="text-sm font-bold opacity-70">Search and select a patient on the left to pull billing and insurance data.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Billing Results UI */}
                            {billingStatus === 'success' && billingResult && (
                                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500">
                                    <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-90 duration-500 scale-100 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-3 bg-green-500"></div>
                                        <div className="w-20 h-20 bg-green-100 border-4 border-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={44} className="text-green-500" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-800 mb-2">Payment Complete</h2>
                                        <p className="text-slate-500 font-bold mb-8">HMS Reference: {billingResult.reference_number || 'SYNC-ACK-PENDING'}</p>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settled</p>
                                            <p className="text-4xl font-black text-[#065590] tracking-tighter">RWF {billingAmount}</p>
                                        </div>
                                        <button onClick={() => { setBillingStatus(null); setSelectedBillingPatient(null); setBillingSearch(''); }} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all">Close & Finish</button>
                                    </div>
                                </div>
                            )}

                            {billingStatus === 'error' && (
                                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
                                        <XCircle size={60} className="text-red-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-black text-slate-800 mb-2">Transaction Failed</h3>
                                        <p className="text-slate-500 font-bold mb-6">Could not sync with Sukraa HMS. Please check connection and try again.</p>
                                        <button onClick={() => setBillingStatus(null)} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all">Try Again</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data List Views */}
                    {activeTab !== 'register' && activeTab !== 'roster' && activeTab !== 'billing' && (
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col flex-1 animate-in slide-in-from-bottom-6 duration-700">
                            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
                                    <div className="bg-blue-100 text-[#065590] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live Flow</div>
                                </div>
                                <button onClick={refreshData} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-500 active:scale-95 shadow-sm"><RefreshCw size={20} /></button>
                            </div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/80 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PID/Token</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Physician</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Room</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(activeTab === 'list' ? waitingList : activeTab === 'calling' ? callingList : activeTab === 'completed' ? completedList : noShowList).map(p => (
                                            <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-8 py-5">
                                                    <span className={`text-xl font-black font-mono tracking-tight ${p.token_number.startsWith('E') ? 'text-red-600' : 'text-slate-800'}`}>{p.token_number}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{p.patient_name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{p.gender} • {p.phone_number}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-slate-700">{p.doctor_name ? `Dr. ${p.doctor_name}` : <span className="text-slate-300 italic">Unassigned</span>}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-black text-[#065590] text-xl tracking-tighter">{p.room_number || p.target_room || '...'}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                                                        p.status === 'waiting' ? 'bg-sky-100 text-sky-700' :
                                                        p.status === 'calling' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600'
                                                    }`}>{p.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(activeTab === 'list' ? waitingList : activeTab === 'calling' ? callingList : activeTab === 'completed' ? completedList : noShowList).length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="py-24 text-center">
                                                    <div className="flex flex-col items-center opacity-20">
                                                        <Search size={64} />
                                                        <p className="text-xl font-black mt-4">Queue is empty</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Duty Roster */}
                    {activeTab === 'roster' && (
                        <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <RosterViewer token={localStorage.getItem('token')} />
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                @media print {
                    .no-print { display: none !important; }
                    main { padding: 0 !important; max-width: none !important; }
                    .flex-1 { min-height: 0 !important; }
                }
            `}</style>
        </div>
    );
}