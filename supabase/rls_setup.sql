-- ============================================================
-- LORCAM — Row Level Security (RLS) setup
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================

-- CATEGORIES: solo lectura para usuarios anónimos
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_anon" ON categories;
CREATE POLICY "categories_read_anon"
  ON categories
  FOR SELECT
  TO anon
  USING (true);

-- PRODUCTS: solo lectura de productos activos para usuarios anónimos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_active_anon" ON products;
CREATE POLICY "products_read_active_anon"
  ON products
  FOR SELECT
  TO anon
  USING (active = true);

-- Sin políticas de INSERT / UPDATE / DELETE → escritura bloqueada para anon
-- ============================================================
