(function(root){const SALTAN=["servicio","fecha","hora","profesional","direccion","total","calendario","periodo","enlace","limite","antes","ahora"],CITA=`📅 *Fecha:* {fecha}
⏰ *Hora:* {hora}
✨ *Servicio:* {servicio}
👩‍🎨 *Profesional:* {profesional}`,QUIEN=`👤 *Cliente:* {cliente}
📱 *WhatsApp:* {whatsapp}`,EXTRAS=`💵 *Total a pagar:* {total}
📍 *Dirección:* {direccion}`,CALENDARIO="📅 *Agregar a tu calendario:* {calendario}",CAMBIO=`❌ *Antes:* {antes}
✅ *Ahora:* {ahora}`,MENSAJES=[{clave:"solicitud_anticipo",para:"salon",titulo:"Solicitud de cita (con anticipo)",texto:`✨ *{nombre_negocio} - Confirmación de Cita*

✅ *SOLICITUD DE TURNO REGISTRADA*

${CITA}
${QUIEN}
${EXTRAS}

{datos_pago}

${CALENDARIO}

¡Gracias por elegirnos! 💖`},{clave:"nueva_reserva",para:"salon",titulo:"Solicitud de cita (sin anticipo)",texto:`🎉 *NUEVA RESERVA - {nombre_negocio}*

${QUIEN}
✨ *Servicio:* {servicio} ({duracion} min)
📅 *Fecha:* {fecha}
⏰ *Hora:* {hora}
👩‍🎨 *Profesional:* {profesional}
${EXTRAS}
${CALENDARIO}

✅ Reserva confirmada automáticamente.`},{clave:"coordinar_anticipo",para:"salon",titulo:"Quiero enviar el anticipo",texto:"Hola! Reservé {servicio} para el {fecha} a las {hora} y quiero enviar el anticipo."},{clave:"cancelacion_salon",para:"salon",titulo:"La clienta cancela",texto:`❌ *CANCELACIÓN - {nombre_negocio}*

${QUIEN}
✨ *Servicio:* {servicio}
📅 *Fecha:* {fecha}
⏰ *Hora:* {hora}
👩‍🎨 *Profesional:* {profesional}

El cliente canceló su cita.`},{clave:"reprogramacion_salon",para:"salon",titulo:"La clienta cambia día u hora",texto:`🔄 *CITA REPROGRAMADA - {nombre_negocio}*

${QUIEN}
✨ *Servicio:* {servicio}
👩‍🎨 *Profesional:* {profesional}

${CAMBIO}

La clienta reprogramó su cita desde la app.`},{clave:"consulta",para:"salon",titulo:"Consulta (botón de WhatsApp)",texto:"Hola! Quiero consultar sobre turnos en {nombre_negocio}"},{clave:"servicio_no_disponible",para:"salon",titulo:"Servicio que no aparece en la app",texto:'Hola! Quiero reservar "{servicio}" pero no aparece disponible en la app ✨'},{clave:"solicitud_anticipo_panel",para:"clienta",titulo:"Pedido de anticipo (cuando agendas tú)",texto:`✨ *{nombre_negocio} - Confirmación de Cita*

✅ *SOLICITUD DE TURNO REGISTRADA*

${CITA}
${EXTRAS}

{datos_pago}

${CALENDARIO}

Cuando confirmemos tu pago, tu cita quedará reservada.

¡Gracias por elegirnos! 💖`},{clave:"pago_confirmado",para:"clienta",titulo:"Pago recibido, cita confirmada",texto:`*{nombre_negocio} - Cita Confirmada*

Hola *{cliente}*, tu cita ha sido CONFIRMADA.

${CITA}

*Pago recibido correctamente*

${CALENDARIO}

Te esperamos.
Cualquier cambio, puedes cancelarlo desde la app.`},{clave:"cita_modificada",para:"clienta",titulo:"Cambiaste su cita (mismo día y hora)",texto:`Hola *{cliente}*, tu cita fue modificada.

${CITA}
${CALENDARIO}
Te esperamos.`},{clave:"reprogramacion_clienta",para:"clienta",titulo:"Cambiaste su día u hora",texto:`🔄 *{nombre_negocio} - Cita Reprogramada*

Hola *{cliente}*, tu cita cambió de día y hora.

${CAMBIO}

✨ *Servicio:* {servicio}
👩‍🎨 *Profesional:* {profesional}
${EXTRAS}
${CALENDARIO}
📱 ¿Necesitas otro cambio? Puedes hacerlo desde la app.
¡Te esperamos! ❤️`},{clave:"cancelacion_clienta",para:"clienta",titulo:"Cancelas su cita",texto:`❌ *CANCELACIÓN DE TURNO - {nombre_negocio}*

Hola *{cliente}*, lamentamos informarte que tu cita ha sido cancelada.

${CITA}

🔔 *Motivo:* Cancelación por administración

📱 *¿Quieres reprogramar?* Puedes hacerlo desde la app`},{clave:"recordatorio",para:"clienta",titulo:"Recordatorio de mañana",texto:`Hola {cliente}! 💖 Te recordamos tu cita de MAÑANA en {nombre_negocio}:

🗓️ {fecha}
🕐 {hora}
✨ Servicio: {servicio}
👩‍🎨 Profesional: {profesional}

Si no puedes asistir, avísanos por aquí. ¡Te esperamos! ✨`},{clave:"cumpleanos",para:"clienta",titulo:"Felicitación de cumpleaños",texto:"¡Feliz cumpleaños, {cliente}! 🎂 En {nombre_negocio} queremos celebrarlo contigo: {premio} {frase}"},{clave:"saludo",para:"clienta",titulo:"Botón «Escribir» (saludo)",texto:"Hola {cliente}"},{clave:"lista_espera_oferta",para:"clienta",titulo:"Lista de espera: se liberó una hora",texto:`Hola {cliente}, estabas en lista de espera en {nombre_negocio}. Se liberó una hora:

📅 {fecha}
⏰ {hora}
👩‍🎨 {profesional}

Te la guardamos hasta las {limite}.
Resérvala aquí: {enlace}`},{clave:"lista_espera_reservada",para:"clienta",titulo:"Lista de espera: ya le reservaste",texto:`Hola {cliente}, se liberó una hora y te la reservamos en {nombre_negocio}:

📅 {fecha}
⏰ {hora}
👩‍🎨 {profesional}

¡Te esperamos!`},{clave:"lista_espera_hueco",para:"clienta",titulo:"Lista de espera: ¿sigue interesada?",texto:"Hola {cliente}, estás en nuestra lista de espera en {nombre_negocio} para {servicio} el {fecha}. ¿Sigues interesada? Si quieres, te busco un hueco."},{clave:"disponibilidad",para:"clienta",titulo:"Compartir disponibilidad",texto:`{titulo} - {nombre_negocio}
{periodo}
Profesional: {profesional}

{lista}`},{clave:"servicios_precios",para:"clienta",titulo:"Compartir servicios y precios (texto)",texto:`*{nombre_negocio}*
Servicios y precios

{lista}

Reserva tu cita aquí: {enlace}`}],MUESTRA={cliente:"María",whatsapp:"5351234567",servicio:"Manicura",duracion:60,fecha:"viernes 27 de noviembre",hora:"10:00 AM",profesional:"Ana",direccion:"Calle 10 #25",total:"1500 CUP",calendario:"https://…",antes:"jueves 26 a las 9:00 AM",ahora:"viernes 27 a las 10:00 AM",limite:"11:30 AM",enlace:"https://…",premio:"tienes 10% de descuento en tu próxima cita.",frase:"",titulo:"Disponibilidad semanal",periodo:"",lista:"(aquí va la lista que arma la app)",datos_pago:"(aquí van el anticipo y tus datos de pago)",anticipo:"500 CUP"},limpia=clave=>clave.trim().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase(),marcasDe=texto=>(String(texto).match(/\{[^{}]+\}/g)||[]).map(m=>limpia(m.slice(1,-1)));function rellenar(plantilla,datos){const valores=datos||{},tiene=k=>Object.prototype.hasOwnProperty.call(valores,k),vacio=k=>tiene(k)&&String(valores[k]??"").trim()==="";return String(plantilla||"").split(`
`).filter(linea=>!marcasDe(linea).some(k=>SALTAN.includes(k)&&vacio(k))).map(linea=>linea.replace(/\{([^{}]+)\}/g,(marca,c)=>tiene(limpia(c))?String(valores[limpia(c)]??""):marca)).join(`
`).replace(/[ \t]+(\n|$)/g,"$1").replace(/\n{3,}/g,`

`).trim()}function propio(config,clave,datos){const texto=config?.mensajes_whatsapp?.[clave];if(typeof texto!="string"||!texto.trim())return"";const vacias=Object.fromEntries(Object.keys(MUESTRA).map(k=>[k,""]));return rellenar(texto,{...vacias,nombre_negocio:config?.nombre||"",direccion:config?.direccion||"",...datos})}function cambiar(mensajes,clave,texto){const copia={...mensajes||{}},original=MENSAJES.find(m=>m.clave===clave)?.texto||"";return texto==null||texto===original?delete copia[clave]:copia[clave]=String(texto).slice(0,1500),copia}const api={MENSAJES,MUESTRA,marcasDe,rellenar,propio,cambiar};typeof module<"u"&&module.exports&&(module.exports=api),root.mensajesWhatsapp=api})(typeof window<"u"?window:globalThis);
