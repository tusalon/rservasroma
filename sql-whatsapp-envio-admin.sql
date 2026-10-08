-- Interruptor "Enviar mensajes por WhatsApp" del panel de la admin.
-- Ejecutar una sola vez en el SQL Editor de Supabase (se puede correr dos veces).
-- Deshacer: sql-whatsapp-envio-admin-DESHACER.sql
--
-- POR QUE (08-10-2026)
--   Hoy el panel abre WhatsApp solo al crear, reprogramar o cobrar una reserva.
--   Con esta columna cada salon decide: true = como siempre; false = el panel
--   no abre WhatsApp solo y deja un aviso con boton "Enviar" para mandarlo a mano.
--
-- Si no se ejecuta, la app sigue igual que antes (el valor por defecto es true y
-- el guardado de EditarNegocio reintenta sin la columna).

alter table public.negocios
    add column if not exists whatsapp_envio_automatico boolean not null default true;

comment on column public.negocios.whatsapp_envio_automatico is
    'Si es false, el panel de la admin no abre WhatsApp solo: muestra un aviso con boton para enviarlo a mano.';

-- COMPROBACION (solo lectura): tiene que salir la columna con default true.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'negocios' and column_name = 'whatsapp_envio_automatico';
