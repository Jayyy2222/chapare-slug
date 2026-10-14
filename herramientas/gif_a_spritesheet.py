"""Convierte un GIF animado en un spritesheet PNG horizontal (Phaser no anima GIFs).

Uso (desde la raíz del proyecto):
  python3 herramientas/gif_a_spritesheet.py assets/personajes/jugador/1.gif
Guarda <nombre>_sheet.png junto al GIF e imprime el tamaño de cada cuadro.
"""
import sys

from PIL import Image, ImageSequence


def main(ruta):
    gif = Image.open(ruta)
    cuadros = [c.convert('RGBA') for c in ImageSequence.Iterator(gif)]
    ancho, alto = cuadros[0].size
    hoja = Image.new('RGBA', (ancho * len(cuadros), alto))
    for i, cuadro in enumerate(cuadros):
        hoja.paste(cuadro, (i * ancho, 0))
    salida = ruta.rsplit('.', 1)[0] + '_sheet.png'
    hoja.save(salida)
    print(f'{salida}: {len(cuadros)} cuadros de {ancho}x{alto}')


if __name__ == '__main__':
    main(sys.argv[1])
