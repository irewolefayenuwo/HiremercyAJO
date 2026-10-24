import React, { useCallback, useEffect, useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, friendlyError } from './shopApi';
import { useBonuses } from './BonusGames';
import { naira } from './ui';
import type { SectionKey } from './config';

type Toast = (m: string, t?: 'success' | 'error') => void;
export interface PopupData {
  id: string; title: string | null; subtitle: string | null; image_url: string | null; button_text: string | null;
  action_type: 'none' | 'section' | 'link' | 'bonus'; action_value: string | null; bg_color: string; title_color: string; button_color: string;
  frequency: 'once' | 'daily' | 'always'; updated_at?: string;
}
const today = () => new Date().toISOString().slice(0, 10);
const keyOf = (p: PopupData) => `hm_popup_${p.id}_${(p.updated_at || '').slice(0, 19)}`;
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
};
const sess = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } }
};
function due(p: PopupData): boolean {
  const k = keyOf(p);
  if (sess.get(k + '_s')) return false;
  if (p.frequency === 'once') return !ls.get(k);
  if (p.frequency === 'daily') return ls.get(k) !== today();
  return true;
}

/** The card itself: also used by the admin live preview. */
export function PopupCard({ p, onClose, onAction, preview }: { p: Partial<PopupData>; onClose?: () => void; onAction?: () => void; preview?: boolean }) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full rounded-[28px] overflow-hidden shadow-2xl text-center" style={{ background: p.bg_color || '#FFFDF7' }}>
        <div className="px-6 pt-7 pb-2">
          {p.title && <h2 className="text-[22px] leading-tight font-black" style={{ color: p.title_color || '#111' }}>{p.title}</h2>}
          {p.subtitle && <p className="text-sm font-medium mt-2 opacity-80" style={{ color: p.title_color || '#111' }}>{p.subtitle}</p>}
        </div>
        {p.image_url ? (onAction && p.action_type && p.action_type !== 'none'
          ? <button type="button" onClick={onAction} aria-label={p.title || 'Open promotion'} className="block w-full"><img src={p.image_url} alt="" className="w-full max-h-[46vh] object-contain px-4 py-3" /></button>
          : <img src={p.image_url} alt="" className="w-full max-h-[46vh] object-contain px-4 py-3" />) : preview ? <div className="mx-6 my-3 h-32 rounded-2xl bg-black/5 flex items-center justify-center text-black/30"><ImageIcon className="w-8 h-8" /></div> : <div className="h-3" />}
        {p.button_text && (
          <div className="px-6 pb-6 pt-1">
            <button type="button" onClick={onAction} className="w-full py-3.5 rounded-full text-white text-base font-black active:scale-[0.98] transition" style={{ background: p.button_color || '#064E2B' }}>{p.button_text}</button>
          </div>
        )}
        {!p.button_text && <div className="h-4" />}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="mt-5 w-11 h-11 rounded-full bg-white/20 border border-white/40 text-white flex items-center justify-center backdrop-blur"><X className="w-5 h-5" /></button>
    </div>
  );
}


/** Runs what a promotion's click is configured to do. Never credits anything by itself: bonuses are claimed only on the claim page. */
export function runPromoAction(p: { action_type: string; action_value: string | null }, onSection: (s: SectionKey) => void, openBonus: (id: string) => void) {
  const { action_type: t, action_value: v } = p;
  if (t === 'link' && v && /^https:\/\//.test(v)) window.open(v, '_blank', 'noopener,noreferrer');
  else if (t === 'bonus' && v) openBonus(v);
  else if (t === 'section' && v) {
    if (v === 'myshop') { sess.set('hm_open_myshop', '1'); onSection('oja'); }
    else if (v.startsWith('bills:')) { sess.set('hm_bills_service', v.slice(6)); onSection('bills'); }
    else onSection(v as SectionKey);
  }
}

/** Bonus claim page: explains the offer, shows requirements, claims on the server (once only). */
export function BonusClaimModal({ id, onClose, onSection }: { id: string; onClose: () => void; onSection: (s: SectionKey) => void }) {
  const { list, reload } = useBonuses();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 1200); return () => clearTimeout(t); }, []);
  const b: any = list.find(x => x.id === id);
  const claim = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('claim_bonus', { p_campaign: id });
    setBusy(false);
    if (error) setMsg({ ok: false, text: friendlyError(error) });
    else setMsg({ ok: true, text: `${naira(Number((data as any)?.amount ?? b?.amount))} added to your wallet. New balance: ${naira(Number((data as any)?.wallet_balance ?? 0))}.` });
    reload();
  };
  return (
    <div className="fixed inset-0 z-[75] bg-black/65 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Claim bonus">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2"><p className="text-lg font-black text-emerald-950">{b ? b.name : 'Bonus'}</p><button type="button" aria-label="Close" onClick={onClose}><X className="w-5 h-5" /></button></div>
        {!b && <p className="text-sm text-slate-600 font-medium">{loaded ? 'This offer is not available to you right now (it may have ended or is not for your account).' : 'Loading…'}</p>}
        {b && (
          <>
            {b.message && <p className="text-sm text-slate-600 font-medium">{b.message}</p>}
            <p className="text-3xl font-black text-emerald-700">{naira(b.amount)}</p>
            <p className="text-xs text-slate-500 font-medium">Goes into your wallet money and can be used for eligible purchases (airtime, data, bills). {b.ends_at ? `Claim before ${new Date(b.ends_at).toLocaleDateString()}.` : ''}</p>
            {b.require_tasks && Array.isArray(b.tasks) && b.tasks.length > 0 && (
              <ul className="space-y-1.5">{b.tasks.map((t: any, i: number) => (
                <li key={i} className={`text-xs font-bold rounded-xl px-3 py-2 ${t.met ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}>{t.met ? '✓ ' : '○ '}{t.label || 'Task'} ({Number(t.done)}/{Number(t.target)})</li>
              ))}</ul>
            )}
            {b.claimed && !msg?.ok && <p className="text-sm font-bold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">You have already claimed this bonus.</p>}
            {msg && <p className={`text-sm font-bold rounded-xl px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
            {msg?.ok
              ? <button type="button" onClick={() => { onClose(); onSection('wallet'); }} className="w-full py-3 rounded-full bg-emerald-700 text-white font-black">Open wallet</button>
              : <button type="button" disabled={busy || b.claimed} onClick={() => void claim()} className="w-full py-3 rounded-full bg-emerald-700 text-white font-black disabled:opacity-50">{b.claimed ? 'Already claimed' : busy ? 'Claiming…' : 'Claim Bonus'}</button>}
          </>
        )}
      </div>
    </div>
  );
}

export function PopupHost({ onSection }: { onSection: (s: SectionKey) => void }) {
  const [queue, setQueue] = useState<PopupData[]>([]);
  const [bonusId, setBonusId] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    Promise.resolve(supabase.rpc('get_active_popups')).then(({ data, error }) => {
      if (dead || error) return;
      const list = ((data || []) as PopupData[]).filter(due);
      setQueue(list);
    }).catch(() => undefined);
    return () => { dead = true; };
  }, []);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    Promise.resolve(supabase.rpc('popup_track', { p_id: cur.id, p_kind: 'view' })).catch(() => undefined);
  }, [cur?.id]);
  const finish = useCallback((p: PopupData) => {
    const k = keyOf(p);
    sess.set(k + '_s', '1');
    if (p.frequency === 'once') ls.set(k, '1'); else if (p.frequency === 'daily') ls.set(k, today());
    setQueue(q => q.filter(x => x.id !== p.id));
  }, []);
  if (!cur) return bonusId ? <BonusClaimModal id={bonusId} onClose={() => setBonusId(null)} onSection={onSection} /> : null;
  const act = () => {
    Promise.resolve(supabase.rpc('popup_track', { p_id: cur.id, p_kind: 'click' })).catch(() => undefined);
    const picked = cur;
    finish(picked);
    runPromoAction(picked, onSection, setBonusId);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/65 hm-fade" role="dialog" aria-modal="true" aria-label={cur.title || 'Announcement'}>
      <div className="w-full max-w-sm"><PopupCard p={cur} onClose={() => finish(cur)} onAction={act} /></div>
      {bonusId && <BonusClaimModal id={bonusId} onClose={() => setBonusId(null)} onSection={onSection} />}
    </div>
  );
}

const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const toLocal = (iso?: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const toIso = (l: string) => l ? new Date(l).toISOString() : '';
const SECTIONS_OPT: [string, string][] = [['home', 'Home'], ['ajo', 'Ajo savings'], ['wallet', 'Wallet'], ['oja', 'Gbagede OJA'], ['myshop', 'My Shop'], ['bills', 'Bills & top-up'], ['bills:airtime', 'Buy airtime'], ['bills:data', 'Buy data'], ['bills:electricity', 'Pay electricity'], ['bills:tv', 'TV subscription'], ['rewards', 'Rewards'], ['referrals', 'Referrals'], ['advertise', 'Advertise'], ['games', 'Games'], ['profile', 'Profile']];
const BLANK = { id: '', name: '', title: '', subtitle: '', image_url: '', button_text: 'Learn more', action_type: 'section', action_value: 'wallet', placement: 'popup', bg_color: '#FFFDF7', title_color: '#111111', button_color: '#064E2B', frequency: 'daily', audience: 'all', priority: '0', starts_at: '', ends_at: '', enabled: false };

export function PopupsAdminPanel({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [d, setD] = useState<any>(BLANK);
  const [busy, setBusy] = useState(false); const [up, setUp] = useState(false);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { void (async () => { const { data } = await supabase.rpc('admin_list_bonus_campaigns'); setCamps(((data || []) as any[]).map(c => ({ id: c.id, name: c.name }))); })(); }, []);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_popups');
    if (error) { toast('Pop-ups unavailable. Has the pop-up SQL been run?', 'error'); return; }
    setRows((data || []) as any[]);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const edit = (r: any) => setD({ ...BLANK, ...r, title: r.title || '', subtitle: r.subtitle || '', image_url: r.image_url || '', button_text: r.button_text || '', action_value: r.action_value || '', priority: String(r.priority), starts_at: toLocal(r.starts_at), ends_at: toLocal(r.ends_at) });
  const save = async (over?: any) => {
    const x = { ...d, ...over };
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_popup', { p: { ...x, priority: Number(x.priority || 0), starts_at: typeof x.starts_at === 'string' && x.starts_at.length === 16 ? toIso(x.starts_at) : x.starts_at || '', ends_at: typeof x.ends_at === 'string' && x.ends_at.length === 16 ? toIso(x.ends_at) : x.ends_at || '' } });
    setBusy(false);
    if (error) toast(/LINK/.test(error.message) ? 'Link must start with https://' : /SECTION/.test(error.message) ? 'Choose a page to open' : /BONUS/.test(error.message) ? 'Choose a bonus to open' : 'Not saved. Give it a name; the image must be https.', 'error');
    else { toast('Pop-up saved', 'success'); if (!over) setD(BLANK); load(); }
  };
  const toggle = async (r: any) => { await supabase.rpc('admin_save_popup', { p: { ...r, enabled: !r.enabled } }); load(); };
  const del = async (id: string) => { if (!window.confirm('Delete this pop-up?')) return; await supabase.rpc('admin_delete_popup', { p_id: id }); load(); };
  const pickImg = async (f?: File | null) => {
    if (!f) return; setUp(true);
    try { set('image_url', await uploadImage('popups', 'img', f, 900)); } catch (e: any) { toast(e.message || 'Upload failed', 'error'); }
    setUp(false);
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div><h3 className="text-lg font-black text-emerald-950">POP-UP MESSAGES</h3>
        <p className="text-xs text-slate-500 font-medium">Cards that appear when customers open the app. Set the picture, words, button, colours, dates, how often it shows, and who sees it. Pop-ups start switched off.</p></div>
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold text-slate-700 min-w-0"><b>{r.name}</b> <span className={r.enabled ? 'text-emerald-700' : 'text-slate-400'}>{r.enabled ? 'ON' : 'OFF'}</span><br /><span className="text-slate-500">{r.views} views · {r.clicks} clicks · {r.frequency} · {r.audience}{r.ends_at ? ` · until ${new Date(r.ends_at).toLocaleDateString()}` : ''}</span></p>
          <div className="flex gap-1.5 shrink-0"><button className={btn2} onClick={() => toggle(r)}>{r.enabled ? 'Off' : 'On'}</button><button className={btn2} onClick={() => edit(r)}>Edit</button><button className={btn2} onClick={() => del(r.id)}>Delete</button></div>
        </div>
      ))}
      <div className="rounded-xl bg-slate-50 p-3 space-y-2.5">
        <p className="text-xs font-black text-slate-700">{d.id ? 'Edit pop-up' : 'New pop-up'}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <input className={inp} placeholder="Internal name" value={d.name} onChange={e => set('name', e.target.value)} />
            <div><label className={lbl}>Where it shows</label><select className={inp} value={d.placement || 'popup'} onChange={e => set('placement', e.target.value)}><option value="popup">Pop-up when the app opens</option><option value="banner">Slide in the Home banner carousel</option></select></div>
            <input className={inp} placeholder="Title" value={d.title} onChange={e => set('title', e.target.value)} />
            <textarea className={inp} rows={2} placeholder="Subtitle" value={d.subtitle} onChange={e => set('subtitle', e.target.value)} />
            <div className="flex items-center gap-2">
              <label className={btn2 + ' cursor-pointer inline-flex items-center gap-1.5'}>{up ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}Upload picture<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { pickImg(e.target.files?.[0]); e.target.value = ''; }} /></label>
              {d.image_url && <button className="text-[11px] font-bold text-red-600" onClick={() => set('image_url', '')}>Remove</button>}
            </div>
            <input className={inp} placeholder="Button text (blank = no button)" value={d.button_text} onChange={e => set('button_text', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className={inp} value={d.action_type} onChange={e => set('action_type', e.target.value)}><option value="none">Button just closes</option><option value="section">Open a page</option><option value="link">Open a link</option><option value="bonus">Open a bonus-claim page</option></select>
              {d.action_type === 'section' && <select className={inp} value={d.action_value} onChange={e => set('action_value', e.target.value)}>{SECTIONS_OPT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
              {d.action_type === 'bonus' && <select className={inp} value={d.action_value} onChange={e => set('action_value', e.target.value)}><option value="">Choose a bonus…</option>{camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
              {d.action_type === 'link' && <input className={inp} placeholder="https://…" value={d.action_value} onChange={e => set('action_value', e.target.value)} />}
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              {([['bg_color', 'Background'], ['title_color', 'Text'], ['button_color', 'Button']] as const).map(([k, l]) => <div key={k}><label className={lbl}>{l}</label><input type="color" value={d[k]} onChange={e => set(k, e.target.value)} className="w-full h-9 rounded-lg border border-slate-200" /></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Shows</label><select className={inp} value={d.frequency} onChange={e => set('frequency', e.target.value)}><option value="once">Once per customer</option><option value="daily">Once a day</option><option value="always">Every time the app opens</option></select></div>
              <div><label className={lbl}>For</label><select className={inp} value={d.audience} onChange={e => set('audience', e.target.value)}><option value="all">Everyone</option><option value="new">New (last 30 days)</option><option value="existing">Older customers</option></select></div>
              <div><label className={lbl}>Starts</label><input type="datetime-local" className={inp} value={d.starts_at} onChange={e => set('starts_at', e.target.value)} /></div>
              <div><label className={lbl}>Ends</label><input type="datetime-local" className={inp} value={d.ends_at} onChange={e => set('ends_at', e.target.value)} /></div>
              <div><label className={lbl}>Priority (higher shows first)</label><input className={inp} inputMode="numeric" value={d.priority} onChange={e => set('priority', e.target.value.replace(/\D/g, ''))} /></div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-5"><input type="checkbox" checked={!!d.enabled} onChange={e => set('enabled', e.target.checked)} /> Switched on</label>
            </div>
            <div className="flex gap-2"><button disabled={busy || !d.name.trim()} className={btn} onClick={() => save()}>Save pop-up</button>{d.id && <button className={btn2} onClick={() => setD(BLANK)}>Cancel</button>}</div>
          </div>
          <div>
            <p className={lbl}>Live preview</p>
            <div className="rounded-2xl bg-black/65 p-5 flex justify-center"><div className="w-full max-w-[260px]"><PopupCard p={{ ...d, title: d.title || 'Your title', button_text: d.button_text }} preview /></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
