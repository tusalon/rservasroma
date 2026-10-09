# Animacion de entrada del logo. Una sola descripcion de la linea de tiempo (LINEA) genera:
#   - rservasroma-capas.svg      capas con nombre, sin animar (Illustrator, Figma, After Effects)
#   - rservasroma-animado.svg    animado con CSS (se ve en navegador, web y apps)
#   - rservasroma-intro.json     Lottie (apps, web, LottieFiles, After Effects con Bodymovin)
#   - rservasroma-intro.mp4/.gif video y GIF (fondo blanco) para redes
#
#   python tools/marca/animacion.py        (necesita design/marca/vector/capas.json y ffmpeg)
import json
import os
import shutil
import subprocess

import numpy as np
from PIL import Image, ImageDraw

from ver_formas import muestrear

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VECTOR = os.path.join(RAIZ, 'design', 'marca', 'vector')
SALIDA = os.path.join(VECTOR, 'animacion')
FPS = 30
DURACION = 3.0
L = 1024

# Curvas de easing (cubic-bezier de CSS, tambien las usa Lottie)
SUAVE = (0.16, 1.0, 0.3, 1.0)          # frena al final
REBOTE = (0.34, 1.56, 0.64, 1.0)       # se pasa un poco y vuelve
IGUAL = (0.65, 0.0, 0.35, 1.0)         # arranca y frena
LINEAL = (0.0, 0.0, 1.0, 1.0)


def entrada(t0, t1, dy):
    """Aparece subiendo dy px y ganando opacidad."""
    return {'y': [(0, dy, LINEAL), (t0, dy, SUAVE), (t1, 0, None)],
            'o': [(0, 0, LINEAL), (t0, 0, SUAVE), (t0 + (t1 - t0) * 0.55, 1, None)]}


def oreja(signo, retraso):
    t = [0.95 + retraso, 1.10 + retraso, 1.30 + retraso, 1.45 + retraso, 1.62 + retraso]
    return {'r': [(0, 0, LINEAL), (t[0], 0, IGUAL), (t[1], -7 * signo, IGUAL), (t[2], 5 * signo, IGUAL),
                  (t[3], -2 * signo, IGUAL), (t[4], 0, None)]}


def linea_de_tiempo(capas):
    """capa id -> propiedad -> [(tiempo en s, valor, easing hacia la siguiente clave)]"""
    lt = {}
    lt['baldosa'] = {'o': [(0, 0, LINEAL), (0.25, 1, None)],
                     's': [(0, 0.55, REBOTE), (0.6, 1, None)]}
    cara = entrada(0.25, 0.85, 36)
    lt['cabeza'] = dict(cara)
    lt['cara'] = dict(cara)
    for lado, signo in (('izq', 1), ('der', -1)):
        lt[f'oreja-{lado}'] = {**cara, **oreja(signo, 0.0 if lado == 'izq' else 0.07)}
    brillos = [c['id'] for c in capas if c['id'].startswith('brillo-')]
    for i, b in enumerate(brillos):
        t0 = 1.0 + 0.08 * i
        gira = 1.9 + 0.12 * i
        lt[b] = {'y': cara['y'],
                 's': [(0, 0, LINEAL), (t0, 0, REBOTE), (t0 + 0.4, 1, LINEAL), (gira, 1, IGUAL),
                       (gira + 0.15, 0.55, IGUAL), (gira + 0.35, 1, None)]}
    marco = entrada(0.5, 1.05, 48)
    lt['marco'] = marco
    cuadritos = [c['id'] for c in capas if c['id'].startswith('cuadrito-')]
    for i, c in enumerate(cuadritos):
        t0 = 1.1 + 0.07 * i
        lt[c] = {'y': marco['y'], 's': [(0, 0, LINEAL), (t0, 0, REBOTE), (t0 + 0.38, 1, None)]}
    for nombre, vuelta in (('manecilla-hora', -90), ('manecilla-minuto', -720)):
        lt[nombre] = {'o': [(0, 0, LINEAL), (1.55, 0, LINEAL), (1.62, 1, None)],
                      'r': [(0, vuelta, LINEAL), (1.6, vuelta, IGUAL), (2.7, 0, None)]}
    return lt


# ─── Evaluacion (misma curva para SVG, Lottie y video) ────────────────────────────────

def bezier_y(prog, e):
    x1, y1, x2, y2 = e
    lo, hi = 0.0, 1.0
    for _ in range(40):
        u = (lo + hi) / 2
        x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3
        if x < prog:
            lo = u
        else:
            hi = u
    u = (lo + hi) / 2
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3


def valor(claves, t):
    if t <= claves[0][0]:
        return claves[0][1]
    for (t0, v0, e), (t1, v1, _) in zip(claves, claves[1:]):
        if t <= t1:
            if t1 == t0:
                return v1
            return v0 + (v1 - v0) * bezier_y((t - t0) / (t1 - t0), e or LINEAL)
    return claves[-1][1]


def estado(lt_capa, t):
    return {'o': valor(lt_capa['o'], t) if 'o' in lt_capa else 1.0,
            's': valor(lt_capa['s'], t) if 's' in lt_capa else 1.0,
            'r': valor(lt_capa['r'], t) if 'r' in lt_capa else 0.0,
            'y': valor(lt_capa['y'], t) if 'y' in lt_capa else 0.0}


# ─── Geometria ──────────────────────────────────────────────────────────────────────

def n(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def d_capa(capa):
    partes = []
    for c in capa['contornos']:
        for s in c:
            if s[0] == 'M':
                partes.append(f'M{n(s[1][0])} {n(s[1][1])}')
            elif s[0] == 'L':
                partes.append(f'L{n(s[1][0])} {n(s[1][1])}')
            else:
                partes.append(f'C{n(s[1][0])} {n(s[1][1])} {n(s[2][0])} {n(s[2][1])} {n(s[3][0])} {n(s[3][1])}')
        partes.append('Z')
    return ''.join(partes)


# ─── SVG ────────────────────────────────────────────────────────────────────────────

def svg_capas(capas, animado=None):
    css = ''
    cuerpo = ''
    grupo_actual = None
    for c in capas:
        extra = ''
        if animado is not None and c['id'] in animado:
            lt = animado[c['id']]
            anim = []
            px, py = c['pivote']
            for prop, nombre_css, formato in (('o', 'opacity', lambda v: n(v)),
                                              ('y', 'translate', lambda v: f'0px {n(v)}px'),
                                              ('r', 'rotate', lambda v: f'{n(v)}deg'),
                                              ('s', 'scale', lambda v: n(v))):
                if prop not in lt:
                    continue
                kf = f'@keyframes k-{c["id"]}-{prop}{{'
                for (t, v, e) in lt[prop]:
                    ease = f'animation-timing-function:cubic-bezier({",".join(n(x) for x in (e or LINEAL))};' if e else ''
                    kf += f'{n(t / DURACION * 100)}%{{{nombre_css}:{formato(v)};{ease}}}'
                css += kf + '}'
                anim.append(f'k-{c["id"]}-{prop} {n(DURACION)}s linear both')
            css += f'#{c["id"]}{{transform-origin:{n(px)}px {n(py)}px;animation:{",".join(anim)}}}'
        cuerpo += (f'<g id="{c["id"]}" data-name="{c["nombre"]}"><path fill="{c["relleno"]}" fill-rule="evenodd" d="{d_capa(c)}"/></g>\n')
    estilo = ''
    if animado is not None:
        estilo = ('<style>' + css + '@media (prefers-reduced-motion:reduce){g{animation:none!important}}</style>\n')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L} {L}" width="{L}" height="{L}" role="img" aria-label="RservasRoma">\n'
            '<title>RservasRoma</title>\n' + estilo + cuerpo + '</svg>\n')


# ─── Lottie ─────────────────────────────────────────────────────────────────────────

def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def contorno_lottie(contorno):
    v, i, o = [], [], []
    act = None
    for s in contorno:
        if s[0] in ('M', 'L'):
            p = s[1]
            if s[0] == 'M':
                v.append(p); i.append([0, 0]); o.append([0, 0])
            else:
                v.append(p); i.append([0, 0]); o.append([0, 0])
            act = p
        else:
            c1, c2, p = s[1], s[2], s[3]
            o[-1] = [round(c1[0] - act[0], 3), round(c1[1] - act[1], 3)]
            v.append(p)
            i.append([round(c2[0] - p[0], 3), round(c2[1] - p[1], 3)])
            o.append([0, 0])
            act = p
    # El contorno se cierra solo: si termina donde empieza, se funde el ultimo punto con el primero
    if len(v) > 1 and abs(v[-1][0] - v[0][0]) < 0.02 and abs(v[-1][1] - v[0][1]) < 0.02:
        i[0] = i[-1]
        v.pop(); i.pop(); o.pop()
    return {'i': i, 'o': o, 'v': v, 'c': True}


def prop_lottie(claves, mapa, defecto):
    if not claves:
        return {'a': 0, 'k': defecto}
    ks = []
    for idx, (t, v, e) in enumerate(claves):
        k = {'t': round(t * FPS, 2), 's': mapa(v)}
        if idx < len(claves) - 1:
            x1, y1, x2, y2 = e or LINEAL
            k['o'] = {'x': [x1], 'y': [y1]}
            k['i'] = {'x': [x2], 'y': [y2]}
        ks.append(k)
    return {'a': 1, 'k': ks}


def lottie(capas, lt):
    capas_l = []
    total = int(DURACION * FPS)
    for idx, c in enumerate(reversed(capas)):   # Lottie lista primero la capa de arriba
        t = lt.get(c['id'], {})
        px, py = c['pivote']
        formas = [{'ty': 'sh', 'ks': {'a': 0, 'k': contorno_lottie(cc)}, 'nm': f'forma {j + 1}'} for j, cc in enumerate(c['contornos'])]
        formas.append({'ty': 'fl', 'c': {'a': 0, 'k': hex_rgb(c['relleno']) + [1]}, 'o': {'a': 0, 'k': 100}, 'r': 2, 'nm': 'relleno'})
        formas.append({'ty': 'tr', 'p': {'a': 0, 'k': [0, 0]}, 'a': {'a': 0, 'k': [0, 0]}, 's': {'a': 0, 'k': [100, 100]},
                       'r': {'a': 0, 'k': 0}, 'o': {'a': 0, 'k': 100}})
        capas_l.append({
            'ddd': 0, 'ind': idx + 1, 'ty': 4, 'nm': c['nombre'], 'sr': 1,
            'ks': {
                'o': prop_lottie(t.get('o'), lambda v: [round(v * 100, 3)], 100),
                'r': prop_lottie(t.get('r'), lambda v: [round(v, 3)], 0),
                'p': prop_lottie(t.get('y'), lambda v, px=px, py=py: [px, round(py + v, 3), 0], [px, py, 0]),
                'a': {'a': 0, 'k': [px, py, 0]},
                's': prop_lottie(t.get('s'), lambda v: [round(v * 100, 3), round(v * 100, 3), 100], [100, 100, 100]),
            },
            'ao': 0, 'shapes': [{'ty': 'gr', 'it': formas, 'nm': c['nombre']}],
            'ip': 0, 'op': total, 'st': 0, 'bm': 0})
    return {'v': '5.7.4', 'fr': FPS, 'ip': 0, 'op': total, 'w': L, 'h': L, 'nm': 'RservasRoma intro',
            'ddd': 0, 'assets': [], 'layers': capas_l}


# ─── Fotogramas (MP4 / GIF) ────────────────────────────────────────────────────────

def aplanar(capa, pasos=14):
    return [muestrear([[s[0]] + [list(p) for p in s[1:]] for s in c], pasos) for c in capa['contornos']]


def render(capas, lt, t, lado, fondo=(255, 255, 255), zoom=0.84):
    """Un fotograma. zoom < 1 deja margen alrededor del icono (para redes)."""
    ss = 2
    W = lado * ss
    esc = W / L * zoom
    off = (W - L * esc) / 2
    lienzo = np.zeros((W, W, 3), np.float32)
    lienzo[:] = fondo
    for c in capas:
        e = estado(lt.get(c['id'], {}), t)
        if e['o'] <= 0.003 or e['s'] <= 0.003:
            continue
        px, py = c['pivote']
        ang = np.radians(e['r'])
        co, si = np.cos(ang), np.sin(ang)
        mascara = np.zeros((W, W), bool)
        for poly in c['_poly']:
            pts = []
            for x, y in poly:
                dx, dy = (x - px) * e['s'], (y - py) * e['s']
                rx, ry = dx * co - dy * si, dx * si + dy * co
                pts.append(((px + rx) * esc + off, (py + ry + e['y']) * esc + off))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            x0, y0 = max(int(min(xs)) - 2, 0), max(int(min(ys)) - 2, 0)
            x1, y1 = min(int(max(xs)) + 3, W), min(int(max(ys)) + 3, W)
            if x1 <= x0 or y1 <= y0:
                continue
            m = Image.new('1', (x1 - x0, y1 - y0), 0)
            ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in pts], fill=1)
            mascara[y0:y1, x0:x1] ^= np.asarray(m, bool)
        color = np.array([int(c['relleno'][i:i + 2], 16) for i in (1, 3, 5)], np.float32)
        a = (mascara * e['o'])[..., None]
        lienzo = lienzo * (1 - a) + color * a
    return Image.fromarray(np.clip(lienzo, 0, 255).astype(np.uint8)).resize((lado, lado), Image.LANCZOS)


def video(capas, lt, lado=1080):
    for c in capas:
        c['_poly'] = aplanar(c)
    tmp = os.path.join(SALIDA, '_frames')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    total = int(DURACION * FPS)
    for f in range(total + 1):
        render(capas, lt, f / FPS, lado).save(os.path.join(tmp, f'f{f:04d}.png'))
    mp4 = os.path.join(SALIDA, 'rservasroma-intro.mp4')
    gif = os.path.join(SALIDA, 'rservasroma-intro.gif')
    base = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'f%04d.png')]
    # Se repite el ultimo fotograma 1 s para que el logo se quede quieto al final
    mantener = ['-vf', 'tpad=stop_mode=clone:stop_duration=1,format=yuv420p']
    subprocess.run(base + mantener + ['-c:v', 'libx264', '-crf', '16', '-movflags', '+faststart', mp4], check=True)
    pal = os.path.join(tmp, 'pal.png')
    filtro = 'scale=540:540:flags=lanczos,tpad=stop_mode=clone:stop_duration=1'
    subprocess.run(base + ['-vf', filtro + ',palettegen=max_colors=96', pal], check=True)
    subprocess.run(base + ['-i', pal, '-lavfi', filtro + '[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', gif], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    return mp4, gif


def main():
    datos = json.load(open(os.path.join(VECTOR, 'capas.json'), encoding='utf-8'))
    capas = datos['capas']
    lt = linea_de_tiempo(capas)
    os.makedirs(SALIDA, exist_ok=True)
    salidas = []

    def guardar(nombre, texto):
        ruta = os.path.join(SALIDA, nombre)
        with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
            f.write(texto)
        salidas.append(ruta)

    guardar('rservasroma-capas.svg', svg_capas(capas))
    guardar('rservasroma-animado.svg', svg_capas(capas, lt))
    guardar('rservasroma-intro.json', json.dumps(lottie(capas, lt), separators=(',', ':')))
    salidas.extend(video(capas, lt))
    for r in salidas:
        print(f'{os.path.getsize(r) / 1024:8.1f} KB  {os.path.relpath(r, RAIZ)}')


if __name__ == '__main__':
    main()
