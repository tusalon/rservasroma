-- Agrega Euro (EUR) y Peso mexicano (MXN) como monedas válidas,
-- para negocios en Europa o México. Ejecutar una vez en Supabase SQL Editor.

-- servicios.precio_moneda: reemplazar el CHECK que solo permitía CUP/USD.
ALTER TABLE public.servicios
DROP CONSTRAINT IF EXISTS servicios_precio_moneda_check;

ALTER TABLE public.servicios
ADD CONSTRAINT servicios_precio_moneda_check
CHECK (precio_moneda IN ('CUP', 'USD', 'EUR', 'MXN'));

-- negocios.whatsapp_moneda no tiene CHECK constraint (solo default + limpieza de datos
-- en sql-whatsapp-preferencias.sql). Se actualiza el comentario para reflejar los
-- nuevos valores esperados; la validación real vive en el código de la app.
COMMENT ON COLUMN public.negocios.whatsapp_moneda IS
    'Moneda mostrada en los mensajes generados por WhatsApp. Valores esperados: CUP, USD, EUR o MXN.';
