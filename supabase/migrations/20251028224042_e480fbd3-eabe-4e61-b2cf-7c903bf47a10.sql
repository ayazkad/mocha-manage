-- Ajouter un champ pour compter les tickets avec réduction personnel
ALTER TABLE employee_daily_benefits
ADD COLUMN IF NOT EXISTS discount_tickets_count integer DEFAULT 0;