-- Deshace sql-espacios.sql. Las citas siguen funcionando igual (solo se pierde en que espacio estaban).
-- Antes de borrar las columnas, apaga la funcion en cada salon desde el panel si quieres un paso intermedio.

drop trigger if exists reservas_asignar_espacio on public.reservas;
drop function if exists public.asignar_espacio_reserva();
drop function if exists public.asignar_espacios_futuros(uuid);
drop function if exists public.espacio_libre_para(uuid, bigint, date, time, time, bigint);

alter table public.reservas drop constraint if exists reservas_sin_solape_espacio;
alter table public.reservas drop column if exists espacio;
alter table public.profesionales drop column if exists espacios;
alter table public.configuracion drop constraint if exists configuracion_espacios_cantidad_rango;
alter table public.configuracion drop column if exists espacios_cantidad;
alter table public.configuracion drop column if exists espacios_activos;
