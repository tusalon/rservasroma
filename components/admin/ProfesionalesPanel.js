// components/admin/ProfesionalesPanel.js

function ProfesionalesPanel() {
    window.useIdioma();
    const t = window.t;
    const [profesionales, setProfesionales] = React.useState([]);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);

    React.useEffect(() => {
        cargarProfesionales();
    }, []);

    const cargarProfesionales = async () => {
        setCargando(true);
        try {
            console.log('📋 Cargando profesionales...');
            if (window.salonProfesionales) {
                const lista = await window.salonProfesionales.getAll(false);
                console.log('✅ Profesionales obtenidos:', lista);
                setProfesionales(lista || []);
            }
        } catch (error) {
            console.error('Error cargando profesionales:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async (profesional) => {
        try {
            console.log('💾 Guardando profesional:', profesional);
            if (editando) {
                await window.salonProfesionales.actualizar(editando.id, profesional);
            } else {
                await window.salonProfesionales.crear(profesional);
            }
            await cargarProfesionales();
            setMostrarForm(false);
            setEditando(null);
        } catch (error) {
            console.error('Error guardando profesional:', error);
            alert(t('Error al guardar el profesional'));
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm(t('¿Eliminar este profesional?'))) return;
        try {
            console.log('🗑️ Eliminando profesional:', id);
            await window.salonProfesionales.eliminar(id);
            await cargarProfesionales();
        } catch (error) {
            console.error('Error eliminando profesional:', error);
            alert(t('Error al eliminar el profesional'));
        }
    };

    const toggleActivo = async (id) => {
        const profesional = profesionales.find(p => p.id === id);
        try {
            await window.salonProfesionales.actualizar(id, { activo: !profesional.activo });
            await cargarProfesionales();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    const getNivelNombre = (nivel) => {
        switch(nivel) {
            case 1: return '🔰 ' + t('Básico');
            case 2: return '⭐ ' + t('Intermedio');
            case 3: return '👑 ' + t('Avanzado');
            default: return '🔰 ' + t('Básico');
        }
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">{t('Cargando profesionales...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">👥 {t('Profesionales')}</h2>
                <button
                    onClick={() => {
                        setEditando(null);
                        setMostrarForm(true);
                    }}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                >
                    + {t('Nuevo Profesional')}
                </button>
            </div>

            {mostrarForm && (
                <ProfesionalForm
                    profesional={editando}
                    onGuardar={handleGuardar}
                    onCancelar={() => {
                        setMostrarForm(false);
                        setEditando(null);
                    }}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profesionales.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                        {t('No hay profesionales cargados')}
                    </div>
                ) : (
                    profesionales.map(p => (
                        <div key={p.id} className={`border rounded-lg p-4 ${p.activo ? '' : 'opacity-50 bg-gray-50'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 ${p.color || 'bg-amber-600'} rounded-full flex items-center justify-center text-2xl`}>
                                        {p.avatar || '👤'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">{p.nombre}</h3>
                                            <button
                                                onClick={() => toggleActivo(p.id)}
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                    p.activo 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {p.activo ? t('Activo') : t('Inactivo')}
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-600">{p.especialidad}</p>
                                        
                                        <p className="text-xs mt-1">
                                            <span className={`px-2 py-0.5 rounded-full ${
                                                p.nivel === 1 ? 'bg-gray-100 text-gray-600' :
                                                p.nivel === 2 ? 'bg-blue-100 text-blue-600' :
                                                'bg-purple-100 text-purple-600'
                                            }`}>
                                                {getNivelNombre(p.nivel)}
                                            </span>
                                        </p>
                                        
                                        {p.telefono && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                📱 {p.telefono}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditando(p);
                                            setMostrarForm(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(p.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ProfesionalForm({ profesional, onGuardar, onCancelar }) {
    window.useIdioma();
    const t = window.t;
    const [form, setForm] = React.useState(profesional ? { ...profesional, password: '' } : {
        nombre: '',
        especialidad: '',
        telefono: '',
        password: '',
        nivel: 1,
        color: 'bg-amber-600',
        avatar: '👤'
    });

    const avatares = ['👤', '💇', '💅', '👑', '⭐', '🔰'];
    const colores = [
        { value: 'bg-amber-600', label: t('Ámbar') },
        { value: 'bg-amber-700', label: t('Ámbar Oscuro') },
        { value: 'bg-pink-500', label: t('Rosa') },
        { value: 'bg-purple-500', label: t('Púrpura') },
        { value: 'bg-blue-500', label: t('Azul') },
        { value: 'bg-green-500', label: t('Verde') }
    ];

    const niveles = [
        { value: 1, label: '🔰 ' + t('Básico - Solo ver reservas'), desc: t('Acceso limitado a reservas') },
        { value: 2, label: '⭐ ' + t('Intermedio - Reservas + Configuración propia + Clientes'), desc: t('Puede ver configuración (solo sus horarios) y clientes') },
        { value: 3, label: '👑 ' + t('Avanzado - Acceso total'), desc: t('Puede gestionar todo como el dueño') }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.telefono || form.telefono.length < 8) {
            alert(t('Ingresa un teléfono válido para el acceso del profesional'));
            return;
        }
        if (!profesional && !String(form.password || '').trim()) {
            alert(t('Ingresa una contraseña para el acceso del profesional'));
            return;
        }

        const payload = { ...form };
        if (!String(payload.password || '').trim()) {
            delete payload.password;
        }
        onGuardar(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4">
                {profesional ? '✏️ ' + t('Editar Profesional') : '➕ ' + t('Nuevo Profesional')}
            </h3>

            <div className="space-y-3">
                <input
                    type="text"
                    placeholder={t('Nombre')}
                    value={form.nombre}
                    onChange={(e) => setForm({...form, nombre: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                />

                <input
                    type="text"
                    placeholder={t('Especialidad')}
                    value={form.especialidad}
                    onChange={(e) => setForm({...form, especialidad: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Nivel de Acceso')}
                    </label>
                    <select
                        value={form.nivel}
                        onChange={(e) => setForm({...form, nivel: parseInt(e.target.value)})}
                        className="w-full border rounded-lg px-3 py-2"
                    >
                        {niveles.map(n => (
                            <option key={n.value} value={n.value}>{n.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        {niveles.find(n => n.value === form.nivel)?.desc}
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Teléfono')}
                    </label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            {window.getPhoneCountryConfig ? window.getPhoneCountryConfig().bandera : '🇨🇺'} +{window.getPhoneCountryConfig ? window.getPhoneCountryConfig().codigo : '53'}
                        </span>
                        <input
                            type="tel"
                            value={form.telefono}
                            onChange={(e) => {
                                const value = window.normalizarTelefonoLocal
                                    ? window.normalizarTelefonoLocal(e.target.value)
                                    : e.target.value.replace(/\D/g, '');
                                setForm({...form, telefono: value});
                            }}
                            className="w-full px-4 py-2 rounded-r-lg border border-gray-300"
                            placeholder={window.getPhoneCountryConfig ? window.getPhoneCountryConfig().ejemplo : '55002272'}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('Numero local despues del codigo de pais.')}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Contraseña')}
                    </label>
                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({...form, password: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder={profesional ? t('Dejar vacío para mantener la actual') : t('Contraseña de acceso')}
                        required={!profesional}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm mb-1">{t('Avatar')}</label>
                        <select
                            value={form.avatar}
                            onChange={(e) => setForm({...form, avatar: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2"
                        >
                            {avatares.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm mb-1">{t('Color')}</label>
                        <select
                            value={form.color}
                            onChange={(e) => setForm({...form, color: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2"
                        >
                            {colores.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancelar} className="px-4 py-2 border rounded-lg hover:bg-gray-100">{t('Cancelar')}</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{t('Guardar')}</button>
            </div>
        </form>
    );
}
