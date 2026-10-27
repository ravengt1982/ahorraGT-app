-- =============================================
-- Habilita Row Level Security en las tablas
-- =============================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Políticas de SELECT para usuarios anónimos
-- =============================================
DROP POLICY IF EXISTS "anon_select_stores" ON public.stores;
CREATE POLICY "anon_select_stores" ON public.stores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select_products" ON public.products;
CREATE POLICY "anon_select_products" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select_prices" ON public.prices;
CREATE POLICY "anon_select_prices" ON public.prices
  FOR SELECT USING (true);

-- =============================================
-- Políticas para usuarios autenticados
-- =============================================
DROP POLICY IF EXISTS "auth_select_stores" ON public.stores;
CREATE POLICY "auth_select_stores" ON public.stores
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_select_products" ON public.products;
CREATE POLICY "auth_select_products" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_select_prices" ON public.prices;
CREATE POLICY "auth_select_prices" ON public.prices
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- Conceder SELECT al rol anon
-- =============================================
GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.prices TO anon;
