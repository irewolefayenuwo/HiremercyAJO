import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Gamepad2, Bell, BellRing, Play, Loader2, Sparkles } from 'lucide-react';
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

export interface Bonus { id: string; name: string; message: string | null; amount: number; ends_at: string | null; claimed: boolean }

/** Customer bonuses the admin has switched on. Empty when none (or when the SQL is not installed). */
export function useBonuses() {
  const [list, setList] = useState<Bonus[]>([]);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_bonuses');
    setList(error ? [] : ((data || []) as any[]).map(b => ({ ...b, amount: Number(b.amount) })));
  }, []);
  useEffect(() => { load(); }, [load]);
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
      {open.map(b => (
        <div key={b.id} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white p-4 shadow-md">
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/15" />
          <div className="relative flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center shrink-0"><Gift className="w-6 h-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black leading-tight">{naira(b.amount)} bonus for you!</p>
              <p className="text-[11px] font-semibold text-white/90">{b.message || b.name}</p>
              {b.ends_at && <p className="text-[10px] font-bold text-white/80 mt-0.5">Claim before {new Date(b.ends_at).toLocaleDateString()}</p>}
            </div>
            <button type="button" disabled={busy === b.id} onClick={() => claim(b)} className="shrink-0 bg-white text-orange-600 text-xs font-black px-4 py-2.5 rounded-xl shadow active:scale-95 disabled:opacity-60">{busy === b.id ? '…' : 'Claim'}</button>
          </div>
        </div>
      ))}
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
  const [n, setN] = useState<any>({ name: '', message: '', amount: '1000', audience: 'all', starts_at: '', ends_at: '', max_total: '' });
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
    if (!c.enabled && !window.confirm(`Switch on "${c.name}"? Up to ${naira(exposure)} can be paid out to ${c.eligible} customers who press Claim.`)) return;
    save({ ...c, enabled: !c.enabled });
  };
  const create = async () => {
    if (!n.name.trim()) { toast('Give the campaign a name', 'error'); return; }
    await save({ ...n, starts_at_l: n.starts_at, ends_at_l: n.ends_at, enabled: false });
    setN({ name: '', message: '', amount: '1000', audience: 'all', starts_at: '', ends_at: '', max_total: '' });
  };
  return (
    <div className={box}>
      <div><h3 className="text-lg font-black text-emerald-950">WALLET BONUSES</h3>
        <p className="text-xs text-slate-500 font-medium">Customers see a Claim button only while a campaign is switched on. The bonus goes straight to their wallet. "Existing" = registered before the campaign was first set up. Use the budget cap to limit total payout.</p></div>
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
