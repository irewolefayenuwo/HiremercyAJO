import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, Wifi, Zap, Tv, ChevronRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, EmptyState, NotLive, Pill, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira } from './ui';
import { AIRTIME_NETWORKS, QUICK_AMOUNTS, TV_PROVIDERS } from './config';
import { loadPublicSettings, newIdempotencyKey, STATUS_LABEL, vtuCall, type PublicSettings } from './vtuApi';
import { BettingIcon } from './BettingIcon';
import { BettingScreen } from './BettingScreen';
import { loadBettingPublic, type BettingPublic } from './bettingApi';

type ServiceId = 'airtime' | 'data' | 'electricity' | 'dstv' | 'gotv' | 'startimes';
const SERVICES: { id: ServiceId; kind: 'airtime' | 'data' | 'electricity' | 'tv'; label: string; sub: string; icon: any; color: string }[] = [
  { id: 'airtime', kind: 'airtime', label: 'Airtime', sub: 'Buy airtime', icon: Smartphone, color: 'from-emerald-500 to-emerald-700' },
  { id: 'data', kind: 'data', label: 'Data Bundles', sub: 'Stay connected', icon: Wifi, color: 'from-sky-500 to-blue-700' },
  { id: 'electricity', kind: 'electricity', label: 'Electricity', sub: 'Pay your bill', icon: Zap, color: 'from-amber-400 to-orange-600' },
  { id: 'dstv', kind: 'tv', label: 'DStv', sub: 'Renew package', icon: Tv, color: 'from-sky-600 to-blue-800' },
  { id: 'gotv', kind: 'tv', label: 'GOtv', sub: 'Renew package', icon: Tv, color: 'from-lime-500 to-green-700' },
  { id: 'startimes', kind: 'tv', label: 'StarTimes', sub: 'Renew package', icon: Tv, color: 'from-orange-500 to-amber-700' }
];
// VTU.ng documented electricity service_ids
const DISCOS = [
  ['ikeja-electric', 'Ikeja Electric (IKEDC)'], ['eko-electric', 'Eko Electricity (EKEDC)'], ['abuja-electric', 'Abuja Electricity (AEDC)'],
  ['ibadan-electric', 'Ibadan Electricity (IBEDC)'], ['enugu-electric', 'Enugu Electricity (EEDC)'], ['kano-electric', 'Kano Electricity (KEDCO)'],
  ['portharcourt-electric', 'Port Harcourt Electricity (PHED)'], ['benin-electric', 'Benin Electricity (BEDC)'], ['kaduna-electric', 'Kaduna Electric'],
  ['jos-electric', 'Jos Electricity (JED)'], ['aba-electric', 'Aba Power'], ['yola-electric', 'Yola Electricity (YEDC)']
] as const;

export const normalizeNgPhone = (raw: string): string | null => {
  let d = raw.replace(/[^\d]/g, '');
  if (d.startsWith('234') && d.length === 13) d = '0' + d.slice(3);
  return /^0[789][01]\d{8}$/.test(d) ? d : null;
};

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (<div><label className="block text-xs font-bold text-emerald-800 mb-1.5">{label}</label>{children}
    {error ? <p className="text-[11px] text-red-600 font-semibold mt-1">{error}</p> : hint ? <p className="text-[11px] text-slate-400 font-medium mt-1">{hint}</p> : null}</div>);
}

interface Plan { variation_id: string; label: string; list_price: number; from_price: number }
interface Quote { quote: { selling_price: number; discount_amount: number; amount_charged: number; cashback_expected: number }; balance: number; plan_label: string | null; verified_name: string | null; recipient: string }
interface OrderRow { id: string; reference: string; service: string; provider_service: string; recipient: string; plan_label: string | null; verified_name: string | null; amount_charged: number; cashback_amount: number; status: string; failure_reason: string | null; token: string | null; units: string | null; created_at: string }

function OrderResult({ order, onDone }: { order: OrderRow; onDone: () => void }) {
  const st = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
  const open = order.status === 'pending' || order.status === 'processing';
  return (
    <div className="space-y-4 fade-in max-w-xl mx-auto">
      <ScreenHeader title={open ? 'Order received' : st.text} subtitle={`${order.service} · ${order.reference}`} />
      <Card>
        <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">{naira(order.amount_charged)} · {order.recipient}</p><Pill tone={st.tone}>{st.text}</Pill></div>
        {open && <p className="text-xs text-slate-600 font-medium mt-3">We are waiting for the provider to confirm. Your wallet has been charged, and it will be refunded automatically if the purchase fails. Please do not buy again - check your order history.</p>}
        {order.status === 'successful' && <p className="text-xs text-emerald-800 font-semibold mt-3">The provider confirmed this purchase.{Number(order.cashback_amount) > 0 ? ` You earned ${naira(order.cashback_amount)} cashback.` : ''}</p>}
        {order.status === 'refunded' && <p className="text-xs text-slate-700 font-semibold mt-3">This purchase did not go through and {naira(order.amount_charged)} was returned to your wallet.</p>}
        {order.token && (
          <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Electricity token</p>
            <p className="text-lg font-black text-slate-900 tracking-wider break-all">{order.token}</p>{order.units && <p className="text-[11px] text-slate-600 font-medium">Units: {order.units}</p>}</div>
        )}
      </Card>
      <PrimaryButton onClick={onDone} className="w-full">Done</PrimaryButton>
    </div>
  );
}

function BillForm({ service, onBack, defaultPhone, onChanged }: { service: ServiceId; onBack: () => void; defaultPhone: string; onChanged: () => void }) {
  const def = SERVICES.find(s => s.id === service)!;
  const kind = def.kind;
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState(defaultPhone);
  const [amount, setAmount] = useState('');
  const [disco, setDisco] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [recipient, setRecipient] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [variation, setVariation] = useState('');
  const [subType, setSubType] = useState<'change' | 'renew'>('change');
  const [verified, setVerified] = useState<any>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const idem = useRef(newIdempotencyKey());
  const providerId = kind === 'electricity' ? disco : kind === 'tv' ? service : network;

  // plans for data / TV
  useEffect(() => {
    setPlans([]); setVariation('');
    if ((kind === 'data' || kind === 'tv') && providerId) {
      let alive = true;
      vtuCall<{ plans: Plan[] }>({ action: 'products', service: kind, provider_service: providerId }).then(r => {
        if (!alive) return;
        if (r.ok) setPlans((r.data as any).plans || []); else setErr(r.message || 'Could not load plans.');
      });
      return () => { alive = false; };
    }
  }, [kind, providerId]);

  const payload = () => ({
    service: kind, provider_service: providerId,
    recipient: kind === 'airtime' || kind === 'data' ? phone : recipient,
    amount: kind === 'airtime' || kind === 'electricity' ? Number(amount) : undefined,
    variation_id: kind === 'data' || kind === 'tv' ? variation : undefined,
    meter_type: kind === 'electricity' ? meterType : undefined,
    subscription_type: kind === 'tv' ? subType : undefined
  });

  const review = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if ((kind === 'airtime' || kind === 'data') && (!network || !normalizeNgPhone(phone))) { setErr('Choose a network and enter a valid phone number.'); return; }
    if (kind === 'airtime' && !(Number(amount) >= 50)) { setErr('Enter an amount of at least ₦50.'); return; }
    if (kind === 'data' && !variation) { setErr('Choose a data plan.'); return; }
    if (kind === 'electricity' && (!disco || !/^\d{6,20}$/.test(recipient.replace(/\s/g, '')) || !(Number(amount) > 0))) { setErr('Choose your company, enter the meter number and an amount.'); return; }
    if (kind === 'tv' && (!/^\d{6,15}$/.test(recipient.replace(/\s/g, '')) || !variation)) { setErr('Enter your smartcard number and choose a package.'); return; }
    setBusy(true);
    if (kind === 'electricity' || kind === 'tv') {
      const v = await vtuCall({ action: 'verify', ...payload() });
      if (!v.ok) { setBusy(false); setErr(v.message || 'Could not verify.'); return; }
      setVerified(v.data);
    }
    const q = await vtuCall<Quote>({ action: 'quote', ...payload() });
    setBusy(false);
    if (!q.ok) { setErr(q.message || 'Could not price this order.'); return; }
    setQuote(q.data as any); setStep('review');
  };

  const pay = async () => {
    if (!quote) return;
    setBusy(true); setErr('');
    const r = await vtuCall<{ order: OrderRow }>({ action: 'purchase', idempotency_key: idem.current, ...payload() });
    setBusy(false);
    if (!r.ok) {
      // a network failure may still have created an order: keep the same key so a retry cannot double-charge
      setErr(r.message || 'Purchase failed.'); onChanged(); return;
    }
    setOrder((r.data as any).order); onChanged();
  };

  if (order) return <OrderResult order={order} onDone={onBack} />;

  if (step === 'review' && quote) {
    const q = quote.quote;
    const rows: [string, string][] = [['Service', def.label]];
    if (providerId) rows.push([kind === 'electricity' ? 'Company' : 'Provider', DISCOS.find(d => d[0] === providerId)?.[1] || providerId.toUpperCase()]);
    rows.push([kind === 'electricity' ? 'Meter number' : kind === 'tv' ? 'Smartcard / IUC' : 'Phone number', quote.recipient]);
    if (quote.verified_name) rows.push(['Name on account', quote.verified_name]);
    if (quote.plan_label) rows.push(['Plan', quote.plan_label]);
    rows.push(['Price', naira(q.selling_price)]);
    if (q.discount_amount > 0) rows.push(['Discount', `-${naira(q.discount_amount)}`]);
    rows.push(['You pay', naira(q.amount_charged)]);
    if (q.cashback_expected > 0) rows.push(['Cashback after success', naira(q.cashback_expected)]);
    rows.push(['Wallet balance', naira(quote.balance)]);
    const short = quote.balance < q.amount_charged;
    return (
      <div className="space-y-4 fade-in max-w-xl mx-auto">
        <ScreenHeader title="Review order" subtitle={def.label} onBack={() => setStep('form')} />
        <Card><dl className="divide-y divide-slate-100">{rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500 font-semibold">{k}</dt><dd className="text-slate-900 font-bold text-right break-words">{v}</dd></div>))}</dl></Card>
        {short && <NotLive title="Wallet balance is too low">Add money to your wallet first, then come back to complete this order.</NotLive>}
        {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton onClick={() => setStep('form')} disabled={busy}>Edit</SecondaryButton>
          <PrimaryButton onClick={pay} disabled={busy || short}>{busy ? 'Processing...' : `Pay ${naira(q.amount_charged)}`}</PrimaryButton>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Your wallet is charged once. If the provider cannot deliver, the money returns to your wallet.</p>
      </div>
    );
  }

  const tv = TV_PROVIDERS.find(t => t.id === service);
  return (
    <div className="space-y-4 fade-in max-w-xl mx-auto">
      <ScreenHeader title={def.label} subtitle={def.sub} onBack={onBack} />
      <form className="space-y-4" onSubmit={review}>
        <Card className="space-y-4">
          {(kind === 'airtime' || kind === 'data') && (<>
            <Field label="Network"><div className="grid grid-cols-4 gap-2">
              {AIRTIME_NETWORKS.map(n => (
                <button key={n.id} type="button" onClick={() => setNetwork(n.id)} aria-pressed={network === n.id}
                  className={`rounded-2xl border-2 py-2.5 flex flex-col items-center gap-1 transition ${network === n.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black ${n.color}`}>{n.name.slice(0, 3).toUpperCase()}</span>
                  <span className="text-[10px] font-bold text-slate-700">{n.name}</span></button>))}
            </div></Field>
            <Field label="Phone number" hint="Accepts 080..., +234... or 234..."><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className={inputCls} /></Field>
          </>)}
          {kind === 'airtime' && (
            <Field label="Amount (₦)"><div className="flex flex-wrap gap-2 mb-2">{QUICK_AMOUNTS.map(a => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${amount === String(a) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-200'}`}>{naira(a)}</button>))}</div>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Enter amount" className={inputCls} /></Field>)}
          {kind === 'data' && (
            <Field label="Data plan" hint={network ? 'Price shown before any promotion; the final price is on the next screen.' : 'Choose a network first.'}>
              <select value={variation} onChange={e => setVariation(e.target.value)} className={inputCls} disabled={!network}>
                <option value="">{network && plans.length === 0 ? 'Loading plans...' : 'Select a plan'}</option>
                {plans.map(p => <option key={p.variation_id} value={p.variation_id}>{p.label} - {naira(p.from_price)}</option>)}</select></Field>)}
          {kind === 'electricity' && (<>
            <Field label="Distribution company"><select value={disco} onChange={e => setDisco(e.target.value)} className={inputCls}>
              <option value="">Select your company</option>{DISCOS.map(d => <option key={d[0]} value={d[0]}>{d[1]}</option>)}</select></Field>
            <Field label="Meter type"><div className="grid grid-cols-2 gap-2">{(['prepaid', 'postpaid'] as const).map(t => (
              <button key={t} type="button" onClick={() => setMeterType(t)} aria-pressed={meterType === t}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 capitalize transition ${meterType === t ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>{t}</button>))}</div></Field>
            <Field label="Meter number"><input value={recipient} onChange={e => setRecipient(e.target.value.replace(/[^\d\s]/g, ''))} inputMode="numeric" className={inputCls} /></Field>
            <Field label="Amount (₦)"><input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} /></Field>
          </>)}
          {kind === 'tv' && tv && (<>
            <div className={`rounded-2xl bg-gradient-to-br ${tv.color} text-white p-4 flex items-center gap-3`}><Tv className="w-7 h-7" /><p className="text-lg font-black">{tv.name}</p></div>
            <Field label="Smartcard / IUC number"><input value={recipient} onChange={e => setRecipient(e.target.value.replace(/[^\d\s]/g, ''))} inputMode="numeric" className={inputCls} /></Field>
            {(service === 'dstv' || service === 'gotv') && (
              <Field label="What would you like to do?"><div className="grid grid-cols-2 gap-2">{(['change', 'renew'] as const).map(t => (
                <button key={t} type="button" onClick={() => setSubType(t)} aria-pressed={subType === t}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${subType === t ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>{t === 'change' ? 'Change package' : 'Renew current'}</button>))}</div></Field>)}
            <Field label="Package"><select value={variation} onChange={e => setVariation(e.target.value)} className={inputCls}>
              <option value="">{plans.length === 0 ? 'Loading packages...' : 'Select a package'}</option>
              {plans.map(p => <option key={p.variation_id} value={p.variation_id}>{p.label} - {naira(p.from_price)}</option>)}</select></Field>
          </>)}
        </Card>
        {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">{busy ? 'Checking...' : 'Review order'}</PrimaryButton>
      </form>
    </div>
  );
}

export function BillsScreen({ defaultPhone }: { defaultPhone: string }) {
  // The Home quick-service buttons pass the chosen service through sessionStorage (one use).
  const [service, setService] = useState<ServiceId | null>(() => {
    try {
      const v = sessionStorage.getItem('hm_bills_service'); sessionStorage.removeItem('hm_bills_service');
      if (v === 'airtime' || v === 'data' || v === 'electricity') return v as ServiceId;
      if (v === 'tv') return 'dstv';
    } catch { /* ignore */ }
    return null;
  });
  const [cfg, setCfg] = useState<PublicSettings | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [showBetting, setShowBetting] = useState(false);
  const [bet, setBet] = useState<BettingPublic | null | undefined>(undefined);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase.from('vtu_orders')
      .select('id, reference, service, provider_service, recipient, plan_label, verified_name, amount_charged, cashback_amount, status, failure_reason, token, units, created_at')
      .order('created_at', { ascending: false }).limit(15);
    setOrders(error ? null : (data || []) as OrderRow[]);
  }, []);
  useEffect(() => { loadPublicSettings().then(setCfg); loadOrders(); loadBettingPublic().then(setBet); }, [loadOrders]);

  const recheck = async (id: string) => { setRefreshing(id); await vtuCall({ action: 'status', order_id: id }); await loadOrders(); setRefreshing(null); };
  const enabled = (kind: string) => !!cfg?.provider_enabled && !!cfg.services?.[kind]?.enabled;

  if (service) return <BillForm service={service} onBack={() => { setService(null); loadOrders(); }} defaultPhone={defaultPhone} onChanged={loadOrders} />;
  if (showBetting) return <BettingScreen onBack={() => { setShowBetting(false); loadOrders(); }} onChanged={loadOrders} />;
  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <ScreenHeader title="Bills & Top-up" subtitle="Pay from your wallet balance" pose="point" tone="blue" />
      {cfg === null && <NotLive title="Bill payments are not switched on yet">Purchases stay off until HireMercyAJO activates them.</NotLive>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SERVICES.map(s => {
          const Icon = s.icon; const on = enabled(s.kind);
          return (
            <button key={s.id} type="button" disabled={!on} onClick={() => setService(s.id)}
              className="text-left bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 transition hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
              <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-sm`}><Icon className="w-6 h-6" /></span>
              <p className="text-sm font-extrabold text-emerald-950 mt-3">{s.label}</p>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">{on ? s.sub : 'Not available yet'} {on && <ChevronRight className="w-3 h-3" />}</p>
            </button>);
        })}
        <button type="button" disabled={!bet?.enabled} onClick={() => setShowBetting(true)}
          className="text-left bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 transition hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
          <BettingIcon animate={!!bet?.enabled} />
          <p className="text-sm font-extrabold text-emerald-950 mt-3">Betting</p>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">{bet?.enabled ? 'Fund your betting account' : 'Not available yet'} {bet?.enabled && <ChevronRight className="w-3 h-3" />}</p>
        </button>
      </div>
      <Card>
        <SectionTitle>Recent bill payments</SectionTitle>
        {orders === null ? <p className="text-xs text-slate-500 font-medium">History is not available yet.</p> : orders.length === 0
          ? <EmptyState pose="shrug" title="No bill payments yet" text="Airtime, data and bill payments you make will be listed here." />
          : <ul className="divide-y divide-slate-100">{orders.map(o => {
            const st = STATUS_LABEL[o.status] || STATUS_LABEL.pending; const open = o.status === 'pending' || o.status === 'processing';
            return (<li key={o.id} className="py-2.5">
              <div className="flex items-center gap-3"><div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 capitalize">{o.service} · {o.plan_label || o.recipient}</p>
                <p className="text-[11px] text-slate-500 font-medium">{new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {naira(o.amount_charged)}</p></div>
                <Pill tone={st.tone}>{st.text}</Pill>
                {open && <button type="button" aria-label="Check status" onClick={() => recheck(o.id)} className="p-1.5 rounded-lg bg-slate-100"><RefreshCw className={`w-3.5 h-3.5 ${refreshing === o.id ? 'animate-spin' : ''}`} /></button>}</div>
              {o.token && <p className="text-[11px] font-bold text-amber-800 mt-1 break-all">Token: {o.token}{o.units ? ` · ${o.units} units` : ''}</p>}
              {o.status === 'refunded' && <p className="text-[11px] text-slate-500 font-medium mt-1">Returned to your wallet.</p>}
            </li>);
          })}</ul>}
      </Card>
      <p className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Purchases are only marked successful when the provider confirms them.</p>
    </div>
  );
}
