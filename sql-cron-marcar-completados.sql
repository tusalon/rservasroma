-- Marcar turnos completados: del navegador de cada clienta a un cron unico.
--
-- POR QUE
-- El 12/08/2026 el proyecto de Supabase se quedo sin recursos y la app mandaba
-- a todos los salones al panel offline. Query Performance mostro que no habia
-- ninguna consulta lenta: habia demasiadas. El 51,9 % del tiempo total de la
-- base se iba solo en preparar peticiones (58,7 millones de ellas).
--
-- marcarTurnosCompletados() era 246.428 de esas llamadas (3,6 % del tiempo).
-- Corria en el navegador de cada persona con el panel abierto, cada minuto, y
-- hacia dos SELECT + un PATCH. Diez empleadas con el panel abierto = el mismo
-- trabajo del salon repetido diez veces por minuto.
--
-- Esto lo hace UNA vez cada cinco minutos, para los 379 salones a la vez,
-- dentro de la base y sin ninguna peticion HTTP.
--
-- COMO APLICARLO
-- Pegar entero en el SQL Editor de Supabase y ejecutar. Es idempotente: se
-- puede correr varias veces sin romper nada.
--
-- ZONA HORARIA
-- 'fecha' y 'hora_fin' se guardan en la hora de pared del salon, no en UTC, asi
-- que hay que saber su zona para decidir si un turno ya termino. Se usa
-- America/Havana, igual que hacen ya recordatorio-turnos, resumen-turnos-push y
-- recordatorio-cliente. Hoy 378 de los 379 negocios son de Cuba (codigo_pais
-- '53'). El unico de fuera es de Guyana (+592, UTC-4 todo el año): en invierno,
-- cuando Cuba pasa a UTC-5, a ese salon se le marcaran los turnos una hora mas
-- tarde de la cuenta. Tarde es el lado inofensivo — un turno terminado sigue
-- un rato como "Reservado". Al reves seria el problema: dar por completado un
-- turno que aun no ha empezado.

create extension if not exists pg_cron;

-- El UPDATE filtra por estado y fecha sobre toda la tabla, no por negocio.
-- El indice parcial lo deja mirando solo los turnos aun sin completar, que son
-- pocos; los historicos ya completados o cancelados ni se tocan.
create index if not exists reservas_reservado_fecha_idx
  on public.reservas (fecha, hora_fin)
  where estado = 'Reservado';

create or replace function public.marcar_turnos_completados()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ahora timestamp := (now() at time zone 'America/Havana');
  marcados integer;
begin
  update public.reservas
     set estado = 'Completado'
   where estado = 'Reservado'
     and (
       fecha < ahora::date
       or (fecha = ahora::date and hora_fin <= ahora::time)
     );

  get diagnostics marcados = row_count;
  return marcados;
end;
$$;

comment on function public.marcar_turnos_completados() is
  'Pasa a Completado los turnos Reservados cuya hora de fin ya paso (hora de Cuba). Lo llama el cron marcar-turnos-completados cada 5 min, en lugar de que lo haga el panel de cada clienta.';

-- Reprogramar sin duplicar si ya existia.
select cron.unschedule('marcar-turnos-completados')
 where exists (select 1 from cron.job where jobname = 'marcar-turnos-completados');

select cron.schedule(
  'marcar-turnos-completados',
  '*/5 * * * *',
  $$select public.marcar_turnos_completados()$$
);

-- COMPROBAR
--
-- Cuantos turnos quedan pendientes de marcar ahora mismo (deberia ir a 0
-- despues de la primera pasada):
--   select count(*) from public.reservas
--    where estado = 'Reservado'
--      and (fecha < (now() at time zone 'America/Havana')::date
--        or (fecha = (now() at time zone 'America/Havana')::date
--            and hora_fin <= (now() at time zone 'America/Havana')::time));
--
-- Ejecutarlo a mano una vez, sin esperar al cron:
--   select public.marcar_turnos_completados();
--
-- Ver que el cron esta puesto y como le fue:
--   select jobname, schedule, active from cron.job where jobname = 'marcar-turnos-completados';
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'marcar-turnos-completados')
--    order by start_time desc limit 5;
--
-- DESHACER
--   select cron.unschedule('marcar-turnos-completados');
