import { supabase } from '../lib/supabase';

export interface ShopPackage {
  code: 'standard' | 'silver' | 'gold' | 'premium';
  name: string; tagline: string | null; price: number; effective_price: number;
  promo_label: string | null; promo_ends_at: string | null;
  discount_3m_pct: number; discount_12m_pct: number;
  max_items: number; max_photos: number; analytics: boolean; promo_pricing: boolean; verified_badge: boolean;
  featured_rank: number; auto_publish: boolean; custom_banner: boolean; custom_theme: boolean; social_links: boolean;
  announcement: boolean; hide_branding: boolean; control_pct: number; perks: string[];
}
export interface ShopSub {
  id: string; package_code: string; package_name: string; source: 'paid' | 'free' | 'gift'; starts_at: string; ends_at: string;
  max_items: number; max_photos: number; analytics: boolean; promo_pricing: boolean; verified_badge: boolean; auto_publish: boolean;
  custom_banner: boolean; custom_theme: boolean; social_links: boolean; announcement: boolean; hide_branding: boolean; control_pct: number;
}
export interface Shop {
  slug: string; name: string; tagline: string | null; description: string | null; logo_url: string | null; banner_url: string | null;
  whatsapp: string | null; phone: string | null; location: string | null; theme_color: string | null; announcement: string | null;
  social: Record<string, string>; status: 'active' | 'suspended'; views: number; shares: number;
}
export interface ShopConfig {
  enabled: boolean;
  free_plan: { enabled: boolean; days: number; package: string; used: boolean };
  packages: ShopPackage[];
  subscription: ShopSub | null;
  last_subscription: { package_code: string; ends_at: string; status: string } | null;
  shop: Shop | null;
}
export interface ShopItem {
  id: string; title: string; description: string | null; price: number | null; promo_price: number | null; images: string[];
  in_stock: boolean; status: 'published' | 'pending' | 'hidden' | 'removed'; views: number; shares: number;
}
export interface ShopQuote {
  package: string; name: string; months: number; days: number; list_price: number; unit_price: number;
  multi_month_pct: number; multi_month_discount: number; coupon: string | null; coupon_discount: number; total: number;
}
export interface DirectoryShop {
  slug: string; name: string; tagline: string | null; logo_url: string | null; location: string | null; badge: string; verified: boolean;
  item_count: number; cover: string | null;
}

const ERR: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please sign in again.',
  NOT_ACTIVE: 'My Shop is not open right now.',
  NOT_ALLOWED: 'This account cannot use My Shop.',
  PACKAGE_UNAVAILABLE: 'That package is not available right now.',
  INVALID_MONTHS: 'Choose 1, 3 or 12 months.',
  COUPON_INVALID: 'That coupon code is not valid for this package.',
  COUPON_USED: 'You have already used this coupon.',
  COUPON_EXPIRED: 'This coupon has expired.',
  COUPON_EXHAUSTED: 'This coupon has been fully used.',
  ALREADY_SUBSCRIBED: 'You already have an active plan.',
  FREE_PLAN_USED: 'You have already used your free plan.',
  NO_ACTIVE_PLAN: 'Your plan has ended. Renew to continue.',
  CREATE_SHOP_FIRST: 'Set up your shop first.',
  SLUG_TAKEN: 'That shop link is taken. Try another.',
  SHOP_SUSPENDED: 'Your shop is paused by HireMercyAJO. Contact support.',
  ITEM_LIMIT: 'You have reached the product limit of your plan. Upgrade to add more.',
  TOO_MANY_PHOTOS: 'Your plan allows fewer photos per product.',
  INVALID_IMAGE_URL: 'Image could not be used. Please upload it again.',
  INVALID_LINK: 'Social links must start with https://',
  ITEM_REMOVED: 'This product was removed.',
  NOT_FOUND: 'Not found.',
  INSUFFICIENT_FUNDS: 'Your wallet balance is too low. Fund your wallet first.',
  INSUFFICIENT_BALANCE: 'Your wallet balance is too low. Fund your wallet first.',
  ALREADY_CLAIMED: 'You have already claimed this bonus.',
  NOT_ELIGIBLE: 'This bonus is not available for your account.',
  BUDGET_EXHAUSTED: 'This bonus has run out. Thank you for your interest.'
};
export function friendlyError(e: any, fallback = 'Something went wrong. Please try again.'): string {
  const msg = String(e?.message || e || '');
  const code = Object.keys(ERR).find(k => msg.includes(k));
  return code ? ERR[code] : fallback;
}

export async function loadShopConfig(): Promise<ShopConfig | null> {
  const { data, error } = await supabase.rpc('get_shop_config');
  if (error || !data) return null;
  const d = data as any;
  d.packages = (d.packages || []).map((p: any) => ({ ...p, price: Number(p.price), effective_price: Number(p.effective_price), perks: p.perks || [] }));
  return d as ShopConfig;
}
export async function loadMyShopItems(): Promise<ShopItem[]> {
  const { data } = await supabase.rpc('shop_my_items');
  return ((data || []) as any[]).map(i => ({ ...i, price: i.price == null ? null : Number(i.price), promo_price: i.promo_price == null ? null : Number(i.promo_price), images: i.images || [] }));
}
export async function loadDirectory(): Promise<DirectoryShop[]> {
  const { data } = await supabase.rpc('get_shop_directory');
  return (data || []) as DirectoryShop[];
}
export async function quote(pkg: string, months: number, coupon: string): Promise<{ ok: true; q: ShopQuote } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('shop_quote', { p_package: pkg, p_months: months, p_coupon: coupon.trim() || null });
  if (error) return { ok: false, message: friendlyError(error, 'Could not calculate the price.') };
  return { ok: true, q: data as ShopQuote };
}

export const shopUrl = (slug: string) => `${window.location.origin}/?shop=${encodeURIComponent(slug)}`;

/** Shrinks a photo in the browser and uploads it to a public bucket under <uid>/. Returns its public URL. */
export async function uploadImage(bucket: 'shops' | 'popups' | 'adverts', folder: string, file: File, maxSide = 1100): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP picture.');
  const blob = await shrink(file, maxSide);
  const path = `${folder}${folder ? '/' : ''}${Date.now()}-${Math.random().toString(16).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(/size|large/i.test(error.message) ? 'Picture is too large.' : 'Upload failed. Please try again.');
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function shrink(file: File, maxSide: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const r = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      const ctx = c.getContext('2d');
      if (!ctx) { reject(new Error('Could not read the picture.')); return; }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Could not read the picture.')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the picture.')); };
    img.src = url;
  });
}

/** Uploads an advert video (mp4/webm/mov, up to 40 MB) straight to the adverts bucket. Returns its public URL. */
export async function uploadVideo(bucket: 'adverts', folder: string, file: File): Promise<string> {
  if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error('Choose an MP4, WebM or MOV video.');
  if (file.size > 40 * 1024 * 1024) throw new Error('Video is too large. Keep it under 40 MB.');
  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${folder}${folder ? '/' : ''}${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(/size|large|exceed/i.test(error.message) ? 'Video is too large for your storage limit.' : 'Upload failed. Please try again.');
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
