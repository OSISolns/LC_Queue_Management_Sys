import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Login - Legacy Clinics'
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleQuickLogin(username, password);
    };

    const handleQuickLogin = async (u, p) => {
        try {
            const data = await login(u, p);
            if (data.role === 'Admin') {
                navigate('/admin')
            } else if (data.role === 'Helpdesk') {
                navigate('/kiosk')
            } else if (data.role === 'Doctor' || data.role === 'Technician') {
                navigate('/dashboard')
            } else {
                navigate('/')
            }
        } catch (err) {
            setError('Invalid username or password');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 fade-in">

                {/* Header */}
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="Legacy Clinics" className="h-16 mx-auto mb-4 object-contain" />
                    <h2 className="text-2xl font-bold text-slate-800">Staff Portal</h2>
                    <p className="text-slate-500 mt-2">Sign in to manage queues & patients</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm font-medium text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#065590] focus:border-transparent transition-all outline-none text-slate-800 placeholder-slate-400"
                            placeholder="e.g. Doc1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#065590] focus:border-transparent transition-all outline-none text-slate-800 placeholder-slate-400"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="w-full bg-[#065590] hover:bg-[#04437a] text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-[#065590]/20">
                        Sign In
                    </button>
                </form>


            </div>
        </div>
    );
}
