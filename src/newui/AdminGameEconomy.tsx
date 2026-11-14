import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KIND_LABEL, friendly, newKey } from './gameApi';

type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const lbl = 'block text-[11px] font-bold text-slate-600';

async function call<T = any>(name: string, args: Record<string, unknown> | undefined, toast: Toast, okMsg?: string): Promise<{ ok: boolean; data: T | null }> {
  const { data, error } = await supabase.rpc(name, args as any);
  if (error) { toast(friendly(error.message).message, 'error'); return { ok: false, data: null }; }
  if (okMsg) toast(okMsg, 'success');
  return { ok: true, data: data as T };
}
function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-sm font-black text-slate-900">{label}</p>{hint && <p className="text-[11px] text-slate-500 font-medium">{hint}</p>}</div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
        className={`shrink-0 w-14 h-8 rounded-full relative transition ${on ? 'bg-emerald-600' : 'bg-slate-300'} disabled:opacity-50`}>
        <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} /></button>
    </div>
  );
}

interface Econ { settings: any; sources: any[]; plans: any[]; packages: any[]; package_bonuses: any[]; rates: any[]; access_rules: any[] }
function useEcon(toast: Toast) {
  const [e, setE] = useState<Econ | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { const r = await call<Econ>('admin_game_economy', undefined, toast); if (r.ok && r.data) { setE(r.data); setFailed(false); } else setFailed(true); }, [toast]);
  useEffect(() => { load(); }, [load]);
  return { e, failed, load };
}
const Loading = ({ failed }: { failed: boolean }) => (failed
  ? <p className={`${box} text-xs text-red-600 font-semibold`}>Could not load. The economy database update (GAMES2_01 to GAMES2_03) may not be installed yet, or you are not an admin.</p>
  : <p className="text-xs text-slate-500">Loading...</p>);

// ======================================================= Coin Packages (+ bonus per membership category)
export function CoinPackages({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  const [edit, setEdit] = useState<any | null>(null);
  const [cells, setCells] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!e) return; const m: Record<string, string> = {};
    for (const b of e.package_bonuses) m[`${b.package_id}:${b.plan_id}`] = String(b.bonus_coins);
    setCells(m);
  }, [e]);
  if (!e) return <Loading failed={failed} />;
  const plans = e.plans.filter(p => !p.archived);
  const saveRow = async (pk: any) => {
    let n = 0;
    for (const pl of plans) {
      const k = `${pk.id}:${pl.id}`; const now = (cells[k] ?? '').trim();
      const before = e.package_bonuses.find(b => b.package_id === pk.id && b.plan_id === pl.id);
      const was = before ? String(before.bonus_coins) : '';
      if (now === was) continue;
      const r = await call('admin_game_save_package_bonus', { p_package: pk.id, p_plan: pl.id, p_bonus: now === '' ? null : Number(now) }, toast);
      if (!r.ok) return; n++;
    }
    toast(n ? 'Bonuses saved' : 'Nothing changed', 'success'); load();
  };
  const savePk = async () => {
    const r = await call('admin_game_save_package', { p: { ...edit, coins: Number(edit.coins), bonus_coins: Number(edit.bonus_coins), price_naira: Number(edit.price_naira), sort_order: Number(edit.sort_order) } }, toast, 'Package saved');
    if (r.ok) { setEdit(null); load(); }
  };
  const blank = { name: '', coins: 500, bonus_coins: 0, price_naira: 50, badge: '', active: true, sort_order: e.packages.length };
  const ex = e.packages.find(p => p.active) || e.packages[0]; const exPlan = plans.find(p => !p.is_default && p.purchasable) || plans[0];
  const exBonus = ex && exPlan ? (e.package_bonuses.find(b => b.package_id === ex.id && b.plan_id === exPlan.id)?.bonus_coins ?? ex.bonus_coins) : 0;
  return (
    <>
      <div className={box}><p className="text-sm font-black">Coin packages</p>
        <p className="text-[11px] text-slate-500 font-medium">Customers pay from their wallet and get the coins immediately. The price and coins here are what the server charges and credits; customers cannot change them. A package can be hidden (not deleted).</p>
        {ex && exPlan && <p className="text-[11px] font-bold text-emerald-800 mt-1">Example: a {exPlan.name} buying {ex.name} pays {naira(ex.price_naira)} and receives {Number(ex.coins).toLocaleString()} + {Number(exBonus).toLocaleString()} bonus = {(Number(ex.coins) + Number(exBonus)).toLocaleString()} coins.</p>}
        <button className={btn + ' mt-2'} onClick={() => setEdit({ ...blank })}>+ New package</button></div>
      {edit && (<div className={`${box} grid grid-cols-2 md:grid-cols-3 gap-2`}>
        <label className={lbl}>Name<input className={inp} value={edit.name} onChange={ev => setEdit({ ...edit, name: ev.target.value })} /></label>
        <label className={lbl}>Base coins<input className={inp} type="number" min="1" value={edit.coins} onChange={ev => setEdit({ ...edit, coins: ev.target.value })} /></label>
        <label className={lbl}>Bonus for everyone (default)<input className={inp} type="number" min="0" value={edit.bonus_coins} onChange={ev => setEdit({ ...edit, bonus_coins: ev.target.value })} /></label>
        <label className={lbl}>Price ₦<input className={inp} type="number" min="1" value={edit.price_naira} onChange={ev => setEdit({ ...edit, price_naira: ev.target.value })} /></label>
        <label className={lbl}>Badge (e.g. Best value)<input className={inp} maxLength={20} value={edit.badge || ''} onChange={ev => setEdit({ ...edit, badge: ev.target.value })} /></label>
        <label className={lbl}>Order<input className={inp} type="number" value={edit.sort_order} onChange={ev => setEdit({ ...edit, sort_order: ev.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!edit.active} onChange={ev => setEdit({ ...edit, active: ev.target.checked })} />Shown to customers</label>
        <div className="col-span-2 flex gap-2"><button className={btn} onClick={savePk}>Save package</button><button className={btn2} onClick={() => setEdit(null)}>Cancel</button></div></div>)}
      {e.packages.map(pk => (
        <div key={pk.id} className={`${box} space-y-2 ${pk.active ? '' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-center gap-3"><b className="text-sm">{pk.name}</b><span className="text-xs font-semibold">{Number(pk.coins).toLocaleString()} base coins</span><b className="text-xs text-emerald-800">{naira(pk.price_naira)}</b>
            <span className="text-xs text-slate-500">default bonus {Number(pk.bonus_coins).toLocaleString()}</span>{pk.badge && <span className="text-[10px] font-black bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{pk.badge}</span>}
            {!pk.active && <span className="text-[10px] font-black bg-slate-200 rounded-full px-2 py-0.5">HIDDEN</span>}<button className={btn2 + ' ml-auto'} onClick={() => setEdit({ ...pk })}>Edit</button></div>
          <div className="overflow-x-auto"><p className="text-[11px] font-bold text-slate-600 mb-1">Bonus coins by membership category (blank = use the default bonus above)</p>
            <div className="flex flex-wrap gap-2 items-end">{plans.map(pl => (
              <label key={pl.id} className={lbl + ' w-28'}>{pl.name}<input className={inp} type="number" min="0" placeholder={String(pk.bonus_coins)} value={cells[`${pk.id}:${pl.id}`] ?? ''}
                onChange={ev => setCells({ ...cells, [`${pk.id}:${pl.id}`]: ev.target.value })} /></label>))}
              <button className={btn} onClick={() => saveRow(pk)}>Save bonuses</button></div></div>
        </div>))}
      {e.packages.length === 0 && <p className="text-xs text-slate-500">No packages yet.</p>}
    </>
  );
}

// ======================================================= Earned Coin Rewards: which coin types may ever be converted
export function CoinSources({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  if (!e) return <Loading failed={failed} />;
  return (
    <div className={`${box} space-y-1`}>
      <p className="text-sm font-black">Which coins can be converted to wallet money?</p>
      <p className="text-[11px] text-slate-500 font-medium">Every coin is recorded with its source. Nothing is eligible until YOU switch its source on. Eligibility is recorded on a coin when it is earned: switching a source on or off only affects coins earned afterwards. Some sources can never be eligible. Withdrawals themselves stay OFF until you complete the Withdrawal Settings.</p>
      <div className="divide-y divide-slate-100">{e.sources.map(s => (
        <div key={s.source} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="text-sm font-bold">{s.name} <span className="text-[10px] font-black text-slate-400 uppercase">{s.category}</span></p>
            <p className="text-[11px] text-slate-500">{s.eligible_allowed ? (s.note || 'Admin decides') : (s.note || 'Can never be withdrawn')}</p></div>
          <button type="button" role="switch" aria-checked={s.eligible} aria-label={`Eligible: ${s.name}`} disabled={!s.eligible_allowed}
            onClick={async () => { const r = await call('admin_game_save_source', { p: { source: s.source, eligible: !s.eligible } }, toast, `${s.name}: ${!s.eligible ? 'eligible' : 'not eligible'} from now on`); if (r.ok) load(); }}
            className={`shrink-0 w-14 h-8 rounded-full relative transition ${s.eligible ? 'bg-emerald-600' : 'bg-slate-300'} disabled:opacity-40`}>
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${s.eligible ? 'left-7' : 'left-1'}`} /></button>
        </div>))}</div>
    </div>
  );
}

// ======================================================= Membership Categories (+ give / remove access)
export function MembershipCategories({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  const [edit, setEdit] = useState<any | null>(null);
  const [mem, setMem] = useState<any[]>([]);
  const [gr, setGr] = useState<any>({ q: '', found: [], customer: null, plan: '', days: '', note: '' });
  const loadMem = useCallback(async () => { const r = await call<any[]>('admin_game_list_memberships', { p_limit: 50 }, toast); if (r.ok) setMem(r.data || []); }, [toast]);
  useEffect(() => { loadMem(); }, [loadMem]);
  if (!e) return <Loading failed={failed} />;
  const blank = { name: '', price_naira: 1000, period: 'monthly', period_days: 30, rank: e.plans.length, sort_order: e.plans.length, active: true, purchasable: true, popular: false, is_default: false };
  const save = async () => {
    const r = await call('admin_game_save_plan', { p: { ...edit, price_naira: Number(edit.price_naira), period_days: Number(edit.period_days), rank: Number(edit.rank), sort_order: Number(edit.sort_order) } }, toast, 'Category saved');
    if (r.ok) { setEdit(null); load(); }
  };
  const find = async () => { const r = await call<any[]>('admin_game_find_customer', { p_q: gr.q }, toast); if (r.ok) setGr({ ...gr, found: r.data || [] }); };
  const live = e.plans.filter(p => !p.archived);
  return (
    <>
      <div className={box}><p className="text-sm font-black">Membership categories</p>
        <p className="text-[11px] text-slate-500 font-medium">Create your own category names. A higher rank means a higher level; if a customer holds several, the highest rank applies. Exactly one category is the <b>default</b> (what people without a membership get). Benefits are set in the other sections and are checked by the server, never by the app.</p>
        <button className={btn + ' mt-2'} onClick={() => setEdit({ ...blank })}>+ New category</button></div>
      {edit && (<div className={`${box} space-y-2`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label className={lbl}>Name<input className={inp} value={edit.name} onChange={ev => setEdit({ ...edit, name: ev.target.value })} /></label>
          <label className={lbl}>Price ₦ (0 for the default)<input className={inp} type="number" min="0" value={edit.price_naira} onChange={ev => setEdit({ ...edit, price_naira: ev.target.value })} /></label>
          <label className={lbl}>Billing period<select className={inp} value={edit.period} onChange={ev => setEdit({ ...edit, period: ev.target.value })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
          <label className={lbl}>Membership duration (days)<input className={inp} type="number" min="1" max="800" value={edit.period_days} onChange={ev => setEdit({ ...edit, period_days: ev.target.value })} /></label>
          <label className={lbl}>Rank (higher = better)<input className={inp} type="number" min="0" value={edit.rank} onChange={ev => setEdit({ ...edit, rank: ev.target.value })} /></label>
          <label className={lbl}>Order on screen<input className={inp} type="number" value={edit.sort_order} onChange={ev => setEdit({ ...edit, sort_order: ev.target.value })} /></label></div>
        <div className="flex flex-wrap gap-4 text-xs font-bold">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.active} onChange={ev => setEdit({ ...edit, active: ev.target.checked })} />Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.purchasable && !edit.is_default} disabled={!!edit.is_default} onChange={ev => setEdit({ ...edit, purchasable: ev.target.checked })} />Customers can buy it</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.popular} onChange={ev => setEdit({ ...edit, popular: ev.target.checked })} />Show as most popular</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.is_default} onChange={ev => setEdit({ ...edit, is_default: ev.target.checked, price_naira: ev.target.checked ? 0 : edit.price_naira })} />Default category (free, for everyone)</label></div>
        <div className="flex gap-2"><button className={btn} onClick={save}>Save category</button><button className={btn2} onClick={() => setEdit(null)}>Cancel</button></div></div>)}
      {e.plans.map(p => (
        <div key={p.id} className={`${box} flex flex-wrap items-center gap-3 text-xs ${p.active && !p.archived ? '' : 'opacity-60'}`}>
          <b className="text-sm">{p.name}</b>{p.is_default && <span className="font-black bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5 text-[10px]">DEFAULT</span>}
          {p.archived && <span className="font-black bg-slate-200 rounded-full px-2 py-0.5 text-[10px]">ARCHIVED</span>}{p.popular && <span className="font-black bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-[10px]">POPULAR</span>}
          <span>{p.is_default ? 'Free' : `${naira(p.price_naira)} · ${p.period_days} days`}</span><span>rank {p.rank}</span><span>{p.active_members} active member{p.active_members === 1 ? '' : 's'}</span>
          <div className="ml-auto flex gap-2"><button className={btn2} onClick={() => setEdit({ ...p })}>Edit</button>
            {!p.is_default && <button className={btn2} onClick={async () => { if (!window.confirm(`Remove "${p.name}"? If customers or history use it, it is archived instead of deleted.`)) return; const r = await call<any>('admin_game_delete_plan', { p_id: p.id }, toast); if (r.ok) { toast(r.data?.action === 'archived' ? 'Archived (history kept)' : 'Deleted', 'success'); load(); } }}>Remove</button>}</div></div>))}
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Give someone a membership</p>
        <p className="text-[11px] text-slate-500 font-medium">For promotions or support. It does not charge their wallet.</p>
        <div className="flex gap-2"><input className={inp} placeholder="Search customer name or phone" value={gr.q} onChange={ev => setGr({ ...gr, q: ev.target.value })} /><button className={btn2} onClick={find}>Search</button></div>
        {gr.found.map((c: any) => <button key={c.id} className={`block w-full text-left text-xs font-bold rounded-lg border px-3 py-2 ${gr.customer?.id === c.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setGr({ ...gr, customer: c })}>{c.name} · {c.phone}</button>)}
        <div className="grid grid-cols-3 gap-2"><label className={lbl}>Category<select className={inp} value={gr.plan} onChange={ev => setGr({ ...gr, plan: ev.target.value })}><option value="">Choose</option>{live.filter(p => !p.is_default).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className={lbl}>Days (blank = category length)<input className={inp} type="number" min="1" value={gr.days} onChange={ev => setGr({ ...gr, days: ev.target.value })} /></label>
          <label className={lbl}>Note<input className={inp} value={gr.note} onChange={ev => setGr({ ...gr, note: ev.target.value })} /></label></div>
        <button className={btn} disabled={!gr.customer || !gr.plan} onClick={async () => { const r = await call('admin_game_grant_membership', { p_customer: gr.customer.id, p_plan: gr.plan, p_days: gr.days ? Number(gr.days) : null, p_note: gr.note }, toast, 'Membership granted'); if (r.ok) { setGr({ q: '', found: [], customer: null, plan: '', days: '', note: '' }); load(); loadMem(); } }}>Grant</button></div>
      {mem.map(m => (<div key={m.id} className={`${box} flex flex-wrap items-center gap-3 text-xs`}><b>{m.customer_name}</b><span>{m.customer_phone}</span><span>{m.plan_name}</span>
        <span className={`font-black ${m.is_live ? 'text-emerald-700' : 'text-slate-500'}`}>{m.is_live ? 'ACTIVE' : String(m.status).toUpperCase()}</span><span>until {dt(m.expires_at)}</span><span className="text-slate-400">({m.source})</span>
        {m.is_live && <button className={btn2 + ' ml-auto'} onClick={async () => { if (!window.confirm('Remove this membership now?')) return; const r = await call('admin_game_revoke_membership', { p_id: m.id }, toast, 'Removed'); if (r.ok) { load(); loadMem(); } }}>Remove</button>}</div>))}
    </>
  );
}

// ======================================================= Membership Benefits (per category)
export function MembershipBenefits({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  if (!e) return <Loading failed={failed} />;
  return (
    <>
      <div className={box}><p className="text-sm font-black">Membership benefits</p>
        <p className="text-[11px] text-slate-500 font-medium">Set what each category gets. Game access is in <b>Game Access</b>; coin bonuses per package are in <b>Coin Packages</b>; withdrawal limits and rates are in <b>Withdrawal Settings</b>. Expired or removed memberships stop receiving all benefits (after the grace period, if you set one).</p></div>
      {e.plans.filter(p => !p.archived).map(p => <BenefitCard key={p.id + String(p.updated_at)} p={p} toast={toast} reload={load} />)}
    </>
  );
}
function BenefitCard({ p, toast, reload }: { p: any; toast: Toast; reload: () => void }) {
  const [f, setF] = useState<any>({ benefits: (p.benefits || []).join('\n'), entry_discount_pct: p.entry_discount_pct, membership_bonus_coins: p.membership_bonus_coins, grace_days: p.grace_days, renew_extends: p.renew_extends });
  const save = async () => {
    const r = await call('admin_game_save_plan', { p: { id: p.id, name: p.name, price_naira: p.price_naira, period: p.period, period_days: p.period_days,
      benefits: String(f.benefits).split('\n').map((x: string) => x.trim()).filter(Boolean), entry_discount_pct: Number(f.entry_discount_pct), membership_bonus_coins: Number(f.membership_bonus_coins),
      grace_days: Number(f.grace_days), renew_extends: !!f.renew_extends } }, toast, `${p.name} benefits saved`);
    if (r.ok) reload();
  };
  return (
    <div className={`${box} space-y-2`}><b className="text-sm">{p.name}</b>{p.is_default && <span className="ml-2 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5">DEFAULT</span>}
      <label className={lbl}>Benefits shown to customers (one per line)<textarea className={inp} rows={3} value={f.benefits} onChange={ev => setF({ ...f, benefits: ev.target.value })} /></label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className={lbl}>Game entry discount %<input className={inp} type="number" min="0" max="100" step="0.5" value={f.entry_discount_pct} onChange={ev => setF({ ...f, entry_discount_pct: ev.target.value })} /></label>
        <label className={lbl}>Bonus coins on joining/renewing<input className={inp} type="number" min="0" value={f.membership_bonus_coins} onChange={ev => setF({ ...f, membership_bonus_coins: ev.target.value })} /></label>
        <label className={lbl}>Grace days after expiry<input className={inp} type="number" min="0" max="90" value={f.grace_days} onChange={ev => setF({ ...f, grace_days: ev.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs font-bold mt-5"><input type="checkbox" checked={!!f.renew_extends} onChange={ev => setF({ ...f, renew_extends: ev.target.checked })} />Renewing adds to the current expiry</label></div>
      <p className="text-[11px] text-slate-500">The entry discount can be overridden per game in Game Access. Entry costs are rounded up to a whole coin.</p>
      <button className={btn} onClick={save}>Save benefits</button></div>
  );
}

// ======================================================= Game Access (maintenance, free/paid, who may play, discounts, limits)
export function GameAccess({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  const [games, setGames] = useState<any[] | null>(null);
  const loadGames = useCallback(async () => { const r = await call<any>('admin_game_get_config', undefined, toast); if (r.ok && r.data) setGames(r.data.games); }, [toast]);
  useEffect(() => { loadGames(); }, [loadGames]);
  if (!e || !games) return <Loading failed={failed} />;
  return (
    <>
      <div className={box}><p className="text-sm font-black">Game access</p>
        <p className="text-[11px] text-slate-500 font-medium">The server decides who can start a game. A game that is OFF, in maintenance, outside a customer&rsquo;s membership or over its daily limit cannot be started, even by a direct request. Admins can still preview a game in maintenance.</p></div>
      {games.map(g => <AccessCard key={g.game_key + String(g.updated_at)} g={g} e={e} toast={toast} reload={() => { load(); loadGames(); }} />)}
    </>
  );
}
function AccessCard({ g, e, toast, reload }: { g: any; e: Econ; toast: Toast; reload: () => void }) {
  const [f, setF] = useState<any>({ maintenance: g.maintenance, maintenance_note: g.maintenance_note || '', paid_access: g.paid_access, restrict_to_plans: g.restrict_to_plans, daily_play_limit: g.daily_play_limit ?? '' });
  const plans = e.plans.filter(p => !p.archived);
  const saveGame = async () => {
    const r = await call('admin_game_save_definition', { p: { game_key: g.game_key, maintenance: !!f.maintenance, maintenance_note: f.maintenance_note, paid_access: !!f.paid_access, restrict_to_plans: !!f.restrict_to_plans, daily_play_limit: f.daily_play_limit === '' ? '' : Number(f.daily_play_limit) } }, toast, `${g.name} access saved`);
    if (r.ok) reload();
  };
  return (
    <div className={`${box} space-y-2`}>
      <div className="flex flex-wrap items-center gap-2"><b className="text-sm">{g.name}</b><span className="text-[10px] font-black bg-slate-100 rounded-full px-2 py-0.5">{g.playable ? 'GAMEPLAY LIVE' : 'INTERFACE ONLY'}</span></div>
      <div className="divide-y divide-slate-100">
        <Toggle on={!!f.maintenance} onChange={v => setF({ ...f, maintenance: v })} label="Maintenance mode" hint="Customers see the message below and cannot start the game." />
        <Toggle on={!!f.paid_access} onChange={v => setF({ ...f, paid_access: v })} label="Entry costs coins (paid access)" hint="OFF = always free to enter. The entry cost is set in Game Controls." />
        <Toggle on={!!f.restrict_to_plans} onChange={v => setF({ ...f, restrict_to_plans: v })} label="Only selected membership categories may play" hint="ON = a category with no rule below cannot play." />
      </div>
      <div className="grid sm:grid-cols-2 gap-2"><label className={lbl}>Maintenance message<input className={inp} maxLength={200} value={f.maintenance_note} onChange={ev => setF({ ...f, maintenance_note: ev.target.value })} /></label>
        <label className={lbl}>Daily rounds per customer (blank = unlimited)<input className={inp} type="number" min="1" value={f.daily_play_limit} onChange={ev => setF({ ...f, daily_play_limit: ev.target.value })} /></label></div>
      <button className={btn} onClick={saveGame}>Save game access</button>
      <div className="overflow-x-auto"><table className="w-full text-xs min-w-[34rem]"><thead><tr className="text-left text-slate-500"><th className="py-1 pr-2">Category</th><th className="pr-2">May play</th><th className="pr-2">Entry discount % (blank = category default)</th><th className="pr-2">Free play</th><th className="pr-2">Daily rounds</th><th /></tr></thead>
        <tbody>{plans.map(p => <RuleRow key={p.id + g.game_key + JSON.stringify(e.access_rules.find(r => r.game_key === g.game_key && r.plan_id === p.id) || {})} game={g.game_key} plan={p} rule={e.access_rules.find(r => r.game_key === g.game_key && r.plan_id === p.id)} toast={toast} reload={reload} />)}</tbody></table></div>
    </div>
  );
}
function RuleRow({ game, plan, rule, toast, reload }: { game: string; plan: any; rule: any; toast: Toast; reload: () => void }) {
  const [f, setF] = useState<any>({ allowed: rule ? rule.allowed : false, entry_discount_pct: rule?.entry_discount_pct ?? '', free_play: rule?.free_play ?? false, daily_play_limit: rule?.daily_play_limit ?? '' });
  const save = async () => {
    const r = await call('admin_game_save_access_rule', { p: { game_key: game, plan_id: plan.id, allowed: !!f.allowed, entry_discount_pct: f.entry_discount_pct === '' ? '' : Number(f.entry_discount_pct), free_play: !!f.free_play, daily_play_limit: f.daily_play_limit === '' ? '' : Number(f.daily_play_limit) } }, toast, `${plan.name} saved`);
    if (r.ok) reload();
  };
  return (
    <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-bold">{plan.name}</td>
      <td className="pr-2"><input type="checkbox" checked={!!f.allowed} onChange={ev => setF({ ...f, allowed: ev.target.checked })} aria-label={`${plan.name} may play`} /></td>
      <td className="pr-2"><input className={inp + ' w-24'} type="number" min="0" max="100" step="0.5" value={f.entry_discount_pct} onChange={ev => setF({ ...f, entry_discount_pct: ev.target.value })} /></td>
      <td className="pr-2"><input type="checkbox" checked={!!f.free_play} onChange={ev => setF({ ...f, free_play: ev.target.checked })} aria-label={`${plan.name} plays free`} /></td>
      <td className="pr-2"><input className={inp + ' w-20'} type="number" min="1" value={f.daily_play_limit} onChange={ev => setF({ ...f, daily_play_limit: ev.target.value })} /></td>
      <td className="whitespace-nowrap"><button className={btn2} onClick={save}>Save</button>{rule && <button className={btn2 + ' ml-1'} onClick={async () => { const r = await call('admin_game_delete_access_rule', { p_game: game, p_plan: plan.id }, toast, 'Rule removed'); if (r.ok) reload(); }}>Clear</button>}</td></tr>
  );
}

// ======================================================= Withdrawal Settings (mode, compliance gate, limits, conversion rates)
export function WithdrawalSettings({ toast }: { toast: Toast }) {
  const { e, failed, load } = useEcon(toast);
  const [c, setC] = useState({ name: '', phrase: '', note: '' });
  const [g, setG] = useState<any>(null);
  const [ratePlan, setRatePlan] = useState('');
  const [rf, setRf] = useState<any>({ source: '', coins_per_unit: 1000, naira_per_unit: 50, active: true });
  useEffect(() => { if (e && !g) setG({ review: e.settings.withdrawal_review_above ?? '', wait: e.settings.benefit_wait_hours, spend: e.settings.spend_policy }); }, [e, g]);
  if (!e || !g) return <Loading failed={failed} />;
  const s = e.settings; const confirmed = !!s.compliance_confirmed_at; const mode: string = s.withdrawal_mode;
  const setMode = async (m: string) => {
    if (m === mode) return;
    if (m === 'live' && !window.confirm('Go LIVE? Eligible customers will be able to convert coins into real wallet money.')) return;
    const r = await call('admin_game_save_settings', { p: { withdrawal_mode: m } }, toast, `Withdrawals: ${m.toUpperCase()}`); if (r.ok) load();
  };
  const saveGlobal = async () => {
    const r = await call('admin_game_save_settings', { p: { withdrawal_review_above: g.review === '' ? '' : Number(g.review), benefit_wait_hours: Number(g.wait), spend_policy: g.spend } }, toast, 'Saved'); if (r.ok) load();
  };
  const plans = e.plans.filter(p => !p.archived);
  const rp = ratePlan || plans[0]?.id || '';
  const rates = e.rates.filter(r => r.plan_id === rp);
  const srcName = (k: string | null) => (k ? e.sources.find(x => x.source === k)?.name || k : 'All eligible sources');
  return (
    <>
      <div className={`${box} ${mode === 'live' ? 'border-emerald-400' : mode === 'test' ? 'border-amber-300' : ''}`}>
        <p className="text-sm font-black">{mode === 'live' ? 'Withdrawals are LIVE for customers' : mode === 'test' ? 'TEST: only admins can withdraw (real wallet money moves)' : 'Withdrawals are OFF'}</p>
        <p className="text-[11px] text-slate-500 font-medium">Converting game coins into wallet money is the regulated part of this system. It stays OFF until you decide. TEST lets you try it with your own admin account. LIVE is refused by the database until the compliance confirmation below is recorded.</p>
        <div className="grid grid-cols-3 gap-2 mt-2">{(['off', 'test', 'live'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} disabled={m === 'live' && !confirmed} aria-pressed={mode === m}
            className={`py-3 rounded-xl text-sm font-black border disabled:opacity-40 ${mode === m ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'}`}>{m.toUpperCase()}</button>))}</div>
      </div>
      <div className={`${box} space-y-2`}>
        <p className="text-sm font-black">Compliance confirmation</p>
        {confirmed ? (<>
          <p className="text-xs font-semibold text-emerald-800">Recorded {dt(s.compliance_confirmed_at)}: {s.compliance_note}</p>
          <button className={btn2} onClick={async () => { if (!window.confirm('Remove the confirmation? Live withdrawals will be switched OFF.')) return; const r = await call('admin_game_revoke_compliance', undefined, toast, 'Confirmation removed'); if (r.ok) load(); }}>Remove confirmation (switches LIVE off)</button></>) : (<>
          <p className="text-[11px] text-slate-500 font-medium">Before real customers can convert coins to money, you must confirm that you have the licences, legal advice and payment-provider approvals that apply to your business in Nigeria. This is recorded with your name and the time.</p>
          <div className="grid sm:grid-cols-2 gap-2"><label className={lbl}>Your full name<input className={inp} value={c.name} onChange={ev => setC({ ...c, name: ev.target.value })} /></label>
            <label className={lbl}>Type I CONFIRM<input className={inp} value={c.phrase} onChange={ev => setC({ ...c, phrase: ev.target.value })} /></label></div>
          <label className={lbl}>Licence / legal advice you rely on (reference, date, who advised)<textarea className={inp} rows={2} value={c.note} onChange={ev => setC({ ...c, note: ev.target.value })} /></label>
          <button className={btn} disabled={c.name.trim().length < 3 || c.phrase.trim().toUpperCase() !== 'I CONFIRM' || c.note.trim().length < 10}
            onClick={async () => { const r = await call('admin_game_confirm_compliance', { p_name: c.name, p_phrase: c.phrase, p_note: c.note }, toast, 'Confirmation recorded'); if (r.ok) { setC({ name: '', phrase: '', note: '' }); load(); } }}>Record confirmation</button></>)}
      </div>
      <div className={`${box} grid sm:grid-cols-3 gap-2`}>
        <label className={lbl}>Admin approval needed above ₦ (blank = never)<input className={inp} type="number" min="0" value={g.review} onChange={ev => setG({ ...g, review: ev.target.value })} /></label>
        <label className={lbl}>New membership benefits start after (hours)<input className={inp} type="number" min="0" max="720" value={g.wait} onChange={ev => setG({ ...g, wait: ev.target.value })} /></label>
        <label className={lbl}>When a game costs coins, spend first<select className={inp} value={g.spend} onChange={ev => setG({ ...g, spend: ev.target.value })}><option value="ineligible_first">Coins that cannot be withdrawn (customer keeps withdrawable coins)</option><option value="eligible_first">Withdrawable coins first</option></select></label>
        <div className="sm:col-span-3"><p className="text-[11px] text-slate-500 font-medium mb-2">The waiting period stops people upgrading and downgrading just to reach higher limits. Daily and monthly usage is counted per customer, whatever category they hold.</p><button className={btn} onClick={saveGlobal}>Save</button></div>
      </div>
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Limits per membership category</p>
        <p className="text-[11px] text-slate-500 font-medium">Amounts are in naira credited to the wallet. A limit of 0 means blocked, so nothing is withdrawable until you set real values.</p>
        {plans.map(p => <LimitRow key={p.id + JSON.stringify(p.withdrawal)} p={p} toast={toast} reload={load} />)}</div>
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Conversion rates</p>
        <p className="text-[11px] text-slate-500 font-medium">Example: 1,000 coins = ₦50. If a category has no rate, its coins cannot be converted (nothing is guessed). Each chunk is rounded <b>down</b> to the kobo. The rate used is stored with every withdrawal.</p>
        <label className={lbl}>Category<select className={inp} value={rp} onChange={ev => setRatePlan(ev.target.value)}>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {rates.map(r => (<div key={r.id} className={`flex flex-wrap items-center gap-3 text-xs rounded-lg border border-slate-200 px-3 py-2 ${r.active ? '' : 'opacity-60'}`}>
          <b>{srcName(r.source)}</b><span>{Number(r.coins_per_unit).toLocaleString()} coins = {naira(r.naira_per_unit)}</span>{!r.active && <span className="font-black text-slate-500">OFF</span>}
          <div className="ml-auto flex gap-2"><button className={btn2} onClick={() => setRf({ source: r.source || '', coins_per_unit: r.coins_per_unit, naira_per_unit: r.naira_per_unit, active: r.active })}>Edit</button>
            <button className={btn2} onClick={async () => { const x = await call('admin_game_delete_rate', { p_id: r.id }, toast, 'Rate removed'); if (x.ok) load(); }}>Remove</button></div></div>))}
        {rates.length === 0 && <p className="text-xs font-bold text-amber-700">No rate set for this category, so its members cannot convert coins.</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <label className={lbl}>Coin source<select className={inp} value={rf.source} onChange={ev => setRf({ ...rf, source: ev.target.value })}><option value="">All eligible sources</option>{e.sources.filter(x => x.eligible_allowed).map(x => <option key={x.source} value={x.source}>{x.name}</option>)}</select></label>
          <label className={lbl}>Coins<input className={inp} type="number" min="1" value={rf.coins_per_unit} onChange={ev => setRf({ ...rf, coins_per_unit: ev.target.value })} /></label>
          <label className={lbl}>= Naira<input className={inp} type="number" min="0.01" step="0.01" value={rf.naira_per_unit} onChange={ev => setRf({ ...rf, naira_per_unit: ev.target.value })} /></label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!rf.active} onChange={ev => setRf({ ...rf, active: ev.target.checked })} />Active</label></div>
        <button className={btn} onClick={async () => { const r = await call('admin_game_save_rate', { p: { plan_id: rp, source: rf.source, coins_per_unit: Number(rf.coins_per_unit), naira_per_unit: Number(rf.naira_per_unit), active: !!rf.active } }, toast, 'Rate saved'); if (r.ok) load(); }}>Save rate</button>
      </div>
    </>
  );
}
function LimitRow({ p, toast, reload }: { p: any; toast: Toast; reload: () => void }) {
  const w = p.withdrawal || {};
  const [f, setF] = useState<any>({ withdraw_enabled: !!w.withdraw_enabled, min_naira: w.min_naira ?? 0, max_naira: w.max_naira ?? 0, daily_naira: w.daily_naira ?? 0, monthly_naira: w.monthly_naira ?? 0 });
  const save = async () => {
    const r = await call('admin_game_save_plan', { p: { id: p.id, name: p.name, price_naira: p.price_naira, period: p.period, period_days: p.period_days,
      withdrawal: { withdraw_enabled: !!f.withdraw_enabled, min_naira: Number(f.min_naira), max_naira: Number(f.max_naira), daily_naira: Number(f.daily_naira), monthly_naira: Number(f.monthly_naira) } } }, toast, `${p.name} limits saved`);
    if (r.ok) reload();
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2"><div className="flex items-center gap-3"><b className="text-sm">{p.name}</b>
      <label className="flex items-center gap-2 text-xs font-bold ml-auto"><input type="checkbox" checked={!!f.withdraw_enabled} onChange={ev => setF({ ...f, withdraw_enabled: ev.target.checked })} />May withdraw</label></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{([['min_naira', 'Minimum ₦'], ['max_naira', 'Maximum ₦ each'], ['daily_naira', 'Daily limit ₦'], ['monthly_naira', 'Monthly limit ₦']] as [string, string][]).map(([k, l]) => (
        <label key={k} className={lbl}>{l}<input className={inp} type="number" min="0" step="0.01" value={f[k]} onChange={ev => setF({ ...f, [k]: ev.target.value })} /></label>))}</div>
      <button className={btn2} onClick={save}>Save {p.name}</button></div>
  );
}

// ======================================================= Customer Transactions
export function EconomyTransactions({ toast }: { toast: Toast }) {
  const [tab, setTab] = useState<'withdrawals' | 'purchases' | 'ledger' | 'adjust'>('withdrawals');
  const [rows, setRows] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [status, setStatus] = useState(''); const [plan, setPlan] = useState(''); const [kind, setKind] = useState(''); const [source, setSource] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState<any[]>([]); const [cust, setCust] = useState<any>(null);
  const [g, setG] = useState<any>({ amount: '', note: '', key: newKey() });
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => { (async () => { const r = await call<Econ>('admin_game_economy', undefined, toast); if (r.ok && r.data) setPlans(r.data.plans); })(); }, [toast]);
  const range = { p_from: from ? new Date(from).toISOString() : null, p_to: to ? new Date(new Date(to).getTime() + 86400000).toISOString() : null };
  const load = useCallback(async () => {
    if (tab === 'withdrawals') { const r = await call<any[]>('admin_game_withdrawals', { p_status: status || null, p_plan: plan || null, p_customer: cust?.id ?? null, ...range, p_limit: 100 }, toast); if (r.ok) setRows(r.data || []); }
    else if (tab === 'purchases') { const r = await call<any[]>('admin_game_orders', { p_status: status || null, p_plan: plan || null, p_customer: cust?.id ?? null, ...range, p_limit: 100 }, toast); if (r.ok) setRows(r.data || []); }
    else if (tab === 'ledger') { const r = await call<any[]>('admin_game_ledger', { p_customer: cust?.id ?? null, p_kind: kind || null, p_source: source || null, ...range, p_limit: 100, p_offset: 0 }, toast); if (r.ok) setRows(r.data || []); }
    // eslint-disable-next-line
  }, [tab, status, plan, kind, source, from, to, cust, toast]);
  useEffect(() => { load(); }, [load]);
  const find = async () => { const r = await call<any[]>('admin_game_find_customer', { p_q: q }, toast); if (r.ok) setFound(r.data || []); };
  const tabs: [typeof tab, string][] = [['withdrawals', 'Withdrawals'], ['purchases', 'Coin purchases'], ['ledger', 'Coin ledger'], ['adjust', 'Add / remove coins']];
  return (
    <>
      <div className="flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setRows([]); setStatus(''); }} className={tab === k ? btn : btn2}>{l}</button>)}</div>
      <div className={`${box} space-y-2`}>
        <div className="flex flex-wrap gap-2 items-end">
          <input className={inp + ' flex-1 min-w-[10rem]'} placeholder="Find a customer: name or phone" value={q} onChange={ev => setQ(ev.target.value)} /><button className={btn2} onClick={find}>Search</button>
          {cust && <button className={btn2} onClick={() => setCust(null)}>Clear: {cust.name}</button>}</div>
        {found.length > 0 && !cust && <div className="flex flex-wrap gap-2">{found.map(c => <button key={c.id} className={btn2} onClick={() => { setCust(c); setG({ ...g, customer: c }); }}>{c.name} · {c.phone}</button>)}</div>}
        {tab !== 'adjust' && (<div className="flex flex-wrap gap-2 items-end">
          {(tab === 'withdrawals' || tab === 'purchases') && <label className={lbl}>Status<select className={inp} value={status} onChange={ev => setStatus(ev.target.value)}><option value="">All</option>{(tab === 'withdrawals' ? ['pending', 'completed', 'rejected', 'failed'] : ['successful', 'pending', 'failed', 'refunded', 'cancelled']).map(x => <option key={x} value={x}>{x}</option>)}</select></label>}
          {(tab === 'withdrawals' || tab === 'purchases') && <label className={lbl}>Membership<select className={inp} value={plan} onChange={ev => setPlan(ev.target.value)}><option value="">All</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          {tab === 'ledger' && <label className={lbl}>Type<select className={inp} value={kind} onChange={ev => setKind(ev.target.value)}><option value="">All</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>}
          {tab === 'ledger' && <label className={lbl}>Source<input className={inp} placeholder="e.g. brain" value={source} onChange={ev => setSource(ev.target.value)} /></label>}
          <label className={lbl}>From<input type="date" className={inp} value={from} onChange={ev => setFrom(ev.target.value)} /></label>
          <label className={lbl}>To<input type="date" className={inp} value={to} onChange={ev => setTo(ev.target.value)} /></label><button className={btn2} onClick={load}>Refresh</button></div>)}
      </div>

      {tab === 'withdrawals' && (<>{rows.length === 0 && <p className="text-xs text-slate-500">No withdrawals.</p>}
        {rows.map(w => (<div key={w.id} className={`${box} space-y-2 text-xs ${w.status === 'pending' ? 'border-amber-300' : ''}`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center"><b>{w.customer_name}</b><span>{w.customer_phone}</span><span>{w.plan_name}</span><span>{Number(w.coins).toLocaleString()} coins</span><b>{naira(w.naira)}</b>
            <span className="font-black uppercase">{w.status}</span><span className="text-slate-400">{dt(w.created_at)}</span>{w.wallet_ref && <span>wallet ref {w.wallet_ref}</span>}{w.reason && <span className="text-slate-500">{w.reason}</span>}</div>
          {w.breakdown && <p className="text-slate-500">{(w.breakdown as any[]).map(c => `${c.name}: ${c.coins} coins @ ${c.coins_per_unit} = ${naira(c.naira_per_unit)}`).join(' · ')}</p>}
          {w.status === 'pending' && <div className="flex flex-wrap gap-2"><input className={inp + ' flex-1 min-w-[10rem]'} placeholder="Note (optional)" value={notes[w.id] || ''} onChange={ev => setNotes({ ...notes, [w.id]: ev.target.value })} />
            <button className={btn} onClick={async () => { const r = await call('admin_game_decide_withdrawal', { p_id: w.id, p_approve: true, p_note: notes[w.id] || null }, toast, 'Approved: wallet credited'); if (r.ok) load(); }}>Approve</button>
            <button className={btn2} onClick={async () => { if (!window.confirm('Reject? The coins go back to the customer.')) return; const r = await call('admin_game_decide_withdrawal', { p_id: w.id, p_approve: false, p_note: notes[w.id] || null }, toast, 'Rejected: coins returned'); if (r.ok) load(); }}>Reject</button></div>}
        </div>))}</>)}

      {tab === 'purchases' && (<>{rows.length === 0 && <p className="text-xs text-slate-500">No purchases.</p>}
        {rows.map(o => (<div key={o.id} className={`${box} flex flex-wrap gap-x-4 gap-y-1 items-center text-xs`}><b>{o.customer_name}</b><span>{o.customer_phone}</span><span>{o.plan_name || '-'}</span>
          <span>{Number(o.coins).toLocaleString()} + {Number(o.bonus_coins).toLocaleString()} bonus{o.promo_bonus_coins > 0 ? ` + ${o.promo_bonus_coins} promo` : ''}</span><b>{naira(o.price_naira)}</b><span className="font-black uppercase">{o.status}</span><span className="text-slate-400">{o.method} · {dt(o.created_at)}</span>
          {o.provider_ref && <span>wallet ref {o.provider_ref}</span>}
          {o.status === 'pending' && <button className={btn2 + ' ml-auto'} onClick={async () => { if (!window.confirm('Cancel this old manual order? (Manual confirmation is retired.)')) return; const r = await call('admin_game_close_order', { p_order: o.id, p_status: 'cancelled', p_note: 'Cancelled: manual orders retired' }, toast, 'Cancelled'); if (r.ok) load(); }}>Cancel old order</button>}</div>))}</>)}

      {tab === 'ledger' && (<div className={`${box} overflow-x-auto`}><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">When</th><th className="pr-3">Customer</th><th className="pr-3">Type</th><th className="pr-3">Source</th><th className="pr-3 text-right">Coins</th><th className="pr-3 text-right">Balance</th><th>Note</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-t border-slate-100"><td className="py-1 pr-3 whitespace-nowrap">{dt(r.created_at)}</td><td className="pr-3">{r.customer_name}</td><td className="pr-3">{KIND_LABEL[r.kind] || r.kind}</td>
          <td className="pr-3">{r.source || '-'}{r.eligible ? ' ✓' : ''}</td><td className={`pr-3 text-right font-black ${r.amount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.amount > 0 ? '+' : ''}{r.amount}</td><td className="pr-3 text-right">{r.balance_after}</td><td className="text-slate-500">{r.note}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="text-xs text-slate-500 mt-1">No coin activity.</p>}<p className="text-[10px] text-slate-400 mt-1">✓ = coins that were withdrawable when credited.</p></div>)}

      {tab === 'adjust' && (<div className={`${box} space-y-2`}><p className="text-sm font-black">Add or remove coins for a customer</p>
        <p className="text-[11px] text-slate-500 font-medium">Admin-added coins are recorded as &ldquo;Coins added by an admin&rdquo; and can never be withdrawn. Every change needs a reason and is audited.</p>
        {cust ? <p className="text-xs font-black text-emerald-800">Customer: {cust.name} ({cust.phone})</p> : <p className="text-xs text-slate-500">Search and choose a customer above.</p>}
        <div className="grid grid-cols-2 gap-2"><label className={lbl}>Coins (minus to remove)<input className={inp} type="number" value={g.amount} onChange={ev => setG({ ...g, amount: ev.target.value })} /></label>
          <label className={lbl}>Reason (required)<input className={inp} value={g.note} onChange={ev => setG({ ...g, note: ev.target.value })} /></label></div>
        <button className={btn} disabled={!cust || !g.amount || String(g.note).trim().length < 3} onClick={async () => {
          if (!window.confirm(`${Number(g.amount) > 0 ? 'Add' : 'Remove'} ${Math.abs(Number(g.amount))} coins ${Number(g.amount) > 0 ? 'to' : 'from'} ${cust.name}?`)) return;
          const r = await call('admin_game_grant_coins', { p_customer: cust.id, p_amount: Number(g.amount), p_note: g.note, p_idem: g.key }, toast, 'Done and recorded in the audit log'); if (r.ok) setG({ amount: '', note: '', key: newKey() });
        }}>Apply</button></div>)}
    </>
  );
}

// ======================================================= Reports and Analytics (money + coins)
export function EconomyReports({ toast }: { toast: Toast }) {
  const [days, setDays] = useState(30); const [r, setR] = useState<any>(null); const [cons, setCons] = useState<any>(null);
  useEffect(() => { (async () => { const x = await call('admin_game_economy_report', { p_days: days }, toast); if (x.ok) setR(x.data); })(); }, [days, toast]);
  const check = async () => { const x = await call('admin_game_consistency', undefined, toast); if (x.ok) setCons(x.data); };
  const t = r?.totals;
  const cards: [string, any][] = t ? [['Coins purchased', t.coins_purchased], ['Bonus coins awarded', t.bonus_awarded], ['Coins earned from games', t.coins_earned], ['Coins spent on games', t.coins_spent],
    ['Eligible coins converted', t.coins_converted], ['Naira credited to wallets', naira(t.naira_credited)], ['Naira from coin sales', naira(t.naira_from_coin_sales)], ['Naira from memberships', naira(t.naira_from_memberships)],
    ['Withdrawals waiting', t.withdrawals_pending], ['Withdrawals failed', t.withdrawals_failed], ['Withdrawals rejected', t.withdrawals_rejected], ['Eligible coins outstanding', t.eligible_coins_outstanding]] : [];
  return (
    <>
      <div className={`${box} flex flex-wrap items-end gap-3`}><label className={lbl}>Period<select className={inp} value={days} onChange={ev => setDays(Number(ev.target.value))}>{[7, 14, 30, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}</select></label>
        <button className={btn2} onClick={check}>Check that all balances agree</button></div>
      {cons && (<div className={`${box} text-xs space-y-0.5 ${Object.values(cons).every(v => Number(v) === 0) ? 'border-emerald-400' : 'border-red-300'}`}>
        <p className="font-black">{Object.values(cons).every(v => Number(v) === 0) ? 'All coin balances, ledger entries and wallet records agree.' : 'Something does not agree: please investigate.'}</p>
        {Object.entries(cons).map(([k, v]) => <p key={k} className={Number(v) === 0 ? 'text-slate-500' : 'text-red-600 font-black'}>{k.replace(/_/g, ' ')}: {String(v)} mismatches</p>)}</div>)}
      {!r ? <p className="text-xs text-slate-500">Loading...</p> : (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{cards.map(([l, v]) => <div key={l} className={box}><p className="text-[10px] font-bold text-slate-500">{l}</p><p className="text-lg font-black text-slate-900">{typeof v === 'number' ? v.toLocaleString() : v}</p></div>)}</div>
        <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">By membership category</p><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th>Category</th><th className="text-right">Purchases</th><th className="text-right">Purchase ₦</th><th className="text-right">Withdrawals</th><th className="text-right">Withdrawn ₦</th><th className="text-right">Active members</th><th className="text-right">Expiring 7d</th></tr></thead>
          <tbody>{r.by_plan.map((x: any) => <tr key={x.plan_name} className="border-t border-slate-100"><td className="py-1 font-bold">{x.plan_name}</td><td className="text-right">{x.purchases}</td><td className="text-right">{naira(x.purchase_naira)}</td><td className="text-right">{x.withdrawals}</td><td className="text-right">{naira(x.withdrawal_naira)}</td><td className="text-right">{x.active_members}</td><td className="text-right">{x.expiring_7d}</td></tr>)}</tbody></table></div>
        <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">Coins by source</p><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th>Source</th><th className="text-right">Credited</th><th className="text-right">Spent / taken</th></tr></thead>
          <tbody>{r.by_source.map((x: any) => <tr key={x.source} className="border-t border-slate-100"><td className="py-1 font-bold">{x.name}</td><td className="text-right">{Number(x.credited).toLocaleString()}</td><td className="text-right">{Number(x.spent).toLocaleString()}</td></tr>)}</tbody></table></div>
      </>)}
    </>
  );
}

// ======================================================= Audit Logs (+ suspicious activity)
export function AuditLogs({ toast }: { toast: Toast }) {
  const [sus, setSus] = useState<any>(null); const [eco, setEco] = useState<any>(null); const [log, setLog] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const [a, b, c] = await Promise.all([call('admin_game_suspicious', undefined, toast), call('admin_game_suspicious_economy', undefined, toast), call<any[]>('admin_game_audit', { p_limit: 150 }, toast)]);
    if (a.ok) setSus(a.data); if (b.ok) setEco(b.data); if (c.ok) setLog(c.data || []);
  })(); }, [toast]);
  const Block = ({ title, hint, rows, cols }: { title: string; hint: string; rows: any[]; cols: [string, string][] }) => (
    <div className={box}><p className="text-sm font-black">{title} <span className="text-slate-400">({rows.length})</span></p><p className="text-[11px] text-slate-500 font-medium">{hint}</p>
      {rows.length === 0 ? <p className="text-xs text-emerald-700 font-bold mt-1">Nothing to review.</p> : <div className="overflow-x-auto mt-1"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500">{cols.map(([k, l]) => <th key={k} className="pr-3">{l}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{cols.map(([k]) => <td key={k} className="py-1 pr-3">{/(started_at|last_withdrawal)$/.test(k) ? dt(r[k]) : String(r[k] ?? '')}</td>)}</tr>)}</tbody></table></div>}</div>);
  return (
    <>
      {sus && eco ? (<>
        <Block title="Very fast answers" hint="Rounds where 4+ answers averaged under 1.2 seconds in 7 days." rows={sus.too_fast} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['answers', 'Answers'], ['avg_ms', 'Avg ms'], ['started_at', 'When']]} />
        <Block title="Unusually heavy play today" hint="More than 20 rounds today." rows={sus.heavy_play} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['sessions_today', 'Rounds']]} />
        <Block title="Reached the daily reward limit" hint="Earned the maximum coins today." rows={sus.at_daily_cap} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['earned_today', 'Coins']]} />
        <Block title="Buying coins then withdrawing" hint="3 or more purchases and a withdrawal within 24 hours." rows={eco.buy_then_withdraw} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['purchases_24h', 'Purchases'], ['last_withdrawal', 'Last withdrawal']]} />
        <Block title="Switching membership repeatedly" hint="3 or more memberships started in 30 days (possible limit bypass)." rows={eco.membership_switching} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['memberships_30d', 'Memberships']]} />
        <Block title="Repeated failed withdrawals" hint="2 or more failed withdrawals in 7 days." rows={eco.failed_withdrawals} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['failed_7d', 'Failed']]} />
      </>) : <p className="text-xs text-slate-500">Loading...</p>}
      <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">Administrative changes (audit log)</p>
        <table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="pr-3">When</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th>Detail</th></tr></thead>
          <tbody>{log.map(a => <tr key={a.id} className="border-t border-slate-100 align-top"><td className="py-1 pr-3 whitespace-nowrap">{dt(a.created_at)}</td><td className="pr-3">{a.actor_name}</td><td className="pr-3 font-bold">{a.action}</td><td className="text-slate-500 break-all">{a.detail ? JSON.stringify(a.detail).slice(0, 200) : ''}</td></tr>)}</tbody></table>
        {log.length === 0 && <p className="text-xs text-slate-500">No changes recorded yet.</p>}</div>
    </>
  );
}
