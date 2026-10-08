-- Deshace sql-whatsapp-envio-admin.sql. La app vuelve a abrir WhatsApp siempre.
alter table public.negocios drop column if exists whatsapp_envio_automatico;
