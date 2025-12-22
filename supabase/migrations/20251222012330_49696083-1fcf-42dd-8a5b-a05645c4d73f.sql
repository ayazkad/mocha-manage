-- Add cash_received column to orders table to track the amount of cash received
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_received numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.cash_received IS 'Amount of cash received from customer for cash payments';