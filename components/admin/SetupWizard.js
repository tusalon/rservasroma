// components/admin/SetupWizard.js
// Wizard de arranque: deja el negocio FUNCIONAL (profesional + servicios +
// horarios) con la configuración mínima, no solo con datos estéticos.

const MONEDA_POR_PAIS = {
    '53': 'CUP', // Cuba
    '34': 'EUR', // España
    '52': 'MXN', // México
    '39': 'EUR', // Italia
    '33': 'EUR', // Francia
    '49': 'EUR', // Alemania
    '351': 'EUR' // Portugal
};

// Convierte un rango horario "HH:MM"-"HH:MM" en los índices de 30 min que usa
// el sistema (0=00:00, 1=00:30, ... 18=09:00, 36=18:00). Idéntico a la grilla
// de HorariosPorDiaPanel para que el calendario los interprete igual.
function rangoHorarioAIndices(horaInicio, horaFin) {
    const aIndice = (hhmm) => {
        const [h, m] = String(hhmm || '0:0').split(':').map(Number);
        return (h || 0) * 2 + ((m || 0) >= 30 ? 1 : 0);
    };
    const ini = aIndice(horaInicio);
    const fin = aIndice(horaFin);
    const indices = [];
    for (let i = ini; i < fin; i++) indices.push(i);
    return indices;
}

function SetupWizard() {
    window.useIdioma();
    const t = window.t;
    const idioma = window.getIdioma ? window.getIdioma() : 'es';
    const [step, setStep] = React.useState(1);
    const [negocioId, setNegocioId] = React.useState(null);
    const [monedaSugerida, setMonedaSugerida] = React.useState('CUP');
    const [cargando, setCargando] = React.useState(true);
    const [guardando, setGuardando] = React.useState(false);
    const [progresoGuardado, setProgresoGuardado] = React.useState('');
    const [error, setError] = React.useState('');
    const [exito, setExito] = React.useState(false);

    const DIAS = idioma === 'en' ? [
        { id: 'lunes', corto: 'Mon', nombre: 'Monday' },
        { id: 'martes', corto: 'Tue', nombre: 'Tuesday' },
        { id: 'miercoles', corto: 'Wed', nombre: 'Wednesday' },
        { id: 'jueves', corto: 'Thu', nombre: 'Thursday' },
        { id: 'viernes', corto: 'Fri', nombre: 'Friday' },
        { id: 'sabado', corto: 'Sat', nombre: 'Saturday' },
        { id: 'domingo', corto: 'Sun', nombre: 'Sunday' }
    ] : [
        { id: 'lunes', corto: 'Lun', nombre: 'Lunes' },
        { id: 'martes', corto: 'Mar', nombre: 'Martes' },
        { id: 'miercoles', corto: 'Mié', nombre: 'Miércoles' },
        { id: 'jueves', corto: 'Jue', nombre: 'Jueves' },
        { id: 'viernes', corto: 'Vie', nombre: 'Viernes' },
        { id: 'sabado', corto: 'Sáb', nombre: 'Sábado' },
        { id: 'domingo', corto: 'Dom', nombre: 'Domingo' }
    ];

    const [config, setConfig] = React.useState({
        // Paso 1: negocio
        nombre: '',
        telefono_whatsapp: '',
        email: '',
        // Paso 2: profesional
        profesional_nombre: '',
        profesional_especialidad: '',
        // Paso 3: servicios
        servicios: [
            { nombre: '', precio: '', duracion: '60' },
            { nombre: '', precio: '', duracion: '60' },
            { nombre: '', precio: '', duracion: '60' }
        ],
        // Paso 4: horarios — rango independiente por cada día
        horarios_dias: {
            lunes:     { activo: true,  inicio: '09:00', fin: '18:00' },
            martes:    { activo: true,  inicio: '09:00', fin: '18:00' },
            miercoles: { activo: true,  inicio: '09:00', fin: '18:00' },
            jueves:    { activo: true,  inicio: '09:00', fin: '18:00' },
            viernes:   { activo: true,  inicio: '09:00', fin: '18:00' },
            sabado:    { activo: true,  inicio: '09:00', fin: '14:00' },
            domingo:   { activo: false, inicio: '09:00', fin: '18:00' }
        },
        // Paso 5: estética (opcional)
        color_primario: '#c49b63',
        color_secundario: '#f59e0b',
        imagen_fondo_tipo: 'unas',
        logo: null,
        logo_preview: '',
        // Defaults conservados para el negocio (editables luego en el panel)
        direccion: '',
        mensaje_bienvenida: '¡Bienvenido a nuestro salón!',
        mensaje_confirmacion: 'Tu turno ha sido reservado con éxito',
        instagram: '',
        facebook: ''
    });

    React.useEffect(() => {
        const id = localStorage.getItem('negocioId');
        if (!id) {
            const slug = (new URLSearchParams(window.location.search).get('s') || '').toLowerCase().trim();
            window.location.href = 'admin-login.html' + (slug ? '?s=' + encodeURIComponent(slug) : '');
            return;
        }
        setNegocioId(id);
        cargarDatosNegocio(id);
    }, []);

    const cargarDatosNegocio = async (id) => {
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${id}&select=nombre,telefono,email,imagen_fondo_tipo,codigo_pais`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data && data[0]) {
                    const codigoPais = String(data[0].codigo_pais || '53');
                    setMonedaSugerida(MONEDA_POR_PAIS[codigoPais] || 'CUP');
                    setConfig(prev => ({
                        ...prev,
                        nombre: data[0].nombre || '',
                        telefono_whatsapp: data[0].telefono || '',
                        email: data[0].email || '',
                        imagen_fondo_tipo: data[0].imagen_fondo_tipo || 'unas'
                    }));
                }
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const precioNumerico = (valor) => window.parsePrecioServicio
        ? window.parsePrecioServicio(valor, 0)
        : (parseFloat(String(valor).replace(',', '.')) || 0);

    const serviciosValidos = () => config.servicios.filter(
        s => s.nombre.trim() && precioNumerico(s.precio) > 0
    );

    const diasActivos = () => DIAS.filter(d => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo);

    const validarPaso = () => {
        if (step === 1) {
            if (!config.nombre.trim()) return t('El nombre del negocio es obligatorio');
            if (!config.telefono_whatsapp || config.telefono_whatsapp.length < 8) return t('El teléfono debe tener 8 dígitos');
            if (config.email && !config.email.includes('@')) return t('El email no es válido');
        }
        if (step === 2) {
            if (!config.profesional_nombre.trim()) return t('Escribe el nombre de quien atiende');
        }
        if (step === 3) {
            if (serviciosValidos().length === 0) return t('Agrega al menos un servicio con nombre y precio');
        }
        if (step === 4) {
            const activos = diasActivos();
            if (activos.length === 0) return t('Selecciona al menos un día de trabajo');
            const hayInvalido = activos.some(d => config.horarios_dias[d.id].fin <= config.horarios_dias[d.id].inicio);
            if (hayInvalido) return t('En cada día, la hora de cierre debe ser mayor que la de apertura');
        }
        return '';
    };

    const handleNext = () => {
        const err = validarPaso();
        if (err) { setError(err); return; }
        setError('');
        setStep(step + 1);
    };

    const handlePrev = () => { setError(''); setStep(step - 1); };

    const actualizarServicio = (index, campo, valor) => {
        const nuevos = config.servicios.map((s, i) => i === index ? { ...s, [campo]: valor } : s);
        setConfig({ ...config, servicios: nuevos });
    };

    const toggleDiaActivo = (diaId) => {
        const actual = config.horarios_dias[diaId];
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, activo: !actual.activo } } });
    };

    const setHoraDia = (diaId, campo, valor) => {
        const actual = config.horarios_dias[diaId];
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, [campo]: valor } } });
    };

    const aplicarHorarioATodos = (diaOrigen) => {
        const base = config.horarios_dias[diaOrigen];
        const nuevos = {};
        DIAS.forEach(d => {
            nuevos[d.id] = { ...config.horarios_dias[d.id], inicio: base.inicio, fin: base.fin };
        });
        setConfig({ ...config, horarios_dias: nuevos });
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) { setError(t('Solo se permiten imágenes')); return; }
            if (file.size > 2 * 1024 * 1024) { setError(t('La imagen no puede superar los 2MB')); return; }
            const reader = new FileReader();
            reader.onloadend = () => setConfig(prev => ({ ...prev, logo: file, logo_preview: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const subirLogo = async () => {
        if (!config.logo) return null;
        try {
            const fileExt = config.logo.name.split('.').pop();
            const fileName = `logo-${negocioId}-${Date.now()}.${fileExt}`;
            const response = await fetch(
                `${window.SUPABASE_URL}/storage/v1/object/negocios-logos/${fileName}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    },
                    body: config.logo
                }
            );
            if (!response.ok) { console.error('Error subiendo logo:', await response.text()); return null; }
            return `${window.SUPABASE_URL}/storage/v1/object/public/negocios-logos/${fileName}`;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };

    const guardarHorariosProfesional = async (profesionalId) => {
        const horariosPorDia = {};
        const dias = [];
        const todasLasHoras = new Set();
        DIAS.forEach(d => {
            const cfg = config.horarios_dias[d.id];
            if (cfg && cfg.activo && cfg.fin > cfg.inicio) {
                const indices = rangoHorarioAIndices(cfg.inicio, cfg.fin);
                horariosPorDia[d.id] = indices;
                dias.push(d.id);
                indices.forEach(i => todasLasHoras.add(i));
            } else {
                horariosPorDia[d.id] = [];
            }
        });
        const horas = Array.from(todasLasHoras).sort((a, b) => a - b);

        // POST directo (negocio nuevo → nunca hay registro previo). Mismo
        // formato que salonConfig.guardarHorariosPorDia, pero sin sus alert().
        const response = await fetch(`${window.SUPABASE_URL}/rest/v1/horarios_profesionales`, {
            method: 'POST',
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                negocio_id: negocioId,
                profesional_id: profesionalId,
                horarios_por_dia: horariosPorDia,
                horas,
                dias
            })
        });
        return response.ok;
    };

    const textoHorarioLegible = () => {
        const partes = DIAS
            .filter(d => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo)
            .map(d => `${d.corto} ${config.horarios_dias[d.id].inicio}-${config.horarios_dias[d.id].fin}`);
        return partes.join(' · ');
    };

    const handleGuardar = async () => {
        setGuardando(true);
        setError('');
        try {
            // Forzar que TODAS las creaciones (salonProfesionales/salonServicios,
            // que resuelven el negocio vía window.getNegocioId) usen el negocio de
            // ESTA sesión. Sin esto, si el slug de la URL resolvió otro
            // NEGOCIO_ID_POR_DEFECTO, los datos se crearían en el negocio
            // equivocado. En el flujo normal ya coinciden; esto lo garantiza.
            if (negocioId) window.NEGOCIO_ID_POR_DEFECTO = negocioId;

            // 1. Profesional (quien atiende)
            setProgresoGuardado(t('Creando profesional...'));
            const prof = await window.salonProfesionales.crear({
                nombre: config.profesional_nombre.trim(),
                especialidad: config.profesional_especialidad.trim() || t('General'),
                nivel: 1
            });
            if (!prof || !prof.id) throw new Error(t('No se pudo crear el profesional. Intenta de nuevo.'));

            // 2. Servicios
            setProgresoGuardado(t('Creando servicios...'));
            const idsServicios = [];
            for (const s of serviciosValidos()) {
                const precio = precioNumerico(s.precio);
                const creado = await window.salonServicios.crear({
                    nombre: s.nombre.trim(),
                    duracion: parseInt(s.duracion) || 60,
                    precio,
                    precio_desde: precio,
                    precio_moneda: monedaSugerida,
                    categoria: null
                });
                if (creado && creado.id) idsServicios.push(creado.id);
            }

            // 3. Asignar cada servicio al profesional
            setProgresoGuardado(t('Vinculando servicios...'));
            for (const sid of idsServicios) {
                await window.asignarProfesionalAServicio(sid, prof.id);
            }

            // 4. Horarios del profesional
            setProgresoGuardado(t('Guardando horarios...'));
            await guardarHorariosProfesional(prof.id);

            // 5. Logo (opcional)
            let logo_url = null;
            if (config.logo) {
                setProgresoGuardado(t('Subiendo logo...'));
                logo_url = await subirLogo();
            }

            // 6. Datos del negocio + marcar configurado
            setProgresoGuardado(t('Finalizando...'));
            const datosNegocio = {
                nombre: config.nombre,
                telefono: config.telefono_whatsapp,
                email: config.email || null,
                direccion: config.direccion || null,
                color_primario: config.color_primario,
                color_secundario: config.color_secundario,
                imagen_fondo_tipo: config.imagen_fondo_tipo || 'unas',
                mensaje_bienvenida: config.mensaje_bienvenida,
                mensaje_confirmacion: config.mensaje_confirmacion,
                horario_atencion: textoHorarioLegible() || null,
                configurado: true,
                updated_at: new Date().toISOString()
            };
            if (logo_url) datosNegocio.logo_url = logo_url;

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(datosNegocio)
                }
            );
            if (!response.ok) {
                console.error('Error PATCH negocio:', await response.text());
                throw new Error(t('Error guardando configuración'));
            }

            setExito(true);
            const slug = (new URLSearchParams(window.location.search).get('s') || localStorage.getItem('adminSlug') || localStorage.getItem('negocioSlug') || '').toLowerCase().trim();
            setTimeout(() => {
                window.location.href = 'admin.html' + (slug ? '?s=' + encodeURIComponent(slug) : '');
            }, 2000);
        } catch (err) {
            console.error('Error:', err);
            setError(err.message || t('Error al guardar la configuración'));
        } finally {
            setGuardando(false);
            setProgresoGuardado('');
        }
    };

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (exito) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center animate-fade-in">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('¡Tu salón está listo!')}</h2>
                    <p className="text-gray-600 mb-4">
                        {t('Ya puedes recibir reservas. Redirigiendo al panel...')}
                    </p>
                    <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
            </div>
        );
    }

    const PASOS = [
        t('Negocio'),
        t('Profesional'),
        t('Servicios'),
        t('Horarios'),
        t('Listo')
    ];

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-end mb-2">
                    <window.LanguageToggle />
                </div>

                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-3xl">
                            💅
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {t('Configura tu salón')}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {t('Unos pasos rápidos y empiezas a recibir reservas')}
                    </p>
                </div>

                {/* Progreso */}
                <div className="flex justify-between mb-8">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex-1 text-center">
                            <div className={`
                                w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold transition-all
                                ${s === step ? 'bg-amber-600 text-white shadow-md scale-110' :
                                  s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                            `}>
                                {s < step ? '✓' : s}
                            </div>
                            <div className="text-xs mt-1 text-gray-600">{PASOS[s - 1]}</div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Paso 1: Negocio */}
                {step === 1 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-4">🏠 {t('Datos del negocio')}</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Nombre del negocio *')}</label>
                            <input
                                type="text"
                                value={config.nombre}
                                onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder={t('Ej: BennetSalón')}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">+53</span>
                                <input
                                    type="tel"
                                    value={config.telefono_whatsapp}
                                    onChange={(e) => setConfig({ ...config, telefono_whatsapp: e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-4 py-2 rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="54438629"
                                    maxLength="8"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{t('8 dígitos después del +53')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={config.email}
                                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="salon@gmail.com"
                            />
                        </div>
                    </div>
                )}

                {/* Paso 2: Profesional */}
                {step === 2 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-1">👩‍🎨 {t('¿Quién atiende?')}</h2>
                        <p className="text-sm text-gray-500 mb-3">{t('Puede ser tu propio nombre. Después podrás agregar más profesionales.')}</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Nombre del profesional *')}</label>
                            <input
                                type="text"
                                value={config.profesional_nombre}
                                onChange={(e) => setConfig({ ...config, profesional_nombre: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder={t('Ej: Glenda')}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Especialidad')}</label>
                            <input
                                type="text"
                                value={config.profesional_especialidad}
                                onChange={(e) => setConfig({ ...config, profesional_especialidad: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder={t('Ej: Uñas, Pestañas, Cejas')}
                            />
                        </div>
                    </div>
                )}

                {/* Paso 3: Servicios */}
                {step === 3 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-1">💅 {t('Tus servicios principales')}</h2>
                        <p className="text-sm text-gray-500 mb-3">{t('Agrega al menos uno. Podrás sumar más desde el panel.')}</p>
                        {config.servicios.map((s, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-amber-600 w-5">{i + 1}.</span>
                                    <input
                                        type="text"
                                        value={s.nombre}
                                        onChange={(e) => actualizarServicio(i, 'nombre', e.target.value)}
                                        className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                        placeholder={i === 0 ? t('Ej: Manicura semipermanente') : t('Nombre del servicio')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 pl-7">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t('Precio')} ({monedaSugerida})</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={s.precio}
                                            onChange={(e) => actualizarServicio(i, 'precio', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            placeholder="1500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t('Duración')}</label>
                                        <select
                                            value={s.duracion}
                                            onChange={(e) => actualizarServicio(i, 'duracion', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="30">30 min</option>
                                            <option value="45">45 min</option>
                                            <option value="60">1 h</option>
                                            <option value="90">1 h 30 min</option>
                                            <option value="120">2 h</option>
                                            <option value="180">3 h</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Paso 4: Horarios — rango independiente por día */}
                {step === 4 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-3 animate-fade-in">
                        <h2 className="text-xl font-bold mb-1">🕐 {t('¿Qué días y a qué hora trabajas?')}</h2>
                        <p className="text-sm text-gray-500 mb-3">{t('Activa cada día y ponle su propio horario. Ej: lunes 9:00-11:00, martes 14:00-18:00.')}</p>

                        {DIAS.map(d => {
                            const cfg = config.horarios_dias[d.id];
                            return (
                                <div key={d.id} className={`rounded-lg border p-3 transition-all ${cfg.activo ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleDiaActivo(d.id)}
                                            className={`w-16 shrink-0 px-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                                cfg.activo ? 'bg-amber-600 text-white shadow' : 'bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            {d.corto}
                                        </button>
                                        {cfg.activo ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="time"
                                                    value={cfg.inicio}
                                                    onChange={(e) => setHoraDia(d.id, 'inicio', e.target.value)}
                                                    className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                />
                                                <span className="text-gray-400 text-sm">{t('a')}</span>
                                                <input
                                                    type="time"
                                                    value={cfg.fin}
                                                    onChange={(e) => setHoraDia(d.id, 'fin', e.target.value)}
                                                    className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm flex-1">{t('Cerrado')}</span>
                                        )}
                                    </div>
                                    {cfg.activo && (
                                        <div className="text-right mt-2">
                                            <button
                                                type="button"
                                                onClick={() => aplicarHorarioATodos(d.id)}
                                                className="text-xs text-amber-700 hover:underline"
                                            >
                                                {t('Aplicar este horario a todos los días')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Paso 5: Estética opcional + resumen */}
                {step === 5 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-5 animate-fade-in">
                        <h2 className="text-xl font-bold mb-1">✨ {t('Toque final (opcional)')}</h2>
                        <p className="text-sm text-gray-500">{t('Puedes saltar esto y cambiarlo luego desde el panel.')}</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Color principal')}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={config.color_primario}
                                    onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                                    className="w-10 h-10 rounded border"
                                />
                                <input
                                    type="text"
                                    value={config.color_primario}
                                    onChange={(e) => setConfig({ ...config, color_primario: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-2"
                                    placeholder="#c49b63"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Logo del negocio')}</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-500 transition cursor-pointer"
                                 onClick={() => document.getElementById('logo-input').click()}>
                                <input id="logo-input" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                {config.logo_preview ? (
                                    <div className="space-y-2">
                                        <img src={config.logo_preview} alt="Preview" className="h-20 object-contain mx-auto" />
                                        <p className="text-xs text-gray-500">{t('Haz clic para cambiar')}</p>
                                    </div>
                                ) : (
                                    <div className="py-3">
                                        <div className="text-3xl mb-1">🖼️</div>
                                        <p className="text-gray-600 text-sm">{t('Haz clic para subir un logo')}</p>
                                        <p className="text-xs text-gray-400 mt-1">{t('PNG, JPG hasta 2MB')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {(window.HERO_BACKGROUND_OPTIONS || []).length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Imagen de fondo para clientes')}</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(window.HERO_BACKGROUND_OPTIONS || []).map((opcion) => (
                                        <button
                                            type="button"
                                            key={opcion.id}
                                            onClick={() => setConfig({ ...config, imagen_fondo_tipo: opcion.id })}
                                            className={`overflow-hidden rounded-lg border-2 bg-white text-left transition ${
                                                config.imagen_fondo_tipo === opcion.id
                                                    ? 'border-amber-600 ring-2 ring-amber-200'
                                                    : 'border-gray-200 hover:border-amber-300'
                                            }`}
                                        >
                                            <img src={opcion.image} alt={opcion.label} className="h-20 w-full object-cover" />
                                            <div className="p-2">
                                                <p className="text-xs font-semibold text-gray-900">{t(opcion.label)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resumen */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                            <h3 className="font-semibold text-gray-700">📋 {t('Resumen')}</h3>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                <span className="text-gray-500">{t('Negocio:')}</span>
                                <span className="font-medium">{config.nombre}</span>
                                <span className="text-gray-500">{t('Profesional:')}</span>
                                <span className="font-medium">{config.profesional_nombre}</span>
                                <span className="text-gray-500">{t('Servicios:')}</span>
                                <span className="font-medium">{serviciosValidos().map(s => s.nombre.trim()).join(', ') || '—'}</span>
                                <span className="text-gray-500">{t('Horario:')}</span>
                                <span className="font-medium">{textoHorarioLegible() || '—'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navegación */}
                <div className="flex justify-between mt-6">
                    {step > 1 ? (
                        <button onClick={handlePrev} className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition" disabled={guardando}>
                            ← {t('Atrás')}
                        </button>
                    ) : <div></div>}

                    {step < 5 ? (
                        <button onClick={handleNext} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition" disabled={guardando}>
                            {t('Continuar')} →
                        </button>
                    ) : (
                        <button onClick={handleGuardar} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2" disabled={guardando}>
                            {guardando ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    {progresoGuardado || t('Guardando...')}
                                </>
                            ) : (
                                <>✓ {t('Finalizar y abrir mi salón')}</>
                            )}
                        </button>
                    )}
                </div>

                <div className="text-center mt-4 text-sm text-gray-500">
                    {t('Paso {n} de 5', { n: step })}
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SetupWizard />);
