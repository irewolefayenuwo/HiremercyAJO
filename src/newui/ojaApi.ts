import { supabase } from '../lib/supabase';

export interface OjaListing {
  id: string;
  kind: 'product' | 'advert';
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  promo_price: number | null;
  effective_price: number | null;
  promo_label: string | null;
  promo_ends_at: string | null;
  image_urls: string[];
  seller_name: string | null;
  seller_whatsapp: string | null;
  location: string | null;
  link_url: string | null;
  in_stock: boolean;
  is_featured: boolean;
}
export interface OjaRequest {
  id: string; reference: string; listing_id: string; listing_title: string; quantity: number;
  unit_price: number; total: number; note: string | null;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled'; admin_note: string | null; created_at: string;
}

/** null = backend not installed / unreachable. */
export async function loadOjaListings(): Promise<OjaListing[] | null> {
  const { data, error } = await supabase.rpc('oja_list_listings');
  if (error) return null;
  return ((data || []) as any[]).map(x => ({
    ...x, price: x.price == null ? null : Number(x.price), promo_price: x.promo_price == null ? null : Number(x.promo_price),
    effective_price: x.effective_price == null ? null : Number(x.effective_price), image_urls: x.image_urls || []
  }));
}

export async function loadMyOjaRequests(): Promise<OjaRequest[]> {
  const { data } = await supabase.from('oja_requests')
    .select('id, reference, listing_id, listing_title, quantity, unit_price, total, note, status, admin_note, created_at')
    .order('created_at', { ascending: false }).limit(50);
  return ((data || []) as any[]).map(r => ({ ...r, unit_price: Number(r.unit_price), total: Number(r.total) }));
}

const ERR: Record<string, string> = {
  LISTING_UNAVAILABLE: 'This item is no longer available.',
  OUT_OF_STOCK: 'This item is out of stock.',
  TOO_MANY_PENDING: 'You already have 10 open requests. Wait for some to be handled first.',
  INVALID_QUANTITY: 'Choose a quantity between 1 and 100.',
  NOT_AUTHENTICATED: 'Please sign in again.'
};
export async function placeOjaRequest(listing: string, qty: number, note: string):
  Promise<{ ok: true; data: any } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('oja_place_request', { p_listing: listing, p_qty: qty, p_note: note });
  if (error) {
    const code = Object.keys(ERR).find(k => (error.message || '').includes(k));
    return { ok: false, message: code ? ERR[code] : 'Could not send your request. Please try again.' };
  }
  return { ok: true, data };
}
