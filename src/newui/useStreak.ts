import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface StreakInfo {
  streak: number;
  longest: number;
  /** last 7 days, oldest first, last item = today */
  days: boolean[];
  rewards_enabled: boolean;
  milestone_days: number;
  reward_points: number;
  awarded: number;
}

let cache: { key: string; p: Promise<StreakInfo | null> } | null = null;

/** Records today's login (once per day, server side) and returns the real streak. null = not available. */
export function useStreak(customerId: string): { streak: StreakInfo | null; loaded: boolean } {
  const [s, setS] = useState<StreakInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let dead = false;
    const key = `${customerId}:${new Date().toDateString()}`;
    if (!cache || cache.key !== key) {
      cache = {
        key,
        p: Promise.resolve(supabase.rpc('record_login_day')).then(({ data, error }) => (error || !data ? null : (data as StreakInfo))).catch(() => null)
      };
    }
    cache.p.then(v => { if (!dead) { setS(v); setLoaded(true); } });
    return () => { dead = true; };
  }, [customerId]);
  return { streak: s, loaded };
}
