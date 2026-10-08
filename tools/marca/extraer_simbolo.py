# Saca el simbolo (pug + calendario) de la imagen 3D original con su relieve.
# El interior blanco se conserva opaco: el simbolo siempre va sobre su
# baldosa blanca (el icono). Todo el paquete sale de tools/marca/generar_marca.py
#
#   python tools/marca/extraer_simbolo.py <imagen-original> <salida.png> <salida-plano.png>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Medido sobre design/marca/original-3d.webp (1254x1254): el simbolo ocupa
# x 330-925, y 271-1055. Por debajo y a los lados empieza el bisel del
# cuadrado, que tambien es rosado y no forma parte del simbolo.
CAJA = (322, 255, 935, 1058)
RELOJ_X = (640, 860)  # bajo y=1046 solo queda el reloj
# Color plano al que se lleva la superficie del simbolo (= centro de la baldosa).
SUPERFICIE = (251, 245, 241)


def mascara(m):
    return Image.fromarray((m * 255).astype(np.uint8), 'L')


def rosa_de(rgb):
    mx, mn = rgb.max(2), rgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    rosa = (sat > 0.30) & (mx > 120)
    x0, y0, x1, y1 = CAJA
    caja = np.zeros_like(rosa)
    caja[y0:y1, x0:x1] = True
    caja[1046:, :RELOJ_X[0]] = False
    caja[1046:, RELOJ_X[1]:] = False
    return rosa & caja, sat


def extraer(ruta):
    img = Image.open(ruta).convert('RGB')
    rgb = np.asarray(img).astype(np.float32)
    rosa, sat = rosa_de(rgb)

    # Zona: trazo rosa + margen para sus sombras + lo encerrado (cara, calendario).
    zona = mascara(rosa).filter(ImageFilter.MaxFilter(45))
    fuera = Image.eval(zona, lambda v: 0 if v > 127 else 255)
    ImageDraw.floodfill(fuera, (0, 0), 128)  # lo alcanzable desde la esquina es fondo
    dentro = (np.asarray(fuera) != 128)
    dentro[1060:] = False  # el bisel inferior (rosado, bajo el reloj) no entra
    alfa = mascara(dentro).filter(ImageFilter.GaussianBlur(14))

    # La superficie original tiene degradado de luz (mas oscura abajo). Se
    # ajusta un plano de color con la superficie limpia que rodea al simbolo
    # y se corrige todo el simbolo a un color plano: asi el borde se funde
    # con la baldosa nueva sin halo.
    anillo = (np.asarray(mascara(dentro).filter(ImageFilter.MaxFilter(61))) > 127) & ~dentro & (sat < 0.06)
    anillo[1040:] = False
    anillo[:, :300] = False
    anillo[:, 955:] = False
    ys, xs = np.nonzero(anillo)
    A = np.column_stack([np.ones_like(xs), xs, ys]).astype(np.float64)
    coef, *_ = np.linalg.lstsq(A, rgb[anillo].astype(np.float64), rcond=None)
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    luz = coef[0] + xx[..., None] * coef[1] + yy[..., None] * coef[2]
    corregido = np.clip(rgb + (np.array(SUPERFICIE) - luz), 0, 255).astype(np.uint8)
    superficie = SUPERFICIE

    simbolo = Image.fromarray(corregido, 'RGB')
    simbolo.putalpha(alfa)
    caja = alfa.point(lambda v: 255 if v > 6 else 0).getbbox()

    # Version plana (una tinta): solo el trazo rosa, suavizado.
    plano = mascara(rosa).filter(ImageFilter.GaussianBlur(1.2))
    return simbolo.crop(caja), plano.crop(caja), superficie


if __name__ == '__main__':
    simbolo, plano, superficie = extraer(sys.argv[1])
    simbolo.save(sys.argv[2])
    plano.save(sys.argv[3])
    print(simbolo.size, 'superficie', superficie.round())
