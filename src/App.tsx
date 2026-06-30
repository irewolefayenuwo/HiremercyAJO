import React, { useState, useEffect, useMemo } from 'react';
import { 
  PiggyBank, Phone, Lock, EyeOff, Eye as EyeIcon, Mail, User as UserIcon, 
  ChevronLeft, LayoutDashboard, Users, Plus, Search, Trash2, Calendar, 
  CheckCircle2, XCircle, LogOut, Shield, Briefcase, Landmark, Info, Key,
  Bell, Settings, HelpCircle, MessageSquare, Building2, UserPlus, Coins, Clock, FileText, Edit2
} from 'lucide-react';
import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './lib/supabase'; // Connected to Supabase client path

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
  day_number: number;
  amount: number;
  date: string;
}

export interface SupportSettings {
  id: number;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  admin_bank_name?: string;
  admin_account_number?: string;
  admin_account_name?: string;
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
  account_name: string;
  account_number: string;
  bank_name: string;
  amount: number;
  payout_amount: number;
  status: 'Pending' | 'Successful' | 'Rejected';
  created_at: string;
  month_paid?: string;
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

const nigerianBanks = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Keystone Bank', 'Moniepoint',
  'OPay', 'PalmPay', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Union Bank of Nigeria',
  'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank', 'Zenith Bank'
];

// =========================================================================
// 1. ISOLATED SUBCOMPONENTS
// =========================================================================

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-amber-400 to-amber-505 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
          <PiggyBank className="w-14 h-14 text-emerald-955" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-widest">HIREMERCY AJO</h1>
        <p className="text-emerald-300 font-semibold tracking-wider uppercase text-xs">Continuous Daily Target Thrift Tracker</p>
        <div className="w-24 h-1 bg-amber-505 mx-auto rounded-full mt-4" />
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
    onCreate({ name, email, phone, password });
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

      <form onSubmit={handleSubmit} className="p-8 space-y-4">
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
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Email Address *</label>
          <input 
            type="email" 
            required
            placeholder="admin@hiremercy.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
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
          className="w-full bg-amber-505 hover:bg-amber-606 text-emerald-955 font-black py-3 rounded-xl transition duration-150 shadow-md mt-4"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;
    onLogin(phone.trim(), password);
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 text-center">
        <h2 className="text-2xl font-extrabold">Welcome back to HireMercyAJO</h2>
        <p className="text-xs text-emerald-200 mt-1">Authenticate with your phone number and password to access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Phone Number</label>
          <input 
            type="text" 
            required
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-505 bg-emerald-50/20 text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Accepts local formats (e.g. 080...) or international (+234...)</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-505 bg-emerald-50/20 text-sm pr-10"
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
    if (!name || !phone || !password || !email) return;
    onRegister({ name, email, phone, password, daily_amount: dailyAmount, branch_id: branchId });
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

      <form onSubmit={handleSubmit} className="p-8 space-y-4">
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
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Email Address *</label>
          <input 
            type="email" 
            required
            placeholder="chinedu@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Password *</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              placeholder="•••••••• (Customer chosen password)"
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
          <select 
            value={dailyAmount} 
            onChange={(e) => setDailyAmount(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl bg-white text-sm"
          >
            <option value="500">₦500 / Day</option>
            <option value="1000">₦1,000 / Day</option>
            <option value="2000">₦2,000 / Day</option>
            <option value="5000">₦5,000 / Day</option>
            <option value="10000">₦10,000 / Day</option>
          </select>
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
          className="w-full bg-amber-505 hover:bg-amber-606 text-emerald-955 font-black py-3 rounded-xl transition duration-150 shadow-md mt-6"
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
            className="bg-amber-505 h-full rounded-full transition-all duration-500"
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
        <p className="text-[10px] text-slate-505 mt-0.5">Contact direct support channels managed by HireMercy administration.</p>
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

// =========================================================================
// 2. ADMIN DASHBOARD COMPONENT
// =========================================================================

function AdminDashboard({ 
  profiles, branches, transactions, markedDays, supportDetails, payoutRequests, onApprovePayout, onCreateBranch, onUpdateBranch, onDeleteBranch, onCreateStaff, onUpdateStaff, onDeleteStaff, onRegisterCustomer,
  onDeleteTransaction, onAddTransaction, onUpdateSupport, onDeleteCustomer, onUpdateCustomer, onToggleCustomerActive, onTriggerManualPayout, onApproveTransaction
}: { 
  profiles: Profile[], branches: Branch[], transactions: Transaction[], markedDays: Record<string, MarkedDay[]>, supportDetails: SupportSettings, payoutRequests: PayoutRequest[], onDeleteTransaction: (id: string) => void, onAddTransaction: (cId: string, amt: number, method: any, sId: string) => void, onUpdateSupport: (phone: string, whatsapp: string, email: string, bankName: string, acctNum: string, acctName: string) => void, onApprovePayout: (reqId: string) => void, onCreateBranch: (name: string, address: string) => void, onUpdateBranch: (id: string, name: string, address: string) => void, onDeleteBranch: (id: string) => void, onCreateStaff: (name: string, phone: string, email: string, branchId: string, password: string) => void, onUpdateStaff: (id: string, name: string, phone: string, email: string, branchId: string) => void, onDeleteStaff: (id: string) => void, onRegisterCustomer: (data: any) => void,
  onDeleteCustomer: (id: string) => void, onUpdateCustomer: (id: string, name: string, phone: string, email: string, dailyAmount: number, branchId: string, allowAnytimeChange: boolean) => void, onToggleCustomerActive: (id: string, is_active: boolean) => void, onTriggerManualPayout: (customerId: string, bank: string, acctNum: string, acctName: string) => void, onApproveTransaction: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'branches' | 'staff' | 'payouts' | 'records' | 'transactions' | 'settings'>('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Cash');

  // Filter and Editing states
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);

  // Manual Payout states
  const [manualPayoutCustomerId, setManualPayoutCustomerId] = useState('');
  const [manualBankName, setManualBankName] = useState('');
  const [manualAccountNumber, setManualAccountNumber] = useState('');
  const [manualAccountName, setManualAccountName] = useState('');

  // Today's Contribution Drilldown State
  const [showTodayDrilldown, setShowTodayDrilldown] = useState(false);
  const [showCollectionDrilldown, setShowCollectionDrilldown] = useState(false);

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

  // Customer registration state inside admin panel [1]
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

  useEffect(() => {
    setSupportPhone(supportDetails.support_phone);
    setSupportWhatsapp(supportDetails.support_whatsapp);
    setSupportEmail(supportDetails.support_email);
    setAdminBankName(supportDetails.admin_bank_name || 'Access Bank');
    setAdminAccountNumber(supportDetails.admin_account_number || '0123456789');
    setAdminAccountName(supportDetails.admin_account_name || 'HireMercy Thrift Enterprises');
  }, [supportDetails]);

  const customers = profiles.filter(p => p.role === 'Customer');
  const staff = profiles.filter(p => p.role === 'Staff');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (selectedBranchFilter === '') return true;
      return c.branch_id === selectedBranchFilter;
    });
  }, [customers, selectedBranchFilter]);

  const stats = useMemo(() => {
    // Current calendar Month metrics
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlyCollection = monthlyTransactions.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate Today's Contribution [4]
    const todayString = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === todayString);
    const todayCollected = todayTransactions.reduce((acc, curr) => acc + curr.amount, 0);

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
      branchTotals[bId] = (branchTotals[bId] || 0) + t.amount;
      methodTotals[t.payment_method] = (methodTotals[t.payment_method] || 0) + t.amount;
    });

    return { branchTotals, methodTotals };
  }, [stats.todayTransactions, branches]);

  // Group today's contributions by branch and payment method [4]
  const todayDrilldownData = useMemo(() => {
    const branchTotals: Record<string, number> = {};
    const methodTotals: Record<string, number> = { 'Cash': 0, 'Bank Transfer': 0, 'Mobile Money': 0 };

    branches.forEach(b => {
      branchTotals[b.id] = 0;
    });
    branchTotals['unknown'] = 0;

    stats.todayTransactions.forEach(t => {
      const bId = t.branch_id || 'unknown';
      branchTotals[bId] = (branchTotals[bId] || 0) + t.amount;
      methodTotals[t.payment_method] = (methodTotals[t.payment_method] || 0) + t.amount;
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
    onUpdateSupport(supportPhone, supportWhatsapp, supportEmail, adminBankName, adminAccountNumber, adminAccountName);
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
    onRegisterCustomer({
      name: custName,
      phone: custPhone,
      email: custEmail || `${custPhone}@hiremercy.com`,
      password: custPassword,
      daily_amount: custDailyAmount,
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
    if (!manualPayoutCustomerId || !manualBankName || !manualAccountNumber || !manualAccountName) return;
    onTriggerManualPayout(manualPayoutCustomerId, manualBankName, manualAccountNumber, manualAccountName);
    setManualPayoutCustomerId('');
    setManualBankName('');
    setManualAccountNumber('');
    setManualAccountName('');
  };

  const manualPayoutCalculation = useMemo(() => {
    if (!manualPayoutCustomerId) return null;
    const target = customers.find(c => c.id === manualPayoutCustomerId);
    if (!target) return null;
    const totalDays = (markedDays[manualPayoutCustomerId] || []).length;
    const totalAmount = totalDays * target.daily_amount;
    const payoutAmount = totalDays > 1 ? (totalDays - 1) * target.daily_amount : 0;
    return {
      totalDays,
      totalAmount,
      payoutAmount,
      target
    };
  }, [manualPayoutCustomerId, markedDays, customers]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'Pending');
  }, [transactions]);

  const successfulTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'Successful');
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-955 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-700" />
            Admin Command Centre
          </h2>
          <p className="text-xs text-slate-505">Global oversight of savings collections, active balances, and auditing logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['overview', 'customers', 'branches', 'staff', 'payouts', 'records', 'transactions', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition ${
                activeTab === tab 
                  ? 'bg-emerald-700 text-white shadow-md' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Clickable Total Cycle Collection (Monthly Resetting Card) */}
        <button 
          onClick={() => setShowCollectionDrilldown(true)}
          className="bg-white p-6 rounded-3xl border-2 border-emerald-200 hover:border-emerald-300 text-left transition duration-150 flex items-center gap-4 focus:outline-none w-full animate-fade-in"
        >
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-505 uppercase font-black">Monthly Cycle Collection</p>
            <p className="text-xl font-black text-slate-900">₦{stats.monthlyCollection.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-800 font-bold underline mt-0.5">Click for details & reset history</p>
          </div>
        </button>

        {/* Today's Contribution Card (Clickable) [4] */}
        <button 
          onClick={() => setShowTodayDrilldown(true)}
          className="bg-white p-6 rounded-3xl border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/20 text-left transition duration-150 flex items-center gap-4 focus:outline-none w-full"
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
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-505 uppercase font-black">Authorized Field Agents</p>
            <p className="text-xl font-black text-slate-900">{stats.totalStaff}</p>
          </div>
        </div>
      </div>

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
                      <span className="font-semibold">{b.name}</span>
                      <span className="font-bold">₦{(monthlyDrilldownData.branchTotals[b.id] || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-505">Unassigned Branch</span>
                    <span className="font-bold">₦{(monthlyDrilldownData.branchTotals['unknown'] || 0).toLocaleString()}</span>
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

      {/* Today's Contribution Drilldown Modal [4] */}
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
                <h4 className="font-extrabold text-emerald-900 mb-2 uppercase tracking-wide">Sum by Branches</h4>
                <div className="space-y-2">
                  {branches.map(b => (
                    <div key={b.id} className="flex justify-between p-2.5 bg-emerald-50/20 rounded-xl">
                      <span className="font-semibold">{b.name}</span>
                      <span className="font-bold">₦{(todayDrilldownData.branchTotals[b.id] || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-505">Unassigned Branch</span>
                    <span className="font-bold">₦{(todayDrilldownData.branchTotals['unknown'] || 0).toLocaleString()}</span>
                  </div>
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
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider">Post Contribution</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Select Customer</label>
                <select 
                  required
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="">-- Choose Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₦{c.daily_amount.toLocaleString()}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Deposit Amount (₦)</label>
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
                <label className="block text-xs font-black text-emerald-800 mb-1">Payment Channel</label>
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
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Dynamic 32-Day Saver Preview</h3>
            
            {selectedCustomerId ? (
              (() => {
                const cust = customers.find(c => c.id === selectedCustomerId);
                if (!cust) return <p className="text-xs text-slate-400">Select a customer to view their tracking grid.</p>;
                return (
                  <div className="p-6 bg-emerald-50/20 border-2 border-emerald-200 rounded-2xl space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-emerald-955 text-base">{cust.name}</h4>
                        <p className="text-[11px] text-slate-550">Contact: {cust.phone} | Target Plan: ₦{cust.daily_amount.toLocaleString()}/day</p>
                      </div>
                      <div>
                        <span className="text-xs bg-amber-500 text-emerald-955 font-black px-3 py-1 rounded-full uppercase tracking-wider">
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
                <p className="text-xs text-slate-400 px-4">Please select a customer in the dropdown or click one below to preview their 32-day tracking grid:</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto p-2">
                  {customers.map(c => (
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

      {/* Admin registering customer directly [1] */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
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
                <select 
                  value={custDailyAmount} 
                  onChange={(e) => setCustDailyAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs"
                >
                  <option value="500">₦500 / Day</option>
                  <option value="1000">₦1,000 / Day</option>
                  <option value="2000">₦2,000 / Day</option>
                  <option value="5000">₦5,000 / Day</option>
                </select>
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
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm shadow-md">
                Register Customer
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 h-fit">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Customer Directory</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-emerald-800">Filter Branch:</span>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-emerald-200 rounded-lg bg-white"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone number</th>
                    <th className="p-3">Daily Target</th>
                    <th className="p-3">Status</th>
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
                      <tr key={c.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 font-bold text-slate-800">{c.name}</td>
                        <td className="p-3 text-slate-600">{c.phone}</td>
                        <td className="p-3 font-semibold">₦{c.daily_amount.toLocaleString()}</td>
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
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                            {marked.length} / 32
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-800">₦{totalContributed.toLocaleString()}</td>
                        <td className="p-3 text-right flex justify-end gap-1.5">
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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
          </div>
        </div>
      )}

      {/* Editing Customer Dialog Modal */}
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

            <div className="space-y-3 text-xs">
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
                <select 
                  value={editingCustomer.daily_amount.toString()}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, daily_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white"
                >
                  <option value="500">₦500 / Day</option>
                  <option value="1000">₦1,000 / Day</option>
                  <option value="2000">₦2,000 / Day</option>
                  <option value="5000">₦5,000 / Day</option>
                </select>
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
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-505 border-emerald-300"
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

      {/* Branch Management (With Editing & Deletion) [2] */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider flex items-center gap-1.5">
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
            <div className="overflow-x-auto">
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
                    branches.map(b => (
                      <tr key={b.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 font-bold text-slate-800">{b.name}</td>
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Staff Management (With Editing & Deletion) [2] */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider flex items-center gap-1.5">
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
                <label className="block text-xs font-bold text-emerald-800 mb-1">Assign Home Branch *</label>
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
            <div className="overflow-x-auto">
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
                      <td colSpan={5} className="p-4 text-center text-slate-400">No field agents onboarded yet.</td>
                    </tr>
                  ) : (
                    staff.map(s => (
                      <tr key={s.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 font-bold text-slate-800">{s.name}</td>
                        <td className="p-3 text-slate-600">{s.phone}</td>
                        <td className="p-3 text-slate-505">{s.email || 'N/A'}</td>
                        <td className="p-3 text-emerald-800 font-bold">
                          {branches.find(b => b.id === s.branch_id)?.name || 'N/A'}
                        </td>
                        <td className="p-3 text-right flex justify-end gap-1.5">
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Payouts Control with Manual Triggers [3] */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trigger manual payout form */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
              <h3 className="text-md font-black text-emerald-955 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-emerald-700" />
                Trigger Manual Payout
              </h3>
              <p className="text-[10px] text-slate-400 mb-4">Payout directly resets active splits. Deduction parameters calculate automatically.</p>

              <form onSubmit={handleTriggerManualPayoutSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-black text-emerald-800 mb-1">Select Customer</label>
                  <select 
                    required
                    value={manualPayoutCustomerId}
                    onChange={(e) => setManualPayoutCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white"
                  >
                    <option value="">-- Choose Account --</option>
                    {customers.map(c => {
                      const daysMarked = (markedDays[c.id] || []).length;
                      return (
                        <option key={c.id} value={c.id} disabled={daysMarked === 0}>
                          {c.name} ({daysMarked} days - ₦{(daysMarked * c.daily_amount).toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {manualPayoutCalculation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[10px] text-amber-900 space-y-1 font-semibold leading-relaxed">
                    <p>Accrued Days: {manualPayoutCalculation.totalDays}</p>
                    <p>Initial Accumulation: ₦{manualPayoutCalculation.totalAmount.toLocaleString()}</p>
                    <p>Company Fee (1 Day): - ₦{manualPayoutCalculation.target.daily_amount.toLocaleString()}</p>
                    <p className="text-emerald-800 border-t border-amber-200 pt-1 font-black">
                      Expected Payout: ₦{manualPayoutCalculation.payoutAmount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-emerald-800 mb-1">Bank Name *</label>
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
                  <label className="block text-xs font-black text-emerald-800 mb-1">Account Number *</label>
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
                  <label className="block text-xs font-black text-emerald-800 mb-1">Account Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe"
                    value={manualAccountName}
                    onChange={(e) => setManualAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={!manualPayoutCalculation || manualPayoutCalculation.payoutAmount === 0}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition shadow-md"
                >
                  Trigger Payout & Clear Cycle
                </button>
              </form>
            </div>

            {/* Customer Payout logs table */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Customer Withdrawal Logs</h3>
                <p className="text-xs text-slate-505">1-day company fee is deducted automatically when calculating the payout amount [3].</p>
              </div>
              <div className="overflow-x-auto">
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
                        <td colSpan={8} className="p-4 text-center text-slate-400">No previous payout logs.</td>
                      </tr>
                    ) : (
                      payoutRequests.map(h => (
                        <tr key={h.id}>
                          <td className="p-3 text-slate-505">
                            {new Date(h.created_at).toLocaleDateString()}
                            <span className="block text-[9px] text-slate-400">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            {h.customer_name || 'System Customer'}
                          </td>
                          <td className="p-3 text-slate-600">
                            <strong className="block text-slate-700">{h.account_name}</strong>
                            {h.bank_name} • {h.account_number}
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
                              <button 
                                type="button"
                                onClick={() => onApprovePayout(h.id)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg transition text-[10px] whitespace-nowrap"
                              >
                                Approve & Reset Cycle
                              </button>
                            )}
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

      {/* Record Sheet [2] */}
      {activeTab === 'records' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in space-y-6">
          <div>
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-emerald-700" />
              Settlement Records Sheet
            </h3>
            <p className="text-xs text-slate-505">View active contributors who are yet to withdraw and completed cycles.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-extrabold text-amber-800 text-xs uppercase mb-3 flex items-center gap-1">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 bg-white">
                    {recordSheet.yetToWithdraw.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400">No active savers yet.</td>
                      </tr>
                    ) : (
                      recordSheet.yetToWithdraw.map(c => {
                        const markedCount = (markedDays[c.id] || []).length;
                        const balance = markedCount * c.daily_amount;
                        return (
                          <tr key={c.id}>
                            <td className="p-3 font-bold text-slate-800">{c.name}</td>
                            <td className="p-3">₦{c.daily_amount.toLocaleString()}/day</td>
                            <td className="p-3">{markedCount} / 32</td>
                            <td className="p-3 text-right font-bold text-emerald-800">₦{balance.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-emerald-900 text-xs uppercase mb-3 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Settled Savers (Paid Out Logs)
              </h4>
              <div className="overflow-x-auto border border-emerald-100 rounded-2xl">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-900 font-extrabold border-b border-emerald-200">
                      <th className="p-3">Customer</th>
                      <th className="p-3">Cleared Period</th>
                      <th className="p-3">Cleared Sum</th>
                      <th className="p-3 font-semibold text-emerald-800">Payout Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 bg-white">
                    {recordSheet.completedPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400">No previous payouts completed.</td>
                      </tr>
                    ) : (
                      recordSheet.completedPayouts.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-bold text-slate-800">{p.customer_name}</td>
                          <td className="p-3 font-extrabold text-amber-800 text-[10px]">{p.month_paid || 'N/A'}</td>
                          <td className="p-3">₦{p.amount.toLocaleString()}</td>
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

      {/* Transaction tab with approvals queue */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Pending Deposits Queue */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fade-in">
            <h3 className="text-md font-black text-amber-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-5 h-5" />
              Pending Contributions Approval Queue ({pendingTransactions.length})
            </h3>
            <p className="text-xs text-slate-505 mb-4">Customers submitted these manual deposits. Click Approve to split metrics and mark their tracking cards.</p>
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
                <tbody className="divide-y divide-amber-100 bg-amber-50/10">
                  {pendingTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">No pending submissions awaiting approval.</td>
                    </tr>
                  ) : (
                    pendingTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-amber-50/30 transition">
                        <td className="p-3 text-slate-505">{tx.date}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {profiles.find(p => p.id === tx.customer_id)?.name || tx.customer_name || 'System User'}
                        </td>
                        <td className="p-3 font-medium text-slate-600">{tx.payment_method}</td>
                        <td className="p-3 font-black text-emerald-800">₦{tx.amount.toLocaleString()}</td>
                        <td className="p-3 text-right flex justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => onApproveTransaction(tx.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg transition text-[10px]"
                          >
                            Approve & Confirm
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg transition text-[10px]"
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
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 mb-2 uppercase tracking-wider">Completed Transaction Ledger</h3>
            <p className="text-xs text-slate-505 mb-4">Deleting a confirmed log reverses split allocations, unmarking days directly on tracking grids.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                    <th className="p-3">Transaction Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Posted Amount</th>
                    <th className="p-3">Auto-split metrics</th>
                    <th className="p-3 text-right">Reverse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {successfulTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">No completed contributions posted yet.</td>
                    </tr>
                  ) : (
                    successfulTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-emerald-50/20 transition">
                        <td className="p-3 text-slate-505">{tx.date}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {profiles.find(p => p.id === tx.customer_id)?.name || tx.customer_name || 'System User'}
                        </td>
                        <td className="p-3 font-medium text-slate-600">{tx.payment_method}</td>
                        <td className="p-3 font-bold text-emerald-800">₦{tx.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="bg-amber-100 text-amber-955 font-black px-2.5 py-0.5 rounded">
                            Days {tx.start_day} - {tx.end_day} ({tx.days_covered} days marked)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition duration-150"
                            title="Delete and reverse auto-split"
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

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-5 h-5 text-emerald-700" />
              Support Settings Control Panel
            </h3>
            <p className="text-xs text-slate-505 mb-4">Edit the support shortcuts and banking details displayed to customers.</p>
            
            <form onSubmit={handleSupportSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Support Phone Line</label>
                <input 
                  type="text" 
                  required
                  placeholder="+234 803 461 2345"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">WhatsApp Direct Line</label>
                <input 
                  type="text" 
                  required
                  placeholder="+234 803 461 2345"
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Support Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="support@hiremercy.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t border-emerald-100 pt-4 space-y-4">
                <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider">Company Bank Account Settings (For Deposits)</h4>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Bank Name</label>
                  <select
                    value={adminBankName}
                    onChange={(e) => setAdminBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs"
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
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
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
                    className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm"
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
              <h3 className="text-md font-black text-emerald-955 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                Live Preview
              </h3>
              <p className="text-xs text-slate-505 mb-6">This is how your clients see their support widget.</p>
              
              <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Call: <strong className="text-slate-900">{supportPhone}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp: <strong className="text-slate-900">{supportWhatsapp}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Email: <strong className="text-slate-900">{supportEmail}</strong></span>
                </div>
              </div>

              <h4 className="text-xs font-black text-emerald-955 uppercase tracking-wider mb-2">Customer Deposit Banking coordinates preview:</h4>
              <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-slate-800">
                <p>Bank: <strong className="text-slate-900">{adminBankName}</strong></p>
                <p>Account Number: <strong className="text-slate-900">{adminAccountNumber}</strong></p>
                <p>Account Name: <strong className="text-slate-900">{adminAccountName}</strong></p>
              </div>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-4 leading-relaxed font-semibold">
              ⚠️ Note: Ensure numbers are written in full international format (e.g. starting with +234) for WhatsApp redirect actions to work.
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

  const customers = profiles.filter(p => p.role === 'Customer' && p.branch_id === staffProfile.branch_id && p.is_active);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !depositAmount) return;
    onAddTransaction(selectedCustomerId, Number(depositAmount), paymentMethod, staffProfile.id);
    setDepositAmount('');
  };

  const handleStaffCustomerOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cPhone) return;
    onRegisterCustomer({
      name: cName,
      phone: cPhone,
      email: cEmail || `${cPhone}@hiremercy.com`, // Fallback email
      password: 'customer123',
      daily_amount: cDailyAmount,
      branch_id: staffProfile.branch_id // Auto-assigns to the Staff's own branch [1]
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
              activeTab === 'onboard' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            Onboard Customer
          </button>
        </div>
      </div>

      {activeTab === 'collect' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
            <h3 className="text-md font-black text-emerald-955 mb-4 uppercase tracking-wider">Collect Deposit</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Select Branch Customer</label>
                <select 
                  required
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="">-- Choose Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₦{c.daily_amount.toLocaleString()}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Deposit Amount (₦)</label>
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
                <label className="block text-xs font-black text-emerald-800 mb-1">Payment Method</label>
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
                Verify Split Marks
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Branch Directory Progress</h3>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {customers.map(cust => (
                <div key={cust.id} className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-emerald-955">{cust.name}</h4>
                      <p className="text-[10px] text-slate-550">Contact: {cust.phone} | Pace: ₦{cust.daily_amount.toLocaleString()}/day</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-amber-500 text-emerald-955 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {(markedDays[cust.id] || []).length} / 32 Days Marked
                      </span>
                    </div>
                  </div>
                  <Grid32 trackingDays={markedDays[cust.id] || []} dailyAmount={cust.daily_amount} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Staff Onboarding Customer directly from Staff Dashboard [1] */
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm max-w-md mx-auto animate-fade-in">
          <h3 className="text-md font-black text-emerald-955 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            Onboard Branch Customer
          </h3>
          <p className="text-[10px] text-slate-505 mb-4">Customer will be automatically assigned to your branch: <strong>{branches.find(b => b.id === staffProfile.branch_id)?.name || 'Home Branch'}</strong> [1].</p>

          <form onSubmit={handleStaffCustomerOnboard} className="space-y-4 text-xs">
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
              <select name="daily_amount" value={cDailyAmount} onChange={(e) => setCDailyAmount(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white">
                <option value="500">₦500 / Day</option>
                <option value="1000">₦1,000 / Day</option>
                <option value="2000">₦2,000 / Day</option>
                <option value="5000">₦5,000 / Day</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">
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
  customer, transactions, markedDays, supportDetails, onAddPayoutRequest, payoutRequests, onAddCustomerPendingTransaction, onUpdateCustomerSettings
}: { 
  customer: Profile, transactions: Transaction[], markedDays: MarkedDay[], supportDetails: SupportSettings, payoutRequests: PayoutRequest[], onAddPayoutRequest: (bank: string, acctNum: string, acctName: string) => void,
  onAddCustomerPendingTransaction: (amount: number, method: 'Cash' | 'Bank Transfer' | 'Mobile Money') => void, onUpdateCustomerSettings: (phone: string, dailyAmount: number) => void
}) {
  const [customerTab, setCustomerTab] = useState<'tracker' | 'transactions' | 'deposit' | 'settings'>('tracker');

  const myTransactions = transactions.filter(t => t.customer_id === customer.id);
  const totalSaved = markedDays.reduce((sum, item) => sum + item.amount, 0);

  // Modal / Form state for Payout Request [3]
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // Add Funds form states
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Bank Transfer');

  // Personal Settings states
  const [custSettingsPhone, setCustSettingsPhone] = useState(customer.phone);
  const [custSettingsDailyAmount, setCustSettingsDailyAmount] = useState(customer.daily_amount);

  const payoutHistory = useMemo(() => {
    return payoutRequests.filter(p => p.customer_id === customer.id);
  }, [payoutRequests, customer.id]);

  const expectedPayoutAmount = useMemo(() => {
    const totalDays = markedDays.length;
    if (totalDays <= 1) return 0;
    return (totalDays - 1) * customer.daily_amount; // Deducts exactly 1-day profit fee [3]
  }, [markedDays, customer.daily_amount]);

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
    if (markedDays.length <= 1) {
      alert("A minimum of 2 contribution days is required to withdraw (to allow 1-day company fee deduction).");
      return;
    }
    onAddPayoutRequest(bankName, accountNumber, accountName);
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setShowWithdrawModal(false);
  };

  const handleAddFundsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depositAmountInput);
    if (!depositAmountInput || isNaN(amt) || amt <= 0) return;
    onAddCustomerPendingTransaction(amt, depositPaymentMethod);
    setDepositAmountInput('');
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomerSettings(custSettingsPhone, Number(custSettingsDailyAmount));
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-955 text-white p-6 sm:p-8 rounded-3xl border-b-4 border-amber-505 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-505 opacity-10 rounded-full transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <span className="bg-amber-505 text-emerald-955 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
              Personal Saver Deck
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">Welcome, {customer.name}!</h2>
            <p className="text-emerald-100 text-xs max-w-xl">
              Watch your contribution metrics climb across your continuous 32-day savings campaign.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['tracker', 'transactions', 'deposit', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCustomerTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition ${
                  customerTab === tab 
                    ? 'bg-amber-505 text-emerald-955 shadow-md' 
                    : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900'
                }`}
              >
                {tab === 'tracker' && 'My Tracker'}
                {tab === 'transactions' && 'Statement History'}
                {tab === 'deposit' && 'Deposit Funds'}
                {tab === 'settings' && 'Plan Settings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {customerTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-1">
            {/* Balance Card */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
              <div>
                <p className="text-[10px] text-slate-555 uppercase font-black tracking-wider">Total Cycle Contributions</p>
                <p className="text-3xl font-black text-emerald-800 mt-1">₦{totalSaved.toLocaleString()}</p>
              </div>
              
              <div className="pt-4 border-t border-emerald-50 flex justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Daily Target Plan</span>
                  <span className="font-bold text-slate-800">₦{customer.daily_amount.toLocaleString()} / Day</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Current Cycle</span>
                  <span className="font-bold text-amber-600">32-Day Thrift</span>
                </div>
              </div>

              {totalSaved > 0 ? (
                <button 
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="w-full bg-amber-505 hover:bg-amber-606 text-emerald-955 font-black py-2.5 rounded-xl text-xs transition duration-150 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  Request Payout / Withdrawal
                </button>
              ) : (
                <p className="text-[10px] text-center text-slate-400 font-semibold bg-slate-50 p-2 rounded-xl">
                  Complete first contribution to unlock payouts.
                </p>
              )}
            </div>

            <SupportWidget details={supportDetails} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">My 32-Day Contribution Grid</h3>
                <p className="text-xs text-slate-505 mt-0.5 font-bold">Stars indicate approved/marked allocations corresponding to confirmed payments.</p>
              </div>
              <Grid32 trackingDays={markedDays} dailyAmount={customer.daily_amount} />
            </div>

            {/* Payout records table */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-emerald-700" />
                My Payout & Reset History
              </h3>
              <div className="overflow-x-auto">
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
                          <td className="p-3 text-slate-700">
                            <strong className="block">{h.account_name}</strong>
                            {h.bank_name} • {h.account_number}
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
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-emerald-700" />
              Statement History Ledger
            </h3>
            <p className="text-xs text-slate-505">Review your past contribution deposits, including both pending approvals and confirmed payouts.</p>
          </div>
          <div className="overflow-x-auto">
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
                          <span className="text-slate-400 italic">Processing approval...</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-emerald-700" />
              Add Savings Contribution
            </h3>
            <p className="text-xs text-slate-505">Follow the steps below to fund your 32-day plan: </p>
            
            <div className="space-y-3 text-xs bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 leading-relaxed font-semibold">
              <p className="text-emerald-900 font-extrabold text-sm">Instructions:</p>
              <p>1. Copy the company bank account parameters shown in the adjacent widget.</p>
              <p>2. Complete the bank transfer using your bank's mobile application.</p>
              <p>3. Enter the exact transferred sum below and click "Transaction Complete".</p>
              <p>4. Your balance remains <strong className="text-amber-700">Pending</strong> until Admin verifies receipt of funds.</p>
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
                <select
                  value={depositPaymentMethod}
                  onChange={(e) => setDepositPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-sm"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Cash">Cash Handover</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Transaction Complete (Awaiting Admin Confirm)
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-5 h-5 text-emerald-700" />
                Company Banking Coordinates
              </h3>
              <p className="text-xs text-slate-505">Transfer exact targets strictly to this verified account only:</p>
              
              <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-3xl space-y-3 text-xs leading-loose text-slate-800 shadow-inner">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Receiver Bank:</span>
                  <strong className="text-slate-900 text-sm">{supportDetails.admin_bank_name || 'Access Bank'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Account Number:</span>
                  <strong className="text-slate-900 text-lg tracking-widest block py-0.5">{supportDetails.admin_account_number || '0123456789'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Account Name:</span>
                  <strong className="text-slate-900 text-sm">{supportDetails.admin_account_name || 'HireMercy Thrift Enterprises'}</strong>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 leading-relaxed">
              ⚠️ Warning: Do not transfer funds to any other account coordinates. Contact support instantly if you experience technical issues.
            </div>
          </div>
        </div>
      )}

      {/* Plan Settings Tab */}
      {customerTab === 'settings' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm max-w-md mx-auto animate-fade-in space-y-4">
          <div>
            <h3 className="text-md font-black text-emerald-955 uppercase tracking-wider">Plan Settings Dashboard</h3>
            <p className="text-xs text-slate-505 mt-0.5">Keep your account details up to date and configure target pace constraints.</p>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Phone Number Line *</label>
              <input 
                type="text" 
                required
                value={custSettingsPhone}
                onChange={(e) => setCustSettingsPhone(e.target.value)}
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">Daily Contribution Target (₦) *</label>
              <select
                disabled={!canChangeAmount}
                value={custSettingsDailyAmount.toString()}
                onChange={(e) => setCustSettingsDailyAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="500">₦500 / Day</option>
                <option value="1000">₦1,000 / Day</option>
                <option value="2000">₦2,000 / Day</option>
                <option value="5000">₦5,000 / Day</option>
              </select>

              {!canChangeAmount ? (
                <span className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 block mt-2 font-medium leading-relaxed">
                  🔒 You can only modify your contribution plan once a calendar month. If you need to make urgent updates, please request Admin to grant permission.
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 block mt-1">Note: Modifying this changes the cost per split slot on your tracking card going forward.</span>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition shadow-md"
            >
              Update Settings & Targets
            </button>
          </form>
        </div>
      )}

      {/* Withdrawal Form Modal [3] */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleWithdrawSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 border border-emerald-100 shadow-2xl space-y-4">
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

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-semibold">
              <p>⚖️ Payout Calculations:</p>
              <p>• Total Accumulation: <strong>₦{totalSaved.toLocaleString()}</strong> ({markedDays.length} days)</p>
              <p>• Company Profit Deduction: <strong>- ₦{customer.daily_amount.toLocaleString()}</strong> (1 contribution day)</p>
              <p className="text-emerald-800 border-t border-amber-200 pt-1 text-xs">
                • Final Settlement: <strong>₦{expectedPayoutAmount.toLocaleString()}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Bank Name *</label>
                <select 
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl bg-white text-xs"
                >
                  <option value="">-- Choose Recipient Bank --</option>
                  {nigerianBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Account Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 0123456789"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">Account Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sarah Alabi"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition duration-150 shadow-md mt-4"
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
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live Database States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [markedDays, setMarkedDays] = useState<Record<string, MarkedDay[]>>({});
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [supportDetails, setSupportDetails] = useState<SupportSettings>({
    id: 1,
    support_phone: '+234 803 461 2345',
    support_whatsapp: '+234 803 461 2345',
    support_email: 'support@hiremercy.com'
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // UI States
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'admin_setup'>('login');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);

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

  useEffect(() => {
    fetchGlobalConfiguration();
  }, []);

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
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
      await fetchNotifications(profile);
      await fetchPayoutRequests(profile);
    }
    setIsLoading(false);
  };

  const syncAllOperationalData = async (userProfile: Profile) => {
    if (userProfile.role === 'Admin' || userProfile.role === 'Staff') {
      const { data: pData } = await supabase.from('profiles').select('*');
      if (pData) setProfiles(pData);

      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (txData) setTransactions(txData);

      const { data: mData } = await supabase.from('marked_days').select('*');
      if (mData) {
        const grouped: Record<string, MarkedDay[]> = {};
        mData.forEach((item: any) => {
          if (!grouped[item.customer_id]) grouped[item.customer_id] = [];
          grouped[item.customer_id].push({
            day_number: item.day_number,
            amount: item.amount,
            date: item.date
          });
        });
        setMarkedDays(grouped);
      }
    } else {
      const { data: txData } = await supabase.from('transactions').select('*').eq('customer_id', userProfile.id).order('created_at', { ascending: false });
      if (txData) setTransactions(txData);

      const { data: mData } = await supabase.from('marked_days').select('*').eq('customer_id', userProfile.id);
      if (mData) {
        setMarkedDays({
          [userProfile.id]: mData.map((item: any) => ({
            day_number: item.day_number,
            amount: item.amount,
            date: item.date
          }))
        });
      }
    }
  };

  const fetchNotifications = async (userProfile: Profile) => {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    
    if (userProfile.role === 'Customer') {
      query = query.eq('user_id', userProfile.id);
    } else {
      query = query.is('user_id', null);
    }

    const { data } = await query;
    if (data) setNotifications(data);
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

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: formattedPhone,
          role: 'Admin',
          daily_amount: 0
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

  // Branch details update [2]
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

  // Delete Branch [2]
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

  // Staff creation using phone number to bypass default email rate limit [5]
  const handleCreateStaff = async (name: string, phone: string, email: string, branchId: string, password: string) => {
    setIsLoading(true);
    const formattedPhone = formatNigerianPhone(phone);

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone, // Bypasses email limits natively [5]
      password: password,
      options: {
        data: {
          name,
          email,
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

  // Staff updates [2]
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

  // Delete Staff [2]
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

    const { error } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: data.password || 'customer123',
      options: {
        data: {
          name: data.name,
          phone: formattedPhone,
          role: 'Customer',
          daily_amount: data.daily_amount,
          branch_id: data.branch_id,
          is_active: true
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

  const handleUpdateSupportDetails = async (phone: string, whatsapp: string, email: string, bankName: string, acctNum: string, acctName: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        support_phone: phone,
        support_whatsapp: whatsapp,
        support_email: email,
        admin_bank_name: bankName,
        admin_account_number: acctNum,
        admin_account_name: acctName
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

  const createTransaction = async (customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Money', staffId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id: customerId,
          amount: amount,
          payment_method: paymentMethod,
          staff_id: staffId === 'admin-id' ? null : staffId,
          status: 'Successful'
        }
      ]);

    setIsLoading(false);
    if (error) {
      triggerToast(`Post Failed: ${error.message}`, 'error');
    } else {
      triggerToast('Transaction posted. Splitting completed on tracker.', 'success');
      if (currentUser) {
        syncAllOperationalData(currentUser);
        fetchNotifications(currentUser);
      }
    }
  };

  const deleteTransaction = async (txId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    setIsLoading(false);
    if (error) {
      triggerToast(`Deletion Failed: ${error.message}`, 'error');
    } else {
      triggerToast('Transaction removed. Allocated dates unmarked.', 'success');
      if (currentUser) {
        syncAllOperationalData(currentUser);
        fetchNotifications(currentUser);
      }
    }
  };

  const handleCreatePayoutRequest = async (bank: string, acctNum: string, acctName: string) => {
    if (!currentUser) return;
    setIsLoading(true);

    const totalDays = (markedDays[currentUser.id] || []).length;
    const totalAmount = totalDays * currentUser.daily_amount;
    const payoutAmount = (totalDays - 1) * currentUser.daily_amount;
    const monthPaidText = getNigerianMonthName();

    const { error } = await supabase
      .from('payout_requests')
      .insert([
        {
          customer_id: currentUser.id,
          account_name: acctName,
          account_number: acctNum,
          bank_name: bank,
          amount: totalAmount,
          payout_amount: payoutAmount,
          status: 'Pending',
          month_paid: monthPaidText
        }
      ]);

    setIsLoading(false);
    if (error) {
      triggerToast(`Request failed: ${error.message}`, 'error');
    } else {
      triggerToast('Withdrawal settlement request submitted to Admin!', 'success');
      fetchPayoutRequests(currentUser);
    }
  };

  const handleApprovePayout = async (reqId: string) => {
    setIsLoading(true);

    const req = payoutRequests.find(r => r.id === reqId);
    if (!req) return;

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({ status: 'Successful', processed_at: new Date().toISOString() })
      .eq('id', reqId);

    if (updateError) {
      triggerToast(`Approval failed: ${updateError.message}`, 'error');
      setIsLoading(false);
      return;
    }

    // Clear customer's past cycle transactions and marked days to reset their balance to 0 [3]
    await supabase.from('marked_days').delete().eq('customer_id', req.customer_id);
    await supabase.from('transactions').delete().eq('customer_id', req.customer_id);

    setIsLoading(false);
    triggerToast('Payout approved! Customer balance has been reset to 0.', 'success');
    
    if (currentUser) {
      syncAllOperationalData(currentUser);
      fetchPayoutRequests(currentUser);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    setIsLoading(false);
    if (error) {
      triggerToast(`Delete failed: ${error.message}`, 'error');
    } else {
      triggerToast('Customer profile deleted successfully.', 'success');
      fetchGlobalConfiguration();
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
        daily_amount: dailyAmount, 
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

  const handleTriggerManualPayout = async (customerId: string, bank: string, acctNum: string, acctName: string) => {
    setIsLoading(true);

    const targetCustomer = profiles.find(p => p.id === customerId);
    if (!targetCustomer) {
      triggerToast('Customer not found.', 'error');
      setIsLoading(false);
      return;
    }

    const totalDays = (markedDays[customerId] || []).length;
    const totalAmount = totalDays * targetCustomer.daily_amount;
    const payoutAmount = totalDays > 1 ? (totalDays - 1) * targetCustomer.daily_amount : 0;
    const monthPaidText = getNigerianMonthName();

    const { error: insertError } = await supabase
      .from('payout_requests')
      .insert([
        {
          customer_id: customerId,
          account_name: acctName,
          account_number: acctNum,
          bank_name: bank,
          amount: totalAmount,
          payout_amount: payoutAmount,
          status: 'Successful',
          month_paid: monthPaidText,
          processed_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      triggerToast(`Payout trigger failed: ${insertError.message}`, 'error');
      setIsLoading(false);
      return;
    }

    // Clear customer's past cycle transactions and marked days to reset their balance to 0
    await supabase.from('marked_days').delete().eq('customer_id', customerId);
    await supabase.from('transactions').delete().eq('customer_id', customerId);

    setIsLoading(false);
    triggerToast(`Manual payout triggered! ₦${payoutAmount.toLocaleString()} logged and tracker reset.`, 'success');
    
    if (currentUser) {
      syncAllOperationalData(currentUser);
      fetchPayoutRequests(currentUser);
    }
  };

  const handleAddCustomerPendingTransaction = async (amount: number, method: 'Cash' | 'Bank Transfer' | 'Mobile Money') => {
    if (!currentUser) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id: currentUser.id,
          amount: amount,
          payment_method: method,
          status: 'Pending',
          date: new Date().toISOString().split('T')[0]
        }
      ]);

    setIsLoading(false);
    if (error) {
      triggerToast(`Deposit submission failed: ${error.message}`, 'error');
    } else {
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
      updateData.daily_amount = dailyAmount;
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
      triggerToast('Your profile settings have been updated!', 'success');
      fetchCurrentUserProfile(currentUser.id);
    }
  };

  const handleApproveTransaction = async (txId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'Successful', date: new Date().toISOString().split('T')[0] })
      .eq('id', txId);

    setIsLoading(false);
    if (error) {
      triggerToast(`Confirmation failed: ${error.message}`, 'error');
    } else {
      triggerToast('Deposit confirmed! Days marked on tracking card.', 'success');
      if (currentUser) {
        syncAllOperationalData(currentUser);
        fetchNotifications(currentUser);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  if (showSplash) {
    return <WelcomeScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-emerald-50/40 text-slate-800 antialiased font-sans">
      {/* Toast Alert System */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border text-sm font-semibold animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
            : 'bg-red-100 border-red-300 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md py-4 px-6 border-b-4 border-amber-505 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-505 rounded-xl shadow-inner">
              <PiggyBank className="w-8 h-8 text-emerald-955" />
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

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-emerald-100 py-3 text-slate-800 z-50 animate-fade-in-down">
                    <div className="px-4 pb-2 border-b border-emerald-50 flex justify-between items-center">
                      <span className="font-extrabold text-xs text-emerald-955 uppercase tracking-wider">
                        {currentUser.role === 'Customer' ? 'My Notifications' : 'Audit Activity Alerts'}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowNotifications(false)} 
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-emerald-50 text-xs">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">No activity alerts logged.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3.5 transition duration-150 hover:bg-emerald-50/20 ${!n.is_read && currentUser.role === 'Customer' ? 'bg-amber-50/30' : ''}`}>
                            <p className="font-bold text-emerald-955 mb-0.5">{n.title}</p>
                            <p className="text-slate-600 text-[11px] leading-relaxed mb-1">{n.message}</p>
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
                <span className="text-[10px] bg-amber-505 text-emerald-955 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
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
        {isLoading && (
          <div className="text-center py-6 text-emerald-800 font-bold animate-pulse">
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
                onDeleteTransaction={deleteTransaction}
                onAddTransaction={createTransaction}
                onUpdateSupport={handleUpdateSupportDetails}
                onApprovePayout={handleApprovePayout}
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
                onTriggerManualPayout={handleTriggerManualPayout}
                onApproveTransaction={handleApproveTransaction}
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
                onAddPayoutRequest={handleCreatePayoutRequest}
                onAddCustomerPendingTransaction={handleAddCustomerPendingTransaction}
                onUpdateCustomerSettings={handleUpdateCustomerSettings}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
