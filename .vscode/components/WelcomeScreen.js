function WelcomeScreen({ onStart }) {
    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden animate-fade-in">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop" 
                    alt="Manicura profesional" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-end h-full min-h-screen p-8 pb-20 sm:justify-center sm:items-center sm:text-center sm:p-12 sm:pb-12">
                <div className="animate-fade-in space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 backdrop-blur-md border border-pink-400/30 text-pink-100 text-sm font-medium mb-2">
                        <div className="icon-sparkles text-xs"></div>
                        <span>Excelencia en cada detalle</span>
                    </div>
                    
                    <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
                        Bienvenida a <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                            Uñas Mágicas
                        </span>
                    </h1>
                    
                    <p className="text-gray-200 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
                        Descubrí el arte de lucir unas manos perfectas. Servicios profesionales de manicuría diseñados especialmente para vos.
                    </p>

                    <div className="pt-6">
                        <button 
                            onClick={onStart}
                            className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white text-lg font-bold py-4 px-10 rounded-full shadow-lg shadow-pink-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Reservar Turno
                            <div className="icon-arrow-right"></div>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Features/Promotional strip (Optional for "vistosa") */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/10 backdrop-blur-sm border-t border-white/10 p-4 hidden sm:block">
                <div className="max-w-4xl mx-auto flex justify-around text-white/90 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="icon-clock text-pink-300"></div>
                        Atención Personalizada
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="icon-star text-pink-300"></div>
                        Productos Premium
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="icon-heart text-pink-300"></div>
                        Ambiente Relax
                    </div>
                </div>
            </div>
        </div>
    );
}