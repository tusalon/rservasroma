# Parte el simbolo en capas independientes para animarlo: cabeza, orejas, lineas de la cara,
# brillos de los ojos, marco del calendario, cuadritos y manecillas del reloj.
# Todas las coordenadas salen en el espacio del icono de app (1024 x 1024).
#
# Modulo usado por animacion.py. Para revisar las capas a ojo:
#   python tools/marca/capas.py <salida.png>
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import vectorizar as V
from vector_lib import cargar, medir, quitar_brillos

L = 1024
K = 0.25               # de 4x a 1x
ALTO_SIMBOLO = 0.68    # el simbolo ocupa el 68 % del alto del icono (igual que los PNG y el SVG)
CORTE_BAJO = 1900

ROSA = '#FB6095'
NACAR = '#FCF6F2'

# Orejas: se buscan con una apertura grande (el trazo del contorno es mas fino que la oreja).
FACTOR = 8
LADO_APERTURA = 15
ZONA_OREJA_IZQ = (0, 200, 600, 1200)        # x0, y0, x1, y1 a 4x
ZONA_OREJA_DER = (1850, 150, 2452, 1200)
MARGEN_OREJA = 28      # px a 4x que la oreja se mete en la cabeza: tapa la costura al girar


def _dilatar(mascara, px):
    im = Image.fromarray((mascara * 255).astype(np.uint8), 'L')
    for _ in range(max(1, px // 7)):
        im = im.filter(ImageFilter.MaxFilter(15))
    return np.asarray(im) > 0


def nucleo_oreja(m, zona):
    peq = Image.fromarray((m * 255).astype(np.uint8), 'L').resize((m.shape[1] // FACTOR, m.shape[0] // FACTOR), Image.BOX)
    peq = peq.point(lambda v: 255 if v > 127 else 0)
    op = peq.filter(ImageFilter.MinFilter(LADO_APERTURA)).filter(ImageFilter.MaxFilter(LADO_APERTURA))
    a = np.asarray(op) > 0
    x0, y0, x1, y1 = (v // FACTOR for v in zona)
    z = np.zeros_like(a)
    z[y0:y1, x0:x1] = True
    a &= z
    grande = Image.fromarray((a * 255).astype(np.uint8), 'L').resize((m.shape[1], m.shape[0]), Image.BICUBIC)
    grande = grande.filter(ImageFilter.GaussianBlur(FACTOR * 0.8))
    return (np.asarray(grande) > 128) & m


def mascaras():
    cache = os.path.join(V.SALIDA, '.mascaras.npz')
    if os.path.exists(cache):
        z = np.load(cache)
        return {k: z[k] for k in ('cabeza', 'oreja_i', 'oreja_d', 'todo')}, None
    m, dims = V.mascara_alta()
    nuc_i = nucleo_oreja(m, ZONA_OREJA_IZQ)
    nuc_d = nucleo_oreja(m, ZONA_OREJA_DER)
    oreja_i = _dilatar(nuc_i, MARGEN_OREJA) & m
    oreja_d = _dilatar(nuc_d, MARGEN_OREJA) & m
    cabeza = m & ~(nuc_i | nuc_d)
    res = {'cabeza': cabeza, 'oreja_i': oreja_i, 'oreja_d': oreja_d, 'todo': m}
    np.savez_compressed(cache, **res)
    return res, dims


def trazar_limpio(m):
    formas = V.trazar(m)
    cont = medir(formas)
    limpio, _ = quitar_brillos(cont)
    return limpio


def revisar(salida):
    ms, dims = mascaras()
    k = 0.3
    H, W = ms['todo'].shape
    img = np.zeros((H, W, 3), 'uint8')
    img[:] = (255, 250, 247)
    img[ms['cabeza']] = (251, 96, 149)
    img[ms['oreja_i'] & ~ms['cabeza']] = (30, 120, 220)
    img[ms['oreja_d'] & ~ms['cabeza']] = (40, 170, 90)
    img[ms['oreja_i'] & ms['cabeza']] = (140, 40, 200)
    img[ms['oreja_d'] & ms['cabeza']] = (140, 40, 200)
    Image.fromarray(img).resize((int(W * k), int(H * k)), Image.LANCZOS).save(salida)
    print(salida, 'orejas px', int(ms['oreja_i'].sum()), int(ms['oreja_d'].sum()))


if __name__ == '__main__':
    revisar(sys.argv[1])
