// components/admin/DiasCerradosPanel.js - Panel para gestionar días cerrados

function DiasCerradosPanel() {
    const [diasCerrados, setDiasCerrados] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [nuevaFecha, setNuevaFecha] = React.useState('');
    const [nuevoMotivo, setNuevoMotivo] = React.useState('');
    const [error, setError] = React.useState('');
    const [exito, setExito] = React.useState('');

    const cargarDias = async () => {
        setCargando(true);
        try {
            const dias = await window.getDiasCerrados();
            setDiasCerrados(dias || []);
        } catch (error) {
            console.error('Error cargando días:', error);
            setError('Error al cargar los días cerrados');
        } finally {
            setCargando(false);
        }
    };

    React.useEffect(() => {
        cargarDias();
        
        const handleActualizacion = () => cargarDias();
        window.addEventListener('diasCerradosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('diasCerradosActualizados', handleActualizacion);
        };
    }, []);

    const handleAgregar = async () => {
        if (!nuevaFecha) {
            setError('Seleccioná una fecha');
            return;
        }
        
        setError('');
        setExito('');
        
        const existe = diasCerrados.find(d => d.fecha === nuevaFecha);
        if (existe) {
            setError('Esta fecha ya está marcada como cerrada');
            return;
        }
        
        const success = await window.agregarDiaCerrado(nuevaFecha, nuevoMotivo);
        
        if (success) {
            setExito('✅ Día cerrado agregado correctamente');
            setNuevaFecha('');
            setNuevoMotivo('');
            setMostrarForm(false);
            await cargarDias();
            setTimeout(() => setExito(''), 3000);
        } else {
            setError('Error al agregar el día');
        }
    };

    const handleEliminar = async (fecha) => {
        const fechaFormateada = window.formatFechaCompleta ? 
            window.formatFechaCompleta(fecha) : 
            fecha;
            
        if (!confirm(`¿Eliminar el día cerrado del ${fechaFormateada}?`)) return;
        
        const success = await window.eliminarDiaCerrado(fecha);
        
        if (success) {
            setExito('✅ Día cerrado eliminado');
            await cargarDias();
            setTimeout(() => setExito(''), 3000);
        } else {
            setError('Error al eliminar el día');
        }
    };

    const formatFecha = (fechaStr) => {
        if (window.formatFechaCompleta) {
            return window.formatFechaCompleta(fechaStr);
        }
        const [year, month, day] = fechaStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando días cerrados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🚫</span>
                    Días Cerrados (Feriados / Vacaciones)
                </h2>
                <button
                    onClick={() => {
                        setMostrarForm(true);
                        setError('');
                        setExito('');
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2"
                >
                    <span>➕</span>
                    Agregar día cerrado
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {exito && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {exito}
                </div>
            )}

            {mostrarForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold mb-4">📅 Agregar día no laborable</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha *
                            </label>
                            <input
                                type="date"
                                value={nuevaFecha}
                                onChange={(e) => setNuevaFecha(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Motivo (opcional)
                            </label>
                            <input
                                type="text"
                                value={nuevoMotivo}
                                onChange={(e) => setNuevoMotivo(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Ej: Feriado, Vacaciones, Mantenimiento"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setMostrarForm(false);
                                    setNuevaFecha('');
                                    setNuevoMotivo('');
                                }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAgregar}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {diasCerrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                    <p className="text-4xl mb-2">📅✨</p>
                    <p>No hay días cerrados configurados</p>
                    <p className="text-sm mt-1">Todos los días están disponibles según horarios de profesionales</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {diasCerrados.map((dia, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <div className="font-medium text-gray-800">
                                    📅 {formatFecha(dia.fecha)}
                                </div>
                                {dia.motivo && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        📝 {dia.motivo}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleEliminar(dia.fecha)}
                                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                title="Eliminar"
                            >
                                🗑️ Quitar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                <div className="flex items-start gap-2">
                    <span>ℹ️</span>
                    <div>
                        <p className="font-medium">¿Cómo funciona?</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                            <li>Los días marcados como cerrados NO aparecerán disponibles en el calendario</li>
                            <li>Aplica para TODOS los profesionales</li>
                            <li>No se podrán crear reservas en estos días (ni clientes ni admin)</li>
                            <li>Útil para feriados, vacaciones colectivas o días de mantenimiento</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}