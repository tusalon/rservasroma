-- Deshace sql-horarios-servicio-por-dia.sql: quita la columna con las horas por dia de la semana.
-- OJO: borra lo que las duenas hayan escrito por dia. Antes puedes guardarlo con:
--   select id, negocio_id, nombre, horarios_permitidos_por_dia
--   from public.servicios where horarios_permitidos_por_dia is not null;
-- La app nueva sigue funcionando sin la columna: solo deja de guardar las horas por dia.

alter table public.servicios
    drop column if exists horarios_permitidos_por_dia;
