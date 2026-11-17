"""Recorta las piezas del logo de assets/menu/titulo2.jpeg (fondo magenta) para
la intro animada del menú (src/scenes/Menu.js).

Busca las manchas grandes de píxeles opacos, las ordena por posición y guarda
cada una como PNG transparente en assets/menu/logo/:
condor, montana, bolivia, slug, aguayo, polvo1, polvo2, polvo3.

titulo2.jpeg trae las piezas sueltas; titulo1.jpeg es el logo armado y sirve
de referencia para las posiciones (LOGO_PIEZAS en Menu.js).

Uso (desde la raíz del proyecto):  python3 herramientas/logo_piezas.py
"""
import os

from PIL import Image

from recorte_sprites import componentes, quitar_fondo, sin_tinte_magenta

ORIGEN = 'assets/menu/titulo2.jpeg'
DESTINO = 'assets/menu/logo/'
MINIMO = 1500   # píxeles: las manchas más chicas son motas de polvo sueltas
MARGEN = 12     # alrededor de las nubes de polvo, para incluir sus motas

# Centro aproximado (x, y) de cada pieza en titulo2.jpeg: se le asigna a cada
# nombre la mancha cuyo centro quede más cerca.
CENTROS = {
    'condor': (370, 170),
    'montana': (1010, 135),
    'bolivia': (345, 410),
    'slug': (1020, 375),
    'aguayo': (335, 620),
    'polvo1': (745, 635),
    'polvo2': (970, 630),
    'polvo3': (1235, 615),
}


def main():
    img = sin_tinte_magenta(quitar_fondo(Image.open(ORIGEN)))
    grandes, _ = componentes(img, MINIMO)
    os.makedirs(DESTINO, exist_ok=True)
    for nombre, (cx, cy) in CENTROS.items():
        def distancia(mancha):
            x0, y0, x1, y1 = mancha[1]
            return ((x0 + x1) / 2 - cx) ** 2 + ((y0 + y1) / 2 - cy) ** 2
        _, (x0, y0, x1, y1), pixeles = min(grandes, key=distancia)
        if nombre.startswith('polvo'):
            # Las nubes se llevan las motas sueltas de alrededor.
            caja = (max(0, x0 - MARGEN), max(0, y0 - MARGEN),
                    min(img.width, x1 + MARGEN), min(img.height, y1 + MARGEN))
            pieza = img.crop(caja)
        else:
            # El resto, solo su mancha (sin restos de las piezas vecinas).
            pieza = Image.new('RGBA', img.size)
            fuente, px = img.load(), pieza.load()
            for x, y in pixeles:
                px[x, y] = fuente[x, y]
            pieza = pieza.crop((x0, y0, x1, y1))
        pieza = pieza.crop(pieza.getbbox())
        pieza.save(DESTINO + nombre + '.png')
        print(nombre, pieza.size)


if __name__ == '__main__':
    main()
