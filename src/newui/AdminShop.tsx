import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { naira } from './ui';

type Toast = (m: string, t?: 'success' | 'error') => void;
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const box = 'bg-white rounded-2xl border border-slate-200 p-4 space-y-3';
const toLocal = (iso?: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const toIso = (l: string) => l ? new Date(l).toISOString() : '';

const FLAGS: [string, string][] = [
  ['analytics', 'Shows views and shares to the owner'], ['promo_pricing', 'Owner can set promo prices'], ['verified_badge', 'Verified badge'],
  ['auto_publish', 'OWNER controls: products go live instantly (off = admin reviews first)'], ['custom_banner', 'OWNER controls: own banner'],
  ['custom_theme', 'OWNER controls: own colour'], ['social_links', 'OWNER controls: social links'], ['announcement', 'OWNER controls: announcement bar'],
  ['hide_branding', 'OWNER controls: hide HireMercyAJO branding']
];

function PackageEditor({ p, toast, reload }: { p: any; toast: Toast; reload: () => void }) {
  const [d, setD] = useState<any>({ ...p, perks_text: (p.perks || []).join('\n'), promo_starts_at: toLocal(p.promo_starts_at), promo_ends_at: toLocal(p.promo_ends_at) });
  const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value.replace(/[^\d]/g, ''));
  const save = async () => {
    setBusy(true);
    const payload = { ...d, price: Number(d.price), promo_price: d.promo_price === '' || d.promo_price == null ? null : Number(d.promo_price),
      promo_starts_at: toIso(d.promo_starts_at), promo_ends_at: toIso(d.promo_ends_at), max_items: Number(d.max_items), max_photos: Number(d.max_photos),
      discount_3m_pct: Number(d.discount_3m_pct || 0), discount_12m_pct: Number(d.discount_12m_pct || 0), featured_rank: Number(d.featured_rank || 0), control_pct: Number(d.control_pct || 0),
      perks: String(d.perks_text || '').split('\n').map((s: string) => s.trim()).filter(Boolean) };
    const { error } = await supabase.rpc('admin_shop_save_package', { p: payload });
    setBusy(false);
    if (error) toast('Not saved. Check prices (promo must be lower than price) and dates.', 'error'); else { toast(`${d.name} saved`, 'success'); reload(); }
  };
  return (
    <div className="rounded-xl border border-slate-200">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <span className="text-sm font-black text-emerald-950 uppercase">{p.code} <span className="normal-case text-slate-500 font-semibold">· {naira(p.price)} · {p.enabled ? 'ON' : 'OFF'}</span></span>
        <span className="text-xs font-bold text-emerald-700">{open ? 'Close' : 'Edit'}</span>
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!d.enabled} onChange={e => set('enabled', e.target.checked)} /> Package is on sale</label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Display name</label><input className={inp} value={d.name || ''} onChange={e => set('name', e.target.value)} /></div>
            <div><label className={lbl}>Tagline</label><input className={inp} value={d.tagline || ''} onChange={e => set('tagline', e.target.value)} /></div>
            <div><label className={lbl}>Price per month (₦)</label><input className={inp} inputMode="numeric" value={d.price} onChange={num('price')} /></div>
            <div><label className={lbl}>Promo price (₦, optional)</label><input className={inp} inputMode="numeric" value={d.promo_price ?? ''} onChange={num('promo_price')} /></div>
            <div><label className={lbl}>Promo label</label><input className={inp} value={d.promo_label || ''} onChange={e => set('promo_label', e.target.value)} placeholder="Launch offer" /></div>
            <div />
            <div><label className={lbl}>Promo starts</label><input type="datetime-local" className={inp} value={d.promo_starts_at} onChange={e => set('promo_starts_at', e.target.value)} /></div>
            <div><label className={lbl}>Promo ends</label><input type="datetime-local" className={inp} value={d.promo_ends_at} onChange={e => set('promo_ends_at', e.target.value)} /></div>
            <div><label className={lbl}>Discount for 3 months (%)</label><input className={inp} inputMode="numeric" value={d.discount_3m_pct} onChange={num('discount_3m_pct')} /></div>
            <div><label className={lbl}>Discount for 12 months (%)</label><input className={inp} inputMode="numeric" value={d.discount_12m_pct} onChange={num('discount_12m_pct')} /></div>
            <div><label className={lbl}>Max products</label><input className={inp} inputMode="numeric" value={d.max_items} onChange={num('max_items')} /></div>
            <div><label className={lbl}>Photos per product (1-6)</label><input className={inp} inputMode="numeric" value={d.max_photos} onChange={num('max_photos')} /></div>
            <div><label className={lbl}>Directory ranking (0-100)</label><input className={inp} inputMode="numeric" value={d.featured_rank} onChange={num('featured_rank')} /></div>
            <div><label className={lbl}>Owner control shown (%)</label><input className={inp} inputMode="numeric" value={d.control_pct} onChange={num('control_pct')} /></div>
          </div>
          <div className="space-y-1.5">{FLAGS.map(([k, t]) => <label key={k} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={!!d[k]} onChange={e => set(k, e.target.checked)} />{t}</label>)}</div>
          <div><label className={lbl}>Feature list shown to customers (one per line)</label><textarea className={inp} rows={5} value={d.perks_text} onChange={e => set('perks_text', e.target.value)} /></div>
          <button disabled={busy} onClick={save} className={btn}>Save {p.code}</button>
        </div>
      )}
    </div>
  );
}

export function ShopAdminPanel({ toast }: { toast: Toast }) {
  const [tab, setTab] = useState<'setup' | 'shops' | 'subs'>('setup');
  const [cfg, setCfg] = useState<any>(null); const [shops, setShops] = useState<any[]>([]); const [subs, setSubs] = useState<any[]>([]);
  const [st, setSt] = useState<any>({}); const [busy, setBusy] = useState(false);
  const [cp, setCp] = useState<any>({ code: '', percent_off: '', amount_off: '', max_uses: '', ends_at: '', package_codes: '' });
  const [gift, setGift] = useState({ customer: '', pkg: 'standard', days: '30' });
  const [view, setView] = useState<any>(null); const [vItems, setVItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_shop_get_config');
    if (error || !data) { toast('My Shop settings unavailable. Has the My Shop SQL been run?', 'error'); return; }
    setCfg(data); setSt(data.settings);
    const [a, b] = await Promise.all([supabase.rpc('admin_shop_list_shops'), supabase.rpc('admin_shop_list_subscriptions')]);
    setShops((a.data || []) as any[]); setSubs((b.data || []) as any[]);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_shop_set_settings', { p_enabled: !!st.enabled, p_free: !!st.free_plan_enabled, p_free_days: Number(st.free_plan_days), p_free_package: st.free_plan_package, p_auto_publish: !!st.auto_publish });
    setBusy(false); if (error) toast('Not saved. Free days must be 1 to 365.', 'error'); else { toast('Saved', 'success'); load(); }
  };
  const saveCoupon = async () => {
    const { error } = await supabase.rpc('admin_shop_save_coupon', { p: { ...cp, percent_off: cp.percent_off || null, amount_off: cp.amount_off || null, max_uses: cp.max_uses || null, ends_at: toIso(cp.ends_at) || null,
      package_codes: cp.package_codes.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean), active: true } });
    if (error) toast('Coupon not saved. Code 3-20 letters/numbers, with a % or ₦ amount.', 'error'); else { toast('Coupon saved', 'success'); setCp({ code: '', percent_off: '', amount_off: '', max_uses: '', ends_at: '', package_codes: '' }); load(); }
  };
  const toggleCoupon = async (c: any) => { await supabase.rpc('admin_shop_save_coupon', { p: { ...c, ends_at: c.ends_at, active: !c.active } }); load(); };
  const setStatus = async (id: string, s: string) => { const { error } = await supabase.rpc('admin_shop_set_shop_status', { p_customer: id, p_status: s }); if (error) toast('Failed', 'error'); else load(); };
  const refund = async (id: string) => { if (!window.confirm('Refund this subscription to the customer wallet and end the plan?')) return; const { error } = await supabase.rpc('admin_shop_refund_subscription', { p_id: id }); if (error) toast('Cannot refund (free, gifted or already refunded).', 'error'); else { toast('Refunded to wallet', 'success'); load(); } };
  const doGift = async () => { const { error } = await supabase.rpc('admin_shop_gift', { p_customer: gift.customer.trim(), p_package: gift.pkg, p_days: Number(gift.days) }); if (error) toast('Not gifted. Use the customer ID from the Shops list.', 'error'); else { toast('Plan gifted', 'success'); load(); } };
  const openItems = async (s: any) => { setView(s); const { data } = await supabase.rpc('admin_shop_list_items', { p_customer: s.customer_id }); setVItems((data || []) as any[]); };
  const itemStatus = async (id: string, s: string) => { await supabase.rpc('admin_shop_set_item_status', { p_id: id, p_status: s }); if (view) openItems(view); load(); };

  if (!cfg) return <div className={box}><p className="text-sm font-bold text-slate-600">Loading My Shop…</p></div>;
  return (
    <div className={box}>
      <div>
        <h3 className="text-lg font-black text-emerald-950">MY SHOP (CUSTOMER SHOPS)</h3>
        <p className="text-xs text-slate-500 font-medium">Customers pay from their wallet for a plan and get a shareable shop page. Nothing is on until you switch it on.</p>
        <p className="text-xs font-semibold text-slate-600 mt-1">Shops: <b>{cfg.stats.shops}</b> · Active plans: <b>{cfg.stats.active_subscriptions}</b> · Paid so far: <b>{naira(cfg.stats.paid_revenue)}</b></p>
      </div>
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
        {([['setup', 'Settings & plans'], ['shops', 'Shops'], ['subs', 'Subscriptions']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`py-1.5 rounded-md text-[11px] font-bold ${tab === k ? 'bg-white shadow text-emerald-800' : 'text-slate-500'}`}>{l}</button>)}
      </div>

      {tab === 'setup' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!st.enabled} onChange={e => setSt({ ...st, enabled: e.target.checked })} /> My Shop is open to customers</label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={!!st.free_plan_enabled} onChange={e => setSt({ ...st, free_plan_enabled: e.target.checked })} /> Offer a one-time free plan</label>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Free plan days</label><input className={inp} inputMode="numeric" value={st.free_plan_days ?? ''} onChange={e => setSt({ ...st, free_plan_days: e.target.value.replace(/\D/g, '') })} /></div>
              <div><label className={lbl}>Free plan package</label><select className={inp} value={st.free_plan_package} onChange={e => setSt({ ...st, free_plan_package: e.target.value })}>{cfg.packages.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></div>
            </div>
            <button disabled={busy} onClick={saveSettings} className={btn}>Save settings</button>
          </div>
          <div className="space-y-2">{cfg.packages.map((p: any) => <PackageEditor key={p.code + p.updated_at} p={p} toast={toast} reload={load} />)}</div>
          <div className="space-y-2">
            <p className="text-sm font-black text-emerald-950">Coupons</p>
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="CODE" value={cp.code} onChange={e => setCp({ ...cp, code: e.target.value.toUpperCase() })} />
              <input className={inp} placeholder="% off" inputMode="numeric" value={cp.percent_off} onChange={e => setCp({ ...cp, percent_off: e.target.value.replace(/\D/g, '') })} />
              <input className={inp} placeholder="or ₦ off" inputMode="numeric" value={cp.amount_off} onChange={e => setCp({ ...cp, amount_off: e.target.value.replace(/\D/g, '') })} />
              <input className={inp} placeholder="max uses" inputMode="numeric" value={cp.max_uses} onChange={e => setCp({ ...cp, max_uses: e.target.value.replace(/\D/g, '') })} />
              <input type="datetime-local" className={inp} value={cp.ends_at} onChange={e => setCp({ ...cp, ends_at: e.target.value })} />
              <input className={inp} placeholder="packages e.g. silver,gold (blank = all)" value={cp.package_codes} onChange={e => setCp({ ...cp, package_codes: e.target.value })} />
            </div>
            <button onClick={saveCoupon} className={btn}>Add / update coupon</button>
            {cfg.coupons.map((c: any) => <div key={c.code} className="flex items-center justify-between text-xs font-semibold border-t border-slate-100 pt-2"><span><b>{c.code}</b> · {c.percent_off ? `${c.percent_off}%` : naira(c.amount_off)} · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</span><button className={btn2} onClick={() => toggleCoupon(c)}>{c.active ? 'Turn off' : 'Turn on'}</button></div>)}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-sm font-black text-emerald-950">Gift a plan</p>
            <div className="grid grid-cols-3 gap-2">
              <input className={inp + ' col-span-3'} placeholder="Customer ID (from Shops list)" value={gift.customer} onChange={e => setGift({ ...gift, customer: e.target.value })} />
              <select className={inp} value={gift.pkg} onChange={e => setGift({ ...gift, pkg: e.target.value })}>{cfg.packages.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}</select>
              <input className={inp} inputMode="numeric" value={gift.days} onChange={e => setGift({ ...gift, days: e.target.value.replace(/\D/g, '') })} />
              <button className={btn} onClick={doGift}>Gift</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'shops' && !view && (
        <ul className="divide-y divide-slate-100">
          {shops.length === 0 && <li className="text-xs text-slate-500 py-3">No shops yet.</li>}
          {shops.map(s => (
            <li key={s.customer_id} className="py-2.5 space-y-1">
              <p className="text-sm font-black text-slate-800">{s.name} <span className="text-[11px] font-semibold text-slate-500">/?shop={s.slug}</span></p>
              <p className="text-[11px] font-semibold text-slate-600">{s.owner} · {s.owner_phone} · {s.package ? `${s.package} until ${new Date(s.ends_at).toLocaleDateString()}` : 'no active plan'} · {s.items} items{s.pending_items > 0 ? ` (${s.pending_items} to review)` : ''} · {s.views} views</p>
              <p className="text-[10px] text-slate-400 break-all">ID: {s.customer_id}</p>
              <div className="flex gap-2"><button className={btn2} onClick={() => openItems(s)}>Products / edit</button><button className={btn2} onClick={() => setStatus(s.customer_id, s.status === 'active' ? 'suspended' : 'active')}>{s.status === 'active' ? 'Pause shop' : 'Unpause'}</button></div>
            </li>
          ))}
        </ul>
      )}
      {tab === 'shops' && view && (
        <div className="space-y-2">
          <button className={btn2} onClick={() => setView(null)}>← Back</button>
          <p className="text-sm font-black">{view.name}</p>
          {vItems.length === 0 && <p className="text-xs text-slate-500">No products.</p>}
          {vItems.map(i => (
            <div key={i.id} className="border border-slate-200 rounded-xl p-2.5 text-xs font-semibold space-y-1.5">
              <p className="font-black text-slate-800">{i.title} · {i.price != null ? naira(i.price) : '-'} · <span className="uppercase">{i.status}</span></p>
              <div className="flex gap-2 flex-wrap">
                {i.status !== 'published' && <button className={btn} onClick={() => itemStatus(i.id, 'published')}>Approve / publish</button>}
                {i.status === 'published' && <button className={btn2} onClick={() => itemStatus(i.id, 'hidden')}>Hide</button>}
                {i.status !== 'removed' && <button className={btn2} onClick={() => itemStatus(i.id, 'removed')}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'subs' && (
        <ul className="divide-y divide-slate-100">
          {subs.length === 0 && <li className="text-xs text-slate-500 py-3">No subscriptions yet.</li>}
          {subs.map(s => (
            <li key={s.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-600 min-w-0"><p className="font-black text-slate-800">{s.customer} · {s.package_code} ({s.source})</p><p>{naira(s.amount_paid)} · {s.months ? `${s.months} mo` : ''} · until {new Date(s.ends_at).toLocaleDateString()} · <b>{s.status}</b></p></div>
              {s.source === 'paid' && s.status !== 'refunded' && Number(s.amount_paid) > 0 && <button className={btn2} onClick={() => refund(s.id)}>Refund</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
