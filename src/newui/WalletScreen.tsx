import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Landmark, PiggyBank, ChevronRight, Lock, ShieldCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile, SupportSettings } from '../App';
import { Card, CopyButton, EmptyState, NotLive, PrimaryButton, ScreenHeader, SectionTitle, Pill, naira } from './ui';
import { loadPublicSettings } from './vtuApi';

interface Tx { id: string; reference: string; kind: string; direction: 'credit' | 'debit'; amount: number; balance_after: number; description: string | null; created_at: string }
interface Dep { id: string; reference: string; amount: number; status: 'pending' | 'verified' | 'rejected'; reject_reason: string | null; created_at: string }

const KIND: Record<string, string> = { deposit: 'Deposit', purchase: 'Purchase', refund: 'Refund', cashback: 'Cashback', cashback_reversal: 'Cashback reversed', adjustment: 'Adjustment' };
const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

/**
 * Wallet. Balance and history come only from the database (RLS: own rows, read-only).
 * A deposit "claim" never credits anything: the wallet is credited only after an admin verifies the bank transfer.
 */
export function WalletScreen({ customer, supportDetails, onTab }: { customer: Profile; supportDetails: SupportSettings; onTab: (tab: string) => void }) {
  const [state, setState] = useState<'loading' | 'off' | 'ready'>('loading');
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [sender, setSender] = useState(customer.name || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fund, setFund] = useState<{ bank_name: string; account_name: string; account_number: string; automatic: boolean } | null>(null);
  const [showNotice, setShowNotice] = useState(false);

  const load = useCallback(async () => {
    const [w, t, d, f] = await Promise.all([
      supabase.rpc('get_my_wallet'),
      supabase.from('wallet_transactions').select('id, reference, kind, direction, amount, balance_after, description, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('wallet_deposit_requests').select('id, reference, amount, status, reject_reason, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.rpc('get_wallet_funding_account')
    ]);
    setFund(!f.error && f.data ? (f.data as any) : null);
    if (w.error) { setState('off'); return; }
    setBalance(Number((w.data as any)?.balance || 0));
    setTxs((t.data || []) as Tx[]);
    setDeps((d.data || []) as Dep[]);
    setState('ready');
  }, []);
  useEffect(() => { load(); loadPublicSettings(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 100) { setMsg({ ok: false, text: 'Enter the amount you transferred (minimum ₦100).' }); return; }
    if (!sender.trim()) { setMsg({ ok: false, text: 'Enter the name on the account you sent from.' }); return; }
    setBusy(true);
    const { error } = await supabase.rpc('request_wallet_deposit', { p_amount: a, p_bank: bank, p_sender_name: sender });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message.includes('TOO_MANY_PENDING') ? 'You already have 5 deposits waiting for confirmation.' : 'Could not send your deposit notice. Please try again.' }); return; }
    setMsg({ ok: true, text: 'Deposit notice sent. Your wallet is credited only after HireMercyAJO confirms the transfer in its bank account.' });
    setAmount(''); load();
  };

  // The dedicated wallet account (set by the admin) wins. Only if none is configured do we fall back to the old behaviour.
  const bankRows = fund ? [
    { label: 'Bank name', value: fund.bank_name || '' },
    { label: 'Account name', value: fund.account_name || '' },
    { label: 'Account number', value: fund.account_number || '' }
  ] : [
    { label: 'Bank name', value: supportDetails.admin_bank_name || '' },
    { label: 'Account name', value: supportDetails.admin_account_name || '' },
    { label: 'Account number', value: supportDetails.admin_account_number || '' }
  ];
  const hasBank = bankRows.every(r => r.value);

  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <ScreenHeader title="Wallet" subtitle="Fund once, pay for airtime, data and bills" pose="wave" />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Wallet Balance</p>
          <Pill tone="gold">{state === 'ready' ? 'Active' : state === 'loading' ? '...' : 'Not active yet'}</Pill>
        </div>
        <p className="text-3xl font-black mt-2">{state === 'ready' ? naira(balance) : state === 'loading' ? '...' : 'Not active yet'}</p>
        <p className="text-[11px] text-emerald-100 font-medium mt-1 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Kept separate from Ajo savings, referral earnings and reward points.</p>
      </div>

      {state === 'off' && <NotLive title="Wallet is not switched on yet">Nothing can be deposited or spent until HireMercyAJO turns the wallet on.</NotLive>}

      {state === 'ready' && (
        <>
          <Card>
            <SectionTitle>Add money by bank transfer</SectionTitle>
            {hasBank ? (
              <div className="space-y-2.5">
                {bankRows.map(r => (
                  <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 p-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Landmark className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase text-slate-400">{r.label}</p><p className="text-sm font-bold text-slate-800 break-words">{r.value}</p></div>
                    <CopyButton text={r.value} />
                  </div>
                ))}
              </div>
            ) : <NotLive title="Bank details not set">HireMercyAJO has not added its account details yet. Please contact support.</NotLive>}
            {fund ? (
              <>
                <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[11px] font-semibold text-amber-900">
                  This account is only for wallet funding. Do not use it for Ajo contributions - use Deposit Funds for those.
                </div>
                <ol className="mt-3 space-y-1.5 text-[11px] font-semibold text-slate-600 list-decimal pl-5">
                  <li>Transfer any amount (minimum ₦100) to the account above from your bank app. Use your own account - we match the name on the transfer.</li>
                  <li>{fund.automatic ? 'We detect the transfer automatically, usually within a few minutes. You do not need to submit anything.' : 'We confirm the transfer in our bank account, then add it to your wallet. You do not need to submit anything.'}</li>
                  <li>Open this screen again or tap Refresh to see your new balance.</li>
                </ol>
                <button type="button" onClick={load} className="mt-3 text-xs font-bold text-emerald-800 underline">Refresh balance</button>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => setShowNotice(v => !v)} className="text-xs font-bold text-slate-600 underline">{showNotice ? 'Hide' : 'My transfer has not appeared after 30 minutes'}</button>
                  {showNotice && (
                    <form onSubmit={submit} className="space-y-3 mt-3">
                      <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Amount you transferred (₦)" className={inputCls} />
                      <input value={bank} onChange={e => setBank(e.target.value)} placeholder="Bank you sent from" className={inputCls} />
                      <input value={sender} onChange={e => setSender(e.target.value)} placeholder="Name on the sending account" className={inputCls} />
                      {msg && <p className={`text-[11px] font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
                      <PrimaryButton type="submit" disabled={busy} className="w-full">{busy ? 'Sending...' : 'Tell us about my transfer'}</PrimaryButton>
                      <p className="text-[10px] text-slate-400 font-medium">This only alerts us. Your wallet is credited when the transfer is confirmed in our bank account, and never twice.</p>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <>
            <ol className="mt-4 space-y-1.5 text-[11px] font-semibold text-slate-600 list-decimal pl-5">
              <li>Transfer the amount to the account above from your bank app.</li>
              <li>Fill in the notice below so we can find your transfer.</li>
              <li>Your wallet is credited only after we confirm the money in our bank account.</li>
            </ol>
            <form onSubmit={submit} className="space-y-3 mt-4">
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Amount you transferred (₦)" className={inputCls} />
              <input value={bank} onChange={e => setBank(e.target.value)} placeholder="Bank you sent from" className={inputCls} />
              <input value={sender} onChange={e => setSender(e.target.value)} placeholder="Name on the sending account" className={inputCls} />
              {msg && <p className={`text-[11px] font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
              <PrimaryButton type="submit" disabled={busy || !hasBank} className="w-full">{busy ? 'Sending...' : 'I have made the transfer'}</PrimaryButton>
            </form>
              </>
            )}
          </Card>

          {deps.length > 0 && (
            <Card>
              <SectionTitle>Deposit notices</SectionTitle>
              <ul className="divide-y divide-slate-100">
                {deps.map(d => (
                  <li key={d.id} className="py-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">{naira(d.amount)} <span className="text-slate-400 font-semibold">· {d.reference}</span></p>
                      <p className="text-[11px] text-slate-500 font-medium">{fmt(d.created_at)}{d.status === 'rejected' && d.reject_reason ? ` · ${d.reject_reason}` : ''}</p></div>
                    <Pill tone={d.status === 'verified' ? 'green' : d.status === 'rejected' ? 'red' : 'gold'}>{d.status === 'pending' ? 'Awaiting confirmation' : d.status === 'verified' ? 'Credited' : 'Rejected'}</Pill>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <SectionTitle>Wallet transactions</SectionTitle>
            {txs.length === 0 ? <EmptyState pose="shrug" title="No wallet transactions" text="Confirmed deposits and purchases will be listed here." /> : (
              <ul className="divide-y divide-slate-100">
                {txs.map(t => (
                  <li key={t.id} className="py-2.5 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.direction === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {t.direction === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}</span>
                    <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800 truncate">{KIND[t.kind] || t.kind}{t.description ? ` · ${t.description}` : ''}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{fmt(t.created_at)} · balance {naira(t.balance_after)}</p></div>
                    <p className={`text-sm font-black ${t.direction === 'credit' ? 'text-emerald-800' : 'text-red-600'}`}>{t.direction === 'credit' ? '+' : '-'}{naira(t.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <div className="rounded-3xl bg-gradient-to-r from-amber-400 to-amber-500 p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-white/40 flex items-center justify-center shrink-0"><PiggyBank className="w-5 h-5 text-emerald-950" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-emerald-950">Want to save today?</p>
          <p className="text-[11px] font-semibold text-emerald-950/80">Your Ajo contribution works through Deposit Funds. The wallet never mixes with savings.</p></div>
        <button type="button" onClick={() => onTab('deposit')} className="shrink-0 bg-emerald-950 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1">Deposit <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Only confirmed transfers are ever added to your wallet.</p>
    </div>
  );
}
