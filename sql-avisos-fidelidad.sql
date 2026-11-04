-- Avisos de fidelidad por push (fuera de la app): "te falta 1 cita" y "tu proxima cita tiene X % de descuento".
-- Ejecutar UNA vez en el SQL Editor de Supabase, DESPUES de desplegar la funcion:
--   npx supabase functions deploy avisos-fidelidad --project-ref zorhclhvykikaachfrmp
-- Deshacer: select cron.unschedule('avisos-fidelidad'); drop table public.fidelidad_avisos;
--
-- POR QUE (04-11-2026)
-- La tarjeta de fidelidad solo se veia si la clienta abria la app. Esta funcion le avisa al telefono cuando
-- le falta 1 cita o cuando ya tiene el descuento. Solo mira los salones con la fidelizacion activa, y solo a
-- las clientas que completaron una cita en los ultimos 2 dias: es una consulta pequena, no recorre todo.
--
-- La tabla solo guarda lo ya avisado (salon + clienta + total de citas completadas) para no repetir.
-- Sin politicas RLS: solo la funcion (service_role) la lee y escribe; la app no la toca.

create table if not exists public.fidelidad_avisos (
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  whatsapp      text not null,
  citas_totales integer not null,
  tipo          text not null,
  enviado_en    timestamptz not null default now(),
  primary key (negocio_id, whatsapp, citas_totales)
);

alter table public.fidelidad_avisos enable row level security;

-- Reprogramar sin duplicar si ya existia.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('avisos-fidelidad')
 where exists (select 1 from cron.job where jobname = 'avisos-fidelidad');

-- Cada 15 minutos: unos minutos despues de que marcar-turnos-completados (cada 5) haya cerrado las citas.
-- La clave es la anon (publica, ya viaja en las apps): la funcion usa su propia service_role.
select cron.schedule(
  'avisos-fidelidad',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://zorhclhvykikaachfrmp.supabase.co/functions/v1/avisos-fidelidad',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- COMPROBAR (aparte, solo lectura):
--   select jobname, schedule, active from cron.job where jobname = 'avisos-fidelidad';
--   select * from public.fidelidad_avisos order by enviado_en desc limit 20;
--
-- PRUEBA SIN ENVIAR NADA (despues de desplegar): dice a quien avisaria ahora mismo.
--   select net.http_post(
--     url := 'https://zorhclhvykikaachfrmp.supabase.co/functions/v1/avisos-fidelidad',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON>','apikey','<ANON>'),
--     body := '{"dry_run": true}'::jsonb);
--   select content from net._http_response order by id desc limit 1;
