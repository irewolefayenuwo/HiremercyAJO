import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminAlerts {
  pending_deposits: number;
  pending_deposit_amount: number;
  oldest_deposit: string | null;
  orders_attention: number;
  oja_pending: number;
  shop_pending_items?: number;
}

function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
    });
    setTimeout(() => ctx.close?.(), 1000);
  } catch { /* sound is optional */ }
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* optional */ }
}

/**
 * Polls the server every 30 seconds while the admin dashboard is open. A new waiting wallet deposit
 * plays a sound, vibrates, updates the page title and (if allowed) shows a phone notification.
 * Non-admin users get an error from the server and simply see nothing.
 */
export function useAdminAlerts(enabled: boolean): { alerts: AdminAlerts | null; refresh: () => void } {
  const [alerts, setAlerts] = useState<AdminAlerts | null>(null);
  const prev = useRef<number | null>(null);
  const baseTitle = useRef(typeof document !== 'undefined' ? document.title : '');

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_alert_counts');
      if (error || !data) return;
      const a = data as AdminAlerts;
      a.pending_deposit_amount = Number(a.pending_deposit_amount || 0);
      if (prev.current !== null && a.pending_deposits > prev.current) {
        beep();
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New wallet deposit', { body: `${a.pending_deposits} deposit(s) waiting for your confirmation` });
          }
        } catch { /* optional */ }
      }
      prev.current = a.pending_deposits;
      setAlerts(a);
      if (typeof document !== 'undefined') {
        document.title = a.pending_deposits > 0 ? `(${a.pending_deposits}) ${baseTitle.current}` : baseTitle.current;
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); if (typeof document !== 'undefined') document.title = baseTitle.current; };
  }, [enabled, refresh]);

  return { alerts, refresh };
}

export function AdminAlertBanner({ alerts, onOpenWallet, onOpenOja, onOpenShop }: { alerts: AdminAlerts | null; onOpenWallet: () => void; onOpenOja: () => void; onOpenShop?: () => void }) {
  const [perm, setPerm] = useState<string>(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  if (!alerts) return null;
  const items: React.ReactNode[] = [];
  if (alerts.pending_deposits > 0) items.push(
    <button key="d" type="button" onClick={onOpenWallet} className="w-full text-left flex items-center gap-3 rounded-2xl bg-amber-50 border-2 border-amber-300 px-4 py-3 animate-pulse">
      <span className="text-xl">💰</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-amber-900">{alerts.pending_deposits} wallet deposit{alerts.pending_deposits > 1 ? 's' : ''} waiting - ₦{alerts.pending_deposit_amount.toLocaleString()}</span>
        <span className="block text-[11px] font-semibold text-amber-800">Check your bank, then tap here to confirm.</span>
      </span>
      <span className="text-xs font-bold text-amber-900">Review →</span>
    </button>);
  if (alerts.orders_attention > 0) items.push(
    <button key="o" type="button" onClick={onOpenWallet} className="w-full text-left rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-800">
      {alerts.orders_attention} bill order{alerts.orders_attention > 1 ? 's' : ''} need your attention →
    </button>);
  if (alerts.oja_pending > 0) items.push(
    <button key="j" type="button" onClick={onOpenOja} className="w-full text-left rounded-2xl bg-orange-50 border border-orange-200 px-4 py-2.5 text-xs font-bold text-orange-800">
      {alerts.oja_pending} Gbagede OJA buy request{alerts.oja_pending > 1 ? 's' : ''} pending →
    </button>);
  if ((alerts.shop_pending_items || 0) > 0 && onOpenShop) items.push(
    <button key="s" type="button" onClick={onOpenShop} className="w-full text-left rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2.5 text-xs font-bold text-violet-800">
      {alerts.shop_pending_items} My Shop product{alerts.shop_pending_items! > 1 ? 's' : ''} waiting for your review →
    </button>);
  const canAsk = perm === 'default';
  return (
    <div className="space-y-2">
      {items}
      {canAsk && (
        <button type="button" onClick={async () => { try { setPerm(await Notification.requestPermission()); } catch { /* ignore */ } }}
          className="text-[11px] font-bold text-emerald-700 underline">Allow phone notifications for new deposits</button>
      )}
    </div>
  );
}
