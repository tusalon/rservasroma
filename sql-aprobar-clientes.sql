-- Aprobacion de clientas nuevas por el salon.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- POR QUE
-- Hasta ahora cualquiera que abriera el link de un salon quedaba registrada y
-- reservando al instante; la duena solo podia reaccionar despues, bloqueandola
-- desde la lista negra (clientes_bloqueados). Con esta opcion puede decidir por
-- adelantado: las clientas nuevas quedan pendientes hasta que ella las acepte.
--
-- NO HACE FALTA TOCAR clientes_autorizados
-- Esa tabla ya trae la columna fecha_aprobacion y las 4144 clientas que existen
-- hoy la tienen puesta (ninguna en null). Asi que sirve tal cual como marcador:
--   fecha_aprobacion con fecha -> aprobada
--   fecha_aprobacion en null   -> pendiente
-- Como ninguna fila vieja quedo en null, al activar la opcion NO se le cierra la
-- puerta a la clientela que ya venia entrando: solo aplica a las nuevas.

alter table public.negocios
add column if not exists aprobar_clientes_nuevos boolean default false;

comment on column public.negocios.aprobar_clientes_nuevos is
'Si esta activo, una clienta nueva queda pendiente (clientes_autorizados.fecha_aprobacion en null) hasta que la duena la acepte desde el panel. Apagado = entra directo, como siempre.';
