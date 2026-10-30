import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Clock, Loader2, Search, ShieldCheck, Star, X } from 'lucide-react';
import { Card, NotLive, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira } from './ui';
import { QUICK_AMOUNTS } from './config';
import { newIdempotencyKey } from './vtuApi';
import { bettingCall, loadBettingPublic, loadFavs, saveFavs, providerLogoUrl, type BettingProvider, type BettingPublic } from './bettingApi';
import { BettingBall } from './BettingIcon';

interface OrderRow {
  id: string; reference: string; service: string; provider_service: string; recipient: string; plan_label: string | null;
  verified_name: string | null; face_amount: number; selling_price: number; amount_charged: number; status: string;
  failure_reason: string | null; created_at: string; completed_at: string | null;
}
interface QuoteResp {
  quote: { selling_price: number; discount_amount: number; amount_charged: number; cashback_expected: number };
  balance: number; plan_label: string | null; recipient: string;
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const dateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (<div><label className="block text-xs font-bold text-emerald-800 mb-1.5">{label}</label>{children}
    {error ? <p className="text-[11px] text-red-600 font-semibold mt-1">{error}</p> : hint ? <p className="text-[11px] text-slate-400 font-medium mt-1">{hint}</p> : null}</div>);
}

/** Company logo with a neat lettered fallback when no logo is set or the image fails to load. */
function Logo({ p, size = 44 }: { p: Pick<BettingProvider, 'name' | 'logo_url' | 'service_id'>; size?: number }) {
  const [bad, setBad] = useState(false);
  const style = { width: size, height: size };
  const src = providerLogoUrl(p.service_id, p.logo_url);
  if (src && !bad) {
    // a tiny image is a "no icon found" placeholder, so use the lettered badge instead
    return <img src={src} alt="" loading="lazy" onError={() => setBad(true)} onLoad={e => { if (e.currentTarget.naturalWidth < 24) setBad(true); }} style={style}
      className="rounded-full object-contain bg-white border border-slate-200 p-1 shrink-0" />;
  }
  return <span style={style} className="rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center text-sm font-black shrink-0" aria-hidden="true">
    {p.name.slice(0, 2)}</span>;
}

function ResultScreen({ order, onBackToList, onTryAgain, onDone, onRefresh, refreshing }: {
  order: OrderRow; onBackToList: () => void; onTryAgain: () => void; onDone: () => void; onRefresh: () => void; refreshing: boolean;
}) {
  const ok = order.status === 'successful';
  const bad = order.status === 'failed' || order.status === 'refunded';
  const tone = ok ? 'from-emerald-900 via-emerald-800 to-emerald-600' : bad ? 'from-red-900 via-red-800 to-red-600' : 'from-amber-700 via-amber-600 to-yellow-500';
  const title = ok ? 'Transaction successful' : bad ? 'Transaction failed' : 'Payment received';
  const sub = ok ? 'Your betting account has been funded.'
    : bad ? 'Your betting account was not funded.'
      : 'We are waiting for the betting company to confirm.';
  return (
    <div className="space-y-4 fade-in max-w-xl mx-auto">
      <div className={`rounded-3xl bg-gradient-to-br ${tone} text-white shadow-md p-6 text-center`} role="status">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          {ok ? <Check className="w-9 h-9" /> : bad ? <X className="w-9 h-9" /> : <Clock className="w-9 h-9" />}
        </div>
        <h2 className="text-xl font-extrabold mt-3">{title}</h2>
        <p className="text-sm text-white/85 font-medium mt-1">{sub}</p>
      </div>
      <Card>
        <dl className="divide-y divide-slate-100">
          {([
            ['Betting company', order.plan_label || order.provider_service],
            ['Account ID', order.recipient],
            ...(order.verified_name ? [['Name on account', order.verified_name]] : []),
            ['Amount', naira(order.face_amount)],
            ['Total paid', naira(order.amount_charged)],
            ['Reference', order.reference],
            ['Date', dateTime(order.created_at)]
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500 font-semibold">{k}</dt><dd className="text-slate-900 font-bold text-right break-all">{v}</dd></div>))}
        </dl>
        {!ok && !bad && <p className="text-xs text-slate-600 font-medium mt-3">Your wallet has been charged, and it is refunded automatically if the payment fails. Please do not pay again for this account. Check the status below or in your history.</p>}
        {order.status === 'refunded' && <p className="text-xs text-slate-700 font-semibold mt-3">{naira(order.amount_charged)} was returned to your wallet.</p>}
        {order.status === 'failed' && <p className="text-xs text-slate-700 font-semibold mt-3">If your wallet was charged, it is refunded automatically. Check your history to confirm.</p>}
      </Card>
      {!ok && !bad && <SecondaryButton onClick={onRefresh} disabled={refreshing} className="w-full">{refreshing ? 'Checking...' : 'Check status'}</SecondaryButton>}
      <div className="grid grid-cols-2 gap-3">
        {bad ? <SecondaryButton onClick={onTryAgain}>Try again</SecondaryButton> : <SecondaryButton onClick={onDone}>View history</SecondaryButton>}
        <PrimaryButton onClick={onBackToList}>Back to Betting</PrimaryButton>
      </div>
    </div>
  );
}

export function BettingScreen({ onBack, onChanged }: { onBack: () => void; onChanged?: () => void }) {
  const [cfg, setCfg] = useState<BettingPublic | null | undefined>(undefined);
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>(() => loadFavs());
  const [prov, setProv] = useState<BettingProvider | null>(null);
  const [acct, setAcct] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const idem = useRef(newIdempotencyKey());

  useEffect(() => { let live = true; loadBettingPublic(true).then(v => { if (live) setCfg(v); }); return () => { live = false; }; }, []);

  const providers = cfg?.providers ?? [];
  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    setFavs(next); saveFavs(next);
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return providers.filter(p => !t || p.name.toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [providers, q]);
  const hot = useMemo(() => providers.filter(p => p.featured), [providers]);
  const favList = useMemo(() => providers.filter(p => favs.includes(p.service_id)), [providers, favs]);
  const groups = useMemo(() => {
    const m = new Map<string, BettingProvider[]>();
    for (const p of filtered) { const k = /^[a-z]/i.test(p.name) ? p.name[0].toUpperCase() : '#'; m.set(k, [...(m.get(k) || []), p]); }
    return [...m.entries()].sort((a, b) => (a[0] === '#' ? -1 : b[0] === '#' ? 1 : a[0].localeCompare(b[0])));
  }, [filtered]);

  const limits = (p: BettingProvider) => ({ min: p.min_amount ?? cfg?.min_amount ?? null, max: p.max_amount ?? cfg?.max_amount ?? null });

  const pick = (p: BettingProvider) => { setProv(p); setStep('form'); setErr(''); setQuote(null); setVerifiedName(null); idem.current = newIdempotencyKey(); };
  const backToList = () => { setProv(null); setOrder(null); setAcct(''); setAmount(''); setStep('form'); setQuote(null); setVerifiedName(null); setErr(''); idem.current = newIdempotencyKey(); };

  const review = async (e: React.FormEvent) => {
    e.preventDefault(); if (!prov || busy) return;
    setErr('');
    const id = acct.trim(); const face = Number(amount); const { min, max } = limits(prov);
    if (!/^[A-Za-z0-9._@-]{3,40}$/.test(id)) { setErr('Enter a valid betting account ID (letters, numbers, . _ @ - only).'); return; }
    if (!Number.isInteger(face) || face <= 0) { setErr('Enter a whole-naira amount.'); return; }
    if (min != null && face < min) { setErr(`The minimum amount is ${naira(min)}.`); return; }
    if (max != null && face > max) { setErr(`The maximum amount is ${naira(max)}.`); return; }
    setBusy(true);
    const v = await bettingCall<{ verified_name: string | null }>({ action: 'verify', provider: prov.service_id, recipient: id });
    if (!v.ok) { setBusy(false); setErr(v.message || 'Could not verify this account.'); return; }
    const qr = await bettingCall<QuoteResp>({ action: 'quote', provider: prov.service_id, recipient: id, amount: face });
    setBusy(false);
    if (!qr.ok || !qr.data) { setErr(qr.message || 'Could not price this payment.'); return; }
    setVerifiedName((v.data as any)?.verified_name ?? null);
    setQuote(qr.data); setStep('review');
  };

  const pay = async () => {
    if (!prov || !quote || paying) return;
    setPaying(true); setErr('');
    const r = await bettingCall<{ order: OrderRow }>({ action: 'purchase', idempotency_key: idem.current, provider: prov.service_id, recipient: acct.trim(), amount: Number(amount) });
    setPaying(false);
    if (!r.ok) {
      // A network failure may still have created an order: keep the same key so a retry cannot charge twice.
      setErr(r.message || 'Payment failed.'); onChanged?.(); return;
    }
    setOrder((r.data as any).order as OrderRow); onChanged?.();
  };

  const refreshStatus = async () => {
    if (!order) return;
    setRefreshing(true);
    const r = await bettingCall<{ order: OrderRow }>({ action: 'status', order_id: order.id });
    setRefreshing(false);
    if (r.ok && r.data) { setOrder((r.data as any).order as OrderRow); onChanged?.(); }
  };

  // ---------- result ----------
  if (order) {
    return <ResultScreen order={order} refreshing={refreshing} onRefresh={refreshStatus} onBackToList={backToList}
      onTryAgain={() => { setOrder(null); setStep('form'); idem.current = newIdempotencyKey(); }} onDone={onBack} />;
  }

  // ---------- processing ----------
  if (paying && prov && quote) {
    return (
      <div className="space-y-4 fade-in max-w-xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600 text-white shadow-md p-8 text-center" role="status" aria-live="polite">
          <Loader2 className="w-12 h-12 mx-auto motion-safe:animate-spin" />
          <h2 className="text-xl font-extrabold mt-4">Processing...</h2>
          <p className="text-sm text-white/85 font-medium mt-1">Please wait while we fund your account. Do not close this screen.</p>
        </div>
        <Card className="flex items-center gap-3"><Logo p={prov} /><div><p className="text-sm font-extrabold text-slate-900">{prov.name}</p><p className="text-xs text-slate-500 font-semibold">{naira(quote.quote.amount_charged)} · {acct.trim()}</p></div></Card>
      </div>
    );
  }

  // ---------- review ----------
  if (prov && step === 'review' && quote) {
    const qt = quote.quote; const face = Number(amount); const fee = Math.round((qt.selling_price - face) * 100) / 100;
    const rows: [string, string][] = [['Betting company', prov.name], ['Account ID', acct.trim()]];
    if (verifiedName) rows.push(['Name on account', verifiedName]);
    rows.push(['Amount', naira(face)]);
    if (fee > 0) rows.push(['Service fee', naira(fee)]);
    if (qt.discount_amount > 0) rows.push(['Discount', `-${naira(qt.discount_amount)}`]);
    rows.push(['Total', naira(qt.amount_charged)], ['Wallet balance', naira(quote.balance)]);
    const short = quote.balance < qt.amount_charged;
    return (
      <div className="space-y-4 fade-in max-w-xl mx-auto">
        <ScreenHeader title="Confirm transaction" subtitle={prov.name} onBack={() => { setStep('form'); setErr(''); }} />
        <Card>
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100"><Logo p={prov} size={48} /><div><p className="text-base font-extrabold text-slate-900">{prov.name}</p><p className="text-xs text-slate-500 font-medium">Fund your betting account</p></div></div>
          <dl className="divide-y divide-slate-100">{rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500 font-semibold">{k}</dt><dd className="text-slate-900 font-bold text-right break-all">{v}</dd></div>))}</dl>
          {!verifiedName && <p className="text-[11px] text-slate-500 font-medium mt-2">{prov.name} confirmed this account exists but did not return a name. Check the account ID above before paying.</p>}
        </Card>
        {short && <NotLive title="Wallet balance is too low">Add money to your wallet first, then come back to complete this payment.</NotLive>}
        {err && <p className="text-xs text-red-600 font-semibold" role="alert">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton onClick={() => { setStep('form'); setErr(''); }}>Edit</SecondaryButton>
          <PrimaryButton onClick={pay} disabled={short}>Confirm &amp; pay {naira(qt.amount_charged)}</PrimaryButton>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Your wallet is charged once. If the betting company cannot fund the account, the money returns to your wallet. 18+ only. Please bet responsibly.</p>
      </div>
    );
  }

  // ---------- form ----------
  if (prov) {
    const { min, max } = limits(prov);
    return (
      <div className="space-y-4 fade-in max-w-xl mx-auto">
        <ScreenHeader title={prov.name} subtitle="Fund your betting account" onBack={() => { setProv(null); setErr(''); }} />
        <form className="space-y-4" onSubmit={review}>
          <Card className="space-y-4">
            <div className="flex items-center gap-3"><Logo p={prov} size={52} /><p className="text-lg font-extrabold text-slate-900">{prov.name}</p></div>
            <Field label="Betting account ID or username" hint="We check this account with the betting company before you pay.">
              <input value={acct} onChange={e => setAcct(e.target.value.replace(/\s/g, ''))} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={inputCls} placeholder={`Your ${prov.name} account ID`} />
            </Field>
            <Field label="Amount (₦)">
              <div className="flex flex-wrap gap-2 mb-2">{QUICK_AMOUNTS.map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))} aria-pressed={amount === String(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${amount === String(a) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-200'}`}>{naira(a)}</button>))}</div>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Enter amount" className={inputCls} />
            </Field>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-[11px] font-semibold text-emerald-900 space-y-0.5">
              <p className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Pay from your wallet. Any fee is shown before you confirm.</p>
              {min != null && <p>Minimum amount: {naira(min)}</p>}
              {max != null && <p>Maximum amount: {naira(max)}</p>}
              {prov.info && <p className="font-medium text-emerald-800">{prov.info}</p>}
            </div>
          </Card>
          {err && <p className="text-xs text-red-600 font-semibold" role="alert">{err}</p>}
          <PrimaryButton type="submit" disabled={busy} className="w-full">{busy ? 'Checking account...' : 'Continue'}</PrimaryButton>
        </form>
      </div>
    );
  }

  // ---------- provider list ----------
  const tile = (p: BettingProvider) => (
    <button key={p.service_id} type="button" onClick={() => pick(p)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white p-3 active:scale-[0.98] transition">
      <Logo p={p} size={48} /><span className="text-[11px] font-bold text-slate-800 text-center leading-tight">{p.name}</span>
    </button>
  );
  const row = (p: BettingProvider) => (
    <div key={p.service_id} className="flex items-center gap-3 py-2">
      <button type="button" onClick={() => pick(p)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Logo p={p} size={40} /><span className="text-sm font-bold text-slate-900 truncate">{p.name}</span><ChevronRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
      </button>
      <button type="button" onClick={() => toggleFav(p.service_id)} aria-pressed={favs.includes(p.service_id)} aria-label={favs.includes(p.service_id) ? `Remove ${p.name} from favourites` : `Add ${p.name} to favourites`}
        className="p-2 -mr-2 rounded-full"><Star className={`w-5 h-5 ${favs.includes(p.service_id) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>
    </div>
  );

  return (
    <div className="space-y-4 fade-in max-w-xl mx-auto">
      <ScreenHeader title="Betting" subtitle="Fund your betting account from your wallet" onBack={onBack} />
      {cfg === undefined && <Card><p className="text-xs text-slate-500 font-semibold">Loading betting companies...</p></Card>}
      {cfg !== undefined && (!cfg || !cfg.enabled) && <NotLive title="Betting is not available yet">We will let you know when you can fund your betting account here.</NotLive>}
      {cfg?.enabled && (<>
        {cfg.testing && <NotLive title="Test mode">Only admins can see Betting right now. Customers cannot use it yet.</NotLive>}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search betting company" aria-label="Search betting company" className={`${inputCls} pl-10`} />
        </div>
        {providers.length === 0 && <Card className="text-center"><BettingBall className="w-8 h-8 mx-auto text-emerald-700" /><p className="text-sm font-extrabold text-slate-800 mt-2">No betting companies are available yet</p><p className="text-xs text-slate-500 font-medium mt-1">Please check back soon.</p></Card>}
        {!q && favList.length > 0 && (<div><SectionTitle>Favourites</SectionTitle><div className="grid grid-cols-3 gap-2.5">{favList.map(tile)}</div></div>)}
        {!q && hot.length > 0 && (<div><SectionTitle>Hot</SectionTitle><div className="grid grid-cols-3 gap-2.5">{hot.map(tile)}</div></div>)}
        {providers.length > 0 && (
          <div>
            <SectionTitle>{q ? 'Results' : 'All companies'}</SectionTitle>
            {filtered.length === 0 && <p className="text-xs text-slate-500 font-semibold">No company matches &ldquo;{q}&rdquo;.</p>}
            {groups.map(([letter, list]) => (
              <Card key={letter} className="mb-3 !p-3 sm:!p-4">
                <p className="text-[11px] font-black text-emerald-700 mb-1">{letter}</p>
                <div className="divide-y divide-slate-100">{list.map(row)}</div>
              </Card>))}
          </div>)}
        <p className="text-[11px] text-slate-500 font-medium text-center">18+ only. Please bet responsibly.</p>
      </>)}
    </div>
  );
}
