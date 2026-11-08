-- "Cobrar el anticipo una sola vez por cita" (07-11-2026). Va despues de sql-moneda-anticipo.sql.
--
-- Con el anticipo fijo global (p. ej. 500), la pantalla de reserva SUMABA el anticipo de cada servicio de la
-- cita: dos servicios pedian 1000. El mensaje de pago por WhatsApp y el panel ya cobraban 500 una sola vez.
-- Masajes Natali (73 % de sus citas son de varios servicios) dijo que sus 500 son por cita.
--
-- anticipo_por_cita es opcional y nace apagado: ningun salon cambia solo. Solo vale con monto FIJO global (con
-- porcentaje ya es del total; con anticipo por servicio cada uno pone el suyo). Se activa en
-- Mi salon > Pagos y anticipos. Se puede correr dos veces.
-- Al escribirlo (07-11-2026), 50 salones tenian anticipo fijo global y 11 de ellos citas de varios servicios.

alter table public.negocios add column if not exists anticipo_por_cita boolean not null default false;
