import React from 'react';

// Only the Betting icon animates: a soft green ring that pulses every few seconds.
// It is plain CSS (no JavaScript timers) and is switched off for people who prefer reduced motion.
const CSS = `
@keyframes hmBetPulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}55%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
.hm-bet-pulse{animation:hmBetPulse 2.8s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.hm-bet-pulse{animation:none}}
`;

export function BettingBall({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <polygon points="12,8.2 15.4,10.7 14.1,14.7 9.9,14.7 8.6,10.7" fill="currentColor" />
      <path d="M12 8.2V2.8M15.4 10.7l5.2-1.7M14.1 14.7l3.1 4.5M9.9 14.7l-3.1 4.5M8.6 10.7L3.4 9" />
    </svg>
  );
}

/** Same size and shape as the other service icons in the Bills & Top-up grid. */
export function BettingIcon({ animate = true }: { animate?: boolean }) {
  return (
    <>
      <style>{CSS}</style>
      <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 text-white flex items-center justify-center shadow-sm ${animate ? 'hm-bet-pulse' : ''}`}>
        <BettingBall />
      </span>
    </>
  );
}
