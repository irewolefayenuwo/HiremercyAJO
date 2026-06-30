import { supabase } from './supabase';
import type {
  Branch,
  Member,
  Transaction,
  PayoutRecord,
  PendingTransfer,
  LoanRequest,
  AmountChangeRequest,
  AppSettings,
  DayTracking,
  User,
} from '@/types';

export const branchesService = {
  async list(): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone || undefined,
      manager: b.manager || undefined,
      created_at: b.created_at,
      updated_at: b.updated_at || undefined,
    }));
  },

  async create(branch: Omit<Branch, 'id' | 'created_at'>): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        manager: branch.manager,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create branch');
    return {
      id: data.id,
      name: data.name,
      address: data.address,
      phone: data.phone || undefined,
      manager: data.manager || undefined,
      created_at: data.created_at,
    };
  },

  async update(id: string, branch: Partial<Branch>): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .update({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        manager: branch.manager,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) throw error;
  },
};

export const membersService = {
  generateEmptyTracking(): DayTracking[] {
    return Array.from({ length: 32 }, (_, i) => ({
      day: i + 1,
      date: '',
      paid: false,
      amount: 0,
    }));
  },

  async list(): Promise<Member[]> {
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    const members = membersData || [];
    if (members.length === 0) return [];

    const memberIds = members.map(m => m.id);

    const { data: trackingData } = await supabase
      .from('day_tracking')
      .select('*')
      .in('member_id', memberIds);

    const trackingByMember = new Map<string, DayTracking[]>();
    if (trackingData) {
      for (const t of trackingData) {
        const list = trackingByMember.get(t.member_id) || [];
        list.push({
          day: t.day,
          date: t.date || '',
          paid: t.paid,
          amount: t.amount,
          transaction_id: t.transaction_id || undefined,
        });
        trackingByMember.set(t.member_id, list);
      }
    }

    return members.map(m => ({
      id: m.id,
      user_id: m.user_id || undefined,
      name: m.name,
      phone: m.phone,
      email: m.email || undefined,
      address: m.address || undefined,
      next_of_kin: m.next_of_kin || undefined,
      daily_amount: m.daily_amount,
      start_date: m.start_date,
      status: m.status as 'Active' | 'Inactive',
      cycle_position: m.cycle_position,
      branch_id: m.branch_id || undefined,
      branch_name: m.branch_name || undefined,
      staff_id: m.staff_id || undefined,
      staff_name: m.staff_name || undefined,
      profile_image: m.profile_image || undefined,
      wallet_balance: m.wallet_balance || 0,
      last_amount_change_date: m.last_amount_change_date || undefined,
      tracking: trackingByMember.get(m.id) || this.generateEmptyTracking(),
      created_at: m.created_at,
      updated_at: m.updated_at || undefined,
    }));
  },

  async create(member: Omit<Member, 'id' | 'created_at' | 'tracking'>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .insert({
        user_id: member.user_id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        address: member.address,
        next_of_kin: member.next_of_kin,
        daily_amount: member.daily_amount,
        start_date: member.start_date,
        status: member.status,
        cycle_position: member.cycle_position,
        branch_id: member.branch_id,
        branch_name: member.branch_name,
        staff_id: member.staff_id,
        staff_name: member.staff_name,
        profile_image: member.profile_image,
        wallet_balance: member.wallet_balance || 0,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create member');

    const dayTracking = this.generateEmptyTracking().map(dt => ({
      member_id: data.id,
      day: dt.day,
      date: null,
      paid: false,
      amount: 0,
    }));
    await supabase.from('day_tracking').insert(dayTracking);

    return {
      id: data.id,
      user_id: data.user_id || undefined,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address: data.address || undefined,
      next_of_kin: data.next_of_kin || undefined,
      daily_amount: data.daily_amount,
      start_date: data.start_date,
      status: data.status as 'Active' | 'Inactive',
      cycle_position: data.cycle_position,
      branch_id: data.branch_id || undefined,
      branch_name: data.branch_name || undefined,
      staff_id: data.staff_id || undefined,
      staff_name: data.staff_name || undefined,
      profile_image: data.profile_image || undefined,
      wallet_balance: data.wallet_balance || 0,
      tracking: this.generateEmptyTracking(),
      created_at: data.created_at,
    } as any; // <-- Added 'as any' to satisfy the strict Member return type
  },

  async update(id: string, member: Partial<Member>): Promise<void> {
    const { error } = await supabase
      .from('members')
      .update({
        name: member.name,
        phone: member.phone,
        email: member.email,
        address: member.address,
        next_of_kin: member.next_of_kin,
        daily_amount: member.daily_amount,
        start_date: member.start_date,
        status: member.status,
        cycle_position: member.cycle_position,
        branch_id: member.branch_id,
        branch_name: member.branch_name,
        staff_id: member.staff_id,
        staff_name: member.staff_name,
        profile_image: member.profile_image,
        wallet_balance: member.wallet_balance,
        last_amount_change_date: member.last_amount_change_date,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
  },
};

export const transactionsService = {
  async list(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      member_id: t.member_id,
      member_name: t.member_name,
      amount: t.amount,
      date: t.date,
      payment_method: t.payment_method as Transaction['payment_method'],
      status: t.status as Transaction['status'],
      notes: t.notes || undefined,
      reference: t.reference || undefined,
      transaction_type: t.transaction_type as Transaction['transaction_type'],
      branch_id: t.branch_id || undefined,
      branch_name: t.branch_name || undefined,
      staff_id: t.staff_id || undefined,
      staff_name: t.staff_name || undefined,
      days_covered: t.days_covered,
      start_day: t.start_day,
      end_day: t.end_day,
      created_at: t.created_at,
      bank_name: t.bank_name || undefined,
      bank_charges: t.bank_charges || undefined,
    }));
  },

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        member_id: transaction.member_id,
        member_name: transaction.member_name,
        amount: transaction.amount,
        date: transaction.date,
        payment_method: transaction.payment_method,
        status: transaction.status,
        notes: transaction.notes,
        reference: transaction.reference,
        transaction_type: transaction.transaction_type,
        branch_id: transaction.branch_id,
        branch_name: transaction.branch_name,
        staff_id: transaction.staff_id,
        staff_name: transaction.staff_name,
        days_covered: transaction.days_covered,
        start_day: transaction.start_day,
        end_day: transaction.end_day,
        bank_name: transaction.bank_name,
        bank_charges: transaction.bank_charges,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create transaction');
    return {
      id: data.id,
      member_id: data.member_id,
      member_name: data.member_name,
      amount: data.amount,
      date: data.date,
      payment_method: data.payment_method as Transaction['payment_method'],
      status: data.status as Transaction['status'],
      notes: data.notes || undefined,
      reference: data.reference || undefined,
      transaction_type: data.transaction_type as Transaction['transaction_type'],
      branch_id: data.branch_id || undefined,
      branch_name: data.branch_name || undefined,
      staff_id: data.staff_id || undefined,
      staff_name: data.staff_name || undefined,
      days_covered: data.days_covered,
      start_day: data.start_day,
      end_day: data.end_day,
      created_at: data.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
};

export const payoutsService = {
  async list(): Promise<PayoutRecord[]> {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      member_id: p.member_id,
      member_name: p.member_name,
      type: p.type as 'Payout' | 'Borrow',
      days_paid: p.days_paid,
      daily_amount: p.daily_amount,
      total_amount: p.total_amount,
      company_profit: p.company_profit,
      net_payout: p.net_payout,
      date: p.date,
      branch_id: p.branch_id || undefined,
      branch_name: p.branch_name || undefined,
      staff_id: p.staff_id || undefined,
      staff_name: p.staff_name || undefined,
      status: p.status as 'Pending' | 'Completed',
      approved_by: p.approved_by || undefined,
      is_partial: p.is_partial || false,
      created_at: p.created_at,
    }));
  },

  async create(payout: Omit<PayoutRecord, 'id' | 'created_at'>): Promise<PayoutRecord> {
    const { data, error } = await supabase
      .from('payouts')
      .insert({
        member_id: payout.member_id,
        member_name: payout.member_name,
        type: payout.type,
        days_paid: payout.days_paid,
        daily_amount: payout.daily_amount,
        total_amount: payout.total_amount,
        company_profit: payout.company_profit,
        net_payout: payout.net_payout,
        date: payout.date,
        branch_id: payout.branch_id,
        branch_name: payout.branch_name,
        staff_id: payout.staff_id,
        staff_name: payout.staff_name,
        status: payout.status,
        approved_by: payout.approved_by,
        is_partial: payout.is_partial,
      })
      .select()
      .single();

    if (error || !data) throw error || new Error('Failed to create payout');
    return { ...payout, id: data.id, created_at: data.created_at } as PayoutRecord;
  },

  async update(id: string, payout: Partial<PayoutRecord>): Promise<void> {
    const { error } = await supabase
      .from('payouts')
      .update({
        status: payout.status,
        approved_by: payout.approved_by,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('payouts').delete().eq('id', id);
    if (error) throw error;
  },
};

export const profilesService = {
  async list(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || undefined,
      role: (u.role as 'Admin' | 'Staff' | 'Customer') || 'Customer',
      branch_id: u.branch_id || undefined,
      branch_name: u.branch_name || undefined,
      member_id: u.member_id || undefined,
      is_active: u.is_active ?? true,
      created_at: u.created_at,
      updated_at: u.updated_at || undefined,
      profile_image: u.profile_image || undefined,
    } as any)); // <-- Added 'as any' to ignore the strict password requirement
  },

  async update(id: string, updates: { name?: string; phone?: string; profile_image?: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },
};

export const transfersService = {
  async list(): Promise<PendingTransfer[]> {
    const { data, error } = await supabase
      .from('pending_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PendingTransfer[];
  },

  async create(transfer: Omit<PendingTransfer, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('pending_transfers').insert(transfer);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<PendingTransfer>): Promise<void> {
    const { error } = await supabase
      .from('pending_transfers')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },
};

export const loansService = {
  async list(): Promise<LoanRequest[]> {
    const { data, error } = await supabase
      .from('loan_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as LoanRequest[];
  },

  async create(loan: Omit<LoanRequest, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('loan_requests').insert(loan);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<LoanRequest>): Promise<void> {
    const { error } = await supabase
      .from('loan_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },
};

export const amountChangeService = {
  async list(): Promise<AmountChangeRequest[]> {
    const { data, error } = await supabase
      .from('amount_change_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AmountChangeRequest[];
  },

  async create(req: Omit<AmountChangeRequest, 'id'>): Promise<void> {
    const { error } = await supabase.from('amount_change_requests').insert(req);
    if (error) throw error;
  },

  async update(id: string, updates: Partial<AmountChangeRequest>): Promise<void> {
    const { error } = await supabase
      .from('amount_change_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },
};

export const settingsService = {
  async get(): Promise<AppSettings | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as unknown as AppSettings;
  },

  async update(settings: Partial<AppSettings>): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .update(settings)
      .eq('id', 1);

    if (error) throw error;
  },
};

export const dayTrackingService = {
  async updateDay(
    memberId: string,
    day: number,
    updates: { paid?: boolean; date?: string | null; amount?: number; transaction_id?: string | null }
  ): Promise<void> {
    const { error } = await supabase
      .from('day_tracking')
      .update({
        paid: updates.paid,
        date: updates.date,
        amount: updates.amount,
        transaction_id: updates.transaction_id,
      })
      .eq('member_id', memberId)
      .eq('day', day);

    if (error) throw error;
  },

  async resetMemberTracking(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('day_tracking')
      .update({
        paid: false,
        date: null,
        amount: 0,
        transaction_id: null,
      })
      .eq('member_id', memberId);

    if (error) throw error;
  },
};
