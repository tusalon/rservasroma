# Genera los SVG estaticos de la marca desde design/marca/vector/formas.json
# (salida de vectorizar.py): simbolo en una tinta y en color, degradado, icono de app,
# logo horizontal con el texto en curvas, y los iconos sueltos (pug, calendario).
#
#   python tools/marca/construir_vector.py
import math
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

from vector_lib import cargar, quitar_brillos

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'design', 'marca', 'vector')
ICONOS = os.path.join(SALIDA, 'iconos')

# Colores de la marca (medidos sobre el logo original, ver paleta.json)
ROSA = '#FB6095'
ROSA_CLARO = '#FE7AAB'
ROSA_SOMBRA = '#DE3768'
NACAR_ARRIBA = '#FFFAF7'
NACAR_ABAJO = '#F7F0EC'
TINTA = '#1D1D1F'

FUENTE = r'C:\Windows\Fonts\seguisb.ttf'
CORTE_BAJO = 1900  # misma fila (a 4x) que vectorizar.py: arriba el pug, abajo calendario y reloj


def n(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def d_contornos(contornos, esc, dx, dy):
    """Path 'd' (M/L/C/Z) de varios contornos, con escala y desplazamiento ya aplicados."""
    def p(pt):
        return f'{n(pt[0] * esc + dx)} {n(pt[1] * esc + dy)}'
    partes = []
    for c in contornos:
        for s in c['seg']:
            if s[0] == 'M':
                partes.append('M' + p(s[1]))
            elif s[0] == 'L':
                partes.append('L' + p(s[1]))
            else:
                partes.append('C' + p(s[1]) + ' ' + p(s[2]) + ' ' + p(s[3]))
        partes.append('Z')
    return ''.join(partes)


def caja(contornos):
    xs0 = min(c['bbox'][0] for c in contornos)
    ys0 = min(c['bbox'][1] for c in contornos)
    xs1 = max(c['bbox'][2] for c in contornos)
    ys1 = max(c['bbox'][3] for c in contornos)
    return xs0, ys0, xs1, ys1


def svg(ancho, alto, cuerpo, titulo, extra_defs='', raiz_attr=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n(ancho)} {n(alto)}" width="{n(ancho)}" height="{n(alto)}" '
            f'role="img" aria-label="{titulo}"{raiz_attr}>\n<title>{titulo}</title>\n'
            + (f'<defs>{extra_defs}</defs>\n' if extra_defs else '') + cuerpo + '\n</svg>\n')


def guardar(nombre, texto, carpeta=SALIDA):
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(carpeta, nombre)
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)
    return ruta


def squircle(lado, expo=5.0, puntos=64, margen=0.0):
    """Superelipse (la curva continua de los iconos de Apple) como path de Beziers (Catmull-Rom)."""
    c = lado / 2
    r = c * (1 - margen)
    pts = []
    for i in range(puntos):
        t = 2 * math.pi * i / puntos
        co, si = math.cos(t), math.sin(t)
        pts.append((c + r * math.copysign(abs(co) ** (2 / expo), co), c + r * math.copysign(abs(si) ** (2 / expo), si)))
    d = 'M' + f'{n(pts[0][0])} {n(pts[0][1])}'
    for i in range(puntos):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % puntos], pts[(i + 2) % puntos]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(p2[0])} {n(p2[1])}'
    return d + 'Z'


def texto_en_curvas(texto, tam, x, y, relleno, tracking=-0.02):
    """Texto convertido a curvas con la fuente de la marca (sin depender de que este instalada)."""
    f = TTFont(FUENTE)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f['head'].unitsPerEm
    esc = tam / upm
    cur = x
    d = ''
    for ch in texto:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: n(v))
        gs[g].draw(pen)
        # y invertida: las fuentes tienen el origen abajo
        d += f'<path transform="translate({n(cur)} {n(y)}) scale({n(esc)} {n(-esc)})" d="{pen.getCommands()}"/>'
        cur += gs[g].width * esc + tam * tracking
    return f'<g fill="{relleno}">{d}</g>', cur - x


def main():
    datos, cont = cargar()
    limpio, _ = quitar_brillos(cont)
    k = 0.25  # de 4x a 1x
    x0, y0, x1, y1 = caja(limpio)
    ancho, alto = (x1 - x0) * k, (y1 - y0) * k
    pad = 6
    dx, dy = -x0 * k + pad, -y0 * k + pad
    W, H = ancho + 2 * pad, alto + 2 * pad
    d_todo = d_contornos(limpio, k, dx, dy)

    fuera = []

    # --- Simbolo en una tinta -----------------------------------------------------------
    def simbolo(relleno, titulo):
        return svg(W, H, f'<path fill="{relleno}" fill-rule="evenodd" d="{d_todo}"/>', titulo)

    fuera.append(guardar('rservasroma-simbolo.svg', simbolo('currentColor', 'RservasRoma, símbolo en una tinta')))
    fuera.append(guardar('rservasroma-simbolo-rosa.svg', simbolo(ROSA, 'RservasRoma, símbolo rosa')))
    fuera.append(guardar('rservasroma-simbolo-negro.svg', simbolo(TINTA, 'RservasRoma, símbolo negro')))
    fuera.append(guardar('rservasroma-simbolo-blanco.svg', simbolo('#FFFFFF', 'RservasRoma, símbolo blanco')))

    # --- Simbolo con degradado -----------------------------------------------------------
    grad = (f'<linearGradient id="rosa-roma" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{n(H)}">'
            f'<stop offset="0" stop-color="{ROSA_CLARO}"/><stop offset="0.55" stop-color="{ROSA}"/>'
            f'<stop offset="1" stop-color="{ROSA_SOMBRA}"/></linearGradient>')
    fuera.append(guardar('rservasroma-simbolo-degradado.svg',
                         svg(W, H, f'<path fill="url(#rosa-roma)" fill-rule="evenodd" d="{d_todo}"/>',
                             'RservasRoma, símbolo con degradado', grad)))

    # --- Icono de app (1024) -------------------------------------------------------------
    L = 1024
    alto_sim = L * 0.68
    esc_ic = alto_sim / alto  # el simbolo ocupa el 68 % del alto, como en los PNG
    sx = (L - ancho * esc_ic) / 2
    sy = (L - alto * esc_ic) / 2
    d_ic = d_contornos(limpio, k * esc_ic, -x0 * k * esc_ic + sx, -y0 * k * esc_ic + sy)
    grad_sim = (f'<linearGradient id="rosa-roma" gradientUnits="userSpaceOnUse" x1="0" y1="{n(sy)}" x2="0" y2="{n(sy + alto * esc_ic)}">'
                f'<stop offset="0" stop-color="{ROSA_CLARO}"/><stop offset="0.55" stop-color="{ROSA}"/>'
                f'<stop offset="1" stop-color="{ROSA_SOMBRA}"/></linearGradient>')
    grad_bal = (f'<linearGradient id="nacar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{NACAR_ARRIBA}"/>'
                f'<stop offset="1" stop-color="{NACAR_ABAJO}"/></linearGradient>')
    simbolo_ic = f'<path fill="url(#rosa-roma)" fill-rule="evenodd" d="{d_ic}"/>'
    fuera.append(guardar('rservasroma-icono-app.svg',
                         svg(L, L, f'<path fill="url(#nacar)" d="{squircle(L)}"/>\n{simbolo_ic}',
                             'RservasRoma, icono de app', grad_bal + grad_sim)))
    fuera.append(guardar('rservasroma-icono-ios.svg',
                         svg(L, L, f'<rect width="{L}" height="{L}" fill="url(#nacar)"/>\n{simbolo_ic}',
                             'RservasRoma, icono iOS a sangre', grad_bal + grad_sim)))
    sombra = ('<filter id="sombra" x="-20%" y="-20%" width="140%" height="150%">'
              '<feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#B0285A" flood-opacity="0.22"/></filter>')
    fuera.append(guardar('rservasroma-icono-con-sombra.svg',
                         svg(L, L, f'<g filter="url(#sombra)" transform="translate(102.4 102.4) scale(0.8)">'
                                   f'<path fill="url(#nacar)" d="{squircle(L)}"/>\n{simbolo_ic}</g>',
                             'RservasRoma, icono con sombra', grad_bal + grad_sim + sombra)))

    # --- Logo horizontal (icono + nombre en curvas) ----------------------------------------
    A = 256  # alto del icono
    esc_a = A / L
    tam = A * 0.42
    txt_nacar, ancho_txt = texto_en_curvas('RservasRoma', tam, 0, 0, TINTA)
    hueco = A * 0.28
    Wl = A + hueco + ancho_txt + 4
    for nombre, relleno, titulo in (('rservasroma-logo-horizontal.svg', TINTA, 'RservasRoma, logo horizontal'),
                                    ('rservasroma-logo-horizontal-blanco.svg', '#FFFFFF', 'RservasRoma, logo horizontal en blanco')):
        txt, _ = texto_en_curvas('RservasRoma', tam, A + hueco, A * 0.5 + tam * 0.35, relleno)
        icono = (f'<g transform="scale({n(esc_a)})"><path fill="url(#nacar)" d="{squircle(L)}"/>{simbolo_ic}</g>')
        fuera.append(guardar(nombre, svg(Wl, A, icono + '\n' + txt, titulo, grad_bal + grad_sim)))

    # --- Iconos sueltos: pug y calendario con reloj -----------------------------------------
    arriba = [c for c in limpio if c['centro'][1] < CORTE_BAJO]
    abajo = [c for c in limpio if c['centro'][1] >= CORTE_BAJO]
    for nombre, grupo, titulo in (('pug.svg', arriba, 'Roma, la pug'), ('calendario-reloj.svg', abajo, 'Calendario con reloj')):
        gx0, gy0, gx1, gy1 = caja(grupo)
        gw, gh = (gx1 - gx0) * k, (gy1 - gy0) * k
        d = d_contornos(grupo, k, -gx0 * k + pad, -gy0 * k + pad)
        fuera.append(guardar(nombre, svg(gw + 2 * pad, gh + 2 * pad,
                                         f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>', titulo), ICONOS))

    for r in fuera:
        print(f'{os.path.getsize(r) / 1024:6.1f} KB  {os.path.relpath(r, RAIZ)}')


if __name__ == '__main__':
    main()
