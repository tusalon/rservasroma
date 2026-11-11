console.log("push-notifications.js cargado"),window.RSERVAS_PUSH_PUBLIC_KEY=window.RSERVAS_PUSH_PUBLIC_KEY||"CONFIGURAR_VAPID_PUBLIC_KEY",window.RSERVAS_PUSH_FUNCTION=window.RSERVAS_PUSH_FUNCTION||"enviar-web-push";function pushKeyConfigurada(){return!!(window.RSERVAS_PUSH_PUBLIC_KEY&&window.RSERVAS_PUSH_PUBLIC_KEY!=="CONFIGURAR_VAPID_PUBLIC_KEY")}function getNegocioIdPush(){return typeof window.getNegocioIdFromConfig=="function"?window.getNegocioIdFromConfig():localStorage.getItem("negocioId")||window.NEGOCIO_ID_POR_DEFECTO||""}function urlBase64ToUint8Array(base64String){const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/"),rawData=atob(base64),outputArray=new Uint8Array(rawData.length);for(let i=0;i<rawData.length;i++)outputArray[i]=rawData.charCodeAt(i);return outputArray}function getRolPush(defaultRole="cliente"){return localStorage.getItem("adminAuth")?"admin":localStorage.getItem("profesionalAuth")?"profesional":defaultRole}function getProfesionalIdPush(){try{return localStorage.getItem("adminAuth")?null:(typeof window.getProfesionalAutenticado=="function"?window.getProfesionalAutenticado():null)?.id||null}catch{return null}}function pedirPermisoNotificacionesPush(){return"Notification"in window?Notification.permission==="granted"||Notification.permission==="denied"?Promise.resolve(Notification.permission):Notification.requestPermission.length===0?Notification.requestPermission():new Promise(resolve=>{Notification.requestPermission(resolve)}):Promise.resolve("unsupported")}function getDiagnosticoPushRservas(){const hasNotification="Notification"in window,hasServiceWorker="serviceWorker"in navigator;return{url:window.location.href,protocol:window.location.protocol,secureContext:!!window.isSecureContext,notificationApi:hasNotification,notificationPermission:hasNotification?Notification.permission:"no disponible",pushManager:"PushManager"in window,serviceWorker:hasServiceWorker,serviceWorkerController:hasServiceWorker?!!navigator.serviceWorker.controller:!1,vapidConfigured:pushKeyConfigurada(),standalone:!!(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||!!window.navigator.standalone,userAgent:navigator.userAgent||""}}function formatearDiagnosticoPush(diagnostico,error=null){const lineas=["Diagnostico de notificaciones:",`Permiso: ${diagnostico.notificationPermission}`,`Contexto seguro: ${diagnostico.secureContext?"si":"no"}`,`Notification API: ${diagnostico.notificationApi?"si":"no"}`,`PushManager: ${diagnostico.pushManager?"si":"no"}`,`Service Worker: ${diagnostico.serviceWorker?"si":"no"}`,`Service Worker activo: ${diagnostico.serviceWorkerController?"si":"no"}`,`Llave VAPID: ${diagnostico.vapidConfigured?"configurada":"sin configurar"}`,`Modo app instalada: ${diagnostico.standalone?"si":"no"}`];return error&&lineas.push(`Error: ${error.message||error}`),diagnostico.notificationPermission==="denied"?(lineas.push(""),lineas.push("Chrome tiene bloqueado el permiso. En Android revisa:"),lineas.push("1. Ajustes del telefono > Apps > Chrome > Notificaciones."),lineas.push("2. Chrome > Configuracion > Configuracion de sitios > Notificaciones."),lineas.push("3. Si no aparece tusalon.github.io, activa que los sitios puedan pedir permiso y vuelve a tocar el boton.")):diagnostico.notificationPermission==="default"&&(lineas.push(""),lineas.push("El permiso quedo sin aceptar. Vuelve a tocar el boton y acepta el aviso del navegador.")),lineas.join(`
`)}window.diagnosticarPushRservasRoma=function(error=null,mostrarAlerta=!0){const diagnostico=getDiagnosticoPushRservas();return console.table(diagnostico),mostrarAlerta&&alert(formatearDiagnosticoPush(diagnostico,error)),diagnostico};async function getRegistroServiceWorkerPush(){return"serviceWorker"in navigator&&await navigator.serviceWorker.ready||null}async function desactivarOtrosPerfilesWebStaff(endpoint,role){if(role==="cliente")return;const endpointEncoded=encodeURIComponent(endpoint),response=await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones?endpoint=eq.${endpointEncoded}&role=neq.cliente`,{method:"PATCH",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({activo:!1,updated_at:new Date().toISOString()})});response.ok||console.warn("[Push] No se pudieron desactivar perfiles staff anteriores:",await response.text())}async function guardarSuscripcionPush(subscription,role,clienteWhatsapp,profesionalId){const negocioId=getNegocioIdPush();if(console.log("[Push] guardarSuscripcionPush - negocioId:",negocioId,"role:",role,"cliente:",clienteWhatsapp||"sin whatsapp","profesional:",profesionalId||"sin profesional"),!negocioId)throw new Error("No hay negocio_id para guardar la suscripcion push.");const payload={negocio_id:negocioId,role,endpoint:subscription.endpoint,subscription,user_agent:navigator.userAgent||"",activo:!0,updated_at:new Date().toISOString()};clienteWhatsapp&&(payload.cliente_whatsapp=clienteWhatsapp),role==="profesional"&&profesionalId&&(payload.profesional_id=profesionalId),role==="admin"&&(payload.profesional_id=null),await desactivarOtrosPerfilesWebStaff(payload.endpoint,role),console.log("[Push] endpoint:",subscription.endpoint?.substring(0,60)),console.log("[Push] SUPABASE_URL:",window.SUPABASE_URL);const upsertUrl=`${window.SUPABASE_URL}/rest/v1/push_suscripciones?on_conflict=endpoint,negocio_id,role`,legacyUpsertUrl=`${window.SUPABASE_URL}/rest/v1/push_suscripciones?on_conflict=endpoint`;let response=await fetch(upsertUrl,{method:"POST",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)});if(!response.ok){const firstError=await response.clone().text();/42P10|no unique or exclusion constraint/i.test(firstError)&&(console.warn("[Push] Falta aplicar el SQL multinegocio; usando compatibilidad temporal."),response=await fetch(legacyUpsertUrl,{method:"POST",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)}))}if(console.log("[Push] respuesta HTTP:",response.status),!response.ok){const errorText=await response.text();if(payload.profesional_id!==void 0&&/profesional_id/i.test(errorText)&&(console.warn("[Push] La columna profesional_id aun no existe; guardando suscripcion sin filtro profesional."),delete payload.profesional_id,response=await fetch(upsertUrl,{method:"POST",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)}),response.ok))return console.log("[Push] suscripcion guardada OK sin profesional_id"),localStorage.setItem("rservasPushActivo","true"),localStorage.setItem("rservasPushRole",role),role==="cliente"&&clienteWhatsapp&&marcarClientePushActivoLocal(negocioId,clienteWhatsapp),window.dispatchEvent(new CustomEvent("rservas-push-status-changed")),!0;throw console.error("[Push] error guardando:",errorText),new Error(`No se pudo guardar la suscripcion push: ${errorText}`)}return console.log("[Push] suscripcion guardada OK"),localStorage.setItem("rservasPushActivo","true"),localStorage.setItem("rservasPushRole",role),role==="cliente"&&clienteWhatsapp?marcarClientePushActivoLocal(negocioId,clienteWhatsapp):role!=="cliente"&&localStorage.removeItem("rservasPushClienteWhatsapp"),role==="profesional"&&profesionalId?localStorage.setItem("rservasPushProfesionalId",String(profesionalId)):localStorage.removeItem("rservasPushProfesionalId"),window.dispatchEvent(new CustomEvent("rservas-push-status-changed")),!0}window.pushRservasDisponible=function(){return!!("serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&pushKeyConfigurada())},window.solicitarPushRservasRoma=async function(options={}){const role=options.role||options.rol||getRolPush(options.defaultRole||"cliente"),profesionalId=options.profesionalId||options.profesional_id||getProfesionalIdPush();if(!pushKeyConfigurada())return console.warn("Push: falta clave VAPID pública"),{ok:!1,error:"vapid_key_missing"};if(!("Notification"in window)||!("PushManager"in window)||!("serviceWorker"in navigator))return console.warn("Push: navegador no compatible"),{ok:!1,error:"not_supported"};const permission=options.permission||await pedirPermisoNotificacionesPush();if(permission!=="granted")return console.warn("Push: permiso no concedido:",permission),{ok:!1,error:"permission_"+permission};const registration=await getRegistroServiceWorkerPush();if(!registration)return console.warn("Push: Service Worker no disponible"),{ok:!1,error:"sw_not_ready"};try{console.log("[Push] VAPID key:",window.RSERVAS_PUSH_PUBLIC_KEY?.substring(0,20));let subscription=await registration.pushManager.getSubscription();return console.log("[Push] suscripcion existente:",subscription?"SI":"NO"),subscription||(console.log("[Push] creando nueva suscripcion..."),subscription=await registration.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:urlBase64ToUint8Array(window.RSERVAS_PUSH_PUBLIC_KEY)}),console.log("[Push] suscripcion creada:",subscription.endpoint?.substring(0,60))),await guardarSuscripcionPush(subscription.toJSON?subscription.toJSON():subscription,role,options.clienteWhatsapp,profesionalId),{ok:!0}}catch(err){return console.error("[Push] error:",err.name,err.message),{ok:!1,error:err.message}}},window.enviarPushCliente=async function({whatsapp,title,body,url=""}={}){try{if(!whatsapp||!title)return!1;const negocioId=getNegocioIdPush();if(!negocioId||!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY)return!1;let destinoUrl=url;if(!destinoUrl&&typeof window.construirUrlClientesNegocio=="function"){const config=await window.cargarConfiguracionNegocio?.().catch(()=>null);destinoUrl=window.construirUrlClientesNegocio(config||{})}const result=await(await fetch(`${window.SUPABASE_URL}/functions/v1/${window.RSERVAS_PUSH_FUNCTION}`,{method:"POST",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({negocio_id:negocioId,cliente_whatsapp:whatsapp,title,body,url:destinoUrl})})).json().catch(()=>({}));return result?.sent>0&&console.log(`[Push cliente] Enviado a ${whatsapp}`),result?.sent>0}catch(err){return console.warn("[Push cliente] Error:",err.message),!1}},window.enviarWebPushRservasRoma=async function({title,body,url="",role="admin",tags="bell",data={},profesionalId=null,profesional_id=null}={}){try{if(!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY)return!1;const negocioId=getNegocioIdPush();if(!negocioId)return!1;const response=await fetch(`${window.SUPABASE_URL}/functions/v1/${window.RSERVAS_PUSH_FUNCTION}`,{method:"POST",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({negocio_id:negocioId,role,title,body,url,tags,data,profesional_id:profesionalId||profesional_id||null})});if(!response.ok)return console.warn("Web Push no enviado:",await response.text()),!1;const result=await response.json().catch(()=>({}));return Number(result?.sent||0)===0?(console.warn("Web/FCM Push procesado sin destinatarios activos"),!1):!0}catch(error){return console.warn("Web Push opcional fallo:",error),!1}};async function refrescarSuscripcionPushActual(){try{if(!pushKeyConfigurada()||!("Notification"in window)||Notification.permission!=="granted"||!("PushManager"in window)||!("serviceWorker"in navigator))return;!window._negocioIdResuelto&&window._negocioResolvePromise&&await window._negocioResolvePromise;const subscription=await(await getRegistroServiceWorkerPush())?.pushManager?.getSubscription?.();if(!subscription)return;const serializada=subscription.toJSON?subscription.toJSON():subscription;if(!!(localStorage.getItem("adminAuth")||localStorage.getItem("profesionalAuth"))){const role=getRolPush("admin"),profesionalId=getProfesionalIdPush();await guardarSuscripcionPush(serializada,role,null,profesionalId);return}const clienteWhatsapp=getClienteWhatsappPushActual();clienteWhatsapp&&await guardarSuscripcionPush(serializada,"cliente",clienteWhatsapp,null)}catch(error){console.warn("[Push] No se pudo refrescar la suscripcion actual:",error.message)}}function getPushContext(){const userAgent=navigator.userAgent||"",isIOS=/iPhone|iPad|iPod/i.test(userAgent),isAndroid=/Android/i.test(userAgent),isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone,nativePlatform=window.Capacitor?.getPlatform?.()||"",isNative=!!window.Capacitor?.isNativePlatform?.()||nativePlatform==="android"||nativePlatform==="ios",permiso="Notification"in window?Notification.permission:"unsupported",suscritoWeb=localStorage.getItem("rservasPushActivo")==="true",suscritoNativo=typeof window.nativePushActivoParaContexto=="function"?window.nativePushActivoParaContexto():localStorage.getItem("rservasNativePushActivo")==="true";return{isIOS,isAndroid,isStandalone,isNative,nativePlatform,permiso,suscritoWeb,suscritoNativo}}function mostrarToastPush(mensaje,tipo="ok"){const existing=document.getElementById("rservas-push-toast");existing&&existing.remove();const toast=document.createElement("div");toast.id="rservas-push-toast";const color=tipo==="ok"?"#16a34a":tipo==="error"?"#dc2626":"#0f766e";toast.style.cssText=["position:fixed","top:20px","left:50%","transform:translateX(-50%)",`background:${color}`,"color:#fff","padding:12px 20px","border-radius:12px","font-size:14px","font-weight:600","z-index:99999","box-shadow:0 8px 24px rgba(0,0,0,.35)","font-family:system-ui,sans-serif","transition:opacity 0.4s ease","max-width:90vw","text-align:center"].join(";"),toast.textContent=mensaje,document.body.appendChild(toast),setTimeout(()=>{toast.style.opacity="0",setTimeout(()=>toast.remove(),400)},3500)}function getClienteWhatsappPushActual(){try{const clienteAuth=typeof window.getClienteAuthActual=="function"?window.getClienteAuthActual():JSON.parse(localStorage.getItem("clienteAuth")||"null");return clienteAuth?.whatsapp||clienteAuth?.telefono||localStorage.getItem("clienteWhatsapp")||""}catch{return localStorage.getItem("clienteWhatsapp")||""}}function normalizarWhatsappPush(whatsapp){return String(whatsapp||"").replace(/[^0-9]/g,"")}function getClientesPushPorNegocio(){try{const value=JSON.parse(localStorage.getItem("rservasPushClientesPorNegocio")||"{}");return value&&typeof value=="object"&&!Array.isArray(value)?value:{}}catch{return{}}}function marcarClientePushActivoLocal(negocioId,whatsapp){if(!negocioId||!whatsapp)return;const clientes=getClientesPushPorNegocio();clientes[String(negocioId)]={whatsapp:normalizarWhatsappPush(whatsapp),updatedAt:new Date().toISOString()},localStorage.setItem("rservasPushClientesPorNegocio",JSON.stringify(clientes)),localStorage.setItem("rservasPushClienteWhatsapp",String(whatsapp))}window.getClienteWhatsappPushActual=getClienteWhatsappPushActual,window.marcarClientePushActivoLocal=marcarClientePushActivoLocal;function clientePushActivo(){const negocioId=String(getNegocioIdPush()||""),whatsappActual=normalizarWhatsappPush(getClienteWhatsappPushActual()),registro=negocioId?getClientesPushPorNegocio()[negocioId]:null,whatsappSuscrito=normalizarWhatsappPush(registro?.whatsapp),isNative=!!window.Capacitor?.isNativePlatform?.(),canalActivo=isNative?localStorage.getItem("rservasNativePushActivo")==="true"&&localStorage.getItem("rservasNativePushRole")==="cliente":localStorage.getItem("rservasPushActivo")==="true"&&localStorage.getItem("rservasPushRole")==="cliente",permisoActivo=isNative||!("Notification"in window)||Notification.permission==="granted";return!!(negocioId&&registro)&&canalActivo&&(!whatsappActual||whatsappActual===whatsappSuscrito)&&permisoActivo}window.clientePushActivo=clientePushActivo;function instalarIndicadorPushCliente(){if(localStorage.getItem("adminAuth")||localStorage.getItem("profesionalAuth")||!pushKeyConfigurada()||!!!window.Capacitor?.isNativePlatform?.()&&(!("Notification"in window)||!("PushManager"in window)||!("serviceWorker"in navigator)))return;let button=document.getElementById("rservas-client-push-indicator");if(!button){if(!document.getElementById("rservas-client-push-indicator-style")){const style=document.createElement("style");style.id="rservas-client-push-indicator-style",style.textContent=`
                @keyframes rservasClientBellRing {
                    0%, 100% { transform: rotate(0deg); }
                    15% { transform: rotate(13deg); }
                    30% { transform: rotate(-11deg); }
                    45% { transform: rotate(8deg); }
                    60% { transform: rotate(-6deg); }
                    75% { transform: rotate(3deg); }
                }
                /* Abajo, junto a soporte: arriba a la derecha tapaba la cabecera
                   ("Mis citas", salir). Con los avisos ya activos se oculta. */
                #rservas-client-push-indicator {
                    position: fixed;
                    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
                    left: 76px;
                    width: 48px;
                    height: 48px;
                    border: 0;
                    border-radius: 999px;
                    background: #fff;
                    color: #111827;
                    box-shadow: 0 4px 8px rgba(17,12,46,.04), 0 12px 28px rgba(17,12,46,.10);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9996;
                    cursor: pointer;
                    transition: background .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease;
                    -webkit-tap-highlight-color: transparent;
                }
                #rservas-client-push-indicator:disabled {
                    cursor: wait;
                    opacity: .75;
                }
                #rservas-client-push-indicator i {
                    font-size: 20px;
                    line-height: 1;
                    transform-origin: 50% 0;
                }
                #rservas-client-push-indicator.is-active {
                    display: none;
                }
                #rservas-client-push-indicator.is-active i {
                    animation: rservasClientBellRing 1.45s ease-in-out infinite;
                }
                #rservas-client-push-indicator.is-off {
                    color: #6b7280;
                }
                #rservas-client-push-indicator.is-off::after {
                    content: "";
                    position: absolute;
                    width: 25px;
                    height: 3px;
                    border-radius: 999px;
                    background: #dc2626;
                    transform: rotate(-42deg);
                    box-shadow: 0 0 0 2px #fff;
                }
            `,document.head.appendChild(style)}button=document.createElement("button"),button.id="rservas-client-push-indicator",button.type="button",button.innerHTML='<i class="icon-bell"></i>',document.body.appendChild(button),button.addEventListener("click",async()=>{if(clientePushActivo()){mostrarToastPush("Notificaciones activas");return}button.disabled=!0;try{const whatsapp=getClienteWhatsappPushActual(),native=!!window.Capacitor?.isNativePlatform?.();if((native&&typeof window.solicitarNativePushRservasRoma=="function"?{ok:await window.solicitarNativePushRservasRoma({role:"cliente",clienteWhatsapp:whatsapp||void 0})}:await(async()=>{const permission=await pedirPermisoNotificacionesPush();return window.solicitarPushRservasRoma({defaultRole:"cliente",permission,clienteWhatsapp:whatsapp||void 0})})())?.ok)mostrarToastPush("✅ Recordatorios activados");else if(!native){const permisoActual="Notification"in window?Notification.permission:"unsupported",ctx=getPushContext();ctx.isIOS&&!ctx.isStandalone?_mostrarCardIOSInstruccionesCliente():permisoActual==="denied"?_mostrarCardBloqueado(ctx):permisoActual==="unsupported"?_mostrarCardNoSoportado(ctx):mostrarToastPush("No se pudo activar. Intenta de nuevo.","error")}}catch(error){console.warn("[Push cliente] No se pudo activar desde campana:",error.message),mostrarToastPush(error.message||"No se pudo activar.","error")}finally{button.disabled=!1,actualizarIndicadorPushCliente()}})}actualizarIndicadorPushCliente()}function actualizarIndicadorPushCliente(){const button=document.getElementById("rservas-client-push-indicator");if(!button)return;const activo=clientePushActivo();button.classList.toggle("is-active",activo),button.classList.toggle("is-off",!activo),button.title=activo?"Notificaciones activas":"Activar notificaciones",button.setAttribute("aria-label",button.title)}function instalarIndicadorPushAdmin(){if(!localStorage.getItem("adminAuth")&&!localStorage.getItem("profesionalAuth"))return;let button=document.getElementById("rservas-push-indicator");if(!button){if(!document.getElementById("rservas-push-indicator-style")){const style=document.createElement("style");style.id="rservas-push-indicator-style",style.textContent=`
                @keyframes rservasBellRing {
                    0%, 100% { transform: rotate(0deg); }
                    15% { transform: rotate(14deg); }
                    30% { transform: rotate(-12deg); }
                    45% { transform: rotate(9deg); }
                    60% { transform: rotate(-7deg); }
                    75% { transform: rotate(4deg); }
                }
                /* Abajo, junto al botón de soporte y por encima de la barra de secciones
                   del panel: arriba a la derecha tapaba "Actualizar / Salir / ES". Con los
                   avisos ya activos se oculta, como en la app de clientas. */
                #rservas-push-indicator {
                    position: fixed;
                    bottom: calc(env(safe-area-inset-bottom, 0px) + 92px);
                    left: 72px;
                    width: 48px;
                    height: 48px;
                    border: 0;
                    border-radius: 999px;
                    background: #fff;
                    color: #111827;
                    box-shadow: 0 4px 8px rgba(17,12,46,.04), 0 12px 28px rgba(17,12,46,.10);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9997;
                    cursor: pointer;
                    transition: background .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease;
                    -webkit-tap-highlight-color: transparent;
                }
                #rservas-push-indicator:disabled {
                    cursor: wait;
                    opacity: .75;
                }
                #rservas-push-indicator i {
                    font-size: 22px;
                    line-height: 1;
                    transform-origin: 50% 0;
                }
                #rservas-push-indicator.is-active {
                    display: none;
                }
                #rservas-push-indicator.is-active i {
                    animation: rservasBellRing 1.35s ease-in-out infinite;
                }
                #rservas-push-indicator.is-off {
                    background: #fff;
                    color: #6b7280;
                }
                #rservas-push-indicator.is-off::after {
                    content: "";
                    position: absolute;
                    width: 28px;
                    height: 3px;
                    border-radius: 999px;
                    background: #dc2626;
                    transform: rotate(-42deg);
                    box-shadow: 0 0 0 2px #fff;
                }
                #rservas-push-indicator:hover {
                    transform: translateY(-1px);
                }
            `,document.head.appendChild(style)}button=document.createElement("button"),button.id="rservas-push-indicator",button.type="button",button.innerHTML='<i class="icon-bell"></i>',document.body.appendChild(button),button.addEventListener("click",async()=>{const ctx=getPushContext();if(ctx.isNative?ctx.suscritoNativo:ctx.suscritoWeb&&ctx.permiso==="granted"){mostrarToastPush("Notificaciones activas");return}button.disabled=!0;try{if((ctx.isNative&&typeof window.solicitarNativePushRservasRoma=="function"?{ok:await window.solicitarNativePushRservasRoma({defaultRole:getRolPush()})}:await(async()=>{const permission=await pedirPermisoNotificacionesPush();return window.solicitarPushRservasRoma({defaultRole:getRolPush(),permission})})())?.ok){localStorage.setItem("rservasPushCardDismissed","true");const card=document.getElementById("rservas-push-card");card&&card.remove(),mostrarToastPush("✅ Notificaciones activadas")}else mostrarToastPush("No se pudo activar. Intenta de nuevo.","error")}catch(error){console.warn("[Push] No se pudo activar desde campana:",error.message),mostrarToastPush(error.message||"No se pudo activar.","error")}finally{button.disabled=!1,actualizarIndicadorPushAdmin()}})}actualizarIndicadorPushAdmin()}function actualizarIndicadorPushAdmin(){const button=document.getElementById("rservas-push-indicator");if(!button)return;const ctx=getPushContext(),activo=ctx.isNative?ctx.suscritoNativo:ctx.suscritoWeb&&ctx.permiso==="granted";button.classList.toggle("is-active",activo),button.classList.toggle("is-off",!activo),button.title=activo?"Notificaciones activas":"Activar notificaciones",button.setAttribute("aria-label",button.title)}window.actualizarIndicadorPushAdmin=actualizarIndicadorPushAdmin,window.addEventListener("rservas-push-status-changed",actualizarIndicadorPushAdmin),window.addEventListener("rservas-push-status-changed",actualizarIndicadorPushCliente),window.addEventListener("storage",event=>{/^rservas(Native)?Push/.test(event.key||"")&&(actualizarIndicadorPushAdmin(),actualizarIndicadorPushCliente())});function instalarCardPushAdmin(){if(document.getElementById("rservas-push-card")||!pushKeyConfigurada()||!localStorage.getItem("adminAuth")&&!localStorage.getItem("profesionalAuth")||localStorage.getItem("rservasPushCardDismissed")==="true")return;const ctx=getPushContext();if(!(ctx.isNative&&ctx.suscritoNativo)&&!(!ctx.isNative&&ctx.suscritoWeb&&ctx.permiso==="granted")){if(ctx.isNative){_mostrarCardPermisoNormal();return}if(ctx.isIOS&&!ctx.isStandalone){_mostrarCardIOSInstrucciones();return}if(ctx.permiso==="unsupported"){_mostrarCardNoSoportado(ctx);return}if(ctx.permiso==="denied"){_mostrarCardBloqueado();return}_mostrarCardPermisoNormal()}}function _crearCardBase(){const card=document.createElement("div");return card.id="rservas-push-card",card.style.cssText=["position:fixed","bottom:24px","left:50%","transform:translateX(-50%) translateY(120px)","background:#1C1C1E","border:1px solid rgba(255,255,255,0.10)","border-radius:20px","padding:18px 20px","width:calc(100% - 40px)","max-width:400px","z-index:9998","box-shadow:0 20px 60px rgba(0,0,0,.55)","font-family:system-ui,-apple-system,sans-serif","transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)","display:flex","align-items:flex-start","gap:14px"].join(";"),document.body.appendChild(card),requestAnimationFrame(()=>{requestAnimationFrame(()=>{card.style.transform="translateX(-50%) translateY(0)"})}),card}const CERRAR_BTN_STYLE="position:absolute;top:12px;right:14px;background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:4px;line-height:1";function _cerrarCard(card){card.style.transform="translateX(-50%) translateY(120px)",setTimeout(()=>card.remove(),400),localStorage.setItem("rservasPushCardDismissed","true")}function _mostrarCardPermisoNormal(){const card=_crearCardBase();card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">🔔</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Activa las notificaciones
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.4;margin-bottom:14px">
                Recibe avisos de nuevas reservas, cancelaciones y pagos al instante.
            </div>
            <button id="rservas-push-activar" style="
                background:#FF1493;color:#fff;border:none;border-radius:10px;
                padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;
                width:100%;font-family:inherit
            ">Activar notificaciones</button>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCard(card),document.getElementById("rservas-push-activar").addEventListener("click",async function(){this.disabled=!0,this.textContent="Activando...";const ctx=getPushContext(),result=ctx.isNative&&typeof window.solicitarNativePushRservasRoma=="function"?{ok:await window.solicitarNativePushRservasRoma({defaultRole:getRolPush()})}:await(async()=>{const permission=await pedirPermisoNotificacionesPush();return window.solicitarPushRservasRoma({defaultRole:getRolPush(),permission})})(),permisoActual="Notification"in window?Notification.permission:"unsupported";result?.ok?(localStorage.setItem("rservasPushCardDismissed","true"),card.style.transform="translateX(-50%) translateY(120px)",setTimeout(()=>card.remove(),400),mostrarToastPush("✅ Notificaciones activadas")):ctx.isNative?(this.disabled=!1,this.textContent="Activar notificaciones",mostrarToastPush("No se pudo activar el canal nativo. Cierra y vuelve a abrir la APK.","error")):permisoActual==="denied"?(card.remove(),_mostrarCardBloqueado()):permisoActual==="unsupported"?(card.remove(),_mostrarCardNoSoportado(ctx)):(this.disabled=!1,this.textContent="Activar notificaciones",mostrarToastPush("No se pudo activar. Intenta de nuevo.","error"))})}function _mostrarCardBloqueado(ctx=getPushContext()){const card=_crearCardBase(),pasos=ctx.isIOS?'Ajustes de iOS → Notificaciones → busca esta app → activa <strong style="color:#d1d5db">Permitir notificaciones</strong>.':'Chrome → ⋮ → Configuración → Configuración de sitios → <strong style="color:#d1d5db">Notificaciones</strong>.';card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">🚫</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Notificaciones bloqueadas
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                Actívalas manualmente:<br>
                ${pasos}
            </div>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCard(card)}function _mostrarCardNoSoportado(ctx=getPushContext()){const card=_crearCardBase(),esIOS=ctx.isIOS,titulo=esIOS?"Tu iPhone no puede recibir notificaciones":"Este navegador no admite notificaciones",detalle=esIOS?'Apple agregó esta función a partir de <strong style="color:#d1d5db">iOS 16.4</strong>. Actualiza tu iPhone en Ajustes → General → Actualización de Software.':"Abre el enlace con Chrome actualizado o utiliza la APK de Rservasroma.";card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">⚠️</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                ${titulo}
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                ${detalle}
            </div>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCard(card)}function _mostrarCardIOSInstrucciones(){const card=_crearCardBase();card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">📲</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Instala la app para recibir notificaciones
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                En iPhone, toca <strong style="color:#d1d5db">Compartir</strong> →
                <strong style="color:#d1d5db">Agregar a pantalla de inicio</strong>.
                Luego abre la app desde ahí y activa las notificaciones.
            </div>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCard(card)}function _cerrarCardCliente(card){card.style.transform="translateX(-50%) translateY(120px)",setTimeout(()=>card.remove(),400),localStorage.setItem("rservasPushCardClienteDismissed","true")}function _mostrarCardIOSInstruccionesCliente(){const card=_crearCardBase();card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">📲</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Recibe recordatorios de tu cita
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                En iPhone, toca <strong style="color:#d1d5db">Compartir</strong> →
                <strong style="color:#d1d5db">Agregar a pantalla de inicio</strong>.
                Luego abre la app desde ahí y activa las notificaciones.
            </div>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCardCliente(card)}function _mostrarCardPermisoNormalCliente(){const card=_crearCardBase();card.innerHTML=`
        <button id="rservas-push-cerrar" style="${CERRAR_BTN_STYLE}">✕</button>
        <div style="font-size:28px;flex-shrink:0;line-height:1">🔔</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Activa los recordatorios de tu cita
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.4;margin-bottom:14px">
                Te avisamos 24 h y 1 h antes de tu turno, y si hay algún cambio o cancelación.
            </div>
            <button id="rservas-push-activar" style="
                background:#FF1493;color:#fff;border:none;border-radius:10px;
                padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;
                width:100%;font-family:inherit
            ">Activar recordatorios</button>
        </div>
    `,document.getElementById("rservas-push-cerrar").onclick=()=>_cerrarCardCliente(card),document.getElementById("rservas-push-activar").addEventListener("click",async function(){this.disabled=!0,this.textContent="Activando...";const ctx=getPushContext(),whatsapp=getClienteWhatsappPushActual(),result=ctx.isNative&&typeof window.solicitarNativePushRservasRoma=="function"?{ok:await window.solicitarNativePushRservasRoma({role:"cliente",clienteWhatsapp:whatsapp||void 0})}:await(async()=>{const permission=await pedirPermisoNotificacionesPush();return window.solicitarPushRservasRoma({defaultRole:"cliente",permission,clienteWhatsapp:whatsapp||void 0})})(),permisoActual="Notification"in window?Notification.permission:"unsupported";result?.ok?(localStorage.setItem("rservasPushCardClienteDismissed","true"),card.style.transform="translateX(-50%) translateY(120px)",setTimeout(()=>card.remove(),400),mostrarToastPush("✅ Recordatorios activados"),actualizarIndicadorPushCliente()):ctx.isNative?(this.disabled=!1,this.textContent="Activar recordatorios",mostrarToastPush("No se pudo activar. Cierra y vuelve a abrir la app.","error")):permisoActual==="denied"?(card.remove(),_mostrarCardBloqueado(ctx)):permisoActual==="unsupported"?(card.remove(),_mostrarCardNoSoportado(ctx)):(this.disabled=!1,this.textContent="Activar recordatorios",mostrarToastPush("No se pudo activar. Intenta de nuevo.","error"))})}function instalarCardPushCliente(){if(document.getElementById("rservas-push-card")||localStorage.getItem("adminAuth")||localStorage.getItem("profesionalAuth")||!pushKeyConfigurada()||localStorage.getItem("rservasPushCardClienteDismissed")==="true"||clientePushActivo())return;const ctx=getPushContext();if(ctx.isNative){_mostrarCardPermisoNormalCliente();return}if(ctx.isIOS&&!ctx.isStandalone){_mostrarCardIOSInstruccionesCliente();return}if(ctx.permiso==="unsupported"){_mostrarCardNoSoportado(ctx);return}if(ctx.permiso==="denied"){_mostrarCardBloqueado(ctx);return}_mostrarCardPermisoNormalCliente()}window.RSERVAS_PUSH_UI_VISIBLE===!0&&window.addEventListener("load",()=>{setTimeout(instalarIndicadorPushCliente,700),setTimeout(instalarIndicadorPushAdmin,800),setTimeout(refrescarSuscripcionPushActual,1200),setTimeout(instalarCardPushAdmin,2e3),setTimeout(instalarCardPushCliente,2200)});
