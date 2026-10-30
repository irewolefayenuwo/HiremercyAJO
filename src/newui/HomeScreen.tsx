import React, { useEffect, useRef, useState } from 'react';
import {
  Wallet, PiggyBank, Smartphone, Store, Gift, Users, Megaphone, Headphones, Bell,
  ChevronRight, ArrowRight, Receipt, Lock, Gamepad2, Eye, EyeOff, CalendarDays, Coins, Sprout, Zap, Tv, Phone, Star, Globe } from 'lucide-react';
import type { Profile, Transaction, Notification, SupportSettings } from '../App';
import { Mascot, type MascotPose } from './Mascot';
import { Card, EmptyState, Pill, ProgressBar, SectionTitle, naira, whatsappUrl } from './ui';
import { AppBand, SavingsArt, LogoMark } from './HomeParts';
import { useHideBalance, MASK } from './useHideBalance';
import type { SectionKey } from './config';
import { useLiveFlags } from './liveFlags';
import { useStreak } from './useStreak';
import { supabase } from '../lib/supabase';
import { BonusClaimModal, runPromoAction } from './Popups';
import { StreakStrip } from './StreakStrip';
import { buildWelcomeSteps } from './rewardsLogic';
import type { DashboardLite } from './useReferralDashboard';
import { BettingBall, BettingPulseStyle } from './BettingIcon';
import { loadBettingPublic } from './bettingApi';

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
  img?: string; imgBg?: string; label?: string;
}

// Admin-configured banner slides: fetched once per 10 minutes and cached (no polling).
let bannerCache: { at: number; rows: any[] } | null = null;
function useAdminBanners() {
  const [rows, setRows] = useState<any[]>(bannerCache?.rows || []);
  useEffect(() => {
    if (bannerCache && Date.now() - bannerCache.at < 600000) return;
    let dead = false;
    Promise.resolve(supabase.rpc('get_active_banners')).then(({ data, error }) => {
      if (dead || error) return;
      bannerCache = { at: Date.now(), rows: (data || []) as any[] };
      setRows(bannerCache.rows);
    }).catch(() => undefined);
    return () => { dead = true; };
  }, []);
  return rows;
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
      <div ref={ref} className="hm-scroll-x gap-2 snap-x snap-mandatory overscroll-x-contain"
        onScroll={e => {
          const el = e.currentTarget;
          setIdx(Math.min(slides.length - 1, Math.round(el.scrollLeft / (stepOf() || 1))));
        }}
        onTouchStart={() => { pausedUntil.current = Date.now() + 12000; }}
        onMouseDown={() => { pausedUntil.current = Date.now() + 12000; }}>
        {slides.map(s => s.img ? (
          <button key={s.id} type="button" onClick={s.onClick} aria-label={s.label || 'Promotion'}
            className="relative overflow-hidden rounded-[10px] shadow-md w-full shrink-0 snap-start h-[52px] flex items-center justify-center" style={{ background: s.imgBg || '#ffffff' }}>
            <img src={s.img} alt={s.label || ''} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain" />
          </button>
        ) : s.id === 'brand' ? (
          <button key={s.id} type="button" onClick={s.onClick}
            className="relative overflow-hidden text-left rounded-[10px] text-white shadow-md w-full shrink-0 snap-start h-[52px] bg-gradient-to-r from-[#0a5f26] via-[#0e7a2c] to-[#0a6a28]">
            <div className="absolute left-0 top-0 h-full w-[58px] bg-[radial-gradient(circle_at_30%_70%,rgba(163,230,53,0.45),transparent_70%)]" />
            <div className="absolute left-1 bottom-0"><Mascot pose="point" size={46} /></div>
            <div className="absolute left-[60px] top-[8px]">
              <p className="text-[11.5px] leading-[1.15] font-black">Together We Save,<br />Together We <span className="text-lime-400">Grow!</span></p>
              <p className="text-[7px] font-medium text-emerald-50 mt-0.5 whitespace-nowrap">Your AJO today, a better tomorrow.</p>
            </div>
            <SavingsArt className="absolute left-[188px] top-[6px] w-[40px] h-[40px]" />
            <span className="absolute left-[238px] top-[9px]"><LogoMark size={32} /></span>
            <span className="absolute left-[276px] top-[6px] text-[9.5px] leading-[1.1] italic font-semibold" style={{ fontFamily: 'cursive' }}>More<br />Than Just<br />Savings</span>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
          </button>
        ) : (
          <button key={s.id} type="button" onClick={s.onClick}
            className={`relative overflow-hidden text-left rounded-[10px] text-white shadow-md w-full shrink-0 snap-start h-[52px] px-3 bg-gradient-to-r ${s.bg}`}>
            {s.media?.image && <img src={s.media.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
            <div className="relative h-full flex items-center gap-2 pr-6">
              <div className="min-w-0 flex-1">
                <span className="inline-block bg-amber-400 text-emerald-950 text-[7px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded-full">{s.kicker}</span>
                <p className="text-[10.5px] font-extrabold leading-tight mt-0.5 truncate">{s.title}</p>
                <p className="text-[7.5px] text-white/85 font-medium leading-tight truncate">{s.text}</p>
              </div>
            </div>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-1 -mt-3 relative z-10 pointer-events-none" aria-hidden="true">
        {slides.map((s, i) => (
          <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-1.5 bg-white' : 'w-1.5 bg-white/45'}`} />
        ))}
      </div>
    </div>
  );
}

export function HomeScreen(p: HomeProps) {
  const { customer, totalSaved, dayCount, myTransactions, notifications, supportDetails, dash, onSection, onTab } = p;
  const { hidden, toggle } = useHideBalance();
  const done = Math.max(0, Math.min(dayCount, CYCLE_DAYS));
  const afterDay32 = Number(customer.daily_amount || 0) * CYCLE_DAYS;
  const unread = (notifications || []).filter(n => !n.is_read).length;
  const openBills = (svc: string) => { try { if (svc) sessionStorage.setItem('hm_bills_service', svc); else sessionStorage.removeItem('hm_bills_service'); } catch { /* ignore */ } onSection('bills'); };
  const { streak, loaded: streakLoaded } = useStreak(customer.id);
  const live = useLiveFlags();
  // Betting shows on Home only when it is switched on for this person (customers: LIVE; admins: TEST or LIVE).
  const [betOn, setBetOn] = useState(false);
  useEffect(() => { let alive = true; loadBettingPublic().then(v => { if (alive) setBetOn(!!v?.enabled); }); return () => { alive = false; }; }, []);
  const hasSuccessful = myTransactions.some(t => t.status !== 'Pending');
  const steps = buildWelcomeSteps({ customer, hasSuccessfulContribution: hasSuccessful, dash, bestStreak: streak?.longest || 0 });
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

  const adminBanners = useAdminBanners();
  const [bonusId, setBonusId] = useState<string | null>(null);
  const slides: Slide[] = [{
    id: 'brand', bg: 'from-emerald-900 to-emerald-700', kicker: 'HireMercyAJO',
    title: 'Together We Save, Together We Grow!', text: 'Your AJO today, a better tomorrow.',
    cta: 'View my savings', pose: 'point', onClick: () => onTab('tracker')
  }];
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
      media: (supportDetails.advert_video_url || supportDetails.advert_image_url) ? { image: supportDetails.advert_image_url || undefined, video: supportDetails.advert_video_url || undefined } : undefined
    });
  }
  adminBanners.slice().reverse().forEach(b => {
    if (!b.image_url) return;
    slides.unshift({
      id: `ab-${b.id}`, bg: '', kicker: '', title: b.title || '', text: '', cta: '', pose: 'point', img: b.image_url, imgBg: b.bg_color, label: b.title || 'Promotion',
      onClick: () => runPromoAction(b, onSection, setBonusId)
    });
  });
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

  const actions: { label: string; icon: any; color: string; soon?: boolean; pulse?: boolean; run: () => void }[] = [
    { label: 'Fund Wallet', icon: Wallet, color: 'from-emerald-500 to-emerald-700', soon: live.loaded && !live.wallet, run: () => onSection('wallet') },
    { label: 'Pay Contribution', icon: PiggyBank, color: 'from-amber-400 to-amber-600', run: () => onTab('deposit') },
    { label: 'Buy Airtime', icon: Smartphone, color: 'from-sky-500 to-blue-700', soon: live.loaded && !live.bills, run: () => onSection('bills') },
    { label: 'Gbagede OJA', icon: Store, color: 'from-orange-400 to-orange-600', soon: live.loaded && !live.oja, run: () => onSection('oja') },
    { label: 'Rewards', icon: Gift, color: 'from-pink-400 to-rose-600', run: () => onSection('rewards') },
    { label: 'Refer & Earn', icon: Users, color: 'from-green-500 to-emerald-700', run: () => onSection('referrals') },
    { label: 'Advertise', icon: Megaphone, color: 'from-violet-500 to-purple-700', run: () => onSection('advertise') },
    { label: 'Games', icon: Gamepad2, color: 'from-fuchsia-500 to-indigo-700', run: () => onSection('games') },
    {
      label: 'Support', icon: Headphones, color: 'from-teal-500 to-cyan-700',
      run: () => {
        const url = whatsappUrl(supportDetails.support_whatsapp, `Hello HireMercyAJO, I need help. My name is ${customer.name}.`);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        else if (supportDetails.support_phone) window.location.href = `tel:${supportDetails.support_phone}`;
      }
    },
    ...(betOn ? [{ label: 'Betting', icon: BettingBall, color: 'from-green-600 to-emerald-800', pulse: true, soon: live.loaded && !live.bills, run: () => { try { sessionStorage.setItem('hm_bills_service', 'betting'); } catch { /* ignore */ } onSection('bills'); } }] : [])
  ];

  return (
    <div className="space-y-3 fade-in max-w-3xl mx-auto max-sm:-mx-[3px]">
      <AppBand name={customer.name} avatarUrl={(customer as any).avatar_url} unread={unread} variant="home" />

      {/* MY AJO SAVINGS */}
      <div className="relative overflow-hidden rounded-[18px] text-white shadow-md h-[118px] bg-gradient-to-br from-[#0b7a2d] via-[#128f2f] to-[#0a6a28]">
        <div className="absolute right-0 top-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_85%_10%,rgba(163,230,53,0.40),transparent_62%)] pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_10%_100%,rgba(0,0,0,0.20),transparent_70%)] pointer-events-none" />
        <div className="relative h-full pl-2 pr-[148px] pt-[7px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center shrink-0 shadow"><Sprout className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[13px] leading-tight font-black whitespace-nowrap">My AJO Savings</p>
              <p className="text-[8px] text-emerald-50 font-medium leading-tight mt-0.5 truncate">Save together, get your payout.</p>
            </div>
          </div>
          <div className="absolute left-2 bottom-[10px] flex items-center">
            <CalendarDays className="w-[16px] h-[16px] shrink-0 mr-1" />
            <div className="min-w-0"><p className="text-[7.5px] text-emerald-50 font-medium leading-tight whitespace-nowrap">Daily Contribution</p><p className="text-[12px] font-black leading-tight tabular-nums whitespace-nowrap">{hidden ? MASK : naira(customer.daily_amount)}</p></div>
            <span className="w-px h-[24px] bg-white/30 mx-2" />
            <Coins className="w-[16px] h-[16px] shrink-0 mr-1" />
            <div className="min-w-0"><p className="text-[7.5px] text-emerald-50 font-medium leading-tight whitespace-nowrap">Total Saved</p><p className="text-[12px] font-black leading-tight tabular-nums whitespace-nowrap">{hidden ? MASK : naira(totalSaved)}</p></div>
          </div>
        </div>
        <SavingsArt className="absolute right-[146px] bottom-[-2px] w-[80px] h-[80px] pointer-events-none" />
        <button type="button" onClick={() => onTab('tracker')} className="absolute right-[6px] top-[3px] inline-flex items-center gap-1 bg-white text-emerald-900 text-[11px] font-black px-3 h-[22px] rounded-full shadow-md ring-1 ring-white/70 active:scale-95 transition">View Details <ArrowRight className="w-3.5 h-3.5" /></button>
        <div className="absolute right-[6px] top-[28px] bottom-[6px] w-[137px] rounded-[10px] bg-white text-slate-800 shadow-sm flex flex-col divide-y divide-emerald-100 overflow-hidden">
          <button type="button" onClick={() => onTab('tracker')} className="flex-1 min-h-0 w-full text-left px-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 text-emerald-700 shrink-0"><CalendarDays className="w-4 h-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[8px] font-black text-emerald-950 leading-tight">32-Day Tracker</span>
              <span className="block mt-[3px] h-[4px] rounded-full bg-emerald-100 overflow-hidden"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-600 to-lime-500" style={{ width: `${Math.round(done / CYCLE_DAYS * 100)}%` }} /></span>
              <span className="block text-[7px] font-semibold text-emerald-700 mt-[3px] leading-none">{done}/{CYCLE_DAYS} days completed</span>
            </span>
            <ChevronRight className="w-3 h-3 text-emerald-700 shrink-0" />
          </button>
          <button type="button" onClick={() => onTab('tracker')} className="flex-1 min-h-0 w-full text-left px-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 text-emerald-700 shrink-0"><Coins className="w-4 h-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1"><span className="text-[8px] font-black text-emerald-950 leading-tight whitespace-nowrap">Payout Status</span>
                <span className="text-[6.5px] font-black px-1 py-[1px] rounded-full bg-emerald-600 text-white leading-tight">{done >= CYCLE_DAYS ? 'Ready' : 'Pending'}</span></span>
              <span className="block text-[7px] font-semibold text-slate-600 leading-tight mt-[2px] whitespace-nowrap">Expected: {hidden ? MASK : naira(afterDay32)}</span>
              <span className="block text-[7px] font-semibold text-slate-500 leading-tight whitespace-nowrap">After Day {CYCLE_DAYS}</span>
            </span>
            <ChevronRight className="w-3 h-3 text-emerald-700 shrink-0" />
          </button>
        </div>
      </div>

      {/* QUICK SERVICES */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-emerald-950"><span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center"><Zap className="w-2.5 h-2.5" /></span> Quick Services</p>
          <button type="button" onClick={() => openBills('')} className="text-[7.7px] font-bold text-emerald-700 inline-flex items-center gap-1">More Services <ArrowRight className="w-2.5 h-2.5" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {([
            { k: 'airtime', t: 'Buy Airtime', s: 'Top up instantly', Icon: Phone, bg: 'from-emerald-50 to-emerald-100/70 border-emerald-200', ic: 'bg-green-600', ch: 'text-emerald-600' },
            { k: 'data', t: 'Buy Data', s: 'Stay connected', Icon: Globe, bg: 'from-sky-50 to-sky-100/70 border-sky-200', ic: 'bg-blue-600', ch: 'text-blue-500' },
            { k: 'electricity', t: 'Pay Electricity', s: 'Keep your lights on', Icon: Zap, bg: 'from-amber-50 to-orange-100/70 border-amber-200', ic: 'bg-amber-500', ch: 'text-amber-500' },
            { k: 'tv', t: 'TV Subscription', s: 'Entertainment for all', Icon: Tv, bg: 'from-violet-50 to-violet-100/70 border-violet-200', ic: 'bg-violet-600', ch: 'text-violet-500' }
          ]).map(q => (
            <button key={q.k} type="button" onClick={() => openBills(q.k)} className={`relative text-left rounded-[10px] bg-gradient-to-br ${q.bg} border h-[72px] px-[7px] pt-[6px] active:scale-[0.97] transition min-w-0 overflow-hidden`}>
              <span className={`w-[30px] h-[30px] rounded-full ${q.ic} text-white flex items-center justify-center shadow-sm`}><q.Icon className="w-4 h-4" /></span>
              <span className="block mt-[5px] text-[8.3px] font-black text-slate-900 leading-tight whitespace-nowrap">{q.t}</span>
              <span className="block text-[6.3px] font-medium text-slate-500 leading-tight whitespace-nowrap pr-2">{q.s}</span>
              <ChevronRight className={`w-2.5 h-2.5 absolute right-1 bottom-[6px] ${q.ch}`} />
            </button>
          ))}
        </div>
      </div>

      {/* MY WALLET */}
      <div className="relative rounded-[14px] bg-white border border-emerald-100 shadow-sm h-[96px]">
        <div className="absolute left-2 top-[8px] flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-800 text-white flex items-center justify-center shrink-0 shadow"><Wallet className="w-[18px] h-[18px]" /></span>
          <div className="min-w-0"><p className="text-[10.5px] leading-tight font-black text-emerald-950">My Wallet</p><p className="text-[7px] text-slate-500 font-medium leading-tight mt-0.5">Fund, pay bills and more.</p></div>
        </div>
        <div className="absolute left-[9px] bottom-[8px] w-[246px] h-[40px] rounded-[8px] bg-emerald-50/80 border border-emerald-100 flex items-center pl-2 pr-1.5">
          <button type="button" onClick={toggle} aria-pressed={hidden} aria-label={hidden ? 'Show balance' : 'Hide balance'} className="w-5 h-5 shrink-0 text-emerald-900 flex items-center justify-center active:scale-95 transition">
            {hidden ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
          </button>
          <span className="w-px h-6 bg-emerald-200 mx-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-semibold text-slate-700 leading-tight">Wallet Balance</p>
            <p className="text-[12.5px] font-black text-emerald-950 leading-tight tabular-nums whitespace-nowrap">{!live.loaded ? '...' : live.wallet ? (hidden ? MASK : `₦${Number(live.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : 'Not active'}</p>
          </div>
          <button type="button" onClick={() => onSection('wallet')} className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-emerald-800 to-emerald-600 text-white text-[7.5px] font-black px-2.5 h-[21px] rounded-full">Fund Wallet <ArrowRight className="w-2.5 h-2.5" /></button>
        </div>
        <button type="button" onClick={() => openBills('')} className="absolute right-[18px] top-[18px] w-[104px] h-[66px] rounded-[8px] bg-emerald-50/60 border border-emerald-100 grid grid-cols-2 text-[6.8px] font-medium text-slate-700" aria-label="Wallet services">
          {([['Airtime', Smartphone], ['Data', Globe], ['Electricity', Zap], ['TV', Tv]] as any[]).map(([l, I], i) => (
            <span key={l} className={`flex flex-col items-center justify-center gap-0.5 ${i < 2 ? 'border-b border-emerald-100' : ''} ${i % 2 === 0 ? 'border-r border-emerald-100' : ''}`}><I className="w-[15px] h-[15px] text-emerald-900" />{l}</span>
          ))}
        </button>
        <ChevronRight className="w-3 h-3 text-emerald-700 absolute right-[5px] top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* EXPLORE MORE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-emerald-950"><span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center"><Star className="w-2.5 h-2.5" /></span> Explore More</p>
          <button type="button" onClick={() => onSection('rewards')} className="text-[7.7px] font-bold text-emerald-700 inline-flex items-center gap-1">More <ArrowRight className="w-2.5 h-2.5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { t: 'Play & Earn', s: 'Play games, complete tasks and earn rewards.', Icon: Gamepad2, bg: 'from-violet-50 to-violet-100/70 border-violet-200', ic: 'bg-violet-600', ch: 'text-violet-500', run: () => onSection('games') },
            { t: 'Gbagede OJA', s: 'Buy and advertise your products.', Icon: Store, bg: 'from-orange-50 to-orange-100/70 border-orange-200', ic: 'bg-orange-500', ch: 'text-orange-500', run: () => onSection('oja') },
            { t: 'Refer & Earn', s: 'Invite your friends and earn 10% on each referral.', Icon: Users, bg: 'from-sky-50 to-sky-100/70 border-sky-200', ic: 'bg-blue-600', ch: 'text-blue-500', run: () => onSection('referrals') }
          ]).map(x => (
            <button key={x.t} type="button" onClick={x.run} className={`relative text-left rounded-[10px] bg-gradient-to-br ${x.bg} border h-[52px] pl-[6px] pr-[15px] flex items-center gap-1 active:scale-[0.97] transition min-w-0 overflow-hidden`}>
              <span className={`w-[30px] h-[30px] rounded-full ${x.ic} text-white flex items-center justify-center shadow-sm shrink-0`}><x.Icon className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8.3px] font-black text-slate-900 leading-tight whitespace-nowrap">{x.t}</span>
                <span className="block text-[6px] font-medium text-slate-600 leading-[1.25] mt-0.5 line-clamp-2 tracking-tight">{x.s}</span>
              </span>
              <ChevronRight className={`w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 ${x.ch}`} />
            </button>
          ))}
        </div>
      </div>

      {/* PROMOTIONS (admin-configured banners + built-ins) */}
      <PromoCarousel slides={slides} />
      {bonusId && <BonusClaimModal id={bonusId} onClose={() => setBonusId(null)} onSection={onSection} />}

      {/* Quick actions */}
      <Card>
        <SectionTitle>Quick actions</SectionTitle>
        {betOn && <BettingPulseStyle />}
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} type="button" onClick={a.run} className="flex flex-col items-center gap-1.5 group relative">
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} text-white flex items-center justify-center shadow-sm transition group-active:scale-95 ${a.pulse ? 'hm-bet-pulse' : ''}`}>
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
          <SectionTitle action={streak ? <Pill tone={streak.streak > 0 ? 'gold' : 'slate'}>{streak.streak} day{streak.streak === 1 ? '' : 's'}</Pill> : undefined}>Login streak</SectionTitle>
          <StreakStrip streak={streak} loaded={streakLoaded} compact />
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
