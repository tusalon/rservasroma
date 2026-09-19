// utils/phone-utils.js - Normalizacion internacional de telefonos

(function() {
    const DEFAULT_COUNTRY_CODE = '53';
    const COUNTRIES = [
        { id: 'CU', nombre: 'Cuba',      bandera: '\uD83C\uDDE8\uD83C\uDDFA', codigo: '53',  ejemplo: '53066647',    localLength: 8  },
        { id: 'ES', nombre: 'Espana',     bandera: '\uD83C\uDDEA\uD83C\uDDF8', codigo: '34',  ejemplo: '612345678',   localLength: 9  },
        { id: 'MX', nombre: 'Mexico',     bandera: '\uD83C\uDDF2\uD83C\uDDFD', codigo: '52',  ejemplo: '5512345678',  localLength: 10 },
        { id: 'US', nombre: 'USA',        bandera: '\uD83C\uDDFA\uD83C\uDDF8', codigo: '1',   ejemplo: '3055551234',  localLength: 10 },
        { id: 'RU', nombre: 'Rusia',      bandera: '\uD83C\uDDF7\uD83C\uDDFA', codigo: '7',   ejemplo: '9123456789',  localLength: 10 },
        { id: 'VE', nombre: 'Venezuela',  bandera: '\uD83C\uDDFB\uD83C\uDDEA', codigo: '58',  ejemplo: '4121234567',  localLength: 10 },
        { id: 'CO', nombre: 'Colombia',   bandera: '\uD83C\uDDE8\uD83C\uDDF4', codigo: '57',  ejemplo: '3001234567',  localLength: 10 },
        { id: 'GY', nombre: 'Guyana',     bandera: '\uD83C\uDDEC\uD83C\uDDFE', codigo: '592', ejemplo: '6123456',     localLength: 7  },
        { id: 'VN', nombre: 'Vietnam',    bandera: '\uD83C\uDDFB\uD83C\uDDF3', codigo: '84',  ejemplo: '912345678',   localLength: 9  },
        { id: 'AR', nombre: 'Argentina',  bandera: '\uD83C\uDDE6\uD83C\uDDF7', codigo: '54',  ejemplo: '91123456789', localLength: 11 },
        { id: 'PE', nombre: 'Peru',       bandera: '\uD83C\uDDF5\uD83C\uDDEA', codigo: '51',  ejemplo: '912345678',   localLength: 9  },
        { id: 'CL', nombre: 'Chile',      bandera: '\uD83C\uDDE8\uD83C\uDDF1', codigo: '56',  ejemplo: '912345678',   localLength: 9  },
        { id: 'EC', nombre: 'Ecuador',    bandera: '\uD83C\uDDEA\uD83C\uDDE8', codigo: '593', ejemplo: '991234567',   localLength: 9  },
        { id: 'PT', nombre: 'Portugal',   bandera: '\uD83C\uDDF5\uD83C\uDDF9', codigo: '351', ejemplo: '912345678',   localLength: 9  },
        { id: 'IT', nombre: 'Italia',     bandera: '\uD83C\uDDEE\uD83C\uDDF9', codigo: '39',  ejemplo: '3123456789',  localLength: 10 },
        { id: 'FR', nombre: 'Francia',    bandera: '\uD83C\uDDEB\uD83C\uDDF7', codigo: '33',  ejemplo: '612345678',   localLength: 9  },
        { id: 'CN', nombre: 'China',      bandera: '\uD83C\uDDE8\uD83C\uDDF3', codigo: '86',  ejemplo: '13123456789', localLength: 11 },
        { id: 'DE', nombre: 'Alemania',   bandera: '\uD83C\uDDE9\uD83C\uDDEA', codigo: '49',  ejemplo: '15123456789', localLength: 11 },
        // Qatar entra por un caso real: una profesional de Divine Touch se mudo
        // alli y necesitaba entrar al panel con su numero nuevo. Comprobado
        // ANTES de anadirlo que ningun numero guardado empieza por 974 con mas
        // de 8 digitos (0 de 13.510 reservas, 0 de 381 profesionales, 0 de 440
        // negocios), asi que no cambia como se lee ninguno de los que ya hay.
        { id: 'QA', nombre: 'Qatar',      bandera: '\uD83C\uDDF6\uD83C\uDDE6', codigo: '974', ejemplo: '33123456',    localLength: 8  }
    ];

    // Sugerencia de moneda seg\u00FAn el pa\u00EDs del negocio (Europa -> Euro, M\u00E9xico -> MXN).
    // Es solo un valor por defecto: el campo de moneda sigue siendo editable a mano.
    const monedaSugeridaPorPais = {
        ES: 'EUR', PT: 'EUR', IT: 'EUR', FR: 'EUR', DE: 'EUR',
        MX: 'MXN'
    };

    function getMonedaSugeridaPorCodigoPais(codigoPais) {
        const pais = COUNTRIES.find((p) => p.codigo === String(codigoPais));
        if (!pais) return null;
        return monedaSugeridaPorPais[pais.id] || null;
    }

    window.getMonedaSugeridaPorCodigoPais = getMonedaSugeridaPorCodigoPais;

    const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

    function normalizarCodigoPais(value) {
        const digits = onlyDigits(value);
        return digits || DEFAULT_COUNTRY_CODE;
    }

    function getCountryByCode(code) {
        const codigo = normalizarCodigoPais(code);
        return COUNTRIES.find(country => country.codigo === codigo) || {
            id: 'OTRO',
            nombre: `+${codigo}`,
            codigo,
            ejemplo: '',
            localLength: 8
        };
    }

    function detectarTelefonoInternacional(digits) {
        return COUNTRIES
            .slice()
            .sort((a, b) => b.codigo.length - a.codigo.length)
            .find(country => digits.startsWith(country.codigo) && digits.length > country.localLength);
    }

    function getStorageKey() {
        const negocioId = (typeof window.getNegocioId === 'function' && window.getNegocioId()) ||
            window.NEGOCIO_ID_POR_DEFECTO ||
            localStorage.getItem('negocioId') ||
            'default';
        return `codigoPaisTelefono:${negocioId}`;
    }

    function getCodigoPaisTelefono(config = null) {
        const rawConfig = config?.codigo_pais || config?.codigo_pais_telefono || config?.codigo_telefono;
        if (rawConfig) return normalizarCodigoPais(rawConfig);
        return normalizarCodigoPais(localStorage.getItem(getStorageKey()) || DEFAULT_COUNTRY_CODE);
    }

    function setCodigoPaisTelefono(code) {
        const codigo = normalizarCodigoPais(code);
        localStorage.setItem(getStorageKey(), codigo);
        return codigo;
    }

    function normalizarTelefonoLocal(value, codigoPais = null) {
        const digits = onlyDigits(value);
        if (!digits) return '';

        const codigoExplicito = codigoPais !== null && codigoPais !== undefined && String(codigoPais).trim() !== '';
        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        const longitudInternacionalEsperada = country.codigo.length + country.localLength;

        if (!codigoExplicito && digits.startsWith(country.codigo) && digits.length >= longitudInternacionalEsperada) {
            return digits.slice(country.codigo.length);
        }

        return digits;
    }

    function normalizarTelefonoInternacional(value, codigoPais = null) {
        const digits = onlyDigits(value);
        const codigoExplicito = codigoPais !== null && codigoPais !== undefined && String(codigoPais).trim() !== '';

        if (!codigoExplicito) {
            const telefonoInternacional = detectarTelefonoInternacional(digits);
            if (telefonoInternacional) return digits;
        }

        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        if (codigoExplicito && digits.startsWith(country.codigo) && digits.length > country.localLength) {
            return digits;
        }

        if (codigoExplicito) {
            const otroPais = detectarTelefonoInternacional(digits);
            if (otroPais && otroPais.codigo !== country.codigo) return digits;
        }

        const local = normalizarTelefonoLocal(digits, country.codigo);
        return local ? `${country.codigo}${local}` : '';
    }

    function formatearTelefono(value, codigoPais = null) {
        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        const local = normalizarTelefonoLocal(value, country.codigo);
        return local ? `+${country.codigo} ${local}` : `+${country.codigo}`;
    }

    // ---- Telefono de una PROFESIONAL (es su usuario para entrar al panel) ----
    //
    // OJO: no se guarda siempre igual, y no es un capricho. El login hace esto
    // (utils/auth-profesionales.js, telefonoLocalParaLogin): normaliza a
    // internacional con el codigo del SALON y despues le quita ese prefijo. O
    // sea que para una profesional del mismo pais que el salon busca el numero
    // LOCAL, y para una de fuera busca el INTERNACIONAL completo.
    //
    // Guardar siempre internacional romperia el acceso de todas las cubanas de
    // un salon cubano; guardar siempre local haria imposible el caso de una
    // profesional en el extranjero. Estas dos funciones son el espejo exacto de
    // lo que hace el login, para que lo guardado y lo buscado coincidan.
    function telefonoGuardadoDeProfesional(telefonoLocal, codigoPaisProfesional) {
        const codigoSalon = normalizarCodigoPais(getCodigoPaisTelefono());
        const internacional = normalizarTelefonoInternacional(telefonoLocal, codigoPaisProfesional);
        if (!internacional) return '';
        return internacional.startsWith(codigoSalon)
            ? internacional.slice(codigoSalon.length)
            : internacional;
    }

    // Lo contrario: de lo guardado saca la parte local para pintarla en el
    // campo, quitando el prefijo del pais que se le detecte (no el del salon:
    // si no, un numero de Qatar se mostraria entero y al guardar se duplicaria).
    function localDeProfesional(telefonoGuardado) {
        const digits = onlyDigits(telefonoGuardado);
        if (!digits) return '';
        const pais = detectarTelefonoInternacional(digits);
        return pais && digits.startsWith(pais.codigo)
            ? digits.slice(pais.codigo.length)
            : digits;
    }

    window.telefonoGuardadoDeProfesional = telefonoGuardadoDeProfesional;
    window.localDeProfesional = localDeProfesional;
    window.getCountryByPhoneCode = getCountryByCode;
    window.PHONE_COUNTRIES = COUNTRIES;
    window.DEFAULT_PHONE_COUNTRY_CODE = DEFAULT_COUNTRY_CODE;
    window.onlyPhoneDigits = onlyDigits;
    window.detectarPaisTelefono = (value) => detectarTelefonoInternacional(onlyDigits(value));
    window.getPhoneCountryConfig = (config = null) => getCountryByCode(getCodigoPaisTelefono(config));
    window.getCodigoPaisTelefono = getCodigoPaisTelefono;
    window.setCodigoPaisTelefono = setCodigoPaisTelefono;
    window.normalizarTelefonoLocal = normalizarTelefonoLocal;
    window.normalizarTelefonoInternacional = normalizarTelefonoInternacional;
    window.formatearTelefono = formatearTelefono;

    console.log('phone-utils.js cargado');
})();
