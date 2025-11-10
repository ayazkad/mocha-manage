-- Add barcode and visibility columns to products table
ALTER TABLE products 
ADD COLUMN barcode VARCHAR(255) UNIQUE,
ADD COLUMN visible_in_categories BOOLEAN DEFAULT true;

-- Create index on barcode for faster lookups
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN products.barcode IS 'Unique barcode for scanning products';
COMMENT ON COLUMN products.visible_in_categories IS 'Whether product should appear in POS category grids. False = only scannable by barcode';