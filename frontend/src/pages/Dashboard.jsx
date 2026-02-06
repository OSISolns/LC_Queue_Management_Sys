import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const API_URL = "http://" + window.location.hostname + ":8000"
const socket = io(API_URL)

export default function Dashboard() {
    const { user, logout } = useAuth()
    const [queue, setQueue] = useState([])
    const [noShowList, setNoShowList] = useState([])
    const [activeListTab, setActiveListTab] = useState('waiting')
    const [currentPatient, setCurrentPatient] = useState(null)
    const [doctorId, setDoctorId] = useState(user?.id || null)
    const [roomNumber, setRoomNumber] = useState("")
    const [timer, setTimer] = useState("00:00") // Consultation Timer usage
    const [isFullscreen, setIsFullscreen] = useState(false)

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
    }, [activeListTab])

    useEffect(() => {
        const titleRole = user?.role === 'Technician' ? 'Technician' : 'Doctor'
        document.title = `${titleRole} Dashboard - Legacy Clinics`
        if (user || localStorage.getItem('token')) {
            fetchQueue()
            checkActive()
            if (activeListTab === 'noshow') fetchNoShows()
        }

        socket.on('queue_update', () => {
            fetchQueue()
            if (activeListTab === 'noshow') fetchNoShows()
        })

        return () => {
            socket.off('queue_update')
        }
    }, [roomNumber, user])

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
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden text-[#065590] font-sans">
            {/* Header */}
            <header className="flex justify-between items-center bg-white px-6 py-3 shadow-sm border-b border-slate-200 flex-shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 object-contain" />
                    <h1 className="text-slate-800 text-xl font-bold tracking-tight">
                        {user?.role === 'Technician' ? 'Technician Dashboard' : 'Doctor Dashboard'}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-[#065590]/10 px-4 py-2 rounded-xl text-[#065590] font-bold flex items-center gap-2 border border-[#065590]/20">
                        <span className="text-[#065590]/70 uppercase text-xs tracking-wider">Waiting</span>
                        <span className="text-xl">{queue.length}</span>
                    </div>

                    <button onClick={toggleFullscreen} className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 transition" title="Toggle Fullscreen">
                        {isFullscreen ? '⏹️' : '⛶'}
                    </button>

                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <span className="font-bold text-slate-400 text-xs uppercase tracking-wide">Room</span>
                        <div className="bg-[#065590] px-3 py-1 rounded-lg text-white font-bold">
                            {roomNumber || '--'}
                        </div>
                    </div>

                    <button onClick={logout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition text-sm font-bold border border-red-100">
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-[1920px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] xl:grid-cols-[550px_1fr] gap-6 h-full overflow-hidden">

                    {/* LEFT PANEL: Active Patient Control */}
                    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">

                        {/* Currently Serving Card */}
                        <div className={`
                            relative overflow-hidden rounded-3xl p-8 text-center transition-all duration-500
                            ${currentPatient
                                ? 'bg-white shadow-2xl border-4 border-[#065590] ring-4 ring-[#065590]/10'
                                : 'bg-white shadow-lg border border-slate-200 opacity-90'}
                        `}>
                            {currentPatient && (
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0866ad] to-[#065590]"></div>
                            )}

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                                    {currentPatient ? 'Now Serving' : 'Status'}
                                </h3>
                                {currentPatient && (
                                    <div className="bg-[#065590]/10 text-[#065590] px-4 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm border border-[#065590]/20">
                                        <span className="animate-pulse">●</span>
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
                                            className="py-4 bg-[#64af45] hover:bg-[#529438] text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2">
                                            📢 Recall
                                        </button>
                                        <button onClick={() => handleAction('noshow')}
                                            className="py-4 bg-[#64af45] hover:bg-[#529438] text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2">
                                            ❌ No Show
                                        </button>
                                    </div>
                                    <button onClick={() => handleAction('complete')}
                                        className="w-full py-5 bg-[#065590] hover:bg-[#04437a] text-white text-xl font-bold rounded-xl shadow-lg shadow-[#065590]/20 transition-transform active:scale-[0.98] flex items-center justify-center gap-3">
                                        ✅ Mark Completed
                                    </button>
                                </div>
                            ) : (
                                <div className="py-12 text-slate-400 flex flex-col items-center">
                                    <div className="text-6xl mb-4 opacity-50 grayscale">☕</div>
                                    <p className="text-xl font-medium text-slate-600">No Active Patient</p>
                                    <p className="text-sm">Ready to call next</p>
                                </div>
                            )}
                        </div>

                        {/* Call Next Button */}
                        <button
                            onClick={callNext}
                            disabled={!!currentPatient}
                            className={`
                                py-8 rounded-2xl text-2xl font-bold shadow-xl transition-all transform duration-200
                                ${currentPatient
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-[#065590] text-white hover:bg-[#04437a] hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] cursor-pointer ring-4 ring-slate-100'}
                            `}
                        >
                            {currentPatient ? 'Finish Current First' : 'Call Next Patient'}
                        </button>

                    </div>

                    {/* RIGHT PANEL: Queue List */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">

                        {/* Tab Switcher */}
                        <div className="flex p-2 gap-2 bg-slate-50 border-b border-slate-200">
                            <button
                                onClick={() => setActiveListTab('waiting')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeListTab === 'waiting' ? 'bg-white text-[#065590] shadow-sm ring-1 ring-[#065590]/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                Waiting Queue ({queue.length})
                            </button>
                            <button
                                onClick={() => setActiveListTab('noshow')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeListTab === 'noshow' ? 'bg-white text-[#64af45] shadow-sm ring-1 ring-[#64af45]/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                No Shows
                            </button>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                            {activeListTab === 'waiting' ? (
                                <>
                                    {queue.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <p className="text-lg">Queue is empty</p>
                                        </div>
                                    ) : (
                                        queue.map((p, index) => (
                                            <div key={p.id} className={`
                                                group flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-[#065590]/30
                                                border-l-[6px] ${p.token_number.startsWith('E') ? 'border-l-red-500' : p.token_number.startsWith('V') ? 'border-l-purple-500' : 'border-l-[#065590]'}
                                            `}>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl font-bold text-slate-800 w-24">{p.token_number}</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                                                            {p.patient_name || 'Walk-in'}
                                                            {p.visit_type === 'Review' && (
                                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border border-purple-200">
                                                                    Review
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-mono">
                                                            {new Date(p.created_at + (p.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                            <div key={p.id} className="flex justify-between items-center p-4 bg-[#64af45]/5 rounded-xl border border-[#64af45]/20 border-l-[6px] border-l-[#64af45]">
                                                <div>
                                                    <span className="text-xl font-bold text-[#64af45] line-through mr-3">{p.token_number}</span>
                                                    <span className="text-slate-600 font-medium">{p.patient_name}</span>
                                                </div>
                                                <button onClick={() => {
                                                    fetch(`${API_URL}/recall/${p.id}`, { method: 'POST' }).then(() => {
                                                        alert(`Recalled ${p.token_number}`); fetchNoShows();
                                                    })
                                                }} className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-bold rounded-lg hover:bg-amber-200">
                                                    Recall
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
        </div>
    )
}
