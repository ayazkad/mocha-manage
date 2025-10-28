-- Insert default size options for all products that have has_size_options = true
-- First, get products with size options and insert default sizes
INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'size',
  'Petit',
  'Small',
  'Маленький',
  'პატარა',
  0,
  1,
  true
FROM products p
WHERE p.has_size_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'size' 
    AND po.name_fr = 'Petit'
  );

INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'size',
  'Moyen',
  'Medium',
  'Средний',
  'საშუალო',
  0.5,
  2,
  true
FROM products p
WHERE p.has_size_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'size' 
    AND po.name_fr = 'Moyen'
  );

INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'size',
  'Grand',
  'Large',
  'Большой',
  'დიდი',
  1,
  3,
  true
FROM products p
WHERE p.has_size_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'size' 
    AND po.name_fr = 'Grand'
  );

-- Insert specific milk options for all products that have has_milk_options = true
INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'milk',
  'Lait de vache',
  'Cow Milk',
  'Коровье молоко',
  'ძროხის რძე',
  0,
  1,
  true
FROM products p
WHERE p.has_milk_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'milk' 
    AND po.name_fr = 'Lait de vache'
  );

INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'milk',
  'Lait d''avoine',
  'Oat Milk',
  'Овсяное молоко',
  'შვრიის რძე',
  0.5,
  2,
  true
FROM products p
WHERE p.has_milk_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'milk' 
    AND po.name_fr = 'Lait d''avoine'
  );

INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'milk',
  'Lait de noisette',
  'Hazelnut Milk',
  'Молоко из фундука',
  'თხილის რძე',
  0.5,
  3,
  true
FROM products p
WHERE p.has_milk_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'milk' 
    AND po.name_fr = 'Lait de noisette'
  );

INSERT INTO product_options (product_id, option_type, name_fr, name_en, name_ru, name_ge, price_modifier, sort_order, active)
SELECT 
  p.id,
  'milk',
  'Lait de soja',
  'Soy Milk',
  'Соевое молоко',
  'სოიოს რძე',
  0.5,
  4,
  true
FROM products p
WHERE p.has_milk_options = true
  AND NOT EXISTS (
    SELECT 1 FROM product_options po 
    WHERE po.product_id = p.id 
    AND po.option_type = 'milk' 
    AND po.name_fr = 'Lait de soja'
  );