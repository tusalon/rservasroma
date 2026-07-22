// Mantiene los App Links de la APK de clientes dentro del negocio correcto.
(function () {
    function esApkClientes() {
        const ua = navigator.userAgent || '';
        return /RservasromaClientes/i.test(ua) || Boolean(window.Capacitor?.isNativePlatform?.());
    }

    function limpiarSlug(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/^@+/, '')
            .replace(/[^a-z0-9_'-]/g, '')
            .slice(0, 80);
    }

    function extraerSlug(rawUrl) {
        try {
            if (!rawUrl) return '';
            const url = new URL(rawUrl, window.location.href);
            let slug = limpiarSlug(url.searchParams.get('s'));

            if (!slug && url.hash.includes('?')) {
                slug = limpiarSlug(new URLSearchParams(url.hash.slice(url.hash.indexOf('?'))).get('s'));
            }

            if (!slug) {
                const parts = url.pathname.split('/').filter(Boolean);
                const appIndex = parts.indexOf('rservasroma');
                if (appIndex >= 0 && parts[appIndex + 1] && !parts[appIndex + 1].includes('.')) {
                    slug = limpiarSlug(parts[appIndex + 1]);
                }
            }

            return slug;
        } catch (error) {
            return '';
        }
    }

    function limpiarRutaAnterior() {
        try {
            [
                'negocioSlug',
                'negocioId',
                'negocioNombre',
                'adminSlug',
                'adminAuth',
                'adminLoginTime',
                'profesionalAuth',
                'profesionalLoginTime'
            ].forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            // Las sesiones de clientes por slug y los tokens push se conservan.
        }
    }

    function abrirEnlace(rawUrl) {
        const slug = extraerSlug(rawUrl);
        if (!slug) return false;

        const actual = limpiarSlug(new URLSearchParams(window.location.search).get('s'));
        if (actual === slug && /\/rservasroma\/?(?:index\.html)?$/i.test(window.location.pathname)) {
            return true;
        }

        limpiarRutaAnterior();
        window.location.replace('./?s=' + encodeURIComponent(slug) + '&source=apk-clientes');
        return true;
    }

    if (!esApkClientes()) return;

    const App = window.Capacitor?.Plugins?.App;
    if (!App) {
        console.warn('[APK clientes] Plugin App no disponible en este origen.');
        return;
    }

    App.getLaunchUrl?.()
        .then((result) => {
            if (result?.url) abrirEnlace(result.url);
        })
        .catch(() => {});

    App.addListener?.('appUrlOpen', (event) => {
        if (event?.url) abrirEnlace(event.url);
    });

    window.RservasClientNativeLinks = { abrirEnlace, extraerSlug };
})();
