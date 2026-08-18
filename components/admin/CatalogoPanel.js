// components/admin/CatalogoPanel.js - Catalogo de disenos (panel del salon)
//
// El salon sube sus trabajos, los organiza por categoria y los vincula a un
// servicio para que la clienta pueda reservarlos con un toque.

function CatalogoPanel() {
    window.useIdioma();
    const t = window.t;
    const [disenos, setDisenos] = React.useState([]);
    const [servicios, setServicios] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [subiendo, setSubiendo] = React.useState(false);
    const [guardando, setGuardando] = React.useState(false);
    const [editando, setEditando] = React.useState(null);

    const formVacio = {
        titulo: '', descripcion: '', imagen_url: '',
        categoria: '', servicio_id: '', orden: '99'
    };
    const [form, setForm] = React.useState(formVacio);

    const cargar = React.useCallback(async () => {
        setCargando(true);
        window.catalogoInvalidarCache();
        const [lista, serviciosLista] = await Promise.all([
            window.catalogoObtenerDisenos({ incluirOcultos: true, forzar: true }),
            window.salonServicios.getAll(true)
        ]);
        setDisenos(lista || []);
        setServicios(serviciosLista || []);
        setCargando(false);
    }, []);

    React.useEffect(() => { cargar(); }, [cargar]);

    // Categorias ya usadas: se ofrecen como sugerencia para que el salon no
    // termine con "Navidad", "navidad" y "Navideño" como tres filtros distintos.
    const categoriasUsadas = React.useMemo(
        () => window.catalogoCategorias(disenos).map(c => c.nombre),
        [disenos]
    );

    const subirFoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!window.subirImagenCatalogo) {
            alert(t('No se cargó el subidor de imágenes. Recarga la página.'));
            return;
        }
        setSubiendo(true);
        try {
            const resultado = await window.subirImagenCatalogo(file, form.titulo || 'diseno');
            if (resultado?.url) setForm(actual => ({ ...actual, imagen_url: resultado.url }));
        } finally {
            setSubiendo(false);
        }
    };

    const abrirEdicion = (diseno) => {
        setEditando(diseno.id);
        setForm({
            titulo: diseno.titulo || '',
            descripcion: diseno.descripcion || '',
            imagen_url: diseno.imagen_url || '',
            categoria: diseno.categoria || '',
            servicio_id: diseno.servicio_id || '',
            orden: String(diseno.orden ?? 99)
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelar = () => {
        setEditando(null);
        setForm(formVacio);
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.titulo.trim()) { alert(t('Ponle un título al diseño.')); return; }
        if (!form.imagen_url) { alert(t('Sube una foto del diseño.')); return; }

        const servicio = servicios.find(s => String(s.id) === String(form.servicio_id));
        const datos = {
            titulo: form.titulo.trim(),
            descripcion: form.descripcion.trim() || null,
            imagen_url: form.imagen_url,
            categoria: form.categoria.trim() || 'general',
            servicio_id: form.servicio_id || null,
            servicio_nombre: servicio?.nombre || null,
            orden: parseInt(form.orden, 10) || 99
        };

        setGuardando(true);
        const resultado = editando
            ? await window.catalogoActualizarDiseno(editando, datos)
            : await window.catalogoCrearDiseno(datos);
        setGuardando(false);

        if (!resultado.success) {
            alert(t('No se pudo guardar el diseño.'));
            return;
        }
        cancelar();
        cargar();
    };

    const alternarVisible = async (diseno) => {
        await window.catalogoActualizarDiseno(diseno.id, { activo: !diseno.activo });
        cargar();
    };

    const eliminar = async (diseno) => {
        if (!confirm(t('¿Eliminar "{titulo}" del catálogo?', { titulo: diseno.titulo }))) return;
        const resultado = await window.catalogoEliminarDiseno(diseno.id);
        if (!resultado.success) { alert(t('No se pudo eliminar.')); return; }
        cargar();
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-1">
                    {editando ? t('Editar diseño') : t('Añadir diseño al catálogo')}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    {t('Tus clientas verán estos trabajos y podrán reservar el que más les guste.')}
                </p>

                <form onSubmit={guardar} className="space-y-3">
                    <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-xl bg-pink-50 border border-pink-100 overflow-hidden flex items-center justify-center shrink-0">
                            {form.imagen_url
                                ? <img src={window.urlImagenCloudinary(form.imagen_url, 200)} alt="" className="w-full h-full object-cover" />
                                : <span className="text-2xl">📸</span>}
                        </div>
                        <div className="flex-1">
                            <label className={`inline-block px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold cursor-pointer hover:bg-pink-600 ${subiendo ? 'opacity-60 pointer-events-none' : ''}`}>
                                {subiendo ? t('Subiendo...') : t('Elegir foto')}
                                <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendo} />
                            </label>
                            <p className="text-xs text-gray-400 mt-2">
                                {t('La foto se comprime sola antes de subirse. Usa una foto clara del trabajo terminado.')}
                            </p>
                        </div>
                    </div>

                    <input
                        type="text" value={form.titulo} maxLength={90}
                        onChange={e => setForm({ ...form, titulo: e.target.value })}
                        placeholder={t('Título del diseño (ej. Francés con flores doradas)')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />

                    <textarea
                        value={form.descripcion} rows={3} maxLength={900}
                        onChange={e => setForm({ ...form, descripcion: e.target.value })}
                        placeholder={t('Descripción: colores, acabado, ocasión... (opcional)')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <input
                                type="text" value={form.categoria} maxLength={40} list="catalogo-categorias"
                                onChange={e => setForm({ ...form, categoria: e.target.value })}
                                placeholder={t('Categoría')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            <datalist id="catalogo-categorias">
                                {categoriasUsadas.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>

                        <select
                            value={form.servicio_id}
                            onChange={e => setForm({ ...form, servicio_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                            <option value="">{t('Servicio (opcional)')}</option>
                            {servicios.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>

                        <input
                            type="number" value={form.orden} min="1" max="999"
                            onChange={e => setForm({ ...form, orden: e.target.value })}
                            placeholder={t('Orden')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <p className="text-xs text-gray-400">
                        {t('Si eliges un servicio, la clienta que reserve este diseño lo tendrá ya seleccionado.')}
                    </p>

                    <div className="flex gap-2">
                        <button type="submit" disabled={guardando}
                            className="px-5 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold hover:bg-pink-600 disabled:opacity-60">
                            {guardando ? t('Guardando...') : (editando ? t('Guardar cambios') : t('Publicar diseño'))}
                        </button>
                        {editando && (
                            <button type="button" onClick={cancelar}
                                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                                {t('Cancelar')}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">
                    {t('Diseños publicados ({n})', { n: disenos.length })}
                </h2>

                {cargando ? (
                    <p className="text-sm text-gray-400">{t('Cargando...')}</p>
                ) : disenos.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        {t('Todavía no has subido ningún diseño. Empieza con tus 5 mejores trabajos.')}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {disenos.map(diseno => {
                            const promedio = window.catalogoPromedio(diseno);
                            return (
                                <div key={diseno.id}
                                    className={`flex gap-3 border rounded-xl p-3 ${diseno.activo ? 'border-gray-100' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                                    <img
                                        src={window.urlImagenCloudinary(diseno.imagen_url, 160)}
                                        alt={diseno.titulo} loading="lazy"
                                        className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{diseno.titulo}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {diseno.categoria}
                                            {diseno.servicio_nombre && ` · ${diseno.servicio_nombre}`}
                                        </p>
                                        <p className="text-xs text-pink-500 mt-0.5">
                                            {promedio === null
                                                ? t('Sin votos todavía')
                                                : t('❤️ {p}% · {n} voto(s)', { p: promedio, n: diseno.votos_conteo })}
                                        </p>
                                        <div className="flex gap-3 mt-1.5 text-xs font-medium">
                                            <button onClick={() => abrirEdicion(diseno)} className="text-blue-600">{t('Editar')}</button>
                                            <button onClick={() => alternarVisible(diseno)} className="text-gray-600">
                                                {diseno.activo ? t('Ocultar') : t('Mostrar')}
                                            </button>
                                            <button onClick={() => eliminar(diseno)} className="text-red-500">{t('Eliminar')}</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
