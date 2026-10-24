import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, PiggyBank, Wallet, Store, Smartphone, Gift, Users, Megaphone, User as UserIcon,
  MoreHorizontal, LogOut, Gamepad2
} from 'lucide-react';
import type { SectionKey } from './config';
import { Sheet } from './ui';

interface SectionDef { key: SectionKey; label: string; short: string; icon: any; hint: string }

export const SECTIONS: SectionDef[] = [
  { key: 'home', label: 'Home', short: 'Home', icon: LayoutDashboard, hint: 'Your dashboard' },
  { key: 'ajo', label: 'AJO', short: 'AJO', icon: PiggyBank, hint: 'Daily savings & tracker' },
  { key: 'wallet', label: 'Wallet', short: 'Wallet', icon: Wallet, hint: 'Fund & pay from wallet' },
  { key: 'oja', label: 'Gbagede OJA', short: 'OJA', icon: Store, hint: 'Buy & sell marketplace' },
  { key: 'bills', label: 'Bills & Top-up', short: 'Bills', icon: Smartphone, hint: 'Airtime, data, TV, power' },
  { key: 'rewards', label: 'Rewards', short: 'Rewards', icon: Gift, hint: 'Challenges & points' },
  { key: 'referrals', label: 'Referrals', short: 'Refer', icon: Users, hint: 'Invite & earn' },
  { key: 'advertise', label: 'Advertise', short: 'Advertise', icon: Megaphone, hint: 'Promote your business' },
  { key: 'games', label: 'Play & Earn', short: 'Play & Earn', icon: Gamepad2, hint: 'Play games & earn rewards' },
  { key: 'profile', label: 'Profile', short: 'Profile', icon: UserIcon, hint: 'Account & settings' }
];

const AJO_TABS = ['tracker', 'history', 'transactions', 'deposit', 'monthly-savings'];

/** Which top-level section a customerTab belongs to. */
export function sectionForTab(tab: string): SectionKey {
  if (AJO_TABS.includes(tab)) return 'ajo';
  if (tab === 'referral') return 'referrals';
  if (tab === 'settings') return 'profile';
  return (SECTIONS.find(s => s.key === tab)?.key || 'home') as SectionKey;
}

/** Which customerTab a section opens. */
export function tabForSection(s: SectionKey): string {
  if (s === 'ajo') return 'tracker';
  if (s === 'referrals') return 'referral';
  return s;
}

const PRIMARY: SectionKey[] = ['home', 'ajo', 'wallet', 'games', 'oja'];

export function NewBottomNav({
  active, onSelect, onLogout
}: { active: SectionKey; onSelect: (s: SectionKey) => void; onLogout?: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = !PRIMARY.includes(active);
  const items = PRIMARY.map(k => SECTIONS.find(s => s.key === k)!);
  useEffect(() => {
    const open = () => setMoreOpen(true);
    window.addEventListener('hm-open-more', open);
    return () => window.removeEventListener('hm-open-more', open);
  }, []);
  const btn = (s: SectionDef) => {
    const Icon = s.icon;
    const on = active === s.key;
    return (
      <button key={s.key} type="button" onClick={() => onSelect(s.key)} aria-label={s.label} aria-current={on ? 'page' : undefined}
        className="flex flex-col items-center gap-[2px] px-1.5 pt-1.5 pb-1 min-w-[54px] rounded-2xl transition active:bg-emerald-50">
        <Icon className={`w-[22px] h-[22px] ${on ? 'text-emerald-700' : 'text-slate-500'}`} />
        <span className={`text-[10px] font-bold whitespace-nowrap ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{s.short}</span>
        <span className={`h-[2px] w-7 rounded-full ${on ? 'bg-emerald-700' : 'bg-transparent'}`} />
      </button>
    );
  };

  const more = SECTIONS.filter(s => !PRIMARY.includes(s.key));

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-emerald-100 shadow-[0_-4px_16px_rgba(6,78,59,0.10)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end justify-around"
        aria-label="Main navigation">
        {items.map(i => btn(i))}
        <button type="button" onClick={() => setMoreOpen(true)} aria-label="More"
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 min-w-[54px] rounded-2xl ${moreActive ? 'bg-emerald-100' : ''}`}>
          <MoreHorizontal className={`w-6 h-6 ${moreActive ? 'text-emerald-700' : 'text-slate-500'}`} />
          <span className={`text-[11px] font-bold ${moreActive ? 'text-emerald-800' : 'text-slate-500'}`}>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid grid-cols-2 gap-3">
          {more.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} type="button"
                onClick={() => { setMoreOpen(false); onSelect(s.key); }}
                className={`text-left rounded-2xl border p-3.5 transition active:scale-[0.98] ${active === s.key ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-100 bg-white hover:bg-emerald-50'}`}>
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <p className="text-sm font-extrabold text-emerald-950 mt-2">{s.label}</p>
                <p className="text-[11px] text-slate-500 font-medium">{s.hint}</p>
              </button>
            );
          })}
        </div>
        {onLogout && (
          <button type="button" onClick={() => { setMoreOpen(false); onLogout(); }}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-600 font-bold py-3 text-sm hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        )}
      </Sheet>
    </>
  );
}

/** Larger screens: every section is one click away in a scrollable pill bar. */
export function NewDesktopNav({ active, onSelect }: { active: SectionKey; onSelect: (s: SectionKey) => void }) {
  return (
    <nav className="hidden sm:flex gap-2 overflow-x-auto pb-1" aria-label="Sections">
      {SECTIONS.map(s => {
        const Icon = s.icon;
        const on = active === s.key;
        return (
          <button key={s.key} type="button" onClick={() => onSelect(s.key)} aria-current={on ? 'page' : undefined}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${on ? 'bg-emerald-700 text-white shadow-md' : 'bg-white border border-emerald-100 text-emerald-800 hover:bg-emerald-50'}`}>
            <Icon className="w-4 h-4" /> {s.label}
          </button>
        );
      })}
    </nav>
  );
}
