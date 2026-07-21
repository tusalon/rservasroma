-- Recordatorios push a clientes: 24h antes y 1h antes.
-- Ejecutar en Supabase SQL Editor antes/despues de desplegar recordatorio-cliente.

alter table public.reservas
add column if not exists push_recordatorio_dia_enviado boolean not null default false,
add column if not exists push_recordatorio_hora_enviado boolean not null default false;

create index if not exists reservas_recordatorio_24h_idx
on public.reservas (fecha, hora_inicio, estado, push_recordatorio_dia_enviado);

create index if not exists reservas_recordatorio_1h_idx
on public.reservas (fecha, hora_inicio, estado, push_recordatorio_hora_enviado);

-- Si ya tienes crons viejos con estos nombres, los elimina para evitar duplicados.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'recordatorio-cliente-24h',
  'recordatorio-cliente-1h',
  'recordatorio-cliente-dia',
  'recordatorio-cliente-hora'
);

-- Reemplaza PROJECT_REF y ANON_OR_SERVICE_KEY antes de ejecutar.
-- Horario cron en UTC. Correr cada 30 min da margen a la ventana de la funcion:
--   24h: ahora+23h50m hasta ahora+24h30m.
--   1h:  ahora+50m hasta ahora+90m.

-- select cron.schedule(
--   'recordatorio-cliente-24h',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/recordatorio-cliente',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ANON_OR_SERVICE_KEY',
--       'apikey', 'ANON_OR_SERVICE_KEY'
--     ),
--     body := jsonb_build_object('tipo', '24h')
--   );
--   $$
-- );

-- select cron.schedule(
--   'recordatorio-cliente-1h',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/recordatorio-cliente',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ANON_OR_SERVICE_KEY',
--       'apikey', 'ANON_OR_SERVICE_KEY'
--     ),
--     body := jsonb_build_object('tipo', 'hora')
--   );
--   $$
-- );
