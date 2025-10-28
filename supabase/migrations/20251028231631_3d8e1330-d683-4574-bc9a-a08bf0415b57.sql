-- Mettre à jour tous les produits des catégories Coffee et Non Coffee pour avoir les options de taille et de lait
UPDATE products
SET 
  has_size_options = true,
  has_milk_options = true
WHERE category_id IN (
  SELECT id 
  FROM categories 
  WHERE LOWER(name_en) LIKE '%coffee%'
);