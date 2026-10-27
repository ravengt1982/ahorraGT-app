-- =============================================
-- Shopping Lists tables and RLS policies
-- =============================================

CREATE TABLE IF NOT EXISTS shopping_lists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mi lista',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own lists
DO $$ BEGIN
  CREATE POLICY "Users can view own lists"
    ON shopping_lists FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own lists"
    ON shopping_lists FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own lists"
    ON shopping_lists FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own lists"
    ON shopping_lists FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Items inherit access via their list
DO $$ BEGIN
  CREATE POLICY "Users can view own list items"
    ON shopping_list_items FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM shopping_lists WHERE id = list_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert items in own lists"
    ON shopping_list_items FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM shopping_lists WHERE id = list_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update items in own lists"
    ON shopping_list_items FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM shopping_lists WHERE id = list_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete items from own lists"
    ON shopping_list_items FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM shopping_lists WHERE id = list_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant anon access
GRANT ALL ON shopping_lists TO anon;
GRANT ALL ON shopping_list_items TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
