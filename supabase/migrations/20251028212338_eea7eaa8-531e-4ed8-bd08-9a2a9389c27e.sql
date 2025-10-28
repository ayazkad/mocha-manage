-- Ajouter une colonne pour stocker les produits applicables à une offre
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS applicable_products UUID[] DEFAULT ARRAY[]::UUID[];