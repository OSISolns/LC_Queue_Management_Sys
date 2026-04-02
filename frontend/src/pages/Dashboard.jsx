import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import {
    Users, DoorOpen, Maximize2, Minimize2, LogOut, Clock as ClockIcon,
    Megaphone, UserX, CheckCircle, ArrowRight, Coffee,
    User, FileText, Activity, AlertCircle, Stethoscope, Phone, Calendar, Hash, X, CalendarDays
} from 'lucide-react'
import Clock from '../components/Clock'
import RosterViewer from '../components/RosterViewer'

const API_URL = "https://" + window.location.hostname + ":8000"
const socket = io(API_URL)

export default function Dashboard() {
    const { user, logout } = useAuth()
    const [queue, setQueue] = useState([])
    const [noShowList, setNoShowList] = useState([])
    const [completedList, setCompletedList] = useState([])
    const [activeListTab, setActiveListTab] = useState('waiting')
    const [currentPatient, setCurrentPatient] = useState(null)
    const [doctorId, setDoctorId] = useState(user?.id || null)
    const [roomNumber, setRoomNumber] = useState("")
    const [timer, setTimer] = useState("00:00")
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [selectedPatientModal, setSelectedPatientModal] = useState(null)
    // Notes state
    const [noteText, setNoteText] = useState('')
    const [noteSaving, setNoteSaving] = useState(false)
    const [noteSaved, setNoteSaved] = useState(false)
    const [modalNoteText, setModalNoteText] = useState('')
    const [modalNoteSaving, setModalNoteSaving] = useState(false)
    const [modalNoteSaved, setModalNoteSaved] = useState(false)

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Timer Logic
    useEffect(() => {
        let interval;
        if (currentPatient && currentPatient.called_at) {
            const startTime = new Date(currentPatient.called_at + (currentPatient.called_at.endsWith('Z') ? '' : 'Z')).getTime();
            interval = setInterval(() => {
                const now = new Date().getTime();
                const diff = Math.floor((now - startTime) / 1000);
                const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
                const seconds = (diff % 60).toString().padStart(2, '0');
                setTimer(`${minutes}:${seconds}`);
            }, 1000);
        } else {
            setTimer("00:00");
        }
        return () => clearInterval(interval);
    }, [currentPatient]);

    useEffect(() => {
        if (user) {
            setRoomNumber(user.room_number || "")
            setDoctorId(user.id)
        }
    }, [user])

    const fetchQueue = async () => {
        try {
            const url = roomNumber ? `${API_URL}/queue?room=${roomNumber}` : `${API_URL}/queue`
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) setQueue(data)
            }
        } catch (error) {
            console.error('Failed to fetch queue:', error)
        }
    }

    const fetchNoShows = async () => {
        try {
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/history?status=no-show&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (Array.isArray(data)) setNoShowList(data)
        } catch (error) {
            console.error('Failed to fetch no-shows:', error)
        }
    }

    const fetchCompleted = async () => {
        try {
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/history?status=completed&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (Array.isArray(data)) setCompletedList(data)
        } catch (error) {
            console.error('Failed to fetch completed:', error)
        }
    }

    const checkActive = async () => {
        if (!roomNumber) return
        try {
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/history?status=calling&limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (Array.isArray(data)) {
                const active = data.find(p => p.room_number === roomNumber)
                if (active) setCurrentPatient(active)
            }
        } catch (error) {
            console.error('Failed to restore active patient:', error)
        }
    }

    useEffect(() => {
        if (activeListTab === 'noshow') fetchNoShows()
        if (activeListTab === 'completed') fetchCompleted()
    }, [activeListTab])

    useEffect(() => {
        const titleRole = user?.role === 'Technician' ? 'Technician' : 'Doctor'
        document.title = `${titleRole} Dashboard - Legacy Clinics`
        if (user || localStorage.getItem('token')) {
            fetchQueue()
            checkActive()
            if (activeListTab === 'noshow') fetchNoShows()
            if (activeListTab === 'completed') fetchCompleted()
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

        socket.on('queue_update', () => {
            fetchQueue()
            if (activeListTab === 'noshow') fetchNoShows()
            if (activeListTab === 'completed') fetchCompleted()
        })

        return () => {
            socket.off('queue_update')
        }
    }, [roomNumber, user])

    // When currentPatient changes, reset the note field
    useEffect(() => {
        if (currentPatient) {
            setNoteText(currentPatient.doctor_notes || '')
            setNoteSaved(false)
        } else {
            setNoteText('')
        }
    }, [currentPatient])

    const saveNote = async (queueId, text, { onSaving, onSaved }) => {
        onSaving(true)
        try {
            const token = user?.token || localStorage.getItem('token')
            await fetch(`${API_URL}/queue/${queueId}/notes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: text })
            })
            onSaved(true)
            setTimeout(() => onSaved(false), 2500)
        } catch (e) {
            console.error(e)
        } finally {
            onSaving(false)
        }
    }

    const callNext = async () => {
        try {
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/queue/next`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ doctor_id: doctorId, room_number: roomNumber })
            })

            if (res.ok) {
                const patient = await res.json()
                setCurrentPatient(patient)
            } else {
                const err = await res.json()
                alert(err.detail || "No patients in waiting queue")
            }
        } catch (e) {
            console.error(e)
            alert("Failed to call next patient")
        }
    }

    const callSpecific = async (patientId) => {
        if (currentPatient) return alert("Please finish current patient first.");
        if (!confirm("Call this specific patient?")) return;

        try {
            const token = user?.token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/call-specific/${patientId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ doctor_id: doctorId, room_number: roomNumber })
            })

            if (res.ok) {
                const patient = await res.json()
                setCurrentPatient(patient)
            } else {
                const err = await res.json()
                alert(err.detail || "Failed to call patient")
            }
        } catch (e) {
            console.error(e)
        }
    };

    const handleAction = async (action) => {
        if (!currentPatient) return
        try {
            const token = user?.token || localStorage.getItem('token')
            let url;
            if (action === 'complete') url = `${API_URL}/complete/${currentPatient.id}`;
            else if (action === 'noshow') url = `${API_URL}/no-show/${currentPatient.id}`;
            else if (action === 'recall') url = `${API_URL}/recall/${currentPatient.id}`;

            await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (action === 'recall') {
                alert(`Recalled ${currentPatient.token_number}`)
            } else {
                setCurrentPatient(null)
                fetchQueue()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-emerald-100/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-indigo-100/40 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 flex justify-between items-center bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm border-b border-white/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 object-contain" />
                    <h1 className="text-slate-800 text-xl font-bold tracking-tight">
                        {user?.role === 'Technician' ? 'Technician Dashboard' : 'Doctor Dashboard'}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <Clock />
                    <div className="bg-white/50 px-4 py-2 rounded-xl text-[#065590] font-bold flex items-center gap-2 border border-blue-100 shadow-sm backdrop-blur-sm">
                        <Users size={18} className="text-[#065590]/70" />
                        <span className="text-[#065590]/70 uppercase text-xs tracking-wider">Waiting</span>
                        <span className="text-xl">{queue.length}</span>
                    </div>

                    <button onClick={toggleFullscreen} className="p-2 rounded-xl bg-white/50 text-slate-500 hover:bg-white hover:text-[#065590] border border-blue-100 shadow-sm transition-all" title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>

                    <div className="bg-white/50 px-4 py-2 rounded-xl border border-blue-100 shadow-sm flex items-center gap-3 backdrop-blur-sm">
                        <span className="font-bold text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1.5"><DoorOpen size={14} /> Room</span>
                        <div className="bg-[#065590] px-3 py-1 rounded-lg text-white font-bold shadow-sm">
                            {roomNumber || '--'}
                        </div>
                    </div>

                    <span className="text-slate-500 text-sm font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        {user?.salutation} {user?.full_name || user?.username} <span className="text-slate-300">|</span> <span className="text-[#065590] font-bold">{user?.role}</span>
                    </span>

                    <button onClick={logout} className="px-4 py-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all text-sm font-bold border border-transparent hover:border-red-100 shadow-sm flex items-center gap-2">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-[1920px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] xl:grid-cols-[550px_1fr] gap-6 h-full overflow-hidden">

                    {/* LEFT PANEL: Active Patient Control */}
                    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">

                        {/* Currently Serving Card */}
                        <div className={`
                            relative overflow-hidden rounded-3xl p-8 text-center transition-all duration-500 backdrop-blur-xl
                            ${currentPatient
                                ? 'bg-white/90 shadow-2xl border-4 border-[#065590] ring-4 ring-[#065590]/10'
                                : 'bg-white/60 shadow-lg border border-white/50 opacity-90'}
                        `}>
                            {currentPatient && (
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0866ad] to-[#065590]"></div>
                            )}

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                                    {currentPatient ? 'Now Serving' : 'Status'}
                                </h3>
                                {currentPatient && (
                                    <div className="bg-blue-50/80 text-[#065590] px-4 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm border border-blue-100 backdrop-blur-sm">
                                        <Clock size={16} className="animate-pulse" />
                                        <span>{timer}</span>
                                    </div>
                                )}
                            </div>

                            {currentPatient ? (
                                <div className="fade-in">
                                    <h1 className="text-7xl xl:text-8xl font-black text-[#065590] mb-2 tracking-tighter drop-shadow-sm">
                                        {currentPatient.token_number}
                                    </h1>
                                    <h2 className="text-2xl xl:text-3xl font-bold text-slate-800 mb-8 line-clamp-2">
                                        {currentPatient.patient_name}
                                    </h2>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button onClick={() => handleAction('recall')}
                                            className="py-4 bg-gradient-to-r from-[#64af45] to-[#529438] hover:to-[#3e722a] text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 border border-white/20">
                                            <Megaphone size={20} /> Recall
                                        </button>
                                        <button onClick={() => handleAction('noshow')}
                                            className="py-4 bg-white hover:bg-red-50 text-slate-500 hover:text-red-500 font-bold rounded-xl shadow-sm border border-slate-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                            <UserX size={20} /> No Show
                                        </button>
                                    </div>

                                    {/* Doctor Notes */}
                                    <div className="mb-4 text-left">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                            <FileText size={13} /> Consultation Notes
                                        </label>
                                        <textarea
                                            value={noteText}
                                            onChange={e => { setNoteText(e.target.value); setNoteSaved(false) }}
                                            placeholder="Type your consultation notes here…"
                                            rows={3}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none outline-none focus:border-[#065590] focus:ring-2 focus:ring-[#065590]/10 transition"
                                        />
                                        <button
                                            onClick={() => saveNote(currentPatient.id, noteText, { onSaving: setNoteSaving, onSaved: setNoteSaved })}
                                            disabled={noteSaving || !noteText.trim()}
                                            className={`mt-2 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${noteSaved
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                    : noteSaving
                                                        ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                        : 'bg-[#065590]/10 text-[#065590] hover:bg-[#065590]/20 border border-[#065590]/20'
                                                }`}
                                        >
                                            {noteSaved ? <><CheckCircle size={16} /> Saved</> : noteSaving ? 'Saving…' : <><FileText size={16} /> Save Notes</>}
                                        </button>
                                    </div>

                                    <button onClick={() => handleAction('complete')}
                                        className="w-full py-5 bg-gradient-to-r from-[#065590] to-[#04437a] hover:from-[#054a80] hover:to-[#033663] text-white text-xl font-bold rounded-xl shadow-xl shadow-blue-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 border border-white/10">
                                        <CheckCircle size={24} /> Mark Completed
                                    </button>

                                </div>
                            ) : (
                                <div className="py-12 text-slate-400 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                    <div className="mb-4 p-6 bg-slate-50/50 rounded-full">
                                        <Coffee size={64} className="opacity-50 text-slate-300" />
                                    </div>
                                    <p className="text-xl font-bold text-slate-600">No Active Patient</p>
                                    <p className="text-sm font-medium opacity-60 mt-1">Ready to call next</p>
                                </div>
                            )}
                        </div>

                        {/* Call Next Button */}
                        <button
                            onClick={callNext}
                            disabled={!!currentPatient}
                            className={`
                                py-8 rounded-2xl text-2xl font-bold shadow-xl transition-all transform duration-200 flex items-center justify-center gap-3
                                ${currentPatient
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-gradient-to-r from-[#065590] to-[#04437a] text-white hover:from-[#054a80] hover:to-[#033663] hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] cursor-pointer ring-4 ring-white/50 border border-white/10'}
                            `}
                        >
                            {currentPatient ? (
                                <>Finish Current First <Activity size={24} className="opacity-50" /></>
                            ) : (
                                <>Call Next Patient <ArrowRight size={28} /></>
                            )}
                        </button>

                    </div>

                    {/* RIGHT PANEL: Queue List */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full overflow-hidden">

                        {/* Tab Switcher */}
                        <div className="flex p-2 gap-2 bg-slate-50/50 border-b border-slate-100/50 flex-wrap">
                            <button
                                onClick={() => setActiveListTab('waiting')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeListTab === 'waiting' ? 'bg-white text-[#065590] shadow-sm ring-1 ring-[#065590]/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                Waiting ({queue.length})
                            </button>
                            <button
                                onClick={() => setActiveListTab('completed')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeListTab === 'completed' ? 'bg-white text-[#065590] shadow-sm ring-1 ring-[#065590]/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                Completed
                            </button>
                            <button
                                onClick={() => setActiveListTab('noshow')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeListTab === 'noshow' ? 'bg-white text-[#64af45] shadow-sm ring-1 ring-[#64af45]/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                No Shows
                            </button>
                            <button
                                onClick={() => setActiveListTab('roster')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${activeListTab === 'roster' ? 'bg-white text-violet-600 shadow-sm ring-1 ring-violet-400/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                <CalendarDays size={15} /> Roster
                            </button>
                        </div>

                        {/* Roster View */}
                        {activeListTab === 'roster' && (
                            <div className="flex-1 overflow-hidden">
                                <RosterViewer token={user?.token || localStorage.getItem('token')} />
                            </div>
                        )}

                        {/* List Content */}
                        <div className={`flex-1 overflow-y-auto p-4 space-y-3 bg-white/30 custom-scrollbar ${activeListTab === 'roster' ? 'hidden' : ''}`}>
                            {activeListTab === 'waiting' ? (
                                <>
                                    {queue.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <p className="text-lg">Queue is empty</p>
                                        </div>
                                    ) : (
                                        queue.map((p) => (
                                            <div key={p.id}
                                                onClick={() => setSelectedPatientModal(p)}
                                                className={`
                                                cursor-pointer group flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-[#065590]/30
                                                border-l-[6px] ${p.token_number.startsWith('E') ? 'border-l-red-500' : p.token_number.startsWith('V') ? 'border-l-purple-500' : 'border-l-[#065590]'}
                                            `}>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl font-bold text-slate-800 w-24 tabular-nums tracking-tight">{p.token_number}</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                                                            <User size={16} className="text-slate-400" />
                                                            {p.patient_name || 'Walk-in'}
                                                            {p.visit_type === 'Review' && (
                                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border border-purple-200 flex items-center gap-1">
                                                                    <FileText size={10} /> Review
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                                                            <Clock size={12} />
                                                            {new Date(p.created_at + (p.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            ) : activeListTab === 'completed' ? (
                                <>
                                    {completedList.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <CheckCircle size={48} className="mb-3 opacity-20" />
                                            <p className="text-lg">No completed patients</p>
                                        </div>
                                    ) : (
                                        completedList.map(p => (
                                            <div key={p.id}
                                                onClick={() => setSelectedPatientModal(p)}
                                                className="cursor-pointer flex justify-between items-center p-4 bg-white/40 rounded-xl border border-slate-100 transition-all hover:bg-white/60">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800">{p.token_number}</span>
                                                            <span className="text-sm text-slate-600 truncate max-w-[120px]">{p.patient_name}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-mono">
                                                            {(p.completed_at || p.updated_at) ? new Date((p.completed_at || p.updated_at) + ((p.completed_at || p.updated_at).endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            ) : (
                                <>
                                    {noShowList.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <p className="text-lg">No records found</p>
                                        </div>
                                    ) : (
                                        noShowList.map(p => (
                                            <div key={p.id}
                                                onClick={() => setSelectedPatientModal(p)}
                                                className="cursor-pointer flex justify-between items-center p-4 bg-[#64af45]/5 rounded-xl border border-[#64af45]/20 border-l-[6px] border-l-[#64af45] hover:bg-[#64af45]/10 transition-colors">
                                                <div>
                                                    <span className="text-xl font-bold text-[#64af45] line-through mr-3">{p.token_number}</span>
                                                    <span className="text-slate-600 font-medium">{p.patient_name}</span>
                                                </div>
                                                <button onClick={() => {
                                                    fetch(`${API_URL}/recall/${p.id}`, { method: 'POST' }).then(() => {
                                                        alert(`Recalled ${p.token_number}`); fetchNoShows();
                                                    })
                                                }} className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-bold rounded-lg hover:bg-amber-200 flex items-center gap-1.5 transition-colors">
                                                    <Megaphone size={14} /> Recall
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>

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

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone size={12} /> Phone</div>
                                    <div className="text-slate-700 font-medium truncate">{selectedPatientModal.patient_phone || selectedPatientModal.phone_number || 'N/A'}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><ClockIcon size={12} /> Registered</div>
                                    <div className="text-slate-700 font-medium">
                                        {new Date(selectedPatientModal.created_at + (selectedPatientModal.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText size={12} /> Visit Type</div>
                                    <div className="text-slate-700 font-medium capitalize">{selectedPatientModal.visit_type || 'Consultation'}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={12} /> Wait Time</div>
                                    <div className="text-slate-700 font-medium">
                                        {selectedPatientModal.called_at ? (
                                            `${Math.round((new Date(selectedPatientModal.called_at + (selectedPatientModal.called_at.endsWith('Z') ? '' : 'Z')) - new Date(selectedPatientModal.created_at + (selectedPatientModal.created_at.endsWith('Z') ? '' : 'Z'))) / 60000)} mins`
                                        ) : (
                                            'Waiting...'
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><User size={12} /> Profile</div>
                                    <div className="text-slate-700 font-medium">
                                        {selectedPatientModal.patient_gender ? `${selectedPatientModal.patient_gender}, ` : ''}
                                        {selectedPatientModal.patient_dob ? `DOB: ${selectedPatientModal.patient_dob}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={12} /> Priority</div>
                                    <div className="text-slate-700 font-medium capitalize">
                                        {selectedPatientModal.priority_name || 'Standard'}
                                    </div>
                                </div>
                            </div>

                            {/* Notes section – shown for completed/serving/no-show only */}
                            {selectedPatientModal.status !== 'waiting' && (
                                <div className="border-t border-slate-100 pt-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                                        <FileText size={13} /> Doctor Notes
                                    </label>
                                    {selectedPatientModal.doctor_notes && !modalNoteSaved ? (
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap mb-2">
                                            {selectedPatientModal.doctor_notes}
                                        </div>
                                    ) : null}
                                    <textarea
                                        value={modalNoteText !== '' ? modalNoteText : (selectedPatientModal.doctor_notes || '')}
                                        onChange={e => { setModalNoteText(e.target.value); setModalNoteSaved(false) }}
                                        onFocus={e => { if (modalNoteText === '') setModalNoteText(selectedPatientModal.doctor_notes || '') }}
                                        placeholder="Add or edit consultation notes…"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none outline-none focus:border-[#065590] focus:ring-2 focus:ring-[#065590]/10 transition"
                                    />
                                    <button
                                        onClick={() => saveNote(
                                            selectedPatientModal.id,
                                            modalNoteText || selectedPatientModal.doctor_notes || '',
                                            { onSaving: setModalNoteSaving, onSaved: setModalNoteSaved }
                                        )}
                                        disabled={modalNoteSaving || !(modalNoteText || selectedPatientModal.doctor_notes)}
                                        className={`mt-2 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${modalNoteSaved
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                : modalNoteSaving
                                                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                    : 'bg-[#065590]/10 text-[#065590] hover:bg-[#065590]/20 border border-[#065590]/20'
                                            }`}
                                    >
                                        {modalNoteSaved ? <><CheckCircle size={16} /> Saved</> : modalNoteSaving ? 'Saving…' : <><FileText size={16} /> Save Notes</>}
                                    </button>
                                </div>
                            )}

                            {selectedPatientModal.status === 'waiting' && !currentPatient && (
                                <button
                                    onClick={() => {
                                        callSpecific(selectedPatientModal.id);
                                        setSelectedPatientModal(null);
                                    }}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#065590] to-[#04437a] hover:from-[#054a80] hover:to-[#033663] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowRight size={20} /> Call This Patient
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

