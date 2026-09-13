-- Ajuste manual del contador de fidelización, por clienta y por negocio.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- POR QUÉ
-- El contador de fidelización NO se guarda en ningún sitio: se deriva contando
-- las reservas en estado 'Completado' de esa clienta (getClienteScore en
-- admin-app.js). Medido: no existe tabla de clientes, se agrupan por teléfono.
-- Eso deja al salón sin forma de corregir el conteo, y hacen falta dos cosas:
--
--   1. Empezar de cero. Al activar la fidelización, una clienta con 37 citas
--      históricas cae en 37 % 6 = 1 por pura casualidad. El salón quiere que
--      todas arranquen en 0, no en un número que salió del pasado.
--   2. Quitar una cita que no debía contar (se marcó completada por error,
--      la clienta no vino, se cobró aparte).
--
-- CÓMO
-- Se guarda un desplazamiento, no el contador. Las citas completadas efectivas
-- son max(0, completadas - ajuste). Así el conteo sigue saliendo de las
-- reservas reales y el ajuste solo lo corre hacia atrás: cuando la clienta
-- completa una cita nueva, el progreso vuelve a subir solo.
--
--   Reiniciar  -> ajuste = total de completadas de hoy (efectivas = 0)
--   Quitar 1   -> ajuste = ajuste + 1
--
-- El teléfono se guarda normalizado (solo dígitos, sin el código de país),
-- igual que lo normaliza el panel antes de comparar.

begin;

create table if not exists public.fidelizacion_ajustes (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    whatsapp text not null,
    -- Cuántas citas completadas NO cuentan para la fidelización.
    ajuste integer not null default 0 check (ajuste >= 0),
    actualizado_en timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- Una sola fila por clienta y negocio: el panel hace upsert contra esta clave.
create unique index if not exists uniq_fidelizacion_ajuste_cliente
on public.fidelizacion_ajustes (negocio_id, whatsapp);

alter table public.fidelizacion_ajustes enable row level security;

-- Mismas políticas que clientes_bloqueados: el panel del salón se autentica
-- con bcrypt contra negocios, NO con Supabase Auth, así que PostgREST solo ve
-- la clave anon. Es el mismo perfil de riesgo que ya tienen las otras tablas
-- por clienta; no se abre DELETE porque el panel no lo necesita (reiniciar es
-- un update a 0, no un borrado).
drop policy if exists fidelizacion_ajustes_read on public.fidelizacion_ajustes;
create policy fidelizacion_ajustes_read
on public.fidelizacion_ajustes for select
using (true);

drop policy if exists fidelizacion_ajustes_insert on public.fidelizacion_ajustes;
create policy fidelizacion_ajustes_insert
on public.fidelizacion_ajustes for insert
with check (true);

drop policy if exists fidelizacion_ajustes_update on public.fidelizacion_ajustes;
create policy fidelizacion_ajustes_update
on public.fidelizacion_ajustes for update
using (true)
with check (true);

-- Los GRANT van aparte de las policies: sin ellos PostgREST responde
-- "permission denied for table", que no es lo mismo que un rechazo de RLS.
grant select, insert, update on public.fidelizacion_ajustes to anon, authenticated;

comment on table public.fidelizacion_ajustes is
'Cuántas citas completadas NO cuentan para la fidelización de esa clienta. Las efectivas son max(0, completadas - ajuste).';

commit;

-- Comprobación: debe devolver la tabla vacía y sus tres políticas.
select
    (select count(*) from public.fidelizacion_ajustes) as filas,
    (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'fidelizacion_ajustes') as politicas;
