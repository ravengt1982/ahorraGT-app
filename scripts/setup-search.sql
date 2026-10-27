-- =============================================
-- Full-Text Search setup + RPC functions
-- =============================================

-- 1. Add tsvector column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Trigger function to auto-update search_vector
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_products_search ON products;
CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_update();

-- 4. GIN index for fast FTS lookups
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);

-- 5. Backfill existing data (run once)
UPDATE products SET search_vector = to_tsvector('spanish', COALESCE(name, ''));

-- =============================================
-- RPC: search_products (deduplicated by name)
-- =============================================
DROP FUNCTION IF EXISTS search_products(TEXT, BIGINT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_products(TEXT, BIGINT, BIGINT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT '',
  cat_id BIGINT DEFAULT NULL,
  p_store_id BIGINT DEFAULT NULL,
  sort_col TEXT DEFAULT 'relevance',
  sort_dir TEXT DEFAULT 'desc',
  page_size INT DEFAULT 20,
  page_offset INT DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result_json JSON;
  total_count BIGINT;
  tsq tsquery;
  use_fts BOOLEAN;
BEGIN
  IF search_term != '' THEN
    tsq := plainto_tsquery('spanish', search_term);
    use_fts := tsq != '';
  ELSE
    use_fts := false;
  END IF;

  SELECT COUNT(DISTINCT p.name) INTO total_count
  FROM products p
  WHERE (search_term = ''
    OR (use_fts AND p.search_vector @@ tsq)
    OR p.name ILIKE '%' || search_term || '%')
    AND (cat_id IS NULL OR p.category_id = cat_id)
    AND EXISTS (
      SELECT 1 FROM prices pr
      WHERE pr.product_id = p.id
      AND pr.price > 0
      AND (p_store_id IS NULL OR pr.store_id = p_store_id)
    );

  WITH matched AS (
    SELECT id, name, category_id, search_vector
    FROM products p
    WHERE (search_term = ''
      OR (use_fts AND p.search_vector @@ tsq)
      OR p.name ILIKE '%' || search_term || '%')
      AND (cat_id IS NULL OR p.category_id = cat_id)
      AND EXISTS (
        SELECT 1 FROM prices pr
        WHERE pr.product_id = p.id
        AND pr.price > 0
        AND (p_store_id IS NULL OR pr.store_id = p_store_id)
      )
  ),
  grouped AS (
    SELECT
      MIN(m.id) AS id,
      m.name,
      MIN(m.category_id) AS category_id,
      MIN(CASE WHEN pr.price > 0 THEN pr.price END) AS min_price,
      COUNT(DISTINCT CASE WHEN pr.price > 0 THEN pr.store_id END) AS store_count,
      (SELECT s.name FROM prices pr2
       JOIN stores s ON s.id = pr2.store_id
       WHERE pr2.product_id IN (SELECT m2.id FROM matched m2 WHERE m2.name = m.name)
       AND pr2.price > 0
       AND (p_store_id IS NULL OR pr2.store_id = p_store_id)
       ORDER BY pr2.price ASC LIMIT 1
      ) AS cheapest_store,
      COALESCE(
        (SELECT ts_rank(m3.search_vector, tsq) FROM matched m3
         WHERE m3.name = m.name AND use_fts LIMIT 1),
        0
      ) AS rank
    FROM matched m
    LEFT JOIN prices pr ON pr.product_id = m.id AND pr.price > 0
      AND (p_store_id IS NULL OR pr.store_id = p_store_id)
    GROUP BY m.name
    HAVING MIN(CASE WHEN pr.price > 0 THEN pr.price END) IS NOT NULL
  ),
  sorted AS (
    SELECT id, name, category_id, min_price, store_count, cheapest_store
    FROM grouped
    ORDER BY
      CASE WHEN sort_col = 'relevance' THEN rank END DESC NULLS LAST,
      CASE WHEN sort_col = 'name' THEN name END ASC NULLS LAST,
      CASE WHEN sort_col = 'price' AND sort_dir = 'asc' THEN min_price END ASC NULLS LAST,
      CASE WHEN sort_col = 'price' AND sort_dir = 'desc' THEN min_price END DESC NULLS LAST,
      CASE WHEN sort_col = 'stores' THEN store_count END DESC NULLS LAST,
      name ASC
    LIMIT page_size
    OFFSET page_offset
  )
  SELECT json_build_object(
    'products', COALESCE(json_agg(json_build_object(
      'id', s.id,
      'name', s.name,
      'category_id', s.category_id,
      'min_price', s.min_price,
      'store_count', s.store_count,
      'cheapest_store', s.cheapest_store
    )), '[]'::json),
    'total', total_count
  ) INTO result_json
  FROM sorted s;

  IF result_json IS NULL THEN
    result_json := json_build_object('products', '[]'::json, 'total', 0);
  END IF;

  RETURN result_json;
END;
$$;

-- =============================================
-- RPC: suggest_products (autocomplete, deduplicated)
-- =============================================
CREATE OR REPLACE FUNCTION suggest_products(prefix TEXT)
RETURNS TABLE(id BIGINT, name TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(id) AS id, name FROM products
  WHERE name ILIKE prefix || '%'
  GROUP BY name
  ORDER BY name
  LIMIT 5;
$$;

-- Grant access to anon role
GRANT EXECUTE ON FUNCTION search_products TO anon;
GRANT EXECUTE ON FUNCTION suggest_products TO anon;
