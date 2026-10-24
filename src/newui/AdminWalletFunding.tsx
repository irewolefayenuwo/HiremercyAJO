import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

import { AjoWalletAdminCard } from './AjoWalletPay';
type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const btnRed = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50';
const cleanErr = (m?: string) => (m || 'Failed').replace(/^.*?(FORBIDDEN|[A-Z][A-Z_]{5,}).*$/s, '$1').slice(0, 120);

const STATUS_LABEL: Record<string, string> = {
  credited: 'Automatically credited', needs_matching: 'Awaiting customer matching', needs_review: 'Awaiting admin review',
  duplicate: 'Duplicate transaction', rejected: 'Rejected', failed: 'Processing failure'
};
const STATUS_TONE: Record<string, string> = {
  credited: 'bg-emerald-100 text-emerald-800', needs_matching: 'bg-amber-100 text-amber-800', needs_review: 'bg-amber-100 text-amber-800',
  duplicate: 'bg-slate-200 text-slate-700', rejected: 'bg-red-100 text-red-700', failed: 'bg-red-100 text-red-700'
};

interface Settings {
  bank_name: string | null; account_name: string | null; account_number: string | null; description: string | null; ajo_account_number: string | null;
  identify_by: 'account_number' | 'mailbox_folder'; mailbox_email: string | null; imap_folder: string; account_active: boolean; automation_enabled: boolean;
  auto_credit: boolean; validated: boolean; config_version: number; last_check_at: string | null; last_check_status: string | null;
  last_success_at: string | null; last_credit_at: string | null; last_error: string | null; last_error_at: string | null;
}
interface Overview { settings: Settings; ajo_mailbox_set: boolean; job_scheduled: boolean; counts: Record<string, number> }
interface Alert {
  id: string; bank_reference: string | null; amount: number | null; sender_name: string | null; sender_bank: string | null; email_date: string | null; status: string;
  reason: string | null; suggestions: { customer_id: string; name: string; matched_parts: number }[] | null; funding_account: string | null; customer_name: string | null; created_at: string;
}

/** Admin Settings → WALLET ACCOUNT SETUP. Secrets (email passwords) are never shown or stored here; they live in Supabase Edge Function secrets. */
export function WalletFundingAdminPanel({ toast, profiles }: { toast: Toast; profiles?: { id: string; name: string; role: string }[] }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('needs_review');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [parseSubject, setParseSubject] = useState('');
  const [parseText, setParseText] = useState('');
  const [parseOut, setParseOut] = useState<any>(null);
  const [audit, setAudit] = useState<any[] | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_wallet_funding_get');
    if (error || !data) { setState('missing'); return; }
    const o = data as Overview; setOv(o); setState('ready');
    setForm((f: any) => (Object.keys(f).length ? f : {
      bank_name: o.settings.bank_name || '', account_name: o.settings.account_name || '', account_number: o.settings.account_number || '', description: o.settings.description || '',
      ajo_account_number: o.settings.ajo_account_number || '', identify_by: o.settings.identify_by, mailbox_email: o.settings.mailbox_email || '', imap_folder: o.settings.imap_folder || 'INBOX', account_active: o.settings.account_active
    }));
  }, []);
  const loadAlerts = useCallback(async (status: string) => {
    const { data } = await supabase.rpc('admin_wallet_alerts_list', { p_status: status === 'all' ? null : status, p_limit: 50 });
    setAlerts((data || []) as Alert[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (state === 'ready') loadAlerts(tab); }, [state, tab, loadAlerts]);

  if (state === 'loading') return <div className={box}><p className="text-xs text-slate-500 font-semibold">Loading wallet account setup...</p></div>;
  if (state === 'missing' || !ov) return (
    <div className={box}><h3 className="text-lg font-black text-emerald-950">WALLET ACCOUNT SETUP</h3>
      <p className="text-xs text-amber-700 font-semibold mt-1">The wallet funding database files (10 and 11) have not been run yet. Nothing here works until they are installed.</p></div>
  );
  const s = ov.settings;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } finally { setBusy(null); } };

  const save = () => run('save', async () => {
    const { data, error } = await supabase.rpc('admin_wallet_funding_save', { p: form });
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    toast((data as any)?.critical_change ? 'Saved. Account/mailbox changed: automation is paused until you test the connection again.' : 'Saved.', 'success');
    setForm({}); await load();
  });
  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('wallet-email-check', { body: { action, ...extra } });
    if (error) {
      let why = '';
      try { const ctx = (error as any).context; if (ctx && typeof ctx.json === 'function') { const j = await ctx.json(); why = String(j?.error || j?.message || ''); } else if (ctx && typeof ctx.text === 'function') { why = String(await ctx.text()).slice(0, 160); } } catch { /* ignore */ }
      const status = (error as any).context?.status;
      toast(`Wallet email function problem${status ? ` (code ${status})` : ''}: ${why || String(error.message || error).slice(0, 160)}`, 'error');
      return null;
    }
    return data as any;
  };
  const testConn = () => run('test', async () => {
    const r = await call('test_connection');
    if (!r) return;
    toast(r.ok ? 'Mailbox connection works.' : `Connection failed: ${r.message}`, r.ok ? 'success' : 'error'); await load();
  });
  const checkNow = () => run('now', async () => {
    const r = await call('check');
    if (!r) return;
    toast(r.skipped ? `Skipped: ${r.reason}` : r.ok ? `Checked: ${r.new_emails} new email(s), ${r.credited} credited.` : `Problem: ${r.error || r.errors?.[0] || 'see last error'}`, r.ok ? 'success' : 'error');
    await load(); await loadAlerts(tab);
  });
  const toggle = (enabled: boolean, auto?: boolean) => run('toggle', async () => {
    const { error } = await supabase.rpc('admin_wallet_funding_set_automation', { p_enabled: enabled, p_auto_credit: auto ?? null });
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    toast(enabled ? 'Automation is ON (checks every 5 minutes).' : 'Automation is OFF.', 'success'); await load();
  });
  const testParse = () => run('parse', async () => {
    const r = await call('test_parse', { subject: parseSubject, text: parseText });
    if (r) setParseOut(r);
  });
  const credit = (a: Alert) => run('c' + a.id, async () => {
    const cust = pick[a.id] || a.suggestions?.[0]?.customer_id;
    if (!cust) { toast('Choose the customer first.', 'error'); return; }
    if (!window.confirm(`Credit ${naira(a.amount)} to this customer's wallet? Only do this after checking the real bank transaction.`)) return;
    const { error } = await supabase.rpc('admin_wallet_alert_credit', { p_alert: a.id, p_customer: cust, p_bank_reference: refs[a.id] || null, p_note: null });
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    toast('Wallet credited.', 'success'); await load(); await loadAlerts(tab);
  });
  const reject = (a: Alert) => run('r' + a.id, async () => {
    const reason = window.prompt('Reason for rejecting this deposit?');
    if (!reason) return;
    const { error } = await supabase.rpc('admin_wallet_alert_reject', { p_alert: a.id, p_reason: reason });
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    toast('Rejected.', 'success'); await load(); await loadAlerts(tab);
  });
  const showAudit = async () => { const { data } = await supabase.rpc('admin_wallet_funding_audit', { p_limit: 40 }); setAudit((data || []) as any[]); };

  const customers = (profiles || []).filter(p => p.role === 'Customer');
  const canEnable = s.account_active && s.validated && !!s.account_number;
  const statusLine = !s.account_number ? 'Not configured' : !s.account_active ? 'Account inactive' : !s.validated ? 'Needs connection test' : s.automation_enabled ? (s.auto_credit ? 'ON - crediting automatically' : 'ON - review only (no automatic credit)') : 'OFF';
  const tabs = ['needs_review', 'needs_matching', 'failed', 'duplicate', 'rejected', 'credited', 'all'];

  return (
    <div className="space-y-4">
      <AjoWalletAdminCard toast={toast} />
      <div>
        <h3 className="text-lg font-black text-emerald-950">WALLET ACCOUNT SETUP</h3>
        <p className="text-xs text-slate-500 font-medium">The bank account used only for wallet funding (never the Ajo account). Email passwords are never entered here.</p>
      </div>

      <div className={`${box} space-y-3`}>
        <h4 className="text-sm font-black text-slate-800">1. Bank account</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[11px] font-bold text-slate-500">Bank name<input className={inp} value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} /></label>
          <label className="text-[11px] font-bold text-slate-500">Account name<input className={inp} value={form.account_name || ''} onChange={e => set('account_name', e.target.value)} /></label>
          <label className="text-[11px] font-bold text-slate-500">Wallet account number (10 digits)<input className={inp} inputMode="numeric" maxLength={10} value={form.account_number || ''} onChange={e => set('account_number', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="text-[11px] font-bold text-slate-500">Ajo account number (optional - helps recognise Ajo alerts)<input className={inp} inputMode="numeric" maxLength={10} value={form.ajo_account_number || ''} onChange={e => set('ajo_account_number', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="text-[11px] font-bold text-slate-500 sm:col-span-2">Internal note (optional)<input className={inp} value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
        </div>
        <h4 className="text-sm font-black text-slate-800 pt-1">2. How alerts are recognised as wallet deposits</h4>
        <div className="space-y-2 text-xs font-semibold text-slate-700">
          <label className="flex items-start gap-2"><input type="radio" checked={form.identify_by === 'account_number'} onChange={() => set('identify_by', 'account_number')} />
            <span>By the receiving account number shown in the bank email (safest when the email shows it). Use "Test parsing" below with a real alert to confirm.</span></label>
          <label className="flex items-start gap-2"><input type="radio" checked={form.identify_by === 'mailbox_folder'} onChange={() => set('identify_by', 'mailbox_folder')} />
            <span>By a separate Gmail folder/label or a separate mailbox that only receives wallet-account alerts (use this if the email does not show the receiving account).</span></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[11px] font-bold text-slate-500">Gmail folder / label<input className={inp} value={form.imap_folder || ''} onChange={e => set('imap_folder', e.target.value)} placeholder="INBOX" /></label>
          <label className="text-[11px] font-bold text-slate-500">Wallet mailbox (leave empty to use the Ajo mailbox)<input className={inp} value={form.mailbox_email || ''} onChange={e => set('mailbox_email', e.target.value)} placeholder="same as Ajo" /></label>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">If you use a different mailbox, its Gmail app password must be added by you as the Supabase secret <b>WALLET_GMAIL_APP_PASSWORD</b>. It is never typed into this page.</p>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!form.account_active} onChange={e => set('account_active', e.target.checked)} /> Account is Active (customers can see it on their Wallet screen once the connection test has passed)</label>
        <div className="flex flex-wrap gap-2"><button className={btn} disabled={busy === 'save'} onClick={save}>{busy === 'save' ? 'Saving...' : 'Save settings'}</button></div>
        <p className="text-[11px] text-amber-700 font-semibold">Changing the account number, folder or mailbox pauses automation until you test the connection again. History and duplicate protection are never reset.</p>
      </div>

      <div className={`${box} space-y-3`}>
        <h4 className="text-sm font-black text-slate-800">3. Automation</h4>
        <div className="grid sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
          <p>Status: <b>{statusLine}</b></p>
          <p>Connection tested: <b>{s.validated ? 'Yes' : 'No'}</b></p>
          <p>Last check: <b>{dt(s.last_check_at)}</b></p>
          <p>Last successful check: <b>{dt(s.last_success_at)}</b></p>
          <p>Last wallet credit: <b>{dt(s.last_credit_at)}</b></p>
          <p>5-minute schedule: <b>{ov.job_scheduled ? 'running' : 'not scheduled (OFF)'}</b></p>
        </div>
        {s.last_check_status && <p className="text-[11px] text-slate-500 font-medium">Last result: {s.last_check_status}</p>}
        {s.last_error && <p className="text-[11px] text-red-600 font-semibold">Last error ({dt(s.last_error_at)}): {s.last_error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={btn2} disabled={!!busy} onClick={testConn}>{busy === 'test' ? 'Testing...' : 'Test email connection'}</button>
          {!s.automation_enabled
            ? <button className={btn} disabled={!!busy || !canEnable} onClick={() => toggle(true)}>Turn automation ON</button>
            : <button className={btnRed} disabled={!!busy} onClick={() => toggle(false)}>Turn automation OFF</button>}
          <button className={btn2} disabled={!!busy || !s.automation_enabled} onClick={checkNow}>{busy === 'now' ? 'Checking...' : 'Check now'}</button>
        </div>
        {!canEnable && <p className="text-[11px] text-slate-500 font-medium">To switch on: save the account, tick Active, save again, then run "Test email connection".</p>}
        <label className="flex items-start gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={s.auto_credit} disabled={!!busy} onChange={e => toggle(s.automation_enabled, e.target.checked)} />
          <span>Credit wallets automatically. Leave this OFF at first: every deposit then waits in the review list so you can confirm the system reads your emails correctly.</span></label>
        <p className="text-[11px] text-slate-500 font-medium">A successful connection test never turns automation on by itself.</p>
      </div>

      <div className={`${box} space-y-2`}>
        <h4 className="text-sm font-black text-slate-800">4. Test parsing (nothing is saved or credited)</h4>
        <p className="text-[11px] text-slate-500 font-medium">Paste the text of a real wallet-account alert email. Hide nothing that you need checked; personal names may be edited.</p>
        <input className={inp} placeholder="Email subject (optional)" value={parseSubject} onChange={e => setParseSubject(e.target.value)} />
        <textarea className={`${inp} h-28 font-mono`} placeholder="Paste the email text here" value={parseText} onChange={e => setParseText(e.target.value)} />
        <button className={btn2} disabled={!!busy || parseText.trim().length < 20} onClick={testParse}>{busy === 'parse' ? 'Reading...' : 'Test parsing'}</button>
        {parseOut && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-semibold text-slate-700 space-y-1">
            <p>Counts as incoming credit: <b>{parseOut.credit_alert ? 'Yes' : `No (${parseOut.ignored_reason})`}</b></p>
            <p>Amount: <b>{parseOut.amount != null ? naira(parseOut.amount) : 'not found'}</b> · Sender: <b>{parseOut.sender_name || 'not found'}</b> · Bank reference: <b>{parseOut.bank_reference || 'not found'}</b></p>
            <p>Receiving account found in email: <b>{parseOut.recipient_account_found || 'none'}</b>{parseOut.other_account_numbers_found?.length ? ` · other numbers: ${parseOut.other_account_numbers_found.join(', ')}` : ''}</p>
            <p>Which account: <b>{parseOut.account_verdict === 'wallet' ? 'Wallet account ✔' : parseOut.account_verdict === 'ajo' ? 'Ajo account (ignored)' : parseOut.account_verdict === 'other' ? 'Another account (ignored)' : 'Cannot tell (would be ignored, never guessed)'}</b></p>
            <p>Customer match: <b>{parseOut.customer_match || 'n/a'}</b>{parseOut.customer_suggestions?.length ? ` (${parseOut.customer_suggestions.map((c: any) => c.name).join(', ')})` : ''}</p>
            <p>Would credit automatically: <b>{parseOut.would_credit_automatically ? 'Yes' : 'No'}</b></p>
          </div>
        )}
      </div>

      <div className={`${box} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black text-slate-800">5. Wallet deposits</h4>
          <button className={btn2} onClick={() => { load(); loadAlerts(tab); }}>Refresh</button>
        </div>
        <div className="flex flex-wrap gap-1.5">{tabs.map(k => (
          <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${tab === k ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700'}`}>
            {k === 'all' ? 'All' : STATUS_LABEL[k]}{k !== 'all' && ov.counts[k] ? ` (${ov.counts[k]})` : ''}</button>))}</div>
        {alerts.length === 0 ? <p className="text-xs text-slate-500 font-medium">Nothing here.</p> : (
          <ul className="divide-y divide-slate-100">{alerts.map(a => {
            const open = a.status === 'needs_review' || a.status === 'needs_matching' || a.status === 'failed';
            return (
              <li key={a.id} className="py-3 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm text-slate-900">{naira(a.amount)}</b>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_TONE[a.status] || ''}`}>{STATUS_LABEL[a.status] || a.status}</span>
                  <span className="text-[11px] text-slate-500 font-semibold">{dt(a.email_date || a.created_at)}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">From {a.sender_name || '-'} ({a.sender_bank || '-'}) · ref {a.bank_reference || 'none'} · into {a.funding_account || '-'}{a.customer_name ? ` · customer ${a.customer_name}` : ''}</p>
                {a.reason && <p className="text-[11px] text-slate-500 font-medium">{a.reason}</p>}
                {open && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select className={`${inp} max-w-xs`} value={pick[a.id] || a.suggestions?.[0]?.customer_id || ''} onChange={e => setPick(p => ({ ...p, [a.id]: e.target.value }))}>
                      <option value="">Choose customer...</option>
                      {(a.suggestions || []).map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} (suggested)</option>)}
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!a.bank_reference && <input className={`${inp} max-w-[11rem]`} placeholder="Bank reference" value={refs[a.id] || ''} onChange={e => setRefs(r => ({ ...r, [a.id]: e.target.value }))} />}
                    <button className={btn} disabled={!!busy} onClick={() => credit(a)}>Credit wallet</button>
                    <button className={btnRed} disabled={!!busy} onClick={() => reject(a)}>Reject</button>
                  </div>
                )}
              </li>);
          })}</ul>
        )}
        <p className="text-[11px] text-slate-500 font-medium">Only credit a deposit after checking the actual bank transaction. A transfer that was already credited cannot be credited again.</p>
      </div>

      <div className={box}>
        <button className={btn2} onClick={showAudit}>{audit ? 'Reload audit trail' : 'Show audit trail'}</button>
        {audit && <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">{audit.map((r, i) => (
          <li key={i} className="text-[11px] text-slate-600 font-medium">{dt(r.at)} · <b>{r.action}</b>{r.detail?.amount ? ` · ${naira(r.detail.amount)}` : ''}{r.detail?.reason ? ` · ${r.detail.reason}` : ''}</li>))}</ul>}
      </div>
    </div>
  );
}
