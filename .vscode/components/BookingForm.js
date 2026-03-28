// components/BookingForm.js - Con trabajador

function BookingForm({ service, worker, date, time, onSubmit, onCancel, cliente }) {
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const bookings = await getBookingsByDateAndWorker(date, worker.id);
            const baseSlots = [time];
            const available = filterAvailableSlots(baseSlots, service.duration, bookings);

            if (available.length === 0) {
                setError("Ese horario ya no está disponible. Por favor elegí otro.");
                setSubmitting(false);
                return;
            }

            const endTime = calculateEndTime(time, service.duration);

            const bookingData = {
                cliente_nombre: cliente.nombre,
                cliente_whatsapp: cliente.whatsapp,
                servicio: service.name,
                duracion: service.duration,
                trabajador_id: worker.id,
                trabajador_nombre: worker.nombre,
                fecha: date,
                hora_inicio: time,
                hora_fin: endTime,
                estado: "Reservado"
            };

            const result = await createBooking(bookingData);
            onSubmit(result.data);

        } catch (err) {
            console.error(err);
            setError("Ocurrió un error al guardar la reserva. Intentá nuevamente.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Confirmar Reserva</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <div className="icon-x text-2xl"></div>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 space-y-2">
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="icon-sparkles text-pink-500"></div>
                            <span className="font-medium">{service.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="icon-users text-pink-500"></div>
                            <span>Con: <strong>{worker.nombre}</strong></span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="icon-calendar text-pink-500"></div>
                            <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="icon-clock text-pink-500"></div>
                            <span>{formatTo12Hour(time)} ({service.duration} min)</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Tus datos:</span> {cliente.nombre} - +{cliente.whatsapp}
                            </p>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-start gap-2">
                                <div className="icon-triangle-alert mt-0.5"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Procesando...
                                </>
                            ) : (
                                "Confirmar Reserva"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}