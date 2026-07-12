// utils/push-config.js
// Pega aqui la llave publica VAPID cuando actives Web Push.

window.RSERVAS_PUSH_PUBLIC_KEY = 'BBiW2ZRGmtS35uTqW_Cc77VKtaf8v_lIovQ5mErGUQeTr1K29dNqOuRhMAcFH0u3m5SKbvgFse1CLWqAcVtZ074';
window.RSERVAS_PUSH_FUNCTION = 'enviar-web-push';

// Interruptor de la UI de notificaciones push (boton "Activar recordatorios",
// guias de instalacion para recordatorios, etc.). OCULTA hasta resolver el
// problema pendiente de Supabase. Para reactivar: cambiar a true y subir el
// ?v= de push-config.js en index.html/admin.html + CACHE_NAME en sw.js.
window.RSERVAS_PUSH_UI_VISIBLE = false;
