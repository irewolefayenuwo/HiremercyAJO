import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Share2, Check, Download, Loader2, Sparkles, Image as ImageIcon, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, SectionTitle, copyText } from './ui';
import { uploadImage, uploadVideo } from './shopApi';
import { buildShareLink } from './shareAdvert';

type Toast = (m: string, t?: 'success' | 'error') => void;
export type SharePlatform = 'whatsapp' | 'facebook' | 'tiktok' | 'instagram' | 'x' | 'telegram' | 'other';
const PLATFORMS: { key: SharePlatform; label: string; color: string; url?: boolean }[] = [
  { key: 'whatsapp', label: 'WhatsApp', color: 'bg-[#128C7E]', url: true },
  { key: 'facebook', label: 'Facebook', color: 'bg-[#1877F2]', url: true },
  { key: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { key: 'instagram', label: 'Instagram', color: 'bg-gradient-to-br from-fuchsia-500 to-orange-400' },
  { key: 'x', label: 'X', color: 'bg-slate-800', url: true },
  { key: 'telegram', label: 'Telegram', color: 'bg-[#229ED9]', url: true },
  { key: 'other', label: 'More…', color: 'bg-emerald-700' }
];

export interface ShareAdvertInfo {
  id: string; title: string; caption: string | null; image_url: string | null; video_url: string | null;
  link_mode: 'referral' | 'custom'; link_url: string | null; append_referral: boolean; platforms: SharePlatform[]; points: number; shared_today: boolean;
}
interface TodayInfo { rewards_enabled: boolean; daily_cap: number; rewarded_today: number; adverts: ShareAdvertInfo[] }

/** The caption plus the link that follows the advert automatically. */
export function composeShare(a: ShareAdvertInfo, referralCode?: string | null): { text: string; link: string; caption: string } {
  const ref = buildShareLink(referralCode);
  const caption = (a.caption || a.title).trim();
  const link = a.link_mode === 'custom' && a.link_url ? a.link_url : ref;
  const lines = [caption, '', link];
  if (a.link_mode === 'custom' && a.append_referral && ref !== link) lines.push(`Join HireMercyAJO: ${ref}`);
  return { text: lines.join('\n'), link, caption };
}

async function nativeShare(a: ShareAdvertInfo, text: string): Promise<'done' | 'cancelled' | 'unsupported'> {
  const nav: any = navigator;
  if (typeof nav.share !== 'function') return 'unsupported';
  try {
    const mediaUrl = a.video_url || a.image_url;
    if (mediaUrl && typeof nav.canShare === 'function') {
      try {
        const res = await fetch(mediaUrl);
        const blob = await res.blob();
        if (blob.size <= 40 * 1024 * 1024) {
          const ext = (blob.type.split('/')[1] || 'jpg').replace('quicktime', 'mov');
          const file = new File([blob], `advert.${ext}`, { type: blob.type });
          if (nav.canShare({ files: [file] })) { await nav.share({ files: [file], text, title: a.title }); return 'done'; }
        }
      } catch (e: any) { if (e && e.name === 'AbortError') return 'cancelled'; /* fall back to text */ }
    }
    await nav.share({ text, title: a.title });
    return 'done';
  } catch (e: any) {
    return e && e.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

function platformUrl(p: SharePlatform, caption: string, text: string, link: string): string {
  const e = encodeURIComponent;
  if (p === 'whatsapp') return `https://wa.me/?text=${e(text)}`;
  if (p === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${e(link)}`;
  if (p === 'telegram') return `https://t.me/share/url?url=${e(link)}&text=${e(caption)}`;
  if (p === 'x') return `https://twitter.com/intent/tweet?text=${e(caption)}&url=${e(link)}`;
  return '';
}

function AdvertCard({ a, referralCode, rewardsOn, onDone }: { a: ShareAdvertInfo; referralCode?: string | null; rewardsOn: boolean; onDone: () => void }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SharePlatform | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const pendingRef = useRef<SharePlatform | null>(null);
  pendingRef.current = pending;
  const { text, link, caption } = composeShare(a, referralCode);

  const complete = useCallback(async (p: SharePlatform) => {
    setPending(null); setBusy(true);
    const { data, error } = await supabase.rpc('share_advert_done', { p_advert: a.id, p_platform: p });
    setBusy(false);
    if (error) { setMsg('Shared. We could not record it right now.'); return; }
    const r = data as any;
    if (r?.already) setMsg('Shared again. Today\'s points for this advert were already counted.');
    else if (Number(r?.awarded) > 0) setMsg(`Shared successfully! You earned ${r.awarded} points.`);
    else if (r?.limit_reached) setMsg('Shared successfully! You have reached today\'s points limit.');
    else setMsg('Shared successfully. Thank you!');
    onDone();
  }, [a.id, onDone]);

  // Coming back to the app after sharing marks the share as done.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { hiddenAt.current = Date.now(); return; }
      const p = pendingRef.current;
      if (p && hiddenAt.current && Date.now() - hiddenAt.current >= 2500) { hiddenAt.current = null; complete(p); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [complete]);

  const go = async (p: SharePlatform) => {
    setMsg(''); hiddenAt.current = null;
    const def = PLATFORMS.find(x => x.key === p)!;
    if (def.url) {
      await copyText(text);
      const url = platformUrl(p, caption, text, link);
      setPending(p);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const r = await nativeShare(a, text);
    if (r === 'done') { await complete(p); return; }
    if (r === 'cancelled') { setMsg('Share cancelled.'); return; }
    await copyText(text);
    setPending(p);
    setMsg(`Caption and link copied. Open ${def.label}, post it${a.video_url || a.image_url ? ' with the picture/video (use Save below)' : ''}, then come back and tap "I have shared".`);
  };

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
      {a.video_url ? (
        <video src={a.video_url} poster={a.image_url || undefined} controls playsInline muted loop preload="metadata" className="w-full max-h-72 bg-black" />
      ) : a.image_url ? (
        <img src={a.image_url} alt="" loading="lazy" className="w-full max-h-72 object-cover" />
      ) : null}
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black text-slate-900">{a.title}</p>
          {a.shared_today
            ? <span className="shrink-0 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-full px-2 py-1 flex items-center gap-1"><Check className="w-3 h-3" />Done today</span>
            : rewardsOn && a.points > 0 ? <span className="shrink-0 text-[10px] font-black bg-amber-100 text-amber-800 rounded-full px-2 py-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />+{a.points} pts</span> : null}
        </div>
        {a.caption && <p className="text-xs font-medium text-slate-600 whitespace-pre-line">{a.caption}</p>}
        <p className="text-[11px] font-semibold text-slate-500 break-all">Link added automatically: {link}</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.filter(p => a.platforms.includes(p.key)).map(p => (
            <button key={p.key} type="button" disabled={busy} onClick={() => go(p.key)}
              className={`${p.color} text-white text-xs font-black px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 disabled:opacity-60`}>
              {p.key === 'other' ? <Share2 className="w-3.5 h-3.5" /> : null}{p.label}
            </button>
          ))}
        </div>
        {(a.video_url || a.image_url) && (
          <a href={a.video_url || a.image_url || '#'} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 underline"><Download className="w-3.5 h-3.5" />Save the {a.video_url ? 'video' : 'picture'} to post it on TikTok or Instagram</a>
        )}
        {pending && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-amber-900">Finished sharing? We will also mark it when you return to the app.</p>
            <button type="button" onClick={() => complete(pending)} className="shrink-0 bg-amber-500 text-white text-xs font-black px-3 py-2 rounded-lg">I have shared</button>
          </div>
        )}
        {busy && <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Recording your share…</p>}
        {msg && <p className="text-[11px] font-bold text-emerald-700">{msg}</p>}
      </div>
    </div>
  );
}

/** Adverts the admin selected for today. Sharing one marks it successful and pays the points. */
export function TodaysShareAdverts({ referralCode, compact, onChanged }: { referralCode?: string | null; compact?: boolean; onChanged?: () => void }) {
  const [info, setInfo] = useState<TodayInfo | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_todays_share_adverts');
    setInfo(error || !data ? null : (data as TodayInfo));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!info || info.adverts.length === 0) return null;
  const left = Math.max(0, info.daily_cap - info.rewarded_today);
  return (
    <Card>
      <SectionTitle>{compact ? 'Share today\'s advert' : 'Today\'s adverts to share'}</SectionTitle>
      <p className="text-[11px] font-semibold text-slate-500 -mt-2 mb-3">
        {info.rewards_enabled
          ? `Share on WhatsApp, Facebook, TikTok and more. You earn points for up to ${info.daily_cap} advert${info.daily_cap > 1 ? 's' : ''} a day (${left} left today).`
          : 'Share on WhatsApp, Facebook, TikTok and more. Your referral link goes with it.'}
      </p>
      <div className="space-y-3">
        {info.adverts.map(a => <AdvertCard key={a.id} a={a} referralCode={referralCode} rewardsOn={info.rewards_enabled} onDone={() => { load(); onChanged?.(); }} />)}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ admin
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const lagosDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
const ALL: SharePlatform[] = ['whatsapp', 'facebook', 'tiktok', 'instagram', 'x', 'telegram', 'other'];
const BLANK = { id: '', title: '', caption: '', image_url: '', video_url: '', link_mode: 'referral', link_url: '', append_referral: true, platforms: ALL, points: '', starts_on: '', ends_on: '', enabled: false, sort_order: '0' };

export function ShareAdvertsAdminPanel({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [d, setD] = useState<any>(BLANK);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<'' | 'image' | 'video'>('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_share_adverts');
    if (error) { toast('Share adverts unavailable. Has the share-advert SQL (09) been run?', 'error'); return; }
    setRows((data || []) as any[]);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const togglePlat = (k: SharePlatform) => set('platforms', d.platforms.includes(k) ? d.platforms.filter((x: string) => x !== k) : [...d.platforms, k]);
  const edit = (r: any) => setD({ ...BLANK, ...r, caption: r.caption || '', image_url: r.image_url || '', video_url: r.video_url || '', link_url: r.link_url || '', points: r.points == null ? '' : String(r.points), starts_on: r.starts_on || '', ends_on: r.ends_on || '', sort_order: String(r.sort_order) });
  const payload = (x: any) => ({ ...x, points: x.points === '' ? null : Number(x.points), sort_order: Number(x.sort_order || 0), starts_on: x.starts_on || '', ends_on: x.ends_on || '' });
  const save = async (x = d, quiet = false) => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_share_advert', { p: payload(x) });
    setBusy(false);
    if (error) {
      const m = error.message || '';
      toast(/LINK/.test(m) ? 'Links must start with https:// (a custom link is required when link type is Custom).' : /PLATFORM/.test(m) ? 'Pick at least one platform.' : /VIDEO|IMAGE/.test(m) ? 'Picture or video link is not valid.' : 'Not saved. Check the title and dates.', 'error');
      return false;
    }
    if (!quiet) { toast('Advert saved', 'success'); setD(BLANK); }
    load(); return true;
  };
  const upload = async (kind: 'image' | 'video', f?: File | null) => {
    if (!f) return; setUp(kind);
    try { set(kind === 'image' ? 'image_url' : 'video_url', kind === 'image' ? await uploadImage('adverts', 'share', f, 1280) : await uploadVideo('adverts', 'share', f)); }
    catch (e: any) { toast(e.message || 'Upload failed. Has the share-advert SQL (09) been run?', 'error'); }
    setUp('');
  };
  const del = async (id: string) => { if (!window.confirm('Delete this advert and its share history?')) return; await supabase.rpc('admin_delete_share_advert', { p_id: id }); load(); };
  const useToday = (r: any) => save({ ...r, caption: r.caption || '', image_url: r.image_url || '', video_url: r.video_url || '', link_url: r.link_url || '', points: r.points == null ? '' : r.points, starts_on: lagosDay(), ends_on: lagosDay(), enabled: true }, true).then(ok => ok && toast('Selected for today', 'success'));
  const status = (r: any) => r.live_today ? { t: 'LIVE TODAY', c: 'text-emerald-700' } : r.enabled ? { t: r.starts_on && r.starts_on > lagosDay() ? `Scheduled ${r.starts_on}` : 'Ended', c: 'text-amber-700' } : { t: 'OFF', c: 'text-slate-400' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-lg font-black text-emerald-950">SHARE ADVERTS (CUSTOMERS SHARE & EARN)</h3>
        <p className="text-xs text-slate-500 font-medium">Create adverts with text, a picture or a video. Choose the days they run and where customers can share them. The link is added automatically (the customer's referral link, or your own link). A customer who shares an advert selected for today is marked successful and receives the advert-share points set in Rewards settings (switch that reward on there).</p>
      </div>
      {rows.map(r => {
        const s = status(r);
        return (
          <div key={r.id} className="border-t border-slate-100 pt-2.5 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 min-w-0"><b>{r.title}</b> <span className={`font-black ${s.c}`}>{s.t}</span><br />
                <span className="text-slate-500">{r.video_url ? 'Video' : r.image_url ? 'Picture' : 'Text'} · {r.starts_on || 'any day'} to {r.ends_on || 'no end'} · shared {r.shares_today} today / {r.shares_total} total{r.points != null ? ` · ${r.points} pts` : ''}</span></p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button className={btn} disabled={busy} onClick={() => useToday(r)}>Select for today</button>
              <button className={btn2} onClick={() => save({ ...r, caption: r.caption || '', image_url: r.image_url || '', video_url: r.video_url || '', link_url: r.link_url || '', points: r.points == null ? '' : r.points, enabled: !r.enabled }, true)}>{r.enabled ? 'Turn off' : 'Turn on'}</button>
              <button className={btn2} onClick={() => edit(r)}>Edit</button>
              <button className={btn2} onClick={() => del(r.id)}>Delete</button>
            </div>
          </div>
        );
      })}
      <div className="rounded-xl bg-slate-50 p-3 space-y-2.5">
        <p className="text-xs font-black text-slate-700">{d.id ? 'Edit advert' : 'New share advert'}</p>
        <input className={inp} placeholder="Title" value={d.title} onChange={e => set('title', e.target.value)} />
        <textarea className={inp} rows={3} placeholder="Caption customers post (optional)" value={d.caption} onChange={e => set('caption', e.target.value)} />
        <div className="flex flex-wrap gap-2 items-center">
          <label className={btn2 + ' cursor-pointer inline-flex items-center gap-1.5'}>{up === 'image' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}Upload picture<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { upload('image', e.target.files?.[0]); e.target.value = ''; }} /></label>
          <label className={btn2 + ' cursor-pointer inline-flex items-center gap-1.5'}>{up === 'video' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}Upload video (max 40 MB)<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={e => { upload('video', e.target.files?.[0]); e.target.value = ''; }} /></label>
          {d.image_url && <button className="text-[11px] font-bold text-red-600" onClick={() => set('image_url', '')}>Remove picture</button>}
          {d.video_url && <button className="text-[11px] font-bold text-red-600" onClick={() => set('video_url', '')}>Remove video</button>}
        </div>
        {(d.image_url || d.video_url) && (d.video_url ? <video src={d.video_url} poster={d.image_url || undefined} controls muted playsInline className="w-full max-h-48 rounded-xl bg-black" /> : <img src={d.image_url} alt="" className="w-full max-h-48 object-cover rounded-xl" />)}
        <div>
          <p className={lbl}>Where customers can share it</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {ALL.map(k => <label key={k} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 capitalize"><input type="checkbox" checked={d.platforms.includes(k)} onChange={() => togglePlat(k)} />{k === 'x' ? 'X (Twitter)' : k === 'other' ? 'More apps (share sheet)' : k}</label>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={lbl}>Link that follows the advert</label><select className={inp} value={d.link_mode} onChange={e => set('link_mode', e.target.value)}><option value="referral">Customer's own referral link</option><option value="custom">My own link</option></select></div>
          {d.link_mode === 'custom' && <div><label className={lbl}>Your link (https://…)</label><input className={inp} value={d.link_url} onChange={e => set('link_url', e.target.value)} /></div>}
        </div>
        {d.link_mode === 'custom' && <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!d.append_referral} onChange={e => set('append_referral', e.target.checked)} /> Also add the customer's referral link under it</label>}
        <div className="grid grid-cols-2 gap-2">
          <div><label className={lbl}>Runs from (blank = any day)</label><input type="date" className={inp} value={d.starts_on} onChange={e => set('starts_on', e.target.value)} /></div>
          <div><label className={lbl}>Runs until (blank = no end)</label><input type="date" className={inp} value={d.ends_on} onChange={e => set('ends_on', e.target.value)} /></div>
          <div><label className={lbl}>Points for this advert (blank = default)</label><input className={inp} inputMode="numeric" value={d.points} onChange={e => set('points', e.target.value.replace(/\D/g, ''))} /></div>
          <div><label className={lbl}>Order</label><input className={inp} inputMode="numeric" value={d.sort_order} onChange={e => set('sort_order', e.target.value.replace(/\D/g, ''))} /></div>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!d.enabled} onChange={e => set('enabled', e.target.checked)} /> Switched on</label>
        <div className="flex gap-2 flex-wrap">
          <button disabled={busy || up !== '' || d.title.trim().length < 2} className={btn} onClick={() => save()}>Save advert</button>
          <button disabled={busy || up !== '' || d.title.trim().length < 2} className={btn2} onClick={() => { const t = lagosDay(); save({ ...d, starts_on: t, ends_on: t, enabled: true }); }}>Save & select for today</button>
          {d.id && <button className={btn2} onClick={() => setD(BLANK)}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}
