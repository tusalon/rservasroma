-- Aviso diario por ntfy cuando hoy es el cumpleaños de una dueña de salon.
-- Ejecutar UNA vez en el SQL Editor de Supabase, DESPUES de desplegar la funcion:
--   npx supabase functions deploy cumple-duenas --project-ref zorhclhvykikaachfrmp
-- Deshacer: select cron.unschedule('cumple-duenas-ntfy');
--
-- POR QUE (18-10-2026)
-- Las duenas ponen su cumpleaños (dia y mes) en el panel (negocios.cumple_admin_dia / _mes) y en su
-- mes tienen 30 % de descuento en la suscripcion. Hasta ahora nadie avisaba a Raudael el dia en
-- que cumplen: este cron llama a la funcion cumple-duenas, que manda un ntfy al canal global
-- (NTFY_TOPIC_GLOBAL, por defecto rservas-vencimientos, el mismo de notificar-turnos).
--
-- Horario: 11:10 UTC = 7:10 AM Cuba en horario de verano (6:10 AM en invierno). La funcion
-- decide "hoy" con la fecha de Cuba, asi que en los dos casos es el dia correcto.
-- La clave es la anon (publica, ya viaja en las apps): la funcion usa su propia service_role.

select cron.schedule(
  'cumple-duenas-ntfy',
  '10 11 * * *',
  $$
  select net.http_post(
    url := 'https://zorhclhvykikaachfrmp.supabase.co/functions/v1/cumple-duenas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- COMPROBACION (correr aparte, solo lectura): que el cron quedo creado.
-- select jobname, schedule, active from cron.job where jobname = 'cumple-duenas-ntfy';
--
-- PRUEBA SIN ENVIAR NADA (despues de desplegar), con la fecha de un cumpleaños que exista:
-- select net.http_post(
--   url := 'https://zorhclhvykikaachfrmp.supabase.co/functions/v1/cumple-duenas',
--   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON>','apikey','<ANON>'),
--   body := '{"dry_run": true, "fecha": "2026-10-20"}'::jsonb);
-- (la respuesta queda en net._http_response: select content from net._http_response order by id desc limit 1;)
