// components/ServiceSelection.js

function ServiceSelection({ onSelect, selectedService }) {
    const services = [
        { id: 1, name: "💅 Esmaltado semipermanente manos y pies", duration: 60 },
        { id: 2, name: "✨ Refill en manos", duration: 90 },
        { id: 3, name: "🦶 Refill y pedicura", duration: 120 },
        { id: 4, name: "🌸 Refill manos y pedicura con parafina", duration: 180 },
        { id: 5, name: "👣 Pedicura solo", duration: 30 },
    ];

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <div className="icon-wand text-pink-500"></div>
                1. Elegí tu servicio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(service => (
                    <button
                        key={service.id}
                        onClick={() => onSelect(service)}
                        className={`
                            p-4 rounded-xl border text-left transition-all duration-200 flex justify-between items-center group
                            ${selectedService?.id === service.id 
                                ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500 shadow-md' 
                                : 'border-gray-200 bg-white hover:border-pink-300 hover:shadow-sm'}
                        `}
                    >
                        <div>
                            <span className="font-medium text-gray-900 block group-hover:text-pink-600 transition-colors">
                                {service.name}
                            </span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            <div className="icon-clock text-xs mr-1"></div>
                            {service.duration} min
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}