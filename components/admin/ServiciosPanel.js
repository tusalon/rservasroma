// components/admin/ServiciosPanel.js - CON ENTRADA DE TEXTO LIBRE Y HORARIOS PERMITIDOS
// MEJORA: Inputs de texto que permiten escribir cualquier valor y campo de horarios permitidos

function ServiciosPanel() {
    const [servicios, setServicios] = React.useState([]);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);

    React.useEffect(() => {
        cargarServicios();
        
        const handleActualizacion = () => cargarServicios();
        window.addEventListener('serviciosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('serviciosActualizados', handleActualizacion);
        };
    }, []);

    const cargarServicios = async () => {
        setCargando(true);
        try {
            console.log('📋 Cargando servicios...');
            if (window.salonServicios) {
                const lista = await window.salonServicios.getAll(false);
                console.log('✅ Servicios obtenidos:', lista);
                setServicios(lista || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async (servicio) => {
        try {
            console.log('💾 Guardando servicio:', servicio);
            if (editando) {
                await window.salonServicios.actualizar(editando.id, servicio);
            } else {
                await window.salonServicios.crear(servicio);
            }
            await cargarServicios();
            setMostrarForm(false);
            setEditando(null);
        } catch (error) {
            console.error('Error guardando servicio:', error);
            alert('Error al guardar el servicio');
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar este servicio?')) return;
        try {
            console.log('🗑️ Eliminando servicio:', id);
            await window.salonServicios.eliminar(id);
            await cargarServicios();
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            alert('Error al eliminar el servicio');
        }
    };

    const toggleActivo = async (id) => {
        const servicio = servicios.find(s => s.id === id);
        try {
            await window.salonServicios.actualizar(id, { activo: !servicio.activo });
            await cargarServicios();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando servicios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">💈 Servicios</h2>
                <button
                    onClick={() => {
                        setEditando(null);
                        setMostrarForm(true);
                    }}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                >
                    + Nuevo Servicio
                </button>
            </div>

            {mostrarForm && (
                <ServicioForm
                    servicio={editando}
                    onGuardar={handleGuardar}
                    onCancelar={() => {
                        setMostrarForm(false);
                        setEditando(null);
                    }}
                />
            )}

            <div className="space-y-2">
                {servicios.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">No hay servicios cargados</p>
                        <p className="text-sm">Hacé clic en "+ Nuevo Servicio" para comenzar</p>
                    </div>
                ) : (
                    servicios.map(s => (
                        <div key={s.id} className={`border rounded-lg p-4 ${s.activo ? '' : 'opacity-50 bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-lg">{s.nombre}</h3>
                                        <button
                                            onClick={() => toggleActivo(s.id)}
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                s.activo 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {s.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {s.duracion} min | ${s.precio}
                                    </p>
                                    {s.descripcion && (
                                        <p className="text-xs text-gray-500 mt-1">{s.descripcion}</p>
                                    )}
                                    {s.horarios_permitidos && s.horarios_permitidos.length > 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            🕐 Horarios permitidos: {s.horarios_permitidos.join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditando(s);
                                            setMostrarForm(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 px-2"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(s.id)}
                                        className="text-red-600 hover:text-red-800 px-2"
                                        title="Eliminar"
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

// COMPONENTE CON ENTRADA DE TEXTO LIBRE Y CAMPO DE HORARIOS PERMITIDOS
function ServicioForm({ servicio, onGuardar, onCancelar }) {
    const [form, setForm] = React.useState(servicio || {
        nombre: '',
        duracion: '45',
        precio: '0',
        descripcion: '',
        horarios_permitidos: []  // nuevo campo
    });

    // Para el input de horarios (string separado por comas)
    const [horariosStr, setHorariosStr] = React.useState(
        servicio?.horarios_permitidos ? servicio.horarios_permitidos.join(', ') : ''
    );

    // Función para validar y convertir a número al guardar
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!form.nombre.trim()) {
            alert('El nombre del servicio es obligatorio');
            return;
        }

        const duracionNum = parseInt(form.duracion);
        if (isNaN(duracionNum) || duracionNum < 15) {
            alert('La duración debe ser al menos 15 minutos');
            return;
        }

        const precioNum = parseFloat(form.precio);
        if (isNaN(precioNum) || precioNum < 0) {
            alert('El precio debe ser un valor válido');
            return;
        }

        // Convertir la cadena de horarios a array
        let horariosArray = [];
        if (horariosStr.trim()) {
            horariosArray = horariosStr.split(',').map(h => h.trim()).filter(h => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));
            if (horariosArray.length === 0 && horariosStr.trim()) {
                alert('Formato de horarios inválido. Use formato HH:MM separados por comas (ej: 09:00, 11:00, 15:30)');
                return;
            }
        }
        
        onGuardar({
            ...form,
            duracion: duracionNum,
            precio: precioNum,
            horarios_permitidos: horariosArray
        });
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold mb-4 text-amber-800">
                {servicio ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
            </h3>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del servicio *
                    </label>
                    <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({...form, nombre: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Ej: Corte de Cabello"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {/* CAMPO DE DURACIÓN */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duración (min) *
                        </label>
                        <input
                            type="text"
                            value={form.duracion}
                            onChange={(e) => {
                                const valor = e.target.value.replace(/[^0-9]/g, '');
                                setForm({...form, duracion: valor});
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Ej: 45"
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                        <p className="text-xs text-gray-400 mt-1">Podés borrar y escribir el valor que quieras</p>
                    </div>
                    
                    {/* CAMPO DE PRECIO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio ($) *
                        </label>
                        <input
                            type="text"
                            value={form.precio}
                            onChange={(e) => {
                                const valor = e.target.value.replace(/[^0-9.]/g, '');
                                const partes = valor.split('.');
                                if (partes.length > 2) return;
                                setForm({...form, precio: valor});
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Ej: 2500"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                        />
                        <p className="text-xs text-gray-400 mt-1">Podés usar punto para decimales (ej: 99.50)</p>
                    </div>
                </div>

                {/* NUEVO CAMPO: HORARIOS PERMITIDOS */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horarios permitidos (opcional)
                    </label>
                    <input
                        type="text"
                        value={horariosStr}
                        onChange={(e) => setHorariosStr(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Ej: 09:00, 11:00, 15:30"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Horarios específicos en que está disponible este servicio (formato HH:MM separados por comas). 
                        Si se deja vacío, se mostrarán todos los horarios del profesional.
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                    </label>
                    <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm({...form, descripcion: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        rows="2"
                        placeholder="Descripción opcional del servicio"
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                    {servicio ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}