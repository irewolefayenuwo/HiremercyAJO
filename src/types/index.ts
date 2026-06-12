export type UserRole = 'Admin' | 'Staff' | 'Customer';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  branch_id?: string;
  branch_name?: string;
  member_id?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  profile_image?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Staff';
  branch_id: string;
  branch_name: string;
  can_payout: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  daily_amount: number;
  start_date: string;
  status: 'Active' | 'Inactive';
  cycle_position: number;
  branch_id: string;
  branch_name: string;
  staff_id?: string;
  staff_name?: string;
  password?: string;
  profile_image?: string;
  wallet_balance?: number;
  tracking: DayTracking[];
}

export interface DayTracking {
  day: number;
  date: string;
  paid: boolean;
  amount: number;
  transaction_id?: string;
}

export interface Transaction {
  id: string;
  member_id: string;
  member_name: string;
  amount: number;
  date: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Bank App Transfer';
  status: 'Paid' | 'Pending' | 'Overdue';
  notes?: string;
  reference?: string;
  transaction_type?: 'Contribution' | 'Funding' | 'Loan' | 'Payout';
  branch_id: string;
  branch_name: string;
  staff_id?: string;
  staff_name?: string;
  days_covered: number;
  start_day: number;
  end_day: number;
  created_at: string;
  bank_name?: string;
  bank_charges?: number;
}

export interface PayoutRecord {
  id: string;
  member_id: string;
  member_name: string;
  type: 'Payout' | 'Borrow';
  days_paid: number;
  daily_amount: number;
  total_amount: number;
  company_profit: number;
  net_payout: number;
  date: string;
  branch_id: string;
  branch_name: string;
  staff_id?: string;
  staff_name?: string;
  status: 'Pending' | 'Completed';
  approved_by?: string;
  is_partial?: boolean;
}

export interface LoanRequest {
  id: string;
  member_id: string;
  member_name: string;
  branch_id: string;
  branch_name: string;
  staff_id?: string;
  staff_name?: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  requested_amount: number;
  note?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  comment?: string;
  approved_amount?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  created_at: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  branch_id?: string;
  branch_name?: string;
  action: string;
  description: string;
  date: string;
  time: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  todayCollections: number;
  yesterdayCollections: number;
  totalCollections: number;
  totalPayouts: number;
  totalBorrows: number;
  companyProfit: number;
  averageDailyCollection: number;
  collectionRate: number;
  pendingPayments: number;
  overduePayments: number;
  totalBranches: number;
  totalStaff: number;
  todayCustomersPaid: number;
  pendingTransfers: number;
  pendingLoans: number;
}

export interface AppSettings {
  customer_care_phone: string;
  customer_care_whatsapp: string;
  support_email: string;
  staff_can_payout_without_approval: boolean;
  require_admin_approval_for_all_payouts: boolean;
  allow_customers_change_amount: boolean;
  allow_change_until_day: number;
  allow_change_after_grace_period: boolean;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_charges: number;
  supported_banks: NigerianBank[];
  last_collection_reset_date: string;
  yesterday_collection_record: number;
  yesterday_customers_paid: number;
}

export interface NigerianBank {
  id: string;
  name: string;
  code: string;
  app_scheme?: string;
  app_package?: string;
}

export interface PendingTransfer {
  id: string;
  member_id: string;
  member_name: string;
  amount: number;
  days_to_cover: number;
  bank_name: string;
  bank_charges: number;
  total_amount: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  created_at: string;
  confirmed_at?: string;
  receipt_image?: string;
  receipt_date?: string;
  receipt_amount?: number;
  receipt_name?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  branch_id: string;
  branch_name: string;
}

export interface AmountChangeRequest {
  id: string;
  member_id: string;
  member_name: string;
  current_amount: number;
  requested_amount: number;
  requested_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_at?: string;
  branch_id: string;
  branch_name: string;
}
