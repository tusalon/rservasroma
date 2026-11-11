(function(root){const MARCAS=["cliente","nombre_negocio","servicio","fecha","hora","profesional","direccion","total","calendario"],DATOS_CITA=["servicio","fecha","hora","profesional","direccion","total","calendario"],MENSAJE_CONFIRMACION_DEFECTO=`✅ *{nombre_negocio} - Cita Confirmada*

Hola *{cliente}*, tu cita ha sido agendada.

📅 *Fecha:* {fecha}
⏰ *Hora:* {hora}
✨ *Servicio:* {servicio}
👩‍🎨 *Profesional:* {profesional}
💵 *Total a pagar:* {total}
📍 *Dirección:* {direccion}
📅 *Agregar a tu calendario:* {calendario}

¡Te esperamos! ❤️`,LINEAS_DATOS={fecha:"📅 *Fecha:* {fecha}",hora:"⏰ *Hora:* {hora}",servicio:"✨ *Servicio:* {servicio}",profesional:"👩‍🎨 *Profesional:* {profesional}",direccion:"📍 *Dirección:* {direccion}",total:"💵 *Total a pagar:* {total}",calendario:"📅 *Agregar a tu calendario:* {calendario}"},limpiaClave=clave=>clave.trim().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase(),DIAS_VENTANA=14,MENSAJE_PRIMERA_VEZ_DEFECTO=`¡Hola {cliente}! 💗 Bienvenida a {nombre_negocio}. Nos alegra mucho que hayas reservado con nosotras.

Tu cita: {servicio}, {fecha} a las {hora}.

Si necesitas cambiar algo o tienes cualquier duda, escríbenos por aquí. ¡Te esperamos!`;function rellenar(plantilla,datos){const texto=String(plantilla||"").trim();if(!texto)return"";const valores=datos||{};return texto.replace(/\{([^}]+)\}/g,(marca,clave)=>{const limpia=clave.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();return MARCAS.includes(limpia)&&valores[limpia]!=null?String(valores[limpia]):marca})}function datosDeLinea(linea){const usadas=[];return String(linea).replace(/\{([^}]+)\}/g,(marca,clave)=>{const k=limpiaClave(clave);return DATOS_CITA.includes(k)&&usadas.push(k),marca}),usadas}const vacio=valor=>valor==null||String(valor).trim()==="",juntaHuecos=texto=>texto.replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim();function faltantes(plantilla){const puestas=new Set;return String(plantilla||"").split(`
`).forEach(l=>datosDeLinea(l).forEach(k=>puestas.add(k))),["fecha","hora","servicio","profesional","direccion"].filter(k=>!puestas.has(k))}function rellenarConfirmacion(plantilla,datos){const valores=datos||{},lineas=String(plantilla||"").split(`
`).filter(linea=>!datosDeLinea(linea).some(k=>vacio(valores[k])));return juntaHuecos(rellenar(lineas.join(`
`),valores))}function introConfirmacion(plantilla,datos){const lineas=String(plantilla||"").split(`
`).filter(linea=>datosDeLinea(linea).length===0);return juntaHuecos(rellenar(lineas.join(`
`).replace(/\*/g,""),datos))}function textoConfirmacion(config,datos,opciones){return!config||config.mensaje_confirmacion_activo!==!0?"":opciones&&opciones.pantalla?introConfirmacion(config.mensaje_confirmacion,datos):rellenarConfirmacion(config.mensaje_confirmacion,datos)}function textoPrimeraVez(config,datos){return(config&&config.mensaje_primera_vez_activo===!0?rellenar(config.mensaje_primera_vez,datos):"")||rellenar(MENSAJE_PRIMERA_VEZ_DEFECTO,datos)}const soloDigitos=valor=>String(valor||"").replace(/\D/g,"");function clientasNuevas(reservas,clientes,hoy,dias){const ventana=Number.isFinite(dias)?dias:DIAS_VENTANA,limite=new Date(`${hoy}T12:00:00`);limite.setDate(limite.getDate()-ventana);const porClienta=new Map;(reservas||[]).forEach(reserva=>{if(!reserva||reserva.estado==="Cancelado")return;const clave=soloDigitos(reserva.cliente_whatsapp);clave&&(porClienta.has(clave)||porClienta.set(clave,[]),porClienta.get(clave).push(reserva))});const yaSaludadas=new Set((clientes||[]).filter(c=>c&&c.bienvenida_enviada_at).map(c=>soloDigitos(c.whatsapp))),nuevas=[];return porClienta.forEach((lista,clave)=>{if(lista.length!==1||yaSaludadas.has(clave))return;const reserva=lista[0],creada=new Date(reserva.created_at||`${reserva.fecha}T12:00:00`);Number.isNaN(creada.getTime())||creada<limite||nuevas.push({whatsapp:reserva.cliente_whatsapp,clave,reserva,creada:creada.getTime()})}),nuevas.sort((a,b)=>b.creada-a.creada)}const api={MARCAS,DIAS_VENTANA,MENSAJE_PRIMERA_VEZ_DEFECTO,MENSAJE_CONFIRMACION_DEFECTO,LINEAS_DATOS,rellenar,rellenarConfirmacion,faltantes,textoConfirmacion,textoPrimeraVez,clientasNuevas,soloDigitos};typeof module<"u"&&module.exports&&(module.exports=api),root.bienvenida=api})(typeof window<"u"?window:globalThis);
