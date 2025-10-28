-- Supprimer l'ancien déclencheur
DROP TRIGGER IF EXISTS trigger_auto_create_coffee_options ON products;

-- Recréer la fonction pour qu'elle fonctionne avec AFTER INSERT
CREATE OR REPLACE FUNCTION auto_create_coffee_options()
RETURNS TRIGGER AS $$
DECLARE
  cat_name TEXT;
  is_coffee_category BOOLEAN;
BEGIN
  -- Récupérer le nom de la catégorie
  SELECT LOWER(name_en) INTO cat_name
  FROM categories
  WHERE id = NEW.category_id;
  
  -- Vérifier si c'est une catégorie Coffee
  is_coffee_category := cat_name LIKE '%coffee%';
  
  -- Si c'est une catégorie Coffee, créer les options
  IF is_coffee_category THEN
    -- Créer les options de taille et de lait
    INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
    VALUES 
      (NEW.id, 'size', 'Small', 'Small', 'Маленький', 'პატარა', 0.00, 1, true),
      (NEW.id, 'size', 'Medium', 'Medium', 'Средний', 'საშუალო', 0.50, 2, true),
      (NEW.id, 'size', 'Large', 'Large', 'Большой', 'დიდი', 1.00, 3, true),
      (NEW.id, 'milk', 'Lait de vache', 'Cow Milk', 'Коровье молоко', 'ძროხის რძე', 0.00, 1, true),
      (NEW.id, 'milk', 'Lait de soja', 'Soy Milk', 'Соевое молоко', 'სოიოს რძე', 0.50, 2, true),
      (NEW.id, 'milk', 'Lait d''amande', 'Almond Milk', 'Миндальное молоко', 'ნუშის რძე', 0.50, 3, true),
      (NEW.id, 'milk', 'Lait d''avoine', 'Oat Milk', 'Овсяное молоко', 'შვრიის რძე', 0.50, 4, true)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le déclencheur AFTER INSERT (pas BEFORE)
CREATE TRIGGER trigger_auto_create_coffee_options
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_coffee_options();