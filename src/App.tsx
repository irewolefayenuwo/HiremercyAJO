import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PiggyBank, Phone, Lock, EyeOff, Eye as EyeIcon, Mail, User as UserIcon, 
  ChevronLeft, ChevronRight, ChevronDown, LayoutDashboard, Users, Plus, Search, Trash2, Calendar, 
  CheckCircle2, XCircle, LogOut, Shield, Briefcase, Landmark, Info, Key,
  Bell, Settings, HelpCircle, MessageSquare, Building2, UserPlus, Coins, Clock, FileText, Edit2, X
} from 'lucide-react';
import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

// --- TS Type Definitions matched to Supabase SQL ---
export interface Profile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'Admin' | 'Staff' | 'Customer';
  branch_id?: string;
  daily_amount: number;
  is_active: boolean;
  created_at?: string;
  last_amount_change_at?: string;
  allow_anytime_change?: boolean;
  admin_note?: string;
  loan_status: 'No Loan' | 'Pending Approval' | 'Active Loan' | 'Loan Cleared';
}

export interface Loan {
  id: string;
  customer_id: string;
  customer_name?: string;
  status: 'Active Loan' | 'Loan Cleared';
  loan_amount: number;
  repayment_amount: number;
  service_charge: number;
  daily_amount_snapshot: number;
  outstanding_balance: number;
  date_issued?: string;
  due_date?: string;
  installments?: number;
  amount_repaid: number;
  amount_remaining: number;
  amount_already_counted: number;
  days_repaid: number;
  total_days: number;
  approved_by?: string;
  remarks?: string;
  source: 'customer_request' | 'admin_assigned';
  loan_request_id?: string;
  completed_at?: string;
  created_at?: string;
}

export interface LoanRequest {
  id: string;
  customer_id: string;
  customer_name?: string;
  daily_amount_snapshot: number;
  loan_amount: number;
  repayment_amount: number;
  service_charge: number;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
  rejection_reason?: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  date: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'Mobile Money';
  days_covered: number;
  start_day: number;
  end_day: number;
  branch_id?: string;
  status?: 'Pending' | 'Successful';
}

export interface MarkedDay {
  id?: string;
  day_number: number;
  amount: number;
  date: string;
  period_key?: string;
  transaction_id?: string;
}

export interface SupportSettings {
  id: number;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  admin_bank_name?: string;
  admin_account_number?: string;
  admin_account_name?: string;
  advert_title?: string;
  advert_description?: string;
  advert_image_url?: string;
  advert_video_url?: string;
  advert_enabled?: boolean;
  theme_background_color?: string;
}

export interface WithdrawalRequest {
  id: string;
  customer_id: string;
  customer_name?: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  amount: number;
  status: 'Pending' | 'Successful' | 'Rejected';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  customer_id: string;
  customer_name?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  payout_method: 'Transfer' | 'Cash';
  amount: number;
  payout_amount: number;
  status: 'Pending' | 'Successful' | 'Rejected';
  created_at: string;
  month_paid?: string;
  contribution_ids?: string[];
}

// --- 32-DAY SAVED MONTH (CONTRIBUTIONS LEDGER) & PAYOUT ARCHIVE TYPES ---
export interface SavedMonth {
  id: string;
  customer_id: string;
  customer_name?: string;
  month_label: string;
  period_key: string;
  total_days: number;
  total_amount: number;
  status: 'saved' | 'requested' | 'paid';
  created_at: string;
}

export interface PayoutHistoryRecord {
  id: string;
  customer_id: string;
  customer_name?: string;
  contribution_id?: string;
  payout_request_id?: string;
  month_label: string;
  total_amount: number;
  payout_amount: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  payout_method: 'Transfer' | 'Cash';
  approved_at: string;
}

// --- GLOBAL NIGERIAN PHONE FORMATTING HELPER ---
const formatNigerianPhone = (phone: string): string => {
  const cleanPhone = phone.trim().replace(/[\s\-\(\)\[\]]/g, '');
  if (cleanPhone.startsWith('+')) return cleanPhone;
  if (cleanPhone.startsWith('234') && cleanPhone.length >= 13) return `+${cleanPhone}`;
  if (cleanPhone.startsWith('0')) return `+234${cleanPhone.slice(1)}`;
  return `+234${cleanPhone}`;
};

// Global helper to track current collection period
const getNigerianMonthName = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[new Date().getMonth()]} Collected`;
};

// Unique key (YYYY-MM) identifying the calendar month a 32-day cycle was frozen/saved in
const getCurrentPeriodKey = () => new Date().toISOString().slice(0, 7);

// --- FEATURE 1: 32-Day Tracking History (Running / Uncollected / Collected) ---
export interface TrackingHistoryEntry {
  key: string;
  period_key: string;
  month_label: string;
  total_days: number;
  total_amount: number;
  status: 'Running' | 'Uncollected' | 'Collected';
}

// Combines the three data sources into one normalized timeline for a single
// customer: whatever's still open in marked_days (Running), whatever's been
// frozen into contributions but not yet paid out (Uncollected), and whatever
// has been archived to cycle_archives once admin approves payout (Collected).
const buildTrackingHistory = (
  markedDaysForCustomer: MarkedDay[],
  savedMonthsForCustomer: SavedMonth[],
  cycleArchiveRowsForCustomer: any[]
): TrackingHistoryEntry[] => {
  const rows: TrackingHistoryEntry[] = [];

  // Running: group whatever's currently open in marked_days by period_key.
  // Anything still sitting in marked_days is by definition not yet frozen,
  // so it's always the active/ongoing cycle.
  const runningGroups: Record<string, MarkedDay[]> = {};
  markedDaysForCustomer.forEach(d => {
    const pk = (d as any).period_key || getCurrentPeriodKey();
    if (!runningGroups[pk]) runningGroups[pk] = [];
    runningGroups[pk].push(d);
  });
  Object.entries(runningGroups).forEach(([pk, days]) => {
    rows.push({
      key: `running-${pk}`,
      period_key: pk,
      month_label: periodLabelFromKey(pk),
      total_days: days.length,
      total_amount: sumCurrencyValues(days.map(d => Number(d.amount || 0))),
      status: 'Running'
    });
  });

  // Uncollected: frozen 32-day (or expired) cycles awaiting payout
  savedMonthsForCustomer
    .filter(m => m.status === 'saved' || m.status === 'requested')
    .forEach(m => {
      rows.push({
        key: `uncollected-${m.id}`,
        period_key: m.period_key,
        month_label: m.month_label || periodLabelFromKey(m.period_key),
        total_days: m.total_days,
        total_amount: m.total_amount,
        status: 'Uncollected'
      });
    });

  // Collected: approved payouts, sourced from cycle_archives (pre-existing table)
  cycleArchiveRowsForCustomer.forEach((row, idx) => {
    const periodKey = pickField(row, ['period_key', 'month_key', 'period']) || '';
    rows.push({
      key: `collected-${pickField(row, ['id']) || idx}`,
      period_key: periodKey,
      month_label: pickField(row, ['month_label', 'month', 'period_label', 'label']) || periodLabelFromKey(periodKey) || 'Archived month',
      total_days: Number(pickField(row, ['total_days', 'days_completed', 'days']) || 32),
      total_amount: Number(pickField(row, ['total_amount', 'amount', 'payout_amount', 'amount_paid']) || 0),
      status: 'Collected'
    });
  });

  return rows.sort((a, b) => (b.period_key || '').localeCompare(a.period_key || ''));
};

// Badge styling exactly per spec: Running = amber, Uncollected = neutral slate
// (deliberately no green), Collected = emerald with a checkmark.
const TrackingStatusBadge = ({ status }: { status: TrackingHistoryEntry['status'] }) => {
  if (status === 'Running') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
        Running
      </span>
    );
  }
  if (status === 'Collected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
        <CheckCircle2 className="w-3 h-3" /> Collected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700">
      Uncollected
    </span>
  );
};

// Read-only loan status badge for the Customer Directory. Colors per spec:
// green = No Loan, yellow = Pending Approval, orange = Active Loan,
// blue = Loan Repaid (stored as 'Loan Cleared'). This used to be a manual
// dropdown editor from before the real Loan Management module existed;
// now that loans/loan_requests + the repayment trigger manage this field
// automatically, making it editable here would let it drift out of sync
// with the real loan record, so it's now display-only.
const LoanStatusBadge = ({ status }: { status: Profile['loan_status'] }) => {
  const dotColor =
    status === 'Pending Approval' ? 'bg-yellow-500' :
    status === 'Active Loan' ? 'bg-orange-500' :
    status === 'Loan Cleared' ? 'bg-blue-500' :
    'bg-emerald-500';
  const label = status === 'Loan Cleared' ? 'Loan Repaid' : status;
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-[10px] font-bold text-slate-700">{label}</span>
    </div>
  );
};

// Full customer detail view, opened by clicking a name in the Customer
// Directory. Transaction history and loan info are fetched on-demand for
// just this one customer (not from the global, 90-day-windowed admin
// state) so this always shows complete history regardless of that filter.
const CustomerDetailsModal = ({
  customer, branches, profiles, markedDays, savedMonths, payoutHistory,
  dateFilter, setDateFilter, customFrom, setCustomFrom, customTo, setCustomTo,
  viewingDay, setViewingDay, onClose,
}: {
  customer: Profile, branches: Branch[], profiles: Profile[],
  markedDays: Record<string, MarkedDay[]>, savedMonths: Record<string, SavedMonth[]>,
  payoutHistory: PayoutHistoryRecord[],
  dateFilter: 'today' | 'week' | 'month' | 'custom', setDateFilter: (v: 'today' | 'week' | 'month' | 'custom') => void,
  customFrom: string, setCustomFrom: (v: string) => void, customTo: string, setCustomTo: (v: string) => void,
  viewingDay: MarkedDay | null, setViewingDay: (d: MarkedDay | null) => void,
  onClose: () => void,
}) => {
  const [fullTransactions, setFullTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loanRecord, setLoanRecord] = useState<Loan | null>(null);
  const [loadingLoan, setLoadingLoan] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingTx(true);
    supabase
      .from('transactions')
      .select('id, customer_id, amount, date, payment_method, days_covered, start_day, end_day, branch_id, status, staff_id, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setFullTransactions(data || []); setLoadingTx(false); } });

    setLoadingLoan(true);
    supabase
      .from('loans')
      .select('*')
      .eq('customer_id', customer.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) { setLoanRecord(data as Loan || null); setLoadingLoan(false); } });

    return () => { cancelled = true; };
  }, [customer.id]);

  const branch = branches.find(b => b.id === customer.branch_id);
  const staffLookup = (id?: string) => profiles.find(p => p.id === id)?.name || 'Admin';

  const filteredTx = useMemo(() => {
    const now = new Date();
    return fullTransactions.filter((t: any) => {
      const txDate = new Date(t.created_at || t.date);
      if (dateFilter === 'today') return txDate.toDateString() === now.toDateString();
      if (dateFilter === 'week') { const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); return txDate >= weekAgo; }
      if (dateFilter === 'month') return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      if (dateFilter === 'custom') { if (!customFrom || !customTo) return true; return txDate >= new Date(customFrom) && txDate <= new Date(customTo + 'T23:59:59'); }
      return true;
    });
  }, [fullTransactions, dateFilter, customFrom, customTo]);

  const marked = markedDays[customer.id] || [];
  const daysCompleted = marked.length;
  const totalContribution = marked.reduce((s, d) => s + d.amount, 0);
  const uncollected = (savedMonths[customer.id] || []).filter(s => s.status === 'saved' || s.status === 'requested');
  const collected = payoutHistory.filter(p => p.customer_id === customer.id);
  const viewingDayTx = viewingDay ? fullTransactions.find((t: any) => t.id === viewingDay.transaction_id) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-emerald-955">{customer.name}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <section className="mb-6 bg-emerald-50/50 rounded-2xl p-4">
          <h3 className="text-xs font-black uppercase text-emerald-800 mb-3">Customer Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-500 font-bold">Full Name</p><p className="font-bold">{customer.name}</p></div>
            <div><p className="text-slate-500 font-bold">Phone</p><p className="font-bold">{customer.phone}</p></div>
            <div><p className="text-slate-500 font-bold">Email</p><p className="font-bold">{customer.email || '—'}</p></div>
            <div><p className="text-slate-500 font-bold">Branch</p><p className="font-bold">{branch?.name || '—'}</p></div>
            <div><p className="text-slate-500 font-bold">Daily Target</p><p className="font-bold">₦{customer.daily_amount.toLocaleString()}</p></div>
            <div><p className="text-slate-500 font-bold">Registered</p><p className="font-bold">{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}</p></div>
            <div><p className="text-slate-500 font-bold">Status</p><p className="font-bold">{customer.is_active ? 'Active' : 'Inactive'}</p></div>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <h3 className="text-xs font-black uppercase text-emerald-800">Transaction History</h3>
            <div className="flex gap-1 items-center">
              {(['today', 'week', 'month', 'custom'] as const).map(f => (
                <button key={f} type="button" onClick={() => setDateFilter(f)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${dateFilter === f ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {dateFilter === 'custom' && (
            <div className="flex gap-2 mb-2 text-[10px]">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border rounded-lg px-2 py-1" />
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border rounded-lg px-2 py-1" />
            </div>
          )}
          {loadingTx ? (
            <p className="text-xs text-slate-400">Loading...</p>
          ) : filteredTx.length === 0 ? (
            <p className="text-xs text-slate-400">No transactions in this range.</p>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead><tr className="text-slate-500 font-bold border-b"><th className="p-1.5">Date</th><th className="p-1.5">Time</th><th className="p-1.5">Amount</th><th className="p-1.5">Method</th><th className="p-1.5">Staff</th></tr></thead>
                <tbody className="divide-y">
                  {filteredTx.map((t: any) => (
                    <tr key={t.id}>
                      <td className="p-1.5">{new Date(t.created_at || t.date).toLocaleDateString()}</td>
                      <td className="p-1.5">{t.created_at ? new Date(t.created_at).toLocaleTimeString() : '—'}</td>
                      <td className="p-1.5 font-bold">₦{t.amount.toLocaleString()}</td>
                      <td className="p-1.5">{t.payment_method}</td>
                      <td className="p-1.5">{staffLookup(t.staff_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-6">
          <h3 className="text-xs font-black uppercase text-emerald-800 mb-2">32-Day Contribution Grid</h3>
          <div className="grid grid-cols-8 gap-1.5 mb-2">
            {Array.from({ length: 32 }, (_, i) => i + 1).map(dayNum => {
              const day = marked.find(d => d.day_number === dayNum);
              return (
                <button key={dayNum} type="button" disabled={!day} onClick={() => day && setViewingDay(day)}
                  className={`aspect-square rounded-lg text-[10px] font-black flex items-center justify-center ${day ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {dayNum}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-[11px] font-bold text-slate-600">
            <span>Days Completed: {daysCompleted}</span>
            <span>Remaining: {32 - daysCompleted}</span>
            <span>Total: ₦{totalContribution.toLocaleString()}</span>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-xs font-black uppercase text-emerald-800 mb-2">Savings History</h3>
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Completed but Uncollected</p>
          {uncollected.length === 0 ? <p className="text-xs text-slate-400 mb-3">None.</p> : (
            <table className="w-full text-left text-[11px] mb-3">
              <thead><tr className="text-slate-500 font-bold border-b"><th className="p-1.5">Month</th><th className="p-1.5">Total Saved</th><th className="p-1.5">Completion Date</th><th className="p-1.5">Status</th></tr></thead>
              <tbody className="divide-y">
                {uncollected.map(u => (
                  <tr key={u.id}>
                    <td className="p-1.5">{u.month_label}</td>
                    <td className="p-1.5 font-bold">₦{u.total_amount.toLocaleString()}</td>
                    <td className="p-1.5">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-1.5 capitalize">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Collected Savings</p>
          {collected.length === 0 ? <p className="text-xs text-slate-400">None.</p> : (
            <table className="w-full text-left text-[11px]">
              <thead><tr className="text-slate-500 font-bold border-b"><th className="p-1.5">Month</th><th className="p-1.5">Total Saved</th><th className="p-1.5">Collection Date</th><th className="p-1.5">Amount Collected</th></tr></thead>
              <tbody className="divide-y">
                {collected.map(c => (
                  <tr key={c.id}>
                    <td className="p-1.5">{c.month_label}</td>
                    <td className="p-1.5">₦{c.total_amount.toLocaleString()}</td>
                    <td className="p-1.5">{new Date(c.approved_at).toLocaleDateString()}</td>
                    <td className="p-1.5 font-bold">₦{c.payout_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 className="text-xs font-black uppercase text-emerald-800 mb-2">Loan Information</h3>
          {loadingLoan ? (
            <p className="text-xs text-slate-400">Loading...</p>
          ) : !loanRecord || customer.loan_status === 'No Loan' ? (
            <p className="text-xs text-slate-500 font-semibold">This customer has no active loan.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div><p className="text-slate-500 font-bold">Status</p><p className="font-bold">{loanRecord.status}</p></div>
              <div><p className="text-slate-500 font-bold">Loan Amount</p><p className="font-bold">₦{loanRecord.loan_amount.toLocaleString()}</p></div>
              <div><p className="text-slate-500 font-bold">Outstanding</p><p className="font-bold">₦{loanRecord.outstanding_balance.toLocaleString()}</p></div>
              <div><p className="text-slate-500 font-bold">Issued</p><p className="font-bold">{loanRecord.date_issued ? new Date(loanRecord.date_issued).toLocaleDateString() : '—'}</p></div>
              <div><p className="text-slate-500 font-bold">Due Date</p><p className="font-bold">{loanRecord.due_date ? new Date(loanRecord.due_date).toLocaleDateString() : '—'}</p></div>
              <div><p className="text-slate-500 font-bold">Installments</p><p className="font-bold">{loanRecord.installments ?? '—'}</p></div>
              <div><p className="text-slate-500 font-bold">Repaid</p><p className="font-bold">₦{loanRecord.amount_repaid.toLocaleString()}</p></div>
              <div><p className="text-slate-500 font-bold">Remaining</p><p className="font-bold">₦{loanRecord.amount_remaining.toLocaleString()}</p></div>
            </div>
          )}
        </section>

        {viewingDay && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setViewingDay(null)}>
            <div className="bg-white rounded-2xl p-5 max-w-xs w-full" onClick={e => e.stopPropagation()}>
              <h4 className="text-sm font-black text-emerald-955 mb-3">Day {viewingDay.day_number} Payment</h4>
              <div className="space-y-1.5 text-xs">
                <p><span className="text-slate-500 font-bold">Date:</span> {new Date(viewingDay.date).toLocaleDateString()}</p>
                <p><span className="text-slate-500 font-bold">Time:</span> {viewingDayTx?.created_at ? new Date(viewingDayTx.created_at).toLocaleTimeString() : '—'}</p>
                <p><span className="text-slate-500 font-bold">Amount:</span> ₦{viewingDay.amount.toLocaleString()}</p>
                <p><span className="text-slate-500 font-bold">Staff:</span> {staffLookup(viewingDayTx?.staff_id)}</p>
              </div>
              <button type="button" onClick={() => setViewingDay(null)} className="mt-4 w-full bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TrackingHistoryCard = ({ entry }: { entry: TrackingHistoryEntry }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-slate-50/60 transition"
      >
        <div>
          <p className="text-xs font-black text-slate-800">{entry.month_label}</p>
          <p className="text-[11px] font-semibold text-slate-500">
            {entry.total_days}/32 days • ₦{entry.total_amount.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrackingStatusBadge status={entry.status} />
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-50 bg-slate-50/40 px-3.5 py-3 text-[11px] font-semibold text-slate-600 space-y-1">
          <p>Cycle period: <span className="font-bold text-slate-800">{entry.period_key || 'N/A'}</span></p>
          <p>Days completed: <span className="font-bold text-slate-800">{entry.total_days} / 32</span></p>
          <p>Amount: <span className="font-bold text-emerald-800">₦{entry.total_amount.toLocaleString()}</span></p>
          <p>Status: <span className="font-bold text-slate-800">{entry.status}</span></p>
          {entry.status === 'Uncollected' && (
            <p className="text-amber-700 pt-1">This month is saved and waiting - request a payout from the tracker tab to collect it.</p>
          )}
          {entry.status === 'Running' && (
            <p className="text-amber-700 pt-1">Still in progress - this will automatically save once it reaches 32 days.</p>
          )}
          {entry.status === 'Collected' && (
            <p className="text-emerald-700 pt-1">Paid out - this cycle is fully settled.</p>
          )}
        </div>
      )}
    </div>
  );
};
const periodLabelFromKey = (periodKey?: string) => {
  if (!periodKey) return 'Unknown period';
  const [y, m] = periodKey.split('-').map(Number);
  if (!y || !m) return periodKey;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[m - 1] || ''} ${y}`.trim();
};

// Reads the first present key from a list of candidate field names - used when
// pulling from tables (like `cycle_archives`) whose exact column names we're
// normalizing defensively rather than assuming.
const pickField = (row: any, keys: string[]) => {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
};

const nigerianBanks = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Keystone Bank', 'Moniepoint',
  'OPay', 'PalmPay', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Union Bank of Nigeria',
  'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank', 'Zenith Bank'
];

type AdminTab = 'overview' | 'customers' | 'branches' | 'staff' | 'payouts' | 'records' | 'transactions' | 'settings' | 'reports' | 'cashsheet' | 'loans';

export interface CashReconciliation {
  id: string;
  folder_name: string;
  record_date: string;
  record_type: 'full_reconciliation' | 'denomination';
  denominations: { denom: number; pieces: number; total: number }[];
  grand_cash_total: number;
  trf_amount: number;
  cash_plus_trf: number;
  today_contribution: number;
  total_expenses: number;
  summary_balance: number;
  account_check: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

const isTransferMethod = (method?: string) => Boolean(method && /transfer/i.test(method));

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatTransactionDateLabel = (value: string) => {
  if (!value) return 'Unknown date';
  const normalizedDate = value.includes('T') ? value.split('T')[0] : value;
  const parsed = new Date(`${normalizedDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const month = parsed.toLocaleDateString('en-US', { month: 'short' });
  const day = parsed.getDate();
  const year = parsed.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

const getWATDateKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(value);

const sumCurrencyValues = (values: number[]) => {
  const cents = values.reduce((total, value) => total + Math.round(Number(value || 0) * 100), 0);
  return cents / 100;
};

// Single source of truth for the loan formula, per business rule:
// Maximum Loan = Daily Contribution x 30, Repayment = Daily Contribution x 32.
// Used identically by both the customer Request Loan flow and the Admin
// Assign Loan flow, so the two methods can never diverge in their math.
const computeLoanEligibility = (dailyAmount: number) => {
  const maxLoan = sumCurrencyValues([dailyAmount * 30]);
  const repaymentAmount = sumCurrencyValues([dailyAmount * 32]);
  const serviceCharge = sumCurrencyValues([repaymentAmount - maxLoan]);
  return { maxLoan, repaymentAmount, serviceCharge };
};

function LiveTransactionCounter({ count, label = 'Live transactions' }: { count: number; label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800 shadow-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
      {label}: <span className="text-emerald-950">{count}</span>
    </div>
  );
}

// Reusable Autocomplete Searchable Customer Select Component
function SearchableCustomerSelect({ 
  customers, 
  selectedId, 
  onSelect, 
  placeholder = "Search customer..." 
}: { 
  customers: Profile[], 
  selectedId: string, 
  onSelect: (id: string) => void,
  placeholder?: string
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selected = customers.find(c => c.id === selectedId);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="relative w-full text-slate-800">
      <div 
        className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selected ? "text-slate-800 font-bold text-xs" : "text-slate-400 text-xs"}>
          {selected ? `${selected.name} (₦${selected.daily_amount.toLocaleString()}/day)` : placeholder}
        </span>
        <span className="text-[9px] text-slate-400">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-emerald-100 rounded-xl shadow-lg p-2 space-y-2">
          <input 
            type="text"
            autoFocus
            placeholder="Type name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-emerald-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-40 overflow-y-auto divide-y divide-emerald-50 text-xs">
            {filtered.map(c => (
              <div 
                key={c.id}
                className="p-2 hover:bg-emerald-50 cursor-pointer"
                onClick={() => {
                  onSelect(c.id);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-[10px] text-slate-505">{c.phone} • ₦{c.daily_amount.toLocaleString()}/day</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-2 text-center text-slate-400">No customers found</div>
            )}
          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

// =========================================================================
// 1. ISOLATED SUBCOMPONENTS
// =========================================================================

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 900);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
          <PiggyBank className="w-14 h-14 text-emerald-955" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-widest">HIREMERCY AJO</h1>
        <p className="text-emerald-300 font-semibold tracking-wider uppercase text-xs">Continuous Daily Target Thrift Tracker</p>
        <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full mt-4" />
      </div>
    </div>
  );
}

function AdminSetupScreen({ onCreate }: { onCreate: (data: any) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    onCreate({ name, email: email || '', phone, password });
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-amber-300 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 text-center">
        <div className="inline-flex p-2 bg-amber-505 rounded-xl mb-2 text-emerald-955">
          <Key className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-amber-400">First-Time Setup</h2>
        <p className="text-xs text-emerald-200 mt-1">Configure your primary master Admin account below</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-4 text-slate-800">
        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Owner / Director Name *</label>
          <input 
            type="text" 
            required
            placeholder="Mercy Paul"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Email Address</label>
          <input 
            type="email"
            placeholder="admin@hiremercy.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Optional. You can register with phone and password only.</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Direct Phone Line *</label>
          <input 
            type="text" 
            required
            placeholder="08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Accepts local formats (e.g. 080...) or international (+234...)</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Secure Password *</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Confirm Password *</label>
          <input 
            type="password" 
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-amber-500 hover:bg-amber-600 text-emerald-955 font-black py-3 rounded-xl transition duration-150 shadow-md mt-4"
        >
          Initialize Administration
        </button>
      </form>
    </div>
  );
}

function LoginScreen({ onLogin, onSwitch }: { onLogin: (phone: string, pass: string) => void, onSwitch: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;
    onLogin(phone.trim(), password);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert('Password reset instructions have been sent to your email.');
      setForgotPasswordMode(false);
    } catch (err: any) {
      alert(`Reset Failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (forgotPasswordMode) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 text-center">
          <h2 className="text-xl font-extrabold">Forgot Password</h2>
          <p className="text-xs text-emerald-200 mt-1">Receive secure reset link to your account email address</p>
        </div>
        <form onSubmit={handleForgotPasswordSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Registered Email Address</label>
            <input 
              type="email" 
              required
              placeholder="e.g. name@domain.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={isResetting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition duration-150 disabled:opacity-50"
          >
            {isResetting ? 'Sending Reset Email...' : 'Request Password Reset Link'}
          </button>
          <div className="text-center">
            <button 
              type="button" 
              onClick={() => setForgotPasswordMode(false)}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 text-center">
        <h2 className="text-2xl font-extrabold">Welcome back to HireMercyAJO</h2>
        <p className="text-xs text-emerald-200 mt-1">Authenticate with your phone number and password to access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6 text-slate-800">
        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Phone Number</label>
          <input 
            type="text" 
            required
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Accepts local formats (e.g. 080...) or international (+234...)</span>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-black uppercase text-emerald-800">Password</label>
            <button 
              type="button" 
              onClick={() => setForgotPasswordMode(true)}
              className="text-[10px] text-emerald-700 font-bold hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-sm pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition duration-150 shadow-md"
        >
          Verify & Sign In
        </button>

        <div className="text-center">
          <p className="text-xs text-slate-505">
            Don't have a Customer profile yet?{' '}
            <button type="button" onClick={onSwitch} className="text-emerald-700 font-bold hover:underline">
              Register as Customer
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

function RegisterScreen({ onBack, onRegister, branches }: { onBack: () => void, onRegister: (data: any) => void, branches: Branch[] }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dailyAmount, setDailyAmount] = useState('1000');
  const [branchId, setBranchId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !password) return;
    if (Number(dailyAmount) < 300) {
      alert("Daily Contribution must be a minimum of ₦300.");
      return;
    }
    onRegister({ name, email: email || '', phone, password, daily_amount: Number(dailyAmount), branch_id: branchId });
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 relative">
        <button onClick={onBack} className="absolute left-4 top-6 text-emerald-200 hover:text-white flex items-center gap-1 text-xs">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mt-4">
          <h2 className="text-2xl font-extrabold">Register Customer</h2>
          <p className="text-xs text-emerald-200 mt-1">Set target daily contribution metrics</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-4 text-slate-800">
        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Full Name *</label>
          <input 
            type="text" 
            required
            placeholder="Chinedu Osei"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Phone Number *</label>
          <input 
            type="text" 
            required
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Accepts local formats (e.g. 080...) or international (+234...)</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Email Address</label>
          <input 
            type="email"
            placeholder="chinedu@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Optional. Phone and password are enough.</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Password *</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Daily Contribution Target (₦) *</label>
          <input 
            type="number" 
            required
            min={300}
            placeholder="Minimum ₦300"
            value={dailyAmount}
            onChange={(e) => setDailyAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm font-semibold"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Acceptable limit: Minimum ₦300 (Please type your plan value)</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Assign Home Branch *</label>
          <select 
            required
            value={branchId} 
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl bg-white text-sm"
          >
            <option value="">-- Choose Branch --</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <button 
          type="submit" 
          className="w-full bg-amber-500 hover:bg-amber-600 text-emerald-955 font-black py-3 rounded-xl transition duration-150 shadow-md mt-6"
        >
          Activate Savings Cycle
        </button>
      </form>
    </div>
  );
}

function Grid32({ trackingDays, dailyAmount }: { trackingDays: MarkedDay[], dailyAmount: number }) {
  const daysTotal = 32;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
        {Array.from({ length: daysTotal }, (_, i) => {
          const dayNum = i + 1;
          const markedInfo = trackingDays.find(item => item.day_number === dayNum);

          return (
            <div 
              key={dayNum}
              className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition duration-300 ${
                markedInfo 
                  ? 'bg-amber-50 border-amber-400 text-amber-955 shadow-sm' 
                  : 'bg-emerald-50/20 border-emerald-100 text-slate-400'
              }`}
            >
              <span className="text-[10px] font-black block mb-1">Day {dayNum}</span>
              {markedInfo ? (
                <div className="w-6 h-6 rounded-full bg-amber-400 text-emerald-955 flex items-center justify-center text-[11px] font-black shadow-inner">
                  ★
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-dashed border-emerald-200 text-emerald-600/60 flex items-center justify-center text-[9px] font-bold">
                  {dayNum}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-emerald-50">
        <div className="flex justify-between items-center text-xs font-bold text-slate-555 mb-1">
          <span>Completion Rate</span>
          <span className="text-emerald-800">{Math.round((trackingDays.length / daysTotal) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${(trackingDays.length / daysTotal) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SupportWidget({ details }: { details: SupportSettings }) {
  const whatsappClean = details.support_whatsapp.replace(/[\s\+]/g, '');

  return (
    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
      <div>
        <h4 className="text-sm font-black text-emerald-955 uppercase tracking-wider">Need Assistance?</h4>
        <p className="text-[10px] text-slate-555 mt-0.5">Contact direct support channels managed by HireMercy administration.</p>
      </div>

      <div className="space-y-2">
        <a 
          href={`tel:${details.support_phone}`}
          className="flex items-center gap-3 p-2.5 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl border border-emerald-100/50 text-xs text-emerald-900 transition duration-150 font-bold"
        >
          <Phone className="w-4 h-4 text-emerald-600" />
          <span>Call: {details.support_phone}</span>
        </a>
        <a 
          href={`https://wa.me/${whatsappClean}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2.5 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl border border-emerald-100/50 text-xs text-emerald-900 transition duration-150 font-bold"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>WhatsApp: Chat Live</span>
        </a>
        <a 
          href={`mailto:${details.support_email}`}
          className="flex items-center gap-3 p-2.5 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl border border-emerald-100/50 text-xs text-emerald-900 transition duration-150 font-bold"
        >
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>Email: Support Inbox</span>
        </a>
      </div>
    </div>
  );
}

function AdvertisementBanner({ details }: { details: SupportSettings }) {
  if (!details.advert_enabled) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 shadow-lg">
      <div className="grid gap-4 p-5 md:grid-cols-[1.3fr_0.7fr] md:items-center">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-950">Featured campaign</span>
          <h3 className="text-lg font-black text-white">{details.advert_title || 'Cartoon characters safely collecting small daily contributions from customers and returning them back to you in bulk!'}</h3>
          <p className="text-sm text-emerald-100">{details.advert_description || 'Join the smart daily savings circle with HireMercyAJO.'}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-emerald-700/60 bg-white/10 p-2">
          {details.advert_video_url ? (
            <video src={details.advert_video_url} className="h-40 w-full rounded-xl object-cover" autoPlay loop muted playsInline />
          ) : details.advert_image_url ? (
            <img src={details.advert_image_url} alt="Advertisement" className="h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl bg-emerald-900/70 text-center text-sm font-bold text-emerald-100">Daily contributions made simple.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. ADMIN DASHBOARD COMPONENT
// =========================================================================

function AdminDashboard({ 
  profiles, branches, transactions, markedDays, supportDetails, payoutRequests, savedMonths, payoutHistory, withdrawalRequests, onApprovePayout, onCreateBranch, onUpdateBranch, onDeleteBranch, onCreateStaff, onUpdateStaff, onDeleteStaff, onRegisterCustomer,
  onDeleteTransaction, onAddTransaction, onUpdateSupport, onDeleteCustomer, onUpdateCustomer, onToggleCustomerActive, onUpdateLoanStatus, onTriggerManualPayout, onApproveTransaction, onApproveWithdrawal, routeTarget, onRouteHandled, onRejectPayout, triggerToast, onResetPasswordToDefault,
  loans, loanRequests, loanHistory, onApproveLoanRequest, onRejectLoanRequest, onAssignLoan
}: { 
  profiles: Profile[], branches: Branch[], transactions: Transaction[], markedDays: Record<string, MarkedDay[]>, supportDetails: SupportSettings, payoutRequests: PayoutRequest[], savedMonths: Record<string, SavedMonth[]>, payoutHistory: PayoutHistoryRecord[], withdrawalRequests: WithdrawalRequest[], onDeleteTransaction: (id: string) => void, onAddTransaction: (cId: string, amt: number, method: any, sId: string) => void, onUpdateSupport: (phone: string, whatsapp: string, email: string, bankName: string, acctNum: string, acctName: string, advertTitle: string, advertDescription: string, advertImageUrl: string, advertEnabled: boolean, advertVideoUrl: string, themeBackgroundColor: string) => void, onApprovePayout: (reqId: string) => void, onCreateBranch: (name: string, address: string) => void, onUpdateBranch: (id: string, name: string, address: string) => void, onDeleteBranch: (id: string) => void, onCreateStaff: (name: string, phone: string, email: string, branchId: string, password: string) => void, onUpdateStaff: (id: string, name: string, phone: string, email: string, branchId: string) => void, onDeleteStaff: (id: string) => void, onRegisterCustomer: (data: any) => void,
  onDeleteCustomer: (id: string) => void, onUpdateCustomer: (id: string, name: string, phone: string, email: string, dailyAmount: number, branchId: string, allowAnytimeChange: boolean) => void, onToggleCustomerActive: (id: string, is_active: boolean) => void, onUpdateLoanStatus: (id: string, loan_status: 'No Loan' | 'Pending Approval' | 'Active Loan' | 'Loan Cleared') => void, onTriggerManualPayout: (customerId: string, method: 'Transfer' | 'Cash', bank: string, acctNum: string, acctName: string) => void, onApproveTransaction: (id: string) => void, onApproveWithdrawal: (id: string, bankName: string, accountNumber: string, accountName: string) => void, routeTarget?: AdminTab | null, onRouteHandled?: () => void, onRejectPayout?: (reqId: string) => void, triggerToast?: (message: string, type?: 'success' | 'error') => void, onResetPasswordToDefault?: (customerId: string) => void,
  loans: Loan[], loanRequests: LoanRequest[], loanHistory: any[], onApproveLoanRequest: (requestId: string) => void, onRejectLoanRequest: (requestId: string, reason: string) => void, onAssignLoan: (customerId: string, approvedAmount: number, remarks: string, disbursementDate: string) => void
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loanSubView, setLoanSubView] = useState<'pending' | 'active' | 'completed' | 'history'>('pending');
  const [showAssignLoanModal, setShowAssignLoanModal] = useState(false);
  const [assignLoanCustomerId, setAssignLoanCustomerId] = useState('');
  const [assignLoanAmount, setAssignLoanAmount] = useState('');
  const [assignLoanRemarks, setAssignLoanRemarks] = useState('');
  const [assignLoanDate, setAssignLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loanHistoryMonthFilter, setLoanHistoryMonthFilter] = useState('');
  const [loanHistoryBranchFilter, setLoanHistoryBranchFilter] = useState('');
  const [loanHistoryStatusFilter, setLoanHistoryStatusFilter] = useState('');
  const [expandedOutstandingCustomerId, setExpandedOutstandingCustomerId] = useState<string | null>(null);

  // --- Cash Balance Sheet state ---
  const [cashSheetView, setCashSheetView] = useState<'entry' | 'archive'>('entry');
  const [cashRecords, setCashRecords] = useState<CashReconciliation[]>([]);
  const [denomRows, setDenomRows] = useState([
    { denom: 1000, pieces: 0 },
    { denom: 500, pieces: 0 },
    { denom: 200, pieces: 0 },
    { denom: 100, pieces: 0 },
    { denom: 50, pieces: 0 },
  ]);
  const [cashSheetDate, setCashSheetDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalExpensesInput, setTotalExpensesInput] = useState('');
  const [cashFolderName, setCashFolderName] = useState(getNigerianMonthName().replace(' Collected', ''));
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const fetchCashRecords = async () => {
    const { data, error } = await supabase.from('cash_reconciliations').select('*').order('created_at', { ascending: false });
    if (!error && data) setCashRecords(data);
  };

  useEffect(() => { fetchCashRecords(); }, []);

  const denomComputed = denomRows.map(r => ({ ...r, total: r.denom * (r.pieces || 0) }));
  const grandCashTotal = denomComputed.reduce((s, r) => s + r.total, 0);

  const trfAmountForDate = useMemo(() => {
    return sumCurrencyValues(
      transactions
        .filter(t => t.status === 'Successful' && t.date === cashSheetDate && isTransferMethod(t.payment_method))
        .map(t => Number(t.amount || 0))
    );
  }, [transactions, cashSheetDate]);

  // Today's Contribution: total of everything customers actually paid in for
  // the selected date (cash + transfer combined), pulled straight from the
  // transaction log - this is the "what should have come in" side of the
  // reconciliation, independent of what was physically counted.
  const todaysContributionForDate = useMemo(() => {
    return sumCurrencyValues(
      transactions
        .filter(t => t.status === 'Successful' && t.date === cashSheetDate)
        .map(t => Number(t.amount || 0))
    );
  }, [transactions, cashSheetDate]);

  const cashPlusTrf = grandCashTotal + trfAmountForDate;
  const totalExpensesNum = Number(totalExpensesInput) || 0;
  // Summary Balance: physically reconciled Cash + TRF, plus expenses, so
  // this balances against total contributions.
  const summaryBalance = cashPlusTrf + totalExpensesNum;
  // Account Check: compares what was reconciled (Summary Balance) against
  // what customers actually contributed (Today's Contribution). Zero means
  // everything is accounted for.
  const accountCheck = summaryBalance - todaysContributionForDate;

  const updateDenomPieces = (denom: number, pieces: string) => {
    setDenomRows(prev => prev.map(r => r.denom === denom ? { ...r, pieces: Number(pieces) || 0 } : r));
  };

  const handleSubmitCashRecord = async () => {
    const payload = {
      folder_name: cashFolderName || getNigerianMonthName().replace(' Collected', ''),
      record_date: cashSheetDate,
      record_type: 'full_reconciliation',
      denominations: denomComputed,
      grand_cash_total: grandCashTotal,
      trf_amount: trfAmountForDate,
      cash_plus_trf: cashPlusTrf,
      today_contribution: todaysContributionForDate,
      total_expenses: totalExpensesNum,
      summary_balance: summaryBalance,
      account_check: accountCheck
    };
    const { error } = await supabase.from('cash_reconciliations').insert([payload]);
    if (error) {
      triggerToast?.(`Failed to save record: ${error.message}`, 'error');
      return;
    }
    triggerToast?.('Cash record submitted and archived!', 'success');
    setDenomRows([
      { denom: 1000, pieces: 0 }, { denom: 500, pieces: 0 }, { denom: 200, pieces: 0 },
      { denom: 100, pieces: 0 }, { denom: 50, pieces: 0 },
    ]);
    setTotalExpensesInput('');
    await fetchCashRecords();
    setCashSheetView('archive');
  };

  // Part 3: standalone "Save Denomination Record" - saves ONLY the date,
  // each denomination's value, and the Grand Total, independent of the full
  // reconciliation flow. Archived under the same Records -> [Month] folder
  // structure, tagged so the archive view can tell the two apart.
  const handleSaveDenominationRecord = async () => {
    const payload = {
      folder_name: cashFolderName || getNigerianMonthName().replace(' Collected', ''),
      record_date: cashSheetDate,
      record_type: 'denomination',
      denominations: denomComputed,
      grand_cash_total: grandCashTotal,
      trf_amount: 0,
      cash_plus_trf: 0,
      today_contribution: 0,
      total_expenses: 0,
      summary_balance: 0,
      account_check: 0
    };
    const { error } = await supabase.from('cash_reconciliations').insert([payload]);
    if (error) {
      triggerToast?.(`Failed to save denomination record: ${error.message}`, 'error');
      return;
    }
    triggerToast?.('Denomination record saved!', 'success');
    await fetchCashRecords();
  };

  const handleRenameFolder = async (recordId: string, newName: string) => {
    await supabase.from('cash_reconciliations').update({ folder_name: newName }).eq('id', recordId);
    setCashRecords(prev => prev.map(r => r.id === recordId ? { ...r, folder_name: newName } : r));
    setEditingFolderId(null);
  };

  const cashFolders = useMemo(() => {
    const grouped: Record<string, CashReconciliation[]> = {};
    cashRecords.forEach(r => {
      const key = r.folder_name || 'Uncategorized';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return Object.entries(grouped).sort((a, b) => (b[1][0]?.created_at || '').localeCompare(a[1][0]?.created_at || ''));
  }, [cashRecords]);

  // --- Report Page: Monthly Financial Summary + Archive ---
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [expandedArchiveMonth, setExpandedArchiveMonth] = useState<string | null>(null);

  const fetchMonthlySummaries = async () => {
    const { data, error } = await supabase.from('monthly_summaries').select('*').order('period_key', { ascending: false });
    if (!error && data) setMonthlySummaries(data);
  };

  useEffect(() => { fetchMonthlySummaries(); }, []);

  // Computes the 4 base metrics for any given period_key ('YYYY-MM') from
  // real data already loaded - used both for the live current-month display
  // and for archiving a month that just ended.
  // Moved here (was previously declared much later in the component) because
  // computeMonthMetrics below references it and is called synchronously
  // during render, before the old declaration's line would have run -
  // that's exactly what caused "Cannot access 'customers' before
  // initialization".
  const customers = profiles.filter(p => p.role === 'Customer').sort((a, b) => a.name.localeCompare(b.name));

  const computeMonthMetrics = (periodKey: string) => {
    const [y, m] = periodKey.split('-').map(Number);
    const contributions = sumCurrencyValues(
      transactions.filter(t => {
        if (!t.date || t.status !== 'Successful') return false;
        const [ty, tm] = t.date.split('-').map(Number);
        return ty === y && tm === m;
      }).map(t => Number(t.amount || 0))
    );
    const profit = sumCurrencyValues(
      customers
        .filter(c => c.is_active && transactions.some(tx => {
          if (tx.customer_id !== c.id || tx.status !== 'Successful' || !tx.date) return false;
          const [ty, tm] = tx.date.split('-').map(Number);
          return ty === y && tm === m;
        }))
        .map(c => c.daily_amount)
    );
    const expenses = sumCurrencyValues(
      cashRecords.filter(r => {
        if (!r.record_date) return false;
        const [ry, rm] = r.record_date.split('-').map(Number);
        return ry === y && rm === m;
      }).map(r => Number(r.total_expenses || 0))
    );
    const payout = sumCurrencyValues(
      payoutHistory.filter(p => {
        if (!p.approved_at) return false;
        const [py, pm] = p.approved_at.split('-').map(Number);
        return py === y && pm === m;
      }).map(p => Number(p.payout_amount || 0))
    );
    return { contributions, profit, expenses, payout, remaining: contributions - payout };
  };

  const currentPeriodKey = getCurrentPeriodKey();
  const liveMonth = computeMonthMetrics(currentPeriodKey);
  // Part 5: Monthly Payout card - a DIFFERENT metric from the "Total Monthly
  // Payout" above (which is real money actually paid out via approved
  // payouts). This one is the formula explicitly requested: what's left of
  // contributions after profit is set aside.
  const monthlyPayoutCard = liveMonth.contributions - liveMonth.profit;

  // Auto-archive: if the calendar month immediately before this one has real
  // transaction data but hasn't been archived yet, archive it now. This is
  // what makes "when a new month begins, the previous month automatically
  // archives" actually happen - checked once when the Report tab is viewed.
  useEffect(() => {
    (async () => {
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevPeriodKey = prevDate.toISOString().slice(0, 7);

      const alreadyArchived = monthlySummaries.some(s => s.period_key === prevPeriodKey);
      if (alreadyArchived) return;

      const hasData = transactions.some(t => t.date && t.date.startsWith(prevPeriodKey));
      if (!hasData) return;

      const metrics = computeMonthMetrics(prevPeriodKey);
      const { error } = await supabase.from('monthly_summaries').insert([{
        month_label: periodLabelFromKey(prevPeriodKey),
        period_key: prevPeriodKey,
        total_contributions: metrics.contributions,
        total_profit: metrics.profit,
        total_expenses: metrics.expenses,
        total_payout: metrics.payout,
        remaining_balance: metrics.remaining
      }]);
      if (!error) await fetchMonthlySummaries();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlySummaries.length, transactions.length]);

  // --- Quick Notepad (mini-spreadsheet scratchpad) ---
  const [notepadRows, setNotepadRows] = useState<{ description: string; amount: string; date: string }[]>([
    { description: '', amount: '', date: '' }
  ]);
  const [notepadLoaded, setNotepadLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('system_settings').select('notepad_data').limit(1).single();
      if (data?.notepad_data && Array.isArray(data.notepad_data) && data.notepad_data.length > 0) {
        setNotepadRows(data.notepad_data);
      }
      setNotepadLoaded(true);
    })();
  }, []);

  const saveNotepad = async (rows: typeof notepadRows) => {
    await supabase.from('system_settings').update({ notepad_data: rows }).neq('id', '00000000-0000-0000-0000-000000000000');
  };

  const updateNotepadCell = (idx: number, field: 'description' | 'amount' | 'date', value: string) => {
    setNotepadRows(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      saveNotepad(next);
      return next;
    });
  };

  const addNotepadRow = () => {
    setNotepadRows(prev => {
      const next = [...prev, { description: '', amount: '', date: '' }];
      saveNotepad(next);
      return next;
    });
  };

  // --- Admin-to-Customer Messaging ---
  const [noteCustomerId, setNoteCustomerId] = useState('');
  const [noteText, setNoteText] = useState('');

  // When a customer is selected, load their existing note (if any) into the
  // textarea so the admin is editing the current note, not overwriting blind.
  const handleSelectNoteCustomer = (id: string) => {
    setNoteCustomerId(id);
    const target = profiles.find(p => p.id === id);
    setNoteText(target?.admin_note || '');
  };

  const handleSendCustomerNote = async () => {
    if (!noteCustomerId) return;
    const { error } = await supabase.from('profiles').update({ admin_note: noteText }).eq('id', noteCustomerId);
    if (error) {
      triggerToast?.(`Failed to send note: ${error.message}`, 'error');
      return;
    }
    triggerToast?.('Note sent to customer.', 'success');
    setNoteText('');
    setNoteCustomerId('');
  };

  // Deleting clears admin_note entirely - since the customer dashboard only
  // renders the note when it's non-empty, this makes it disappear from their
  // view immediately on their next fetch/realtime update.
  const handleDeleteCustomerNote = async () => {
    if (!noteCustomerId) return;
    const { error } = await supabase.from('profiles').update({ admin_note: null }).eq('id', noteCustomerId);
    if (error) {
      triggerToast?.(`Failed to delete note: ${error.message}`, 'error');
      return;
    }
    triggerToast?.('Note deleted from customer dashboard.', 'success');
    setNoteText('');
    setNoteCustomerId('');
  };

  // FEATURE 1 (Admin): customers who have at least one fully-frozen, still
  // uncollected 32-day cycle - anyone with zero uncollected months is
  // omitted entirely, per spec.
  const outstandingPayoutCustomers = useMemo(() => {
    return Object.entries(savedMonths)
      .map(([customerId, months]) => {
        const uncollected = months.filter(m => m.status === 'saved' || m.status === 'requested');
        const customerProfile = profiles.find(p => p.id === customerId);
        return {
          customerId,
          customerName: customerProfile?.name || uncollected[0]?.customer_name || 'Customer',
          uncollectedMonths: uncollected,
          totalOutstanding: sumCurrencyValues(uncollected.map(m => m.total_amount))
        };
      })
      .filter(row => row.uncollectedMonths.length > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [savedMonths, profiles]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Cash');

  // Filter and Editing states
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [selectedLoanStatusFilter, setSelectedLoanStatusFilter] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [viewingCustomerDetails, setViewingCustomerDetails] = useState<Profile | null>(null);
  const [customerDetailsDateFilter, setCustomerDetailsDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customerDetailsCustomFrom, setCustomerDetailsCustomFrom] = useState('');
  const [customerDetailsCustomTo, setCustomerDetailsCustomTo] = useState('');
  const [viewingDayDetail, setViewingDayDetail] = useState<MarkedDay | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);

  // Manual Payout states
  const [manualPayoutCustomerId, setManualPayoutCustomerId] = useState('');
  const [manualPayoutMethod, setManualPayoutMethod] = useState<'Transfer' | 'Cash'>('Transfer');
  const [manualBankName, setManualBankName] = useState('');
  const [manualAccountNumber, setManualAccountNumber] = useState('');
  const [manualAccountName, setManualAccountName] = useState('');

  // Today's Contribution Drilldown State
  const [showTodayDrilldown, setShowTodayDrilldown] = useState(false);
  const [showCollectionDrilldown, setShowCollectionDrilldown] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Administrative Addition & Edit States
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffBranch, setStaffBranch] = useState('');
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  
  // Custom Staff Creation password control
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Customer registration state inside admin panel
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custDailyAmount, setCustDailyAmount] = useState('1000');
  const [custBranch, setCustBranch] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [showCustPass, setShowCustPass] = useState(false);

  // Support details state variables managed by Admin
  const [supportPhone, setSupportPhone] = useState(supportDetails.support_phone);
  const [supportWhatsapp, setSupportWhatsapp] = useState(supportDetails.support_whatsapp);
  const [supportEmail, setSupportEmail] = useState(supportDetails.support_email);
  const [adminBankName, setAdminBankName] = useState(supportDetails.admin_bank_name || 'Access Bank');
  const [adminAccountNumber, setAdminAccountNumber] = useState(supportDetails.admin_account_number || '0123456789');
  const [adminAccountName, setAdminAccountName] = useState(supportDetails.admin_account_name || 'HireMercy Thrift Enterprises');
  const [advertTitle, setAdvertTitle] = useState(supportDetails.advert_title || 'Cartoon characters safely collecting small daily contributions from customers and returning them back to you in bulk!');
  const [advertDescription, setAdvertDescription] = useState(supportDetails.advert_description || 'Join the smart daily savings circle with HireMercyAJO.');
  const [advertImageUrl, setAdvertImageUrl] = useState(supportDetails.advert_image_url || '');
  const [advertVideoUrl, setAdvertVideoUrl] = useState(supportDetails.advert_video_url || '');
  const [advertEnabled, setAdvertEnabled] = useState(Boolean(supportDetails.advert_enabled));
  const [themeBackgroundColor, setThemeBackgroundColor] = useState(supportDetails.theme_background_color || '#f0fdf4');
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState<WithdrawalRequest | null>(null);
  const [approvalBankName, setApprovalBankName] = useState('');
  const [approvalAccountNumber, setApprovalAccountNumber] = useState('');
  const [approvalAccountName, setApprovalAccountName] = useState('');

  useEffect(() => {
    setSupportPhone(supportDetails.support_phone);
    setSupportWhatsapp(supportDetails.support_whatsapp);
    setSupportEmail(supportDetails.support_email);
    setAdminBankName(supportDetails.admin_bank_name || 'Access Bank');
    setAdminAccountNumber(supportDetails.admin_account_number || '0123456789');
    setAdminAccountName(supportDetails.admin_account_name || 'HireMercy Thrift Enterprises');
    setAdvertTitle(supportDetails.advert_title || 'Cartoon characters safely collecting small daily contributions from customers and returning them back to you in bulk!');
    setAdvertDescription(supportDetails.advert_description || 'Join the smart daily savings circle with HireMercyAJO.');
    setAdvertImageUrl(supportDetails.advert_image_url || '');
    setAdvertVideoUrl(supportDetails.advert_video_url || '');
    setAdvertEnabled(Boolean(supportDetails.advert_enabled));
    setThemeBackgroundColor(supportDetails.theme_background_color || '#f0fdf4');
  }, [supportDetails]);

  useEffect(() => {
    if (routeTarget) {
      setActiveTab(routeTarget);
      onRouteHandled?.();
    }
  }, [routeTarget, onRouteHandled]);

  // (customers is now declared earlier, right before computeMonthMetrics, since
  // that function references it and was being called before this line ran)
  const staff = profiles.filter(p => p.role === 'Staff').sort((a, b) => a.name.localeCompare(b.name));

  const filteredCustomers = useMemo(() => {
    const query = customerSearchQuery.trim().toLowerCase();
    return customers.filter(c => {
      if (selectedBranchFilter !== '' && c.branch_id !== selectedBranchFilter) return false;
      if (selectedLoanStatusFilter !== '' && c.loan_status !== selectedLoanStatusFilter) return false;
      if (query === '') return true;
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    });
  }, [customers, selectedBranchFilter, selectedLoanStatusFilter, customerSearchQuery]);

  const stats = useMemo(() => {
    // Current West Africa Time (WAT) Month metrics
    const watToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); // YYYY-MM-DD
    const [curYear, curMonth] = watToday.split('-').map(Number); // WAT Year and Month (1-based index)

    const monthlyTransactions = transactions.filter(t => {
      if (!t.date || t.status !== 'Successful') return false;
      const [tYear, tMonth] = t.date.split('-').map(Number);
      return tYear === curYear && tMonth === curMonth;
    });

    const monthlyCollection = monthlyTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Calculate WAT Today's Contribution
    const todayTransactions = transactions.filter(t => {
      if (!t.date || t.status !== 'Successful') return false;
      return t.date === watToday;
    });
    const todayCollected = todayTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return {
      monthlyCollection,
      monthlyTransactions,
      todayCollected,
      todayTransactions,
      totalCustomers: customers.length,
      totalStaff: staff.length,
    };
  }, [transactions, customers, staff]);

  // Group monthly contributions by branch and payment method
  const monthlyDrilldownData = useMemo(() => {
    const branchTotals: Record<string, number> = {};
    const methodTotals: Record<string, number> = { 'Cash': 0, 'Bank Transfer': 0, 'Mobile Money': 0 };

    branches.forEach(b => {
      branchTotals[b.id] = 0;
    });
    branchTotals['unknown'] = 0;

    stats.monthlyTransactions.forEach(t => {
      const bId = t.branch_id || 'unknown';
      branchTotals[bId] = (branchTotals[bId] || 0) + Number(t.amount || 0);
      methodTotals[t.payment_method] = (methodTotals[t.payment_method] || 0) + Number(t.amount || 0);
    });

    return { branchTotals, methodTotals };
  }, [stats.monthlyTransactions, branches]);

  // Group today's contributions by branch and payment method
  const todayDrilldownData = useMemo(() => {
    const branchTotals: Record<string, number> = {};
    const methodTotals: Record<string, number> = { 'Cash': 0, 'Bank Transfer': 0, 'Mobile Money': 0 };

    branches.forEach(b => {
      branchTotals[b.id] = 0;
    });
    branchTotals['unknown'] = 0;

    stats.todayTransactions.forEach(t => {
      const bId = t.branch_id || 'unknown';
      branchTotals[bId] = (branchTotals[bId] || 0) + Number(t.amount || 0);
      methodTotals[t.payment_method] = (methodTotals[t.payment_method] || 0) + Number(t.amount || 0);
    });

    return { branchTotals, methodTotals };
  }, [stats.todayTransactions, branches]);

  // Record Sheet filters: yet to withdraw vs. paid out
  const recordSheet = useMemo(() => {
    const approvedPayoutCustomerIds = payoutRequests.filter(p => p.status === 'Successful').map(p => p.customer_id);
    
    const activeSaversYetToWithdraw = customers.filter(c => {
      const marked = markedDays[c.id] || [];
      return marked.length > 0 && !approvedPayoutCustomerIds.includes(c.id);
    });

    const completedPayouts = payoutRequests.filter(p => p.status === 'Successful');

    return {
      yetToWithdraw: activeSaversYetToWithdraw,
      completedPayouts
    };
  }, [customers, markedDays, payoutRequests]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !depositAmount) return;
    onAddTransaction(selectedCustomerId, Number(depositAmount), paymentMethod, 'admin-id');
    setDepositAmount('');
  };

  const handleSupportSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSupport(supportPhone, supportWhatsapp, supportEmail, adminBankName, adminAccountNumber, adminAccountName, advertTitle, advertDescription, advertImageUrl, advertEnabled, advertVideoUrl, themeBackgroundColor);
  };

  const openWithdrawalApproval = (request: WithdrawalRequest) => {
    setSelectedWithdrawalRequest(request);
    setApprovalBankName(request.bank_name);
    setApprovalAccountNumber(request.account_number);
    setApprovalAccountName(request.account_name);
  };

  const handleApproveWithdrawalRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawalRequest) return;
    onApproveWithdrawal(selectedWithdrawalRequest.id, approvalBankName, approvalAccountNumber, approvalAccountName);
    setSelectedWithdrawalRequest(null);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) return;
    onCreateBranch(branchName, branchAddress);
    setBranchName('');
    setBranchAddress('');
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffPhone || !staffBranch || !staffPassword) return;
    onCreateStaff(staffName, staffPhone, staffEmail, staffBranch, staffPassword);
    setStaffName('');
    setStaffPhone('');
    setStaffEmail('');
    setStaffBranch('');
    setStaffPassword('');
  };

  const handleAdminRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !custBranch || !custPassword) return;
    if (Number(custDailyAmount) < 300) {
      alert("Daily Contribution must be at least ₦300.");
      return;
    }
    onRegisterCustomer({
      name: custName,
      phone: custPhone,
      email: custEmail || `${custPhone}@hiremercy.com`,
      password: custPassword,
      daily_amount: Number(custDailyAmount),
      branch_id: custBranch
    });
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustPassword('');
    setCustBranch('');
  };

  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    onUpdateBranch(editingBranch.id, editingBranch.name, editingBranch.address || '');
    setEditingBranch(null);
  };

  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    onUpdateStaff(editingStaff.id, editingStaff.name, editingStaff.phone, editingStaff.email || '', editingStaff.branch_id || '');
    setEditingStaff(null);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (editingCustomer.daily_amount < 300) {
      alert("Daily Contribution must be at least ₦300.");
      return;
    }
    onUpdateCustomer(
      editingCustomer.id,
      editingCustomer.name,
      editingCustomer.phone,
      editingCustomer.email || '',
      editingCustomer.daily_amount,
      editingCustomer.branch_id || '',
      editingCustomer.allow_anytime_change || false
    );
    setEditingCustomer(null);
  };

  const handleTriggerManualPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayoutCustomerId) return;
    if (manualPayoutMethod === 'Transfer' && (!manualBankName || !manualAccountNumber || !manualAccountName)) return;
    onTriggerManualPayout(manualPayoutCustomerId, manualPayoutMethod, manualBankName, manualAccountNumber, manualAccountName);
    setManualPayoutCustomerId('');
    setManualPayoutMethod('Transfer');
    setManualBankName('');
    setManualAccountNumber('');
    setManualAccountName('');
  };

  const handleSendResetLink = async (email?: string) => {
    if (!email) {
      alert('Email not configured for this user.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert(`Instructions successfully dispatched to ${email}`);
    } catch (err: any) {
      alert(`Failed to send link: ${err.message}`);
    }
  };

  // Preview calculation for the Trigger Manual Payout form/button. Must stay
  // in sync with handleTriggerManualPayout's actual logic below - if these
  // two diverge, the submit button can end up disabled even when the
  // handler itself would succeed (or vice versa). Admin can pay out at any
  // time: if there are no fully-completed uncollected months, this falls
  // back to previewing a payout of the customer's current running cycle.
  // Customer self-service payout requests are untouched by this - they
  // still only ever draw from fully-completed, frozen months.
  const manualPayoutCalculation = useMemo(() => {
    if (!manualPayoutCustomerId) return null;
    const target = customers.find(c => c.id === manualPayoutCustomerId);
    if (!target) return null;
    const uncollectedMonths = (savedMonths[manualPayoutCustomerId] || []).filter(
      m => m.status === 'saved' || m.status === 'requested'
    );
    const runningDays = markedDays[manualPayoutCustomerId] || [];
    const isPartialPayout = uncollectedMonths.length === 0 && runningDays.length > 0;
    if (uncollectedMonths.length === 0 && runningDays.length === 0) return null;

    const totalAmount = isPartialPayout
      ? sumCurrencyValues(runningDays.map(d => d.amount))
      : sumCurrencyValues(uncollectedMonths.map(m => m.total_amount));
    const feeCount = isPartialPayout ? 1 : uncollectedMonths.length;
    const payoutAmount = Math.max(0, totalAmount - feeCount * target.daily_amount);
    return {
      uncollectedMonths,
      totalDays: isPartialPayout ? runningDays.length : uncollectedMonths.reduce((s, m) => s + m.total_days, 0),
      totalAmount,
      payoutAmount,
      target,
      isPartialPayout
    };
  }, [manualPayoutCustomerId, savedMonths, customers]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'Pending');
  }, [transactions]);

  const successfulTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'Successful');
  }, [transactions]);

  const transactionAnalysis = useMemo(() => {
    const cashTransactions = successfulTransactions.filter(t => !isTransferMethod(t.payment_method));
    const transferTransactions = successfulTransactions.filter(t => isTransferMethod(t.payment_method));
    const cashCustomers = new Set(cashTransactions.map(t => t.customer_id));
    const transferCustomers = new Set(transferTransactions.map(t => t.customer_id));
    const allCustomers = new Set([...cashCustomers, ...transferCustomers]);

    return {
      cashCustomerCount: cashCustomers.size,
      transferCustomerCount: transferCustomers.size,
      grandCustomerCount: allCustomers.size,
      cashTotal: sumCurrencyValues(cashTransactions.map(t => Number(t.amount || 0))),
      transferTotal: sumCurrencyValues(transferTransactions.map(t => Number(t.amount || 0))),
      grandTotal: sumCurrencyValues([...cashTransactions, ...transferTransactions].map(t => Number(t.amount || 0))),
    };
  }, [successfulTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    successfulTransactions.forEach(tx => {
      const key = tx.date || 'Unknown date';
      const existing = groups.get(key) || [];
      existing.push(tx);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [successfulTransactions]);

  // FEATURE 2: Per-day-group metrics for the ledger header - itemized
  // Transfer / Cash / Total breakdown of both count and monetary volume,
  // computed once per date group rather than re-deriving it inline in JSX.
  const getDayGroupMetrics = (entries: Transaction[]) => {
    let transferAmount = 0, transferCount = 0, cashAmount = 0, cashCount = 0;
    entries.forEach(tx => {
      const amt = Number(tx.amount || 0);
      if (isTransferMethod(tx.payment_method)) {
        transferAmount += amt;
        transferCount += 1;
      } else {
        cashAmount += amt;
        cashCount += 1;
      }
    });
    return {
      transferAmount,
      transferCount,
      cashAmount,
      cashCount,
      totalAmount: transferAmount + cashAmount,
      totalCount: transferCount + cashCount
    };
  };

  const branchBreakdown = useMemo(() => {
    const branchMetrics = branches.reduce((acc, branch) => {
      acc[branch.id] = {
        name: branch.name,
        transferTotal: 0,
        cashTotal: 0,
        transferCount: 0,
        cashCount: 0,
      };
      return acc;
    }, {} as Record<string, { name: string; transferTotal: number; cashTotal: number; transferCount: number; cashCount: number }>);

    successfulTransactions.forEach(tx => {
      const branchId = tx.branch_id || 'unknown';
      if (!branchMetrics[branchId]) {
        branchMetrics[branchId] = {
          name: branches.find(b => b.id === branchId)?.name || 'Unassigned',
          transferTotal: 0,
          cashTotal: 0,
          transferCount: 0,
          cashCount: 0,
        };
      }
      if (isTransferMethod(tx.payment_method)) {
        branchMetrics[branchId].transferTotal += Number(tx.amount || 0);
        branchMetrics[branchId].transferCount += 1;
      } else {
        branchMetrics[branchId].cashTotal += Number(tx.amount || 0);
        branchMetrics[branchId].cashCount += 1;
      }
    });

    return branchMetrics;
  }, [branches, successfulTransactions]);

  const openDeleteConfirmation = (tx: Transaction) => setDeleteTarget(tx);
  const confirmDelete = () => {
    if (deleteTarget) {
      onDeleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-955 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-700" />
            Admin Command Centre
          </h2>
          <p className="text-xs text-slate-555">Global oversight of savings collections, active balances, and auditing logs</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowAnalysisModal(true)}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-950 shadow-sm transition hover:bg-amber-400"
          >
            Analysis
          </button>
          <LiveTransactionCounter count={successfulTransactions.filter(tx => tx.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) && tx.status === 'Successful').length} label="Today's work" />
          {(['overview', 'customers', 'branches', 'staff', 'payouts', 'records', 'transactions', 'cashsheet', 'loans', 'settings', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition ${
                activeTab === tab 
                  ? 'bg-emerald-700 text-white shadow-md' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {tab === 'cashsheet' ? 'Cash Sheet' : tab === 'loans' ? 'Loan Management' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Clickable Total Cycle Collection (Monthly Resetting Card) */}
        <button 
          onClick={() => setShowCollectionDrilldown(true)}
          className="bg-white p-6 rounded-3xl border-2 border-emerald-200 hover:border-emerald-300 text-left transition duration-150 flex items-center gap-4 focus:outline-none w-full animate-fade-in text-slate-855"
        >
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-555 uppercase font-black">Monthly Cycle Collection</p>
            <p className="text-xl font-black text-slate-900">₦{stats.monthlyCollection.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-800 font-bold underline mt-0.5">Click for details & reset history</p>
          </div>
        </button>

        {/* Today's Contribution Card (Clickable) */}
        <button 
          onClick={() => setShowTodayDrilldown(true)}
          className="bg-white p-6 rounded-3xl border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/20 text-left transition duration-150 flex items-center gap-4 focus:outline-none w-full text-slate-855"
        >
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl animate-pulse">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-amber-800 uppercase font-black flex items-center gap-1">
              Today's Contribution
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </p>
            <p className="text-xl font-black text-slate-900">₦{stats.todayCollected.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-800 font-bold underline mt-0.5">Click to view breakdown</p>
          </div>
        </button>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-505 uppercase font-black">Registered Customers</p>
            <p className="text-xl font-black text-slate-900">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-605 rounded-2xl">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-505 uppercase font-black">Authorized Field Agents</p>
            <p className="text-xl font-black text-slate-900">{stats.totalStaff}</p>
          </div>
        </div>
      </div>

      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-emerald-50 pb-3">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-emerald-955">Transaction analytics</h3>
                <p className="text-xs text-slate-500">Snapshot of customer reach and cash flow for the current successful set.</p>
              </div>
              <button type="button" onClick={() => setShowAnalysisModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-emerald-800">Customer analytics</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Cash customers</span><span className="font-black">{transactionAnalysis.cashCustomerCount}</span></div>
                  <div className="flex justify-between"><span>Transfer customers</span><span className="font-black">{transactionAnalysis.transferCustomerCount}</span></div>
                  <div className="flex justify-between border-t border-emerald-100 pt-2 font-black text-emerald-900"><span>Grand total</span><span>{transactionAnalysis.grandCustomerCount}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-amber-50/40 p-4">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-amber-800">Financial analytics</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Cash total</span><span className="font-black">{formatCurrency(transactionAnalysis.cashTotal)}</span></div>
                  <div className="flex justify-between"><span>Transfer total</span><span className="font-black">{formatCurrency(transactionAnalysis.transferTotal)}</span></div>
                  <div className="flex justify-between border-t border-amber-100 pt-2 font-black text-emerald-900"><span>Grand total</span><span>{formatCurrency(transactionAnalysis.grandTotal)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-wider text-emerald-955">Delete transaction?</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="mt-4 rounded-2xl bg-amber-50/60 p-3 text-sm text-slate-700">
              <p className="font-black text-emerald-900">{deleteTarget.customer_name || 'Customer'}</p>
              <p>₦{Number(deleteTarget.amount || 0).toLocaleString()} • {deleteTarget.payment_method}</p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cycle Collection Drilldown Modal */}
      {showCollectionDrilldown && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-emerald-100 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-emerald-50 pb-3">
              <h3 className="text-lg font-black text-emerald-955 uppercase tracking-wider flex items-center gap-2">
                <Landmark className="w-6 h-6 text-emerald-700" />
                Monthly Cycle breakdown
              </h3>
              <button 
                type="button"
                onClick={() => setShowCollectionDrilldown(false)}
                className="p-1 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-emerald-900 mb-2 uppercase tracking-wide">Sum by Branches (Current Month)</h4>
                <div className="space-y-2">
                  {branches.map(b => (
                    <div key={b.id} className="flex justify-between p-2.5 bg-emerald-50/20 rounded-xl">
                      <span className="font-semibold text-slate-800">{b.name}</span>
                      <span className="font-bold text-slate-900">₦{(monthlyDrilldownData.branchTotals[b.id] || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-555">Unassigned Branch</span>
                    <span className="font-bold text-slate-900">₦{(monthlyDrilldownData.branchTotals['unknown'] || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-emerald-900 mb-2 uppercase tracking-wide">Sum by Payment Channel (Current Month)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(monthlyDrilldownData.methodTotals).map(method => (
                    <div key={method} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                      <p className="text-[10px] text-slate-555 font-bold">{method}</p>
                      <p className="font-black text-slate-900 mt-1">₦{monthlyDrilldownData.methodTotals[method].toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-50 pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-555 font-bold">Total Collection Current Month:</span>
              <span className="text-lg font-black text-emerald-800">₦{stats.monthlyCollection.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Today's Contribution Drilldown Modal */}
      {showTodayDrilldown && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-emerald-100 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-emerald-50 pb-3">
              <h3 className="text-lg font-black text-emerald-955 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-505" />
                Today's Breakdown ({new Date().toLocaleDateString()})
              </h3>
              <button 
                type="button"
                onClick={() => setShowTodayDrilldown(false)}
                className="p-1 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-emerald-900 mb-2 uppercase tracking-wide">Today's Contribution Breakdown</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {['Road7 Branch', 'Ife-City Branch'].map(branchName => {
                    const branchKey = Object.keys(branchBreakdown).find(key => branchBreakdown[key].name === branchName);
                    const metrics = branchKey ? branchBreakdown[branchKey] : { name: branchName, transferTotal: 0, cashTotal: 0, transferCount: 0, cashCount: 0 };
                    return (
                      <div key={branchName} className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3">
                        <p className="font-black text-emerald-900">{metrics.name}</p>
                        <div className="mt-2 grid gap-2 text-[10px] text-slate-600">
                          <div className="flex justify-between"><span>Transfer total</span><span className="font-black text-slate-800">₦{metrics.transferTotal.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Cash total</span><span className="font-black text-slate-800">₦{metrics.cashTotal.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Transfer customers</span><span className="font-black text-slate-800">{metrics.transferCount}</span></div>
                          <div className="flex justify-between"><span>Cash customers</span><span className="font-black text-slate-800">{metrics.cashCount}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-emerald-900 mb-2 uppercase tracking-wide">Sum by Payment Channel</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(todayDrilldownData.methodTotals).map(method => (
                    <div key={method} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                      <p className="text-[10px] text-slate-505 font-bold">{method}</p>
                      <p className="font-black text-slate-900 mt-1">₦{todayDrilldownData.methodTotals[method].toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-50 pt-4 flex justify-between items-center">
              <span className="text-xs text-slate-505 font-bold">Total Collection Today:</span>
              <span className="text-lg font-black text-emerald-800">₦{stats.todayCollected.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider font-bold">Post Contribution</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Select Customer *</label>
                <SearchableCustomerSelect 
                  customers={customers} 
                  selectedId={selectedCustomerId} 
                  onSelect={setSelectedCustomerId} 
                  placeholder="Type name or phone to choose account..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Deposit Amount (₦)</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Payment Channel</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Post & Auto-Split
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Saver Preview</h3>
            
            {selectedCustomerId ? (
              (() => {
                const cust = customers.find(c => c.id === selectedCustomerId);
                if (!cust) return <p className="text-xs text-slate-400">Select a customer to view their tracking grid.</p>;
                return (
                  <div className="p-6 bg-emerald-50/20 border-2 border-emerald-200 rounded-2xl space-y-4 animate-fade-in text-slate-800 font-bold">
                    <div className="flex justify-between items-start flex-wrap gap-3">
                      <div className="space-y-1">
                        <h4 className="font-bold text-emerald-955 text-base">{cust.name}</h4>
                        <p className="text-[11px] text-slate-550 font-bold">Contact: {cust.phone}</p>
                        <p className="text-[11px] text-slate-550 font-bold">Target Plan: ₦{cust.daily_amount.toLocaleString()}/day</p>
                        <p className="text-[11px] text-slate-550 font-bold">
                          Balance/Amount: ₦{((markedDays[cust.id] || []).reduce((s, d) => s + d.amount, 0)).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-550 font-bold">
                          Month: {periodLabelFromKey((markedDays[cust.id]?.[0] as any)?.period_key || getCurrentPeriodKey())}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Progress</span>
                        <span className="text-[10px] bg-amber-500 text-emerald-955 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          {(markedDays[cust.id] || []).length} / 32 Days Marked
                        </span>
                      </div>
                    </div>
                    <Grid32 trackingDays={markedDays[cust.id] || []} dailyAmount={cust.daily_amount} />
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 bg-emerald-50/10 border border-dashed border-emerald-200 rounded-2xl">
                <p className="text-xs text-slate-400 px-4">Please select a customer in the search bar above or click one below to preview their 32-day tracking grid:</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto p-2">
                  {customers.slice().map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-5 h-5 text-emerald-700" />
              Register Customer Profile
            </h3>
            
            <form onSubmit={handleAdminRegisterCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Phone Line *</label>
                <input 
                  type="text" 
                  required
                  placeholder="080XXXXXXXX"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="chinedu@domain.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Password *</label>
                <div className="relative">
                  <input 
                    type={showCustPass ? 'text' : 'password'} 
                    required
                    placeholder="••••••••"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs pr-8"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCustPass(!showCustPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showCustPass ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Daily Contribution (₦) *</label>
                <input 
                  type="number" 
                  required
                  min={300}
                  placeholder="Minimum ₦300"
                  value={custDailyAmount}
                  onChange={(e) => setCustDailyAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-semibold"
                />
                <span className="text-[9px] text-slate-400 block mt-1">Acceptable limit: Minimum ₦300/day</span>
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Assign Home Branch *</label>
                <select 
                  required
                  value={custBranch} 
                  onChange={(e) => setCustBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs"
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm shadow-md font-bold uppercase text-xs">
                Register Customer Account
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 h-fit">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 text-slate-800">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Customer Directory</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-emerald-800">Filter Branch:</span>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-emerald-200 rounded-lg bg-white font-bold"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <span className="text-[10px] font-black uppercase text-emerald-800">Loan Status:</span>
                <select
                  value={selectedLoanStatusFilter}
                  onChange={(e) => setSelectedLoanStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-emerald-200 rounded-lg bg-white font-bold"
                >
                  <option value="">All</option>
                  <option value="No Loan">No Loan</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Active Loan">Active Loan</option>
                  <option value="Loan Cleared">Loan Repaid</option>
                </select>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or customer ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-emerald-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm font-bold">No customer found.</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone number</th>
                    <th className="p-3">Daily Target</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Loan Status</th>
                    <th className="p-3">Marked count</th>
                    <th className="p-3 text-right">Consolidated contribution</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {filteredCustomers.map(c => {
                    const marked = markedDays[c.id] || [];
                    const totalContributed = marked.reduce((sum, item) => sum + item.amount, 0);
                    return (
                      <tr key={c.id} className="hover:bg-emerald-50/20 transition text-slate-800">
                        <td className="p-3 font-bold">
                          <button
                            type="button"
                            onClick={() => setViewingCustomerDetails(c)}
                            className="text-emerald-800 hover:text-emerald-950 hover:underline text-left"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-slate-655">{c.phone}</td>
                        <td className="p-3 font-bold">₦{c.daily_amount.toLocaleString()}</td>
                        <td className="p-3">
                          <button 
                            type="button"
                            onClick={() => onToggleCustomerActive(c.id, !c.is_active)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase transition ${
                              c.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title="Click to toggle active status"
                          >
                            {c.is_active ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="p-3">
                          <LoanStatusBadge status={c.loan_status} />
                        </td>
                        <td className="p-3">
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                            {marked.length} / 32
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-800">₦{totalContributed.toLocaleString()}</td>
                        <td className="p-3 text-right flex justify-end items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleSendResetLink(c.email)}
                            className="p-1.5 text-slate-655 hover:bg-slate-50 rounded-lg transition"
                            title="Send Password Reset Email Link"
                          >
                            <Key className="w-4 h-4 text-emerald-700" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onResetPasswordToDefault?.(c.id)}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="Reset password directly to 123456 (no email needed)"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingCustomer(c)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Customer Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteCustomer(c.id)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete Customer Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Editing Customer Dialog Modal */}
      {viewingCustomerDetails && (
        <CustomerDetailsModal
          customer={customers.find(c => c.id === viewingCustomerDetails.id) || viewingCustomerDetails}
          branches={branches}
          profiles={profiles}
          markedDays={markedDays}
          savedMonths={savedMonths}
          payoutHistory={payoutHistory}
          dateFilter={customerDetailsDateFilter}
          setDateFilter={setCustomerDetailsDateFilter}
          customFrom={customerDetailsCustomFrom}
          setCustomFrom={setCustomerDetailsCustomFrom}
          customTo={customerDetailsCustomTo}
          setCustomTo={setCustomerDetailsCustomTo}
          viewingDay={viewingDayDetail}
          setViewingDay={setViewingDayDetail}
          onClose={() => { setViewingCustomerDetails(null); setViewingDayDetail(null); }}
        />
      )}

      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditCustomer} className="bg-white rounded-3xl max-w-md w-full p-6 border border-emerald-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-50 pb-3">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Edit Customer Profile</h3>
              <button 
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Phone Number *</label>
                <input 
                  type="text" 
                  required
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Daily Contribution (₦) *</label>
                <input 
                  type="number" 
                  required
                  min={300}
                  placeholder="Minimum ₦300"
                  value={editingCustomer.daily_amount.toString()}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, daily_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Assign Home Branch *</label>
                <select 
                  required
                  value={editingCustomer.branch_id || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white"
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox"
                  id="allowAnytime"
                  checked={editingCustomer.allow_anytime_change || false}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, allow_anytime_change: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-555 border-emerald-300"
                />
                <label htmlFor="allowAnytime" className="text-xs font-bold text-emerald-900 select-none">
                  Grant Client Permission to Change Amount Anytime
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">
                Save Changes
              </button>
              <button type="button" onClick={() => setEditingCustomer(null)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs border border-slate-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branch Management (With Editing & Deletion) */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Building2 className="w-5 h-5 text-emerald-700" />
              {editingBranch ? 'Edit Branch' : 'Register Branch'}
            </h3>
            <form onSubmit={editingBranch ? handleSaveEditBranch : handleAddBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Branch Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ikeja Mainland Centre"
                  value={editingBranch ? editingBranch.name : branchName}
                  onChange={(e) => editingBranch ? setEditingBranch({ ...editingBranch, name: e.target.value }) : setBranchName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Branch Location Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 42 Allen Avenue, Lagos"
                  value={editingBranch ? (editingBranch.address || '') : branchAddress}
                  onChange={(e) => editingBranch ? setEditingBranch({ ...editingBranch, address: e.target.value }) : setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">
                  {editingBranch ? 'Save Details' : 'Add Branch'}
                </button>
                {editingBranch && (
                  <button type="button" onClick={() => setEditingBranch(null)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs border border-slate-300">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider">Active Branches</h3>
            <div className="overflow-x-auto text-slate-800 font-medium">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                    <th className="p-3">Branch Name</th>
                    <th className="p-3">Location Address</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400">No branches registered yet.</td>
                    </tr>
                  ) : (
                    branches.slice().sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                      <tr key={b.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 font-bold">{b.name}</td>
                        <td className="p-3 text-slate-600">{b.address || 'N/A'}</td>
                        <td className="p-3 text-right flex justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => setEditingBranch(b)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Branch"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteBranch(b.id)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete Branch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <UserPlus className="w-5 h-5 text-emerald-700" />
              {editingStaff ? 'Edit Staff Member' : 'Onboard Staff'}
            </h3>
            <form onSubmit={editingStaff ? handleSaveEditStaff : handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Staff Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Bello"
                  value={editingStaff ? editingStaff.name : staffName}
                  onChange={(e) => editingStaff ? setEditingStaff({ ...editingStaff, name: e.target.value }) : setStaffName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Staff Phone Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="080XXXXXXXX"
                  value={editingStaff ? editingStaff.phone : staffPhone}
                  onChange={(e) => editingStaff ? setEditingStaff({ ...editingStaff, phone: e.target.value }) : setStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Staff Email *</label>
                <input 
                  type="email" 
                  required
                  placeholder="john@hiremercy.com"
                  value={editingStaff ? (editingStaff.email || '') : staffEmail}
                  onChange={(e) => editingStaff ? setEditingStaff({ ...editingStaff, email: e.target.value }) : setStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>
              
              {!editingStaff && (
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Staff Login Password *</label>
                  <div className="relative">
                    <input 
                      type={showStaffPassword ? 'text' : 'password'} 
                      required
                      placeholder="••••••••"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-emerald-200 rounded-xl text-xs pr-8"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">Assign Home Branch *</label>
                <select 
                  required
                  value={editingStaff ? (editingStaff.branch_id || '') : staffBranch}
                  onChange={(e) => editingStaff ? setEditingStaff({ ...editingStaff, branch_id: e.target.value }) : setStaffBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">
                  {editingStaff ? 'Save Changes' : 'Register Agent'}
                </button>
                {editingStaff && (
                  <button type="button" onClick={() => setEditingStaff(null)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs border border-slate-300">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider">Field Staff Directory</h3>
            <div className="overflow-x-auto text-slate-800 font-medium">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Phone Line</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Assigned Branch</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">No field agents onboarded yet.</td>
                    </tr>
                  ) : (
                    staff.slice().map(s => (
                      <tr key={s.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 font-bold">{s.name}</td>
                        <td className="p-3 font-semibold">{s.phone}</td>
                        <td className="p-3 text-slate-555">{s.email || 'N/A'}</td>
                        <td className="p-3 text-emerald-800 font-bold">
                          {branches.find(b => b.id === s.branch_id)?.name || 'N/A'}
                        </td>
                        <td className="p-3 text-right flex justify-end items-center gap-1.5 font-bold">
                          <button 
                            type="button"
                            onClick={() => handleSendResetLink(s.email)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Send Password Reset Email Link"
                          >
                            <Key className="w-4 h-4 text-emerald-700" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingStaff(s)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Staff Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteStaff(s.id)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payouts Control with Manual Triggers */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 animate-fade-in text-slate-800 font-bold">
          {/* FEATURE 1 (Admin): Outstanding Payout Ledger */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider mb-1 font-bold">Outstanding Payout Ledger</h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Customers with at least one fully-frozen, uncollected 32-day cycle. Click a name to see exactly which months.</p>
            {outstandingPayoutCustomers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 p-4 text-center text-slate-400">No customers currently have an uncollected saved month.</div>
            ) : (
              <div className="space-y-2">
                {outstandingPayoutCustomers.map(row => {
                  const isOpen = expandedOutstandingCustomerId === row.customerId;
                  return (
                    <div key={row.customerId} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedOutstandingCustomerId(isOpen ? null : row.customerId)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 bg-slate-50/60 hover:bg-slate-100/60 transition text-left"
                      >
                        <span className="text-xs font-black text-slate-800">{row.customerName}</span>
                        <span className="flex items-center gap-2 text-[11px]">
                          <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 font-black">
                            {row.uncollectedMonths.length} uncollected
                          </span>
                          <span className="font-black text-emerald-800">₦{row.totalOutstanding.toLocaleString()}</span>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-slate-50 bg-white">
                          {row.uncollectedMonths.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-3 text-xs">
                              <span className="font-bold text-slate-700">{m.month_label}</span>
                              <span className="font-black text-emerald-800">₦{m.total_amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trigger manual payout form */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
              <h3 className="text-md font-black text-emerald-955 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <Coins className="w-5 h-5 text-emerald-700" />
                Trigger Manual Payout
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">Archives this customer's uncollected saved month(s) to payout history. If none are fully completed yet, pays out their current running cycle instead and clears it.</p>

              <form onSubmit={handleTriggerManualPayoutSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Select Customer</label>
                  <SearchableCustomerSelect 
                    customers={customers} 
                    selectedId={manualPayoutCustomerId} 
                    onSelect={setManualPayoutCustomerId} 
                    placeholder="Search active account..."
                  />
                </div>

                {manualPayoutCustomerId && !manualPayoutCalculation && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-3 text-[10px] text-slate-400">
                    This customer has no contributions to pay out right now.
                  </div>
                )}

                {manualPayoutCalculation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[10px] text-amber-900 space-y-1 font-semibold leading-relaxed">
                    {manualPayoutCalculation.isPartialPayout ? (
                      <p>Early Payout - Running Cycle: {manualPayoutCalculation.totalDays} day(s) marked so far</p>
                    ) : (
                      <p>Uncollected Months: {manualPayoutCalculation.uncollectedMonths.length} ({manualPayoutCalculation.totalDays} days total)</p>
                    )}
                    <p>Saved Accumulation: ₦{manualPayoutCalculation.totalAmount.toLocaleString()}</p>
                    <p>Company Fee ({manualPayoutCalculation.isPartialPayout ? 1 : manualPayoutCalculation.uncollectedMonths.length} × 1 Day): - ₦{((manualPayoutCalculation.isPartialPayout ? 1 : manualPayoutCalculation.uncollectedMonths.length) * manualPayoutCalculation.target.daily_amount).toLocaleString()}</p>
                    <p className="text-emerald-800 border-t border-amber-200 pt-1 font-black">
                      Expected Payout: ₦{manualPayoutCalculation.payoutAmount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Payout Method</label>
                  <div className="flex gap-2">
                    {(['Transfer', 'Cash'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setManualPayoutMethod(m)}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition ${
                          manualPayoutMethod === m ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {manualPayoutMethod === 'Transfer' && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Bank Name *</label>
                      <select 
                        required
                        value={manualBankName}
                        onChange={(e) => setManualBankName(e.target.value)}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white"
                      >
                        <option value="">-- Choose Recipient Bank --</option>
                        {nigerianBanks.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Account Number *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 0123456789"
                        maxLength={10}
                        value={manualAccountNumber}
                        onChange={(e) => setManualAccountNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Account Name *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. John Doe"
                        value={manualAccountName}
                        onChange={(e) => setManualAccountName(e.target.value)}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit"
                  disabled={!manualPayoutCalculation || manualPayoutCalculation.payoutAmount === 0}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition shadow-md"
                >
                  {manualPayoutMethod === 'Cash' ? 'Pay Out in Cash' : 'Archive & Pay Out Uncollected Months'}
                </button>
              </form>
            </div>

            {/* Pending payout requests - awaiting admin approval */}
            <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Pending Payout Requests</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  {payoutRequests.filter(p => p.status === 'Pending').length} awaiting approval
                </span>
              </div>
              {payoutRequests.filter(p => p.status === 'Pending').length === 0 ? (
                <p className="text-xs text-slate-400 font-medium p-2">No payout requests are currently pending.</p>
              ) : (
                <div className="space-y-2">
                  {payoutRequests.filter(p => p.status === 'Pending').map(h => (
                    <div key={h.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-2xl border border-amber-100 bg-amber-50/40">
                      <div className="text-xs">
                        <p className="font-black text-slate-800">{h.customer_name || 'Customer'} <span className="text-slate-400 font-semibold">• {h.month_paid || 'Saved month'}</span></p>
                        <p className="text-slate-500 font-semibold">{h.payout_method === 'Cash' ? 'Cash Payment' : `${h.bank_name} • ${h.account_number} (${h.account_name})`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-800 text-sm">₦{h.payout_amount.toLocaleString()}</span>
                        <button 
                          type="button"
                          onClick={() => onRejectPayout?.(h.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] whitespace-nowrap"
                        >
                          Reject
                        </button>
                        <button 
                          type="button"
                          onClick={() => onApprovePayout(h.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] whitespace-nowrap"
                        >
                          Approve & Payout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Payout logs table */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Customer Withdrawal Logs</h3>
                <p className="text-xs text-slate-505 font-medium">1-day company fee is deducted automatically when calculating the payout amount.</p>
              </div>
              <div className="overflow-x-auto text-slate-800 font-semibold">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                      <th className="p-3">Date Requested</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Bank Details</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Accrued Sum</th>
                      <th className="p-3 text-emerald-800">Payout (Accrued - 1 Day Fee)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {payoutRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 font-medium">No previous payout logs.</td>
                      </tr>
                    ) : (
                      payoutRequests.slice().sort((a, b) => a.customer_name?.localeCompare(b.customer_name || '') || 0).map(h => (
                        <tr key={h.id}>
                          <td className="p-3 text-slate-505">
                            {new Date(h.created_at).toLocaleDateString()}
                            <span className="block text-[9px] text-slate-400">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            {h.customer_name || 'System Customer'}
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            {h.payout_method === 'Cash' ? (
                              <strong className="block text-slate-700 font-bold">Cash Payment</strong>
                            ) : (
                              <>
                                <strong className="block text-slate-700 font-bold">{h.account_name}</strong>
                                {h.bank_name} • {h.account_number}
                              </>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-emerald-800">{h.month_paid || 'N/A'}</td>
                          <td className="p-3">₦{h.amount.toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-800">₦{h.payout_amount.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] ${
                              h.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {h.status === 'Successful' ? 'Successful' : h.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {h.status === 'Pending' && (
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => onRejectPayout?.(h.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] whitespace-nowrap"
                                >
                                  Reject
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => onApprovePayout(h.id)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] whitespace-nowrap"
                                >
                                  Approve & Payout
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payout History Archive - records moved off the active ledger on approval */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  Payout History Archive
                </h3>
                <p className="text-xs text-slate-505 font-medium">Settled saved-month records that have been removed from the active contributions ledger.</p>
              </div>
              <div className="overflow-x-auto text-slate-800 font-semibold">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                      <th className="p-3">Approved</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Month</th>
                      <th className="p-3">Total Saved</th>
                      <th className="p-3 text-emerald-800">Payout</th>
                      <th className="p-3">Bank Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {payoutHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 font-medium">No archived payouts yet.</td>
                      </tr>
                    ) : (
                      payoutHistory.slice(0, 25).map(h => (
                        <tr key={h.id}>
                          <td className="p-3 text-slate-505">{new Date(h.approved_at).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-slate-700">{h.customer_name || 'Customer'}</td>
                          <td className="p-3 font-semibold text-emerald-800">{h.month_label}</td>
                          <td className="p-3">₦{h.total_amount.toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-800">₦{h.payout_amount.toLocaleString()}</td>
                          <td className="p-3 font-medium text-slate-700">{h.payout_method === 'Cash' ? 'Cash Payment' : `${h.bank_name} • ${h.account_number}`}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Balance Sheet */}
      {activeTab === 'cashsheet' && (
        <div className="space-y-6 animate-fade-in text-slate-800 font-bold">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCashSheetView('entry')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${cashSheetView === 'entry' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}
            >
              New Entry
            </button>
            <button
              type="button"
              onClick={() => setCashSheetView('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${cashSheetView === 'archive' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}
            >
              Records Dashboard ({cashRecords.length})
            </button>
          </div>

          {cashSheetView === 'entry' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Denomination Calculator */}
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Denomination Calculator</h3>
                  <input
                    type="date"
                    value={cashSheetDate}
                    onChange={e => setCashSheetDate(e.target.value)}
                    className="border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-900 font-black">
                      <th className="p-2 text-left rounded-l-xl">CASH</th>
                      <th className="p-2 text-left">PIECES</th>
                      <th className="p-2 text-right rounded-r-xl">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {denomComputed.map(row => (
                      <tr key={row.denom}>
                        <td className="p-2 font-black text-slate-700">₦{row.denom.toLocaleString()}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            value={row.pieces || ''}
                            onChange={e => updateDenomPieces(row.denom, e.target.value)}
                            className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-800">₦{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-955">
                      <td className="p-2.5 font-black text-white uppercase tracking-wider text-xs rounded-l-xl" colSpan={2}>Grand Total</td>
                      <td className="p-2.5 text-right font-black text-white text-sm rounded-r-xl">₦{grandCashTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Grand Total section - reads directly from denomComputed/
                    grandCashTotal, which already recompute on every keystroke
                    via updateDenomPieces, so this stays in sync automatically
                    with no additional wiring. Uses bg-emerald-900 (a real
                    Tailwind shade) rather than bg-emerald-955 used in the
                    table row above, since that class isn't a standard shade
                    and may not render depending on the Tailwind config. */}
                <div className="bg-emerald-900 text-white rounded-2xl p-4">
                  <p className="text-[10px] uppercase font-black tracking-wider text-emerald-200 mb-1.5">Grand Total</p>
                  {grandCashTotal === 0 ? (
                    <p className="text-2xl sm:text-3xl font-black">₦0</p>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold text-emerald-100 space-y-0.5 mb-1.5">
                        {denomComputed.filter(r => r.pieces > 0).map(r => (
                          <p key={r.denom}>₦{r.denom.toLocaleString()} × {r.pieces} = ₦{r.total.toLocaleString()}</p>
                        ))}
                      </div>
                      <p className="text-2xl sm:text-3xl font-black">= ₦{grandCashTotal.toLocaleString()}</p>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveDenominationRecord}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-emerald-955 font-black py-2.5 rounded-xl text-xs transition shadow-md"
                >
                  Save Denomination Record
                </button>
              </div>

              {/* Reconciliation Summary */}
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Reconciliation Summary</h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <span className="font-bold text-slate-600">TRF (auto, for {cashSheetDate})</span>
                    <span className="font-black text-emerald-800">₦{trfAmountForDate.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="font-bold text-amber-800">CASH + TRF</span>
                    <span className="font-black text-amber-900">₦{cashPlusTrf.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <span className="font-bold text-slate-600">Today's Contribution (auto, for {cashSheetDate})</span>
                    <span className="font-black text-slate-800">₦{todaysContributionForDate.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Total Expenses</label>
                    <input
                      type="number"
                      value={totalExpensesInput}
                      onChange={e => setTotalExpensesInput(e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
                    <span className="font-bold text-emerald-700">Summary Balance (Cash+TRF+Expenses)</span>
                    <span className="font-black text-emerald-900">₦{summaryBalance.toLocaleString()}</span>
                  </div>

                  <div className={`flex items-center justify-between rounded-xl p-3 border ${
                    accountCheck === 0 ? 'bg-emerald-50 border-emerald-300' :
                    accountCheck < 0 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'
                  }`}>
                    <span className={`font-black ${
                      accountCheck === 0 ? 'text-emerald-700' : accountCheck < 0 ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {accountCheck === 0 ? '🟢 ACCOUNT BALANCED' : 'Account Check'}
                    </span>
                    {accountCheck !== 0 && (
                      <span className={`font-black ${accountCheck < 0 ? 'text-red-800' : 'text-orange-800'}`}>
                        {accountCheck < 0 ? '-' : '+'}₦{Math.abs(accountCheck).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Archive Folder</label>
                    <input
                      type="text"
                      value={cashFolderName}
                      onChange={e => setCashFolderName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitCashRecord}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition shadow-md"
                >
                  Submit Record
                </button>
              </div>
            </div>
          )}

          {cashSheetView === 'archive' && (
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider mb-4 font-bold">Records Dashboard</h3>
              {cashFolders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-emerald-200 rounded-2xl text-slate-400 text-xs">No cash records archived yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cashFolders.map(([folderName, records]) => (
                    <div key={folderName} className="border border-emerald-100 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {editingFolderId === records[0].id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={e => setEditingFolderName(e.target.value)}
                              className="flex-1 border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold"
                              autoFocus
                            />
                            <button type="button" onClick={() => handleRenameFolder(records[0].id, editingFolderName)} className="text-emerald-700"><CheckCircle2 className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {folderName}</span>
                            <button
                              type="button"
                              onClick={() => { setEditingFolderId(records[0].id); setEditingFolderName(folderName); }}
                              className="text-slate-400 hover:text-emerald-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold">{records.length} entr{records.length === 1 ? 'y' : 'ies'}</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {records.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-[11px] bg-slate-50 rounded-lg p-2">
                            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                              {r.record_date}
                              {r.record_type === 'denomination' && (
                                <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Denomination</span>
                              )}
                            </span>
                            <span className="font-black text-emerald-800">₦{r.grand_cash_total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Record Sheet */}
      {activeTab === 'records' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in space-y-6">
          <div>
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <FileText className="w-5 h-5 text-emerald-700" />
              Settlement Records Sheet
            </h3>
            <p className="text-xs text-slate-505 font-medium">View active contributors who are yet to withdraw and completed cycles.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-extrabold text-amber-800 text-xs uppercase mb-3 flex items-center gap-1 font-bold">
                <Clock className="w-4 h-4" />
                Active Savers (Yet to Withdraw this Cycle)
              </h4>
              <div className="overflow-x-auto border border-emerald-100 rounded-2xl">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-amber-50 text-amber-900 font-extrabold border-b border-amber-200">
                      <th className="p-3">Customer</th>
                      <th className="p-3">Pace</th>
                      <th className="p-3">Days Marked</th>
                      <th className="p-3 text-right">Active Balance</th>
                      <th className="p-3 text-right">Uncollected Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 bg-white text-slate-800 font-semibold">
                    {recordSheet.yetToWithdraw.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400 font-medium">No active savers yet.</td>
                      </tr>
                    ) : (
                      recordSheet.yetToWithdraw.map(c => {
                        const markedCount = (markedDays[c.id] || []).length;
                        const balance = markedCount * c.daily_amount;
                        const uncollectedTotal = sumCurrencyValues(
                          (savedMonths[c.id] || [])
                            .filter(m => m.status === 'saved' || m.status === 'requested')
                            .map(m => m.total_amount)
                        );
                        return (
                          <tr key={c.id}>
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3">₦{c.daily_amount.toLocaleString()}/day</td>
                            <td className="p-3">{markedCount} / 32</td>
                            <td className="p-3 text-right font-bold text-emerald-800">₦{balance.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-slate-700">
                              {uncollectedTotal > 0 ? `₦${uncollectedTotal.toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-emerald-900 text-xs uppercase mb-3 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Settled Savers (Paid Out Logs)
              </h4>
              <div className="overflow-x-auto border border-emerald-100 rounded-2xl font-semibold">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-900 font-extrabold border-b border-emerald-200">
                      <th className="p-3">Customer</th>
                      <th className="p-3">Cleared Period</th>
                      <th className="p-3">Cleared Sum</th>
                      <th className="p-3 font-semibold text-emerald-800">Payout Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 bg-white text-slate-800">
                    {recordSheet.completedPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400 font-medium">No previous payouts completed.</td>
                      </tr>
                    ) : (
                      recordSheet.completedPayouts.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-bold">{p.customer_name}</td>
                          <td className="p-3 font-extrabold text-amber-800 text-[10px]">{p.month_paid || 'N/A'}</td>
                          <td className="p-3 font-medium">₦{p.amount.toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-800">₦{p.payout_amount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Pending Deposits Queue */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in text-slate-800">
            <h3 className="text-md font-black text-amber-805 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-bold font-bold">
              <Clock className="w-5 h-5 text-amber-800" />
              Pending Contributions Approval Queue ({pendingTransactions.length})
            </h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Customers submitted these manual deposits. Click Approve to split metrics and mark their tracking cards.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-50/50 text-amber-900 font-extrabold border-b border-amber-200">
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Submitted Amount</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 bg-amber-50/10 font-medium">
                  {pendingTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">No pending submissions awaiting approval.</td>
                    </tr>
                  ) : (
                    pendingTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-amber-50/30 transition text-slate-800">
                        <td className="p-3 text-slate-505">{tx.date}</td>
                        <td className="p-3 font-bold">
                          {profiles.find(p => p.id === tx.customer_id)?.name || tx.customer_name || 'System User'}
                        </td>
                        <td className="p-3 font-medium text-slate-600">{tx.payment_method}</td>
                        <td className="p-3 font-black text-emerald-805">₦{tx.amount.toLocaleString()}</td>
                        <td className="p-3 text-right flex justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => onApproveTransaction(tx.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] uppercase font-bold"
                          >
                            Approve & Confirm
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] uppercase font-bold"
                          >
                            Decline
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger of completed transactions */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-2 uppercase tracking-wider font-bold">Completed Transaction Ledger</h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Deleting a confirmed log reverses split allocations, unmarking days directly on tracking grids.</p>
            <div className="space-y-3">
              {successfulTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 p-4 text-center text-slate-400">No completed contributions posted yet.</div>
              ) : (
                groupedTransactions.map(([dateKey, entries]) => {
                  const isExpanded = expandedDates[dateKey] ?? true;
                  const dayMetrics = getDayGroupMetrics(entries);
                  return (
                    <div key={dateKey} className="overflow-hidden rounded-2xl border border-emerald-100">
                      <button
                        type="button"
                        onClick={() => toggleDateGroup(dateKey)}
                        className="flex w-full items-center justify-between gap-3 bg-emerald-50/60 px-4 py-3 text-left text-sm font-black text-emerald-900"
                      >
                        <span className="whitespace-nowrap">{formatTransactionDateLabel(dateKey)}</span>
                        <span className="flex flex-1 items-center justify-end gap-2 overflow-x-auto text-[10px] font-bold text-emerald-800 sm:text-[11px]">
                          <span className="whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5">
                            Transfer: ₦{dayMetrics.transferAmount.toLocaleString()} (tx: {dayMetrics.transferCount})
                          </span>
                          <span className="whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5">
                            Cash: ₦{dayMetrics.cashAmount.toLocaleString()} (tx: {dayMetrics.cashCount})
                          </span>
                          <span className="whitespace-nowrap rounded-full bg-emerald-900 px-2 py-0.5 text-white">
                            Total: ₦{dayMetrics.totalAmount.toLocaleString()} (tx: {dayMetrics.totalCount})
                          </span>
                          {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="overflow-x-auto bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                                <th className="p-3">Customer</th>
                                <th className="p-3">Payment Method</th>
                                <th className="p-3">Posted Amount</th>
                                <th className="p-3">Auto-split metrics</th>
                                <th className="p-3 text-right">Reverse</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50">
                              {entries.map(tx => (
                                <tr key={tx.id} className="hover:bg-emerald-50/20 transition">
                                  <td className="p-3 font-bold text-slate-800">
                                    {profiles.find(p => p.id === tx.customer_id)?.name || tx.customer_name || 'System User'}
                                  </td>
                                  <td className="p-3 font-medium text-slate-605">{tx.payment_method}</td>
                                  <td className="p-3 font-bold text-emerald-800">₦{Number(tx.amount || 0).toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className="bg-amber-100 text-amber-955 font-black px-2.5 py-0.5 rounded">
                                      Days {tx.start_day} - {tx.end_day} ({tx.days_covered} days marked)
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button 
                                      type="button"
                                      onClick={() => openDeleteConfirmation(tx)}
                                      className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition duration-150"
                                      title="Delete and reverse auto-split"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loan Management tab */}
      {activeTab === 'loans' && (() => {
        const pendingRequests = loanRequests.filter(r => r.status === 'Pending Approval');
        const activeLoans = loans.filter(l => l.status === 'Active Loan');
        const completedLoans = loans.filter(l => l.status === 'Loan Cleared');
        const lookupCustomer = (id: string) => profiles.find(p => p.id === id);
        const lookupBranch = (customerId: string) => branches.find(b => b.id === lookupCustomer(customerId)?.branch_id)?.name || '—';

        const filteredHistory = loanHistory.filter((h: any) => {
          if (loanHistoryStatusFilter !== '' && h.event_type !== loanHistoryStatusFilter) return false;
          if (loanHistoryBranchFilter !== '' && lookupCustomer(h.customer_id)?.branch_id !== loanHistoryBranchFilter) return false;
          if (loanHistoryMonthFilter !== '') {
            const d = new Date(h.created_at);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (ym !== loanHistoryMonthFilter) return false;
          }
          return true;
        });

        const assignTarget = assignLoanCustomerId ? lookupCustomer(assignLoanCustomerId) : null;
        const assignEligibility = assignTarget ? computeLoanEligibility(assignTarget.daily_amount) : null;
        const assignMarked = assignTarget ? (markedDays[assignTarget.id] || []) : [];
        const assignSavingsTotal = assignMarked.reduce((s, d) => s + d.amount, 0);
        const assignBlocked = assignTarget && (assignTarget.loan_status === 'Active Loan' || assignTarget.loan_status === 'Pending Approval');
        const assignAmountNum = Number(assignLoanAmount || 0);
        const assignRepayment = assignEligibility ? sumCurrencyValues([assignAmountNum + assignEligibility.serviceCharge]) : 0;

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex gap-2">
                {(['pending', 'active', 'completed', 'history'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLoanSubView(v)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition ${loanSubView === v ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                  >
                    {v === 'pending' ? `Pending Requests (${pendingRequests.length})` : v === 'active' ? `Active Loans (${activeLoans.length})` : v === 'completed' ? `Completed Loans (${completedLoans.length})` : 'Loan History'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setShowAssignLoanModal(true); setAssignLoanCustomerId(''); setAssignLoanAmount(''); setAssignLoanRemarks(''); setAssignLoanDate(new Date().toISOString().slice(0, 10)); }}
                className="bg-amber-500 hover:bg-amber-600 text-emerald-955 font-black px-4 py-2 rounded-xl text-xs uppercase"
              >
                Assign Loan
              </button>
            </div>

            {loanSubView === 'pending' && (
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm overflow-x-auto">
                {pendingRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No pending loan requests.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500 font-bold border-b"><th className="p-2">Customer</th><th className="p-2">Phone</th><th className="p-2">Branch</th><th className="p-2">Daily</th><th className="p-2">Loan Amount</th><th className="p-2">Repayment</th><th className="p-2">Requested</th><th className="p-2 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y">
                      {pendingRequests.map(r => {
                        const c = lookupCustomer(r.customer_id);
                        return (
                          <tr key={r.id}>
                            <td className="p-2 font-bold">{c?.name || '—'}</td>
                            <td className="p-2">{c?.phone || '—'}</td>
                            <td className="p-2">{lookupBranch(r.customer_id)}</td>
                            <td className="p-2">₦{r.daily_amount_snapshot.toLocaleString()}</td>
                            <td className="p-2 font-bold">₦{r.loan_amount.toLocaleString()}</td>
                            <td className="p-2">₦{r.repayment_amount.toLocaleString()}</td>
                            <td className="p-2">{new Date(r.requested_at).toLocaleDateString()}</td>
                            <td className="p-2 text-right space-x-1.5 whitespace-nowrap">
                              <button type="button" onClick={() => onApproveLoanRequest(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase">Approve</button>
                              <button type="button" onClick={() => { setRejectingRequestId(r.id); setRejectionReason(''); }} className="bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase">Reject</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {loanSubView === 'active' && (
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm overflow-x-auto">
                {activeLoans.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No active loans.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500 font-bold border-b"><th className="p-2">Customer</th><th className="p-2">Loan</th><th className="p-2">Repayment</th><th className="p-2">Paid</th><th className="p-2">Remaining</th><th className="p-2">Days</th><th className="p-2">Start</th><th className="p-2">Remaining Days</th></tr></thead>
                    <tbody className="divide-y">
                      {activeLoans.map(l => (
                        <tr key={l.id}>
                          <td className="p-2 font-bold">{lookupCustomer(l.customer_id)?.name || '—'}</td>
                          <td className="p-2">₦{l.loan_amount.toLocaleString()}</td>
                          <td className="p-2">₦{l.repayment_amount.toLocaleString()}</td>
                          <td className="p-2">₦{l.amount_repaid.toLocaleString()}</td>
                          <td className="p-2 font-bold text-red-600">₦{l.amount_remaining.toLocaleString()}</td>
                          <td className="p-2">{l.days_repaid}/{l.total_days}</td>
                          <td className="p-2">{l.date_issued ? new Date(l.date_issued).toLocaleDateString() : '—'}</td>
                          <td className="p-2">{Math.max(0, l.total_days - l.days_repaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {loanSubView === 'completed' && (
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm overflow-x-auto">
                {completedLoans.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No completed loans yet.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500 font-bold border-b"><th className="p-2">Customer</th><th className="p-2">Loan Amount</th><th className="p-2">Approved</th><th className="p-2">Completed</th><th className="p-2">Service Charge</th><th className="p-2">Total Repaid</th></tr></thead>
                    <tbody className="divide-y">
                      {completedLoans.map(l => (
                        <tr key={l.id}>
                          <td className="p-2 font-bold">{lookupCustomer(l.customer_id)?.name || '—'}</td>
                          <td className="p-2">₦{l.loan_amount.toLocaleString()}</td>
                          <td className="p-2">{l.date_issued ? new Date(l.date_issued).toLocaleDateString() : '—'}</td>
                          <td className="p-2">{l.completed_at ? new Date(l.completed_at).toLocaleDateString() : '—'}</td>
                          <td className="p-2">₦{l.service_charge.toLocaleString()}</td>
                          <td className="p-2 font-bold text-emerald-700">₦{l.amount_repaid.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {loanSubView === 'history' && (
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="month" value={loanHistoryMonthFilter} onChange={e => setLoanHistoryMonthFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-xs" />
                  <select value={loanHistoryBranchFilter} onChange={e => setLoanHistoryBranchFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-xs font-bold">
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select value={loanHistoryStatusFilter} onChange={e => setLoanHistoryStatusFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-xs font-bold">
                    <option value="">All Events</option>
                    <option value="Requested">Requested</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  {filteredHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No loan history matches these filters.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead><tr className="text-slate-500 font-bold border-b"><th className="p-2">Date</th><th className="p-2">Customer</th><th className="p-2">Event</th><th className="p-2">Loan Amount</th><th className="p-2">Repayment</th></tr></thead>
                      <tbody className="divide-y">
                        {filteredHistory.map((h: any) => (
                          <tr key={h.id}>
                            <td className="p-2">{new Date(h.created_at).toLocaleDateString()}</td>
                            <td className="p-2 font-bold">{lookupCustomer(h.customer_id)?.name || '—'}</td>
                            <td className="p-2">{h.event_type}</td>
                            <td className="p-2">{h.loan_amount != null ? `₦${Number(h.loan_amount).toLocaleString()}` : '—'}</td>
                            <td className="p-2">{h.repayment_amount != null ? `₦${Number(h.repayment_amount).toLocaleString()}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {rejectingRequestId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectingRequestId(null)}>
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <h4 className="text-sm font-black text-emerald-955 mb-3">Reject Loan Request</h4>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason (optional)" className="w-full border rounded-xl px-3 py-2 text-xs mb-3" rows={3} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRejectingRequestId(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs">Cancel</button>
                    <button type="button" onClick={() => { onRejectLoanRequest(rejectingRequestId, rejectionReason); setRejectingRequestId(null); }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-xs">Confirm Reject</button>
                  </div>
                </div>
              </div>
            )}

            {showAssignLoanModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignLoanModal(false)}>
                <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-md font-black text-emerald-955 mb-3">Assign Loan</h3>
                  <SearchableCustomerSelect
                    customers={profiles.filter(p => p.role === 'Customer')}
                    selectedId={assignLoanCustomerId}
                    onSelect={setAssignLoanCustomerId}
                  />
                  {assignTarget && assignEligibility && (
                    <div className="mt-3 space-y-1.5 text-xs font-semibold bg-emerald-50/50 rounded-2xl p-3">
                      <p><span className="text-slate-500">Branch:</span> {lookupBranch(assignTarget.id)}</p>
                      <p><span className="text-slate-500">Daily Contribution:</span> ₦{assignTarget.daily_amount.toLocaleString()}</p>
                      <p><span className="text-slate-500">32-Day Savings Value:</span> ₦{assignSavingsTotal.toLocaleString()}</p>
                      <p><span className="text-slate-500">Maximum Loan Eligible:</span> ₦{assignEligibility.maxLoan.toLocaleString()}</p>
                      <p><span className="text-slate-500">Current Loan Status:</span> {assignTarget.loan_status}</p>
                      <p><span className="text-slate-500">Customer Status:</span> {assignTarget.is_active ? 'Active' : 'Inactive'}</p>
                      {assignBlocked && (
                        <p className="text-red-600 font-bold">This customer already has an active or pending loan.</p>
                      )}
                    </div>
                  )}
                  {assignTarget && !assignBlocked && (
                    <div className="mt-3 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Approved Loan Amount</label>
                      <input type="number" value={assignLoanAmount} onChange={e => setAssignLoanAmount(e.target.value)} max={assignEligibility?.maxLoan} placeholder={`Up to ₦${assignEligibility?.maxLoan.toLocaleString()}`} className="w-full border rounded-xl px-3 py-2 text-xs" />
                      <label className="text-[10px] font-black uppercase text-slate-500">Disbursement Date</label>
                      <input type="date" value={assignLoanDate} onChange={e => setAssignLoanDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs" />
                      <label className="text-[10px] font-black uppercase text-slate-500">Remarks</label>
                      <textarea value={assignLoanRemarks} onChange={e => setAssignLoanRemarks(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs" rows={2} />
                      {assignAmountNum > 0 && (
                        <p className="text-xs font-black text-emerald-800">Repayment Amount: ₦{assignRepayment.toLocaleString()}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!assignTarget || !!assignBlocked || assignAmountNum <= 0 || (assignEligibility ? assignAmountNum > assignEligibility.maxLoan : true)}
                    onClick={() => { onAssignLoan(assignLoanCustomerId, assignAmountNum, assignLoanRemarks, assignLoanDate); setShowAssignLoanModal(false); }}
                    className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs uppercase"
                  >
                    Assign Loan
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Corporate Profit & Earnings Reporting tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          {/* Monthly Financial Summary Dashboard */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <LayoutDashboard className="w-5 h-5 text-emerald-700" />
              Monthly Financial Summary — {periodLabelFromKey(currentPeriodKey)}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Total Contributions', value: liveMonth.contributions, color: 'emerald' },
                { label: 'Total Profit', value: liveMonth.profit, color: 'emerald' },
                { label: 'Total Expenses', value: liveMonth.expenses, color: 'slate' },
                { label: 'Total Payout', value: liveMonth.payout, color: 'slate' },
                { label: 'Remaining Balance', value: liveMonth.remaining, color: 'amber' },
              ].map(card => (
                <div key={card.label} className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">{card.label}</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-955 mt-1">₦{card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Loan Reports */}
          {(() => {
            const totalLoansIssued = loans.length;
            const pendingLoanRequests = loanRequests.filter(r => r.status === 'Pending Approval').length;
            const activeLoansCount = loans.filter(l => l.status === 'Active Loan').length;
            const completedLoansCount = loans.filter(l => l.status === 'Loan Cleared').length;
            const outstandingLoanBalance = sumCurrencyValues(loans.filter(l => l.status === 'Active Loan').map(l => l.amount_remaining));
            const totalLoanRepayments = sumCurrencyValues(loans.map(l => l.amount_repaid));

            const now = new Date();
            const monthlyLoans = loans.filter(l => {
              if (!l.date_issued) return false;
              const d = new Date(l.date_issued);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            const monthlyLoanAmount = sumCurrencyValues(monthlyLoans.map(l => l.loan_amount));

            const branchSummary = branches.map(b => {
              const branchCustomerIds = profiles.filter(p => p.branch_id === b.id).map(p => p.id);
              const branchLoans = loans.filter(l => branchCustomerIds.includes(l.customer_id));
              return { name: b.name, count: branchLoans.length, total: sumCurrencyValues(branchLoans.map(l => l.loan_amount)) };
            }).filter(b => b.count > 0);

            return (
              <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <LayoutDashboard className="w-5 h-5 text-emerald-700" />
                  Loan Reports
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Total Loans Issued', value: totalLoansIssued, isCurrency: false },
                    { label: 'Pending Loan Requests', value: pendingLoanRequests, isCurrency: false },
                    { label: 'Active Loans', value: activeLoansCount, isCurrency: false },
                    { label: 'Completed Loans', value: completedLoansCount, isCurrency: false },
                    { label: 'Outstanding Loan Balance', value: outstandingLoanBalance, isCurrency: true },
                    { label: 'Total Loan Repayments', value: totalLoanRepayments, isCurrency: true },
                  ].map(card => (
                    <div key={card.label} className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">{card.label}</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-955 mt-1">{card.isCurrency ? `₦${card.value.toLocaleString()}` : card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-500 mb-1.5">Monthly Loan Summary — {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs font-semibold">{monthlyLoans.length} loan(s) issued, ₦{monthlyLoanAmount.toLocaleString()} total</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-500 mb-1.5">Branch Loan Summary</p>
                    {branchSummary.length === 0 ? (
                      <p className="text-xs text-slate-400">No loan activity by branch yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {branchSummary.map(b => (
                          <p key={b.name} className="text-xs font-semibold">{b.name}: {b.count} loan(s), ₦{b.total.toLocaleString()}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Part 5: Monthly Payout Card */}
          <div className="bg-emerald-955 text-white p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] uppercase font-black tracking-wider text-emerald-200">Monthly Payout (Contributions − Profit)</p>
            <p className="text-3xl font-black mt-1 text-[#166534]">₦{monthlyPayoutCard.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-300 mt-1.5">Resets automatically at the start of each new month.</p>
          </div>

          {/* Monthly Archive */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider mb-1 font-bold">Monthly Archive</h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Previous months archive automatically once they end. The current month always stays live above.</p>
            {monthlySummaries.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-emerald-200 rounded-2xl text-slate-400 text-xs">No archived months yet.</div>
            ) : (
              <div className="space-y-2">
                {monthlySummaries.map(s => {
                  const isOpen = expandedArchiveMonth === s.id;
                  return (
                    <div key={s.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedArchiveMonth(isOpen ? null : s.id)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-100/60 transition"
                      >
                        <span className="text-xs font-black text-slate-800">{s.month_label}</span>
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {isOpen && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white text-sm">
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Total Collected</span><span className="font-black text-emerald-900 text-base">₦{Number(s.total_contributions).toLocaleString()}</span></div>
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Total Profit</span><span className="font-black text-emerald-900 text-base">₦{Number(s.total_profit).toLocaleString()}</span></div>
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Total Expenses</span><span className="font-black text-slate-900 text-base">₦{Number(s.total_expenses).toLocaleString()}</span></div>
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Total Paid Out</span><span className="font-black text-slate-900 text-base">₦{Number(s.total_payout).toLocaleString()}</span></div>
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Remaining Balance</span><span className="font-black text-amber-800 text-base">₦{Number(s.remaining_balance).toLocaleString()}</span></div>
                          <div><span className="text-slate-600 block font-bold text-[10px] uppercase">Date Archived</span><span className="font-black text-slate-900 text-base">{new Date(s.date_archived).toLocaleDateString()}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in space-y-6">
          <div>
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <FileText className="w-5 h-5 text-emerald-700" />
              Monthly Revenue & Profit Report
            </h3>
            <p className="text-xs text-slate-505 font-medium">This calculates company profit generated monthly based on active customers (where 1 day's contribution is removed as company profit per active customer).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 text-center flex flex-col justify-center space-y-2">
              <p className="text-[11px] text-slate-555 font-bold uppercase tracking-wider font-bold">Monthly Profit (1-Day Fee Per Paid Customer)</p>
              <p className="text-4xl font-black text-emerald-850 font-bold">
                ₦{customers.filter(c => c.is_active && stats.monthlyTransactions.some(tx => tx.customer_id === c.id && tx.status === 'Successful')).reduce((sum, c) => sum + c.daily_amount, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold text-slate-500">
                Sum of daily contribution amounts for {customers.filter(c => c.is_active && stats.monthlyTransactions.some(tx => tx.customer_id === c.id && tx.status === 'Successful')).length} customers who paid this month.
              </p>
            </div>

            <div className="bg-white p-6 border border-emerald-100 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-xs uppercase text-slate-700 border-b pb-2 font-bold">Paid Customers List & Profit Contributions</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {customers.filter(c => c.is_active && stats.monthlyTransactions.some(tx => tx.customer_id === c.id && tx.status === 'Successful')).map(c => (
                  <div key={c.id} className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-xl font-semibold">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="font-bold text-emerald-800">₦{c.daily_amount.toLocaleString()}</span>
                  </div>
                ))}
                {customers.filter(c => c.is_active && stats.monthlyTransactions.some(tx => tx.customer_id === c.id && tx.status === 'Successful')).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4 font-medium">No paid customers recorded in this month yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-slate-850">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Settings className="w-5 h-5 text-emerald-700" />
              Support Settings Control Panel
            </h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Edit the support shortcuts and banking details displayed to customers.</p>
            
            <form onSubmit={handleSupportSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">Support Phone Line</label>
                <input 
                  type="text" 
                  required
                  placeholder="+234 803 461 2345"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">WhatsApp Direct Line</label>
                <input 
                  type="text" 
                  required
                  placeholder="+234 803 461 2345"
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-505 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">Support Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="support@hiremercy.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="border-t border-emerald-100 pt-4 space-y-4">
                <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider">Advertisement Banner Control</h4>
                <label className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-bold text-emerald-900">
                  <span>Show advertisement banner to customers</span>
                  <input
                    type="checkbox"
                    checked={advertEnabled}
                    onChange={(e) => setAdvertEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                  />
                </label>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Advertisement Title</label>
                  <input
                    type="text"
                    placeholder="Daily contributions made simple"
                    value={advertTitle}
                    onChange={(e) => setAdvertTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Advertisement Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the banner message"
                    value={advertDescription}
                    onChange={(e) => setAdvertDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Advertisement Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    value={advertImageUrl}
                    onChange={(e) => setAdvertImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Advertisement Video URL (plays instead of the image if set)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/ad-animation.mp4"
                    value={advertVideoUrl}
                    onChange={(e) => setAdvertVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider">App Theme</h4>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Background Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeBackgroundColor}
                      onChange={(e) => setThemeBackgroundColor(e.target.value)}
                      className="h-10 w-16 rounded-lg border border-emerald-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeBackgroundColor}
                      onChange={(e) => setThemeBackgroundColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>
                <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider">Company Bank Account Settings (For Deposits)</h4>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Bank Name</label>
                  <select
                    value={adminBankName}
                    onChange={(e) => setAdminBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs font-medium"
                  >
                    {nigerianBanks.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Account Number</label>
                  <input 
                    type="text" 
                    required
                    placeholder="10-digit number"
                    maxLength={10}
                    value={adminAccountNumber}
                    onChange={(e) => setAdminAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Account Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. HireMercy Ajo Enterprise"
                    value={adminAccountName}
                    onChange={(e) => setAdminAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Save Settings & Bank Details
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5 font-bold font-bold">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                Live Preview
              </h3>
              <p className="text-xs text-slate-555 mb-6 font-medium">This is how your clients see their support widget.</p>
              
              <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3 mb-6 text-slate-800 font-semibold font-bold">
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Call: <strong className="text-slate-900 font-bold">{supportPhone}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp: <strong className="text-slate-900 font-bold">{supportWhatsapp}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Email: <strong className="text-slate-900 font-bold">{supportEmail}</strong></span>
                </div>
              </div>

              <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider mb-2 font-bold font-bold">Customer Deposit Banking coordinates preview:</h4>
              <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-slate-800 font-bold">
                <p>Bank: <strong className="text-slate-900 font-bold">{adminBankName}</strong></p>
                <p>Account Number: <strong className="text-slate-900 font-bold">{adminAccountNumber}</strong></p>
                <p>Account Name: <strong className="text-slate-900 font-bold">{adminAccountName}</strong></p>
              </div>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-4 leading-relaxed font-semibold">
              ⚠️ Note: Ensure numbers are written in full international format (e.g. starting with +234) for WhatsApp redirect actions to work.
            </div>
          </div>

          {/* Quick Notepad - mini spreadsheet scratchpad */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <FileText className="w-5 h-5 text-emerald-700" />
              Quick Notepad
            </h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Jot down ad-hoc items like daily expenses. Saves automatically.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-900 font-black">
                    <th className="p-2 text-left rounded-l-xl">Description</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {notepadRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => updateNotepadCell(idx, 'description', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          placeholder="e.g. Transport"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.amount}
                          onChange={e => updateNotepadCell(idx, 'amount', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          placeholder="₦0"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => updateNotepadCell(idx, 'date', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addNotepadRow}
              className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add row
            </button>
          </div>

          {/* Admin-to-Customer Messaging */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
              Customer Note
            </h3>
            <p className="text-xs text-slate-505 mb-4 font-medium">Appears directly below the balance card on the selected customer's dashboard. Only the latest note shows - editing replaces it, deleting removes it immediately.</p>
            <div className="space-y-3">
              <SearchableCustomerSelect
                customers={profiles.filter(p => p.role === 'Customer')}
                selectedId={noteCustomerId}
                onSelect={handleSelectNoteCustomer}
                placeholder="Select customer..."
              />
              <textarea
                rows={3}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="e.g. Your payout has been scheduled for Friday."
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-medium"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendCustomerNote}
                  disabled={!noteCustomerId}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm"
                >
                  {profiles.find(p => p.id === noteCustomerId)?.admin_note ? 'Save Edit' : 'Send Note'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCustomerNote}
                  disabled={!noteCustomerId || !profiles.find(p => p.id === noteCustomerId)?.admin_note}
                  className="px-4 bg-red-50 hover:bg-red-100 disabled:opacity-30 text-red-700 font-bold py-2.5 rounded-xl transition text-sm flex items-center gap-1.5"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. STAFF DASHBOARD COMPONENT
// =========================================================================

function StaffDashboard({ 
  profiles, transactions, markedDays, staffProfile, supportDetails, onAddTransaction, onRegisterCustomer, branches
}: { 
  profiles: Profile[], transactions: Transaction[], markedDays: Record<string, MarkedDay[]>, staffProfile: Profile, supportDetails: SupportSettings, branches: Branch[], onAddTransaction: (cId: string, amt: number, method: any, sId: string) => void, onRegisterCustomer: (data: any) => void
}) {
  const [activeTab, setActiveTab] = useState<'collect' | 'onboard'>('collect');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Cash');

  // Onboard customer states
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cDailyAmount, setCDailyAmount] = useState('1000');

  const customers = profiles.filter(p => p.role === 'Customer' && p.branch_id === staffProfile.branch_id && p.is_active).sort((a, b) => a.name.localeCompare(b.name));

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !depositAmount) return;
    onAddTransaction(selectedCustomerId, Number(depositAmount), paymentMethod, staffProfile.id);
    setDepositAmount('');
  };

  const handleStaffCustomerOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cPhone) return;
    if (Number(cDailyAmount) < 300) {
      alert("Daily Contribution must be a minimum of ₦300.");
      return;
    }
    onRegisterCustomer({
      name: cName,
      phone: cPhone,
      email: cEmail || `${cPhone}@hiremercy.com`, // Fallback email
      password: 'customer123',
      daily_amount: Number(cDailyAmount),
      branch_id: staffProfile.branch_id // Auto-assigns to the Staff's own branch
    });
    setCName('');
    setCPhone('');
    setCEmail('');
    setCDailyAmount('1000');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-700 flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            Field Agent Management Desk
          </h2>
          <p className="text-xs text-slate-505">Collect daily targets or onboard branch customers locally</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab('collect')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase ${
              activeTab === 'collect' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            Collect Deposit
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('onboard')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase ${
              activeTab === 'onboard' ? 'bg-emerald-700 text-white shadow-sm font-bold' : 'bg-emerald-50 text-emerald-800 font-bold'
            }`}
          >
            Onboard Customer
          </button>
        </div>
      </div>

      {activeTab === 'collect' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit text-slate-800">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider font-bold">Collect Deposit</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Select Branch Customer *</label>
                <SearchableCustomerSelect 
                  customers={customers} 
                  selectedId={selectedCustomerId} 
                  onSelect={setSelectedCustomerId} 
                  placeholder="Type name or phone to choose account..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Deposit Amount (₦)</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md font-bold uppercase text-xs"
              >
                Post Contribution
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Branch Directory Progress</h3>
            
            {/* Conditional Rendering: Only show 32-day tracking table once selected */}
            {selectedCustomerId ? (
              (() => {
                const cust = customers.find(c => c.id === selectedCustomerId);
                if (!cust) return null;
                return (
                  <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl space-y-3 animate-fade-in text-slate-850 font-bold">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-emerald-955">{cust.name}</h4>
                        <p className="text-[10px] text-slate-550 font-bold">Contact: {cust.phone} | Pace: ₦{cust.daily_amount.toLocaleString()}/day</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-amber-500 text-emerald-955 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          {(markedDays[cust.id] || []).length} / 32 Days Marked
                        </span>
                      </div>
                    </div>
                    <Grid32 trackingDays={markedDays[cust.id] || []} dailyAmount={cust.daily_amount} />
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 bg-emerald-50/10 border border-dashed border-emerald-200 rounded-2xl">
                <p className="text-xs text-slate-400 px-4">Please search and choose a customer account to view their contribution tracking table.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Staff Onboarding Customer directly from Staff Dashboard */
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm max-w-md mx-auto animate-fade-in text-slate-800 font-bold">
          <h3 className="text-md font-black text-emerald-955 mb-3 uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            Onboard Branch Customer
          </h3>
          <p className="text-[10px] text-slate-555 mb-4">Customer will be automatically assigned to your branch: <strong>{branches.find(b => b.id === staffProfile.branch_id)?.name || 'Home Branch'}</strong>.</p>

          <form onSubmit={handleStaffCustomerOnboard} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Full Name *</label>
              <input type="text" name="name" required value={cName} onChange={(e) => setCName(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Phone Line *</label>
              <input type="text" name="phone" required placeholder="080XXXXXXXX" value={cPhone} onChange={(e) => setCPhone(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Email Address</label>
              <input type="email" name="email" placeholder="name@domain.com (optional)" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Daily Target (₦) *</label>
              <input 
                type="number" 
                name="daily_amount" 
                required 
                min={300}
                placeholder="Minimum ₦300"
                value={cDailyAmount} 
                onChange={(e) => setCDailyAmount(e.target.value)} 
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl font-bold" 
              />
              <span className="text-[9px] text-slate-400 block mt-1">Acceptable limit: Minimum ₦300/day</span>
            </div>
            <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md font-bold uppercase">
              Onboard Customer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 4. CUSTOMER DASHBOARD COMPONENT
// =========================================================================

function CustomerDashboard({ 
  customer, transactions, markedDays, supportDetails, onAddPayoutRequest, payoutRequests, savedMonths, cycleArchives, onAddCustomerPendingTransaction, onUpdateCustomerSettings,
  activeLoan, myLoans, myLoanRequests, onRequestLoan, profiles
}: { 
  customer: Profile, transactions: Transaction[], markedDays: MarkedDay[], supportDetails: SupportSettings, payoutRequests: PayoutRequest[], savedMonths: SavedMonth[], cycleArchives: any[], onAddPayoutRequest: (bank: string, acctNum: string, acctName: string, contributionIds: string[]) => void,
  onAddCustomerPendingTransaction: (amount: number, method: 'Cash' | 'Bank Transfer' | 'Mobile Money') => void, onUpdateCustomerSettings: (phone: string, dailyAmount: number) => void,
  activeLoan: Loan | null, myLoans: Loan[], myLoanRequests: LoanRequest[], onRequestLoan: (customerId: string) => void, profiles: Profile[]
}) {
  const [customerTab, setCustomerTab] = useState<'tracker' | 'transactions' | 'deposit' | 'settings' | 'history'>('tracker');

  const myTransactions = transactions.filter(t => t.customer_id === customer.id);
  // The customer's ACTIVE, still-running cycle (whatever's currently open in marked_days)
  const totalActiveCycle = markedDays.reduce((sum, item) => sum + item.amount, 0);
  // Frozen 32-day (or expired) cycles that have been saved but not yet paid out -
  // these are real money that belongs to the customer just as much as the active
  // cycle; excluding them was the bug behind "balance only shows the new remainder".
  const totalUncollected = sumCurrencyValues(
    savedMonths.filter(m => m.status === 'saved' || m.status === 'requested').map(m => m.total_amount)
  );
  // Total across everything the customer currently has with the company
  const totalSaved = totalActiveCycle + totalUncollected;

  // Loan-derived values, shared by both the default Tracker tab (the real
  // Balance Card lives there) and the History tab's summary card - computed
  // once here rather than duplicated per-tab.
  const latestLoan = myLoans[0] || null;
  const justClearedLoan = latestLoan && latestLoan.status === 'Loan Cleared';
  const pendingLoanRequest = myLoanRequests.find(r => r.status === 'Pending Approval');
  const canRequestLoan = customer.is_active && customer.loan_status !== 'Active Loan' && customer.loan_status !== 'Pending Approval';
  const [showLoanRequestModal, setShowLoanRequestModal] = useState(false);

  // Modal / Form state for Payout Request
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [selectedMonthIds, setSelectedMonthIds] = useState<string[]>([]);

  // Add Funds form states
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [selectedSenderBank, setSelectedSenderBank] = useState('');

  // Personal Settings states
  const [custSettingsPhone, setCustSettingsPhone] = useState(customer.phone);
  const [custSettingsDailyAmount, setCustSettingsDailyAmount] = useState(customer.daily_amount);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const payoutHistory = useMemo(() => {
    return payoutRequests.filter(p => p.customer_id === customer.id);
  }, [payoutRequests, customer.id]);

  // Frozen/saved 32-day months that haven't been collected (requested/paid) yet.
  // The Payout action is only ever surfaced when this list is non-empty.
  const uncollectedSavedMonths = useMemo(() => {
    return savedMonths.filter(m => m.status === 'saved');
  }, [savedMonths]);

  const selectedMonths = useMemo(() => {
    return uncollectedSavedMonths.filter(m => selectedMonthIds.includes(m.id));
  }, [uncollectedSavedMonths, selectedMonthIds]);

  const selectedTotalAmount = useMemo(() => {
    return sumCurrencyValues(selectedMonths.map(m => m.total_amount));
  }, [selectedMonths]);

  const expectedPayoutAmount = useMemo(() => {
    if (selectedMonths.length === 0) return 0;
    // 1-day company fee deducted per saved month included in the request
    return Math.max(0, selectedTotalAmount - selectedMonths.length * customer.daily_amount);
  }, [selectedMonths, selectedTotalAmount, customer.daily_amount]);

  const toggleMonthSelection = (id: string) => {
    setSelectedMonthIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canChangeAmount = useMemo(() => {
    if (customer.allow_anytime_change) return true;
    if (!customer.last_amount_change_at) return true;
    const lastChange = new Date(customer.last_amount_change_at);
    const now = new Date();
    return !(lastChange.getMonth() === now.getMonth() && lastChange.getFullYear() === now.getFullYear());
  }, [customer]);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) return;
    if (selectedMonthIds.length === 0) {
      alert("Select at least one saved month to include in this payout request.");
      return;
    }
    onAddPayoutRequest(bankName, accountNumber, accountName, selectedMonthIds);
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setSelectedMonthIds([]);
    setShowWithdrawModal(false);
  };

  const handleAddFundsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depositAmountInput);
    if (!depositAmountInput || isNaN(amt) || amt <= 0 || !selectedSenderBank) {
      alert('Please enter a valid amount and select your bank.');
      return;
    }
    
    // Auto-save the transaction as Pending
    onAddCustomerPendingTransaction(amt, 'Bank Transfer');

    // Attempt direct deep link redirection based on bank name
    const bankUrlMap: Record<string, string> = {
      'Access Bank': 'accessbank://',
      'Guaranty Trust Bank (GTBank)': 'gtb://',
      'Zenith Bank': 'zenith://',
      'United Bank for Africa (UBA)': 'uba://',
      'First Bank of Nigeria': 'firstbank://',
      'Kuda Bank': 'kudabank://',
      'OPay': 'opay://',
      'PalmPay': 'palmpay://'
    };

    const targetUrl = bankUrlMap[selectedSenderBank] || 'bankapp://';
    
    // Display prompt and invoke URL link
    alert(`Redirecting to your ${selectedSenderBank} mobile app. If your bank app does not launch automatically, please open it manually to perform the transfer.`);
    window.location.href = targetUrl;

    setDepositAmountInput('');
    setSelectedSenderBank('');
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(custSettingsDailyAmount) < 300) {
      alert("Daily Contribution must be at least ₦300.");
      return;
    }
    onUpdateCustomerSettings(custSettingsPhone, Number(custSettingsDailyAmount));
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    setIsUpdatingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Your account password has been changed successfully!');
      setNewPassword('');
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`);
    } finally {
      setIsUpdatingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-955 text-white p-6 sm:p-8 rounded-3xl border-b-4 border-amber-505 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-505 opacity-10 rounded-full transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <span className="bg-amber-505 text-emerald-955 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest font-bold">
              Personal Saver Deck
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">Welcome, {customer.name}!</h2>
            <p className="text-emerald-100 text-xs max-w-xl font-bold">
              Watch your contribution metrics climb across your continuous 32-day savings campaign.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['tracker', 'history', 'transactions', 'deposit', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCustomerTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition ${
                  customerTab === tab 
                    ? 'bg-amber-505 text-emerald-955 shadow-md font-bold' 
                    : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900 font-bold'
                }`}
              >
                {tab === 'tracker' && 'My Tracker'}
                {tab === 'history' && 'My 32-Day History'}
                {tab === 'transactions' && 'Statement History'}
                {tab === 'deposit' && 'Deposit Funds'}
                {tab === 'settings' && 'Plan Settings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {customerTab === 'history' && (() => {
        const myHistory = buildTrackingHistory(markedDays, savedMonths, cycleArchives);
        const uncollectedTotal = sumCurrencyValues(
          myHistory.filter(e => e.status === 'Uncollected').map(e => e.total_amount)
        );
        const collectedTotal = sumCurrencyValues(
          myHistory.filter(e => e.status === 'Collected').map(e => e.total_amount)
        );
        return (
          <div className="space-y-4">
            {/* Savings Account summary - accumulates and never clears until an
                explicit admin-approved payout removes a specific month */}
            <div className="bg-emerald-955 text-white p-6 rounded-3xl shadow-sm">
              <p className="text-[11px] uppercase font-black tracking-wider text-amber-400">My Savings Account</p>
              <p className="text-3xl sm:text-4xl font-black mt-1 text-[#166534]">₦{(totalActiveCycle + uncollectedTotal).toLocaleString()}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs font-black text-emerald-50">
                <span>Running: ₦{totalActiveCycle.toLocaleString()}</span>
                <span>Uncollected: ₦{uncollectedTotal.toLocaleString()}</span>
                <span>Lifetime Collected: ₦{collectedTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider mb-1 font-bold">My 32-Day Tracking History</h3>
              <p className="text-xs text-slate-505 mb-4 font-medium">Every 32-day cycle you've run, from the one currently in progress to fully paid-out months. Click a month for details.</p>
              {myHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 p-4 text-center text-slate-400">No tracking history yet - your first contribution will start Day 1.</div>
              ) : (
                <div className="space-y-2">
                  {myHistory.map(entry => <TrackingHistoryCard key={entry.key} entry={entry} />)}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {customerTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-1">
            {/* Balance Card */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4 text-slate-800 font-bold">
              <div>
                <p className="text-[10px] text-slate-505 uppercase font-black tracking-wider">Total Balance With HireMercy AJO</p>
                <p className="text-3xl font-black text-emerald-800 mt-1 font-bold">₦{totalSaved.toLocaleString()}</p>
                <div className="flex gap-3 mt-1.5 text-[10px] font-bold text-slate-500">
                  <span>Running: ₦{totalActiveCycle.toLocaleString()}</span>
                  <span>•</span>
                  <span>Uncollected: ₦{totalUncollected.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-emerald-50 flex justify-between text-xs font-bold">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px]">Daily Target Plan</span>
                  <span className="font-bold text-slate-800">₦{customer.daily_amount.toLocaleString()} / Day</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-bold text-[10px]">Current Cycle</span>
                  <span className="font-bold text-amber-650">32-Day Thrift</span>
                </div>
              </div>

              {activeLoan && (
                <div className="pt-4 border-t border-emerald-50">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Loan Balance</span>
                  <p className="text-2xl font-black mt-0.5 text-red-600">
                    -₦{Math.max(0, activeLoan.repayment_amount - activeLoan.amount_repaid).toLocaleString()}
                  </p>
                </div>
              )}
              {!activeLoan && justClearedLoan && (
                <div className="pt-4 border-t border-emerald-50">
                  <p className="text-sm font-black text-green-600">Loan Repayment Complete</p>
                </div>
              )}

              {activeLoan ? (
                <p className="text-[10px] text-center text-red-700 font-semibold bg-red-50 p-2 rounded-xl">
                  You have an active loan to repay. Savings withdrawal is unavailable until your loan has been fully repaid.
                </p>
              ) : uncollectedSavedMonths.length > 0 ? (
                <button 
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="w-full bg-amber-505 hover:bg-amber-606 text-emerald-955 font-black py-2.5 rounded-xl text-xs transition duration-150 shadow-md flex items-center justify-center gap-1.5 font-bold"
                >
                  <Coins className="w-4 h-4" />
                  Request Payout / Withdrawal ({uncollectedSavedMonths.length} saved)
                </button>
              ) : (
                <p className="text-[10px] text-center text-slate-400 font-semibold bg-slate-50 p-2 rounded-xl">
                  Complete a full 32-day cycle to unlock a payout for that month.
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Loan Information</h3>
                {canRequestLoan && !pendingLoanRequest && (
                  <button
                    type="button"
                    onClick={() => setShowLoanRequestModal(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-emerald-955 font-black px-3 py-1.5 rounded-xl text-[11px] uppercase transition"
                  >
                    Request Loan
                  </button>
                )}
              </div>
              {pendingLoanRequest ? (
                <p className="text-xs text-amber-700 font-bold mt-2">Your loan request is pending admin approval.</p>
              ) : activeLoan ? (
                <div className="mt-2 space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-semibold">
                    <div><p className="text-slate-500">Loan Status</p><p className="font-bold">{activeLoan.status === 'Loan Cleared' ? 'Loan Repaid' : activeLoan.status}</p></div>
                    <div><p className="text-slate-500">Loan ID</p><p className="font-bold text-[10px]">{activeLoan.id.slice(0, 8)}</p></div>
                    <div><p className="text-slate-500">Loan Amount</p><p className="font-bold">₦{activeLoan.loan_amount.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Repayment Amount</p><p className="font-bold">₦{activeLoan.repayment_amount.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Amount Already Counted</p><p className="font-bold">₦{activeLoan.amount_already_counted.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Amount Repaid</p><p className="font-bold">₦{activeLoan.amount_repaid.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Outstanding Balance</p><p className="font-bold text-red-600">₦{activeLoan.amount_remaining.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Current Daily Contribution</p><p className="font-bold">₦{customer.daily_amount.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Days Repaid</p><p className="font-bold">{activeLoan.days_repaid} / {activeLoan.total_days}</p></div>
                    <div><p className="text-slate-500">Remaining Days</p><p className="font-bold">{Math.max(0, activeLoan.total_days - activeLoan.days_repaid)}</p></div>
                    <div><p className="text-slate-500">Approval Date</p><p className="font-bold">{activeLoan.date_issued ? new Date(activeLoan.date_issued).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-slate-500">Approved By</p><p className="font-bold">{profiles.find(p => p.id === activeLoan.approved_by)?.name || '—'}</p></div>
                  </div>
                  <div className="pt-1">
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (activeLoan.days_repaid / activeLoan.total_days) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{activeLoan.days_repaid} / {activeLoan.total_days} Days Completed</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-semibold mt-2">
                  {customer.is_active ? 'You have no active loan.' : 'Your account must be active to request a loan.'}
                </p>
              )}
            </div>

            {showLoanRequestModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLoanRequestModal(false)}>
                <div className="bg-white rounded-3xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-md font-black text-emerald-955 mb-3">Loan Request</h3>
                  {(() => {
                    const { maxLoan, repaymentAmount } = computeLoanEligibility(customer.daily_amount);
                    const completedDays = markedDays.length;
                    const amountAlreadyCounted = Math.min(totalActiveCycle, repaymentAmount);
                    const remainingRepayment = Math.max(0, repaymentAmount - amountAlreadyCounted);
                    return (
                      <div className="space-y-1.5 text-xs font-semibold mb-4">
                        <p><span className="text-slate-500">Customer Name:</span> {customer.name}</p>
                        <p><span className="text-slate-500">Daily Contribution:</span> ₦{customer.daily_amount.toLocaleString()}</p>
                        <p><span className="text-slate-500">Maximum Loan Eligible:</span> ₦{maxLoan.toLocaleString()}</p>
                        <p><span className="text-slate-500">Repayment Amount:</span> ₦{repaymentAmount.toLocaleString()}</p>
                        <p><span className="text-slate-500">Completed Days:</span> {completedDays}</p>
                        <p><span className="text-slate-500">Amount Already Counted:</span> ₦{amountAlreadyCounted.toLocaleString()}</p>
                        <p className="font-black text-emerald-800">Remaining Repayment Amount: ₦{remainingRepayment.toLocaleString()}</p>
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => { onRequestLoan(customer.id); setShowLoanRequestModal(false); }}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2.5 rounded-xl text-xs uppercase"
                  >
                    Submit Loan Request
                  </button>
                </div>
              </div>
            )}

            {customer.admin_note && customer.admin_note.trim() !== '' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Note from HireMercy AJO</p>
                  <p className="text-xs font-semibold text-amber-900">{customer.admin_note}</p>
                </div>
              </div>
            )}

            <SupportWidget details={supportDetails} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">My 32-Day Contribution Grid</h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-black text-emerald-800">
                    {periodLabelFromKey((markedDays[0] as any)?.period_key) !== 'Unknown period'
                      ? periodLabelFromKey((markedDays[0] as any)?.period_key)
                      : periodLabelFromKey(getCurrentPeriodKey())}
                  </span>
                </div>
                <p className="text-xs text-slate-505 mt-0.5 font-bold">Stars indicate approved/marked allocations corresponding to confirmed payments.</p>
              </div>
              <Grid32 trackingDays={markedDays} dailyAmount={customer.daily_amount} />
            </div>

            {/* Payout records table */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <FileText className="w-5 h-5 text-emerald-700" />
                My Payout & Reset History
              </h3>
              <div className="overflow-x-auto text-slate-800 font-bold">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                      <th className="p-3">Requested At</th>
                      <th className="p-3">Recipient Account</th>
                      <th className="p-3">Cleared Period</th>
                      <th className="p-3">Accrued Sum</th>
                      <th className="p-3 text-emerald-800">Payout (Accrued - 1 Day)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 bg-white">
                    {payoutHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">No previous payout logs.</td>
                      </tr>
                    ) : (
                      payoutHistory.map(h => (
                        <tr key={h.id}>
                          <td className="p-3 text-slate-550">
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-slate-700 font-bold">
                            {h.payout_method === 'Cash' ? (
                              <strong className="block">Cash Payment</strong>
                            ) : (
                              <>
                                <strong className="block">{h.account_name}</strong>
                                {h.bank_name} • {h.account_number}
                              </>
                            )}
                          </td>
                          <td className="p-3 font-bold text-amber-800">{h.month_paid || 'N/A'}</td>
                          <td className="p-3">₦{h.amount.toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-800">₦{h.payout_amount.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] ${
                              h.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {h.status === 'Successful' ? 'Successful' : h.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statement History Tab */}
      {customerTab === 'transactions' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in space-y-4">
          <div>
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold font-bold">
              <FileText className="w-5 h-5 text-emerald-700" />
              Statement History Ledger
            </h3>
            <p className="text-xs text-slate-505 font-medium font-bold">Review your past contribution deposits, including both pending approvals and confirmed payouts.</p>
          </div>
          <div className="overflow-x-auto text-slate-800 font-medium">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                  <th className="p-3">Date</th>
                  <th className="p-3">Payment Channel</th>
                  <th className="p-3">Amount Deposited</th>
                  <th className="p-3">Days Marked</th>
                  <th className="p-3 text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 bg-white">
                {myTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">No previous deposit receipts found.</td>
                  </tr>
                ) : (
                  myTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-emerald-50/20 transition">
                      <td className="p-3 text-slate-555">{t.date}</td>
                      <td className="p-3 font-semibold text-slate-700">{t.payment_method}</td>
                      <td className="p-3 font-bold text-emerald-800">₦{t.amount.toLocaleString()}</td>
                      <td className="p-3">
                        {t.status === 'Successful' ? (
                          <span className="bg-amber-100 text-amber-955 font-black px-2 py-0.5 rounded">
                            Days {t.start_day} - {t.end_day} ({t.days_covered} Days)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-bold text-[10px]">Processing approval...</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase ${
                          t.status === 'Pending' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deposit Funds / Add Funds Tab */}
      {customerTab === 'deposit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-slate-800 font-bold font-bold">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold font-bold">
              <Coins className="w-5 h-5 text-emerald-700" />
              Add Savings Contribution
            </h3>
            <p className="text-xs text-slate-505 font-medium font-bold">Follow the steps below to fund your 32-day plan: </p>
            
            <div className="space-y-3 text-xs bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 leading-relaxed font-semibold">
              <p className="text-emerald-900 font-extrabold text-sm">Instructions:</p>
              <p>1. Copy the company bank account parameters shown in the adjacent widget.</p>
              <p>2. Select the specific bank you are transferring *from* below.</p>
              <p>3. Enter the exact transferred sum, then click "Complete Transaction".</p>
              <p>4. You will automatically be redirected to open your mobile banking app to finalize the transfer.</p>
            </div>

            <form onSubmit={handleAddFundsSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Transferred Amount (₦) *</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 10000"
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Payment Method / Channel *</label>
                <div className="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-xl text-emerald-900 font-extrabold text-xs">
                  Bank Transfer Only (Direct Transfer)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Transferring From (Your Bank) *</label>
                <select
                  required
                  value={selectedSenderBank}
                  onChange={(e) => setSelectedSenderBank(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm font-semibold"
                >
                  <option value="">-- Choose Your Bank --</option>
                  {nigerianBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Complete Transaction & Open App
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <Landmark className="w-5 h-5 text-emerald-700" />
                Company Banking Coordinates
              </h3>
              <p className="text-xs text-slate-505 font-medium font-bold">Transfer exact targets strictly to this verified account only:</p>
              
              <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-3xl space-y-3 text-xs leading-loose text-slate-800 shadow-inner font-bold">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Receiver Bank:</span>
                  <strong className="text-slate-900 text-sm font-bold">{supportDetails.admin_bank_name || 'Access Bank'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Account Number:</span>
                  <strong className="text-slate-900 text-lg tracking-widest block py-0.5 font-bold">{supportDetails.admin_account_number || '0123456789'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Account Name:</span>
                  <strong className="text-slate-900 text-sm font-bold">{supportDetails.admin_account_name || 'HireMercy Thrift Enterprises'}</strong>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-450 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 leading-relaxed font-bold font-bold">
              ⚠️ Warning: Do not transfer funds to any other account coordinates. Contact support instantly if you experience technical issues.
            </div>
          </div>
        </div>
      )}

      {/* Plan Settings Tab */}
      {customerTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in max-w-4xl mx-auto text-slate-800 font-bold">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Plan Settings Dashboard</h3>
              <p className="text-xs text-slate-550 mt-0.5 font-medium">Keep your details up to date and configure target pace constraints.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Phone Number Line *</label>
                <input 
                  type="text" 
                  required
                  value={custSettingsPhone}
                  onChange={(e) => setCustSettingsPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">Daily Contribution Target (₦) *</label>
                <input 
                  type="number"
                  disabled={!canChangeAmount}
                  min={300}
                  placeholder="Minimum ₦300"
                  value={custSettingsDailyAmount.toString()}
                  onChange={(e) => setCustSettingsDailyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400 font-bold"
                />

                {!canChangeAmount ? (
                  <span className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 block mt-2 font-medium leading-relaxed">
                    🔒 You can only modify your contribution plan once a calendar month. If you need to make urgent updates, please request Admin to grant permission.
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 block mt-1">Note: Modifying this changes the cost per split slot on your tracking card going forward (Minimum ₦300).</span>
                )}
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition shadow-md font-bold uppercase tracking-wide text-xs"
              >
                Update Settings & Targets
              </button>
            </form>
          </div>

          {/* Secure change password widget for Customers */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4 h-fit">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider font-bold">Change Account Password</h3>
            <p className="text-xs text-slate-555 font-medium">Update your password security. Passwords must be at least 6 characters.</p>
            
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 font-bold">New Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                />
              </div>
              <button 
                type="submit"
                disabled={isUpdatingPass}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition shadow-md font-bold uppercase tracking-wide text-xs font-bold"
              >
                {isUpdatingPass ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Form Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleWithdrawSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 border border-emerald-100 shadow-2xl space-y-4 text-slate-800 font-bold font-bold">
            <div className="flex justify-between items-center border-b border-emerald-50 pb-3">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Request Settlement Payout</h3>
              <button 
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-emerald-800">Select saved month(s) to cash out *</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-emerald-100 rounded-xl p-2">
                {uncollectedSavedMonths.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2">No uncollected saved months available.</p>
                ) : (
                  uncollectedSavedMonths.map(m => (
                    <label
                      key={m.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border border-emerald-50 hover:bg-emerald-50/40 cursor-pointer text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedMonthIds.includes(m.id)}
                          onChange={() => toggleMonthSelection(m.id)}
                          className="w-4 h-4 accent-emerald-700"
                        />
                        <span className="font-bold text-slate-700">{m.month_label}</span>
                      </span>
                      <span className="font-black text-emerald-800">₦{m.total_amount.toLocaleString()}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-semibold font-bold font-bold">
              <p>⚖️ Payout Calculations:</p>
              <p>• Selected Months: <strong>{selectedMonths.length}</strong></p>
              <p>• Total Accumulation: <strong>₦{selectedTotalAmount.toLocaleString()}</strong></p>
              <p>• Company Profit Deduction: <strong>- ₦{(selectedMonths.length * customer.daily_amount).toLocaleString()}</strong> ({selectedMonths.length} × 1 contribution day)</p>
              <p className="text-emerald-800 border-t border-amber-200 pt-1 text-xs">
                • Final Settlement: <strong>₦{expectedPayoutAmount.toLocaleString()}</strong>
              </p>
            </div>

            <div className="space-y-3 text-slate-800 font-bold">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Bank Name *</label>
                <select 
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs font-bold font-bold"
                >
                  <option value="">-- Choose Recipient Bank --</option>
                  {nigerianBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Account Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 0123456789"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1 font-bold">Account Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sarah Alabi"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold font-bold"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={selectedMonthIds.length === 0}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition duration-150 shadow-md mt-4"
            >
              Submit Settlement Request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 5. MAIN APPLICATION COMPONENT
// =========================================================================

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('hm_splash_shown'));
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live Database States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [markedDays, setMarkedDays] = useState<Record<string, MarkedDay[]>>({});
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [savedMonths, setSavedMonths] = useState<Record<string, SavedMonth[]>>({});
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryRecord[]>([]);
  const [cycleArchives, setCycleArchives] = useState<Record<string, any[]>>({});
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [supportDetails, setSupportDetails] = useState<SupportSettings>({
    id: 1,
    support_phone: '+234 803 461 2345',
    support_whatsapp: '+234 803 461 2345',
    support_email: 'support@hiremercy.com',
    advert_title: 'Cartoon characters safely collecting small daily contributions from customers and returning them back to you in bulk!',
    advert_description: 'Join the smart daily savings circle with HireMercyAJO.',
    advert_image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    advert_enabled: true
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [currentDayKey, setCurrentDayKey] = useState(getWATDateKey());

  // UI States
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'admin_setup'>('login');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallBanner, setShowIosInstallBanner] = useState(false);
  const [showInAppBrowserBanner, setShowInAppBrowserBanner] = useState(false);
  const [showAlarmBanner, setShowAlarmBanner] = useState(false);
  const [alarmMessage, setAlarmMessage] = useState<string>('');
  const [adminDashboardRoute, setAdminDashboardRoute] = useState<AdminTab | null>(null);
  const previousPendingIdsRef = useRef<string[]>([]);

  const hasAdmin = useMemo(() => {
    return profiles.some(p => p.role === 'Admin');
  }, [profiles]);

  // Auth Session state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        fetchCurrentUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        fetchCurrentUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // REALTIME SYNCHRONIZATION HOOK: Listens to all Postgres events & fallbacks to 3-second background polling
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const triggerSync = async () => {
      const latestUser = currentUserRef.current;
      if (!latestUser) return;
      try {
        await syncAllOperationalData(latestUser);
        await fetchPayoutRequests(latestUser);
        await fetchNotifications(latestUser);
        await fetchSavedMonths(latestUser);
        await fetchPayoutHistory(latestUser);
        await fetchCycleArchives(latestUser);
        await fetchLoans(latestUser);
        await fetchLoanRequests(latestUser);
        await fetchLoanHistory(latestUser);
      } catch (err) {
        console.error("Background sync failed:", err);
      }
    };

    // 1. Set up live Realtime postgres listeners for tables
    const channel = supabase.channel('schema-db-changes');

    const tableNames = ['transactions', 'marked_days', 'payout_requests', 'profiles', 'notifications', 'contributions', 'payout_history', 'cycle_archives', 'loans', 'loan_requests', 'loan_repayments', 'loan_history'] as const;
    const events = ['INSERT', 'UPDATE', 'DELETE'] as const;

    tableNames.forEach((table) => {
      events.forEach((event) => {
        channel.on('postgres_changes', { event, schema: 'public', table }, () => {
          console.debug('Realtime event received:', event, table);
          triggerSync();
        });
      });
    });

    channel.subscribe();

    // 2. Set up fallback background polling interval (every 3 seconds)
    const pollingTimer = setInterval(triggerSync, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingTimer);
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    fetchGlobalConfiguration();
  }, []);

  useEffect(() => {
    const syncDayKey = () => setCurrentDayKey(getWATDateKey());
    syncDayKey();
    const timer = window.setInterval(syncDayKey, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ua = window.navigator.userAgent || '';
    const isAlreadyInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isAlreadyInstalled) return;

    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

    // Real mobile Safari ALWAYS includes both "Version/X.X" and "Safari/" in
    // its user agent. In-app browsers (WhatsApp, Instagram, Facebook, etc.)
    // are built on the same underlying WebKit engine and often still include
    // "Safari/" as boilerplate, but they never set the "Version/" token -
    // that's set by Safari itself, not by WebKit. This is what catches
    // WhatsApp's iOS in-app browser specifically: it doesn't send a unique
    // app token the way FBAN/Instagram do, so without this check it was
    // silently misidentified as "real Safari" and shown instructions
    // ("Add to Home Screen") that don't actually work from inside an
    // in-app browser at all - which is very likely why install was failing
    // for exactly the customers who tapped a link shared via WhatsApp chat.
    const isIosInAppBrowser = isIos && !/Version\/[\d.]+.*Safari/i.test(ua);

    const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|WhatsApp/i.test(ua)
      || (ua.includes('wv') && /Android/i.test(ua)) // generic Android WebView signature (covers most in-app browsers incl. many WhatsApp builds)
      || isIosInAppBrowser;

    if (isInAppBrowser) {
      setShowInAppBrowserBanner(true);
    } else if (isIos) {
      // iOS never fires beforeinstallprompt - Apple provides no such API to any
      // website, on any browser. Manual "Add to Home Screen" is the only path.
      setShowIosInstallBanner(true);
    }
    // Otherwise (real Chrome/Edge/Samsung Internet on Android, desktop Chrome):
    // the existing beforeinstallprompt listener below handles it natively.
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null);
    }

    const firedToday: Record<string, string> = {};

    const getTodayKey = (hour: number) => {
      return `${new Date().toISOString().slice(0, 10)}-${hour}`;
    };

    const hasTransactionToday = () => {
      const today = new Date().toISOString().slice(0, 10);
      return transactions.some(tx => tx.date.startsWith(today));
    };

    const playAlarmSound = () => {
      try {
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.1;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 1.2);
      } catch (err) {
        console.warn('Alarm sound failed:', err);
      }
    };

    const showReminder = () => {
      const text = "Don't forget to contribute your AJO with HireMercyAJO thank you";
      setAlarmMessage(text);
      setShowAlarmBanner(true);
      triggerToast(text, 'success');
      playAlarmSound();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('HireMercyAJO Reminder', { body: text });
      }
    };

    const checkAlarms = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const rounded = hour * 60 + minute;
      const schedule = [600, 720, 840, 1080];
      const shouldAlarm = (timeKey: string) => {
        if (firedToday[timeKey] === timeKey) return false;
        firedToday[timeKey] = timeKey;
        return true;
      };

      schedule.forEach((target) => {
        if (rounded === target) {
          const hourKey = target / 60;
          const timeKey = getTodayKey(hourKey);
          if (target === 840 || target === 1080) {
            if (!hasTransactionToday() && shouldAlarm(timeKey)) {
              showReminder();
            }
          } else if (shouldAlarm(timeKey)) {
            showReminder();
          }
        }
      });
    };

    const timer = setInterval(checkAlarms, 30 * 1000);
    checkAlarms();

    return () => clearInterval(timer);
  }, [transactions]);

  const playNotificationSound = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = type === 'success' ? 'sine' : 'square';
      oscillator.frequency.value = type === 'success' ? 880 : 520;
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.45);
    } catch {
      // ignore browser audio issues
    }
  };

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    playNotificationSound(type);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!currentUser || currentUser.role === 'Customer') return;

    const pendingTransactions = transactions.filter(tx => tx.status === 'Pending');
    const pendingIds = pendingTransactions.map(tx => tx.id);
    const newPendingIds = pendingIds.filter(id => !previousPendingIdsRef.current.includes(id));

    if (newPendingIds.length > 0) {
      const transactionLabel = pendingTransactions.find(tx => tx.id === newPendingIds[0]);
      const senderName = transactionLabel?.customer_name || transactionLabel?.customer_id || 'a customer';
      triggerToast(`New pending contribution from ${senderName} needs admin review.`, 'success');
      setAdminDashboardRoute('transactions');
    }

    previousPendingIdsRef.current = pendingIds;
  }, [transactions, currentUser]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      triggerToast('Installation started. Welcome to HireMercyAJO!', 'success');
    } else {
      triggerToast('Install prompt dismissed.', 'error');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const fetchGlobalConfiguration = async () => {
    const { data: bData } = await supabase.from('branches').select('*');
    if (bData) setBranches(bData);

    const { data: pData } = await supabase.from('profiles').select('*');
    if (pData) {
      setProfiles(pData);
    }
    setHasCheckedAdmin(true);

    const { data: sData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (sData) setSupportDetails(sData);
  };

  const fetchCurrentUserProfile = async (userId: string) => {
    setIsLoading(true);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      triggerToast(`Database Error: ${error.message}`, 'error');
    }

    if (profile) {
      setCurrentUser(profile);
      await syncAllOperationalData(profile);
      await Promise.all([
        fetchNotifications(profile),
        fetchPayoutRequests(profile),
        fetchSavedMonths(profile),
        fetchPayoutHistory(profile),
        fetchCycleArchives(profile),
        fetchLoans(profile),
        fetchLoanRequests(profile),
        fetchLoanHistory(profile)
      ]);
    }
    setIsLoading(false);
  };

  // Supabase's PostgREST API caps any single response at 1000 rows by
  // default - a plain, unbounded select() on a table that's grown past
  // that silently returns only the first 1000, with no error. This loops
  // using .range() to fetch every page until exhausted, guaranteeing the
  // complete result set regardless of table size. This is what was
  // missing for marked_days: unlike transactions (safe to window by recent
  // date), we genuinely need every customer's current data regardless of
  // age, so pagination - not a date/row cutoff - is the correct fix here.
  const fetchAllRows = async (table: string, select: string) => {
    const pageSize = 1000;
    let allRows: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
      if (error) {
        console.error(`fetchAllRows(${table}) failed:`, error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < pageSize) break; // last page reached
      from += pageSize;
    }
    return allRows;
  };

  const syncAllOperationalData = async (userProfile: Profile) => {
    if (userProfile.role === 'Admin' || userProfile.role === 'Staff') {
      const [pData, { data: txData }, mData] = await Promise.all([
        fetchAllRows('profiles', 'id, name, phone, email, role, branch_id, daily_amount, is_active, created_at, last_amount_change_at, allow_anytime_change, admin_note'),
        // FIX: this table grows forever and was being fetched in FULL, with
        // no limit, on every single Admin page load - almost certainly the
        // main driver of the Supabase egress quota being exhausted.
        // Using a date filter (not a row-count limit) so the current
        // month's data - which Monthly Financial Summary depends on being
        // complete - is always fully included, while still bounding
        // unbounded growth from many months/years of accumulated history.
        // Older data is still permanently in the database; only how much
        // gets re-downloaded on every page load is limited.
        supabase.from('transactions').select('id, customer_id, amount, date, payment_method, days_covered, start_day, end_day, branch_id, status, created_at').gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }),
        fetchAllRows('marked_days', 'id, customer_id, day_number, amount, date, period_key, transaction_id')
      ]);
      if (pData && pData.length > 0) setProfiles(pData);
      if (txData) setTransactions(txData);
      if (mData && mData.length > 0) {
        const grouped: Record<string, MarkedDay[]> = {};
        mData.forEach((item: any) => {
          if (!grouped[item.customer_id]) grouped[item.customer_id] = [];
          grouped[item.customer_id].push({
            id: item.id,
            day_number: item.day_number,
            amount: item.amount,
            date: item.date,
            period_key: item.period_key,
            transaction_id: item.transaction_id
          });
        });
        setMarkedDays(grouped);
      }
    } else {
      const [{ data: txData }, { data: mData }] = await Promise.all([
        supabase.from('transactions').select('*').eq('customer_id', userProfile.id).order('created_at', { ascending: false }),
        supabase.from('marked_days').select('*').eq('customer_id', userProfile.id)
      ]);
      if (txData) setTransactions(txData);
      if (mData) {
        setMarkedDays({
          [userProfile.id]: mData.map((item: any) => ({
            id: item.id,
            day_number: item.day_number,
            amount: item.amount,
            date: item.date,
            period_key: item.period_key,
            transaction_id: item.transaction_id
          }))
        });
      }
    }
  };

  const fetchNotifications = async (userProfile: Profile) => {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    
    if (userProfile.role === 'Customer') {
      query = query.eq('user_id', userProfile.id);
    } else {
      query = query.is('user_id', null);
    }

    const { data } = await query;
    if (data) setNotifications(data);
  };

  // "Clear All Notifications" - deletes every notification currently visible
  // to this user (their own, if Customer; global/admin ones, if Admin/Staff).
  // Supabase stays the source of truth: this permanently deletes server-side
  // (backed by the DELETE policy scoped identically to the SELECT above), not
  // just a local/visual clear, so it stays cleared across devices too.
  const clearAllNotifications = async (userProfile: Profile) => {
    let query = supabase.from('notifications').delete();
    if (userProfile.role === 'Customer') {
      query = query.eq('user_id', userProfile.id);
    } else {
      query = query.is('user_id', null);
    }
    const { error } = await query;
    if (error) {
      triggerToast(`Failed to clear notifications: ${error.message}`, 'error');
      return;
    }
    setNotifications([]);
    triggerToast('Notifications cleared.', 'success');
  };

  const fetchPayoutRequests = async (userProfile: Profile) => {
    let query = supabase.from('payout_requests').select('*').order('created_at', { ascending: false });

    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }

    const { data } = await query;
    if (data) {
      const formatted: PayoutRequest[] = data.map(item => {
        const matchingProfile = profiles.find(p => p.id === item.customer_id);
        return {
          ...item,
          customer_name: matchingProfile ? matchingProfile.name : 'Customer'
        };
      });
      setPayoutRequests(formatted);
    }
  };

  // Loads the "contributions" ledger: frozen/saved 32-day months that a customer has
  // not yet been paid out for. Admin/Staff see every customer's saved months; a
  // Customer only sees their own.
  const fetchSavedMonths = async (userProfile: Profile) => {
    let query = supabase.from('contributions').select('*').order('created_at', { ascending: false });

    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Saved months fetch failed (has the `contributions` table been created?):', error.message);
      return;
    }

    if (data) {
      const grouped: Record<string, SavedMonth[]> = {};
      data.forEach((item: any) => {
        const matchingProfile = profiles.find(p => p.id === item.customer_id);
        if (!grouped[item.customer_id]) grouped[item.customer_id] = [];
        grouped[item.customer_id].push({
          ...item,
          customer_name: matchingProfile ? matchingProfile.name : 'Customer'
        });
      });
      setSavedMonths(grouped);
    }
  };

  // Loads the "payout_history" archive: completed/approved payout requests, along with
  // which saved month(s) they settled. Written to by handleApprovePayout below.
  const fetchPayoutHistory = async (userProfile: Profile) => {
    let query = supabase.from('payout_history').select('*').order('approved_at', { ascending: false });

    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Payout history fetch failed (has the `payout_history` table been created?):', error.message);
      return;
    }

    if (data) {
      const formatted: PayoutHistoryRecord[] = data.map((item: any) => {
        const matchingProfile = profiles.find(p => p.id === item.customer_id);
        return { ...item, customer_name: matchingProfile ? matchingProfile.name : 'Customer' };
      });
      setPayoutHistory(formatted);
    }
  };

  // Loads "cycle_archives" - your pre-existing table that records approved/paid-out
  // 32-day cycles (the source of the (Collected) badge in the history view). Read
  // defensively via select('*') since this table's exact columns weren't part of
  // the schema we've confirmed - pickField() below normalizes whatever shape it is.
  const fetchCycleArchives = async (userProfile: Profile) => {
    let query = supabase.from('cycle_archives').select('*');

    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('cycle_archives fetch failed (check the table/column names):', error.message);
      return;
    }

    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach((row: any) => {
        const cId = pickField(row, ['customer_id', 'customerId']);
        if (!cId) return;
        if (!grouped[cId]) grouped[cId] = [];
        grouped[cId].push(row);
      });
      setCycleArchives(grouped);
    }
  };

  const fetchLoanRequests = async (userProfile: Profile) => {
    let query = supabase.from('loan_requests').select('*').order('requested_at', { ascending: false });
    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('loan_requests fetch failed:', error.message);
      return;
    }
    if (data) setLoanRequests(data as LoanRequest[]);
  };

  const fetchLoans = async (userProfile: Profile) => {
    let query = supabase.from('loans').select('*').order('created_at', { ascending: false });
    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('loans fetch failed:', error.message);
      return;
    }
    if (data) setLoans(data as Loan[]);
  };

  const fetchLoanHistory = async (userProfile: Profile) => {
    let query = supabase.from('loan_history').select('*').order('created_at', { ascending: false });
    if (userProfile.role === 'Customer') {
      query = query.eq('customer_id', userProfile.id);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('loan_history fetch failed:', error.message);
      return;
    }
    if (data) setLoanHistory(data);
  };

  // Resets a customer's password directly to '123456' via a server-side
  // Edge Function - this can NEVER be done safely from client code, since it
  // requires the Supabase service role key, which must never be shipped to
  // the browser. See supabase/functions/admin-reset-password for the
  // function this calls.
  const handleResetPasswordToDefault = async (customerId: string) => {
    const target = profiles.find(p => p.id === customerId);
    if (!target) return;
    if (!window.confirm(`Reset ${target.name}'s password to "123456"? They should change it after logging in.`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { customerId }
      });
      if (error) throw error;
      triggerToast(`Password reset to 123456 for ${target.name}.`, 'success');
    } catch (err: any) {
      triggerToast(`Password reset failed: ${err.message || 'Edge Function not deployed yet'}`, 'error');
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUser || notifications.length === 0) return;
    
    if (currentUser.role === 'Customer') {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      }
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogin = async (phone: string, pass: string) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);

    const { error } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: pass
    });

    setIsLoading(false);
    if (error) {
      triggerToast(error.message, 'error');
    } else {
      triggerToast('Login successful!', 'success');
    }
  };

  const handleCreateAdmin = async (data: any) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(data.phone);
    const fallbackEmail = `${formattedPhone.replace(/\D/g, '')}@hiremercy.com`;

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: formattedPhone,
          role: 'Admin',
          daily_amount: 0,
          email: data.email || fallbackEmail
        }
      }
    });

    setIsLoading(false);
    if (error) {
      triggerToast(error.message, 'error');
    } else {
      triggerToast('Primary Admin account created successfully! You can now log in.', 'success');
      setAuthScreen('login');
      fetchGlobalConfiguration();
    }
  };

  const handleCreateBranch = async (name: string, address: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('branches')
      .insert([{ name, address }]);

    setIsLoading(false);
    if (error) {
      triggerToast(`Branch failed: ${error.message}`, 'error');
    } else {
      triggerToast('Branch successfully registered!', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Branch details update
  const handleUpdateBranch = async (id: string, name: string, address: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('branches')
      .update({ name, address })
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Branch details updated!', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Delete Branch
  const handleDeleteBranch = async (id: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Delete failed: ${error.message}`, 'error');
    } else {
      triggerToast('Branch removed successfully.', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Staff creation using phone number to bypass default email rate limit
  const handleCreateStaff = async (name: string, phone: string, email: string, branchId: string, password: string) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);
    const fallbackEmail = `${formattedPhone.replace(/\D/g, '')}@hiremercy.com`;

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: password,
      options: {
        data: {
          name,
          email: email || fallbackEmail,
          phone: formattedPhone,
          role: 'Staff',
          branch_id: branchId,
          daily_amount: 0
        }
      }
    });

    setIsLoading(false);
    if (error) {
      triggerToast(`Staff Onboarding Failed: ${error.message}`, 'error');
    } else {
      triggerToast('Staff registered successfully! They can log in using their phone and chosen password.', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Staff updates
  const handleUpdateStaff = async (id: string, name: string, phone: string, email: string, branchId: string) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);

    const { error } = await supabase
      .from('profiles')
      .update({ name, phone: formattedPhone, email, branch_id: branchId })
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Staff details updated successfully!', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Delete failed: ${error.message}`, 'error');
    } else {
      triggerToast('Staff profile removed from directory.', 'success');
      fetchGlobalConfiguration();
    }
  };

  const handleRegister = async (data: any) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(data.phone);
    const fallbackEmail = `${formattedPhone.replace(/\D/g, '')}@hiremercy.com`;

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: data.password || 'customer123',
      options: {
        data: {
          name: data.name,
          phone: formattedPhone,
          role: 'Customer',
          daily_amount: Number(data.daily_amount),
          branch_id: data.branch_id,
          is_active: true,
          email: data.email || fallbackEmail
        }
      }
    });

    setIsLoading(false);
    if (error) {
      triggerToast(error.message, 'error');
    } else {
      triggerToast('Customer registered successfully!', 'success');
      setAuthScreen('login');
      fetchGlobalConfiguration();
    }
  };

  const handleUpdateSupportDetails = async (
    phone: string,
    whatsapp: string,
    email: string,
    bankName: string,
    acctNum: string,
    acctName: string,
    advertTitle: string,
    advertDescription: string,
    advertImageUrl: string,
    advertEnabled: boolean,
    advertVideoUrl: string,
    themeBackgroundColor: string
  ) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        support_phone: phone,
        support_whatsapp: whatsapp,
        support_email: email,
        admin_bank_name: bankName,
        admin_account_number: acctNum,
        admin_account_name: acctName,
        advert_title: advertTitle,
        advert_description: advertDescription,
        advert_image_url: advertImageUrl,
        advert_enabled: advertEnabled,
        advert_video_url: advertVideoUrl,
        theme_background_color: themeBackgroundColor
      })
      .eq('id', 1);

    setIsLoading(false);
    if (error) {
      triggerToast(`Update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Support & Banking details updated successfully!', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Client-side Split Process (SIMPLIFIED: Direct marked_days insert has been removed 
  // because your PostgreSQL database trigger handles marked_days updates automatically!)
  const approveAndProcessSplit = async (tx: Transaction) => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

    // Simply update transaction status. Your database trigger automatically computes 
    // days_covered, start_day, end_day, and creates the marked_days rows.
    const { error: updateTxErr } = await supabase
      .from('transactions')
      .update({
        status: 'Successful',
        date: todayStr
      })
      .eq('id', tx.id);

    if (updateTxErr) {
      throw new Error(`Failed to update transaction status: ${updateTxErr.message}`);
    }
  };

  // NOTE: Freezing a completed 32-day cycle and rolling the remainder into
  // the next calendar month now happens ENTIRELY inside the database, as
  // part of the `split_transaction_fn()` trigger on `transactions` (see the
  // SQL migrations). That trigger runs synchronously within the same INSERT/
  // UPDATE, so by the time control returns to this client, the freeze +
  // rollover + correct month labeling has already happened server-side.
  //
  // A previous version of this file also tried to do this same freeze
  // client-side (a function called freezeCompletedMonth). That was a bug:
  // it re-derived "the current month" from today's real-world date instead
  // of the period actually being frozen, and it raced against the DB
  // trigger's own logic - which is exactly what caused a rolled-over month
  // to get mislabeled with the wrong name. It has been removed. The client
  // now does nothing but refetch state after a transaction; the database is
  // the only thing that ever writes to `contributions` or reassigns
  // `period_key`.
  const resyncAfterTransaction = async (userProfile: Profile, affectedCustomerId?: string) => {
    if ((userProfile.role === 'Admin' || userProfile.role === 'Staff') && affectedCustomerId) {
      const [{ data: freshTx }, { data: freshMarked }] = await Promise.all([
        supabase.from('transactions')
          .select('id, customer_id, amount, date, payment_method, days_covered, start_day, end_day, branch_id, status, created_at')
          .eq('customer_id', affectedCustomerId)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('marked_days')
          .select('id, customer_id, day_number, amount, date, period_key, transaction_id')
          .eq('customer_id', affectedCustomerId)
      ]);

      if (freshTx) {
        setTransactions(prev => {
          const others = prev.filter((t: any) => t.customer_id !== affectedCustomerId);
          const merged = [...freshTx, ...others];
          merged.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          return merged;
        });
      }
      if (freshMarked) {
        setMarkedDays(prev => ({
          ...prev,
          [affectedCustomerId]: freshMarked.map((item: any) => ({
            id: item.id,
            day_number: item.day_number,
            amount: item.amount,
            date: item.date,
            period_key: item.period_key,
            transaction_id: item.transaction_id
          }))
        }));
      }
    } else {
      await syncAllOperationalData(userProfile);
    }
    await fetchNotifications(userProfile);
    await fetchSavedMonths(userProfile);
    await fetchCycleArchives(userProfile);
    await fetchLoans(userProfile);
    await fetchLoanRequests(userProfile);
  };

  const createTransaction = async (customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Money', staffId: string) => {
    setIsLoading(true);
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

    const targetCustomer = profiles.find(p => p.id === customerId);
    const branchId = targetCustomer?.branch_id || null;

    // Directly insert the transaction with Successful status. 
    // The database trigger will automatically perform the splitting.
    const { data: newTx, error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id: customerId,
          amount: amount,
          payment_method: paymentMethod,
          staff_id: staffId === 'admin-id' ? null : staffId,
          status: 'Successful',
          date: todayStr,
          branch_id: branchId
        }
      ])
      .select('*')
      .single();

    setIsLoading(false);

    if (txError) {
      triggerToast(`Post Failed: ${txError.message}`, 'error');
      return;
    }

    if (newTx) {
      setTransactions(prev => [newTx, ...prev]);
    }

    triggerToast('Contribution successfully posted and split!', 'success');
    if (currentUser) {
      await resyncAfterTransaction(currentUser, customerId);
    }
  };

  const deleteTransaction = async (txId: string) => {
    setIsLoading(true);
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
      triggerToast('Transaction record not found.', 'error');
      setIsLoading(false);
      return;
    }

    if (tx.status === 'Successful' && tx.start_day && tx.end_day) {
      const { error: mdDelError } = await supabase
        .from('marked_days')
        .delete()
        .eq('customer_id', tx.customer_id)
        .gte('day_number', tx.start_day)
        .lte('day_number', tx.end_day);
      
      if (mdDelError) {
        triggerToast(`Failed to clear marked days: ${mdDelError.message}`, 'error');
        setIsLoading(false);
        return;
      }
    }

    const { error: txDelError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    setIsLoading(false);
    if (txDelError) {
      triggerToast(`Deletion Failed: ${txDelError.message}`, 'error');
    } else {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      if (tx && tx.status === 'Successful') {
        setMarkedDays(prev => {
          const existing = prev[tx.customer_id] || [];
          return {
            ...prev,
            [tx.customer_id]: existing.filter(day => day.day_number < tx.start_day || day.day_number > tx.end_day)
          };
        });
      }
      triggerToast('Transaction removed. Allocated dates unmarked.', 'success');
      if (currentUser) {
        syncAllOperationalData(currentUser);
        fetchNotifications(currentUser);
      }
    }
  };

  // WORKFLOW 2: Customer selects one or more of their uncollected "Saved" months
  // (checkboxes in the withdrawal modal) and submits a single payout request
  // covering just those months.
  const handleCreatePayoutRequest = async (bank: string, acctNum: string, acctName: string, contributionIds: string[]) => {
    if (!currentUser) return;
    if (!contributionIds || contributionIds.length === 0) {
      triggerToast('Select at least one saved month to request a payout for.', 'error');
      return;
    }
    setIsLoading(true);

    const eligibleMonths = (savedMonths[currentUser.id] || []).filter(
      m => contributionIds.includes(m.id) && m.status === 'saved'
    );

    if (eligibleMonths.length === 0) {
      setIsLoading(false);
      triggerToast('Selected month(s) are no longer available for payout.', 'error');
      return;
    }

    const totalAmount = sumCurrencyValues(eligibleMonths.map(m => m.total_amount));
    // Company fee: 1 contribution day deducted per saved month included in this request
    const payoutAmount = Math.max(0, totalAmount - eligibleMonths.length * currentUser.daily_amount);
    const monthPaidText = eligibleMonths.map(m => m.month_label).join(', ');

    const payoutPayload: any = {
      customer_id: currentUser.id,
      account_name: acctName,
      account_number: acctNum,
      bank_name: bank,
      amount: totalAmount,
      payout_amount: payoutAmount,
      status: 'Pending',
      month_paid: monthPaidText,
      contribution_ids: contributionIds
    };

    let { data: newRequest, error } = await supabase
      .from('payout_requests')
      .insert([payoutPayload])
      .select('*')
      .single();

    if (error && /month_pay|month_paid|contribution_ids/i.test(error.message)) {
      const { data: retryRequest, error: retryError } = await supabase
        .from('payout_requests')
        .insert([
          {
            ...payoutPayload,
            month_paid: undefined,
            contribution_ids: undefined
          }
        ])
        .select('*')
        .single();
      newRequest = retryRequest;
      error = retryError;
    }

    if (error) {
      setIsLoading(false);
      triggerToast(`Request failed: ${error.message}`, 'error');
      return;
    }

    // Mark the selected saved months as "Requested" so they can't be double-submitted
    // while this request is pending admin review.
    await supabase.from('contributions').update({ status: 'requested' }).in('id', contributionIds);
    setSavedMonths(prev => ({
      ...prev,
      [currentUser.id]: (prev[currentUser.id] || []).map(m =>
        contributionIds.includes(m.id) ? { ...m, status: 'requested' } : m
      )
    }));

    setIsLoading(false);
    if (newRequest) {
      setPayoutRequests(prev => [{ ...newRequest, contribution_ids: contributionIds }, ...prev]);
    }

    try {
      await supabase.from('notifications').insert([{
        user_id: null,
        title: 'New withdrawal request',
        message: `${currentUser.name} requested a payout of ₦${payoutAmount.toLocaleString()} (${eligibleMonths.length} saved month${eligibleMonths.length > 1 ? 's' : ''}) to ${bank}.`,
        is_read: false
      }]);
    } catch (notificationError) {
      console.warn('Admin notification failed:', notificationError);
    }

    setAdminDashboardRoute('payouts');
    triggerToast('Withdrawal settlement request submitted to Admin!', 'success');
  };

  // WORKFLOW 3 (Admin "Approve & Payout"): move the saved month(s) attached to this
  // request out of the active `contributions` ledger and archive them into
  // `payout_history`, then mark the request itself Successful.
  const handleApprovePayout = async (reqId: string) => {
    setIsLoading(true);

    const req = payoutRequests.find(r => r.id === reqId);
    if (!req) {
      setIsLoading(false);
      return;
    }

    const contributionIds = req.contribution_ids && req.contribution_ids.length > 0
      ? req.contribution_ids
      : (savedMonths[req.customer_id] || []).filter(m => m.status === 'requested').map(m => m.id);

    const settledMonths = (savedMonths[req.customer_id] || []).filter(m => contributionIds.includes(m.id));

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({ status: 'Successful', processed_at: new Date().toISOString() })
      .eq('id', reqId);

    if (updateError) {
      triggerToast(`Approval failed: ${updateError.message}`, 'error');
      setIsLoading(false);
      return;
    }

    if (contributionIds.length > 0) {
      // Archive each settled saved month into payout_history...
      const archiveRows = (settledMonths.length > 0 ? settledMonths : contributionIds.map(id => ({ id }))).map((m: any) => ({
        customer_id: req.customer_id,
        contribution_id: m.id,
        payout_request_id: reqId,
        month_label: m.month_label || req.month_paid || getNigerianMonthName(),
        total_amount: m.total_amount ?? req.amount,
        payout_amount: m.total_amount != null
          ? Math.max(0, m.total_amount - (profiles.find(p => p.id === req.customer_id)?.daily_amount || 0))
          : req.payout_amount,
        bank_name: req.bank_name,
        account_number: req.account_number,
        account_name: req.account_name,
        approved_at: new Date().toISOString()
      }));

      const { error: archiveError } = await supabase.from('payout_history').insert(archiveRows);
      if (archiveError) {
        console.warn('Failed to write payout_history archive:', archiveError.message);
      }

      // ...then remove those settled records from the active/saved ledger.
      const { error: deleteError } = await supabase.from('contributions').delete().in('id', contributionIds);
      if (deleteError) {
        console.warn('Failed to clear contributions ledger:', deleteError.message);
      }

      setSavedMonths(prev => ({
        ...prev,
        [req.customer_id]: (prev[req.customer_id] || []).filter(m => !contributionIds.includes(m.id))
      }));
    }

    setPayoutRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Successful' } : r));

    try {
      await supabase.from('notifications').insert([{
        user_id: req.customer_id,
        title: 'Withdrawal approved',
        message: `Your payout request for ₦${req.payout_amount.toLocaleString()} has been approved.`,
        is_read: false
      }]);
    } catch (notificationError) {
      console.warn('Customer notification failed:', notificationError);
    }

    playNotificationSound('success');
    setIsLoading(false);
    triggerToast('Payout approved! Settled month(s) archived to payout history.', 'success');

    if (currentUser) {
      syncAllOperationalData(currentUser);
      fetchPayoutRequests(currentUser);
      fetchSavedMonths(currentUser);
      fetchPayoutHistory(currentUser);
    }
  };

  const handleApproveWithdrawal = async (reqId: string) => {
    await handleApprovePayout(reqId);
  };

  const handleRejectPayout = async (reqId: string) => {
    setIsLoading(true);

    const req = payoutRequests.find(r => r.id === reqId);
    if (!req) {
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({ status: 'Rejected', processed_at: new Date().toISOString() })
      .eq('id', reqId);

    setIsLoading(false);

    if (updateError) {
      triggerToast(`Reject failed: ${updateError.message}`, 'error');
      return;
    }

    setPayoutRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Rejected' } : r));

    // Release the saved month(s) back onto the active ledger so the customer can request again
    const releaseIds = req.contribution_ids && req.contribution_ids.length > 0
      ? req.contribution_ids
      : (savedMonths[req.customer_id] || []).filter(m => m.status === 'requested').map(m => m.id);

    if (releaseIds.length > 0) {
      await supabase.from('contributions').update({ status: 'saved' }).in('id', releaseIds);
      setSavedMonths(prev => ({
        ...prev,
        [req.customer_id]: (prev[req.customer_id] || []).map(m =>
          releaseIds.includes(m.id) ? { ...m, status: 'saved' } : m
        )
      }));
    }

    try {
      await supabase.from('notifications').insert([{
        user_id: req.customer_id,
        title: 'Withdrawal rejected',
        message: `Your payout request for ₦${req.payout_amount.toLocaleString()} was rejected by admin.`,
        is_read: false
      }]);
    } catch (notificationError) {
      console.warn('Customer rejection notification failed:', notificationError);
    }
    triggerToast('Withdrawal request rejected.', 'error');
  };

  // Deletes the customer's Auth account via an Edge Function (requires the
  // service role key, which must never be shipped to the browser - see
  // supabase/functions/admin-delete-customer). profiles_id_fkey has
  // ON DELETE CASCADE from auth.users, so this also removes their profile
  // and everything that cascades from it (transactions, loans, etc.) in
  // one clean operation - and critically, frees their phone/email for
  // re-registration, which a plain profiles-row delete never did.
  const handleDeleteCustomer = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-customer', {
        body: { customerId: id }
      });
      if (error) throw error;
      triggerToast('Customer account deleted successfully.', 'success');
      fetchGlobalConfiguration();
    } catch (err: any) {
      triggerToast(`Delete failed: ${err.message || 'Edge Function not deployed yet'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCustomer = async (id: string, name: string, phone: string, email: string, dailyAmount: number, branchId: string, allowAnytimeChange: boolean) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        name, 
        phone: formattedPhone, 
        email, 
        daily_amount: Number(dailyAmount), 
        branch_id: branchId,
        allow_anytime_change: allowAnytimeChange
      })
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Customer updated successfully!', 'success');
      fetchGlobalConfiguration();
    }
  };

  const handleToggleCustomerActive = async (id: string, is_active: boolean) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Status change failed: ${error.message}`, 'error');
    } else {
      triggerToast(is_active ? 'Customer activated.' : 'Customer suspended.', 'success');
      fetchGlobalConfiguration();
    }
  };

  const handleUpdateLoanStatus = async (id: string, loan_status: 'No Loan' | 'Pending Approval' | 'Active Loan' | 'Loan Cleared') => {
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ loan_status })
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Loan status update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Loan status updated.', 'success');
      fetchGlobalConfiguration();
    }
  };

  // Customer-initiated loan request. Blocked (both here and by the button
  // being disabled in the UI) if the customer already has an Active Loan
  // or a request already Pending Approval. A customer whose prior loan
  // reached 'Loan Cleared' CAN request again, per the business rule that
  // only blocks active/pending loans, not completed ones.
  const handleRequestLoan = async (customerId: string) => {
    const customer = profiles.find(p => p.id === customerId);
    if (!customer) return;
    if (customer.loan_status === 'Active Loan' || customer.loan_status === 'Pending Approval') {
      triggerToast('You already have an active or pending loan.', 'error');
      return;
    }
    if (!customer.is_active) {
      triggerToast('Your account must be active to request a loan.', 'error');
      return;
    }

    const { maxLoan, repaymentAmount, serviceCharge } = computeLoanEligibility(customer.daily_amount);
    setIsLoading(true);

    const { error: reqError } = await supabase.from('loan_requests').insert([{
      customer_id: customerId,
      daily_amount_snapshot: customer.daily_amount,
      loan_amount: maxLoan,
      repayment_amount: repaymentAmount,
      service_charge: serviceCharge,
      status: 'Pending Approval'
    }]);

    if (reqError) {
      setIsLoading(false);
      triggerToast(`Loan request failed: ${reqError.message}`, 'error');
      return;
    }

    await supabase.from('profiles').update({ loan_status: 'Pending Approval' }).eq('id', customerId);
    await supabase.from('loan_history').insert([{
      customer_id: customerId, event_type: 'Requested', loan_amount: maxLoan, repayment_amount: repaymentAmount
    }]);

    setIsLoading(false);
    triggerToast('Loan request submitted successfully.', 'success');
    await fetchLoanRequests(customer);
    await fetchGlobalConfiguration();
  };

  // Approves a pending customer loan request, creating the real loans row.
  // Produces the exact same loans-row shape as handleAssignLoan below, per
  // the spec's requirement that both methods behave identically thereafter.
  // Shared by both loan-creation paths (customer-request approval and
  // direct admin assignment). Reads the customer's CURRENT marked_days
  // fresh from the DB (not stale client state) and credits whatever days
  // are already complete toward the new loan, so repayment never restarts
  // from Day 1. Retroactively logs one loan_repayments row per already-
  // completed day (tagged with that day's real period_key) so that when
  // freeze_period() eventually processes that period, it correctly
  // recognizes it as a loan repayment cycle - see the DB migration comment
  // on freeze_period for why this is necessary. Returns the values the
  // caller should use in its own loans-row insert.
  const computeRetroactiveLoanCredit = async (customerId: string, loanId: string, repaymentAmount: number) => {
    const { data: currentMarkedDays } = await supabase
      .from('marked_days')
      .select('id, transaction_id, day_number, amount, period_key')
      .eq('customer_id', customerId);

    const rows = currentMarkedDays || [];
    const amountAlreadyCounted = Math.min(
      sumCurrencyValues(rows.map(r => r.amount)),
      repaymentAmount
    );
    const daysAlreadyCounted = rows.length;

    if (rows.length > 0) {
      await supabase.from('loan_repayments').insert(
        rows.map(r => ({
          loan_id: loanId,
          customer_id: customerId,
          transaction_id: r.transaction_id,
          day_number: r.day_number,
          amount: r.amount,
          period_key: r.period_key
        }))
      );
    }

    return { amountAlreadyCounted, daysAlreadyCounted };
  };

  const handleApproveLoanRequest = async (requestId: string) => {
    if (!currentUser) return;
    const request = loanRequests.find(r => r.id === requestId);
    if (!request) return;

    setIsLoading(true);
    const today = new Date();
    const newLoanId = crypto.randomUUID();

    const { amountAlreadyCounted, daysAlreadyCounted } = await computeRetroactiveLoanCredit(
      request.customer_id, newLoanId, request.repayment_amount
    );
    const remainingAfterCredit = Math.max(0, request.repayment_amount - amountAlreadyCounted);
    const clearedImmediately = remainingAfterCredit <= 0;

    const { error: loanError } = await supabase.from('loans').insert([{
      id: newLoanId,
      customer_id: request.customer_id,
      status: clearedImmediately ? 'Loan Cleared' : 'Active Loan',
      loan_amount: request.loan_amount,
      repayment_amount: request.repayment_amount,
      service_charge: request.service_charge,
      daily_amount_snapshot: request.daily_amount_snapshot,
      outstanding_balance: remainingAfterCredit,
      amount_already_counted: amountAlreadyCounted,
      amount_repaid: amountAlreadyCounted,
      amount_remaining: remainingAfterCredit,
      days_repaid: daysAlreadyCounted,
      total_days: 32,
      approved_by: currentUser.id,
      source: 'customer_request',
      loan_request_id: request.id,
      date_issued: today.toISOString().slice(0, 10),
      completed_at: clearedImmediately ? new Date().toISOString() : null
    }]);

    if (loanError) {
      setIsLoading(false);
      triggerToast(`Loan approval failed: ${loanError.message}`, 'error');
      return;
    }

    await supabase.from('loan_requests').update({
      status: 'Approved', decided_at: new Date().toISOString(), decided_by: currentUser.id
    }).eq('id', requestId);
    await supabase.from('profiles').update({ loan_status: clearedImmediately ? 'Loan Cleared' : 'Active Loan' }).eq('id', request.customer_id);
    await supabase.from('loan_history').insert([{
      loan_id: newLoanId, customer_id: request.customer_id, event_type: 'Approved',
      loan_amount: request.loan_amount, repayment_amount: request.repayment_amount, performed_by: currentUser.id
    }]);
    if (clearedImmediately) {
      await supabase.from('loan_history').insert([{
        loan_id: newLoanId, customer_id: request.customer_id, event_type: 'Completed',
        loan_amount: request.loan_amount, repayment_amount: request.repayment_amount, performed_by: currentUser.id
      }]);
    }

    setIsLoading(false);
    triggerToast('Loan approved and disbursed.', 'success');
    await fetchLoanRequests(currentUser);
    await fetchLoans(currentUser);
    await fetchGlobalConfiguration();
  };

  const handleRejectLoanRequest = async (requestId: string, reason: string) => {
    if (!currentUser) return;
    const request = loanRequests.find(r => r.id === requestId);
    if (!request) return;

    setIsLoading(true);
    const { error } = await supabase.from('loan_requests').update({
      status: 'Rejected', decided_at: new Date().toISOString(), decided_by: currentUser.id, rejection_reason: reason
    }).eq('id', requestId);

    if (error) {
      setIsLoading(false);
      triggerToast(`Rejection failed: ${error.message}`, 'error');
      return;
    }

    await supabase.from('profiles').update({ loan_status: 'No Loan' }).eq('id', request.customer_id);
    await supabase.from('loan_history').insert([{
      customer_id: request.customer_id, event_type: 'Rejected',
      loan_amount: request.loan_amount, repayment_amount: request.repayment_amount, performed_by: currentUser.id
    }]);

    setIsLoading(false);
    triggerToast('Loan request rejected.', 'success');
    await fetchLoanRequests(currentUser);
    await fetchGlobalConfiguration();
  };

  // Admin direct assignment - for customers who don't use the app
  // themselves. Produces the identical loans-row shape as approving a
  // customer request above. Admin may reduce the disbursed amount below
  // the maximum eligible; the fixed 2-day service charge (daily x 2) is
  // preserved on top of whatever amount is actually disbursed, so
  // repayment_amount = approvedAmount + serviceCharge. This design choice
  // - keeping the service charge fixed rather than scaling proportionally
  // - is the most direct generalization of the stated formula and is worth
  // confirming matches intent if a reduced amount is ever actually used.
  const handleAssignLoan = async (customerId: string, approvedAmount: number, remarks: string, disbursementDate: string) => {
    if (!currentUser) return;
    const customer = profiles.find(p => p.id === customerId);
    if (!customer) return;
    if (customer.loan_status === 'Active Loan' || customer.loan_status === 'Pending Approval') {
      triggerToast('This customer already has an active or pending loan.', 'error');
      return;
    }

    const { serviceCharge } = computeLoanEligibility(customer.daily_amount);
    const repaymentAmount = sumCurrencyValues([approvedAmount + serviceCharge]);
    const issuedDate = disbursementDate || new Date().toISOString().slice(0, 10);
    const newLoanId = crypto.randomUUID();

    setIsLoading(true);
    const { amountAlreadyCounted, daysAlreadyCounted } = await computeRetroactiveLoanCredit(
      customerId, newLoanId, repaymentAmount
    );
    const remainingAfterCredit = Math.max(0, repaymentAmount - amountAlreadyCounted);
    const clearedImmediately = remainingAfterCredit <= 0;

    const { error: loanError } = await supabase.from('loans').insert([{
      id: newLoanId,
      customer_id: customerId,
      status: clearedImmediately ? 'Loan Cleared' : 'Active Loan',
      loan_amount: approvedAmount,
      repayment_amount: repaymentAmount,
      service_charge: serviceCharge,
      daily_amount_snapshot: customer.daily_amount,
      outstanding_balance: remainingAfterCredit,
      amount_already_counted: amountAlreadyCounted,
      amount_repaid: amountAlreadyCounted,
      amount_remaining: remainingAfterCredit,
      days_repaid: daysAlreadyCounted,
      total_days: 32,
      approved_by: currentUser.id,
      remarks,
      source: 'admin_assigned',
      date_issued: issuedDate,
      completed_at: clearedImmediately ? new Date().toISOString() : null
    }]);

    if (loanError) {
      setIsLoading(false);
      triggerToast(`Loan assignment failed: ${loanError.message}`, 'error');
      return;
    }

    await supabase.from('profiles').update({ loan_status: clearedImmediately ? 'Loan Cleared' : 'Active Loan' }).eq('id', customerId);
    await supabase.from('loan_history').insert([{
      loan_id: newLoanId, customer_id: customerId, event_type: 'Assigned',
      loan_amount: approvedAmount, repayment_amount: repaymentAmount, performed_by: currentUser.id
    }]);
    if (clearedImmediately) {
      await supabase.from('loan_history').insert([{
        loan_id: newLoanId, customer_id: customerId, event_type: 'Completed',
        loan_amount: approvedAmount, repayment_amount: repaymentAmount, performed_by: currentUser.id
      }]);
    }

    setIsLoading(false);
    triggerToast('Loan assigned successfully.', 'success');
    await fetchLoans(currentUser);
    await fetchGlobalConfiguration();
  };

  // FIX: this used to unconditionally delete ALL of a customer's marked_days
  // AND their entire transactions history, based only on their active/
  // running cycle total - with no connection to `contributions` at all. That
  // meant clicking this could wipe a customer's balance without ever
  // archiving anything, and without touching their actual uncollected saved
  // months. It's rewritten to be a same-day shortcut for exactly what the
  // real Approve & Payout flow does: archive uncollected `contributions`
  // into `payout_history` and remove them from the active ledger. It no
  // longer ever touches marked_days or transactions.
  const handleTriggerManualPayout = async (customerId: string, method: 'Transfer' | 'Cash', bank: string, acctNum: string, acctName: string) => {
    setIsLoading(true);

    const targetCustomer = profiles.find(p => p.id === customerId);
    if (!targetCustomer) {
      triggerToast('Customer not found.', 'error');
      setIsLoading(false);
      return;
    }

    const uncollectedMonths = (savedMonths[customerId] || []).filter(
      m => m.status === 'saved' || m.status === 'requested'
    );

    // Payout rule change: previously, a payout could only be triggered once
    // at least one full 32-day cycle had frozen into savedMonths. Admin can
    // now pay out at any time. If there's no fully-completed month, pay out
    // whatever is currently marked (marked_days) instead, then clear those
    // days afterward so the tracker and balance stay correct post-payout -
    // exactly like a normal completed-cycle payout clears its saved month.
    // The original completed-cycle path below is otherwise unchanged.
    const runningDays = markedDays[customerId] || [];
    const isPartialPayout = uncollectedMonths.length === 0 && runningDays.length > 0;

    if (uncollectedMonths.length === 0 && runningDays.length === 0) {
      triggerToast('This customer has no contributions to pay out.', 'error');
      setIsLoading(false);
      return;
    }

    const contributionIds = uncollectedMonths.map(m => m.id);
    const totalAmount = isPartialPayout
      ? sumCurrencyValues(runningDays.map(d => d.amount))
      : sumCurrencyValues(uncollectedMonths.map(m => m.total_amount));
    const feeCount = isPartialPayout ? 1 : uncollectedMonths.length;
    const payoutAmount = Math.max(0, totalAmount - feeCount * targetCustomer.daily_amount);
    const monthPaidText = isPartialPayout
      ? `${getNigerianMonthName()} (early payout - ${runningDays.length}/32 days)`
      : uncollectedMonths.map(m => m.month_label).join(', ');

    const payoutPayload: any = {
      customer_id: customerId,
      account_name: method === 'Cash' ? null : acctName,
      account_number: method === 'Cash' ? null : acctNum,
      bank_name: method === 'Cash' ? null : bank,
      payout_method: method,
      amount: totalAmount,
      payout_amount: payoutAmount,
      status: 'Successful',
      month_paid: monthPaidText,
      contribution_ids: contributionIds,
      processed_at: new Date().toISOString()
    };

    let { data: newRequest, error: insertError } = await supabase
      .from('payout_requests')
      .insert([payoutPayload])
      .select('*')
      .single();

    if (insertError && /month_pay|month_paid|contribution_ids/i.test(insertError.message)) {
      const { data: retryRequest, error: retryError } = await supabase
        .from('payout_requests')
        .insert([{ ...payoutPayload, month_paid: undefined, contribution_ids: undefined }])
        .select('*')
        .single();
      newRequest = retryRequest;
      insertError = retryError;
    }

    if (insertError) {
      triggerToast(`Payout trigger failed: ${insertError.message}`, 'error');
      setIsLoading(false);
      return;
    }

    if (isPartialPayout) {
      const { error: archiveError } = await supabase.from('payout_history').insert([{
        customer_id: customerId,
        payout_request_id: newRequest?.id,
        month_label: monthPaidText,
        total_amount: totalAmount,
        payout_amount: payoutAmount,
        bank_name: method === 'Cash' ? null : bank,
        account_number: method === 'Cash' ? null : acctNum,
        account_name: method === 'Cash' ? null : acctName,
        payout_method: method,
        approved_at: new Date().toISOString()
      }]);
      if (archiveError) {
        console.warn('Failed to write payout_history archive:', archiveError.message);
      }

      const dayIds = runningDays.map(d => d.id).filter(Boolean) as string[];
      if (dayIds.length > 0) {
        const { error: deleteError } = await supabase.from('marked_days').delete().in('id', dayIds);
        if (deleteError) {
          console.warn('Failed to clear paid-out marked days:', deleteError.message);
        }
      }

      setMarkedDays(prev => ({ ...prev, [customerId]: [] }));
    } else {
      // Archive each settled month into payout_history, same as the real
      // Approve & Payout flow, then remove them from the active ledger.
      const archiveRows = uncollectedMonths.map(m => ({
        customer_id: customerId,
        contribution_id: m.id,
        payout_request_id: newRequest?.id,
        month_label: m.month_label,
        total_amount: m.total_amount,
        payout_amount: Math.max(0, m.total_amount - targetCustomer.daily_amount),
        bank_name: method === 'Cash' ? null : bank,
        account_number: method === 'Cash' ? null : acctNum,
        account_name: method === 'Cash' ? null : acctName,
        payout_method: method,
        approved_at: new Date().toISOString()
      }));

      const { error: archiveError } = await supabase.from('payout_history').insert(archiveRows);
      if (archiveError) {
        console.warn('Failed to write payout_history archive:', archiveError.message);
      }

      const { error: deleteError } = await supabase.from('contributions').delete().in('id', contributionIds);
      if (deleteError) {
        console.warn('Failed to clear contributions ledger:', deleteError.message);
      }

      setSavedMonths(prev => ({
        ...prev,
        [customerId]: (prev[customerId] || []).filter(m => !contributionIds.includes(m.id))
      }));
    }
    if (newRequest) {
      setPayoutRequests(prev => [newRequest, ...prev]);
    }

    setIsLoading(false);
    triggerToast(`Payout triggered! ₦${payoutAmount.toLocaleString()} ${isPartialPayout ? '(early payout)' : `across ${uncollectedMonths.length} month(s)`} archived.`, 'success');

    if (currentUser) {
      await fetchPayoutRequests(currentUser);
      await fetchSavedMonths(currentUser);
      await fetchCycleArchives(currentUser);
    }
  };

  const handleAddCustomerPendingTransaction = async (amount: number, method: 'Cash' | 'Bank Transfer' | 'Mobile Money') => {
    if (!currentUser) return;
    setIsLoading(true);
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

    const { data: pendingTx, error } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id: currentUser.id,
          amount: amount,
          payment_method: method,
          status: 'Pending',
          date: todayStr,
          branch_id: currentUser.branch_id,
          days_covered: 0,
          start_day: 0,
          end_day: 0
        }
      ])
      .select('*')
      .single();

    setIsLoading(false);
    if (error) {
      triggerToast(`Deposit submission failed: ${error.message}`, 'error');
    } else {
      if (pendingTx) {
        setTransactions(prev => [pendingTx, ...prev]);
      }
      triggerToast('Deposit details submitted! Awaiting Admin confirmation.', 'success');
      syncAllOperationalData(currentUser);
    }
  };

  const handleUpdateCustomerSettings = async (phone: string, dailyAmount: number) => {
    if (!currentUser) return;
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);
    
    const updateData: any = { phone: formattedPhone };
    
    if (dailyAmount !== currentUser.daily_amount) {
      updateData.daily_amount = Number(dailyAmount);
      updateData.last_amount_change_at = new Date().toISOString();
      updateData.allow_anytime_change = false; // consume anytime permission
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', currentUser.id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Settings update failed: ${error.message}`, 'error');
    } else {
      setCurrentUser(prev => prev ? { ...prev, ...updateData } : prev);
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...updateData } : p));
      triggerToast('Your profile settings have been updated!', 'success');
      fetchCurrentUserProfile(currentUser.id);
    }
  };

  const handleApproveTransaction = async (txId: string) => {
    setIsLoading(true);
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
      triggerToast('Transaction record not found.', 'error');
      setIsLoading(false);
      return;
    }

    try {
      await approveAndProcessSplit(tx);
      playNotificationSound('success');
      triggerToast('Deposit confirmed! Days successfully marked on tracking card.', 'success');
      if (currentUser) {
        await resyncAfterTransaction(currentUser, tx.customer_id);
      }
    } catch (err: any) {
      triggerToast(`Approval split logic failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  const todaysTransactionCount = useMemo(() => {
    return transactions.filter(tx => tx.date === currentDayKey && tx.status === 'Successful').length;
  }, [transactions, currentDayKey]);

  if (showSplash) {
    return <WelcomeScreen onComplete={() => { sessionStorage.setItem('hm_splash_shown', '1'); setShowSplash(false); }} />;
  }

  return (
    <div className="min-h-screen bg-emerald-50/40 text-slate-800 antialiased font-sans">
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-700 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Install HireMercy AJO</h4>
              <p className="text-[11px] text-emerald-100 mt-1">Add this app to your home screen for faster access and offline support.</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition"
              >
                Install Now
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="text-emerald-300 hover:text-white px-2 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {showInAppBrowserBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-700 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Can't Install From Here</h4>
              <p className="text-[11px] text-emerald-100 mt-1 leading-relaxed">
                You opened this link inside WhatsApp/Facebook/Instagram, which blocks app installation.
                Tap the <strong>⋮</strong> or <strong>•••</strong> menu at the top right and choose
                <strong> "Open in Browser"</strong> (Chrome or Safari), then try installing again from there.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInAppBrowserBanner(false)}
              className="text-emerald-300 hover:text-white px-2 text-xs flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showIosInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-700 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Install on iPhone/iPad</h4>
              <p className="text-[11px] text-emerald-100 mt-1 leading-relaxed">
                Tap the <strong>Share</strong> icon (square with an arrow) in Safari's toolbar, then scroll down and
                select <strong>"Add to Home Screen"</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIosInstallBanner(false)}
              className="text-emerald-300 hover:text-white px-2 text-xs flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {showAlarmBanner && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-amber-500 text-emerald-950 p-4 rounded-2xl shadow-2xl border border-amber-400 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider">HireMercyAJO Reminder</p>
              <p className="text-[12px] mt-1">{alarmMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAlarmBanner(false)}
              className="text-emerald-950 bg-white/90 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Toast Alert System */}
      {notification && (
        <div className={`fixed left-1/2 top-4 z-[80] flex max-w-xl -translate-x-1/2 items-start gap-3 rounded-3xl border px-5 py-4 shadow-2xl backdrop-blur-sm animate-bounce ${
          notification.type === 'success'
            ? 'border-emerald-300 bg-emerald-900 text-white'
            : 'border-red-300 bg-red-900 text-white'
        }`}>
          <div className={`rounded-full p-2 ${notification.type === 'success' ? 'bg-emerald-700' : 'bg-red-700'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em]">{notification.type === 'success' ? 'Notification' : 'Action needed'}</p>
            <p className="mt-1 text-sm font-semibold">{notification.text}</p>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-955 text-white shadow-md py-4 px-6 border-b-4 border-amber-505 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-300 to-emerald-900 shadow-2xl border border-emerald-700">
              <span className="text-lg font-extrabold uppercase tracking-[0.35em] text-white">HI</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider">
                HireMercy<span className="text-amber-400">AJO</span>
              </h1>
              <p className="text-xs text-emerald-100">Intelligent 32-Day Savings Management</p>
            </div>
          </div>
          
          {currentUser ? (
            <div className="flex items-center gap-4">
              {/* Notification Bell Panel Dropdown */}
              <div className="relative">
                {currentUser.role !== 'Customer' && transactions.some(tx => tx.status === 'Pending') && (
                  <button
                    type="button"
                    onClick={() => setAdminDashboardRoute('transactions')}
                    className="mr-2 rounded-xl border border-amber-400/60 bg-amber-500/90 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-950 shadow-sm transition hover:bg-amber-400"
                  >
                    {transactions.filter(tx => tx.status === 'Pending').length} pending
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) handleMarkNotificationsRead();
                  }}
                  className="p-2 bg-emerald-900 hover:bg-emerald-800 rounded-xl text-amber-400 relative transition duration-150"
                  title="Notifications & Activity Logs"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-505 text-emerald-955 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-emerald-900">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="ml-3 px-3 py-2 rounded-xl bg-amber-500 text-emerald-950 font-bold text-xs uppercase tracking-[0.08em] hover:bg-amber-600 transition"
                  >
                    Install App
                  </button>
                )}

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-emerald-100 py-3 text-slate-800 z-50 animate-fade-in-down">
                    <div className="px-4 pb-2 border-b border-emerald-50 flex justify-between items-center">
                      <span className="font-extrabold text-xs text-emerald-955 uppercase tracking-wider">
                        {currentUser.role === 'Customer' ? 'My Notifications' : 'Audit Activity Alerts'}
                      </span>
                      <div className="flex items-center gap-2.5">
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Clear all notifications? This cannot be undone.')) {
                                clearAllNotifications(currentUser);
                              }
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                          >
                            Clear All
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => setShowNotifications(false)} 
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-emerald-50 text-xs">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">No activity alerts logged.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3.5 transition duration-150 hover:bg-emerald-50/20 ${!n.is_read && currentUser.role === 'Customer' ? 'bg-amber-50/30' : ''}`}>
                            <p className="font-bold text-emerald-955 mb-0.5">{n.title}</p>
                            <p className="text-slate-655 text-[11px] leading-relaxed mb-1">{n.message}</p>
                            <span className="text-[9px] text-slate-400">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-white">{currentUser.name}</p>
                <span className="text-[10px] bg-amber-505 text-emerald-955 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest font-bold">
                  {currentUser.role}
                </span>
              </div>
              
              <button 
                onClick={handleLogout} 
                className="p-2 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 rounded-lg text-amber-400 hover:text-amber-300 transition duration-150"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <span className="text-xs bg-emerald-900/40 text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" />
              Live Supabase Integration Active
            </span>
          )}
        </div>
      </header>

      {/* Main workspace */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <AdvertisementBanner details={supportDetails} />
        {isLoading && (
          <div className="text-center py-6 text-emerald-800 font-bold animate-pulse font-bold">
            Processing database sync request...
          </div>
        )}

        {!currentUser ? (
          authScreen === 'admin_setup' ? (
            <AdminSetupScreen onCreate={handleCreateAdmin} />
          ) : authScreen === 'login' ? (
            <LoginScreen 
              onLogin={handleLogin} 
              onSwitch={() => setAuthScreen('register')} 
            />
          ) : (
            <RegisterScreen 
              onBack={() => setAuthScreen('login')} 
              onRegister={handleRegister} 
              branches={branches}
            />
          )
        ) : (
          <div className="space-y-8">
            {currentUser.role === 'Admin' && (
              <AdminDashboard 
                profiles={profiles} 
                branches={branches} 
                transactions={transactions} 
                markedDays={markedDays} 
                supportDetails={supportDetails}
                payoutRequests={payoutRequests}
                savedMonths={savedMonths}
                payoutHistory={payoutHistory}
                withdrawalRequests={withdrawalRequests}
                triggerToast={triggerToast}
                onResetPasswordToDefault={handleResetPasswordToDefault}
                onDeleteTransaction={deleteTransaction}
                onAddTransaction={createTransaction}
                onUpdateSupport={handleUpdateSupportDetails}
                onApprovePayout={handleApprovePayout}
                onRejectPayout={handleRejectPayout}
                onCreateBranch={handleCreateBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onCreateStaff={handleCreateStaff}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
                onRegisterCustomer={handleRegister}
                onDeleteCustomer={handleDeleteCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onToggleCustomerActive={handleToggleCustomerActive}
                onUpdateLoanStatus={handleUpdateLoanStatus}
                loans={loans}
                loanRequests={loanRequests}
                loanHistory={loanHistory}
                onApproveLoanRequest={handleApproveLoanRequest}
                onRejectLoanRequest={handleRejectLoanRequest}
                onAssignLoan={handleAssignLoan}
                onTriggerManualPayout={handleTriggerManualPayout}
                onApproveTransaction={handleApproveTransaction}
                onApproveWithdrawal={handleApproveWithdrawal}
                routeTarget={adminDashboardRoute}
                onRouteHandled={() => setAdminDashboardRoute(null)}
              />
            )}
            {currentUser.role === 'Staff' && (
              <StaffDashboard 
                profiles={profiles} 
                transactions={transactions} 
                markedDays={markedDays} 
                staffProfile={currentUser}
                supportDetails={supportDetails}
                branches={branches}
                onAddTransaction={createTransaction}
                onRegisterCustomer={handleRegister}
              />
            )}
            {currentUser.role === 'Customer' && (
              <CustomerDashboard 
                customer={currentUser} 
                transactions={transactions} 
                markedDays={markedDays[currentUser.id] || []}
                supportDetails={supportDetails}
                payoutRequests={payoutRequests}
                savedMonths={savedMonths[currentUser.id] || []}
                cycleArchives={cycleArchives[currentUser.id] || []}
                onAddPayoutRequest={handleCreatePayoutRequest}
                onAddCustomerPendingTransaction={handleAddCustomerPendingTransaction}
                onUpdateCustomerSettings={handleUpdateCustomerSettings}
                activeLoan={loans.find(l => l.customer_id === currentUser.id && l.status === 'Active Loan') || null}
                myLoans={loans.filter(l => l.customer_id === currentUser.id)}
                myLoanRequests={loanRequests.filter(r => r.customer_id === currentUser.id)}
                onRequestLoan={handleRequestLoan}
                profiles={profiles}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
