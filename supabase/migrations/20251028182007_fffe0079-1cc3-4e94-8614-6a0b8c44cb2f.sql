-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  qr_code VARCHAR NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  points INTEGER NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow all operations on customers
CREATE POLICY "Allow all operations on customers" 
ON public.customers 
FOR ALL 
USING (true);

-- Create customer_transactions table to track loyalty points
CREATE TABLE public.customer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points_added INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on customer_transactions
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all operations on customer_transactions
CREATE POLICY "Allow all operations on customer_transactions" 
ON public.customer_transactions 
FOR ALL 
USING (true);

-- Create trigger to update customers updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster QR code lookups
CREATE INDEX idx_customers_qr_code ON public.customers(qr_code);
CREATE INDEX idx_customer_transactions_customer_id ON public.customer_transactions(customer_id);