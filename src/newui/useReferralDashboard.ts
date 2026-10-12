import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Shape returned by the existing get_my_referral_dashboard() database function. */
export interface DashboardLite {
  referral_code: string;
  total_referred: number;
  successful_referrals: number;
  total_earnings: number;
  pending_rewards: number;
  welcome_bonus_amount: number;
  welcome_bonus_status: string | null;
  welcome_bonus_withdrawable: boolean;
  points: number;
  history: {
    referred_name: string;
    joined_at: string;
    qualified: boolean;
    first_contribution_amount: number | null;
    reward_amount: number | null;
    reward_status: 'pending' | 'earned' | 'paid' | 'reversed' | null;
  }[];
}

/**
 * Read-only: calls the existing RPC once and shares the result with Home, Rewards and
 * Profile. It never writes anything.
 */
export function useReferralDashboard(customerId: string) {
  const [data, setData] = useState<DashboardLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: res, error } = await supabase.rpc('get_my_referral_dashboard');
        if (!alive) return;
        if (error || !res) {
          setFailed(true);
        } else {
          setFailed(false);
          setData(res as DashboardLite);
        }
      } catch {
        if (alive) setFailed(true);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [customerId, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, failed, reload };
}
