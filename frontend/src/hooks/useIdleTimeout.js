import { useEffect, useRef, useCallback } from 'react';

/**
 * useIdleTimeout
 * Detects user inactivity and fires onIdle() after `idleMs` milliseconds.
 * Resets the timer on any mouse/keyboard/touch/scroll activity.
 *
 * @param {Function} onIdle     - Callback fired when the user has been idle for `idleMs`
 * @param {number}   idleMs     - Idle threshold in milliseconds (default: 4 minutes = 240 000)
 * @param {Function} onWarning  - Callback fired 60 s before idle timeout
 * @param {boolean}  enabled    - Whether the hook is active (set false to disable, e.g. on public pages)
 */
export function useIdleTimeout({
    onIdle,
    onWarning,
    idleMs = 4 * 60 * 1000,   // 4 min → leaves 1 min for the warning countdown
    enabled = true,
}) {
    const idleTimer = useRef(null);
    const warnTimer = useRef(null);

    const clearTimers = useCallback(() => {
        clearTimeout(idleTimer.current);
        clearTimeout(warnTimer.current);
    }, []);

    const resetTimers = useCallback(() => {
        if (!enabled) return;
        clearTimers();

        // Fire warning 60 s before logout
        warnTimer.current = setTimeout(() => {
            onWarning?.();
        }, idleMs);

        // Fire logout after full idle period (idleMs + 60 s)
        idleTimer.current = setTimeout(() => {
            onIdle();
        }, idleMs + 60_000);
    }, [enabled, idleMs, onIdle, onWarning, clearTimers]);

    useEffect(() => {
        if (!enabled) return;

        const EVENTS = [
            'mousemove', 'mousedown', 'keydown',
            'touchstart', 'touchmove', 'wheel', 'scroll', 'click',
        ];

        EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
        resetTimers(); // start on mount

        return () => {
            clearTimers();
            EVENTS.forEach(e => window.removeEventListener(e, resetTimers));
        };
    }, [enabled, resetTimers, clearTimers]);

    // Expose a manual reset (useful when the warning dialog "Stay logged in" is clicked)
    return { resetTimers };
}
