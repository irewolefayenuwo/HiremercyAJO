import React, { useEffect, useRef, useState } from 'react';
import {
  Wallet, PiggyBank, Smartphone, Store, Gift, Users, Megaphone, Headphones, Flame, Bell,
  ChevronRight, Target, Receipt, Lock
} from 'lucide-react';
import type { Profile, Transaction, Notification, SupportSettings } from '../App';
import { Mascot, type MascotPose } from './Mascot';
import { Card, EmptyState, Pill, ProgressBar, SectionTitle, firstName, greeting, naira, whatsappUrl } from './ui';
import type { SectionKey } from './config';
import { useLiveFlags } from './liveFlags';
import { buildWelcomeSteps } from './rewardsLogic';
import type { DashboardLite } from './useReferralDashboard';

export interface HomeProps {
  customer: Profile;
  /** Real Ajo total (running + uncollected + adjustments) from the existing calculation */
  totalSaved: number;
  /** Highest marked day in the current cycle (0 when none) */
  dayCount: number;
  paidToday: boolean;
  myTransactions: Transaction[];
  notifications: Notification[];
  supportDetails: SupportSettings;
  dash: DashboardLite | null;
  onSection: (s: SectionKey) => void;
  onTab: (tab: string) => void;
}

const CYCLE_DAYS = 32;

interface Slide {
  id: string;
  bg: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  pose: MascotPose;
  onClick: () => void;
  media?: { image?: string; video?: string };
}

function PromoCarousel({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);
  const pausedUntil = useRef(0);

  const stepOf = () => {
    const el = ref.current;
    if (!el || el.children.length < 2) return el ? el.clientWidth : 0;
    const a = el.children[0] as HTMLElement;
    const b = el.children[1] as HTMLElement;
    return b.offsetLeft - a.offsetLeft;
  };

  useEffect(() => {
    if (slides.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || document.hidden || Date.now() < pausedUntil.current) return;
      const next = (Math.round(el.scrollLeft / (stepOf() || 1)) + 1) % slides.length;
      el.scrollTo({ left: next * stepOf(), behavior: 'smooth' });
    }, 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div>
      <div ref={ref} className="hm-scroll-x gap-3 -mx-1 px-1"
        onScroll={e => {
          const el = e.currentTarget;
          setIdx(Math.min(slides.length - 1, Math.round(el.scrollLeft / (stepOf() || 1))));
        }}
        onTouchStart={() => { pausedUntil.current = Date.now() + 12000; }}
        onMouseDown={() => { pausedUntil.current = Date.now() + 12000; }}>
        {slides.map(s => (
          <button key={s.id} type="button" onClick={s.onClick}
            className={`relative overflow-hidden text-left rounded-3xl text-white shadow-md w-[88%] sm:w-[calc(50%-6px)] min-h-[150px] p-4 bg-gradient-to-br ${s.bg}`}>
            {s.media?.image && <img src={s.media.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
            <div className="relative flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="inline-block bg-amber-400 text-emerald-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">{s.kicker}</span>
                <p className="text-base font-extrabold leading-snug mt-2 line-clamp-2">{s.title}</p>
                <p className="text-xs text-white/85 font-medium mt-1 line-clamp-2">{s.text}</p>
                <span className="inline-flex items-center gap-1 mt-3 bg-white/20 border border-white/25 text-xs font-bold px-3 py-1.5 rounded-xl">
                  {s.cta} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              {!s.media?.video && <div className="shrink-0 -mb-4"><Mascot pose={s.pose} size={92} /></div>}
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5" aria-hidden="true">
        {slides.map((s, i) => (
          <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-emerald-600' : 'w-1.5 bg-emerald-200'}`} />
        ))}
      </div>
    </div>
  );
}

export function HomeScreen(p: HomeProps) {
  const { customer, totalSaved, dayCount, paidToday, myTransactions, notifications, supportDetails, dash, onSection, onTab } = p;
  const name = firstName(customer.name);
  const live = useLiveFlags();
  const hasSuccessful = myTransactions.some(t => t.status !== 'Pending');
  const steps = buildWelcomeSteps({ customer, hasSuccessfulContribution: hasSuccessful, dash });
  const doneSteps = steps.filter(s => s.status === 'done').length;
  const bonus = Number(dash?.welcome_bonus_amount || 0);

  const recent = [...myTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const latestNotes = notifications.slice(0, 3);

  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const slides: Slide[] = [];
  if (supportDetails.advert_enabled) {
    slides.push({
      id: 'advert',
      bg: 'from-emerald-900 to-emerald-700',
      kicker: 'Featured',
      title: supportDetails.advert_title || 'Save today and grow together',
      text: supportDetails.advert_description || 'Join the smart daily savings circle with HireMercyAJO.',
      cta: 'Learn more',
      pose: 'megaphone',
      onClick: () => onSection('advertise'),
      media: supportDetails.advert_image_url ? { image: supportDetails.advert_image_url } : undefined
    });
  }
  slides.push(
    {
      id: 'refer', bg: 'from-emerald-800 to-green-600', kicker: 'Refer & earn',
      title: 'Invite friends and family', text: 'Share your code and earn when they make their first contribution.',
      cta: 'Get my link', pose: 'point', onClick: () => onSection('referrals')
    },
    {
      id: 'oja', bg: 'from-amber-600 to-amber-500', kicker: 'Gbagede OJA',
      title: live.oja ? 'Shop and sell on Gbagede OJA' : 'Gbagede OJA is on the way',
      text: live.oja ? 'Browse products, promos and offers on HireMercyAJO.' : 'Our marketplace is being prepared. See what is coming.',
      cta: 'Take a look', pose: 'megaphone', onClick: () => onSection('oja')
    },
    {
      id: 'ads', bg: 'from-sky-700 to-emerald-600', kicker: 'Advertise',
      title: 'Promote your business', text: 'Reach HireMercyAJO customers with an advert package.',
      cta: 'View packages', pose: 'wave', onClick: () => onSection('advertise')
    }
  );

  const actions: { label: string; icon: any; color: string; soon?: boolean; run: () => void }[] = [
    { label: 'Fund Wallet', icon: Wallet, color: 'from-emerald-500 to-emerald-700', soon: live.loaded && !live.wallet, run: () => onSection('wallet') },
    { label: 'Pay Contribution', icon: PiggyBank, color: 'from-amber-400 to-amber-600', run: () => onTab('deposit') },
    { label: 'Buy Airtime', icon: Smartphone, color: 'from-sky-500 to-blue-700', soon: live.loaded && !live.bills, run: () => onSection('bills') },
    { label: 'Gbagede OJA', icon: Store, color: 'from-orange-400 to-orange-600', soon: live.loaded && !live.oja, run: () => onSection('oja') },
    { label: 'Rewards', icon: Gift, color: 'from-pink-400 to-rose-600', run: () => onSection('rewards') },
    { label: 'Refer & Earn', icon: Users, color: 'from-green-500 to-emerald-700', run: () => onSection('referrals') },
    { label: 'Advertise', icon: Megaphone, color: 'from-violet-500 to-purple-700', run: () => onSection('advertise') },
    {
      label: 'Support', icon: Headphones, color: 'from-teal-500 to-cyan-700',
      run: () => {
        const url = whatsappUrl(supportDetails.support_whatsapp, `Hello HireMercyAJO, I need help. My name is ${customer.name}.`);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        else if (supportDetails.support_phone) window.location.href = `tel:${supportDetails.support_phone}`;
      }
    }
  ];

  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600 text-white shadow-md">
        <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-2 pl-5 pr-3 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-100">{greeting()},</p>
            <h2 className="text-2xl font-black leading-tight truncate">{name}</h2>
            <p className="text-xs text-emerald-100 font-medium mt-1.5">
              {paidToday ? "Today's contribution is in. Well done!" : 'Ready to make today\'s contribution?'}
            </p>
          </div>
          <div className="shrink-0 -mb-2"><Mascot pose={paidToday ? 'celebrate' : 'wave'} size={118} /></div>
        </div>
      </div>

      {/* Wallet and Ajo are deliberately separate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow-md hm-shine">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Wallet Balance</p>
            {live.loaded && !live.wallet && <Pill tone="gold">Coming soon</Pill>}
          </div>
          <p className="text-3xl font-black mt-2">{!live.loaded ? '...' : live.wallet ? naira(live.balance) : 'Not active yet'}</p>
          <p className="text-[11px] text-emerald-100 font-medium mt-1">
            {live.wallet ? 'Separate from your Ajo savings. Use it for airtime, data and bills.' : 'Your wallet and its dedicated account number will appear here once it is switched on.'}
          </p>
          <button type="button" onClick={() => onSection('wallet')}
            className="mt-4 inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs px-4 py-2.5 rounded-xl transition active:scale-[0.98]">
            {live.wallet ? 'Fund Wallet' : 'About the wallet'} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-3xl bg-white border border-emerald-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><PiggyBank className="w-4 h-4" /> Ajo Savings</p>
            <Pill tone="green">Separate from wallet</Pill>
          </div>
          <p className="text-3xl font-black text-emerald-900 mt-2">{naira(totalSaved)}</p>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1">
            <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {naira(customer.daily_amount)} per day</span>
            <span>Day {Math.min(dayCount, CYCLE_DAYS)}/{CYCLE_DAYS}</span>
          </div>
          <div className="mt-2"><ProgressBar value={dayCount} max={CYCLE_DAYS} /></div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button type="button" onClick={() => onTab('deposit')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-xl transition active:scale-[0.98]">
              Contribute Now
            </button>
            <button type="button" onClick={() => onTab('tracker')}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2.5 rounded-xl transition active:scale-[0.98]">
              My Tracker
            </button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} type="button" onClick={a.run} className="flex flex-col items-center gap-1.5 group relative">
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} text-white flex items-center justify-center shadow-sm transition group-active:scale-95`}>
                  <Icon className="w-5 h-5" />
                </span>
                {a.soon && <span className="absolute -top-1.5 right-0 bg-amber-400 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded-full">SOON</span>}
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Streak + Welcome challenge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle action={<Pill tone="slate">Not tracked yet</Pill>}>Login streak</SectionTitle>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <span key={i} className="flex-1 aspect-square max-w-[34px] rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-slate-300" />
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-3 leading-relaxed">
            Daily login streaks and their rewards will start once HireMercyAJO switches them on. Nothing is counted yet.
          </p>
        </Card>

        <Card>
          <SectionTitle action={bonus > 0 ? <Pill tone="gold">{naira(bonus)}</Pill> : undefined}>
            {bonus > 0 ? 'Welcome Challenge' : 'Getting started'}
          </SectionTitle>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
            <span>{doneSteps} of {steps.length} steps done</span>
            <span className="text-emerald-700">{Math.round((doneSteps / steps.length) * 100)}%</span>
          </div>
          <ProgressBar value={doneSteps} max={steps.length} tone="gold" />
          <button type="button" onClick={() => onSection('rewards')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
            See all steps <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      </div>

      {/* Promotions */}
      <div>
        <SectionTitle>Promotions</SectionTitle>
        <PromoCarousel slides={slides} />
      </div>

      {/* Recent activity & notifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle action={<button type="button" onClick={() => onTab('transactions')} className="text-[11px] font-bold text-emerald-700 hover:underline">See all</button>}>
            Recent activity
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState pose="shrug" title="No activity yet" text="Your contributions will show up here."
              action={<button type="button" onClick={() => onTab('deposit')} className="text-xs font-bold text-white bg-emerald-700 px-4 py-2 rounded-xl">Make first contribution</button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Receipt className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">Contribution</p>
                    <p className="text-[11px] text-slate-500 font-medium">{fmtDay(t.date)} · {t.payment_method}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-800">{naira(t.amount)}</p>
                    <Pill tone={t.status === 'Pending' ? 'gold' : 'green'}>{t.status === 'Pending' ? 'Pending' : 'Successful'}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Notifications</SectionTitle>
          {latestNotes.length === 0 ? (
            <EmptyState pose="wave" title="You're all caught up" text="New alerts will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {latestNotes.map(n => (
                <li key={n.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 relative">
                    <Bell className="w-4 h-4" />
                    {!n.is_read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{n.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Wallet funds, Ajo savings, referral earnings and reward points are always kept separate.
      </p>
    </div>
  );
}
