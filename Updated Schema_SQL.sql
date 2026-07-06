-- =========================================================================
-- 1. EXTENSIONS & SCHEMA CLEANUP
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables first using CASCADE (automatically handles triggers and constraints on them)
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.marked_days CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;

-- Drop trigger on the system table (auth.users always exists in Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop trigger functions safely
DROP FUNCTION IF EXISTS public.auto_split_on_transaction();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.create_transaction_notification();
DROP FUNCTION IF EXISTS public.create_transaction_delete_notification();

-- =========================================================================
-- 2. CREATE SYSTEM TABLES
-- =========================================================================

-- Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    manager TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles Table (Linked securely to Supabase Auth UUIDs)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Staff', 'Customer')),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    daily_amount NUMERIC NOT NULL DEFAULT 1000 CHECK (daily_amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- System Settings Table (Admin-controlled support configuration)
CREATE TABLE public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    support_phone TEXT NOT NULL DEFAULT '+234 803 461 2345',
    support_whatsapp TEXT NOT NULL DEFAULT '+234 803 461 2345',
    support_email TEXT NOT NULL DEFAULT 'support@hiremercy.com',
    admin_bank_name TEXT DEFAULT 'Access Bank',
    admin_account_number TEXT DEFAULT '0123456789',
    admin_account_name TEXT DEFAULT 'HireMercy Thrift Enterprises',
    advert_title TEXT DEFAULT 'Cartoon characters safely collecting small daily contributions from customers and returning them back to you in bulk!',
    advert_description TEXT DEFAULT 'Join the smart daily savings circle with HireMercyAJO.',
    advert_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    advert_enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Seed default settings
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Mobile Money', 'Bank App Transfer')),
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Failed', 'Successful')),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    days_covered INTEGER DEFAULT 0,
    start_day INTEGER DEFAULT 0,
    end_day INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Marked Days Tracker Table (The 32-Day Grid)
CREATE TABLE public.marked_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    -- Cascading on transaction deletion automatically unmarks tracking days
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 32),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_customer_marked_day UNIQUE (customer_id, day_number)
);

-- Payout Requests Table (Customer withdrawals and admin approvals)
CREATE TABLE public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payout_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Successful', 'Rejected')),
    month_paid TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications Table (System-wide alerts)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Null represents a global system-wide notification
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. INTERACTIVE TRIGGER PROCEDURES
-- =========================================================================

-- Security helper to read user role safely without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger: Automatically provisions a profile inside our system upon auth registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, phone, role, branch_id, daily_amount, is_active)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', 'New User'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'Customer'),
        (new.raw_user_meta_data->>'branch_id')::uuid,
        COALESCE((new.raw_user_meta_data->>'daily_amount')::numeric, 1000),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Implements auto-split allocation to locate and mark adjacent available days
CREATE OR REPLACE FUNCTION public.auto_split_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_amount NUMERIC;
    v_days_covered INT;
    v_day INT;
    v_count INT := 0;
    v_first_day INT := 0;
    v_last_day INT := 0;
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id := gen_random_uuid();
    END IF;

    SELECT daily_amount INTO v_daily_amount 
    FROM public.profiles 
    WHERE id = NEW.customer_id;

    IF v_daily_amount IS NULL OR v_daily_amount <= 0 THEN
        RAISE EXCEPTION 'Daily contribution amount is invalid or zero for user %.', NEW.customer_id;
    END IF;

    v_days_covered := FLOOR(NEW.amount / v_daily_amount);
    
    IF v_days_covered <= 0 THEN
        RAISE EXCEPTION 'Transaction amount % is less than the customer daily contribution pace of %', NEW.amount, v_daily_amount;
    END IF;

    FOR v_day IN 1..32 LOOP
        EXIT WHEN v_count = v_days_covered;
        
        IF NOT EXISTS (
            SELECT 1 FROM public.marked_days 
            WHERE customer_id = NEW.customer_id AND day_number = v_day
        ) THEN
            INSERT INTO public.marked_days (customer_id, transaction_id, day_number, amount, date)
            VALUES (NEW.customer_id, NEW.id, v_day, v_daily_amount, NEW.date);
            
            IF v_count = 0 THEN
                v_first_day := v_day;
            END IF;
            v_last_day := v_day;
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    NEW.days_covered := v_count;
    NEW.start_day := v_first_day;
    NEW.end_day := v_last_day;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_split_on_transaction
    BEFORE INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.auto_split_on_transaction();

-- Trigger: Automatically create notification on transaction insert
CREATE OR REPLACE FUNCTION public.create_transaction_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name TEXT;
    v_message TEXT;
BEGIN
    SELECT name INTO v_customer_name FROM public.profiles WHERE id = NEW.customer_id;
    v_message := 'A contribution of ₦' || NEW.amount || ' was successfully posted. ' || NEW.days_covered || ' tracking days are now marked (Days ' || NEW.start_day || ' to ' || NEW.end_day || ').';

    -- 1. Notify the Customer
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (NEW.customer_id, 'Contribution Posted Successfully', v_message);

    -- 2. Create Global Audit Notification for Admins/Staff
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (null, 'Activity Alert: New Contribution', 'Thrift agent processed ₦' || NEW.amount || ' for customer ' || v_customer_name || '.');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_transaction_notification
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.create_transaction_notification();

-- Trigger: Automatically create notification on transaction delete
CREATE OR REPLACE FUNCTION public.create_transaction_delete_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name TEXT;
    v_message TEXT;
BEGIN
    SELECT name INTO v_customer_name FROM public.profiles WHERE id = OLD.customer_id;
    v_message := 'A contribution of ₦' || OLD.amount || ' has been reversed or deleted by an administrator. Marked days ' || OLD.start_day || ' to ' || OLD.end_day || ' have been unmarked.';

    -- 1. Notify the Customer
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (OLD.customer_id, 'Contribution Reversal Notice', v_message);

    -- 2. Create Global Audit Notification for Admins/Staff
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (null, 'Activity Alert: Contribution Deleted', 'Admin deleted transaction of ₦' || OLD.amount || ' for customer ' || v_customer_name || '.');

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_transaction_delete_notification
    AFTER DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.create_transaction_delete_notification();

-- =========================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Branches Policies
CREATE POLICY "Branches readable by authenticated users" ON public.branches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Branches managed only by Admins" ON public.branches
    FOR ALL USING (public.get_user_role(auth.uid()) = 'Admin');

-- Profiles Policies
CREATE POLICY "Profiles readable by own user or supervisors" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

CREATE POLICY "Profiles updated by owners, admins or staff" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

CREATE POLICY "Admin has full profile administration permissions" ON public.profiles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'Admin');

-- System Settings Policies
CREATE POLICY "Support details visible to everyone" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "Support details managed by Admin only" ON public.system_settings
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'Admin');

-- Transactions Policies
CREATE POLICY "View transactions owned by self or supervisors" ON public.transactions
    FOR SELECT USING (
        customer_id = auth.uid() OR 
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

CREATE POLICY "Create transactions allowed for administrators and staff" ON public.transactions
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

CREATE POLICY "Delete transactions restricted to administrators only" ON public.transactions
    FOR DELETE USING (
        public.get_user_role(auth.uid()) = 'Admin'
    );

-- Marked Days Policies
CREATE POLICY "View marked days for self or supervisors" ON public.marked_days
    FOR SELECT USING (
        customer_id = auth.uid() OR 
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

-- Payout Requests Policies
CREATE POLICY "Payout requests visible to self or supervisors" ON public.payout_requests
    FOR SELECT USING (
        customer_id = auth.uid() OR
        public.get_user_role(auth.uid()) IN ('Admin', 'Staff')
    );

CREATE POLICY "Customers can request payouts" ON public.payout_requests
    FOR INSERT WITH CHECK (
        customer_id = auth.uid()
    );

CREATE POLICY "Admins can approve payout requests" ON public.payout_requests
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) = 'Admin'
    );

-- Notifications Policies
CREATE POLICY "Users can read their own or global audit notifications" ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND public.get_user_role(auth.uid()) IN ('Admin', 'Staff'))
    );

CREATE POLICY "Users can mark their notifications as read" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
-- =========================================================================
-- 32-DAY CONTRIBUTION ROLLOVER + CALENDAR EXPIRATION
-- Run this in the Supabase SQL Editor. Idempotent (safe to re-run).
-- =========================================================================

-- -------------------------------------------------------------------------
-- -1. CREATE THE MISSING TABLES
--     Your project doesn't have `contributions` or `payout_history` yet -
--     this is what threw "relation contributions does not exist". Creating
--     them here before anything else touches them.
-- -------------------------------------------------------------------------
create table if not exists contributions (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references profiles(id) on delete cascade,
  month_label   text not null,
  period_key    text not null,
  total_days    int not null,
  total_amount  numeric not null,
  status        text not null default 'saved' check (status in ('saved', 'requested', 'paid')),
  created_at    timestamptz not null default now()
);

create table if not exists payout_history (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references profiles(id) on delete cascade,
  contribution_id    uuid references contributions(id) on delete set null,
  payout_request_id  uuid references payout_requests(id) on delete set null,
  month_label        text not null,
  total_amount        numeric not null,
  payout_amount       numeric not null,
  bank_name           text not null,
  account_number      text not null,
  account_name        text not null,
  approved_at         timestamptz not null default now()
);

alter table contributions enable row level security;
alter table payout_history enable row level security;

-- Baseline policies - mirror whatever pattern you're using on marked_days /
-- payout_requests. These are permissive owner + staff/admin defaults; tighten
-- as needed for your actual role setup.
drop policy if exists "customers read own contributions" on contributions;
create policy "customers read own contributions" on contributions
  for select using (
    customer_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('Admin', 'Staff'))
  );

drop policy if exists "staff manage contributions" on contributions;
create policy "staff manage contributions" on contributions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('Admin', 'Staff'))
  );

drop policy if exists "customers read own payout history" on payout_history;
create policy "customers read own payout history" on payout_history
  for select using (
    customer_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('Admin', 'Staff'))
  );

drop policy if exists "staff manage payout history" on payout_history;
create policy "staff manage payout history" on payout_history
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('Admin', 'Staff'))
  );

-- -------------------------------------------------------------------------
-- 0. SCHEMA: give marked_days and contributions a "period_key" (YYYY-MM)
--    so multiple month-cycles for the same customer can never collide.
-- -------------------------------------------------------------------------
alter table marked_days
  add column if not exists period_key text,
  add column if not exists transaction_id uuid references transactions(id);

update marked_days
  set period_key = to_char(created_at, 'YYYY-MM')
  where period_key is null;

alter table marked_days
  alter column period_key set default to_char(now(), 'YYYY-MM');

create index if not exists idx_marked_days_customer_period
  on marked_days (customer_id, period_key);

alter table contributions
  add column if not exists period_key text;

create unique index if not exists uq_contributions_customer_period
  on contributions (customer_id, period_key);
  -- Prevents the same customer/month ever being frozen twice, even if the
  -- trigger and the cron job both attempt it in a race.

-- -------------------------------------------------------------------------
-- 1. HELPERS
-- -------------------------------------------------------------------------
create or replace function period_label(p_period_key text)
returns text language sql immutable as $$
  select to_char(to_date(p_period_key || '-01', 'YYYY-MM-DD'), 'FMMonth YYYY');
$$;

create or replace function next_period_key(p_period_key text)
returns text language sql immutable as $$
  select to_char(
    (to_date(p_period_key || '-01', 'YYYY-MM-DD') + interval '1 month')::date,
    'YYYY-MM'
  );
$$;

-- Archives whatever is currently sitting in marked_days for one
-- customer+period into `contributions` as status='saved', then clears it.
-- Works identically whether the period is full (32/32) or was cut short
-- by a calendar rollover (e.g. 15/32) - both are legitimate "saved" states.
create or replace function freeze_period(p_customer_id uuid, p_period_key text)
returns void language plpgsql as $$
declare
  v_total_days int;
  v_total_amount numeric;
begin
  select count(*), coalesce(sum(amount), 0)
    into v_total_days, v_total_amount
  from marked_days
  where customer_id = p_customer_id and period_key = p_period_key;

  if v_total_days = 0 then
    return; -- nothing to freeze
  end if;

  insert into contributions (customer_id, month_label, period_key, total_days, total_amount, status)
  values (p_customer_id, period_label(p_period_key), p_period_key, v_total_days, v_total_amount, 'saved')
  on conflict (customer_id, period_key) do nothing;

  delete from marked_days where customer_id = p_customer_id and period_key = p_period_key;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. RULE 1 - THE MULTI-DAY OVERFLOW TRIGGER
--    Fires on every new transaction. Converts amount -> number of days,
--    then fills the customer's currently-open period up to exactly 32,
--    freezes it, and cascades any remainder into the next period(s).
--    Also defensively applies Rule 2 first, in case a stale prior month
--    is still sitting open when this transaction arrives.
-- -------------------------------------------------------------------------
create or replace function fn_handle_transaction_split()
returns trigger language plpgsql as $$
declare
  v_daily_amount   numeric;
  v_days_to_mark   int;
  v_current_period text := to_char(current_date, 'YYYY-MM');
  v_active_period  text;
  v_current_count  int;
  v_remaining_slots int;
  v_days_this_block int;
  d int;
  v_stale record;
begin
  select daily_amount into v_daily_amount
  from profiles where id = new.customer_id;

  if v_daily_amount is null or v_daily_amount <= 0 then
    raise exception 'Customer % has no valid daily_amount configured', new.customer_id;
  end if;

  v_days_to_mark := round(new.amount / v_daily_amount);
  if v_days_to_mark <= 0 then
    return new; -- amount didn't round up to even 1 day; leave transaction as a plain record
  end if;

  -- RULE 2 (defensive): freeze any period(s) left over from previous
  -- calendar months before applying today's contribution, so we never
  -- add fresh days on top of a stale, unfrozen month.
  for v_stale in
    select distinct period_key
    from marked_days
    where customer_id = new.customer_id and period_key < v_current_period
    order by period_key
  loop
    perform freeze_period(new.customer_id, v_stale.period_key);
  end loop;

  -- Whichever period still has open (unfrozen) days is the active one.
  select period_key into v_active_period
  from marked_days
  where customer_id = new.customer_id
  order by period_key desc
  limit 1;

  if v_active_period is null then
    v_active_period := v_current_period;
  end if;

  -- Allocate days across as many periods as needed (handles lump sums
  -- covering more than one month's worth of days in a single payment).
  while v_days_to_mark > 0 loop
    select count(*) into v_current_count
    from marked_days
    where customer_id = new.customer_id and period_key = v_active_period;

    v_remaining_slots := 32 - v_current_count;

    if v_remaining_slots <= 0 then
      perform freeze_period(new.customer_id, v_active_period);
      v_active_period := next_period_key(v_active_period);
      continue;
    end if;

    v_days_this_block := least(v_days_to_mark, v_remaining_slots);

    for d in 1..v_days_this_block loop
      insert into marked_days (customer_id, day_number, amount, period_key, transaction_id)
      values (new.customer_id, v_current_count + d, v_daily_amount, v_active_period, new.id);
    end loop;

    v_days_to_mark := v_days_to_mark - v_days_this_block;

    -- Exactly hit 32 in this period -> freeze it and roll any remainder
    -- straight into the next calendar month, immediately.
    if v_current_count + v_days_this_block >= 32 then
      perform freeze_period(new.customer_id, v_active_period);
      v_active_period := next_period_key(v_active_period);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_transaction_split on transactions;
create trigger trg_transaction_split
  after insert on transactions
  for each row
  execute function fn_handle_transaction_split();

-- -------------------------------------------------------------------------
-- 3. RULE 2 - CALENDAR MONTH EXPIRATION (proactive, no transaction needed)
--    Freezes any customer's incomplete prior-month table the moment the
--    calendar flips, even if they never make another contribution.
-- -------------------------------------------------------------------------
create or replace function expire_stale_periods()
returns void language plpgsql as $$
declare
  v_current_period text := to_char(current_date, 'YYYY-MM');
  r record;
begin
  for r in
    select distinct customer_id, period_key
    from marked_days
    where period_key < v_current_period
  loop
    perform freeze_period(r.customer_id, r.period_key);
  end loop;
end;
$$;

-- pg_cron must be enabled before cron.schedule() exists. On most Supabase
-- projects this line works directly in the SQL Editor. If it errors with a
-- permissions message instead, enable it manually via:
--   Dashboard -> Database -> Extensions -> search "pg_cron" -> Enable
-- then re-run just the two `select cron.schedule(...)` blocks below.
create extension if not exists pg_cron;

-- Unschedule any earlier partial attempt so re-running this file is safe.
select cron.unschedule(jobid) from cron.job where jobname = 'expire-stale-contribution-periods-monthly';
select cron.unschedule(jobid) from cron.job where jobname = 'expire-stale-contribution-periods-daily-safety';

select cron.schedule(
  'expire-stale-contribution-periods-monthly',
  '5 0 1 * *',                                  -- 00:05 on the 1st of every month
  $$select expire_stale_periods();$$
);

-- Safety net in case of timezone drift around month boundaries - cheap to run,
-- it's a no-op unless there's genuinely a stale period sitting around.
select cron.schedule(
  'expire-stale-contribution-periods-daily-safety',
  '10 0 * * *',
  $$select expire_stale_periods();$$
);
