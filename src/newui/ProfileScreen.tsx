import React from 'react';
import {
  User as UserIcon, Phone, Mail, PiggyBank, Wallet, Users, Gift, Receipt, ShieldCheck, LogOut, ChevronRight, Headphones
} from 'lucide-react';
import type { Profile, Transaction, SupportSettings } from '../App';
import { Card, Pill, SectionTitle, naira, whatsappUrl } from './ui';
import type { SectionKey } from './config';
import { useLiveFlags } from './liveFlags';
import type { DashboardLite } from './useReferralDashboard';

function Row({ icon: Icon, label, value, onClick, tone = 'green' }: {
  icon: any; label: string; value?: React.ReactNode; onClick?: () => void; tone?: 'green' | 'red';
}) {
  const body = (
    <>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0 flex-1 text-left">
        <p className={`text-xs font-bold ${tone === 'red' ? 'text-red-600' : 'text-slate-800'}`}>{label}</p>
        {value != null && <p className="text-[11px] text-slate-500 font-medium break-words">{value}</p>}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="w-full flex items-center gap-3 py-3 hover:bg-slate-50 rounded-xl px-1">{body}</button>
    : <div className="flex items-center gap-3 py-3 px-1">{body}</div>;
}

/**
 * Profile hub. Read-only summary of real records; editing and password change stay in the
 * existing Settings screen so account handling is not duplicated.
 */
export function ProfileScreen({
  customer, dash, myTransactions, supportDetails, onTab, onSection, onLogout
}: {
  customer: Profile;
  dash: DashboardLite | null;
  myTransactions: Transaction[];
  supportDetails: SupportSettings;
  onTab: (tab: string) => void;
  onSection: (s: SectionKey) => void;
  onLogout?: () => void;
}) {
  const live = useLiveFlags();
  const initials = (customer.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const bonus = Number(dash?.welcome_bonus_amount || 0);
  const successful = myTransactions.filter(t => t.status !== 'Pending').length;

  return (
    <div className="space-y-4 fade-in max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600 text-white shadow-md p-5">
        <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950 text-xl font-black flex items-center justify-center ring-4 ring-white/30 shrink-0">{initials}</span>
          <div className="min-w-0">
            <h2 className="text-xl font-black truncate">{customer.name}</h2>
            <p className="text-xs text-emerald-100 font-medium truncate">{customer.phone}</p>
            <div className="mt-1.5 flex gap-1.5">
              <Pill tone={customer.is_active ? 'green' : 'red'}>{customer.is_active ? 'Active' : 'Inactive'}</Pill>
              {customer.referral_code && <Pill tone="gold">{customer.referral_code}</Pill>}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <SectionTitle>Personal information</SectionTitle>
        <div className="divide-y divide-slate-100">
          <Row icon={UserIcon} label="Full name" value={customer.name} />
          <Row icon={Phone} label="Phone number" value={customer.phone} />
          <Row icon={Mail} label="Email" value={customer.email || 'Not added yet'} />
          <Row icon={ShieldCheck} label="Edit details & change password" value="Opens your account settings" onClick={() => onTab('settings')} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Contribution</SectionTitle>
        <div className="divide-y divide-slate-100">
          <Row icon={PiggyBank} label="Daily contribution" value={`${naira(customer.daily_amount)} per day`} />
          <Row icon={PiggyBank} label="Savings type" value={customer.savings_type} />
          <Row icon={PiggyBank} label="Loan status" value={customer.loan_status} />
          <Row icon={PiggyBank} label="Open my Ajo tracker" onClick={() => onSection('ajo')} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Wallet</SectionTitle>
        <Row icon={Wallet} label="Wallet" value={live.wallet ? `Active - ${naira(live.balance)} (separate from Ajo savings)` : 'Not active yet - kept separate from Ajo savings'} onClick={() => onSection('wallet')} />
      </Card>

      <Card>
        <SectionTitle>Referrals & rewards</SectionTitle>
        <div className="divide-y divide-slate-100">
          <Row icon={Users} label="Referral details"
            value={`${Number(dash?.total_referred || 0)} referred · ${Number(dash?.successful_referrals || 0)} qualified · ${naira(dash?.total_earnings)} earned`}
            onClick={() => onSection('referrals')} />
          <Row icon={Gift} label="Reward history"
            value={`${Number(dash?.points || 0).toLocaleString()} points${bonus > 0 ? ` · ${naira(bonus)} welcome bonus (non-withdrawable)` : ''}`}
            onClick={() => onSection('rewards')} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Transactions</SectionTitle>
        <Row icon={Receipt} label="Transaction history" value={`${successful} successful contribution${successful === 1 ? '' : 's'} recorded`} onClick={() => onTab('transactions')} />
      </Card>

      <Card>
        <SectionTitle>Help & security</SectionTitle>
        <div className="divide-y divide-slate-100">
          <Row icon={Headphones} label="Contact support" value={supportDetails.support_phone || undefined}
            onClick={() => {
              const url = whatsappUrl(supportDetails.support_whatsapp, `Hello HireMercyAJO, I need help. My name is ${customer.name}.`);
              if (url) window.open(url, '_blank', 'noopener,noreferrer');
            }} />
          {onLogout && <Row icon={LogOut} label="Log out" tone="red" onClick={onLogout} />}
        </div>
      </Card>
    </div>
  );
}
