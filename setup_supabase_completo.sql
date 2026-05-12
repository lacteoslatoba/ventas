-- ============================================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN SUPABASE - MAR DE HIELO
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. CREACIÓN DE TABLAS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT,
    role TEXT DEFAULT 'repartidor',
    pricelist TEXT DEFAULT 'A',
    auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    userid TEXT
);

CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pricea NUMERIC DEFAULT 0,
    priceb NUMERIC DEFAULT 0,
    pricec NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'u'
);

CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ,
    userid TEXT,
    clientid TEXT,
    items JSONB,
    total NUMERIC,
    paymentmethod TEXT,
    discount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ,
    userid TEXT,
    productid TEXT,
    quantity NUMERIC,
    type TEXT
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ,
    userid TEXT,
    amount NUMERIC,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.ticket_config (
    id TEXT PRIMARY KEY,
    header TEXT,
    footer TEXT,
    doublecopy BOOLEAN DEFAULT false,
    centertotal BOOLEAN DEFAULT false,
    spacebetweenitems BOOLEAN DEFAULT false,
    showcashandchange BOOLEAN DEFAULT true
);

-- NUEVA TABLA PARA ENTREGAS DIARIAS
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    userid TEXT NOT NULL,
    username TEXT,
    litrospurificados NUMERIC DEFAULT 0,
    ventagalones NUMERIC DEFAULT 0,
    bolsashielo NUMERIC DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. FUNCIONES RLS ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'admin@lacteoslatoba.local';
$$;

CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id::text FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ── 3. ACTIVAR RLS ──────────────────────────────────────────

ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries    ENABLE ROW LEVEL SECURITY;

-- ── 4. POLÍTICAS (POLICIES) ─────────────────────────────────

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

-- TICKET_CONFIG
DROP POLICY IF EXISTS "ticket_config_read"   ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_insert" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_update" ON public.ticket_config;
DROP POLICY IF EXISTS "ticket_config_delete" ON public.ticket_config;

CREATE POLICY "ticket_config_read"   ON public.ticket_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_config_insert" ON public.ticket_config FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "ticket_config_update" ON public.ticket_config FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "ticket_config_delete" ON public.ticket_config FOR DELETE TO authenticated USING (is_admin());

-- DELIVERIES
DROP POLICY IF EXISTS "deliveries_read"   ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_insert" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_update" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_delete" ON public.deliveries;

CREATE POLICY "deliveries_read"   ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "deliveries_insert" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deliveries_update" ON public.deliveries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "deliveries_delete" ON public.deliveries FOR DELETE TO authenticated USING (true);

-- ── 5. REGISTRO INICIAL TICKET_CONFIG ───────────────────────
INSERT INTO public.ticket_config (id, header, footer)
VALUES ('main', 'LA TOBA', '¡Gracias por su compra!')
ON CONFLICT (id) DO NOTHING;
