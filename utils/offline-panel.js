(function(){const STORAGE_KEY="rservas_offline_data";function getNegocioIdOffline(){return localStorage.getItem("negocioId")||window.NEGOCIO_ID_POR_DEFECTO||(typeof window.getNegocioIdFromConfig=="function"?window.getNegocioIdFromConfig():"")||""}function pad(value){return String(value).padStart(2,"0")}function toDateKey(date){return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}function addDays(date,days){const copy=new Date(date);return copy.setDate(copy.getDate()+days),copy}function todayKey(){return toDateKey(new Date)}function maxDateKey(){return toDateKey(addDays(new Date,7))}function sortBookings(a,b){return`${a.fecha} ${a.hora_inicio||""}`.localeCompare(`${b.fecha} ${b.hora_inicio||""}`)}function normalizeBooking(booking={}){return{cliente_nombre:booking.cliente_nombre||booking.cliente||"Cliente",fecha:booking.fecha||"",hora_inicio:booking.hora_inicio||"",hora_fin:booking.hora_fin||"",servicio:booking.servicio||"Servicio",profesional_nombre:booking.profesional_nombre||booking.trabajador_nombre||booking.barbero_nombre||"Profesional"}}function filterUpcoming(bookings=[]){const start=todayKey(),end=maxDateKey();return(bookings||[]).filter(booking=>booking?.fecha>=start&&booking?.fecha<=end).map(normalizeBooking).sort(sortBookings)}function saveOfflineData(bookings=[]){try{const payload={negocio_id:getNegocioIdOffline(),synced_at:new Date().toISOString(),bookings:filterUpcoming(bookings)};return localStorage.setItem(STORAGE_KEY,JSON.stringify(payload)),payload}catch(error){return console.warn("No se pudo guardar el panel offline:",error),null}}function loadOfflineData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch{return null}}async function isOnline(maxAttempts=2,timeoutMs=8e3){if(!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY)return!0;for(let attempt=1;attempt<=maxAttempts;attempt++){const controller=new AbortController,timer=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch(`${window.SUPABASE_URL}/rest/v1/negocios?select=id&limit=1`,{method:"GET",cache:"no-store",signal:controller.signal,headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`}});if(clearTimeout(timer),response.ok||response.status>=400&&response.status<500)return!0}catch{clearTimeout(timer)}attempt<maxAttempts&&await new Promise(r=>setTimeout(r,2500))}return!1}async function redirectIfOffline(){return/offline-panel\.html$/i.test(window.location.pathname)?!1:(await new Promise(r=>setTimeout(r,1500)),await isOnline()?!1:(goToOfflinePanel(),!0))}function goToOfflinePanel(){/offline-panel\.html$/i.test(window.location.pathname)||(window.location.href=new URL("offline-panel.html",window.location.href).href)}function enableAutoRedirect(){window.addEventListener("offline",function(){setTimeout(async function(){await isOnline(1,5e3)||goToOfflinePanel()},3e3)}),document.addEventListener("visibilitychange",function(){!document.hidden&&!navigator.onLine&&setTimeout(async function(){await isOnline(1,6e3)||goToOfflinePanel()},2e3)})}async function syncFromSupabase(){const negocioId=getNegocioIdOffline();if(!negocioId||!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY||!await isOnline())return null;const url=`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${todayKey()}&fecha=lte.${maxDateKey()}&select=cliente_nombre,fecha,hora_inicio,hora_fin,servicio,profesional_nombre&order=fecha.asc,hora_inicio.asc`,response=await fetch(url,{cache:"no-store",headers:{apikey:window.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.SUPABASE_ANON_KEY}`}});return response.ok?saveOfflineData(await response.json()):null}function formatTime(value){if(!value)return"";if(window.formatTo12Hour)return window.formatTo12Hour(value);const[hourRaw,minute="00"]=String(value).split(":"),hour=Number(hourRaw);if(!Number.isFinite(hour))return value;const suffix=hour>=12?"PM":"AM";return`${hour%12||12}:${minute} ${suffix}`}function formatDateTitle(dateKey){const[year,month,day]=String(dateKey).split("-").map(Number);return new Date(year,(month||1)-1,day||1).toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}function relativeDayLabel(dateKey){const today=todayKey(),tomorrow=toDateKey(addDays(new Date,1)),afterTomorrow=toDateKey(addDays(new Date,2));return dateKey===today?"Hoy":dateKey===tomorrow?"Mañana":dateKey===afterTomorrow?"Pasado mañana":formatDateTitle(dateKey)}function formatSyncDate(iso){if(!iso)return"sin fecha de sincronizacion";const date=new Date(iso);return`Datos del ${date.toLocaleDateString("es")} a las ${date.toLocaleTimeString("es",{hour:"numeric",minute:"2-digit"})}`}function bookingCard(booking){return`
            <article class="offline-card">
                <div class="offline-time">${`${formatTime(booking.hora_inicio)}${booking.hora_fin?` - ${formatTime(booking.hora_fin)}`:""}`}</div>
                <div class="offline-main">
                    <strong>${escapeHtml(booking.cliente_nombre)}</strong>
                    <span>${escapeHtml(booking.servicio)}</span>
                    <small>${escapeHtml(booking.profesional_nombre)}</small>
                </div>
            </article>
        `}function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}function renderOfflinePanel(){const root=document.getElementById("offline-root");if(!root)return;const data=loadOfflineData(),bookings=Array.isArray(data?.bookings)?data.bookings:[];if(!bookings.length){root.innerHTML=`
                <main class="offline-shell">
                    <section class="offline-empty">
                        <h1>📋 Modo sin conexión</h1>
                        <p>No hay datos guardados. Abre la app con internet al menos una vez para habilitar el modo offline.</p>
                    </section>
                </main>
            `;return}const today=todayKey(),todaysBookings=bookings.filter(booking=>booking.fecha===today),grouped=bookings.filter(booking=>booking.fecha>today).reduce((acc,booking)=>(acc[booking.fecha]||(acc[booking.fecha]=[]),acc[booking.fecha].push(booking),acc),{});root.innerHTML=`
            <main class="offline-shell">
                <header class="offline-header">
                    <p class="offline-kicker">Panel guardado</p>
                    <h1>📋 Modo sin conexión</h1>
                    <p>${formatSyncDate(data.synced_at)}</p>
                </header>

                <section class="offline-section">
                    <h2>Hoy</h2>
                    ${todaysBookings.length?todaysBookings.map(bookingCard).join(""):'<p class="offline-muted">No hay citas guardadas para hoy.</p>'}
                </section>

                <section class="offline-section">
                    <h2>Esta semana</h2>
                    ${Object.keys(grouped).sort().length?Object.keys(grouped).sort().map(dateKey=>`
                        <div class="offline-day">
                            <h3>${relativeDayLabel(dateKey)}</h3>
                            ${grouped[dateKey].map(bookingCard).join("")}
                        </div>
                    `).join(""):'<p class="offline-muted">No hay citas guardadas para los próximos días.</p>'}
                </section>
            </main>
        `}window.RservasOffline={STORAGE_KEY,saveOfflineData,loadOfflineData,syncFromBookings:saveOfflineData,syncFromSupabase,redirectIfOffline,enableAutoRedirect,renderOfflinePanel,isOnline},enableAutoRedirect()})();
