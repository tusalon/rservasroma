// utils/soporte.js - Boton de soporte de las apps de RservasRoma.
//
// COMO FUNCIONA
// 1. La persona escribe el problema y, si quiere, adjunta una foto.
// 2. El ticket (SOLO el texto) se guarda en la tabla soporte_tickets ANTES de
//    abrir WhatsApp. Ese es el punto: si se queda sin datos, si cierra el chat
//    sin darle a enviar o si el mensaje se pierde entre conversaciones, el
//    Super Admin lo ve igual. Nada se pierde.
// 3. Despues se abre WhatsApp con el texto ya escrito. Si hay foto se usa
//    Web Share (o el plugin Share de la APK) para que la foto viaje adjunta
//    dentro del propio WhatsApp.
//
// POR QUE NO SE SUBE LA FOTO A NINGUN LADO
// Cloudinary y Supabase Storage tienen cuota y cuestan; una foto de un fallo
// no tiene por que quedar alojada en un servidor para siempre. WhatsApp ya
// sabe mandar imagenes, asi que la foto va por ahi y el ticket solo guarda
// "con_foto" para avisar de que hay que mirar el chat.
//
// Es vanilla a proposito (sin React): asi el mismo archivo sirve en el panel,
// en la app de clientas y en las pantallas de login, que no montan React.

(function () {
    'use strict';

    var SOPORTE_WHATSAPP = '15154650340';
    var MIN_MENSAJE = 5;
    var MAX_MENSAJE = 1500;
    var ID_OVERLAY = 'soporte-rservas-overlay';
    var ID_BOTON = 'soporte-rservas-boton';

    // Iconos de trazo, del mismo juego (Lucide) que usa el resto del panel.
    // Nada de emoji: un 🆘 se dibuja distinto en cada telefono y no se puede
    // teñir del color del salon.
    var TRAZOS = {
        soporte: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
        camara: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
        cerrar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>'
    };

    function icono(nombre, tamano, grosor) {
        return '<svg width="' + tamano + '" height="' + tamano + '" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="' + (grosor || 2) + '" stroke-linecap="round" ' +
            'stroke-linejoin="round" aria-hidden="true" focusable="false">' + TRAZOS[nombre] + '</svg>';
    }

    // Tokens de la app con respaldo fijo delante: los navegadores viejos
    // (WebView antigua, iOS 14) ignoran la segunda declaracion y se quedan con
    // el fucsia por defecto en vez de quedarse sin color.
    var MARCA = 'color:#FF1493;color:var(--brand-primary,#FF1493);';
    var BORDE_MARCA = 'border-color:#FBC9E4;border-color:rgb(var(--brand-secondary-rgb,249 168 212)/0.62);';
    var FONDO_MARCA = 'background:#FEF5FA;background:var(--brand-surface,rgba(249,168,212,0.12));';
    var RELLENO_MARCA = 'background:#FF1493;background:var(--brand-primary,#FF1493);';
    // Sombra de dos capas tintada en azul noche, como --shadow-lg del tema.
    var SOMBRA = 'box-shadow:0 4px 8px rgba(17,12,46,0.04),0 12px 28px rgba(17,12,46,0.10);';

    // ---------- Parte pura (la que se prueba en tests/soporte.test.js) ----------

    function validarMensajeSoporte(texto) {
        var limpio = String(texto == null ? '' : texto).trim();
        if (limpio.length < MIN_MENSAJE) {
            return { ok: false, error: 'Cuéntanos un poco más para poder ayudarte.' };
        }
        if (limpio.length > MAX_MENSAJE) {
            return { ok: false, error: 'El mensaje es muy largo. Resume en ' + MAX_MENSAJE + ' caracteres o menos.' };
        }
        return { ok: true, mensaje: limpio };
    }

    function construirMensajeSoporte(datos) {
        var d = datos || {};
        var lineas = ['🆘 *Soporte RservasRoma*', ''];
        if (d.negocioNombre) lineas.push('🏪 ' + d.negocioNombre);
        if (d.negocioSlug) lineas.push('🔗 ' + d.negocioSlug);
        lineas.push('👤 ' + (d.quien || (d.origen === 'clientas' ? 'Una clienta' : 'La dueña')));
        if (d.contacto) lineas.push('📱 ' + d.contacto);
        if (d.plataforma) lineas.push('📲 ' + d.plataforma);
        lineas.push('', '📝 *Problema:*', String(d.mensaje || '').trim());
        if (d.conFoto) lineas.push('', '📷 Abajo va la foto del problema.');
        return lineas.join('\n');
    }

    // WhatsApp corta en silencio las URLs muy largas (ya paso con los mensajes
    // de alta, de ~4300 caracteres). Un mensaje de 1500 letras acentuadas se
    // codifica a 6 caracteres por letra, asi que hay que recortar aqui antes de
    // que lo recorte WhatsApp sin avisar. El texto completo no se pierde: el
    // ticket se guardo entero un momento antes.
    var MAX_URL_TEXTO = 3500;
    var AVISO_RECORTE = '\n\n(…mensaje recortado, el completo está en el panel de soporte)';

    function linkWhatsAppSoporte(texto) {
        var codificado = encodeURIComponent(texto);
        if (codificado.length > MAX_URL_TEXTO) {
            var recorte = String(texto);
            while (recorte.length > 0 && encodeURIComponent(recorte + AVISO_RECORTE).length > MAX_URL_TEXTO) {
                recorte = recorte.slice(0, Math.max(0, Math.floor(recorte.length * 0.9) - 1));
            }
            codificado = encodeURIComponent(recorte + AVISO_RECORTE);
        }
        return 'https://wa.me/' + SOPORTE_WHATSAPP + '?text=' + codificado;
    }

    function detectarPlataforma() {
        var cap = typeof window !== 'undefined' ? window.Capacitor : null;
        if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
            return 'APK ' + ((cap.getPlatform && cap.getPlatform()) || 'android');
        }
        var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
        if (/RservasromaClientes/i.test(ua)) return 'APK clientas';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone (web)';
        if (/Android/i.test(ua)) return 'Android (web)';
        return 'Computadora (web)';
    }

    // ---------- Datos del negocio / de quien escribe ----------

    function origenActual() {
        return window.SOPORTE_ORIGEN === 'clientas' ? 'clientas' : 'panel';
    }

    async function contextoSoporte() {
        var contexto = {
            origen: origenActual(),
            plataforma: detectarPlataforma(),
            negocioId: null,
            negocioNombre: '',
            negocioSlug: '',
            quien: '',
            contacto: ''
        };

        try {
            var config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio() : null;
            if (config) {
                contexto.negocioId = config.id || null;
                contexto.negocioNombre = config.nombre || '';
                contexto.negocioSlug = config.slug || '';
                if (contexto.origen === 'panel') {
                    contexto.quien = config.nombre ? 'Dueña de ' + config.nombre : 'La dueña';
                    contexto.contacto = config.telefono || '';
                }
            }
        } catch (error) {
            console.warn('Soporte: no se pudo leer la configuración del negocio', error);
        }

        if (contexto.origen === 'clientas') {
            try {
                var cliente = window.getClienteAuthActual ? window.getClienteAuthActual() : null;
                if (cliente) {
                    contexto.quien = cliente.nombre || 'Una clienta';
                    contexto.contacto = cliente.whatsapp || cliente.telefono || '';
                }
            } catch (error) {
                console.warn('Soporte: no se pudo leer la sesión de la clienta', error);
            }
        }

        return contexto;
    }

    // ---------- Guardado del ticket ----------

    async function guardarTicket(ticket) {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            throw new Error('Sin configuración de Supabase');
        }
        var respuesta = await fetch(window.SUPABASE_URL + '/rest/v1/soporte_tickets', {
            method: 'POST',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify(ticket)
        });
        if (!respuesta.ok) {
            throw new Error('HTTP ' + respuesta.status + ' ' + (await respuesta.text()));
        }
    }

    // ---------- Envio por WhatsApp (con foto si se puede) ----------

    function blobABase64(blob) {
        return new Promise(function (resolve, reject) {
            var lector = new FileReader();
            lector.onloadend = function () {
                resolve(String(lector.result || '').split(',')[1] || '');
            };
            lector.onerror = reject;
            lector.readAsDataURL(blob);
        });
    }

    async function comprimirFoto(file) {
        if (!file) return null;
        // Reutiliza el compresor de utils/storage.js (1200px, JPEG). Una foto de
        // 12MB tarda una eternidad en pasar a base64 dentro de la WebView.
        if (window.comprimirImagenParaCompartir) {
            try {
                var comprimida = await window.comprimirImagenParaCompartir(file, 1200);
                if (comprimida) return comprimida;
            } catch (error) {
                console.warn('Soporte: no se pudo comprimir la foto, va tal cual', error);
            }
        }
        return file;
    }

    function abrirWhatsApp(texto) {
        window.open(linkWhatsAppSoporte(texto), '_blank');
    }

    // Devuelve como salio el mensaje:
    //   'compartido'        -> se compartio con la foto adjunta
    //   'cancelado'         -> la persona cerro el selector de compartir
    //   'whatsapp'          -> se abrio wa.me con el texto (no habia foto)
    //   'whatsapp-sin-foto' -> se abrio wa.me pero la foto hay que adjuntarla a mano
    async function enviarPorWhatsApp(texto, foto) {
        if (foto) {
            var nombreArchivo = 'soporte-' + Date.now() + '.jpg';
            var plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
            var Filesystem = plugins.Filesystem;
            var Share = plugins.Share;

            if (Filesystem && Filesystem.writeFile && Share && Share.share) {
                try {
                    var Directory = Filesystem.Directory || window.Capacitor.FilesystemDirectory;
                    var guardado = await Filesystem.writeFile({
                        path: nombreArchivo,
                        data: await blobABase64(foto),
                        directory: (Directory && Directory.Cache) || 'CACHE',
                        recursive: true
                    });
                    await Share.share({ title: 'Soporte RservasRoma', text: texto, files: [guardado.uri] });
                    return 'compartido';
                } catch (error) {
                    console.warn('Soporte: compartir nativo falló, se usa el fallback', error);
                }
            }

            var archivo = new File([foto], nombreArchivo, { type: foto.type || 'image/jpeg' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
                try {
                    await navigator.share({ title: 'Soporte RservasRoma', text: texto, files: [archivo] });
                    return 'compartido';
                } catch (error) {
                    if (error && error.name === 'AbortError') return 'cancelado';
                    console.warn('Soporte: navigator.share con foto falló', error);
                }
            }

            abrirWhatsApp(texto);
            return 'whatsapp-sin-foto';
        }

        abrirWhatsApp(texto);
        return 'whatsapp';
    }

    // ---------- Interfaz ----------

    var fotoElegida = null;

    function alPulsarEscape(evento) {
        if (evento.key === 'Escape') cerrarSoporte();
    }

    function cerrarSoporte() {
        var overlay = document.getElementById(ID_OVERLAY);
        if (overlay) overlay.remove();
        document.removeEventListener('keydown', alPulsarEscape);
        fotoElegida = null;
    }

    function quitarFoto() {
        fotoElegida = null;
        var input = document.getElementById('soporte-foto');
        if (input) input.value = '';
        var preview = document.getElementById('soporte-preview');
        if (preview) preview.innerHTML = icono('camara', 26, 1.75);
        var texto = document.getElementById('soporte-elegir-texto');
        if (texto) texto.textContent = 'Adjuntar foto';
        var pie = document.getElementById('soporte-pie-foto');
        if (pie) pie.textContent = 'Opcional. La foto viaja dentro del propio WhatsApp.';
    }

    function pintarEstado(html, color) {
        var caja = document.getElementById('soporte-estado');
        if (!caja) return;
        caja.innerHTML = html;
        caja.style.color = color || '#4b5563';
        caja.style.display = html ? 'block' : 'none';
    }

    function abrirSoporte() {
        if (document.getElementById(ID_OVERLAY)) return;

        var esClientas = origenActual() === 'clientas';
        var overlay = document.createElement('div');
        overlay.id = ID_OVERLAY;
        // Mismo velo y misma hoja inferior que el modal del catálogo
        // (components/Catalogo.js): negro al 60% y esquinas de 24px arriba.
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.innerHTML =
            '<div id="soporte-caja" style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:20px 18px 26px;max-height:92vh;overflow-y:auto;box-shadow:0 8px 16px rgba(17,12,46,0.05),0 20px 44px rgba(17,12,46,0.12);font-family:inherit;">' +
                '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">' +
                    '<div style="display:flex;align-items:flex-start;gap:11px;">' +
                        '<div style="width:38px;height:38px;border-radius:9999px;border:1px solid;' + FONDO_MARCA + BORDE_MARCA + MARCA +
                            'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + icono('soporte', 20) + '</div>' +
                        '<div>' +
                            '<h2 style="margin:0;font-size:18px;font-weight:700;color:#1f2937;letter-spacing:-0.008em;">Soporte</h2>' +
                            '<p style="margin:3px 0 0;font-size:13px;color:#6b7280;line-height:1.4;">' +
                                (esClientas
                                    ? 'Cuéntanos qué falla en la app y te ayudamos.'
                                    : 'Cuéntanos qué te pasa y te ayudamos.') +
                            '</p>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" id="soporte-cerrar" aria-label="Cerrar" style="border:none;background:#f3f4f6;color:#6b7280;width:34px;height:34px;border-radius:9999px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;">' + icono('cerrar', 17) + '</button>' +
                '</div>' +
                '<textarea id="soporte-mensaje" rows="4" maxlength="' + MAX_MENSAJE + '" aria-label="Cuéntanos qué problema tienes" placeholder="Ejemplo: no me deja guardar un servicio nuevo, me sale un error en rojo." ' +
                    'style="width:100%;margin-top:16px;padding:12px 13px;border:1.5px solid #FBC9E4;border-color:rgb(var(--brand-secondary-rgb,249 168 212)/0.62);border-radius:12px;font-size:15px;font-family:inherit;line-height:1.45;resize:vertical;box-sizing:border-box;color:#1f2937;background:#fff;"></textarea>' +
                '<div id="soporte-contador" style="text-align:right;font-size:11px;color:#9ca3af;margin-top:5px;">0/' + MAX_MENSAJE + '</div>' +
                '<input type="file" id="soporte-foto" accept="image/*" style="display:none;">' +
                // Misma anatomía que "Elegir foto" del catálogo: cuadro de vista
                // previa a la izquierda y botón sólido de marca al lado.
                '<div style="margin-top:12px;display:flex;align-items:flex-start;gap:12px;">' +
                    '<div id="soporte-preview" style="width:72px;height:72px;border-radius:12px;border:1px solid;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;' + FONDO_MARCA + BORDE_MARCA + MARCA + '">' +
                        icono('camara', 26, 1.75) +
                    '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<button type="button" id="soporte-elegir-foto" style="display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;' + RELLENO_MARCA + '">' +
                            icono('camara', 15) + '<span id="soporte-elegir-texto">Adjuntar foto</span></button>' +
                        '<p id="soporte-pie-foto" style="margin:8px 0 0;font-size:12px;color:#9ca3af;line-height:1.4;">Opcional. La foto viaja dentro del propio WhatsApp.</p>' +
                    '</div>' +
                '</div>' +
                '<div id="soporte-estado" style="display:none;margin-top:14px;font-size:13px;line-height:1.45;"></div>' +
                '<button type="button" id="soporte-enviar" style="width:100%;margin-top:18px;padding:14px;border:none;border-radius:12px;background:#25D366;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 2px 4px rgba(17,12,46,0.04),0 6px 16px rgba(17,12,46,0.08);">' +
                    icono('chat', 19) + '<span id="soporte-enviar-texto">Enviar por WhatsApp</span></button>' +
                '<p style="margin:11px 0 0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.45;">Tu mensaje queda registrado aunque WhatsApp no llegue a abrirse.</p>' +
            '</div>';

        document.body.appendChild(overlay);
        fotoElegida = null;

        overlay.addEventListener('click', function (evento) {
            if (evento.target === overlay) cerrarSoporte();
        });
        document.getElementById('soporte-cerrar').onclick = cerrarSoporte;
        document.addEventListener('keydown', alPulsarEscape);

        var textarea = document.getElementById('soporte-mensaje');
        textarea.oninput = function () {
            document.getElementById('soporte-contador').textContent = textarea.value.length + '/' + MAX_MENSAJE;
        };
        setTimeout(function () { textarea.focus(); }, 60);

        var input = document.getElementById('soporte-foto');
        document.getElementById('soporte-elegir-foto').onclick = function () { input.click(); };
        input.onchange = function () {
            var file = input.files && input.files[0];
            if (!file) return;
            fotoElegida = file;
            // La miniatura ocupa el mismo cuadro que el icono: se ve de un
            // vistazo que la foto quedó adjunta sin añadir otra caja debajo.
            document.getElementById('soporte-preview').innerHTML =
                '<img alt="" src="' + URL.createObjectURL(file) + '" style="width:100%;height:100%;object-fit:cover;">';
            document.getElementById('soporte-elegir-texto').textContent = 'Cambiar foto';
            document.getElementById('soporte-pie-foto').innerHTML =
                'Foto adjunta. <button type="button" id="soporte-quitar-foto" style="border:none;background:none;padding:0;font:inherit;font-weight:700;color:#b91c1c;cursor:pointer;">Quitar</button>';
            document.getElementById('soporte-quitar-foto').onclick = quitarFoto;
        };

        document.getElementById('soporte-enviar').onclick = enviarSoporte;
    }

    async function enviarSoporte() {
        var boton = document.getElementById('soporte-enviar');
        var textarea = document.getElementById('soporte-mensaje');
        if (!boton || !textarea) return;

        var validacion = validarMensajeSoporte(textarea.value);
        if (!validacion.ok) {
            pintarEstado(validacion.error, '#b45309');
            textarea.focus();
            return;
        }

        boton.disabled = true;
        boton.style.opacity = '.6';
        document.getElementById('soporte-enviar-texto').textContent = 'Enviando...';
        pintarEstado('', '');

        var contexto = await contextoSoporte();
        var foto = await comprimirFoto(fotoElegida);

        // Primero el registro, despues WhatsApp: si se guarda el ticket ya no se
        // pierde nada aunque el chat no llegue a enviarse.
        var guardado = true;
        try {
            await guardarTicket({
                negocio_id: contexto.negocioId,
                negocio_nombre: contexto.negocioNombre || null,
                negocio_slug: contexto.negocioSlug || null,
                origen: contexto.origen,
                quien: contexto.quien || null,
                contacto: contexto.contacto || null,
                mensaje: validacion.mensaje,
                con_foto: Boolean(foto),
                plataforma: contexto.plataforma
            });
        } catch (error) {
            guardado = false;
            console.error('Soporte: no se pudo guardar el ticket', error);
        }

        var texto = construirMensajeSoporte({
            origen: contexto.origen,
            negocioNombre: contexto.negocioNombre,
            negocioSlug: contexto.negocioSlug,
            quien: contexto.quien,
            contacto: contexto.contacto,
            plataforma: contexto.plataforma,
            mensaje: validacion.mensaje,
            conFoto: Boolean(foto)
        });

        var resultado = 'whatsapp';
        try {
            resultado = await enviarPorWhatsApp(texto, foto);
        } catch (error) {
            console.error('Soporte: falló el envío por WhatsApp', error);
            resultado = 'error';
        }

        boton.disabled = false;
        boton.style.opacity = '1';
        document.getElementById('soporte-enviar-texto').textContent = 'Enviar por WhatsApp';

        if (resultado === 'cancelado') {
            pintarEstado(guardado
                ? 'No enviaste el WhatsApp, pero tu mensaje ya nos llegó igual.'
                : 'No se envió nada. Intenta de nuevo.', guardado ? '#047857' : '#b91c1c');
            return;
        }

        if (resultado === 'error' && !guardado) {
            pintarEstado('No se pudo enviar. Revisa tu conexión e intenta otra vez.', '#b91c1c');
            return;
        }

        var aviso = 'Listo, ya tenemos tu mensaje.';
        if (resultado === 'whatsapp-sin-foto') {
            aviso += '<br>Este teléfono no puede mandar la foto sola: adjúntala tú en el chat que se acaba de abrir.';
        }
        if (!guardado) {
            aviso = 'Se abrió WhatsApp con tu mensaje. Dale a enviar para que nos llegue.';
        }
        pintarEstado(aviso, guardado ? '#047857' : '#b45309');
        if (guardado) setTimeout(cerrarSoporte, 4000);
    }

    // ---------- Boton flotante ----------

    function inyectarBoton() {
        if (document.getElementById(ID_BOTON)) return;
        if (window.SOPORTE_SIN_BOTON === true) return;

        var esClientas = origenActual() === 'clientas';
        // En la app de clientas la esquina derecha ya la ocupa el WhatsApp del
        // salon: el de soporte va a la izquierda para no taparlo.
        var lado = esClientas ? 'left:16px;' : 'right:16px;';
        var boton = document.createElement('button');
        boton.id = ID_BOTON;
        boton.type = 'button';
        boton.title = 'Soporte de RservasRoma';
        boton.setAttribute('aria-label', 'Soporte de RservasRoma');
        boton.innerHTML = icono('soporte', 24);
        // El mismo botón redondo que recargar y salir en la cabecera del panel,
        // pero en blanco: sobre el fondo rosa claro de la app, uno relleno del
        // color de marca se leería como una acción más de la agenda, y uno del
        // color del fondo desaparecería. 52px para que sea un objetivo cómodo.
        boton.style.cssText =
            'position:fixed;bottom:20px;' + lado +
            'z-index:2147482000;display:flex;align-items:center;justify-content:center;' +
            'width:52px;height:52px;padding:0;border-radius:9999px;cursor:pointer;' +
            'background:#fff;border:1px solid;font-family:inherit;' +
            BORDE_MARCA + MARCA + SOMBRA;
        boton.onclick = abrirSoporte;
        document.body.appendChild(boton);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inyectarBoton);
        } else {
            inyectarBoton();
        }
    }

    if (typeof window !== 'undefined') {
        window.abrirSoporteRservas = abrirSoporte;
        window.cerrarSoporteRservas = cerrarSoporte;
        window.construirMensajeSoporte = construirMensajeSoporte;
        window.validarMensajeSoporte = validarMensajeSoporte;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            validarMensajeSoporte,
            construirMensajeSoporte,
            linkWhatsAppSoporte,
            MAX_MENSAJE,
            MIN_MENSAJE,
            MAX_URL_TEXTO
        };
    }
})();
