"""Convierte assets/panel/vida.png (las barras de salud, una por fila, sobre
fondo blanco) en assets/panel/vida_sheet.png: una fila de celdas iguales, de
la vida llena a media barra, de a media barra (la hamburguesa cura media):
4, 3½, 3, 2½, 2, 1½, 1 y ½ (cuadros 0 a 7), con el fondo transparente.

vida.png trae 6 filas: 4, 3 y media, 3, 3 (repetida), 2 y 1 barras. Se toman
las de barras enteras (FILAS) y las medias se arman: la de N barras con la
mitad derecha de la última casilla en gris (el gris de una casilla vacía de
la de 1 barra), así todas tienen el mismo dibujo.

El fondo se borra desde los bordes: el blanco y también los grises que el
suavizado deja entre el blanco y el contorno negro (si no, queda una línea
clara alrededor). Lo gris que quede pegado al borde pasa a negro, como el
contorno. Debajo va una sombra (SOMBRA) para que se lea sobre cualquier fondo.

Uso (desde la raíz del proyecto):  python3 herramientas/vida_panel.py
"""
from collections import deque

from PIL import Image

ENTRADA = 'assets/panel/vida.png'
SALIDA = 'assets/panel/vida_sheet.png'
FILAS = [0, 2, 4, 5]
MARGEN = 10
PASADAS = 8          # capas de gris que se sacan, como mucho
SOMBRA = (6, 6, 150)  # desplazamiento x, y y opacidad de la sombra


def es_gris(p, minimo):
    return min(p[:3]) > minimo and max(p[:3]) - min(p[:3]) < 40


def es_blanco(p):
    return es_gris(p, 200)


def borde(img, condicion):
    """Píxeles opacos que tocan lo transparente (o el borde) y cumplen la condición."""
    px = img.load()
    ancho, alto = img.size
    return [(x, y) for y in range(alto) for x in range(ancho)
            if px[x, y][3] and condicion(px[x, y]) and any(
                not (0 <= x + dx < ancho and 0 <= y + dy < alto) or not px[x + dx, y + dy][3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]


def limpiar_borde(img):
    """Saca de a una capa la franja gris que el suavizado dejó por fuera del
    contorno negro (solo lo que toca lo transparente: el gris de las barras
    vacías está adentro del contorno y no se toca). Lo gris que queda pegado
    al borde pasa a negro, como el contorno."""
    px = img.load()
    for _ in range(PASADAS):
        capa = borde(img, lambda p: es_gris(p, 45))
        if not capa:
            break
        for x, y in capa:
            px[x, y] = (0, 0, 0, 0)
    for x, y in borde(img, lambda p: es_gris(p, 0)):
        px[x, y] = (0, 0, 0, 255)
    return img


def sin_fondo(img):
    """El blanco conectado con el borde pasa a transparente (los brillos de
    adentro de las barras no se tocan)."""
    img = img.convert('RGBA')
    px = img.load()
    ancho, alto = img.size
    cola = deque((x, y) for x in range(ancho) for y in (0, alto - 1))
    cola.extend((x, y) for y in range(alto) for x in (0, ancho - 1))
    visto = set()
    while cola:
        x, y = cola.popleft()
        if (x, y) in visto or not (0 <= x < ancho and 0 <= y < alto) or not es_blanco(px[x, y]):
            continue
        visto.add((x, y))
        px[x, y] = (0, 0, 0, 0)
        cola.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return img


def casillas(cuadro):
    """Tramos en x de las casillas de la barra (a media altura): lo que no es
    contorno negro, sin el corazón (el primer tramo)."""
    px = cuadro.load()
    y = cuadro.height // 2
    tramos, inicio = [], None
    for x in range(cuadro.width + 1):
        color = x < cuadro.width and px[x, y][3] and max(px[x, y][:3]) >= 40
        if color and inicio is None:
            inicio = x
        if not color and inicio is not None:
            if x - inicio > 8:
                tramos.append((inicio, x))
            inicio = None
    return tramos[1:]


def media(cuadro, llenas, una):
    """El cuadro de `llenas` barras con la mitad derecha de la última en gris
    (copiada de una casilla vacía de `una`, el de 1 barra)."""
    resultado = cuadro.copy()
    tramos = casillas(una)
    a, b = tramos[llenas - 1]
    mitad = (a + b) // 2
    # El gris sale de la misma casilla en el de 1 barra (vacía); para la
    # primera, que ahí está llena, del principio de la segunda.
    desde = mitad if llenas > 1 else tramos[1][0]
    resultado.paste(una.crop((desde, 0, desde + b - mitad, una.height)), (mitad, 0))
    return resultado


def main():
    img = limpiar_borde(sin_fondo(Image.open(ENTRADA)))
    alfa = img.getchannel('A').load()
    ancho, alto = img.size
    # Filas con algo dibujado.
    llenas = [any(alfa[x, y] for x in range(ancho)) for y in range(alto)]
    filas, inicio = [], None
    for y, llena in enumerate(llenas + [False]):
        if llena and inicio is None:
            inicio = y
        if not llena and inicio is not None:
            filas.append(img.crop((0, inicio, ancho, y)))
            inicio = None
    enteros = [filas[i].crop(filas[i].getbbox()) for i in FILAS]  # 4, 3, 2 y 1 barras
    cuadros = []
    for n, c in enumerate(enteros):
        cuadros.append(c)
        cuadros.append(media(c, 4 - n, enteros[3]))
    celda = (max(c.width for c in cuadros) + 2 * MARGEN, max(c.height for c in cuadros) + 2 * MARGEN)
    print('celda', celda)
    hoja = Image.new('RGBA', (celda[0] * len(cuadros), celda[1]))
    sx, sy, opacidad = SOMBRA
    for i, c in enumerate(cuadros):
        # Lo semitransparente del borde pasa a opaco o se borra: bordes nítidos.
        alfa = c.getchannel('A').point(lambda a: 255 if a > 128 else 0)
        c.putalpha(alfa)
        sombra = Image.new('RGBA', c.size, (0, 0, 0, opacidad))
        hoja.paste(sombra, (i * celda[0] + MARGEN + sx, MARGEN + sy), alfa)
        hoja.paste(c, (i * celda[0] + MARGEN, MARGEN), c)
    hoja.save(SALIDA)
    print(f'{SALIDA}: {len(cuadros)} cuadros de {celda[0]}x{celda[1]}')


if __name__ == '__main__':
    main()
