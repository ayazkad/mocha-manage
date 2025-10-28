
-- Supprimer tous les doublons d'options en gardant seulement le premier de chaque
DELETE FROM product_options a
USING product_options b
WHERE a.id > b.id
  AND a.product_id = b.product_id
  AND a.option_type = b.option_type
  AND a.name_en = b.name_en
  AND a.price_modifier = b.price_modifier;

-- Ajouter une contrainte unique pour éviter les doublons à l'avenir
-- Cette contrainte empêche d'avoir deux options avec le même type, nom et modificateur de prix pour un même produit
ALTER TABLE product_options 
ADD CONSTRAINT unique_product_option 
UNIQUE (product_id, option_type, name_en, price_modifier);
