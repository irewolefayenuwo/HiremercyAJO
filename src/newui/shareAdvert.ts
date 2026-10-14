import { supabase } from '../lib/supabase';
import { copyText } from './ui';

export interface ShareInput { title: string; text?: string; referralCode?: string | null; key: string }

export function buildShareLink(referralCode?: string | null): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return referralCode ? `${base}/register?ref=${encodeURIComponent(referralCode)}` : base;
}

/**
 * Opens the phone's share sheet (WhatsApp, Facebook, Instagram, etc.) with the advert and the customer's own
 * referral link. Falls back to copying the text. Afterwards tells the server a share happened; the server
 * decides whether any reward applies (admin-controlled, daily limited).
 */
export async function shareAdvert(i: ShareInput): Promise<{ shared: boolean; awarded: number; note: string }> {
  const link = buildShareLink(i.referralCode);
  const message = [i.title, i.text, `Join me on HireMercyAJO: ${link}`].filter(Boolean).join('\n\n');
  let shared = false; let note = '';
  try {
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      await (navigator as any).share({ title: i.title, text: message });
      shared = true;
    }
  } catch (e: any) {
    if (e && e.name === 'AbortError') return { shared: false, awarded: 0, note: 'Share cancelled.' };
  }
  if (!shared) {
    const ok = await copyText(message);
    shared = ok;
    note = ok ? 'Advert text and your link are copied - paste it on WhatsApp, Facebook or Instagram.' : 'Could not share on this device.';
    if (!ok) return { shared: false, awarded: 0, note };
  }
  let awarded = 0;
  try {
    const { data } = await supabase.rpc('record_advert_share', { p_advert: i.key });
    awarded = Number((data as any)?.awarded || 0);
  } catch { /* the share still happened */ }
  return { shared, awarded, note: awarded > 0 ? `Shared! You earned ${awarded} points.` : (note || 'Shared. Thank you!') };
}
