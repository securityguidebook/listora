-- ============================================================
-- Carter — Initial Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Shopping list items
CREATE TABLE IF NOT EXISTS shopping_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  quantity    TEXT,
  category    TEXT NOT NULL DEFAULT 'Other',
  notes       TEXT,
  checked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Wishlist items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  url         TEXT,
  price       DECIMAL(10, 2),
  notes       TEXT,
  purchased   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reusable templates (post-it cards)
CREATE TABLE IF NOT EXISTS templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#7c3aed',
  emoji       TEXT NOT NULL DEFAULT '📋',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Items within a template
CREATE TABLE IF NOT EXISTS template_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  quantity    TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Purchase history — written when: shopping item checked off OR wishlist item marked purchased
CREATE TABLE IF NOT EXISTS purchase_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name     TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Other',
  quantity      TEXT,
  price         DECIMAL(10, 2),
  source        TEXT NOT NULL DEFAULT 'shopping' CHECK (source IN ('shopping', 'wishlist')),
  purchased_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shopping_items_user  ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user  ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user        ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_items_tmpl  ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_date ON purchase_history(purchased_at DESC);

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE shopping_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Shopping items: user owns their own rows
CREATE POLICY "Users manage own shopping items"
  ON shopping_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Wishlist items
CREATE POLICY "Users manage own wishlist items"
  ON wishlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Templates
CREATE POLICY "Users manage own templates"
  ON templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Template items: accessible if the user owns the parent template
CREATE POLICY "Users manage own template items"
  ON template_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
        AND templates.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
        AND templates.user_id = auth.uid()
    )
  );

-- Purchase history
CREATE POLICY "Users manage own purchase history"
  ON purchase_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
