# Utilidades para trabajar con design/marca/vector/formas.json (salida de vectorizar.py):
# anidamiento (contorno exterior / hueco / isla), grosor y limpieza de brillos.
import json
import os

from ver_formas import muestrear

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FORMAS = os.environ.get('FORMAS') or os.path.join(RAIZ, 'design', 'marca', 'vector', 'formas.json')


def area(p):
    n = len(p)
    return sum(p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1] for i in range(n)) / 2


def perimetro(p):
    n = len(p)
    return sum(((p[i][0] - p[(i + 1) % n][0]) ** 2 + (p[i][1] - p[(i + 1) % n][1]) ** 2) ** 0.5 for i in range(n))


def contiene(poly, pt):
    x, y = pt
    dentro = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            dentro = not dentro
    return dentro


def medir(formas):
    """Contornos con sus medidas. profundidad 0 = linea exterior, 1 = hueco, 2 = isla dentro del hueco..."""
    cont = []
    for i, f in enumerate(formas):
        seg = f['contornos'][0]['seg']
        poly = muestrear(seg, 8)
        cont.append({'id': i, 'seg': seg, 'poly': poly, 'area': abs(area(poly)), 'perim': perimetro(poly)})
    for c in cont:
        c['profundidad'] = sum(1 for o in cont if o is not c and o['area'] > c['area'] and contiene(o['poly'], c['poly'][0]))
        padres = [o for o in cont if o is not c and o['area'] > c['area'] and contiene(o['poly'], c['poly'][0])]
        c['padre'] = min(padres, key=lambda o: o['area'])['id'] if padres else None
        c['grosor'] = 2 * c['area'] / c['perim'] if c['perim'] else 0
        c['circularidad'] = 4 * 3.141592653589793 * c['area'] / (c['perim'] ** 2) if c['perim'] else 0
        xs = [p[0] for p in c['poly']]
        ys = [p[1] for p in c['poly']]
        c['bbox'] = (min(xs), min(ys), max(xs), max(ys))
        c['centro'] = (sum(xs) / len(xs), sum(ys) / len(ys))
    return cont


def cargar():
    datos = json.load(open(FORMAS, encoding='utf-8'))
    return datos, medir(datos['formas'])


# Zonas (en el espacio 4x de formas.json) donde los huecos son parte del dibujo: ojos y nariz.
# En el resto, los huecos son brillos del relieve 3D y se rellenan.
ZONAS_OJOS = [((780, 830), 340), ((1700, 830), 340)]
ZONA_NARIZ = ((1220, 960), 230)


def _en(c, zona):
    (cx, cy), r = zona
    return (c['centro'][0] - cx) ** 2 + (c['centro'][1] - cy) ** 2 <= r * r


def quitar_brillos(cont):
    """Quita los brillos del relieve 3D que el trazador copio como rendijas y motas.
    Conserva: huecos de los ojos (aro y brillos), brillo de la nariz, cuadritos y manecillas."""
    fuera = []
    for c in cont:
        if c['profundidad'] % 2 == 1:  # hueco
            enojo = any(_en(c, z) for z in ZONAS_OJOS)
            if enojo and c['grosor'] >= 11 and c['area'] >= 400:
                continue
            if _en(c, ZONA_NARIZ) and c['grosor'] >= 15:
                continue
            if c['area'] > 100000:  # cara del reloj
                continue
            fuera.append(c['id'])
        elif c['profundidad'] > 0:  # isla dentro de un hueco (cuadritos, manecillas)
            if c['area'] < 600:
                fuera.append(c['id'])
        elif c['area'] < 800 or (c['area'] < 1200 and c['grosor'] < 8):  # mota suelta fuera del dibujo
            fuera.append(c['id'])
    return [c for c in cont if c['id'] not in fuera], fuera
