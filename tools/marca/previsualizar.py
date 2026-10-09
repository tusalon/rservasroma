# Pinta formas.json ya limpio (sin brillos del relieve) para revisarlo a ojo:
#   python tools/marca/previsualizar.py <salida.png> [escala]
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from vector_lib import cargar, quitar_brillos


def main():
    salida = sys.argv[1]
    k = float(sys.argv[2]) if len(sys.argv) > 2 else 0.4
    datos, cont = cargar()
    limpio, fuera = quitar_brillos(cont)
    W, H = int(datos['ancho'] * k), int(datos['alto'] * k)
    tot = np.zeros((H, W), bool)
    for c in limpio:
        m = Image.new('1', (W, H), 0)
        ImageDraw.Draw(m).polygon([(x * k, y * k) for x, y in c['poly']], fill=1)
        tot ^= np.asarray(m, bool)
    a = np.zeros((H, W, 3), 'uint8')
    a[:] = (255, 250, 247)
    a[tot] = (251, 96, 149)
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 13)
    for c in limpio:
        d.text((c['centro'][0] * k, c['centro'][1] * k), str(c['id']), fill=(0, 0, 0), font=f)
    im.save(salida)
    print(len(cont), '->', len(limpio), 'quitados', fuera)


if __name__ == '__main__':
    main()
