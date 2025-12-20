-- Create table for printer settings
CREATE TABLE public.printer_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  printer_server_ip TEXT NOT NULL DEFAULT '192.168.1.187',
  printer_name TEXT DEFAULT 'Imprimante POS',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read printer settings (employees need this for printing)
CREATE POLICY "Anyone can read printer settings" 
ON public.printer_settings 
FOR SELECT 
USING (true);

-- Only allow updates (no insert/delete needed, we'll use a single row)
CREATE POLICY "Anyone can update printer settings" 
ON public.printer_settings 
FOR UPDATE 
USING (true);

-- Insert default settings row
INSERT INTO public.printer_settings (printer_server_ip, printer_name) 
VALUES ('192.168.1.187', 'Imprimante POS');

-- Add trigger for updated_at
CREATE TRIGGER update_printer_settings_updated_at
BEFORE UPDATE ON public.printer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();