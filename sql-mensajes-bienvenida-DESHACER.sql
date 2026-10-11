-- Deshace sql-mensajes-bienvenida.sql: quita las columnas nuevas (y los textos que las dueñas escribieron en ellas).
begin;

alter table public.negocios
    drop column if exists mensaje_confirmacion_activo,
    drop column if exists mensaje_primera_vez,
    drop column if exists mensaje_primera_vez_activo;

alter table public.clientes_autorizados
    drop column if exists bienvenida_enviada_at;

commit;
