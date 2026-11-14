import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Clock, Crown, Info, Loader2, ShieldCheck, X } from 'lucide-react';
import { Card, NotLive, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira } from './ui';
import { CoinIcon, GameStyles } from './GameArt';
import {
  estimateWithdrawal, gameRpc, invalidateGameState, newKey,
  type BuyResult, type EconomyOverview, type EconPackage, type GameState, type MembershipBuyResult, type MembershipRow,
  type OrderRow, type PlanPublic, type WithdrawOverview, type WithdrawQuote, type WithdrawResult, type WithdrawalRow
} from './gameApi';

const fmt = (n: number | null | undefined) => Number(n || 0).toLocaleString();
const when = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const day = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const GREEN = 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600';
const CHIP: Record<string, string> = {
  successful: 'bg-emerald-100 text-emerald-800', completed: 'bg-emerald-100 text-emerald-800', pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700', rejected: 'bg-red-100 text-red-700', refunded: 'bg-slate-200 text-slate-700', cancelled: 'bg-slate-200 text-slate-700'
};
const label = (s: string) => (s === 'completed' ? 'Completed' : s === 'successful' ? 'Successful' : s.charAt(0).toUpperCase() + s.slice(1));
const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

interface Common { gs: GameState; onBack: () => void; onChanged: () => void }

function Outcome({ tone, title, children, actions }: { tone: 'ok' | 'bad' | 'wait'; title: string; children?: React.ReactNode; actions: React.ReactNode }) {
  const bg = tone === 'ok' ? 'from-emerald-900 via-emerald-800 to-emerald-600' : tone === 'bad' ? 'from-red-900 via-red-800 to-red-600' : 'from-amber-700 via-amber-600 to-yellow-500';
  return (
    <div className="space-y-4 fade-in max-w-xl mx-auto" role="status" aria-live="polite">
      <div className={`rounded-3xl bg-gradient-to-br ${bg} text-white text-center p-6 shadow-md`}>
        <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">{tone === 'ok' ? <Check className="w-9 h-9" /> : tone === 'bad' ? <X className="w-9 h-9" /> : <Clock className="w-9 h-9" />}</div>
        <h2 className="text-xl font-extrabold mt-3">{title}</h2>
      </div>
      {children && <Card className="space-y-2 text-sm">{children}</Card>}
      <div className="grid gap-3">{actions}</div>
    </div>
  );
}
const Row = ({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) => (
  <div className="flex justify-between gap-4 py-1.5"><span className="text-slate-500 font-semibold">{k}</span><span className={`text-right ${strong ? 'font-black text-emerald-900 text-base' : 'font-bold text-slate-900'}`}>{v}</span></div>);

// ============================================================================== BUY COINS (automatic, from the ordinary wallet)
export function BuyCoinsView({ gs, onBack, onChanged, onPlans, onAddMoney }: Common & { onPlans: () => void; onAddMoney: () => void }) {
  const [ov, setOv] = useState<EconomyOverview | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<EconPackage | null>(null);
  const [step, setStep] = useState<'list' | 'confirm' | 'busy' | 'done' | 'failed'>('list');
  const [res, setRes] = useState<BuyResult | null>(null);
  const key = useRef(newKey());
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([gameRpc<EconomyOverview>('game_economy_overview'), gameRpc<OrderRow[]>('game_my_orders')]);
    if (a.ok) { setOv(a.data); setErr(''); } else setErr(a.message);
    if (b.ok) setOrders(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pay = async () => {
    if (!pick || step === 'busy') return;
    setStep('busy'); setErr('');
    // only the package and a request key are sent: price, bonus and coins are decided by the server
    const r = await gameRpc<BuyResult>('game_buy_coins', { p_package: pick.id, p_idem: key.current });
    if (!r.ok) { setErr(r.message); if (r.code !== 'NETWORK') key.current = newKey(); setStep('failed'); return; }
    setRes(r.data); key.current = newKey(); invalidateGameState(); onChanged(); setStep('done'); load();
  };

  if (step === 'busy') return (
    <div className="max-w-xl mx-auto"><GameStyles /><div className={`${GREEN} rounded-3xl text-white text-center p-10 shadow-md`} role="status" aria-live="polite">
      <Loader2 className="w-12 h-12 mx-auto motion-safe:animate-spin" /><h2 className="text-xl font-extrabold mt-4">Processing...</h2><p className="text-sm text-white/85 mt-1">Taking the payment from your wallet and adding your coins. Please do not close this screen.</p></div></div>);
  if (step === 'done' && res) return (
    <Outcome tone="ok" title="Purchase successful"
      actions={<><PrimaryButton onClick={() => { setStep('list'); setPick(null); }}>Buy more coins</PrimaryButton><SecondaryButton onClick={onBack}>Back to games</SecondaryButton></>}>
      <Row k="Package" v={pick?.name} /><Row k="Coins" v={`${fmt(res.base_coins)}`} />
      {(res.bonus_coins || 0) > 0 && <Row k="Package bonus" v={`+${fmt(res.bonus_coins)}`} />}{(res.promo_bonus || 0) > 0 && <Row k="Promotion bonus" v={`+${fmt(res.promo_bonus)}`} />}
      <Row k="Total coins added" v={fmt(res.total_coins)} strong /><Row k="Paid from wallet" v={naira(res.price_naira)} />
      <Row k="Wallet balance now" v={naira(res.wallet_balance)} /><Row k="Game coins now" v={fmt(res.coin_balance)} />
    </Outcome>);
  if (step === 'failed') return (
    <Outcome tone="bad" title="Purchase not completed" actions={<><PrimaryButton onClick={() => setStep('confirm')}>Try again</PrimaryButton><SecondaryButton onClick={() => { setStep('list'); setErr(''); }}>Back to packages</SecondaryButton></>}>
      <p className="font-semibold text-slate-800">{err}</p><p className="text-xs text-slate-500">If money left your wallet, the coins are added automatically. Check Coins &amp; History. You are never charged twice for one request.</p>
    </Outcome>);

  if (!ov) return <Card className="max-w-xl mx-auto text-center py-12">{err ? <p className="text-xs font-bold text-red-600">{err}</p> : <Loader2 className="w-8 h-8 mx-auto text-emerald-700 motion-safe:animate-spin" />}</Card>;

  if (step === 'confirm' && pick) {
    const short = ov.wallet_naira < pick.price_naira;
    return (
      <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title="Confirm purchase" subtitle={pick.name} onBack={() => setStep('list')} />
        <Card className="space-y-1">
          <div className="text-center py-2"><CoinIcon size={44} className="mx-auto" /><p className="text-3xl font-black text-emerald-950">{fmt(pick.total)} coins</p>
            <p className="text-xs font-semibold text-slate-500">{fmt(pick.coins)} coins{pick.bonus_coins > 0 ? ` + ${fmt(pick.bonus_coins)} bonus` : ''}{pick.promo_bonus > 0 ? ` + ${fmt(pick.promo_bonus)} promotion` : ''}</p></div>
          <Row k="Amount deducted from wallet" v={naira(pick.price_naira)} strong /><Row k="Wallet balance now" v={naira(ov.wallet_naira)} />
          <Row k="Wallet balance after" v={short ? '-' : naira(ov.wallet_naira - pick.price_naira)} /><Row k="Your category" v={ov.plan.name} />
        </Card>
        {short && <NotLive title="Your wallet balance is too low">You need {naira(pick.price_naira)} in your wallet. Add money first, then come back.</NotLive>}
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton onClick={() => setStep('list')}>Cancel</SecondaryButton>
          {short ? <PrimaryButton onClick={onAddMoney}>Add money</PrimaryButton> : <PrimaryButton onClick={pay}>Confirm &amp; pay {naira(pick.price_naira)}</PrimaryButton>}
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Coins are added instantly. Purchased coins are for playing only and cannot be withdrawn.</p>
      </div>);
  }

  const boost = ov.packages.some(p => p.tiers.some(t => t.plan_id !== ov.plan.id && t.bonus_coins > p.bonus_coins));
  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
      <ScreenHeader title="Buy Game Coins" subtitle="Paid instantly from your wallet" onBack={onBack} />
      {gs.settings.preview && <div className="rounded-2xl bg-amber-50 border border-amber-300 px-3 py-2 text-[11px] font-bold text-amber-900">Admin preview: customers see this only when coin purchases are switched on.</div>}
      <div className={`${GREEN} rounded-3xl p-4 text-white grid grid-cols-2 gap-3 shadow-md`}>
        <div><p className="text-[11px] font-bold text-emerald-100">Wallet balance</p><p className="text-2xl font-black">{naira(ov.wallet_naira)}</p></div>
        <div><p className="text-[11px] font-bold text-emerald-100">Game coins</p><p className="text-2xl font-black inline-flex items-center gap-1.5"><CoinIcon size={22} />{fmt(ov.coin_balance)}</p></div>
        <p className="col-span-2 text-[11px] font-semibold text-emerald-100">Your category: <b>{ov.plan.name}</b></p>
      </div>
      {!ov.enabled.purchases && <NotLive title="Coin purchases are not open yet">You will be able to buy game coins from your wallet here soon.</NotLive>}
      {err && <p className="text-xs font-bold text-red-600" role="alert">{err}</p>}
      {ov.enabled.purchases && boost && <button type="button" onClick={onPlans} className="w-full rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-left text-xs font-bold text-amber-900 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" />Members get bigger bonuses on every package. See memberships<ChevronRight className="w-4 h-4 ml-auto" /></button>}
      {ov.enabled.purchases && ov.packages.length === 0 && <Card className="text-center text-xs font-semibold text-slate-500">No coin packages are available right now.</Card>}
      {ov.enabled.purchases && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{ov.packages.map(p => (
        <div key={p.id} className="relative bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 text-center flex flex-col">
          {p.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black px-2.5 py-0.5 whitespace-nowrap">{p.badge}</span>}
          <p className="text-xs font-black text-emerald-800">{p.name}</p><CoinIcon size={38} className="mx-auto mt-1" /><p className="mt-1 text-xl font-black text-emerald-950">{fmt(p.total)}</p><p className="text-[10px] font-bold text-slate-500">coins in total</p>
          <p className="text-[11px] font-semibold text-slate-600 mt-1">{fmt(p.coins)}{p.bonus_coins > 0 ? <b className="text-emerald-600"> + {fmt(p.bonus_coins)} bonus</b> : ''}{p.promo_bonus > 0 ? <b className="text-amber-600"> + {fmt(p.promo_bonus)} promo</b> : ''}</p>
          {p.tiers.filter(t => t.plan_id !== ov.plan.id && t.bonus_coins > p.bonus_coins).slice(0, 2).map(t => <p key={t.plan_id} className="text-[10px] font-bold text-amber-700">{t.plan_name}: +{fmt(t.bonus_coins)} bonus</p>)}
          <p className="text-base font-black text-slate-900 mt-2">{naira(p.price_naira)}</p>
          <button type="button" onClick={() => { setPick(p); key.current = newKey(); setStep('confirm'); }} className="mt-auto pt-0"><span className="mt-2 block w-full rounded-full bg-emerald-700 text-white py-2 text-xs font-black">Buy</span></button>
        </div>))}</div>}
      {orders.length > 0 && (<div><SectionTitle>My purchases</SectionTitle><Card><ul className="divide-y divide-slate-100">{orders.map(o => (
        <li key={o.id} className="flex items-center justify-between gap-2 py-2.5"><div><p className="text-sm font-bold text-slate-900">{fmt(o.coins + o.bonus_coins)} coins · {naira(o.price_naira)}</p><p className="text-[10px] text-slate-400 font-semibold">{when(o.created_at)}</p></div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${CHIP[o.status] || CHIP.refunded}`}>{label(o.status)}</span></li>))}</ul></Card></div>)}
    </div>
  );
}

// ============================================================================== MEMBERSHIP (compare, buy / renew, history)
export function MembershipView({ gs, onBack, onChanged, onAddMoney }: Common & { onAddMoney: () => void }) {
  const [ov, setOv] = useState<EconomyOverview | null>(null);
  const [hist, setHist] = useState<MembershipRow[]>([]);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<PlanPublic | null>(null);
  const [step, setStep] = useState<'list' | 'confirm' | 'busy' | 'done' | 'failed'>('list');
  const [res, setRes] = useState<MembershipBuyResult | null>(null);
  const key = useRef(newKey());
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([gameRpc<EconomyOverview>('game_economy_overview'), gameRpc<MembershipRow[]>('game_my_memberships')]);
    if (a.ok) { setOv(a.data); setErr(''); } else setErr(a.message);
    if (b.ok) setHist(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const buy = async () => {
    if (!pick || step === 'busy') return;
    setStep('busy'); setErr('');
    const r = await gameRpc<MembershipBuyResult>('game_buy_membership', { p_plan: pick.id, p_idem: key.current });
    if (!r.ok) { setErr(r.message); if (r.code !== 'NETWORK') key.current = newKey(); setStep('failed'); return; }
    setRes(r.data); key.current = newKey(); invalidateGameState(); onChanged(); setStep('done'); load();
  };

  if (step === 'busy') return <div className="max-w-xl mx-auto"><div className={`${GREEN} rounded-3xl text-white text-center p-10 shadow-md`} role="status"><Loader2 className="w-12 h-12 mx-auto motion-safe:animate-spin" /><h2 className="text-xl font-extrabold mt-4">Activating your membership...</h2></div></div>;
  if (step === 'done' && res) return (
    <Outcome tone="ok" title="Membership active" actions={<PrimaryButton onClick={() => { setStep('list'); setPick(null); }}>Done</PrimaryButton>}>
      <Row k="Category" v={res.plan_name || pick?.name} /><Row k="Valid until" v={day(res.expires_at)} strong />{(res.bonus_coins || 0) > 0 && <Row k="Bonus coins added" v={`+${fmt(res.bonus_coins)}`} />}
      <Row k="Paid from wallet" v={naira(res.price_naira)} /><Row k="Wallet balance now" v={naira(res.wallet_balance)} />
    </Outcome>);
  if (step === 'failed') return (
    <Outcome tone="bad" title="Membership not activated" actions={<><PrimaryButton onClick={() => setStep('confirm')}>Try again</PrimaryButton><SecondaryButton onClick={() => { setStep('list'); setErr(''); }}>Back</SecondaryButton></>}>
      <p className="font-semibold text-slate-800">{err}</p></Outcome>);
  if (!ov) return <Card className="max-w-xl mx-auto text-center py-12">{err ? <p className="text-xs font-bold text-red-600">{err}</p> : <Loader2 className="w-8 h-8 mx-auto text-emerald-700 motion-safe:animate-spin" />}</Card>;

  if (step === 'confirm' && pick) {
    const short = ov.wallet_naira < pick.price_naira; const renew = pick.current && !pick.is_default;
    return (
      <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title={renew ? 'Renew membership' : 'Join membership'} subtitle={pick.name} onBack={() => setStep('list')} />
        <Card className="space-y-1">
          <Row k="Category" v={pick.name} /><Row k="Duration" v={`${pick.period_days} days`} /><Row k="Amount deducted from wallet" v={naira(pick.price_naira)} strong />
          <Row k="Wallet balance now" v={naira(ov.wallet_naira)} /><Row k="Wallet balance after" v={short ? '-' : naira(ov.wallet_naira - pick.price_naira)} />
          {pick.membership_bonus_coins > 0 && <Row k="Bonus coins on joining" v={`+${fmt(pick.membership_bonus_coins)}`} />}
          {pick.entry_discount_pct > 0 && <Row k="Game entry discount" v={`${pick.entry_discount_pct}%`} />}
        </Card>
        {short && <NotLive title="Your wallet balance is too low">You need {naira(pick.price_naira)} in your wallet.</NotLive>}
        <div className="grid grid-cols-2 gap-3"><SecondaryButton onClick={() => setStep('list')}>Cancel</SecondaryButton>
          {short ? <PrimaryButton onClick={onAddMoney}>Add money</PrimaryButton> : <PrimaryButton onClick={buy}>Confirm &amp; pay {naira(pick.price_naira)}</PrimaryButton>}</div>
        <p className="text-[11px] text-slate-500 font-medium">Memberships are paid from your wallet and start immediately. Benefits are checked by the server every time.</p>
      </div>);
  }

  const plans = ov.plans; const cur = ov.membership;
  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
      <ScreenHeader title="Premium Membership" subtitle="Compare categories and unlock more" onBack={onBack} />
      <Card className="flex items-center gap-3 bg-emerald-50 border-emerald-200"><Crown className="w-6 h-6 text-amber-500 shrink-0" />
        <p className="text-xs font-bold text-emerald-900">{cur.active ? <>Your category: <b>{cur.plan_name}</b>, {cur.in_grace ? 'in its grace period, ending' : 'active until'} {day(cur.expires_at)}.</> : <>Your category: <b>{ov.plan.name}</b>. Join a membership for more games and bigger bonuses.</>}</p></Card>
      {!ov.enabled.membership && <NotLive title="Membership purchases are not open yet">You can compare the categories now. Buying opens soon.</NotLive>}
      {plans.length > 1 && (
        <Card className="!p-0 overflow-x-auto"><table className="w-full text-xs min-w-[28rem]">
          <thead><tr className="bg-emerald-50 text-left"><th className="p-3 w-28" />{plans.map(p => <th key={p.id} className={`p-3 font-black text-emerald-950 ${p.current ? 'bg-emerald-100' : ''}`}>{p.name}{p.current && <span className="block text-[9px] text-emerald-700">YOUR CATEGORY</span>}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {([
              ['Price', (p: PlanPublic) => (p.is_default ? 'Free' : naira(p.price_naira))],
              ['Duration', (p: PlanPublic) => (p.is_default ? '-' : `${p.period_days} days`)],
              ['Entry discount', (p: PlanPublic) => (p.entry_discount_pct > 0 ? `${p.entry_discount_pct}%` : '-')],
              ['Joining bonus', (p: PlanPublic) => (p.membership_bonus_coins > 0 ? `${fmt(p.membership_bonus_coins)} coins` : '-')],
              ['Games', (p: PlanPublic) => (p.games.length ? `${p.games.length} included` : '-')],
              ['Withdrawals', (p: PlanPublic) => (p.withdraw === null ? 'n/a' : p.withdraw.enabled ? `up to ${naira(p.withdraw.max)} each` : 'No')]
            ] as [string, (p: PlanPublic) => string][]).map(([k, f]) => (
              <tr key={k}><td className="p-3 font-bold text-slate-500">{k}</td>{plans.map(p => <td key={p.id} className={`p-3 font-semibold text-slate-900 ${p.current ? 'bg-emerald-50' : ''}`}>{f(p)}</td>)}</tr>))}
          </tbody></table></Card>)}
      <div className="grid sm:grid-cols-2 gap-3">{plans.map(p => (
        <div key={p.id} className={`relative rounded-3xl p-4 shadow-sm ${p.popular ? `${GREEN} text-white border-2 border-amber-300` : 'bg-white border border-emerald-100'}`}>
          {p.popular && <span className="absolute -top-2.5 left-4 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black px-2.5 py-0.5">Most Popular</span>}
          <div className="flex items-center gap-2"><Crown className={`w-5 h-5 ${p.popular ? 'text-amber-300' : 'text-amber-500'}`} /><p className="text-base font-black">{p.name}</p></div>
          <p className="mt-1">{p.is_default ? <span className="text-2xl font-black">Free</span> : <><span className="text-2xl font-black">{naira(p.price_naira)}</span><span className={`text-xs font-bold ${p.popular ? 'text-emerald-100' : 'text-slate-500'}`}> / {p.period_days} days</span></>}</p>
          <ul className="mt-2 space-y-1">{(p.benefits || []).map((b, i) => <li key={i} className="flex gap-2 text-xs font-semibold"><Check className="w-4 h-4 shrink-0 text-emerald-500" />{b}</li>)}
            {p.entry_discount_pct > 0 && <li className="flex gap-2 text-xs font-semibold"><Check className="w-4 h-4 shrink-0 text-emerald-500" />{p.entry_discount_pct}% off game entry</li>}</ul>
          {p.is_default ? <p className={`mt-3 text-center text-xs font-black ${p.popular ? 'text-emerald-100' : 'text-slate-500'}`}>{p.current ? 'Your current category' : 'Included for everyone'}</p>
            : <button type="button" disabled={!ov.enabled.membership || !p.purchasable} onClick={() => { setPick(p); key.current = newKey(); setStep('confirm'); }}
                className={`mt-3 w-full rounded-full py-2.5 text-xs font-black disabled:opacity-60 ${p.popular ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-700 text-white'}`}>
                {!ov.enabled.membership ? 'Opens soon' : p.current ? `Renew for ${naira(p.price_naira)}` : `Join for ${naira(p.price_naira)}`}</button>}
        </div>))}</div>
      {hist.length > 0 && (<div><SectionTitle>My membership history</SectionTitle><Card><ul className="divide-y divide-slate-100">{hist.map(m => (
        <li key={m.id} className="flex items-center justify-between gap-2 py-2.5"><div><p className="text-sm font-bold text-slate-900">{m.plan_name}{m.price_paid ? ` · ${naira(m.price_paid)}` : ''}</p><p className="text-[10px] text-slate-400 font-semibold">{day(m.starts_at)} to {day(m.expires_at)} · {m.source}</p></div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${m.is_live ? CHIP.completed : CHIP.refunded}`}>{m.is_live ? 'Active' : label(m.status)}</span></li>))}</ul></Card></div>)}
    </div>
  );
}

// ============================================================================== WITHDRAW COINS (earned, eligible coins -> ordinary wallet)
export function WithdrawView({ gs, onBack, onChanged }: Common) {
  const [ov, setOv] = useState<WithdrawOverview | null>(null);
  const [hist, setHist] = useState<WithdrawalRow[]>([]);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [quote, setQuote] = useState<Extract<WithdrawQuote, { ok: true }> | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'busy' | 'done'>('form');
  const [res, setRes] = useState<WithdrawResult | null>(null);
  const [busyQ, setBusyQ] = useState(false);
  const key = useRef(newKey());
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([gameRpc<WithdrawOverview>('game_withdraw_overview'), gameRpc<WithdrawalRow[]>('game_my_withdrawals', { p_limit: 20 })]);
    if (a.ok) { setOv(a.data); setErr(''); } else setErr(a.message);
    if (b.ok) setHist(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const coins = Math.floor(Number(text.replace(/[^0-9]/g, '')) || 0);
  const est = ov ? estimateWithdrawal(ov.sources, coins) : null;

  const goConfirm = async () => {
    if (!ov || busyQ) return;
    setBusyQ(true); setErr('');
    const r = await gameRpc<WithdrawQuote>('game_withdraw_quote', { p_coins: coins });     // exact server calculation
    setBusyQ(false);
    if (!r.ok) { setErr(r.message); return; }
    if (!r.data.ok) { setErr(r.data.message); return; }
    setQuote(r.data); key.current = newKey(); setStep('confirm');
  };
  const confirm = async () => {
    if (!quote || step === 'busy') return;
    setStep('busy'); setErr('');
    const r = await gameRpc<WithdrawResult>('game_withdraw', { p_coins: quote.coins, p_idem: key.current });
    if (!r.ok) { setErr(r.message); setStep('confirm'); return; }          // network problem: the same key is kept, so retrying can never convert twice
    key.current = newKey(); invalidateGameState(); onChanged(); setRes(r.data); setStep('done'); load();
  };

  if (step === 'busy') return <div className="max-w-xl mx-auto"><div className={`${GREEN} rounded-3xl text-white text-center p-10 shadow-md`} role="status" aria-live="polite"><Loader2 className="w-12 h-12 mx-auto motion-safe:animate-spin" /><h2 className="text-xl font-extrabold mt-4">Converting...</h2><p className="text-sm text-white/85 mt-1">Please wait. Do not close this screen.</p></div></div>;
  if (step === 'done' && res) {
    if (!res.ok) return <Outcome tone="bad" title="Conversion not completed" actions={<PrimaryButton onClick={() => { setStep('form'); setQuote(null); }}>Back</PrimaryButton>}><p className="font-semibold text-slate-800">{res.message}</p></Outcome>;
    const wait = res.status === 'pending';
    return (
      <Outcome tone={wait ? 'wait' : 'ok'} title={wait ? 'Waiting for approval' : 'Added to your wallet'} actions={<><PrimaryButton onClick={() => { setStep('form'); setQuote(null); setText(''); }}>Done</PrimaryButton><SecondaryButton onClick={onBack}>Back to games</SecondaryButton></>}>
        <Row k="Coins converted" v={fmt(res.coins)} /><Row k={wait ? 'Amount (after approval)' : 'Added to wallet'} v={naira(res.naira)} strong />
        {wait ? <p className="text-xs text-slate-600 font-medium">Your coins are set aside. The money is added to your wallet once the team approves it. If it is rejected, your coins are returned.</p>
          : <><Row k="Wallet balance now" v={naira(res.wallet_balance)} /><Row k="Game coins now" v={fmt(res.coin_balance)} /></>}
      </Outcome>);
  }
  if (!ov) return <Card className="max-w-xl mx-auto text-center py-12">{err ? <p className="text-xs font-bold text-red-600">{err}</p> : <Loader2 className="w-8 h-8 mx-auto text-emerald-700 motion-safe:animate-spin" />}</Card>;

  if (step === 'confirm' && quote) return (
    <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
      <ScreenHeader title="Confirm conversion" subtitle="Check the rate before you continue" onBack={() => { setStep('form'); setErr(''); }} />
      <Card className="space-y-1">
        <div className="text-center py-1"><p className="text-xs font-bold text-slate-500">You will receive</p><p className="text-4xl font-black text-emerald-900">{naira(quote.naira)}</p><p className="text-xs font-semibold text-slate-500">for {fmt(quote.coins)} coins, added to your wallet</p></div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">{quote.chunks.map(c => (
          <div key={c.source} className="flex justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{c.name}: {fmt(c.coins)} coins <span className="text-slate-400 font-semibold">at {fmt(c.coins_per_unit)} = {naira(c.naira_per_unit)}</span></span><span className="font-black text-slate-900">{naira(c.naira)}</span></div>))}</div>
        <Row k="Your category" v={quote.plan.name} /><Row k="Withdrawal limit left today" v={naira(Math.max(0, quote.limits.daily - quote.used.today))} />
        <p className="text-[11px] text-slate-500 font-medium">Each part is rounded <b>down</b> to the nearest kobo. The rate shown is saved with this transaction and never changes later.</p>
        {quote.review && <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">This amount needs approval from the team. Your coins are set aside until it is decided.</p>}
      </Card>
      {err && <p className="text-xs font-bold text-red-600" role="alert">{err}</p>}
      <div className="grid grid-cols-2 gap-3"><SecondaryButton onClick={() => { setStep('form'); setErr(''); }}>Back</SecondaryButton><PrimaryButton onClick={confirm}>Confirm conversion</PrimaryButton></div>
    </div>);

  const b = ov.balances; const rates = ov.sources.filter(s => s.coins_per_unit && s.naira_per_unit);
  const best = rates.length ? rates.reduce((a, c) => (c.naira_per_unit! / c.coins_per_unit! > a.naira_per_unit! / a.coins_per_unit! ? c : a)) : null;
  return (
    <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
      <ScreenHeader title="Withdraw Game Coins" subtitle="Convert eligible earned coins to wallet money" onBack={onBack} />
      {gs.settings.preview && <div className="rounded-2xl bg-amber-50 border border-amber-300 px-3 py-2 text-[11px] font-bold text-amber-900">Admin preview. {ov.mode === 'test' ? 'Withdrawals are in TEST mode: only admins can use this.' : ''}</div>}
      <div className="rounded-3xl bg-gradient-to-br from-lime-100 to-emerald-100 border border-emerald-200 p-4 flex items-center gap-4">
        <div className="relative"><CoinIcon size={60} /><span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Check className="w-4 h-4" /></span></div>
        <div><p className="text-sm font-bold text-emerald-900">Eligible earned coins</p><p className="text-4xl font-black text-emerald-950 leading-none">{fmt(b.convertible)} <span className="text-base font-bold">coins</span></p></div></div>
      <div className="grid grid-cols-4 gap-2 text-center">{([['Total', b.balance], ['Purchased', b.purchased], ['Earned', b.earned], ['Other', b.other]] as [string, number][]).map(([k, v]) => (
        <div key={k} className="bg-white rounded-2xl border border-slate-100 py-2"><p className="text-[10px] font-bold text-slate-500">{k}</p><p className="text-sm font-black text-slate-900">{fmt(v)}</p></div>))}</div>
      <Card className="flex gap-3 bg-blue-50 border-blue-100"><Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold text-blue-900 space-y-1"><p>Only eligible earned coins can be withdrawn. Not every coin qualifies.</p>
          <p>{ov.eligible_source_names.length ? <>Coin types currently eligible: <b>{ov.eligible_source_names.join(', ')}</b>.</> : 'No coin type is eligible for withdrawal yet.'}</p>
          <p>Purchased coins, package bonuses, coins added by the team and practice credits can never be withdrawn.</p></div></Card>
      {ov.waiting_for_membership && <NotLive title="Your new membership is warming up">Withdrawal benefits of a new membership start {ov.wait_hours} hours after it begins. Until then your earlier category applies.</NotLive>}
      {!ov.available && <NotLive title="Withdrawals are not available">{ov.reason?.message || 'Please check back soon.'}</NotLive>}
      {ov.available && (<>
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-center">
          <p className="text-xs font-bold text-slate-600 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />Conversion rate · {ov.plan.name}</p>
          {rates.length === 0 ? <p className="text-sm font-black text-slate-700">No rate for your coins yet</p> : rates.length === 1 || !best ? <p className="text-lg font-black text-emerald-900">{fmt(rates[0].coins_per_unit)} coins = {naira(rates[0].naira_per_unit)}</p>
            : <div className="text-xs font-bold text-slate-700 space-y-0.5">{rates.map(r => <p key={r.source}>{r.name}: <b className="text-emerald-900">{fmt(r.coins_per_unit)} coins = {naira(r.naira_per_unit)}</b></p>)}<p className="text-[10px] text-slate-500">Coins with the best rate are converted first.</p></div>}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">{([['Minimum per withdrawal', naira(ov.limits.min)], ['Maximum per withdrawal', naira(ov.limits.max)], ['Left today', naira(ov.remaining.today)], ['Left this month', naira(ov.remaining.month)]] as [string, string][]).map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-slate-100 px-3 py-2"><p className="text-[10px] font-bold text-slate-500">{k}</p><p className="font-black text-slate-900">{v}</p></div>))}</div>
        <div><p className="text-sm font-black text-emerald-950 mb-1.5">Coins to convert</p>
          <div className="flex gap-2"><input value={text} onChange={e => setText(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" aria-label="Coins to convert" className={inputCls} />
            <button type="button" onClick={() => setText(String(b.convertible))} className="shrink-0 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700">Max</button></div></div>
        <div className="rounded-2xl bg-lime-100 border border-lime-200 p-3 flex items-center gap-3"><span className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xl font-black">₦</span>
          <div><p className="text-xs font-bold text-emerald-900">You will receive (estimate)</p><p className="text-3xl font-black text-emerald-950 leading-none">{naira(est?.naira || 0)}</p><p className="text-[10px] font-semibold text-slate-500">The exact amount is confirmed on the next screen.</p></div></div>
        {err && <p className="text-xs font-bold text-red-600" role="alert">{err}</p>}
        <PrimaryButton onClick={goConfirm} disabled={busyQ || coins <= 0} className="w-full">{busyQ ? 'Checking...' : 'Continue'}</PrimaryButton>
      </>)}
      <div><div className="flex items-center justify-between"><SectionTitle>Withdrawal History</SectionTitle></div>
        <Card>{hist.length === 0 ? <p className="text-xs font-semibold text-slate-500 py-2">No withdrawals yet.</p> : <ul className="divide-y divide-slate-100">{hist.map(h => (
          <li key={h.id} className="flex items-center justify-between gap-2 py-2.5"><div><p className="text-sm font-black text-slate-900">{fmt(h.coins)} coins → {naira(h.naira)}</p><p className="text-[10px] text-slate-400 font-semibold">{when(h.created_at)}{h.reason ? ` · ${h.reason}` : ''}</p></div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${CHIP[h.status] || CHIP.refunded}`}>{label(h.status)}</span></li>))}</ul>}</Card></div>
    </div>
  );
}
