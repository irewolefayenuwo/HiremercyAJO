import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Flame, Gift, Star, ChevronRight, Lock, Users, Smartphone, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile, Transaction, SupportSettings } from '../App';
import { Mascot } from './Mascot';
import { Card, EmptyState, NotLive, Pill, ProgressBar, ScreenHeader, SectionTitle, naira } from './ui';
import type { SectionKey } from './config';
import { useStreak } from './useStreak';
import { StreakStrip } from './StreakStrip';
import { useRewards } from './useRewards';
import { shareAdvert } from './shareAdvert';
import { buildWelcomeSteps } from './rewardsLogic';
import type { DashboardLite } from './useReferralDashboard';

interface LedgerRow { id: string; points: number; source: string; note: string | null; created_at: string }

const SOURCE_LABEL: Record<string, string> = {
  referral_reward: 'Successful referral',
  reward_reversal: 'Reward reversed',
  login_streak: 'Login streak reward',
  contribution_reward: 'Contribution reward',
  advert_share: 'Advert shared',
  oja_visit: 'Visited Gbagede OJA',
  redemption: 'Redeemed to wallet'
};

export function RewardsScreen({
  customer, myTransactions, dash, onSection, onTab, supportDetails
}: {
  supportDetails: SupportSettings;
  customer: Profile;
  myTransactions: Transaction[];
  dash: DashboardLite | null;
  onSection: (s: SectionKey) => void;
  onTab: (tab: string) => void;
}) {
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [ledgerFailed, setLedgerFailed] = useState(false);
  const { rewards, reload: reloadRewards } = useRewards(customer.id);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [redeemPts, setRedeemPts] = useState('');
  const [ledgerTick, setLedgerTick] = useState(0);

  // Read-only: the points ledger is protected by RLS so a customer only ever receives their own rows.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('referral_points_ledger')
          .select('id, points, source, note, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        if (!alive) return;
        if (error) setLedgerFailed(true);
        else setLedger((data || []) as LedgerRow[]);
      } catch {
        if (alive) setLedgerFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [customer.id, ledgerTick]);

  const { streak, loaded: streakLoaded } = useStreak(customer.id);
  const steps = buildWelcomeSteps({
    bestStreak: streak?.longest || 0,
    shared: !!rewards?.advert_share.ever,
    visitedOja: !!rewards?.oja_visit.ever,
    customer,
    hasSuccessfulContribution: myTransactions.some(t => t.status !== 'Pending'),
    dash
  });
  const done = steps.filter(s => s.status === 'done').length;
  const bonus = Number(dash?.welcome_bonus_amount || 0);
  const points = rewards ? rewards.balance : Number(dash?.points || 0);
  const refresh = () => { reloadRewards(); setLedgerTick(t => t + 1); };
  const flash = (ok: boolean, text: string) => setMsg({ ok, text });
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <ScreenHeader title="Rewards & Points" subtitle="Your activity brings you closer to rewards" pose="celebrate" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white border border-emerald-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-pink-500" /> Welcome bonus</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{bonus > 0 ? naira(bonus) : '—'}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
            {bonus > 0 ? 'Non-withdrawable · rules to be confirmed' : 'Not available for this account'}
          </p>
        </div>
        <div className="rounded-3xl bg-white border border-emerald-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> Reward points</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{points.toLocaleString()}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Earned from approved activity</p>
        </div>
      </div>

      <Card>
        <SectionTitle action={bonus > 0 ? <Pill tone="gold">{naira(bonus)} bonus</Pill> : undefined}>
          {bonus > 0 ? 'Welcome Challenge' : 'Getting started checklist'}
        </SectionTitle>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
          <span>{done} of {steps.length} steps completed</span>
          <span className="text-emerald-700">{Math.round((done / steps.length) * 100)}%</span>
        </div>
        <ProgressBar value={done} max={steps.length} tone="gold" />

        <ul className="mt-4 space-y-3">
          {steps.map(s => (
            <li key={s.key} className="flex items-start gap-3">
              {s.status === 'done'
                ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                : s.status === 'soon'
                  ? <Clock className="w-6 h-6 text-slate-300 shrink-0" />
                  : <Circle className="w-6 h-6 text-amber-400 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${s.status === 'done' ? 'text-emerald-800' : 'text-slate-800'}`}>{s.title}</p>
                <p className="text-[11px] text-slate-500 font-medium">{s.detail}</p>
                {s.go && (
                  <button type="button" onClick={() => (s.go!.tab ? onTab(s.go!.tab) : onSection(s.go!.section))}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline">
                    {s.go.label} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {s.status === 'soon' && <Pill tone="slate">Soon</Pill>}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 font-medium mt-4 leading-relaxed">
          Completing a step does not pay out automatically. Opening a screen never earns anything - rewards are only released
          by HireMercyAJO under its confirmed rules.
        </p>
      </Card>

      <Card>
        <SectionTitle action={streak ? <Pill tone={streak.streak > 0 ? 'gold' : 'slate'}>{streak.streak} day{streak.streak === 1 ? '' : 's'}</Pill> : undefined}>
          Daily login streak
        </SectionTitle>
        <StreakStrip streak={streak} loaded={streakLoaded} />
      </Card>

      <Card>
        <SectionTitle>More ways to earn</SectionTitle>
        {msg && <p className={`text-xs font-bold mb-2 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
        <ul className="divide-y divide-slate-100">
          <li className="py-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Users className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">Referral tasks</p>
              <p className="text-[11px] text-slate-500 font-medium">{Number(dash?.total_referred || 0)} referred · {Number(dash?.successful_referrals || 0)} qualified</p>
            </div>
            <button type="button" onClick={() => onSection('referrals')} className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">Open <ChevronRight className="w-3.5 h-3.5" /></button>
          </li>

          <li className={`py-3 flex items-center gap-3 ${rewards?.contribution.enabled ? '' : 'opacity-80'}`}>
            <span className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center"><Gift className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">Contribution rewards</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {rewards?.contribution.enabled
                  ? `Earn ${rewards.contribution.points} points for every ${rewards.contribution.threshold} contribution days · ${rewards.contribution.toward_next}/${rewards.contribution.threshold} so far`
                  : 'Rewards for consistent contributions'}
              </p>
            </div>
            {rewards?.contribution.enabled
              ? (rewards.contribution.claimable_blocks > 0
                ? <button type="button" disabled={busy === 'c'} className="text-xs font-bold bg-emerald-700 text-white px-3 py-2 rounded-xl disabled:opacity-50"
                    onClick={async () => {
                      setBusy('c'); setMsg(null);
                      const { data, error } = await supabase.rpc('claim_contribution_reward');
                      setBusy('');
                      if (error) flash(false, 'Nothing to claim right now.'); else flash(true, `You earned ${(data as any)?.awarded || 0} points!`);
                      refresh();
                    }}>Claim {rewards.contribution.claimable_blocks * rewards.contribution.points}</button>
                : <Pill tone="green">Active</Pill>)
              : <Pill tone="slate">Soon</Pill>}
          </li>

          <li className={`py-3 flex items-center gap-3 ${rewards?.advert_share.enabled ? '' : 'opacity-80'}`}>
            <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Star className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">Advert-sharing tasks</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {rewards?.advert_share.enabled
                  ? `Share our advert and earn ${rewards.advert_share.points} points (up to ${rewards.advert_share.daily_cap} a day) · ${rewards.advert_share.shares_today} today`
                  : 'Share our advert with friends on WhatsApp, Facebook or Instagram'}
              </p>
            </div>
            <button type="button" disabled={busy === 's'} className="text-xs font-bold bg-violet-600 text-white px-3 py-2 rounded-xl disabled:opacity-50"
              onClick={async () => {
                setBusy('s'); setMsg(null);
                const r = await shareAdvert({
                  title: supportDetails.advert_title || 'Save daily with HireMercyAJO',
                  text: supportDetails.advert_description, referralCode: dash?.referral_code, key: 'main'
                });
                setBusy('');
                flash(r.shared, r.note); refresh();
              }}>Share now</button>
          </li>

          <li className={`py-3 flex items-center gap-3 ${rewards?.oja_visit.enabled ? '' : 'opacity-80'}`}>
            <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Gift className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">Gbagede OJA tasks</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {rewards?.oja_visit.enabled
                  ? `Visit Gbagede OJA daily and earn ${rewards.oja_visit.points} points${rewards.oja_visit.done_today ? ' · done today' : ''}`
                  : 'Marketplace visits and eligible tasks'}
              </p>
            </div>
            {rewards?.oja_visit.enabled && rewards.oja_visit.done_today
              ? <Pill tone="green">Done</Pill>
              : <button type="button" onClick={() => onSection('oja')} className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">Open <ChevronRight className="w-3.5 h-3.5" /></button>}
          </li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>Points & redemption history</SectionTitle>
        {ledgerFailed ? (
          <NotLive title="History unavailable">We could not load your points history right now. Please try again later.</NotLive>
        ) : ledger === null ? (
          <div className="skeleton-green h-16" aria-busy="true" />
        ) : ledger.length === 0 ? (
          <EmptyState pose="shrug" title="No points yet" text="Points you earn and anything you redeem will be listed here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ledger.map(r => (
              <li key={r.id} className="py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">{SOURCE_LABEL[r.source] || r.note || r.source}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{fmtDate(r.created_at)}</p>
                </div>
                <p className={`text-sm font-black ${r.points < 0 ? 'text-red-600' : 'text-emerald-800'}`}>{r.points > 0 ? '+' : ''}{r.points}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>Redeem points</SectionTitle>
        {rewards?.redeem.enabled ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-medium">
              {rewards.redeem.points_per_naira} points = ₦1 in your wallet. Minimum {rewards.redeem.min_points} points. Then use your wallet to buy airtime or data.
            </p>
            <div className="flex gap-2">
              <input value={redeemPts} onChange={e => setRedeemPts(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={`Points (you have ${points})`}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-emerald-500" />
              <button type="button" disabled={busy === 'r' || !Number(redeemPts)} className="px-4 py-3 rounded-xl bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                onClick={async () => {
                  setBusy('r'); setMsg(null);
                  const { data, error } = await supabase.rpc('redeem_points', { p_points: Number(redeemPts) });
                  setBusy('');
                  if (error) {
                    const m = error.message || '';
                    flash(false, m.includes('BELOW_MINIMUM') ? `Minimum is ${rewards.redeem.min_points} points.` : m.includes('INSUFFICIENT') ? 'Not enough points.' : m.includes('DAILY_LIMIT') ? 'Daily redeem limit reached. Try tomorrow.' : 'Could not redeem right now.');
                  } else { flash(true, `₦${(data as any).naira} added to your wallet.`); setRedeemPts(''); }
                  refresh();
                }}>Redeem</button>
            </div>
            {Number(redeemPts) > 0 && <p className="text-[11px] text-slate-500 font-semibold">= ₦{Math.floor(Number(redeemPts) / rewards.redeem.points_per_naira)} (daily limit ₦{rewards.redeem.max_naira_per_day})</p>}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => onSection('bills')} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center"><Smartphone className="w-6 h-6 mx-auto text-emerald-700" /><p className="text-xs font-bold mt-1">Buy airtime</p></button>
              <button type="button" onClick={() => onSection('bills')} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center"><Wifi className="w-6 h-6 mx-auto text-emerald-700" /><p className="text-xs font-bold mt-1">Buy data</p></button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[{ t: 'Airtime', i: Smartphone }, { t: 'Data', i: Wifi }].map(r => {
              const Icon = r.i;
              return (
                <div key={r.t} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <Icon className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-700 mt-1">{r.t}</p>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Not available yet</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex justify-center"><Mascot pose="wave" size={90} /></div>
    </div>
  );
}
