import React from 'react';

// All artwork here is original SVG drawn for HireMercyAJO (no licensed or downloaded images), so it is light and sharp on any screen.
// Animations are CSS only and are switched off automatically for people who prefer reduced motion.
const CSS = `
@keyframes gcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes gcSpin{to{transform:rotate(360deg)}}
@keyframes gcBubble{0%{transform:translateY(0) scale(.5);opacity:0}30%{opacity:.95}100%{transform:translateY(-22px) scale(1.15);opacity:0}}
@keyframes gcFlame{0%,100%{transform:scaleY(1) scaleX(1)}50%{transform:scaleY(1.28) scaleX(.9)}}
@keyframes gcDance{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}
@keyframes gcConfetti{0%{transform:translateY(-24px) rotate(0);opacity:1}100%{transform:translateY(340px) rotate(560deg);opacity:0}}
@keyframes gcPop{0%{transform:scale(.55);opacity:0}70%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
@keyframes gcShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes gcFlip{0%{transform:translateY(0) rotate(0)}50%{transform:translateY(-16px) rotate(180deg)}100%{transform:translateY(0) rotate(360deg)}}
@keyframes gcRoll{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
@keyframes gcGlow{0%,100%{opacity:.55}50%{opacity:1}}
.gc-a-float{animation:gcFloat 3s ease-in-out infinite}
.gc-a-spin{animation:gcSpin 9s linear infinite;transform-origin:50% 50%}
.gc-a-bubble{animation:gcBubble 1.8s ease-in infinite}
.gc-a-flame{animation:gcFlame .8s ease-in-out infinite;transform-origin:50% 100%}
.gc-a-dance{animation:gcDance .5s ease-in-out infinite;transform-origin:50% 100%}
.gc-a-pop{animation:gcPop .45s ease-out both}
.gc-a-shake{animation:gcShake .5s ease-in-out}
.gc-a-flip{animation:gcFlip 2.4s ease-in-out infinite}
.gc-a-roll{animation:gcRoll 2s ease-in-out infinite}
.gc-a-glow{animation:gcGlow 1.6s ease-in-out infinite}
.gc-trans{transition:transform .9s cubic-bezier(.2,.8,.2,1),opacity .6s ease}
@media (prefers-reduced-motion: reduce){[class*="gc-a-"]{animation:none!important}.gc-trans{transition:none!important}}
`;
export function GameStyles() { return <style>{CSS}</style>; }

export function CoinIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#F59E0B" /><circle cx="12" cy="12" r="8.6" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
      <path d="M8.6 17V7.2l6.8 9.6V7" fill="none" stroke="#B45309" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 11h9M7.5 13.4h9" stroke="#B45309" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconSound({ on, className = 'w-5 h-5' }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />{on ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></> : <path d="m16 9 5 6m0-6-5 6" />}
    </svg>
  );
}
export function IconMusic({ on, className = 'w-5 h-5' }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" fill="currentColor" /><circle cx="17.5" cy="16" r="2.5" fill="currentColor" />{!on && <path d="M3 3l18 18" />}
    </svg>
  );
}

export type ArtKind = 'brain' | 'wheel' | 'dice' | 'bottle' | 'race' | 'trophy' | 'crown';

/** Square game artwork used on cards. */
export function GameArt({ kind, animate = true, className = '' }: { kind: ArtKind; animate?: boolean; className?: string }) {
  const a = (c: string) => (animate ? c : '');
  const wheelColors = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#EC4899'];
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={kind}>
      <defs>
        <linearGradient id={`bg-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={kind === 'brain' ? '#065F46' : kind === 'wheel' ? '#7C2D12' : kind === 'dice' ? '#1E3A8A' : kind === 'bottle' ? '#064E3B' : kind === 'race' ? '#7F1D1D' : '#4C1D95'} />
          <stop offset="1" stopColor={kind === 'brain' ? '#10B981' : kind === 'wheel' ? '#F59E0B' : kind === 'dice' ? '#6366F1' : kind === 'bottle' ? '#34D399' : kind === 'race' ? '#F97316' : '#F59E0B'} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill={`url(#bg-${kind})`} />
      {kind === 'brain' && (<g className={a('gc-a-float')}>
        <path d="M50 20c-10 0-18 7-18 16 0 3 1 5 2 7-3 2-5 5-5 9 0 6 5 10 11 10h20c6 0 11-4 11-10 0-4-2-7-5-9 1-2 2-4 2-7 0-9-8-16-18-16z" fill="#FDE68A" stroke="#92400E" strokeWidth="2" />
        <path d="M50 22v42M41 34c4 2 4 7 0 9M59 34c-4 2-4 7 0 9M42 52c3 0 5 2 5 5M58 52c-3 0-5 2-5 5" stroke="#B45309" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="50" y="84" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">?</text></g>)}
      {kind === 'wheel' && (<g><g className={a('gc-a-spin')}>{wheelColors.map((c, i) => (
        <path key={i} d={`M50 50 L${50 + 34 * Math.cos((i * Math.PI) / 4)} ${50 + 34 * Math.sin((i * Math.PI) / 4)} A34 34 0 0 1 ${50 + 34 * Math.cos(((i + 1) * Math.PI) / 4)} ${50 + 34 * Math.sin(((i + 1) * Math.PI) / 4)} Z`} fill={c} stroke="#fff" strokeWidth="1.2" />))}
        <circle cx="50" cy="50" r="7" fill="#FEF3C7" stroke="#92400E" strokeWidth="2" /></g>
        <path d="M50 12l-6 10h12z" fill="#fff" stroke="#92400E" strokeWidth="1.5" strokeLinejoin="round" /></g>)}
      {kind === 'dice' && (<g className={a('gc-a-roll')} style={{ transformOrigin: '50px 55px' }}>
        <rect x="24" y="30" width="38" height="38" rx="8" fill="#fff" stroke="#312E81" strokeWidth="2.5" transform="rotate(-10 43 49)" />
        {[[34, 40], [52, 40], [43, 49], [34, 58], [52, 58]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill="#DC2626" transform="rotate(-10 43 49)" />)}
        <rect x="52" y="48" width="30" height="30" rx="7" fill="#FEF3C7" stroke="#312E81" strokeWidth="2.5" transform="rotate(14 67 63)" />
        {[[61, 57], [73, 57], [61, 69], [73, 69]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.7" fill="#1D4ED8" transform="rotate(14 67 63)" />)}</g>)}
      {kind === 'bottle' && (<g className={a('gc-a-flip')} style={{ transformOrigin: '50px 55px' }}>
        <rect x="42" y="14" width="16" height="12" rx="3" fill="#FDE68A" stroke="#92400E" strokeWidth="2" />
        <path d="M43 26h14l5 14v40c0 4-3 7-7 7H45c-4 0-7-3-7-7V40z" fill="#6EE7B7" fillOpacity=".85" stroke="#065F46" strokeWidth="2.5" />
        <path d="M42 56h16v22c0 2-2 3-4 3h-8c-2 0-4-1-4-3z" fill="#10B981" /><path d="M44 36v18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".7" /></g>)}
      {kind === 'race' && (<g className={a('gc-a-float')}>
        <path d="M14 62l8-14c2-3 5-5 9-5h26c4 0 7 2 9 5l8 14c3 1 5 3 5 7v5H9v-5c0-4 2-6 5-7z" fill="#EF4444" stroke="#7F1D1D" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M31 48h14v13H26zM50 48h9c2 0 3 1 4 3l4 10H50z" fill="#BAE6FD" stroke="#7F1D1D" strokeWidth="1.5" />
        <circle cx="29" cy="76" r="8" fill="#1F2937" stroke="#fff" strokeWidth="2" /><circle cx="71" cy="76" r="8" fill="#1F2937" stroke="#fff" strokeWidth="2" />
        <text x="50" y="28" textAnchor="middle" fontSize="12" fontWeight="900" fill="#FEF3C7">x2.5</text></g>)}
      {kind === 'trophy' && (<g className={a('gc-a-float')}>
        <path d="M34 20h32v22c0 10-7 17-16 17s-16-7-16-17z" fill="#FCD34D" stroke="#92400E" strokeWidth="2.5" />
        <path d="M34 26H22c0 12 5 18 13 19M66 26h12c0 12-5 18-13 19" fill="none" stroke="#92400E" strokeWidth="2.5" />
        <rect x="45" y="59" width="10" height="10" fill="#F59E0B" /><rect x="35" y="69" width="30" height="9" rx="3" fill="#B45309" /></g>)}
      {kind === 'crown' && (<g className={a('gc-a-float')}>
        <path d="M18 70 12 34l22 18 16-26 16 26 22-18-6 36z" fill="#FCD34D" stroke="#92400E" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="18" y="70" width="64" height="9" rx="3" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
        {[[34, 60], [50, 60], [66, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill={['#EF4444', '#3B82F6', '#10B981'][i]} />)}</g>)}
    </svg>
  );
}

/** The Brain Challenge scene: a character on a rope above the hot-oil cauldron. level = correct answers so far. */
export type ClimberMode = 'idle' | 'up' | 'fall' | 'dance';
export function CauldronScene({ level, total, mode }: { level: number; total: number; mode: ClimberMode }) {
  // head sits ~65 units above y, so keep the climb inside the picture; a fall ends well below the pot rim so he vanishes into the oil
  const top = 82, bottom = 172;
  const y = mode === 'fall' ? 292 : mode === 'dance' ? top - 8 : bottom - (Math.min(level, total) / Math.max(total, 1)) * (bottom - top);
  const bubbles = [[104, 238, 0], [130, 244, 0.5], [160, 240, 1.1], [188, 246, 0.3], [145, 236, 0.9]];
  return (
    <svg viewBox="0 0 300 270" className="w-full h-auto" role="img" aria-label="Character climbing a rope above a cauldron">
      <defs>
        <linearGradient id="cave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B1B3A" /><stop offset="1" stopColor="#3B1D4E" /></linearGradient>
        <radialGradient id="oil" cx=".5" cy=".4"><stop offset="0" stopColor="#B6F23A" /><stop offset="1" stopColor="#3F9E1C" /></radialGradient>
      </defs>
      <rect width="300" height="270" fill="url(#cave)" />
      <path d="M0 40 40 10 80 38 120 6 160 36 210 4 260 34 300 12V0H0z" fill="#101A33" opacity=".9" />
      <path d="M0 270V200l30-24 26 30 30-34 24 36V270z M220 270v-60l26-34 30 30 24-22v86z" fill="#1A1F3D" />
      <line x1="150" y1="0" x2="150" y2="212" stroke="#D6A15C" strokeWidth="5" strokeDasharray="7 3" />
      {/* flames */}
      {[72, 94, 206, 228].map((x, i) => (
        <path key={i} className="gc-a-flame" style={{ animationDelay: `${i * 0.15}s` }} d={`M${x} 262c-9-9-9-20 0-30 1 7 7 9 6 17 4-3 6-8 5-12 8 8 9 17-1 25z`} fill={i % 2 ? '#FBBF24' : '#F97316'} />))}
      {/* character: moves with a smooth transition */}
      <g className="gc-trans" style={{ transform: `translate(150px, ${y}px)`, opacity: mode === 'fall' ? 0 : 1 }}>
        <g className={mode === 'dance' ? 'gc-a-dance' : mode === 'idle' ? 'gc-a-float' : ''}>
          <path d="M-14 -34 -8 -58M14 -34 8 -58" stroke="#8D5524" strokeWidth="6" strokeLinecap="round" />
          <circle cx="-8" cy="-60" r="4.5" fill="#8D5524" /><circle cx="8" cy="-60" r="4.5" fill="#8D5524" />
          <rect x="-16" y="-38" width="32" height="34" rx="10" fill="#F97316" />
          <path d="M-9 -4 -11 16M9 -4 11 16" stroke="#1E3A8A" strokeWidth="8" strokeLinecap="round" />
          <circle cx="0" cy="-50" r="15" fill="#8D5524" /><path d="M-15 -53c2-12 12-17 20-14 7 2 10 8 10 14-6-5-14-6-30 0z" fill="#1C1917" />
          <circle cx="-5.5" cy="-50" r="4" fill="#fff" /><circle cx="5.5" cy="-50" r="4" fill="#fff" />
          <circle cx={mode === 'fall' ? -5.5 : -5} cy="-49.5" r="2" fill="#111" /><circle cx={mode === 'fall' ? 5.5 : 6} cy="-49.5" r="2" fill="#111" />
          {mode === 'fall' ? <ellipse cx="0" cy="-42" rx="3.5" ry="4.5" fill="#7F1D1D" /> : <path d="M-5 -43q5 5 10 0" stroke="#7F1D1D" strokeWidth="2" fill="none" strokeLinecap="round" />}
        </g>
      </g>
      {/* cauldron */}
      <path d="M86 214h128c4 0 7 3 7 7 0 22-14 40-36 40h-70c-22 0-36-18-36-40 0-4 3-7 7-7z" fill="#1F2937" stroke="#0F172A" strokeWidth="3" />
      <ellipse cx="150" cy="217" rx="64" ry="11" fill="url(#oil)" stroke="#0F172A" strokeWidth="2" />
      {bubbles.map(([x, , d], i) => (<circle key={i} className="gc-a-bubble" style={{ animationDelay: `${d}s` }} cx={x - 12 + i * 6} cy="214" r={4 + (i % 3)} fill="#D9F99D" />))}
    </svg>
  );
}

const CONFETTI = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#A855F7', '#FDE68A'];
export function Confetti({ count = 26 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="gc-a-confetti-item absolute block rounded-[2px]" style={{
          left: `${(i * 37) % 100}%`, top: 0, width: 7 + (i % 4), height: 11 + (i % 5), background: CONFETTI[i % CONFETTI.length],
          animation: `gcConfetti ${2.4 + (i % 5) * 0.35}s linear ${(i % 7) * 0.18}s infinite`
        }} />))}
      <style>{`@media (prefers-reduced-motion: reduce){.gc-a-confetti-item{animation:none!important;opacity:.0}}`}</style>
    </div>
  );
}
