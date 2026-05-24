-- ============================================
-- YeEthioMenu â€” Supabase Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CITIES TABLE
CREATE TABLE cities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESTAURANTS TABLE
CREATE TABLE restaurants (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city_id BIGINT REFERENCES cities(id),
  phone TEXT,
  address TEXT,
  is_open BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU ITEMS TABLE
CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category TEXT DEFAULT 'General',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Cities: everyone can read, only admins write
CREATE POLICY "Anyone can read cities"
  ON cities FOR SELECT USING (true);

-- Restaurants: anyone can read
CREATE POLICY "Anyone can read restaurants"
  ON restaurants FOR SELECT USING (true);

-- Restaurant owners can insert their own restaurant
CREATE POLICY "Owners can insert restaurants"
  ON restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own restaurant
CREATE POLICY "Owners can update their restaurant"
  ON restaurants FOR UPDATE USING (auth.uid() = owner_id);

-- Menu items: anyone can read
CREATE POLICY "Anyone can read menu items"
  ON menu_items FOR SELECT USING (true);

-- Owners can manage items for their restaurant
CREATE POLICY "Owners manage menu items"
  ON menu_items FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Orders: anyone can create (no auth needed for customers)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Owners can read their own restaurant's orders
CREATE POLICY "Owners can read their orders"
  ON orders FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Owners can update their own restaurant's orders
CREATE POLICY "Owners can update their orders"
  ON orders FOR UPDATE USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- SAMPLE DATA (ETHIOPIAN CITIES)
-- ============================================
INSERT INTO cities (name, slug) VALUES
  ('Addis Ababa', 'addis-ababa'),
  ('Bahir Dar', 'bahir-dar'),
  ('Hawassa', 'hawassa'),
  ('Dire Dawa', 'dire-dawa'),
  ('Mekelle', 'mekelle'),
  ('Gondar', 'gondar'),
  ('Adama', 'adama'),
  ('Jimma', 'jimma'),
  ('Jijiga', 'jijiga'),
  ('Debre Markos', 'debre-markos');

-- ============================================
-- HOW TO CONNECT YOUR SITE TO SUPABASE
-- ============================================
-- 1. Go to https://supabase.com â†’ Start a new project (FREE)
-- 2. Copy your Project URL and anon/public key from Settings â†’ API
-- 3. Edit config.js:
--      const SUPABASE_URL = 'https://your-project.supabase.co';
--      const SUPABASE_ANON_KEY = 'your-anon-key';
-- 4. Run ALL SQL above in Supabase SQL Editor
-- 5. Your site is ready!
