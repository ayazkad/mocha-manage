-- Table pour suivre les avantages employés utilisés par jour
CREATE TABLE IF NOT EXISTS public.employee_daily_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  benefit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discount_used BOOLEAN DEFAULT false,
  free_drink_used BOOLEAN DEFAULT false,
  free_snack_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, benefit_date)
);

-- Table pour les pertes journalières
CREATE TABLE IF NOT EXISTS public.daily_losses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  session_id UUID REFERENCES sessions(id),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_loss NUMERIC NOT NULL,
  notes TEXT,
  loss_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_daily_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_losses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on employee_daily_benefits" 
ON public.employee_daily_benefits 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on daily_losses" 
ON public.daily_losses 
FOR ALL 
USING (true);

-- Indexes pour améliorer les performances
CREATE INDEX idx_employee_benefits_date ON public.employee_daily_benefits(employee_id, benefit_date);
CREATE INDEX idx_daily_losses_date ON public.daily_losses(loss_date);
CREATE INDEX idx_daily_losses_employee ON public.daily_losses(employee_id);