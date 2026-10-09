# Escribe design/marca/vector/animacion/vista-previa.html: el SVG animado, el Lottie, el
# video y el GIF lado a lado, con un boton para repetir. El Lottie va dentro de la pagina
# (asi se abre con doble clic). Solo la libreria lottie-web se baja de internet.
#   python tools/marca/vista_previa.py
import json
import os

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CARPETA = os.path.join(RAIZ, 'design', 'marca', 'vector', 'animacion')

PLANTILLA = """<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Animación del logo · RservasRoma</title>
<style>
  :root { color-scheme: light; --rosa: #CF2D5E; --nacar: #FFFAF7; --tinta: #1D1D1F; --gris: #6E6E73; --linea: #E5E2E0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px 64px; background: #FBFBFD; color: var(--tinta); font: 16px/1.5 -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; }
  h1 { font-size: clamp(28px, 5vw, 40px); letter-spacing: -.02em; margin: 0 0 6px; }
  p { margin: 0; color: var(--gris); }
  .barra { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 20px 0 24px; }
  button { min-height: 44px; padding: 0 20px; border: 0; border-radius: 12px; background: var(--rosa); color: #fff; font: 600 15px system-ui; cursor: pointer; }
  button:focus-visible { outline: 3px solid #FE7AAB; outline-offset: 2px; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  figure { margin: 0; display: grid; gap: 8px; }
  .caja { aspect-ratio: 1; border: 1px solid var(--linea); border-radius: 20px; background: #fff; overflow: hidden; display: grid; place-items: center; }
  .caja > * { width: 100%; height: 100%; object-fit: contain; display: block; }
  figcaption { font-size: 14px; color: var(--gris); }
  figcaption b { color: var(--tinta); font-weight: 600; display: block; }
  .aviso { margin-top: 24px; font-size: 14px; }
</style>
<main>
  <h1>Animación del logo</h1>
  <p>La misma línea de tiempo en cuatro formatos. Dura 3 segundos y el reloj termina en las 3:00.</p>
  <div class="barra"><button id="repetir" type="button">Repetir</button></div>
  <div class="rejilla">
    <figure><div class="caja"><img id="svg" src="rservasroma-animado.svg" alt="Logo animado en SVG"></div>
      <figcaption><b>SVG animado</b>Para web y apps. Sin librerías.</figcaption></figure>
    <figure><div class="caja" id="lottie" role="img" aria-label="Logo animado en Lottie"></div>
      <figcaption><b>Lottie (.json)</b>Para apps, LottieFiles y After Effects.</figcaption></figure>
    <figure><div class="caja"><video id="mp4" src="rservasroma-intro.mp4" muted playsinline autoplay loop></video></div>
      <figcaption><b>Vídeo (.mp4)</b>1080 × 1080, para redes.</figcaption></figure>
    <figure><div class="caja"><img id="gif" src="rservasroma-intro.gif" alt="Logo animado en GIF"></div>
      <figcaption><b>GIF</b>540 × 540, para WhatsApp y correo.</figcaption></figure>
  </div>
  <p class="aviso">El Lottie usa la librería lottie-web desde internet. Los demás formatos funcionan sin conexión.</p>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<script>
  const datos = __LOTTIE__;
  let anim = null;
  function lanzar() {
    if (window.lottie) {
      if (anim) anim.destroy();
      anim = lottie.loadAnimation({ container: document.getElementById('lottie'), renderer: 'svg', loop: false, autoplay: true, animationData: datos });
    }
  }
  function repetir() {
    // Cambiar el src reinicia las animaciones CSS del SVG y del GIF
    const t = '?r=' + Date.now();
    document.getElementById('svg').src = 'rservasroma-animado.svg' + t;
    document.getElementById('gif').src = 'rservasroma-intro.gif' + t;
    const v = document.getElementById('mp4'); v.currentTime = 0; v.play();
    lanzar();
  }
  document.getElementById('repetir').addEventListener('click', repetir);
  lanzar();
</script>
</html>
"""


def main():
    datos = open(os.path.join(CARPETA, 'rservasroma-intro.json'), encoding='utf-8').read()
    html = PLANTILLA.replace('__LOTTIE__', datos)
    ruta = os.path.join(CARPETA, 'vista-previa.html')
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print(f'{os.path.getsize(ruta) / 1024:.0f} KB  {os.path.relpath(ruta, RAIZ)}')


if __name__ == '__main__':
    main()
