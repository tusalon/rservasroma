// components/admin/SetupWizard.js
// Wizard de arranque: deja el negocio FUNCIONAL (profesional + servicios +
// horarios) con la configuración mínima, no solo con datos estéticos.

const MONEDA_POR_PAIS = {
    '53': 'CUP', // Cuba
    '34': 'EUR', // España
    '52': 'MXN', // México
    '1': 'USD',
    '57': 'COP',
    '58': 'USD',
    '51': 'PEN',
    '56': 'CLP',
    '593': 'USD',
    '39': 'EUR', // Italia
    '33': 'EUR', // Francia
    '49': 'EUR', // Alemania
    '351': 'EUR' // Portugal
};

// El sistema representa cada horario disponible como un índice de 30 min
// (0=00:00, 1=00:30, ... 18=09:00, 36=18:00). horarios_por_dia guarda, por
// día, la lista de esos índices que el profesional ofrece — igual que la
// grilla de HorariosPorDiaPanel, donde cada hora se marca individualmente.

// Los 48 slots del día, con su etiqueta legible (misma lógica que el panel).
const SLOTS_DIA = (() => {
    const slots = [];
    for (let i = 0; i < 48; i++) {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? '00' : '30';
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        slots.push({ indice: i, label: `${h12}:${m} ${ampm}` });
    }
    return slots;
})();

// Prellenar de "HH:MM" a "HH:MM" (para arrancar cada día con horas típicas;
// la dueña luego agrega o quita slots individuales).
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

function crearProfesionalWizard() {
    return {
        nombre: '',
        especialidad: '',
        telefono: '',
        password: '',
        nivel: 1,
        color: 'bg-amber-600',
        avatar: '\uD83D\uDC64'
    };
}

function crearServicioWizard(moneda = 'CUP') {
    return {
        nombre: '',
        categoria: null,
        descripcion: '',
        duracion: '60',
        precio_desde: '',
        precio_hasta: '',
        precio_moneda: moneda,
        requiere_anticipo: false,
        tipo_anticipo: 'fijo',
        valor_anticipo: '',
        horarios_permitidos: ''
    };
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
    const [diaEditando, setDiaEditando] = React.useState('lunes');

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

    const PAISES_TELEFONO = window.PHONE_COUNTRIES || [
        { id: 'CU', nombre: 'Cuba', bandera: '\uD83C\uDDE8\uD83C\uDDFA', codigo: '53', ejemplo: '53066647', localLength: 8 }
    ];

    const [config, setConfig] = React.useState({
        // Paso 1: negocio
        nombre: '',
        telefono_whatsapp: '',
        codigo_pais: '53',
        email: '',
        // Paso 2: profesionales
        profesionales: [crearProfesionalWizard()],
        // Paso 3: servicios
        servicios: [crearServicioWizard('CUP')],
        // Paso 4: horarios disponibles (lista de slots) independientes por día
        horarios_dias: {
            lunes:     { activo: true,  horas: rangoHorarioAIndices('09:00', '18:00') },
            martes:    { activo: true,  horas: rangoHorarioAIndices('09:00', '18:00') },
            miercoles: { activo: true,  horas: rangoHorarioAIndices('09:00', '18:00') },
            jueves:    { activo: true,  horas: rangoHorarioAIndices('09:00', '18:00') },
            viernes:   { activo: true,  horas: rangoHorarioAIndices('09:00', '18:00') },
            sabado:    { activo: true,  horas: rangoHorarioAIndices('09:00', '14:00') },
            domingo:   { activo: false, horas: [] }
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
                    if (window.setCodigoPaisTelefono) window.setCodigoPaisTelefono(codigoPais);
                    const telefonoLocal = window.normalizarTelefonoLocal
                        ? window.normalizarTelefonoLocal(data[0].telefono || '', codigoPais)
                        : String(data[0].telefono || '').replace(/\D/g, '');
                    setMonedaSugerida(MONEDA_POR_PAIS[codigoPais] || 'CUP');
                    setConfig(prev => ({
                        ...prev,
                        nombre: data[0].nombre || '',
                        telefono_whatsapp: telefonoLocal,
                        codigo_pais: codigoPais,
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

    const profesionalesValidos = () => config.profesionales.filter(
        p => p.nombre.trim() && p.telefono.trim() && p.password.trim()
    );

    const serviciosValidos = () => config.servicios.filter(
        s => s.nombre.trim() && precioNumerico(s.precio_desde) >= 0 && parseInt(s.duracion, 10) >= 3
    );

    const paisTelefono = () => PAISES_TELEFONO.find(p => String(p.codigo) === String(config.codigo_pais)) || PAISES_TELEFONO[0];

    const diasActivos = () => DIAS.filter(d => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo);

    const validarPaso = () => {
        if (step === 1) {
            const pais = paisTelefono();
            if (!config.nombre.trim()) return t('El nombre del negocio es obligatorio');
            if (!config.codigo_pais) return t('Selecciona el pais del telefono');
            if (!config.telefono_whatsapp || config.telefono_whatsapp.length < Math.min(Number(pais.localLength || 8), 8)) return t('Ingresa un telefono valido');
            if (config.email && !config.email.includes('@')) return t('El email no es valido');
            return '';
        }
        if (step === 2) {
            if (profesionalesValidos().length === 0) return t('Agrega al menos un profesional con WhatsApp y contrasena');
            const incompleto = config.profesionales.find(p => p.nombre.trim() && (!p.telefono.trim() || !p.password.trim()));
            if (incompleto) return t('Cada profesional con nombre necesita WhatsApp y contrasena');
            return '';
        }
        if (step === 3) {
            if (serviciosValidos().length === 0) return t('Agrega al menos un servicio con nombre y precio');
            const anticipoInvalido = config.servicios.find(s => s.nombre.trim() && s.requiere_anticipo && precioNumerico(s.valor_anticipo) <= 0);
            if (anticipoInvalido) return t('El anticipo del servicio debe ser mayor que cero');
            return '';
        }
        if (step === 1) {
            if (!config.nombre.trim()) return t('El nombre del negocio es obligatorio');
            if (!config.telefono_whatsapp || config.telefono_whatsapp.length < 8) return t('El teléfono debe tener 8 dígitos');
            if (config.email && !config.email.includes('@')) return t('El email no es válido');
        }
        if (step === 2) {
            if (profesionalesValidos().length === 0) return t('Agrega al menos un profesional con WhatsApp y contrasena');
        }
        if (step === 3) {
            if (serviciosValidos().length === 0) return t('Agrega al menos un servicio con nombre y precio');
        }
        if (step === 4) {
            const activos = diasActivos();
            if (activos.length === 0) return t('Selecciona al menos un día de trabajo');
            const sinHoras = activos.some(d => (config.horarios_dias[d.id].horas || []).length === 0);
            if (sinHoras) return t('Cada día activo necesita al menos un horario disponible');
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

    const actualizarProfesional = (index, campo, valor) => {
        const nuevos = config.profesionales.map((p, i) => i === index ? { ...p, [campo]: valor } : p);
        setConfig({ ...config, profesionales: nuevos });
    };

    const agregarProfesional = () => {
        setConfig({ ...config, profesionales: [...config.profesionales, crearProfesionalWizard()] });
    };

    const quitarProfesional = (index) => {
        if (config.profesionales.length === 1) return;
        setConfig({ ...config, profesionales: config.profesionales.filter((_, i) => i !== index) });
    };

    const agregarServicio = () => {
        setConfig({ ...config, servicios: [...config.servicios, crearServicioWizard(monedaSugerida)] });
    };

    const quitarServicio = (index) => {
        if (config.servicios.length === 1) return;
        setConfig({ ...config, servicios: config.servicios.filter((_, i) => i !== index) });
    };

    const cambiarCodigoPais = (codigo) => {
        const limpio = String(codigo || '53').replace(/\D/g, '') || '53';
        const monedaAnterior = monedaSugerida;
        const telefonoLocal = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(config.telefono_whatsapp, limpio)
            : String(config.telefono_whatsapp || '').replace(/\D/g, '');
        if (window.setCodigoPaisTelefono) window.setCodigoPaisTelefono(limpio);
        const moneda = (window.getMonedaSugeridaPorCodigoPais && window.getMonedaSugeridaPorCodigoPais(limpio)) || MONEDA_POR_PAIS[limpio] || monedaSugerida || 'CUP';
        setMonedaSugerida(moneda);
        setConfig({
            ...config,
            codigo_pais: limpio,
            telefono_whatsapp: telefonoLocal,
            servicios: config.servicios.map(s => ({
                ...s,
                precio_moneda: (!s.precio_moneda || s.precio_moneda === monedaAnterior) ? moneda : s.precio_moneda
            }))
        });
    };

    const toggleDiaActivo = (diaId) => {
        const actual = config.horarios_dias[diaId];
        const activando = !actual.activo;
        // Al activar un día que quedó sin horas, arrancar con un horario típico
        // (9:00-18:00). La dueña luego marca/desmarca cada slot.
        const horas = (activando && (actual.horas || []).length === 0)
            ? rangoHorarioAIndices('09:00', '18:00')
            : actual.horas;
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { activo: activando, horas } } });
        if (activando) setDiaEditando(diaId);
    };

    const toggleSlot = (diaId, indice) => {
        const actual = config.horarios_dias[diaId];
        const horas = actual.horas.includes(indice)
            ? actual.horas.filter(i => i !== indice)
            : [...actual.horas, indice].sort((a, b) => a - b);
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, horas } } });
    };

    const limpiarHorasDia = (diaId) => {
        const actual = config.horarios_dias[diaId];
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, horas: [] } } });
    };

    const copiarHorasDia = (diaDestino, diaOrigen) => {
        if (!diaOrigen || diaOrigen === diaDestino) return;
        const origen = config.horarios_dias[diaOrigen];
        const actual = config.horarios_dias[diaDestino];
        setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaDestino]: { ...actual, horas: [...origen.horas] } } });
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
            if (cfg && cfg.activo && (cfg.horas || []).length > 0) {
                const indices = [...cfg.horas].sort((a, b) => a - b);
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

    const labelSlot = (indice) => {
        const s = SLOTS_DIA.find(x => x.indice === indice);
        return s ? s.label : '';
    };

    const resumenDia = (diaId) => {
        const horas = (config.horarios_dias[diaId].horas || []).slice().sort((a, b) => a - b);
        if (!horas.length) return '';
        return `${labelSlot(horas[0])} – ${labelSlot(horas[horas.length - 1])} · ${horas.length} ${t('horarios')}`;
    };

    const textoHorarioLegible = () => {
        const partes = DIAS
            .filter(d => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo && config.horarios_dias[d.id].horas.length)
            .map(d => `${d.corto} (${config.horarios_dias[d.id].horas.length})`);
        return partes.join(' · ');
    };

    const normalizarSetupTexto = (valor) => String(valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const limpiarDatosDemo = async () => {
        if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;

        const headers = {
            'apikey': window.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        const [profRes, servRes] = await Promise.all([
            fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&select=id,nombre`, { headers }),
            fetch(`${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=id,nombre`, { headers })
        ]);

        const profesionales = profRes.ok ? await profRes.json() : [];
        const servicios = servRes.ok ? await servRes.json() : [];
        const idsProfesionalesDemo = profesionales
            .filter(p => ['profesional principal', 'profesional de prueba'].includes(normalizarSetupTexto(p.nombre)))
            .map(p => p.id);
        const idsServiciosDemo = servicios
            .filter(s => normalizarSetupTexto(s.nombre) === 'servicio de prueba')
            .map(s => s.id);

        if (idsProfesionalesDemo.length) {
            const ids = idsProfesionalesDemo.join(',');
            await fetch(`${window.SUPABASE_URL}/rest/v1/horarios_profesionales?negocio_id=eq.${negocioId}&profesional_id=in.(${ids})`, { method: 'DELETE', headers }).catch(() => {});
            await fetch(`${window.SUPABASE_URL}/rest/v1/servicios_profesionales?negocio_id=eq.${negocioId}&profesional_id=in.(${ids})`, { method: 'DELETE', headers }).catch(() => {});
            await fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=in.(${ids})`, { method: 'DELETE', headers }).catch(() => {});
        }

        if (idsServiciosDemo.length) {
            const ids = idsServiciosDemo.join(',');
            await fetch(`${window.SUPABASE_URL}/rest/v1/servicios_profesionales?negocio_id=eq.${negocioId}&servicio_id=in.(${ids})`, { method: 'DELETE', headers }).catch(() => {});
            await fetch(`${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&id=in.(${ids})`, { method: 'DELETE', headers }).catch(() => {});
        }
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

            setProgresoGuardado(t('Limpiando datos de prueba...'));
            await limpiarDatosDemo();

            // 1. Profesionales
            setProgresoGuardado(t('Creando profesionales...'));
            const profesionalesCreados = [];
            for (const p of profesionalesValidos()) {
                const telefono = window.normalizarTelefonoLocal
                    ? window.normalizarTelefonoLocal(p.telefono, config.codigo_pais)
                    : String(p.telefono || '').replace(/\D/g, '');
                const creado = await window.salonProfesionales.crear({
                    nombre: p.nombre.trim(),
                    especialidad: p.especialidad.trim() || t('General'),
                    telefono,
                    password: p.password,
                    nivel: parseInt(p.nivel, 10) || 1,
                    color: p.color || 'bg-amber-600',
                    avatar: p.avatar || '\uD83D\uDC64'
                });
                if (creado && creado.id) profesionalesCreados.push(creado);
            }
            if (profesionalesCreados.length === 0) throw new Error(t('No se pudo crear el profesional. Intenta de nuevo.'));

            // 2. Servicios
            setProgresoGuardado(t('Creando servicios...'));
            const idsServicios = [];
            for (const s of serviciosValidos()) {
                const precioDesde = precioNumerico(s.precio_desde);
                const precioHasta = String(s.precio_hasta || '').trim() ? precioNumerico(s.precio_hasta) : null;
                const valorAnticipo = String(s.valor_anticipo || '').trim() ? precioNumerico(s.valor_anticipo) : null;
                const horarios = String(s.horarios_permitidos || '').trim()
                    ? String(s.horarios_permitidos).split(',').map(h => h.trim()).filter(h => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
                    : [];
                const creado = await window.salonServicios.crear({
                    nombre: s.nombre.trim(),
                    duracion: parseInt(s.duracion) || 60,
                    precio: precioDesde,
                    precio_desde: precioDesde,
                    precio_hasta: precioHasta,
                    precio_moneda: s.precio_moneda || monedaSugerida,
                    categoria: s.categoria || null,
                    descripcion: String(s.descripcion || '').trim(),
                    requiere_anticipo: s.requiere_anticipo === true,
                    tipo_anticipo: s.tipo_anticipo === 'porcentaje' ? 'porcentaje' : 'fijo',
                    valor_anticipo: s.requiere_anticipo ? valorAnticipo : null,
                    horarios_permitidos: horarios
                });
                if (creado && creado.id) idsServicios.push(creado.id);
            }

            // 3. Asignar cada servicio a cada profesional creado
            setProgresoGuardado(t('Vinculando servicios...'));
            for (const sid of idsServicios) {
                for (const prof of profesionalesCreados) {
                    await window.asignarProfesionalAServicio(sid, prof.id);
                }
            }

            // 4. Horarios de cada profesional
            setProgresoGuardado(t('Guardando horarios...'));
            for (const prof of profesionalesCreados) {
                await guardarHorariosProfesional(prof.id);
            }

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
                codigo_pais: config.codigo_pais,
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
                            <input type="text" value={config.nombre} onChange={(e) => setConfig({ ...config, nombre: e.target.value })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder={t('Ej: BennetSalon')} autoFocus />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                            <div className="grid grid-cols-[minmax(130px,190px)_1fr] gap-2">
                                <select value={config.codigo_pais} onChange={(e) => cambiarCodigoPais(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                                    {PAISES_TELEFONO.map(pais => <option key={pais.codigo} value={pais.codigo}>{pais.bandera || ''} {pais.nombre} +{pais.codigo}</option>)}
                                </select>
                                <input
                                    type="tel"
                                    value={config.telefono_whatsapp}
                                    onChange={(e) => setConfig({ ...config, telefono_whatsapp: window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(e.target.value, config.codigo_pais) : e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder={paisTelefono()?.ejemplo || '54438629'}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{t('Se usara como')} {window.formatearTelefono ? window.formatearTelefono(config.telefono_whatsapp, config.codigo_pais) : '+' + config.codigo_pais + ' ' + config.telefono_whatsapp}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" value={config.email} onChange={(e) => setConfig({ ...config, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="salon@gmail.com" />
                        </div>
                    </div>
                )}

                {/* Paso 2: Profesional */}
                {step === 2 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold mb-1">👥 {t('Quien atiende')}</h2>
                                <p className="text-sm text-gray-500 mb-3">{t('Agrega uno o varios profesionales con acceso al panel.')}</p>
                            </div>
                            <button type="button" onClick={agregarProfesional} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">{t('Anadir profesional')}</button>
                        </div>
                        {config.profesionales.map((p, i) => (
                            <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-gray-800">{t('Profesional')} {i + 1}</h3>
                                    {config.profesionales.length > 1 && <button type="button" onClick={() => quitarProfesional(i)} className="text-sm text-red-600 hover:underline">{t('Quitar')}</button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" value={p.nombre} onChange={(e) => actualizarProfesional(i, 'nombre', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={t('Nombre *')} />
                                    <input type="text" value={p.especialidad} onChange={(e) => actualizarProfesional(i, 'especialidad', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={t('Especialidad')} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select value={p.nivel} onChange={(e) => actualizarProfesional(i, 'nivel', parseInt(e.target.value, 10))} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        <option value="1">🔰 {t('Basico')}</option>
                                        <option value="2">⭐ {t('Intermedio')}</option>
                                        <option value="3">👑 {t('Avanzado')}</option>
                                    </select>
                                    <input type="tel" value={p.telefono} onChange={(e) => actualizarProfesional(i, 'telefono', window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(e.target.value, config.codigo_pais) : e.target.value.replace(/\D/g, ''))} className="w-full border rounded-lg px-3 py-2" placeholder={'WhatsApp +' + config.codigo_pais} />
                                    <input type="password" value={p.password} onChange={(e) => actualizarProfesional(i, 'password', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={t('Contrasena de acceso *')} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={p.avatar} onChange={(e) => actualizarProfesional(i, 'avatar', e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        {['👤','💇','💅','👑','⭐','🔰'].map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <select value={p.color} onChange={(e) => actualizarProfesional(i, 'color', e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        <option value="bg-amber-600">{t('Ambar')}</option>
                                        <option value="bg-pink-500">{t('Rosa')}</option>
                                        <option value="bg-purple-500">{t('Purpura')}</option>
                                        <option value="bg-blue-500">{t('Azul')}</option>
                                        <option value="bg-green-500">{t('Verde')}</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Paso 3: Servicios */}
                {step === 3 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold mb-1">💅 {t('Servicios')}</h2>
                                <p className="text-sm text-gray-500 mb-3">{t('Empieza con uno y agrega los que necesites con precio, duracion y reglas.')}</p>
                            </div>
                            <button type="button" onClick={agregarServicio} className="px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700">{t('Anadir servicio')}</button>
                        </div>
                        {config.servicios.map((s, i) => (
                            <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-gray-800">{t('Servicio')} {i + 1}</h3>
                                    {config.servicios.length > 1 && <button type="button" onClick={() => quitarServicio(i)} className="text-sm text-red-600 hover:underline">{t('Quitar')}</button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" value={s.nombre} onChange={(e) => actualizarServicio(i, 'nombre', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={t('Nombre del servicio *')} />
                                    <input type="text" value={s.duracion} onChange={(e) => actualizarServicio(i, 'duracion', e.target.value.replace(/\D/g, ''))} className="w-full border rounded-lg px-3 py-2" placeholder={t('Duracion en minutos')} inputMode="numeric" />
                                </div>
                                <textarea value={s.descripcion} onChange={(e) => actualizarServicio(i, 'descripcion', e.target.value)} className="w-full border rounded-lg px-3 py-2" rows="3" placeholder={t('Descripcion')} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select value={s.precio_moneda || monedaSugerida} onChange={(e) => actualizarServicio(i, 'precio_moneda', e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        <option value="CUP">CUP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="MXN">MXN</option><option value="COP">COP</option><option value="PEN">PEN</option><option value="CLP">CLP</option>
                                    </select>
                                    <input type="text" value={s.precio_desde} onChange={(e) => actualizarServicio(i, 'precio_desde', e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full border rounded-lg px-3 py-2" placeholder={t('Precio desde *')} inputMode="decimal" />
                                    <input type="text" value={s.precio_hasta} onChange={(e) => actualizarServicio(i, 'precio_hasta', e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full border rounded-lg px-3 py-2" placeholder={t('Precio hasta opcional')} inputMode="decimal" />
                                </div>
                                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">
                                    <label className="flex items-center justify-between gap-3 cursor-pointer"><span className="text-sm font-semibold text-amber-800">{t('Anticipo propio de este servicio')}</span><input type="checkbox" checked={s.requiere_anticipo} onChange={(e) => actualizarServicio(i, 'requiere_anticipo', e.target.checked)} className="w-5 h-5 text-amber-600" /></label>
                                    {s.requiere_anticipo && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <select value={s.tipo_anticipo} onChange={(e) => actualizarServicio(i, 'tipo_anticipo', e.target.value)} className="w-full border border-amber-200 rounded-lg px-3 py-2 bg-white"><option value="fijo">{t('Monto fijo')}</option><option value="porcentaje">{t('Porcentaje')}</option></select>
                                            <input value={s.valor_anticipo} onChange={(e) => actualizarServicio(i, 'valor_anticipo', e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full border border-amber-200 rounded-lg px-3 py-2" placeholder={s.tipo_anticipo === 'porcentaje' ? t('Ej: 30') : t('Ej: 500')} inputMode="decimal" />
                                        </div>
                                    )}
                                </div>
                                <input value={s.horarios_permitidos} onChange={(e) => actualizarServicio(i, 'horarios_permitidos', e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={t('Horarios permitidos: 09:00, 11:00')} />
                                <p className="text-xs text-gray-400">{t('Dejalo vacio para usar todos los horarios del profesional.')}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Paso 4: Horarios disponibles (grilla de slots) por día */}
                {step === 4 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-3 animate-fade-in">
                        <h2 className="text-xl font-bold mb-1">🕐 {t('Horarios disponibles')}</h2>
                        <p className="text-sm text-gray-500 mb-3">{t('Activa cada día y marca las horas en las que atiendes. Cada hora marcada es un turno que la clienta podrá reservar.')}</p>

                        {DIAS.map(d => {
                            const cfg = config.horarios_dias[d.id];
                            const editando = diaEditando === d.id;
                            return (
                                <div key={d.id} className={`rounded-lg border transition-all ${cfg.activo ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center gap-3 p-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleDiaActivo(d.id)}
                                            className={`w-14 shrink-0 px-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                                cfg.activo ? 'bg-amber-600 text-white shadow' : 'bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            {d.corto}
                                        </button>
                                        {cfg.activo ? (
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-700 truncate">{resumenDia(d.id) || t('Sin horarios — toca «Editar»')}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm flex-1">{t('Cerrado')}</span>
                                        )}
                                        {cfg.activo && (
                                            <button
                                                type="button"
                                                onClick={() => setDiaEditando(editando ? null : d.id)}
                                                className="text-xs font-semibold text-amber-700 hover:underline shrink-0"
                                            >
                                                {editando ? t('Cerrar') : t('Editar')}
                                            </button>
                                        )}
                                    </div>

                                    {cfg.activo && editando && (
                                        <div className="px-3 pb-3">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <button type="button" onClick={() => limpiarHorasDia(d.id)} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                                                    {t('Limpiar')}
                                                </button>
                                                <select
                                                    value=""
                                                    onChange={(e) => { copiarHorasDia(d.id, e.target.value); e.target.value = ''; }}
                                                    className="text-xs border rounded px-2 py-1 bg-white"
                                                >
                                                    <option value="">{t('Copiar de…')}</option>
                                                    {DIAS.filter(x => x.id !== d.id && config.horarios_dias[x.id].horas.length > 0).map(x => (
                                                        <option key={x.id} value={x.id}>{x.nombre} ({config.horarios_dias[x.id].horas.length})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-60 overflow-y-auto p-1 border rounded-lg bg-white">
                                                {SLOTS_DIA.map(slot => {
                                                    const activa = cfg.horas.includes(slot.indice);
                                                    return (
                                                        <button
                                                            key={slot.indice}
                                                            type="button"
                                                            onClick={() => toggleSlot(d.id, slot.indice)}
                                                            className={`px-1 py-1 text-xs font-medium rounded transition-all ${
                                                                activa
                                                                    ? 'bg-amber-600 text-white shadow-sm'
                                                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-400'
                                                            }`}
                                                        >
                                                            {slot.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{t('Cada franja es de 30 min. Marca solo las horas en que empiezas turnos.')}</p>
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
                                <span className="font-medium">{profesionalesValidos().map(p => p.nombre.trim()).join(', ') || '—'}</span>
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
