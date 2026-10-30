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
  NOT_VERIFIED: 'Check this provider with a real account ID first. A provider can only be shown to customers after it passes the check.',
  PROVIDER_NOT_SUPPORTED: 'This provider needs a confirmed VTU.ng service ID and must be marked as supported.',
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
  const [tab, setTab] = useState<'settings' | 'providers' | 'transactions'>('settings');
  const tabs = [['settings', 'Settings'], ['providers', 'Providers'], ['transactions', 'Transactions & reports']] as const;
  return (
    <div className="space-y-4" id="admin-betting-panel">
      <div>
        <h3 className="text-lg font-black text-slate-900">Betting Management</h3>
        <p className="text-xs text-slate-500 font-medium">Fund betting accounts through VTU.ng. Off for customers until you switch it on.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? btn : btn2}>{l}</button>))}
      </div>
      {tab === 'settings' && <Settings toast={toast} />}
      {tab === 'providers' && <Providers toast={toast} />}
      {tab === 'transactions' && <Transactions toast={toast} />}
    </div>
  );
}

function useOverview(toast: Toast) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const r = await rpc('admin_betting_overview', undefined, toast);
    if (r.ok && r.data) { setOv(r.data as Overview); setFailed(false); } else setFailed(true);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  return { ov, failed, load };
}

function Settings({ toast }: { toast: Toast }) {
  const { ov, failed, load } = useOverview(toast);
  const [s, setS] = useState<any>(null);
  const [master, setMaster] = useState<boolean | null>(null);
  useEffect(() => { if (ov?.service) setS({ ...ov.service }); }, [ov]);
  useEffect(() => {
    (async () => { const { data } = await supabase.rpc('admin_get_vtu_config'); setMaster(data?.settings?.provider_enabled ?? null); })();
  }, []);
  if (failed) return <p className="text-xs text-red-600 font-semibold">Could not load. The betting database update (RUN-F) may not be installed yet.</p>;
  if (!ov || !s) return <p className="text-xs text-slate-500">Loading...</p>;

  const verified = ov.providers.filter(p => p.last_check_status === 'ok').length;
  const shown = ov.providers.filter(p => p.visible).length;
  const customersCanSee = !!s.enabled && !ov.testing_mode && master === true && shown > 0;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-3">
      <div className={`${box} ${customersCanSee ? 'border-emerald-300' : ''}`}>
        <p className="text-sm font-black">Customer access: {customersCanSee ? 'ON - customers can see Betting' : 'OFF - customers cannot see Betting'}</p>
        <ul className="text-[11px] text-slate-600 mt-1 list-disc pl-5 space-y-0.5">
          <li>VTU.ng master switch (Wallet &gt; Services &amp; pricing): <b>{master === null ? 'unknown' : master ? 'on' : 'off'}</b></li>
          <li>Betting service: <b>{s.enabled ? 'enabled' : 'disabled'}</b></li>
          <li>Test mode: <b>{ov.testing_mode ? 'ON (only admins can use Betting)' : 'off'}</b></li>
          <li>Providers: <b>{shown}</b> shown to customers, <b>{verified}</b> passed the live check</li>
        </ul>
      </div>

      <div className={`${box} flex items-center justify-between gap-3`}>
        <div><p className="text-sm font-black">Test mode</p>
          <p className="text-[11px] text-slate-500">Keep ON while you test with your own admin account. Turn OFF only when you approve customers to use Betting.</p></div>
        <button className={ov.testing_mode ? btn : btn2} onClick={async () => {
          if (ov.testing_mode && !window.confirm('Turn test mode OFF? If the service is enabled and providers are shown, ALL customers will see Betting immediately.')) return;
          const r = await rpc('admin_betting_set_testing', { p_testing: !ov.testing_mode }, toast, 'Saved'); if (r.ok) load();
        }}>{ov.testing_mode ? 'ON - click to turn off' : 'OFF - click to turn on'}</button>
      </div>

      <div className={box}>
        <div className="flex items-center justify-between"><p className="text-sm font-black">Betting service</p>
          <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={!!s.enabled} onChange={e => set('enabled', e.target.checked)} /> Enabled</label></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] font-bold text-slate-600">
          {[['fee_fixed', 'Service fee ₦'], ['fee_percent', 'Service fee %'], ['markup_fixed', 'Markup ₦'], ['markup_percent', 'Markup %'], ['min_amount', 'Min amount ₦'], ['max_amount', 'Max amount ₦']].map(([k, l]) => (
            <label key={k}>{l}<input className={inp} type="number" min="0" step="0.01" value={s[k] ?? 0} onChange={e => set(k, e.target.value)} /></label>))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Min and max are starting values. Set them to the limits shown in your VTU.ng account. You can also set limits for each company on the Providers tab.</p>
        <button className={btn + ' mt-3'} onClick={async () => {
          const r = await rpc('admin_vtu_update_service', {
            p_service: 'betting', p_enabled: !!s.enabled, p_price_basis: s.price_basis || 'list', p_markup_percent: Number(s.markup_percent), p_markup_fixed: Number(s.markup_fixed),
            p_fee_percent: Number(s.fee_percent), p_fee_fixed: Number(s.fee_fixed), p_min: Number(s.min_amount), p_max: Number(s.max_amount)
          }, toast, 'Betting settings saved'); if (r.ok) load();
        }}>Save betting settings</button>
      </div>
    </div>
  );
}

function CheckBadge({ p }: { p: Provider }) {
  if (!p.api_supported) return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-600">NOT SUPPORTED YET</span>;
  if (p.last_check_status === 'ok') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">VERIFIED</span>;
  if (p.last_check_status === 'failed') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">CHECK FAILED</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">NOT CHECKED</span>;
}

function Providers({ toast }: { toast: Toast }) {
  const { ov, failed, load } = useOverview(toast);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState({ id: '', name: '' });
  if (failed) return <p className="text-xs text-red-600 font-semibold">Could not load. The betting database update (RUN-F) may not be installed yet.</p>;
  if (!ov) return <p className="text-xs text-slate-500">Loading...</p>;
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs font-bold text-slate-700">How to switch a provider on</p>
        <ol className="text-[11px] text-slate-600 list-decimal pl-5 mt-1 space-y-0.5">
          <li>Open the provider and enter a <b>real betting account ID</b> for that company, then press <b>Check with VTU.ng</b>. No money moves.</li>
          <li>When it shows VERIFIED, tick <b>Show to customers</b> and save.</li>
          <li>Providers marked NOT SUPPORTED YET (Football.com, MSport) stay off until you confirm an API provider and enter its service ID.</li>
        </ol>
      </div>
      {ov.providers.map(p => (
        <ProviderRow key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} toast={toast} reload={load} />))}
      <div className={box}>
        <p className="text-sm font-black mb-2">Add another provider</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={inp} placeholder="Short code, e.g. new-bet" value={adding.id} onChange={e => setAdding({ ...adding, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
          <input className={inp} placeholder="Display name" value={adding.name} onChange={e => setAdding({ ...adding, name: e.target.value })} />
          <button className={btn} disabled={adding.id.length < 2 || adding.name.trim().length < 2} onClick={async () => {
            const r = await rpc('admin_betting_save_provider', { p_id: adding.id, p_name: adding.name, p_service_id: null, p_api_supported: false, p_logo_url: null, p_visible: false, p_featured: false, p_sort: 0, p_min: null, p_max: null, p_info: null }, toast, 'Provider added (hidden)');
            if (r.ok) { setAdding({ id: '', name: '' }); setOpen(adding.id); load(); }
          }}>Add (hidden)</button>
        </div>
      </div>
    </div>
  );
}

function ProviderRow({ p, open, onToggle, toast, reload }: { p: Provider; open: boolean; onToggle: () => void; toast: Toast; reload: () => void }) {
  const [f, setF] = useState<any>({ ...p, min_amount: p.min_amount ?? '', max_amount: p.max_amount ?? '', info: p.info ?? '', logo_url: p.logo_url ?? '', service_id: p.service_id ?? '' });
  const [acct, setAcct] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { setF({ ...p, min_amount: p.min_amount ?? '', max_amount: p.max_amount ?? '', info: p.info ?? '', logo_url: p.logo_url ?? '', service_id: p.service_id ?? '' }); }, [p]);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  const save = async () => {
    setBusy(true);
    const r = await rpc('admin_betting_save_provider', {
      p_id: p.id, p_name: f.name, p_service_id: String(f.service_id || '').trim() || null, p_api_supported: !!f.api_supported,
      p_logo_url: String(f.logo_url || '').trim() || null, p_visible: !!f.visible, p_featured: !!f.featured, p_sort: Number(f.sort_order) || 0,
      p_min: f.min_amount === '' ? null : Number(f.min_amount), p_max: f.max_amount === '' ? null : Number(f.max_amount), p_info: String(f.info || '').trim() || null
    }, toast, `${f.name} saved`);
    setBusy(false); if (r.ok) reload();
  };

  const check = async () => {
    setBusy(true); setNote('');
    const r = await bettingCall<{ status: string; note: string; name: string | null }>({ action: 'admin_check_provider', id: p.id, customer_id: acct.trim() });
    setBusy(false);
    if (!r.ok) { toast(r.message || 'Check failed', 'error'); setNote(r.message || ''); return; }
    const d: any = r.data;
    setNote(`${d.status === 'ok' ? 'Verified. ' : 'Not verified. '}${d.note}${d.name ? ` Account name: ${d.name}` : ''}`);
    toast(d.status === 'ok' ? `${p.name} verified` : `${p.name} check failed`, d.status === 'ok' ? 'success' : 'error');
    reload();
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Use a PNG, JPG or WebP image.', 'error'); return; }
    if (file.size > 300 * 1024) { toast('Image must be under 300 KB.', 'error'); return; }
    setBusy(true);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${p.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('betting-logos').upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setBusy(false); toast('Upload failed. Is the betting database update installed?', 'error'); return; }
    const { data } = supabase.storage.from('betting-logos').getPublicUrl(path);
    setBusy(false); set('logo_url', data.publicUrl); toast('Logo uploaded. Press Save to keep it.', 'success');
  };

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {f.logo_url ? <img src={f.logo_url} alt="" className="w-8 h-8 rounded-full object-contain border border-slate-200 bg-white" />
          : <span className="w-8 h-8 rounded-full bg-emerald-800 text-white text-[11px] font-black flex items-center justify-center">{p.name.slice(0, 2)}</span>}
        <b className="text-sm">{p.name}</b><span className="text-[11px] text-slate-500">{p.service_id || 'no service ID'}</span>
        <CheckBadge p={p} />
        {p.visible && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white">SHOWN</span>}
        {p.featured && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">HOT</span>}
        <button className={btn2 + ' ml-auto'} onClick={onToggle}>{open ? 'Close' : 'Edit'}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 text-[11px] font-bold text-slate-600">
          {!p.api_supported && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900 font-semibold">Not connected to an API provider. Enter the confirmed VTU.ng service ID, tick &ldquo;Supported by API&rdquo;, then run the check. Until then it cannot be shown to customers.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label>Display name<input className={inp} value={f.name} onChange={e => set('name', e.target.value)} /></label>
            <label>VTU.ng service ID (exact spelling)<input className={inp} value={f.service_id} onChange={e => set('service_id', e.target.value)} placeholder="e.g. SportyBet" /></label>
            <label>Min amount ₦ (blank = use service limit)<input className={inp} type="number" min="1" value={f.min_amount} onChange={e => set('min_amount', e.target.value)} /></label>
            <label>Max amount ₦ (blank = use service limit)<input className={inp} type="number" min="1" value={f.max_amount} onChange={e => set('max_amount', e.target.value)} /></label>
            <label>Sort order (lower first)<input className={inp} type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} /></label>
            <label>Note shown to customers<input className={inp} maxLength={300} value={f.info} onChange={e => set('info', e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.api_supported} onChange={e => set('api_supported', e.target.checked)} /> Supported by API</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.featured} onChange={e => set('featured', e.target.checked)} /> Hot / featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.visible} onChange={e => set('visible', e.target.checked)} disabled={p.last_check_status !== 'ok' || !f.api_supported} /> Show to customers</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>Logo (PNG/JPG/WebP, under 300 KB)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy} />
            <input className={inp + ' flex-1 min-w-[12rem]'} placeholder="or paste an https:// logo link" value={f.logo_url} onChange={e => set('logo_url', e.target.value)} />
          </div>
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="text-slate-800">Live check with VTU.ng {p.last_check_at && <span className="font-medium text-slate-500">· last checked {dt(p.last_check_at)}</span>}</p>
            <div className="flex flex-wrap gap-2">
              <input className={inp + ' flex-1 min-w-[12rem]'} placeholder={`A real ${p.name} account ID`} value={acct} onChange={e => setAcct(e.target.value.replace(/\s/g, ''))} />
              <button className={btn} disabled={busy || acct.trim().length < 3 || !p.api_supported || !p.service_id} onClick={check}>Check with VTU.ng</button>
            </div>
            {(note || p.last_check_note) && <p className="font-medium text-slate-600 break-words">{note || p.last_check_note}</p>}
            <p className="font-medium text-slate-500">This only asks VTU.ng to look up the account. It does not move any money. Save your changes first if you edited the service ID.</p>
          </div>
          <button className={btn} disabled={busy} onClick={save}>Save {f.name}</button>
        </div>)}
    </div>
  );
}

function Transactions({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const r = await rpc('admin_list_vtu_orders', {
      p_service: 'betting', p_status: status || null, p_customer: null,
      p_from: from ? new Date(from).toISOString() : null, p_to: to ? new Date(new Date(to).getTime() + 86400000).toISOString() : null, p_limit: 200
    }, toast);
    if (r.ok) setRows(r.data || []);
    setLoaded(true);
  }, [status, from, to, toast]);
  useEffect(() => { load(); }, [load]);

  const sum = (st: string[]) => rows.filter(o => st.includes(o.status));
  const okRows = sum(['successful']);
  const byProvider = new Map<string, { n: number; amt: number }>();
  for (const o of okRows) { const k = o.plan_label || o.provider_service || 'Unknown'; const c = byProvider.get(k) || { n: 0, amt: 0 }; byProvider.set(k, { n: c.n + 1, amt: c.amt + Number(o.face_amount || 0) }); }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[['Successful', okRows.length, naira(okRows.reduce((a, o) => a + Number(o.face_amount || 0), 0)) + ' funded'],
          ['In progress', sum(['pending', 'processing']).length, 'waiting for provider'],
          ['Refunded / failed', sum(['refunded', 'failed']).length, 'returned to wallets'],
          ['Fees earned', naira(okRows.reduce((a, o) => a + Math.max(0, Number(o.amount_charged || 0) - Number(o.face_amount || 0)), 0)), 'on successful payments']].map(([l, v, n]) => (
          <div key={String(l)} className={box}><p className="text-[11px] font-bold text-slate-500">{l}</p><p className="text-lg font-black text-slate-900">{v}</p><p className="text-[10px] text-slate-400">{n}</p></div>))}
      </div>
      {byProvider.size > 0 && (
        <div className={box}><p className="text-xs font-black mb-1">Successful by company (loaded rows)</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-700">{[...byProvider.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([k, v]) => <span key={k}><b>{k}</b> {v.n} · {naira(v.amt)}</span>)}</div></div>)}
      <div className="flex flex-wrap items-end gap-2 text-[11px] font-bold text-slate-600">
        <label>Status<select className={inp} value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option>{['pending', 'processing', 'successful', 'failed', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>From<input type="date" className={inp} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To<input type="date" className={inp} value={to} onChange={e => setTo(e.target.value)} /></label>
        <button className={btn2} onClick={load}>Refresh</button>
      </div>
      <p className="text-[11px] text-slate-500">To re-check with the provider or resolve a stuck payment, use Wallet &gt; Orders and filter by service &ldquo;betting&rdquo;.</p>
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
