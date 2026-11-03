// utils/avisos-panel.js
// Avisos y confirmaciones propios del panel en lugar de los cuadros del
// navegador. En el teléfono, alert()/confirm() salen como "tusalon.github.io
// dice…", con botones del sistema y sin el color del salón: un "Cambios
// guardados" parecía un error. Aquí salen como una franja abajo (avisar) o una
// ventana con el color del salón (confirmar, pedirTexto).
//
// confirmar() y pedirTexto() devuelven una promesa: quien los usa hace
// `if (!(await window.confirmar('¿Eliminar…?'))) return;`.

(function () {
    'use strict';

    var t = function (s) { return window.t ? window.t(s) : s; };

    function estilos() {
        if (document.getElementById('avisos-panel-css')) return;
        var st = document.createElement('style');
        st.id = 'avisos-panel-css';
        st.textContent = [
            '.avp-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 88px);transform:translateX(-50%) translateY(12px);',
            'max-width:min(92vw,440px);background:#1f1a24;color:#fff;border-radius:14px;padding:12px 16px;font:600 14px/1.4 Inter,system-ui,sans-serif;',
            'white-space:pre-line;box-shadow:0 10px 30px rgba(17,12,46,.3);z-index:2147483600;opacity:0;transition:opacity .2s,transform .2s;cursor:pointer;border-left:4px solid #22c55e}',
            '.avp-toast.avp-error{border-left-color:#ef4444}',
            '.avp-toast.avp-ver{opacity:1;transform:translateX(-50%) translateY(0)}',
            '.avp-fondo{position:fixed;inset:0;background:rgba(17,12,24,.5);z-index:2147483601;display:flex;align-items:center;justify-content:center;padding:16px}',
            '.avp-caja{background:#fff;color:#1f1a24;border-radius:20px;padding:22px 20px 18px;width:100%;max-width:400px;box-shadow:0 20px 50px rgba(17,12,46,.3);font:400 15px/1.5 Inter,system-ui,sans-serif}',
            '.avp-caja p{margin:0 0 18px;white-space:pre-line;font-weight:600}',
            '.avp-caja input,.avp-caja textarea{width:100%;box-sizing:border-box;border:2px solid #e5e0ea;border-radius:12px;padding:11px 12px;font:15px Inter,system-ui,sans-serif;margin:-6px 0 18px;color:#1f1a24;background:#fff}',
            '.avp-caja textarea{min-height:110px;resize:vertical}',
            '.avp-botones{display:flex;gap:10px}',
            '.avp-botones button{flex:1;min-height:46px;border:0;border-radius:999px;font:700 15px Inter,system-ui,sans-serif;cursor:pointer}',
            '.avp-no{background:#f1ecf6;color:#1f1a24}',
            '.avp-si{background:var(--brand-primary,#FF1493);color:#fff}',
            '.avp-si.avp-peligro{background:#dc2626}',
            '@media (prefers-reduced-motion:reduce){.avp-toast{transition:none}}'
        ].join('');
        document.head.appendChild(st);
    }

    function esError(m) {
        return /^(error|no se pud|no tienes|ese horario ya no|falt)/i.test(String(m).trim());
    }

    var toastActual = null;
    function avisar(mensaje, tipo) {
        if (!document.body) return;
        estilos();
        if (toastActual) toastActual.remove();
        var texto = String(mensaje == null ? '' : mensaje);
        var el = document.createElement('div');
        el.className = 'avp-toast' + ((tipo === 'error' || (!tipo && esError(texto))) ? ' avp-error' : '');
        el.setAttribute('role', 'status');
        el.textContent = texto;
        el.onclick = function () { el.remove(); };
        document.body.appendChild(el);
        toastActual = el;
        requestAnimationFrame(function () { el.classList.add('avp-ver'); });
        // Mensajes largos (resultados de importar, por ejemplo) se quedan más.
        var ms = Math.min(9000, Math.max(3200, texto.length * 55));
        setTimeout(function () {
            el.classList.remove('avp-ver');
            setTimeout(function () { el.remove(); if (toastActual === el) toastActual = null; }, 250);
        }, ms);
    }

    // Botón rojo para lo que borra o no se puede deshacer.
    var PELIGRO = /eliminar|borrar|bloquear|rechazar|cancelar|ausente|deshacer|en 0/i;

    function ventana(mensaje, opciones, conTexto) {
        estilos();
        opciones = opciones || {};
        return new Promise(function (resolver) {
            var fondo = document.createElement('div');
            fondo.className = 'avp-fondo';
            var caja = document.createElement('div');
            caja.className = 'avp-caja';
            caja.setAttribute('role', 'dialog');
            caja.setAttribute('aria-modal', 'true');
            var p = document.createElement('p');
            p.textContent = String(mensaje == null ? '' : mensaje);
            caja.appendChild(p);
            var campo = null;
            if (conTexto) {
                campo = document.createElement(opciones.largo ? 'textarea' : 'input');
                campo.value = opciones.inicial || '';
                caja.appendChild(campo);
            }
            var botones = document.createElement('div');
            botones.className = 'avp-botones';
            var no = document.createElement('button');
            no.type = 'button';
            no.className = 'avp-no';
            no.textContent = opciones.no || (conTexto ? t('Cancelar') : t('No'));
            var si = document.createElement('button');
            si.type = 'button';
            var peligro = opciones.peligro != null ? opciones.peligro : (!conTexto && PELIGRO.test(String(mensaje)));
            si.className = 'avp-si' + (peligro ? ' avp-peligro' : '');
            si.textContent = opciones.si || (conTexto ? t('Aceptar') : t('Sí'));
            botones.appendChild(no);
            botones.appendChild(si);
            caja.appendChild(botones);
            fondo.appendChild(caja);

            function cerrar(valor) {
                document.removeEventListener('keydown', teclas, true);
                fondo.remove();
                resolver(valor);
            }
            function teclas(e) {
                if (e.key === 'Escape') { e.preventDefault(); cerrar(conTexto ? null : false); }
                if (e.key === 'Enter' && !(campo && campo.tagName === 'TEXTAREA')) { e.preventDefault(); cerrar(conTexto ? campo.value : true); }
            }
            no.onclick = function () { cerrar(conTexto ? null : false); };
            si.onclick = function () { cerrar(conTexto ? campo.value : true); };
            fondo.onclick = function (e) { if (e.target === fondo) cerrar(conTexto ? null : false); };
            document.addEventListener('keydown', teclas, true);
            document.body.appendChild(fondo);
            (campo || si).focus();
            if (campo && campo.select) campo.select();
        });
    }

    function confirmar(mensaje, opciones) { return ventana(mensaje, opciones, false); }
    function pedirTexto(mensaje, inicial, opciones) {
        return ventana(mensaje, Object.assign({ inicial: inicial || '' }, opciones || {}), true);
    }

    if (typeof window !== 'undefined') {
        window.avisar = avisar;
        window.confirmar = confirmar;
        window.pedirTexto = pedirTexto;
        // Los ~130 alert() del panel pasan a ser avisos propios sin tocar cada
        // uno. Ninguno va justo antes de cambiar de página, así que no se pierde
        // ningún mensaje por no detener la pantalla como hacía alert().
        window.alert = function (mensaje) { avisar(mensaje); };
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { esError: esError, PELIGRO: PELIGRO };
    }
})();
