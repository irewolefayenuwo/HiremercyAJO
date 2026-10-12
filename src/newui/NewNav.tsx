import React, { useState } from 'react';
import {
  LayoutDashboard, PiggyBank, Wallet, Store, Smartphone, Gift, Users, Megaphone, User as UserIcon,
  MoreHorizontal, LogOut
} from 'lucide-react';
import type { SectionKey } from './config';
import { Sheet } from './ui';

interface SectionDef { key: SectionKey; label: string; short: string; icon: any; hint: string }

export const SECTIONS: SectionDef[] = [
  { key: 'home', label: 'Home', short: 'Home', icon: LayoutDashboard, hint: 'Your dashboard' },
  { key: 'ajo', label: 'Ajo', short: 'Ajo', icon: PiggyBank, hint: 'Daily savings & tracker' },
  { key: 'wallet', label: 'Wallet', short: 'Wallet', icon: Wallet, hint: 'Fund & pay from wallet' },
  { key: 'oja', label: 'Gbagede OJA', short: 'OJA', icon: Store, hint: 'Buy & sell marketplace' },
  { key: 'bills', label: 'Bills & Top-up', short: 'Bills', icon: Smartphone, hint: 'Airtime, data, TV, power' },
  { key: 'rewards', label: 'Rewards', short: 'Rewards', icon: Gift, hint: 'Challenges & points' },
  { key: 'referrals', label: 'Referrals', short: 'Refer', icon: Users, hint: 'Invite & earn' },
  { key: 'advertise', label: 'Advertise', short: 'Advertise', icon: Megaphone, hint: 'Promote your business' },
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

const PRIMARY: SectionKey[] = ['home', 'ajo', 'rewards', 'oja'];

export function NewBottomNav({
  active, onSelect, onLogout
}: { active: SectionKey; onSelect: (s: SectionKey) => void; onLogout?: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = !PRIMARY.includes(active);
  const items = [
    SECTIONS.find(s => s.key === 'home')!,
    SECTIONS.find(s => s.key === 'ajo')!,
    SECTIONS.find(s => s.key === 'rewards')!,
    SECTIONS.find(s => s.key === 'oja')!
  ];
  const btn = (s: SectionDef, center = false) => {
    const Icon = s.icon;
    const on = active === s.key;
    if (center) {
      return (
        <button key={s.key} type="button" onClick={() => onSelect(s.key)} aria-label={s.label} aria-current={on ? 'page' : undefined}
          className="flex flex-col items-center -mt-6">
          <span className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white transition ${on ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'}`}>
            <Icon className="w-6 h-6" />
          </span>
          <span className={`text-[10px] font-bold mt-0.5 ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{s.short}</span>
        </button>
      );
    }
    return (
      <button key={s.key} type="button" onClick={() => onSelect(s.key)} aria-label={s.label} aria-current={on ? 'page' : undefined}
        className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px]">
        <Icon className={`w-5 h-5 ${on ? 'text-emerald-700' : 'text-slate-400'}`} />
        <span className={`text-[10px] font-bold ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{s.short}</span>
        <span className={`h-1 w-4 rounded-full ${on ? 'bg-emerald-600' : 'bg-transparent'}`} />
      </button>
    );
  };

  const more = SECTIONS.filter(s => !PRIMARY.includes(s.key));

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-emerald-100 shadow-[0_-4px_16px_rgba(6,78,59,0.10)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end justify-around"
        aria-label="Main navigation">
        {btn(items[0])}
        {btn(items[1])}
        {btn(items[2], true)}
        {btn(items[3])}
        <button type="button" onClick={() => setMoreOpen(true)} aria-label="More"
          className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px]">
          <MoreHorizontal className={`w-5 h-5 ${moreActive ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className={`text-[10px] font-bold ${moreActive ? 'text-emerald-700' : 'text-slate-500'}`}>More</span>
          <span className={`h-1 w-4 rounded-full ${moreActive ? 'bg-emerald-600' : 'bg-transparent'}`} />
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
