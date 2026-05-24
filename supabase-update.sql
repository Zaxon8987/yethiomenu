-- ============================================
-- YeEthioMenu â€” NEW TABLES for advanced features
-- Run this AFTER the main supabase-setup.sql
-- ============================================

-- 1. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMER PROFILES
CREATE TABLE IF NOT EXISTS customer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id),
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, restaurant_id)
);

-- 4. ADD PHOTO COLUMNS
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 5. ORDER TRACKING CODE
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Reviews: anyone can read
CREATE POLICY "Anyone can read reviews" ON reviews FOR SELECT USING (true);

-- Anyone can insert reviews (with auth)
CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Reviews: owners can delete
CREATE POLICY "Owners can delete reviews"
  ON reviews FOR DELETE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

-- Customer profiles
CREATE POLICY "Users can read own profile"
  ON customer_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON customer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON customer_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Favorites
CREATE POLICY "Users can read own favorites"
  ON favorites FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL USING (auth.uid() = customer_id);
