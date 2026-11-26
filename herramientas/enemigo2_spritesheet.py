"""Spritesheet del enemigo2 (comunario con chullo, poncho y garrote) a partir
de las tiras sobre magenta de assets/personajes/enemigos/:
  enemigo2_walk.jpeg    8 cuadros de caminar (2 filas de 4)
  enemigo2_ataque.jpeg  6 cuadros: en guardia, levanta el garrote, golpe
                        (con el arco blanco), golpe al piso (polvo), levanta
                        otra vez, vuelve a la guardia
  enemigo2_muerte.jpeg  10 cuadros (2 filas de 5); se usan 6: el golpe, grita
                        (se le vuela el garrote), cae de espaldas, en el aire,
                        se sienta de golpe (polvo) y tendido con el garrote.
                        (Los otros son variantes y el tendido transparente:
                        el desvanecerse lo hace el juego.)

Guarda
  enemigo2_sheet.png    una fila por color de poncho (PONCHOS); en cada fila
                        los 8 de caminar, los 6 del ataque y los 6 de la
                        muerte, en celdas iguales y apoyados abajo (los de
                        pie centrados en los pies, los caídos en el cuerpo)
  enemigo2_cuadros.json tamaño de celda, cuadros y nombres de los ponchos

El poncho es granate con rayas azules: se cambia rotando el tono de los
granates oscuros (la piel y el chullo tienen otros tonos o más brillo), así
los que aparecen juntos no son iguales.

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/enemigo2_spritesheet.py
"""
import colorsys
import json

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, por_manchas, quitar_fondo, sin_tinte_magenta

CARPETA = 'assets/personajes/enemigos/'
ALTO_ARTE = 60        # px de arte de pie con el chullo (el soldado mide 62)
MARGEN = 2
# Alto (px del jpeg) de la figura de pie en cada tira: la escala de cada una.
ALTO_PIE = {'walk': 316, 'ataque': 362, 'muerte': 294}
# Alto de cada fila de cuadros en el jpeg (para el orden de lectura).
FILA = {'walk': 356, 'ataque': 456}
# La estrellita de marca de agua de la esquina de abajo a la derecha: se borra.
MARCA = {'walk': (880, 650), 'ataque': (1080, 820)}
# Nombre y tono (0-360) de cada poncho; None es el original.
# Muerte: se corta por columnas (el garrote vuela suelto), en cada fila; y
# qué cuadros se usan (fila, columna), en orden.
MUERTE_FILAS = [(0, 340), (340, 672)]
MUERTE_COLUMNAS = [[0, 297, 570, 855, 1190, 1584], [0, 293, 582, 880, 1240, 1584]]
MUERTE_USADOS = [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (1, 3)]
MUERTE_DE_PIE = 2     # los primeros van centrados en los pies
PONCHOS = [('granate', None), ('verde', 120), ('ocre', 38), ('azul', 225)]


def tira(nombre):
    img = sin_tinte_magenta(quitar_fondo(Image.open(CARPETA + f'enemigo2_{nombre}.jpeg')))
    x0, y0 = MARCA[nombre]
    img.paste((0, 0, 0, 0), (x0, y0, img.width, img.height))
    # Los bordes de la imagen (una línea negra arriba).
    img.paste((0, 0, 0, 0), (0, 0, img.width, 8))
    return img


def cuadros_muerte():
    img = sin_tinte_magenta(quitar_fondo(Image.open(CARPETA + 'enemigo2_muerte.jpeg')))
    cuadros = []
    for fila, columna in MUERTE_USADOS:
        y0, y1 = MUERTE_FILAS[fila]
        x0, x1 = MUERTE_COLUMNAS[fila][columna:columna + 2]
        c = img.crop((x0, y0, x1, y1))
        cuadros.append(c.crop(c.getbbox()))
    return cuadros


def poncho(cuadro, tono):
    """Rota el tono de los granates oscuros (el poncho)."""
    if tono is None:
        return cuadro
    salida = cuadro.copy()
    px = salida.load()
    for y in range(salida.height):
        for x in range(salida.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            granate = (h >= 300 / 360 or h <= 12 / 360) and s > 0.2 and v < 0.62
            if not granate:
                continue
            r2, g2, b2 = colorsys.hsv_to_rgb(tono / 360, min(1, s * 0.95), v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return salida


def main():
    grupos = [
        ('walk', por_manchas(tira('walk'), 6000, FILA['walk'], lejos=40)),
        ('ataque', por_manchas(tira('ataque'), 6000, FILA['ataque'], lejos=140)),
        ('muerte', cuadros_muerte()),
    ]
    cuadros = []   # (imagen chica, x del ancla)
    for nombre, lista in grupos:
        escala = ALTO_ARTE / ALTO_PIE[nombre]
        for i, c in enumerate(lista):
            chico = a_pixel_art(c, (max(1, round(c.width * escala)), max(1, round(c.height * escala))))
            de_pie = nombre != 'muerte' or i < MUERTE_DE_PIE
            cuadros.append((chico, centro_pies(chico, 0.9) if de_pie else chico.width / 2))
    izquierda = max(ancla for c, ancla in cuadros)
    derecha = max(c.width - ancla for c, ancla in cuadros)
    medio = round(max(izquierda, derecha)) + MARGEN
    ancho = medio * 2
    alto = max(c.height for c, _ in cuadros) + MARGEN
    hoja = Image.new('RGBA', (ancho * len(cuadros), alto * len(PONCHOS)))
    for fila, (_, tono) in enumerate(PONCHOS):
        for i, (c, ancla) in enumerate(cuadros):
            hoja.alpha_composite(poncho(c, tono), (i * ancho + round(medio - ancla), fila * alto + alto - c.height - 1))
    hoja.save(CARPETA + 'enemigo2_sheet.png')
    datos = {
        'ancho': ancho, 'alto': alto, 'caminar': len(grupos[0][1]), 'ataque': len(grupos[1][1]), 'muerte': len(grupos[2][1]),
        'ponchos': [n for n, _ in PONCHOS]
    }
    json.dump(datos, open(CARPETA + 'enemigo2_cuadros.json', 'w'), indent=1)
    print('enemigo2_sheet.png', hoja.size, datos)


if __name__ == '__main__':
    main()
