# Arma la guia de identidad (design/marca/identidad.html) desde la plantilla.
#   python tools/marca/construir_identidad.py [salida-autocontenida.html]
# Con un argumento, ademas escribe una copia con las imagenes dentro (data URI),
# para compartirla como una sola pagina.
import base64
import io
import os
import sys
from PIL import Image, ImageDraw

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KIT = os.path.join(RAIZ, 'design', 'marca')
ICONOS = os.path.join(RAIZ, 'icons')
RES = os.path.join(ICONOS, 'android', 'res', 'mipmap-xxxhdpi')


def vista_android():
    # Como recortan el icono adaptable distintos fabricantes, mas el tematico.
    bg = Image.open(os.path.join(RES, 'ic_launcher_background.png')).convert('RGBA')
    fg = Image.open(os.path.join(RES, 'ic_launcher_foreground.png'))
    mono = Image.open(os.path.join(RES, 'ic_launcher_monochrome.png'))
    lado = bg.width
    v = round(lado * 72 / 108)
    o = (lado - v) // 2
    visible = Image.alpha_composite(bg, fg).crop((o, o, o + v, o + v))
    tema = Image.new('RGBA', (v, v), (59, 50, 72, 255))
    tema.paste(Image.new('RGBA', (v, v), (243, 205, 228, 255)), (0, 0), mono.crop((o, o, o + v, o + v)))

    s = 240

    def mascara(tipo):
        m = Image.new('L', (s * 4, s * 4), 0)
        d = ImageDraw.Draw(m)
        e = s * 4 - 1
        if tipo == 'circulo':
            d.ellipse((0, 0, e, e), fill=255)
        elif tipo == 'squircle':
            d.rounded_rectangle((0, 0, e, e), radius=s * 4 * 0.24, fill=255)
        else:
            d.rounded_rectangle((0, 0, e, e), radius=s * 2, fill=255)
            d.rectangle((s * 2, s * 2, e, e), fill=255)
        return m.resize((s, s), Image.LANCZOS)

    hueco = 40
    out = Image.new('RGBA', (s * 4 + hueco * 3, s), (0, 0, 0, 0))
    for i, (img, tipo) in enumerate([(visible, 'circulo'), (visible, 'squircle'), (visible, 'gota'), (tema, 'circulo')]):
        out.paste(img.resize((s, s), Image.LANCZOS), (i * (s + hueco), 0), mascara(tipo))
    ruta = os.path.join(KIT, 'vista-android.png')
    out.save(ruta, optimize=True)
    return ruta


IMAGENES = {
    'icono': (os.path.join(KIT, 'icono-redondeado-1024.png'), 520),
    'simbolo3d': (os.path.join(KIT, 'simbolo-3d.png'), 420),
    'planoRosa': (os.path.join(KIT, 'simbolo-plano-rosa.png'), 360),
    'planoNegro': (os.path.join(KIT, 'simbolo-plano-negro.png'), 360),
    'planoBlanco': (os.path.join(KIT, 'simbolo-plano-blanco.png'), 360),
    'horizontal': (os.path.join(KIT, 'logo-horizontal.png'), 160),
    'horizontalBlanco': (os.path.join(KIT, 'logo-horizontal-blanco.png'), 160),
    'og': (os.path.join(KIT, 'og-1200x630.png'), 630),
    'historia': (os.path.join(KIT, 'redes-historia-1080x1920.png'), 1100),
    'android': (None, 240),
    'fav16': (os.path.join(ICONOS, 'favicon-16.png'), None),
    'fav32': (os.path.join(ICONOS, 'favicon-32.png'), None),
    'fav48': (os.path.join(ICONOS, 'favicon-48.png'), None),
}


def data_uri(ruta, alto):
    img = Image.open(ruta)
    if alto and img.height > alto:
        img = img.resize((round(img.width * alto / img.height), alto), Image.LANCZOS)
    buf = io.BytesIO()
    if alto is None:  # favicon: tal cual, pixel a pixel
        img.save(buf, 'PNG')
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    img.save(buf, 'WEBP', quality=88, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    IMAGENES['android'] = (vista_android(), 240)
    plantilla = open(os.path.join(os.path.dirname(__file__), 'identidad.plantilla.html'), encoding='utf-8').read()

    # La copia del repo se abre como archivo suelto: necesita su propio esqueleto.
    esqueleto = [
        '<!doctype html>',
        '<html lang="es">',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '',
    ]
    relativo = '\n'.join(esqueleto) + plantilla
    for clave, (ruta, _) in IMAGENES.items():
        relativo = relativo.replace('{{%s}}' % clave, os.path.relpath(ruta, KIT).replace(os.sep, '/'))
    open(os.path.join(KIT, 'identidad.html'), 'w', encoding='utf-8').write(relativo)

    if len(sys.argv) > 1:
        completo = plantilla
        for clave, (ruta, alto) in IMAGENES.items():
            completo = completo.replace('{{%s}}' % clave, data_uri(ruta, alto))
        assert '{{' not in completo
        open(sys.argv[1], 'w', encoding='utf-8').write(completo)
        print(sys.argv[1], round(len(completo) / 1024), 'KB')


if __name__ == '__main__':
    main()
