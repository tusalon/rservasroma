// components/WelcomeScreen.js - Versión con REDES SOCIALES (CORREGIDA - SIN DESBORDAMIENTO)

function WelcomeScreen({ onStart, onGoBack, cliente, userRol, onMisReservas, onCatalogo, onLogout }) {
    window.useIdioma();
    const t = window.t;
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);
    // Próxima cita de la clienta, para enseñarla nada más entrar.
    const [proxima, setProxima] = React.useState(null);
    // Hay mensajes de bienvenida de muchas líneas que empujaban "Reservar"
    // fuera de la pantalla: se ven 4 líneas y el resto con "Ver más".
    const [mensajeCompleto, setMensajeCompleto] = React.useState(false);
    // El botón del catálogo solo aparece si el salón tiene diseños publicados:
    // un catálogo vacío es peor que no tenerlo.
    const [hayCatalogo, setHayCatalogo] = React.useState(false);

    // UI de push controlada por bandera (ver utils/push-config.js).
    const pushUIVisible = window.RSERVAS_PUSH_UI_VISIBLE === true;

    // "Cambiar de salón" solo en la APK de clientas (origen remoto + marcador
    // de WebView/Capacitor) y con salones recientes guardados. En la PWA
    // instalada de un salón concreto no se muestra: sería anti-marca.
    const esApkConRecientes = React.useMemo(() => {
        try {
            const ua = navigator.userAgent || '';
            const esApk = window.location.hostname === 'tusalon.github.io' &&
                (ua.indexOf('RservasromaClientes') !== -1 || /\bwv\b/.test(ua) || !!window.Capacitor);
            if (!esApk) return false;
            const recientes = window.getNegociosRecientes ? window.getNegociosRecientes() : [];
            return recientes.length > 0;
        } catch (e) {
            return false;
        }
    }, []);

    // Los recordatorios se piden al terminar de reservar (Confirmation.js), cuando
    // ya hay una cita que recordar. Aquí solo se vuelve a vincular la
    // suscripción con su número si ya dio permiso antes.
    React.useEffect(() => {
        if (!pushUIVisible || !cliente?.whatsapp || !('Notification' in window)) return;
        if (Notification.permission === 'granted' && typeof window.solicitarPushRservasRoma === 'function') {
            window.solicitarPushRservasRoma({ permission: 'granted', defaultRole: 'cliente', clienteWhatsapp: cliente.whatsapp })
                .catch(() => {});
        }
    }, []);

    React.useEffect(() => {
        const negocioId = localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO;
        if (!cliente?.whatsapp || !negocioId) return;
        const d = new Date();
        const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        fetch(`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}` +
            `&fecha=gte.${hoy}&estado=not.in.(Cancelado,Completado,Ausente)&order=fecha.asc,hora_inicio.asc&limit=1&select=servicio,fecha,hora_inicio,estado`,
            { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } })
            .then(r => r.ok ? r.json() : [])
            .then(lista => setProxima(Array.isArray(lista) && lista[0] ? lista[0] : null))
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            console.log('📱 WelcomeScreen - Config cargada:', configData);
            setConfig(configData);
            setCargando(false);
            // En paralelo y sin bloquear: además deja el catálogo cacheado para
            // que abra al instante si la clienta entra.
            window.catalogoObtenerDisenos?.()
                .then(lista => setHayCatalogo((lista || []).length > 0))
                .catch(() => {});
        };
        cargarDatos();

    }, []);

    // Solo se espera la config (rápida); la imagen de fondo NUNCA bloquea la
    // pantalla — hace fade-in cuando llega (clave en conexiones lentas).
    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const colorPrimario = config?.color_primario || '#ec4899';
    const colorSecundario = config?.color_secundario || '#f9a8d4';
    const hexToRgba = (hex, alpha = 1) => {
        const limpio = String(hex || '').replace('#', '');
        if (limpio.length !== 6) return `rgba(236, 72, 153, ${alpha})`;
        const r = parseInt(limpio.slice(0, 2), 16);
        const g = parseInt(limpio.slice(2, 4), 16);
        const b = parseInt(limpio.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const fondoPortada = {
        image: window.getHeroBackgroundImage
            ? window.getHeroBackgroundImage(config)
            : (config?.imagen_fondo_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=60&w=800&auto=format&fit=crop'),
        label: 'Fondo de salon'
    };
    // Uno para todos. Antes salia segun negocios.especialidad, pero ese campo
    // se rellena solo con "Uñas" al crear la cuenta: 405 de 440 lo tienen,
    // incluidas lashistas, barberias y spas, que veian un 💅 (26-09-2026).
    const sticker = '✨';

    // ============================================
    // FUNCIONES PARA ABRIR REDES SOCIALES
    // ============================================
    
    const abrirWhatsApp = () => {
        if (!config?.telefono) {
            alert('📱 ' + t('El número de WhatsApp no está configurado'));
            return;
        }
        
        const telefonoWhatsApp = window.normalizarTelefonoInternacional
            ? window.normalizarTelefonoInternacional(config.telefono, config.codigo_pais)
            : config.telefono.replace(/\D/g, '');
        const mensaje = encodeURIComponent(`Hola! Quiero consultar sobre turnos en ${config?.nombre || t('el salón')}`);
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${telefonoWhatsApp}?text=${mensaje}`, '_blank');
    };

    const abrirInstagram = () => {
        if (!config?.instagram) {
            alert('📷 ' + t('El usuario de Instagram no está configurado'));
            return;
        }
        
        // Limpiar el usuario (quitar @ si lo tiene)
        let usuario = config.instagram.replace('@', '').trim();
        
        // Abrir Instagram (app o web)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Intentar abrir la app primero
            window.location.href = `instagram://user?username=${usuario}`;
            
            // Si no abre la app, abrir web después de 1 segundo
            setTimeout(() => {
                window.open(`https://instagram.com/${usuario}`, '_blank');
            }, 1000);
        } else {
            // Desktop: abrir web directamente
            window.open(`https://instagram.com/${usuario}`, '_blank');
        }
    };

    const abrirFacebook = () => {
        if (!config?.facebook) {
            alert('👤 ' + t('La página de Facebook no está configurada'));
            return;
        }
        
        // Limpiar la URL/página
        let pagina = config.facebook.trim();
        
        // Si solo es el nombre, construir URL
        if (!pagina.startsWith('http')) {
            // Sacar @ si tiene
            pagina = pagina.replace('@', '');
            pagina = `https://facebook.com/${pagina}`;
        }
        
        // Abrir Facebook
        window.open(pagina, '_blank');
    };

    // Verificar qué redes están configuradas
    const tieneWhatsApp = config?.telefono && config.telefono.length >= 8;
    const tieneInstagram = config?.instagram && config.instagram.trim() !== '';
    const tieneFacebook = config?.facebook && config.facebook.trim() !== '';
    
    const tieneRedes = tieneWhatsApp || tieneInstagram || tieneFacebook;

    return (
        <div 
            className="client-welcome-screen relative min-h-screen w-full overflow-y-auto"
        >
            {/* Imagen de fondo fija */}
            <div className="client-welcome-background fixed inset-0 z-0 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400">
                <img
                    src={fondoPortada.image}
                    alt={t('Fondo de salón')}
                    onLoad={() => setImagenCargada(true)}
                    className={`client-welcome-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="client-welcome-overlay absolute inset-0 bg-black/40"></div>
            </div>

            {/* Botón volver - fijo en la parte superior */}
            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="client-welcome-back fixed top-4 left-4 z-20 w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors border"
                    style={{
                        backgroundColor: hexToRgba(colorPrimario, 0.86),
                        borderColor: hexToRgba(colorSecundario, 0.75)
                    }}
                    title={t('Volver')}
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            {/* Contenido — altura fija, todo visible sin scroll */}
            <div className="client-welcome-content relative z-10 flex flex-col items-center justify-center px-4"
                style={{ minHeight: '100svh', paddingTop: 'max(56px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div
                    className="client-welcome-card w-full max-w-sm bg-black/15 backdrop-blur-[1px] p-4 rounded-2xl shadow-2xl border"
                    style={{
                        borderColor: hexToRgba(colorSecundario, 0.42),
                        boxShadow: `0 16px 48px ${hexToRgba(colorPrimario, 0.22)}`
                    }}
                >
                    <div className="text-center space-y-3">

                        {/* Logo o sticker */}
                        {config?.logo_url ? (
                            <img src={config.logo_url} alt={config.nombre}
                                className="w-14 h-14 object-contain mx-auto rounded-xl shadow-lg ring-2"
                                style={{ '--tw-ring-color': hexToRgba(colorSecundario, 0.45) }} />
                        ) : (
                            <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center shadow-lg ring-2"
                                style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`, '--tw-ring-color': hexToRgba(colorSecundario, 0.45) }}>
                                <span className="text-3xl">{sticker}</span>
                            </div>
                        )}

                        {/* Título: saluda a la clienta por su nombre */}
                        <div>
                            {cliente ? (
                                <p className="text-2xl font-extrabold text-white leading-tight">
                                    {t('Hola, {nombre}', { nombre: String(cliente.nombre || '').split(' ')[0] })}
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-white/80">{t('Bienvenida a')}</p>
                            )}
                            <div className={`${cliente ? 'text-base' : 'text-xl'} font-bold break-words leading-tight`}
                                style={{ color: colorSecundario, textShadow: `0 2px 12px ${hexToRgba(colorPrimario, 0.45)}` }}>
                                {config?.nombre || t('Mi Salón')}
                            </div>
                        </div>

                                        {/* Mensaje bienvenida */}
                        <div>
                            <p className={`text-white/85 text-xs max-w-xs mx-auto leading-snug whitespace-pre-line ${mensajeCompleto ? '' : 'line-clamp-4'}`}>
                                {config?.mensaje_bienvenida || t('¡Bienvenida a nuestro salón!')}
                            </p>
                            {String(config?.mensaje_bienvenida || '').length > 160 && (
                                <button onClick={() => setMensajeCompleto(!mensajeCompleto)} className="text-xs font-bold text-white underline underline-offset-2 mt-1">
                                    {mensajeCompleto ? t('Ver menos') : t('Ver más')}
                                </button>
                            )}
                        </div>

                        {/* Redes sociales */}
                        {tieneRedes && (
                            <div className="flex justify-center gap-3">
                                {tieneWhatsApp && (
                                    <button onClick={abrirWhatsApp} title={t('WhatsApp')}
                                        className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-message-circle text-white text-lg"></i>
                                    </button>
                                )}
                                {tieneInstagram && (
                                    <button onClick={abrirInstagram} title={t('Instagram')}
                                        className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-instagram text-white text-lg"></i>
                                    </button>
                                )}
                                {tieneFacebook && (
                                    <button onClick={abrirFacebook} title={t('Facebook')}
                                        className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-facebook text-white text-lg"></i>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Su próxima cita, si tiene: lo primero que suele buscar. */}
                        {proxima && onMisReservas && (
                            <button onClick={onMisReservas}
                                className="w-full text-left bg-white/95 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold uppercase tracking-wide text-gray-500">{t('Tu próxima cita')}</span>
                                    <span className="block font-bold text-gray-900 truncate">
                                        {(window.formatFechaCompleta ? window.formatFechaCompleta(proxima.fecha) : proxima.fecha)} · {window.formatTo12Hour ? window.formatTo12Hour(proxima.hora_inicio) : proxima.hora_inicio}
                                    </span>
                                    <span className={`block text-sm truncate ${proxima.estado === 'Pendiente' ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>
                                        {proxima.estado === 'Pendiente' ? t('Falta el anticipo · toca para enviarlo') : proxima.servicio}
                                    </span>
                                </span>
                                <span className="text-gray-400 text-xl">›</span>
                            </button>
                        )}

                        {/* Tarjeta de fidelidad: cuánto le falta para su descuento (solo si el salón la tiene activa). */}
                        {cliente && window.TarjetaFidelidad && <window.TarjetaFidelidad cliente={cliente} config={config} onReservar={onStart} />}

                        {/* Botón principal */}
                        <button onClick={onStart}
                            className="w-full text-white font-bold py-3 rounded-full shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 border"
                            style={{
                                background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
                                borderColor: hexToRgba(colorSecundario, 0.7),
                                boxShadow: `0 10px 28px ${hexToRgba(colorPrimario, 0.35)}`
                            }}>
                            <span>💖</span>
                            <span>{t('Reservar cita')}</span>
                            <span>✨</span>
                        </button>

                        {/* Catálogo de diseños del salón */}
                        {hayCatalogo && onCatalogo && (
                            <button onClick={onCatalogo}
                                className="w-full text-white/90 font-medium py-2.5 rounded-full border border-white/30 hover:bg-white/10 transition flex items-center justify-center gap-2">
                                <span>✨</span>
                                <span>{t('Explorar catálogo')}</span>
                            </button>
                        )}

                        {/* Acceso directo a Mis Reservas: una clienta que vuelve
                            solo para ver/cancelar/reprogramar ya no tiene que entrar
                            al flujo de reserva para llegar aquí. */}
                        {cliente && onMisReservas && (
                            <button onClick={onMisReservas}
                                className="w-full text-white/90 font-medium py-2.5 rounded-full border border-white/30 hover:bg-white/10 transition flex items-center justify-center gap-2">
                                <i className="icon-calendar"></i>
                                <span>{t('Mis Citas')}</span>
                            </button>
                        )}

                        {/* Horario */}
                        {config?.horario_atencion && (
                            <p className="text-xs text-white/70">
                                🕐 {config.horario_atencion}
                            </p>
                        )}

                        {/* En el móvil la cabecera ya no lleva "salir": va aquí. */}
                        {cliente && onLogout && (
                            <button onClick={onLogout}
                                className="text-white/60 text-xs hover:text-white/90 transition mx-auto block underline underline-offset-2">
                                {t('Cerrar sesión')}
                            </button>
                        )}

                        {/* Cambiar de salón (solo APK de clientas) */}
                        {esApkConRecientes && (
                            <button
                                onClick={() => { window.location.href = 'app-clientes.html'; }}
                                className="text-white/50 text-xs hover:text-white/80 transition mx-auto block underline underline-offset-2">
                                🔄 {t('Cambiar de salón')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
