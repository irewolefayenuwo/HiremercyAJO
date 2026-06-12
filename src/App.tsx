import { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Users, Wallet, BarChart3, Plus, Search, Edit2, Trash2, TrendingUp, DollarSign, Calendar, Phone, Banknote, Smartphone, AlertCircle, CheckCheck, Menu, Building2, UserCircle, History, Eye, MapPin, PiggyBank, Landmark, Receipt, ArrowRightLeft, UserPlus, Store, LogOut, Lock, Mail, User as UserIcon, ChevronLeft, MessageCircle, Settings, HelpCircle, CheckCircle2, XCircle, Key, EyeOff, Eye as EyeIcon, Cog, Bell, Shield, Table2, Upload, Clock, Ban, FileCheck } from 'lucide-react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast, Toaster } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import type { Member, Transaction, PayoutRecord, Branch, Staff, DashboardStats, User, UserRole, AppSettings, NigerianBank, PendingTransfer, AmountChangeRequest, LoanRequest, Notification, AuditLog } from './types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const nigerianBanks: NigerianBank[] = [
  { id: '1', name: 'OPay', code: '999992' },
  { id: '2', name: 'PalmPay', code: '999991' },
  { id: '3', name: 'Moniepoint', code: '999993' },
  { id: '4', name: 'Zenith Bank', code: '057' },
  { id: '5', name: 'First Bank', code: '011' },
  { id: '6', name: 'GTBank', code: '058' },
  { id: '7', name: 'Access Bank', code: '044' },
  { id: '8', name: 'UBA', code: '033' },
  { id: '9', name: 'Fidelity Bank', code: '070' },
  { id: '10', name: 'Wema Bank', code: '035' },
  { id: '11', name: 'Stanbic IBTC', code: '039' },
  { id: '12', name: 'Union Bank', code: '032' },
  { id: '13', name: 'FCMB', code: '214' },
  { id: '14', name: 'Ecobank', code: '050' },
  { id: '15', name: 'Polaris Bank', code: '076' },
  { id: '16', name: 'Sterling Bank', code: '232' },
  { id: '17', name: 'Keystone Bank', code: '082' },
  { id: '18', name: 'Jaiz Bank', code: '301' },
  { id: '19', name: 'Titan Trust Bank', code: '102' },
  { id: '20', name: 'Globus Bank', code: '103' },
];

const defaultSettings: AppSettings = {
  customer_care_phone: '+234 800 123 4567',
  customer_care_whatsapp: '+234 800 123 4567',
  support_email: 'support@hiremercy.com',
  staff_can_payout_without_approval: false,
  require_admin_approval_for_all_payouts: true,
  allow_customers_change_amount: true,
  allow_change_until_day: 3,
  allow_change_after_grace_period: false,
  bank_name: 'OPay',
  account_number: '8061290412',
  account_name: 'Irewole paul fayenuwo',
  bank_charges: 50,
  supported_banks: nigerianBanks,
  last_collection_reset_date: new Date().toISOString().split('T')[0],
  yesterday_collection_record: 0,
  yesterday_customers_paid: 0,
};

const sampleBranches: Branch[] = [
  { id: '1', name: 'Main Branch - Lagos', address: '123 Lagos Street, Lagos', phone: '+234 801 111 1111', manager: 'John Doe', created_at: '2024-01-01' },
  { id: '2', name: 'Abuja Branch', address: '456 Abuja Road, Abuja', phone: '+234 802 222 2222', manager: 'Jane Smith', created_at: '2024-02-01' },
  { id: '3', name: 'Port Harcourt Branch', address: '789 PH Crescent, Port Harcourt', phone: '+234 803 333 3333', manager: 'Mike Johnson', created_at: '2024-03-01' },
];

const sampleStaff: Staff[] = [
  { id: '1', user_id: 's1', name: 'Alice Manager', phone: '+234 901 111 1111', email: 'alice@hiremercy.com', password: 'staff123', role: 'Manager', branch_id: '1', branch_name: 'Main Branch - Lagos', can_payout: true, created_at: '2024-01-01' },
  { id: '2', user_id: 's2', name: 'Bob Staff', phone: '+234 902 222 2222', email: 'bob@hiremercy.com', password: 'staff123', role: 'Staff', branch_id: '1', branch_name: 'Main Branch - Lagos', can_payout: false, created_at: '2024-01-15' },
  { id: '3', user_id: 's3', name: 'Carol Manager', phone: '+234 903 333 3333', email: 'carol@hiremercy.com', password: 'staff123', role: 'Manager', branch_id: '2', branch_name: 'Abuja Branch', can_payout: true, created_at: '2024-02-01' },
];

const generateEmptyTracking = (): any[] => Array.from({ length: 32 }, (_, i) => ({ day: i + 1, date: '', paid: false, amount: 0 }));

const generateSampleTracking = (dailyAmount: number): any[] => {
  const tracking = generateEmptyTracking();
  for (let i = 0; i < 15; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (15 - i));
    tracking[i] = { day: i + 1, date: date.toISOString().split('T')[0], paid: true, amount: dailyAmount };
  }
  return tracking;
};

const sampleMembers: Member[] = [
  { id: '1', user_id: 'm1', name: 'Chioma Okonkwo', phone: '+234 802 345 6789', email: 'chioma@email.com', address: '42 Abuja Road, Abuja', daily_amount: 2000, start_date: '2024-02-01', status: 'Active', cycle_position: 2, branch_id: '2', branch_name: 'Abuja Branch', staff_id: '3', staff_name: 'Carol Manager', password: 'customer123', tracking: generateSampleTracking(2000) },
  { id: '2', user_id: 'm2', name: 'Emmanuel Osei', phone: '+234 803 456 7890', email: 'emmanuel@email.com', address: '78 Port Harcourt Ave, PH', daily_amount: 1500, start_date: '2024-02-10', status: 'Active', cycle_position: 3, branch_id: '3', branch_name: 'Port Harcourt Branch', staff_id: '3', staff_name: 'Carol Manager', password: 'customer123', tracking: generateSampleTracking(1500) },
  { id: '3', user_id: 'm3', name: 'Fatima Abdullahi', phone: '+234 804 567 8901', email: 'fatima@email.com', address: '25 Kano Street, Kano', daily_amount: 3000, start_date: '2024-03-01', status: 'Active', cycle_position: 4, branch_id: '1', branch_name: 'Main Branch - Lagos', staff_id: '1', staff_name: 'Alice Manager', password: 'customer123', tracking: generateSampleTracking(3000) },
  { id: '4', user_id: 'm4', name: 'Gabriel Nwosu', phone: '+234 805 678 9012', email: 'gabriel@email.com', address: '56 Enugu Road, Enugu', daily_amount: 2500, start_date: '2024-03-15', status: 'Active', cycle_position: 5, branch_id: '2', branch_name: 'Abuja Branch', staff_id: '3', staff_name: 'Carol Manager', password: 'customer123', tracking: generateSampleTracking(2500) },
];

const sampleTransactions: Transaction[] = [
  { id: 't1', member_id: '1', member_name: 'Chioma Okonkwo', amount: 2000, date: '2025-03-01', payment_method: 'Cash', status: 'Paid', branch_id: '2', branch_name: 'Abuja Branch', staff_id: '3', staff_name: 'Carol Manager', days_covered: 1, start_day: 1, end_day: 1, created_at: '2025-03-01T10:00:00' },
  { id: 't2', member_id: '2', member_name: 'Emmanuel Osei', amount: 1500, date: '2025-03-01', payment_method: 'Bank Transfer', status: 'Paid', branch_id: '3', branch_name: 'Port Harcourt Branch', staff_id: '3', staff_name: 'Carol Manager', days_covered: 1, start_day: 1, end_day: 1, created_at: '2025-03-01T11:00:00' },
  { id: 't3', member_id: '3', member_name: 'Fatima Abdullahi', amount: 3000, date: '2025-03-01', payment_method: 'Mobile Money', status: 'Paid', branch_id: '1', branch_name: 'Main Branch - Lagos', staff_id: '1', staff_name: 'Alice Manager', days_covered: 1, start_day: 1, end_day: 1, created_at: '2025-03-01T12:00:00' },
  { id: 't4', member_id: '4', member_name: 'Gabriel Nwosu', amount: 2500, date: '2025-03-02', payment_method: 'Cash', status: 'Paid', branch_id: '2', branch_name: 'Abuja Branch', staff_id: '3', staff_name: 'Carol Manager', days_covered: 1, start_day: 1, end_day: 1, created_at: '2025-03-02T09:00:00' },
  { id: 't5', member_id: '1', member_name: 'Chioma Okonkwo', amount: 4000, date: '2025-03-02', payment_method: 'Bank Transfer', status: 'Paid', branch_id: '2', branch_name: 'Abuja Branch', staff_id: '3', staff_name: 'Carol Manager', days_covered: 2, start_day: 2, end_day: 3, created_at: '2025-03-02T14:00:00' },
];

const STORAGE_KEYS = {
  users: 'hiremercy_ajo_users',
  currentUser: 'hiremercy_ajo_current_user',
  isAuthenticated: 'hiremercy_ajo_is_authenticated',
  branches: 'hiremercy_ajo_branches',
  staff: 'hiremercy_ajo_staff',
  members: 'hiremercy_ajo_members',
  transactions: 'hiremercy_ajo_transactions',
  payouts: 'hiremercy_ajo_payouts',
  settings: 'hiremercy_ajo_settings',
  pendingTransfers: 'hiremercy_ajo_pending_transfers',
  loanRequests: 'hiremercy_ajo_loan_requests',
  notifications: 'hiremercy_ajo_notifications',
  auditLogs: 'hiremercy_ajo_audit_logs',
  amountChangeRequests: 'hiremercy_ajo_amount_change_requests',
};

const createSeedUsers = (): User[] => {
  const adminUser: User = {
    id: 'admin',
    name: 'Super Admin',
    email: 'admin@hiremercy.com',
    phone: '+234 800 000 0000',
    password: 'admin123',
    role: 'Admin',
    branch_id: '',
    branch_name: '',
    member_id: '',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const staffUsers: User[] = sampleStaff.map((s) => ({
    id: s.user_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    password: s.password,
    role: 'Staff',
    branch_id: s.branch_id,
    branch_name: s.branch_name,
    member_id: '',
    is_active: true,
    created_at: s.created_at,
  }));

  const customerUsers: User[] = sampleMembers.map((m) => ({
    id: m.user_id || `cust-${m.id}`,
    name: m.name,
    email: m.email || '',
    phone: m.phone,
    password: m.password || 'customer123',
    role: 'Customer',
    branch_id: m.branch_id,
    branch_name: m.branch_name,
    member_id: m.id,
    is_active: true,
    created_at: m.start_date,
  }));

  return [adminUser, ...staffUsers, ...customerUsers];
};

const loadStoredState = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch (error) {
    console.error(`Failed to load ${key} from storage`, error);
    return fallback;
  }
};

const saveStoredState = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const formatAmount = (value: number | string | null | undefined): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return Number(numericValue ?? 0).toLocaleString();
};

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [animationStage, setAnimationStage] = useState(0);
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationStage(1), 500);
    const timer2 = setTimeout(() => setAnimationStage(2), 1500);
    const timer3 = setTimeout(() => setAnimationStage(3), 2500);
    const timer4 = setTimeout(() => onComplete(), 3500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className={`transition-all duration-700 ${animationStage >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <PiggyBank className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className={`text-5xl font-bold text-white mb-2 transition-all duration-700 ${animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>HIREMERCY</h1>
        <h2 className={`text-3xl font-semibold text-emerald-300 mb-6 transition-all duration-700 delay-100 ${animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>AJO</h2>
        <p className={`text-emerald-200 text-lg transition-all duration-700 delay-200 ${animationStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>Daily Contribution & Savings Management</p>
        <div className={`flex justify-center gap-2 mt-8 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onRegister, onForgotPassword, onAdminSetup, hasAdmin }: { onLogin: (phone: string, password: string) => void; onRegister: () => void; onForgotPassword: () => void; onAdminSetup: () => void; hasAdmin: boolean }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(phone.trim(), password);
      setIsLoading(false);
    }, 300);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <PiggyBank className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-900">HIREMERCY AJO</h1>
          <p className="text-emerald-600 mt-1">Welcome Back</p>
        </div>
        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-emerald-800">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="Enter phone number" required />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-emerald-800">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" placeholder="Enter password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={onForgotPassword} className="text-emerald-600 hover:text-emerald-800">Forgot Password?</button>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-gray-600">Don&apos;t have an account? <button onClick={onRegister} className="text-emerald-600 hover:text-emerald-800 font-medium">Register as Customer</button></p>
              {!hasAdmin && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm text-emerald-800 font-medium">Complete first-time setup</p>
                  <p className="text-xs text-emerald-700 mt-1">Create the admin account to get started.</p>
                  <Button type="button" variant="outline" onClick={onAdminSetup} className="mt-3 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                    Create Admin Account
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack, onRegister, branches, isAdminSetup }: { onBack: () => void; onRegister: (data: any) => void; branches: Branch[]; isAdminSetup?: boolean }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', branch_id: '', daily_amount: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    onRegister({ ...formData, isAdmin: isAdminSetup });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center text-emerald-700 mb-4 hover:text-emerald-900"><ChevronLeft className="w-5 h-5" /> Back to Login</button>
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-emerald-900">
              {isAdminSetup ? 'Create Admin Account' : 'Create Customer Account'}
            </CardTitle>
            {isAdminSetup && <p className="text-sm text-amber-600 mt-1">This will be the only admin account</p>}
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  <div><Label className="text-emerald-800">Full Name *</Label><div className="relative mt-1"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-10" placeholder="Enter your full name" required /></div></div>
                  <div><Label className="text-emerald-800">Email *</Label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10" placeholder="Enter your email" required /></div></div>
                  <div><Label className="text-emerald-800">Phone Number *</Label><div className="relative mt-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-10" placeholder="Enter phone number" required /></div></div>
                  <Button type="button" onClick={() => setStep(2)} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">Next</Button>
                </>
              ) : (
                <>
                  {!isAdminSetup && (
                    <>
                      <div><Label className="text-emerald-800">Address *</Label><div className="relative mt-1"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="pl-10" placeholder="Enter your address" required /></div></div>
                      <div><Label className="text-emerald-800">Select Branch *</Label><Select value={formData.branch_id} onValueChange={(v) => setFormData({ ...formData, branch_id: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="Choose a branch" /></SelectTrigger><SelectContent>{branches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
                      <div><Label className="text-emerald-800">Daily Contribution Amount (&#8358;) *</Label><div className="relative mt-1"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input type="number" value={formData.daily_amount} onChange={(e) => setFormData({ ...formData, daily_amount: e.target.value })} className="pl-10" placeholder="e.g., 1000" required /></div></div>
                    </>
                  )}
                  <div><Label className="text-emerald-800">Password *</Label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="pl-10 pr-10" placeholder="Create password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}</button></div></div>
                  <div><Label className="text-emerald-800">Confirm Password *</Label><Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Confirm password" required /></div>
                  <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button><Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600">{isAdminSetup ? 'Create Admin Account' : 'Register'}</Button></div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); toast.success('Password reset instructions sent to your phone'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center text-emerald-700 mb-4 hover:text-emerald-900"><ChevronLeft className="w-5 h-5" /> Back to Login</button>
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center"><Key className="w-8 h-8 text-emerald-600" /></div>
            <CardTitle className="text-2xl text-emerald-900">Reset Password</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-gray-600 text-center mb-4">Enter your phone number and we&apos;ll send instructions to reset your password.</p>
                <div><Label className="text-emerald-800">Phone Number</Label><div className="relative mt-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="Enter your phone number" required /></div></div>
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">Send Reset Instructions</Button>
              </form>
            ) : (
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-700">We&apos;ve sent password reset instructions to <strong>{phone}</strong></p>
                <p className="text-gray-500 text-sm mt-2">Please check your messages and follow the instructions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'adminSetup'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStoredState<User | null>(STORAGE_KEYS.currentUser, null));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadStoredState<boolean>(STORAGE_KEYS.isAuthenticated, false));
  const [branches, setBranches] = useState<Branch[]>(() => loadStoredState<Branch[]>(STORAGE_KEYS.branches, sampleBranches));
  const [staff, setStaff] = useState<Staff[]>(() => loadStoredState<Staff[]>(STORAGE_KEYS.staff, sampleStaff));
  const [members, setMembers] = useState<Member[]>(() => loadStoredState<Member[]>(STORAGE_KEYS.members, sampleMembers));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadStoredState<Transaction[]>(STORAGE_KEYS.transactions, sampleTransactions));
  const [payouts, setPayouts] = useState<PayoutRecord[]>(() => loadStoredState<PayoutRecord[]>(STORAGE_KEYS.payouts, []));
  const [users, setUsers] = useState<User[]>(() => loadStoredState<User[]>(STORAGE_KEYS.users, createSeedUsers()));
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredState<AppSettings>(STORAGE_KEYS.settings, defaultSettings));
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>(() => loadStoredState<PendingTransfer[]>(STORAGE_KEYS.pendingTransfers, []));
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>(() => loadStoredState<LoanRequest[]>(STORAGE_KEYS.loanRequests, []));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadStoredState<Notification[]>(STORAGE_KEYS.notifications, []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStoredState<AuditLog[]>(STORAGE_KEYS.auditLogs, []));
  const [amountChangeRequests, setAmountChangeRequests] = useState<AmountChangeRequest[]>(() => loadStoredState<AmountChangeRequest[]>(STORAGE_KEYS.amountChangeRequests, []));
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isLoanReviewOpen, setIsLoanReviewOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedLoanRequest, setSelectedLoanRequest] = useState<LoanRequest | null>(null);
  const [loanRequestForm, setLoanRequestForm] = useState({ requested_amount: '', bank_name: settings.supported_banks[0]?.name || settings.bank_name, account_number: '', account_holder_name: '', note: '' });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isTrackingTableOpen, setIsTrackingTableOpen] = useState(false);
  const [isTotalCustomerDialogOpen, setIsTotalCustomerDialogOpen] = useState(false);
  const [isTodayCollectionDialogOpen, setIsTodayCollectionDialogOpen] = useState(false);
  const [isTotalCollectionDialogOpen, setIsTotalCollectionDialogOpen] = useState(false);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPayoutApprovalOpen, setIsPayoutApprovalOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isAmountChangeOpen, setIsAmountChangeOpen] = useState(false);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);
  const [isTransferReviewOpen, setIsTransferReviewOpen] = useState(false);
  const [quickPayForm, setQuickPayForm] = useState({ member_id: '', amount: '', payment_method: 'Cash' as 'Cash' | 'Bank Transfer' | 'Mobile Money', date: new Date().toISOString().split('T')[0], start_day: '1' });
  const [memberForm, setMemberForm] = useState<Partial<Member>>({});
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({});
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Member | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const hasAdmin = users.some(u => u.role === 'Admin');

  useEffect(() => { saveStoredState(STORAGE_KEYS.users, users); }, [users]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.branches, branches); }, [branches]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.staff, staff); }, [staff]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.members, members); }, [members]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.transactions, transactions); }, [transactions]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.payouts, payouts); }, [payouts]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.pendingTransfers, pendingTransfers); }, [pendingTransfers]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.loanRequests, loanRequests); }, [loanRequests]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.notifications, notifications); }, [notifications]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.auditLogs, auditLogs); }, [auditLogs]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.amountChangeRequests, amountChangeRequests); }, [amountChangeRequests]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.currentUser, currentUser); }, [currentUser]);
  useEffect(() => { saveStoredState(STORAGE_KEYS.isAuthenticated, isAuthenticated); }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !currentUser) setIsAuthenticated(false);
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    if (!currentUser) return;
    const syncedUser = users.find((user) => user.id === currentUser.id);
    if (syncedUser) setCurrentUser(syncedUser);
  }, [users]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (settings.last_collection_reset_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayTrans = transactions.filter(t => t.date === yesterdayStr);
      setSettings(prev => ({ ...prev, last_collection_reset_date: today, yesterday_collection_record: yesterdayTrans.reduce((sum, t) => sum + t.amount, 0), yesterday_customers_paid: yesterdayTrans.length }));
    }
  }, [settings.last_collection_reset_date, transactions]);

  const handleLogin = (credential: string, password: string) => {
    const normalizedEmail = credential.trim().toLowerCase();
    const normalizedPhone = credential.trim();
    const userByCredential = users.find(u =>
      ((u.email || '').toLowerCase() === normalizedEmail || u.phone === normalizedPhone) &&
      u.password === password
    );
    if (!userByCredential) {
      toast.error('Invalid phone or password. Please try again.');
      return;
    }
    if (!userByCredential.is_active) {
      toast.error('Your account has been deactivated. Please contact admin.');
      return;
    }
    const updatedUser = { ...userByCredential, last_login: new Date().toISOString() };
    setUsers(users.map(existingUser => existingUser.id === userByCredential.id ? updatedUser : existingUser));
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    setActiveSection('dashboard');
    toast.success(`Welcome back, ${userByCredential.name}!`);
  };

  const handleRegister = (formData: any) => {
    const normalizedEmail = (formData.email || '').trim().toLowerCase();
    const normalizedPhone = (formData.phone || '').trim();
    const duplicateUser = users.find(u => ((u.email || '').toLowerCase() === normalizedEmail) || u.phone === normalizedPhone);
    if (duplicateUser) { toast.error('An account with this email or phone already exists'); return; }

    if (formData.isAdmin) {
      if (hasAdmin) { toast.error('An admin account already exists'); return; }
      const newAdmin: User = { id: `u${Date.now()}`, name: formData.name, email: normalizedEmail, phone: normalizedPhone, password: formData.password, role: 'Admin', is_active: true, created_at: new Date().toISOString() };
      setUsers(prev => [...prev, newAdmin]);
      toast.success('Admin account created successfully! Please login with your credentials.');
      setAuthView('login');
    } else {
      if (!formData.branch_id) { toast.error('Please select a branch'); return; }
      if (!formData.daily_amount || parseInt(formData.daily_amount) < 100) { toast.error('Daily amount must be at least ₦100'); return; }
      const branch = branches.find(b => b.id === formData.branch_id);
      const now = Date.now();
      const newUserId = `u${now}`;
      const newMemberId = `m${now + 1}`;
      const newUser: User = { id: newUserId, name: formData.name, email: normalizedEmail, phone: normalizedPhone, password: formData.password, role: 'Customer', is_active: true, created_at: new Date().toISOString(), branch_id: formData.branch_id, branch_name: branch?.name || '', member_id: newMemberId };
      const newMember: Member = { id: newMemberId, user_id: newUserId, name: formData.name, phone: normalizedPhone, email: normalizedEmail, address: formData.address, daily_amount: parseInt(formData.daily_amount), start_date: new Date().toISOString().split('T')[0], status: 'Active', cycle_position: 1, branch_id: formData.branch_id, branch_name: branch?.name || '', password: formData.password, tracking: generateEmptyTracking() };
      setUsers(prev => [...prev, newUser]);
      setMembers(prev => [...prev, newMember]);
      toast.success('Registration successful! You can now login with your email and password.');
      setAuthView('login');
    }
  };

  

  const handleDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    switch (type) {
      case 'member': {
        const memberToDelete = members.find(m => m.id === id);
        setMembers(members.filter(m => m.id !== id));
        // Also remove associated user account
        if (memberToDelete?.user_id) setUsers(users.filter(u => u.id !== memberToDelete.user_id));
        toast.success('Customer deleted');
        break;
      }
      case 'branch': setBranches(branches.filter(b => b.id !== id)); toast.success('Branch deleted'); break;
      case 'staff': {
        const staffToDelete = staff.find(s => s.id === id);
        setStaff(staff.filter(s => s.id !== id));
        // Also remove associated user account
        if (staffToDelete?.user_id) setUsers(users.filter(u => u.id !== staffToDelete.user_id));
        toast.success('Staff deleted');
        break;
      }
      case 'transaction': setTransactions(transactions.filter(t => t.id !== id)); toast.success('Transaction deleted'); break;
    }
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = (type: string, id: string, name: string) => { setDeleteTarget({ type, id, name }); setIsDeleteDialogOpen(true); };

  const handleQuickPay = () => {
    const member = members.find(m => m.id === quickPayForm.member_id);
    if (!member) { toast.error('Please select a customer'); return; }
    const amount = parseInt(quickPayForm.amount);
    const dailyAmount = member.daily_amount;
    const daysCovered = Math.floor(amount / dailyAmount);
    const remainder = amount % dailyAmount;
    if (daysCovered === 0) { toast.error(`Amount must be at least &#8358;${dailyAmount}`); return; }
    let startDay = parseInt(quickPayForm.start_day);
    const memberTracking = [...member.tracking];
    let daysMarked = 0;
    for (let i = startDay - 1; i < 32 && daysMarked < daysCovered; i++) {
      if (!memberTracking[i].paid) {
        memberTracking[i] = { day: i + 1, date: quickPayForm.date, paid: true, amount: dailyAmount };
        daysMarked++;
      }
    }
    const newTransaction: Transaction = { id: `t${Date.now()}`, member_id: member.id, member_name: member.name, amount: amount - remainder, date: quickPayForm.date, payment_method: quickPayForm.payment_method, status: 'Paid', branch_id: member.branch_id, branch_name: member.branch_name, staff_id: currentUser?.id, staff_name: currentUser?.name, days_covered: daysMarked, start_day: startDay, end_day: Math.min(startDay + daysMarked - 1, 32), created_at: new Date().toISOString() };
    setTransactions([newTransaction, ...transactions]);
    setMembers(members.map(m => m.id === member.id ? { ...m, tracking: memberTracking } : m));
    if (remainder > 0) { toast.success(`Payment recorded! &#8358;${remainder} will be saved as credit`); }
    else { toast.success(`Payment recorded! ${daysMarked} day(s) marked as paid`); }
    setIsQuickPayOpen(false);
    setQuickPayForm({ member_id: '', amount: '', payment_method: 'Cash', date: new Date().toISOString().split('T')[0], start_day: '1' });
  };

  // Handle Payout - Admin can payout at any stage
  const handlePayout = (memberId: string, type: 'Payout' | 'Borrow') => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const daysPaid = member.tracking.filter(t => t.paid).length;
    const dailyAmount = member.daily_amount;
    const totalAmount = daysPaid * dailyAmount;
    const companyProfit = type === 'Payout' ? dailyAmount : 0;
    const netPayout = totalAmount - companyProfit;
    const isPartial = daysPaid < 32;

    const needsApproval = currentUser?.role === 'Staff' && (settings.require_admin_approval_for_all_payouts || !staff.find(s => s.user_id === currentUser.id)?.can_payout);

    if (needsApproval) {
      const newPayout: PayoutRecord = { id: `p${Date.now()}`, member_id: member.id, member_name: member.name, type, days_paid: daysPaid, daily_amount: dailyAmount, total_amount: totalAmount, company_profit: companyProfit, net_payout: netPayout, date: new Date().toISOString().split('T')[0], branch_id: member.branch_id, branch_name: member.branch_name, staff_id: currentUser?.id, staff_name: currentUser?.name, status: 'Pending', is_partial: isPartial };
      setPayouts([newPayout, ...payouts]);
      toast.success('Payout request submitted for admin approval');
    } else {
      const newPayout: PayoutRecord = { id: `p${Date.now()}`, member_id: member.id, member_name: member.name, type, days_paid: daysPaid, daily_amount: dailyAmount, total_amount: totalAmount, company_profit: companyProfit, net_payout: netPayout, date: new Date().toISOString().split('T')[0], branch_id: member.branch_id, branch_name: member.branch_name, staff_id: currentUser?.id, staff_name: currentUser?.name, status: 'Completed', approved_by: currentUser?.name, is_partial: isPartial };
      setPayouts([newPayout, ...payouts]);
      setMembers(members.map(m => m.id === member.id ? { ...m, tracking: generateEmptyTracking(), cycle_position: m.cycle_position + 1 } : m));
      toast.success(`${type} completed! Net payout: &#8358;${formatAmount(netPayout)}${isPartial ? ' (Partial)' : ''}`);
    }
    setIsPayoutDialogOpen(false);
    setIsBorrowDialogOpen(false);
  };

  const handleApprovePayout = (payoutId: string) => {
    const payout = payouts.find(p => p.id === payoutId);
    if (!payout) return;
    setPayouts(payouts.map(p => p.id === payoutId ? { ...p, status: 'Completed', approved_by: currentUser?.name } : p));
    setMembers(members.map(m => m.id === payout.member_id ? { ...m, tracking: generateEmptyTracking(), cycle_position: m.cycle_position + 1 } : m));
    toast.success(`Payout approved${payout.is_partial ? ' (Partial)' : ''}`);
    setIsPayoutApprovalOpen(false);
  };

  // Handle Add Fund / Bank Transfer with receipt upload
  const handleSubmitTransfer = (totalAmount: number, bankName: string, receiptData: { image: string; receiptDate: string; receiptAmount: number; receiptName: string }) => {
    const myMember = members.find(m => m.user_id === currentUser?.id);
    if (!myMember) return;
    const dailyAmount = myMember.daily_amount;
    const bankCharges = settings.bank_charges;
    const contributionAmount = totalAmount - bankCharges;
    const daysToCover = Math.floor(contributionAmount / dailyAmount);
    if (daysToCover < 1) { toast.error(`Amount must cover at least 1 day (&#8358;${dailyAmount + bankCharges})`); return; }

    const newPendingTransfer: PendingTransfer = {
      id: `pt${Date.now()}`,
      member_id: myMember.id,
      member_name: myMember.name,
      amount: contributionAmount,
      days_to_cover: daysToCover,
      bank_name: bankName,
      bank_charges: bankCharges,
      total_amount: totalAmount,
      status: 'Pending',
      created_at: new Date().toISOString(),
      receipt_image: receiptData.image,
      receipt_date: receiptData.receiptDate,
      receipt_amount: receiptData.receiptAmount,
      receipt_name: receiptData.receiptName,
      branch_id: myMember.branch_id,
      branch_name: myMember.branch_name
    };
    setPendingTransfers([newPendingTransfer, ...pendingTransfers]);
    toast.success('Transfer submitted! Admin will review your payment proof.');
    setIsAddFundOpen(false);
  };

  // Admin reviews and approves/rejects transfer
  const handleReviewTransfer = (transferId: string, approved: boolean, reason?: string) => {
    const transfer = pendingTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    if (approved) {
      const member = members.find(m => m.id === transfer.member_id);
      if (!member) return;
      const memberTracking = [...member.tracking];
      let daysMarked = 0;
      const startDay = member.tracking.findIndex((t: any) => !t.paid) + 1;
      for (let i = (startDay === 0 ? 0 : startDay - 1); i < 32 && daysMarked < transfer.days_to_cover; i++) {
        if (!memberTracking[i].paid) {
          memberTracking[i] = { day: i + 1, date: new Date().toISOString().split('T')[0], paid: true, amount: member.daily_amount };
          daysMarked++;
        }
      }
      const newTransaction: Transaction = {
        id: `t${Date.now()}`,
        member_id: member.id,
        member_name: member.name,
        amount: transfer.amount,
        date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank App Transfer',
        status: 'Paid',
        branch_id: member.branch_id,
        branch_name: member.branch_name,
        staff_id: currentUser?.id,
        staff_name: currentUser?.name,
        days_covered: daysMarked,
        start_day: startDay === 0 ? 1 : startDay,
        end_day: Math.min((startDay === 0 ? 1 : startDay) + daysMarked - 1, 32),
        created_at: new Date().toISOString(),
        bank_name: transfer.bank_name,
        bank_charges: transfer.bank_charges
      };
      setTransactions([newTransaction, ...transactions]);
      setMembers(members.map(m => m.id === member.id ? { ...m, tracking: memberTracking } : m));
      setPendingTransfers(pendingTransfers.map(t => t.id === transferId ? { ...t, status: 'Approved', reviewed_by: currentUser?.name, reviewed_at: new Date().toISOString() } : t));
      toast.success(`Transfer approved! ${daysMarked} day(s) marked as paid`);
    } else {
      setPendingTransfers(pendingTransfers.map(t => t.id === transferId ? { ...t, status: 'Rejected', reviewed_by: currentUser?.name, reviewed_at: new Date().toISOString(), rejection_reason: reason } : t));
      toast.success('Transfer rejected');
    }
    setIsTransferReviewOpen(false);
    setSelectedTransfer(null);
  };

  // Customer amount change
  const handleCustomerAmountChange = (newAmount: number) => {
    if (!currentUser || currentUser.role !== 'Customer') return;
    const myMember = members.find(m => m.user_id === currentUser.member_id);
    if (!myMember) return;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const withinWindow = dayOfMonth >= 1 && dayOfMonth <= settings.allow_change_until_day;
    if (withinWindow) {
      setMembers(members.map(m => m.id === myMember.id ? { ...m, daily_amount: newAmount } : m));
      toast.success(`Daily contribution changed to ₦${formatAmount(newAmount)}`);
      addNotification(currentUser.id, 'Contribution Updated', `Your daily contribution was changed to ₦${formatAmount(newAmount)}.`, 'success');
      addAuditLog('Amount change', `Customer changed daily contribution to ₦${formatAmount(newAmount)}`, myMember.branch_id, myMember.branch_name);
    } else if (settings.allow_change_after_grace_period) {
      const newRequest: AmountChangeRequest = {
        id: `acr${Date.now()}`,
        member_id: myMember.id,
        member_name: myMember.name,
        current_amount: myMember.daily_amount,
        requested_amount: newAmount,
        requested_at: new Date().toISOString(),
        status: 'Pending',
        branch_id: myMember.branch_id,
        branch_name: myMember.branch_name,
      };
      setAmountChangeRequests(prev => [newRequest, ...prev]);
      toast.success('Amount change request submitted for approval');
      addNotification(currentUser.id, 'Amount Change Requested', `Your request to change daily contribution to ₦${formatAmount(newAmount)} has been submitted.`, 'info');
      addAuditLog('Amount change request', `Customer requested daily amount change from ₦${formatAmount(myMember.daily_amount)} to ₦${formatAmount(newAmount)}`, myMember.branch_id, myMember.branch_name);
    } else {
      toast.error(`Changes only allowed 1st-${settings.allow_change_until_day}rd of each month`);
    }
    setIsAmountChangeOpen(false);
  };

  const handleSaveMember = () => {
    if (!memberForm.name || !memberForm.phone || !memberForm.daily_amount || !memberForm.branch_id) { toast.error('Please fill in all required fields'); return; }
    const branch = branches.find(b => b.id === memberForm.branch_id);
    if (editingId) {
      const existingMember = members.find(m => m.id === editingId);
      setMembers(members.map(m => m.id === editingId ? { ...m, ...memberForm, branch_name: branch?.name || m.branch_name } as Member : m));
      // Update associated user if exists
      if (existingMember?.user_id) {
        setUsers(users.map(u => u.id === existingMember.user_id ? { ...u, name: memberForm.name || u.name, phone: (memberForm.phone || u.phone).trim(), email: (memberForm.email || u.email || '').toLowerCase(), branch_id: memberForm.branch_id || u.branch_id, branch_name: branch?.name || u.branch_name } : u));
      }
      toast.success('Customer updated');
    } else {
      const memberId = `m${Date.now()}`;
      const userId = `u${Date.now()}`;
      const normalizedPhone = (memberForm.phone || '').trim();
      const normalizedEmail = (memberForm.email || '').trim().toLowerCase();
      // Check for duplicate phone/email
      const duplicateUser = users.find(u => u.phone === normalizedPhone || (normalizedEmail && (u.email || '').toLowerCase() === normalizedEmail));
      if (duplicateUser) { toast.error('A user with this phone or email already exists'); return; }
      const newMember: Member = { id: memberId, user_id: userId, name: memberForm.name, phone: normalizedPhone, email: normalizedEmail, address: memberForm.address || '', daily_amount: parseInt(memberForm.daily_amount?.toString() || '0'), start_date: new Date().toISOString().split('T')[0], status: 'Active', cycle_position: 1, branch_id: memberForm.branch_id, branch_name: branch?.name || '', password: memberForm.password || 'customer123', tracking: generateEmptyTracking() };
      // Create associated user account so customer can login
      const newUser: User = { id: userId, name: memberForm.name, email: normalizedEmail, phone: normalizedPhone, password: memberForm.password || 'customer123', role: 'Customer', is_active: true, created_at: new Date().toISOString(), branch_id: memberForm.branch_id, branch_name: branch?.name || '', member_id: memberId };
      setMembers([...members, newMember]);
      setUsers([...users, newUser]);
      toast.success('Customer added successfully! Default password: customer123');
    }
    setIsMemberDialogOpen(false); setMemberForm({}); setEditingId(null);
  };

  const handleSaveBranch = () => {
    if (!branchForm.name || !branchForm.address || !branchForm.phone) { toast.error('Please fill in all required fields'); return; }
    if (editingId) { setBranches(branches.map(b => b.id === editingId ? { ...b, ...branchForm } as Branch : b)); toast.success('Branch updated'); }
    else { setBranches([...branches, { id: `b${Date.now()}`, name: branchForm.name, address: branchForm.address, phone: branchForm.phone, manager: branchForm.manager || '', created_at: new Date().toISOString() }]); toast.success('Branch added'); }
    setIsBranchDialogOpen(false); setBranchForm({}); setEditingId(null);
  };

  const handleSaveStaff = () => {
    if (!staffForm.name || !staffForm.phone || !staffForm.email || !staffForm.password || !staffForm.branch_id) { toast.error('Please fill in all required fields'); return; }
    const normalizedEmail = (staffForm.email || '').trim().toLowerCase();
    const normalizedPhone = (staffForm.phone || '').trim();
    const branch = branches.find(b => b.id === staffForm.branch_id);
    if (editingId) {
      const existingStaff = staff.find(s => s.id === editingId);
      if (!existingStaff) return;
      setStaff(staff.map(s => s.id === editingId ? { ...s, ...staffForm, email: normalizedEmail, phone: normalizedPhone, branch_name: branch?.name || s.branch_name } as Staff : s));
      setUsers(users.map(u => u.id === existingStaff.user_id ? { ...u, name: staffForm.name || u.name, email: normalizedEmail, phone: normalizedPhone, password: staffForm.password || u.password, branch_id: staffForm.branch_id || u.branch_id, branch_name: branch?.name || u.branch_name } : u));
      toast.success('Staff updated');
    }
    else {
      const duplicateUser = users.find(u => ((u.email || '').toLowerCase() === normalizedEmail) || u.phone === normalizedPhone);
      if (duplicateUser) { toast.error('A user with this email or phone already exists'); return; }
      const newStaff: Staff = { id: `s${Date.now()}`, user_id: `u${Date.now()}`, name: staffForm.name, phone: normalizedPhone, email: normalizedEmail, password: staffForm.password, role: staffForm.role || 'Staff', branch_id: staffForm.branch_id, branch_name: branch?.name || '', can_payout: staffForm.can_payout || false, created_at: new Date().toISOString() };
      const newUser: User = { id: newStaff.user_id, name: staffForm.name, email: normalizedEmail, phone: normalizedPhone, password: staffForm.password, role: 'Staff', branch_id: staffForm.branch_id, branch_name: branch?.name || '', is_active: true, created_at: new Date().toISOString() };
      setStaff([...staff, newStaff]); setUsers([...users, newUser]);
      toast.success('Staff added');
    }
    setIsStaffDialogOpen(false); setStaffForm({}); setEditingId(null);
  };

  const handleSaveSettings = (newSettings: AppSettings) => { setSettings(newSettings); toast.success('Settings saved'); };

  const handleSubmitLoanRequest = () => {
    if (!currentUser || currentUser.role !== 'Customer') return;
    const myMember = members.find(m => m.user_id === currentUser.member_id);
    if (!myMember) return;
    const requestedAmount = parseInt(loanRequestForm.requested_amount);
    if (!requestedAmount || requestedAmount < 1000) { toast.error('Enter a valid loan amount of at least ₦1,000'); return; }
    const daysPaid = myMember.tracking.filter(t => t.paid).length;
    const maxLoan = Math.min(daysPaid, 30) * myMember.daily_amount;
    if (daysPaid < 10) { toast.error('You need at least 10 days of contributions to request a loan'); return; }
    if (requestedAmount > maxLoan) { toast.error(`Maximum loan amount is ₦${formatAmount(maxLoan)}`); return; }
    const newLoanRequest: LoanRequest = {
      id: `lr${Date.now()}`,
      member_id: myMember.id,
      member_name: myMember.name,
      branch_id: myMember.branch_id,
      branch_name: myMember.branch_name,
      bank_name: loanRequestForm.bank_name,
      account_number: loanRequestForm.account_number,
      account_holder_name: loanRequestForm.account_holder_name,
      requested_amount: requestedAmount,
      note: loanRequestForm.note,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    setLoanRequests(prev => [newLoanRequest, ...prev]);
    toast.success('Loan request submitted successfully');
    addNotification(currentUser.id, 'Loan Request Submitted', `Your loan request for ₦${formatAmount(requestedAmount)} has been submitted.`, 'success');
    users.filter(u => u.role === 'Admin' || u.role === 'Staff').forEach((adminUser) => addNotification(adminUser.id, 'Loan Request Awaiting Review', `${myMember.name} has submitted a loan request.`, 'info'));
    addAuditLog('Loan request submitted', `Loan request of ₦${formatAmount(requestedAmount)} created for ${myMember.name}`, myMember.branch_id, myMember.branch_name);
    setIsLoanDialogOpen(false);
    setLoanRequestForm({ requested_amount: '', bank_name: settings.supported_banks[0]?.name || settings.bank_name, account_number: '', account_holder_name: '', note: '' });
  };

  const handleReviewLoanRequest = (loanId: string, approved: boolean, comment?: string) => {
    const loan = loanRequests.find(l => l.id === loanId);
    if (!loan) return;
    const member = members.find(m => m.id === loan.member_id);
    if (!member) return;
    const loanUserId = users.find(u => u.member_id === loan.member_id)?.id || '';
    const updatedRequest = { ...loan, status: approved ? 'Approved' : 'Rejected', reviewed_by: currentUser?.name, reviewed_at: new Date().toISOString(), comment } as LoanRequest;
    setLoanRequests(loanRequests.map(l => l.id === loanId ? updatedRequest : l));
    if (approved) {
      const newPayout: PayoutRecord = {
        id: `p${Date.now()}`,
        member_id: member.id,
        member_name: member.name,
        type: 'Borrow',
        days_paid: 0,
        daily_amount: member.daily_amount,
        total_amount: loan.requested_amount,
        company_profit: 0,
        net_payout: loan.requested_amount,
        date: new Date().toISOString().split('T')[0],
        branch_id: member.branch_id,
        branch_name: member.branch_name,
        staff_id: currentUser?.id,
        staff_name: currentUser?.name,
        status: 'Completed',
        approved_by: currentUser?.name,
      };
      setPayouts(prev => [newPayout, ...prev]);
      addNotification(loanUserId || currentUser?.id || '', 'Loan Approved', `Your loan request for ₦${formatAmount(loan.requested_amount)} has been approved.`, 'success');
      addAuditLog('Loan approved', `Loan request ${loan.id} approved for ${member.name}`, member.branch_id, member.branch_name);
      toast.success('Loan approved and payout recorded');
    } else {
      addNotification(loanUserId || currentUser?.id || '', 'Loan Rejected', `Your loan request has been rejected. ${comment || ''}`, 'warning');
      addAuditLog('Loan rejected', `Loan request ${loan.id} rejected for ${member.name}`, member.branch_id, member.branch_name);
      toast.success('Loan rejected');
    }
    setIsLoanReviewOpen(false);
    setSelectedLoanRequest(null);
  };

  const handleApproveAmountChange = (requestId: string, approved: boolean) => {
    const request = amountChangeRequests.find(r => r.id === requestId);
    if (!request) return;
    const member = members.find(m => m.id === request.member_id);
    if (!member) return;
    const updatedRequest = { ...request, status: approved ? 'Approved' : 'Rejected', approved_by: currentUser?.name, approved_at: new Date().toISOString() } as AmountChangeRequest;
    setAmountChangeRequests(amountChangeRequests.map(r => r.id === requestId ? updatedRequest : r));
    if (approved) {
      setMembers(members.map(m => m.id === member.id ? { ...m, daily_amount: request.requested_amount } : m));
      addNotification(users.find(u => u.member_id === member.id)?.id || member.user_id || '', 'Amount Change Approved', `Your daily contribution change to ₦${formatAmount(request.requested_amount)} has been approved.`, 'success');
      addAuditLog('Amount change approved', `Amount change request approved for ${member.name}`, member.branch_id, member.branch_name);
      toast.success('Amount change request approved');
    } else {
      addNotification(users.find(u => u.member_id === member.id)?.id || member.user_id || '', 'Amount Change Rejected', `Your amount change request was rejected.`, 'error');
      addAuditLog('Amount change rejected', `Amount change request rejected for ${member.name}`, member.branch_id, member.branch_name);
      toast.success('Amount change request rejected');
    }
  };

  const handleLogout = () => { setCurrentUser(null); setIsAuthenticated(false); setActiveSection('dashboard'); saveStoredState(STORAGE_KEYS.currentUser, null); saveStoredState(STORAGE_KEYS.isAuthenticated, false); toast.success('Logged out successfully'); };

  const handleWhatsAppSend = () => {
    if (!whatsAppMessage.trim()) { toast.error('Please enter a message'); return; }
    const phone = settings.customer_care_whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsAppMessage)}`, '_blank');
    toast.success('Opening WhatsApp...'); setIsWhatsAppOpen(false); setWhatsAppMessage('');
  };

  const visibleMembers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return members;
    if (currentUser.role === 'Staff') return members.filter(m => m.branch_id === currentUser.branch_id);
    return members.filter(m => m.user_id === currentUser.member_id);
  }, [currentUser, members]);

  const visibleTransactions = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return transactions;
    if (currentUser.role === 'Staff') return transactions.filter(t => t.branch_id === currentUser.branch_id);
    return transactions.filter(t => t.member_id === currentUser.member_id);
  }, [currentUser, transactions]);

  const visiblePayouts = useMemo(() => {
    if (!currentUser) return payouts;
    if (currentUser.role === 'Admin') return payouts;
    if (currentUser.role === 'Staff') return payouts.filter(p => p.branch_id === currentUser.branch_id);
    return payouts.filter(p => p.member_id === currentUser.member_id);
  }, [currentUser, payouts]);

  const visiblePendingTransfers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return pendingTransfers;
    if (currentUser.role === 'Staff') return pendingTransfers.filter(t => t.branch_id === currentUser.branch_id);
    return pendingTransfers.filter(t => t.member_id === currentUser.member_id);
  }, [currentUser, pendingTransfers]);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(n => n.user_id === currentUser.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [currentUser, notifications]);

  const unreadNotificationCount = useMemo(() => userNotifications.filter(n => !n.read).length, [userNotifications]);

  const addNotification = (userId: string, title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    const notification: Notification = { id: `n${Date.now()}`, user_id: userId, title, message, type, created_at: new Date().toISOString(), read: false };
    setNotifications(prev => [notification, ...prev]);
  };

  const addAuditLog = (action: string, description: string, branchId?: string, branchName?: string) => {
    if (!currentUser) return;
    const log: AuditLog = {
      id: `a${Date.now()}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      role: currentUser.role,
      branch_id: branchId || currentUser.branch_id,
      branch_name: branchName || currentUser.branch_name,
      action,
      description,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(memberSearch.toLowerCase()) || member.phone.includes(memberSearch);
      const matchesBranch = branchFilter === 'all' || member.branch_id === branchFilter;
      const matchesUserBranch = currentUser?.role === 'Admin' || (currentUser?.role === 'Staff' && member.branch_id === currentUser?.branch_id);
      return matchesSearch && matchesBranch && matchesUserBranch;
    });
  }, [members, memberSearch, branchFilter, currentUser]);

  const stats: DashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeMembers = members.filter(m => m.status === 'Active');
    const todayTransactions = transactions.filter(t => t.date === today);
    return {
      totalMembers: members.length, activeMembers: activeMembers.length, inactiveMembers: members.filter(m => m.status === 'Inactive').length,
      todayCollections: todayTransactions.reduce((sum, t) => sum + t.amount, 0),
      yesterdayCollections: settings.yesterday_collection_record,
      totalCollections: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalPayouts: payouts.filter(p => p.type === 'Payout' && p.status === 'Completed').reduce((sum, p) => sum + p.net_payout, 0),
      totalBorrows: payouts.filter(p => p.type === 'Borrow' && p.status === 'Completed').reduce((sum, p) => sum + p.total_amount, 0),
      companyProfit: payouts.filter(p => p.type === 'Payout' && p.status === 'Completed').reduce((sum, p) => sum + p.company_profit, 0),
      averageDailyCollection: activeMembers.reduce((sum, m) => sum + m.daily_amount, 0),
      collectionRate: activeMembers.length > 0 ? (todayTransactions.length / activeMembers.length) * 100 : 0,
      pendingPayments: activeMembers.length - todayTransactions.length, overduePayments: 0,
      totalBranches: branches.length, totalStaff: staff.length, todayCustomersPaid: todayTransactions.length,
      pendingTransfers: pendingTransfers.filter(t => t.status === 'Pending' || t.status === 'Under Review').length,
      pendingLoans: loanRequests.filter(l => l.status === 'Pending').length
    };
  }, [members, transactions, payouts, branches, staff, settings.yesterday_collection_record, pendingTransfers]);

  const todayTransactions = useMemo(() => { const today = new Date().toISOString().split('T')[0]; return transactions.filter(t => t.date === today); }, [transactions]);

  const branchStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branches.map(branch => {
      const branchMembers = members.filter(m => m.branch_id === branch.id);
      const branchTransactions = transactions.filter(t => t.branch_id === branch.id);
      return {
        id: branch.id,
        name: branch.name,
        members: branchMembers.length,
        todayCollections: branchTransactions.filter(t => t.date === today).reduce((s, t) => s + t.amount, 0),
        totalCollections: branchTransactions.reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [branches, members, transactions]);

  const monthlyData = useMemo(() => { const months: Record<string, number> = {}; transactions.forEach(t => { const month = t.date.slice(0, 7); months[month] = (months[month] || 0) + t.amount; }); return Object.entries(months).sort().slice(-6) as [string, number][]; }, [transactions]);

  const canChangeAmount = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return settings.allow_customers_change_amount && dayOfMonth >= 1 && dayOfMonth <= settings.allow_change_until_day;
  };

  function getNavItems() {
    const items: { id: string; label: string; icon: any }[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'transactions', label: 'Transactions', icon: Wallet },
      { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
      { id: 'members', label: 'Members', icon: Users },
    ];
    if (currentUser?.role === 'Admin') {
      items.push({ id: 'branches', label: 'Branches', icon: Building2 });
      items.push({ id: 'reports', label: 'Reports', icon: TrendingUp });
      items.push({ id: 'settings', label: 'Settings', icon: Cog });
    }
    if (currentUser?.role === 'Staff') {
      items.push({ id: 'ordinary-payout', label: 'Payouts', icon: DollarSign });
    }
    if (currentUser?.role === 'Customer') {
      items.push({ id: 'tracking', label: 'Tracking', icon: Calendar });
      items.push({ id: 'history', label: 'History', icon: History });
      items.push({ id: 'support', label: 'Support', icon: Phone });
      items.push({ id: 'settings', label: 'Settings', icon: Cog });
    }
    return items;
  }

  if (showWelcome) return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  if (!isAuthenticated) {
    if (authView === 'register') return <RegisterScreen onBack={() => setAuthView('login')} onRegister={handleRegister} branches={branches} />;
    if (authView === 'adminSetup') return <RegisterScreen onBack={() => setAuthView('login')} onRegister={handleRegister} branches={branches} isAdminSetup />;
    if (authView === 'forgot') return <ForgotPasswordScreen onBack={() => setAuthView('login')} />;
    return <LoginScreen onLogin={handleLogin} onRegister={() => setAuthView('register')} onForgotPassword={() => setAuthView('forgot')} onAdminSetup={() => setAuthView('adminSetup')} hasAdmin={hasAdmin} />;
  }

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <Toaster position="top-right" richColors />
      <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 text-white transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (<div className="flex items-center gap-2"><div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center"><PiggyBank className="w-5 h-5 text-white" /></div><div><h1 className="font-bold text-lg leading-tight">HIREMERCY</h1><p className="text-xs text-emerald-300">AJO</p></div></div>)}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-emerald-700 rounded"><Menu className="w-5 h-5" /></button>
        </div>
        <nav className="mt-6 px-2 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${activeSection === item.id ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              {item.id === 'transfers' && pendingTransfers.filter(t => t.status === 'Pending').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingTransfers.filter(t => t.status === 'Pending').length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className={`bg-emerald-800/50 rounded-lg p-3 ${sidebarOpen ? '' : 'p-2'}`}>
            {sidebarOpen ? (<><div className="flex items-center gap-2 mb-2"><UserCircle className="w-8 h-8 text-emerald-300" /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{currentUser?.name}</p><p className="text-xs text-emerald-300">{currentUser?.role}</p></div></div><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm"><LogOut className="w-4 h-4" /> Logout</button></>) : (<button onClick={handleLogout} className="w-full flex justify-center text-red-300"><LogOut className="w-5 h-5" /></button>)}
          </div>
        </div>
      </aside>
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <header className="bg-white shadow-sm border-b border-emerald-100 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div><h2 className="text-2xl font-bold text-emerald-900">{navItems.find(n => n.id === activeSection)?.label}</h2><p className="text-sm text-emerald-600">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
            <div className="flex items-center gap-3">
              {currentUser?.role !== 'Customer' && (
                <Button onClick={() => setIsQuickPayOpen(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"><Plus className="w-4 h-4 mr-2" /> Quick Pay</Button>
              )}
            </div>
          </div>
        </header>
        <div className="p-6">
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Staff') && activeSection === 'dashboard' && (<AdminDashboard stats={stats} branchStats={branchStats} monthlyData={monthlyData} transactions={transactions} onTotalCustomerClick={() => setIsTotalCustomerDialogOpen(true)} onTodayCollectionClick={() => setIsTodayCollectionDialogOpen(true)} onTotalCollectionClick={() => setIsTotalCollectionDialogOpen(true)} />)}
          {currentUser?.role === 'Customer' && activeSection === 'dashboard' && (<CustomerDashboard currentUser={currentUser} members={members} transactions={transactions} payouts={payouts} onViewTracking={() => setActiveSection('tracking')} onViewHistory={() => setActiveSection('history')} onContactSupport={() => setActiveSection('support')} canChangeAmount={canChangeAmount()} onChangeAmount={() => setIsAmountChangeOpen(true)} onAddFund={() => setIsAddFundOpen(true)} settings={settings} pendingTransfers={pendingTransfers} />)}
          {currentUser?.role === 'Customer' && activeSection === 'tracking' && (<CustomerTracking currentUser={currentUser} members={members} />)}
          {currentUser?.role === 'Customer' && activeSection === 'history' && (<CustomerHistory currentUser={currentUser} members={members} transactions={transactions} />)}
          {currentUser?.role === 'Customer' && activeSection === 'support' && (<CustomerSupport settings={settings} onWhatsApp={() => setIsWhatsAppOpen(true)} />)}
          {currentUser?.role === 'Customer' && activeSection === 'settings' && (<CustomerSettings currentUser={currentUser} members={members} canChangeAmount={canChangeAmount()} onUpdateProfile={(updatedUser: User) => { setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u)); setCurrentUser(updatedUser); }} onRequestAmountChange={() => setIsAmountChangeOpen(true)} />)}
          {(activeSection === 'members' && currentUser?.role !== 'Customer') && (<MembersSection members={filteredMembers} branches={branches} currentUser={currentUser} memberSearch={memberSearch} setMemberSearch={setMemberSearch} branchFilter={branchFilter} setBranchFilter={setBranchFilter} onAddMember={() => { setMemberForm({}); setEditingId(null); setIsMemberDialogOpen(true); }} onEditMember={(member) => { setMemberForm(member); setEditingId(member.id); setIsMemberDialogOpen(true); }} onDeleteMember={(member) => confirmDelete('member', member.id, member.name)} onViewTracking={(member) => { setSelectedCustomer(member); setIsTrackingTableOpen(true); }} onViewHistory={(member) => { setSelectedCustomer(member); setIsCustomerDetailOpen(true); }} onQuickPay={(member) => { setQuickPayForm({ ...quickPayForm, member_id: member.id }); setIsQuickPayOpen(true); }} />)}
          {activeSection === 'branches' && currentUser?.role === 'Admin' && (<BranchesSection branches={branches} staff={staff} onAddBranch={() => { setBranchForm({}); setEditingId(null); setIsBranchDialogOpen(true); }} onEditBranch={(branch) => { setBranchForm(branch); setEditingId(branch.id); setIsBranchDialogOpen(true); }} onDeleteBranch={(branch) => confirmDelete('branch', branch.id, branch.name)} onAddStaff={() => { setStaffForm({}); setEditingId(null); setIsStaffDialogOpen(true); }} onEditStaff={(s) => { setStaffForm(s); setEditingId(s.id); setIsStaffDialogOpen(true); }} onDeleteStaff={(s) => confirmDelete('staff', s.id, s.name)} />)}
          {activeSection === 'transactions' && (<TransactionsSection transactions={transactions} members={members} currentUser={currentUser} onDeleteTransaction={(t) => confirmDelete('transaction', t.id, `Transaction for ${t.member_name}`)} />)}
          {activeSection === 'transfers' && currentUser?.role === 'Admin' && (<TransferReviewSection pendingTransfers={pendingTransfers} onReview={(transfer) => { setSelectedTransfer(transfer); setIsTransferReviewOpen(true); }} />)}
          {activeSection === 'ordinary-payout' && (<PayoutSection members={members} payouts={payouts} currentUser={currentUser} staff={staff} settings={settings} onPayout={(member) => { setSelectedCustomer(member); setIsPayoutDialogOpen(true); }} onBorrow={(member) => { setSelectedCustomer(member); setIsBorrowDialogOpen(true); }} onApprove={(payout) => { setSelectedPayout(payout); setIsPayoutApprovalOpen(true); }} />)}
          {activeSection === 'tracking-table' && currentUser?.role !== 'Customer' && (<AdminTrackingTable members={members} branches={branches} />)}
          {activeSection === 'reports' && currentUser?.role === 'Admin' && (<ReportsSection transactions={transactions} payouts={payouts} branches={branches} monthFilter={monthFilter} setMonthFilter={setMonthFilter} />)}
          {activeSection === 'settings' && currentUser?.role === 'Admin' && (<AdminSettings settings={settings} onSave={handleSaveSettings} amountChangeRequests={amountChangeRequests} onApproveAmountChange={() => {}} />)}
        </div>
      </main>
      <QuickPayDialog isOpen={isQuickPayOpen} onClose={() => setIsQuickPayOpen(false)} members={members} currentUser={currentUser} quickPayForm={quickPayForm} setQuickPayForm={setQuickPayForm} onSubmit={handleQuickPay} />
      <MemberDialog isOpen={isMemberDialogOpen} onClose={() => setIsMemberDialogOpen(false)} memberForm={memberForm} setMemberForm={setMemberForm} branches={branches} editingId={editingId} onSave={handleSaveMember} />
      <BranchDialog isOpen={isBranchDialogOpen} onClose={() => setIsBranchDialogOpen(false)} branchForm={branchForm} setBranchForm={setBranchForm} editingId={editingId} onSave={handleSaveBranch} />
      <StaffDialog isOpen={isStaffDialogOpen} onClose={() => setIsStaffDialogOpen(false)} staffForm={staffForm} setStaffForm={setStaffForm} branches={branches} editingId={editingId} onSave={handleSaveStaff} />
      <PayoutDialog isOpen={isPayoutDialogOpen} onClose={() => setIsPayoutDialogOpen(false)} selectedCustomer={selectedCustomer} onConfirm={() => selectedCustomer && handlePayout(selectedCustomer.id, 'Payout')} />
      <BorrowDialog isOpen={isBorrowDialogOpen} onClose={() => setIsBorrowDialogOpen(false)} selectedCustomer={selectedCustomer} onConfirm={() => selectedCustomer && handlePayout(selectedCustomer.id, 'Borrow')} />
      <TrackingTableDialog isOpen={isTrackingTableOpen} onClose={() => setIsTrackingTableOpen(false)} members={members} branches={branches} selectedCustomer={selectedCustomer} />
      <TotalCustomerDialog isOpen={isTotalCustomerDialogOpen} onClose={() => setIsTotalCustomerDialogOpen(false)} members={members} stats={stats} transactions={transactions} />
      <TodayCollectionDialog isOpen={isTodayCollectionDialogOpen} onClose={() => setIsTodayCollectionDialogOpen(false)} branchStats={branchStats} todayTransactions={todayTransactions} stats={stats} />
      <TotalCollectionDialog isOpen={isTotalCollectionDialogOpen} onClose={() => setIsTotalCollectionDialogOpen(false)} transactions={transactions} stats={stats} />
      <CustomerDetailDialog isOpen={isCustomerDetailOpen} onClose={() => setIsCustomerDetailOpen(false)} selectedCustomer={selectedCustomer} transactions={transactions} />
      <PayoutApprovalDialog isOpen={isPayoutApprovalOpen} onClose={() => setIsPayoutApprovalOpen(false)} selectedPayout={selectedPayout} onApprove={() => selectedPayout && handleApprovePayout(selectedPayout.id)} />
      <AmountChangeDialog isOpen={isAmountChangeOpen} onClose={() => setIsAmountChangeOpen(false)} currentUser={currentUser} members={members} settings={settings} onSubmit={handleCustomerAmountChange} />
      <AddFundDialog isOpen={isAddFundOpen} onClose={() => setIsAddFundOpen(false)} members={members} currentUser={currentUser} settings={settings} onSubmit={handleSubmitTransfer} />
      <TransferReviewDialog isOpen={isTransferReviewOpen} onClose={() => setIsTransferReviewOpen(false)} transfer={selectedTransfer} settings={settings} onReview={handleReviewTransfer} />
      <WhatsAppDialog isOpen={isWhatsAppOpen} onClose={() => setIsWhatsAppOpen(false)} whatsAppMessage={whatsAppMessage} setWhatsAppMessage={setWhatsAppMessage} onSend={handleWhatsAppSend} settings={settings} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} deleteTarget={deleteTarget} onConfirm={handleDelete} />
    </div>
  );
}

function AdminDashboard({ stats, branchStats, monthlyData, transactions, onTotalCustomerClick, onTodayCollectionClick, onTotalCollectionClick }: { stats: DashboardStats; branchStats: any[]; monthlyData: [string, number][]; transactions: Transaction[]; onTotalCustomerClick: () => void; onTodayCollectionClick: () => void; onTotalCollectionClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={onTotalCustomerClick}>
          <CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-emerald-100 text-sm">Total Customers</p><p className="text-3xl font-bold">{stats.totalMembers}</p><p className="text-emerald-100 text-xs mt-1">{stats.activeMembers} active</p></div><Users className="w-10 h-10 text-emerald-200" /></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={onTodayCollectionClick}>
          <CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-blue-100 text-sm">Today&apos;s Collection</p><p className="text-3xl font-bold">&#8358;{formatAmount(stats.todayCollections)}</p><p className="text-blue-100 text-xs mt-1">{stats.todayCustomersPaid} customers paid</p></div><Wallet className="w-10 h-10 text-blue-200" /></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={onTotalCollectionClick}>
          <CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-purple-100 text-sm">Total Collection</p><p className="text-3xl font-bold">&#8358;{formatAmount(stats.totalCollections)}</p><p className="text-purple-100 text-xs mt-1">All time</p></div><TrendingUp className="w-10 h-10 text-purple-200" /></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-amber-100 text-sm">Pending Transfers</p><p className="text-3xl font-bold">{stats.pendingTransfers}</p><p className="text-amber-100 text-xs mt-1">Awaiting review</p></div><Clock className="w-10 h-10 text-amber-200" /></div></CardContent>
        </Card>
      </div>
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center"><History className="w-5 h-5 text-gray-600" /></div>
              <div><p className="text-gray-600 text-sm">Yesterday&apos;s Collection</p><p className="text-xl font-bold text-gray-800">&#8358;{formatAmount(stats.yesterdayCollections)}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" />Branch Summary</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{branchStats.map(branch => (<div key={branch.id} className="bg-emerald-50 rounded-lg p-4"><h4 className="font-semibold text-emerald-900">{branch.name}</h4><div className="mt-2 space-y-1 text-sm"><p className="flex justify-between"><span className="text-gray-600">Customers:</span><span className="font-medium">{branch.memberCount}</span></p><p className="flex justify-between"><span className="text-gray-600">Today&apos;s:</span><span className="font-medium text-emerald-600">&#8358;{formatAmount(branch.todayCollection)}</span></p><p className="flex justify-between"><span className="text-gray-600">Total:</span><span className="font-medium">&#8358;{formatAmount(branch.totalCollection)}</span></p></div></div>))}</div></CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Monthly Collections</CardTitle></CardHeader><CardContent><Bar data={{ labels: monthlyData.map(([month]) => month), datasets: [{ label: 'Collections', data: monthlyData.map(([, amount]) => amount), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1 }] }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Collection by Payment Method</CardTitle></CardHeader><CardContent className="flex justify-center"><Doughnut data={{ labels: ['Cash', 'Bank Transfer', 'Mobile Money', 'Bank App Transfer'], datasets: [{ data: [transactions.filter(t => t.payment_method === 'Cash').reduce((s, t) => s + t.amount, 0), transactions.filter(t => t.payment_method === 'Bank Transfer').reduce((s, t) => s + t.amount, 0), transactions.filter(t => t.payment_method === 'Mobile Money').reduce((s, t) => s + t.amount, 0), transactions.filter(t => t.payment_method === 'Bank App Transfer').reduce((s, t) => s + t.amount, 0)], backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(245, 158, 11, 0.8)'] }] }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /></CardContent></Card>
      </div>
    </div>
  );
}

function CustomerDashboard({ currentUser, members, transactions, payouts, onViewTracking, onViewHistory, onContactSupport, canChangeAmount, onChangeAmount, onAddFund, settings, pendingTransfers }: { currentUser: User | null; members: Member[]; transactions: Transaction[]; payouts: PayoutRecord[]; onViewTracking: () => void; onViewHistory: () => void; onContactSupport: () => void; canChangeAmount: boolean; onChangeAmount: () => void; onAddFund: () => void; settings: AppSettings; pendingTransfers: PendingTransfer[] }) {
  const myMember = members.find(m => m.user_id === currentUser?.id);
  const myTransactions = transactions.filter(t => t.member_id === myMember?.id);
  const myPayouts = payouts.filter(p => p.member_id === myMember?.id);
  const daysPaid = myMember?.tracking.filter(t => t.paid).length || 0;
  const totalContributed = myTransactions.reduce((s, t) => s + t.amount, 0);
  const progressPercent = (daysPaid / 32) * 100;
  const myPendingTransfers = pendingTransfers.filter(t => t.member_id === myMember?.id && (t.status === 'Pending' || t.status === 'Under Review'));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold">Welcome, {currentUser?.name}!</h2><p className="text-emerald-100 mt-1">Track your savings and manage your contributions</p></div>
          <Button onClick={onAddFund} className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"><Plus className="w-4 h-4 mr-2" /> Add Fund</Button>
        </div>
      </div>

      {myPendingTransfers.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <p className="text-amber-800 text-sm">You have {myPendingTransfers.length} transfer(s) pending admin review</p>
            </div>
          </CardContent>
        </Card>
      )}

      {canChangeAmount && myMember && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div>
                <div><p className="font-medium text-amber-800">Change Your Daily Amount</p><p className="text-sm text-amber-600">Available until the {settings.allow_change_until_day}rd of this month</p></div>
              </div>
              <Button onClick={onChangeAmount} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">Change Amount</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-emerald-100 text-sm">Days Completed</p><p className="text-3xl font-bold">{daysPaid}/32</p></div><Calendar className="w-10 h-10 text-emerald-200" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-blue-100 text-sm">Total Contributed</p><p className="text-3xl font-bold">&#8358;{formatAmount(totalContributed)}</p></div><Wallet className="w-10 h-10 text-blue-200" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-purple-100 text-sm">Daily Amount</p><p className="text-3xl font-bold">&#8358;{formatAmount(myMember?.daily_amount) || '0'}</p></div><DollarSign className="w-10 h-10 text-purple-200" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-amber-100 text-sm">Expected Payout</p><p className="text-3xl font-bold">&#8358;{myMember ? formatAmount((daysPaid * myMember.daily_amount) - myMember.daily_amount) : '0'}</p></div><PiggyBank className="w-10 h-10 text-amber-200" /></div></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" />Your Progress</CardTitle></CardHeader><CardContent>
        <div className="space-y-4">
          <div><div className="flex justify-between mb-2"><span className="text-sm text-gray-600">Cycle Progress</span><span className="text-sm font-medium">{Math.round(progressPercent)}%</span></div><div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${progressPercent}%` }} /></div></div>
          <div className="grid grid-cols-3 gap-4 text-center"><div className="bg-emerald-50 rounded-lg p-3"><p className="text-2xl font-bold text-emerald-600">{daysPaid}</p><p className="text-xs text-gray-600">Days Paid</p></div><div className="bg-blue-50 rounded-lg p-3"><p className="text-2xl font-bold text-blue-600">{32 - daysPaid}</p><p className="text-xs text-gray-600">Days Remaining</p></div><div className="bg-purple-50 rounded-lg p-3"><p className="text-2xl font-bold text-purple-600">{myPayouts.length}</p><p className="text-xs text-gray-600">Payouts</p></div></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={onViewTracking} className="bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-6 text-center transition-all hover:shadow-lg group"><div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200"><Calendar className="w-7 h-7 text-emerald-600" /></div><h3 className="font-semibold text-emerald-900">View Tracking</h3><p className="text-sm text-gray-600 mt-1">See your 32-day progress</p></button>
        <button onClick={onViewHistory} className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-xl p-6 text-center transition-all hover:shadow-lg group"><div className="w-14 h-14 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200"><History className="w-7 h-7 text-blue-600" /></div><h3 className="font-semibold text-blue-900">Transaction History</h3><p className="text-sm text-gray-600 mt-1">View all your payments</p></button>
        <button onClick={onContactSupport} className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 text-center transition-all hover:shadow-lg group"><div className="w-14 h-14 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200"><HelpCircle className="w-7 h-7 text-purple-600" /></div><h3 className="font-semibold text-purple-900">Get Support</h3><p className="text-sm text-gray-600 mt-1">Contact us for help</p></button>
      </div>
    </div>
  );
}

function MembersSection({ members, branches, currentUser, memberSearch, setMemberSearch, branchFilter, setBranchFilter, onAddMember, onEditMember, onDeleteMember, onViewTracking, onViewHistory, onQuickPay }: { members: Member[]; branches: Branch[]; currentUser: User | null; memberSearch: string; setMemberSearch: (s: string) => void; branchFilter: string; setBranchFilter: (s: string) => void; onAddMember: () => void; onEditMember: (m: Member) => void; onDeleteMember: (m: Member) => void; onViewTracking: (m: Member) => void; onViewHistory: (m: Member) => void; onQuickPay: (m: Member) => void }) {
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search customers by name or phone..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-10" /></div><Select value={branchFilter} onValueChange={setBranchFilter}><SelectTrigger className="w-full md:w-48"><SelectValue placeholder="All Branches" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{branches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select>{currentUser?.role === 'Admin' && (<Button onClick={onAddMember} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>)}</div></CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Branch</TableHead><TableHead>Daily Amount</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{members.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-500"><Users className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No customers found</p></TableCell></TableRow>) : (members.map(member => (<TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.phone}</TableCell><TableCell><Badge variant="outline" className="text-xs">{member.branch_name}</Badge></TableCell><TableCell>&#8358;{formatAmount(member.daily_amount)}</TableCell><TableCell><Badge className={member.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'}>{member.status}</Badge></TableCell><TableCell><div className="flex items-center gap-2"><div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(member.tracking.filter(t => t.paid).length / 32) * 100}%` }} /></div><span className="text-xs text-gray-600">{member.tracking.filter(t => t.paid).length}/32</span></div></TableCell><TableCell><div className="flex items-center justify-end gap-1"><button onClick={() => onViewTracking(member)} className="p-1 hover:bg-gray-100 rounded" title="View Tracking"><Eye className="w-4 h-4 text-blue-500" /></button><button onClick={() => onViewHistory(member)} className="p-1 hover:bg-gray-100 rounded" title="View History"><History className="w-4 h-4 text-purple-500" /></button><button onClick={() => onQuickPay(member)} className="p-1 hover:bg-gray-100 rounded" title="Quick Pay"><Plus className="w-4 h-4 text-emerald-500" /></button>{currentUser?.role === 'Admin' && (<><button onClick={() => onEditMember(member)} className="p-1 hover:bg-gray-100 rounded" title="Edit"><Edit2 className="w-4 h-4 text-amber-500" /></button><button onClick={() => onDeleteMember(member)} className="p-1 hover:bg-gray-100 rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button></>)}</div></TableCell></TableRow>)))}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}

function BranchesSection({ branches, staff, onAddBranch, onEditBranch, onDeleteBranch, onAddStaff, onEditStaff, onDeleteStaff }: { branches: Branch[]; staff: Staff[]; onAddBranch: () => void; onEditBranch: (b: Branch) => void; onDeleteBranch: (b: Branch) => void; onAddStaff: () => void; onEditStaff: (s: Staff) => void; onDeleteStaff: (s: Staff) => void }) {
  return (
    <Tabs defaultValue="branches" className="space-y-4">
      <TabsList className="bg-emerald-100"><TabsTrigger value="branches" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Building2 className="w-4 h-4 mr-2" /> Branches</TabsTrigger><TabsTrigger value="staff" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><UserCircle className="w-4 h-4 mr-2" /> Staff</TabsTrigger></TabsList>
      <TabsContent value="branches" className="space-y-4"><div className="flex justify-end"><Button onClick={onAddBranch} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Branch</Button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{branches.map(branch => (<Card key={branch.id}><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Store className="w-5 h-5 text-emerald-600" /></div><div><h4 className="font-semibold">{branch.name}</h4><p className="text-sm text-gray-600">{branch.phone}</p></div></div><div className="flex gap-1"><button onClick={() => onEditBranch(branch)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-amber-500" /></button><button onClick={() => onDeleteBranch(branch)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></div></div><div className="mt-3 text-sm text-gray-600"><p className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {branch.address}</p>{branch.manager && (<p className="mt-1">Manager: {branch.manager}</p>)}</div></CardContent></Card>))}</div></TabsContent>
      <TabsContent value="staff" className="space-y-4"><div className="flex justify-end"><Button onClick={onAddStaff} className="bg-emerald-600 hover:bg-emerald-700"><UserPlus className="w-4 h-4 mr-2" /> Add Staff</Button></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Branch</TableHead><TableHead>Role</TableHead><TableHead>Can Payout</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{staff.map(s => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.email}</TableCell><TableCell>{s.phone}</TableCell><TableCell>{s.branch_name}</TableCell><TableCell><Badge className={s.role === 'Manager' ? 'bg-purple-500' : 'bg-blue-500'}>{s.role}</Badge></TableCell><TableCell>{s.can_payout ? (<CheckCircle2 className="w-5 h-5 text-emerald-500" />) : (<XCircle className="w-5 h-5 text-gray-400" />)}</TableCell><TableCell><div className="flex items-center justify-end gap-1"><button onClick={() => onEditStaff(s)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-amber-500" /></button><button onClick={() => onDeleteStaff(s)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></div></TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card></TabsContent>
    </Tabs>
  );
}

function TransactionsSection({ transactions, members: _members, currentUser, onDeleteTransaction }: { transactions: Transaction[]; members: Member[]; currentUser: User | null; onDeleteTransaction: (t: Transaction) => void }) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const filtered = transactions.filter(t => { const matchesSearch = t.member_name.toLowerCase().includes(search.toLowerCase()); const matchesMethod = methodFilter === 'all' || t.payment_method === methodFilter; return matchesSearch && matchesMethod; });
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div><Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger className="w-full md:w-48"><SelectValue placeholder="All Methods" /></SelectTrigger><SelectContent><SelectItem value="all">All Methods</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Bank App Transfer">Bank App Transfer</SelectItem></SelectContent></Select></div></CardContent></Card>
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Days</TableHead><TableHead>Branch</TableHead>{currentUser?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={currentUser?.role === 'Admin' ? 7 : 6} className="text-center py-12 text-gray-500"><Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No transactions found</p></TableCell></TableRow>) : (filtered.map(t => (<TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell className="font-medium">{t.member_name}</TableCell><TableCell>&#8358;{formatAmount(t.amount)}</TableCell><TableCell><Badge variant="outline" className="flex items-center gap-1 w-fit">{t.payment_method === 'Cash' && <Banknote className="w-3 h-3" />}{t.payment_method === 'Bank Transfer' && <Landmark className="w-3 h-3" />}{t.payment_method === 'Mobile Money' && <Smartphone className="w-3 h-3" />}{t.payment_method === 'Bank App Transfer' && <Smartphone className="w-3 h-3" />}{t.payment_method}</Badge></TableCell><TableCell>{t.days_covered}</TableCell><TableCell>{t.branch_name}</TableCell>{currentUser?.role === 'Admin' && (<TableCell><button onClick={() => onDeleteTransaction(t)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button></TableCell>)}</TableRow>)))}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}

// NEW: Admin Transfer Review Section
function TransferReviewSection({ pendingTransfers, onReview }: { pendingTransfers: PendingTransfer[]; onReview: (t: PendingTransfer) => void }) {
  const pending = pendingTransfers.filter(t => t.status === 'Pending' || t.status === 'Under Review');
  const reviewed = pendingTransfers.filter(t => t.status === 'Approved' || t.status === 'Rejected');
  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList className="bg-emerald-100"><TabsTrigger value="pending" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Pending ({pending.length})</TabsTrigger><TabsTrigger value="reviewed" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Reviewed</TabsTrigger></TabsList>
      <TabsContent value="pending" className="space-y-4">
        {pending.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-gray-500"><FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No pending transfers</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map(transfer => (
              <Card key={transfer.id} className="border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div><h4 className="font-semibold">{transfer.member_name}</h4><p className="text-sm text-gray-600">{transfer.bank_name}</p></div>
                    <Badge className="bg-amber-500">{transfer.status}</Badge>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <p className="flex justify-between"><span>Total Sent:</span><span className="font-medium">&#8358;{formatAmount(transfer.total_amount)}</span></p>
                    <p className="flex justify-between"><span>Contribution:</span><span className="font-medium text-emerald-600">&#8358;{formatAmount(transfer.amount)}</span></p>
                    <p className="flex justify-between"><span>Days to Cover:</span><span className="font-medium text-purple-600">{transfer.days_to_cover}</span></p>
                    <p className="flex justify-between"><span>Date:</span><span>{new Date(transfer.created_at).toLocaleDateString()}</span></p>
                  </div>
                  {transfer.receipt_image && (
                    <div className="mb-3"><p className="text-xs text-gray-500 mb-1">Receipt Preview:</p><img src={transfer.receipt_image} alt="Receipt" className="w-full h-32 object-contain bg-gray-100 rounded" /></div>
                  )}
                  {transfer.receipt_name && transfer.receipt_amount && transfer.receipt_date && (
                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1 mb-3">
                      <p><strong>Receipt Name:</strong> {transfer.receipt_name}</p>
                      <p><strong>Receipt Amount:</strong> &#8358;{formatAmount(transfer.receipt_amount)}</p>
                      <p><strong>Receipt Date:</strong> {transfer.receipt_date}</p>
                    </div>
                  )}
                  <Button onClick={() => onReview(transfer)} className="w-full bg-emerald-600 hover:bg-emerald-700">Review Transfer</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="reviewed">
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Reviewed By</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{reviewed.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No reviewed transfers</TableCell></TableRow>) : (reviewed.map(t => (<TableRow key={t.id}><TableCell className="font-medium">{t.member_name}</TableCell><TableCell>&#8358;{formatAmount(t.amount)}</TableCell><TableCell><Badge className={t.status === 'Approved' ? 'bg-emerald-500' : 'bg-red-500'}>{t.status}</Badge></TableCell><TableCell>{t.reviewed_by}</TableCell><TableCell>{t.reviewed_at ? new Date(t.reviewed_at).toLocaleDateString() : '-'}</TableCell></TableRow>)))}</TableBody></Table></div></CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

function PayoutSection({ members, payouts, currentUser, staff, settings, onPayout, onBorrow, onApprove }: { members: Member[]; payouts: PayoutRecord[]; currentUser: User | null; staff: Staff[]; settings: AppSettings; onPayout: (m: Member) => void; onBorrow: (m: Member) => void; onApprove: (p: PayoutRecord) => void }) {
  const [activeTab, setActiveTab] = useState('eligible');
  const pendingPayouts = payouts.filter(p => p.status === 'Pending');
  const completedPayouts = payouts.filter(p => p.status === 'Completed');
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="bg-emerald-100"><TabsTrigger value="eligible" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Eligible</TabsTrigger><TabsTrigger value="pending" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Pending ({pendingPayouts.length})</TabsTrigger><TabsTrigger value="completed" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Completed</TabsTrigger></TabsList>
      <TabsContent value="eligible" className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{members.map(member => { const daysPaid = member.tracking.filter(t => t.paid).length; const isEligible = daysPaid >= 32; const canProcess = currentUser?.role === 'Admin' || (currentUser?.role === 'Staff' && staff.find(s => s.user_id === currentUser.id)?.can_payout && !settings.require_admin_approval_for_all_payouts); return (<Card key={member.id} className={isEligible ? 'border-emerald-500 border-2' : ''}><CardContent className="p-4"><div className="flex items-center gap-3 mb-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${isEligible ? 'bg-emerald-100' : 'bg-gray-100'}`}><UserIcon className={`w-6 h-6 ${isEligible ? 'text-emerald-600' : 'text-gray-500'}`} /></div><div><h4 className="font-semibold">{member.name}</h4><p className="text-sm text-gray-600">{member.branch_name}</p></div></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Daily Amount:</span><span>&#8358;{formatAmount(member.daily_amount)}</span></div><div className="flex justify-between"><span className="text-gray-600">Days Paid:</span><span className={isEligible ? 'text-emerald-600 font-medium' : ''}>{daysPaid}/32</span></div><div className="flex justify-between"><span className="text-gray-600">Total Contributed:</span><span>&#8358;{formatAmount(daysPaid * member.daily_amount)}</span></div><div className="flex justify-between"><span className="text-gray-600">Net Payout:</span><span className="font-medium text-emerald-600">&#8358;{formatAmount(daysPaid * member.daily_amount - member.daily_amount)}</span></div></div><div className="mt-4 flex gap-2"><Button onClick={() => onPayout(member)} disabled={!canProcess} className="flex-1 bg-emerald-600 hover:bg-emerald-700" size="sm">Payout {daysPaid < 32 && '(Partial)'}</Button><Button onClick={() => onBorrow(member)} disabled={daysPaid < 10 || !canProcess} variant="outline" className="flex-1" size="sm">Loan</Button></div>{!canProcess && currentUser?.role === 'Staff' && (<p className="text-xs text-amber-600 mt-2 text-center">Requires admin approval</p>)}</CardContent></Card>); })}</div></TabsContent>
      <TabsContent value="pending"><Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-amber-50"><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Days</TableHead><TableHead>Amount</TableHead><TableHead>Requested By</TableHead><TableHead>Date</TableHead>{currentUser?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{pendingPayouts.map(p => (<TableRow key={p.id}><TableCell className="font-medium">{p.member_name} {p.is_partial && <Badge className="ml-1 bg-amber-500 text-xs">Partial</Badge>}</TableCell><TableCell><Badge className={p.type === 'Payout' ? 'bg-emerald-500' : 'bg-blue-500'}>{p.type}</Badge></TableCell><TableCell>{p.days_paid}/32</TableCell><TableCell>&#8358;{formatAmount(p.total_amount)}</TableCell><TableCell>{p.staff_name}</TableCell><TableCell>{p.date}</TableCell>{currentUser?.role === 'Admin' && (<TableCell><Button onClick={() => onApprove(p)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">Approve</Button></TableCell>)}</TableRow>))}{pendingPayouts.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No pending payouts</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>
      <TabsContent value="completed"><Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Days</TableHead><TableHead>Net Payout</TableHead><TableHead>Date</TableHead><TableHead>Approved By</TableHead></TableRow></TableHeader><TableBody>{completedPayouts.map(p => (<TableRow key={p.id}><TableCell className="font-medium">{p.member_name} {p.is_partial && <Badge className="ml-1 bg-amber-500 text-xs">Partial</Badge>}</TableCell><TableCell><Badge className={p.type === 'Payout' ? 'bg-emerald-500' : 'bg-blue-500'}>{p.type}</Badge></TableCell><TableCell>{p.days_paid}/32</TableCell><TableCell className="text-emerald-600 font-medium">&#8358;{formatAmount(p.net_payout)}</TableCell><TableCell>{p.date}</TableCell><TableCell>{p.approved_by}</TableCell></TableRow>))}{completedPayouts.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No completed payouts</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>
    </Tabs>
  );
}

function ReportsSection({ transactions, payouts, branches, monthFilter, setMonthFilter }: { transactions: Transaction[]; payouts: PayoutRecord[]; branches: Branch[]; monthFilter: string; setMonthFilter: (m: string) => void }) {
  const monthlyData = useMemo(() => { const months: Record<string, number> = {}; transactions.forEach(t => { const month = t.date.slice(0, 7); months[month] = (months[month] || 0) + t.amount; }); return Object.entries(months).sort().slice(-6); }, [transactions]);
  const branchProfits = useMemo(() => branches.map(branch => ({ ...branch, profit: payouts.filter(p => p.branch_id === branch.id && p.type === 'Payout' && p.status === 'Completed').reduce((sum, p) => sum + p.company_profit, 0) })), [branches, payouts]);
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-4"><div className="flex items-center gap-4"><Label className="whitespace-nowrap">Select Month:</Label><Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-48" /></div></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><CardContent className="p-4"><p className="text-emerald-100">Total Profit</p><p className="text-3xl font-bold">&#8358;{formatAmount(payouts.filter(p => p.type === 'Payout' && p.status === 'Completed').reduce((s, p) => s + p.company_profit, 0))}</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white"><CardContent className="p-4"><p className="text-blue-100">Total Payouts</p><p className="text-3xl font-bold">&#8358;{formatAmount(payouts.filter(p => p.type === 'Payout' && p.status === 'Completed').reduce((s, p) => s + p.net_payout, 0))}</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white"><CardContent className="p-4"><p className="text-purple-100">Total Loans</p><p className="text-3xl font-bold">&#8358;{formatAmount(payouts.filter(p => p.type === 'Borrow' && p.status === 'Completed').reduce((s, p) => s + p.total_amount, 0))}</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Monthly Collections</CardTitle></CardHeader><CardContent><Bar data={{ labels: monthlyData.map(([m]) => m), datasets: [{ label: 'Collections', data: monthlyData.map(([, amount]) => amount), backgroundColor: 'rgba(16, 185, 129, 0.8)' }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Profit by Branch</CardTitle></CardHeader><CardContent><Bar data={{ labels: branchProfits.map(b => b.name), datasets: [{ label: 'Profit', data: branchProfits.map(b => b.profit), backgroundColor: 'rgba(139, 92, 246, 0.8)' }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} /></CardContent></Card>
      </div>
    </div>
  );
}

function AdminTrackingTable({ members, branches }: { members: Member[]; branches: Branch[] }) {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const filteredMembers = members.filter(m => { const matchesBranch = selectedBranch === 'all' || m.branch_id === selectedBranch; const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm); return matchesBranch && matchesSearch; });
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div><Select value={selectedBranch} onValueChange={setSelectedBranch}><SelectTrigger className="w-full md:w-56"><SelectValue placeholder="All Branches" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{branches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Table2 className="w-5 h-5 text-emerald-600" />32-Day Tracking Table - All Customers</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead className="sticky left-0 bg-emerald-50 z-10 min-w-[150px]">Customer</TableHead><TableHead>Branch</TableHead><TableHead>Daily</TableHead><TableHead>Progress</TableHead>{Array.from({ length: 32 }, (_, i) => (<TableHead key={i} className="text-center w-10 p-1 text-xs">{i + 1}</TableHead>))}</TableRow></TableHeader><TableBody>{filteredMembers.length === 0 ? (<TableRow><TableCell colSpan={37} className="text-center py-12 text-gray-500"><Users className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No customers found</p></TableCell></TableRow>) : (filteredMembers.map(member => { const daysPaid = member.tracking.filter(t => t.paid).length; const progressPercent = Math.round((daysPaid / 32) * 100); return (<TableRow key={member.id}><TableCell className="sticky left-0 bg-white z-10 font-medium min-w-[150px]"><div><p>{member.name}</p><p className="text-xs text-gray-500">{member.phone}</p></div></TableCell><TableCell><Badge variant="outline" className="text-xs">{member.branch_name}</Badge></TableCell><TableCell className="text-sm">&#8358;{formatAmount(member.daily_amount)}</TableCell><TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} /></div><span className="text-xs text-gray-600">{daysPaid}/32</span></div></TableCell>{member.tracking.map((day: any, idx: number) => (<TableCell key={idx} className="p-1 text-center"><div className={`w-7 h-7 rounded flex items-center justify-center text-xs ${day.paid ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{day.paid ? <CheckCheck className="w-3 h-3" /> : '-'}</div></TableCell>))}</TableRow>); }))}</TableBody></Table></div></CardContent></Card>
      <div className="flex justify-between items-center text-sm text-gray-500"><p>Showing {filteredMembers.length} customer{filteredMembers.length !== 1 ? 's' : ''}</p><div className="flex items-center gap-4"><div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded" /><span>Paid</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-100 rounded" /><span>Pending</span></div></div></div>
    </div>
  );
}

function CustomerTracking({ currentUser, members }: { currentUser: User | null; members: Member[] }) {
  const myMember = members.find(m => m.user_id === currentUser?.id);
  if (!myMember) return (<div className="text-center py-12"><AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">No tracking data found</p></div>);
  const daysPaid = myMember.tracking.filter(t => t.paid).length;
  const progressPercent = (daysPaid / 32) * 100;
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" />32-Day Tracking Calendar</CardTitle></CardHeader><CardContent><div className="mb-6 bg-emerald-50 rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-emerald-800 font-medium">Cycle Progress</span><span className="text-emerald-800 font-bold">{daysPaid}/32 days</span></div><div className="w-full h-3 bg-emerald-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${progressPercent}%` }} /></div><p className="text-sm text-emerald-600 mt-2">{32 - daysPaid} days remaining until payout eligibility</p></div><div className="grid grid-cols-8 gap-2">{myMember.tracking.map((day: any, idx: number) => (<div key={idx} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${day.paid ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300'}`}><span className="text-xs opacity-75">{day.day}</span>{day.paid ? (<CheckCheck className="w-4 h-4" />) : (<span className="text-xs">-</span>)}</div>))}</div><div className="flex items-center justify-center gap-6 mt-6"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-emerald-500 rounded" /><span className="text-sm text-gray-600">Paid</span></div><div className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-100 border-2 border-dashed border-gray-300 rounded" /><span className="text-sm text-gray-600">Pending</span></div></div></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Card className="bg-emerald-50"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-emerald-600">{daysPaid}</p><p className="text-sm text-gray-600">Days Paid</p></CardContent></Card><Card className="bg-blue-50"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-blue-600">{32 - daysPaid}</p><p className="text-sm text-gray-600">Days Remaining</p></CardContent></Card><Card className="bg-purple-50"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-purple-600">&#8358;{formatAmount(daysPaid * myMember.daily_amount)}</p><p className="text-sm text-gray-600">Total Contributed</p></CardContent></Card></div>
    </div>
  );
}

function CustomerHistory({ currentUser, members, transactions }: { currentUser: User | null; members: Member[]; transactions: Transaction[] }) {
  const myMember = members.find(m => m.user_id === currentUser?.id);
  const myTransactions = transactions.filter(t => t.member_id === myMember?.id);
  const [search, setSearch] = useState('');
  const filtered = myTransactions.filter(t => t.date.includes(search) || t.payment_method.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search by date or payment method..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-emerald-600" />Your Transaction History</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Payment Method</TableHead><TableHead>Days Covered</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-500"><History className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No transactions found</p></TableCell></TableRow>) : (filtered.map(t => (<TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell className="font-medium">&#8358;{formatAmount(t.amount)}</TableCell><TableCell><Badge variant="outline" className="flex items-center gap-1 w-fit">{t.payment_method === 'Cash' && <Banknote className="w-3 h-3" />}{t.payment_method === 'Bank Transfer' && <Landmark className="w-3 h-3" />}{t.payment_method === 'Mobile Money' && <Smartphone className="w-3 h-3" />}{t.payment_method === 'Bank App Transfer' && <Smartphone className="w-3 h-3" />}{t.payment_method}</Badge></TableCell><TableCell>{t.days_covered}</TableCell><TableCell><Badge className="bg-emerald-500">{t.status}</Badge></TableCell></TableRow>)))}</TableBody></Table></div></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card className="bg-emerald-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Contributed</p><p className="text-2xl font-bold text-emerald-700">&#8358;{formatAmount(myTransactions.reduce((s, t) => s + t.amount, 0))}</p></CardContent></Card><Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Transactions</p><p className="text-2xl font-bold text-blue-700">{myTransactions.length}</p></CardContent></Card></div>
    </div>
  );
}

function CustomerSupport({ settings, onWhatsApp }: { settings: AppSettings; onWhatsApp: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8"><div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center"><HelpCircle className="w-10 h-10 text-emerald-600" /></div><h2 className="text-2xl font-bold text-emerald-900">How can we help you?</h2><p className="text-gray-600 mt-2">Choose a support option below</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onWhatsApp}><CardContent className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center"><MessageCircle className="w-7 h-7 text-green-600" /></div><div><h3 className="font-semibold text-lg">WhatsApp Support</h3><p className="text-sm text-gray-600">Chat with us on WhatsApp</p><p className="text-xs text-green-600 mt-1">{settings.customer_care_whatsapp}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center"><Phone className="w-7 h-7 text-blue-600" /></div><div><h3 className="font-semibold text-lg">Call Us</h3><p className="text-sm text-gray-600">{settings.customer_care_phone}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center"><Mail className="w-7 h-7 text-purple-600" /></div><div><h3 className="font-semibold text-lg">Email Support</h3><p className="text-sm text-gray-600">{settings.support_email}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center"><MapPin className="w-7 h-7 text-amber-600" /></div><div><h3 className="font-semibold text-lg">Visit Us</h3><p className="text-sm text-gray-600">Find nearest branch</p></div></div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Frequently Asked Questions</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="border-b pb-4"><h4 className="font-medium text-emerald-800">How does the 32-day cycle work?</h4><p className="text-sm text-gray-600 mt-1">You contribute a fixed amount daily for 32 days. After completing the cycle, you receive your total contribution minus one day&apos;s amount as company profit.</p></div>
        <div className="border-b pb-4"><h4 className="font-medium text-emerald-800">When can I request a loan?</h4><p className="text-sm text-gray-600 mt-1">You can request a loan after contributing for at least 10 days.</p></div>
        <div><h4 className="font-medium text-emerald-800">What happens if I miss a day?</h4><p className="text-sm text-gray-600 mt-1">You can make up missed payments by paying multiple days at once.</p></div>
      </CardContent></Card>
    </div>
  );
}

function CustomerSettings({ currentUser, members, canChangeAmount, onUpdateProfile, onRequestAmountChange }: { currentUser: User | null; members: Member[]; canChangeAmount: boolean; onUpdateProfile: (u: User) => void; onRequestAmountChange: () => void }) {
  const myMember = members.find(m => m.user_id === currentUser?.id);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', address: myMember?.address || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const handleSave = () => {
    if (!formData.name.trim() || !formData.phone.trim()) { toast.error('Name and phone are required'); return; }
    if (currentUser) {
      onUpdateProfile({ ...currentUser, name: formData.name.trim(), email: formData.email.trim().toLowerCase(), phone: formData.phone.trim() });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    }
  };
  const handleChangePassword = () => {
    if (!formData.currentPassword) { toast.error('Please enter your current password'); return; }
    if (currentUser?.password !== formData.currentPassword) { toast.error('Current password is incorrect'); return; }
    if (formData.newPassword !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (formData.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (currentUser) { onUpdateProfile({ ...currentUser, password: formData.newPassword }); }
    toast.success('Password changed successfully');
    setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  return (
    <div className="space-y-6">
      {canChangeAmount && myMember && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-800"><DollarSign className="w-5 h-5" />Change Daily Contribution</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-4">You can change your daily contribution amount once per month (1st - 3rd of every month).</p>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Current Amount</p><p className="text-xl font-bold text-amber-800">&#8358;{formatAmount(myMember.daily_amount)}</p></div>
              <Button onClick={onRequestAmountChange} className="bg-amber-600 hover:bg-amber-700">Request Change</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card><CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-emerald-600" />Profile Information</span><Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : <><Edit2 className="w-4 h-4 mr-1" /> Edit</>}</Button></CardTitle></CardHeader><CardContent className="space-y-4">{isEditing ? (<><div><Label>Full Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div><div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div><div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div><div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div><Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button></>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Full Name</p><p className="font-medium">{currentUser?.name}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Email</p><p className="font-medium">{currentUser?.email}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Phone</p><p className="font-medium">{currentUser?.phone}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Branch</p><p className="font-medium">{currentUser?.branch_name}</p></div><div className="bg-gray-50 p-3 rounded-lg md:col-span-2"><p className="text-sm text-gray-600">Address</p><p className="font-medium">{myMember?.address || 'Not set'}</p></div></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-emerald-600" />Change Password</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Current Password</Label><Input type="password" value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} placeholder="Enter current password" /></div><div><Label>New Password</Label><Input type="password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} placeholder="Enter new password" /></div><div><Label>Confirm New Password</Label><Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Confirm new password" /></div><Button onClick={handleChangePassword} variant="outline">Change Password</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" />Account Information</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Member ID</p><p className="font-medium">{myMember?.id}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Daily Amount</p><p className="font-medium">&#8358;{formatAmount(myMember?.daily_amount)}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Start Date</p><p className="font-medium">{myMember?.start_date}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Status</p><Badge className={myMember?.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'}>{myMember?.status}</Badge></div></div></CardContent></Card>
    </div>
  );
}

function AdminSettings({ settings, onSave, amountChangeRequests, onApproveAmountChange }: { settings: AppSettings; onSave: (s: AppSettings) => void; amountChangeRequests: AmountChangeRequest[]; onApproveAmountChange: (id: string, approved: boolean) => void }) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState('support');
  const pendingRequests = amountChangeRequests.filter(r => r.status === 'Pending');
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-emerald-100 flex-wrap">
          <TabsTrigger value="support" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Phone className="w-4 h-4 mr-2" /> Support</TabsTrigger>
          <TabsTrigger value="payout" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Shield className="w-4 h-4 mr-2" /> Payout</TabsTrigger>
          <TabsTrigger value="amount" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><DollarSign className="w-4 h-4 mr-2" /> Amount {pendingRequests.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center inline-flex">{pendingRequests.length}</span>}</TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Landmark className="w-4 h-4 mr-2" /> Bank Transfer</TabsTrigger>
        </TabsList>
        <TabsContent value="support" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-emerald-600" />Customer Care Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Customer Care Phone</Label><div className="relative mt-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input value={localSettings.customer_care_phone} onChange={(e) => setLocalSettings({ ...localSettings, customer_care_phone: e.target.value })} className="pl-10" placeholder="+234 800 123 4567" /></div></div>
            <div><Label>WhatsApp Number</Label><div className="relative mt-1"><MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" /><Input value={localSettings.customer_care_whatsapp} onChange={(e) => setLocalSettings({ ...localSettings, customer_care_whatsapp: e.target.value })} className="pl-10" placeholder="+234 800 123 4567" /></div></div>
            <div><Label>Support Email</Label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input value={localSettings.support_email} onChange={(e) => setLocalSettings({ ...localSettings, support_email: e.target.value })} className="pl-10" placeholder="support@hiremercy.com" /></div></div>
            <Button onClick={() => onSave(localSettings)} className="bg-emerald-600 hover:bg-emerald-700">Save Support Settings</Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="payout" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" />Staff Payout Controls</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">Require Admin Approval for All Payouts</p><p className="text-sm text-gray-500">When enabled, all payouts require admin approval</p></div><Switch checked={localSettings.require_admin_approval_for_all_payouts} onCheckedChange={(checked) => setLocalSettings({ ...localSettings, require_admin_approval_for_all_payouts: checked })} /></div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">Staff Can Payout Without Approval</p><p className="text-sm text-gray-500">Allow staff with payout permission to process payouts</p></div><Switch checked={localSettings.staff_can_payout_without_approval} onCheckedChange={(checked) => setLocalSettings({ ...localSettings, staff_can_payout_without_approval: checked })} /></div>
            <Button onClick={() => onSave(localSettings)} className="bg-emerald-600 hover:bg-emerald-700">Save Payout Settings</Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="amount" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" />Customer Amount Change Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">Allow Customers to Change Amount</p><p className="text-sm text-gray-500">Enable customers to request daily amount changes</p></div><Switch checked={localSettings.allow_customers_change_amount} onCheckedChange={(checked) => setLocalSettings({ ...localSettings, allow_customers_change_amount: checked })} /></div>
            <div><Label>Change Window (Day of Month)</Label><p className="text-sm text-gray-500 mb-2">Customers can change from day 1 to this day of each month</p><Select value={localSettings.allow_change_until_day.toString()} onValueChange={(v) => setLocalSettings({ ...localSettings, allow_change_until_day: parseInt(v) })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1st</SelectItem><SelectItem value="2">2nd</SelectItem><SelectItem value="3">3rd</SelectItem><SelectItem value="5">5th</SelectItem><SelectItem value="7">7th</SelectItem></SelectContent></Select></div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">Allow Changes After Grace Period</p><p className="text-sm text-gray-500">Allow changes after grace period (requires admin approval)</p></div><Switch checked={localSettings.allow_change_after_grace_period} onCheckedChange={(checked) => setLocalSettings({ ...localSettings, allow_change_after_grace_period: checked })} /></div>
            <Button onClick={() => onSave(localSettings)} className="bg-emerald-600 hover:bg-emerald-700">Save Amount Settings</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-amber-600" />Pending Amount Change Requests</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-amber-50"><TableHead>Customer</TableHead><TableHead>Current</TableHead><TableHead>Requested</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{pendingRequests.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No pending requests</TableCell></TableRow>) : (pendingRequests.map(req => (<TableRow key={req.id}><TableCell className="font-medium">{req.member_name}</TableCell><TableCell>&#8358;{formatAmount(req.current_amount)}</TableCell><TableCell className="text-emerald-600 font-medium">&#8358;{formatAmount(req.requested_amount)}</TableCell><TableCell>{new Date(req.requested_at).toLocaleDateString()}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => onApproveAmountChange(req.id, true)} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button><Button size="sm" variant="outline" onClick={() => onApproveAmountChange(req.id, false)} className="text-red-600 border-red-300 hover:bg-red-50">Reject</Button></div></TableCell></TableRow>)))}</TableBody></Table></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="bank" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-emerald-600" />Bank Transfer Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Bank Name</Label><Input value={localSettings.bank_name} onChange={(e) => setLocalSettings({ ...localSettings, bank_name: e.target.value })} placeholder="e.g., OPay" /></div>
            <div><Label>Account Number</Label><Input value={localSettings.account_number} onChange={(e) => setLocalSettings({ ...localSettings, account_number: e.target.value })} placeholder="e.g., 8061290412" /></div>
            <div><Label>Account Name</Label><Input value={localSettings.account_name} onChange={(e) => setLocalSettings({ ...localSettings, account_name: e.target.value })} placeholder="e.g., Irewole paul fayenuwo" /></div>
            <div><Label>Bank Charges (&#8358;)</Label><Input type="number" value={localSettings.bank_charges} onChange={(e) => setLocalSettings({ ...localSettings, bank_charges: parseInt(e.target.value) || 0 })} placeholder="e.g., 50" /></div>
            <Button onClick={() => onSave(localSettings)} className="bg-emerald-600 hover:bg-emerald-700">Save Bank Settings</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-emerald-600" />Supported Banks</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-600 mb-3">These banks are available for customers:</p><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{localSettings.supported_banks.map(bank => (<div key={bank.id} className="bg-gray-50 p-2 rounded text-sm flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" />{bank.name}</div>))}</div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickPayDialog({ isOpen, onClose, members, currentUser, quickPayForm, setQuickPayForm, onSubmit }: { isOpen: boolean; onClose: () => void; members: Member[]; currentUser: User | null; quickPayForm: any; setQuickPayForm: (f: any) => void; onSubmit: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" />Quick Pay</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Select Customer</Label><Select value={quickPayForm.member_id} onValueChange={(v) => setQuickPayForm({ ...quickPayForm, member_id: v })}><SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger><SelectContent>{members.filter(m => currentUser?.role === 'Admin' || m.branch_id === currentUser?.branch_id).map(m => (<SelectItem key={m.id} value={m.id}>{m.name} - &#8358;{m.daily_amount}/day</SelectItem>))}</SelectContent></Select></div>
          {quickPayForm.member_id && (<div className="bg-emerald-50 p-3 rounded-lg"><p className="text-sm text-emerald-800">Daily Amount: <strong>&#8358;{members.find(m => m.id === quickPayForm.member_id)?.daily_amount}</strong></p></div>)}
          <div><Label>Amount (&#8358;)</Label><Input type="number" value={quickPayForm.amount} onChange={(e) => setQuickPayForm({ ...quickPayForm, amount: e.target.value })} placeholder="Enter amount" /></div>
          <div><Label>Payment Method</Label><Select value={quickPayForm.payment_method} onValueChange={(v: any) => setQuickPayForm({ ...quickPayForm, payment_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem></SelectContent></Select></div>
          <div><Label>Date</Label><Input type="date" value={quickPayForm.date} onChange={(e) => setQuickPayForm({ ...quickPayForm, date: e.target.value })} /></div>
          <Button onClick={onSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">Process Payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberDialog({ isOpen, onClose, memberForm, setMemberForm, branches, editingId, onSave }: { isOpen: boolean; onClose: () => void; memberForm: Partial<Member>; setMemberForm: (f: Partial<Member>) => void; branches: Branch[]; editingId: string | null; onSave: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? 'Edit Customer' : 'Add New Customer'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Full Name *</Label><Input value={memberForm.name || ''} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Enter full name" /></div>
          <div><Label>Phone Number *</Label><Input value={memberForm.phone || ''} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="Enter phone number" /></div>
          <div><Label>Email</Label><Input type="email" value={memberForm.email || ''} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="Enter email (optional)" /></div>
          <div><Label>Address</Label><Input value={memberForm.address || ''} onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })} placeholder="Enter address" /></div>
          <div><Label>Daily Amount (&#8358;) *</Label><Input type="number" value={memberForm.daily_amount || ''} onChange={(e) => setMemberForm({ ...memberForm, daily_amount: parseInt(e.target.value) })} placeholder="e.g., 1000" /></div>
          <div><Label>Branch *</Label><Select value={memberForm.branch_id} onValueChange={(v) => setMemberForm({ ...memberForm, branch_id: v })}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{branches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
          <div><Label>Status</Label><Select value={memberForm.status} onValueChange={(v: any) => setMemberForm({ ...memberForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
          {!editingId && (<div><Label>Password</Label><Input type="password" value={memberForm.password || ''} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} placeholder="Set customer password" /></div>)}
          <Button onClick={onSave} className="w-full bg-emerald-600 hover:bg-emerald-700">{editingId ? 'Update Customer' : 'Add Customer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BranchDialog({ isOpen, onClose, branchForm, setBranchForm, editingId, onSave }: { isOpen: boolean; onClose: () => void; branchForm: Partial<Branch>; setBranchForm: (f: Partial<Branch>) => void; editingId: string | null; onSave: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingId ? 'Edit Branch' : 'Add New Branch'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Branch Name *</Label><Input value={branchForm.name || ''} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Enter branch name" /></div>
          <div><Label>Address *</Label><Input value={branchForm.address || ''} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Enter address" /></div>
          <div><Label>Phone Number *</Label><Input value={branchForm.phone || ''} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="Enter phone number" /></div>
          <div><Label>Manager Name</Label><Input value={branchForm.manager || ''} onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })} placeholder="Enter manager name" /></div>
          <Button onClick={onSave} className="w-full bg-emerald-600 hover:bg-emerald-700">{editingId ? 'Update Branch' : 'Add Branch'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StaffDialog({ isOpen, onClose, staffForm, setStaffForm, branches, editingId, onSave }: { isOpen: boolean; onClose: () => void; staffForm: Partial<Staff>; setStaffForm: (f: Partial<Staff>) => void; branches: Branch[]; editingId: string | null; onSave: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingId ? 'Edit Staff' : 'Add New Staff'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Full Name *</Label><Input value={staffForm.name || ''} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Enter full name" /></div>
          <div><Label>Phone Number *</Label><Input value={staffForm.phone || ''} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="Enter phone number" /></div>
          <div><Label>Email *</Label><Input type="email" value={staffForm.email || ''} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="Enter email" /></div>
          <div><Label>Password *</Label><Input type="password" value={staffForm.password || ''} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="Set password" /></div>
          <div><Label>Role</Label><Select value={staffForm.role} onValueChange={(v: any) => setStaffForm({ ...staffForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Staff">Staff</SelectItem></SelectContent></Select></div>
          <div><Label>Branch *</Label><Select value={staffForm.branch_id} onValueChange={(v) => setStaffForm({ ...staffForm, branch_id: v })}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{branches.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="can_payout" checked={staffForm.can_payout || false} onChange={(e) => setStaffForm({ ...staffForm, can_payout: e.target.checked })} className="rounded border-gray-300" /><Label htmlFor="can_payout" className="cursor-pointer">Can process payouts without approval</Label></div>
          <Button onClick={onSave} className="w-full bg-emerald-600 hover:bg-emerald-700">{editingId ? 'Update Staff' : 'Add Staff'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayoutDialog({ isOpen, onClose, selectedCustomer, onConfirm }: { isOpen: boolean; onClose: () => void; selectedCustomer: Member | null; onConfirm: () => void }) {
  if (!selectedCustomer) return null;
  const daysPaid = selectedCustomer.tracking.filter(t => t.paid).length;
  const totalContributed = daysPaid * selectedCustomer.daily_amount;
  const netPayout = totalContributed - selectedCustomer.daily_amount;
  const isPartial = daysPaid < 32;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Process Payout {isPartial && <Badge className="ml-2 bg-amber-500">Partial</Badge>}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg"><p className="font-medium text-emerald-900">{selectedCustomer.name}</p><p className="text-sm text-emerald-600">Daily: &#8358;{selectedCustomer.daily_amount}</p><p className="text-sm text-emerald-600">Days Paid: {daysPaid}/32 {isPartial && <span className="text-amber-600">(Incomplete)</span>}</p></div>
          <div className="space-y-2"><div className="flex justify-between"><span>Total Contributed:</span><span className="font-medium">&#8358;{formatAmount(totalContributed)}</span></div><div className="flex justify-between text-amber-600"><span>Company Profit (1 day):</span><span className="font-medium">-&#8358;{formatAmount(selectedCustomer.daily_amount)}</span></div><div className="flex justify-between text-lg font-bold border-t pt-2"><span>Net Payout:</span><span className="text-emerald-600">&#8358;{formatAmount(netPayout)}</span></div></div>
          {isPartial && <div className="bg-amber-50 p-3 rounded-lg"><p className="text-xs text-amber-700"><AlertCircle className="w-4 h-4 inline mr-1" />This is a partial payout. Customer has only completed {daysPaid} out of 32 days.</p></div>}
          <Button onClick={onConfirm} className="w-full bg-emerald-600 hover:bg-emerald-700">Confirm Payout</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BorrowDialog({ isOpen, onClose, selectedCustomer, onConfirm }: { isOpen: boolean; onClose: () => void; selectedCustomer: Member | null; onConfirm: () => void }) {
  if (!selectedCustomer) return null;
  const daysPaid = selectedCustomer.tracking.filter(t => t.paid).length;
  const maxLoan = Math.min(daysPaid, 30) * selectedCustomer.daily_amount;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Process Loan</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg"><p className="font-medium text-blue-900">{selectedCustomer.name}</p><p className="text-sm text-blue-600">Daily: &#8358;{selectedCustomer.daily_amount}</p><p className="text-sm text-blue-600">Days Paid: {daysPaid}/32</p></div>
          <div className="bg-amber-50 p-3 rounded-lg"><p className="text-sm text-amber-800"><AlertCircle className="w-4 h-4 inline mr-1" />Loan Eligibility: Up to 30 days of contribution</p></div>
          <div className="space-y-2"><div className="flex justify-between"><span>Maximum Loan Amount:</span><span className="font-medium">&#8358;{formatAmount(maxLoan)}</span></div></div>
          <Button onClick={onConfirm} className="w-full bg-blue-600 hover:bg-blue-700">Process Loan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrackingTableDialog({ isOpen, onClose, members, branches, selectedCustomer }: { isOpen: boolean; onClose: () => void; members: Member[]; branches: Branch[]; selectedCustomer: Member | null }) {
  const displayMembers = selectedCustomer ? [selectedCustomer] : members;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedCustomer ? `${selectedCustomer.name}'s 32-Day Tracking` : '32-Day Tracking Table'}</DialogTitle></DialogHeader>
        <div className="space-y-6">{branches.map(branch => { const branchMembers = displayMembers.filter(m => m.branch_id === branch.id); if (branchMembers.length === 0) return null; return (<div key={branch.id}><h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" />{branch.name}</h3><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead className="sticky left-0 bg-emerald-50">Customer</TableHead><TableHead>Daily</TableHead>{Array.from({ length: 32 }, (_, i) => (<TableHead key={i} className="text-center w-8 p-1 text-xs">{i + 1}</TableHead>))}</TableRow></TableHeader><TableBody>{branchMembers.map(member => (<TableRow key={member.id}><TableCell className="sticky left-0 bg-white font-medium min-w-[150px]">{member.name}</TableCell><TableCell className="text-sm">&#8358;{member.daily_amount}</TableCell>{member.tracking.map((day: any, idx: number) => (<TableCell key={idx} className="p-1 text-center"><div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${day.paid ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}>{day.paid && <CheckCheck className="w-3 h-3" />}</div></TableCell>))}</TableRow>))}</TableBody></Table></div></div>); })}</div>
      </DialogContent>
    </Dialog>
  );
}

function TotalCustomerDialog({ isOpen, onClose, members, stats, transactions }: { isOpen: boolean; onClose: () => void; members: Member[]; stats: DashboardStats; transactions: Transaction[] }) {
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const getMemberTransactionCount = (memberId: string) => { let count = transactions.filter(t => t.member_id === memberId); if (dateFilter) count = count.filter(t => t.date === dateFilter); if (monthFilter) count = count.filter(t => t.date.startsWith(monthFilter)); return count.length; };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Total Customers - Daily Records</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4"><div className="flex-1"><Label>Select Date</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></div><div className="flex-1"><Label>Select Month</Label><Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Card className="bg-emerald-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Customers</p><p className="text-2xl font-bold text-emerald-700">{stats.totalMembers}</p></CardContent></Card><Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold text-blue-700">{stats.activeMembers}</p></CardContent></Card><Card className="bg-gray-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Inactive</p><p className="text-2xl font-bold text-gray-700">{stats.inactiveMembers}</p></CardContent></Card></div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Branch</TableHead><TableHead>Daily Amount</TableHead><TableHead>Status</TableHead><TableHead>Days Paid</TableHead><TableHead>Transactions</TableHead></TableRow></TableHeader><TableBody>{members.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No customers found</TableCell></TableRow>) : (members.map(member => (<TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.phone}</TableCell><TableCell>{member.branch_name}</TableCell><TableCell>&#8358;{formatAmount(member.daily_amount)}</TableCell><TableCell><Badge className={member.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'}>{member.status}</Badge></TableCell><TableCell>{member.tracking.filter(t => t.paid).length}/32</TableCell><TableCell>{getMemberTransactionCount(member.id)}</TableCell></TableRow>)))}</TableBody></Table></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TodayCollectionDialog({ isOpen, onClose, branchStats, todayTransactions, stats }: { isOpen: boolean; onClose: () => void; branchStats: any[]; todayTransactions: Transaction[]; stats: DashboardStats }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Today&apos;s Collection Details</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Card className="bg-gradient-to-br from-emerald-50 to-teal-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Today&apos;s Total</p><p className="text-2xl font-bold text-emerald-700">&#8358;{formatAmount(stats.todayCollections)}</p><p className="text-xs text-gray-500">{stats.todayCustomersPaid} customers paid</p></CardContent></Card><Card className="bg-gradient-to-br from-gray-50 to-slate-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Yesterday&apos;s Record</p><p className="text-2xl font-bold text-gray-700">&#8358;{formatAmount(stats.yesterdayCollections)}</p></CardContent></Card></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{branchStats.map(branch => (<Card key={branch.id} className="bg-gradient-to-br from-emerald-50 to-teal-50"><CardContent className="p-4"><p className="text-sm text-gray-600">{branch.name}</p><p className="text-2xl font-bold text-emerald-700">&#8358;{formatAmount(branch.todayCollection)}</p><p className="text-xs text-gray-500">{todayTransactions.filter(t => t.branch_id === branch.id).length} transactions</p></CardContent></Card>))}</div>
          <h4 className="font-semibold text-emerald-800 mt-4">Today&apos;s Transactions</h4>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Branch</TableHead><TableHead>Time</TableHead></TableRow></TableHeader><TableBody>{todayTransactions.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No transactions today</TableCell></TableRow>) : (todayTransactions.map(t => (<TableRow key={t.id}><TableCell className="font-medium">{t.member_name}</TableCell><TableCell>&#8358;{formatAmount(t.amount)}</TableCell><TableCell><Badge variant="outline" className="flex items-center gap-1 w-fit">{t.payment_method === 'Cash' && <Banknote className="w-3 h-3" />}{t.payment_method === 'Bank Transfer' && <Landmark className="w-3 h-3" />}{t.payment_method === 'Mobile Money' && <Smartphone className="w-3 h-3" />}{t.payment_method}</Badge></TableCell><TableCell>{t.branch_name}</TableCell><TableCell>{new Date(t.created_at).toLocaleTimeString()}</TableCell></TableRow>)))}</TableBody></Table></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalCollectionDialog({ isOpen, onClose, transactions, stats }: { isOpen: boolean; onClose: () => void; transactions: Transaction[]; stats: DashboardStats }) {
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const filteredTransactions = transactions.filter(t => !dateFilter || t.date === dateFilter).filter(t => !monthFilter || t.date.startsWith(monthFilter));
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Total Collection Records</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4"><div className="flex-1"><Label>Filter by Date</Label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></div><div className="flex-1"><Label>Filter by Month</Label><Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} /></div></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Card className="bg-emerald-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Collection</p><p className="text-xl font-bold text-emerald-700">&#8358;{formatAmount(stats.totalCollections)}</p></CardContent></Card><Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Cash</p><p className="text-xl font-bold text-blue-700">&#8358;{formatAmount(transactions.filter(t => t.payment_method === 'Cash').reduce((s, t) => s + t.amount, 0))}</p></CardContent></Card><Card className="bg-purple-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Bank Transfer</p><p className="text-xl font-bold text-purple-700">&#8358;{formatAmount(transactions.filter(t => t.payment_method === 'Bank Transfer').reduce((s, t) => s + t.amount, 0))}</p></CardContent></Card><Card className="bg-amber-50"><CardContent className="p-4"><p className="text-sm text-gray-600">Mobile Money</p><p className="text-xl font-bold text-amber-700">&#8358;{formatAmount(transactions.filter(t => t.payment_method === 'Mobile Money').reduce((s, t) => s + t.amount, 0))}</p></CardContent></Card></div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Branch</TableHead></TableRow></TableHeader><TableBody>{filteredTransactions.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No transactions found</TableCell></TableRow>) : (filteredTransactions.slice(0, 100).map(t => (<TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell className="font-medium">{t.member_name}</TableCell><TableCell>&#8358;{formatAmount(t.amount)}</TableCell><TableCell>{t.payment_method}</TableCell><TableCell>{t.branch_name}</TableCell></TableRow>)))}</TableBody></Table></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailDialog({ isOpen, onClose, selectedCustomer, transactions }: { isOpen: boolean; onClose: () => void; selectedCustomer: Member | null; transactions: Transaction[] }) {
  if (!selectedCustomer) return null;
  const customerTransactions = transactions.filter(t => t.member_id === selectedCustomer.id);
  const daysPaid = selectedCustomer.tracking.filter(t => t.paid).length;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-4"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center"><UserIcon className="w-8 h-8 text-emerald-600" /></div><div><h3 className="text-xl font-bold">{selectedCustomer.name}</h3><p className="text-gray-600">{selectedCustomer.phone}</p><Badge className={selectedCustomer.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'}>{selectedCustomer.status}</Badge></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Email</p><p className="font-medium">{selectedCustomer.email || 'N/A'}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Address</p><p className="font-medium">{selectedCustomer.address || 'N/A'}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Branch</p><p className="font-medium">{selectedCustomer.branch_name}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Daily Amount</p><p className="font-medium">&#8358;{formatAmount(selectedCustomer.daily_amount)}</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Days Paid</p><p className="font-medium">{daysPaid}/32</p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-sm text-gray-600">Total Contributed</p><p className="font-medium">&#8358;{formatAmount(daysPaid * selectedCustomer.daily_amount)}</p></div></div>
          <div><h4 className="font-semibold mb-3">Transaction History</h4>{customerTransactions.length === 0 ? (<p className="text-gray-500 text-center py-4">No transactions found</p>) : (<div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-emerald-50"><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Days</TableHead></TableRow></TableHeader><TableBody>{customerTransactions.map(t => (<TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell>&#8358;{formatAmount(t.amount)}</TableCell><TableCell>{t.payment_method}</TableCell><TableCell>{t.days_covered}</TableCell></TableRow>))}</TableBody></Table></div>)}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayoutApprovalDialog({ isOpen, onClose, selectedPayout, onApprove }: { isOpen: boolean; onClose: () => void; selectedPayout: PayoutRecord | null; onApprove: () => void }) {
  if (!selectedPayout) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Approve Payout {selectedPayout.is_partial && <Badge className="ml-2 bg-amber-500">Partial</Badge>}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg"><p className="font-medium text-amber-900">{selectedPayout.member_name}</p><p className="text-sm text-amber-700">Type: {selectedPayout.type}</p><p className="text-sm text-amber-700">Days Paid: {selectedPayout.days_paid}/32</p><p className="text-sm text-amber-700">Amount: &#8358;{formatAmount(selectedPayout.total_amount)}</p><p className="text-sm text-amber-700">Net Payout: &#8358;{formatAmount(selectedPayout.net_payout)}</p><p className="text-sm text-amber-700">Requested by: {selectedPayout.staff_name}</p></div>
          <div className="flex gap-2"><Button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</Button><Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmountChangeDialog({ isOpen, onClose, currentUser, members, settings, onSubmit }: { isOpen: boolean; onClose: () => void; currentUser: User | null; members: Member[]; settings: AppSettings; onSubmit: (newAmount: number) => void }) {
  const myMember = members.find(m => m.user_id === currentUser?.id);
  const [newAmount, setNewAmount] = useState(myMember?.daily_amount.toString() || '');
  const today = new Date();
  const dayOfMonth = today.getDate();
  const withinGracePeriod = dayOfMonth >= 1 && dayOfMonth <= settings.allow_change_until_day;
  const handleSubmit = () => { const amount = parseInt(newAmount); if (!amount || amount < 500) { toast.error('Minimum daily amount is &#8358;500'); return; } onSubmit(amount); };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" />Change Daily Amount</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {withinGracePeriod ? (
            <>
              <div className="bg-emerald-50 p-4 rounded-lg"><p className="text-sm text-emerald-800">Current Amount: <strong>&#8358;{formatAmount(myMember?.daily_amount)}</strong></p><p className="text-xs text-emerald-600 mt-1">Available until the {settings.allow_change_until_day}rd of this month</p></div>
              <div><Label>New Daily Amount (&#8358;)</Label><Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Enter new amount (min &#8358;500)" min="500" /></div>
              <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">Save Change</Button>
            </>
          ) : settings.allow_change_after_grace_period ? (
            <>
              <div className="bg-amber-50 p-4 rounded-lg"><p className="text-sm text-amber-800"><AlertCircle className="w-4 h-4 inline mr-1" />The grace period has passed. Your request will require admin approval.</p></div>
              <div><Label>New Daily Amount (&#8358;)</Label><Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Enter new amount (min &#8358;500)" min="500" /></div>
              <Button onClick={handleSubmit} className="w-full bg-amber-600 hover:bg-amber-700">Request Approval</Button>
            </>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center"><AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-600">Amount changes are only available from the 1st to the {settings.allow_change_until_day}rd of each month.</p><p className="text-sm text-gray-500 mt-2">Please contact support for assistance.</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// NEW: Add Fund Dialog with Receipt Upload
function AddFundDialog({ isOpen, onClose, members, currentUser, settings, onSubmit }: { isOpen: boolean; onClose: () => void; members: Member[]; currentUser: User | null; settings: AppSettings; onSubmit: (amount: number, bankName: string, receiptData: { image: string; receiptDate: string; receiptAmount: number; receiptName: string }) => void }) {
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState(settings.supported_banks[0]?.name || 'OPay');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [step, setStep] = useState<'bank' | 'receipt'>('bank');

  const myMember = members.find(m => m.user_id === currentUser?.id);
  const dailyAmount = myMember?.daily_amount || 1000;
  const bankCharges = settings.bank_charges;
  const contributionAmount = Math.max(0, parseInt(amount || '0') - bankCharges);
  const daysToCover = Math.floor(contributionAmount / dailyAmount);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setReceiptImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    const totalAmount = parseInt(amount);
    if (totalAmount < dailyAmount + bankCharges) { toast.error(`Minimum amount is &#8358;${dailyAmount + bankCharges}`); return; }
    setStep('receipt');
  };

  const handleSubmit = () => {
    if (!receiptImage) { toast.error('Please upload receipt image'); return; }
    if (!receiptDate) { toast.error('Please enter receipt date'); return; }
    if (!receiptAmount || parseInt(receiptAmount) <= 0) { toast.error('Please enter receipt amount'); return; }
    if (!receiptName.trim()) { toast.error('Please enter name on receipt'); return; }
    if (receiptName.trim().toLowerCase() !== (myMember?.name || '').toLowerCase()) { toast.error(`Name on receipt must match registered name: ${myMember?.name}`); return; }

    onSubmit(parseInt(amount), selectedBank, { image: receiptImage, receiptDate, receiptAmount: parseInt(receiptAmount), receiptName: receiptName.trim() });
    setAmount(''); setReceiptImage(''); setReceiptDate(new Date().toISOString().split('T')[0]); setReceiptAmount(''); setReceiptName(''); setStep('bank');
  };

  // Open bank app link
  const openBankApp = () => {
    const bank = settings.supported_banks.find(b => b.name === selectedBank);
    if (bank?.app_scheme) { window.open(`${bank.app_scheme}://`, '_blank'); }
    else { toast.info(`Please open your ${selectedBank} app manually`); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> Add Fund via Bank Transfer</DialogTitle></DialogHeader>
        {step === 'bank' ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-emerald-800">Transfer to this Account:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm"><span className="text-gray-600">Bank Name:</span><span className="font-medium">{settings.bank_name}</span><span className="text-gray-600">Account Number:</span><span className="font-medium text-lg">{settings.account_number}</span><span className="text-gray-600">Account Name:</span><span className="font-medium">{settings.account_name}</span></div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg"><p className="text-sm text-amber-800"><AlertCircle className="w-4 h-4 inline mr-1" />Add &#8358;{bankCharges} for bank charges to your contribution</p></div>
            <div><Label>Select Your Bank</Label><Select value={selectedBank} onValueChange={setSelectedBank}><SelectTrigger className="mt-1"><SelectValue placeholder="Select your bank" /></SelectTrigger><SelectContent>{settings.supported_banks.map(bank => (<SelectItem key={bank.id} value={bank.name}>{bank.name}</SelectItem>))}</SelectContent></Select></div>
            <div><Label>Amount to Pay (&#8358;)</Label><div className="relative mt-1"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" /><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-10" placeholder={`e.g., ${dailyAmount + bankCharges}`} min={dailyAmount + bankCharges} /></div><p className="text-xs text-gray-500 mt-1">Daily amount: &#8358;{formatAmount(dailyAmount)}</p></div>
            {amount && parseInt(amount) > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Total Amount:</span><span className="font-medium">&#8358;{formatAmount(parseInt(amount || '0'))}</span></div>
                <div className="flex justify-between text-amber-600"><span>Bank Charges:</span><span>-&#8358;{formatAmount(bankCharges)}</span></div>
                <div className="flex justify-between text-emerald-600 font-medium border-t pt-1"><span>Contribution:</span><span>&#8358;{formatAmount(contributionAmount)}</span></div>
                <div className="flex justify-between text-purple-600 font-medium"><span>Days to Cover:</span><span>{daysToCover} day{daysToCover !== 1 ? 's' : ''}</span></div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={openBankApp} variant="outline" className="flex-1"><Landmark className="w-4 h-4 mr-2" /> Open {selectedBank}</Button>
              <Button onClick={handleNext} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!amount || parseInt(amount) < dailyAmount + bankCharges}><Upload className="w-4 h-4 mr-2" /> Upload Receipt</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setStep('bank')} className="text-sm text-emerald-600 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Upload Proof of Payment</p>
              <p className="text-xs text-blue-600">The receipt must show: your registered name ({myMember?.name}), today&apos;s date, and the amount paid</p>
            </div>
            <div><Label>Receipt Image *</Label><div className="mt-1"><Input type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" /></div>{receiptImage && (<img src={receiptImage} alt="Receipt preview" className="w-full h-40 object-contain bg-gray-100 rounded mt-2" />)}</div>
            <div><Label>Date on Receipt *</Label><Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} /></div>
            <div><Label>Amount on Receipt (&#8358;) *</Label><Input type="number" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} placeholder="Amount shown on receipt" /></div>
            <div><Label>Name on Receipt *</Label><Input type="text" value={receiptName} onChange={(e) => setReceiptName(e.target.value)} placeholder={`Must match: ${myMember?.name}`} /></div>
            <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">Submit for Review</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// NEW: Transfer Review Dialog for Admin
function TransferReviewDialog({ isOpen, onClose, transfer, settings, onReview }: { isOpen: boolean; onClose: () => void; transfer: PendingTransfer | null; settings: AppSettings; onReview: (id: string, approved: boolean, reason?: string) => void }) {
  const [rejectionReason, setRejectionReason] = useState('');
  if (!transfer) return null;

  const isNameMatch = transfer.receipt_name?.trim().toLowerCase() === transfer.member_name.toLowerCase();
  const isDateValid = transfer.receipt_date === new Date().toISOString().split('T')[0];
  const isAmountValid = transfer.receipt_amount === transfer.total_amount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-emerald-600" /> Review Transfer</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-lg space-y-2 text-sm">
            <h4 className="font-semibold text-emerald-800">Transfer Details</h4>
            <div className="grid grid-cols-2 gap-1"><span className="text-gray-600">Customer:</span><span className="font-medium">{transfer.member_name}</span><span className="text-gray-600">Bank:</span><span>{transfer.bank_name}</span><span className="text-gray-600">Amount Sent:</span><span className="font-medium">&#8358;{formatAmount(transfer.total_amount)}</span><span className="text-gray-600">Bank Charges:</span><span>&#8358;{formatAmount(transfer.bank_charges)}</span><span className="text-gray-600">Contribution:</span><span className="font-medium text-emerald-600">&#8358;{formatAmount(transfer.amount)}</span><span className="text-gray-600">Days:</span><span className="font-medium text-purple-600">{transfer.days_to_cover}</span></div>
          </div>

          {transfer.receipt_image && (
            <div><p className="text-sm font-medium mb-1">Receipt Image:</p><img src={transfer.receipt_image} alt="Receipt" className="w-full h-48 object-contain bg-gray-100 rounded border" /></div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
            <h4 className="font-semibold">Receipt Validation</h4>
            <div className="flex items-center justify-between"><span className="text-gray-600">Name on Receipt:</span><div className="flex items-center gap-2"><span>{transfer.receipt_name}</span>{isNameMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</div></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Receipt Date:</span><div className="flex items-center gap-2"><span>{transfer.receipt_date}</span>{isDateValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</div></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Receipt Amount:</span><div className="flex items-center gap-2"><span>&#8358;{formatAmount(transfer.receipt_amount)}</span>{isAmountValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</div></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Account Name:</span><span>{settings.account_name}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-600">Account Number:</span><span>{settings.account_number}</span></div>
          </div>

          {!isNameMatch && (
            <div className="bg-red-50 p-3 rounded-lg"><p className="text-sm text-red-700"><AlertCircle className="w-4 h-4 inline mr-1" />Name on receipt does not match registered customer name!</p></div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => onReview(transfer.id, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!isNameMatch}><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</Button>
            <Button onClick={() => onReview(transfer.id, false, rejectionReason || 'Receipt did not match requirements')} variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50"><Ban className="w-4 h-4 mr-2" /> Reject</Button>
          </div>
          <div><Label>Rejection Reason (optional)</Label><Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Enter reason for rejection" /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppDialog({ isOpen, onClose, whatsAppMessage, setWhatsAppMessage, onSend, settings }: { isOpen: boolean; onClose: () => void; whatsAppMessage: string; setWhatsAppMessage: (m: string) => void; onSend: () => void; settings: AppSettings }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-500" />WhatsApp Support</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 p-3 rounded-lg"><p className="text-sm text-green-800">Contact: <strong>{settings.customer_care_whatsapp}</strong></p></div>
          <p className="text-sm text-gray-600">Send a message to our support team via WhatsApp</p>
          <textarea value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} placeholder="Type your message here..." className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          <Button onClick={onSend} className="w-full bg-green-500 hover:bg-green-600"><MessageCircle className="w-4 h-4 mr-2" /> Open WhatsApp</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmationDialog({ isOpen, onClose, deleteTarget, onConfirm }: { isOpen: boolean; onClose: () => void; deleteTarget: { type: string; id: string; name: string } | null; onConfirm: () => void }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default App;
