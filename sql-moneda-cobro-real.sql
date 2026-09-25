-- ============================================================
-- Moneda del cobro real
-- ============================================================
--
-- POR QUE
-- El cobro real de una cita (reservas.monto_cobrado) es solo un numero. La app
-- le ponia un "$" delante y no sabia si eran pesos o dolares. Pedido el
-- 25-09-2026: poder decir si se cobro en USD o en CUP, porque en Cuba un mismo
-- servicio se cobra a veces en una moneda y a veces en otra.
--
-- QUE HACE
-- Anade reservas.moneda_cobrada. Vacia = como hasta hoy: se entiende la moneda
-- del servicio. Solo admite monedas que la app conoce.
--
-- No toca ningun dato: las citas que ya tienen cobro real se quedan igual.
--
-- ORDEN
-- Correr ESTO primero. La app nueva funciona tambien sin la columna (guarda el
-- cobro sin moneda, como antes), asi que el orden no rompe nada; pero hasta
-- que no exista, la moneda que elija la duena no se guarda.
--
-- Se puede correr dos veces sin romper nada.

begin;

alter table public.reservas
  add column if not exists moneda_cobrada text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'reservas_moneda_cobrada_valida'
       and conrelid = 'public.reservas'::regclass
  ) then
    alter table public.reservas
      add constraint reservas_moneda_cobrada_valida
      check (moneda_cobrada is null or moneda_cobrada in ('CUP', 'USD', 'EUR', 'MXN', 'MLC'));
  end if;
end $$;

comment on column public.reservas.moneda_cobrada is
  'Moneda del cobro real (monto_cobrado). NULL = la moneda del servicio, como antes de existir esta columna.';

commit;

-- Comprobacion: tiene que salir una fila con la columna.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'reservas' and column_name = 'moneda_cobrada';
