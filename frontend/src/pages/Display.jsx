import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Clock as ClockIcon, Volume2, ArrowRight, Activity, Calendar } from 'lucide-react';
import Clock from '../components/Clock';

const API_URL = "https://" + window.location.hostname + ":8000";
const socket = io(API_URL);

export default function Display() {
    const [callingList, setCallingList] = useState([]);
    const [waitingList, setWaitingList] = useState([]);
    const [recentlyCalled, setRecentlyCalled] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [marqueeMessages, setMarqueeMessages] = useState([
        "Welcome to Legacy Clinics • Your Health is Our Priority"
    ]);
    const params = new URLSearchParams(window.location.search);
    const floor = params.get('floor');
    const department = params.get('department');
    const isPediatrics = (department === 'Pediatrics' || floor === 'pediatrics');

    const timeoutRef = useRef(null);
    const [voices, setVoices] = useState([]);

    const groundFloorDepartments = ['Neurology', 'Cardiology', 'Procedure', 'Radiology & Laboratory', 'Triage'];
    const firstFloorDepartments = ['Radiology', 'Pathology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'General', 'ENT', 'Gynecology', 'Urology', 'Internal Medicine', 'General Practitioner', 'General Surgeon', 'Family Medicine', 'Dentistry', 'Triage'];

    useEffect(() => {
        const updateVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };
        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    function shouldShowPatient(data) {
        if (!data) return false;

        const currentFloor = floor ? floor.toLowerCase() : null;
        const currentDept = department ? department.toLowerCase() : null;

        if (!currentFloor && !currentDept) return true;
        if (!data.department) return false;

        const dataDept = data.department.toLowerCase();

        if (currentDept) {
            return dataDept === currentDept;
        } else if (currentFloor === 'ground') {
            return groundFloorDepartments.some(dept => dept.toLowerCase() === dataDept);
        } else if (currentFloor === 'first') {
            return firstFloorDepartments.some(dept => dept.toLowerCase() === dataDept);
        }
        return false;
    }

    function speak(data) {
        if (!data) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.speechSynthesis.cancel();

        const audioUrl = `${API_URL}/announce?token=${data.token}&room=${data.room}`;
        const audio = new Audio(audioUrl);

        audio.play().catch(e => {
            console.warn("Edge-TTS audio blocked by browser policy:", e);
        });
    };

    async function fetchData() {
        try {
            const callingRes = await fetch(`${API_URL}/history?status=calling&limit=100&_t=${new Date().getTime()}`);
            const callingData = await callingRes.json();
            setCallingList(filterData(callingData));

            const waitingRes = await fetch(`${API_URL}/queue?_t=${new Date().getTime()}`);
            const waitingData = await waitingRes.json();
            const publicWaitingList = waitingData.filter(p => p.priority_id !== 2);
            setWaitingList(filterData(publicWaitingList));

            // Also fetch settings to keep marquee fresh
            const settingsRes = await fetch(`${API_URL}/settings/marquee_messages`);
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                if (settingsData.value) {
                    const messagesArray = settingsData.value.split('\n').filter(msg => msg.trim() !== '');
                    if (messagesArray.length > 0) {
                        setMarqueeMessages(messagesArray);
                    }
                }
            }
        } catch (error) { console.error('Failed to fetch data:', error); }
    };

    function filterData(data) {
        const currentFloor = floor ? floor.toLowerCase() : null;
        const currentDept = department ? department.toLowerCase() : null;

        if (isPediatrics) {
            // ONLY show Pediatrics on Pediatrics display
            return data.filter(p => p.target_dept && p.target_dept.toLowerCase() === 'pediatrics');
        }

        if (currentDept) {
            return data.filter(p => p.target_dept && p.target_dept.toLowerCase() === currentDept);
        } else if (currentFloor === 'ground') {
            return data.filter(p => {
                const d = p.target_dept ? p.target_dept.toLowerCase() : '';
                return groundFloorDepartments.some(dept => dept.toLowerCase() === d) && d !== 'pediatrics';
            });
        } else if (currentFloor === 'first') {
            return data.filter(p => {
                const d = p.target_dept ? p.target_dept.toLowerCase() : '';
                return firstFloorDepartments.some(dept => dept.toLowerCase() === d) && d !== 'pediatrics';
            });
        }
        
        // General "All Floors" display: hide Pediatrics to keep it exclusive
        return data.filter(p => p.target_dept && p.target_dept.toLowerCase() !== 'pediatrics');
    }

    useEffect(() => {
        if (department) document.title = `Display - ${department}`;
        else if (floor) document.title = `Display - ${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor`;
        else document.title = 'Queue Display - All Floors';

        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchData();

        const handleCallPatient = (data) => {
            if (!shouldShowPatient(data)) return;

            fetchData();
            speak(data);
            setRecentlyCalled(data);
            setTimeout(() => setRecentlyCalled(null), 10000);
        };

        socket.on('queue_update', () => fetchData());
        socket.on('call_patient', handleCallPatient);

        return () => {
            clearInterval(timeInterval);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            window.speechSynthesis.cancel();
            socket.off('queue_update');
            socket.off('call_patient', handleCallPatient);
        };
    }, [floor, department, voices]);

    const getFloorTitle = () => {
        if (department) return `${department} Department`;
        if (!floor) return 'All Floors';
        if (floor === 'ground') return 'Ground Floor';
        if (floor === 'first') return 'First Floor';
        return floor.charAt(0).toUpperCase() + floor.slice(1) + ' Floor';
    };

    const servingList = callingList.filter(p => !recentlyCalled || p.token_number !== recentlyCalled.token);
    // Sort waiting list by ID to ensure order
    const waitingGrid = waitingList.sort((a, b) => a.id - b.id).slice(0, 10);

    // Theme Configuration
    const theme = isPediatrics ? {
        bg: 'bg-sky-100',
        headerBg: 'bg-yellow-400/90 backdrop-blur-md',
        headerText: 'text-blue-900',
        cardBg: 'bg-white/90 backdrop-blur-sm',
        border: 'border-yellow-200',
        highlight: 'text-pink-500',
        accent: 'bg-yellow-400',
        font: 'font-comic rounded-3xl'
    } : {
        bg: 'bg-slate-50',
        headerBg: 'bg-white/80 backdrop-blur-md border-b border-white/50',
        headerText: 'text-slate-800',
        cardBg: 'bg-white/60 backdrop-blur-md border border-white/50 shadow-xl',
        border: 'border-white/50',
        highlight: 'text-[#065590]',
        accent: 'bg-[#065590]',
        font: 'font-sans'
    };

    return (
        <div className={`fixed inset-0 w-screen h-screen flex flex-col overflow-hidden ${theme.bg} ${theme.font} transition-colors duration-500`}>
            {/* Background Gradient Mesh */}
            {!isPediatrics && (
                <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[100px] animate-blob"></div>
                    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-emerald-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
                </div>
            )}

            {/* Header */}
            <header className={`relative z-10 px-8 py-5 flex justify-between items-center shadow-sm ${theme.headerBg}`}>
                <div className="flex items-center gap-6">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                        <img src="/logo.png" alt="Legacy Clinics" className="h-14 object-contain" />
                    </div>
                    <h1 className={`text-4xl font-black uppercase tracking-widest ${theme.headerText}`}>
                        {getFloorTitle()}
                    </h1>
                </div>
                <div className={`flex items-center gap-4 ${theme.headerText}`}>
                    <Clock />
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-sm font-bold opacity-60 uppercase tracking-widest">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-xs opacity-40 font-mono">Legacy Clinics</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex gap-6 p-6 overflow-hidden relative z-10">
                {/* LEFT: NOW SERVING (65%) */}
                <div className="w-[65%] flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse box-shadow-glow"></div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-slate-700/80">Now Serving</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-full content-start">
                        {servingList.slice(0, 4).map((patient, idx) => (
                            <div key={patient.id} className={`${theme.cardBg} rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] border-l-8 ${isPediatrics ? 'border-pink-400' : 'border-[#065590]'}`}>
                                <div className="flex justify-between items-start z-10">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Token Number</span>
                                    {idx === 0 && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">Just Called</span>}
                                </div>

                                <div className={`text-[7rem] leading-none font-black tracking-tighter ${theme.highlight} my-4 z-10 drop-shadow-sm`}>
                                    {patient.token_number}
                                </div>

                                <div className="z-10">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Proceed To</div>
                                    <div className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                                        <ArrowRight size={28} className="text-slate-400" />
                                        {(patient.room_number || patient.target_room || '').toLowerCase().includes('station') ? '' : 'Room '}
                                        {patient.room_number || patient.target_room}
                                    </div>
                                </div>

                                {/* Decorative Background Elements */}
                                <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full opacity-10 ${theme.accent}`}></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </div>
                        ))}

                        {/* Empty Slots */}
                        {[...Array(Math.max(0, 4 - servingList.length))].map((_, i) => (
                            <div key={`empty-${i}`} className="border-4 border-dashed border-slate-200/60 rounded-3xl flex flex-col items-center justify-center opacity-40">
                                <span className="text-6xl mb-4 grayscale opacity-20">🏥</span>
                                <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Counter Open</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: UP NEXT (35%) */}
                <div className={`w-[35%] ${theme.cardBg} rounded-3xl border border-white/60 p-6 flex flex-col shadow-2xl`}>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <h2 className="text-2xl font-black uppercase tracking-widest text-slate-700/80 flex items-center gap-3">
                            <ClockIcon className="text-slate-400" /> Up Next
                        </h2>
                        <span className="bg-slate-100 text-slate-500 text-sm font-bold px-3 py-1 rounded-full">
                            {waitingList.length} Waiting
                        </span>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {/* Fade Gradients for List */}
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10"></div>

                        <div className="h-full overflow-y-auto space-y-3 pb-4 scrollbar-hide">
                            {waitingGrid.map((patient, idx) => (
                                <div key={patient.id} className="flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl shadow-sm hover:bg-white transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm shadow-inner group-hover:bg-[#065590] group-hover:text-white transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-slate-700 tracking-tight group-hover:text-[#065590] transition-colors">
                                                {patient.token_number}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                                            {patient.created_at ? new Date(patient.created_at + (patient.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {waitingGrid.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <Calendar size={64} strokeWidth={1} />
                                    <p className="text-xl font-medium">No patients waiting</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer / Marquee */}
            <footer className="bg-[#065590] text-white py-3 relative overflow-hidden z-20 shadow-lg-up flex-shrink-0">
                <div className="flex whitespace-nowrap animate-marquee">
                    {marqueeMessages.map((msg, idx) => (
                        <span key={idx} className="mx-8 font-bold text-lg flex items-center gap-2">
                            {idx === 0 && <Activity size={20} />} {msg}
                        </span>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {marqueeMessages.map((msg, idx) => (
                        <span key={`dup-${idx}`} className="mx-8 font-bold text-lg flex items-center gap-2">
                            {idx === 0 && <Activity size={20} />} {msg}
                        </span>
                    ))}
                </div>
            </footer>

            {/* Just Called Overlay */}
            {recentlyCalled && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white p-16 rounded-[3rem] shadow-2xl flex flex-col items-center gap-10 border-[12px] border-[#065590] animate-zoom-in-bounce relative max-w-4xl w-full mx-4">
                        <div className="absolute -top-10 bg-[#065590] text-white px-12 py-4 rounded-full text-3xl font-black uppercase tracking-[0.2em] shadow-lg animate-pulse">
                            Calling Now
                        </div>

                        <div className="flex flex-col items-center pt-8">
                            <span className="text-3xl font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Token</span>
                            <div className="text-[12rem] leading-none font-black text-[#065590] tracking-tighter drop-shadow-lg">
                                {recentlyCalled.token}
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100 my-2"></div>

                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-bold text-slate-400 uppercase tracking-widest mb-4">Proceed to Room</span>
                            <div className="text-[7rem] leading-none font-black text-slate-800 bg-slate-100 px-12 py-4 rounded-3xl border-4 border-slate-200">
                                {recentlyCalled.room}
                            </div>
                        </div>

                        <img src="/logo.png" alt="Legacy Clinics" className="h-16 object-contain opacity-50 absolute bottom-8 right-8" />
                    </div>
                </div>
            )}

            <style jsx>{`
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-zoom-in-bounce {
                    animation: zoomInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                @keyframes zoomInBounce {
                    0% { opacity: 0; transform: scale(0.5); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .shadow-lg-up {
                    box-shadow: 0 -10px 15px -3px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </div>
    );
}
