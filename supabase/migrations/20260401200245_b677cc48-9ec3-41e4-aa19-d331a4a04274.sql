
-- 1. Table business_settings pour les mentions légales obligatoires
CREATE TABLE public.business_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text NOT NULL DEFAULT '',
  ice text NOT NULL DEFAULT '',
  identifiant_fiscal text NOT NULL DEFAULT '',
  patente text NOT NULL DEFAULT '',
  rc text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  tva_rate numeric NOT NULL DEFAULT 20,
  currency text NOT NULL DEFAULT 'MAD',
  footer_message text NOT NULL DEFAULT 'Merci pour votre visite!',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business settings"
  ON public.business_settings FOR SELECT
  TO public USING (true);

CREATE POLICY "Anyone can update business settings"
  ON public.business_settings FOR UPDATE
  TO public USING (true);

CREATE POLICY "Anyone can insert business settings"
  ON public.business_settings FOR INSERT
  TO public WITH CHECK (true);

-- Insert default row
INSERT INTO public.business_settings (business_name) VALUES ('Mon Commerce');

-- 2. Add ticket_hash and previous_hash to orders for anti-fraud chain
ALTER TABLE public.orders
  ADD COLUMN ticket_hash text,
  ADD COLUMN previous_hash text;

-- 3. Function to generate chained hash on order completion
CREATE OR REPLACE FUNCTION public.generate_ticket_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_hash text;
  hash_input text;
BEGIN
  -- Only generate hash when order becomes completed and doesn't have one yet
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.ticket_hash IS NULL THEN
    -- Get the hash of the last completed order
    SELECT ticket_hash INTO prev_hash
    FROM orders
    WHERE status = 'completed' AND ticket_hash IS NOT NULL
    ORDER BY completed_at DESC, created_at DESC
    LIMIT 1;

    IF prev_hash IS NULL THEN
      prev_hash := 'GENESIS';
    END IF;

    -- Build hash input: order_number | total | date | previous_hash
    hash_input := NEW.order_number || '|' || NEW.total::text || '|' || COALESCE(NEW.completed_at, now())::text || '|' || prev_hash;

    NEW.previous_hash := prev_hash;
    NEW.ticket_hash := encode(digest(hash_input, 'sha256'), 'hex');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_ticket_hash
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_hash();

-- 4. Protect completed orders from deletion
CREATE OR REPLACE FUNCTION public.prevent_completed_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Les commandes validées ne peuvent pas être supprimées (conformité DGI)';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_prevent_completed_order_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_order_delete();

-- 5. Protect completed orders from modification (except status change to cancelled for avoirs)
CREATE OR REPLACE FUNCTION public.prevent_completed_order_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed' AND OLD.ticket_hash IS NOT NULL THEN
    -- Allow only status change (for creating avoir/credit note reference)
    IF NEW.total IS DISTINCT FROM OLD.total
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.order_number IS DISTINCT FROM OLD.order_number
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount THEN
      RAISE EXCEPTION 'Les commandes validées avec hash ne peuvent pas être modifiées (conformité DGI)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_completed_order_modification
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_order_modification();

-- Timestamp trigger for business_settings
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
