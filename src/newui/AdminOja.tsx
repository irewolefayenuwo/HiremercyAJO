import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OJA_CATEGORIES } from './config';

type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const cleanErr = (m?: string) => (m || 'Failed').replace(/^.*?(FORBIDDEN|INVALID_[A-Z_]+|NOT_FOUND|[a-z ]*violates[^"]*"[^"]*").*$/s, '$1').slice(0, 140);

interface Row {
  id: string; kind: 'product' | 'advert'; title: string; description: string | null; category: string | null;
  price: number | null; promo_price: number | null; promo_label: string | null; promo_starts_at: string | null; promo_ends_at: string | null;
  image_urls: string[]; seller_name: string | null; seller_whatsapp: string | null; location: string | null; link_url: string | null;
  in_stock: boolean; is_featured: boolean; status: 'draft' | 'published' | 'hidden'; sort_order: number; created_at: string;
}
interface Req {
  id: string; reference: string; listing_title: string; customer_name: string | null; customer_phone: string | null; quantity: number;
  unit_price: number; total: number; note: string | null; status: 'pending' | 'contacted' | 'completed' | 'cancelled'; admin_note: string | null; created_at: string;
}

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');

/** Shrinks phone photos so they fit the 3 MB bucket limit and load fast for customers. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.82));
}

export function AdminOjaPanel({ toast }: { toast: Toast }) {
  const [tab, setTab] = useState<'product' | 'advert' | 'requests'>('product');
  const tabs = [['product', 'Products'], ['advert', 'Adverts & banners'], ['requests', 'Buy requests']] as const;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-black text-emerald-950">GBAGEDE OJA MARKETPLACE</h3>
        <p className="text-xs text-slate-500 font-medium">Post products and adverts, set promo prices, and handle customer buy requests. Only published items are visible to customers.</p>
      </div>
      <div className="flex flex-wrap gap-2">{tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tab === k ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700'}`}>{l}</button>))}</div>
      {tab === 'requests' ? <Requests toast={toast} /> : <Listings key={tab} kind={tab} toast={toast} />}
    </div>
  );
}

function Listings({ kind, toast }: { kind: 'product' | 'advert'; toast: Toast }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_oja_list_listings');
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    setRows(((data || []) as Row[]).filter(r => r.kind === kind));
  }, [kind, toast]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (r: Row, status: string) => {
    const { error } = await supabase.rpc('admin_oja_set_status', { p_id: r.id, p_status: status });
    if (error) toast(cleanErr(error.message), 'error'); else { toast('Updated', 'success'); load(); }
  };
  const promoActive = (r: Row) => r.promo_price != null && (!r.promo_starts_at || new Date(r.promo_starts_at) <= new Date()) && (!r.promo_ends_at || new Date(r.promo_ends_at) > new Date());

  if (edit) return <Editor kind={kind} initial={edit} toast={toast} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />;
  return (
    <div className="space-y-3">
      <button className={btn} onClick={() => setEdit({ kind, status: 'draft', in_stock: true, is_featured: false, image_urls: [], sort_order: 0 })}>
        + {kind === 'product' ? 'New product' : 'New advert'}
      </button>
      {rows.length === 0 && <p className="text-xs text-slate-500 font-semibold">Nothing here yet.</p>}
      {rows.map(r => (
        <div key={r.id} className={`${box} flex gap-3`}>
          <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">{r.image_urls[0] && <img src={r.image_urls[0]} alt="" className="w-full h-full object-cover" />}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900 truncate">{r.title}</p>
            <p className="text-[11px] text-slate-500 font-semibold">
              {r.price != null && <>{naira(r.price)}{r.promo_price != null && <> → <b className={promoActive(r) ? 'text-red-600' : 'text-slate-400'}>{naira(r.promo_price)}{promoActive(r) ? ' (live)' : ' (not live)'}</b></>} · </>}
              <span className={r.status === 'published' ? 'text-emerald-700' : 'text-amber-700'}>{r.status}</span>
              {r.is_featured && ' · featured'}{kind === 'product' && !r.in_stock && ' · out of stock'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button className={btn2} onClick={() => setEdit(r)}>Edit</button>
              {r.status !== 'published'
                ? <button className={btn} onClick={() => setStatus(r, 'published')}>Publish</button>
                : <button className={btn2} onClick={() => setStatus(r, 'hidden')}>Hide</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Editor({ kind, initial, toast, onClose, onSaved }: {
  kind: 'product' | 'advert'; initial: Partial<Row>; toast: Toast; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: initial.title || '', description: initial.description || '', category: initial.category || '',
    price: initial.price != null ? String(initial.price) : '', promo_price: initial.promo_price != null ? String(initial.promo_price) : '',
    promo_label: initial.promo_label || '', promo_starts_at: toLocalInput(initial.promo_starts_at), promo_ends_at: toLocalInput(initial.promo_ends_at),
    seller_name: initial.seller_name || '', seller_whatsapp: initial.seller_whatsapp || '', location: initial.location || '', link_url: initial.link_url || '',
    in_stock: initial.in_stock !== false, is_featured: !!initial.is_featured, status: initial.status || 'draft', sort_order: String(initial.sort_order ?? 0)
  });
  const [imgs, setImgs] = useState<string[]>(initial.image_urls || []);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF(p => ({ ...p, [k]: v }));

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - imgs.length)) {
        const blob = await shrink(file);
        const path = `${kind}/${Date.now()}-${Math.random().toString(16).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from('oja').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        out.push(supabase.storage.from('oja').getPublicUrl(path).data.publicUrl);
      }
      setImgs(p => [...p, ...out]);
    } catch (e: any) {
      toast('Photo upload failed. Check that the OJA storage step was run. ' + (e?.message || '').slice(0, 80), 'error');
    }
    setBusy(false);
  };

  const save = async (status?: string) => {
    if (f.title.trim().length < 2) { toast('Enter a title', 'error'); return; }
    if (kind === 'product' && !(Number(f.price) > 0)) { toast('Enter the normal price', 'error'); return; }
    if (f.promo_price && !(Number(f.promo_price) > 0 && Number(f.promo_price) < Number(f.price))) { toast('Promo price must be lower than the normal price', 'error'); return; }
    if (f.promo_starts_at && f.promo_ends_at && new Date(f.promo_ends_at) <= new Date(f.promo_starts_at)) { toast('Promo end must be after its start', 'error'); return; }
    setBusy(true);
    const payload = {
      id: initial.id || '', kind, title: f.title, description: f.description, category: f.category, price: f.price, promo_price: f.promo_price,
      promo_label: f.promo_label, promo_starts_at: fromLocalInput(f.promo_starts_at), promo_ends_at: fromLocalInput(f.promo_ends_at),
      image_urls: imgs, seller_name: f.seller_name, seller_whatsapp: f.seller_whatsapp, location: f.location, link_url: f.link_url,
      in_stock: f.in_stock, is_featured: f.is_featured, status: status || f.status, sort_order: Number(f.sort_order) || 0
    };
    const { error } = await supabase.rpc('admin_oja_save_listing', { p: payload });
    setBusy(false);
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    toast(status === 'published' ? 'Saved and published' : 'Saved', 'success');
    onSaved();
  };

  const isP = kind === 'product';
  return (
    <div className={`${box} space-y-3`}>
      <h4 className="text-sm font-extrabold">{initial.id ? 'Edit' : 'New'} {isP ? 'product' : 'advert'}</h4>
      <div><label className={lbl}>Title</label><input className={inp} value={f.title} onChange={e => set('title', e.target.value)} maxLength={120} /></div>
      <div><label className={lbl}>Description</label><textarea className={inp} rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></div>
      <div>
        <label className={lbl}>Photos (up to 6, first is the cover)</label>
        <div className="flex flex-wrap gap-2 mb-2">{imgs.map(u => (
          <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button type="button" aria-label="Remove" onClick={() => setImgs(imgs.filter(x => x !== u))} className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white text-xs">×</button>
          </div>))}</div>
        {imgs.length < 6 && <input type="file" accept="image/*" multiple disabled={busy} onChange={e => { upload(e.target.files); e.currentTarget.value = ''; }} className="text-xs" />}
      </div>
      {isP && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Normal price (₦)</label><input className={inp} inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value.replace(/[^\d.]/g, ''))} /></div>
          <div><label className={lbl}>Category</label>
            <select className={inp} value={f.category} onChange={e => set('category', e.target.value)}><option value="">None</option>{OJA_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
      )}
      {isP && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 space-y-3">
          <p className="text-xs font-extrabold text-red-700">Promo / discount price (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Promo price (₦)</label><input className={inp} inputMode="decimal" value={f.promo_price} onChange={e => set('promo_price', e.target.value.replace(/[^\d.]/g, ''))} /></div>
            <div><label className={lbl}>Label (e.g. Weekend sale)</label><input className={inp} value={f.promo_label} onChange={e => set('promo_label', e.target.value)} maxLength={40} /></div>
            <div><label className={lbl}>Starts (blank = now)</label><input type="datetime-local" className={inp} value={f.promo_starts_at} onChange={e => set('promo_starts_at', e.target.value)} /></div>
            <div><label className={lbl}>Ends (blank = no end)</label><input type="datetime-local" className={inp} value={f.promo_ends_at} onChange={e => set('promo_ends_at', e.target.value)} /></div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Customers see the promo price with the normal price struck through, only while the promo window is active. Requests are priced by the server.</p>
        </div>
      )}
      {!isP && <div><label className={lbl}>Badge text (e.g. New, Sponsored)</label><input className={inp} value={f.promo_label} onChange={e => set('promo_label', e.target.value)} maxLength={40} /></div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Seller / business name</label><input className={inp} value={f.seller_name} onChange={e => set('seller_name', e.target.value)} /></div>
        <div><label className={lbl}>Seller WhatsApp (234…)</label><input className={inp} inputMode="tel" value={f.seller_whatsapp} onChange={e => set('seller_whatsapp', e.target.value.replace(/[^\d+]/g, ''))} /></div>
        <div><label className={lbl}>Location</label><input className={inp} value={f.location} onChange={e => set('location', e.target.value)} /></div>
        <div><label className={lbl}>Link (https only)</label><input className={inp} value={f.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://" /></div>
        <div><label className={lbl}>Sort order (lower first)</label><input className={inp} inputMode="numeric" value={f.sort_order} onChange={e => set('sort_order', e.target.value.replace(/[^\d-]/g, ''))} /></div>
        <div><label className={lbl}>Status</label>
          <select className={inp} value={f.status} onChange={e => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
        {isP && <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.in_stock} onChange={e => set('in_stock', e.target.checked)} /> In stock</label>}
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.is_featured} onChange={e => set('is_featured', e.target.checked)} /> Featured (shown first)</label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={busy} onClick={() => save()}>Save</button>
        <button className={btn} disabled={busy} onClick={() => save('published')}>Save & publish</button>
        <button className={btn2} disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function Requests({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<Req[]>([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_oja_list_requests', { p_status: status || null });
    if (error) { toast(cleanErr(error.message), 'error'); return; }
    setRows((data || []) as Req[]);
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);
  const upd = async (r: Req, s: Req['status']) => {
    const { error } = await supabase.rpc('admin_oja_update_request', { p_id: r.id, p_status: s, p_note: notes[r.id] ?? r.admin_note ?? '' });
    if (error) toast(cleanErr(error.message), 'error'); else { toast('Updated', 'success'); load(); }
  };
  return (
    <div className="space-y-3">
      <select className={inp + ' !w-auto'} value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">All requests</option>{['pending', 'contacted', 'completed', 'cancelled'].map(s => <option key={s}>{s}</option>)}
      </select>
      {rows.length === 0 && <p className="text-xs text-slate-500 font-semibold">No requests.</p>}
      {rows.map(r => (
        <div key={r.id} className={`${box} space-y-2`}>
          <div className="flex justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">{r.listing_title} × {r.quantity}</p>
            <p className="text-sm font-black text-emerald-800">{naira(r.total)}</p>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold">{r.reference} · {dt(r.created_at)} · <b>{r.status}</b></p>
          <p className="text-xs text-slate-700 font-semibold">{r.customer_name} {r.customer_phone && <a className="text-emerald-700 underline" href={`https://wa.me/${r.customer_phone.replace(/\D/g, '').replace(/^0/, '234')}`} target="_blank" rel="noopener noreferrer">{r.customer_phone}</a>}</p>
          {r.note && <p className="text-xs text-slate-600">Note: {r.note}</p>}
          <input className={inp} placeholder="Note to customer (shown in their My Orders)" value={notes[r.id] ?? r.admin_note ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            {(['contacted', 'completed', 'cancelled', 'pending'] as const).filter(s => s !== r.status).map(s => <button key={s} className={s === 'completed' ? btn : btn2} onClick={() => upd(r, s)}>Mark {s}</button>)}
            {notes[r.id] !== undefined && <button className={btn2} onClick={() => upd(r, r.status)}>Save note</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
