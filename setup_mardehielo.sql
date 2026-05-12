-- ============================================================
--  SETUP COMPLETO — Purificadora Mar de Hielo
--  Ejecutar en: Supabase → SQL Editor → New Query → Run
--  Es seguro re-ejecutar: usa CREATE IF NOT EXISTS / OR REPLACE
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. TABLAS
-- ══════════════════════════════════════════════════════════════

-- Productos
CREATE TABLE IF NOT EXISTS public.products (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name      TEXT NOT NULL,
  code      TEXT DEFAULT '',
  unit      TEXT DEFAULT 'Pieza',
  stock     NUMERIC DEFAULT 0,
  pricea    NUMERIC DEFAULT 0,
  priceb    NUMERIC DEFAULT 0,
  pricec    NUMERIC DEFAULT 0,
  price     NUMERIC DEFAULT 0,
  orden     INTEGER DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuarios / Repartidores
CREATE TABLE IF NOT EXISTS public.users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  vehicle     TEXT DEFAULT '',
  pin         TEXT DEFAULT '',
  pricelist   TEXT DEFAULT 'A',
  role        TEXT DEFAULT 'repartidor',
  lugar1      TEXT DEFAULT '',
  lugar2      TEXT DEFAULT '',
  lugar1activo BOOLEAN DEFAULT false,
  lugar2activo BOOLEAN DEFAULT false
);

-- Clientes / Tiendas
CREATE TABLE IF NOT EXISTS public.clients (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  phone     TEXT DEFAULT '',
  address   TEXT DEFAULT '',
  ownername TEXT DEFAULT '',
  note      TEXT DEFAULT '',
  userid    TEXT DEFAULT ''
);

-- Ventas
CREATE TABLE IF NOT EXISTS public.sales (
  id            TEXT PRIMARY KEY,
  userid        TEXT,
  clientid      TEXT,
  items         JSONB,
  total         NUMERIC DEFAULT 0,
  paymentmethod TEXT DEFAULT 'efectivo',
  date          TEXT DEFAULT ''
);

-- Inventario (entradas/salidas de almacén)
CREATE TABLE IF NOT EXISTS public.inventory (
  id        TEXT PRIMARY KEY,
  productid TEXT,
  type      TEXT,       -- 'IN' o 'OUT'
  quantity  NUMERIC DEFAULT 0,
  reason    TEXT DEFAULT '',
  date      TEXT DEFAULT ''
);

-- Gastos operativos
CREATE TABLE IF NOT EXISTS public.expenses (
  id          TEXT PRIMARY KEY,
  userid      TEXT,
  description TEXT DEFAULT '',
  amount      NUMERIC DEFAULT 0,
  date        TEXT DEFAULT ''
);

-- Entregas del día (producción de agua/hielo)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id                TEXT PRIMARY KEY,
  userid            TEXT,
  clientid          TEXT DEFAULT '',
  clientname        TEXT DEFAULT '',
  date              TEXT DEFAULT '',
  litrospurificados TEXT DEFAULT '',
  ventagalones      TEXT DEFAULT '',
  bolsashielo       TEXT DEFAULT ''
);

-- Configuración del Ticket
CREATE TABLE IF NOT EXISTS public.ticket_config (
  id                 TEXT PRIMARY KEY DEFAULT 'main',
  header             TEXT DEFAULT 'PURIFICADORA MAR DE HIELO',
  footer             TEXT DEFAULT '¡Gracias por su compra!',
  doublecopy         BOOLEAN DEFAULT false,
  centertotal        BOOLEAN DEFAULT false,
  spacebetweenItems  BOOLEAN DEFAULT false,
  showcashandchange  BOOLEAN DEFAULT true
);

-- Insertar config de ticket si no existe
INSERT INTO public.ticket_config (id, header, footer)
VALUES ('main', 'PURIFICADORA MAR DE HIELO', '¡Gracias por su compra!')
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 2. FUNCIONES DE SEGURIDAD
-- ══════════════════════════════════════════════════════════════

-- ¿Es admin el usuario actual?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'administrador@mardehielo.local';
$$;

-- ID del usuario en la tabla users según el auth token
CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id::text FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;


-- ══════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_config ENABLE ROW LEVEL SECURITY;

-- PRODUCTS
DROP POLICY IF EXISTS "products_read"   ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_read"   ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (is_admin());

-- USERS
DROP POLICY IF EXISTS "users_read"   ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_read"   ON public.users FOR SELECT  TO authenticated USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY "users_insert" ON public.users FOR INSERT  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "users_update" ON public.users FOR UPDATE  TO authenticated USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY "users_delete" ON public.users FOR DELETE  TO authenticated USING (is_admin());

-- CLIENTS
DROP POLICY IF EXISTS "clients_read"   ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
CREATE POLICY "clients_read"   ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (is_admin());

-- SALES
DROP POLICY IF EXISTS "sales_read"   ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_read"   ON public.sales FOR SELECT TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated USING (userid = my_user_id() OR is_admin());

-- INVENTORY
DROP POLICY IF EXISTS "inventory_read"   ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete" ON public.inventory;
CREATE POLICY "inventory_read"   ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_insert" ON public.inventory FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "inventory_delete" ON public.inventory FOR DELETE TO authenticated USING (is_admin());

-- EXPENSES
DROP POLICY IF EXISTS "expenses_read"   ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_read"   ON public.expenses FOR SELECT TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (userid = my_user_id() OR is_admin());
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (userid = my_user_id() OR is_admin());

-- DELIVERIES
DROP POLICY IF EXISTS "deliveries_read"   ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_delete" ON public.deliveries;
CREATE POLICY "deliveries_read"   ON public.deliveries FOR SELECT TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "deliveries_insert" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (userid = my_user_id() OR is_admin());
CREATE POLICY "deliveries_update" ON public.deliveries FOR UPDATE TO authenticated USING (userid = my_user_id() OR is_admin());
CREATE POLICY "deliveries_delete" ON public.deliveries FOR DELETE TO authenticated USING (userid = my_user_id() OR is_admin());

-- TICKET_CONFIG
DROP POLICY IF EXISTS "ticket_config_read"   ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_insert" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_update" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_delete" ON public.ticket_config;
CREATE POLICY "ticket_config_read"   ON public.ticket_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_config_insert" ON public.ticket_config FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "ticket_config_update" ON public.ticket_config FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "ticket_config_delete" ON public.ticket_config FOR DELETE TO authenticated USING (is_admin());


-- ══════════════════════════════════════════════════════════════
-- 4. VERIFICACIÓN FINAL
-- ══════════════════════════════════════════════════════════════
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
