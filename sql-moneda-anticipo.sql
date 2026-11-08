-- Moneda propia del anticipo FIJO (07-11-2026).
--
-- Hasta hoy el anticipo fijo iba siempre en la moneda de WhatsApp del salon (negocios.whatsapp_moneda). Un
-- salon con los servicios en dolares y el anticipo por transferencia en pesos (Masajes Natali: servicios en
-- USD, anticipo 500 CUP) no podia expresarlo: poner 500 habria pedido 500 USD.
--
-- moneda_anticipo es opcional: vacio = la de WhatsApp, como siempre, asi que ningun salon cambia solo.
-- Se configura en Mi salon > anticipo > "Moneda del anticipo". Se puede correr dos veces.

alter table public.negocios add column if not exists moneda_anticipo text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'negocios_moneda_anticipo_check') then
        alter table public.negocios add constraint negocios_moneda_anticipo_check
            check (moneda_anticipo is null or moneda_anticipo in ('CUP', 'USD', 'EUR', 'MXN'));
    end if;
end $$;
