-- =========================================================================
-- 1. EXTENSIONS & SCHEMA CLEANUP
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables first using CASCADE (automatically handles triggers and constraints on them)
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.marked_days CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
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
    email TEXT NOT NULL UNIQUE,
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
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Mobile Money')),
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Failed')),
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

-- Notifications Policies
CREATE POLICY "Users can read their own or global audit notifications" ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND public.get_user_role(auth.uid()) IN ('Admin', 'Staff'))
    );

CREATE POLICY "Users can mark their notifications as read" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());