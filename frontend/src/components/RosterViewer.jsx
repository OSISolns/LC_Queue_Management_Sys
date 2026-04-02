import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Users2, RefreshCcw, Building2, Phone, X, User as UserIcon, Info, MapPin, Edit3, Trash2, Save, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = "https://" + window.location.hostname + ":8000"

const SHIFT_COLORS = {
    Morning: 'bg-amber-50 border-amber-200 text-amber-700',
    Evening: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    Night: 'bg-slate-100 border-slate-300 text-slate-600',
    Day: 'bg-sky-50 border-sky-200 text-sky-700',
}

const ROLE_DOT = {
    Doctor: 'bg-[#065590]',
    Technician: 'bg-emerald-500',
    Nurse: 'bg-pink-400',
    Helpdesk: 'bg-amber-400',
    default: 'bg-slate-400',
}

function shiftColor(label = '') {
    const key = Object.keys(SHIFT_COLORS).find(k => label.toLowerCase().includes(k.toLowerCase()))
    return SHIFT_COLORS[key] || 'bg-slate-50 border-slate-200 text-slate-700'
}

function roleDot(role = '') {
    return ROLE_DOT[role] || ROLE_DOT.default
}

function fmt(timeObj) {
    if (!timeObj) return '--'
    // timeObj might be "HH:MM:SS" string
    const str = typeof timeObj === 'string' ? timeObj : String(timeObj)
    return str.slice(0, 5)
}

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isCurrentlyOnDuty(dateStr, start, end) {
    if (!start || !end) return false;

    const now = new Date();
    const todayStr = toDateStr(now);

    // If viewing a past or future roster date, they aren't "currently" on duty
    if (dateStr !== todayStr) return false;

    // Convert "HH:MM:SS" or "HH:MM" to minutes from midnight
    const toMins = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    };

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = toMins(start);
    const endMins = toMins(end);

    if (startMins < endMins) {
        // Standard shift (e.g., 08:00 - 17:00)
        return nowMins >= startMins && nowMins < endMins;
    } else {
        // Overnight shift (e.g., 22:00 - 06:00)
        return nowMins >= startMins || nowMins < endMins;
    }
}

export default function RosterViewer({ token }) {
    const [date, setDate] = useState(toDateStr(new Date()))
    const [roster, setRoster] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [filterDept, setFilterDept] = useState('all')
    const [selectedStaff, setSelectedStaff] = useState(null)
    const [tick, setTick] = useState(0)
    const { user } = useAuth()

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000)
        return () => clearInterval(timer)
    }, [])

    const fetchRoster = async (d) => {
        setLoading(true)
        setError('')
        setRoster(null)
        try {
            const tk = token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/roster?date=${d}`, {
                headers: { 'Authorization': `Bearer ${tk}` }
            })
            if (res.status === 404) {
                setError('No published roster for this date.')
            } else if (!res.ok) {
                setError('Failed to load roster.')
            } else {
                const data = await res.json()
                setRoster(data)
            }
        } catch (e) {
            setError('Could not connect to server.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchRoster(date) }, [date])

    const changeDay = (delta) => {
        const d = new Date(date)
        d.setDate(d.getDate() + delta)
        setDate(toDateStr(d))
    }

    const handleEditStart = () => {
        setEditData({
            shift_label: selectedStaff.shift_label,
            shift_start_time: selectedStaff.shift_start_time,
            shift_end_time: selectedStaff.shift_end_time,
            phone: selectedStaff.phone || '',
            room_number: selectedStaff.room_number || ''
        })
        setIsEditing(true)
    }

    const handleUpdate = async () => {
        if (!selectedStaff?.id) return
        setIsSaving(true)
        try {
            const tk = token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/roster/assignments/${selectedStaff.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${tk}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editData)
            })
            if (res.ok) {
                const updated = await res.json()
                // Update local roster state
                setRoster(prev => ({
                    ...prev,
                    departments: prev.departments.map(d => ({
                        ...d,
                        units: d.units.map(u => ({
                            ...u,
                            assignments: u.assignments.map(a =>
                                a.id === selectedStaff.id ? { ...a, ...editData } : a
                            )
                        }))
                    }))
                }))
                setSelectedStaff(prev => ({ ...prev, ...editData }))
                setIsEditing(false)
            } else {
                alert('Failed to update assignment')
            }
        } catch (e) {
            alert('Error updating assignment')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedStaff?.id) return
        setIsDeleting(true)
        try {
            const tk = token || localStorage.getItem('token')
            const res = await fetch(`${API_URL}/roster/assignments/${selectedStaff.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${tk}` }
            })
            if (res.ok) {
                // Update local roster state
                setRoster(prev => ({
                    ...prev,
                    departments: prev.departments.map(d => ({
                        ...d,
                        units: d.units.map(u => ({
                            ...u,
                            assignments: u.assignments.filter(a => a.id !== selectedStaff.id)
                        }))
                    }))
                }))
                setSelectedStaff(null)
                setDeleteConfirm(false)
            } else {
                alert('Failed to delete assignment')
            }
        } catch (e) {
            alert('Error deleting assignment')
        } finally {
            setIsDeleting(false)
        }
    }

    const allDepts = roster?.departments?.map(d => d.department_name) ?? []
    const displayed = roster?.departments?.filter(
        d => filterDept === 'all' || d.department_name === filterDept
    ) ?? []

    const totalStaff = roster?.departments?.reduce(
        (sum, d) => sum + d.units.reduce((s2, u) => s2 + u.assignments.length, 0), 0
    ) ?? 0

    const isToday = date === toDateStr(new Date())

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-white/50 flex-shrink-0 flex-wrap">
                {/* Date Navigator */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <button onClick={() => changeDay(-1)}
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-2 py-1.5 text-sm font-semibold text-slate-700 bg-transparent outline-none"
                    />
                    <button onClick={() => changeDay(1)}
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {isToday && (
                    <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#065590] text-white rounded-full">
                        Today
                    </span>
                )}

                {/* Dept Filter */}
                {allDepts.length > 0 && (
                    <select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white font-medium text-slate-700 outline-none focus:border-[#065590] shadow-sm"
                    >
                        <option value="all">All Departments</option>
                        {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                )}

                {/* Stats */}
                {roster && (
                    <span className="ml-auto text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                        <Users2 size={14} className="text-[#065590]" />
                        {totalStaff} staff on duty
                    </span>
                )}

                <button onClick={() => fetchRoster(date)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#065590] hover:border-[#065590]/30 shadow-sm transition-colors">
                    <RefreshCcw size={15} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 animate-pulse">
                        <Calendar size={40} className="opacity-30" />
                        <p className="text-sm font-medium">Loading roster...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <Calendar size={40} className="opacity-30" />
                        <p className="text-sm font-semibold text-slate-500">{error}</p>
                        {error.includes('published') && (
                            <p className="text-xs text-slate-400 text-center max-w-xs">
                                The Admin must publish the roster for this date before it appears here.
                            </p>
                        )}
                    </div>
                )}

                {!loading && roster && displayed.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                        <Building2 size={40} className="opacity-30" />
                        <p className="text-sm font-medium">No assignments for this department.</p>
                    </div>
                )}

                {!loading && roster && displayed.map(dept => (
                    <div key={dept.department_id}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Dept header */}
                        <div className="px-5 py-3 bg-gradient-to-r from-[#065590]/5 to-transparent border-b border-slate-100 flex items-center gap-2">
                            <Building2 size={15} className="text-[#065590]" />
                            <h3 className="font-bold text-slate-800 text-sm tracking-tight">{dept.department_name}</h3>
                            <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {dept.units.reduce((s, u) => s + u.assignments.length, 0)} staff
                            </span>
                        </div>

                        {/* Assignments */}
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                            {dept.units.flatMap(unit =>
                                unit.assignments.map((a, idx) => (
                                    <div key={idx}
                                        onClick={() => setSelectedStaff(a)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#065590]/30 hover:shadow-md bg-slate-50/50 transition-all cursor-pointer group hover:-translate-y-0.5 active:scale-[0.98]">
                                        {/* Role dot */}
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${roleDot(a.role)} group-hover:scale-125 transition-transform`} />
                                        {/* Name & role */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-800 text-sm truncate flex items-center gap-2">
                                                {a.staff_name}
                                                {isCurrentlyOnDuty(date, a.shift_start_time, a.shift_end_time) && (
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" title="Currently on duty" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium truncate">{a.role}</div>
                                        </div>
                                        {/* Shift badge */}
                                        <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${shiftColor(a.shift_label)}`}>
                                            <Clock size={10} />
                                            {fmt(a.shift_start_time)}–{fmt(a.shift_end_time)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Staff Detail Modal */}
            {selectedStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedStaff(null)}
                    />

                    {/* Modal body */}
                    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        {/* Status bar for editing/deleting */}
                        {(isSaving || isDeleting) && (
                            <div className="absolute inset-0 z-[110] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                                <RefreshCcw size={32} className="text-[#065590] animate-spin" />
                            </div>
                        )}

                        {/* Header color strip */}
                        <div className={`h-24 ${shiftColor(selectedStaff.shift_label)} flex items-end justify-center pb-4 relative`}>
                            <button
                                onClick={() => {
                                    setSelectedStaff(null)
                                    setIsEditing(false)
                                    setDeleteConfirm(false)
                                }}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-slate-700"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center text-[#065590] -mb-10 relative z-10">
                                <UserIcon size={40} />
                            </div>
                        </div>

                        <div className="pt-14 pb-8 px-8 text-center">
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{selectedStaff.staff_name}</h3>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <div className={`w-2 h-2 rounded-full ${roleDot(selectedStaff.role)}`} />
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{selectedStaff.role}</span>
                            </div>

                            <div className="space-y-4 text-left">
                                {isEditing ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Shift Label</label>
                                            <input
                                                type="text"
                                                value={editData.shift_label}
                                                onChange={e => setEditData({ ...editData, shift_label: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#065590] outline-none text-sm font-bold"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={editData.shift_start_time}
                                                    onChange={e => setEditData({ ...editData, shift_start_time: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#065590] outline-none text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">End Time</label>
                                                <input
                                                    type="time"
                                                    value={editData.shift_end_time}
                                                    onChange={e => setEditData({ ...editData, shift_end_time: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#065590] outline-none text-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Phone Ext.</label>
                                                <input
                                                    type="text"
                                                    value={editData.phone}
                                                    onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#065590] outline-none text-sm font-bold"
                                                    placeholder="e.g. 1234"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Room No.</label>
                                                <input
                                                    type="text"
                                                    value={editData.room_number}
                                                    onChange={e => setEditData({ ...editData, room_number: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#065590] outline-none text-sm font-bold"
                                                    placeholder="e.g. 101"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={handleUpdate}
                                                className="flex-1 bg-[#065590] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#04437a] transition-all"
                                            >
                                                <Save size={16} /> Save Changes
                                            </button>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : deleteConfirm ? (
                                    <div className="p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-3 text-red-600">
                                            <AlertCircle size={24} />
                                            <p className="font-bold text-sm">Delete this assignment?</p>
                                        </div>
                                        <p className="text-xs text-red-500">This will remove {selectedStaff.staff_name} from the roster for this date. Action cannot be undone.</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDelete}
                                                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 transition-all"
                                            >
                                                Confirm Delete
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(false)}
                                                className="flex-1 bg-white border border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-xs hover:bg-red-50 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="p-2 bg-blue-100 text-[#065590] rounded-xl">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Duty Shift</div>
                                                <div className="text-sm font-bold text-slate-700">
                                                    {selectedStaff.shift_label} ({fmt(selectedStaff.shift_start_time)} – {fmt(selectedStaff.shift_end_time)})
                                                </div>
                                            </div>
                                        </div>

                                        {(selectedStaff.phone || selectedStaff.room_number) && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedStaff.phone && (
                                                    <a
                                                        href={`tel:${selectedStaff.phone}`}
                                                        className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-center gap-3 hover:bg-emerald-100 hover:shadow-md transition-all group"
                                                    >
                                                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
                                                            <Phone size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-wide">Phone Ext.</div>
                                                            <div className="text-sm font-bold truncate">{selectedStaff.phone}</div>
                                                        </div>
                                                    </a>
                                                )}
                                                {selectedStaff.room_number && (
                                                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 flex items-center gap-3 hover:bg-indigo-100 hover:shadow-md transition-all group">
                                                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl group-hover:scale-110 transition-transform">
                                                            <MapPin size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[9px] font-bold text-indigo-600/60 uppercase tracking-wide">Room No.</div>
                                                            <div className="text-sm font-bold truncate">Room {selectedStaff.room_number}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={`p-4 rounded-2xl border transition-all ${isCurrentlyOnDuty(date, selectedStaff.shift_start_time, selectedStaff.shift_end_time)
                                            ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100'
                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                            } flex items-center gap-4`}>
                                            <div className={`p-2 rounded-xl ${isCurrentlyOnDuty(date, selectedStaff.shift_start_time, selectedStaff.shift_end_time)
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <Info size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-60">Current Status</div>
                                                <div className="text-sm font-bold flex items-center gap-1.5">
                                                    {isCurrentlyOnDuty(date, selectedStaff.shift_start_time, selectedStaff.shift_end_time) ? (
                                                        <>
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> On Duty
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-2 h-2 rounded-full bg-slate-300" /> Off Duty / Shift Ended
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={handleEditStart}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                                                >
                                                    <Edit3 size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(true)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all hover:border-red-200 border border-transparent"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-[#065590] hover:text-white hover:border-[#065590] transition-all shadow-sm"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
