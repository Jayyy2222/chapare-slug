"""La barra espaciadora del cartel de "mareado" (Jugador.aturdirJugador) a
partir de assets/mecanicas/espacio/espacio.webp: se recorta la tecla (arriba
de la marca de agua de abajo) y el blanco de afuera queda transparente
(rellenando desde los bordes: la cara blanca de la tecla, encerrada por su
contorno, no se toca).

Guarda assets/mecanicas/espacio/espacio_tecla.png.

Uso (desde la raíz del proyecto):  python3 herramientas/mecanica_espacio.py
"""
from PIL import Image

ORIGEN = 'assets/mecanicas/espacio/espacio.webp'
DESTINO = 'assets/mecanicas/espacio/espacio_tecla.png'
RECORTE = (0, 0, 728, 240)  # la marca de agua está más abajo (y ~265)


def main():
    img = Image.open(ORIGEN).convert('RGB').crop(RECORTE)
    w, h = img.size
    px = img.load()
    blanco = lambda p: min(p) > 235
    fondo = set()
    pila = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while pila:
        x, y = pila.pop()
        if (x, y) in fondo or not (0 <= x < w and 0 <= y < h) or not blanco(px[x, y]):
            continue
        fondo.add((x, y))
        pila += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    salida = img.convert('RGBA')
    for x, y in fondo:
        salida.putpixel((x, y), (0, 0, 0, 0))
    salida = salida.crop(salida.getbbox())
    salida.save(DESTINO)
    print(f'{DESTINO}: {salida.size[0]}x{salida.size[1]}')


if __name__ == '__main__':
    main()
