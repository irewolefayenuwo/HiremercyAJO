import React, { useCallback, useEffect, useState } from 'react';
import { PiggyBank, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, PrimaryButton, SecondaryButton, naira } from './ui';

interface State { feature_enabled: boolean; auto_available: boolean; wallet_pay_enabled: boolean; auto_enabled: boolean; daily_amount: number; credit: number; balance: number; next_deduction_date: string; skip_sundays: boolean; max_days: number }
interface Quote { days: number; daily_amount: number; credit_used: number; amount: number; balance: number; balance_after: number; enough: boolean }

const ERR: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Your wallet balance is too low. Fund your wallet first. Nothing was deducted.',
  ALREADY_COVERED: 'Your contribution for this is already covered.',
  TRACKER_NOT_UPDATED: 'Your tracker could not take this payment right now (cycle may be complete). Nothing was deducted.',
  WALLET_PAY_OFF: 'Turn on "Pay AJO Contributions Using Wallet" first.',
  FEATURE_OFF: 'Paying AJO from the wallet is not open yet.',
  NO_DAILY_AMOUNT: 'Your daily contribution amount is not set. Please contact support.',
  CONSENT_REQUIRED: 'Please tick the box to agree to automatic deductions.'
};
const friendly = (m?: string) => { const k = Object.keys(ERR).find(x => (m || '').includes(x)); return k ? ERR[k] : 'Something went wrong. Nothing was deducted. Please try again.'; };
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full shrink-0 transition ${on ? 'bg-emerald-600' : 'bg-slate-300'} disabled:opacity-50`}>
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Customer card: wallet-pay switch, optional automatic deduction (with consent), manual pay with a confirm step. All money moves happen in the database. */
export function AjoWalletPay({ onPaid }: { onPaid?: () => void }) {
  const [st, setSt] = useState<State | null>(null);
  const [days, setDays] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [key, setKey] = useState(newKey());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [askConsent, setAskConsent] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('ajo_wallet_state');
    if (!error && data) setSt(data as State);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!st || !st.feature_enabled) return null;

  const setPrefs = async (wallet: boolean, auto: boolean, agreed = false) => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('ajo_wallet_set_prefs', { p_wallet_pay: wallet, p_auto: auto, p_consent: agreed });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: friendly(error.message) }); return; }
    setAskConsent(false); setConsent(false); await load();
  };
  const openQuote = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('ajo_wallet_quote', { p_days: days });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: friendly(error.message) }); return; }
    setKey(newKey()); setQuote(data as Quote);
  };
  const pay = async () => {
    if (!quote || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('ajo_wallet_pay', { p_days: quote.days, p_key: key });
    setBusy(false); setQuote(null);
    if (error) { setMsg({ ok: false, text: friendly(error.message) }); return; }
    setMsg({ ok: true, text: `Paid ${naira((data as any)?.amount ?? quote.amount)} from your wallet. Your tracker is updated.` });
    await load(); onPaid?.();
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><PiggyBank className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-emerald-950 text-[12px]">Pay AJO Contributions Using Wallet</p>
          <p className="text-[10px] text-slate-500 font-medium">Allow your wallet balance to be used for your AJO contributions.</p>
        </div>
        <Switch on={st.wallet_pay_enabled} disabled={busy} label="Pay AJO using wallet" onChange={v => void setPrefs(v, false)} />
      </div>

      {st.wallet_pay_enabled && (
        <>
          <div className="rounded-2xl bg-emerald-50 p-3 flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold text-slate-600" htmlFor="ajo-days">Days to pay</label>
            <select id="ajo-days" value={days} onChange={e => setDays(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white">
              {Array.from({ length: Math.min(st.max_days, 31) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
            </select>
            <PrimaryButton onClick={() => void openQuote()} disabled={busy} className="ml-auto">Pay from Wallet</PrimaryButton>
          </div>

          {st.auto_available && (
            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-black text-emerald-950 text-[12px]">Automatically Deduct My Daily AJO Contribution</p>
                <p className="text-[10px] text-slate-500 font-medium">Daily amount: {naira(st.daily_amount)}{st.auto_enabled ? ` · Next deduction: ${st.next_deduction_date}` : ''}{st.skip_sundays ? ' · Not on Sundays' : ''}</p>
              </div>
              <Switch on={st.auto_enabled} disabled={busy} label="Automatic deduction" onChange={v => (v ? setAskConsent(true) : void setPrefs(true, false))} />
            </div>
          )}
        </>
      )}
      {msg && <p className={`mt-3 text-xs font-bold rounded-xl px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {quote && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-center justify-between"><p className="font-black text-emerald-950">Confirm payment</p><button type="button" aria-label="Close" onClick={() => setQuote(null)}><X className="w-5 h-5" /></button></div>
            {[['Contribution', `${quote.days} day${quote.days > 1 ? 's' : ''} × ${naira(quote.daily_amount)}`], ['Already in your credit', naira(quote.credit_used)], ['Amount to deduct', naira(quote.amount)], ['Wallet balance now', naira(quote.balance)], ['Wallet balance after', naira(quote.balance_after)]].map(([a, b]) => (
              <div key={a} className="flex justify-between text-sm"><span className="text-slate-500 font-medium">{a}</span><span className="font-black text-emerald-950">{b}</span></div>
            ))}
            {!quote.enough && <p className="text-xs font-bold text-red-700 bg-red-50 rounded-xl px-3 py-2">Your wallet is too low. Fund your wallet first.</p>}
            <div className="flex gap-2"><SecondaryButton onClick={() => setQuote(null)} className="flex-1">Cancel</SecondaryButton><PrimaryButton onClick={() => void pay()} disabled={busy || !quote.enough} className="flex-1">{busy ? 'Paying…' : 'Confirm & Pay'}</PrimaryButton></div>
          </div>
        </div>
      )}

      {askConsent && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-3">
            <p className="font-black text-emerald-950">Turn on automatic deduction?</p>
            <p className="text-sm text-slate-600 font-medium">Each day (except Sundays) we will take {naira(st.daily_amount)} from your wallet for your AJO. If your wallet is too low we take nothing and send you a message. You can turn this off at any time.</p>
            <label className="flex items-start gap-2 text-sm font-bold text-emerald-950"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /> I agree to automatic daily deductions from my wallet.</label>
            <div className="flex gap-2"><SecondaryButton onClick={() => { setAskConsent(false); setConsent(false); }} className="flex-1">Cancel</SecondaryButton><PrimaryButton onClick={() => void setPrefs(true, true, consent)} disabled={!consent || busy} className="flex-1">Turn on</PrimaryButton></div>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Admin switches (master on/off, automatic on/off, skip Sundays). */
export function AjoWalletAdminCard({ toast }: { toast: (m: string, t?: 'success' | 'error') => void }) {
  const [s, setS] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const save = async (patch: { p_feature?: boolean; p_auto?: boolean; p_skip_sundays?: boolean }) => {
    const { data, error } = await supabase.rpc('admin_ajo_wallet_settings', patch);
    if (error) { toast(error.message, 'error'); return; }
    setS(data); toast('Saved', 'success');
  };
  useEffect(() => { void (async () => {
    const { data, error } = await supabase.rpc('admin_ajo_wallet_settings', {});
    if (error) setMissing(true); else setS(data);
  })(); }, []);
  if (missing || !s) return null;
  const Row = ({ label, on, k }: { label: string; on: boolean; k: 'p_feature' | 'p_auto' | 'p_skip_sundays' }) => (
    <div className="flex items-center justify-between gap-3 py-2"><span className="text-sm font-bold text-emerald-950">{label}</span><Switch on={on} label={label} onChange={v => void save({ [k]: v })} /></div>
  );
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 mb-4">
      <p className="font-black text-emerald-950">Pay AJO from wallet</p>
      <p className="text-xs text-slate-500 mb-1">Customers choose for themselves; nobody is switched on automatically.</p>
      <Row label="Let customers pay AJO from wallet" on={!!s.feature_enabled} k="p_feature" />
      <Row label="Allow automatic daily deduction (customer must opt in)" on={!!s.auto_enabled} k="p_auto" />
      <Row label="Skip Sundays" on={!!s.skip_sundays} k="p_skip_sundays" />
    </div>
  );
}
