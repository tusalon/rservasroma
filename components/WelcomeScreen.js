// components/WelcomeScreen.js - Bienvenida cálida: saludo sobre la foto del salón y tarjeta clara con logo, mensaje y botones.

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

    // El color del salón se usa en detalles y en el botón; el texto va siempre en
    // gris oscuro sobre fondo claro para que se lea con cualquier color de salón.
    const nombreSalon = config?.nombre || t('Mi Salón');
    const primerNombre = cliente ? String(cliente.nombre || '').split(' ')[0] : '';
    const inicial = String(nombreSalon).trim().charAt(0).toUpperCase() || '✨';
    const sombraTexto = '0 2px 14px rgba(20, 8, 14, 0.55)';
    const botonSuave = {
        background: 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.45)'
    };

    return (
        <div className="client-welcome-screen relative min-h-screen w-full overflow-y-auto">
            {/* Foto del salón fija; mientras llega se ve un degradado con los colores del salón, nunca un fondo negro */}
            <div className="client-welcome-background fixed inset-0 z-0"
                style={{ background: `linear-gradient(160deg, ${colorPrimario}, ${colorSecundario})` }}>
                <img
                    src={fondoPortada.image}
                    alt={t('Fondo de salón')}
                    onLoad={() => setImagenCargada(true)}
                    className={`client-welcome-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="client-welcome-overlay absolute inset-0"></div>
            </div>

            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="client-welcome-back fixed top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.88)', boxShadow: '0 4px 14px rgba(20,8,14,0.25)' }}
                    title={t('Volver')}
                >
                    <i className="icon-arrow-left text-xl" style={{ color: '#1f2937' }}></i>
                </button>
            )}

            <div className="client-welcome-content relative z-10">
                {/* Saludo sobre la foto */}
                <header className="text-center px-3 pt-4 pb-20">
                    {cliente ? (
                        <>
                            <p className="text-sm font-medium text-white/90" style={{ textShadow: sombraTexto }}>{t('Qué alegría verte otra vez')}</p>
                            <h1 className="text-3xl font-extrabold text-white leading-tight mt-1" style={{ textShadow: sombraTexto }}>
                                {t('Hola, {nombre}', { nombre: primerNombre })} <span aria-hidden="true">👋</span>
                            </h1>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-white/90" style={{ textShadow: sombraTexto }}>{t('Bienvenida a')}</p>
                            <h1 className="text-3xl font-extrabold text-white leading-tight mt-1 break-words" style={{ textShadow: sombraTexto }}>{nombreSalon}</h1>
                        </>
                    )}
                </header>

                <div className="client-welcome-card mt-auto mx-auto">
                    <div className="text-center space-y-4">
                        {/* Logo del salón, asomando por el borde de la tarjeta */}
                        <div className="mx-auto flex items-center justify-center rounded-full overflow-hidden"
                            style={{ width: 80, height: 80, marginTop: -66, background: '#fff', border: '4px solid #fff', boxShadow: `0 10px 26px ${hexToRgba(colorPrimario, 0.32)}` }}>
                            {config?.logo_url ? (
                                <img src={config.logo_url} alt={nombreSalon} className="w-full h-full object-contain" />
                            ) : (
                                <span className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-white"
                                    style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}>{inicial}</span>
                            )}
                        </div>

                        {cliente && (
                            <p className="text-lg font-bold text-white break-words leading-tight" style={{ marginTop: 10 }}>{nombreSalon}</p>
                        )}

                        {/* Mensaje de bienvenida de la dueña */}
                        <div className="text-left rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <p className={`text-[14px] text-white leading-relaxed whitespace-pre-line ${mensajeCompleto ? '' : 'line-clamp-4'}`}>
                                {config?.mensaje_bienvenida || t('¡Bienvenida a nuestro salón!')}
                            </p>
                            {String(config?.mensaje_bienvenida || '').length > 160 && (
                                <button onClick={() => setMensajeCompleto(!mensajeCompleto)} className="text-xs font-bold underline underline-offset-2 mt-1 text-white">
                                    {mensajeCompleto ? t('Ver menos') : t('Ver más')}
                                </button>
                            )}
                        </div>

                        {/* Horario y redes, en una sola fila */}
                        {(config?.horario_atencion || tieneRedes) && (
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                {config?.horario_atencion && (
                                    <p className="text-xs text-white/90 flex items-center gap-1.5">
                                        <span aria-hidden="true">🕐</span>{config.horario_atencion}
                                    </p>
                                )}
                                {tieneRedes && (
                                    <div className="flex gap-2">
                                        {tieneWhatsApp && (
                                            <button onClick={abrirWhatsApp} title={t('WhatsApp')} aria-label={t('WhatsApp')}
                                                style={{ width: 40, height: 40, minWidth: 0, minHeight: 0 }} className="bg-[#25D366] rounded-full flex items-center justify-center active:scale-95 transition-transform">
                                                <i className="icon-message-circle text-white text-lg"></i>
                                            </button>
                                        )}
                                        {tieneInstagram && (
                                            <button onClick={abrirInstagram} title={t('Instagram')} aria-label={t('Instagram')}
                                                style={{ width: 40, height: 40, minWidth: 0, minHeight: 0 }} className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center active:scale-95 transition-transform">
                                                <i className="icon-instagram text-white text-lg"></i>
                                            </button>
                                        )}
                                        {tieneFacebook && (
                                            <button onClick={abrirFacebook} title={t('Facebook')} aria-label={t('Facebook')}
                                                style={{ width: 40, height: 40, minWidth: 0, minHeight: 0 }} className="bg-[#1877F2] rounded-full flex items-center justify-center active:scale-95 transition-transform">
                                                <i className="icon-facebook text-white text-lg"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Su próxima cita, si tiene: lo primero que suele buscar. */}
                        {proxima && onMisReservas && (
                            <button onClick={onMisReservas}
                                className="w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3"
                                style={{ background: '#fff', border: `1px solid ${hexToRgba(colorPrimario, 0.22)}`, borderLeft: `5px solid ${colorPrimario}`, boxShadow: `0 6px 18px ${hexToRgba(colorPrimario, 0.12)}` }}>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">{t('Tu próxima cita')}</span>
                                    <span className="block font-bold text-gray-900 leading-snug">
                                        {(window.formatFechaCompleta ? window.formatFechaCompleta(proxima.fecha) : proxima.fecha)} · {window.formatTo12Hour ? window.formatTo12Hour(proxima.hora_inicio) : proxima.hora_inicio}
                                    </span>
                                    <span className={`block text-sm ${proxima.estado === 'Pendiente' ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>
                                        {proxima.estado === 'Pendiente' ? t('Falta el anticipo · toca para enviarlo') : proxima.servicio}
                                    </span>
                                </span>
                                <span className="text-gray-400 text-xl">›</span>
                            </button>
                        )}

                        {/* Tarjeta de fidelidad: cuánto le falta para su descuento (solo si el salón la tiene activa). */}
                        {cliente && window.TarjetaFidelidad && <window.TarjetaFidelidad cliente={cliente} config={config} onReservar={onStart} />}

                        {/* Botones */}
                        <div className="space-y-2.5 pt-1">
                            <button onClick={onStart}
                                className="w-full text-white font-bold py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[17px]"
                                style={{
                                    background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
                                    boxShadow: `0 12px 26px ${hexToRgba(colorPrimario, 0.38)}`
                                }}>
                                <span aria-hidden="true">💖</span>
                                <span>{t('Reservar cita')}</span>
                            </button>

                            {cliente && onMisReservas && (
                                <button onClick={onMisReservas} style={botonSuave}
                                    className="w-full font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 text-white active:scale-[0.98]">
                                    <i className="icon-calendar"></i>
                                    <span>{t('Mis Citas')}</span>
                                </button>
                            )}

                            {hayCatalogo && onCatalogo && (
                                <button onClick={onCatalogo} style={botonSuave}
                                    className="w-full font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 text-white active:scale-[0.98]">
                                    <span aria-hidden="true">✨</span>
                                    <span>{t('Explorar catálogo')}</span>
                                </button>
                            )}
                        </div>

                        {/* En el móvil la cabecera ya no lleva "salir": va aquí. */}
                        {cliente && onLogout && (
                            <button onClick={onLogout}
                                className="text-white/80 text-xs hover:text-white transition mx-auto block underline underline-offset-2 py-1">
                                {t('Cerrar sesión')}
                            </button>
                        )}

                        {/* Cambiar de salón (solo APK de clientas) */}
                        {esApkConRecientes && (
                            <button
                                onClick={() => { window.location.href = 'app-clientes.html'; }}
                                className="text-white/80 text-xs hover:text-white transition mx-auto block underline underline-offset-2 py-1">
                                🔄 {t('Cambiar de salón')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
