import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import QRCode from 'react-qr-code';
import {
    ClipboardList, Hourglass, Volume2, CheckCircle, Ghost, LogOut,
    User, Phone, MapPin, Stethoscope, Syringe, Clipboard,
    ArrowRight, AlertTriangle, CalendarDays
} from 'lucide-react';
import Clock from '../components/Clock';
import RosterViewer from '../components/RosterViewer';

const API_URL = "https://" + window.location.hostname + ":8000";
const socket = io(API_URL);

export default function Kiosk() {
    const { user, logout } = useAuth();

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
            // Fetch roles and departments without auth to let Kiosk work on standalone devices
            const [resDepts, resDoctors] = await Promise.all([
                fetch('https://localhost:8000/departments'),
                fetch('https://localhost:8000/public/doctors')
            ]);

            if (resDepts.ok) {
                setDepartments(await resDepts.json());
            }
            if (resDoctors.ok) {
                setDoctors(await resDoctors.json());
            }
        } catch (e) {
            console.error("Failed to load reference data", e);
        }
    };

    const fetchQueue = async () => {
        try {
            const res = await fetch(`https://localhost:8000/queue?t=${Date.now()}`);
            const data = await res.json();
            setWaitingList(data.filter(p => p.status === 'waiting'));
        } catch (e) { console.error(e); }
    };

    const fetchLists = async () => {
        try {
            const [resCall, resComp] = await Promise.all([
                fetch(`https://localhost:8000/history?status=calling&t=${Date.now()}`),
                fetch(`https://localhost:8000/history?status=completed&t=${Date.now()}`)
            ]);
            setCallingList(await resCall.json());
            setCompletedList(await resComp.json());
        } catch (e) { console.error(e); }
    };

    const fetchNoShows = async () => {
        try {
            const res = await fetch(`https://localhost:8000/history?status=no-show&t=${Date.now()}`);
            setNoShowList(await res.json());
        } catch (e) { console.error(e); }
    };

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
            if (!dept) {
                setError('Please select a Department.');
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

        // Validate phone number if provided (now enforcing it strongly)
        if (!phoneNumber) {
            setPhoneError('Phone number is required');
            setError('Phone number is required');
            setLoading(false);
            return;
        }

        if (phoneNumber) {
            const digits = phoneNumber.replace(/\D/g, ''); // Strip non-digits

            if (countryCode === '+250') {
                // Rwandan format: 078, 079, 072, 073 (10 digits) OR 78, 79, 72, 73 (9 digits)
                const isValidRwanda =
                    (digits.length === 10 && /^(078|079|072|073)/.test(digits)) ||
                    (digits.length === 9 && /^(78|79|72|73)/.test(digits));

                if (!isValidRwanda) {
                    setPhoneError('Rwandan numbers must start with 078, 079, 072, or 073');
                    setError('Invalid Rwandan phone format. Please check the prefix and length.');
                    setLoading(false);
                    return;
                }
            } else if (countryCode === '+1') {
                if (digits.length !== 10) {
                    setPhoneError('US numbers must be exactly 10 digits');
                    setError('Invalid US phone format. Please enter exactly 10 digits.');
                    setLoading(false);
                    return;
                }
            } else if (countryCode === '+44') {
                if (digits.length !== 10 && digits.length !== 11) {
                    setPhoneError('UK numbers must be 10 or 11 digits');
                    setError('Invalid UK phone format. Please enter 10 or 11 digits.');
                    setLoading(false);
                    return;
                }
            } else if (countryCode === '+254' || countryCode === '+255' || countryCode === '+256') {
                const isEastAfricaValid =
                    (digits.length === 10 && /^0/.test(digits)) ||
                    (digits.length === 9 && !/^0/.test(digits));

                if (!isEastAfricaValid) {
                    setPhoneError('Must be 10 digits starting with 0, or 9 without 0');
                    setError('Invalid phone format for selected country. Must be exactly 10 digits starting with 0, or 9 digits without 0.');
                    setLoading(false);
                    return;
                }
            } else {
                // Fallback basic length check for other countries
                if (digits.length < 9 || digits.length > 12) {
                    setPhoneError('Must be 9 to 12 digits');
                    setError('Please provide a valid phone number length.');
                    setLoading(false);
                    return;
                }
            }
        }

        try {
            const res = await fetch('https://localhost:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: name,
                    patient_id: selectedPatientId,
                    priority_id: priority,
                    target_dept: visitType === 'procedure' ? 'Radiology & Laboratory' : dept,
                    target_room: visitType === 'procedure' ? procedures.find(p => p.name === procedure)?.room : room,
                    doctor_id: selectedDoctorId || null,
                    phone_number: phoneNumber ? `${countryCode}${phoneNumber}` : null,
                    gender: gender || null,
                    visit_type: visitType
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Registration failed');
            }
            const data = await res.json();
            setVoucher(data);
            setName('');
            setPhoneNumber('');
            setGender('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tab Button Component - Compact Version
    const TabBtn = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm
                ${activeTab === id
                    ? 'bg-gradient-to-r from-[#065590] to-[#04437a] text-white shadow-md transform -translate-y-0.5'
                    : 'bg-white/50 text-slate-600 hover:text-[#065590] hover:bg-white border border-white/50 shadow-sm backdrop-blur-sm'}
            `}
        >
            <span className="text-lg">{icon}</span>
            {label}
        </button>
    );

    const inputClasses = "w-full p-2.5 rounded-lg border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#065590]/20 focus:border-[#065590] outline-none transition-all placeholder:text-slate-400 shadow-sm text-sm";
    const labelClasses = "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1";

    return (
        <div className="h-screen bg-slate-100 relative overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900 flex flex-col">
            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-emerald-100/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-indigo-100/40 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center p-4 lg:p-6 h-full overflow-y-auto">

                {/* Navigation Tabs - Compact */}
                {activeTab !== 'register' || !voucher ? (
                    <div className="w-full max-w-7xl mb-4 flex flex-wrap gap-2 justify-center items-center no-print shrink-0">
                        <Clock />
                        <div className="w-px h-8 bg-slate-300 mx-2"></div>
                        <TabBtn id="register" label="Registration" icon={<ClipboardList size={18} />} />
                        <TabBtn id="list" label="Waiting Queue" icon={<Hourglass size={18} />} />
                        <TabBtn id="calling" label="Now Serving" icon={<Volume2 size={18} />} />
                        <TabBtn id="completed" label="Completed" icon={<CheckCircle size={18} />} />
                        <TabBtn id="noshow" label="No Shows" icon={<Ghost size={18} />} />
                        <TabBtn id="roster" label="Duty Roster" icon={<CalendarDays size={18} />} />
                        <button
                            onClick={logout}
                            className="px-4 py-2 rounded-full font-bold text-sm bg-white/50 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-white/50 shadow-sm backdrop-blur-sm ml-auto transition-all flex items-center gap-2"
                        >
                            <LogOut size={16} /> Log Out
                        </button>
                    </div>
                ) : null}

                {/* Main Content Area */}
                <div className="w-full max-w-6xl flex-1 flex flex-col">

                    {/* Registration Form */}
                    {activeTab === 'register' && !voucher && (
                        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Patient Check-in</h1>
                                        <p className="text-xs text-slate-500 font-medium">Welcome to Legacy Clinics</p>
                                    </div>
                                </div>
                                {user?.room_number && (
                                    <div className="bg-blue-50 text-[#065590] px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 shadow-sm flex items-center gap-1.5">
                                        <MapPin size={14} /> Room {user.room_number}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Patient Name and Phone Number Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Patient Name with Suggestions */}
                                    <div className="relative z-50">
                                        <label className={labelClasses}>Patient Name / MRN <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></span>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setName(val);
                                                    setSelectedPatientId(null);
                                                    if (val.length > 2) {
                                                        fetch(`https://localhost:8000/patients/search?q=${val}`)
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
                                                className={`${inputClasses} pl-10`}
                                                required
                                                autoComplete="off"
                                            />
                                        </div>
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 max-h-48 overflow-y-auto animate-in zoom-in-95 duration-200 z-[100]">
                                                {suggestions.map(s => (
                                                    <div
                                                        key={s.id}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                        onMouseDown={() => {
                                                            setName(`${s.first_name} ${s.last_name}`);
                                                            setSelectedPatientId(s.id);

                                                            // Auto-fill phone number
                                                            if (s.phone_number) {
                                                                if (s.phone_number.startsWith('+250')) {
                                                                    setCountryCode('+250');
                                                                    setPhoneNumber(s.phone_number.slice(4));
                                                                } else if (s.phone_number.startsWith('+254')) {
                                                                    setCountryCode('+254');
                                                                    setPhoneNumber(s.phone_number.slice(4));
                                                                } else if (s.phone_number.startsWith('+255')) {
                                                                    setCountryCode('+255');
                                                                    setPhoneNumber(s.phone_number.slice(4));
                                                                } else if (s.phone_number.startsWith('+256')) {
                                                                    setCountryCode('+256');
                                                                    setPhoneNumber(s.phone_number.slice(4));
                                                                } else if (s.phone_number.startsWith('+44')) {
                                                                    setCountryCode('+44');
                                                                    setPhoneNumber(s.phone_number.slice(3));
                                                                } else if (s.phone_number.startsWith('+1')) {
                                                                    setCountryCode('+1');
                                                                    setPhoneNumber(s.phone_number.slice(2));
                                                                } else {
                                                                    setPhoneNumber(s.phone_number);
                                                                }
                                                            }
                                                            if (s.gender) {
                                                                setGender(s.gender);
                                                            }
                                                            setShowSuggestions(false);
                                                        }}
                                                    >
                                                        <div className="font-bold text-sm text-slate-800">{s.first_name} {s.last_name}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                                                            <span className="bg-slate-100 px-1 py-0.5 rounded">MRN: {s.mrn}</span>
                                                            <span>• {s.gender}</span>
                                                            <span>• {s.date_of_birth}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone Number with Country Code */}
                                    <div>
                                        <label className={labelClasses}>Phone Number <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className="w-24 p-2.5 rounded-lg border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#065590]/20 focus:border-[#065590] outline-none transition-all shadow-sm font-mono text-xs"
                                            >
                                                <option value="+250">🇷🇼 +250</option>
                                                <option value="+1">🇺🇸 +1</option>
                                                <option value="+44">🇬🇧 +44</option>
                                                <option value="+254">🇰🇪 +254</option>
                                                <option value="+255">🇹🇿 +255</option>
                                                <option value="+256">🇺🇬 +256</option>
                                            </select>

                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={18} /></span>
                                                <input
                                                    type="tel"
                                                    value={phoneNumber}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || /^[0-9]+$/.test(value)) {
                                                            setPhoneNumber(value);
                                                            if (phoneError) setPhoneError('');
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (phoneNumber) {
                                                            const digits = phoneNumber.replace(/\D/g, '');
                                                            if (countryCode === '+250') {
                                                                const isValidRwanda =
                                                                    (digits.length === 10 && /^(078|079|072|073)/.test(digits)) ||
                                                                    (digits.length === 9 && /^(78|79|72|73)/.test(digits));
                                                                setPhoneError(isValidRwanda ? '' : 'Rwandan numbers must start with 078, 079, 072, or 073');
                                                            } else if (countryCode === '+1') {
                                                                setPhoneError(digits.length === 10 ? '' : 'US numbers must be 10 digits');
                                                            } else if (countryCode === '+44') {
                                                                setPhoneError(digits.length === 10 || digits.length === 11 ? '' : 'UK numbers must be 10 or 11 digits');
                                                            } else if (countryCode === '+254' || countryCode === '+255' || countryCode === '+256') {
                                                                const isEastAfricaValid =
                                                                    (digits.length === 10 && /^0/.test(digits)) ||
                                                                    (digits.length === 9 && !/^0/.test(digits));
                                                                setPhoneError(isEastAfricaValid ? '' : 'Must be 10 digits with 0, or 9 without 0');
                                                            } else {
                                                                if (digits.length < 9) setPhoneError('Min 9 digits');
                                                                else if (digits.length > 12) setPhoneError('Max 12 digits');
                                                                else setPhoneError('');
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Phone Number"
                                                    className={`${inputClasses} pl-9 ${phoneError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' : ''}`}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        {phoneError && (
                                            <p className="text-red-500 text-[10px] mt-0.5 font-bold ml-1">{phoneError}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Gender Selection */}
                                <div>
                                    <label className={labelClasses}>Gender <span className="text-red-500">*</span></label>
                                    <div className="flex gap-4 items-center pl-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${gender === 'Male' ? 'border-[#065590] bg-[#065590]' : 'border-slate-300 group-hover:border-[#065590]'}`}>
                                                {gender === 'Male' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                            </div>
                                            <input type="radio" name="gender" value="Male" checked={gender === 'Male'} onChange={(e) => setGender(e.target.value)} className="hidden" />
                                            <span className="text-sm font-semibold text-slate-700">Male</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${gender === 'Female' ? 'border-[#065590] bg-[#065590]' : 'border-slate-300 group-hover:border-[#065590]'}`}>
                                                {gender === 'Female' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                            </div>
                                            <input type="radio" name="gender" value="Female" checked={gender === 'Female'} onChange={(e) => setGender(e.target.value)} className="hidden" />
                                            <span className="text-sm font-semibold text-slate-700">Female</span>
                                        </label>
                                    </div>
                                </div>


                                {/* Visit Type & Priority - Compact Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Visit Type */}
                                    <div>
                                        <label className={labelClasses}>Visit Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['consultation', 'procedure', 'review'].map(type => (
                                                <label key={type} className={`
                                                    group relative cursor-pointer p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all
                                                    ${visitType === type
                                                        ? 'border-[#065590] bg-white ring-2 ring-[#065590]/10 shadow-sm'
                                                        : 'border-slate-100 bg-white/50 hover:bg-white hover:border-[#065590]/30 hover:shadow-sm text-slate-500'}
                                                `}>
                                                    <input
                                                        type="radio"
                                                        name="visitType"
                                                        value={type}
                                                        checked={visitType === type}
                                                        onChange={() => setVisitType(type)}
                                                        className="hidden"
                                                    />
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                                        ${visitType === type ? 'bg-[#065590] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}
                                                    `}>
                                                        {type === 'consultation' ? <Stethoscope size={18} /> : type === 'procedure' ? <Syringe size={18} /> : <Clipboard size={18} />}
                                                    </div>
                                                    <span className={`text-[10px] font-bold capitalize ${visitType === type ? 'text-[#065590]' : 'text-slate-600'}`}>{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority Selection */}
                                    <div>
                                        <label className={labelClasses}>Priority Level</label>
                                        <div className="grid grid-cols-3 gap-2 h-full">
                                            {priorities.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPriority(p.id)}
                                                    className={`
                                                        px-2 py-2 rounded-xl font-bold text-xs transition-all border h-[68px]
                                                        ${priority === p.id
                                                            ? p.color + ' ' + p.activeClass.replace('scale-105', 'scale-[1.02]')
                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                                                    `}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Logic Switch: Doctor vs Procedure */}
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    {(visitType === 'consultation' || visitType === 'review') ? (
                                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                            <div className="mb-3">
                                                <label className={labelClasses}>Select Doctor (Optional)</label>
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
                                                    className={inputClasses}
                                                >
                                                    <option value="">-- Choose Doctor --</option>
                                                    {doctors.map(d => (
                                                        <option key={d.id} value={d.id}>
                                                            {d.salutation} {d.full_name || d.username} {d.room_number ? `(Rm ${d.room_number})` : ''} - {departments.find(dep => dep.id === d.department_id)?.name || 'General'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedDoctorId && (
                                                <div className="flex gap-3">
                                                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Department</span>
                                                        <div className="font-bold text-slate-800 text-sm truncate">{dept || 'N/A'}</div>
                                                    </div>
                                                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Room</span>
                                                        <div className="font-bold text-slate-800 text-sm">{room || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                            <label className={labelClasses}>Select Procedure <span className="text-red-500">*</span></label>
                                            <select
                                                value={procedure}
                                                onChange={(e) => setProcedure(e.target.value)}
                                                required
                                                className={inputClasses}
                                            >
                                                <option value="" disabled>-- Select Procedure --</option>
                                                {procedures.map(p => (
                                                    <option key={p.name} value={p.name}>{p.name} (Room {p.room})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-[#065590] to-blue-600 text-white font-bold text-lg py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? 'Generating Ticket...' : 'Get Ticket'}
                                        {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </button>
                            </div>

                            {error && (
                                <div className="mt-2 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 text-red-700 animate-in shake">
                                    <AlertTriangle size={20} />
                                    <p className="font-bold text-sm">{error}</p>
                                </div>
                            )}
                        </form>
                    )}

                    {/* VOUCHER & LIST VIEWS PLACEHOLDER - TO BE REPLACED IN NEXT STEP */}
                    {activeTab === 'register' && voucher && (
                        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md mx-auto w-full animate-in zoom-in-95 duration-300 border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
                            {/* ... Current Voucher Code ... */}
                            <div className="print-header hidden print:block border-b-2 border-dashed border-black mb-4 pb-4">
                                <h2 className="text-xl font-bold">Legacy Clinics</h2>
                                <p className="text-sm">{new Date().toLocaleString()}</p>
                            </div>

                            <h2 className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Your Token Number</h2>
                            <h1 className="text-8xl font-black text-[#065590] mb-6">{voucher.token_number}</h1>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 print:border-none flex flex-col items-center justify-center">
                                <div className="mb-4 bg-white p-2 rounded-xl inline-block shadow-sm print:shadow-none border border-slate-100 print:border-none">
                                    <QRCode
                                        value={JSON.stringify({
                                            id: voucher.id,
                                            token: voucher.token_number,
                                            date: voucher.created_at ? new Date(voucher.created_at + (voucher.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString() : ''
                                        })}
                                        size={120}
                                        level="H"
                                    />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-bold uppercase mb-1">Please proceed to</p>
                                    <p className="text-2xl font-bold text-slate-800">{voucher.target_room ? `Room ${voucher.target_room}` : voucher.target_dept}</p>

                                    {voucher.visit_type && (
                                        <div className="mt-3 text-[#065590] font-bold uppercase tracking-widest text-sm bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 inline-block shadow-sm">
                                            {voucher.visit_type}
                                        </div>
                                    )}
                                </div>
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

                    {/* Duty Roster Panel */}
                    {activeTab === 'roster' && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                            <RosterViewer token={localStorage.getItem('token')} />
                        </div>
                    )}

                    {/* List Views */}
                    {activeTab !== 'register' && activeTab !== 'roster' && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                            {/* ... Current List Code ... */}
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
                                                                    fetch(`https://localhost:8000/recall/${p.id}`, { method: 'POST' })
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
        </div>
    );
}
