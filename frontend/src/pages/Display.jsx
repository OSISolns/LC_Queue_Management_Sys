import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = "http://" + window.location.hostname + ":8000";
const socket = io(API_URL);

export default function Display() {
    const [callingList, setCallingList] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const params = new URLSearchParams(window.location.search);
    const floor = params.get('floor');
    const department = params.get('department');
    const isPediatrics = department === 'Pediatrics';

    const groundFloorDepartments = ['Neurology', 'Cardiology', 'Procedure', 'Radiology & Laboratory'];
    const firstFloorDepartments = ['Radiology', 'Pathology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'General'];

    useEffect(() => {
        if (department) document.title = `Display - ${department}`;
        else if (floor) document.title = `Display - ${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor`;
        else document.title = 'Queue Display - All Floors';

        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchCalling();

        const handleCallPatient = (data) => {
            fetchCalling();
            speak(data);
        };

        socket.on('queue_update', () => fetchCalling());
        socket.on('call_patient', handleCallPatient);

        return () => {
            clearInterval(timeInterval);
            socket.off('queue_update');
            socket.off('call_patient', handleCallPatient);
        };
    }, [floor, department]);

    const speak = (data) => {
        if (!data) return;
        window.speechSynthesis.cancel();
        const text = `Token number ${data.token}, please proceed to Room ${data.room}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female'));
        if (femaleVoice) utterance.voice = femaleVoice;
        window.speechSynthesis.speak(utterance);
        setTimeout(() => window.speechSynthesis.speak(utterance), 4000);
    };

    const fetchCalling = async () => {
        try {
            const res = await fetch(`${API_URL}/history?status=calling&limit=100`);
            const data = await res.json();
            let filteredData = data;

            if (department) {
                filteredData = data.filter(p => p.department && p.department.toLowerCase() === department.toLowerCase());
            } else if (floor === 'ground') {
                filteredData = data.filter(p => groundFloorDepartments.includes(p.department));
            } else if (floor === 'first') {
                filteredData = data.filter(p => firstFloorDepartments.includes(p.department));
            }
            setCallingList(filteredData);
        } catch (error) { console.error('Failed to fetch calling list:', error); }
    };

    const getFloorTitle = () => {
        if (department) return `${department} Department`;
        if (!floor) return 'All Floors';
        if (floor === 'ground') return 'Ground Floor';
        if (floor === 'first') return 'First Floor';
        return floor.charAt(0).toUpperCase() + floor.slice(1) + ' Floor';
    };

    const mainList = callingList.slice(0, 18);
    const overflowList = callingList.slice(18);

    // Theme Configuration
    const theme = isPediatrics ? {
        bg: 'bg-sky-100',
        headerBg: 'bg-yellow-400',
        headerText: 'text-blue-900',
        cardBg: 'bg-white',
        border: 'border-yellow-200',
        tokenColor: 'text-blue-600',
        roomColor: 'text-pink-500',
        font: 'font-comic rounded-2xl' // Assuming font-comic might be added or fallback to sans-rounded
    } : {
        bg: 'bg-slate-50',
        headerBg: 'bg-white',
        headerText: 'text-slate-800',
        cardBg: 'bg-white',
        border: 'border-slate-200',
        tokenColor: 'text-slate-800',
        roomColor: 'text-[#065590]',
        font: 'font-sans'
    };

    return (
        <div className={`fixed inset-0 w-screen h-screen flex flex-col overflow-hidden ${theme.bg} ${theme.font}`}>
            {/* Header */}
            <header className={`${theme.headerBg} px-8 py-4 flex justify-between items-center shadow-lg z-10 border-b-4 ${isPediatrics ? 'border-[#64af45]' : 'border-[#065590]'}`}>
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

            {/* Main Grid */}
            <main className="flex-1 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-200 border-t border-slate-300">
                {mainList.map((patient) => (
                    <div
                        key={patient.id}
                        className={`${theme.cardBg} flex items-center justify-between px-10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500`}
                    >
                        {/* Status Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-3 ${patient.token_number.startsWith('E') ? 'bg-[#64af45]' : patient.token_number.startsWith('V') ? 'bg-[#64af45]' : 'bg-[#065590]'}`} />

                        <div className={`text-[5rem] font-black tracking-tighter ${theme.tokenColor}`}>
                            {patient.token_number}
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Proceed To</span>
                            <div className={`text-[3.5rem] font-bold leading-none ${theme.roomColor}`}>
                                Room {patient.room_number}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty Cells Filler */}
                {[...Array(18 - mainList.length)].map((_, i) => (
                    <div key={`empty-${i}`} className={`${theme.cardBg} flex items-center justify-center opacity-50`}>
                        <div className="w-full h-full bg-slate-50/50" />
                    </div>
                ))}
            </main>

            {/* Scrolling Ticker */}
            {overflowList.length > 0 && (
                <div className="bg-[#065590] text-white overflow-hidden py-3 border-t-4 border-[#065590] relative z-20">
                    <div className="whitespace-nowrap inline-block animate-marquee pl-[100%]">
                        {overflowList.map((p, i) => (
                            <span key={i} className="mx-8 text-3xl font-bold font-mono inline-flex items-center gap-4">
                                <span className="text-white">{p.token_number}</span>
                                <span className="text-slate-500">➜</span>
                                <span>Room {p.room_number}</span>
                                {i < overflowList.length - 1 && <span className="text-slate-600 ml-8 text-xl">|</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
