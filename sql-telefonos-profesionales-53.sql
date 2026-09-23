-- ============================================================
-- Tres profesionales que no podian entrar al panel
-- ============================================================
--
-- POR QUE
-- profesionales.telefono se guarda en formato LOCAL cuando la profesional es
-- del mismo pais que su salon (52014345), y el login busca exactamente eso.
-- Estas tres lo tienen guardado con el 53 delante (5355252267). El login le
-- quita el 53 a lo que ellas teclean y busca 55252267: no coincide nunca,
-- escriban como escriban.
--
-- LO QUE SE MIDIO (21-09-2026)
-- Simulando el login real contra las 381 profesionales, 275 de 278 con
-- telefono entran tecleando lo que tienen guardado. Las 3 que no son estas, y
-- ya fallaban antes de los cambios de Qatar: es el dato, no el codigo.
--
--   id  16  Mary          GordisNailsbySandra            5355252267
--   id 104  Daylin        Divine-Lashes and Mely-nails   5355518352
--   id 186  Liliana Vega  Ohana.salon_de_belleza         5355884613
--
-- Son de tres salones distintos. Raudael lo autorizo el 23-09-2026.
--
-- QUE CAMBIA PARA ELLAS: nada que tengan que aprender. Despues de esto entran
-- tecleando su numero suelto (55252267) o completo (+53 55252267), igual que
-- las demas. Su contrasena y sus reservas no se tocan: van por el id.
--
-- Se corre dos veces sin romper nada: el WHERE exige el formato viejo.
-- ============================================================

begin;

update public.profesionales
set telefono = substring(telefono from 3)
where id in (16, 104, 186)
  and telefono ~ '^53[0-9]{8}$';

commit;

-- Comprobacion: tienen que salir las tres con 8 digitos.
select id, nombre, telefono, length(telefono) as digitos
from public.profesionales
where id in (16, 104, 186)
order by id;
