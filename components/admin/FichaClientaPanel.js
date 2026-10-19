// components/admin/FichaClientaPanel.js — Ficha de la clienta (historia clinica): salud y alergias,
// notas por visita y fotos antes y despues.
//
// Los datos NO salen con la clave publica: van con el token que da la funcion panel-login despues de
// comprobar la contrasena (utils/panel-sesion.js) y viven en tablas cerradas (sql-fichas-clientas.sql).
// Solo entran la duena y las profesionales de nivel Avanzado.
//
// Props: cliente { nombre, whatsapp }, reservas (las de esta clienta, ya cargadas en el panel),
//        serviciosList, profesionalesList, onCerrar.

Object.assign((window.__I18N_EN__ = window.__I18N_EN__ || {}), {
    'Ficha de la clienta': 'Client record',
    'Cargando la ficha...': 'Loading record...',
    'Salud y alergias': 'Health and allergies',
    'Alergias': 'Allergies',
    'Condiciones': 'Conditions',
    'Medicamentos': 'Medications',
    'Ej: látex, acetona, tintes con PPD': 'E.g. latex, acetone, PPD dyes',
    'Condiciones o enfermedades': 'Conditions or illnesses',
    'Ej: diabetes, embarazo, piel sensible': 'E.g. diabetes, pregnancy, sensitive skin',
    'Ej: anticoagulantes, isotretinoína': 'E.g. blood thinners, isotretinoin',
    'Notas generales': 'General notes',
    'Tipo de piel o cabello, preferencias, cosas a tener en cuenta': 'Skin or hair type, preferences, things to keep in mind',
    'Guardar salud': 'Save health info',
    'Guardando...': 'Saving...',
    'Guardado': 'Saved',
    'Nueva visita': 'New visit',
    'Editar visita': 'Edit visit',
    'Fecha': 'Date',
    'Servicio': 'Service',
    'Profesional': 'Professional',
    'Qué se hizo': 'What was done',
    'Procedimiento, productos, observaciones': 'Procedure, products, observations',
    'Cómo evolucionó': 'How it evolved',
    'Resultado, reacciones, qué recomendar o repetir': 'Result, reactions, what to recommend or repeat',
    'Foto(s) antes': 'Before photo(s)',
    'Foto(s) después': 'After photo(s)',
    'Guardar visita': 'Save visit',
    'Historial': 'History',
    'Aún no hay visitas anotadas.': 'No visits recorded yet.',
    'Cita de la agenda': 'Agenda appointment',
    'Anotar': 'Add notes',
    'Editar': 'Edit',
    'Eliminar': 'Delete',
    'Antes': 'Before',
    'Después': 'After',
    'Foto': 'Photo',
    'Cerrar': 'Close',
    '¿Eliminar esta visita y sus fotos? No se puede deshacer.': 'Delete this visit and its photos? This cannot be undone.',
    'Las fichas todavía no están activadas en la base de datos. Avisa a soporte.': 'Records are not yet enabled in the database. Contact support.',
    'Tu sesión caducó. Cierra y vuelve a abrir la ficha.': 'Your session expired. Close and reopen the record.',
    'No se pudo guardar. Inténtalo de nuevo.': 'Could not save. Please try again.',
    'La visita se guardó, pero {n} foto(s) no se pudieron subir.': 'The visit was saved, but {n} photo(s) could not be uploaded.',
    'Estos datos son privados: solo los ven la dueña y las profesionales de nivel Avanzado.': 'This data is private: only the owner and Advanced-level professionals can see it.'
});

function FichaClientaPanel({ cliente, reservas, serviciosList, profesionalesList, onCerrar }) {
    const t = window.t;
    const negocioId = window.getNegocioId();
    const whatsapp = window.fichaClienta.soloDigitos(cliente?.whatsapp);
    const quien = (() => {
        try { return JSON.parse(localStorage.getItem('profesionalAuth') || 'null')?.nombre || t('Dueña'); } catch (e) { return t('Dueña'); }
    })();

    const [estado, setEstado] = React.useState('cargando'); // cargando | listo | noActivada | caducada
    const [ficha, setFicha] = React.useState({ alergias: '', condiciones: '', medicamentos: '', notas_generales: '' });
    const [visitas, setVisitas] = React.useState([]);
    const [fotos, setFotos] = React.useState([]);
    const [urls, setUrls] = React.useState({});
    const [guardandoSalud, setGuardandoSalud] = React.useState(false);
    const [saludGuardada, setSaludGuardada] = React.useState(false);
    const [formVisita, setFormVisita] = React.useState(null);
    const [guardandoVisita, setGuardandoVisita] = React.useState(false);

    // ── Llamadas con el token del panel ───────────────────────────────────────
    const llamar = async (ruta, opciones = {}) => {
        const token = await window.panelSesion.asegurar();
        if (!token) throw new Error('SIN_SESION');
        const respuesta = await fetch(`${window.SUPABASE_URL}${ruta}`, {
            ...opciones,
            headers: { ...window.panelSesion.cabeceras(token), ...(opciones.headers || {}) }
        });
        if (respuesta.status === 401) {
            // "JWT expired" = el token caduco. Cualquier otro 401 (p. ej. el rol panel_salon no existe aun) = SQL sin correr.
            const detalle = await respuesta.clone().text().catch(() => '');
            window.panelSesion.limpiar();
            throw new Error(/expired/i.test(detalle) ? 'CADUCADA' : 'NOACTIVADA');
        }
        return respuesta;
    };

    const filtro = `negocio_id=eq.${encodeURIComponent(negocioId)}&whatsapp=eq.${encodeURIComponent(whatsapp)}`;

    const cargar = async () => {
        try {
            const [rf, rv, rp] = await Promise.all([
                llamar(`/rest/v1/fichas_clientas?${filtro}&select=*`),
                llamar(`/rest/v1/fichas_visitas?${filtro}&select=*&order=fecha.desc,id.desc`),
                llamar(`/rest/v1/fichas_fotos?${filtro}&select=*&order=created_at.asc`)
            ]);
            if ([rf, rv, rp].some(r => r.status === 404 || r.status === 403)) {
                setEstado('noActivada');
                return;
            }
            if (![rf, rv, rp].every(r => r.ok)) throw new Error('CARGA');
            const [filasFicha, filasVisitas, filasFotos] = await Promise.all([rf.json(), rv.json(), rp.json()]);
            const f = filasFicha[0] || {};
            setFicha({ alergias: f.alergias || '', condiciones: f.condiciones || '', medicamentos: f.medicamentos || '', notas_generales: f.notas_generales || '' });
            setVisitas(filasVisitas);
            setFotos(filasFotos);
            setEstado('listo');
        } catch (error) {
            if (error.message === 'SIN_SESION') { onCerrar(); return; }
            setEstado(error.message === 'CADUCADA' ? 'caducada' : 'noActivada');
        }
    };

    React.useEffect(() => { cargar(); }, []);

    // Enlaces firmados (caducan en 1 hora) para ver las fotos privadas.
    React.useEffect(() => {
        const faltan = fotos.map(f => f.ruta).filter(ruta => !urls[ruta]);
        if (faltan.length === 0) return;
        let vigente = true;
        (async () => {
            try {
                const r = await llamar('/storage/v1/object/sign/fichas-fotos', { method: 'POST', body: JSON.stringify({ expiresIn: 3600, paths: faltan }) });
                if (!r.ok) return;
                const lista = await r.json();
                const nuevas = {};
                lista.forEach(item => { if (item.signedURL) nuevas[item.path] = `${window.SUPABASE_URL}/storage/v1${item.signedURL}`; });
                if (vigente) setUrls(actual => ({ ...actual, ...nuevas }));
            } catch (e) { /* sin foto: se muestra el marcador */ }
        })();
        return () => { vigente = false; };
    }, [fotos]);

    // ── Salud ─────────────────────────────────────────────────────────────────
    const guardarSalud = async () => {
        setGuardandoSalud(true);
        setSaludGuardada(false);
        try {
            const r = await llamar('/rest/v1/fichas_clientas?on_conflict=negocio_id,whatsapp', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify({ negocio_id: negocioId, whatsapp, ...ficha, actualizado_por: quien, updated_at: new Date().toISOString() })
            });
            if (!r.ok) throw new Error('GUARDAR');
            setSaludGuardada(true);
        } catch (error) {
            if (error.message === 'CADUCADA') setEstado('caducada');
            else alert(t('No se pudo guardar. Inténtalo de nuevo.'));
        } finally {
            setGuardandoSalud(false);
        }
    };

    // ── Visitas ───────────────────────────────────────────────────────────────
    const hoy = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const nuevaVisita = (base = {}) => setFormVisita({
        id: null, fecha: hoy(), servicio: '', profesional_nombre: '', reserva_id: null, notas: '', evolucion: '', antes: [], despues: [], ...base
    });

    const subirFotos = async (visitaId, archivos, tipo) => {
        let fallidas = 0;
        for (const archivo of archivos) {
            try {
                const jpg = await window.fichaClienta.comprimirImagen(archivo);
                const ruta = window.fichaClienta.rutaFoto(negocioId, whatsapp);
                const subida = await llamar(`/storage/v1/object/fichas-fotos/${ruta}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpg });
                if (!subida.ok) throw new Error('SUBIDA');
                const fila = await llamar('/rest/v1/fichas_fotos', {
                    method: 'POST',
                    headers: { Prefer: 'return=minimal' },
                    body: JSON.stringify({ negocio_id: negocioId, whatsapp, visita_id: visitaId, tipo, ruta })
                });
                if (!fila.ok) {
                    await llamar('/storage/v1/object/fichas-fotos', { method: 'DELETE', body: JSON.stringify({ prefixes: [ruta] }) });
                    throw new Error('FILA');
                }
            } catch (error) {
                if (error.message === 'CADUCADA') throw error;
                fallidas++;
            }
        }
        return fallidas;
    };

    const guardarVisita = async (e) => {
        e.preventDefault();
        if (guardandoVisita) return;
        setGuardandoVisita(true);
        try {
            const datos = {
                negocio_id: negocioId, whatsapp,
                fecha: formVisita.fecha || hoy(),
                servicio: (formVisita.servicio || '').trim() || null,
                profesional_nombre: (formVisita.profesional_nombre || '').trim() || null,
                reserva_id: formVisita.reserva_id,
                notas: (formVisita.notas || '').trim() || null,
                evolucion: (formVisita.evolucion || '').trim() || null
            };
            let visitaId = formVisita.id;
            if (visitaId) {
                const r = await llamar(`/rest/v1/fichas_visitas?id=eq.${visitaId}&${filtro}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(datos) });
                if (!r.ok) throw new Error('GUARDAR');
            } else {
                const r = await llamar('/rest/v1/fichas_visitas', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...datos, creado_por: quien }) });
                if (!r.ok) throw new Error('GUARDAR');
                visitaId = (await r.json())[0]?.id;
            }
            const fallidas = (await subirFotos(visitaId, formVisita.antes, 'antes')) + (await subirFotos(visitaId, formVisita.despues, 'despues'));
            setFormVisita(null);
            await cargar();
            if (fallidas > 0) alert(t('La visita se guardó, pero {n} foto(s) no se pudieron subir.', { n: fallidas }));
        } catch (error) {
            if (error.message === 'CADUCADA') setEstado('caducada');
            else alert(t('No se pudo guardar. Inténtalo de nuevo.'));
        } finally {
            setGuardandoVisita(false);
        }
    };

    const eliminarVisita = async (visita) => {
        if (!confirm(t('¿Eliminar esta visita y sus fotos? No se puede deshacer.'))) return;
        try {
            const rutas = fotos.filter(f => String(f.visita_id) === String(visita.id)).map(f => f.ruta);
            if (rutas.length) await llamar('/storage/v1/object/fichas-fotos', { method: 'DELETE', body: JSON.stringify({ prefixes: rutas }) });
            const r = await llamar(`/rest/v1/fichas_visitas?id=eq.${visita.id}&${filtro}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('BORRAR');
            await cargar();
        } catch (error) {
            if (error.message === 'CADUCADA') setEstado('caducada');
            else alert(t('No se pudo guardar. Inténtalo de nuevo.'));
        }
    };

    // ── Datos para pintar ─────────────────────────────────────────────────────
    const alertas = window.fichaClienta.alertasDeSalud(ficha);
    const historial = window.fichaClienta.fusionarHistorial(visitas, reservas || []);
    const fotosDe = window.fichaClienta.fotosPorVisita(fotos);
    const campo = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white';
    const etiqueta = 'block text-xs font-semibold text-gray-600 mb-1';

    const fecha = (f) => (window.formatFechaCompleta ? window.formatFechaCompleta(f) : f);

    const renderFotos = (visitaId) => {
        const lista = fotosDe[String(visitaId)] || [];
        if (!lista.length) return null;
        const nombreTipo = { antes: t('Antes'), despues: t('Después'), otra: t('Foto') };
        return (
            <div className="grid grid-cols-3 gap-2 mt-3">
                {lista.map(foto => (
                    <figure key={foto.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                        {urls[foto.ruta]
                            ? <img src={urls[foto.ruta]} alt={nombreTipo[foto.tipo]} className="w-full h-full object-cover" loading="lazy" />
                            : <div className="w-full h-full animate-pulse" />}
                        <figcaption className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">{nombreTipo[foto.tipo]}</figcaption>
                    </figure>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCerrar}>
            <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
                <div className="p-5 border-b bg-gradient-to-r from-white to-pink-50 flex items-start justify-between gap-4 shrink-0">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase text-pink-500 tracking-wide">🩺 {t('Ficha de la clienta')}</p>
                        <h3 className="text-2xl font-bold text-gray-900 truncate">{cliente?.nombre || t('Cliente')}</h3>
                        <p className="text-sm text-gray-500">+{whatsapp}</p>
                    </div>
                    <button onClick={onCerrar} aria-label={t('Cerrar')} className="w-10 h-10 rounded-full bg-white border text-gray-500 hover:text-gray-900 text-xl leading-none">×</button>
                </div>

                <div className="overflow-y-auto p-5 space-y-5">
                    {estado === 'cargando' && <p className="text-center text-pink-500 py-8">{t('Cargando la ficha...')}</p>}
                    {estado === 'noActivada' && <p role="alert" className="text-center text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">{t('Las fichas todavía no están activadas en la base de datos. Avisa a soporte.')}</p>}
                    {estado === 'caducada' && <p role="alert" className="text-center text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">{t('Tu sesión caducó. Cierra y vuelve a abrir la ficha.')}</p>}

                    {estado === 'listo' && (
                        <>
                            <p className="text-xs text-gray-500">🔒 {t('Estos datos son privados: solo los ven la dueña y las profesionales de nivel Avanzado.')}</p>

                            {alertas.length > 0 && (
                                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
                                    {alertas.map(a => (
                                        <p key={a.campo} className="text-sm text-red-800"><strong>⚠️ {t(a.etiqueta)}:</strong> {a.texto}</p>
                                    ))}
                                </div>
                            )}

                            <section className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                                <h4 className="font-bold text-gray-900">{t('Salud y alergias')}</h4>
                                <label className="block"><span className={etiqueta}>{t('Alergias')}</span>
                                    <textarea rows="2" className={campo} value={ficha.alergias} placeholder={t('Ej: látex, acetona, tintes con PPD')} onChange={(ev) => { setSaludGuardada(false); setFicha({ ...ficha, alergias: ev.target.value }); }} /></label>
                                <label className="block"><span className={etiqueta}>{t('Condiciones o enfermedades')}</span>
                                    <textarea rows="2" className={campo} value={ficha.condiciones} placeholder={t('Ej: diabetes, embarazo, piel sensible')} onChange={(ev) => { setSaludGuardada(false); setFicha({ ...ficha, condiciones: ev.target.value }); }} /></label>
                                <label className="block"><span className={etiqueta}>{t('Medicamentos')}</span>
                                    <textarea rows="2" className={campo} value={ficha.medicamentos} placeholder={t('Ej: anticoagulantes, isotretinoína')} onChange={(ev) => { setSaludGuardada(false); setFicha({ ...ficha, medicamentos: ev.target.value }); }} /></label>
                                <label className="block"><span className={etiqueta}>{t('Notas generales')}</span>
                                    <textarea rows="3" className={campo} value={ficha.notas_generales} placeholder={t('Tipo de piel o cabello, preferencias, cosas a tener en cuenta')} onChange={(ev) => { setSaludGuardada(false); setFicha({ ...ficha, notas_generales: ev.target.value }); }} /></label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={guardarSalud} disabled={guardandoSalud} className="px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-60">{guardandoSalud ? t('Guardando...') : t('Guardar salud')}</button>
                                    {saludGuardada && <span role="status" className="text-sm text-green-700 font-semibold">✓ {t('Guardado')}</span>}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h4 className="font-bold text-gray-900">{t('Historial')} ({historial.length})</h4>
                                    {!formVisita && <button type="button" onClick={() => nuevaVisita()} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-black">+ {t('Nueva visita')}</button>}
                                </div>

                                {formVisita && (
                                    <form onSubmit={guardarVisita} className="rounded-xl border border-pink-200 bg-pink-50/50 p-4 space-y-3 mb-4">
                                        <h5 className="font-bold text-pink-700">{formVisita.id ? t('Editar visita') : t('Nueva visita')}</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <label className="block"><span className={etiqueta}>{t('Fecha')}</span>
                                                <input type="date" required className={campo} value={formVisita.fecha} onChange={(ev) => setFormVisita({ ...formVisita, fecha: ev.target.value })} /></label>
                                            <label className="block"><span className={etiqueta}>{t('Servicio')}</span>
                                                <input list="ficha-servicios" className={campo} value={formVisita.servicio} onChange={(ev) => setFormVisita({ ...formVisita, servicio: ev.target.value })} />
                                                <datalist id="ficha-servicios">{(serviciosList || []).map(s => <option key={s.id} value={s.nombre} />)}</datalist></label>
                                            <label className="block"><span className={etiqueta}>{t('Profesional')}</span>
                                                <input list="ficha-profesionales" className={campo} value={formVisita.profesional_nombre} onChange={(ev) => setFormVisita({ ...formVisita, profesional_nombre: ev.target.value })} />
                                                <datalist id="ficha-profesionales">{(profesionalesList || []).map(p => <option key={p.id} value={p.nombre} />)}</datalist></label>
                                        </div>
                                        <label className="block"><span className={etiqueta}>{t('Qué se hizo')}</span>
                                            <textarea rows="3" className={campo} value={formVisita.notas} placeholder={t('Procedimiento, productos, observaciones')} onChange={(ev) => setFormVisita({ ...formVisita, notas: ev.target.value })} /></label>
                                        <label className="block"><span className={etiqueta}>{t('Cómo evolucionó')}</span>
                                            <textarea rows="3" className={campo} value={formVisita.evolucion} placeholder={t('Resultado, reacciones, qué recomendar o repetir')} onChange={(ev) => setFormVisita({ ...formVisita, evolucion: ev.target.value })} /></label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="block"><span className={etiqueta}>📷 {t('Foto(s) antes')}</span>
                                                <input type="file" accept="image/*" multiple className="block w-full text-sm" onChange={(ev) => setFormVisita({ ...formVisita, antes: Array.from(ev.target.files || []) })} /></label>
                                            <label className="block"><span className={etiqueta}>📷 {t('Foto(s) después')}</span>
                                                <input type="file" accept="image/*" multiple className="block w-full text-sm" onChange={(ev) => setFormVisita({ ...formVisita, despues: Array.from(ev.target.files || []) })} /></label>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setFormVisita(null)} disabled={guardandoVisita} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold">{t('Cancelar')}</button>
                                            <button type="submit" disabled={guardandoVisita} className="px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-60">{guardandoVisita ? t('Guardando...') : t('Guardar visita')}</button>
                                        </div>
                                    </form>
                                )}

                                {historial.length === 0 && !formVisita && <p className="text-center text-gray-400 text-sm py-4">{t('Aún no hay visitas anotadas.')}</p>}

                                <ol className="relative border-l-2 border-pink-100 ml-2 space-y-4">
                                    {historial.map(item => (
                                        <li key={item.clave} className="ml-4">
                                            <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full border-2 border-white ${item.tipo === 'visita' ? 'bg-pink-500' : 'bg-gray-300'}`} />
                                            <div className={`rounded-xl border p-3 ${item.tipo === 'visita' ? 'bg-white border-pink-100' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{fecha(item.fecha)}{item.hora ? ` · ${window.formatTo12Hour ? window.formatTo12Hour(item.hora) : item.hora}` : ''}</p>
                                                        <p className="text-sm text-gray-700">{item.servicio || '—'}{item.profesional_nombre ? ` · ${item.profesional_nombre}` : ''}</p>
                                                        {item.tipo === 'cita' && <p className="text-xs text-gray-400 mt-0.5">{t('Cita de la agenda')}</p>}
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {item.tipo === 'cita' ? (
                                                            <button type="button" onClick={() => nuevaVisita({ fecha: item.fecha, servicio: item.servicio || '', profesional_nombre: item.profesional_nombre || '', reserva_id: item.reserva_id })} className="px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-xs font-bold">{t('Anotar')}</button>
                                                        ) : (
                                                            <>
                                                                <button type="button" onClick={() => setFormVisita({ id: item.id, fecha: item.fecha, servicio: item.servicio || '', profesional_nombre: item.profesional_nombre || '', reserva_id: item.reserva_id ?? null, notas: item.notas || '', evolucion: item.evolucion || '', antes: [], despues: [] })} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700">{t('Editar')}</button>
                                                                <button type="button" onClick={() => eliminarVisita(item)} className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-red-700">{t('Eliminar')}</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {item.notas && <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap"><strong>{t('Qué se hizo')}:</strong> {item.notas}</p>}
                                                {item.evolucion && <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap"><strong>{t('Cómo evolucionó')}:</strong> {item.evolucion}</p>}
                                                {item.tipo === 'visita' && renderFotos(item.id)}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
