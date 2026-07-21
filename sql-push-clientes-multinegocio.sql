-- Permite que un mismo dispositivo reciba notificaciones de varios negocios.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.push_suscripciones
drop constraint if exists push_suscripciones_endpoint_key;

alter table public.push_suscripciones
add column if not exists cliente_whatsapp text;

drop index if exists public.push_suscripciones_endpoint_key;

create unique index if not exists push_suscripciones_endpoint_negocio_role_key
on public.push_suscripciones (endpoint, negocio_id, role);

create index if not exists push_suscripciones_negocio_cliente_idx
on public.push_suscripciones (negocio_id, cliente_whatsapp, activo);

notify pgrst, 'reload schema';
