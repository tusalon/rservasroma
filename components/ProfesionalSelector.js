// components/ProfesionalSelector.js - Versión femenina

function ProfesionalSelector({ onSelect, selectedProfesional }) {
    const [profesionales, setProfesionales] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);

    React.useEffect(() => {
        cargarProfesionales();
        
        const handleActualizacion = () => cargarProfesionales();
        window.addEventListener('profesionalesActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('profesionalesActualizados', handleActualizacion);
        };
    }, []);

    const cargarProfesionales = async () => {
        setCargando(true);
        try {
            if (window.salonProfesionales) {
                const activos = await window.salonProfesionales.getAll(true);
                setProfesionales(activos || []);
            }
        } catch (error) {
            console.error('Error cargando profesionales:', error);
        } finally {
            setCargando(false);
        }
    };

    if (cargando) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">👩‍🎨</span>
                    2. Elegí tu profesional
                </h2>
                <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto"></div>
                    <p className="text-pink-400 mt-4">Cargando profesionales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">👩‍🎨</span>
                2. Elegí tu profesional
                {selectedProfesional && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        ✓ Seleccionada
                    </span>
                )}
            </h2>
            
            {profesionales.length === 0 ? (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200">
                    <p className="text-pink-500">No hay profesionales disponibles</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {profesionales.map(prof => (
                        <button
                            key={prof.id}
                            onClick={() => onSelect(prof)}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-105
                                ${selectedProfesional?.id === prof.id 
                                    ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-lg' 
                                    : 'border-pink-200 bg-white/80 backdrop-blur-sm hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-md'}
                            `}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 ${prof.color || 'bg-pink-500'} rounded-full flex items-center justify-center text-3xl mb-3 shadow-md ring-2 ring-pink-300/50`}>
                                    {prof.avatar || '👩‍🎨'}
                                </div>
                                <span className="font-bold text-pink-800 text-lg block">
                                    {prof.nombre}
                                </span>
                                <span className="text-sm text-pink-500 mt-1">
                                    {prof.especialidad}
                                </span>
                                
                                {selectedProfesional?.id === prof.id && (
                                    <div className="mt-2 text-pink-600 text-sm font-semibold flex items-center gap-1">
                                        <span>✅</span>
                                        Seleccionada
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            <div className="text-xs text-pink-500 bg-pink-50 p-3 rounded-lg border border-pink-200">
                <p className="flex items-center gap-2">
                    <span className="text-pink-400 text-lg">💡</span>
                    <span>Cada profesional tiene su propia agenda. Después de elegir, podrás ver sus horarios disponibles.</span>
                </p>
            </div>
        </div>
    );
}