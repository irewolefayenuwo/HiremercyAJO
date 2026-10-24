import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Landmark, PiggyBank, ChevronRight, ShieldCheck, ArrowDownLeft, ArrowUpRight, Eye, EyeOff, Plus, Smartphone, Database, Zap, Gamepad2, Gift, Send, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile, SupportSettings } from '../App';
import { Card, CopyButton, EmptyState, NotLive, PrimaryButton, SectionTitle, Pill, naira } from './ui';
import { AppBand, PalmArt } from './HomeParts';
import { AjoWalletPay } from './AjoWalletPay';
import { loadPublicSettings } from './vtuApi';
import { useHideBalance, MASK } from './useHideBalance';
import type { SectionKey } from './config';

interface Tx { id: string; reference: string; kind: string; direction: 'credit' | 'debit'; amount: number; balance_after: number; description: string | null; created_at: string }
interface Dep { id: string; reference: string; amount: number; status: 'pending' | 'verified' | 'rejected'; reject_reason: string | null; created_at: string }

const KIND: Record<string, string> = { deposit: 'Deposit', purchase: 'Purchase', refund: 'Refund', cashback: 'Cashback', cashback_reversal: 'Cashback reversed', adjustment: 'Adjustment' };
const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

/**
 * Wallet. Balance and history come only from the database (RLS: own rows, read-only).
 * A deposit "claim" never credits anything: the wallet is credited only after an admin verifies the bank transfer.
 */
export function WalletScreen({ customer, supportDetails, onTab, onSection, referralCode, unread = 0 }: { customer: Profile; supportDetails: SupportSettings; onTab: (tab: string) => void; onSection?: (s: SectionKey) => void; referralCode?: string; unread?: number }) {
  const { hidden, toggle } = useHideBalance();
  const [showBank, setShowBank] = useState(false);
  const go = (s: SectionKey) => { if (onSection) onSection(s); };
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
  const [showAll, setShowAll] = useState(false);
  const openBills = (svc: string) => { try { sessionStorage.setItem('hm_bills_service', svc); } catch { /* ignore */ } go('bills'); };

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
      <AppBand name={customer.name} avatarUrl={(customer as any).avatar_url} unread={unread} variant="wallet" />

      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0b7a2d] via-[#0d6b29] to-[#0a5a24] text-white px-3 pt-2.5 pb-2.5 shadow-md">
        <PalmArt className="absolute right-0 bottom-0 w-36 h-28 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center shrink-0 shadow-md"><Wallet className="w-5 h-5" /></span>
            <p className="text-[11px] font-bold whitespace-nowrap">Wallet Balance</p>
            <button type="button" onClick={toggle} aria-pressed={hidden} aria-label={hidden ? 'Show balance' : 'Hide balance'}
              className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition">
              {hidden ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
            </button>
          </div>
          {state === 'ready' && (
            <button type="button" onClick={() => setShowBank(true)}
              className="shrink-0 inline-flex items-center gap-1 bg-white text-emerald-900 text-[11px] font-black px-3 h-[28px] rounded-full active:scale-95 transition"><Plus className="w-3.5 h-3.5" /> Fund Wallet</button>
          )}
        </div>
        <p className="relative text-[31px] leading-none font-black mt-1 tabular-nums">{state === 'ready' ? (hidden ? MASK : `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : state === 'loading' ? '...' : 'Not active yet'}</p>
        <p className="relative text-[11px] text-emerald-50 font-medium mt-1.5">{state === 'ready' ? (hidden ? 'Balance hidden' : 'Available to spend') : ''}</p>
      </div>

      {state === 'ready' && (
        <button type="button" onClick={() => setShowBank(true)}
          className="w-full text-left rounded-[14px] bg-emerald-50 border-[3px] border-white shadow-sm px-2.5 h-[54px] flex items-center gap-2.5">
          <span className="w-[37px] h-[37px] rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0"><Landmark className="w-[18px] h-[18px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[8.5px] font-medium text-slate-600 leading-tight">Linked Account</span>
            <span className="block text-[12.5px] font-black text-emerald-950 truncate leading-tight">{fund?.bank_name || bankRows[0]?.value || 'Bank details'}</span>
            <span className="block text-[8px] font-medium text-slate-500 leading-tight">{hidden ? '**** ****' : (fund?.account_number ? `**** ${String(fund.account_number).slice(-4)}` : 'Tap to view')} &nbsp;|&nbsp; {fund ? 'Main Account' : 'Wallet funding'}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-5 gap-[7px]">
        {([
          { label: 'Send Money', sub: 'To other users', icon: Send, tone: 'bg-green-700', arrow: 'bg-green-600', soon: true, run: () => undefined },
          { label: 'Buy Airtime', sub: 'Recharge now', icon: Smartphone, tone: 'bg-violet-500', arrow: 'bg-violet-500', run: () => openBills('airtime') },
          { label: 'Buy Data', sub: 'Stay connected', icon: Database, tone: 'bg-blue-500', arrow: 'bg-blue-500', run: () => openBills('data') },
          { label: 'Pay Bills', sub: 'Light, TV & more', icon: Zap, tone: 'bg-amber-500', arrow: 'bg-amber-500', run: () => openBills('electricity') },
          { label: 'Play Game', sub: 'Win rewards', icon: Gamepad2, tone: 'bg-rose-500', arrow: 'bg-rose-500', run: () => go('games') }
        ]).map((a: any) => {
          const Icon = a.icon;
          return (
            <button key={a.label} type="button" onClick={a.run} disabled={!!a.soon} className="relative rounded-[12px] bg-white border border-emerald-50 shadow-sm h-[88px] px-0.5 pt-2 flex flex-col items-center gap-[3px] text-center active:scale-95 transition disabled:opacity-80">
              {a.soon && <span className="absolute -top-1.5 right-0.5 bg-amber-400 text-emerald-950 text-[7px] font-black px-1.5 py-[1px] rounded-full">SOON</span>}
              <span className={`w-[30px] h-[30px] rounded-full ${a.tone} text-white flex items-center justify-center shadow-sm`}><Icon className="w-4 h-4" /></span>
              <span className="text-[8.5px] font-black text-slate-900 leading-tight whitespace-nowrap">{a.label}</span>
              <span className="text-[6.5px] font-medium text-slate-500 leading-tight whitespace-nowrap">{a.sub}</span>
              <span className={`w-[14px] h-[14px] rounded-full ${a.arrow} text-white flex items-center justify-center mt-0.5`}><ArrowRight className="w-2 h-2" /></span>
            </button>
          );
        })}
      </div>

      {state === 'off' && <NotLive title="Wallet is not switched on yet">Nothing can be deposited or spent until HireMercyAJO turns the wallet on.</NotLive>}

      {state === 'ready' && (
        <>
          {showBank && (<div className="fixed inset-0 z-[70] bg-black/55 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Linked account details" onClick={e => { if (e.target === e.currentTarget) setShowBank(false); }}>
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-2"><p className="font-black text-emerald-950">Linked Account</p><button type="button" aria-label="Close" onClick={() => setShowBank(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black">✕</button></div>
          <Card>
            <SectionTitle>Bank transfer details</SectionTitle>
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
          </div></div>)}

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
            <SectionTitle action={txs.length > 5 ? <button type="button" onClick={() => setShowAll(v => !v)} className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">{showAll ? 'Show less' : 'View All'} <ChevronRight className="w-3.5 h-3.5" /></button> : undefined}>
              <span className="inline-flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-700" /> Recent Transactions</span>
            </SectionTitle>
            {txs.length === 0 ? <EmptyState pose="shrug" title="No wallet transactions" text="Confirmed deposits and purchases will be listed here." /> : (
              <ul className="divide-y divide-slate-100">
                {(showAll ? txs : txs.slice(0, 5)).map(t => (
                  <li key={t.id} className="py-3 flex items-center gap-3">
                    <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${t.direction === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {t.direction === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}</span>
                    <div className="min-w-0 flex-1"><p className="text-[15px] font-black text-emerald-950 truncate">{t.kind === 'deposit' ? 'Wallet Funding' : (KIND[t.kind] || t.kind)}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">{t.kind === 'deposit' ? 'From Bank Transfer' : (t.description || '')}</p></div>
                    <div className="text-right shrink-0"><p className={`text-base font-black tabular-nums ${t.direction === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>{hidden ? MASK : `${t.direction === 'credit' ? '+' : '-'}${naira(t.amount)}.00`}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{fmt(t.created_at)}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {state === 'ready' && <AjoWalletPay onPaid={() => { void load(); }} />}

      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-3.5 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center shrink-0"><Gift className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">Refer &amp; Earn</p><p className="text-[11px] font-semibold text-emerald-100">Get 10% on every referral{referralCode ? ` · ${referralCode}` : ''}</p></div>
        <button type="button" onClick={() => go('referrals')} className="shrink-0 bg-amber-400 text-emerald-950 text-xs font-black px-3.5 py-2.5 rounded-xl flex items-center gap-1">Get Your Code <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
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
