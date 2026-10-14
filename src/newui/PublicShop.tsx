import React, { useEffect, useState } from 'react';
import { BadgeCheck, MapPin, MessageCircle, Phone, Share2, Store, Loader2, Globe, X as XIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { naira, whatsappUrl, copyText } from './ui';

interface PubItem { id: string; title: string; description: string | null; price: number | null; promo_price: number | null; images: string[]; in_stock: boolean }
interface Pub {
  shop: { slug: string; name: string; tagline: string | null; description: string | null; logo_url: string | null; banner_url: string | null; whatsapp: string | null; phone: string | null; location: string | null; theme_color: string | null; announcement: string | null; social: Record<string, string> };
  badge: string; verified: boolean; show_branding: boolean; items: PubItem[];
}
export const shopSlugFromUrl = (): string | null => {
  try { const s = new URLSearchParams(window.location.search).get('shop'); return s && /^[a-z0-9][a-z0-9-]{2,29}$/i.test(s) ? s.toLowerCase() : null; } catch { return null; }
};

export function PublicShopPage({ slug }: { slug: string }) {
  const [d, setD] = useState<Pub | null | 'loading'>('loading');
  const [open, setOpen] = useState<PubItem | null>(null);
  useEffect(() => {
    let dead = false;
    Promise.resolve(supabase.rpc('get_public_shop', { p_slug: slug })).then(({ data, error }) => {
      if (dead) return;
      if (!error && data) {
        const x = data as any; x.items = (x.items || []).map((i: any) => ({ ...i, price: i.price == null ? null : Number(i.price), promo_price: i.promo_price == null ? null : Number(i.promo_price), images: i.images || [] }));
        setD(x as Pub);
        try { document.title = `${x.shop.name} | HireMercyAJO`; } catch { /* ignore */ }
      } else setD(null);
    }).catch(() => { if (!dead) setD(null); });
    return () => { dead = true; };
  }, [slug]);

  if (d === 'loading') return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-7 h-7 animate-spin text-emerald-700" /></div>;
  if (!d) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Store className="w-12 h-12 text-slate-300" />
      <p className="text-lg font-black text-slate-800 mt-3">This shop is not available</p>
      <p className="text-sm text-slate-500 font-medium mt-1">It may have been paused or the link is wrong.</p>
      <a href="/" className="mt-5 bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-xl">Go to HireMercyAJO</a>
    </div>
  );
  const s = d.shop; const color = s.theme_color || '#064E2B';
  const wa = whatsappUrl(s.whatsapp || undefined, `Hello ${s.name}, I saw your shop on HireMercyAJO.`);
  const share = async () => {
    const url = window.location.href;
    try { if ((navigator as any).share) await (navigator as any).share({ title: s.name, text: s.tagline || s.name, url }); else { await copyText(url); alert('Link copied'); } } catch { /* cancelled */ }
  };
  const ask = (i: PubItem) => whatsappUrl(s.whatsapp || undefined, `Hello ${s.name}, I am interested in "${i.title}"${i.price ? ` (${naira(i.promo_price ?? i.price)})` : ''}. Is it available?`);
  const soc: [string, any][] = [['instagram', Globe], ['facebook', Globe], ['website', Globe], ['tiktok', Globe], ['x', Globe]];
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {s.announcement && <div className="text-center text-xs font-bold text-white px-3 py-2" style={{ background: color }}>{s.announcement}</div>}
      <div className="relative h-40 sm:h-52" style={{ background: s.banner_url ? undefined : `linear-gradient(135deg, ${color}, #111827)` }}>
        {s.banner_url && <img src={s.banner_url} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <button type="button" onClick={share} aria-label="Share" className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"><Share2 className="w-4 h-4 text-slate-800" /></button>
      </div>
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-4 flex gap-3.5 items-start">
          {s.logo_url ? <img src={s.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-100" /> : <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: color }}><Store className="w-7 h-7" /></span>}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-1.5">{s.name}{d.verified && <BadgeCheck className="w-5 h-5 text-sky-500 shrink-0" aria-label="Verified" />}</h1>
            {s.tagline && <p className="text-xs font-semibold text-slate-600">{s.tagline}</p>}
            {s.location && <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{s.location}</p>}
          </div>
        </div>
        {s.description && <p className="text-sm text-slate-600 font-medium mt-3 px-1 whitespace-pre-line">{s.description}</p>}
        <div className="flex gap-2 mt-3 flex-wrap">
          {s.whatsapp && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 text-white font-black text-sm py-3 rounded-xl" style={{ background: '#128C7E' }}><MessageCircle className="w-4 h-4" />WhatsApp</a>}
          {s.phone && <a href={`tel:${s.phone}`} className="flex-1 min-w-[120px] flex items-center justify-center gap-2 font-black text-sm py-3 rounded-xl border-2" style={{ borderColor: color, color }}><Phone className="w-4 h-4" />Call</a>}
        </div>
        {Object.keys(s.social || {}).length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {soc.filter(([k]) => s.social[k]).map(([k, Icon]) => <a key={k} href={s.social[k]} target="_blank" rel="noopener noreferrer nofollow" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 capitalize"><Icon className="w-3.5 h-3.5" />{k === 'x' ? 'X' : k}</a>)}
          </div>
        )}
        <h2 className="text-sm font-black text-slate-800 mt-6 mb-3">Products ({d.items.length})</h2>
        {d.items.length === 0 ? <p className="text-sm text-slate-500 font-medium text-center py-8">No products yet. Check back soon.</p> : (
          <div className="grid grid-cols-2 gap-3">
            {d.items.map(i => {
              const promo = i.promo_price != null && i.price != null && i.promo_price < i.price;
              return (
                <button key={i.id} type="button" onClick={() => setOpen(i)} className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition">
                  <div className="aspect-square bg-slate-100 relative">{i.images[0] && <img src={i.images[0]} alt={i.title} loading="lazy" className="w-full h-full object-cover" />}{!i.in_stock && <span className="absolute top-2 left-2 text-[10px] font-black bg-black/70 text-white rounded-full px-2 py-0.5">Sold out</span>}{promo && <span className="absolute top-2 right-2 text-[10px] font-black bg-red-600 text-white rounded-full px-2 py-0.5">-{Math.round((1 - i.promo_price! / i.price!) * 100)}%</span>}</div>
                  <div className="p-2.5"><p className="text-xs font-bold text-slate-800 line-clamp-2">{i.title}</p>{i.price != null && <p className="text-sm font-black mt-0.5" style={{ color }}>{naira(i.promo_price ?? i.price)} {promo && <span className="text-[10px] text-slate-400 line-through font-bold">{naira(i.price)}</span>}</p>}</div>
                </button>
              );
            })}
          </div>
        )}
        {d.show_branding && (
          <a href="/register" className="block mt-8 rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-600 text-white p-4 text-center">
            <p className="text-sm font-black">Open your own shop on HireMercyAJO</p><p className="text-[11px] font-medium text-white/85">Save daily, shop, pay bills and sell online. Join free.</p>
          </a>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setOpen(null)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center"><XIcon className="w-4 h-4" /></button>
            {open.images.length > 0 && <div className="flex overflow-x-auto snap-x">{open.images.map(u => <img key={u} src={u} alt="" className="w-full shrink-0 snap-center aspect-square object-cover" />)}</div>}
            <div className="p-4 space-y-2">
              <p className="text-base font-black text-slate-900">{open.title}</p>
              {open.price != null && <p className="text-xl font-black" style={{ color }}>{naira(open.promo_price ?? open.price)}</p>}
              {open.description && <p className="text-sm text-slate-600 font-medium whitespace-pre-line">{open.description}</p>}
              {s.whatsapp && <a href={ask(open)} target="_blank" rel="noopener noreferrer" className="block text-center text-white font-black text-sm py-3 rounded-xl" style={{ background: '#128C7E' }}>Ask on WhatsApp</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
