import React, { useState, useEffect, useMemo } from 'react';
import { 
  PiggyBank, Phone, Lock, EyeOff, Eye as EyeIcon, Mail, User as UserIcon, 
  ChevronLeft, LayoutDashboard, Users, Plus, Search, Trash2, Calendar, 
  CheckCircle2, XCircle, LogOut, Shield, Briefcase, Landmark, Info, Key,
  Bell, Settings, HelpCircle, MessageSquare
} from 'lucide-react';
import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './lib/supabase'; // <-- Live connection config path

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
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
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
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- GLOBAL NIGERIAN PHONE FORMATTING HELPER ---
const formatNigerianPhone = (phone: string): string => {
  const cleanPhone = phone.trim().replace(/[\s\-\(\)\[\]]/g, '');
  if (cleanPhone.startsWith('+')) return cleanPhone;
  if (cleanPhone.startsWith('234') && cleanPhone.length >= 13) return `+${cleanPhone}`;
  if (cleanPhone.startsWith('0')) return `+234${cleanPhone.slice(1)}`;
  return `+234${cleanPhone}`;
};

// =========================================================================
// 1. ISOLATED SUBCOMPONENTS (DECLARING FIRST REMOVES HOISTING COMPILER ERRORS)
// =========================================================================

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
          <PiggyBank className="w-14 h-14 text-emerald-950" />
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
        <div className="inline-flex p-2 bg-amber-500 rounded-xl mb-2 text-emerald-950">
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
          <input 
            type="password" 
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
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
          className="w-full bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black py-3 rounded-xl transition duration-150 shadow-md mt-4"
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
            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-sm"
          />
          <span className="text-[10px] text-slate-400 block mt-1">Accepts local formats (e.g. 080...) or international (+234...)</span>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-emerald-800 mb-1">Password</label>
          <input 
            type="password" 
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-sm"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition duration-150 shadow-md"
        >
          Verify & Sign In
        </button>

        <div className="text-center">
          <p className="text-xs text-slate-500">
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
          <input 
            type="password" 
            required
            placeholder="•••••••• (Customer chosen password)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm"
          />
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
          className="w-full bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black py-3 rounded-xl transition duration-150 shadow-md mt-6"
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
                  ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm' 
                  : 'bg-emerald-50/20 border-emerald-100 text-slate-400'
              }`}
            >
              <span className="text-[10px] font-black block mb-1">Day {dayNum}</span>
              {markedInfo ? (
                <div className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center text-[11px] font-black shadow-inner">
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
        <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
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
        <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider">Need Assistance?</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">Contact direct support channels managed by HireMercy administration.</p>
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

function AdminDashboard({ 
  profiles, branches, transactions, markedDays, supportDetails, onDeleteTransaction, onAddTransaction, onUpdateSupport 
}: { 
  profiles: Profile[], branches: Branch[], transactions: Transaction[], markedDays: Record<string, MarkedDay[]>, supportDetails: SupportSettings, onDeleteTransaction: (id: string) => void, onAddTransaction: (cId: string, amt: number, method: any, sId: string) => void, onUpdateSupport: (phone: string, whatsapp: string, email: string) => void 
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'transactions' | 'settings'>('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Cash');

  const [supportPhone, setSupportPhone] = useState(supportDetails.support_phone);
  const [supportWhatsapp, setSupportWhatsapp] = useState(supportDetails.support_whatsapp);
  const [supportEmail, setSupportEmail] = useState(supportDetails.support_email);

  useEffect(() => {
    setSupportPhone(supportDetails.support_phone);
    setSupportWhatsapp(supportDetails.support_whatsapp);
    setSupportEmail(supportDetails.support_email);
  }, [supportDetails]);

  const customers = profiles.filter(p => p.role === 'Customer');
  const staff = profiles.filter(p => p.role === 'Staff');

  const stats = useMemo(() => {
    const totalCollected = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      totalCollected,
      totalCustomers: customers.length,
      totalStaff: staff.length,
    };
  }, [transactions, customers, staff]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !depositAmount) return;
    onAddTransaction(selectedCustomerId, Number(depositAmount), paymentMethod, 'admin-id');
    setDepositAmount('');
  };

  const handleSupportSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSupport(supportPhone, supportWhatsapp, supportEmail);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-700" />
            Admin Command Centre
          </h2>
          <p className="text-xs text-slate-500">Global oversight of savings collections, active balances, and auditing logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['overview', 'customers', 'transactions', 'settings'] as const).map(tab => (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black">Total Cycle Collection</p>
            <p className="text-2xl font-black text-slate-900">₦{stats.totalCollected.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black">Registered Customers</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black">Authorized Field Agents</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalStaff}</p>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-1 h-fit">
            <h3 className="text-md font-black text-emerald-950 mb-4 uppercase tracking-wider">Post Contribution</h3>
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
            <h3 className="text-md font-black text-emerald-950 uppercase tracking-wider">Dynamic 32-Day Saver Previews</h3>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {customers.map(cust => (
                <div key={cust.id} className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-emerald-950">{cust.name}</h4>
                      <p className="text-[10px] text-slate-500">Contact: {cust.phone} | Pace: ₦{cust.daily_amount.toLocaleString()}/day</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-amber-500 text-emerald-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
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
      )}

      {activeTab === 'customers' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
          <h3 className="text-md font-black text-emerald-950 mb-4 uppercase tracking-wider">Customer Directory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 text-emerald-900 font-extrabold border-b border-emerald-200">
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone number</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Target Amount</th>
                  <th className="p-3">Marked count</th>
                  <th className="p-3 text-right">Consolidated contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {customers.map(c => {
                  const marked = markedDays[c.id] || [];
                  const totalContributed = marked.reduce((sum, item) => sum + item.amount, 0);
                  return (
                    <tr key={c.id} className="hover:bg-emerald-50/20 transition">
                      <td className="p-3 font-bold text-slate-800">{c.name}</td>
                      <td className="p-3 text-slate-600">{c.phone}</td>
                      <td className="p-3 text-slate-500">{c.email || 'N/A'}</td>
                      <td className="p-3 font-semibold">₦{c.daily_amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                          {marked.length} / 32
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">₦{totalContributed.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
          <h3 className="text-md font-black text-emerald-950 mb-2 uppercase tracking-wider">Transactional Ledger</h3>
          <p className="text-xs text-slate-500 mb-4">Deleting a log reverses status allocation, unmarking days directly on the tracking table.</p>
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
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-emerald-50/20 transition">
                    <td className="p-3 text-slate-500">{tx.date}</td>
                    <td className="p-3 font-bold text-slate-800">
                      {profiles.find(p => p.id === tx.customer_id)?.name || tx.customer_name || 'System User'}
                    </td>
                    <td className="p-3 font-medium text-slate-600">{tx.payment_method}</td>
                    <td className="p-3 font-bold text-emerald-800">₦{tx.amount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="bg-amber-100 text-amber-950 font-black px-2 py-0.5 rounded">
                        Days {tx.start_day} - {tx.end_day} ({tx.days_covered} days marked)
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition duration-150"
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
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-md font-black text-emerald-950 mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-5 h-5 text-emerald-700" />
              Support Settings Control Panel
            </h3>
            <p className="text-xs text-slate-500 mb-4">Edit the direct support shortcuts displayed to customers and staff members.</p>
            
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

              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition duration-150 text-sm shadow-md"
              >
                Save Changes
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-md font-black text-emerald-950 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                Live Preview
              </h3>
              <p className="text-xs text-slate-500 mb-6">This is how your clients see their support widget.</p>
              
              <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-3">
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

function StaffDashboard({ 
  profiles, transactions, markedDays, staffProfile, supportDetails, onAddTransaction 
}: { 
  profiles: Profile[], transactions: Transaction[], markedDays: Record<string, MarkedDay[]>, staffProfile: Profile, supportDetails: SupportSettings, onAddTransaction: (cId: string, amt: number, method: any, sId: string) => void 
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Money'>('Cash');

  const customers = profiles.filter(p => p.role === 'Customer' && p.branch_id === staffProfile.branch_id);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !depositAmount) return;
    onAddTransaction(selectedCustomerId, Number(depositAmount), paymentMethod, staffProfile.id);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <h2 className="text-xl font-black text-emerald-700 flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          Field Agent Management Desk
        </h2>
        <p className="text-xs text-slate-500">Fast transaction placement with adjacent split mapping on verification grids</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm h-fit">
            <h3 className="text-md font-black text-emerald-950 mb-4 uppercase tracking-wider">Collect Deposit</h3>
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

          <SupportWidget details={supportDetails} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-md font-black text-emerald-950 uppercase tracking-wider">Branch Directory Progress</h3>
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {customers.map(cust => (
              <div key={cust.id} className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-emerald-950">{cust.name}</h4>
                    <p className="text-[10px] text-slate-500">Contact: {cust.phone} | Pace: ₦{cust.daily_amount.toLocaleString()}/day</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-amber-500 text-emerald-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
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
    </div>
  );
}

function CustomerDashboard({ 
  customer, transactions, markedDays, supportDetails 
}: { 
  customer: Profile, transactions: Transaction[], markedDays: MarkedDay[], supportDetails: SupportSettings 
}) {
  const myTransactions = transactions.filter(t => t.customer_id === customer.id);
  const totalSaved = markedDays.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border-b-4 border-amber-500 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-10 rounded-full transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 space-y-2">
          <span className="bg-amber-500 text-emerald-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
            Personal Saver Deck
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">Welcome, {customer.name}!</h2>
          <p className="text-emerald-100 text-xs max-w-xl">
            Watch your contribution metrics climb across your continuous 32-day savings campaign.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Total Cycle Contributions</p>
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
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h3 className="text-xs font-black text-emerald-950 mb-3 uppercase tracking-wider">Statement Details</h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {myTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No deposits processed yet.</p>
              ) : (
                myTransactions.map(t => (
                  <div key={t.id} className="p-3 bg-emerald-50/20 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">₦{t.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">{t.date} • {t.payment_method}</p>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-950 font-black px-2.5 py-0.5 rounded-full">
                      +{t.days_covered} Days
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <SupportWidget details={supportDetails} />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-black text-emerald-950 uppercase tracking-wider">My 32-Day Contribution Grid</h3>
              <p className="text-xs text-slate-500 mt-0.5">Stars indicate marked split allocations corresponding to completed payments.</p>
            </div>
            <Grid32 trackingDays={markedDays} dailyAmount={customer.daily_amount} />
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. MAIN APPLICATION COMPONENT
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
  
  // Support Details & Live Notifications
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

  const hasAdmin = useMemo(() => {
    return profiles.some(p => p.role === 'Admin');
  }, [profiles]);

  useEffect(() => {
    if (profiles.length > 0 && !hasAdmin) {
      setAuthScreen('admin_setup');
    } else if (authScreen === 'admin_setup' && hasAdmin) {
      setAuthScreen('login');
    }
  }, [profiles, hasAdmin]);

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
    if (pData) setProfiles(pData);

    const { data: sData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (sData) setSupportDetails(sData);
  };

  const fetchCurrentUserProfile = async (userId: string) => {
    setIsLoading(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setCurrentUser(profile);
      await syncAllOperationalData(profile);
      await fetchNotifications(profile);
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
          branch_id: data.branch_id
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

  const handleUpdateSupportDetails = async (phone: string, whatsapp: string, email: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        support_phone: phone,
        support_whatsapp: whatsapp,
        support_email: email
      })
      .eq('id', 1);

    setIsLoading(false);
    if (error) {
      triggerToast(`Update failed: ${error.message}`, 'error');
    } else {
      triggerToast('Support details updated successfully!', 'success');
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
          staff_id: staffId === 'admin-id' ? null : staffId
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
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md py-4 px-6 border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 rounded-xl shadow-inner">
              <PiggyBank className="w-8 h-8 text-emerald-950" />
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
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-emerald-950 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-emerald-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-emerald-100 py-3 text-slate-800 z-50 animate-fade-in-down">
                    <div className="px-4 pb-2 border-b border-emerald-50 flex justify-between items-center">
                      <span className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                        {currentUser.role === 'Customer' ? 'My Notifications' : 'Audit Activity Alerts'}
                      </span>
                      <button 
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
                            <p className="font-bold text-emerald-950 mb-0.5">{n.title}</p>
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
                <span className="text-[10px] bg-amber-500 text-emerald-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
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
                onDeleteTransaction={deleteTransaction}
                onAddTransaction={createTransaction}
                onUpdateSupport={handleUpdateSupportDetails}
              />
            )}
            {currentUser.role === 'Staff' && (
              <StaffDashboard 
                profiles={profiles} 
                transactions={transactions} 
                markedDays={markedDays} 
                staffProfile={currentUser}
                supportDetails={supportDetails}
                onAddTransaction={createTransaction}
              />
            )}
            {currentUser.role === 'Customer' && (
              <CustomerDashboard 
                customer={currentUser} 
                transactions={transactions} 
                markedDays={markedDays[currentUser.id] || []}
                supportDetails={supportDetails}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}