import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

const AuthContext = createContext(null);

// ─── Idle Warning Modal ───────────────────────────────────────────────────────
function IdleWarningModal({ secondsLeft, onStayLoggedIn }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', padding: '40px 36px',
                maxWidth: '400px', width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                textAlign: 'center', fontFamily: 'system-ui, sans-serif',
            }}>
                {/* Icon */}
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: '#fef3c7', margin: '0 auto 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px',
                }}>⏱️</div>

                <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '20px', fontWeight: 700 }}>
                    Still there?
                </h2>
                <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: '15px' }}>
                    You've been inactive for a while.
                </p>
                <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '15px' }}>
                    You'll be logged out in{' '}
                    <strong style={{ color: secondsLeft <= 10 ? '#dc2626' : '#d97706', fontSize: '17px' }}>
                        {secondsLeft}s
                    </strong>
                </p>

                <button
                    onClick={onStayLoggedIn}
                    style={{
                        width: '100%', padding: '13px', borderRadius: '10px',
                        background: '#065590', color: '#fff', border: 'none',
                        fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                        transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.target.style.background = '#0a6bbf'}
                    onMouseOut={e => e.target.style.background = '#065590'}
                >
                    Keep me logged in
                </button>
            </div>
        </div>
    );
}

// ─── Auth Provider ────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Idle warning state
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const logout = useCallback(async () => {
        // Tell the backend to delete the session row immediately
        const token = localStorage.getItem('token');
        if (token) {
            const HOST = window.location.hostname;
            const API_URL = `https://${HOST}:8000`;
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (_) {
                // Ignore network errors — local cleanup still happens
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setShowWarning(false);
        clearInterval(countdownRef.current);
    }, []);

    // Called when 4 min of idle detected — show warning + start 60-s countdown
    const handleIdleWarning = useCallback(() => {
        if (!user) return;           // only if logged in
        setShowWarning(true);
        setCountdown(60);

        clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [user]);

    // Called after 5 min total idle — auto-logout
    const handleIdle = useCallback(() => {
        if (!user) return;
        logout();
    }, [user, logout]);

    const { resetTimers } = useIdleTimeout({
        onWarning: handleIdleWarning,
        onIdle: handleIdle,
        idleMs: 4 * 60 * 1000,   // warning at 4 min
        enabled: !!user,           // only active when logged in
    });

    // "Stay logged in" resets everything
    const handleStayLoggedIn = useCallback(() => {
        clearInterval(countdownRef.current);
        setShowWarning(false);
        setCountdown(60);
        resetTimers();
    }, [resetTimers]);

    const login = async (username, password) => {
        const HOST = window.location.hostname;
        const API_URL = `https://${HOST}:8000`;
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Invalid username or password');
                throw new Error('Server error: ' + response.status);
            }

            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            console.error(`[AUTH] Login fetch error for ${API_URL}:`, error);
            if (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
                throw new Error('SECURE_CONNECTION_ERROR');
            }
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}

            {/* Idle warning overlay — rendered on top of everything */}
            {showWarning && user && (
                <IdleWarningModal
                    secondsLeft={countdown}
                    onStayLoggedIn={handleStayLoggedIn}
                />
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
