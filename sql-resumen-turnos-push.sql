-- Resumen diario por push para admins y profesionales.
-- Ejecutar en Supabase SQL Editor antes de desplegar resumen-turnos-push.

alter table public.push_suscripciones
add column if not exists profesional_id bigint;

create index if not exists push_suscripciones_negocio_role_profesional_idx
on public.push_suscripciones (negocio_id, role, profesional_id, activo);

create table if not exists public.push_resumenes_enviados (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    role text not null,
    profesional_id bigint,
    fecha_resumen date not null,
    tipo text not null check (tipo in ('hoy', 'manana')),
    total_turnos integer not null default 0,
    sent_count integer not null default 0,
    sent_at timestamptz not null default now()
);

create unique index if not exists push_resumenes_enviados_unico_idx
on public.push_resumenes_enviados (
    negocio_id,
    role,
    coalesce(profesional_id, -1),
    fecha_resumen,
    tipo
);

create index if not exists push_resumenes_enviados_fecha_idx
on public.push_resumenes_enviados (fecha_resumen, tipo);

alter table public.push_resumenes_enviados enable row level security;

drop policy if exists "push_resumenes_select_public" on public.push_resumenes_enviados;
create policy "push_resumenes_select_public"
on public.push_resumenes_enviados for select
using (true);

-- La Edge Function usa SUPABASE_SERVICE_ROLE_KEY para insertar los controles.
-- No se abre INSERT publico para evitar marcas de envio falsas desde clientes.

-- Ejemplos pg_cron:
-- Reemplaza PROJECT_REF y ANON_OR_SERVICE_KEY por valores reales antes de ejecutar.
-- Estos horarios estan en UTC:
--   12:00 UTC ~= 8:00 AM Cuba en horario de verano.
--   00:00 UTC ~= 8:00 PM Cuba del dia anterior en horario de verano.
--
-- select cron.schedule(
--   'resumen-turnos-push-hoy',
--   '0 12 * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/resumen-turnos-push',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ANON_OR_SERVICE_KEY',
--       'apikey', 'ANON_OR_SERVICE_KEY'
--     ),
--     body := jsonb_build_object('tipo', 'hoy')
--   );
--   $$
-- );
--
-- select cron.schedule(
--   'resumen-turnos-push-manana',
--   '0 0 * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/resumen-turnos-push',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ANON_OR_SERVICE_KEY',
--       'apikey', 'ANON_OR_SERVICE_KEY'
--     ),
--     body := jsonb_build_object('tipo', 'manana')
--   );
--   $$
-- );
