# Genera TODO el paquete de marca de RservasRoma desde la imagen original
# (design/marca/original-3d.webp). Se puede volver a correr cuando cambie el logo:
#
#   python tools/marca/generar_marca.py
#
# Salidas:
#   icons/                       iconos de la web/PWA, favicon, apple-touch-icon, badge
#   icons/android/res/           iconos y splash de la APK (scripts/apply-android-icons.ps1 los copia)
#   design/marca/                kit de marca: iOS 1024, simbolo, logo horizontal, redes
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from extraer_simbolo import extraer  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORIGINAL = os.path.join(RAIZ, 'design', 'marca', 'original-3d.webp')
ICONOS = os.path.join(RAIZ, 'icons')
KIT = os.path.join(RAIZ, 'design', 'marca')
RES = os.path.join(ICONOS, 'android', 'res')

# Colores de la identidad (medidos sobre el original, ver identidad.html)
ROSA = (251, 96, 149)          # #FB6095 Rosa Roma: tono medio del trazo del pug
BALDOSA_ARRIBA = (255, 250, 247)
BALDOSA_ABAJO = (247, 240, 236)
TINTA = (29, 29, 31)           # #1D1D1F texto, como Apple
FUENTE = r'C:\Windows\Fonts\seguisb.ttf'  # Segoe UI Semibold (la mas cercana a SF Pro en Windows)

# Radio de la zona segura (fraccion del lado): 0.40 = circulo de los iconos
# "maskable" de Android/PWA. El mismo encuadre sirve para iOS y para redes
# (la foto de perfil circular de WhatsApp no corta nada).
ZONA_SEGURA = 0.40

SIMBOLO, PLANO_MASK, _ = extraer(ORIGINAL)


def limpiar_plano(m):
    # Cierra los huecos de los brillos del relieve y suaviza el borde.
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    m = m.filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: 255 if v > 120 else 0)
    return m.filter(ImageFilter.GaussianBlur(0.8))


PLANO = limpiar_plano(PLANO_MASK)


def cara(img):
    # Solo la cara del pug (sin el calendario): para 16-48 px, donde el
    # calendario no se distingue. Corte = primera fila vacia del trazo
    # despues de la mitad superior.
    filas = np.asarray(PLANO).max(1)
    h = len(filas)
    corte = next(y for y in range(int(h * 0.45), h) if filas[y] < 20)
    pieza = img.crop((0, 0, img.width, corte))
    return pieza.crop(pieza.getbbox() if pieza.mode == 'L' else pieza.getchannel('A').getbbox())


SIMBOLO_CARA = cara(SIMBOLO)
PLANO_CARA = PLANO.crop((0, 0) + SIMBOLO_CARA.size)


def escala_segura(alfa, radio=ZONA_SEGURA):
    # Mayor alto (fraccion del lado) con el que todo pixel visible cae dentro
    # del circulo de radio `radio` centrado.
    a = np.asarray(alfa) > 128
    ys, xs = np.nonzero(a)
    h, w = a.shape
    d = np.sqrt((xs - w / 2) ** 2 + (ys - h / 2) ** 2).max()
    return radio * h / d


# 0.68 del alto deja el aire de los iconos de Apple; la zona segura daria 0.76.
ESCALA = min(0.68, escala_segura(SIMBOLO.getchannel('A')))
# En el favicon manda que se vea: la cara llena casi toda la forma.
ESCALA_CARA = min(0.84, escala_segura(SIMBOLO_CARA.getchannel('A'), 0.50))


def degradado(w, h, arriba=BALDOSA_ARRIBA, abajo=BALDOSA_ABAJO):
    t = np.linspace(0, 1, h)[:, None, None]
    fila = np.array(arriba) * (1 - t) + np.array(abajo) * t
    return Image.fromarray(np.repeat(fila, w, 1).astype(np.uint8), 'RGB')


def encajar(img, alto):
    alto = max(1, round(alto))
    return img.resize((max(1, round(img.width * alto / img.height)), alto), Image.LANCZOS)


def pegar_centro(fondo, pieza, dy=0):
    x = (fondo.width - pieza.width) // 2
    y = (fondo.height - pieza.height) // 2 + dy
    # Sobre transparente, paste() oscurece el borde (halo gris): alpha_composite no.
    if fondo.mode == 'RGBA':
        fondo.alpha_composite(pieza.convert('RGBA'), (x, y))
    else:
        fondo.paste(pieza, (x, y), pieza)
    return fondo


def baldosa(lado, simbolo=SIMBOLO, escala=ESCALA):
    # Cuadrado a sangre (sin esquinas): iOS y Android ponen la forma.
    # Se compone a 1024 y se reduce, para que los tamanos chicos salgan nitidos.
    base = max(lado, 1024)
    img = degradado(base, base)
    pegar_centro(img, encajar(simbolo, base * escala))
    if base != lado:
        img = img.resize((lado, lado), Image.LANCZOS)
        if lado <= 64:
            img = img.filter(ImageFilter.UnsharpMask(1, 60, 2))
    return img


def forma(lado, tipo='squircle', margen=0.0):
    # Mascara antialias: squircle (superelipse n=5, como la curva continua
    # de Apple) o circulo.
    s = lado * 4
    c = (s - 1) / 2
    r = c * (1 - margen)
    y, x = np.mgrid[0:s, 0:s]
    u, v = np.abs(x - c) / r, np.abs(y - c) / r
    m = (u ** 5 + v ** 5 <= 1) if tipo == 'squircle' else (u ** 2 + v ** 2 <= 1)
    return Image.fromarray((m * 255).astype(np.uint8), 'L').resize((lado, lado), Image.LANCZOS)


def redondeado(lado, tipo='squircle', margen=0.0, simbolo=SIMBOLO, escala=ESCALA):
    img = baldosa(lado, simbolo, escala).convert('RGBA')
    img.putalpha(forma(lado, tipo, margen))
    return img


def con_sombra(icono, lienzo, dy_frac=0.025, blur_frac=0.045, opacidad=0.22):
    # Icono flotando con sombra suave (presentaciones, splash, redes).
    out = Image.new('RGBA', lienzo.size if isinstance(lienzo, Image.Image) else lienzo, (0, 0, 0, 0))
    if isinstance(lienzo, Image.Image):
        out.paste(lienzo.convert('RGBA'))
    sombra = Image.new('RGBA', icono.size, (120, 40, 70, 0))
    sombra.putalpha(icono.getchannel('A').point(lambda v: int(v * opacidad)))
    capa = Image.new('RGBA', out.size, (0, 0, 0, 0))
    x = (out.width - icono.width) // 2
    y = (out.height - icono.height) // 2
    capa.paste(sombra, (x, y + round(icono.height * dy_frac)))
    capa = capa.filter(ImageFilter.GaussianBlur(icono.height * blur_frac))
    out = Image.alpha_composite(out, capa)
    out.alpha_composite(icono, (x, y))
    return out


def tinta(mask, color):
    img = Image.new('RGBA', mask.size, color + (0,))
    img.putalpha(mask)
    return img


def texto(draw, xy, cadena, tam, color, peso=FUENTE, tracking=-0.02):
    f = ImageFont.truetype(peso, tam)
    x, y = xy
    for ch in cadena:  # tracking negativo, como los titulares de Apple
        draw.text((x, y), ch, font=f, fill=color)
        x += f.getlength(ch) + tam * tracking
    return x


def ancho_texto(cadena, tam, peso=FUENTE, tracking=-0.02):
    f = ImageFont.truetype(peso, tam)
    return sum(f.getlength(ch) + tam * tracking for ch in cadena)


def guardar(img, *partes, rgb=False):
    ruta = os.path.join(*partes)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    (img.convert('RGB') if rgb else img).save(ruta, optimize=True)
    return ruta


def logo_horizontal(alto, color_texto, nombre='RservasRoma'):
    tam = round(alto * 0.42)
    icono = redondeado(alto)
    sep = round(alto * 0.28)
    w = alto + sep + round(ancho_texto(nombre, tam)) + 4
    img = Image.new('RGBA', (w, alto), (0, 0, 0, 0))
    img.alpha_composite(icono)
    d = ImageDraw.Draw(img)
    asc, desc = ImageFont.truetype(FUENTE, tam).getmetrics()
    texto(d, (alto + sep, (alto - asc - desc) // 2 + round(tam * 0.02)), nombre, tam, color_texto)
    return img


def main():
    hechos = []

    # ---------- Web / PWA ----------
    for lado in (72, 96, 128, 144, 152, 192, 384, 512):
        hechos.append(guardar(baldosa(lado), ICONOS, f'icon-{lado}x{lado}.png', rgb=True))
    for lado in (192, 512):  # "any": con su forma, para escritorio y pestanas
        hechos.append(guardar(redondeado(lado), ICONOS, f'icon-any-{lado}x{lado}.png'))
    hechos.append(guardar(baldosa(180), ICONOS, 'apple-touch-icon.png', rgb=True))
    for lado in (16, 32, 48):
        hechos.append(guardar(redondeado(lado, simbolo=SIMBOLO_CARA, escala=ESCALA_CARA), ICONOS, f'favicon-{lado}.png'))
    fav = redondeado(256, simbolo=SIMBOLO_CARA, escala=ESCALA_CARA)
    fav.save(os.path.join(ICONOS, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    hechos.append(os.path.join(ICONOS, 'favicon.ico'))
    # Insignia de notificaciones push: Android solo usa la silueta (alfa).
    badge = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    pegar_centro(badge, tinta(encajar(PLANO_CARA, 84), (255, 255, 255)))
    hechos.append(guardar(badge, ICONOS, 'badge-96.png'))

    # ---------- Android (APK) ----------
    densidades = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for nombre, f in densidades.items():
        lado = round(48 * f)
        carpeta = os.path.join(RES, f'mipmap-{nombre}')
        hechos.append(guardar(redondeado(lado, 'squircle', 0.04), carpeta, 'ic_launcher.png'))
        hechos.append(guardar(redondeado(lado, 'circulo', 0.04), carpeta, 'ic_launcher_round.png'))
        # Iconos adaptables: lienzo de 108 dp, se ve el centro de 72 dp.
        lienzo = round(108 * f)
        visible = lienzo * 72 / 108
        frente = Image.new('RGBA', (lienzo, lienzo), (0, 0, 0, 0))
        pegar_centro(frente, encajar(SIMBOLO, visible * ESCALA))
        hechos.append(guardar(frente, carpeta, 'ic_launcher_foreground.png'))
        hechos.append(guardar(degradado(lienzo, lienzo), carpeta, 'ic_launcher_background.png', rgb=True))
        mono = Image.new('RGBA', (lienzo, lienzo), (0, 0, 0, 0))
        pegar_centro(mono, tinta(encajar(PLANO, visible * ESCALA), (255, 255, 255)))
        hechos.append(guardar(mono, carpeta, 'ic_launcher_monochrome.png'))
    splash = {
        'drawable': (480, 320),
        'drawable-land-mdpi': (480, 320), 'drawable-land-hdpi': (800, 480),
        'drawable-land-xhdpi': (1280, 720), 'drawable-land-xxhdpi': (1600, 960),
        'drawable-land-xxxhdpi': (1920, 1280),
        'drawable-port-mdpi': (320, 480), 'drawable-port-hdpi': (480, 800),
        'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600),
        'drawable-port-xxxhdpi': (1280, 1920),
    }
    for carpeta, (w, h) in splash.items():
        lado = round(min(w, h) * 0.36)
        img = con_sombra(redondeado(lado), degradado(w, h, (255, 255, 255), BALDOSA_ARRIBA))
        hechos.append(guardar(img, RES, carpeta, 'splash.png', rgb=True))

    # ---------- Kit de marca ----------
    hechos.append(guardar(baldosa(1024), KIT, 'app-icon-ios-1024.png', rgb=True))
    hechos.append(guardar(redondeado(1024), KIT, 'icono-redondeado-1024.png'))
    hechos.append(guardar(con_sombra(redondeado(824), (1024, 1024)), KIT, 'icono-con-sombra-1024.png'))
    hechos.append(guardar(SIMBOLO, KIT, 'simbolo-3d.png'))
    for nombre, color in (('rosa', ROSA), ('negro', TINTA), ('blanco', (255, 255, 255))):
        hechos.append(guardar(tinta(encajar(PLANO, 1024), color), KIT, f'simbolo-plano-{nombre}.png'))
    hechos.append(guardar(logo_horizontal(256, TINTA), KIT, 'logo-horizontal.png'))
    hechos.append(guardar(logo_horizontal(256, (255, 255, 255)), KIT, 'logo-horizontal-blanco.png'))

    # Redes: perfil (WhatsApp/Instagram/Facebook recortan en circulo: cabe entero)
    hechos.append(guardar(baldosa(1080), KIT, 'redes-perfil-1080.png', rgb=True))

    # Vista previa al compartir un enlace (WhatsApp, Facebook): 1200x630
    og = degradado(1200, 630, (255, 255, 255), BALDOSA_ARRIBA).convert('RGBA')
    capa = con_sombra(redondeado(300), (420, 630))
    og.alpha_composite(capa, (70, 0))
    d = ImageDraw.Draw(og)
    texto(d, (520, 205), 'RservasRoma', 92, TINTA)
    texto(d, (524, 330), 'Reservas para tu salón de belleza,', 38, (110, 110, 115), r'C:\Windows\Fonts\segoeui.ttf', -0.01)
    texto(d, (524, 380), 'desde el móvil.', 38, (110, 110, 115), r'C:\Windows\Fonts\segoeui.ttf', -0.01)
    hechos.append(guardar(og, KIT, 'og-1200x630.png', rgb=True))
    hechos.append(guardar(og, ICONOS, 'og-1200x630.png', rgb=True))

    # Estado de WhatsApp / historia de Instagram: 1080x1920
    st = degradado(1080, 1920, (255, 255, 255), BALDOSA_ARRIBA).convert('RGBA')
    st.alpha_composite(con_sombra(redondeado(460), (1080, 900)), (0, 420))
    d = ImageDraw.Draw(st)
    w = ancho_texto('RservasRoma', 104)
    texto(d, ((1080 - w) / 2, 1320), 'RservasRoma', 104, TINTA)
    sub = 'Tu agenda, siempre lista.'
    w = ancho_texto(sub, 46, r'C:\Windows\Fonts\segoeui.ttf', -0.01)
    texto(d, ((1080 - w) / 2, 1470), sub, 46, (110, 110, 115), r'C:\Windows\Fonts\segoeui.ttf', -0.01)
    hechos.append(guardar(st, KIT, 'redes-historia-1080x1920.png', rgb=True))

    print(f'{len(hechos)} archivos. Escala del simbolo: {ESCALA:.3f} (cara {ESCALA_CARA:.3f})')


if __name__ == '__main__':
    main()
