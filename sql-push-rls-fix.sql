-- Completa las politicas RLS de push_suscripciones (sql-web-push.sql solo
-- creo INSERT y UPDATE). Sin DELETE, la limpieza de suscripciones de otros
-- salones en el mismo dispositivo (utils/push-notifications.js:134-147)
-- fallaba en silencio, dejando un mismo dispositivo suscrito a varios
-- salones. SELECT se agrega para poder diagnosticar suscripciones activas.

drop policy if exists "push_suscripciones_select_public" on public.push_suscripciones;
create policy "push_suscripciones_select_public"
on public.push_suscripciones for select
using (true);

drop policy if exists "push_suscripciones_delete_public" on public.push_suscripciones;
create policy "push_suscripciones_delete_public"
on public.push_suscripciones for delete
using (true);
