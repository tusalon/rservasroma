# Construye design/marca/vector/capas.json: el simbolo partido en capas para animar.
#   python tools/marca/capas_construir.py [salida.json]
# Cada capa: id, nombre, relleno, contornos (Beziers en el espacio del icono de 1024) y pivote.
import json
import math
import os
import sys

import numpy as np

from capas import CORTE_BAJO, K, L, NACAR, ALTO_SIMBOLO, ROSA, mascaras, trazar_limpio
from vector_lib import cargar, quitar_brillos

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'design', 'marca', 'vector', 'capas.json')


def geometria_icono():
    """Misma transformacion que construir_vector.py: del espacio 4x al icono de 1024."""
    _, cont = cargar()
    limpio, _ = quitar_brillos(cont)
    x0 = min(c['bbox'][0] for c in limpio)
    y0 = min(c['bbox'][1] for c in limpio)
    x1 = max(c['bbox'][2] for c in limpio)
    y1 = max(c['bbox'][3] for c in limpio)
    ancho, alto = (x1 - x0) * K, (y1 - y0) * K
    esc = L * ALTO_SIMBOLO / alto
    sx, sy = (L - ancho * esc) / 2, (L - alto * esc) / 2
    return (lambda x, y: (round((x - x0) * K * esc + sx, 2), round((y - y0) * K * esc + sy, 2))), esc * K


def seg_icono(seg, T):
    out = []
    for s in seg:
        if s[0] in ('M', 'L'):
            out.append([s[0], list(T(*s[1]))])
        else:
            out.append(['C', list(T(*s[1])), list(T(*s[2])), list(T(*s[3]))])
    return out


def capsula(x0, y0, x1, y1, grosor, T):
    """Segmento grueso con extremos redondos (manecilla), en espacio 4x -> contorno en el icono."""
    r = grosor / 2
    kk = 0.5523 * r
    if abs(y1 - y0) < abs(x1 - x0):
        xa, xb, cy = min(x0, x1), max(x0, x1), y0
        pts = [('M', (xa, cy - r)), ('L', (xb, cy - r)),
               ('C', (xb + kk, cy - r), (xb + r, cy - kk), (xb + r, cy)),
               ('C', (xb + r, cy + kk), (xb + kk, cy + r), (xb, cy + r)),
               ('L', (xa, cy + r)),
               ('C', (xa - kk, cy + r), (xa - r, cy + kk), (xa - r, cy)),
               ('C', (xa - r, cy - kk), (xa - kk, cy - r), (xa, cy - r))]
    else:
        ya, yb, cx = min(y0, y1), max(y0, y1), x0
        pts = [('M', (cx - r, yb)), ('L', (cx - r, ya)),
               ('C', (cx - r, ya - kk), (cx - kk, ya - r), (cx, ya - r)),
               ('C', (cx + kk, ya - r), (cx + r, ya - kk), (cx + r, ya)),
               ('L', (cx + r, yb)),
               ('C', (cx + r, yb + kk), (cx + kk, yb + r), (cx, yb + r)),
               ('C', (cx - kk, yb + r), (cx - r, yb + kk), (cx - r, yb))]
    seg = []
    for tipo, *ps in pts:
        if tipo in ('M', 'L'):
            seg.append([tipo, list(T(*ps[0]))])
        else:
            seg.append(['C', list(T(*ps[0])), list(T(*ps[1])), list(T(*ps[2]))])
    return seg


def puntos(seg):
    for s in seg:
        for p in ([s[1]] if s[0] in ('M', 'L') else [s[1], s[2], s[3]]):
            yield p


def centro(contornos):
    pts = [p for c in contornos for p in puntos(c)]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return [round((min(xs) + max(xs)) / 2, 2), round((min(ys) + max(ys)) / 2, 2)]


def squircle(lado=L, expo=5.0, n=64):
    c = lado / 2
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        co, si = math.cos(t), math.sin(t)
        pts.append((c + c * math.copysign(abs(co) ** (2 / expo), co), c + c * math.copysign(abs(si) ** (2 / expo), si)))
    r2 = lambda v: round(v, 2)
    seg = [['M', [r2(pts[0][0]), r2(pts[0][1])]]]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        seg.append(['C', [r2(c1[0]), r2(c1[1])], [r2(c2[0]), r2(c2[1])], [r2(p2[0]), r2(p2[1])]])
    return seg


def construir(salida):
    T, esc4 = geometria_icono()
    ms, _ = mascaras()
    capas = []

    def capa(id_, nombre, relleno, contornos, pivote=None, grupo=None):
        capas.append({'id': id_, 'nombre': nombre, 'relleno': relleno, 'grupo': grupo,
                      'contornos': contornos, 'pivote': pivote or centro(contornos)})

    capa('baldosa', 'Baldosa', NACAR, [squircle()], [L / 2, L / 2], 'icono')

    cont = trazar_limpio(ms['cabeza'])
    por_id = {c['id']: c for c in cont}
    arriba = [c for c in cont if c['bbox'][1] < CORTE_BAJO and c['profundidad'] == 0 and c['area'] >= 800]
    # Lineas de la cara: lo que queda dentro del ovalo de la cara. Lo demas es el contorno de
    # la cabeza, que al quitar las orejas queda en varios trozos.
    def es_cara(c):
        x0, y0, x1, y1 = c['bbox']
        return x0 >= 500 and x1 <= 1950 and y0 >= 300 and y1 <= 1900
    resto = [c for c in arriba if es_cara(c)]
    piezas_cabeza = [c for c in arriba if not es_cara(c)]
    ids_resto = {c['id'] for c in resto}
    brillos = [c for c in cont if c['profundidad'] == 1 and c['padre'] in ids_resto
               and c['circularidad'] > 0.9 and c['area'] < 12000]
    ids_brillo = {c['id'] for c in brillos}

    def con_huecos(raiz, excluir=()):
        grupo = [raiz] + [c for c in cont if c['padre'] == raiz['id'] and c['id'] not in excluir]
        return [seg_icono(c['seg'], T) for c in grupo]

    # Tiras finas del borde de cada oreja que la apertura no cogio: se mueven con ella
    extra = {'izq': [c for c in piezas_cabeza if c['bbox'][2] <= 600],
             'der': [c for c in piezas_cabeza if c['bbox'][0] >= 1850]}
    ids_extra = {c['id'] for lista in extra.values() for c in lista}
    capa('cabeza', 'Cabeza', ROSA, [c for p in piezas_cabeza if p['id'] not in ids_extra for c in con_huecos(p)], grupo='pug')

    for lado, clave in (('izq', 'oreja_i'), ('der', 'oreja_d')):
        cont_o = trazar_limpio(ms[clave])
        solape = ms[clave] & ms['cabeza']
        ys, xs = np.nonzero(solape)
        capa(f'oreja-{lado}', f'Oreja {lado}', ROSA,
             [seg_icono(c['seg'], T) for c in cont_o] + [seg for p in extra[lado] for seg in con_huecos(p)],
             list(T(float(xs.mean()), float(ys.mean()))), 'pug')

    cara = []
    for r in resto:
        cara.extend(con_huecos(r, excluir=ids_brillo))
    capa('cara', 'Lineas de la cara', ROSA, cara, grupo='pug')

    for i, b in enumerate(sorted(brillos, key=lambda c: c['centro'][0])):
        sg = [seg_icono(b['seg'], T)]
        capa(f'brillo-{i + 1}', f'Brillo del ojo {i + 1}', NACAR, sg, centro(sg), 'pug')

    abajo = [c for c in cont if c['bbox'][1] >= CORTE_BAJO - 20 or (c['profundidad'] > 0 and c['centro'][1] >= 2300)]
    marco = max((c for c in abajo if c['profundidad'] == 0), key=lambda c: c['area'])
    huecos = [c for c in abajo if c['padre'] == marco['id']]
    capa('marco', 'Marco del calendario y aro del reloj', ROSA,
         [seg_icono(c['seg'], T) for c in [marco] + huecos], grupo='calendario')
    cara_reloj = max(huecos, key=lambda c: c['circularidad'])
    islas = [c for c in abajo if c['profundidad'] == 2]
    cuadritos = sorted([c for c in islas if c['padre'] != cara_reloj['id']],
                       key=lambda c: (round(c['centro'][1] / 100), c['centro'][0]))
    for i, c in enumerate(cuadritos):
        sg = [seg_icono(c['seg'], T)]
        capa(f'cuadrito-{i + 1}', f'Cuadrito {i + 1}', ROSA, sg, centro(sg), 'calendario')

    # Manecillas: se rehacen limpias (dos capsulas) a partir de la L que habia
    ele = [c for c in islas if c['padre'] == cara_reloj['id']][0]
    bx0, by0, bx1, by1 = ele['bbox']
    suma = (bx1 - bx0) + (by1 - by0)
    t = (suma - (suma ** 2 - 4 * ele['area']) ** 0.5) / 2   # grosor de la L: t*(a+b) - t^2 = area
    px, py = bx0 + t / 2, by1 - t / 2
    pivote = list(T(px, py))
    capa('manecilla-hora', 'Manecilla de la hora', ROSA, [capsula(px, py, bx1 - t / 2, py, t, T)], pivote, 'calendario')
    capa('manecilla-minuto', 'Manecilla del minuto', ROSA, [capsula(px, py, px, by0 + t / 2, t, T)], pivote, 'calendario')

    datos = {'lado': L, 'escala4x': esc4, 'capas': capas}
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(datos, f)
    for c in capas:
        print(f"{c['id']:<18} contornos {len(c['contornos']):>2}  pivote {c['pivote']}")


if __name__ == '__main__':
    construir(sys.argv[1] if len(sys.argv) > 1 else SALIDA)
