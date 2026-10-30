import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { bettingCall } from './bettingApi';

type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const FRIENDLY: Record<string, string> = {
  NO_PROVIDER_READY: 'Test at least one betting company first (press Test on a company below).',
  MASTER_OFF: 'The main VTU.ng switch is off. Turn it on first in Wallet > Services & pricing.',
  NOT_VERIFIED: 'Test this company first.',
  PROVIDER_NOT_SUPPORTED: 'This company needs a confirmed VTU.ng service ID and must be marked as supported.',
  FORBIDDEN: 'Only admins can do this.'
};
const cleanErr = (m?: string) => {
  const hit = (m || '').match(/[A-Z][A-Z_]{5,}/);
  if (hit && FRIENDLY[hit[0]]) return FRIENDLY[hit[0]];
  return (m || 'Failed').slice(0, 140);
};

async function rpc(name: string, args: Record<string, unknown> | undefined, toast: Toast, okMsg?: string) {
  const { data, error } = await supabase.rpc(name, args as any);
  if (error) { toast(cleanErr(error.message), 'error'); return { ok: false as const, data: null }; }
  if (okMsg) toast(okMsg, 'success');
  return { ok: true as const, data };
}

interface Provider {
  id: string; name: string; service_id: string | null; api_supported: boolean; logo_url: string | null; visible: boolean; featured: boolean;
  sort_order: number; min_amount: number | null; max_amount: number | null; info: string | null;
  last_check_status: 'ok' | 'failed' | null; last_check_at: string | null; last_check_note: string | null;
}
interface Overview { testing_mode: boolean; service: any; providers: Provider[] }

export function BettingAdminPanel({ toast }: { toast: Toast }) {
  const [tab, setTab] = useState<'setup' | 'payments'>('setup');
  return (
    <div className="space-y-4" id="admin-betting-panel">
      <div>
        <h3 className="text-lg font-black text-slate-900">Betting Management</h3>
        <p className="text-xs text-slate-500 font-medium">Let customers fund their betting accounts from their wallet.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab('setup')} className={tab === 'setup' ? btn : btn2}>Setup</button>
        <button onClick={() => setTab('payments')} className={tab === 'payments' ? btn : btn2}>Payments &amp; reports</button>
      </div>
      {tab === 'setup' ? <Setup toast={toast} /> : <Payments toast={toast} />}
    </div>
  );
}

function Setup({ toast }: { toast: Toast }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [master, setMaster] = useState<boolean | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await rpc('admin_betting_overview', undefined, toast);
    if (r.ok && r.data) { setOv(r.data as Overview); setFailed(false); } else setFailed(true);
    const { data } = await supabase.rpc('admin_get_vtu_config');
    setMaster((data as any)?.settings?.provider_enabled ?? null);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (failed) return <p className="text-xs text-red-600 font-semibold">Could not load. The betting database update (RUN-F) may not be installed yet.</p>;
  if (!ov) return <p className="text-xs text-slate-500">Loading...</p>;

  const enabled = !!ov.service?.enabled;
  const mode: 'off' | 'test' | 'live' = !enabled ? 'off' : ov.testing_mode ? 'test' : 'live';
  const ready = ov.providers.filter(p => p.visible).length;

  const setMode = async (m: 'off' | 'test' | 'live') => {
    if (m === mode) return;
    if (m === 'live' && !window.confirm('Go LIVE? All customers will see Betting and the companies marked READY.')) return;
    const r = await rpc('admin_betting_set_mode', { p_mode: m }, toast, m === 'off' ? 'Betting is OFF' : m === 'test' ? 'TEST mode: only admins can use Betting' : 'Betting is LIVE for customers');
    if (r.ok) load();
  };

  const note = mode === 'off' ? 'Betting is OFF. Nobody can use it.'
    : mode === 'test' ? 'TEST MODE. Only admins can see and use Betting. Customers cannot see it.'
      : 'LIVE. Customers can see Betting and every company marked READY.';
  const tone = mode === 'live' ? 'border-emerald-400 bg-emerald-50' : mode === 'test' ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50';
  const Step = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={ok ? 'text-emerald-800' : 'text-slate-600'}><b>{ok ? '✓' : '○'}</b> {children}</li>);

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <p className="text-sm font-black text-slate-900">{note}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {([['off', 'OFF'], ['test', 'TEST'], ['live', 'LIVE']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k}
              className={`py-3 rounded-xl text-sm font-black border ${mode === k ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'}`}>{l}</button>))}
        </div>
        <ol className="text-[11px] mt-3 space-y-0.5">
          <Step ok={master === true}>VTU.ng main switch is on {master === false && '(turn it on in Wallet > Services & pricing)'}</Step>
          <Step ok={ready > 0}>At least one company is tested and READY ({ready} ready)</Step>
          <Step ok={mode !== 'off'}>Tap TEST, try a small payment yourself, then tap LIVE</Step>
        </ol>
      </div>

      <div className={box}>
        <p className="text-sm font-black">Betting companies</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Press <b>Test</b> on a company, type a real account ID for it, and press <b>Test now</b>. No money moves. If it works, the company becomes READY and is shown to customers automatically.</p>
      </div>
      {ov.providers.map(p => <ProviderRow key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} toast={toast} reload={load} />)}
      <AddProvider toast={toast} reload={load} />
      <FeesAndLimits ov={ov} toast={toast} reload={load} />
    </div>
  );
}

function Chip({ p }: { p: Provider }) {
  const c = (cls: string, t: string) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cls}`}>{t}</span>;
  if (!p.api_supported) return c('bg-slate-200 text-slate-600', 'NOT AVAILABLE YET');
  if (p.visible && p.last_check_status === 'ok') return c('bg-emerald-600 text-white', 'READY');
  if (p.last_check_status === 'ok') return c('bg-sky-100 text-sky-800', 'TESTED - HIDDEN');
  if (p.last_check_status === 'failed') return c('bg-red-100 text-red-700', 'TEST FAILED');
  return c('bg-amber-100 text-amber-800', 'NOT TESTED');
}

function ProviderRow({ p, open, onToggle, toast, reload }: { p: Provider; open: boolean; onToggle: () => void; toast: Toast; reload: () => void }) {
  const [box1, setBox1] = useState<'test' | 'more' | null>(null);
  const [acct, setAcct] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const mk = (q: Provider) => ({ ...q, min_amount: q.min_amount ?? '', max_amount: q.max_amount ?? '', info: q.info ?? '', logo_url: q.logo_url ?? '', service_id: q.service_id ?? '' });
  const [f, setF] = useState<any>(mk(p));
  useEffect(() => { setF(mk(p)); }, [p]);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const show = open ? box1 : null;

  const test = async () => {
    setBusy(true); setMsg('');
    const r = await bettingCall<{ status: string; note: string; name: string | null }>({ action: 'admin_check_provider', id: p.id, customer_id: acct.trim() });
    setBusy(false);
    if (!r.ok) { setMsg(r.message || 'The test could not run.'); toast(r.message || 'Test failed', 'error'); return; }
    const d: any = r.data;
    if (d.status === 'ok') { setMsg(`It works!${d.name ? ` Account name: ${d.name}.` : ''} ${p.name} is now READY.`); toast(`${p.name} is READY`, 'success'); }
    else { setMsg(`Not working yet. VTU.ng said: ${d.note}. Check the account ID and try again.`); toast(`${p.name} test failed`, 'error'); }
    reload();
  };

  const save = async (patch: Record<string, unknown> = {}, ok?: string) => {
    const g: any = { ...f, ...patch };
    setBusy(true);
    const r = await rpc('admin_betting_save_provider', {
      p_id: p.id, p_name: g.name, p_service_id: String(g.service_id || '').trim() || null, p_api_supported: !!g.api_supported,
      p_logo_url: String(g.logo_url || '').trim() || null, p_visible: !!g.visible, p_featured: !!g.featured, p_sort: Number(g.sort_order) || 0,
      p_min: g.min_amount === '' ? null : Number(g.min_amount), p_max: g.max_amount === '' ? null : Number(g.max_amount), p_info: String(g.info || '').trim() || null
    }, toast, ok ?? `${g.name} saved`);
    setBusy(false); if (r.ok) reload();
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Use a PNG, JPG or WebP image.', 'error'); return; }
    if (file.size > 300 * 1024) { toast('Image must be under 300 KB.', 'error'); return; }
    setBusy(true);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${p.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('betting-logos').upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setBusy(false); toast('Upload failed.', 'error'); return; }
    const { data } = supabase.storage.from('betting-logos').getPublicUrl(path);
    setBusy(false); set('logo_url', data.publicUrl); toast('Logo uploaded. Press Save to keep it.', 'success');
  };

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {p.logo_url ? <img src={p.logo_url} alt="" className="w-9 h-9 rounded-full object-contain border border-slate-200 bg-white" />
          : <span className="w-9 h-9 rounded-full bg-emerald-800 text-white text-[11px] font-black flex items-center justify-center">{p.name.slice(0, 2)}</span>}
        <b className="text-sm">{p.name}</b><Chip p={p} />
        <div className="ml-auto flex gap-2">
          {p.api_supported && <button className={btn} onClick={() => { if (show === 'test') onToggle(); else { if (!open) onToggle(); setBox1('test'); } }}>Test</button>}
          {p.last_check_status === 'ok' && <button className={btn2} disabled={busy} onClick={() => save({ visible: !p.visible }, p.visible ? `${p.name} hidden` : `${p.name} is READY`)}>{p.visible ? 'Hide' : 'Show'}</button>}
          <button className={btn2} onClick={() => { if (show === 'more') onToggle(); else { if (!open) onToggle(); setBox1('more'); } }}>More</button>
        </div>
      </div>

      {show === 'test' && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 space-y-2 text-[11px] font-semibold text-slate-600">
          <p>Type a real {p.name} account ID (usually the phone number or username you use on {p.name}):</p>
          <div className="flex flex-wrap gap-2">
            <input className={inp + ' flex-1 min-w-[10rem]'} inputMode="text" placeholder={`${p.name} account ID`} value={acct} onChange={e => setAcct(e.target.value.replace(/\s/g, ''))} />
            <button className={btn} disabled={busy || acct.trim().length < 3} onClick={test}>{busy ? 'Testing...' : 'Test now'}</button>
          </div>
          {msg && <p className={`font-bold ${msg.startsWith('It works') ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</p>}
          {!msg && p.last_check_note && <p className="font-medium text-slate-500">Last result: {p.last_check_note}</p>}
        </div>)}

      {show === 'more' && (
        <div className="mt-3 space-y-3 text-[11px] font-bold text-slate-600">
          {!p.api_supported && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900 font-semibold">This company is not connected to a VTU.ng service yet. When you confirm one, type its exact service ID, tick &ldquo;Supported&rdquo;, Save, then Test it.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label>Name shown<input className={inp} value={f.name} onChange={e => set('name', e.target.value)} /></label>
            <label>VTU.ng service ID (exact spelling)<input className={inp} value={f.service_id} onChange={e => set('service_id', e.target.value)} /></label>
            <label>Smallest amount ₦ (blank = default)<input className={inp} type="number" min="1" value={f.min_amount} onChange={e => set('min_amount', e.target.value)} /></label>
            <label>Biggest amount ₦ (blank = default)<input className={inp} type="number" min="1" value={f.max_amount} onChange={e => set('max_amount', e.target.value)} /></label>
            <label>Order (lower shows first)<input className={inp} type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} /></label>
            <label>Short note for customers<input className={inp} maxLength={300} value={f.info} onChange={e => set('info', e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.featured} onChange={e => set('featured', e.target.checked)} /> Show in &ldquo;Hot&rdquo;</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.api_supported} onChange={e => set('api_supported', e.target.checked)} /> Supported</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>Logo (PNG/JPG/WebP, under 300 KB)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy} />
            <input className={inp + ' flex-1 min-w-[10rem]'} placeholder="or paste an https:// logo link" value={f.logo_url} onChange={e => set('logo_url', e.target.value)} />
          </div>
          <button className={btn} disabled={busy} onClick={() => save()}>Save {f.name}</button>
        </div>)}
    </div>
  );
}

function AddProvider({ toast, reload }: { toast: Toast; reload: () => void }) {
  const [a, setA] = useState({ id: '', name: '' });
  const [openAdd, setOpenAdd] = useState(false);
  if (!openAdd) return <button className={btn2} onClick={() => setOpenAdd(true)}>+ Add another company</button>;
  return (
    <div className={box}>
      <p className="text-sm font-black mb-2">Add another company</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input className={inp} placeholder="Short code, e.g. new-bet" value={a.id} onChange={e => setA({ ...a, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
        <input className={inp} placeholder="Name shown" value={a.name} onChange={e => setA({ ...a, name: e.target.value })} />
        <button className={btn} disabled={a.id.length < 2 || a.name.trim().length < 2} onClick={async () => {
          const r = await rpc('admin_betting_save_provider', { p_id: a.id, p_name: a.name, p_service_id: null, p_api_supported: false, p_logo_url: null, p_visible: false, p_featured: false, p_sort: 0, p_min: null, p_max: null, p_info: null }, toast, 'Added (hidden). Press More on it to finish setup.');
          if (r.ok) { setA({ id: '', name: '' }); setOpenAdd(false); reload(); }
        }}>Add</button>
      </div>
    </div>
  );
}

function FeesAndLimits({ ov, toast, reload }: { ov: Overview; toast: Toast; reload: () => void }) {
  const [openF, setOpenF] = useState(false);
  const [s, setS] = useState<any>({ ...ov.service });
  useEffect(() => { setS({ ...ov.service }); }, [ov]);
  if (!openF) return <button className={btn2} onClick={() => setOpenF(true)}>Fees and amount limits (optional)</button>;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  return (
    <div className={box}>
      <p className="text-sm font-black">Fees and amount limits</p>
      <p className="text-[11px] text-slate-500 mt-0.5">Your fee is added to what the customer pays and is shown before they confirm. Leave at 0 for no fee.</p>
      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] font-bold text-slate-600">
        {[['fee_fixed', 'Fee ₦ (fixed)'], ['fee_percent', 'Fee % of amount'], ['min_amount', 'Smallest payment ₦'], ['max_amount', 'Biggest payment ₦']].map(([k, l]) => (
          <label key={k}>{l}<input className={inp} type="number" min="0" step="0.01" value={s[k] ?? 0} onChange={e => set(k, e.target.value)} /></label>))}
      </div>
      <p className="text-[11px] text-slate-500 mt-2">Set the smallest and biggest payment to the limits shown in your VTU.ng account.</p>
      <button className={btn + ' mt-3'} onClick={async () => {
        const r = await rpc('admin_vtu_update_service', {
          p_service: 'betting', p_enabled: !!ov.service?.enabled, p_price_basis: s.price_basis || 'list', p_markup_percent: Number(s.markup_percent) || 0, p_markup_fixed: Number(s.markup_fixed) || 0,
          p_fee_percent: Number(s.fee_percent) || 0, p_fee_fixed: Number(s.fee_fixed) || 0, p_min: Number(s.min_amount), p_max: Number(s.max_amount)
        }, toast, 'Saved'); if (r.ok) { setOpenF(false); reload(); }
      }}>Save</button>
    </div>
  );
}

function Payments({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const r = await rpc('admin_list_vtu_orders', { p_service: 'betting', p_status: status || null, p_customer: null, p_from: null, p_to: null, p_limit: 200 }, toast);
    if (r.ok) setRows(r.data || []);
    setLoaded(true);
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  const okRows = rows.filter(o => o.status === 'successful');
  const byProvider = new Map<string, { n: number; amt: number }>();
  for (const o of okRows) { const k = o.plan_label || o.provider_service || 'Unknown'; const c = byProvider.get(k) || { n: 0, amt: 0 }; byProvider.set(k, { n: c.n + 1, amt: c.amt + Number(o.face_amount || 0) }); }
  const stats: [string, string | number, string][] = [
    ['Successful', okRows.length, naira(okRows.reduce((a, o) => a + Number(o.face_amount || 0), 0)) + ' funded'],
    ['In progress', rows.filter(o => ['pending', 'processing'].includes(o.status)).length, 'waiting for provider'],
    ['Refunded / failed', rows.filter(o => ['refunded', 'failed'].includes(o.status)).length, 'returned to wallets'],
    ['Fees earned', naira(okRows.reduce((a, o) => a + Math.max(0, Number(o.amount_charged || 0) - Number(o.face_amount || 0)), 0)), 'on successful payments']
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">{stats.map(([l, v, n]) => (
        <div key={l} className={box}><p className="text-[11px] font-bold text-slate-500">{l}</p><p className="text-lg font-black text-slate-900">{v}</p><p className="text-[10px] text-slate-400">{n}</p></div>))}</div>
      {byProvider.size > 0 && (
        <div className={box}><p className="text-xs font-black mb-1">Successful by company</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-700">{[...byProvider.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([k, v]) => <span key={k}><b>{k}</b> {v.n} · {naira(v.amt)}</span>)}</div></div>)}
      <div className="flex items-end gap-2 text-[11px] font-bold text-slate-600">
        <label className="flex-1">Show<select className={inp} value={status} onChange={e => setStatus(e.target.value)}><option value="">All payments</option>{['pending', 'processing', 'successful', 'failed', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <button className={btn2} onClick={load}>Refresh</button>
      </div>
      <p className="text-[11px] text-slate-500">To re-check or resolve a stuck payment, use Wallet &gt; Orders and filter by &ldquo;betting&rdquo;.</p>
      {loaded && rows.length === 0 && <p className="text-xs text-slate-500">No betting payments yet.</p>}
      {rows.map(o => (
        <div key={o.id} className={`${box} ${o.needs_attention ? 'border-red-300' : ''}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <b>{o.plan_label || o.provider_service}</b><span>{o.customer_name} ({o.customer_phone})</span><span>Account {o.recipient}{o.verified_name ? ` · ${o.verified_name}` : ''}</span>
            <span>Funded {naira(o.face_amount)}</span><span>Paid {naira(o.amount_charged)}</span><span className="font-black uppercase">{o.status}</span>
            {o.needs_attention && <span className="text-red-600 font-black">NEEDS ATTENTION</span>}
            <span className="text-slate-500">{dt(o.created_at)} · {o.reference}</span>
          </div>
        </div>))}
    </div>
  );
}
