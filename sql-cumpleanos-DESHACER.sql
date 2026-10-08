-- Deshace sql-cumpleanos.sql.
-- OJO: BORRA los cumpleaños guardados (de dueñas y clientas) y la bonificacion
-- programada. La funcion negocios_proteger_campos vuelve a quedar como la de
-- sql-proteger-negocios.sql (Rservas.SuperAdmin): despues de esto, vuelve a
-- correr ese archivo para recuperar la version sin las reglas de cumpleaños.
begin;
alter table public.negocios
    drop column if exists cumple_admin_dia,
    drop column if exists cumple_admin_mes,
    drop column if exists cumple_descuento_anio,
    drop column if exists cumple_bonificacion_activa,
    drop column if exists cumple_bonificacion_tipo,
    drop column if exists cumple_bonificacion_valor,
    drop column if exists cumple_bonificacion_regalo,
    drop column if exists cumple_bonificacion_ventana,
    drop column if exists cumple_bonificacion_mensaje;
alter table public.clientes_autorizados
    drop column if exists cumple_dia,
    drop column if exists cumple_mes,
    drop column if exists cumple_bonificacion_anio;
commit;
