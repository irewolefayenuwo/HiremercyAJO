import React from 'react';

/**
 * "Mercy" - the friendly HireMercyAJO character, drawn as lightweight inline SVG
 * (no image downloads, no JS animation loops). Animations are CSS-only and live in
 * newui.css; they are disabled automatically for users who prefer reduced motion.
 *
 * Poses:
 *  - wave        greeting / welcome / login
 *  - celebrate   achievements, successful actions (with confetti)
 *  - point       guiding the eye to something
 *  - megaphone   promotions and announcements
 *  - shrug       empty states
 */
export type MascotPose = 'wave' | 'celebrate' | 'point' | 'megaphone' | 'shrug';

const SKIN = '#8a5a3b';
const SKIN_SHADE = '#744a2f';
const GREEN = '#16a34a';
const GREEN_DARK = '#166534';
const GOLD = '#fbbf24';

const CONFETTI: { x: number; c: string; d: string; r?: boolean }[] = [
  { x: 24, c: '#fbbf24', d: '0s' },
  { x: 48, c: '#34d399', d: '0.5s', r: true },
  { x: 76, c: '#f472b6', d: '1.1s' },
  { x: 104, c: '#fbbf24', d: '0.3s', r: true },
  { x: 132, c: '#60a5fa', d: '0.9s' },
  { x: 158, c: '#34d399', d: '1.4s', r: true },
  { x: 178, c: '#fbbf24', d: '0.7s' }
];

export function Mascot({
  pose = 'wave',
  size = 160,
  float = true,
  className = ''
}: {
  pose?: MascotPose;
  size?: number;
  float?: boolean;
  className?: string;
}) {
  const sleeve = { stroke: GREEN, strokeWidth: 16, strokeLinecap: 'round' as const, fill: 'none' };

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      className={`${float ? (pose === 'celebrate' ? 'hm-bounce' : 'hm-float') : ''} ${className}`}
      role="img"
      aria-label="HireMercyAJO mascot"
      focusable="false"
    >
      {/* confetti behind the character */}
      {pose === 'celebrate' &&
        CONFETTI.map((p, i) => (
          <rect
            key={i}
            x={p.x}
            y={6}
            width={7}
            height={p.r ? 7 : 11}
            rx={p.r ? 3.5 : 1.5}
            fill={p.c}
            className="hm-confetti"
            style={{ animationDelay: p.d }}
          />
        ))}

      {/* back / low arm (viewer's left) */}
      {pose === 'celebrate' ? (
        <g className="hm-cheer-l">
          <path d="M54 182 L32 134" {...sleeve} />
          <circle cx="30" cy="126" r="9" fill={SKIN} />
        </g>
      ) : pose === 'shrug' ? (
        <g>
          <path d="M54 184 L30 192" {...sleeve} />
          <circle cx="25" cy="193" r="9" fill={SKIN} />
        </g>
      ) : (
        <g>
          <path d="M54 184 L44 206" {...sleeve} />
          <circle cx="42" cy="210" r="9" fill={SKIN} />
        </g>
      )}

      {/* dress / body */}
      <path d="M36 222 C36 178 66 164 100 164 C134 164 164 178 164 222 Z" fill={GREEN} />
      <path d="M36 222 C36 200 44 186 56 178 C52 190 52 206 58 222 Z" fill={GREEN_DARK} opacity="0.25" />
      <path d="M76 168 Q100 190 124 168" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <circle cx="82" cy="200" r="3" fill={GOLD} opacity="0.55" />
      <circle cx="100" cy="210" r="3" fill={GOLD} opacity="0.55" />
      <circle cx="118" cy="200" r="3" fill={GOLD} opacity="0.55" />

      {/* neck */}
      <rect x="90" y="146" width="20" height="26" rx="9" fill={SKIN_SHADE} />

      {/* ears + gold earrings */}
      <circle cx="59" cy="112" r="7" fill={SKIN} />
      <circle cx="141" cy="112" r="7" fill={SKIN} />
      <circle cx="57" cy="127" r="5" fill={GOLD} />
      <circle cx="143" cy="127" r="5" fill={GOLD} />

      {/* head */}
      <ellipse cx="100" cy="108" rx="41" ry="46" fill={SKIN} />

      {/* gele (headwrap) */}
      <path
        d="M52 98 C44 56 78 34 104 36 C140 36 158 64 148 98 C132 80 70 80 52 98 Z"
        fill={GREEN_DARK}
      />
      <path d="M58 92 C62 62 84 46 104 46 C128 46 146 64 142 90 C128 76 72 76 58 92 Z" fill={GREEN} />
      <path d="M64 80 C84 64 120 62 140 78" fill="none" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" />
      <path d="M72 66 C92 55 116 54 132 64" fill="none" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" />
      <path d="M94 40 C82 12 56 18 68 42 C76 42 86 42 94 40 Z" fill={GREEN} stroke={GREEN_DARK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M106 40 C118 12 144 18 132 42 C124 42 114 42 106 40 Z" fill={GREEN} stroke={GREEN_DARK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="100" cy="40" r="8" fill={GOLD} stroke="#b45309" strokeWidth="2" />

      {/* face */}
      <g className="hm-blink">
        <ellipse cx="84" cy="108" rx="4.6" ry="5.6" fill="#2b1a12" />
        <ellipse cx="116" cy="108" rx="4.6" ry="5.6" fill="#2b1a12" />
        <circle cx="85.8" cy="106" r="1.7" fill="#fff" />
        <circle cx="117.8" cy="106" r="1.7" fill="#fff" />
      </g>
      <path d="M75 98 Q84 92 93 97" fill="none" stroke="#2b1a12" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M107 97 Q116 92 125 98" fill="none" stroke="#2b1a12" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M97 117 Q100 121 103 117" fill="none" stroke={SKIN_SHADE} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="71" cy="123" rx="7" ry="4" fill="#e11d48" opacity="0.18" />
      <ellipse cx="129" cy="123" rx="7" ry="4" fill="#e11d48" opacity="0.18" />
      <path d="M83 127 Q100 145 117 127 Q100 133 83 127 Z" fill="#ffffff" stroke="#6b2d1d" strokeWidth="2.4" strokeLinejoin="round" />

      {/* front arm (viewer's right) */}
      {pose === 'wave' && (
        <g className="hm-wave-arm">
          <path d="M146 182 L170 138" {...sleeve} />
          <circle cx="172" cy="130" r="9" fill={SKIN} />
        </g>
      )}
      {pose === 'celebrate' && (
        <g className="hm-cheer-r">
          <path d="M146 182 L168 134" {...sleeve} />
          <circle cx="170" cy="126" r="9" fill={SKIN} />
        </g>
      )}
      {pose === 'point' && (
        <g>
          <path d="M146 184 L184 172" {...sleeve} />
          <circle cx="190" cy="170" r="9" fill={SKIN} />
        </g>
      )}
      {pose === 'megaphone' && (
        <g>
          <path d="M146 184 L166 152" {...sleeve} />
          <circle cx="168" cy="146" r="9" fill={SKIN} />
          <path d="M166 140 L194 124 L194 160 L166 150 Z" fill={GOLD} stroke="#b45309" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="194" cy="142" rx="4" ry="18" fill="#fde68a" stroke="#b45309" strokeWidth="2" />
          <path d="M178 112 Q190 104 200 108" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" className="hm-sound" />
          <path d="M184 104 Q192 94 200 98" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" className="hm-sound" style={{ animationDelay: '0.3s' }} />
        </g>
      )}
      {pose === 'shrug' && (
        <g>
          <path d="M146 184 L170 192" {...sleeve} />
          <circle cx="175" cy="193" r="9" fill={SKIN} />
          <circle cx="172" cy="84" r="16" fill="#fff" stroke={GOLD} strokeWidth="3" />
          <text x="172" y="91" textAnchor="middle" fontSize="20" fontWeight="800" fill={GREEN_DARK} fontFamily="Inter, system-ui, sans-serif">?</text>
        </g>
      )}
    </svg>
  );
}

export default Mascot;
