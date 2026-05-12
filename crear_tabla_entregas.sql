-- SQL para crear la tabla de entregas diarias (deliveries)

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

-- Configurar RLS (Row Level Security)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir a todos los usuarios leer todas las entregas
CREATE POLICY "Permitir lectura de deliveries a todos" 
ON public.deliveries FOR SELECT 
USING (true);

-- Permitir insertar/actualizar a todos (por ahora, ya que el admin y usuarios pueden registrar)
CREATE POLICY "Permitir insertar deliveries a todos" 
ON public.deliveries FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir actualizar deliveries a todos" 
ON public.deliveries FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir eliminar deliveries a todos" 
ON public.deliveries FOR DELETE 
USING (true);
