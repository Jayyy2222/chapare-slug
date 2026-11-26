"""Agranda la cabeza de Manfred en sus hojas (se veía muy chica al lado del
cuerpo, sobre todo agachado). Lo llama manfred_cuerpo.py al final; corre sobre
las hojas ya hechas, así que solo una vez por cada vez que se generan.

Por cuadro: la cabeza es lo opaco de las primeras filas (`DETECTAR`, sin pasar
de la columna `XMAX`: ahí empiezan las manos) hasta la barbilla (`ALTO_CABEZA`
filas desde lo más alto). Se agranda `ESCALA` veces apoyada en la barbilla (el
cuello no se mueve) y lo que está a la derecha de la cara (las manos, el arma)
se vuelve a dibujar encima. Cada hoja se agranda hacia arriba (`ARRIBA` px) para
que la cabeza no se corte, y anchors.json se corre lo mismo.

Uso (desde herramientas/):  python3 manfred_cabeza.py [hoja ...]   (sin nombres: todas)
"""
import json
from pathlib import Path

from PIL import Image

from recorte_sprites import a_pixel_art

CARPETA = Path('../assets/personajes/jugador/manfred')
# hoja: (escala, filas para detectar, columna máxima, alto de la cabeza, px arriba)
# El idle tiene la cabeza dibujada un poco más chica que la del torso: más escala.
HOJAS = {
    'torso_aiming': (1.3, 20, 46, 30, 10),
    'torso_diagonal': (1.3, 9, 40, 29, 10),
    'idle': (1.42, 22, 58, 27, 8),
}
# Disparando arriba mira hacia arriba entre los brazos: la cabeza se marca a
# mano por cuadro (x0, y0, x1, y1 en la celda: la cara entre los brazos) y se agranda así.
CABEZA_ARRIBA = {'nombre': 'torso_arriba', 'escala': 1.3,
                 'cajas': [(21, 29, 39, 53), (22, 31, 40, 55), (21, 32, 40, 54), (22, 32, 41, 54)]}


def agrandar(cuadro, escala, detectar, xmax, alto_cabeza):
    px = cuadro.load()
    w, h = cuadro.size
    top = next(y for y in range(h) if any(px[x, y][3] for x in range(w)))
    xs = [x for y in range(top, top + detectar) for x in range(min(xmax, w)) if px[x, y][3]]
    x0, x1 = max(0, min(xs) - 1), min(w, max(xs) + 2)
    barbilla = top + alto_cabeza
    cabeza = cuadro.crop((x0, top, x1, barbilla))
    grande = a_pixel_art(cabeza, (round(cabeza.width * escala), round(cabeza.height * escala)))
    centro = (x0 + x1) / 2
    salida = cuadro.copy()
    salida.alpha_composite(grande, (round(centro - grande.width / 2), barbilla - grande.height))
    # Las manos y el arma (a la derecha de la cara) quedan delante.
    derecha = cuadro.crop((x1, 0, w, h))
    salida.alpha_composite(derecha, (x1, 0))
    return salida


def agrandar_caja(cuadro, caja, escala):
    """La cabeza de una caja marcada a mano: se agranda apoyada en el borde de
    abajo de la caja y lo de los costados y lo de arriba (brazos y manos) se
    vuelve a dibujar delante."""
    x0, top, x1, barbilla = caja
    cabeza = cuadro.crop(caja)
    grande = a_pixel_art(cabeza, (round(cabeza.width * escala), round(cabeza.height * escala)))
    salida = cuadro.copy()
    salida.alpha_composite(grande, (round((x0 + x1) / 2 - grande.width / 2), barbilla - grande.height))
    w, h = cuadro.size
    for borde in ((0, 0, x0, h), (x1, 0, w, h), (x0, 0, x1, top)):
        salida.alpha_composite(cuadro.crop(borde), borde[:2])
    return salida


def main(solo=None):
    """solo: nombres de hojas (por defecto, todas)."""
    anclas = json.loads((CARPETA / 'anchors.json').read_text())
    for nombre, (escala, detectar, xmax, alto_cabeza, arriba) in HOJAS.items():
        if solo and nombre not in solo:
            continue
        ruta = CARPETA / f'manfred_{nombre}.png'
        hoja = Image.open(ruta).convert('RGBA')
        d = anclas[nombre]
        w, h = d['ancho'], d['alto']
        nueva = Image.new('RGBA', (hoja.width, h + arriba))
        for i in range(len(d['cuadros'])):
            cuadro = Image.new('RGBA', (w, h + arriba))
            cuadro.paste(hoja.crop((i * w, 0, (i + 1) * w, h)), (0, arriba))
            nueva.paste(agrandar(cuadro, escala, detectar, xmax, alto_cabeza), (i * w, 0))
        nueva.save(ruta)
        d['alto'] = h + arriba
        d['ancla'][1] += arriba
        for c in d['cuadros']:
            for k in ('mano', 'pies'):
                if isinstance(c.get(k), list):
                    c[k][1] += arriba
                elif isinstance(c.get(k), (int, float)):
                    c[k] += arriba
        print(nombre, f'cabeza x{escala}', nueva.size)
    A = CABEZA_ARRIBA
    if not solo or A['nombre'] in solo:
        ruta = CARPETA / f'manfred_{A["nombre"]}.png'
        hoja = Image.open(ruta).convert('RGBA')
        d = anclas[A['nombre']]
        w = d['ancho']
        for i in range(len(d['cuadros'])):
            cuadro = hoja.crop((i * w, 0, (i + 1) * w, d['alto']))
            hoja.paste(agrandar_caja(cuadro, A['cajas'][i], A['escala']), (i * w, 0))
        hoja.save(ruta)
        print(A['nombre'], f'cabeza x{A["escala"]}')
    (CARPETA / 'anchors.json').write_text(json.dumps(anclas, indent=1))


if __name__ == '__main__':
    import sys
    main(sys.argv[1:] or None)
