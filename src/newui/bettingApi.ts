import { supabase } from '../lib/supabase';
import type { ApiResult } from './vtuApi';

export interface BettingProvider {
  service_id: string;       // exact VTU.ng id, e.g. "SportyBet"
  name: string;
  logo_url: string | null;
  featured: boolean;
  min_amount: number | null;
  max_amount: number | null;
  info: string | null;
}
export interface BettingPublic {
  enabled: boolean;         // false for customers while Betting is off or in test mode
  testing: boolean;
  min_amount: number | null;
  max_amount: number | null;
  providers: BettingProvider[];
}

// One small database call, cached for a minute so opening Bills & Top-up stays cheap.
let cache: { at: number; v: BettingPublic | null } | null = null;
export async function loadBettingPublic(force = false): Promise<BettingPublic | null> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.v;
  try {
    const { data, error } = await supabase.rpc('get_betting_public');
    const v = error || !data ? null : (data as BettingPublic);
    cache = { at: Date.now(), v };
    return v;
  } catch {
    cache = { at: Date.now(), v: null };
    return null;
  }
}

/** Calls the `vtu-betting` Edge Function. Never throws. Credentials never touch the browser. */
export async function bettingCall<T = any>(body: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('vtu-betting', { body });
    if (error) {
      let parsed: any = null;
      try { parsed = await (error as any).context?.json?.(); } catch { /* ignore */ }
      if (parsed && parsed.message) return { ok: false, code: parsed.code, message: parsed.message };
      return { ok: false, code: 'NETWORK', message: 'Could not reach the service. If you were paying, check your history before trying again.' };
    }
    return data?.ok ? { ok: true, data } : { ok: false, code: data?.code, message: data?.message || 'Request failed.' };
  } catch {
    return { ok: false, code: 'NETWORK', message: 'Could not reach the service. If you were paying, check your history before trying again.' };
  }
}

// Favourites live on the device only: no extra database calls.
const FAV_KEY = 'hm_bet_favs';
export function loadFavs(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
export function saveFavs(ids: string[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids.slice(0, 50))); } catch { /* storage unavailable */ }
}
