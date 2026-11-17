"""Spritesheet del enemigo1 (soldado con sombrero de selva y fusil) a partir
de las tiras sobre magenta de assets/personajes/enemigos/:
  enemigo1_walk.jpeg    12 cuadros de caminar (2 filas de 6)
  enemigo1_ataque.jpeg   4 cuadros: apunta, dispara (fogonazo), retrocede, baja
  enemigo1_muerte.jpeg   6 cuadros: el golpe, grita, sale volando (se le cae
                         el sombrero y el fusil), destello blanco, tendido,
                         tendido con estrellitas

Guarda
  enemigo1_sheet.png    una fila por color de camisa (CAMISAS); en cada fila
                        los 12 de caminar, los 4 de ataque y los 6 de muerte,
                        todos en celdas iguales y apoyados abajo (los de pie
                        centrados en los pies, los tendidos en el cuerpo)
  enemigo1_cuadros.json tamaño de celda, cuadros y nombres de las camisas

La camisa es turquesa (tono ~150-195); el pantalón y el sombrero son oliva
(otro tono), así que se puede cambiar solo la camisa rotando el tono y
manteniendo luces y sombras. Así los que aparecen juntos no son iguales.

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/enemigo1_spritesheet.py
"""
import colorsys
import json

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, por_manchas, quitar_fondo, sin_tinte_magenta

CARPETA = 'assets/personajes/enemigos/'
ALTO_ARTE = 62        # px de arte de pie con el sombrero (como la cholita y Manfred)
MARGEN = 2
# Alto (px del jpeg) de la figura de pie en cada tira: escala de cada una.
ALTO_PIE = {'walk': 296, 'ataque': 483, 'muerte': 385}
# La muerte se corta por columnas (el sombrero y el fusil vuelan sueltos).
MUERTE_COLUMNAS = [0, 420, 878, 1278, 1705, 2118, 2544]
# Nombre y tono (0-360) de cada camisa; None es la original, 'gris' sin color.
CAMISAS = [
    ('turquesa', None),
    ('roja', 355),
    ('azul', 218),
    ('naranja', 24),
    ('gris', 'gris'),
    ('morada', 285)
]


def tira(nombre):
    return sin_tinte_magenta(quitar_fondo(Image.open(CARPETA + f'enemigo1_{nombre}.jpeg')))


def cuadros_muerte(img):
    cuadros = []
    for x0, x1 in zip(MUERTE_COLUMNAS, MUERTE_COLUMNAS[1:]):
        c = img.crop((x0, 0, x1, img.height))
        cuadros.append(c.crop(c.getbbox()))
    return cuadros


def achicar(cuadro, escala):
    w, h = max(1, round(cuadro.width * escala)), max(1, round(cuadro.height * escala))
    return a_pixel_art(cuadro, (w, h))


def camisa(cuadro, tono):
    """Rota el tono de los píxeles de la camisa (turquesa)."""
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
            if not (140 / 360 <= h <= 196 / 360 and s > 0.22 and v > 0.12):
                continue
            if tono == 'gris':
                s2, h2, v2 = s * 0.12, h, v * 1.05
            else:
                h2, s2, v2 = tono / 360, min(1, s * 1.05), v
            r2, g2, b2 = colorsys.hsv_to_rgb(h2, s2, min(1, v2))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return salida


def main():
    grupos = [
        ('walk', por_manchas(tira('walk'), 4000, 340, lejos=60)),
        ('ataque', por_manchas(tira('ataque'), 4000, lejos=120)),
        ('muerte', cuadros_muerte(tira('muerte')))
    ]
    cuadros = []   # (imagen chica, x del ancla)
    for nombre, lista in grupos:
        escala = ALTO_ARTE / ALTO_PIE[nombre]
        for i, c in enumerate(lista):
            chico = achicar(c, escala)
            de_pie = nombre != 'muerte' or i < 2
            ancla = centro_pies(chico) if de_pie else chico.width / 2
            if nombre == 'ataque':
                ancla = centro_pies(chico, 0.85)
            cuadros.append((chico, ancla))
    izquierda = max(ancla for c, ancla in cuadros)
    derecha = max(c.width - ancla for c, ancla in cuadros)
    medio = round(max(izquierda, derecha)) + MARGEN
    ancho = medio * 2
    alto = max(c.height for c, _ in cuadros) + MARGEN
    hoja = Image.new('RGBA', (ancho * len(cuadros), alto * len(CAMISAS)))
    for fila, (_, tono) in enumerate(CAMISAS):
        for i, (c, ancla) in enumerate(cuadros):
            hoja.alpha_composite(camisa(c, tono), (i * ancho + round(medio - ancla), fila * alto + alto - c.height - 1))
    hoja.save(CARPETA + 'enemigo1_sheet.png')
    datos = {
        'ancho': ancho, 'alto': alto,
        'caminar': len(grupos[0][1]), 'ataque': len(grupos[1][1]), 'muerte': len(grupos[2][1]),
        'camisas': [n for n, _ in CAMISAS]
    }
    json.dump(datos, open(CARPETA + 'enemigo1_cuadros.json', 'w'), indent=1)
    print('enemigo1_sheet.png', hoja.size, datos)


if __name__ == '__main__':
    main()
