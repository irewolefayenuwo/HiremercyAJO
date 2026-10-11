import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, X, Check, Copy, Info } from 'lucide-react';
import { Mascot, type MascotPose } from './Mascot';

export const naira = (n: number | null | undefined) => `₦${Number(n || 0).toLocaleString()}`;

export const firstName = (full: string | undefined) => (full || '').trim().split(/\s+/)[0] || 'there';

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Opens WhatsApp with a prefilled message to the support number the Admin configured. */
export const whatsappUrl = (number: string | undefined, text: string) => {
  const digits = (number || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : '';
};

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall back below */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Screen header: green gradient, back button, optional right slot and character. */
export function ScreenHeader({
  title, subtitle, onBack, right, pose, tone = 'green'
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  pose?: MascotPose;
  tone?: 'green' | 'gold' | 'blue';
}) {
  const bg = tone === 'gold'
    ? 'from-amber-600 via-amber-500 to-yellow-500'
    : tone === 'blue'
      ? 'from-sky-700 via-sky-600 to-emerald-600'
      : 'from-emerald-900 via-emerald-800 to-emerald-600';
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bg} text-white shadow-md`}>
      <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-3 p-4 sm:p-5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back"
            className="shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-white/80 font-medium mt-0.5">{subtitle}</p>}
        </div>
        {right}
        {pose && <div className="shrink-0 -my-3 -mr-1"><Mascot pose={pose} size={84} /></div>}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-extrabold text-emerald-950">{children}</h3>
      {action}
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'green' | 'gold' | 'blue' | 'red' | 'slate'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-100 text-emerald-800',
    gold: 'bg-amber-100 text-amber-800',
    blue: 'bg-sky-100 text-sky-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-600'
  }[tone];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{children}</span>;
}

/** Friendly empty state with the character. */
export function EmptyState({
  pose = 'shrug', title, text, action
}: { pose?: MascotPose; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-5 px-2">
      <div className="flex justify-center"><Mascot pose={pose} size={96} /></div>
      <p className="text-sm font-extrabold text-slate-800 mt-1">{title}</p>
      {text && <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs mx-auto">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Honest "this part is not connected yet" notice. */
export function NotLive({ title = 'Not active yet', children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5">
      <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-extrabold text-amber-900">{title}</p>
        <p className="text-[11px] text-amber-800 font-medium mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children, onClick, disabled, type = 'button', className = ''
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition text-sm shadow-sm active:scale-[0.98] ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children, onClick, disabled, className = ''
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 bg-white border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-800 font-bold py-3 px-4 rounded-xl transition text-sm active:scale-[0.98] ${className}`}>
      {children}
    </button>
  );
}

export function CopyButton({ text, label = 'Copy', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <button type="button" disabled={disabled || !text}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1800);
        }
      }}
      className="shrink-0 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-3 py-2 rounded-lg text-xs transition">
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {done ? 'Copied' : label}
    </button>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open, onClose, title, children
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 cursor-default hm-fade" />
      <div className="hm-sheet relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[88vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-white z-10">
          <h3 className="text-base font-extrabold text-emerald-950">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'green' }: { value: number; max: number; tone?: 'green' | 'gold' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={`h-full rounded-full ${tone === 'gold' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
