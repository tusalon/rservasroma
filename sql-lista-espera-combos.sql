-- Lista de espera para VARIOS SERVICIOS A LA VEZ (07-11-2026). Va despues de sql-lista-espera-dia.sql.
--
-- Una espera de combo guarda en `combo` los servicios en orden, cada uno con su duracion y profesional:
--   [{"servicio":"Mad Abdomen","duracion":20,"profesional_id":581,"profesional_nombre":"Naomi"}, ...]
-- `servicio` queda con los nombres unidos ("A + B") y `duracion` con la suma, asi la oferta busca un hueco
-- seguido de ese largo. Si todos los servicios son con la misma profesional, la funcion lista-espera lo
-- ofrece sola; si hay varias profesionales, queda en el panel para que la duena lo gestione.
-- Las apps publicadas antes siguen llamando con 9 argumentos: el nuevo es opcional.
-- Se puede correr dos veces.

alter table public.lista_espera add column if not exists combo jsonb;

drop function if exists public.lista_espera_unirse(uuid, text, text, text, integer, integer, text, date, text);
create or replace function public.lista_espera_unirse(
    p_negocio uuid, p_nombre text, p_whatsapp text, p_servicio text, p_duracion integer,
    p_profesional_id integer, p_profesional_nombre text, p_fecha date, p_franja text,
    p_combo jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
    if p_negocio is null or p_fecha is null or p_fecha < lista_espera_hoy() then
        return jsonb_build_object('ok', false, 'motivo', 'fecha');
    end if;
    if length(lista_espera_tel(p_whatsapp)) < 6 or coalesce(trim(p_nombre), '') = '' then
        return jsonb_build_object('ok', false, 'motivo', 'datos');
    end if;
    if p_combo is not null and (jsonb_typeof(p_combo) <> 'array' or jsonb_array_length(p_combo) not between 2 and 8) then
        return jsonb_build_object('ok', false, 'motivo', 'datos');
    end if;
    if exists (select 1 from lista_espera
               where negocio_id = p_negocio and fecha = p_fecha and estado in ('esperando', 'ofrecida')
                 and lista_espera_tel(cliente_whatsapp) = lista_espera_tel(p_whatsapp)) then
        return jsonb_build_object('ok', false, 'motivo', 'ya_anotada');
    end if;
    insert into lista_espera (negocio_id, cliente_nombre, cliente_whatsapp, servicio, duracion, profesional_id,
                              profesional_nombre, fecha, franja, tipo, estado, combo)
    values (p_negocio, trim(p_nombre), p_whatsapp, coalesce(p_servicio, ''), p_duracion, p_profesional_id,
            p_profesional_nombre, p_fecha,
            case when p_franja in ('manana', 'tarde') then p_franja else 'cualquiera' end, 'dia', 'esperando', p_combo)
    returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id);
end $$;

drop function if exists public.lista_espera_mias(uuid, text);
create or replace function public.lista_espera_mias(p_negocio uuid, p_whatsapp text)
returns table (id bigint, fecha date, franja text, servicio text, duracion integer, profesional_id integer,
               profesional_nombre text, estado text, oferta_hora time, oferta_hora_fin time,
               oferta_profesional_id integer, oferta_profesional_nombre text, oferta_hasta timestamptz,
               combo jsonb)
language sql stable security definer set search_path = public as $$
    select l.id, l.fecha, l.franja, l.servicio, l.duracion, l.profesional_id, l.profesional_nombre,
           case when l.estado = 'ofrecida' and l.oferta_hasta <= now() then 'esperando' else l.estado end,
           l.oferta_hora, l.oferta_hora_fin, l.oferta_profesional_id, l.oferta_profesional_nombre, l.oferta_hasta,
           l.combo
    from lista_espera l
    where l.negocio_id = p_negocio and l.tipo = 'dia' and l.estado in ('esperando', 'ofrecida')
      and l.fecha >= lista_espera_hoy()
      and length(lista_espera_tel(p_whatsapp)) >= 6
      and lista_espera_tel(l.cliente_whatsapp) = lista_espera_tel(p_whatsapp)
    order by l.fecha
$$;

grant execute on function public.lista_espera_unirse(uuid, text, text, text, integer, integer, text, date, text, jsonb) to anon, authenticated;
grant execute on function public.lista_espera_mias(uuid, text) to anon, authenticated;
