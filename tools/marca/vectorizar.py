# Pasa el simbolo (pug + calendario + reloj) de la imagen 3D original a vector.
# Saca la mascara de las lineas rosas, la suaviza a alta resolucion y la traza con
# Potrace (curvas Bezier). Deja las formas en design/marca/vector/formas.json:
# cada forma = un contorno exterior con sus huecos y sus islas, en el sistema de
# coordenadas del icono (1000 x 1000 con el simbolo centrado).
#
#   python tools/marca/vectorizar.py
import json
import os
import sys

import numpy as np
import potrace
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from extraer_simbolo import CAJA, RELOJ_X, rosa_de  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORIGINAL = os.path.join(RAIZ, 'design', 'marca', 'original-3d.webp')
SALIDA = os.environ.get('SALIDA') or os.path.join(RAIZ, 'design', 'marca', 'vector')

ESCALA = 4        # la mascara se traza a 4x: las curvas salen suaves, no escalonadas
TURDSIZE = 40     # manchas menores (en px de la mascara 4x) se descartan
TOLERANCIA = float(os.environ.get('TOLERANCIA', 0.7))   # cuanto se permite simplificar la curva
SUAVIZADO = float(os.environ.get('SUAVIZADO', 5))     # desenfoque (px a 4x) antes de umbralizar: cierra grietas y rebabas
ALPHAMAX = float(os.environ.get('ALPHAMAX', 1.15))       # 0 = esquinas, 1.33 = todo curvas
UMBRAL = int(os.environ.get('UMBRAL', 118))


def mascara_alta():
    rgb = np.asarray(Image.open(ORIGINAL).convert('RGB')).astype(np.float32)
    mx, mn = rgb.max(2), rgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    # "cuanto de rosa es": 0 en la baldosa blanca, 1 en el trazo; asi los bordes
    # suaves del render dan un contorno fino y no un escalon.
    if os.environ.get('MODO', 'g') == 'g':
        # Canal verde: la baldosa lo tiene alto (~245) y el rosa muy bajo (~85-130). La luz y
        # la sombra del relieve mueven mucho menos este canal que la saturacion.
        verde = rgb[..., 1]
        rosa = np.clip((float(os.environ.get('VERDE0', 185)) - verde) / 30.0, 0, 1) * (mx > 110)
        # Calendario y reloj: el reloj proyecta sombra rosada sobre el marco; umbral mas estricto.
        rosa_baja = np.clip((float(os.environ.get('VERDE0_BAJO', 165)) - verde) / 30.0, 0, 1) * (mx > 110)
        fila_baja = int(os.environ.get('CORTE_BAJO', 1900)) // ESCALA + CAJA[1]
        rosa[fila_baja:] = rosa_baja[fila_baja:]
    else:
        rosa = np.clip((sat - 0.30) / 0.10, 0, 1) * (mx > 110)
    x0, y0, x1, y1 = CAJA
    zona = np.zeros_like(rosa)
    zona[y0:y1, x0:x1] = 1
    zona[1046:, :RELOJ_X[0]] = 0
    zona[1046:, RELOJ_X[1]:] = 0
    zona[1054:] = 0
    rosa = (rosa * zona)[y0:y1, x0:x1]
    img = Image.fromarray((rosa * 255).astype(np.uint8), 'L')
    img = img.resize((img.width * ESCALA, img.height * ESCALA), Image.BICUBIC)

    def limpiar(imagen, suavizado, lado):
        # Cierre (tapa rendijas finas de fondo) y apertura (quita espinas finas de tinta). Un
        # trazo real mide 60-120 px a 4x; lo que se quita mide menos de ~lado px.
        im = imagen.filter(ImageFilter.GaussianBlur(suavizado)).point(lambda v: 255 if v > UMBRAL else 0)
        if lado > 1:
            im = im.filter(ImageFilter.MaxFilter(lado)).filter(ImageFilter.MinFilter(lado))   # cierre
            im = im.filter(ImageFilter.MinFilter(lado)).filter(ImageFilter.MaxFilter(lado))   # apertura
        return np.asarray(im.filter(ImageFilter.GaussianBlur(3))) > 128

    # Pug: trazo organico, se conserva el detalle. Calendario y reloj: formas geometricas
    # simples, se alisan mas (sin muescas ni bultos de la sombra del bisel).
    m = limpiar(img, SUAVIZADO, int(os.environ.get('LIMPIEZA', 13)))
    baja = limpiar(img, float(os.environ.get('SUAVIZADO_BAJO', 9)), int(os.environ.get('LIMPIEZA_BAJA', 29)))
    corte = int(os.environ.get('CORTE_BAJO', 1900))  # fila (a 4x) donde acaba el menton y empieza el calendario
    m[corte:] = baja[corte:]
    return m, (x1 - x0, y1 - y0)


def punto(p):
    return [round(float(p.x), 2), round(float(p.y), 2)]


def contorno(path):
    # Lista de segmentos: ['M', p] ['L', p] ['C', c1, c2, p]
    seg = [['M', punto(path.start_point)]]
    for s in path.segments:
        if s.is_corner:
            seg.append(['L', punto(s.c)])
            seg.append(['L', punto(s.end_point)])
        else:
            seg.append(['C', punto(s.c1), punto(s.c2), punto(s.end_point)])
    return seg


def recorrer(path, forma, nivel):
    forma['contornos'].append({'nivel': nivel, 'seg': contorno(path)})
    for hijo in (path.children or []):
        recorrer(hijo, forma, nivel + 1)


def trazar(m):
    """Mascara booleana (True = tinta) -> lista de formas con sus Beziers."""
    plist = potrace.Bitmap(~m).trace(turdsize=TURDSIZE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                     alphamax=ALPHAMAX, opticurve=True, opttolerance=TOLERANCIA)
    formas = []
    for path in plist:
        forma = {'contornos': []}
        recorrer(path, forma, 0)
        formas.append(forma)
    return formas


def main():
    m, (ancho, alto) = mascara_alta()
    print('mascara', m.shape, 'pixeles rosa', int(m.sum()))
    formas = trazar(m)
    os.makedirs(SALIDA, exist_ok=True)
    datos = {'ancho': ancho * ESCALA, 'alto': alto * ESCALA, 'formas': formas}
    with open(os.path.join(SALIDA, 'formas.json'), 'w', encoding='utf-8') as f:
        json.dump(datos, f)
    print(len(formas), 'formas;', sum(len(f['contornos']) for f in formas), 'contornos')


if __name__ == '__main__':
    main()
