-- =====================================================
-- Script: Agregar campos de zonas a tabla usuarios
-- Ejecutar en: Supabase Studio → SQL Editor
-- =====================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lugar1      TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS lugar2      TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS lugar1activo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lugar2activo BOOLEAN DEFAULT false;

-- Verificar que se agregaron correctamente:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('lugar1', 'lugar2', 'lugar1activo', 'lugar2activo');
