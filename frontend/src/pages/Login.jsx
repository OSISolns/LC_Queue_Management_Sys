import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { document.title = 'Login - Legacy Clinics'; }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleQuickLogin(username, password);
    };

    const handleQuickLogin = async (u, p) => {
        try {
            const data = await login(u, p);
            if (data.role === 'Admin') navigate('/admin');
            else if (data.role === 'Helpdesk') navigate('/kiosk');
            else if (data.role === 'Doctor' || data.role === 'Technician') navigate('/dashboard');
            else if (data.role === 'SMS Officer') navigate('/sms');
            else navigate('/');
        } catch (err) {
            if (err.message === 'SECURE_CONNECTION_ERROR') setError('CONNECTION_ERROR');
            else setError(err.message || 'Invalid username or password');
        }
    };

    return (
        /* ── Full-screen bg: image + deep-blue tint overlay ── */
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                backgroundImage: 'url(/bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <style>{`
            @keyframes shimmer1 {
                0%   { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
                8%   { opacity: 1; }
                55%  { opacity: 1; }
                65%  { opacity: 0; }
                100% { transform: translateX(250%) skewX(-15deg); opacity: 0; }
            }
            @keyframes shimmer2 {
                0%   { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
                5%   { opacity: 0.6; }
                45%  { opacity: 0.6; }
                58%  { opacity: 0; }
                100% { transform: translateX(250%) skewX(-15deg); opacity: 0; }
            }
            @keyframes topShine {
                0%, 100% { opacity: 0.55; }
                50%       { opacity: 0.9; }
            }
            .glass-card {
                position: relative;
                overflow: hidden;
            }
            /* primary sweep */
            .glass-card::before {
                content: '';
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: 45%;
                background: linear-gradient(
                    105deg,
                    transparent 20%,
                    rgba(255,255,255,0.38) 45%,
                    rgba(255,255,255,0.12) 55%,
                    transparent 75%
                );
                animation: shimmer1 5s ease-in-out infinite;
                pointer-events: none;
                z-index: 2;
            }
            /* secondary narrower faster sweep */
            .glass-card::after {
                content: '';
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: 25%;
                background: linear-gradient(
                    105deg,
                    transparent 15%,
                    rgba(255,255,255,0.55) 50%,
                    transparent 85%
                );
                animation: shimmer2 5s ease-in-out 1.2s infinite;
                pointer-events: none;
                z-index: 3;
            }
            /* static top-edge highlight pulse */
            .glass-card .top-shine {
                position: absolute;
                top: 0; left: 10%; right: 10%;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
                animation: topShine 4s ease-in-out infinite;
                pointer-events: none;
                z-index: 4;
            }
            .fade-in { animation: fadeIn 0.6s ease both; }
            @keyframes fadeIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
            {/* Blue tint overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(4,55,122,0.82) 0%, rgba(6,85,144,0.78) 50%, rgba(3,30,80,0.88) 100%)' }} />

            {/* Card */}
            <div
                className="relative z-10 w-full max-w-sm rounded-[24px] p-8 fade-in bg-white shadow-2xl"
                style={{
                    border: '1px solid rgba(0,0,0,0.05)',
                }}
            >
                {/* Logo + title */}
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 mx-auto mb-5 object-contain" />
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Staff Portal</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Sign in to manage queues &amp; patients</p>
                </div>

                {/* Error banners */}
                {error === 'CONNECTION_ERROR' ? (
                    <div className="rounded-2xl mb-5 text-xs border border-amber-300 bg-amber-50 text-amber-800 p-4 flex flex-col gap-2">
                        <div className="font-black uppercase tracking-wider text-[10px] text-amber-600">Secure Connection Error</div>
                        <p>Your browser is blocking the secure API connection (Self-Signed Certificate).</p>
                        <p className="font-mono text-[10px] bg-white p-2 border border-amber-200 rounded-lg break-all">
                            Failed to reach: https://{window.location.hostname}:8000
                        </p>
                        <a
                            href={`https://${window.location.hostname}:8000/docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-center font-bold py-2 rounded-xl transition-all"
                        >
                            Authorize this connection
                        </a>
                    </div>
                ) : error && (
                    <div className="rounded-xl mb-5 text-sm font-medium text-center border border-red-200 bg-red-50 text-red-600 p-3">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-300 text-sm font-medium outline-none transition-all"
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                            onFocus={e => { e.target.style.border = '1px solid #cbd5e1'; e.target.style.background = '#f1f5f9'; }}
                            onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.background = '#f8fafc'; }}
                            placeholder="username"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-300 text-sm font-medium outline-none transition-all"
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                            onFocus={e => { e.target.style.border = '1px solid #cbd5e1'; e.target.style.background = '#f1f5f9'; }}
                            onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.background = '#f8fafc'; }}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-2 py-3 rounded-xl font-black text-sm tracking-wide transition-all active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #64af45 0%, #52a036 100%)',
                            boxShadow: '0 8px 24px rgba(100,175,69,0.30)',
                            color: '#fff',
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 12px 32px rgba(100,175,69,0.50)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(100,175,69,0.30)'}
                    >
                        Sign In
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-slate-400 text-[10px] font-medium mt-6 uppercase tracking-widest">
                    Legacy Clinics &mdash; Staff Access
                </p>
            </div>
        </div>
    );
}
