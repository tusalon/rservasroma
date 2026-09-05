-- Botón de soporte de las apps de RservasRoma.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- POR QUE
-- Hasta ahora el soporte era solo WhatsApp: si la duena escribia sin datos, si
-- cerraba el chat antes de darle a enviar o si el mensaje se perdia entre 300
-- conversaciones, no quedaba rastro de nada. Esta tabla es la copia que SI
-- queda: el ticket se guarda ANTES de abrir WhatsApp, asi que el Super Admin
-- lo ve aunque el WhatsApp nunca llegue.
--
-- LA FOTO NO SE GUARDA AQUI
-- La foto viaja adjunta en el propio WhatsApp (Web Share / plugin Share de la
-- APK). No se sube ni a Cloudinary ni a Supabase Storage: cero costo, cero
-- cuota, y una foto de un fallo no tiene por que quedar alojada en ningun
-- servidor. Por eso solo se guarda "con_foto": para saber que hay que mirar el
-- chat.

create table if not exists public.soporte_tickets (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid references public.negocios(id) on delete set null,
    negocio_nombre text,
    negocio_slug text,
    -- 'panel' = lo escribe la duena desde su panel; 'clientas' = lo escribe una
    -- clienta desde la app de reservas. Se triagean distinto.
    origen text not null default 'panel',
    quien text,
    contacto text,
    mensaje text not null,
    con_foto boolean not null default false,
    plataforma text,
    estado text not null default 'nuevo',
    created_at timestamptz not null default now(),
    atendido_at timestamptz,
    -- Tope de 1500: es lo que cabe comodo en una URL de wa.me sin que WhatsApp
    -- corte el texto en silencio (ya paso con los mensajes de alta).
    constraint soporte_tickets_mensaje_util
        check (char_length(btrim(mensaje)) between 5 and 1500),
    constraint soporte_tickets_estado_valido
        check (estado in ('nuevo', 'leido', 'resuelto'))
);

-- El panel siempre pide los pendientes ordenados por fecha.
create index if not exists soporte_tickets_pendientes_idx
    on public.soporte_tickets (created_at desc)
    where estado <> 'resuelto';

alter table public.soporte_tickets enable row level security;

-- ESCRIBIR: abierto. El boton vive dentro de apps publicadas, y esas apps solo
-- llevan la clave anon (viaja en el codigo, no es secreta). El check de arriba
-- limita el tamano; lo demas es el mismo riesgo que ya tiene solicitudes_alta.
drop policy if exists soporte_tickets_insert_publico on public.soporte_tickets;
create policy soporte_tickets_insert_publico on public.soporte_tickets
    for insert to anon, authenticated
    with check (true);

-- LEER Y CERRAR: solo el Super Admin. "authenticated" a secas no vale: hay 77
-- cuentas de auth (RomaFinanzas, RomaHub, alquiler) y ninguna tiene por que
-- ver los problemas ni los telefonos de los demas salones.
drop policy if exists soporte_tickets_lee_superadmin on public.soporte_tickets;
create policy soporte_tickets_lee_superadmin on public.soporte_tickets
    for select to authenticated
    using (auth.jwt() ->> 'email' = 'rservasroma@gmail.com');

drop policy if exists soporte_tickets_actualiza_superadmin on public.soporte_tickets;
create policy soporte_tickets_actualiza_superadmin on public.soporte_tickets
    for update to authenticated
    using (auth.jwt() ->> 'email' = 'rservasroma@gmail.com')
    with check (auth.jwt() ->> 'email' = 'rservasroma@gmail.com');

-- Los GRANT van aparte de las policies: sin ellos PostgREST responde
-- "permission denied for table", que no es lo mismo que un rechazo de RLS y
-- despista al depurar.
grant insert on public.soporte_tickets to anon, authenticated;
grant select, update on public.soporte_tickets to authenticated;

comment on table public.soporte_tickets is
'Tickets del boton de soporte de las apps. La foto no se guarda: va adjunta en el WhatsApp. con_foto avisa de que hay que mirar el chat.';
