-- Créer la table des offres automatiques
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  discount_type VARCHAR NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  active BOOLEAN DEFAULT true,
  min_items INTEGER DEFAULT 0,
  min_amount NUMERIC DEFAULT 0,
  applicable_categories UUID[] DEFAULT ARRAY[]::UUID[],
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policy pour les offres
CREATE POLICY "Allow all operations on offers" 
ON public.offers 
FOR ALL 
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();