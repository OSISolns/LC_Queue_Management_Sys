import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, FileText, Activity, Users, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QualityDashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navbar */}
            <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <ShieldCheck className="h-8 w-8 text-emerald-600 mr-2" />
                            <span className="text-xl font-bold text-slate-800">Quality Operations Panel</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-600 hidden md:block">
                                Welcome, {user?.username} ({user?.role})
                            </span>
                            <button
                                onClick={logout}
                                className="text-slate-500 hover:text-red-500 text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Welcome Banner */}
                <div className="bg-emerald-600 rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 md:w-2/3">
                        <h1 className="text-3xl font-bold mb-2">Quality & Compliance Dashboard</h1>
                        <p className="text-emerald-100 text-lg">
                            Monitor key performance indicators, manage operational documents, and ensure clinic standards are met.
                        </p>
                    </div>
                    <ShieldCheck className="absolute -bottom-10 -right-10 text-emerald-500 opacity-30 h-64 w-64" />
                </div>

                {/* Quick Actions Grid */}
                <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">

                    <Link to="/files" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group block">
                        <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Document Hub</h3>
                        <p className="text-sm text-slate-500">Access policies, training materials, and audit reports.</p>
                    </Link>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer">
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Queue Analytics</h3>
                        <p className="text-sm text-slate-500">Monitor wait times, service times, and overall patient flow.</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer">
                        <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Users size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Staff Performance</h3>
                        <p className="text-sm text-slate-500">Review departmental metrics and completion rates.</p>
                    </div>

                </div>

                {/* Information Placeholder */}
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                    <Settings className="mx-auto h-12 w-12 text-slate-300 mb-4 animate-[spin_4s_linear_infinite]" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Metrics Engine Connecting</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        The reporting modules are currently being provisioned. Once connected,
                        you'll see live charts for patient satisfaction and quality compliance here.
                    </p>
                </div>

            </main>
        </div>
    );
}
