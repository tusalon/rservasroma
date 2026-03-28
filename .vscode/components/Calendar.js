// components/Calendar.js - Versión con worker

function Calendar({ onDateSelect, selectedDate, worker }) {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayLocalString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isPastDate = (date) => {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayStr = getTodayLocalString();
        const dateStr = formatDate(date);
        
        if (date < today) return true;
        
        if (dateStr === todayStr) {
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            
            const LAST_SLOT_HOUR = 14;
            const LAST_SLOT_MINUTES = 0;
            
            if (currentHour > LAST_SLOT_HOUR) return true;
            if (currentHour === LAST_SLOT_HOUR && currentMinutes > LAST_SLOT_MINUTES) return true;
        }
        
        return false;
    };

    const isSunday = (date) => {
        return date.getDay() === 0;
    };

    const nextMonth = () => {
        const next = new Date(currentDate);
        next.setMonth(currentDate.getMonth() + 1);
        setCurrentDate(next);
    };

    const prevMonth = () => {
        const prev = new Date(currentDate);
        prev.setMonth(currentDate.getMonth() - 1);
        setCurrentDate(prev);
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const days = getDaysInMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const isAfterLastSlot = (currentHour > 14) || (currentHour === 14 && currentMinutes > 0);

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <div className="icon-calendar text-pink-500"></div>
                3. Seleccioná una fecha
                {worker && (
                    <span className="text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full ml-2">
                        con {worker.nombre}
                    </span>
                )}
                {selectedDate && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">
                        ✓ Fecha seleccionada
                    </span>
                )}
            </h2>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                    <button 
                        onClick={prevMonth} 
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-600"
                        title="Mes anterior"
                    >
                        <div className="icon-chevron-left"></div>
                    </button>
                    <span className="font-bold text-gray-800 text-lg capitalize">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button 
                        onClick={nextMonth} 
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-600"
                        title="Mes siguiente"
                    >
                        <div className="icon-chevron-right"></div>
                    </button>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <div 
                                key={i} 
                                className={`text-xs font-medium py-1 ${d === 'D' ? 'text-red-400' : 'text-gray-400'}`}
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date, idx) => {
                            if (!date) {
                                return <div key={idx} className="h-10" />;
                            }

                            const dateStr = formatDate(date);
                            const past = isPastDate(date);
                            const sunday = isSunday(date);
                            const selected = selectedDate === dateStr;
                            
                            const available = !past && !sunday;
                            
                            let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                            
                            if (selected) {
                                className += " bg-pink-600 text-white shadow-md scale-105 ring-2 ring-pink-300";
                            } else if (!available) {
                                className += " text-gray-300 cursor-not-allowed bg-gray-50";
                            } else {
                                className += " text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:scale-105 cursor-pointer";
                            }
                            
                            let title = "";
                            if (past && dateStr === getTodayLocalString()) {
                                title = "Hoy ya no hay horarios disponibles (último turno 2:00 PM)";
                            } else if (past) {
                                title = "Fecha pasada";
                            } else if (sunday) {
                                title = "Domingo cerrado";
                            } else {
                                title = "Disponible";
                            }
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => available && onDateSelect(dateStr)}
                                    disabled={!available}
                                    className={className}
                                    title={title}
                                >
                                    {date.getDate()}
                                    {available && !selected && (
                                        <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}