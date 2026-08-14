-- ============================================================
-- Agrega forma de pago por cliente — Ventas App
-- Ejecutar en: Supabase → SQL Editor → Run
-- Seguro de re-ejecutar (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS paymentmethod text DEFAULT 'efectivo';

-- Clientes ya existentes quedan en 'efectivo' por defecto (mismo comportamiento
-- que tenían antes de este cambio, cuando la forma de pago se elegía manual
-- en cada venta).
