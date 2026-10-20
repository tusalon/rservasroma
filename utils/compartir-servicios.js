// utils/compartir-servicios.js — "Compartir servicios y precios" del panel de la dueña.
//
// Genera una o varias imagenes (1080x1350, buenas para un estado de WhatsApp) con los servicios
// activos y sus precios, y abre el menu de compartir del telefono: de ahi la dueña la manda a un
// estado, a un grupo o a una clienta. Si el telefono no sabe compartir imagenes se abre WhatsApp
// con la lista en texto.
//
// POR QUE NO SE DESCARGA LA IMAGEN: dentro de la APK ninguna descarga hace nada (ver
// admin-app.js compartirImagenDesdeCanvas, que usa el mismo camino de Capacitor Share).
//
// El panel (components/admin/ServiciosPanelCategorias.js) arma los grupos; aqui solo se pagina,
// se dibuja y se comparte. paginarGrupos y textoServicios son puras y tienen prueba
// (tests/compartir-servicios.test.js).

(function (raiz) {
    'use strict';

    const FILAS_POR_PAGINA = 13;   // una cabecera de categoria cuenta como una fila
    const ANCHO = 1080;
    const ALTO = 1350;

    // grupos: [{ nombre, icono, servicios: [{ nombre, precio }] }] -> paginas con el mismo formato.
    // Una categoria que no cabe sigue en la pagina siguiente (con el mismo titulo).
    function paginarGrupos(grupos, filasPorPagina = FILAS_POR_PAGINA) {
        const paginas = [];
        let actual = [];
        let usadas = 0;
        (grupos || []).forEach((grupo) => {
            const servicios = (grupo.servicios || []).slice();
            while (servicios.length) {
                // titulo + al menos un servicio, o se pasa a la pagina siguiente
                if (filasPorPagina - usadas < 2) {
                    paginas.push(actual);
                    actual = [];
                    usadas = 0;
                }
                const caben = Math.min(servicios.length, filasPorPagina - usadas - 1);
                actual.push({ nombre: grupo.nombre, icono: grupo.icono, servicios: servicios.splice(0, caben) });
                usadas += 1 + caben;
            }
        });
        if (actual.length) paginas.push(actual);
        return paginas;
    }

    function textoServicios(nombreNegocio, grupos, enlace) {
        const lineas = [`*${nombreNegocio || 'Nuestros servicios'}*`, 'Servicios y precios', ''];
        (grupos || []).forEach((grupo) => {
            if (!(grupo.servicios || []).length) return;
            lineas.push(`${grupo.icono ? grupo.icono + ' ' : ''}*${grupo.nombre}*`);
            grupo.servicios.forEach((s) => lineas.push(`• ${s.nombre}: ${s.precio}`));
            lineas.push('');
        });
        if (enlace) lineas.push(`Reserva tu cita aquí: ${enlace}`);
        return lineas.join('\n').trim();
    }

    const api = { paginarGrupos, textoServicios, FILAS_POR_PAGINA };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    // ─── Dibujo ────────────────────────────────────────────────────────────────
    function rectRedondeado(ctx, x, y, w, h, r) {
        const radio = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radio, y);
        ctx.lineTo(x + w - radio, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radio);
        ctx.lineTo(x + w, y + h - radio);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radio, y + h);
        ctx.lineTo(x + radio, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radio);
        ctx.lineTo(x, y + radio);
        ctx.quadraticCurveTo(x, y, x + radio, y);
        ctx.closePath();
    }

    // Recorta con "…" hasta que quepa en el ancho dado.
    function ajustarTexto(ctx, texto, maxAncho) {
        let t = String(texto || '');
        if (ctx.measureText(t).width <= maxAncho) return t;
        while (t.length > 1 && ctx.measureText(t + '…').width > maxAncho) t = t.slice(0, -1);
        return t.trimEnd() + '…';
    }

    function colorValido(valor, defecto) {
        return /^#[0-9a-f]{6}$/i.test(String(valor || '').trim()) ? String(valor).trim() : defecto;
    }

    function cargarLogo(url) {
        return new Promise((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            // Sin CORS el canvas queda "manchado" y toBlob falla: si el servidor no lo permite, sin logo.
            img.crossOrigin = 'anonymous';
            const temporizador = setTimeout(() => resolve(null), 4000);
            img.onload = () => { clearTimeout(temporizador); resolve(img); };
            img.onerror = () => { clearTimeout(temporizador); resolve(null); };
            img.src = url;
        });
    }

    function dibujarPagina(pagina, numero, total, negocio, logo) {
        const canvas = document.createElement('canvas');
        canvas.width = ANCHO;
        canvas.height = ALTO;
        const ctx = canvas.getContext('2d');
        const primario = colorValido(negocio.color, '#be185d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, ANCHO, ALTO);
        ctx.fillStyle = primario;
        ctx.fillRect(0, 0, ANCHO, 250);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        let xTexto = ANCHO / 2;
        if (logo) {
            const lado = 150;
            ctx.save();
            ctx.beginPath();
            ctx.arc(110 + lado / 2, 125, lado / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logo, 110, 125 - lado / 2, lado, lado);
            ctx.restore();
            xTexto = 110 + lado + (ANCHO - 110 - lado - 60) / 2;
        }
        ctx.font = '800 54px Arial, sans-serif';
        ctx.fillText(ajustarTexto(ctx, negocio.nombre || 'Servicios', logo ? 680 : 900), xTexto, 125);
        ctx.font = '500 32px Arial, sans-serif';
        ctx.fillText('Servicios y precios' + (total > 1 ? `  ·  ${numero}/${total}` : ''), xTexto, 180);

        let y = 300;
        pagina.forEach((grupo) => {
            ctx.textAlign = 'left';
            ctx.fillStyle = primario;
            ctx.font = '800 38px Arial, sans-serif';
            ctx.fillText(ajustarTexto(ctx, `${grupo.icono ? grupo.icono + ' ' : ''}${grupo.nombre}`, 900), 70, y);
            y += 22;
            grupo.servicios.forEach((s) => {
                y += 62;
                ctx.fillStyle = '#1f2937';
                ctx.textAlign = 'right';
                ctx.font = '700 34px Arial, sans-serif';
                const ancho = ctx.measureText(s.precio).width;
                ctx.fillText(s.precio, ANCHO - 70, y);
                ctx.textAlign = 'left';
                ctx.font = '500 34px Arial, sans-serif';
                ctx.fillText(ajustarTexto(ctx, s.nombre, ANCHO - 140 - ancho - 30), 70, y);
                ctx.strokeStyle = '#f3e8ee';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(70, y + 20);
                ctx.lineTo(ANCHO - 70, y + 20);
                ctx.stroke();
            });
            y += 62;
        });

        // Pie: como reservar
        rectRedondeado(ctx, 70, ALTO - 150, ANCHO - 140, 90, 45);
        ctx.fillStyle = primario;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '700 30px Arial, sans-serif';
        const pie = negocio.enlace ? negocio.enlace.replace(/^https?:\/\//, '') : 'Reserva tu cita con nosotras';
        ctx.fillText(ajustarTexto(ctx, pie, ANCHO - 220), ANCHO / 2, ALTO - 95);
        return canvas;
    }

    // ─── Compartir ─────────────────────────────────────────────────────────────
    const aBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    const aBase64 = (blob) => new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(String(lector.result || '').split(',')[1] || '');
        lector.onerror = reject;
        lector.readAsDataURL(blob);
    });

    // Texto corto de un error para poder mostrarlo (los de Capacitor traen message y code).
    function describirError(error) {
        if (!error) return 'sin detalle';
        const partes = [error.message, error.code, error.name].filter(Boolean);
        return (partes.length ? partes.join(' / ') : String(error)).slice(0, 160);
    }

    // La uri que devuelve Filesystem tiene que empezar por file: (el plugin Share no acepta otra cosa).
    function uriDeArchivo(uri) {
        const u = String(uri || '');
        if (!u) return '';
        if (/^file:/i.test(u)) return u;
        return u.startsWith('/') ? 'file://' + u : u;
    }

    // Devuelve { ok, motivo }. En la APK se guarda cada imagen en la cache y se abre el menu nativo de compartir.
    // Se intenta dos veces: primero con texto y titulo; si el sistema lo rechaza, solo con las imagenes.
    // "motivo" explica por que fallo, para que no quede en un fallo mudo.
    async function compartirImagenes(canvases, titulo, texto) {
        const blobs = (await Promise.all(canvases.map(aBlob))).filter(Boolean);
        if (!blobs.length) return { ok: false, motivo: 'el lienzo no devolvio imagen (toBlob vacio)' };
        const nombres = blobs.map((_, i) => `servicios-y-precios-${i + 1}.png`);
        let motivo = '';

        const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
        const { Filesystem, Share } = plugins;
        if (Filesystem && Filesystem.writeFile && Share && Share.share) {
            let uris = [];
            try {
                const directorio = (Filesystem.Directory && Filesystem.Directory.Cache) || 'CACHE';
                for (let i = 0; i < blobs.length; i++) {
                    const guardado = await Filesystem.writeFile({ path: nombres[i], data: await aBase64(blobs[i]), directory: directorio, recursive: true });
                    uris.push(uriDeArchivo(guardado && guardado.uri));
                }
            } catch (error) {
                motivo = 'no se pudo guardar la imagen: ' + describirError(error);
                uris = [];
            }
            if (uris.length) {
                const intentos = [
                    { title: titulo, text: texto, files: uris, dialogTitle: titulo },
                    { files: uris, dialogTitle: titulo }
                ];
                for (const opciones of intentos) {
                    try {
                        await Share.share(opciones);
                        return { ok: true, motivo: '' };
                    } catch (error) {
                        // Cerrar el menu de compartir no es un fallo.
                        if (error && /cancel/i.test(String(error.message || error))) return { ok: true, motivo: '' };
                        motivo = 'el menu de compartir fallo: ' + describirError(error);
                    }
                }
            }
        } else {
            motivo = 'faltan los plugins nativos (' + (Filesystem ? '' : 'Filesystem ') + (Share ? '' : 'Share') + ')';
        }

        const archivos = blobs.map((b, i) => new File([b], nombres[i], { type: 'image/png' }));
        if (navigator.canShare && navigator.share && navigator.canShare({ files: archivos })) {
            try {
                await navigator.share({ title: titulo, text: texto, files: archivos });
            } catch (error) {
                if (!error || error.name !== 'AbortError') return { ok: false, motivo: 'navigator.share fallo: ' + describirError(error) };
            }
            return { ok: true, motivo: '' };
        }
        return { ok: false, motivo: motivo || 'este telefono no puede compartir imagenes' };
    }

    // grupos: ver paginarGrupos. negocio: { nombre, color, logo, enlace }.
    // Devuelve 'imagen' si se abrio el menu de compartir, 'texto' si se cayo a WhatsApp, o false si no hay nada que compartir.
    // Si cae al texto, el motivo queda en compartirServiciosYPrecios.ultimoMotivo y la lista en .ultimoTexto.
    async function compartirServiciosYPrecios(grupos, negocio) {
        compartirServiciosYPrecios.ultimoMotivo = '';
        const paginas = paginarGrupos(grupos);
        if (!paginas.length) return false;
        const texto = textoServicios(negocio.nombre, grupos, negocio.enlace);
        try {
            const logo = await cargarLogo(negocio.logo);
            const canvases = paginas.map((pagina, i) => dibujarPagina(pagina, i + 1, paginas.length, negocio, logo));
            const caption = `${negocio.nombre || ''} · Servicios y precios${negocio.enlace ? '\nReserva tu cita: ' + negocio.enlace : ''}`.trim();
            const resultado = await compartirImagenes(canvases, 'Servicios y precios', caption);
            if (resultado.ok) return 'imagen';
            compartirServiciosYPrecios.ultimoMotivo = resultado.motivo;
        } catch (error) {
            compartirServiciosYPrecios.ultimoMotivo = 'no se pudo generar la imagen: ' + describirError(error);
            console.warn('[Compartir servicios] No se pudo generar la imagen, se envia en texto:', error);
        }
        // El panel avisa del motivo y abre WhatsApp con este texto (asi el aviso se ve ANTES de salir de la app).
        compartirServiciosYPrecios.ultimoTexto = texto;
        return 'texto';
    }

    window.compartirServiciosYPrecios = compartirServiciosYPrecios;
})(typeof window !== 'undefined' ? window : globalThis);
