import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Toast = (m: string, t?: 'success' | 'error') => void;
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';

export function StreakAdminPanel({ toast }: { toast: Toast }) {
  const [s, setS] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState('3');
  const [points, setPoints] = useState('0');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_streak_settings');
    if (error || !data) { toast('Streak settings unavailable. Has the streak SQL been run?', 'error'); return; }
    setS(data); setEnabled(!!data.rewards_enabled); setDays(String(data.milestone_days)); setPoints(String(data.reward_points));
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_streak_settings', { p_enabled: enabled, p_days: Number(days), p_points: Number(points) });
    setBusy(false);
    if (error) toast('Could not save: check days (1-30) and points (0-1000)', 'error'); else { toast('Streak reward saved', 'success'); load(); }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-lg font-black text-emerald-950">LOGIN STREAK REWARD</h3>
        <p className="text-xs text-slate-500 font-medium">Streaks are always tracked. Reward points are paid only when switched on here, once each time a customer completes the number of days below. Points only - no cash.</p>
      </div>
      {s && <p className="text-xs font-semibold text-slate-600">Customers active today: <b>{s.active_today}</b> · Rewards given: <b>{s.awards_count}</b> ({s.points_awarded} points)</p>}
      <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Pay streak reward points</label>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Consecutive days needed</label><input className={inp} inputMode="numeric" value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ''))} /></div>
        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Points per reward</label><input className={inp} inputMode="numeric" value={points} onChange={e => setPoints(e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <button disabled={busy} onClick={save} className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">Save</button>
    </div>
  );
}
