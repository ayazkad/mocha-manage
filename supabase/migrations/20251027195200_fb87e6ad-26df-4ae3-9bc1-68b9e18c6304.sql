-- Add English language columns to categories
ALTER TABLE categories 
ADD COLUMN name_en VARCHAR;

-- Add English language columns to products
ALTER TABLE products 
ADD COLUMN name_en VARCHAR,
ADD COLUMN description_en TEXT;

-- Add English language columns to product_options
ALTER TABLE product_options 
ADD COLUMN name_en VARCHAR;

-- Copy French data to English columns as default
UPDATE categories SET name_en = name_fr;
UPDATE products SET name_en = name_fr, description_en = description_fr;
UPDATE product_options SET name_en = name_fr;