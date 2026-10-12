import { supabase } from '../lib/supabase';

export interface ApiResult<T = any> { ok: boolean; code?: string; message?: string; data?: T }

/** Calls the `vtu` Edge Function. Never throws; secrets/credentials never touch the browser. */
export async function vtuCall<T = any>(body: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('vtu', { body });
    if (error) {
      let parsed: any = null;
      try { parsed = await (error as any).context?.json?.(); } catch { /* ignore */ }
      if (parsed && parsed.message) return { ok: false, code: parsed.code, message: parsed.message };
      return { ok: false, code: 'NETWORK', message: 'Could not reach the service. If you were buying, check your order history before trying again.' };
    }
    return data?.ok ? { ok: true, data } : { ok: false, code: data?.code, message: data?.message || 'Request failed.' };
  } catch {
    return { ok: false, code: 'NETWORK', message: 'Could not reach the service. If you were buying, check your order history before trying again.' };
  }
}

export interface PublicSettings {
  provider_enabled: boolean;
  services: Record<string, { enabled: boolean; min_amount: number; max_amount: number }>;
  promotions_enabled: boolean;
}
/** null = backend not installed / unreachable -> UI shows the honest "not active" state. */
export async function loadPublicSettings(): Promise<PublicSettings | null> {
  try {
    const { data, error } = await supabase.rpc('get_vtu_public_settings');
    if (error || !data) return null;
    return data as PublicSettings;
  } catch { return null; }
}

export const newIdempotencyKey = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(16).slice(2)}`;

export const STATUS_LABEL: Record<string, { text: string; tone: 'green' | 'gold' | 'red' | 'slate' }> = {
  pending: { text: 'Processing', tone: 'gold' },
  processing: { text: 'Processing', tone: 'gold' },
  successful: { text: 'Successful', tone: 'green' },
  failed: { text: 'Failed', tone: 'red' },
  refund_pending: { text: 'Refund pending', tone: 'gold' },
  refunded: { text: 'Refunded', tone: 'slate' }
};
