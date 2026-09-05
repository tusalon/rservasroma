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
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.innerHTML =
            '<div id="soporte-caja" style="background:#fff;width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:20px 18px 24px;max-height:92vh;overflow-y:auto;box-shadow:0 -8px 30px rgba(0,0,0,.25);font-family:inherit;">' +
                '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">' +
                    '<div>' +
                        '<h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">🆘 Soporte RservasRoma</h2>' +
                        '<p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.4;">' +
                            (esClientas
                                ? 'Cuéntanos qué falla en la app y te ayudamos.'
                                : 'Cuéntanos qué te pasa. Puedes adjuntar una foto de lo que ves.') +
                        '</p>' +
                    '</div>' +
                    '<button type="button" id="soporte-cerrar" aria-label="Cerrar" style="border:none;background:#f1f5f9;color:#475569;font-size:20px;line-height:1;width:32px;height:32px;border-radius:999px;cursor:pointer;flex-shrink:0;">&times;</button>' +
                '</div>' +
                '<textarea id="soporte-mensaje" rows="5" maxlength="' + MAX_MENSAJE + '" aria-label="Cuéntanos qué problema tienes" placeholder="Ejemplo: no me deja guardar un servicio nuevo, me sale un error en rojo." ' +
                    'style="width:100%;margin-top:14px;padding:12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:15px;font-family:inherit;resize:vertical;box-sizing:border-box;color:#0f172a;background:#fff;"></textarea>' +
                '<div id="soporte-contador" style="text-align:right;font-size:11px;color:#94a3b8;margin-top:2px;">0/' + MAX_MENSAJE + '</div>' +
                '<input type="file" id="soporte-foto" accept="image/*" style="display:none;">' +
                '<button type="button" id="soporte-elegir-foto" style="width:100%;margin-top:10px;padding:11px;border:1.5px dashed #cbd5e1;background:#f8fafc;border-radius:12px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;font-family:inherit;">📷 Adjuntar foto (opcional)</button>' +
                '<div id="soporte-preview" style="display:none;margin-top:10px;align-items:center;gap:10px;background:#f1f5f9;border-radius:12px;padding:8px;">' +
                    '<img id="soporte-preview-img" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;">' +
                    '<span id="soporte-preview-nombre" style="font-size:12px;color:#475569;flex:1;word-break:break-all;"></span>' +
                    '<button type="button" id="soporte-quitar-foto" style="border:none;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;flex-shrink:0;">Quitar</button>' +
                '</div>' +
                '<div id="soporte-estado" style="display:none;margin-top:12px;font-size:13px;line-height:1.45;"></div>' +
                '<button type="button" id="soporte-enviar" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:#25D366;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;">Enviar por WhatsApp</button>' +
                '<p style="margin:10px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.4;">Tu mensaje queda registrado aunque WhatsApp no llegue a abrirse.</p>' +
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
            var preview = document.getElementById('soporte-preview');
            document.getElementById('soporte-preview-img').src = URL.createObjectURL(file);
            document.getElementById('soporte-preview-nombre').textContent = file.name || 'foto.jpg';
            preview.style.display = 'flex';
        };
        document.getElementById('soporte-quitar-foto').onclick = function () {
            fotoElegida = null;
            input.value = '';
            document.getElementById('soporte-preview').style.display = 'none';
        };

        document.getElementById('soporte-enviar').onclick = enviarSoporte;
    }

    async function enviarSoporte() {
        var boton = document.getElementById('soporte-enviar');
        var textarea = document.getElementById('soporte-mensaje');
        if (!boton || !textarea) return;

        var validacion = validarMensajeSoporte(textarea.value);
        if (!validacion.ok) {
            pintarEstado('⚠️ ' + validacion.error, '#b45309');
            textarea.focus();
            return;
        }

        boton.disabled = true;
        boton.style.opacity = '.6';
        boton.textContent = 'Enviando...';
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
        boton.textContent = 'Enviar por WhatsApp';

        if (resultado === 'cancelado') {
            pintarEstado(guardado
                ? '📩 No enviaste el WhatsApp, pero tu mensaje ya nos llegó igual.'
                : '⚠️ No se envió nada. Intenta de nuevo.', guardado ? '#047857' : '#b91c1c');
            return;
        }

        if (resultado === 'error' && !guardado) {
            pintarEstado('⚠️ No se pudo enviar. Revisa tu conexión e intenta otra vez.', '#b91c1c');
            return;
        }

        var aviso = '✅ Listo, ya tenemos tu mensaje.';
        if (resultado === 'whatsapp-sin-foto') {
            aviso += '<br>📷 Este teléfono no puede mandar la foto sola: adjúntala tú en el chat que se acaba de abrir.';
        }
        if (!guardado) {
            aviso = '📲 Se abrió WhatsApp con tu mensaje. Dale a enviar para que nos llegue.';
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
        boton.innerHTML = esClientas ? '🆘' : '🆘 <span style="font-size:13px;font-weight:800;">Soporte</span>';
        boton.style.cssText =
            'position:fixed;bottom:16px;' + lado +
            'z-index:2147482000;display:flex;align-items:center;gap:6px;' +
            'background:#0f172a;color:#fff;border:none;border-radius:999px;cursor:pointer;' +
            'box-shadow:0 6px 18px rgba(15,23,42,.35);font-family:inherit;' +
            (esClientas ? 'width:44px;height:44px;justify-content:center;font-size:18px;' : 'padding:10px 16px;font-size:16px;');
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
