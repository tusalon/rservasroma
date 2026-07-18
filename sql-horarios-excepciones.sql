-- Tabla para los HORARIOS DE EXCEPCIÓN por profesional (feriados, semanas
-- especiales, vacaciones con horario reducido, etc.). Un rango de fechas con
-- su propio horario_por_dia que sobreescribe el horario normal del profesional.
--
-- La usa components/admin/HorariosExcepcionPanel.js vía las funciones
-- getExcepcionesProfesional / guardarExcepcion / eliminarExcepcion de
-- utils/config.js. Sin esta tabla el panel da 404, por eso estaba oculto.

create table if not exists public.horarios_excepciones_profesionales (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    -- profesional_id sin FK explícita para no depender del tipo exacto de
    -- profesionales.id; la app siempre filtra por negocio_id + profesional_id.
    profesional_id bigint not null,
    fecha_inicio date not null,
    fecha_fin date not null,
    horarios_por_dia jsonb not null default '{}'::jsonb,
    descansos_por_dia jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hep_negocio_prof_fecha_idx
    on public.horarios_excepciones_profesionales (negocio_id, profesional_id, fecha_inicio);

alter table public.horarios_excepciones_profesionales enable row level security;

-- Políticas permisivas (la app opera con la llave anónima, igual que
-- horarios_profesionales / servicios / profesionales).
drop policy if exists hep_select on public.horarios_excepciones_profesionales;
create policy hep_select on public.horarios_excepciones_profesionales
    for select using (true);

drop policy if exists hep_insert on public.horarios_excepciones_profesionales;
create policy hep_insert on public.horarios_excepciones_profesionales
    for insert with check (true);

drop policy if exists hep_update on public.horarios_excepciones_profesionales;
create policy hep_update on public.horarios_excepciones_profesionales
    for update using (true) with check (true);

drop policy if exists hep_delete on public.horarios_excepciones_profesionales;
create policy hep_delete on public.horarios_excepciones_profesionales
    for delete using (true);
