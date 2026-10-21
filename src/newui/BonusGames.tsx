import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Gamepad2, Bell, BellRing, Play, Loader2, Sparkles, CheckCircle2, Circle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, naira } from './ui';
import { friendlyError } from './shopApi';
import type { SectionKey } from './config';

type Toast = (m: string, t?: 'success' | 'error') => void;
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const box = 'bg-white rounded-2xl border border-slate-200 p-4 space-y-3';
const toLocal = (iso?: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const toIso = (l: string) => l ? new Date(l).toISOString() : '';

export interface BonusTask { id: string; kind: string; label: string | null; target: number; done: number; met: boolean }
export interface Bonus { id: string; name: string; message: string | null; amount: number; ends_at: string | null; claimed: boolean; require_tasks?: boolean; tasks?: BonusTask[]; tasks_met?: boolean }

export const TASK_KINDS: Record<string, { label: string; unit: string; section?: SectionKey; go?: string }> = {
  share_adverts: { label: 'Share an advert on WhatsApp or social media', unit: 'shares', section: 'advertise', go: 'Share now' },
  login_days: { label: 'Open the app on different days', unit: 'days' },
  oja_visits: { label: 'Visit Gbagede OJA', unit: 'days', section: 'oja', go: 'Open OJA' },
  contribute: { label: 'Make Ajo contributions', unit: 'contributions', section: 'ajo', go: 'Open Ajo' },
  fund_wallet: { label: 'Fund your wallet', unit: 'naira', section: 'wallet', go: 'Fund wallet' },
  buy_bills: { label: 'Buy airtime, data or bills with your wallet', unit: 'purchases', section: 'bills', go: 'Buy now' },
  refer: { label: 'Refer a friend to HireMercyAJO', unit: 'friends', section: 'referrals', go: 'Refer now' },
};
const fillAmount = (m: string, amt: number) => m.replace(/\{amount\}/g, naira(amt));

/** Customer bonuses the admin has switched on. Empty when none (or when the SQL is not installed). */
export function useBonuses() {
  const [list, setList] = useState<Bonus[]>([]);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_bonuses');
    setList(error ? [] : ((data || []) as any[]).map(b => ({ ...b, amount: Number(b.amount), tasks: ((b.tasks || []) as any[]).map(t => ({ ...t, target: Number(t.target), done: Number(t.done) })) })));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [load]);
  return { list, reload: load };
}

export function BonusBanner({ onClaimed, onSection }: { onClaimed?: () => void; onSection?: (s: SectionKey) => void }) {
  const { list, reload } = useBonuses();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const open = list.filter(b => !b.claimed);
  const claim = async (b: Bonus) => {
    setBusy(b.id); setMsg('');
    const { error } = await supabase.rpc('claim_bonus', { p_campaign: b.id });
    setBusy(null);
    if (error) setMsg(friendlyError(error)); else { setMsg(`${naira(b.amount)} added to your wallet. Use it for airtime, data and bills.`); onClaimed?.(); }
    reload();
  };
  if (!open.length && !msg) return null;
  return (
    <div className="space-y-2">
      {open.map(b => {
        const locked = !!b.require_tasks && !b.tasks_met;
        const doneN = (b.tasks || []).filter(t => t.met).length;
        return (
        <div key={b.id} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white p-4 shadow-md">
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/15" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">{locked ? <Lock className="w-6 h-6" /> : <Gift className="w-6 h-6" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black leading-tight">{naira(b.amount)} bonus for you!</p>
              <p className="text-[11px] font-semibold text-white/90">{fillAmount(b.message || b.name, b.amount)}</p>
              {b.ends_at && <p className="text-[10px] font-bold text-white/80 mt-0.5">Claim before {new Date(b.ends_at).toLocaleDateString()}</p>}
            </div>
            <button type="button" disabled={busy === b.id || locked} onClick={() => claim(b)} className="shrink-0 bg-white text-orange-600 text-xs font-black px-4 py-2.5 rounded-xl shadow active:scale-95 disabled:opacity-60">{busy === b.id ? '…' : locked ? 'Locked' : 'Claim'}</button>
          </div>
          {locked && (b.tasks || []).length > 0 && (
            <div className="relative mt-3 rounded-2xl bg-white/20 p-3 space-y-2">
              <p className="text-[11px] font-black">Complete all tasks to unlock ({doneN}/{(b.tasks || []).length} done)</p>
              {(b.tasks || []).map(t => {
                const k = TASK_KINDS[t.kind];
                const unit = k?.unit === 'naira' ? '' : ` ${k?.unit || ''}`;
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    {t.met ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0 opacity-80" />}
                    <p className={`text-[11px] font-bold flex-1 min-w-0 ${t.met ? 'line-through opacity-80' : ''}`}>{t.label || k?.label || t.kind} <span className="opacity-90">({k?.unit === 'naira' ? `${naira(t.done)} / ${naira(t.target)}` : `${t.done}/${t.target}${unit}`})</span></p>
                    {!t.met && k?.section && onSection && <button type="button" onClick={() => onSection(k.section!)} className="shrink-0 bg-white/90 text-orange-700 text-[10px] font-black px-2.5 py-1 rounded-lg">{k.go}</button>}
                  </div>
                );
              })}
              <p className="text-[10px] font-semibold text-white/85">Progress updates by itself. Come back to this page after you finish a task.</p>
            </div>
          )}
          {locked && (b.tasks || []).length === 0 && <p className="relative mt-2 text-[11px] font-bold text-white/90">Tasks for this bonus are being set up. Please check back soon.</p>}
        </div>
      ); })}
      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2.5 flex items-center justify-between gap-2"><span>{msg}</span>{onSection && <button type="button" className="underline shrink-0" onClick={() => onSection('bills')}>Buy airtime</button>}</div>}
    </div>
  );
}

interface Game { id: string; title: string; description: string | null; icon: string | null; image_url: string | null; status: 'coming_soon' | 'live'; play_url: string | null; interest: number; mine: boolean }
const GRADS = ['from-fuchsia-500 to-purple-700', 'from-sky-500 to-indigo-700', 'from-emerald-500 to-teal-700', 'from-orange-500 to-rose-600'];

export function GamesScreen({ onSection }: { onSection: (s: SectionKey) => void }) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('games_list');
    setGames(error ? [] : (data || []) as Game[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const notify = async (g: Game) => {
    setBusy(g.id);
    const { data } = await supabase.rpc('game_toggle_interest', { p_game: g.id });
    setBusy(null);
    setGames(list => (list || []).map(x => x.id === g.id ? { ...x, mine: !!data, interest: x.interest + (data ? 1 : -1) } : x));
  };
  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-600 text-white p-5 shadow-md">
        <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><Gamepad2 className="w-7 h-7" /></span>
          <div><h2 className="text-xl font-black leading-tight">Games</h2><p className="text-xs font-semibold text-white/85">Play, relax and win. New games are coming.</p></div>
        </div>
      </div>
      {games === null && <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-700" /></div>}
      {games && games.length === 0 && <Card><p className="text-sm font-bold text-slate-700 text-center py-4">Games are coming soon.</p></Card>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(games || []).map((g, i) => (
          <div key={g.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`h-28 bg-gradient-to-br ${GRADS[i % GRADS.length]} relative flex items-center justify-center`}>
              {g.image_url ? <img src={g.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-5xl drop-shadow">{g.icon || '🎮'}</span>}
              <span className={`absolute top-2.5 right-2.5 text-[10px] font-black rounded-full px-2.5 py-1 ${g.status === 'live' ? 'bg-emerald-400 text-emerald-950' : 'bg-white/90 text-slate-700'}`}>{g.status === 'live' ? 'LIVE' : 'COMING SOON'}</span>
            </div>
            <div className="p-3.5 space-y-2">
              <p className="text-sm font-black text-slate-900">{g.title}</p>
              {g.description && <p className="text-xs font-medium text-slate-600">{g.description}</p>}
              {g.status === 'live' && g.play_url ? (
                <a href={g.play_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm py-2.5 rounded-xl"><Play className="w-4 h-4" />Play now</a>
              ) : (
                <button type="button" disabled={busy === g.id} onClick={() => notify(g)} className={`w-full flex items-center justify-center gap-2 font-black text-sm py-2.5 rounded-xl border-2 ${g.mine ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700'}`}>
                  {g.mine ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}{g.mine ? "We'll notify you" : 'Notify me'}
                </button>
              )}
              {g.interest > 0 && <p className="text-[10px] font-bold text-slate-400 text-center">{g.interest} waiting</p>}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onSection('rewards')} className="w-full rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold py-3 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Earn reward points while you wait</button>
    </div>
  );
}

export function BonusAdminPanel({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState<any>({ name: '', message: '', amount: '1000', audience: 'all', starts_at: '', ends_at: '', max_total: '', require_tasks: true });
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_bonus_campaigns');
    if (error) { toast('Bonus campaigns unavailable. Has the bonus SQL been run?', 'error'); return; }
    setRows((data || []) as any[]);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const save = async (p: any) => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_bonus_campaign', { p: { ...p, starts_at: toIso(p.starts_at_l ?? toLocal(p.starts_at)), ends_at: toIso(p.ends_at_l ?? toLocal(p.ends_at)) } });
    setBusy(false);
    if (error) toast('Not saved. Amount must be ₦1 to ₦100,000.', 'error'); else { toast('Saved', 'success'); load(); }
  };
  const toggle = async (c: any) => {
    const exposure = c.enabled ? 0 : (c.max_total ? Math.min(Number(c.max_total), c.eligible * Number(c.amount)) : c.eligible * Number(c.amount));
    if (!c.enabled && !window.confirm(`Switch on "${c.name}"? Up to ${naira(exposure)} can be paid out to ${c.eligible} customers who finish the tasks and press Claim.`)) return;
    save({ ...c, enabled: !c.enabled });
  };
  const saveTask = async (c: any, kind: string, target: string, enabled = true, label = '') => {
    const { error } = await supabase.rpc('admin_bonus_save_task', { p: { campaign_id: c.id, kind, target: Number(target), enabled, label } });
    if (error) toast('Task not saved. Target must be a number above 0.', 'error'); else load();
  };
  const delTask = async (id: string) => { await supabase.rpc('admin_bonus_delete_task', { p_id: id }); load(); };
  const [nt, setNt] = useState<Record<string, { kind: string; target: string }>>({});
  const create = async () => {
    if (!n.name.trim()) { toast('Give the campaign a name', 'error'); return; }
    await save({ ...n, starts_at_l: n.starts_at, ends_at_l: n.ends_at, enabled: false });
    setN({ name: '', message: '', amount: '1000', audience: 'all', starts_at: '', ends_at: '', max_total: '', require_tasks: true });
  };
  return (
    <div className={box}>
      <div><h3 className="text-lg font-black text-emerald-950">WALLET BONUSES</h3>
        <p className="text-xs text-slate-500 font-medium">Customers see the bonus only while a campaign is switched on. With tasks turned on, Claim stays locked until they finish every task you choose. The bonus goes straight to their wallet. "Existing" = registered before the campaign was first set up. Use the budget cap to limit total payout.</p></div>
      {rows.map(c => (
        <div key={c.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-black text-slate-800">{c.name} · {naira(c.amount)} <span className={`text-[10px] ml-1 ${c.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>{c.enabled ? 'ON' : 'OFF'}</span></p>
          <p className="text-[11px] font-semibold text-slate-600">For: {c.audience === 'existing' ? 'existing customers only' : 'all customers'} · Eligible: <b>{c.eligible}</b> · Claimed: <b>{c.claims}</b> ({naira(c.claimed_total)}){c.max_total ? ` of ${naira(c.max_total)} budget` : ''}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Amount (₦)</label><input className={inp} inputMode="numeric" defaultValue={c.amount} onBlur={e => { if (e.target.value !== String(c.amount)) save({ ...c, amount: e.target.value }); }} /></div>
            <div><label className={lbl}>Budget cap (₦, blank = none)</label><input className={inp} inputMode="numeric" defaultValue={c.max_total ?? ''} onBlur={e => { if (e.target.value !== String(c.max_total ?? '')) save({ ...c, max_total: e.target.value }); }} /></div>
            <div><label className={lbl}>Starts</label><input type="datetime-local" className={inp} defaultValue={toLocal(c.starts_at)} onBlur={e => save({ ...c, starts_at_l: e.target.value })} /></div>
            <div><label className={lbl}>Ends</label><input type="datetime-local" className={inp} defaultValue={toLocal(c.ends_at)} onBlur={e => save({ ...c, ends_at_l: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!c.require_tasks} onChange={e => save({ ...c, require_tasks: e.target.checked })} />Customers must finish tasks before they can claim</label>
          {c.require_tasks && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-2">
              <p className="text-[11px] font-black text-amber-900">Tasks (all must be completed). Counted from {c.tasks_since ? new Date(c.tasks_since).toLocaleString() : 'now'}.</p>
              {(c.tasks || []).length === 0 && <p className="text-[11px] font-bold text-rose-700">No tasks yet. Nobody can claim until you add at least one.</p>}
              {(c.tasks || []).map((t: any) => (
                <div key={t.id} className="flex items-center gap-2">
                  <p className={`text-[11px] font-semibold flex-1 min-w-0 ${t.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{TASK_KINDS[t.kind]?.label || t.kind}</p>
                  <input className={inp + ' !w-20'} inputMode="numeric" defaultValue={t.target} onBlur={e => { if (e.target.value !== String(Number(t.target))) saveTask(c, t.kind, e.target.value, t.enabled, t.label || ''); }} aria-label="Target" />
                  <button className={btn2} onClick={() => saveTask(c, t.kind, String(t.target), !t.enabled, t.label || '')}>{t.enabled ? 'Pause' : 'Use'}</button>
                  <button className={btn2} onClick={() => delTask(t.id)}>Remove</button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <select className={inp} value={(nt[c.id]?.kind) || 'share_adverts'} onChange={e => setNt({ ...nt, [c.id]: { kind: e.target.value, target: nt[c.id]?.target || '3' } })}>
                  {Object.entries(TASK_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input className={inp + ' !w-20'} inputMode="numeric" value={nt[c.id]?.target ?? '3'} onChange={e => setNt({ ...nt, [c.id]: { kind: nt[c.id]?.kind || 'share_adverts', target: e.target.value.replace(/\D/g, '') } })} aria-label="Target" />
                <button className={btn} onClick={() => saveTask(c, nt[c.id]?.kind || 'share_adverts', nt[c.id]?.target || '3')}>Add</button>
              </div>
              <p className="text-[10px] font-semibold text-slate-500">Target = how many (shares, days, contributions, friends, purchases) or how many naira for Fund wallet. Progress is counted by the system, so customers cannot fake it.</p>
            </div>
          )}
          <button disabled={busy} className={c.enabled ? btn2 : btn} onClick={() => toggle(c)}>{c.enabled ? 'Switch off' : 'Switch on'}</button>
        </div>
      ))}
      <div className="rounded-xl bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-black text-slate-700">New campaign (starts switched OFF)</p>
        <input className={inp} placeholder="Name e.g. Festive bonus" value={n.name} onChange={e => setN({ ...n, name: e.target.value })} />
        <input className={inp} placeholder="Message shown to customers" value={n.message} onChange={e => setN({ ...n, message: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inp} inputMode="numeric" placeholder="Amount ₦" value={n.amount} onChange={e => setN({ ...n, amount: e.target.value.replace(/\D/g, '') })} />
          <select className={inp} value={n.audience} onChange={e => setN({ ...n, audience: e.target.value })}><option value="all">All customers</option><option value="existing">Existing customers</option></select>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!n.require_tasks} onChange={e => setN({ ...n, require_tasks: e.target.checked })} />Customers must finish tasks before claiming (add tasks after creating)</label>
        <button disabled={busy} className={btn} onClick={create}>Create</button>
      </div>
    </div>
  );
}

export function GamesAdminPanel({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const blank = { id: '', title: '', description: '', icon: '🎮', image_url: '', status: 'coming_soon', play_url: '', sort_order: '0' };
  const [d, setD] = useState<any>(blank);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_games');
    if (error) { toast('Games unavailable. Has the games SQL been run?', 'error'); return; }
    setRows((data || []) as any[]);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_game', { p: { ...d, sort_order: Number(d.sort_order || 0) } });
    setBusy(false);
    if (error) toast(/PLAY_URL/.test(error.message) ? 'A live game needs an https play link.' : 'Not saved. Links must start with https://', 'error'); else { toast('Game saved', 'success'); setD(blank); load(); }
  };
  const del = async (id: string) => { if (!window.confirm('Delete this game?')) return; await supabase.rpc('admin_delete_game', { p_id: id }); load(); };
  return (
    <div className={box}>
      <div><h3 className="text-lg font-black text-emerald-950">GAMES</h3>
        <p className="text-xs text-slate-500 font-medium">Games listed here appear in the customers' Games page. "Coming soon" shows a Notify me button. "Live" opens your https play link. "Hidden" removes it.</p></div>
      {rows.map(g => (
        <div key={g.id} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold text-slate-700 min-w-0"><b>{g.icon} {g.title}</b> · {g.status} · {g.interest} waiting</p>
          <div className="flex gap-1.5 shrink-0"><button className={btn2} onClick={() => setD({ ...g, play_url: g.play_url || '', image_url: g.image_url || '', description: g.description || '', sort_order: String(g.sort_order) })}>Edit</button><button className={btn2} onClick={() => del(g.id)}>Delete</button></div>
        </div>
      ))}
      <div className="rounded-xl bg-slate-50 p-3 space-y-2">
        <p className="text-xs font-black text-slate-700">{d.id ? 'Edit game' : 'Add game'}</p>
        <div className="grid grid-cols-4 gap-2"><input className={inp} value={d.icon} onChange={e => setD({ ...d, icon: e.target.value })} aria-label="Emoji" /><input className={inp + ' col-span-3'} placeholder="Title" value={d.title} onChange={e => setD({ ...d, title: e.target.value })} /></div>
        <input className={inp} placeholder="Short description" value={d.description} onChange={e => setD({ ...d, description: e.target.value })} />
        <input className={inp} placeholder="Cover image link (https, optional)" value={d.image_url} onChange={e => setD({ ...d, image_url: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className={inp} value={d.status} onChange={e => setD({ ...d, status: e.target.value })}><option value="coming_soon">Coming soon</option><option value="live">Live</option><option value="hidden">Hidden</option></select>
          <input className={inp} inputMode="numeric" placeholder="Order" value={d.sort_order} onChange={e => setD({ ...d, sort_order: e.target.value.replace(/\D/g, '') })} />
        </div>
        <input className={inp} placeholder="Play link (https) - needed when Live" value={d.play_url} onChange={e => setD({ ...d, play_url: e.target.value })} />
        <div className="flex gap-2"><button disabled={busy || !d.title.trim()} className={btn} onClick={save}>Save game</button>{d.id && <button className={btn2} onClick={() => setD(blank)}>Cancel</button>}</div>
      </div>
    </div>
  );
}
