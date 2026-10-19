-- Horarios permitidos de un servicio segun el dia de la semana.
-- Ejecutar UNA vez en el SQL Editor de Supabase. Se puede correr dos veces sin romper nada.
-- Deshacer: sql-horarios-servicio-por-dia-DESHACER.sql
--
-- POR QUE (19-10-2026)
-- servicios.horarios_permitidos es una sola lista de horas ("09:00, 11:00") que vale para TODOS los
-- dias. Hay servicios que solo se hacen a ciertas horas un dia concreto (por ejemplo, el miercoles
-- solo a las 13:00 y 13:30). Esta columna guarda esas horas por dia:
--
--   { "miercoles": ["13:00", "13:30"], "sabado": ["09:00"] }
--
-- Las claves son las mismas que usa la app para los horarios del profesional: lunes, martes,
-- miercoles, jueves, viernes, sabado, domingo (sin tildes).
--
-- COMO SE USA: un dia con horas propias manda sobre la lista general SOLO ese dia. Los dias que no
-- aparecen siguen con horarios_permitidos (y si esa esta vacia, con todos los horarios del
-- profesional). Un servicio sin esta columna rellena se comporta exactamente como hasta ahora.
--
-- APAGAR UN DIA: en vez de una lista de horas, el dia vale "cerrado" y el servicio no se puede
-- reservar ese dia:  { "lunes": "cerrado", "miercoles": ["13:00", "13:30"] }
--
-- ORDEN: corre este SQL ANTES de publicar la app nueva. Es solo una columna nueva que acepta nulos:
-- la app vieja la ignora y no se rompe nada. Si se publicara la app primero, lo que la duena escriba
-- por dia no se guardaria hasta que exista la columna.

alter table public.servicios
    add column if not exists horarios_permitidos_por_dia jsonb;

-- COMPROBACION (correr aparte, solo lectura): la columna existe y esta vacia en todos los servicios.
-- select count(*) as servicios, count(horarios_permitidos_por_dia) as con_horas_por_dia from public.servicios;
