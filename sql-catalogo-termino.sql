-- Como llama cada negocio a lo que publica en su catalogo.
--
-- "Diseno" solo encaja en manicura. Un spa ensena tratamientos, un estudio de
-- pestanas estilos, una barberia cortes. No se puede adivinar: 337 de los 381
-- negocios tienen especialidad = 'Unas' por defecto (incluidos un spa y un
-- estudio de pestanas), asi que lo elige la duena en su panel.
--
-- Ejecutar una sola vez en Supabase SQL Editor.

ALTER TABLE public.negocios
ADD COLUMN IF NOT EXISTS catalogo_termino text DEFAULT 'diseno';

-- 'diseno' por defecto: es lo correcto para la gran mayoria (manicura) y deja
-- las apps ya publicadas exactamente como estaban.
UPDATE public.negocios
SET catalogo_termino = 'diseno'
WHERE catalogo_termino IS NULL;

COMMENT ON COLUMN public.negocios.catalogo_termino IS
'Palabra del catalogo en la app de la clienta: diseno, trabajo, tratamiento, estilo o servicio. Sin valor se usa diseno.';
