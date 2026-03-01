import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Clock from '../components/Clock'
import RosterViewer from '../components/RosterViewer'
import {
    Search, User, Users, Check, X, FileText, Calendar, CreditCard,
    TestTube, PenSquare, History, RefreshCcw, LogOut, MessageSquare,
    Send, Copy, AlertTriangle, Phone, CheckCircle, XCircle, Inbox,
    ChevronRight, ArrowRight, Loader2, Sparkles, CalendarDays
} from 'lucide-react'

const API_URL = "https://" + window.location.hostname + ":8000"

export default function SMSOfficer() {
    const { user, logout } = useAuth()
    const [patients, setPatients] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [messageBody, setMessageBody] = useState('')
    const [messageType, setMessageType] = useState('general')
    const [templates, setTemplates] = useState([])
    const [smsHistory, setSmsHistory] = useState([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [activeTab, setActiveTab] = useState('comms')
    const [rightTab, setRightTab] = useState('history')
    const [sending, setSending] = useState(false)
    const [searchTimeout, setSearchTimeout] = useState(null)
    const [justCopied, setJustCopied] = useState(false)
    const [justLogged, setJustLogged] = useState(false)

    useEffect(() => {
        document.title = 'SMS Officer Dashboard - Legacy Clinics'
        fetchTemplates()
        fetchSmsHistory()
    }, [])

    useEffect(() => {
        fetchSmsHistory()
    }, [startDate, endDate])

    useEffect(() => {
        // Debounce search
        if (searchTimeout) clearTimeout(searchTimeout)
        const timeout = setTimeout(() => {
            if (searchQuery.length >= 2) {
                searchPatients(searchQuery)
            } else if (searchQuery.length === 0) {
                fetchPatients()
            }
        }, 300)
        setSearchTimeout(timeout)
        return () => clearTimeout(timeout)
    }, [searchQuery])

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/sms/patients?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPatients(data)
            }
        } catch (error) {
            console.error('Failed to fetch patients:', error)
        }
    }

    const searchPatients = async (query) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/sms/patients?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPatients(data)
            }
        } catch (error) {
            console.error('Failed to search patients:', error)
        }
    }

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/sms/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setTemplates(data)
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error)
        }
    }

    const fetchSmsHistory = async () => {
        try {
            const token = localStorage.getItem('token')
            let url = `${API_URL}/sms/history?limit=100`
            if (startDate) url += `&start_date=${startDate}`
            if (endDate) url += `&end_date=${endDate}`

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSmsHistory(data)
            }
        } catch (error) {
            console.error('Failed to fetch SMS history:', error)
        }
    }

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient)
        // Reset message but keep template if selected
        if (!messageBody.includes('{patient_name}')) {
            setMessageBody('')
        }
    }

    const applyTemplate = (template) => {
        const patientName = selectedPatient
            ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
            : '{patient_name}'

        let msg = template.template.replace('{patient_name}', patientName)
        setMessageBody(msg)
        setMessageType(template.type)
    }

    const copyToClipboard = async (text) => {
        // Modern Clipboard API (requires secure context)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Clipboard API failed, falling back', err);
            }
        }

        // Fallback: execCommand('copy') via hidden textarea
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            console.error('Textarea fallback failed', err);
            return false;
        }
    }

    const handleManualSend = async () => {
        if (!selectedPatient || !messageBody.trim()) {
            alert('Please select a patient and enter a message')
            return
        }

        // 1. Copy to Clipboard
        const copySuccess = await copyToClipboard(messageBody)
        if (copySuccess) {
            setJustCopied(true)
            setTimeout(() => setJustCopied(false), 3000)
        } else {
            console.error('All clipboard copy methods failed')
            alert('Failed to copy message to clipboard. Please copy it manually.')
        }

        // 2. Open MTN Portal
        window.open('https://bulk-sms.mtn.co.rw/', '_blank')

        // 3. Log as Sent in Backend
        setSending(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/sms/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    patient_id: selectedPatient.id,
                    phone_number: selectedPatient.phone_number,
                    message_body: messageBody,
                    message_type: messageType
                })
            })

            if (res.ok) {
                setJustLogged(true)
                setTimeout(() => setJustLogged(false), 3000)
                setMessageBody('')
                setSelectedPatient(null)
                fetchSmsHistory()
            } else {
                console.error('Failed to log SMS')
            }
        } catch (error) {
            console.error('Failed to log SMS:', error)
        } finally {
            setSending(false)
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'))
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // ... keep existing state and logic ...

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
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                        <img src="/logo.png" alt="Legacy Clinics" className="h-10 w-auto object-contain" />
                    </div>
                    <div>
                        <h1 className="text-slate-800 text-xl font-bold tracking-tight">SMS Communications</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Officer Dashboard</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Clock />
                    <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-white/50 shadow-sm backdrop-blur-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#065590] to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                            {user?.full_name ? user.full_name.charAt(0) : 'U'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{user?.full_name || user?.username}</span>
                            <span className="text-[10px] text-[#065590] font-bold uppercase tracking-wide">{user?.role}</span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="p-2 bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-[1920px] mx-auto w-full gap-6">

                {/* Main Tab Switcher */}
                <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm w-fit self-center">
                    <button
                        onClick={() => setActiveTab('comms')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'comms'
                            ? 'bg-[#065590] text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}
                    >
                        <MessageSquare size={18} /> Communications
                    </button>
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'roster'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                            : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}
                    >
                        <CalendarDays size={18} /> Duty Roster
                    </button>
                </div>

                {activeTab === 'comms' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_400px] gap-6 h-full overflow-hidden">

                        {/* LEFT: Patient Search */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:bg-white/90">
                            <div className="p-5 border-b border-slate-100/50 bg-white/50 backdrop-blur-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-[#065590]" /> Select Patient
                                </h2>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></span>
                                    <input
                                        type="text"
                                        placeholder="Search name, MRN, phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#065590]/10 focus:border-[#065590] transition-all shadow-sm text-sm font-medium placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {patients.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in duration-500">
                                        <User size={48} className="mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No patients found</p>
                                        <p className="text-xs mt-1 text-slate-300">Try searching for a different name</p>
                                    </div>
                                ) : (
                                    patients.map(patient => (
                                        <div
                                            key={patient.id}
                                            onClick={() => handleSelectPatient(patient)}
                                            className={`group p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${selectedPatient?.id === patient.id
                                                ? 'bg-gradient-to-r from-[#065590] to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/30 transform scale-[1.02]'
                                                : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:translate-x-1'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start relative z-10">
                                                <div>
                                                    <div className="font-bold text-sm">
                                                        {patient.first_name} {patient.last_name}
                                                    </div>
                                                    <div className={`text-xs mt-1 font-mono ${selectedPatient?.id === patient.id ? 'text-white/80' : 'text-slate-500 group-hover:text-blue-500'}`}>
                                                        MRN: {patient.mrn}
                                                    </div>
                                                </div>
                                                {selectedPatient?.id === patient.id && <Check size={20} className="text-white animate-in zoom-in spin-in-90 duration-300" />}
                                            </div>

                                            <div className={`flex items-center gap-2 mt-3 text-xs ${selectedPatient?.id === patient.id ? 'text-white/90' : 'text-slate-500'}`}>
                                                <Phone size={12} /> <span>{patient.phone_number}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* MIDDLE: Message Composer */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full overflow-hidden transition-all duration-300 relative">
                            <div className="p-5 border-b border-slate-100/50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <PenSquare size={20} className="text-[#065590]" /> Compose Message
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                                {/* Selected Patient Card */}
                                <div className={`
                                mb-6 p-4 rounded-2xl border transition-all duration-300
                                ${selectedPatient
                                        ? 'bg-blue-50/50 border-blue-100 shadow-sm'
                                        : 'bg-slate-50 border-dashed border-slate-200'}
                            `}>
                                    {selectedPatient ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 text-[#065590] flex items-center justify-center font-bold text-xl shadow-inner">
                                                    {selectedPatient.first_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-0.5">Recipient</div>
                                                    <div className="font-bold text-slate-800 text-lg">
                                                        {selectedPatient.first_name} {selectedPatient.last_name}
                                                    </div>
                                                    <div className="text-sm text-slate-600 font-mono flex items-center gap-1.5"><Phone size={14} /> {selectedPatient.phone_number}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPatient(null)}
                                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                title="Clear Selection"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2 text-slate-400 flex flex-col items-center">
                                            <AlertTriangle size={24} className="mb-2 opacity-50" />
                                            <p className="font-medium">No patient selected</p>
                                            <p className="text-xs mt-1">Select a patient from the list to start</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Quick Templates</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                        {templates.map(template => (
                                            <button
                                                key={template.type}
                                                onClick={() => applyTemplate(template)}
                                                disabled={!selectedPatient}
                                                className={`
                                                px-3 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center justify-center gap-2
                                                ${!selectedPatient
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95'}
                                            `}
                                            >
                                                {template.type === 'test_results' && <><TestTube size={14} /> Results</>}
                                                {template.type === 'appointment' && <><Calendar size={14} /> Appt.</>}
                                                {template.type === 'payment' && <><CreditCard size={14} /> Payment</>}
                                                {template.type === 'general' && <><MessageSquare size={14} /> General</>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-[200px]">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Message Body</label>
                                    <textarea
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        placeholder={selectedPatient ? "Type your message here..." : "Select a patient first..."}
                                        disabled={!selectedPatient}
                                        className={`
                                        flex-1 w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#065590]/10 focus:border-[#065590] resize-none transition-all shadow-inner text-base leading-relaxed
                                        ${!selectedPatient ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400' : 'border-slate-200 text-slate-800'}
                                    `}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${messageBody.length > 160 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {messageBody.length} chars {messageBody.length > 160 && '(Multiple SMS)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100/50 bg-slate-50/50 backdrop-blur-sm">
                                <button
                                    onClick={handleManualSend}
                                    disabled={!selectedPatient || !messageBody.trim() || sending}
                                    className={`
                                    w-full py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                                    ${!selectedPatient || !messageBody.trim() || sending
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                            : justLogged
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white transform scale-[1.02]'
                                                : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white transform hover:-translate-y-1 active:scale-95'}
                                `}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Saving Log...
                                        </>
                                    ) : justLogged ? (
                                        <><CheckCircle size={20} /> Copied & Logged!</>
                                    ) : (
                                        <>
                                            <Copy size={20} />
                                            <span>Copy & Open MTN Portal</span>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </>
                                    )}
                                </button>
                                {justCopied && !justLogged && (
                                    <p className="text-center text-xs text-emerald-600 font-bold mt-2 animate-in slide-in-from-bottom-1">
                                        Message copied to clipboard!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: SMS History / Roster */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:bg-white/90">
                            <div className="p-4 border-b border-slate-100/50 flex flex-col gap-3 bg-white/50 backdrop-blur-sm">
                                {/* Tab switcher */}
                                <div className="flex gap-2">
                                    <div className="flex-1 py-2 rounded-xl font-bold text-sm bg-[#065590] text-white shadow-sm flex items-center justify-center gap-1.5">
                                        <History size={15} /> Message History
                                    </div>
                                </div>



                                {/* History subheader (date filters + export) — only shown in history tab */}
                                {rightTab === 'history' && (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                                SMS Log
                                            </h2>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const token = localStorage.getItem('token');
                                                        let url = `${API_URL}/sms/export?token=${token}`;
                                                        if (startDate) url += `&start_date=${startDate}`;
                                                        if (endDate) url += `&end_date=${endDate}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="p-2 bg-white hover:bg-blue-50 text-slate-500 hover:text-[#065590] rounded-lg border border-slate-200 transition-all shadow-sm"
                                                    title="Export to Word"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={fetchSmsHistory}
                                                    className="p-2 bg-white hover:bg-blue-50 text-slate-500 hover:text-[#065590] rounded-lg border border-slate-200 transition-all shadow-sm"
                                                    title="Refresh"
                                                >
                                                    <RefreshCcw size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-[#065590]"
                                            />
                                            <ArrowRight size={12} className="text-slate-400" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-[#065590]"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Roster View */}
                            {rightTab === 'roster' && (
                                <div className="flex-1 overflow-hidden">
                                    <RosterViewer token={localStorage.getItem('token')} />
                                </div>
                            )}

                            <div className={`flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar ${rightTab === 'roster' ? 'hidden' : ''}`}>
                                {smsHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in duration-500">
                                        <Inbox size={48} className="mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No history found</p>
                                        <p className="text-xs mt-1 text-slate-300">Sent messages will appear here</p>
                                    </div>
                                ) : (
                                    smsHistory.map(sms => (
                                        <div
                                            key={sms.id}
                                            className={`p-4 rounded-xl border transition-all hover:bg-white hover:shadow-md ${sms.status === 'sent' ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200' :
                                                sms.status === 'failed' ? 'bg-red-50/40 border-red-100 hover:border-red-200' :
                                                    'bg-white/60 border-slate-100'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`
                                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                                ${sms.status === 'sent' || sms.status === 'manual_send' ? 'bg-emerald-100 text-emerald-700' :
                                                        sms.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'}
                                            `}>
                                                    {sms.status === 'failed' ? <><XCircle size={10} /> Failed</> : <><CheckCircle size={10} /> Sent</>}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {formatDate(sms.sent_at)}
                                                </span>
                                            </div>

                                            <div className="font-bold text-sm text-slate-800 mb-1">
                                                {sms.patient_name || 'Unknown Patient'}
                                            </div>
                                            <div className="text-xs text-slate-500 mb-2 font-mono flex items-center gap-1.5">
                                                <Phone size={10} /> {sms.phone_number}
                                            </div>

                                            <div className="bg-white/50 p-2.5 rounded-lg border border-slate-100/50">
                                                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                                    {sms.message_body}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl">
                        <div className="p-5 border-b border-slate-100/50 bg-white/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CalendarDays size={24} className="text-violet-600" /> Clinic Duty Roster
                            </h2>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <RosterViewer token={localStorage.getItem('token')} />
                        </div>
                    </div>
                )}
            </div>

            {/* Custom CSS for this component */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(203, 213, 225, 0.5);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(148, 163, 184, 0.7);
                }
            `}</style>
        </div >
    )
}
