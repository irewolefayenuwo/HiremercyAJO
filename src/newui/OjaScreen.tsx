import React, { useEffect, useMemo, useState } from 'react';
import { Search, Store, Package, ShoppingBag, Plus, Image as ImageIcon, X, Star, ChevronRight, MapPin, BadgeCheck } from 'lucide-react';
import type { Profile, SupportSettings } from '../App';
import { Mascot } from './Mascot';
import { Card, EmptyState, NotLive, Pill, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira, whatsappUrl } from './ui';
import { FEATURES, OJA_CATEGORIES, type SectionKey } from './config';

/** Shape the marketplace tables will return once they exist. */
export interface OjaProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  seller_name: string;
  seller_verified?: boolean;
  location?: string;
  description?: string;
  rating?: number | null;
  in_stock?: boolean;
}
export type OjaOrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
export interface OjaOrder {
  id: string;
  product_name: string;
  amount: number;
  status: OjaOrderStatus;
  seller_name: string;
  created_at: string;
}

/**
 * Data source. There are no marketplace tables yet, so this returns empty lists - the UI never
 * shows sample products or orders. Replace with Supabase queries when the tables exist.
 */
function useOjaData() {
  return { products: [] as OjaProduct[], orders: [] as OjaOrder[] };
}

const STATUS_TONE: Record<OjaOrderStatus, 'gold' | 'blue' | 'green' | 'red'> = {
  Pending: 'gold', 'In Progress': 'blue', Completed: 'green', Cancelled: 'red'
};

export function ProductCard({ product, onOpen }: { product: OjaProduct; onOpen: (p: OjaProduct) => void }) {
  return (
    <button type="button" onClick={() => onOpen(product)} className="text-left bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden active:scale-[0.98] transition">
      <div className="aspect-square bg-orange-50 flex items-center justify-center">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
          : <Package className="w-10 h-10 text-orange-300" />}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
        <p className="text-sm font-black text-emerald-800 mt-0.5">{naira(product.price)}</p>
        <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
          {product.seller_verified && <BadgeCheck className="w-3 h-3 text-emerald-600 shrink-0" />}{product.seller_name}
        </p>
      </div>
    </button>
  );
}

export function ProductDetails({ product, onBack }: { product: OjaProduct; onBack: () => void }) {
  return (
    <div className="space-y-4 fade-in max-w-2xl mx-auto">
      <ScreenHeader title="Product details" onBack={onBack} tone="gold" />
      <Card className="space-y-3">
        <div className="aspect-[4/3] rounded-2xl bg-orange-50 overflow-hidden flex items-center justify-center">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-14 h-14 text-orange-300" />}
        </div>
        <h3 className="text-lg font-extrabold text-slate-900">{product.name}</h3>
        <p className="text-2xl font-black text-emerald-800">{naira(product.price)}</p>
        {product.rating != null && <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {product.rating}</p>}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
          {product.seller_verified && <BadgeCheck className="w-4 h-4 text-emerald-600" />} {product.seller_name}
          {product.location && <span className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" /> {product.location}</span>}
        </div>
        {product.description && <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>}
      </Card>
      <NotLive title="Ordering is not switched on yet">Buying needs the order and payment system, which is not live. No order is placed from this page.</NotLive>
      <PrimaryButton disabled className="w-full">Buy now</PrimaryButton>
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

type OjaTab = 'shop' | 'orders' | 'sell';

export function OjaScreen({
  customer, supportDetails, onSection
}: { customer: Profile; supportDetails: SupportSettings; onSection: (s: SectionKey) => void }) {
  const { products, orders } = useOjaData();
  const [tab, setTab] = useState<OjaTab>('shop');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [orderFilter, setOrderFilter] = useState<'All' | OjaOrderStatus>('All');
  const [open, setOpen] = useState<OjaProduct | null>(null);

  const shown = products.filter(p =>
    (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const shownOrders = orders.filter(o => orderFilter === 'All' || o.status === orderFilter);

  if (open) return <ProductDetails product={open} onBack={() => setOpen(null)} />;

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

      {!FEATURES.marketplace && (
        <NotLive title="Gbagede OJA is not open yet">
          The marketplace is being prepared. You can see how it will look and tell us you want to sell; no products, orders or payments exist yet.
        </NotLive>
      )}

      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="tablist" aria-label="Marketplace sections">
        {([['shop', 'Shop', ShoppingBag], ['orders', 'My Orders', Package], ['sell', 'Sell', Plus]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${tab === k ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <>
          <div className="hm-scroll-x gap-2 -mx-1 px-1" role="group" aria-label="Categories">
            {OJA_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition ${cat === c ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>
          <div>
            <SectionTitle>Featured products</SectionTitle>
            {shown.length === 0 ? (
              <Card>
                <EmptyState pose="megaphone" title={products.length === 0 ? 'No products yet' : 'No matching products'}
                  text={products.length === 0 ? 'Sellers will appear here once Gbagede OJA opens.' : 'Try another category or search.'}
                  action={products.length === 0 ? <SecondaryButton onClick={() => setTab('sell')}>I want to sell</SecondaryButton> : undefined} />
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shown.map(p => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <Card>
          <SectionTitle>Order history</SectionTitle>
          <div className="hm-scroll-x gap-2 mb-3">
            {(['All', 'Pending', 'In Progress', 'Completed'] as const).map(s => (
              <button key={s} type="button" onClick={() => setOrderFilter(s)} aria-pressed={orderFilter === s}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${orderFilter === s ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}>{s}</button>
            ))}
          </div>
          {shownOrders.length === 0 ? (
            <EmptyState pose="shrug" title="No orders yet" text="Orders you place and their status will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {shownOrders.map(o => (
                <li key={o.id} className="py-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{o.product_name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{o.seller_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-800">{naira(o.amount)}</p>
                    <Pill tone={STATUS_TONE[o.status]}>{o.status}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'sell' && (
        <div className="space-y-4">
          <Card>
            <SectionTitle>Sell on Gbagede OJA</SectionTitle>
            <SellerRequestForm customer={customer} supportDetails={supportDetails} />
          </Card>
          <Card>
            <SectionTitle>Seller requests & orders</SectionTitle>
            <EmptyState pose="shrug" title="Nothing here yet" text="Requests to buy your products and their status will be managed here once the marketplace opens." />
          </Card>
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-purple-700 text-white p-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">Boost your sales</p>
              <p className="text-[11px] text-white/80 font-medium">See advertising packages for sellers.</p>
            </div>
            <button type="button" onClick={() => onSection('advertise')} className="shrink-0 bg-white text-purple-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1">
              View <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
