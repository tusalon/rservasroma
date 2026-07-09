-- ============================================================
-- ANTI DOBLE-RESERVA (race condition)
-- Impide que dos reservas ACTIVAS del mismo profesional se
-- solapen en el tiempo, aunque lleguen en el mismo instante
-- desde dos clientas distintas. La validacion del cliente
-- (JS) sigue igual; esto es la garantia final en la base.
--
-- Ejecutar en Supabase: SQL Editor, paso por paso.
-- ============================================================

-- PASO 1 — Verificar tipos de columna (deben ser date/time/uuid).
-- Si fecha no es "date" o las horas no son "time without time zone",
-- NO sigas: avisa antes de continuar.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reservas'
  and column_name in ('negocio_id', 'profesional_id', 'fecha', 'hora_inicio', 'hora_fin', 'estado');

-- PASO 2 — Buscar solapes YA existentes (creados por el bug).
-- La constraint no se puede crear mientras haya filas en conflicto.
-- Por cada par devuelto, cancela o reprograma una de las dos reservas.
select
  a.id as reserva_a,
  b.id as reserva_b,
  a.negocio_id,
  a.profesional_id,
  a.fecha,
  a.hora_inicio as inicio_a, a.hora_fin as fin_a,
  b.hora_inicio as inicio_b, b.hora_fin as fin_b,
  a.cliente_nombre as cliente_a,
  b.cliente_nombre as cliente_b
from public.reservas a
join public.reservas b
  on a.id < b.id
 and a.negocio_id = b.negocio_id
 and a.profesional_id = b.profesional_id
 and a.fecha = b.fecha
 and tsrange(a.fecha + a.hora_inicio, a.fecha + coalesce(a.hora_fin, a.hora_inicio), '[)')
     && tsrange(b.fecha + b.hora_inicio, b.fecha + coalesce(b.hora_fin, b.hora_inicio), '[)')
where lower(trim(coalesce(a.estado, ''))) <> 'cancelado'
  and lower(trim(coalesce(b.estado, ''))) <> 'cancelado'
  and a.profesional_id is not null
order by a.fecha desc, a.hora_inicio desc;

-- PASO 3 — Solo cuando el PASO 2 no devuelva filas: crear la constraint.
-- btree_gist permite mezclar igualdad (negocio, profesional) con
-- solape de rangos en la misma constraint de exclusion.
create extension if not exists btree_gist;

alter table public.reservas
add constraint reservas_sin_solape_profesional
exclude using gist (
  negocio_id with =,
  profesional_id with =,
  tsrange(fecha + hora_inicio, fecha + coalesce(hora_fin, hora_inicio), '[)') with &&
)
where (
  lower(trim(coalesce(estado, ''))) <> 'cancelado'
  and profesional_id is not null
);

-- Notas:
-- * Las reservas de un combo multi-servicio son contiguas
--   ([10:00,10:30) y [10:30,11:00)): los rangos '[)' que solo se
--   tocan en el borde NO se solapan, asi que los combos siguen
--   funcionando igual.
-- * Las canceladas quedan fuera: reprogramar una cancelada vuelve
--   a validar contra las activas al cambiar su estado.
-- * Si hora_fin es null el rango queda vacio y no bloquea nada.
-- * Cuando la constraint rechaza una reserva, PostgREST devuelve
--   HTTP 409 con codigo 23P01; utils/api.js lo traduce al mensaje
--   "Ese horario acaba de ser tomado..." para la clienta.
