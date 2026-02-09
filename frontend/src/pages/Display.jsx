import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = "http://" + window.location.hostname + ":8000";
const socket = io(API_URL);

export default function Display() {
    const [callingList, setCallingList] = useState([]);
    const [waitingList, setWaitingList] = useState([]);
    const [recentlyCalled, setRecentlyCalled] = useState(null); // Animation state
    const [currentTime, setCurrentTime] = useState(new Date());
    const params = new URLSearchParams(window.location.search);
    const floor = params.get('floor');
    const department = params.get('department');
    const isPediatrics = department === 'Pediatrics';

    const timeoutRef = React.useRef(null);
    const [voices, setVoices] = useState([]);

    const groundFloorDepartments = ['Neurology', 'Cardiology', 'Procedure', 'Radiology & Laboratory'];
    // Expanded list to cover generated test data (ENT, Gynecology) and others from DB
    const firstFloorDepartments = ['Radiology', 'Pathology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'General', 'ENT', 'Gynecology', 'Urology', 'Internal Medicine', 'General Practitioner', 'General Surgeon', 'Family Medicine', 'Dentistry'];

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

    useEffect(() => {
        if (department) document.title = `Display - ${department}`;
        else if (floor) document.title = `Display - ${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor`;
        else document.title = 'Queue Display - All Floors';

        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchData(); // Fetch both lists

        const handleCallPatient = (data) => {
            // Filter events: only show if relevant to this display
            if (!shouldShowPatient(data)) return;

            fetchData();
            speak(data);
            setRecentlyCalled(data);
            setTimeout(() => setRecentlyCalled(null), 10000); // 10s Animation
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
    }, [floor, department, voices]); // Add voices dependency to ensure speak function has latest voices if needed (though we access state)

    const shouldShowPatient = (data) => {
        // data contains: token, room, department, name
        if (!data || !data.department) return true; // Fallback if no dept info
        if (department) {
            return data.department.toLowerCase() === department.toLowerCase();
        } else if (floor === 'ground') {
            return groundFloorDepartments.includes(data.department);
        } else if (floor === 'first') {
            return firstFloorDepartments.includes(data.department);
        }
        return true; // All floors
    };

    const speak = (data) => {
        if (!data) return;

        // Clear existing speech and timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.speechSynthesis.cancel();

        const text = `Token number ${data.token}, please proceed to Room ${data.room}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        // Use the loaded voices state
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female'));
        if (femaleVoice) utterance.voice = femaleVoice;

        window.speechSynthesis.speak(utterance);

        // Schedule repeat
        timeoutRef.current = setTimeout(() => {
            // Create a new utterance for the repeat to avoid "cannot speak same utterance twice" errors in some browsers
            const repeatUtterance = new SpeechSynthesisUtterance(text);
            repeatUtterance.rate = 1.2;
            repeatUtterance.pitch = 1.1;
            repeatUtterance.volume = 1;
            if (femaleVoice) repeatUtterance.voice = femaleVoice;
            window.speechSynthesis.speak(repeatUtterance);
        }, 4000);
    };

    const fetchData = async () => {
        try {
            // Fetch Calling List
            const callingRes = await fetch(`${API_URL}/history?status=calling&limit=100&_t=${new Date().getTime()}`);
            const callingData = await callingRes.json();
            setCallingList(filterData(callingData));

            // Fetch Waiting List (New)
            const waitingRes = await fetch(`${API_URL}/queue?_t=${new Date().getTime()}`);
            const waitingData = await waitingRes.json();
            // Filter out VIPs (priority_id === 2) as they are "ghost" patients
            const publicWaitingList = waitingData.filter(p => p.priority_id !== 2);
            setWaitingList(filterData(publicWaitingList));

        } catch (error) { console.error('Failed to fetch data:', error); }
    };

    const filterData = (data) => {
        if (department) {
            return data.filter(p => p.target_dept && p.target_dept.toLowerCase() === department.toLowerCase());
        } else if (floor === 'ground') {
            return data.filter(p => groundFloorDepartments.includes(p.target_dept));
        } else if (floor === 'first') {
            return data.filter(p => firstFloorDepartments.includes(p.target_dept));
        }
        return data; // All floors
    };

    const getFloorTitle = () => {
        if (department) return `${department} Department`;
        if (!floor) return 'All Floors';
        if (floor === 'ground') return 'Ground Floor';
        if (floor === 'first') return 'First Floor';
        return floor.charAt(0).toUpperCase() + floor.slice(1) + ' Floor';
    };

    const servingList = callingList.filter(p => !recentlyCalled || p.token_number !== recentlyCalled.token);
    const waitingGrid = waitingList.slice(0, 18); // Show top 18 waiting

    // Theme Configuration
    const theme = isPediatrics ? {
        bg: 'bg-sky-100',
        headerBg: 'bg-yellow-400',
        headerText: 'text-blue-900',
        cardBg: 'bg-white',
        border: 'border-yellow-200',
        tokenColor: 'text-blue-600',
        roomColor: 'text-pink-500',
        waitingBg: 'bg-white/80',
        font: 'font-comic rounded-2xl'
    } : {
        bg: 'bg-slate-50',
        headerBg: 'bg-white',
        headerText: 'text-slate-800',
        cardBg: 'bg-white',
        border: 'border-slate-200',
        tokenColor: 'text-slate-800',
        roomColor: 'text-[#065590]',
        waitingBg: 'bg-white',
        font: 'font-sans'
    };

    return (
        <div className={`fixed inset-0 w-screen h-screen flex flex-col overflow-hidden ${theme.bg} ${theme.font}`}>
            {/* Header */}
            <header className={`${theme.headerBg} px-8 py-4 flex justify-between items-center shadow-md z-10 border-b-4 ${isPediatrics ? 'border-[#64af45]' : 'border-[#065590]'}`}>
                <div className="flex items-center gap-6">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 object-contain" />
                    <h1 className={`text-4xl font-black tracking-tight ${theme.headerText} uppercase`}>
                        {getFloorTitle()}
                    </h1>
                </div>
                <div className={`text-5xl font-mono font-bold ${theme.headerText}`}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </header>

            {/* Split Screen Main Content */}
            <main className="flex-1 flex flex-col gap-4 p-4 overflow-hidden relative">

                {/* 1. NOW SERVING (Top Section) */}
                <div className="flex-1 flex flex-col gap-3 p-4 bg-white/50 rounded-3xl border border-white/40 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className={`h-4 w-4 rounded-full ${isPediatrics ? 'bg-[#64af45]' : 'bg-[#065590]'} animate-pulse`} />
                        <h2 className={`text-xl font-black uppercase tracking-widest ${theme.headerText} flex items-center gap-2`}>
                            Now Serving
                        </h2>
                    </div>

                    <div className="flex-1 grid grid-cols-6 gap-3 content-start overflow-hidden">
                        {servingList.slice(0, 18).map((patient) => (
                            <div key={patient.id} className={`${theme.cardBg} flex flex-col justify-between p-3 rounded-xl shadow border ${theme.border} relative overflow-hidden group`}>
                                {/* Hourglass Animation */}
                                <div className="absolute top-1 right-1 text-sm opacity-50 animate-bounce delay-700">⏳</div>

                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Token</span>
                                <div className={`text-2xl font-black tracking-tighter ${theme.tokenColor} z-10`}>
                                    {patient.token_number}
                                </div>
                                <div className="mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Room</span>
                                    <div className={`text-xl font-bold leading-none ${theme.roomColor}`}>
                                        {patient.room_number || patient.target_room}
                                    </div>
                                </div>
                                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isPediatrics ? 'bg-[#64af45]' : 'bg-[#065590]'} opacity-20`} />
                            </div>
                        ))}
                        {/* Empty Slots */}
                        {[...Array(Math.max(0, 18 - servingList.length))].map((_, i) => (
                            <div key={`empty-serve-${i}`} className="border border-dashed border-slate-200 rounded-xl flex items-center justify-center opacity-30">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Open</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. UP NEXT (Bottom Section) */}
                <div className="flex-1 flex flex-col gap-3 p-4 bg-slate-100/50 rounded-3xl border border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <h2 className={`text-xl font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2`}>
                            <span>📋</span> Up Next
                        </h2>
                    </div>

                    <div className="flex-1 grid grid-cols-6 gap-3 content-start overflow-hidden">
                        {waitingGrid.map((patient) => (
                            <div key={patient.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                                <span className={`text-xl font-black ${theme.tokenColor} tracking-tight`}>{patient.token_number}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80px]">{patient.target_room ? `Room ${patient.target_room}` : 'Waiting'}</span>
                            </div>
                        ))}
                        {waitingGrid.length === 0 && (
                            <div className="col-span-full h-full flex items-center justify-center text-slate-400 italic font-medium">
                                No patients waiting in queue
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. JUST CALLED OVERLAY (Animated) */}
                {recentlyCalled && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-8 border-8 border-[#64af45] animate-bounce-in">
                            <h2 className="text-4xl font-bold text-[#64af45] uppercase tracking-widest animate-pulse">Calling Now</h2>

                            <div className="text-[12rem] font-black leading-none text-slate-800 tracking-tighter">
                                {recentlyCalled.token}
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Proceed to Room</span>
                                <span className="text-8xl font-bold text-[#065590]">{recentlyCalled.room}</span>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
