// utils/ficha-clienta.js — apoyo de la ficha de clientas (components/admin/FichaClientaPanel.js).
//
// Funciones puras con prueba (tests/ficha-clienta.test.js) y la compresion de fotos para subirlas ligeras.

(function (raiz) {
    'use strict';

    const soloDigitos = (valor) => String(valor == null ? '' : valor).replace(/\D/g, '');
    const normEstado = (estado) => String(estado || '').trim().toLowerCase();

    // Avisos de salud para mostrar arriba de la ficha, solo los que tienen texto.
    function alertasDeSalud(ficha) {
        const campos = [
            ['alergias', 'Alergias'],
            ['condiciones', 'Condiciones'],
            ['medicamentos', 'Medicamentos']
        ];
        return campos
            .map(([campo, etiqueta]) => ({ campo, etiqueta, texto: String((ficha && ficha[campo]) || '').trim() }))
            .filter((alerta) => alerta.texto);
    }

    // Una sola linea de tiempo: las visitas anotadas + las citas completadas de la agenda que aun no tienen
    // anotacion. Si una visita ya apunta a una cita (reserva_id), la cita no se repite. Mas reciente primero.
    function fusionarHistorial(visitas, reservas) {
        const conVisita = new Set((visitas || []).filter((v) => v.reserva_id != null).map((v) => String(v.reserva_id)));
        const items = (visitas || []).map((v) => ({ ...v, tipo: 'visita', clave: `v${v.id}`, hora: '' }));
        (reservas || [])
            .filter((r) => normEstado(r.estado) === 'completado' && !conVisita.has(String(r.id)))
            .forEach((r) => items.push({
                tipo: 'cita',
                clave: `r${r.id}`,
                fecha: r.fecha,
                hora: String(r.hora_inicio || '').slice(0, 5),
                servicio: r.servicio,
                profesional_nombre: r.profesional_nombre,
                reserva_id: r.id
            }));
        return items.sort((a, b) => {
            if (a.fecha !== b.fecha) return String(b.fecha || '').localeCompare(String(a.fecha || ''));
            if (a.hora !== b.hora) return String(b.hora || '').localeCompare(String(a.hora || ''));
            return Number(b.id || 0) - Number(a.id || 0);
        });
    }

    // Ruta de la foto en el bucket privado: <negocio>/<whatsapp>/<id>.jpg (la politica exige el negocio en la 1a carpeta).
    function rutaFoto(negocioId, whatsapp, identificador) {
        const id = identificador || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        return `${negocioId}/${soloDigitos(whatsapp)}/${id}.jpg`;
    }

    // Agrupa las fotos por visita: { [visita_id]: [fotos] }. Las sueltas (sin visita) van a la clave "sueltas".
    function fotosPorVisita(fotos) {
        const grupos = {};
        (fotos || []).forEach((foto) => {
            const clave = foto.visita_id == null ? 'sueltas' : String(foto.visita_id);
            (grupos[clave] = grupos[clave] || []).push(foto);
        });
        return grupos;
    }

    const api = { alertasDeSalud, fusionarHistorial, rutaFoto, fotosPorVisita, soloDigitos };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    // Reduce una foto del telefono (varios MB) a ~1280 px y JPEG, respetando la orientacion.
    async function comprimirImagen(archivo, maxLado = 1280, calidad = 0.82) {
        let origen;
        let ancho;
        let alto;
        if (window.createImageBitmap) {
            try {
                origen = await window.createImageBitmap(archivo, { imageOrientation: 'from-image' });
                ancho = origen.width;
                alto = origen.height;
            } catch (e) { origen = null; }
        }
        if (!origen) {
            origen = await new Promise((resolve, reject) => {
                const url = URL.createObjectURL(archivo);
                const img = new Image();
                img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
                img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la foto.')); };
                img.src = url;
            });
            ancho = origen.naturalWidth;
            alto = origen.naturalHeight;
        }
        const escala = Math.min(1, maxLado / Math.max(ancho, alto));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.max(1, Math.round(ancho * escala));
        lienzo.height = Math.max(1, Math.round(alto * escala));
        const ctx = lienzo.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        ctx.drawImage(origen, 0, 0, lienzo.width, lienzo.height);
        if (origen.close) origen.close();
        const blob = await new Promise((resolve) => lienzo.toBlob(resolve, 'image/jpeg', calidad));
        if (!blob) throw new Error('No se pudo preparar la foto.');
        return blob;
    }

    window.fichaClienta = Object.assign(api, { comprimirImagen });

    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        'Alergias': 'Allergies',
        'Condiciones': 'Conditions',
        'Medicamentos': 'Medications'
    });
})(typeof window !== 'undefined' ? window : globalThis);
