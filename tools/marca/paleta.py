# Paleta de marca y publicitaria de RservasRoma. Genera en design/marca/paleta/:
#   paleta.json, paleta.css, rservasroma.gpl (GIMP, Inkscape, Krita), rservasroma.ase (Adobe),
#   paleta.png (hoja de muestras) y paleta-publicitaria.html (guia visual con las combinaciones).
#
# Los 6 colores base se midieron sobre el logo original (design/marca/original-3d.webp).
# La escala rosa 50-900 se calcula mezclando en OKLab (pasos parejos a la vista). Los
# contrastes son WCAG 2.x calculados aqui, no estimados.
#
#   python tools/marca/paleta.py
import json
import os
import struct

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'design', 'marca', 'paleta')


# ─── Color ──────────────────────────────────────────────────────────────────────────

def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(c):
    return '#%02X%02X%02X' % tuple(max(0, min(255, round(v))) for v in c)


def _lin(v):
    v /= 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def _gam(v):
    v = 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055
    return v * 255


def a_oklab(c):
    r, g, b = (_lin(v) for v in c)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) for x in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def de_oklab(lab):
    L, a, b = lab
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (_gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            _gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            _gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s))


def mezclar(c1, c2, f):
    a, b = a_oklab(c1), a_oklab(c2)
    return de_oklab(tuple(a[i] + (b[i] - a[i]) * f for i in range(3)))


def luminancia(c):
    r, g, b = (_lin(v) for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(c1, c2):
    a, b = sorted((luminancia(c1), luminancia(c2)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def hsl(c):
    r, g, b = (v / 255 for v in c)
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0, 0, round(l * 100)
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    h = {r: (g - b) / d + (6 if g < b else 0), g: (b - r) / d + 2, b: (r - g) / d + 4}[mx] * 60
    return round(h), round(s * 100), round(l * 100)


# ─── Definicion de la paleta ──────────────────────────────────────────────────────────

BASE = [
    # id, nombre, hex, para que sirve
    ('rosa-roma', 'Rosa Roma', '#FB6095', 'El pug. Acentos grandes, ilustraciones, fondos de anuncio.'),
    ('rosa-claro', 'Rosa claro', '#FE7AAB', 'Brillos, estados suaves, acento sobre fondo oscuro.'),
    ('rosa-sombra', 'Rosa sombra', '#DE3768', 'Sombra del relieve, final de degradados.'),
    ('rosa-profundo', 'Rosa profundo', '#CF2D5E', 'Botones y texto rosa: el blanco encima pasa AA.'),
    ('nacar', 'Nácar', '#FFFAF7', 'Baldosa del icono, fondos claros.'),
    ('nacar-sombra', 'Nácar sombra', '#F7F0EC', 'Parte baja de la baldosa, tarjetas.'),
    ('tinta', 'Tinta', '#1D1D1F', 'Texto, el nombre, fondos oscuros.'),
    ('gris', 'Gris', '#6E6E73', 'Texto secundario.'),
    ('linea', 'Línea', '#E5E2E0', 'Bordes y separadores.'),
]

ESCALA_ROSA = [  # paso, hacia donde, cuanto
    (50, 'blanco', 0.08), (100, 'blanco', 0.18), (200, 'blanco', 0.34), (300, 'blanco', 0.54), (400, 'blanco', 0.76),
    (500, None, 0), (600, 'noche', 0.18), (700, 'noche', 0.36), (800, 'noche', 0.56), (900, 'noche', 0.76),
]

SEMANTICOS = [
    ('exito', 'Éxito', '#22C55E', 'Solo dentro de la app: ganancias y logros. No para anuncios.'),
    ('aviso', 'Aviso', '#F59E0B', 'Solo dentro de la app: advertencias.'),
    ('error', 'Error', '#EF4444', 'Solo dentro de la app: errores y pérdidas.'),
    ('info', 'Información', '#3B82F6', 'Solo dentro de la app: estados neutros.'),
]

DEGRADADOS = [
    ('amanecer', 'Amanecer Roma', 'linear-gradient(135deg, #FE7AAB 0%, #FB6095 50%, #DE3768 100%)', 'Fondos de anuncio y portadas.'),
    ('nacar', 'Nácar', 'linear-gradient(180deg, #FFFAF7 0%, #F7F0EC 100%)', 'La baldosa del icono; fondos suaves.'),
    ('noche', 'Noche rosa', 'linear-gradient(160deg, #1D1D1F 0%, {rosa900} 100%)', 'Anuncios oscuros, historias.'),
]


def construir_datos():
    base = hex_rgb('#FB6095')
    noche = mezclar(base, (0, 0, 0), 0.82)
    escala = []
    for paso, hacia, f in ESCALA_ROSA:
        c = base if hacia is None else mezclar(base, (255, 255, 255) if hacia == 'blanco' else noche, f) if hacia == 'noche' else mezclar((255, 255, 255), base, 1 - f)
        # 50-400: de blanco hacia el rosa (f = cuanto rosa), 600-900: del rosa hacia la noche
        if hacia == 'blanco':
            c = mezclar((255, 255, 255), base, f)
        escala.append((paso, rgb_hex(c)))
    esc = dict(escala)
    colores = [{'id': i, 'nombre': n, 'hex': h, 'rgb': list(hex_rgb(h)), 'hsl': list(hsl(hex_rgb(h))), 'uso': u} for i, n, h, u in BASE]
    escala_json = [{'id': f'rosa-{p}', 'nombre': f'Rosa {p}', 'hex': h, 'rgb': list(hex_rgb(h)), 'hsl': list(hsl(hex_rgb(h)))} for p, h in escala]
    sem = [{'id': i, 'nombre': n, 'hex': h, 'rgb': list(hex_rgb(h)), 'uso': u} for i, n, h, u in SEMANTICOS]
    deg = [{'id': i, 'nombre': n, 'css': css.replace('{rosa900}', esc[900]), 'uso': u} for i, n, css, u in DEGRADADOS]

    nacar, tinta, blanco = '#FFFAF7', '#1D1D1F', '#FFFFFF'
    parejas_def = [
        ('Clásico nácar', nacar, tinta, '#CF2D5E', 'Anuncios claros, posts, correos.'),
        ('Rosa pleno', '#FB6095', tinta, tinta, 'Fondo Rosa Roma: el texto y los botones van en Tinta, no en blanco.'),
        ('Rosa profundo', '#CF2D5E', blanco, '#FFFAF7', 'Botones, banners con texto en blanco.'),
        ('Noche', tinta, nacar, '#FE7AAB', 'Historias, anuncios oscuros. Rosa claro como acento.'),
        ('Velo rosa', esc[50], tinta, '#CF2D5E', 'Tarjetas suaves, fondos de precios o listas.'),
    ]
    parejas = []
    for nombre, fondo, texto, acento, uso in parejas_def:
        parejas.append({'nombre': nombre, 'fondo': fondo, 'texto': texto, 'acento': acento, 'uso': uso,
                        'contraste_texto': round(contraste(hex_rgb(fondo), hex_rgb(texto)), 2),
                        'contraste_acento': round(contraste(hex_rgb(fondo), hex_rgb(acento)), 2)})
    # Avisos que salieron de la medicion y conviene tener a la vista
    avisos = {
        'blanco_sobre_rosa_roma': round(contraste(hex_rgb('#FB6095'), (255, 255, 255)), 2),
        'blanco_sobre_fucsia_app': round(contraste(hex_rgb('#FF1493'), (255, 255, 255)), 2),
        'blanco_sobre_rosa_profundo': round(contraste(hex_rgb('#CF2D5E'), (255, 255, 255)), 2),
        'tinta_sobre_rosa_roma': round(contraste(hex_rgb('#FB6095'), hex_rgb(tinta)), 2),
    }
    return {'nombre': 'RservasRoma', 'base': colores, 'escala_rosa': escala_json, 'semanticos': sem,
            'degradados': deg, 'combinaciones': parejas, 'contrastes_clave': avisos}


# ─── Archivos ─────────────────────────────────────────────────────────────────────────

def escribir(nombre, texto):
    ruta = os.path.join(SALIDA, nombre)
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)
    return ruta


def css(d):
    lineas = ['/* RservasRoma: paleta de marca y publicitaria. Generado por tools/marca/paleta.py */', ':root {']
    for c in d['base'] + d['escala_rosa']:
        lineas.append(f"  --{c['id']}: {c['hex']};")
    for c in d['semanticos']:
        lineas.append(f"  --{c['id']}: {c['hex']};  /* solo dentro de la app */")
    for g in d['degradados']:
        lineas.append(f"  --degradado-{g['id']}: {g['css']};")
    lineas.append('}')
    return '\n'.join(lineas) + '\n'


def gpl(d):
    lineas = ['GIMP Palette', 'Name: RservasRoma', 'Columns: 5', '#']
    for c in d['base'] + d['escala_rosa']:
        r, g, b = c['rgb']
        lineas.append(f'{r:3d} {g:3d} {b:3d} {c["nombre"]} {c["hex"]}')
    return '\n'.join(lineas) + '\n'


def ase(d):
    """Adobe Swatch Exchange: Illustrator, Photoshop, InDesign, Affinity, Figma (con plugin)."""
    bloques = b''
    n = 0

    def color(nombre, hexa):
        r, g, b = (v / 255 for v in hex_rgb(hexa))
        nom = (nombre + '\x00').encode('utf-16-be')
        cuerpo = struct.pack('>H', len(nombre) + 1) + nom + b'RGB ' + struct.pack('>fff', r, g, b) + struct.pack('>H', 2)
        return struct.pack('>HI', 0x0001, len(cuerpo)) + cuerpo

    def grupo(nombre, abrir):
        nom = (nombre + '\x00').encode('utf-16-be') if abrir else b''
        cuerpo = (struct.pack('>H', len(nombre) + 1) + nom) if abrir else b''
        return struct.pack('>HI', 0xC001 if abrir else 0xC002, len(cuerpo)) + cuerpo

    for titulo, lista in (('Marca', d['base']), ('Escala rosa', d['escala_rosa'])):
        bloques += grupo(titulo, True)
        n += 1
        for c in lista:
            bloques += color(c['nombre'], c['hex'])
            n += 1
        bloques += grupo('', False)
        n += 1
    return b'ASEF' + struct.pack('>HHI', 1, 0, n) + bloques


def leer_ase(datos):
    """Comprobacion: vuelve a leer el .ase y devuelve (grupos, colores)."""
    assert datos[:4] == b'ASEF'
    _, _, n = struct.unpack('>HHI', datos[4:12])
    pos = 12
    colores, grupos = [], 0
    for _ in range(n):
        tipo, largo = struct.unpack('>HI', datos[pos:pos + 6])
        cuerpo = datos[pos + 6:pos + 6 + largo]
        pos += 6 + largo
        if tipo == 0xC001:
            grupos += 1
        elif tipo == 0x0001:
            ln = struct.unpack('>H', cuerpo[:2])[0]
            nombre = cuerpo[2:2 + ln * 2].decode('utf-16-be').rstrip('\x00')
            modelo = cuerpo[2 + ln * 2:6 + ln * 2]
            r, g, b = struct.unpack('>fff', cuerpo[6 + ln * 2:18 + ln * 2])
            colores.append((nombre, rgb_hex((r * 255, g * 255, b * 255)), modelo))
    assert pos == len(datos)
    return grupos, colores


def hoja_png(d, ruta):
    f1 = ImageFont.truetype(r'C:\Windows\Fonts\seguisb.ttf', 22)
    f2 = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 17)
    f3 = ImageFont.truetype(r'C:\Windows\Fonts\seguisb.ttf', 40)
    W, H = 1600, 1180
    img = Image.new('RGB', (W, H), (251, 251, 253))
    dr = ImageDraw.Draw(img)
    dr.text((60, 44), 'RservasRoma · Paleta', font=f3, fill=hex_rgb('#1D1D1F'))

    def fila(y, titulo, lista, w=150, h=130):
        dr.text((60, y), titulo, font=f1, fill=hex_rgb('#1D1D1F'))
        x = 60
        for c in lista:
            dr.rounded_rectangle((x, y + 38, x + w, y + 38 + h), 16, fill=hex_rgb(c['hex']), outline=hex_rgb('#E5E2E0'))
            dr.text((x, y + 38 + h + 8), c['nombre'], font=f2, fill=hex_rgb('#1D1D1F'))
            dr.text((x, y + 38 + h + 30), c['hex'], font=f2, fill=hex_rgb('#6E6E73'))
            x += w + 18

    fila(120, 'Marca', d['base'][:9], 150, 120)
    fila(360, 'Escala rosa', d['escala_rosa'], 134, 120)
    # degradados
    y = 600
    dr.text((60, y), 'Degradados', font=f1, fill=hex_rgb('#1D1D1F'))
    stops = {'amanecer': ['#FE7AAB', '#FB6095', '#DE3768'], 'nacar': ['#FFFAF7', '#F7F0EC'], 'noche': ['#1D1D1F', d['escala_rosa'][-1]['hex']]}
    x = 60
    for g in d['degradados']:
        cols = [hex_rgb(h) for h in stops[g['id']]]
        banda = Image.new('RGB', (440, 130))
        px = banda.load()
        for j in range(130):
            for i in range(440):
                t = (i / 439 * 0.5 + j / 129 * 0.5) if g['id'] != 'nacar' else j / 129
                seg = t * (len(cols) - 1)
                k = min(int(seg), len(cols) - 2)
                u = seg - k
                px[i, j] = tuple(round(cols[k][q] + (cols[k + 1][q] - cols[k][q]) * u) for q in range(3))
        img.paste(banda, (x, y + 38))
        dr.text((x, y + 38 + 138), g['nombre'], font=f2, fill=hex_rgb('#1D1D1F'))
        x += 440 + 40
    # combinaciones
    y = 860
    dr.text((60, y), 'Combinaciones (contraste del texto)', font=f1, fill=hex_rgb('#1D1D1F'))
    x = 60
    for p in d['combinaciones']:
        dr.rounded_rectangle((x, y + 38, x + 280, y + 38 + 150), 16, fill=hex_rgb(p['fondo']), outline=hex_rgb('#E5E2E0'))
        dr.text((x + 20, y + 58), p['nombre'], font=f1, fill=hex_rgb(p['texto']))
        dr.text((x + 20, y + 94), f"Texto {p['contraste_texto']}:1", font=f2, fill=hex_rgb(p['texto']))
        dr.rounded_rectangle((x + 20, y + 130, x + 140, y + 168), 19, fill=hex_rgb(p['acento']))
        x += 300
    img.save(ruta, optimize=True)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    d = construir_datos()
    salidas = [
        escribir('paleta.json', json.dumps(d, ensure_ascii=False, indent=2)),
        escribir('paleta.css', css(d)),
        escribir('rservasroma.gpl', gpl(d)),
    ]
    ruta_ase = os.path.join(SALIDA, 'rservasroma.ase')
    datos_ase = ase(d)
    with open(ruta_ase, 'wb') as f:
        f.write(datos_ase)
    grupos, colores = leer_ase(datos_ase)
    assert grupos == 2 and len(colores) == len(d['base']) + len(d['escala_rosa']) and all(c[2] == b'RGB ' for c in colores)
    salidas.append(ruta_ase)
    ruta_png = os.path.join(SALIDA, 'paleta.png')
    hoja_png(d, ruta_png)
    salidas.append(ruta_png)
    for r in salidas:
        print(f'{os.path.getsize(r) / 1024:7.1f} KB  {os.path.relpath(r, RAIZ)}')
    print('escala rosa:', ' '.join(f"{c['id'][5:]}={c['hex']}" for c in d['escala_rosa']))
    print('contrastes clave:', d['contrastes_clave'])
    for p in d['combinaciones']:
        print(f"{p['nombre']:<14} texto {p['contraste_texto']:>5}:1  acento {p['contraste_acento']:>5}:1")


if __name__ == '__main__':
    main()
