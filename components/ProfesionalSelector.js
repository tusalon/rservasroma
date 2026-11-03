// components/ProfesionalSelector.js - filtro por un solo servicio

function ProfesionalSelector({ onSelect, selectedProfesional, selectedService }) {
    window.useIdioma();
    const t = window.t;
    const [profesionales, setProfesionales] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [todosProfesionales, setTodosProfesionales] = React.useState([]);

    React.useEffect(() => {
        cargarTodosProfesionales();
    }, []);

    React.useEffect(() => {
        if (todosProfesionales.length > 0) {
            filtrarPorServicio();
        }
    }, [selectedService, todosProfesionales]);

    const cargarTodosProfesionales = async () => {
        setCargando(true);
        try {
            if (window.salonProfesionales) {
                const activos = await window.salonProfesionales.getAll(true);
                setTodosProfesionales(activos || []);
                // Se espera al filtro: sin el await, "cargando" se apagaba antes
                // y asomaba un instante "aún no tiene turnos online". Con un paso
                // por pantalla el selector se monta cada vez que se vuelve aquí.
                await filtrarPorServicio(activos || []);
            }
        } catch (error) {
            console.error('Error cargando profesionales:', error);
        } finally {
            setCargando(false);
        }
    };

    const filtrarPorServicio = async (profesionalesList = todosProfesionales) => {
        if (!selectedService) {
            setProfesionales(profesionalesList);
            return;
        }

        try {
            if (window.getProfesionalesPorServicio) {
                let idsDelServicio = [];
                if (selectedService.esMultiple && Array.isArray(selectedService.servicios)) {
                    const listas = await Promise.all(
                        selectedService.servicios.map(servicio => window.getProfesionalesPorServicio(servicio.id))
                    );
                    const listasIds = listas.map(lista => lista.map(p => p.id));
                    idsDelServicio = listasIds.reduce((comunes, ids) => comunes.filter(id => ids.includes(id)));
                } else {
                    const profesionalesDelServicio = await window.getProfesionalesPorServicio(selectedService.id);
                    idsDelServicio = profesionalesDelServicio.map(p => p.id);
                }
                const filtrados = profesionalesList.filter(p => idsDelServicio.includes(p.id));
                setProfesionales(filtrados);

                if (selectedProfesional && !filtrados.find(p => p.id === selectedProfesional.id)) {
                    onSelect(null);
                }
            } else {
                setProfesionales(profesionalesList);
            }
        } catch (error) {
            console.error('Error filtrando profesionales:', error);
            setProfesionales(profesionalesList);
        }
    };

    if (cargando) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    {t('2. Elige tu profesional')}
                </h2>
                <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto"></div>
                    <p className="text-pink-400 mt-4">{t('Cargando profesionales...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                {t('2. Elige tu profesional')}
                {selectedProfesional && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        {t('Seleccionada')}
                    </span>
                )}
            </h2>

            {selectedService && profesionales.length === 0 ? (
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200 space-y-3">
                    <p className="text-pink-700 font-medium">{t('"{servicio}" aún no tiene turnos online', { servicio: selectedService.nombre })}</p>
                    <p className="text-sm text-pink-600">{t('Escríbenos y te lo coordinamos directamente 💖')}</p>
                    <button
                        onClick={() => window.contactarSalonWhatsApp?.(`Hola! Quiero reservar "${selectedService.nombre}" pero no aparece disponible en la app ✨`)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
                    >
                        💬 {t('Reservar por WhatsApp')}
                    </button>
                </div>
            ) : profesionales.length === 0 ? (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200 space-y-3">
                    <p className="text-pink-600 font-medium">{t('Aún no hay profesionales con turnos online')}</p>
                    <button
                        onClick={() => window.contactarSalonWhatsApp?.()}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
                    >
                        💬 {t('Reservar por WhatsApp')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Dos por fila en tarjetas blancas: se ven todas sin bajar. */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {profesionales.map(prof => (
                            <button
                                key={prof.id}
                                onClick={() => onSelect(prof)}
                                className={`p-4 rounded-2xl bg-white shadow-sm text-center transition-shadow ${selectedProfesional?.id === prof.id ? 'ring-2 ring-pink-500' : 'hover:shadow-md'}`}
                            >
                                <div className="flex flex-col items-center text-center min-w-0">
                                    <div className={`w-16 h-16 ${prof.color || 'bg-pink-500'} rounded-full flex items-center justify-center text-3xl mb-3 shadow-md`}>
                                        {prof.avatar || '✨'}
                                    </div>
                                    <span className="font-bold text-gray-900 text-base block break-words">{prof.nombre}</span>
                                    <span className="text-sm text-gray-500 mt-1">{prof.especialidad}</span>
                                    {selectedProfesional?.id === prof.id && (
                                        <div className="mt-2 text-pink-600 text-sm font-semibold">{t('Seleccionada')}</div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
