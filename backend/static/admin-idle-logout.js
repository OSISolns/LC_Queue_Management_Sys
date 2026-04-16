/**
 * admin-idle-logout.js
 * Valery Structure
 *
 * Shows a warning modal after 2:00 of inactivity.
 * Starts a 60-second countdown — if ignored, redirects to /admin/logout.
 * Any user activity resets the timer.
 */

(function () {
  const IDLE_TIMEOUT_MS    = 2 * 60 * 1000; // 2 min before warning
  const COUNTDOWN_SECS     = 60;             // 60 s to respond
  const LOGOUT_URL         = '/admin/logout';
  const ACTIVITY_EVENTS    = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];

  let idleTimer    = null;
  let countTimer   = null;
  let countSeconds = COUNTDOWN_SECS;
  let modalShown   = false;

  // ── Build the modal once ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'idle-logout-overlay';
  overlay.innerHTML = `
    <div id="idle-logout-box">
      <div id="idle-logout-icon">&#128274;</div>
      <h3 id="idle-logout-title">Session Expiring</h3>
      <p id="idle-logout-msg">
        You have been inactive for a while.<br>
        You will be signed out automatically in
      </p>
      <div id="idle-logout-count">${COUNTDOWN_SECS}</div>
      <p id="idle-logout-sub">seconds</p>
      <div id="idle-logout-actions">
        <button id="idle-stay-btn">&#10003;&nbsp; Stay Signed In</button>
        <button id="idle-logout-btn">Sign Out Now</button>
      </div>
      <p id="idle-logout-footer">Legacy Clinics &mdash; Admin Portal</p>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #idle-logout-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.60);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      animation: idleFadeIn 0.25s ease;
    }
    #idle-logout-overlay.visible {
      display: flex;
    }
    @keyframes idleFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    #idle-logout-box {
      background: #fff;
      border-radius: 20px;
      padding: 2.5rem 2rem 2rem;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 32px 80px rgba(0,0,0,0.30);
      position: relative;
      overflow: hidden;
    }
    #idle-logout-box::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #f0932b, #e74c3c);
      animation: idleBar linear forwards;
      animation-duration: calc(${COUNTDOWN_SECS}s);
    }
    @keyframes idleBar {
      from { width: 100%; }
      to   { width: 0%; }
    }
    #idle-logout-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    #idle-logout-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 0.5rem;
    }
    #idle-logout-msg {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 0.5rem;
      line-height: 1.6;
    }
    #idle-logout-count {
      font-size: 3.5rem;
      font-weight: 900;
      color: #e74c3c;
      line-height: 1;
      margin: 0.25rem 0;
      transition: color 0.3s;
    }
    #idle-logout-count.urgent {
      color: #c0392b;
      animation: idlePulse 0.6s ease infinite;
    }
    @keyframes idlePulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.08); }
    }
    #idle-logout-sub {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
      margin: 0 0 1.5rem;
    }
    #idle-logout-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }
    #idle-stay-btn {
      flex: 1;
      padding: 0.7rem 1rem;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.1s;
      box-shadow: 0 4px 16px rgba(46,204,113,0.35);
    }
    #idle-stay-btn:hover {
      box-shadow: 0 6px 20px rgba(46,204,113,0.55);
    }
    #idle-stay-btn:active { transform: scale(0.97); }
    #idle-logout-btn {
      flex: 1;
      padding: 0.7rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      color: #e74c3c;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    #idle-logout-btn:hover { background: #fef2f2; }
    #idle-logout-footer {
      margin: 1.25rem 0 0;
      font-size: 0.65rem;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }
  `;

  // ── Wire up actions ────────────────────────────────────────────────────────
  function doLogout() {
    clearInterval(countTimer);
    window.location.href = LOGOUT_URL;
  }

  function hideModal() {
    overlay.classList.remove('visible');
    modalShown = false;
    clearInterval(countTimer);
    countSeconds = COUNTDOWN_SECS;
  }

  function showModal() {
    if (modalShown) return;
    modalShown = true;
    countSeconds = COUNTDOWN_SECS;
    overlay.classList.add('visible');
    updateCount();

    // Restart the progress bar animation by cloning the element
    const box = document.getElementById('idle-logout-box');
    const newBox = box.cloneNode(true);
    overlay.replaceChild(newBox, box);
    // Re-wire buttons after clone
    newBox.querySelector('#idle-stay-btn').addEventListener('click', stayActive);
    newBox.querySelector('#idle-logout-btn').addEventListener('click', doLogout);

    countTimer = setInterval(() => {
      countSeconds--;
      updateCount();
      if (countSeconds <= 0) {
        clearInterval(countTimer);
        doLogout();
      }
    }, 1000);
  }

  function updateCount() {
    const el = document.getElementById('idle-logout-count');
    if (!el) return;
    el.textContent = countSeconds;
    if (countSeconds <= 15) {
      el.classList.add('urgent');
    } else {
      el.classList.remove('urgent');
    }
  }

  function resetTimer() {
    if (modalShown) return; // Don't reset while modal is up
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showModal, IDLE_TIMEOUT_MS);
  }

  function stayActive() {
    hideModal();
    resetTimer();
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(overlay);
    overlay.querySelector('#idle-stay-btn').addEventListener('click', stayActive);
    overlay.querySelector('#idle-logout-btn').addEventListener('click', doLogout);

    // Start the idle watcher
    ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer(); // Start the first timer
  });
})();
