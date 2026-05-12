-- Ejecuta este script en el SQL Editor de Supabase para añadir soporte de Clientes a las Entregas

ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS clientid TEXT DEFAULT '';
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS clientname TEXT DEFAULT '';
