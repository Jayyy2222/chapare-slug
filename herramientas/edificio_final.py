"""Limpia el edificio del final del nivel (assets/fondos/final/edif_final.jpeg)
para usarlo como prop de Nivel1.

Quita el fondo magenta (y el tinte rosado de los bordes finos), la franja
oscura de arriba y la franja de arena de abajo (en el nivel el edificio se
apoya en el suelo del mapa) y recorta lo que sobra. Guarda assets/fondos/final/edif_final.png; las medidas de la
puerta para PROPS en Nivel1.js están en píxeles de esa imagen.

Uso (desde la raíz del proyecto):  python3 herramientas/edificio_final.py
"""
from PIL import Image

from recorte_sprites import quitar_fondo, sin_polvo, sin_tinte_magenta

CARPETA = 'assets/fondos/final/'
FRANJA_ARRIBA = 12
ARENA = 0.9   # una fila más llena que esto (fracción del ancho) ya es la arena


def main():
    img = quitar_fondo(Image.open(CARPETA + 'edif_final.jpeg'))
    img = img.crop((0, FRANJA_ARRIBA, img.width, img.height))
    alfa = img.getchannel('A').load()
    for y in range(img.height // 2, img.height):
        if sum(1 for x in range(img.width) if alfa[x, y]) > img.width * ARENA:
            img = img.crop((0, 0, img.width, y))
            break
    caja = img.getbbox()
    img = sin_tinte_magenta(sin_polvo(img.crop(caja), 0.01))  # restos sueltos y bordes rosados del JPEG
    img.save(CARPETA + 'edif_final.png')
    print(f'edif_final.png: {img.width}x{img.height}')


if __name__ == '__main__':
    main()
