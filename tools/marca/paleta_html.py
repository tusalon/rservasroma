# Guia visual de la paleta: design/marca/paleta/paleta-publicitaria.html (una sola pagina, sin
# archivos externos: los simbolos van dentro como imagenes SVG).
#   python tools/marca/paleta_html.py
import os
import base64

from paleta import SALIDA, RAIZ, construir_datos, contraste, hex_rgb

VECTOR = os.path.join(RAIZ, 'design', 'marca', 'vector')

CSS = """
:root { color-scheme: light; --tinta: #1D1D1F; --gris: #6E6E73; --linea: #E5E2E0; --fondo: #FBFBFD; --nacar: #FFFAF7;
  --rosa: #FB6095; --profundo: #CF2D5E; --velo: #FFF3F6;
  --sans: -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif; --mono: ui-monospace, "SF Mono", Consolas, monospace; }
* { box-sizing: border-box; }
body { margin: 0; padding: 40px 20px 96px; background: var(--fondo); color: var(--tinta); font: 400 16px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
main { max-width: 1040px; margin: 0 auto; display: grid; gap: 72px; }
h1 { font-size: clamp(32px, 6vw, 52px); line-height: 1.04; letter-spacing: -.03em; margin: 0 0 12px; text-wrap: balance; }
h2 { font-size: clamp(24px, 4vw, 32px); letter-spacing: -.02em; margin: 0 0 6px; text-wrap: balance; }
p { margin: 0; color: var(--gris); max-width: 64ch; }
section { display: grid; gap: 22px; }
.etiqueta { font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--profundo); }
.mono, code { font-family: var(--mono); font-size: .88em; }
.base { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.color { border: 1px solid var(--linea); border-radius: 18px; background: #fff; overflow: hidden; display: grid; }
.muestra { height: 104px; display: flex; align-items: flex-end; padding: 10px 14px; font: 600 13px var(--sans); }
.color .datos { padding: 12px 14px 14px; display: grid; gap: 2px; }
.color strong { font-size: 15px; }
.color small { color: var(--gris); font-size: 13px; line-height: 1.35; }
.copiar { justify-self: start; margin-top: 6px; min-height: 36px; padding: 0 12px; border: 1px solid var(--linea); border-radius: 10px; background: #fff; font: 600 13px var(--mono); cursor: pointer; color: var(--tinta); }
.copiar:focus-visible { outline: 3px solid var(--rosa); outline-offset: 2px; }
.escala { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); border-radius: 18px; overflow: hidden; border: 1px solid var(--linea); }
.paso { min-height: 138px; padding: 10px 8px; display: flex; flex-direction: column; justify-content: space-between; font-size: 12px; font-variant-numeric: tabular-nums; }
.paso b { font-size: 14px; }
.degradados { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
.deg { border-radius: 20px; min-height: 170px; padding: 16px; display: flex; flex-direction: column; justify-content: flex-end; border: 1px solid var(--linea); }
.deg b { font-size: 16px; }
.deg span { font-size: 13px; }
.anuncios { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.anuncio { display: grid; gap: 10px; }
.lienzo { aspect-ratio: 1; border-radius: 22px; padding: 7%; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--linea); overflow: hidden; }
.lienzo img { width: 34%; height: auto; display: block; }
.lienzo h3 { margin: 0; font-size: clamp(20px, 3vw, 26px); line-height: 1.1; letter-spacing: -.02em; text-wrap: balance; }
.boton { align-self: flex-start; padding: 10px 18px; border-radius: 999px; font: 700 14px var(--sans); }
.anuncio figcaption { font-size: 13px; color: var(--gris); font-variant-numeric: tabular-nums; }
.anuncio figcaption b { color: var(--tinta); display: block; font-size: 15px; }
.reglas { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; max-width: 70ch; }
.reglas li { padding: 14px 16px; border-radius: 14px; background: #fff; border: 1px solid var(--linea); font-size: 15px; }
.reglas b { color: var(--profundo); }
.tabla { overflow-x: auto; border: 1px solid var(--linea); border-radius: 18px; background: #fff; }
table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 14px; }
th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--linea); vertical-align: top; }
th { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--gris); background: var(--fondo); }
tr:last-child td { border-bottom: 0; }
td:first-child { font-family: var(--mono); font-size: 13px; white-space: nowrap; }
@media (max-width: 720px) { body { padding-top: 24px; } main { gap: 56px; } .escala { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
"""

JS = """
document.querySelectorAll('.copiar').forEach(function (b) {
  b.addEventListener('click', function () {
    var t = b.dataset.hex, ok = function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = t; }, 1200); };
    try { navigator.clipboard.writeText(t).then(ok, function () {}); } catch (e) {}
  });
});
"""


def simbolo_uri(relleno):
    svg = open(os.path.join(VECTOR, 'rservasroma-simbolo-rosa.svg'), encoding='utf-8').read().replace('#FB6095', relleno)
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode()


def texto_sobre(hexa):
    return '#1D1D1F' if contraste(hex_rgb(hexa), hex_rgb('#1D1D1F')) >= contraste(hex_rgb(hexa), (255, 255, 255)) else '#FFFFFF'


def num(v):
    return f'{v:.1f}'.replace('.', ',')


def aa(c):
    return f'{num(c)}:1' + (' · AA' if c >= 4.5 else (' · solo texto grande' if c >= 3 else ' · no pasa'))


def construir():
    d = construir_datos()
    base = ''
    for c in d['base']:
        tc = texto_sobre(c['hex'])
        base += (f'<div class="color"><div class="muestra" style="background:{c["hex"]};color:{tc}">{c["nombre"]}</div>'
                 f'<div class="datos"><strong>{c["nombre"]}</strong><small class="mono">RGB {c["rgb"][0]} {c["rgb"][1]} {c["rgb"][2]} · HSL {c["hsl"][0]}° {c["hsl"][1]}% {c["hsl"][2]}%</small>'
                 f'<small>{c["uso"]}</small><button class="copiar" type="button" data-hex="{c["hex"]}" aria-label="Copiar {c["nombre"]} {c["hex"]}">{c["hex"]}</button></div></div>')

    escala = ''
    for c in d['escala_rosa']:
        tc = texto_sobre(c['hex'])
        cb = contraste(hex_rgb(c['hex']), (255, 255, 255))
        ct = contraste(hex_rgb(c['hex']), hex_rgb('#1D1D1F'))
        escala += (f'<div class="paso" style="background:{c["hex"]};color:{tc}"><b>{c["id"][5:]}</b>'
                   f'<span class="mono">{c["hex"]}</span><span>blanco {num(cb)}</span><span>tinta {num(ct)}</span></div>')

    deg_nota = {
        'amanecer': 'Texto en Tinta: 6,9:1 y 5,8:1 en los dos primeros tercios, 3,9:1 en la esquina oscura (solo texto grande). El blanco no pasa en casi toda la franja.',
        'nacar': 'Texto en Tinta (16,2:1) o en Rosa profundo (4,8:1).',
        'noche': 'Texto en Nácar (más de 15:1) y Rosa claro como acento.',
    }
    degradados = ''
    for g in d['degradados']:
        tc = '#FFFAF7' if g['id'] == 'noche' else '#1D1D1F'
        degradados += f'<div class="deg" style="background:{g["css"]};color:{tc}"><b>{g["nombre"]}</b><span>{deg_nota[g["id"]]}</span></div>'

    titulos = {'Clásico nácar': ('Reserva tu turno online', 'Reservar', '#FB6095', 'rosa'),
               'Rosa pleno': ('Reserva tu turno online', 'Reservar', '#FFFFFF', 'blanco'),
               'Rosa profundo': ('Reserva tu turno online', 'Reservar', '#FFFFFF', 'blanco'),
               'Noche': ('Reserva tu turno online', 'Reservar', '#FFFFFF', 'blanco'),
               'Velo rosa': ('Reserva tu turno online', 'Reservar', '#FB6095', 'rosa')}
    anuncios = ''
    for p in d['combinaciones']:
        _, _, simb, _ = titulos[p['nombre']]
        boton_fondo = p['acento']
        boton_texto = '#FFFFFF' if p['nombre'] in ('Clásico nácar', 'Velo rosa') else (p['fondo'] if p['nombre'] != 'Noche' else '#1D1D1F')
        if p['nombre'] == 'Rosa profundo':
            boton_fondo, boton_texto = '#FFFAF7', '#CF2D5E'
        anuncios += (f'<figure class="anuncio" style="margin:0"><div class="lienzo" style="background:{p["fondo"]};color:{p["texto"]}">'
                     f'<img src="{simbolo_uri(simb)}" alt="Roma, la pug">'
                     f'<h3>{titulos[p["nombre"]][0]}</h3>'
                     f'<span class="boton" style="background:{boton_fondo};color:{boton_texto}">{titulos[p["nombre"]][1]}</span></div>'
                     f'<figcaption><b>{p["nombre"]}</b>Texto {aa(p["contraste_texto"])}<br>Acento {aa(p["contraste_acento"])}<br>{p["uso"]}</figcaption></figure>')

    k = d['contrastes_clave']
    reglas = [
        f'<b>Texto blanco solo sobre Rosa profundo o más oscuro.</b> Sobre Rosa Roma el blanco da {num(k["blanco_sobre_rosa_roma"])}:1 y no pasa; ahí el texto va en Tinta ({num(k["tinta_sobre_rosa_roma"])}:1).',
        f'<b>No uses el fucsia #FF1493 de la app en anuncios con texto blanco.</b> Da {num(k["blanco_sobre_fucsia_app"])}:1. El Rosa profundo da {num(k["blanco_sobre_rosa_profundo"])}:1.',
        '<b>Verde, naranja, rojo y azul son de la app</b> (ganancias, avisos, errores). No se usan en anuncios.',
        '<b>El símbolo en relieve vive sobre Nácar.</b> Sobre otros fondos, usa el símbolo plano en rosa, blanco o negro.',
    ]
    reglas_html = ''.join(f'<li>{r}</li>' for r in reglas)

    archivos = [
        ('rservasroma.ase', 'Illustrator, Photoshop, InDesign y Affinity: Ventana → Muestras → importar. Trae 2 grupos: Marca y Escala rosa.'),
        ('rservasroma.gpl', 'GIMP, Inkscape y Krita: copiar a la carpeta de paletas del programa.'),
        ('paleta.css', 'Web y apps: variables <code>--rosa-roma</code>, <code>--rosa-500</code>, degradados.'),
        ('paleta.json', 'Para programas y scripts: colores, escala, degradados y combinaciones con su contraste.'),
        ('paleta.png', 'Hoja de muestras para compartir. En Canva: pega los códigos hex en el Kit de marca.'),
    ]
    filas = ''.join(f'<tr><td>{n}</td><td>{u}</td></tr>' for n, u in archivos)

    html = f"""<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paleta publicitaria RservasRoma</title>
<style>{CSS}</style>
<main>
  <header>
    <span class="etiqueta">Identidad visual · octubre 2026</span>
    <h1>Paleta publicitaria</h1>
    <p>Los colores base se midieron sobre el logo, no se inventaron. La escala rosa se calcula a partir de ellos y cada combinación lleva su contraste calculado.</p>
  </header>

  <section>
    <div><h2>Colores de marca</h2><p>Toca el código para copiarlo.</p></div>
    <div class="base">{base}</div>
  </section>

  <section>
    <div><h2>Escala rosa</h2><p>Diez pasos desde el Rosa Roma (500). Debajo de cada paso, el contraste con blanco y con Tinta.</p></div>
    <div class="escala">{escala}</div>
  </section>

  <section>
    <div><h2>Degradados</h2></div>
    <div class="degradados">{degradados}</div>
  </section>

  <section>
    <div><h2>Combinaciones para anuncios</h2><p>Cada tarjeta es una combinación real. «AA» significa que el contraste llega a 4,5:1, el mínimo para texto normal.</p></div>
    <div class="anuncios">{anuncios}</div>
  </section>

  <section>
    <div><h2>Reglas</h2></div>
    <ul class="reglas">{reglas_html}</ul>
  </section>

  <section>
    <div><h2>Archivos</h2><p>En <code>design/marca/paleta/</code>.</p></div>
    <div class="tabla"><table><thead><tr><th>Archivo</th><th>Para qué</th></tr></thead><tbody>{filas}</tbody></table></div>
  </section>
</main>
<script>{JS}</script>
</html>
"""
    ruta = os.path.join(SALIDA, 'paleta-publicitaria.html')
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print(f'{os.path.getsize(ruta) / 1024:.0f} KB  {os.path.relpath(ruta, RAIZ)}')


if __name__ == '__main__':
    construir()
