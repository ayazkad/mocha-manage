-- Add has_temperature_options column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_temperature_options boolean DEFAULT false;