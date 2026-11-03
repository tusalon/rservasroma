// components/ClientAuthScreen.js - Login por teléfono con registro automático

function ClientAuthScreen({ onAccessGranted, onGoBack, disenoPendiente }) {
    window.useIdioma();
    const t = window.t;
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);
    const [nombre, setNombre] = React.useState('');
    const [whatsapp, setWhatsapp] = React.useState('');
    const [error, setError] = React.useState('');
    const [clienteBloqueado, setClienteBloqueado] = React.useState(null);
    // Clienta registrada pero esperando que el salón la acepte (solo pasa si el
    // negocio activó "aprobar a mano" en Editar Negocio).
    const [clientePendiente, setClientePendiente] = React.useState(null);
    const [verificando, setVerificando] = React.useState(false);
    const [necesitaNombre, setNecesitaNombre] = React.useState(false);
    const [esProfesional, setEsProfesional] = React.useState(false);
    const [profesionalInfo, setProfesionalInfo] = React.useState(null);
    const [profesionalPassword, setProfesionalPassword] = React.useState('');
    const [esAdmin, setEsAdmin] = React.useState(false);
    const [codigoPaisCliente, setCodigoPaisCliente] = React.useState('53');
    // Cumpleaños opcional: solo se pregunta si el salon tiene bonificacion.
    const [cumpleDia, setCumpleDia] = React.useState('');
    const [cumpleMes, setCumpleMes] = React.useState('');
    // El registro va en dos pasos cortos: nombre y luego cumpleaños. Así el
    // botón no queda tapado por el teclado y la clienta sabe cuánto le falta.
    const [pasoCumple, setPasoCumple] = React.useState(false);

    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            setConfig(configData);
            setCodigoPaisCliente(window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(configData) : '53');
            setCargando(false);
        };
        cargarDatos();

    }, []);

    const getNegocioActual = () => {
        return window.NEGOCIO_ID_POR_DEFECTO ||
            (typeof window.getNegocioId === 'function' ? window.getNegocioId() : localStorage.getItem('negocioId'));
    };

    const guardarNegocioEnSesion = () => {
        const negocioId = getNegocioActual();
        if (negocioId) localStorage.setItem('negocioId', negocioId);
        if (config?.nombre) localStorage.setItem('negocioNombre', config.nombre);
    };

    const resetCliente = () => {
        setNecesitaNombre(false);
        setClienteBloqueado(null);
        setEsProfesional(false);
        setProfesionalInfo(null);
        setProfesionalPassword('');
        setEsAdmin(false);
        setError('');
        setPasoCumple(false);
    };

    const debounceTelefonoRef = React.useRef(null);
    const verificacionIdRef = React.useRef(0);

    // Al escribir: actualizar el input al instante, pero consultar Supabase solo
    // cuando el número está completo y tras una pausa (antes: un fetch POR CADA
    // TECLA desde el 7mo dígito, sin cancelación — carrera + datos quemados).
    const manejarCambioTelefono = (valor) => {
        const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : '53');
        const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
        const numeroLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(valor, codigoPais)
            : valor.replace(/\D/g, '');

        setWhatsapp(numeroLimpio);
        if (debounceTelefonoRef.current) clearTimeout(debounceTelefonoRef.current);

        if (numeroLimpio.length < (paisTelefono.localLength || 8)) {
            resetCliente();
            return;
        }

        debounceTelefonoRef.current = setTimeout(() => verificarNumero(numeroLimpio), 450);
    };

    const verificarNumero = async (numero) => {
        const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : '53');
        const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
        const numeroLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(numero, codigoPais)
            : numero.replace(/\D/g, '');
        setWhatsapp(numeroLimpio);

        if (numeroLimpio.length < Math.min(7, paisTelefono.localLength || 8)) {
            resetCliente();
            return;
        }

        // Si el número cambia mientras esta verificación está en vuelo, sus
        // respuestas se descartan (una respuesta vieja no debe pisar la nueva).
        const miVerificacion = ++verificacionIdRef.current;

        setVerificando(true);
        setError('');
        setNecesitaNombre(false);
        setClienteBloqueado(null);
        setEsProfesional(false);
        setProfesionalInfo(null);
        setProfesionalPassword('');
        setEsAdmin(false);

        const numeroCompleto = window.normalizarTelefonoInternacional
            ? window.normalizarTelefonoInternacional(numeroLimpio, codigoPais)
            : `53${numeroLimpio}`;

        try {
            const telefonoDuennoLocal = window.normalizarTelefonoLocal
                ? window.normalizarTelefonoLocal(config?.telefono || '', codigoPais)
                : String(config?.telefono || '').replace(/\D/g, '');
            if (numeroLimpio === telefonoDuennoLocal) {
                guardarNegocioEnSesion();

                const tieneSesion = window.sesionPanelVigente('adminLoginTime');
                window.location.href = window.construirRutaConSlug(tieneSesion ? 'admin.html' : 'admin-login.html');
                return;
            }

            if (window.verificarProfesionalPorTelefono) {
                const profesional = await window.verificarProfesionalPorTelefono(numeroLimpio);
                if (verificacionIdRef.current !== miVerificacion) return;
                if (profesional) {
                    setEsProfesional(true);
                    setProfesionalInfo(profesional);
                    setProfesionalPassword('');
                    setEsAdmin(false);
                    setNecesitaNombre(false);
                    return;
                }
            }

            const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
            if (verificacionIdRef.current !== miVerificacion) return;
            if (bloqueo) {
                setClienteBloqueado(bloqueo);
                setNecesitaNombre(false);
                setError(t('Este número no tiene permiso para registrarse ni reservar. Contacta al negocio.'));
                return;
            }

            const cliente = await window.verificarAccesoCliente(numeroCompleto);
            if (verificacionIdRef.current !== miVerificacion) return;
            if (cliente?.pendiente) {
                setClientePendiente(cliente);
                setNecesitaNombre(false);
                return;
            }
            if (cliente) {
                guardarNegocioEnSesion();
                onAccessGranted(cliente.nombre, numeroCompleto);
                return;
            }

            setNecesitaNombre(true);
        } catch (err) {
            if (verificacionIdRef.current !== miVerificacion) return;
            console.error('Error verificando teléfono:', err);
            setError(t('No pudimos verificar el número. Revisa tu conexión e intenta de nuevo.'));
        } finally {
            if (verificacionIdRef.current === miVerificacion) setVerificando(false);
        }
    };

    const ingresarComoProfesional = async () => {
        if (!profesionalInfo) return;
        if (!String(profesionalPassword || '').trim()) {
            setError(t('Ingresa tu contraseña profesional.'));
            return;
        }

        setVerificando(true);
        setError('');

        try {
            const profesional = await window.loginProfesional?.(whatsapp, profesionalPassword);
            if (!profesional) {
                setError(t('Teléfono o contraseña profesional incorrectos.'));
                return;
            }

            guardarNegocioEnSesion();
            if (typeof window.borrarClienteAuthActual === 'function') window.borrarClienteAuthActual();
            else localStorage.removeItem('clienteAuth');
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminLoginTime');
            // adminSlug: el guard de admin.html compara este slug con el ?s=
            // de la URL para no mostrar datos de otro salón.
            const slugSesionProfesional = window._rservasSlugActual || localStorage.getItem('negocioSlug') || '';
            if (slugSesionProfesional) localStorage.setItem('adminSlug', slugSesionProfesional);
            localStorage.setItem('profesionalAuth', JSON.stringify({
                id: profesional.id,
                nombre: profesional.nombre,
                telefono: profesional.telefono,
                nivel: profesional.nivel || 1
            }));
            localStorage.setItem('profesionalLoginTime', Date.now());
            window.location.href = window.construirRutaConSlug('admin.html');
        } catch (err) {
            console.error('Error ingresando como profesional:', err);
            setError(t('Error al iniciar sesión profesional. Intenta de nuevo.'));
        } finally {
            setVerificando(false);
        }
    };

    // sinCumple: "Prefiero no decirlo" registra sin cumpleaños aunque haya
    // tocado un mes antes.
    const handleSubmit = async (e, sinCumple = false) => {
        e.preventDefault();

        const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : '53');
        const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
        const numeroLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(whatsapp, codigoPais)
            : whatsapp.replace(/\D/g, '');
        const numeroCompleto = window.normalizarTelefonoInternacional
            ? window.normalizarTelefonoInternacional(numeroLimpio, codigoPais)
            : `53${numeroLimpio}`;

        if (numeroLimpio.length < Math.min(7, paisTelefono.localLength || 8)) {
            setError(t('Ingresa un número de WhatsApp válido.'));
            return;
        }

        if (esAdmin || esProfesional) return;

        if (!necesitaNombre) {
            await verificarNumero(numeroLimpio);
            return;
        }

        if (!nombre.trim()) {
            setError(t('Ingresa tu nombre completo para registrarte.'));
            return;
        }

        if (window.cumpleanos && !pasoCumple) {
            setError('');
            setPasoCumple(true);
            return;
        }

        setVerificando(true);
        setError('');

        try {
            const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
            if (bloqueo) {
                setClienteBloqueado(bloqueo);
                setError(t('Este número no tiene permiso para registrarse ni reservar. Contacta al negocio.'));
                return;
            }

            const clienteExistente = await window.verificarAccesoCliente(numeroCompleto);
            if (clienteExistente?.pendiente) {
                setClientePendiente(clienteExistente);
                return;
            }
            if (clienteExistente) {
                guardarNegocioEnSesion();
                onAccessGranted(clienteExistente.nombre, numeroCompleto);
                return;
            }

            // Con solo uno de los dos (dia o mes) no se guarda nada.
            const cumpleElegido = sinCumple ? null : window.cumpleanos?.normalizarCumple(cumpleDia, cumpleMes);
            const nuevoCliente = await window.crearCliente(nombre.trim(), numeroCompleto, cumpleElegido);
            if (nuevoCliente?.pendiente) {
                setClientePendiente(nuevoCliente);
            } else if (nuevoCliente) {
                guardarNegocioEnSesion();
                onAccessGranted(nuevoCliente.nombre || nombre.trim(), numeroCompleto);
            } else {
                setError(window.ultimoErrorCliente || t('Error al crear el cliente. Intenta más tarde.'));
            }
        } catch (err) {
            console.error('Error registrando cliente:', err);
            setError(t('Error en el sistema. Intenta más tarde.'));
        } finally {
            setVerificando(false);
        }
    };

    // Solo se espera la config (rápida); la imagen de fondo NUNCA bloquea el
    // formulario — hace fade-in cuando llega (clave en conexiones lentas).
    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const nombreNegocio = config?.nombre || 'Mi Salón';
    const logoUrl = config?.logo_url;
    const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPaisCliente }) : { codigo: '53', bandera: '🇨🇺', ejemplo: '51234567', localLength: 8 };
    const paisesTelefono = window.PHONE_COUNTRIES || [paisTelefono];
    const fondoPortada = {
        image: window.getHeroBackgroundImage
            ? window.getHeroBackgroundImage(config)
            : (config?.imagen_fondo_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=60&w=800&auto=format&fit=crop'),
        label: 'Fondo de salon'
    };
    // Uno para todos: ver WelcomeScreen.js. La especialidad dice "Uñas" en
    // 405 de 440 negocios, sean de lo que sean.
    const sticker = '✨';

    return (
        <div className="client-auth-screen min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="client-auth-background absolute inset-0 z-0 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400">
                <img
                    src={fondoPortada.image}
                    alt={t('Fondo de salón')}
                    onLoad={() => setImagenCargada(true)}
                    className={`client-auth-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="client-auth-overlay absolute inset-0 bg-black/40"></div>
            </div>

            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="client-auth-back absolute top-4 left-4 z-20 w-10 h-10 bg-pink-500/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors border border-pink-300"
                    title={t('Volver')}
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            <div className="client-auth-content relative z-10 max-w-md w-full mx-auto">
                <div className="client-auth-card bg-black/15 backdrop-blur-[1px] p-8 rounded-2xl shadow-2xl border border-pink-300/25">
                    <div className="text-center mb-6">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={nombreNegocio}
                                className="w-20 h-20 object-contain mx-auto rounded-xl ring-4 ring-pink-300/35 bg-white/70"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center bg-pink-500 ring-4 ring-pink-300/35">
                                <span className="text-3xl">{sticker}</span>
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-white mt-4">{nombreNegocio}</h1>
                    </div>

                    {/* Llegó desde el catálogo compartido en redes: se le
                        recuerda qué diseño está a punto de reservar, para que el
                        formulario no parezca un peaje salido de la nada. */}
                    {disenoPendiente && (
                        <div className="mb-4 flex items-center gap-3 bg-white/15 border border-white/25 rounded-xl p-3">
                            <img
                                src={window.urlImagenCloudinary
                                    ? window.urlImagenCloudinary(disenoPendiente.imagen_url, 120)
                                    : disenoPendiente.imagen_url}
                                alt={disenoPendiente.titulo}
                                className="w-14 h-14 rounded-lg object-cover shrink-0" />
                            <div className="min-w-0 text-left">
                                <p className="text-xs text-pink-200 font-medium">
                                    {t('Para pedir tu cita')}
                                </p>
                                <p className="text-sm text-white font-bold truncate">{disenoPendiente.titulo}</p>
                                <p className="text-xs text-white/70 mt-0.5">
                                    {t('Entra con tu WhatsApp: es un paso y ya quedas registrada.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Esperando el visto bueno del salón: no se le muestra el
                        formulario, para que no vuelva a intentarlo en círculos. */}
                    {clientePendiente && (
                        <div className="bg-white/15 border border-white/25 rounded-xl p-5 text-center">
                            <p className="text-4xl mb-2">⏳</p>
                            <h2 className="text-lg font-bold text-white mb-2">
                                {t('Tu solicitud ya llegó')}
                            </h2>
                            <p className="text-sm text-white/85 leading-relaxed">
                                {t('{negocio} tiene que aceptarte antes de que puedas reservar. Te avisamos por aquí mismo: vuelve a entrar con tu WhatsApp más tarde.', { negocio: nombreNegocio || t('El salón') })}
                            </p>
                        </div>
                    )}

                    {!clientePendiente && (
                    <h2 className="text-lg font-semibold text-white mb-4 text-center bg-pink-500/30 p-3 rounded-lg">
                        {!necesitaNombre ? t('Entra con tu WhatsApp')
                            : !window.cumpleanos ? t('Primera vez aquí — bienvenida')
                            : pasoCumple ? t('Primera vez · 2 de 2') : t('Primera vez · 1 de 2')}
                    </h2>
                    )}

                    {!clientePendiente && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div hidden={pasoCumple}>
                            <label className="block text-sm font-medium text-white mb-1">
                                {t('Tu número de WhatsApp')}
                            </label>
                            <div className="flex">
                                <select
                                    value={codigoPaisCliente}
                                    onChange={(e) => {
                                        const nuevoCodigo = e.target.value;
                                        const local = window.normalizarTelefonoLocal
                                            ? window.normalizarTelefonoLocal(whatsapp, nuevoCodigo)
                                            : whatsapp.replace(/\D/g, '');
                                        setCodigoPaisCliente(nuevoCodigo);
                                        setWhatsapp(local);
                                        resetCliente();
                                    }}
                                    className="w-32 px-2 py-3 rounded-l-lg border border-r-0 border-pink-300/30 bg-black/40 text-pink-100 text-sm outline-none"
                                >
                                    {paisesTelefono.map((pais) => (
                                        <option key={pais.id} value={pais.codigo}>{pais.bandera} +{pais.codigo}</option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    name="telefono"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    value={whatsapp}
                                    onChange={(e) => manejarCambioTelefono(e.target.value)}
                                    className="w-full px-4 py-3 rounded-r-lg border border-pink-300/30 bg-black/20 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder={paisTelefono.ejemplo || '51234567'}
                                    required
                                />
                            </div>
                            {!necesitaNombre && !esProfesional && (
                                <p className="text-sm text-white/90 mt-1.5">
                                    {t('Si ya reservaste antes, entrarás directo sin contraseña.')}
                                </p>
                            )}
                        </div>

                        {necesitaNombre && !clienteBloqueado && !esAdmin && !esProfesional && !pasoCumple && (
                            <div>
                                <p className="text-sm text-white/90 mb-3">
                                    {t('Número nuevo — solo necesitamos tu nombre para registrarte.')}
                                </p>
                                <label className="block text-sm font-medium text-white mb-1">
                                    {t('Tu nombre completo')}
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    autoComplete="name"
                                    autoCapitalize="words"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-pink-300/30 bg-black/20 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder={t('Ej: María Pérez')}
                                    autoFocus
                                />

                            </div>
                        )}

                        {necesitaNombre && pasoCumple && window.cumpleanos && (
                            <div className="space-y-3">
                                <p className="text-xl font-bold text-white">{t('¿Cuándo es tu cumple?')}</p>
                                <p className="text-sm font-semibold text-white bg-white/15 rounded-lg px-3 py-2">
                                    {window.cumpleanos.bonificacionConfig(config).activa
                                        ? t('Tu salón puede tener un detalle para ti ese día.')
                                        : t('Así tu salón podrá felicitarte ese día.')}
                                </p>
                                {/* Meses en píldoras y, al elegir uno, sus días. Columnas en
                                    línea: legacy-ios-fallback.css pasa grid-cols-3/4 a dos. */}
                                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <button key={i} type="button"
                                            onClick={() => { setCumpleMes(String(i + 1)); setCumpleDia(''); }}
                                            className={`py-2.5 rounded-full text-sm font-bold capitalize ${cumpleMes === String(i + 1) ? 'bg-pink-500 text-white' : 'bg-white/15 text-white'}`}>
                                            {window.cumpleanos.nombreMes(i + 1, window.getIdioma?.()).slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                                {cumpleMes && (
                                    <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                                        {/* 2024 es bisiesto: febrero ofrece el 29. */}
                                        {Array.from({ length: new Date(2024, Number(cumpleMes), 0).getDate() }, (_, i) => (
                                            <button key={i} type="button" onClick={() => setCumpleDia(String(i + 1))}
                                                className={`aspect-square rounded-lg text-sm font-bold ${cumpleDia === String(i + 1) ? 'bg-pink-500 text-white' : 'bg-white/15 text-white'}`}>
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button type="button" onClick={() => setPasoCumple(false)} className="text-sm font-semibold text-white/80">
                                    ← {t('Atrás')}
                                </button>
                            </div>
                        )}

                        {verificando && (
                            <div className="text-pink-300 text-sm bg-pink-500/20 p-2 rounded-lg flex items-center gap-2 border border-pink-300/30">
                                <div className="animate-spin h-4 w-4 border-2 border-pink-300 border-t-transparent rounded-full"></div>
                                {t('Verificando...')}
                            </div>
                        )}

                        {esProfesional && profesionalInfo && !verificando && (
                            <div className="bg-pink-500/30 border border-pink-300/50 rounded-lg p-4">
                                <p className="text-white font-bold text-xl">{t('¡Hola, {nombre}!', { nombre: profesionalInfo.nombre })}</p>
                                <p className="text-pink-200 text-sm">{t('Ingresa tu contraseña para acceder al panel.')}</p>
                            </div>
                        )}

                        {esProfesional && profesionalInfo && !verificando && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-1">
                                    {t('Contraseña profesional')}
                                </label>
                                <input
                                    type="password"
                                    value={profesionalPassword}
                                    onChange={(e) => setProfesionalPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-pink-300/30 bg-black/20 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder={t('Tu contraseña')}
                                    autoComplete="current-password"
                                    autoFocus
                                />
                            </div>
                        )}

                        {error && !esAdmin && (
                            <div className="text-sm p-3 rounded-lg flex items-start gap-2 bg-red-500/20 text-red-300 border border-red-500/30">
                                <i className="icon-triangle-alert mt-0.5"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            {esProfesional && profesionalInfo && !verificando && (
                                <button
                                    type="button"
                                    onClick={ingresarComoProfesional}
                                    className="w-full bg-white text-pink-600 py-4 rounded-xl font-bold hover:bg-pink-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg text-lg border border-pink-200/70"
                                >
                                    <span className="text-xl">✂️</span>
                                    {t('Ingresar como Profesional')}
                                </button>
                            )}

                            {!esProfesional && !clienteBloqueado && (
                                <button
                                    type="submit"
                                    disabled={verificando}
                                    className="w-full bg-pink-500 text-white py-4 rounded-full font-bold hover:bg-pink-600 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-lg border border-pink-200/70"
                                >
                                    {verificando ? t('Verificando...')
                                        : necesitaNombre && (pasoCumple || !window.cumpleanos) ? t('Registrarme y reservar')
                                        : t('Continuar')}
                                </button>
                            )}

                            {necesitaNombre && pasoCumple && !verificando && (
                                <button type="button" onClick={(e) => handleSubmit(e, true)}
                                    className="w-full py-2 text-sm font-semibold text-white/85">
                                    {t('Prefiero no decirlo')}
                                </button>
                            )}
                        </div>
                    </form>
                    )}
                </div>
            </div>
        </div>
    );
}
