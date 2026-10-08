-- Cumpleaños: descuento del 30 % para la dueña y bonificación para las clientas.
-- Ejecutar una vez en el SQL Editor de Supabase. Se puede correr dos veces sin romper nada.
-- Deshacer: sql-cumpleanos-DESHACER.sql
--
-- POR QUE (07-10-2026)
--   * La dueña pone su cumpleaños (solo día y mes) y en ese mes se le ofrece el
--     30 % en su suscripcion. Raudael lo aplica a mano al registrar el pago en
--     el SuperAdmin y deja anotado el año para que no se repita.
--   * Las clientas pueden poner el suyo y la dueña programa una bonificacion
--     (porcentaje o regalo) para su cumpleaños, igual que la fidelizacion.
--
-- MEDIDO ANTES: negocios y clientes_autorizados se leen y escriben con la clave
-- publica (las apps de los salones no usan Supabase Auth). Por eso se guarda
-- SOLO dia y mes, nunca el año de nacimiento, y el cumpleaños de la dueña queda
-- fijo una vez puesto: si no, lo pondria cada mes para llevarse el descuento.
--
-- OJO: este archivo vuelve a crear el trigger negocios_proteger_campos (el de
-- sql-proteger-negocios.sql del SuperAdmin) con las reglas nuevas. Si lo habias
-- quitado, queda activo otra vez.

begin;

-- 1) Cumpleaños de la dueña y bonificacion que programa para sus clientas
alter table public.negocios
    add column if not exists cumple_admin_dia smallint check (cumple_admin_dia between 1 and 31),
    add column if not exists cumple_admin_mes smallint check (cumple_admin_mes between 1 and 12),
    add column if not exists cumple_descuento_anio smallint,
    add column if not exists cumple_bonificacion_activa boolean not null default false,
    add column if not exists cumple_bonificacion_tipo text not null default 'porcentaje'
        check (cumple_bonificacion_tipo in ('porcentaje', 'regalo')),
    add column if not exists cumple_bonificacion_valor numeric(5,2) not null default 20
        check (cumple_bonificacion_valor between 0 and 100),
    add column if not exists cumple_bonificacion_regalo text,
    add column if not exists cumple_bonificacion_ventana text not null default 'semana'
        check (cumple_bonificacion_ventana in ('dia', 'semana', 'mes')),
    add column if not exists cumple_bonificacion_mensaje text;

comment on column public.negocios.cumple_admin_dia is 'Dia del cumpleaños de la dueña (sin año). Fijo una vez puesto.';
comment on column public.negocios.cumple_descuento_anio is 'Año en que el SuperAdmin aplico el 30 % de cumpleaños a su suscripcion. Solo lo escribe el SuperAdmin.';
comment on column public.negocios.cumple_bonificacion_activa is 'Si la dueña ofrece una bonificacion a sus clientas por su cumpleaños.';

-- 2) Cumpleaños de las clientas (dia y mes) y el año en que ya se les dio la bonificacion
alter table public.clientes_autorizados
    add column if not exists cumple_dia smallint check (cumple_dia between 1 and 31),
    add column if not exists cumple_mes smallint check (cumple_mes between 1 and 12),
    add column if not exists cumple_bonificacion_anio smallint;

-- 3) Proteccion: mismas reglas que sql-proteger-negocios.sql + las del cumpleaños
create or replace function public.negocios_proteger_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_nuevo jsonb := to_jsonb(new);
  v_viejo jsonb;
  v_col text;
begin
  -- Sin JWT (SQL Editor), service_role o la cuenta del SuperAdmin: sin limites.
  if v_claims is null
     or v_claims ->> 'role' = 'service_role'
     or lower(coalesce(v_claims ->> 'email', '')) = 'rservasroma@gmail.com' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Una tienda nueva nunca nace publicada: pasa por la revision del panel.
    if v_nuevo ->> 'es_tienda_externa' = 'true'
       and coalesce(v_nuevo ->> 'romahub_estado', '') not in ('borrador', 'en_revision') then
      new := jsonb_populate_record(new, jsonb_build_object('romahub_estado', 'borrador'));
    end if;
    -- Nadie se auto-concede el descuento de cumpleanos al crear el negocio.
    -- (Con jsonb: si la columna aun no existe, simplemente no hace nada.)
    new := jsonb_populate_record(new, jsonb_build_object('cumple_descuento_anio', null));
    return new;
  end if;

  -- Se compara como jsonb para no fallar si alguna columna aun no existe.
  v_viejo := to_jsonb(old);
  foreach v_col in array array['password_hash', 'es_tienda_externa', 'archivado', 'archivado_at', 'cumple_descuento_anio'] loop
    if v_nuevo -> v_col is distinct from v_viejo -> v_col then
      raise exception 'No se puede cambiar % de un negocio desde la app', v_col
        using errcode = '42501';
    end if;
  end loop;

  -- El cumpleanos de la duena se puede poner una vez; despues solo el SuperAdmin.
  if v_viejo ->> 'cumple_admin_mes' is not null
     and (v_nuevo -> 'cumple_admin_mes' is distinct from v_viejo -> 'cumple_admin_mes'
          or v_nuevo -> 'cumple_admin_dia' is distinct from v_viejo -> 'cumple_admin_dia') then
    raise exception 'El cumpleanos ya esta guardado: pide a soporte que lo cambie'
      using errcode = '42501';
  end if;

  if v_nuevo -> 'romahub_estado' is distinct from v_viejo -> 'romahub_estado'
     and coalesce(v_nuevo ->> 'romahub_estado', '') not in ('borrador', 'en_revision') then
    raise exception 'Solo el SuperAdmin aprueba o rechaza tiendas de RomaHub'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists negocios_proteger_campos on public.negocios;
create trigger negocios_proteger_campos
  before insert or update on public.negocios
  for each row execute function public.negocios_proteger_campos();

commit;

-- COMPROBACION 1 (solo lectura): las 12 columnas nuevas existen.
select table_name as tabla, column_name as columna
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'negocios' and column_name like 'cumple\_%')
    or (table_name = 'clientes_autorizados' and column_name like 'cumple\_%')
  )
order by 1, 2;

-- COMPROBACION 2 (correr aparte; no cambia nada por el rollback): con la clave
-- publica, poner un cumpleaños en un negocio que ya tiene uno tiene que dar
-- ERROR "El cumpleaños ya esta guardado". Ese error ES el resultado bueno.
--
-- begin;
-- update public.negocios set cumple_admin_dia = 1, cumple_admin_mes = 1 where id = (select id from public.negocios limit 1) and cumple_admin_mes is null;
-- set local role anon;
-- set local "request.jwt.claims" = '{"role":"anon"}';
-- update public.negocios set cumple_admin_dia = 2, cumple_admin_mes = 2 where cumple_admin_mes = 1;
-- rollback;
