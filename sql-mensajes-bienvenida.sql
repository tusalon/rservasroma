-- Mensajes de la dueña para sus clientas: confirmación de la cita y bienvenida de primera vez.
-- Ejecutar una vez en el SQL Editor de Supabase. Se puede correr dos veces sin romper nada.
-- Deshacer: sql-mensajes-bienvenida-DESHACER.sql
--
-- QUE HACE
--   * negocios.mensaje_confirmacion_activo: si la dueña usa SU mensaje de confirmación (el
--     texto ya existe en negocios.mensaje_confirmacion). Apagado = el de siempre.
--   * negocios.mensaje_primera_vez / mensaje_primera_vez_activo: bienvenida para clientas nuevas.
--   * clientes_autorizados.bienvenida_enviada_at: cuándo se le envió la bienvenida, para que la
--     clienta salga del panel "Clientas nuevas" y no se le escriba dos veces.
--
-- MEDIDO ANTES: negocios y clientes_autorizados se leen y escriben con la clave pública; el
-- trigger negocios_proteger_campos solo vigila sus columnas (cumpleaños, tiendas, suscripción),
-- así que estas columnas nuevas las puede editar la dueña sin tocar el trigger.

begin;

alter table public.negocios
    add column if not exists mensaje_confirmacion_activo boolean not null default false,
    add column if not exists mensaje_primera_vez text,
    add column if not exists mensaje_primera_vez_activo boolean not null default false;

comment on column public.negocios.mensaje_confirmacion_activo is
    'Si la dueña usa su propio mensaje de confirmación de la cita (negocios.mensaje_confirmacion). Apagado = el de RservasRoma.';
comment on column public.negocios.mensaje_primera_vez is
    'Mensaje de bienvenida para clientas nuevas. Marcas: {cliente} {nombre_negocio} {servicio} {fecha} {hora} {profesional}.';
comment on column public.negocios.mensaje_primera_vez_activo is
    'Si la dueña usa su propio mensaje de primera vez. Apagado = el de RservasRoma.';

alter table public.clientes_autorizados
    add column if not exists bienvenida_enviada_at timestamptz;

comment on column public.clientes_autorizados.bienvenida_enviada_at is
    'Cuándo se le envió (o se descartó) el mensaje de bienvenida de primera vez.';

commit;

-- Comprobación: debe devolver 4 filas.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'negocios' and column_name in ('mensaje_confirmacion_activo', 'mensaje_primera_vez', 'mensaje_primera_vez_activo'))
    or (table_name = 'clientes_autorizados' and column_name = 'bienvenida_enviada_at')
  )
order by table_name, column_name;
