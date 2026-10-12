import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadPublicSettings } from './vtuApi';

export interface LiveFlags {
  loaded: boolean;
  /** wallet backend answered: balance is the real database balance */
  wallet: boolean;
  balance: number;
  /** provider switched on by admin and at least one service enabled */
  bills: boolean;
  /** marketplace backend installed */
  oja: boolean;
}

/**
 * Feature state comes from the live backend, never from hard-coded switches. If a call fails the
 * feature is reported as not live and the screens show the honest "not active" state.
 */
export function useLiveFlags(): LiveFlags {
  const [f, setF] = useState<LiveFlags>({ loaded: false, wallet: false, balance: 0, bills: false, oja: false });
  useEffect(() => {
    let dead = false;
    (async () => {
      const [w, s, o] = await Promise.all([
        supabase.rpc('get_my_wallet'),
        loadPublicSettings(),
        supabase.rpc('oja_list_listings')
      ]);
      if (dead) return;
      setF({
        loaded: true,
        wallet: !w.error,
        balance: w.error ? 0 : Number((w.data as any)?.balance || 0),
        bills: !!s && s.provider_enabled && Object.values(s.services || {}).some(x => x.enabled),
        oja: !o.error
      });
    })().catch(() => { if (!dead) setF(x => ({ ...x, loaded: true })); });
    return () => { dead = true; };
  }, []);
  return f;
}
