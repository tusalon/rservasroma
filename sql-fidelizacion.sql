-- Sistema de fidelización: cada N citas completadas, la siguiente tiene
-- un descuento configurable por la duena del salon.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.negocios
add column if not exists fidelizacion_activa boolean default false,
add column if not exists fidelizacion_cada_citas integer default 5,
add column if not exists fidelizacion_descuento_porcentaje numeric(5,2) default 50;

comment on column public.negocios.fidelizacion_activa is
'Si esta activo, cada N citas completadas de una clienta la siguiente cita queda marcada como premiada.';
comment on column public.negocios.fidelizacion_cada_citas is
'N: cantidad de citas completadas normales antes de la premiada (con 5, la 6ta cita tiene descuento).';
comment on column public.negocios.fidelizacion_descuento_porcentaje is
'Porcentaje de descuento (0-100) que se sugiere al cobrar la cita premiada.';
