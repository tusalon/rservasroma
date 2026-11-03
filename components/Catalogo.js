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
    const [precios, setPrecios] = React.useState({});
    const [servicios, setServicios] = React.useState([]);

    // Cada foto ensena el precio del servicio que tiene enlazado: la clienta
    // no deberia enamorarse de un diseno sin saber cuanto cuesta.
    React.useEffect(() => {
        let vivo = true;
        Promise.all([
            window.catalogoObtenerDisenos(),
            window.cargarConfiguracionNegocio(),
            // El .catch() no sobra: sin el, un fallo pidiendo los servicios
            // tumba el Promise.all entero y la galeria sale vacia aunque las
            // fotos ya estuvieran descargadas. Los precios son un adorno; los
            // disenos, no.
            window.salonServicios
                ? window.salonServicios.getAll(true).catch(() => null)
                : Promise.resolve(null)
        ]).then(([lista, configData, servicios]) => {
            if (!vivo) return;
            setDisenos(lista || []);
            setConfig(configData);
            // Enlace a un diseño concreto (?d=ID, ver enlaceDiseno): se abre
            // directamente en el visor en vez de dejarla buscando en la galería.
            const pedido = new URLSearchParams(window.location.search).get('d');
            const encontrado = pedido && (lista || []).find(d => String(d.id) === pedido);
            if (encontrado) setAbierto(encontrado);
            if (servicios) {
                setPrecios(window.catalogoMapaPrecios?.(servicios) || {});
                setServicios(servicios);
            }
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
    // El visor pasa de un diseño al siguiente en el mismo orden de la galería.
    const enVisor = gruposVisibles.flatMap(g => g.disenos);
    const posicion = abierto ? enVisor.findIndex(d => d.id === abierto.id) : -1;
    const moverVisor = (paso) => {
        if (enVisor.length < 2 || posicion < 0) return;
        setAbierto(enVisor[(posicion + paso + enVisor.length) % enVisor.length]);
    };
    // Lo que se comparte abre esta foto, no la galería entera.
    const enlaceDiseno = (diseno) => {
        try {
            const url = new URL(window.construirUrlCatalogoNegocio?.(config) || window.location.href);
            url.searchParams.set('ir', 'catalogo');
            url.searchParams.set('d', diseno.id);
            return url.toString();
        } catch (e) {
            return window.location.href;
        }
    };

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
                        ✨ {t('Nuestro catálogo')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('Elige lo que te enamore y pide tu cita.')}
                    </p>
                </div>

                {disenos.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center mt-4">
                        <p className="text-4xl mb-3">📸</p>
                        <p className="text-gray-600 font-medium">{t('Todavía no hay fotos en el catálogo')}</p>
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
                                                ? t('1 foto')
                                                : t('{n} fotos', { n: grupo.disenos.length })}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {grupo.disenos.map(diseno => (
                                            <TarjetaDiseno
                                                key={diseno.id}
                                                diseno={diseno}
                                                precio={precios[String(diseno.servicio_id)]}
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
                    // key: al pasar de diseño, el "me encanta" y el "ver más" empiezan de cero.
                    key={abierto.id}
                    /* Se relee de la lista para que el promedio del modal se
                       actualice en cuanto la clienta envía su voto. */
                    diseno={disenos.find(d => d.id === abierto.id) || abierto}
                    posicion={posicion}
                    total={enVisor.length}
                    onAnterior={() => moverVisor(-1)}
                    onSiguiente={() => moverVisor(1)}
                    enlace={enlaceDiseno(abierto)}
                    precio={precios[String(abierto.servicio_id)]}
                    servicio={servicios.find(s => String(s.id) === String(abierto.servicio_id))}
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

function TarjetaDiseno({ diseno, onClick, precio }) {
    const [cargada, setCargada] = React.useState(false);
    const meGusta = parseInt(diseno.votos_conteo, 10) || 0;
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
                {meGusta > 0 && (
                    <span className="absolute right-2 top-2 bg-white/90 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        ♥ {meGusta}
                    </span>
                )}
            </div>
            <div className="p-2">
                <p className="text-sm font-medium text-gray-800 line-clamp-2">{diseno.titulo}</p>
                {diseno.servicio_nombre && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{diseno.servicio_nombre}</p>
                )}
                {precio && (
                    <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{precio}</p>
                )}
            </div>
        </button>
    );
}

function ModalDiseno({ diseno, precio, servicio, colorPrimario, cliente, onCerrar, onReservar, onVotoEnviado, posicion, total, onAnterior, onSiguiente, enlace }) {
    window.useIdioma();
    const t = window.t;
    const votoPrevio = window.catalogoVotoPropio(diseno.id);
    // Un toque = "me encanta". Se guarda como un voto de 100 para que los
    // promedios de los votos de antes (0-100 %) sigan valiendo en el panel.
    const [meEncanta, setMeEncanta] = React.useState(votoPrevio !== null);
    const [enviando, setEnviando] = React.useState(false);
    const [textoCompleto, setTextoCompleto] = React.useState(false);
    const meGusta = parseInt(diseno.votos_conteo, 10) || 0;
    const inicioToque = React.useRef(null);
    // Deslizar con el dedo sobre la foto pasa al diseño de al lado.
    const alSoltar = (e) => {
        if (inicioToque.current === null) return;
        const dx = e.changedTouches[0].clientX - inicioToque.current;
        inicioToque.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? onSiguiente : onAnterior)();
    };
    const descripcion = String(diseno.descripcion || '');
    const descripcionLarga = descripcion.length > 220;

    const marcarMeEncanta = async () => {
        if (meEncanta || enviando) return;
        setEnviando(true);
        // Si tiene sesión va con su nombre; si votó antes desde este teléfono,
        // con el que escribió entonces.
        const nombre = cliente?.nombre || window.catalogoNombreGuardado() || '';
        const resultado = await window.catalogoVotar(diseno.id, 100, nombre, diseno.titulo);
        setEnviando(false);
        if (!resultado.success) return;
        setMeEncanta(true);
        const conteo = meGusta + 1;
        const suma = (parseInt(diseno.votos_suma, 10) || 0) + 100;
        onVotoEnviado(diseno.id, Math.round(suma / conteo), conteo);
    };

    const compartir = async () => {
        const datos = {
            title: diseno.titulo,
            text: `${diseno.titulo} ✨`,
            url: enlace || window.location.href
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
                <div className="relative"
                    onTouchStart={(e) => { inicioToque.current = e.touches[0].clientX; }}
                    onTouchEnd={alSoltar}>
                    <img
                        src={window.urlImagenCloudinary(diseno.imagen_url, 900)}
                        alt={diseno.titulo}
                        className="w-full max-h-[55vh] object-contain bg-pink-50 rounded-t-3xl" />
                    <button onClick={onCerrar} aria-label={t('Cerrar')}
                        className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 shadow text-gray-600 text-lg leading-none">
                        ✕
                    </button>
                    {total > 1 && (
                        <>
                            <button onClick={onAnterior} aria-label={t('Diseño anterior')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-gray-800 text-2xl leading-none">
                                ‹
                            </button>
                            <button onClick={onSiguiente} aria-label={t('Diseño siguiente')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-gray-800 text-2xl leading-none">
                                ›
                            </button>
                            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs font-bold px-2.5 py-1 rounded-full tabular-nums">
                                {posicion + 1} / {total}
                            </span>
                        </>
                    )}
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{diseno.titulo}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{diseno.categoria}</p>
                        {precio && (
                            <p className="text-base font-bold mt-1" style={{ color: colorPrimario }}>{precio}</p>
                        )}
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
                        de "me gusta" a cita reservada sin buscar el servicio. */}
                    <button
                        onClick={() => onReservar(diseno)}
                        className="w-full text-white font-bold py-3 rounded-full shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2"
                        style={{ backgroundColor: colorPrimario }}>
                        <span>{t('Pedir mi cita')}</span>
                    </button>
                    {/* Qué se está pidiendo, antes de tocar el botón. */}
                    <p className="text-sm text-gray-600 text-center -mt-2">
                        {servicio
                            ? t('Se reserva como: {servicio}', { servicio: [servicio.nombre, servicio.duracion ? `${servicio.duracion} min` : '', precio].filter(Boolean).join(' · ') })
                            : t('Al pedir la cita, elige el servicio que más se parezca.')}
                    </p>

                    <button type="button" onClick={marcarMeEncanta} disabled={enviando}
                        className={`w-full py-2.5 rounded-full text-sm font-bold border-2 transition ${meEncanta ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-700'}`}>
                        {meEncanta ? `♥ ${t('Te encanta')}` : `♡ ${t('Me encanta')}`}{meGusta > 0 ? ` · ${meGusta}` : ''}
                    </button>

                    <button onClick={compartir}
                        className="w-full py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium">
                        🔗 {t('Compartir este diseño')}
                    </button>

                </div>
            </div>
        </div>
    );
}
