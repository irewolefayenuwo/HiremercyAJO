import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { vtuCall } from './vtuApi';

type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const cleanErr = (m?: string) => (m || 'Failed').replace(/^.*?(FORBIDDEN|[A-Z_]{6,}).*$/s, '$1').slice(0, 120);

async function rpc(name: string, args: Record<string, unknown> | undefined, toast: Toast, okMsg?: string) {
  const { data, error } = await supabase.rpc(name, args as any);
  if (error) { toast(cleanErr(error.message), 'error'); return { ok: false as const, data: null }; }
  if (okMsg) toast(okMsg, 'success');
  return { ok: true as const, data };
}

export function AdminWalletPanel({ toast }: { toast: Toast }) {
  const [tab, setTab] = useState<'orders' | 'deposits' | 'services' | 'recon'>('orders');
  const tabs = [['orders', 'Orders'], ['deposits', 'Wallet deposits'], ['services', 'Services & pricing'], ['recon', 'Reconciliation']] as const;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-black text-emerald-950">WALLET & BILL PAYMENTS</h3>
        <p className="text-xs text-slate-500 font-medium">Customer wallets, VTU.ng orders, refunds and pricing. Provider credentials are never shown here.</p>
      </div>
      <div className="flex flex-wrap gap-2">{tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tab === k ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700'}`}>{l}</button>))}</div>
      {tab === 'orders' && <Orders toast={toast} />}
      {tab === 'deposits' && <Deposits toast={toast} />}
      {tab === 'services' && <Services toast={toast} />}
      {tab === 'recon' && <Recon toast={toast} />}
    </div>
  );
}

function Orders({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ service: '', status: '', q: '', from: '', to: '' });
  const [open, setOpen] = useState<string | null>(null);
  const [res, setRes] = useState({ outcome: 'failed', reason: '', evidence: '', token: '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await rpc('admin_list_vtu_orders', {
      p_service: f.service || null, p_status: f.status || null, p_customer: f.q || null,
      p_from: f.from ? new Date(f.from).toISOString() : null, p_to: f.to ? new Date(new Date(f.to).getTime() + 86400000).toISOString() : null, p_limit: 200
    }, toast);
    if (r.ok) setRows(r.data || []);
  }, [f, toast]);
  useEffect(() => { load(); }, [load]);

  const requery = async (id?: string) => {
    setBusy(true);
    const r = await vtuCall({ action: id ? 'admin_requery' : 'admin_requery_all', order_id: id });
    setBusy(false);
    toast(r.ok ? `Checked ${((r.data as any)?.results || []).length} order(s) with the provider` : (r.message || 'Failed'), r.ok ? 'success' : 'error');
    load();
  };
  const resolve = async (id: string) => {
    if (!window.confirm(`Mark this order as ${res.outcome === 'success' ? 'SUCCESSFUL (no refund)' : 'FAILED (customer is refunded)'}? This is recorded against your name and cannot be undone.`)) return;
    const r = await rpc('admin_resolve_vtu_order', { p_order: id, p_outcome: res.outcome, p_reason: res.reason, p_evidence: res.evidence, p_token: res.token || null }, toast, 'Order resolved and audited');
    if (r.ok) { setOpen(null); setRes({ outcome: 'failed', reason: '', evidence: '', token: '' }); load(); }
  };
  const balance = async () => {
    const r = await vtuCall({ action: 'admin_balance' });
    toast(r.ok ? `VTU.ng balance: ${naira((r.data as any).balance)}` : (r.message || 'Failed'), r.ok ? 'success' : 'error');
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <select className={inp + ' !w-auto'} value={f.service} onChange={e => setF({ ...f, service: e.target.value })}><option value="">All services</option>{['airtime', 'data', 'electricity', 'tv'].map(s => <option key={s}>{s}</option>)}</select>
        <select className={inp + ' !w-auto'} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">All statuses</option>{['pending', 'processing', 'successful', 'refunded'].map(s => <option key={s}>{s}</option>)}</select>
        <input className={inp + ' !w-44'} placeholder="Customer / phone / ref" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
        <input type="date" className={inp + ' !w-auto'} value={f.from} onChange={e => setF({ ...f, from: e.target.value })} />
        <input type="date" className={inp + ' !w-auto'} value={f.to} onChange={e => setF({ ...f, to: e.target.value })} />
        <button className={btn2} onClick={load}>Refresh</button>
        <button className={btn} disabled={busy} onClick={() => requery()}>Re-check unresolved</button>
        <button className={btn2} onClick={balance}>Check VTU balance</button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-slate-500">No orders match.</p>}
        {rows.map(o => (
          <div key={o.id} className={`${box} ${o.needs_attention ? 'border-red-300' : ''}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <b className="capitalize">{o.service}</b><span>{o.customer_name} ({o.customer_phone})</span><span>{o.recipient}</span>
              <span>Paid {naira(o.amount_charged)}</span><span>Cost {o.provider_cost == null ? '-' : naira(o.provider_cost)}</span>
              <span>Margin {o.gross_margin == null ? '-' : naira(o.gross_margin)}</span>
              <span className="font-black uppercase">{o.status}</span>{o.needs_attention && <span className="text-red-600 font-black">NEEDS ATTENTION</span>}
              <button className={btn2} onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? 'Close' : 'Details'}</button>
            </div>
            {open === o.id && (
              <div className="mt-3 space-y-2 text-xs">
                <p>Ref <b>{o.reference}</b> · Provider order <b>{o.provider_order_id || '-'}</b> · Provider status <b>{o.provider_status || '-'}</b> · Created {dt(o.created_at)} · Last checked {dt(o.last_checked_at)} · Attempts {o.attempts}</p>
                {o.token && <p>Token: <b>{o.token}</b></p>}{o.failure_reason && <p>Reason: {o.failure_reason}</p>}
                <ul className="list-disc pl-5">{(o.events || []).map((e: any, i: number) => <li key={i}>{dt(e.at)} · {e.event}</li>)}</ul>
                {(o.status === 'pending' || o.status === 'processing') && (
                  <div className="border-t pt-3 space-y-2">
                    <button className={btn} disabled={busy} onClick={() => requery(o.id)}>Re-check with provider</button>
                    <p className="font-bold text-slate-700">Manual resolution (only after re-checking, 15+ minutes old, with evidence)</p>
                    <select className={inp} value={res.outcome} onChange={e => setRes({ ...res, outcome: e.target.value })}><option value="failed">Failed - refund customer</option><option value="success">Successful - provider delivered</option></select>
                    <input className={inp} placeholder="Reason (min 15 characters)" value={res.reason} onChange={e => setRes({ ...res, reason: e.target.value })} />
                    <input className={inp} placeholder="Evidence: provider reference / support ticket" value={res.evidence} onChange={e => setRes({ ...res, evidence: e.target.value })} />
                    {res.outcome === 'success' && o.service === 'electricity' && <input className={inp} placeholder="Electricity token" value={res.token} onChange={e => setRes({ ...res, token: e.target.value })} />}
                    <button className={btn} onClick={() => resolve(o.id)}>Apply resolution</button>
                  </div>)}
              </div>)}
          </div>))}
      </div>
    </div>
  );
}

function Deposits({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [ref, setRef] = useState<Record<string, string>>({});
  const load = useCallback(async () => { const r = await rpc('admin_list_wallet_deposits', { p_status: status || null }, toast); if (r.ok) setRows(r.data || []); }, [status, toast]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <select className={inp + ' !w-auto'} value={status} onChange={e => setStatus(e.target.value)}><option value="pending">Pending</option><option value="verified">Credited</option><option value="rejected">Rejected</option><option value="">All</option></select>
      <p className="text-[11px] text-slate-500 font-medium">A claim never credits a wallet. Confirm the money in the company bank statement, then enter that transfer's bank reference. One bank reference can fund only one deposit.</p>
      {rows.length === 0 && <p className="text-xs text-slate-500">Nothing here.</p>}
      {rows.map(d => (
        <div key={d.id} className={box}>
          <p className="text-xs"><b>{naira(d.amount)}</b> · {d.customer_name} ({d.customer_phone}) · from {d.sender_name || '-'} / {d.sender_bank || '-'} · {d.reference} · {dt(d.created_at)} · <b className="uppercase">{d.status}</b>{d.bank_reference ? ` · bank ref ${d.bank_reference}` : ''}</p>
          {d.status === 'pending' && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input className={inp + ' !w-56'} placeholder="Bank statement reference" value={ref[d.id] || ''} onChange={e => setRef({ ...ref, [d.id]: e.target.value })} />
              <button className={btn} onClick={async () => { if (!window.confirm(`Credit ${naira(d.amount)} to ${d.customer_name}'s wallet? Confirm you saw this money in the bank account.`)) return; const r = await rpc('admin_verify_wallet_deposit', { p_id: d.id, p_bank_reference: ref[d.id] || '' }, toast, 'Deposit verified and wallet credited'); if (r.ok) load(); }}>Verify & credit</button>
              <button className={btn2} onClick={async () => { const why = window.prompt('Reason for rejecting this claim?'); if (!why) return; const r = await rpc('admin_reject_wallet_deposit', { p_id: d.id, p_reason: why }, toast, 'Claim rejected'); if (r.ok) load(); }}>Reject</button>
            </div>)}
        </div>))}
    </div>
  );
}

function Services({ toast }: { toast: Toast }) {
  const [cfg, setCfg] = useState<any>(null);
  const load = useCallback(async () => { const r = await rpc('admin_get_vtu_config', undefined, toast); if (r.ok) setCfg(r.data); }, [toast]);
  useEffect(() => { load(); }, [load]);
  if (!cfg) return <p className="text-xs text-slate-500">Loading... (if this stays empty the wallet database has not been installed yet)</p>;
  const setSvc = (i: number, k: string, v: any) => setCfg({ ...cfg, services: cfg.services.map((s: any, j: number) => (j === i ? { ...s, [k]: v } : s)) });
  return (
    <div className="space-y-3">
      <div className={`${box} flex items-center justify-between gap-3`}>
        <div><p className="text-sm font-black">Provider (VTU.ng) master switch</p><p className="text-[11px] text-slate-500">Off by default. Turn on only after the secrets are set and the VTU account is funded.</p></div>
        <button className={cfg.settings.provider_enabled ? btn : btn2} onClick={async () => { const r = await rpc('admin_vtu_set_provider_enabled', { p_enabled: !cfg.settings.provider_enabled }, toast, 'Saved'); if (r.ok) load(); }}>{cfg.settings.provider_enabled ? 'ON - click to turn off' : 'OFF - click to turn on'}</button>
      </div>
      {cfg.services.map((s: any, i: number) => (
        <div key={s.service} className={box}>
          <div className="flex items-center justify-between"><p className="text-sm font-black capitalize">{s.service}</p>
            <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={s.enabled} onChange={e => setSvc(i, 'enabled', e.target.checked)} /> Enabled</label></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] font-bold text-slate-600">
            <label>Price basis<select className={inp} value={s.price_basis} onChange={e => setSvc(i, 'price_basis', e.target.value)}><option value="list">Provider list price</option><option value="cost">Our cost price</option></select></label>
            {[['markup_percent', 'Markup %'], ['markup_fixed', 'Markup ₦'], ['fee_percent', 'Fee %'], ['fee_fixed', 'Fee ₦'], ['min_amount', 'Min ₦'], ['max_amount', 'Max ₦']].map(([k, l]) => (
              <label key={k}>{l}<input className={inp} type="number" min="0" step="0.01" value={s[k]} onChange={e => setSvc(i, k, e.target.value)} /></label>))}
          </div>
          <button className={btn + ' mt-3'} onClick={async () => { const r = await rpc('admin_vtu_update_service', { p_service: s.service, p_enabled: s.enabled, p_price_basis: s.price_basis, p_markup_percent: Number(s.markup_percent), p_markup_fixed: Number(s.markup_fixed), p_fee_percent: Number(s.fee_percent), p_fee_fixed: Number(s.fee_fixed), p_min: Number(s.min_amount), p_max: Number(s.max_amount) }, toast, `${s.service} saved`); if (r.ok) load(); }}>Save {s.service}</button>
        </div>))}
    </div>
  );
}

function Recon({ toast }: { toast: Toast }) {
  const [r, setR] = useState<any>(null);
  useEffect(() => { rpc('admin_wallet_reconciliation', undefined, toast).then(x => x.ok && setR(x.data)); }, [toast]);
  if (!r) return <p className="text-xs text-slate-500">Loading...</p>;
  const item = (l: string, v: any, bad = false) => <div className={`${box} ${bad ? 'border-red-300' : ''}`}><p className="text-[10px] font-bold uppercase text-slate-400">{l}</p><p className="text-lg font-black">{v}</p></div>;
  const mism = (r.mismatched_wallets || []).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {item('Total owed to customers (wallet liability)', naira(r.wallet_liability))}
      {item('Ledger net total', naira(r.ledger_net), Number(r.ledger_net) !== Number(r.wallet_liability))}
      {item('Wallets not matching ledger', mism, mism > 0)}
      {item('Unresolved over 30 min', r.unresolved_over_30min, r.unresolved_over_30min > 0)}
      {item('Orders needing attention', r.needs_attention, r.needs_attention > 0)}
      {item('Deposit claims waiting', r.pending_deposits)}
      {item('Gross margin (successful)', naira(r.gross_margin_total))}
      {item('Unrecovered cashback', naira(r.unrecovered_cashback), Number(r.unrecovered_cashback) > 0)}
      <div className={box}><p className="text-[10px] font-bold uppercase text-slate-400">Orders by status</p><p className="text-xs font-bold">{Object.entries(r.orders_by_status || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'none'}</p></div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function PromotionsPanel({ toast }: { toast: Toast }) {
  const [data, setData] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const blank = { id: '', name: '', promo_type: 'cashback', method: 'percentage', value: '', customer_group: 'both', services: ['all'], min_purchase: '0', max_reward: '', starts_at: '', ends_at: '', is_active: true };
  const [form, setForm] = useState<any>(blank);
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([rpc('admin_list_promotions', undefined, toast), rpc('admin_get_vtu_config', undefined, toast)]);
    if (a.ok) setData(a.data); if (b.ok) setCfg(b.data?.settings);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const SV = ['all', 'airtime', 'data', 'electricity', 'tv'];
  const toggleSvc = (s: string) => {
    let cur: string[] = form.services.includes('all') && s !== 'all' ? [] : [...form.services];
    cur = s === 'all' ? ['all'] : cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    setForm({ ...form, services: cur.length ? cur : ['all'] });
  };
  const save = async () => {
    const v = Number(form.value);
    if (!form.name.trim() || !(v > 0)) { toast('Enter a name and an amount above zero', 'error'); return; }
    const p = { id: form.id || null, name: form.name, promo_type: form.promo_type, method: form.method, value: v, customer_group: form.customer_group, services: form.services,
      min_purchase: Number(form.min_purchase || 0), max_reward: form.max_reward ? Number(form.max_reward) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null, is_active: form.is_active };
    const r = await rpc('admin_save_promotion', { p }, toast, 'Promotion saved');
    if (r.ok) { setForm(blank); load(); }
  };
  const edit = (p: any) => setForm({ id: p.id, name: p.name, promo_type: p.promo_type, method: p.method, value: String(p.value), customer_group: p.customer_group, services: p.services,
    min_purchase: String(p.min_purchase), max_reward: p.max_reward == null ? '' : String(p.max_reward),
    starts_at: p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 16) : '', ends_at: p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : '', is_active: p.is_active });
  const saveMaster = async (patch: any) => {
    const n = { master: cfg.master_promotions_enabled, both: cfg.allow_discount_and_cashback, days: cfg.new_customer_days, ...patch };
    const r = await rpc('admin_set_promotions_master', { p_master: n.master, p_allow_both: n.both, p_new_days: Number(n.days) }, toast, 'Saved'); if (r.ok) load();
  };
  if (!data || !cfg) return <div className={box}><h3 className="text-lg font-black text-emerald-950">CASHBACK & DISCOUNT MANAGEMENT</h3><p className="text-xs text-slate-500 mt-1">Loading... (if this stays empty the wallet database has not been installed yet)</p></div>;
  return (
    <div className="space-y-4">
      <div><h3 className="text-lg font-black text-emerald-950">CASHBACK & DISCOUNT MANAGEMENT</h3>
        <p className="text-xs text-slate-500 font-medium">Discounts reduce what the customer pays. Cashback is credited to the wallet only after the provider confirms the purchase. Changes apply to new purchases only.</p></div>
      <div className={`${box} space-y-3`}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Promotions master switch</p><p className="text-[11px] text-slate-500">Off = no cashback or discount is given, whatever is saved below.</p></div>
          <button className={cfg.master_promotions_enabled ? btn : btn2} onClick={() => saveMaster({ master: !cfg.master_promotions_enabled })}>{cfg.master_promotions_enabled ? 'ON' : 'OFF'}</button></div>
        <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={cfg.allow_discount_and_cashback} onChange={e => saveMaster({ both: e.target.checked })} /> Allow one purchase to receive both a discount and cashback</label>
        <label className="text-xs font-bold flex items-center gap-2">A customer counts as "new" for <input className={inp + ' !w-20'} type="number" min="1" max="365" defaultValue={cfg.new_customer_days} onBlur={e => Number(e.target.value) !== cfg.new_customer_days && saveMaster({ days: e.target.value })} /> days after registering</label>
      </div>

      <div className={`${box} space-y-3`}>
        <p className="text-sm font-black">{form.id ? 'Edit promotion' : 'New promotion'}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-bold text-slate-600">
          <label className="col-span-2 md:col-span-3">Name<input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Type<select className={inp} value={form.promo_type} onChange={e => setForm({ ...form, promo_type: e.target.value })}><option value="cashback">Cashback</option><option value="discount">Discount</option></select></label>
          <label>Method<select className={inp} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label>{form.method === 'percentage' ? 'Percent (%)' : 'Amount (₦)'}<input className={inp} type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></label>
          <label>Customer group<select className={inp} value={form.customer_group} onChange={e => setForm({ ...form, customer_group: e.target.value })}><option value="regular">Regular customers</option><option value="new">New customers</option><option value="both">Both</option></select></label>
          <label>Minimum purchase (₦)<input className={inp} type="number" min="0" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} /></label>
          <label>Maximum reward (₦)<input className={inp} type="number" min="0" placeholder="no cap" value={form.max_reward} onChange={e => setForm({ ...form, max_reward: e.target.value })} /></label>
          <label>Starts<input className={inp} type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label>
          <label>Ends<input className={inp} type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></label>
          <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold">{SV.map(s => <label key={s} className="flex items-center gap-1 capitalize"><input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleSvc(s)} />{s === 'all' ? 'All services' : s}</label>)}</div>
        <p className="text-[11px] text-slate-500">Percentage discounts are capped at 50%. A discount never brings the price below the provider cost when that cost is known. Use separate promotions to give new and regular customers different amounts.</p>
        <div className="flex gap-2"><button className={btn} onClick={save}>Save promotion</button>{form.id && <button className={btn2} onClick={() => setForm(blank)}>Cancel edit</button>}</div>
      </div>

      <div className={`${box} space-y-2`}>
        <p className="text-sm font-black">Promotions</p>
        <p className="text-[11px] text-slate-500">Cashback paid so far: <b>{naira(data.totals.cashback_paid)}</b> · Discounts given (successful orders): <b>{naira(data.totals.discounts_given)}</b></p>
        {data.promotions.length === 0 && <p className="text-xs text-slate-500">No promotions yet.</p>}
        {data.promotions.map((p: any) => (
          <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-t pt-2">
            <b>{p.name}</b><span className="capitalize">{p.promo_type}</span><span>{p.method === 'percentage' ? `${p.value}%` : naira(p.value)}</span><span>{p.customer_group}</span><span>{p.services.join(', ')}</span>
            <span>{p.starts_at ? dt(p.starts_at) : 'now'} → {p.ends_at ? dt(p.ends_at) : 'no end'}</span><b>{p.is_active ? 'ACTIVE' : 'OFF'}</b>
            <button className={btn2} onClick={() => edit(p)}>Edit</button>
            <button className={btn2} onClick={async () => { const r = await rpc('admin_set_promotion_active', { p_id: p.id, p_active: !p.is_active }, toast, 'Saved'); if (r.ok) load(); }}>{p.is_active ? 'Turn off' : 'Turn on'}</button>
          </div>))}
      </div>

      <div className={`${box} space-y-1`}>
        <p className="text-sm font-black">Change history</p>
        {data.history.length === 0 && <p className="text-xs text-slate-500">No changes yet.</p>}
        {data.history.map((h: any) => <p key={h.id} className="text-[11px] text-slate-600">{dt(h.created_at)} · {h.action} · {h.actor_name || 'admin'}{h.new_values?.name ? ` · ${h.new_values.name}` : ''}</p>)}
      </div>
    </div>
  );
}
