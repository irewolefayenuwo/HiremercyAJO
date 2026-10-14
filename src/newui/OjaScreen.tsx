import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Store, Package, ShoppingBag, Plus, Image as ImageIcon, X, ChevronRight, MapPin, Tag, Megaphone } from 'lucide-react';
import type { Profile, SupportSettings } from '../App';
import { Mascot } from './Mascot';
import { Card, EmptyState, NotLive, Pill, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira, whatsappUrl } from './ui';
import { supabase } from '../lib/supabase';
import { shareAdvert } from './shareAdvert';
import { OJA_CATEGORIES, type SectionKey } from './config';
import { MyShopTab } from './MyShop';
import { loadDirectory, type DirectoryShop } from './shopApi';
import { BadgeCheck } from 'lucide-react';
import { loadMyOjaRequests, loadOjaListings, placeOjaRequest, type OjaListing, type OjaRequest } from './ojaApi';

export type OjaProduct = OjaListing;
const STATUS_TONE: Record<OjaRequest['status'], 'gold' | 'blue' | 'green' | 'red'> = {
  pending: 'gold', contacted: 'blue', completed: 'green', cancelled: 'red'
};
const STATUS_TEXT: Record<OjaRequest['status'], string> = {
  pending: 'Pending', contacted: 'Seller contacted', completed: 'Completed', cancelled: 'Cancelled'
};
const promoPct = (p: OjaListing) =>
  p.price && p.promo_price && p.promo_price < p.price ? Math.round((1 - p.promo_price / p.price) * 100) : 0;

function PriceLine({ p, big }: { p: OjaListing; big?: boolean }) {
  const promo = p.promo_price != null && p.price != null && p.promo_price < p.price;
  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span className={`${big ? 'text-2xl' : 'text-sm'} font-black text-emerald-800`}>{naira(p.effective_price ?? p.price)}</span>
      {promo && <span className={`${big ? 'text-sm' : 'text-[11px]'} font-semibold text-slate-400 line-through`}>{naira(p.price)}</span>}
    </div>
  );
}

export function ProductCard({ product, onOpen }: { product: OjaProduct; onOpen: (p: OjaProduct) => void }) {
  const pct = promoPct(product);
  return (
    <button type="button" onClick={() => onOpen(product)} className="text-left bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden active:scale-[0.98] transition relative">
      {pct > 0 && <span className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{pct}%</span>}
      {!product.in_stock && <span className="absolute top-2 right-2 z-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sold out</span>}
      <div className="aspect-square bg-orange-50 flex items-center justify-center">
        {product.image_urls[0]
          ? <img src={product.image_urls[0]} alt={product.title} loading="lazy" className="w-full h-full object-cover" />
          : <Package className="w-10 h-10 text-orange-300" />}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-slate-800 truncate">{product.title}</p>
        <PriceLine p={product} />
        {product.promo_label && <p className="text-[10px] font-bold text-red-600 truncate mt-0.5">{product.promo_label}</p>}
        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{product.seller_name || 'HireMercyAJO'}</p>
      </div>
    </button>
  );
}

export function ProductDetails({ product, customer, supportDetails, onBack, onPlaced, referralCode }: {
  product: OjaProduct; customer: Profile; supportDetails: SupportSettings; onBack: () => void; onPlaced: () => void; referralCode?: string | null;
}) {
  const [shareNote, setShareNote] = useState('');
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ reference: string; total: number; wa: string | null } | null>(null);
  const unit = product.effective_price ?? product.price ?? 0;
  const isAd = product.kind === 'advert';

  const waNumber = product.seller_whatsapp || supportDetails.support_whatsapp;
  const waText = (ref?: string) => [
    `Hello, I am interested in "${product.title}" on Gbagede OJA.`,
    product.price != null ? `Price: ${naira(unit)}${qty > 1 ? ` x ${qty} = ${naira(unit * qty)}` : ''}` : '',
    ref ? `Request ref: ${ref}` : '',
    `Name: ${customer.name} (${customer.phone})`
  ].filter(Boolean).join('\n');

  const send = async () => {
    setBusy(true); setErr('');
    const r = await placeOjaRequest(product.id, qty, note);
    setBusy(false);
    if (!r.ok) { setErr(r.message); return; }
    setDone({ reference: r.data.reference, total: Number(r.data.total), wa: waNumber ? whatsappUrl(waNumber, waText(r.data.reference)) : null });
    onPlaced();
  };

  return (
    <div className="space-y-4 fade-in max-w-2xl mx-auto">
      <ScreenHeader title={isAd ? 'Offer details' : 'Product details'} onBack={onBack} tone="gold" />
      <Card className="space-y-3">
        <div className="aspect-[4/3] rounded-2xl bg-orange-50 overflow-hidden flex items-center justify-center">
          {product.image_urls[img] ? <img src={product.image_urls[img]} alt={product.title} className="w-full h-full object-cover" /> : <Package className="w-14 h-14 text-orange-300" />}
        </div>
        {product.image_urls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.image_urls.map((u, i) => (
              <button key={u} type="button" onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}
                className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 ${i === img ? 'border-orange-500' : 'border-transparent'}`}>
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <h3 className="text-lg font-extrabold text-slate-900">{product.title}</h3>
        {product.price != null && <PriceLine p={product} big />}
        {product.promo_label && (
          <p className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
            <Tag className="w-3 h-3" /> {product.promo_label}{promoPct(product) > 0 ? ` (-${promoPct(product)}%)` : ''}
          </p>
        )}
        {product.promo_ends_at && <p className="text-[11px] text-slate-500 font-medium">Offer ends {new Date(product.promo_ends_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
        <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
          <span>{product.seller_name || 'HireMercyAJO'}</span>
          {product.location && <span className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" /> {product.location}</span>}
        </div>
        {product.description && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>}
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <SecondaryButton onClick={async () => {
          const r = await shareAdvert({ title: product.title, text: product.price != null ? `${product.title} - ${naira(unit)} on Gbagede OJA` : product.description || undefined, referralCode, key: product.id });
          setShareNote(r.note);
        }}>Share</SecondaryButton>
        {shareNote && <p className="text-[11px] font-bold text-emerald-700">{shareNote}</p>}
      </div>

      {isAd ? (
        <div className="space-y-2">
          {product.link_url && <a href={product.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-sm">Open link</a>}
          {waNumber && <a href={whatsappUrl(waNumber, waText()) || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white border border-emerald-200 text-emerald-800 font-bold py-3 px-4 rounded-xl text-sm">Chat on WhatsApp</a>}
        </div>
      ) : done ? (
        <Card className="space-y-2">
          <p className="text-sm font-extrabold text-emerald-900">Request sent</p>
          <p className="text-xs text-slate-600 font-medium">Reference <b>{done.reference}</b> - total {naira(done.total)}. Nothing has been charged. Our team will contact you to arrange payment and delivery. You can follow it under My Orders.</p>
          {done.wa && <a href={done.wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-sm">Chat on WhatsApp now</a>}
          <SecondaryButton onClick={onBack}>Back to shop</SecondaryButton>
        </Card>
      ) : (
        <Card className="space-y-3">
          {!product.in_stock && <p className="text-xs font-bold text-red-600">This item is out of stock.</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Quantity</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Less" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl bg-slate-100 font-black text-lg">-</button>
              <span className="w-8 text-center font-black">{qty}</span>
              <button type="button" aria-label="More" onClick={() => setQty(q => Math.min(100, q + 1))} className="w-9 h-9 rounded-xl bg-slate-100 font-black text-lg">+</button>
            </div>
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 300))} rows={2} placeholder="Note for the seller (size, colour, delivery address...)"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-orange-400" />
          <div className="flex items-center justify-between text-sm"><span className="font-bold text-slate-700">Total</span><span className="font-black text-emerald-800">{naira(unit * qty)}</span></div>
          {err && <p className="text-[11px] text-red-600 font-semibold">{err}</p>}
          <PrimaryButton disabled={busy || !product.in_stock} onClick={send} className="w-full">{busy ? 'Sending...' : 'Request to buy'}</PrimaryButton>
          <p className="text-[11px] text-slate-500 font-medium">This sends a request only - you pay nothing now. We confirm availability and arrange payment with you.</p>
        </Card>
      )}
    </div>
  );
}

function SellerRequestForm({ customer, supportDetails }: { customer: Profile; supportDetails: SupportSettings }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  const previews = useMemo(() => files.map(f => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)), [previews]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || !Number(price)) { setError('Add the product name, category and price.'); return; }
    setError('');
    const text = [
      'Hello HireMercyAJO, I would like to sell on Gbagede OJA.',
      `Seller: ${customer.name} (${customer.phone})`,
      `Product: ${name.trim()}`,
      `Category: ${category}`,
      `Price: ${naira(Number(price))}`,
      desc.trim() ? `Details: ${desc.trim()}` : '',
      files.length ? `I have ${files.length} photo(s) ready to send.` : ''
    ].filter(Boolean).join('\n');
    const url = whatsappUrl(supportDetails.support_whatsapp, text);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else setError('Support WhatsApp number is not set yet. Please contact support another way.');
  };

  const inp = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100';
  return (
    <form onSubmit={send} className="space-y-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" className={inp} />
      <select value={category} onChange={e => setCategory(e.target.value)} className={inp}>
        <option value="">Category</option>
        {OJA_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Price (₦)" className={inp} />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describe your product (size, condition, location...)" className={inp} />
      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/50 py-4 text-xs font-bold text-orange-700 cursor-pointer">
        <ImageIcon className="w-4 h-4" /> Add product photos
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={e => setFiles((Array.from(e.target.files || []) as File[]).slice(0, 5))} />
      </label>
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {previews.map(p => (
            <div key={p.url} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-orange-100">
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter(f => f.name !== p.name))}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
      <PrimaryButton type="submit" className="w-full">Send seller request on WhatsApp</PrimaryButton>
      <p className="text-[11px] text-slate-500 font-medium">
        Photos stay on your phone - you will send them in the WhatsApp chat. Your product is not listed until HireMercyAJO approves it.
      </p>
    </form>
  );
}

type OjaTab = 'shop' | 'orders' | 'myshop';

export function OjaScreen({
  customer, supportDetails, onSection, referralCode
}: { customer: Profile; supportDetails: SupportSettings; onSection: (s: SectionKey) => void; referralCode?: string | null }) {
  const [listings, setListings] = useState<OjaListing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<OjaRequest[]>([]);
  const [tab, setTab] = useState<OjaTab>(() => { try { if (sessionStorage.getItem('hm_open_myshop')) { sessionStorage.removeItem('hm_open_myshop'); return 'myshop'; } } catch { /* ignore */ } return 'shop'; });
  const [dir, setDir] = useState<DirectoryShop[]>([]);
  useEffect(() => { loadDirectory().then(setDir).catch(() => undefined); }, []);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [orderFilter, setOrderFilter] = useState<'All' | OjaRequest['status']>('All');
  const [open, setOpen] = useState<OjaProduct | null>(null);

  const reload = useCallback(async () => {
    const [l, r] = await Promise.all([loadOjaListings(), loadMyOjaRequests()]);
    setListings(l); setRequests(r); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  // Daily visit is recorded on the server; it only earns points if the admin has switched that task on.
  useEffect(() => { Promise.resolve(supabase.rpc('record_oja_visit')).catch(() => undefined); }, []);

  const adverts = (listings || []).filter(l => l.kind === 'advert');
  const products = (listings || []).filter(l => l.kind === 'product');
  const q = query.trim().toLowerCase();
  const shown = products.filter(p => (cat === 'All' || p.category === cat) && (p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)));
  const onSale = shown.filter(p => promoPct(p) > 0);
  const rest = shown.filter(p => promoPct(p) === 0);
  const shownOrders = requests.filter(o => orderFilter === 'All' || o.status === orderFilter);

  if (open) return <ProductDetails product={open} customer={customer} supportDetails={supportDetails} onBack={() => setOpen(null)} onPlaced={reload} referralCode={referralCode} />;

  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-orange-500 text-white shadow-md p-4 sm:p-5">
        <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-orange-300/30 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center"><Store className="w-6 h-6 text-amber-300" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-tight">Gbagede OJA</h2>
            <p className="text-xs text-white/80 font-medium">Buy · Sell · Advertise</p>
          </div>
          <div className="shrink-0 -my-3"><Mascot pose="megaphone" size={92} /></div>
        </div>
        <div className="relative mt-3 flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 text-slate-700">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, services..." aria-label="Search products"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold" />
        </div>
      </div>

      {!loading && listings === null && (
        <NotLive title="Gbagede OJA could not be loaded">The marketplace is not reachable right now. Please try again in a moment.</NotLive>
      )}

      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="tablist" aria-label="Marketplace sections">
        {([['shop', 'Shop', ShoppingBag], ['orders', 'My Orders', Package], ['myshop', 'My Shop', Store]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${tab === k ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <>
          {dir.length > 0 && (
            <div>
              <p className="text-sm font-extrabold text-emerald-950 mb-2">Shops on HireMercyAJO</p>
              <div className="hm-scroll-x gap-3 -mx-1 px-1">
                {dir.map(d => (
                  <a key={d.slug} href={`/?shop=${d.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 w-36 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-20 bg-gradient-to-br from-emerald-700 to-teal-600 relative">{(d.cover || d.logo_url) && <img src={(d.cover || d.logo_url)!} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
                    <div className="p-2"><p className="text-xs font-black text-slate-800 truncate flex items-center gap-1">{d.name}{d.verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}</p><p className="text-[10px] font-semibold text-slate-500 truncate">{d.item_count} products{d.location ? ` · ${d.location}` : ''}</p></div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {adverts.length > 0 && (
            <div className="hm-scroll-x gap-3 -mx-1 px-1">
              {adverts.map(a => (
                <button key={a.id} type="button" onClick={() => setOpen(a)}
                  className="relative overflow-hidden text-left rounded-3xl text-white shadow-md w-[85%] sm:w-[calc(50%-6px)] min-h-[120px] p-4 bg-gradient-to-br from-violet-700 to-purple-600">
                  {a.image_urls[0] && <img src={a.image_urls[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-35" />}
                  <div className="relative">
                    <span className="inline-flex items-center gap-1 bg-amber-400 text-emerald-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full"><Megaphone className="w-3 h-3" /> {a.promo_label || 'Advert'}</span>
                    <p className="text-base font-extrabold leading-snug mt-2 line-clamp-2">{a.title}</p>
                    {a.description && <p className="text-xs text-white/85 font-medium mt-1 line-clamp-2">{a.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="hm-scroll-x gap-2 -mx-1 px-1" role="group" aria-label="Categories">
            {OJA_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition ${cat === c ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>
          {loading ? <p className="text-center text-xs text-slate-500 font-semibold py-6">Loading...</p> : (
            <>
              {onSale.length > 0 && (
                <div>
                  <SectionTitle>Deals and promos</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{onSale.map(p => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}</div>
                </div>
              )}
              <div>
                <SectionTitle>{onSale.length > 0 ? 'All products' : 'Featured products'}</SectionTitle>
                {shown.length === 0 ? (
                  <Card>
                    <EmptyState pose="megaphone" title={products.length === 0 ? 'No products yet' : 'No matching products'}
                      text={products.length === 0 ? 'New products will appear here soon. Want to sell? Open My Shop.' : 'Try another category or search.'}
                      action={products.length === 0 ? <SecondaryButton onClick={() => setTab('myshop')}>Open my shop</SecondaryButton> : undefined} />
                  </Card>
                ) : rest.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{rest.map(p => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}</div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'orders' && (
        <Card>
          <SectionTitle>My requests</SectionTitle>
          <div className="hm-scroll-x gap-2 mb-3">
            {(['All', 'pending', 'contacted', 'completed', 'cancelled'] as const).map(s => (
              <button key={s} type="button" onClick={() => setOrderFilter(s)} aria-pressed={orderFilter === s}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${orderFilter === s ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}>{s === 'All' ? 'All' : STATUS_TEXT[s]}</button>
            ))}
          </div>
          {shownOrders.length === 0 ? (
            <EmptyState pose="shrug" title="No requests yet" text="Items you request to buy and their status will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {shownOrders.map(o => (
                <li key={o.id} className="py-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{o.listing_title}{o.quantity > 1 ? ` x${o.quantity}` : ''}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{o.reference} · {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    {o.admin_note && <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">{o.admin_note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-800">{naira(o.total)}</p>
                    <Pill tone={STATUS_TONE[o.status]}>{STATUS_TEXT[o.status]}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'myshop' && <MyShopTab customerId={customer.id} whatsapp={customer.phone} referralCode={referralCode} onSection={onSection} />}
    </div>
  );
}
