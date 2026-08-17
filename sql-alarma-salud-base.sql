-- Alarma de salud de la base: avisar cuando algo llame en bucle.
--
-- POR QUE
-- El 17/08/2026 una app del ecosistema (RomaFinanzas) se quedo reintentando
-- para siempre una llamada que el servidor rechazaba por diseno. Llego a
-- 1.429 transacciones abortadas por segundo y tumbo la base de los 379
-- salones. Llevaba MESES corriendo a menor ritmo y nadie lo vio: nos enteramos
-- cuando la app dejo de abrir.
--
-- Lo peor es que era invisible con las herramientas normales. Query
-- Performance no lo mostraba, porque pg_stat_statements solo apunta las
-- consultas que TERMINAN BIEN. Una transaccion que aborta no deja rastro ahi.
-- El unico sitio donde se veia era pg_stat_database.xact_rollback.
--
-- Esto lo mira cada 5 minutos y avisa por ntfy si se dispara.
--
-- ANTES DE EJECUTAR: cambia el nombre del topic en la linea marcada por uno
-- tuyo y suscribete en la app de ntfy. Si lo dejas como esta, funciona igual
-- pero el aviso es publico para quien adivine el nombre.

create table if not exists public.salud_base_muestras (
    momento   timestamptz primary key default now(),
    commits   bigint not null,
    rollbacks bigint not null
);

create or replace function public.vigilar_salud_base()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_prev      public.salud_base_muestras%rowtype;
    v_commits   bigint;
    v_rollbacks bigint;
    v_segundos  numeric;
    v_ritmo     numeric;
    v_aviso     text;
begin
    select xact_commit, xact_rollback into v_commits, v_rollbacks
      from pg_catalog.pg_stat_database
     where datname = pg_catalog.current_database();

    select * into v_prev from public.salud_base_muestras order by momento desc limit 1;

    insert into public.salud_base_muestras(momento, commits, rollbacks)
    values (pg_catalog.now(), v_commits, v_rollbacks);

    delete from public.salud_base_muestras
     where momento < pg_catalog.now() - interval '7 days';

    if v_prev.momento is null then
        return 'primera muestra, sin comparacion';
    end if;

    v_segundos := extract(epoch from (pg_catalog.now() - v_prev.momento));
    if v_segundos <= 0 then return 'sin intervalo'; end if;

    v_ritmo := (v_rollbacks - v_prev.rollbacks) / v_segundos;

    -- 20/s es muy por encima del ruido normal y muy por debajo de lo que
    -- tumba la base. El dia del incidente iba por 1.429.
    if v_ritmo < 20 then
        return pg_catalog.format('ok: %s fallos/s', round(v_ritmo, 1));
    end if;

    v_aviso := pg_catalog.format(
        'La base va a %s transacciones fallidas por segundo. Algo esta llamando en bucle. Mira pg_stat_activity.',
        round(v_ritmo));

    perform net.http_post(
        url := 'https://ntfy.sh',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
            'topic', 'rservasroma-alarma-cambia-esto',   -- <<< CAMBIA ESTE NOMBRE
            'title', 'Alarma: base de datos',
            'message', v_aviso,
            'priority', 5
        )
    );

    return v_aviso;
end;
$$;

select cron.unschedule('vigilar-salud-base')
 where exists (select 1 from cron.job where jobname = 'vigilar-salud-base');

select cron.schedule('vigilar-salud-base', '*/5 * * * *', $$select public.vigilar_salud_base()$$);

-- COMPROBAR
--   select public.vigilar_salud_base();          -- correrla dos veces seguidas
--   select * from public.salud_base_muestras order by momento desc limit 10;
--
-- VER EL RITMO DE LAS ULTIMAS HORAS
--   select momento,
--          round((rollbacks - lag(rollbacks) over (order by momento))
--              / extract(epoch from (momento - lag(momento) over (order by momento))), 1) as fallos_por_segundo
--     from public.salud_base_muestras order by momento desc limit 30;
--
-- DESHACER
--   select cron.unschedule('vigilar-salud-base');
