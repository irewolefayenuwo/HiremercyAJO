import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface RewardsInfo {
  balance: number;
  contribution: { enabled: boolean; points: number; threshold: number; days_counted: number; claimable_blocks: number; toward_next: number };
  advert_share: { enabled: boolean; points: number; daily_cap: number; shares_today: number; ever: boolean };
  oja_visit: { enabled: boolean; points: number; done_today: boolean; ever: boolean };
  redeem: { enabled: boolean; points_per_naira: number; min_points: number; max_naira_per_day: number; naira_today: number };
}

/** Everything about the customer's reward programs, straight from the server (null = not available). */
export function useRewards(customerId: string) {
  const [data, setData] = useState<RewardsInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let dead = false;
    (async () => {
      const { data: d, error } = await supabase.rpc('get_my_rewards');
      if (dead) return;
      setData(error || !d ? null : (d as RewardsInfo));
      setLoaded(true);
    })().catch(() => { if (!dead) setLoaded(true); });
    return () => { dead = true; };
  }, [customerId, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { rewards: data, loaded, reload };
}
