-- ============================================================
-- RLS SETUP — Ventas App
-- Ejecutar completo en: Supabase → SQL Editor → Run
-- Es seguro re-ejecutar: usa DROP IF EXISTS antes de crear
-- ============================================================

-- ── 1. Columna auth_id en users ─────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Función: ¿es admin el usuario actual? ────────────────
--    Solo verifica el email del token Auth (no necesita columna role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'admin@lacteoslatoba.local';
$$;

-- ── 3. Función: id de la tabla users del usuario actual ─────
CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id::text FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ── 4. Activar RLS ───────────────────────────────────────────
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_config ENABLE ROW LEVEL SECURITY;

-- ── 5. PRODUCTS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "products_read"   ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_read"   ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (is_admin());

-- ── 6. USERS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read"   ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

CREATE POLICY "users_read"   ON public.users FOR SELECT  TO authenticated USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY "users_insert" ON public.users FOR INSERT  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "users_update" ON public.users FOR UPDATE  TO authenticated USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY "users_delete" ON public.users FOR DELETE  TO authenticated USING (is_admin());

-- ── 7. CLIENTS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_read"   ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_read"   ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (is_admin());

-- ── 8. SALES ─────────────────────────────────────────────────
--    Columna en Supabase se llama "userid" (minúsculas)
DROP POLICY IF EXISTS "sales_read"   ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;

CREATE POLICY "sales_read"   ON public.sales FOR SELECT TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated USING (userid = my_user_id() OR is_admin());

-- ── 9. INVENTORY ─────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_read"   ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete" ON public.inventory;

CREATE POLICY "inventory_read"   ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_insert" ON public.inventory FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "inventory_delete" ON public.inventory FOR DELETE TO authenticated USING (is_admin());

-- ── 10. EXPENSES ─────────────────────────────────────────────
--     Columna en Supabase se llama "userid" (minúsculas)
DROP POLICY IF EXISTS "expenses_read"   ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_read"   ON public.expenses FOR SELECT TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (userid = my_user_id() OR is_admin());
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (userid = my_user_id() OR is_admin());

-- ── 11. TICKET_CONFIG ────────────────────────────────────────
DROP POLICY IF EXISTS "ticket_config_read"   ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_insert" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_update" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_delete" ON public.ticket_config;

CREATE POLICY "ticket_config_read"   ON public.ticket_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_config_insert" ON public.ticket_config FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "ticket_config_update" ON public.ticket_config FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "ticket_config_delete" ON public.ticket_config FOR DELETE TO authenticated USING (is_admin());

-- ── 12. VERIFICACIÓN ─────────────────────────────────────────
--    Después de ejecutar, corre esto para confirmar que todo quedó bien:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
