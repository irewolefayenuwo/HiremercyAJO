import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Toast = (m: string, t?: 'success' | 'error') => void;
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-1';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';

interface Program { code: 'contribution' | 'advert_share' | 'oja_visit'; title: string; description: string; enabled: boolean; points: number; threshold: number; daily_cap: number; since: string }

const HELP: Record<string, string> = {
  contribution: 'Customers earn points for every N successful contribution days (counted from the start date) and claim them in the Rewards screen.',
  advert_share: 'Customers share the advert from their phone. Points are given for up to N shares per day. We cannot confirm that a post was really published, so keep this small.',
  oja_visit: 'Points once per day when a customer opens Gbagede OJA.'
};

function ProgramCard({ p, toast, onSaved }: { p: Program; toast: Toast; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(p.enabled);
  const [points, setPoints] = useState(String(p.points));
  const [threshold, setThreshold] = useState(String(p.threshold));
  const [cap, setCap] = useState(String(p.daily_cap));
  const [since, setSince] = useState(p.since);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_reward_program', {
      p_code: p.code, p_enabled: enabled, p_points: Number(points) || 0, p_threshold: Number(threshold) || 1, p_daily_cap: Number(cap) || 1, p_since: since || null
    });
    setBusy(false);
    if (error) toast('Could not save: points 0-1000, days 1-365, daily limit 1-10', 'error'); else { toast(`${p.title}: ${enabled ? 'ON' : 'OFF'} saved`, 'success'); onSaved(); }
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-slate-900">{p.title}</p>
        <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> {enabled ? <span className="text-emerald-700">ON</span> : <span className="text-slate-500">OFF</span>}</label>
      </div>
      <p className="text-[11px] text-slate-500 font-medium">{HELP[p.code]}</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>Points per reward</label><input className={inp} inputMode="numeric" value={points} onChange={e => setPoints(e.target.value.replace(/\D/g, ''))} /></div>
        {p.code === 'contribution' && <div><label className={lbl}>Contribution days per reward</label><input className={inp} inputMode="numeric" value={threshold} onChange={e => setThreshold(e.target.value.replace(/\D/g, ''))} /></div>}
        {p.code === 'advert_share' && <div><label className={lbl}>Rewarded shares per day</label><input className={inp} inputMode="numeric" value={cap} onChange={e => setCap(e.target.value.replace(/\D/g, ''))} /></div>}
        {p.code === 'contribution' && <div className="col-span-2"><label className={lbl}>Count contributions from (date)</label><input type="date" className={inp} value={since} onChange={e => setSince(e.target.value)} /></div>}
      </div>
      <button className={btn} disabled={busy} onClick={save}>Save</button>
    </div>
  );
}

export function RewardsAdminPanel({ toast }: { toast: Toast }) {
  const [cfg, setCfg] = useState<any>(null);
  const [rEnabled, setREnabled] = useState(false);
  const [ppn, setPpn] = useState('10');
  const [min, setMin] = useState('100');
  const [max, setMax] = useState('1000');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_rewards_config');
    if (error || !data) { toast('Rewards settings unavailable. Has the rewards SQL been run?', 'error'); return; }
    setCfg(data);
    setREnabled(!!data.redeem.enabled); setPpn(String(data.redeem.points_per_naira)); setMin(String(data.redeem.min_points)); setMax(String(data.redeem.max_naira_per_day));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const saveRedeem = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_redeem_settings', { p_enabled: rEnabled, p_ppn: Number(ppn) || 1, p_min: Number(min) || 1, p_max_naira: Number(max) || 0 });
    setBusy(false);
    if (error) toast('Could not save redeem settings', 'error'); else { toast(`Redeem points: ${rEnabled ? 'ON' : 'OFF'} saved`, 'success'); load(); }
  };

  const outstanding = Number(cfg?.points_outstanding || 0);
  const ppnN = Number(cfg?.redeem?.points_per_naira || 1);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      <div>
        <h3 className="text-lg font-black text-emerald-950">REWARDS CONTROL</h3>
        <p className="text-xs text-slate-500 font-medium">Switch each earning task on or off, and decide how points can be redeemed. Everything is OFF until you turn it on. Login streak is set in its own box below.</p>
      </div>
      {cfg && (
        <p className="text-xs font-semibold text-slate-600">
          Points customers currently hold: <b>{outstanding.toLocaleString()}</b>
          {cfg.redeem.enabled ? <> (worth up to ₦{Math.floor(outstanding / ppnN).toLocaleString()} if all redeemed)</> : null}
        </p>
      )}
      {(cfg?.programs || []).map((p: Program) => <ProgramCard key={p.code + p.enabled + p.points + p.threshold + p.daily_cap + p.since} p={p} toast={toast} onSaved={load} />)}
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-slate-900">Redeem points to wallet</p>
          <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" checked={rEnabled} onChange={e => setREnabled(e.target.checked)} /> {rEnabled ? <span className="text-emerald-700">ON</span> : <span className="text-slate-500">OFF</span>}</label>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Customers swap points for wallet money, which they can spend on airtime and data. This costs you real money, so set the rate carefully.</p>
        <div className="grid grid-cols-3 gap-2">
          <div><label className={lbl}>Points = ₦1</label><input className={inp} inputMode="numeric" value={ppn} onChange={e => setPpn(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label className={lbl}>Minimum points</label><input className={inp} inputMode="numeric" value={min} onChange={e => setMin(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label className={lbl}>Max ₦ per customer per day</label><input className={inp} inputMode="numeric" value={max} onChange={e => setMax(e.target.value.replace(/\D/g, ''))} /></div>
        </div>
        <button className={btn} disabled={busy} onClick={saveRedeem}>Save</button>
      </div>
      {cfg?.points_by_source && Object.keys(cfg.points_by_source).length > 0 && (
        <p className="text-[11px] text-slate-500 font-medium">Points by source: {Object.entries(cfg.points_by_source).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
      )}
    </div>
  );
}
