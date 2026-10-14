import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Crown, Sparkles, Share2, Copy, ExternalLink, Plus, Image as ImageIcon, Trash2, Eye, Loader2, Gift, Tag, Store, Pencil, X, BarChart3, BadgeCheck, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Pill, PrimaryButton, SecondaryButton, Sheet, SectionTitle, naira, copyText, whatsappUrl } from './ui';
import { newIdempotencyKey } from './vtuApi';
import {
  friendlyError, loadMyShopItems, loadShopConfig, quote, shopUrl, uploadImage,
  type ShopConfig, type ShopItem, type ShopPackage, type ShopQuote
} from './shopApi';
import type { SectionKey } from './config';

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const THEME: Record<string, { grad: string; ring: string; chip: string; icon: React.ReactNode }> = {
  standard: { grad: 'from-slate-700 to-slate-900', ring: 'ring-slate-300', chip: 'bg-slate-100 text-slate-700', icon: <Store className="w-5 h-5" /> },
  silver: { grad: 'from-sky-500 to-indigo-600', ring: 'ring-sky-300', chip: 'bg-sky-100 text-sky-700', icon: <Sparkles className="w-5 h-5" /> },
  gold: { grad: 'from-amber-400 to-orange-500', ring: 'ring-amber-300', chip: 'bg-amber-100 text-amber-800', icon: <Crown className="w-5 h-5" /> },
  premium: { grad: 'from-fuchsia-600 via-purple-700 to-indigo-800', ring: 'ring-fuchsia-300', chip: 'bg-fuchsia-100 text-fuchsia-800', icon: <BadgeCheck className="w-5 h-5" /> }
};
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));

function featureList(p: ShopPackage): string[] {
  const l = [...p.perks];
  if (!l.length) {
    l.push(`Up to ${p.max_items} products`, `${p.max_photos} photo${p.max_photos > 1 ? 's' : ''} per product`);
    if (p.analytics) l.push('Views and shares statistics');
    if (p.auto_publish) l.push('Products go live instantly');
  }
  return l;
}

function PackageCard({ p, current, onPick, freeNote }: { p: ShopPackage; current: boolean; onPick: () => void; freeNote?: string }) {
  const t = THEME[p.code] || THEME.standard;
  const promo = p.effective_price < p.price;
  return (
    <div className={`relative rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden ${current ? `ring-2 ${t.ring}` : ''}`}>
      <div className={`bg-gradient-to-br ${t.grad} text-white p-4 relative`}>
        <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">{t.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">{p.name}</p>
            <p className="text-[11px] text-white/80 font-semibold">{p.tagline}</p>
          </div>
          {promo && p.promo_label && <span className="text-[10px] font-black bg-white text-red-600 rounded-full px-2 py-1">{p.promo_label}</span>}
          {p.control_pct >= 50 && <span className="text-[10px] font-black bg-white/90 text-purple-700 rounded-full px-2 py-1">{p.control_pct}% yours</span>}
        </div>
        <div className="relative mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black">{naira(p.effective_price)}</span>
          {promo && <span className="text-sm font-bold text-white/70 line-through">{naira(p.price)}</span>}
          <span className="text-[11px] font-semibold text-white/80">/ month</span>
        </div>
        {(p.discount_3m_pct > 0 || p.discount_12m_pct > 0) && (
          <p className="relative text-[10px] font-bold text-white/90 mt-1">
            {p.discount_3m_pct > 0 && `Save ${p.discount_3m_pct}% on 3 months`}{p.discount_3m_pct > 0 && p.discount_12m_pct > 0 && ' · '}{p.discount_12m_pct > 0 && `Save ${p.discount_12m_pct}% on 12 months`}
          </p>
        )}
      </div>
      <div className="p-4 space-y-3">
        <ul className="space-y-1.5">
          {featureList(p).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700"><Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />{f}</li>
          ))}
        </ul>
        {freeNote && <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">{freeNote}</p>}
        <button type="button" onClick={onPick} className={`w-full py-3 rounded-xl text-sm font-black text-white bg-gradient-to-r ${t.grad} active:scale-[0.98] transition`}>
          {current ? 'Renew this plan' : 'Choose ' + p.name}
        </button>
      </div>
    </div>
  );
}

function SubscribeSheet({ pkg, balance, onClose, onDone, onFund }: { pkg: ShopPackage | null; balance: number; onClose: () => void; onDone: () => void; onFund: () => void }) {
  const [months, setMonths] = useState(1);
  const [coupon, setCoupon] = useState('');
  const [q, setQ] = useState<ShopQuote | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newIdempotencyKey());
  useEffect(() => { setMonths(1); setCoupon(''); setQ(null); setErr(''); setKey(newIdempotencyKey()); }, [pkg?.code]);
  useEffect(() => {
    if (!pkg) return;
    let dead = false;
    const t = setTimeout(async () => {
      const r = await quote(pkg.code, months, coupon);
      if (dead) return;
      if (r.ok) { setQ(r.q); setErr(''); } else { setQ(null); setErr(r.message); }
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [pkg, months, coupon]);
  if (!pkg) return null;
  const short = q ? balance < q.total : false;
  const pay = async () => {
    if (!q || busy) return;
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('shop_subscribe', { p_package: pkg.code, p_months: months, p_coupon: coupon.trim() || null, p_key: key });
    setBusy(false);
    if (error) { setErr(friendlyError(error, 'Payment did not go through. Check your wallet before trying again.')); return; }
    onDone();
  };
  return (
    <Sheet open onClose={onClose} title={`${pkg.name} plan`}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 12].map(m => {
            const pct = m === 3 ? pkg.discount_3m_pct : m === 12 ? pkg.discount_12m_pct : 0;
            return (
              <button key={m} type="button" onClick={() => setMonths(m)}
                className={`rounded-2xl border-2 py-2.5 px-1 text-center transition ${months === m ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                <p className="text-sm font-black text-slate-800">{m} {m === 1 ? 'month' : 'months'}</p>
                <p className="text-[10px] font-bold text-emerald-700">{pct > 0 ? `Save ${pct}%` : ' '}</p>
              </button>
            );
          })}
        </div>
        <div>
          <label className={lbl}>Coupon code (optional)</label>
          <input className={inp} value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. WELCOME20" maxLength={20} />
        </div>
        {q && (
          <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between"><span>{pkg.name} × {months} month{months > 1 ? 's' : ''}</span><span>{naira(q.list_price)}</span></div>
            {q.multi_month_discount > 0 && <div className="flex justify-between text-emerald-700"><span>Multi-month discount</span><span>-{naira(q.multi_month_discount)}</span></div>}
            {q.coupon_discount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon {q.coupon}</span><span>-{naira(q.coupon_discount)}</span></div>}
            <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200"><span>Total</span><span>{naira(q.total)}</span></div>
            <div className="flex justify-between text-[11px]"><span>Wallet balance</span><span className={short ? 'text-red-600 font-black' : ''}>{naira(balance)}</span></div>
          </div>
        )}
        {err && <p className="text-xs font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {short ? (
          <PrimaryButton className="w-full" onClick={onFund}><Wallet className="w-4 h-4" /> Fund wallet to continue</PrimaryButton>
        ) : (
          <PrimaryButton className="w-full" onClick={pay} disabled={!q || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {q ? `Pay ${naira(q.total)} from wallet` : 'Calculating…'}</PrimaryButton>
        )}
        <p className="text-[10px] text-slate-500 font-medium text-center">Paid from your HireMercyAJO wallet. Renewing the same plan adds time; switching plans replaces the old plan.</p>
      </div>
    </Sheet>
  );
}

type Draft = { name: string; slug: string; tagline: string; description: string; whatsapp: string; phone: string; location: string; logo_url: string; banner_url: string; theme_color: string; announcement: string; social: Record<string, string> };
const SOCIALS = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['x', 'X (Twitter)'], ['website', 'Website']] as const;

function ImagePick({ label, value, uid, onChange, wide }: { label: string; value: string; uid: string; onChange: (u: string) => void; wide?: boolean }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = async (f?: File | null) => {
    if (!f) return; setBusy(true); setErr('');
    try { onChange(await uploadImage('shops', uid, f, wide ? 1400 : 700)); } catch (e: any) { setErr(e.message || 'Upload failed'); }
    setBusy(false);
  };
  return (
    <div>
      <label className={lbl}>{label}</label>
      <label className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer ${wide ? 'h-28' : 'h-24 w-24'}`}>
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 flex flex-col items-center text-[10px] font-bold"><ImageIcon className="w-5 h-5" />Add</span>}
        {busy && <span className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {value && <button type="button" onClick={() => onChange('')} className="text-[10px] font-bold text-red-600 mt-1">Remove</button>}
      {err && <p className="text-[10px] font-bold text-red-600 mt-1">{err}</p>}
    </div>
  );
}

function ShopSetup({ cfg, uid, whatsappDefault, onSaved }: { cfg: ShopConfig; uid: string; whatsappDefault: string; onSaved: () => void }) {
  const sub = cfg.subscription!; const sh = cfg.shop;
  const [d, setD] = useState<Draft>({
    name: sh?.name || '', slug: sh?.slug || '', tagline: sh?.tagline || '', description: sh?.description || '', whatsapp: sh?.whatsapp || whatsappDefault,
    phone: sh?.phone || '', location: sh?.location || '', logo_url: sh?.logo_url || '', banner_url: sh?.banner_url || '', theme_color: sh?.theme_color || '#064E2B',
    announcement: sh?.announcement || '', social: sh?.social || {}
  });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof Draft, v: any) => setD(x => ({ ...x, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('shop_save_profile', { p: { ...d, theme_color: sub.custom_theme ? d.theme_color : '' } });
    setBusy(false);
    if (error) setMsg({ ok: false, t: friendlyError(error, 'Could not save. Check the shop name, link and WhatsApp number.') });
    else { setMsg({ ok: true, t: 'Shop saved' }); onSaved(); }
  };
  return (
    <form onSubmit={save} className="space-y-3.5">
      <div className="flex gap-4 items-start">
        <ImagePick label="Logo" value={d.logo_url} uid={uid} onChange={u => set('logo_url', u)} />
        {sub.custom_banner && <div className="flex-1"><ImagePick label="Shop banner" value={d.banner_url} uid={uid} onChange={u => set('banner_url', u)} wide /></div>}
      </div>
      <div><label className={lbl}>Shop name *</label><input className={inp} required minLength={2} maxLength={60} value={d.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mama Tunde Fabrics" /></div>
      <div>
        <label className={lbl}>Shop link *</label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">?shop=</span>
          <input className={inp} required disabled={!!sh} pattern="[a-z0-9][a-z0-9-]{2,29}" value={d.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mama-tunde" />
        </div>
        <p className="text-[10px] text-slate-500 font-medium mt-1">{sh ? 'Your link cannot be changed once created.' : '3 to 30 letters, numbers or dashes. This cannot be changed later.'}</p>
      </div>
      <div><label className={lbl}>Tagline</label><input className={inp} maxLength={120} value={d.tagline} onChange={e => set('tagline', e.target.value)} placeholder="What do you sell?" /></div>
      <div><label className={lbl}>About your shop</label><textarea className={inp} rows={3} maxLength={1000} value={d.description} onChange={e => set('description', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>WhatsApp number</label><input className={inp} inputMode="tel" value={d.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="23480…" /></div>
        <div><label className={lbl}>Location</label><input className={inp} value={d.location} onChange={e => set('location', e.target.value)} placeholder="Ajegunle, Lagos" /></div>
      </div>
      {sub.custom_theme && (
        <div className="flex items-center gap-3"><label className={lbl + ' mb-0'}>Shop colour</label><input type="color" value={d.theme_color} onChange={e => set('theme_color', e.target.value)} className="w-12 h-9 rounded-lg border border-slate-200" /></div>
      )}
      {sub.announcement && <div><label className={lbl}>Announcement bar</label><input className={inp} maxLength={140} value={d.announcement} onChange={e => set('announcement', e.target.value)} placeholder="e.g. Free delivery this weekend" /></div>}
      {sub.social_links && (
        <div className="grid grid-cols-1 gap-2">
          <p className={lbl}>Social links (https://…)</p>
          {SOCIALS.map(([k, n]) => <input key={k} className={inp} placeholder={n} value={d.social[k] || ''} onChange={e => set('social', { ...d.social, [k]: e.target.value })} />)}
        </div>
      )}
      {msg && <p className={`text-xs font-bold rounded-lg px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.t}</p>}
      <PrimaryButton type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}{sh ? 'Save changes' : 'Create my shop'}</PrimaryButton>
    </form>
  );
}

function ItemEditor({ item, sub, uid, onClose, onSaved }: { item: ShopItem | null; sub: NonNullable<ShopConfig['subscription']>; uid: string; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState(item?.title || ''); const [desc, setDesc] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : ''); const [promo, setPromo] = useState(item?.promo_price != null ? String(item.promo_price) : '');
  const [imgs, setImgs] = useState<string[]>(item?.images || []); const [stock, setStock] = useState(item?.in_stock ?? true);
  const [vis, setVis] = useState(item ? item.status !== 'hidden' : true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [up, setUp] = useState(false);
  const add = async (f?: File | null) => {
    if (!f) return; setUp(true); setErr('');
    try { const u = await uploadImage('shops', uid, f); setImgs(x => [...x, u]); } catch (e: any) { setErr(e.message); }
    setUp(false);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.rpc('shop_save_item', { p: { id: item?.id || null, title: t, description: desc, price: price || null, promo_price: promo || null, images: imgs, in_stock: stock, visible: vis } });
    setBusy(false);
    if (error) setErr(friendlyError(error, 'Could not save. Check the name and prices.')); else { onSaved(); onClose(); }
  };
  return (
    <Sheet open onClose={onClose} title={item ? 'Edit product' : 'New product'}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className={lbl}>Photos ({imgs.length}/{sub.max_photos})</label>
          <div className="flex gap-2 flex-wrap">
            {imgs.map((u, i) => (
              <div key={u} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setImgs(x => x.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {imgs.length < sub.max_photos && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer text-slate-400">
                {up ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { add(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </div>
        <div><label className={lbl}>Product name *</label><input className={inp} required minLength={2} maxLength={100} value={t} onChange={e => setT(e.target.value)} /></div>
        <div><label className={lbl}>Description</label><textarea className={inp} rows={3} maxLength={1000} value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Price (₦)</label><input className={inp} inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} /></div>
          {sub.promo_pricing && <div><label className={lbl}>Promo price (₦)</label><input className={inp} inputMode="numeric" value={promo} onChange={e => setPromo(e.target.value.replace(/[^\d.]/g, ''))} /></div>}
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={stock} onChange={e => setStock(e.target.checked)} /> In stock</label>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={vis} onChange={e => setVis(e.target.checked)} /> Show on my shop page</label>
        {!sub.auto_publish && <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 rounded-lg px-3 py-2">On the {sub.package_name} plan, HireMercyAJO reviews new products before they appear on your shop.</p>}
        {err && <p className="text-xs font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={busy || up}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Save product</PrimaryButton>
      </form>
    </Sheet>
  );
}

const ITEM_TONE: Record<string, 'green' | 'gold' | 'slate' | 'red'> = { published: 'green', pending: 'gold', hidden: 'slate', removed: 'red' };
const ITEM_TEXT: Record<string, string> = { published: 'Live', pending: 'Awaiting review', hidden: 'Hidden', removed: 'Removed' };

export function MyShopTab({ customerId, whatsapp, referralCode, onSection }: { customerId: string; whatsapp: string; referralCode?: string | null; onSection: (s: SectionKey) => void }) {
  const [cfg, setCfg] = useState<ConfigState>('loading');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [pick, setPick] = useState<ShopPackage | null>(null);
  const [editing, setEditing] = useState<ShopItem | 'new' | null>(null);
  const [view, setView] = useState<'plans' | 'manage'>('manage');
  const [flash, setFlash] = useState(''); const [freeBusy, setFreeBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    const [c, w] = await Promise.all([loadShopConfig(), supabase.rpc('get_my_wallet')]);
    setBalance(Number((w.data as any)?.balance || 0));
    setCfg(c === null ? 'error' : c);
    if (c?.subscription) setItems(await loadMyShopItems());
  }, []);
  useEffect(() => { load(); }, [load]);

  if (cfg === 'loading') return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-700" /></div>;
  if (cfg === 'error') return <Card><p className="text-sm font-bold text-slate-700">My Shop could not be loaded.</p><p className="text-xs text-slate-500 mt-1">Please try again in a moment.</p></Card>;
  if (!cfg.enabled) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 text-white p-6 text-center space-y-2">
        <Store className="w-10 h-10 mx-auto text-amber-300" />
        <p className="text-lg font-black">My Shop is coming soon</p>
        <p className="text-xs text-white/80 font-medium">Soon you will open your own online shop, get a link to share anywhere and sell to more people.</p>
      </div>
    );
  }
  const sub = cfg.subscription; const sh = cfg.shop;
  const freePkg = cfg.packages.find(p => p.code === cfg.free_plan.package);
  const canFree = cfg.free_plan.enabled && !cfg.free_plan.used && !sub && !!freePkg;
  const startFree = async () => {
    setFreeBusy(true); const { error } = await supabase.rpc('shop_start_free'); setFreeBusy(false);
    if (error) setFlash(friendlyError(error)); else { setFlash('Your free plan has started. Set up your shop below.'); await load(); setView('manage'); }
  };
  const link = sh ? shopUrl(sh.slug) : '';
  const shareText = sh ? `Shop with ${sh.name} on HireMercyAJO${sh.tagline ? ' - ' + sh.tagline : ''}` : '';
  const share = async () => {
    if (!sh) return;
    try { if ((navigator as any).share) { await (navigator as any).share({ title: sh.name, text: shareText, url: link }); } else { await copyText(`${shareText}\n${link}`); setFlash('Link copied. Paste it anywhere to share.'); } } catch { /* cancelled */ }
    supabase.rpc('shop_record_share', { p_item: null }).then(() => undefined, () => undefined);
  };
  const delItem = async (id: string) => { if (!window.confirm('Remove this product?')) return; await supabase.rpc('shop_delete_item', { p_id: id }); setItems(await loadMyShopItems()); };

  const plansView = (
    <div className="space-y-4">
      {canFree && freePkg && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-center gap-3 shadow-md">
          <Gift className="w-9 h-9 shrink-0 text-amber-300" />
          <div className="flex-1 min-w-0"><p className="text-sm font-black">Try {freePkg.name} free for {cfg.free_plan.days} days</p><p className="text-[11px] text-white/85 font-medium">No payment needed. One free plan per customer.</p></div>
          <button type="button" disabled={freeBusy} onClick={startFree} className="shrink-0 bg-white text-emerald-700 text-xs font-black px-3.5 py-2.5 rounded-xl">{freeBusy ? '…' : 'Start free'}</button>
        </div>
      )}
      {cfg.packages.length === 0 && <Card><p className="text-sm font-bold text-slate-700">Plans will be available soon.</p></Card>}
      {cfg.packages.map(p => (
        <PackageCard key={p.code} p={p} current={sub?.package_code === p.code} onPick={() => setPick(p)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {flash && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2.5 flex justify-between gap-2"><span>{flash}</span><button type="button" onClick={() => setFlash('')} aria-label="Dismiss"><X className="w-4 h-4" /></button></div>}

      {!sub && (
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-white/10" />
          <p className="text-[11px] font-black text-amber-300 tracking-wide">MY SHOP</p>
          <p className="text-xl font-black leading-tight mt-1">Open your own online shop in minutes</p>
          <p className="text-xs text-white/85 font-medium mt-1.5 max-w-xs">Get your own shop link, add your products and share it on WhatsApp, Facebook and Instagram. No calls, no waiting.</p>
          {cfg.last_subscription && <p className="text-[11px] font-bold text-amber-200 mt-2">Your last plan ended on {new Date(cfg.last_subscription.ends_at).toLocaleDateString()}. Renew below to put your shop back online.</p>}
        </div>
      )}

      {sub && (
        <>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            {([['manage', 'My shop'], ['plans', 'Plans']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView(k)} className={`py-2 rounded-lg text-xs font-bold ${view === k ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-500'}`}>{l}</button>
            ))}
          </div>
          <div className={`rounded-3xl bg-gradient-to-br ${(THEME[sub.package_code] || THEME.standard).grad} text-white p-4`}>
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-[11px] font-bold text-white/75">YOUR PLAN {sub.source === 'free' ? '· FREE TRIAL' : sub.source === 'gift' ? '· GIFT' : ''}</p><p className="text-xl font-black">{sub.package_name}</p></div>
              <div className="text-right"><p className="text-2xl font-black leading-none">{daysLeft(sub.ends_at)}</p><p className="text-[10px] font-bold text-white/75">days left</p></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (items.filter(i => i.status !== 'hidden').length / sub.max_items) * 100)}%` }} /></div>
              <span className="text-[10px] font-bold text-white/85">{items.length}/{sub.max_items} products</span>
            </div>
            {sub.control_pct > 0 && <p className="text-[10px] font-bold text-white/85 mt-2">You control about {sub.control_pct}% of your shop on this plan.</p>}
            {daysLeft(sub.ends_at) <= 7 && <button type="button" onClick={() => setView('plans')} className="mt-3 bg-white text-slate-900 text-xs font-black px-3 py-2 rounded-xl">Renew now</button>}
          </div>
        </>
      )}

      {(!sub || view === 'plans') && plansView}

      {sub && view === 'manage' && (
        <>
          {sh && (
            <Card>
              <SectionTitle>Share your shop</SectionTitle>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 break-all">{link}</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <PrimaryButton onClick={share}><Share2 className="w-4 h-4" />Share</PrimaryButton>
                <SecondaryButton onClick={async () => { await copyText(link); setFlash('Link copied'); }}><Copy className="w-4 h-4" />Copy</SecondaryButton>
                <SecondaryButton onClick={() => window.open(link, '_blank')}><ExternalLink className="w-4 h-4" />View</SecondaryButton>
              </div>
              {sub.analytics && <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-lg font-black text-emerald-800 flex items-center justify-center gap-1"><Eye className="w-4 h-4" />{sh.views}</p><p className="text-[10px] font-bold text-slate-500">Shop views</p></div><div className="rounded-xl bg-amber-50 p-3 text-center"><p className="text-lg font-black text-amber-800 flex items-center justify-center gap-1"><BarChart3 className="w-4 h-4" />{sh.shares}</p><p className="text-[10px] font-bold text-slate-500">Shares</p></div></div>}
            </Card>
          )}
          <Card>
            <SectionTitle action={sh ? <button type="button" onClick={() => setShowSetup(s => !s)} className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Pencil className="w-3 h-3" />{showSetup ? 'Hide' : 'Edit'}</button> : undefined}>{sh ? 'Shop details' : 'Set up your shop'}</SectionTitle>
            {(!sh || showSetup) ? <ShopSetup cfg={cfg} uid={customerId} whatsappDefault={whatsapp} onSaved={() => { setShowSetup(false); load(); }} /> : (
              <div className="flex items-center gap-3">
                {sh.logo_url ? <img src={sh.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <span className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center"><Store className="w-6 h-6 text-emerald-700" /></span>}
                <div className="min-w-0"><p className="text-sm font-black text-slate-900 truncate">{sh.name}</p><p className="text-[11px] text-slate-500 font-medium truncate">{sh.tagline || sh.location || ''}</p>{sh.status === 'suspended' && <Pill tone="red">Paused by admin</Pill>}</div>
              </div>
            )}
          </Card>
          {sh && (
            <Card>
              <SectionTitle action={<button type="button" onClick={() => setEditing('new')} className="text-xs font-bold text-white bg-emerald-700 rounded-lg px-2.5 py-1.5 flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>}>My products</SectionTitle>
              {items.length === 0 ? <p className="text-xs text-slate-500 font-medium text-center py-4">No products yet. Add your first product to start selling.</p> : (
                <ul className="divide-y divide-slate-100">
                  {items.map(i => (
                    <li key={i.id} className="py-2.5 flex items-center gap-3">
                      {i.images[0] ? <img src={i.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <span className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></span>}
                      <button type="button" onClick={() => setEditing(i)} className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-bold text-slate-800 truncate">{i.title}</p>
                        <p className="text-[11px] font-semibold text-slate-500">{i.price != null ? naira(i.promo_price ?? i.price) : 'No price'} · <Pill tone={ITEM_TONE[i.status]}>{ITEM_TEXT[i.status]}</Pill></p>
                      </button>
                      <button type="button" aria-label="Remove product" onClick={() => delItem(i.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      <SubscribeSheet pkg={pick} balance={balance} onClose={() => setPick(null)}
        onDone={async () => { setPick(null); setFlash('Plan activated. Your shop is ready.'); setView('manage'); await load(); }}
        onFund={() => { setPick(null); onSection('wallet'); }} />
      {editing && sub && <ItemEditor item={editing === 'new' ? null : editing} sub={sub} uid={customerId} onClose={() => setEditing(null)} onSaved={async () => setItems(await loadMyShopItems())} />}
    </div>
  );
}
type ConfigState = ShopConfig | 'loading' | 'error';
