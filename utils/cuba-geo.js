// Division politico-administrativa de Cuba: 15 provincias + el municipio
// especial Isla de la Juventud, con sus 168 municipios.
//
// Se usa para que provincia y municipio se elijan de una lista en vez de
// escribirse a mano: antes cada negocio escribia lo que queria ("San Antonio",
// "San Antonio de los Banos ", "s.antonio") y el directorio de RomaHub no podia
// agrupar ni filtrar por zona de forma fiable.
window.CUBA_PROVINCIAS = [
  'Pinar del Río',
  'Artemisa',
  'La Habana',
  'Mayabeque',
  'Matanzas',
  'Cienfuegos',
  'Villa Clara',
  'Sancti Spíritus',
  'Ciego de Ávila',
  'Camagüey',
  'Las Tunas',
  'Holguín',
  'Granma',
  'Santiago de Cuba',
  'Guantánamo',
  'Isla de la Juventud'
];

window.CUBA_MUNICIPIOS = {
  'Pinar del Río': [
    'Consolación del Sur', 'Guane', 'La Palma', 'Los Palacios', 'Mantua',
    'Minas de Matahambre', 'Pinar del Río', 'San Juan y Martínez', 'San Luis',
    'Sandino', 'Viñales'
  ],
  'Artemisa': [
    'Alquízar', 'Artemisa', 'Bauta', 'Bahía Honda', 'Caimito', 'Candelaria',
    'Guanajay', 'Güira de Melena', 'Mariel', 'San Antonio de los Baños',
    'San Cristóbal'
  ],
  'La Habana': [
    'Arroyo Naranjo', 'Boyeros', 'Centro Habana', 'Cerro', 'Cotorro',
    'Diez de Octubre', 'Guanabacoa', 'Habana del Este', 'Habana Vieja',
    'La Lisa', 'Marianao', 'Playa', 'Plaza de la Revolución', 'Regla',
    'San Miguel del Padrón'
  ],
  'Mayabeque': [
    'Batabanó', 'Bejucal', 'Güines', 'Jaruco', 'Madruga', 'Melena del Sur',
    'Nueva Paz', 'Quivicán', 'San José de las Lajas', 'San Nicolás',
    'Santa Cruz del Norte'
  ],
  'Matanzas': [
    'Calimete', 'Cárdenas', 'Ciénaga de Zapata', 'Colón', 'Jagüey Grande',
    'Jovellanos', 'Limonar', 'Los Arabos', 'Martí', 'Matanzas',
    'Pedro Betancourt', 'Perico', 'Unión de Reyes'
  ],
  'Cienfuegos': [
    'Abreus', 'Aguada de Pasajeros', 'Cienfuegos', 'Cruces', 'Cumanayagua',
    'Palmira', 'Rodas', 'Santa Isabel de las Lajas'
  ],
  'Villa Clara': [
    'Caibarién', 'Camajuaní', 'Cifuentes', 'Corralillo', 'Encrucijada',
    'Manicaragua', 'Placetas', 'Quemado de Güines', 'Ranchuelo', 'Remedios',
    'Sagua la Grande', 'Santa Clara', 'Santo Domingo'
  ],
  'Sancti Spíritus': [
    'Cabaiguán', 'Fomento', 'Jatibonico', 'La Sierpe', 'Sancti Spíritus',
    'Taguasco', 'Trinidad', 'Yaguajay'
  ],
  'Ciego de Ávila': [
    'Baraguá', 'Bolivia', 'Chambas', 'Ciego de Ávila', 'Ciro Redondo',
    'Florencia', 'Majagua', 'Morón', 'Primero de Enero', 'Venezuela'
  ],
  'Camagüey': [
    'Camagüey', 'Carlos Manuel de Céspedes', 'Esmeralda', 'Florida', 'Guáimaro',
    'Jimaguayú', 'Minas', 'Najasa', 'Nuevitas', 'Santa Cruz del Sur',
    'Sibanicú', 'Sierra de Cubitas', 'Vertientes'
  ],
  'Las Tunas': [
    'Amancio', 'Colombia', 'Jesús Menéndez', 'Jobabo', 'Las Tunas',
    'Majibacoa', 'Manatí', 'Puerto Padre'
  ],
  'Holguín': [
    'Antilla', 'Báguanos', 'Banes', 'Cacocum', 'Calixto García', 'Cueto',
    'Frank País', 'Gibara', 'Holguín', 'Mayarí', 'Moa', 'Rafael Freyre',
    'Sagua de Tánamo', 'Urbano Noris'
  ],
  'Granma': [
    'Bartolomé Masó', 'Bayamo', 'Buey Arriba', 'Campechuela', 'Cauto Cristo',
    'Guisa', 'Jiguaní', 'Manzanillo', 'Media Luna', 'Niquero', 'Pilón',
    'Río Cauto', 'Yara'
  ],
  'Santiago de Cuba': [
    'Contramaestre', 'Guamá', 'Julio Antonio Mella', 'Palma Soriano',
    'San Luis', 'Santiago de Cuba', 'Segundo Frente', 'Songo-La Maya',
    'Tercer Frente'
  ],
  'Guantánamo': [
    'Baracoa', 'Caimanera', 'El Salvador', 'Guantánamo', 'Imías', 'Maisí',
    'Manuel Tames', 'Niceto Pérez', 'San Antonio del Sur', 'Yateras'
  ],
  'Isla de la Juventud': [
    'Isla de la Juventud'
  ]
};

// Devuelve los municipios de una provincia. Si el negocio ya tenia guardado un
// municipio escrito a mano que no coincide con la lista (hay muchos asi de
// antes), se anade para que no se pierda al abrir el formulario.
window.getMunicipiosDeProvincia = function (provincia, municipioActual) {
  var lista = (window.CUBA_MUNICIPIOS[provincia] || []).slice();
  var actual = String(municipioActual || '').trim();
  if (actual) {
    var yaEsta = lista.some(function (m) {
      return m.toLowerCase() === actual.toLowerCase();
    });
    if (!yaEsta) lista = [actual].concat(lista);
  }
  return lista;
};

// Devuelve la forma canonica del municipio si lo que hay guardado es el mismo
// pero con espacios de mas o distinta caja ("San Antonio de los Banos " con
// espacio final es un caso real en la base de datos). Sin esto el desplegable
// no encuentra la opcion, sale vacio, y al guardar el negocio perderia su
// municipio sin que la duena se entere.
window.normalizarMunicipio = function (provincia, municipioActual) {
  var actual = String(municipioActual || '').trim();
  if (!actual) return '';
  var lista = window.CUBA_MUNICIPIOS[provincia] || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].toLowerCase() === actual.toLowerCase()) return lista[i];
  }
  return actual;
};
