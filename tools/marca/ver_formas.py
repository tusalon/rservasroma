# Pinta design/marca/vector/formas.json en un PNG con el numero de cada contorno,
# para decidir a que pieza pertenece cada uno (cara, orejas, ojos, calendario...).
#   python tools/marca/ver_formas.py <salida.png> [indices separados por coma]
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FORMAS = os.path.join(RAIZ, 'design', 'marca', 'vector', 'formas.json')


def muestrear(seg, pasos=12):
    pts = []
    actual = None
    for s in seg:
        if s[0] == 'M':
            actual = tuple(s[1]); pts.append(actual)
        elif s[0] == 'L':
            actual = tuple(s[1]); pts.append(actual)
        else:
            p0, p1, p2, p3 = actual, s[1], s[2], s[3]
            for k in range(1, pasos + 1):
                t = k / pasos
                u = 1 - t
                pts.append((u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                            u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]))
            actual = tuple(p3)
    return pts


def main():
    d = json.load(open(FORMAS, encoding='utf-8'))
    salida = sys.argv[1]
    solo = {int(x) for x in sys.argv[2].split(',')} if len(sys.argv) > 2 else None
    w, h = d['ancho'], d['alto']
    k = 0.25
    W, H = int(w * k), int(h * k)
    total = np.zeros((H, W), dtype=bool)
    for i, f in enumerate(d['formas']):
        if solo is not None and i not in solo:
            continue
        m = Image.new('1', (W, H), 0)
        ImageDraw.Draw(m).polygon([(x * k, y * k) for x, y in muestrear(f['contornos'][0]['seg'])], fill=1)
        total ^= np.asarray(m, dtype=bool)
    img = Image.fromarray(np.where(total, 0, 255).astype(np.uint8), 'L').convert('RGB')
    dr = ImageDraw.Draw(img)
    fuente = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 14)
    for i, f in enumerate(d['formas']):
        if solo is not None and i not in solo:
            continue
        pts = muestrear(f['contornos'][0]['seg'])
        cx = sum(p[0] for p in pts) / len(pts) * k
        cy = sum(p[1] for p in pts) / len(pts) * k
        dr.text((cx, cy), str(i), fill=(220, 30, 90), font=fuente)
    img.save(salida)
    print(salida, img.size)


if __name__ == '__main__':
    main()
