"""Capas del fondo de la cinemática de Manfred (Cinematica.js) a partir de
assets/personajes/jugador/manfred/cielo2.jpeg: una hoja con 5 franjas
separadas por magenta (de arriba a abajo):
  1  cielo del atardecer con nubes finas   -> cine_nubes_finas.png (bordes difuminados)
  2  cerros con neblina                    -> cine_cerros.png (arriba se funde con el cielo)
  3  nubes grandes (pegadas entre sí)      -> cine_nubes_grandes.png (franja repetible)
  4  selva con río                         -> cine_selva.png
  5  nubes suaves                          -> cine_nube_suave_<i>.png
El cielo de fondo es cielo.jpeg tal cual. Las franjas que se repiten de
costado (1, 2, 3 y 4) se funden en las puntas para que no se vea la costura.
Guarda todo en assets/personajes/jugador/manfred/cine/ con cine.json (cuántas
nubes de cada tipo).

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/cielo_cinematica.py
"""
import json
from pathlib import Path

from PIL import Image

from recorte_sprites import por_manchas, quitar_fondo, sin_tinte_magenta

CARPETA = Path('assets/personajes/jugador/manfred')
SALIDA = CARPETA / 'cine'
FRANJAS = {'finas': (12, 174), 'cerros': (194, 354), 'grandes': (354, 540), 'selva': (540, 716), 'suaves': (718, 896)}
COSTURA = 120     # px de las puntas que se funden (franjas repetibles)
FUNDIR_ARRIBA = {'cerros': 0.35, 'finas': 0.3}   # fracción de arriba que pasa de transparente a opaco
FUNDIR_ABAJO = {'finas': 0.3}


def sin_costura(img):
    """Funde las últimas COSTURA columnas con las primeras y las recorta: al
    repetir la imagen, el final empalma con el principio."""
    w, h = img.size
    salida = img.crop((0, 0, w - COSTURA, h))
    for x in range(COSTURA):
        t = x / COSTURA                       # 0: todo el final; 1: todo el principio
        fin = img.crop((w - COSTURA + x, 0, w - COSTURA + x + 1, h))
        ini = img.crop((x, 0, x + 1, h))
        salida.paste(Image.blend(fin, ini, t), (x, 0))
    return salida


def fundir(img, arriba=0.0, abajo=0.0):
    """Alfa en rampa en la franja de arriba y la de abajo."""
    w, h = img.size
    alfa = img.getchannel('A')
    px = alfa.load()
    for y in range(h):
        f = 1.0
        if arriba and y < h * arriba:
            f = y / (h * arriba)
        if abajo and y > h * (1 - abajo):
            f = min(f, (h - y) / (h * abajo))
        for x in range(w):
            px[x, y] = round(px[x, y] * f)
    img.putalpha(alfa)
    return img


def main():
    SALIDA.mkdir(exist_ok=True)
    hoja = Image.open(CARPETA / 'cielo2.jpeg')
    franja = {n: sin_tinte_magenta(quitar_fondo(hoja.crop((0, y0, hoja.width, y1)))) for n, (y0, y1) in FRANJAS.items()}
    nombres = {'finas': 'nubes_finas', 'grandes': 'nubes_grandes', 'cerros': 'cerros', 'selva': 'selva'}
    for nombre in nombres:
        img = franja[nombre]
        caja = img.getbbox()
        img = img.crop((0, caja[1], img.width, caja[3]))
        img = fundir(sin_costura(img), FUNDIR_ARRIBA.get(nombre, 0), FUNDIR_ABAJO.get(nombre, 0))
        img.save(SALIDA / f'cine_{nombres[nombre]}.png')
    nubes = por_manchas(franja['suaves'], 3000, lejos=25)
    for i, nube in enumerate(nubes):
        nube.save(SALIDA / f'cine_nube_suave_{i}.png')
    datos = {'nubesSuaves': len(nubes)}
    (SALIDA / 'cine.json').write_text(json.dumps(datos, indent=1))
    print(datos)


if __name__ == '__main__':
    main()
