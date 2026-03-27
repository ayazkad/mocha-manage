-- 1. Create a table for businesses/profiles linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add business_id to all existing tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'business_id') THEN
        ALTER TABLE public.employees ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'business_id') THEN
        ALTER TABLE public.categories ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'business_id') THEN
        ALTER TABLE public.products ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_options' AND column_name = 'business_id') THEN
        ALTER TABLE public.product_options ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'business_id') THEN
        ALTER TABLE public.sessions ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'business_id') THEN
        ALTER TABLE public.orders ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'business_id') THEN
        ALTER TABLE public.order_items ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'business_id') THEN
        ALTER TABLE public.customers ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'business_id') THEN
        ALTER TABLE public.offers ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_transactions' AND column_name = 'business_id') THEN
        ALTER TABLE public.customer_transactions ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_daily_benefits' AND column_name = 'business_id') THEN
        ALTER TABLE public.employee_daily_benefits ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create Indexes for business_id
CREATE INDEX IF NOT EXISTS idx_employees_business ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_product_options_business ON public.product_options(business_id);
CREATE INDEX IF NOT EXISTS idx_sessions_business ON public.sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_order_items_business ON public.order_items(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_offers_business ON public.offers(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_business ON public.customer_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_daily_benefits_business ON public.employee_daily_benefits(business_id);

-- 4. Update RLS Policies
-- First, drop existing "allow all" policies
DROP POLICY IF EXISTS "Allow all operations on employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on product_options" ON public.product_options;
DROP POLICY IF EXISTS "Allow all operations on sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations on offers" ON public.offers;
DROP POLICY IF EXISTS "Allow all operations on customer_transactions" ON public.customer_transactions;
DROP POLICY IF EXISTS "Allow all operations on employee_daily_benefits" ON public.employee_daily_benefits;

-- New Policies: Data is scoped by business_id (linked to auth.uid())
-- For Profiles (Owners)
CREATE POLICY "Manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- For Employees
CREATE POLICY "Business data access - employees" ON public.employees
  FOR ALL USING (business_id = auth.uid());

-- For Categories
CREATE POLICY "Business data access - categories" ON public.categories
  FOR ALL USING (business_id = auth.uid());

-- For Products
CREATE POLICY "Business data access - products" ON public.products
  FOR ALL USING (business_id = auth.uid());

-- For Product Options
CREATE POLICY "Business data access - product_options" ON public.product_options
  FOR ALL USING (business_id = auth.uid());

-- For Sessions
CREATE POLICY "Business data access - sessions" ON public.sessions
  FOR ALL USING (business_id = auth.uid());

-- For Orders
CREATE POLICY "Business data access - orders" ON public.orders
  FOR ALL USING (business_id = auth.uid());

-- For Order Items
CREATE POLICY "Business data access - order_items" ON public.order_items
  FOR ALL USING (business_id = auth.uid());

-- For Customers
CREATE POLICY "Business data access - customers" ON public.customers
  FOR ALL USING (business_id = auth.uid());

-- For Offers
CREATE POLICY "Business data access - offers" ON public.offers
  FOR ALL USING (business_id = auth.uid());

-- For Customer Transactions
CREATE POLICY "Business data access - customer_transactions" ON public.customer_transactions
  FOR ALL USING (business_id = auth.uid());

-- For Employee Daily Benefits
CREATE POLICY "Business data access - employee_daily_benefits" ON public.employee_daily_benefits
  FOR ALL USING (business_id = auth.uid());

-- 5. Trigger to automatically create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (new.id, new.raw_user_meta_data->>'business_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
