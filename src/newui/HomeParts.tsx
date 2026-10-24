import React, { useEffect } from 'react';
import { Bell, Menu, User as UserIcon } from 'lucide-react';
import { greeting } from './ui';

/** The HireMercyAJO coin-style logo mark (inline SVG, no image download). */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#fbbf24" stroke="#f59e0b" strokeWidth="3" />
      <circle cx="32" cy="32" r="25" fill="#065f46" />
      <path d="M32 14c-2 5-8 7-12 6 3 1 6 4 6 8-3-3-8-3-11 0 5-2 9 1 10 4-4-1-8 0-10 3 6-3 10 0 12 5l5-7c2-3 7-4 10-2-2-3-6-4-9-3 3-3 8-3 11-1-3-3-7-3-9-2 1-4 5-6 8-5-4-2-8-1-11 2 1-3 0-6-3-9z" fill="#fbbf24" opacity=".9" />
      <text x="32" y="46" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fbbf24" fontFamily="Inter, system-ui, sans-serif">HM</text>
    </svg>
  );
}

/** Money bag + coins + sprout used on the Ajo savings card. */
export function SavingsArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <ellipse cx="60" cy="108" rx="48" ry="7" fill="#052e16" opacity=".25" />
      <g>
        <ellipse cx="88" cy="96" rx="22" ry="7" fill="#d97706" /><rect x="66" y="84" width="44" height="12" fill="#f59e0b" /><ellipse cx="88" cy="84" rx="22" ry="7" fill="#fbbf24" />
        <ellipse cx="88" cy="76" rx="22" ry="7" fill="#d97706" /><rect x="66" y="64" width="44" height="12" fill="#f59e0b" /><ellipse cx="88" cy="64" rx="22" ry="7" fill="#fbbf24" />
        <ellipse cx="88" cy="56" rx="22" ry="7" fill="#d97706" /><rect x="66" y="46" width="44" height="10" fill="#f59e0b" /><ellipse cx="88" cy="46" rx="22" ry="7" fill="#fcd34d" />
      </g>
      <path d="M40 40c-12 8-22 22-22 40 0 16 12 26 26 26s26-10 26-26c0-18-10-32-22-40z" fill="#14532d" />
      <path d="M32 40c4-6 18-6 22 0-5 3-17 3-22 0z" fill="#166534" />
      <circle cx="44" cy="78" r="15" fill="#fbbf24" /><text x="44" y="84" textAnchor="middle" fontSize="18" fontWeight="900" fill="#14532d" fontFamily="Inter, system-ui, sans-serif">₦</text>
      <path d="M92 44c0-12 6-22 18-26-1 12-8 22-18 26z" fill="#4ade80" /><path d="M90 44c-1-10-8-16-18-16 2 10 8 16 18 16z" fill="#22c55e" /><path d="M91 46v-8" stroke="#16a34a" strokeWidth="2" />
    </svg>
  );
}

/** Palm + sunrise artwork for the wallet balance card. */
export function PalmArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <path d="M0 120V92c30-22 70-30 110-12 20 8 36 8 50 0v40z" fill="#14532d" opacity=".55" />
      <path d="M10 104c40-30 90-34 150-12" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" opacity=".9" />
      <path d="M96 100c-2-24 0-46 8-62" stroke="#166534" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g fill="#16a34a"><path d="M104 38c-14-14-30-14-42-4 14-2 28 0 42 4z" /><path d="M104 38c14-14 30-14 42-4-14-2-28 0-42 4z" /><path d="M104 38c-8-18-24-24-38-18 14 2 26 8 38 18z" /><path d="M104 38c8-18 24-24 38-18-14 2-26 8-38 18z" /><path d="M104 38c0-16 8-28 18-32-6 10-10 20-18 32z" /></g>
    </svg>
  );
}

/**
 * Green header band that carries: avatar, greeting, name, role (left) and the brand lockup, bell and menu (right).
 * On phones it replaces the app's own top bar on Home and Wallet (see useBandMode); the bell and menu talk to the
 * app shell through two small window events, so no extra database reads are needed.
 */
export function useBandMode() {
  useEffect(() => {
    document.body.classList.add('hm-home-band');
    return () => document.body.classList.remove('hm-home-band');
  }, []);
}

export function Avatar({ name, url, size = 64 }: { name?: string; url?: string | null; size?: number }) {
  const initials = (name || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const [bad, setBad] = React.useState(false);
  const px = { width: size, height: size };
  return url && !bad
    ? <img src={url} alt="" style={px} onError={() => setBad(true)} loading="lazy" className="rounded-full object-cover border-[3px] border-white shadow-md shrink-0 bg-emerald-700" />
    : <span className="rounded-full border-[3px] border-white bg-emerald-600/60 text-white flex items-center justify-center font-black shrink-0" style={{ ...px, fontSize: size * 0.32 }} aria-label={name || 'Profile'}>
        {initials || <UserIcon className="w-1/2 h-1/2" />}
      </span>;
}

export function AppBand({ name, avatarUrl, unread, variant = 'home' }: { name: string; avatarUrl?: string | null; unread: number; variant?: 'home' | 'wallet' }) {
  useBandMode();
  const bell = () => window.dispatchEvent(new Event('hm-bell'));
  const menu = () => window.dispatchEvent(new Event('hm-open-more'));
  const Brand = (
    <div className="flex items-center gap-2 min-w-0">
      <LogoMark size={variant === 'home' ? 33 : 42} />
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-black text-white truncate">HireMercy<span className="text-amber-300">AJO</span></p>
        <p className="text-[9px] font-semibold text-emerald-100 truncate">Save <span className="opacity-70">•</span> Grow <span className="opacity-70">•</span> Achieve</p>
      </div>
    </div>
  );
  const Icons = (
    <div className="flex items-center gap-2 shrink-0">
      <button type="button" onClick={bell} aria-label="Notifications" className="relative w-[34px] h-[34px] rounded-full bg-emerald-900/50 border border-white/15 text-white flex items-center justify-center active:scale-95 transition">
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-emerald-900" />}
      </button>
      <button type="button" onClick={menu} aria-label="Menu" className="w-[34px] h-[34px] rounded-full bg-emerald-900/50 border border-white/15 text-white flex items-center justify-center active:scale-95 transition">
        <Menu className="w-4 h-4" />
      </button>
    </div>
  );
  const Greet = (
    <div className="min-w-0">
      <p className={`text-[10px] font-medium ${variant === 'home' ? 'text-emerald-100' : 'text-emerald-800'}`}>{greeting()},</p>
      <h2 className={`text-[16px] leading-tight font-black truncate ${variant === 'home' ? 'text-white' : 'text-emerald-950'}`}>{name}</h2>
      <span className={`inline-flex items-center gap-1.5 mt-1 text-[9px] font-bold px-2.5 py-[3px] rounded-full ${variant === 'home' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
        <UserIcon className="w-3.5 h-3.5" /> Customer
      </span>
    </div>
  );
  if (variant === 'home') {
    return (
      <div className="-mx-[9px] sm:mx-0 sm:rounded-b-2xl bg-gradient-to-br from-[#0a6a2b] via-[#0f8a31] to-[#18a53a] text-white px-3 py-1.5 shadow-md relative overflow-hidden">
        <div className="absolute -right-12 -top-20 w-64 h-64 rounded-full bg-white/[0.07] pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 w-72 h-40 rounded-full bg-black/10 pointer-events-none" />
        <div className="relative flex items-center gap-2">
          <Avatar name={name} url={avatarUrl} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-medium text-emerald-50 leading-tight">{greeting()},</p>
            <h2 className="text-[14px] leading-tight font-black text-white truncate">{name}</h2>
            <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-bold px-2 py-[2px] rounded-full bg-emerald-400/35 text-white"><UserIcon className="w-2.5 h-2.5" /> Customer</span>
          </div>
          <LogoMark size={33} />
          <div className="leading-tight shrink-0">
            <p className="text-[11px] font-black text-white whitespace-nowrap">HireMercy<span className="text-amber-300">AJO</span></p>
            <p className="text-[6.5px] font-semibold text-emerald-50 whitespace-nowrap">Save <span className="opacity-70">•</span> Grow <span className="opacity-70">•</span> Achieve</p>
          </div>
          <button type="button" onClick={bell} aria-label="Notifications" className="relative w-[23px] h-[23px] shrink-0 rounded-full bg-emerald-500/40 text-white flex items-center justify-center active:scale-95 transition">
            <Bell className="w-3 h-3" />
            {unread > 0 && <span className="absolute -top-px -right-px w-[6px] h-[6px] rounded-full bg-red-500" />}
          </button>
          <button type="button" onClick={menu} aria-label="Menu" className="w-[23px] h-[23px] shrink-0 rounded-full bg-emerald-500/40 text-white flex items-center justify-center active:scale-95 transition">
            <Menu className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="-mx-3 sm:mx-0 sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 px-3 py-2 flex items-center justify-between gap-2 shadow-md">{Brand}{Icons}</div>
      <div className="flex items-center gap-3">
        <Avatar name={name} url={avatarUrl} size={52} />
        <div className="min-w-0 flex-1">{Greet}</div>
        <p className="hidden min-[380px]:block text-right text-[11px] italic font-semibold text-emerald-900 leading-tight max-w-[110px]" style={{ fontFamily: 'cursive' }}>Together we build a better tomorrow</p>
      </div>
    </div>
  );
}
