function Header() {
    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                        <div className="icon-sparkles text-lg"></div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Uñas Perfectas</h1>
                </div>
                <div className="text-sm font-medium text-gray-500">
                    Reserva tu momento
                </div>
            </div>
        </header>
    );
}