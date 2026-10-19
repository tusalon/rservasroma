-- Deshace sql-fichas-clientas.sql.
-- OJO: BORRA todas las fichas, visitas y fotos guardadas. Antes puedes copiar lo que quieras con:
--   select * from public.fichas_clientas;
--   select * from public.fichas_visitas;
--   select * from public.fichas_fotos;
-- Los archivos del bucket fichas-fotos hay que borrarlos desde Storage (el bucket no se puede borrar con
-- datos dentro). Si el bucket queda, sigue privado.
-- El rol panel_salon y las funciones panel_negocio() y panel_nivel() se dejan: no hacen nada sin tablas.

drop policy if exists fichas_fotos_objetos_panel on storage.objects;
drop policy if exists fichas_fotos_bucket_panel on storage.buckets;

drop table if exists public.fichas_fotos;
drop table if exists public.fichas_visitas;
drop table if exists public.fichas_clientas;
