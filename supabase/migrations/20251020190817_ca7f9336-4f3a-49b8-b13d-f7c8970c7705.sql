-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for employee roles
CREATE TYPE employee_role AS ENUM ('employee', 'admin');

-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create enum for payment method
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'other');

-- Create employees table (not using auth.users for simple PIN authentication)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code VARCHAR(4) UNIQUE NOT NULL CHECK (employee_code ~ '^[0-9]{4}$'),
  pin_code VARCHAR(4) NOT NULL CHECK (pin_code ~ '^[0-9]{4}$'),
  name VARCHAR(100) NOT NULL,
  role employee_role DEFAULT 'employee' NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_fr VARCHAR(100) NOT NULL,
  name_ru VARCHAR(100),
  name_ge VARCHAR(100),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_ru VARCHAR(100),
  name_ge VARCHAR(100),
  description_fr TEXT,
  description_ru TEXT,
  description_ge TEXT,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  has_size_options BOOLEAN DEFAULT false,
  has_milk_options BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product options table (for sizes, milk types, etc.)
CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  option_type VARCHAR(50) NOT NULL, -- 'size', 'milk', 'extra'
  name_fr VARCHAR(100) NOT NULL,
  name_ru VARCHAR(100),
  name_ge VARCHAR(100),
  price_modifier DECIMAL(10,2) DEFAULT 0 CHECK (price_modifier >= -999.99),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sessions table (for tracking employee work sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  tip_amount DECIMAL(10,2) DEFAULT 0 CHECK (tip_amount >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  payment_method payment_method,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  selected_options JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_employee ON orders(employee_id);
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_sessions_employee ON sessions(employee_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Public access for POS - will be secured by session management in app)
-- Since we're not using Supabase auth but PIN codes, we'll use permissive policies
CREATE POLICY "Allow all operations on employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on product_options" ON product_options FOR ALL USING (true);
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_items" ON order_items FOR ALL USING (true);

-- Insert default admin employee
INSERT INTO employees (employee_code, pin_code, name, role) 
VALUES ('0000', '0000', 'Administrateur', 'admin');

-- Insert default categories
INSERT INTO categories (name_fr, name_ru, name_ge, icon, sort_order) VALUES
('Cafés', 'Кофе', 'ყავა', 'Coffee', 1),
('Thés', 'Чай', 'ჩაი', 'TeaCup', 2),
('Pâtisseries', 'Выпечка', 'ნამცხვარი', 'Cake', 3),
('Snacks', 'Закуски', 'სნეკები', 'Sandwich', 4);

-- Insert sample products
INSERT INTO products (category_id, name_fr, name_ru, name_ge, base_price, has_size_options, has_milk_options, sort_order) 
SELECT 
  c.id,
  'Espresso',
  'Эспрессо',
  'ესპრესო',
  2.50,
  true,
  false,
  1
FROM categories c WHERE c.name_fr = 'Cafés';

INSERT INTO products (category_id, name_fr, name_ru, name_ge, base_price, has_size_options, has_milk_options, sort_order) 
SELECT 
  c.id,
  'Cappuccino',
  'Капучино',
  'კაპუჩინო',
  3.50,
  true,
  true,
  2
FROM categories c WHERE c.name_fr = 'Cafés';

INSERT INTO products (category_id, name_fr, name_ru, name_ge, base_price, has_size_options, has_milk_options, sort_order) 
SELECT 
  c.id,
  'Latte',
  'Латте',
  'ლატე',
  4.00,
  true,
  true,
  3
FROM categories c WHERE c.name_fr = 'Cafés';

-- Insert size options for coffee products
INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'size',
  'Petit',
  'Маленький',
  'პატარა',
  0.00,
  1
FROM products p WHERE p.has_size_options = true;

INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'size',
  'Moyen',
  'Средний',
  'საშუალო',
  0.50,
  2
FROM products p WHERE p.has_size_options = true;

INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'size',
  'Grand',
  'Большой',
  'დიდი',
  1.00,
  3
FROM products p WHERE p.has_size_options = true;

-- Insert milk options for coffee products
INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'milk',
  'Lait entier',
  'Цельное молоко',
  'სრული რძე',
  0.00,
  1
FROM products p WHERE p.has_milk_options = true;

INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'milk',
  'Lait écrémé',
  'Обезжиренное молоко',
  'უცხიმო რძე',
  0.00,
  2
FROM products p WHERE p.has_milk_options = true;

INSERT INTO product_options (product_id, option_type, name_fr, name_ru, name_ge, price_modifier, sort_order)
SELECT 
  p.id,
  'milk',
  'Lait végétal',
  'Растительное молоко',
  'მცენარეული რძე',
  0.50,
  3
FROM products p WHERE p.has_milk_options = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    today_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO today_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((today_count + 1)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_order_number BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION set_order_number();