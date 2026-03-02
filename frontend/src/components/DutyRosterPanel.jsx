import React, { useState, useEffect, useRef } from 'react';
import {
    CalendarDays, Users, Clock, Upload, Download, FileSpreadsheet,
    FileText, Shield, Calendar, Loader2, CheckCircle2, AlertTriangle, X, Eye
} from 'lucide-react';
import RosterViewer from './RosterViewer';

const API_URL = "https://" + window.location.hostname + ":8000";

export default function DutyRosterPanel({ authHeader }) {
    const [activeTab, setActiveTab] = useState('upload');
    const [departments, setDepartments] = useState([]);

    // Upload State
    const [rosterDate, setRosterDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedRoster, setUploadedRoster] = useState(null);
    const [uploadResult, setUploadResult] = useState(null); // { success, message, warnings }
    const [rosterDayId, setRosterDayId] = useState(null);   // ID used for publish
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const fileInputRef = useRef(null);

    // Data State
    const [staffList, setStaffList] = useState([]);
    const [shiftsList, setShiftsList] = useState([]);

    useEffect(() => {
        fetchSetupData();
    }, []);

    const fetchSetupData = async () => {
        try {
            const [deptRes, staffRes, shiftRes] = await Promise.all([
                fetch(`${API_URL}/departments`, { headers: authHeader }),
                fetch(`${API_URL}/roster/staff`, { headers: authHeader }),
                fetch(`${API_URL}/roster/shifts`, { headers: authHeader }),
            ]);
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (staffRes.ok) setStaffList(await staffRes.json());
            if (shiftRes.ok) setShiftsList(await shiftRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadedRoster(null);
            setUploadResult(null);
            setRosterDayId(null);
            setIsPublished(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['docx', 'xlsx', 'xls'].includes(ext)) {
                setSelectedFile(file);
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setUploadResult(null);

        try {
            // Step 1: Create or resolve roster day
            const createRes = await fetch(`${API_URL}/roster/days`, {
                method: 'POST',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: rosterDate, notes: `Uploaded from ${selectedFile.name}` })
            });

            if (!createRes.ok) {
                const err = await createRes.json();
                const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
                if (!detail.toLowerCase().includes('already exists')) {
                    setUploadResult({ success: false, message: 'Error creating roster day: ' + detail });
                    setIsUploading(false);
                    return;
                }
            }

            // Retrieve the day ID
            const daysRes = await fetch(`${API_URL}/roster/days`, { headers: authHeader });
            const days = await daysRes.json();
            const day = days.find(d => d.date === rosterDate);
            if (!day) {
                setUploadResult({ success: false, message: 'Could not resolve roster day.' });
                setIsUploading(false);
                return;
            }
            setRosterDayId(day.id); // store for publish step

            // Step 2: Upload the file
            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadRes = await fetch(`${API_URL}/roster/days/${day.id}/upload`, {
                method: 'POST',
                headers: authHeader,   // Do NOT set Content-Type, browser sets it with boundary
                body: formData
            });

            if (uploadRes.ok) {
                const data = await uploadRes.json();
                // Build grouped display map
                const rosterMap = {};
                if (data.departments) {
                    for (const dept of data.departments) {
                        rosterMap[dept.department_name] = {};
                        for (const unit of dept.units) {
                            rosterMap[dept.department_name][unit.unit_name || 'General'] =
                                unit.assignments.map(a => ({
                                    staff_name: a.staff_name,
                                    role: a.role,
                                    shift_label: a.shift_label,
                                    shift_start: a.shift_start_time ? String(a.shift_start_time).substring(0, 5) : '',
                                    shift_end: a.shift_end_time ? String(a.shift_end_time).substring(0, 5) : '',
                                }));
                        }
                    }
                }
                setUploadedRoster(rosterMap);
                const totalStaff = Object.values(rosterMap).flatMap(u => Object.values(u)).flatMap(a => a).length;
                const warnings = data._meta?.parse_warnings || [];
                setUploadResult({
                    success: true,
                    message: `Roster imported successfully — ${totalStaff} assignment(s) loaded.`,
                    warnings
                });
            } else {
                const err = await uploadRes.json();
                // Handle both string detail and structured {message, errors, hint} detail
                let message = 'Upload failed.';
                let errors = [];
                if (typeof err.detail === 'string') {
                    message = err.detail;
                } else if (err.detail && typeof err.detail === 'object') {
                    message = err.detail.message || message;
                    errors = err.detail.errors || [];
                    if (err.detail.hint) errors.push(`Hint: ${err.detail.hint}`);
                }
                setUploadResult({ success: false, message, warnings: errors });
            }
        } catch (e) {
            console.error(e);
            setUploadResult({ success: false, message: 'Network error during upload.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePublish = async () => {
        if (!rosterDayId) return;
        setIsPublishing(true);
        try {
            const res = await fetch(`${API_URL}/roster/days/${rosterDayId}/publish`, {
                method: 'POST',
                headers: authHeader,
            });
            if (res.ok) {
                setIsPublished(true);
                setUploadResult(prev => ({
                    ...prev,
                    message: prev.message + ' ✓ Published — staff can now see this roster.',
                }));
            } else {
                const err = await res.json();
                alert('Publish failed: ' + (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)));
            }
        } catch (e) {
            alert('Network error while publishing.');
        } finally {
            setIsPublishing(false);
        }
    };

    const fileExt = selectedFile ? selectedFile.name.split('.').pop().toLowerCase() : null;
    const FileIcon = fileExt === 'docx' ? FileText : FileSpreadsheet;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CalendarDays size={24} /></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Duty Roster Management</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Import staff schedules from .docx or .xlsx files.</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <Upload size={16} /> Upload Roster
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'staff' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <Users size={16} /> Staff Pool
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'shifts' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <Clock size={16} /> Shift Types
                </button>
                <button
                    onClick={() => setActiveTab('viewer')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'viewer' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <Eye size={16} /> View Roster
                </button>
            </div>

            {/* Content */}
            <div className="p-6">

                {/* ── Upload Tab ── */}
                {activeTab === 'upload' && (
                    <div className="space-y-6">

                        {/* Controls */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Roster Date</label>
                                    <input
                                        type="date"
                                        value={rosterDate}
                                        onChange={(e) => setRosterDate(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl text-slate-700 px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm font-medium"
                                    />
                                </div>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading || !selectedFile}
                                    className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
                                >
                                    {isUploading
                                        ? <><Loader2 size={18} className="animate-spin" /> Importing...</>
                                        : <><Upload size={18} /> Import Roster</>}
                                </button>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors rounded-2xl p-8 text-center cursor-pointer bg-white group"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.xlsx,.xls"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                            <FileIcon size={40} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{selectedFile.name}</p>
                                            <p className="text-sm text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB — Click to change</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadedRoster(null); setUploadResult(null); }}
                                            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <X size={12} /> Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <Upload size={40} className="opacity-40" />
                                        <div>
                                            <p className="font-bold text-base">Drop your roster file here</p>
                                            <p className="text-sm mt-1">Supports <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">.xlsx</span> · <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">.xls</span> · <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">.docx</span></p>
                                        </div>
                                        <p className="text-xs text-slate-300">or click to browse</p>
                                    </div>
                                )}
                            </div>

                            {/* Format hint */}
                            <div className="text-xs text-slate-400 bg-slate-100/70 rounded-xl px-4 py-3 border border-slate-100">
                                <span className="font-bold text-slate-500">Expected columns:</span>{' '}
                                <span className="font-mono">Department · Staff Name · Role · Shift · Start Time · End Time</span>
                            </div>
                        </div>

                        {/* Result Banner */}
                        {uploadResult && (
                            <div className={`rounded-xl border text-sm ${uploadResult.success
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                            >
                                <div className="flex items-start gap-3 px-5 py-4 font-medium">
                                    {uploadResult.success
                                        ? <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                                        : <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-500" />}
                                    {uploadResult.message}
                                </div>
                                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                                    <div className={`px-5 pb-4 pt-0 border-t ${uploadResult.success ? 'border-emerald-100' : 'border-red-100'}`}>
                                        <p className="font-bold text-xs uppercase tracking-wide opacity-60 mb-2 mt-3">
                                            {uploadResult.success ? 'Skipped rows' : 'Details'}
                                        </p>
                                        <ul className="space-y-1">
                                            {uploadResult.warnings.map((w, i) => (
                                                <li key={i} className="font-mono text-xs opacity-75">• {w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Publish CTA — appears after a successful import if not yet published */}
                        {uploadResult?.success && rosterDayId && !isPublished && (
                            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex-1">
                                    <p className="font-bold text-amber-800 text-sm">Roster saved as draft</p>
                                    <p className="text-amber-700 text-xs mt-0.5">
                                        Staff can only see this after you publish it. Click <strong>Publish</strong> to make it live.
                                    </p>
                                </div>
                                <button
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPublishing
                                        ? <><Loader2 size={16} className="animate-spin" /> Publishing...</>
                                        : <><CheckCircle2 size={16} /> Publish Roster</>}
                                </button>
                            </div>
                        )}

                        {isPublished && (
                            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 animate-in fade-in duration-300">
                                <CheckCircle2 size={20} className="text-indigo-500 shrink-0" />
                                <div>
                                    <p className="font-bold text-sm">Roster published for {rosterDate}</p>
                                    <p className="text-xs mt-0.5 text-indigo-600">All staff can now see today's duty roster in their panels.</p>
                                </div>
                            </div>
                        )}


                        {/* Roster Preview */}
                        {uploadedRoster && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="font-black text-slate-700 text-lg flex items-center gap-2">
                                    <Calendar size={20} /> Imported Roster — {rosterDate}
                                </h3>
                                {Object.keys(uploadedRoster).length === 0 ? (
                                    <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                                        No assignments were imported.
                                    </div>
                                ) : (
                                    Object.entries(uploadedRoster).map(([deptName, units]) => (
                                        <div key={deptName} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-800 text-white px-5 py-3 font-bold text-lg flex items-center gap-3">
                                                {deptName}
                                            </div>
                                            <div className="p-4 space-y-4 bg-white">
                                                {Object.entries(units).map(([unitName, assignments]) => (
                                                    <div key={unitName} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                        <h4 className="font-bold text-indigo-700 mb-3 flex items-center gap-2">
                                                            <Shield size={16} /> {unitName}
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                            {assignments.map((a, idx) => (
                                                                <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col gap-1 hover:border-indigo-300 transition-colors">
                                                                    <span className="font-bold text-slate-800 text-sm">{a.staff_name}</span>
                                                                    <div className="flex justify-between items-center text-xs">
                                                                        <span className="text-slate-500">{a.role || 'Staff'}</span>
                                                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono border border-indigo-100">
                                                                            {a.shift_start} – {a.shift_end}
                                                                        </span>
                                                                    </div>
                                                                    {a.shift_label && (
                                                                        <span className="text-xs text-slate-400 font-medium">{a.shift_label}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Empty state */}
                        {!uploadedRoster && !uploadResult && (
                            <div className="text-center p-16 pt-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                <FileSpreadsheet size={64} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No Roster Loaded</h3>
                                <p className="text-sm text-slate-400">Upload a .docx or .xlsx file above to import assignments for the selected date.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Staff Pool Tab ── */}
                {activeTab === 'staff' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Staff Pool</h3>
                                <p className="text-sm text-slate-500">Active medical staff eligible for roster assignment.</p>
                            </div>
                            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold text-sm">
                                {staffList.length} Active
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-600 text-sm">Name</th>
                                        <th className="p-4 font-bold text-slate-600 text-sm">Role</th>
                                        <th className="p-4 font-bold text-slate-600 text-sm">Phone</th>
                                        <th className="p-4 font-bold text-slate-600 text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {staffList.map(staff => (
                                        <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-800">{staff.full_name}</td>
                                            <td className="p-4 text-slate-600"><span className="bg-slate-100 px-2 py-1 flex w-fit rounded text-xs font-bold border border-slate-200">{staff.role}</span></td>
                                            <td className="p-4 text-slate-600 font-mono text-sm">{staff.phone}</td>
                                            <td className="p-4">
                                                {staff.is_active
                                                    ? <span className="text-emerald-600 bg-emerald-50 px-2 flex w-fit py-0.5 rounded text-xs font-bold border border-emerald-200">Active</span>
                                                    : <span className="text-red-600 bg-red-50 px-2 flex w-fit py-0.5 rounded text-xs font-bold border border-red-200">Inactive</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {staffList.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-400">No staff found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Shift Types Tab ── */}
                {activeTab === 'shifts' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Configured Shift Types</h3>
                                <p className="text-sm text-slate-500">Base shift configurations used for reference.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {shiftsList.map(shift => (
                                <div key={shift.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5"><Clock size={48} /></div>
                                    <h4 className="font-black text-slate-800 text-lg mb-1">{shift.name}</h4>
                                    <div className="flex items-center gap-2 text-indigo-600 font-mono bg-indigo-50 w-fit px-3 py-1.5 rounded-lg border border-indigo-100 shadow-inner mt-4">
                                        <Clock size={16} />
                                        <span className="font-bold">{shift.start_time.substring(0, 5)}</span>
                                        <span className="text-indigo-300">to</span>
                                        <span className="font-bold">{shift.end_time.substring(0, 5)}</span>
                                    </div>
                                </div>
                            ))}
                            {shiftsList.length === 0 && (
                                <div className="col-span-full p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    No shifts configured.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Viewer Tab ── */}
                {activeTab === 'viewer' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] flex flex-col">
                        <RosterViewer token={localStorage.getItem('token') || authHeader.Authorization?.split(' ')[1]} />
                    </div>
                )}
            </div>
        </div>
    );
}
