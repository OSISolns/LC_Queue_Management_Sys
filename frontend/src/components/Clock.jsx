import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export default function Clock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm">
            <ClockIcon size={18} className="text-[#065590]/70" />
            <span className="text-slate-700 font-bold tabular-nums tracking-tight">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
}
