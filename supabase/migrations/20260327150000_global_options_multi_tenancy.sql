-- Add business_id to global_options and global_option_values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'global_options' AND column_name = 'business_id') THEN
        ALTER TABLE public.global_options ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'global_option_values' AND column_name = 'business_id') THEN
        ALTER TABLE public.global_option_values ADD COLUMN business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.global_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_option_values ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Business data access - global_options" ON public.global_options;
DROP POLICY IF EXISTS "Business data access - global_option_values" ON public.global_option_values;

-- New Policies
CREATE POLICY "Business data access - global_options" ON public.global_options
  FOR ALL USING (business_id = auth.uid());

CREATE POLICY "Business data access - global_option_values" ON public.global_option_values
  FOR ALL USING (business_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_global_options_business ON public.global_options(business_id);
CREATE INDEX IF NOT EXISTS idx_global_option_values_business ON public.global_option_values(business_id);
