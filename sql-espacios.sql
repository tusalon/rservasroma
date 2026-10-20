-- Espacios del salon (sillas, cabinas, puestos). Opcional por salon, apagado por defecto.
-- Ejecutar en el SQL Editor de Supabase. Se puede correr dos veces sin romper nada.
-- Deshacer: sql-espacios-DESHACER.sql
--
-- COMO FUNCIONA
--   * La duena activa la funcion (Configuracion -> Opciones avanzadas), dice cuantos espacios hay y
--     marca a cuales puede ir cada profesional (ej.: Juana 1 y 2, Roma 2 y 3, Sofia 1, 2 y 3).
--   * Cada cita ocupa UN espacio mientras dura. La asigna esta base de datos: toma el primer espacio
--     libre de la profesional y ya no se mueve. Si no queda ninguno, rechaza la cita con el mismo error
--     de "horario ocupado" (23P01 -> HTTP 409) que ya usa la restriccion anti doble-reserva, y las
--     apps lo muestran como "Ese horario acaba de ser tomado".
--   * Pasa por la base y no por la app a proposito: asi vale igual para la clienta, la reserva manual,
--     reprogramar y cualquier otra via, y dos clientas a la vez no pueden quedarse con el mismo espacio.
--   * Una profesional sin espacios marcados no tiene restriccion. Con la funcion apagada nada cambia.
--
-- ORDEN
--   1) Este SQL.   2) Publicar la app (hasta entonces las apps ignoran estas columnas y no se rompe nada).
--   3) La duena activa la funcion en su panel; las citas futuras que ya existian se reparten solas.

-- 1) Columnas ---------------------------------------------------------------------------------------------
alter table public.configuracion add column if not exists espacios_activos boolean not null default false;
alter table public.configuracion add column if not exists espacios_cantidad integer not null default 0;
alter table public.profesionales add column if not exists espacios integer[] not null default '{}';
alter table public.reservas add column if not exists espacio integer;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'configuracion_espacios_cantidad_rango') then
        alter table public.configuracion
            add constraint configuracion_espacios_cantidad_rango check (espacios_cantidad between 0 and 20);
    end if;
end
$$;

-- 2) Primer espacio libre de una profesional en un horario ----------------------------------------------------
-- Devuelve null si la funcion esta apagada, si la profesional no tiene espacios o si no queda ninguno libre.
-- La usan el trigger de abajo y el reparto de citas ya existentes.
create or replace function public.espacio_libre_para(
    p_negocio uuid, p_profesional bigint, p_fecha date, p_inicio time, p_fin time, p_excluir bigint
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_cantidad integer;
    v_espacios integer[];
    e integer;
begin
    select case when c.espacios_activos then c.espacios_cantidad else 0 end
      into v_cantidad
      from public.configuracion c
     where c.negocio_id = p_negocio
     limit 1;
    if coalesce(v_cantidad, 0) <= 0 then return null; end if;

    select array(select distinct n from unnest(p.espacios) n where n between 1 and v_cantidad order by n)
      into v_espacios
      from public.profesionales p
     where p.id = p_profesional and p.negocio_id = p_negocio;
    if v_espacios is null or cardinality(v_espacios) = 0 then return null; end if;

    foreach e in array v_espacios loop
        if not exists (
            select 1
              from public.reservas r
             where r.negocio_id = p_negocio
               and r.espacio = e
               and r.id is distinct from p_excluir
               and lower(trim(coalesce(r.estado, ''))) <> 'cancelado'
               and tsrange(r.fecha + r.hora_inicio, r.fecha + coalesce(r.hora_fin, r.hora_inicio), '[)')
                   && tsrange(p_fecha + p_inicio, p_fecha + p_fin, '[)')
        ) then
            return e;
        end if;
    end loop;

    return -1; -- hay espacios pero todos estan ocupados
end
$$;

-- 3) Trigger: asigna el espacio al guardar una cita -------------------------------------------------------------
create or replace function public.asignar_espacio_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_espacio integer;
begin
    -- El reparto de citas existentes (mas abajo) escribe el espacio ella misma: no se recalcula.
    -- Ese indicador solo vive dentro de su transaccion y la app no puede ponerlo.
    if current_setting('espacios.reparto', true) = '1' then
        return new;
    end if;

    -- Una cita cancelada no ocupa espacio (la restriccion de abajo tampoco la mira).
    if lower(trim(coalesce(new.estado, ''))) = 'cancelado' then
        return new;
    end if;

    -- Cambio que no mueve la cita (confirmar, cobrar, notas...): conserva lo que tenia, aunque no tuviera
    -- espacio. Asi una cita anterior a activar la funcion no se bloquea al confirmarla.
    if tg_op = 'UPDATE'
       and lower(trim(coalesce(old.estado, ''))) <> 'cancelado'
       and new.negocio_id is not distinct from old.negocio_id
       and new.profesional_id is not distinct from old.profesional_id
       and new.fecha is not distinct from old.fecha
       and new.hora_inicio is not distinct from old.hora_inicio
       and new.hora_fin is not distinct from old.hora_fin then
        new.espacio := old.espacio;
        return new;
    end if;

    -- El espacio nunca viene de la app: se calcula aqui.
    new.espacio := null;
    if new.profesional_id is null or new.hora_inicio is null
       or new.hora_fin is null or new.hora_fin <= new.hora_inicio then
        return new;
    end if;

    -- Salon sin la funcion activada: no se hace nada mas (ni candado), asi las demas reservas no notan el cambio.
    if not exists (select 1 from public.configuracion c where c.negocio_id = new.negocio_id and c.espacios_activos) then
        return new;
    end if;

    -- Un candado por salon y dia: dos citas a la vez no pueden elegir el mismo espacio.
    perform pg_advisory_xact_lock(hashtextextended(new.negocio_id::text || new.fecha::text, 0));

    v_espacio := public.espacio_libre_para(new.negocio_id, new.profesional_id, new.fecha, new.hora_inicio, new.hora_fin, new.id);
    if v_espacio = -1 then
        raise exception 'No queda un espacio libre para ese horario'
            using errcode = '23P01', detail = 'Todos los espacios de la profesional estan ocupados';
    end if;
    new.espacio := v_espacio;
    return new;
end
$$;

drop trigger if exists reservas_asignar_espacio on public.reservas;
create trigger reservas_asignar_espacio
    before insert or update of negocio_id, profesional_id, fecha, hora_inicio, hora_fin, estado, espacio
    on public.reservas
    for each row execute function public.asignar_espacio_reserva();

-- 4) Garantia final: dos citas activas no pueden usar el mismo espacio a la vez ---------------------------------
create extension if not exists btree_gist;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'reservas_sin_solape_espacio') then
        alter table public.reservas
            add constraint reservas_sin_solape_espacio
            exclude using gist (
                negocio_id with =,
                espacio with =,
                tsrange(fecha + hora_inicio, fecha + coalesce(hora_fin, hora_inicio), '[)') with &&
            )
            where (espacio is not null and lower(trim(coalesce(estado, ''))) <> 'cancelado');
    end if;
end
$$;

-- 5) Repartir las citas futuras que ya existian al activar la funcion --------------------------------------------
-- Las ordena por fecha y hora y les da el primer espacio libre. Devuelve las que NO caben (ya estaban
-- sobrepuestas); esas siguen funcionando sin espacio y la duena decide que hacer con ellas.
create or replace function public.asignar_espacios_futuros(p_negocio uuid)
returns table (id bigint, fecha date, hora_inicio time, cliente_nombre text)
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    v_espacio integer;
begin
    perform pg_advisory_xact_lock(hashtextextended(p_negocio::text, 1));
    perform set_config('espacios.reparto', '1', true);
    for r in
        select x.id, x.profesional_id, x.fecha, x.hora_inicio, x.hora_fin, x.cliente_nombre
          from public.reservas x
         where x.negocio_id = p_negocio
           and x.fecha >= current_date
           and x.espacio is null
           and lower(trim(coalesce(x.estado, ''))) <> 'cancelado'
           and x.profesional_id is not null
           and x.hora_fin > x.hora_inicio
         order by x.fecha, x.hora_inicio, x.id
    loop
        v_espacio := public.espacio_libre_para(p_negocio, r.profesional_id, r.fecha, r.hora_inicio, r.hora_fin, r.id);
        if v_espacio is null then
            continue; -- la profesional no usa espacios
        elsif v_espacio = -1 then
            id := r.id; fecha := r.fecha; hora_inicio := r.hora_inicio; cliente_nombre := r.cliente_nombre;
            return next;
        else
            update public.reservas set espacio = v_espacio where reservas.id = r.id;
        end if;
    end loop;
end
$$;

grant execute on function public.asignar_espacios_futuros(uuid) to anon, authenticated;

-- COMPROBACIONES (correr aparte; el rollback deja todo como estaba) --------------------------------------------
-- Cambia los valores por un salon de prueba real con la funcion activada y dos profesionales con los mismos
-- espacios. Con la funcion apagada, espacio queda en null y no pasa nada.
--
-- A) La segunda cita a la misma hora toma el otro espacio; la tercera es rechazada con 23P01:
--    begin;
--      insert into public.reservas (negocio_id, profesional_id, fecha, hora_inicio, hora_fin, estado, cliente_nombre, cliente_whatsapp, servicio)
--      values ('<negocio>', <prof_a>, current_date + 30, '10:00', '11:00', 'Reservado', 'Prueba A', '+5350000001', 'Prueba') returning id, espacio;
--      -- repetir con <prof_b> y luego con una tercera profesional: debe fallar con "No queda un espacio libre"
--    rollback;
