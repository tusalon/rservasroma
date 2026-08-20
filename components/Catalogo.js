// components/Catalogo.js - Galeria de disenos del salon
//
// La clienta ve los trabajos reales, vota cuanto le gusta cada uno y reserva
// el que quiere sin salir de la app. Datos: utils/catalogo.js.

function Catalogo({ onGoBack, onReservarDiseno, cliente }) {
    window.useIdioma();
    const t = window.t;
    const [disenos, setDisenos] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [categoria, setCategoria] = React.useState('todas');
    const [abierto, setAbierto] = React.useState(null);
    const [config, setConfig] = React.useState(null);

    React.useEffect(() => {
        let vivo = true;
        Promise.all([
            window.catalogoObtenerDisenos(),
            window.cargarConfiguracionNegocio()
        ]).then(([lista, configData]) => {
            if (!vivo) return;
            setDisenos(lista || []);
            setConfig(configData);
            setCargando(false);
        }).catch(() => vivo && setCargando(false));
        return () => { vivo = false; };
    }, []);

    // El color va por asegurarColorVisible porque hay salones con el blanco
    // como color de marca: sin esto el botón de reservar queda blanco sobre
    // blanco y "Ver más" invisible. Es la misma regla que aplica el tema
    // global, así que el catálogo queda igual que el resto de la app.
    const colorPrimario = window.asegurarColorVisible
        ? window.asegurarColorVisible(config?.color_primario, '#ec4899')
        : (config?.color_primario || '#ec4899');
    // El catálogo se lee por secciones, como un álbum: cada categoría con su
    // título. Los chips de arriba sirven para saltar a una sola.
    const grupos = React.useMemo(() => window.catalogoAgrupar(disenos), [disenos]);
    const gruposVisibles = React.useMemo(() => (
        categoria === 'todas' ? grupos : grupos.filter(g => g.nombre === categoria)
    ), [grupos, categoria]);

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
            <Header
                cliente={cliente}
                onGoBack={onGoBack}
                userRol="cliente"
                showBackButton={true}
            />

            <div className="max-w-3xl mx-auto px-4 pb-20">
                <div className="pt-4 pb-2 text-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        ✨ {t('Nuestros diseños')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('Elige el que te enamore y resérvalo al momento.')}
                    </p>
                </div>

                {disenos.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center mt-4">
                        <p className="text-4xl mb-3">📸</p>
                        <p className="text-gray-600 font-medium">{t('Todavía no hay diseños publicados')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('Vuelve pronto: el salón está preparando su catálogo.')}</p>
                    </div>
                ) : (
                    <React.Fragment>
                        {/* Filtro pegajoso: en un catalogo largo la clienta debe poder
                            cambiar de categoria sin volver arriba del todo. */}
                        {grupos.length > 1 && (
                            <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-pink-50/90 backdrop-blur">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    <BotonCategoria
                                        activo={categoria === 'todas'}
                                        color={colorPrimario}
                                        onClick={() => setCategoria('todas')}
                                        texto={`${t('Todas')} · ${disenos.length}`}
                                    />
                                    {grupos.map(g => (
                                        <BotonCategoria
                                            key={g.nombre}
                                            activo={categoria === g.nombre}
                                            color={colorPrimario}
                                            onClick={() => setCategoria(g.nombre)}
                                            texto={`${g.nombre} · ${g.disenos.length}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-3 space-y-6">
                            {gruposVisibles.map(grupo => (
                                <section key={grupo.nombre}>
                                    <div className="flex items-baseline justify-between mb-2">
                                        <h2 className="text-base font-bold text-gray-800">{grupo.nombre}</h2>
                                        <span className="text-xs text-gray-400">
                                            {grupo.disenos.length === 1
                                                ? t('1 diseño')
                                                : t('{n} diseños', { n: grupo.disenos.length })}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {grupo.disenos.map(diseno => (
                                            <TarjetaDiseno
                                                key={diseno.id}
                                                diseno={diseno}
                                                onClick={() => setAbierto(diseno)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </React.Fragment>
                )}
            </div>

            {abierto && (
                <ModalDiseno
                    /* Se relee de la lista para que el promedio del modal se
                       actualice en cuanto la clienta envía su voto. */
                    diseno={disenos.find(d => d.id === abierto.id) || abierto}
                    colorPrimario={colorPrimario}
                    cliente={cliente}
                    onCerrar={() => setAbierto(null)}
                    onReservar={onReservarDiseno}
                    onVotoEnviado={(id, promedio, conteo) => {
                        setDisenos(actual => actual.map(d => (
                            d.id === id ? { ...d, votos_suma: promedio * conteo, votos_conteo: conteo } : d
                        )));
                    }}
                />
            )}
        </div>
    );
}

function BotonCategoria({ activo, color, onClick, texto }) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition ${activo ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
            style={activo ? { backgroundColor: color } : undefined}>
            {texto}
        </button>
    );
}

function TarjetaDiseno({ diseno, onClick }) {
    const [cargada, setCargada] = React.useState(false);
    const promedio = window.catalogoPromedio(diseno);
    const miniatura = window.urlImagenCloudinary(diseno.imagen_url, 500);
    const borrosa = window.urlImagenCloudinary(diseno.imagen_url, 24);

    return (
        <button
            onClick={onClick}
            className="text-left bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition">
            <div className="relative aspect-square bg-pink-100">
                {/* Miniatura borrosa de 24px mientras baja la real: en conexiones
                    lentas la clienta ve algo desde el primer segundo. */}
                <img src={borrosa} alt="" aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-lg scale-110" />
                <img
                    src={miniatura}
                    alt={diseno.titulo}
                    loading="lazy"
                    onLoad={() => setCargada(true)}
                    className={`relative w-full h-full object-cover transition-opacity duration-500 ${cargada ? 'opacity-100' : 'opacity-0'}`} />
                {promedio !== null && (
                    <span className="absolute right-2 top-2 bg-white/90 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        ❤️ {promedio}%
                    </span>
                )}
            </div>
            <div className="p-2">
                <p className="text-sm font-medium text-gray-800 line-clamp-2">{diseno.titulo}</p>
                {diseno.servicio_nombre && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{diseno.servicio_nombre}</p>
                )}
            </div>
        </button>
    );
}

function ModalDiseno({ diseno, colorPrimario, cliente, onCerrar, onReservar, onVotoEnviado }) {
    window.useIdioma();
    const t = window.t;
    const votoPrevio = window.catalogoVotoPropio(diseno.id);
    const [puntuacion, setPuntuacion] = React.useState(votoPrevio === null ? 80 : votoPrevio);
    const [enviando, setEnviando] = React.useState(false);
    const [votado, setVotado] = React.useState(votoPrevio !== null);
    const [textoCompleto, setTextoCompleto] = React.useState(false);
    // Si ya tiene sesión, su nombre viene puesto; si votó antes desde este
    // teléfono, se reusa el que escribió. Solo teclea quien llega de cero.
    const [nombre, setNombre] = React.useState(
        () => cliente?.nombre || window.catalogoNombreGuardado() || ''
    );
    const promedio = window.catalogoPromedio(diseno);
    const descripcion = String(diseno.descripcion || '');
    const descripcionLarga = descripcion.length > 220;

    const enviarVoto = async () => {
        setEnviando(true);
        const resultado = await window.catalogoVotar(diseno.id, puntuacion, nombre, diseno.titulo);
        setEnviando(false);
        if (!resultado.success) {
            alert(t('No se pudo enviar tu voto. Revisa tu conexión.'));
            return;
        }
        setVotado(true);
        // Reflejar el voto al instante sin recargar toda la galería: si este
        // dispositivo ya había votado, el conteo no sube, solo cambia la suma.
        const conteo = (parseInt(diseno.votos_conteo, 10) || 0) + (votoPrevio === null ? 1 : 0);
        const suma = (parseInt(diseno.votos_suma, 10) || 0) - (votoPrevio || 0) + puntuacion;
        onVotoEnviado(diseno.id, Math.round(suma / Math.max(1, conteo)), conteo);
    };

    const compartir = async () => {
        const datos = {
            title: diseno.titulo,
            text: `${diseno.titulo} 💅`,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(datos);
            } else {
                await navigator.clipboard.writeText(`${datos.text} ${datos.url}`);
                alert(t('Enlace copiado'));
            }
        } catch (e) {
            // Compartir cancelado por la usuaria: no es un error que avisar.
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={onCerrar}>
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <img
                        src={window.urlImagenCloudinary(diseno.imagen_url, 900)}
                        alt={diseno.titulo}
                        className="w-full max-h-[55vh] object-contain bg-pink-50 rounded-t-3xl" />
                    <button onClick={onCerrar}
                        className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 shadow text-gray-600 text-lg leading-none">
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{diseno.titulo}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {diseno.categoria}
                            {promedio !== null && ` · ❤️ ${promedio}% (${diseno.votos_conteo})`}
                        </p>
                    </div>

                    {descripcion && (
                        <div>
                            <p className={`text-sm text-gray-600 whitespace-pre-line ${textoCompleto || !descripcionLarga ? '' : 'line-clamp-4'}`}>
                                {descripcion}
                            </p>
                            {descripcionLarga && (
                                <button onClick={() => setTextoCompleto(!textoCompleto)}
                                    className="text-xs font-medium mt-1" style={{ color: colorPrimario }}>
                                    {textoCompleto ? t('Ver menos') : t('Ver más')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Lo que el catálogo tiene que conseguir: que la clienta pase
                        de "me gusta" a turno reservado sin buscar el servicio. */}
                    <button
                        onClick={() => onReservar(diseno)}
                        className="w-full text-white font-bold py-3 rounded-full shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
                        style={{ backgroundColor: colorPrimario }}>
                        <span>💖</span>
                        <span>{t('Reservar este diseño')}</span>
                    </button>

                    <button onClick={compartir}
                        className="w-full py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium">
                        🔗 {t('Compartir')}
                    </button>

                    <div className="bg-pink-50 rounded-2xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            {votado ? t('Tu voto: {n}%', { n: puntuacion }) : t('¿Cuánto te gusta?')}
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min="0" max="100" step="5"
                                value={puntuacion}
                                onChange={e => setPuntuacion(parseInt(e.target.value, 10))}
                                className="flex-1 accent-pink-500" />
                            <span className="text-sm font-bold w-12 text-right" style={{ color: colorPrimario }}>
                                {puntuacion}%
                            </span>
                        </div>
                        <input
                            type="text" value={nombre} maxLength={60}
                            onChange={e => setNombre(e.target.value)}
                            placeholder={t('¿Cómo te llamas? (opcional)')}
                            className="w-full mt-3 px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400" />
                        <p className="text-xs text-gray-400 mt-1">
                            {t('Así el salón sabe a quién le gustó su trabajo 💕')}
                        </p>

                        <button
                            onClick={enviarVoto}
                            disabled={enviando}
                            className="w-full mt-3 py-2 rounded-full text-white text-sm font-bold disabled:opacity-60"
                            style={{ backgroundColor: colorPrimario }}>
                            {enviando ? t('Enviando...') : (votado ? t('Cambiar mi voto') : t('Enviar mi voto'))}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
