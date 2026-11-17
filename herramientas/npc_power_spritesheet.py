"""Convierte la hoja del NPC de la hamburguesa (npc_power.jpeg) en un
spritesheet de celdas iguales.

La hoja original tiene 4 filas de distinto largo (17 cuadros) sobre fondo
magenta, con una franja oscura arriba y una línea abajo:
  fila 1:  0-4   parado y saludando
  fila 2:  5-7   se agacha y salta de alegría
  fila 3:  8-11  de espaldas, saca la hamburguesa, la ofrece (brilla), pulgares arriba
  fila 4: 12-16  saludo militar, de espaldas, corre (hacia la derecha)

Cada cuadro es una mancha grande de píxeles; las chicas (gotas de sudor,
destellos, polvo) se suman a la mancha grande más cercana. Las sombras
pintadas son magenta oscuro y se van con el fondo. Los cuadros se pegan con
los pies en el borde de abajo de la celda y centrados según los pies.

Guarda en assets/personajes/npc/:
  npc_power_sheet.png     17 cuadros en una fila
  npc_power_cuadros.json  tamaño de celda y cantidad de cuadros

Uso (desde la raíz del proyecto):  python3 herramientas/npc_power_spritesheet.py
"""
import json

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, por_manchas, quitar_fondo

CARPETA = 'assets/personajes/npc/'
FRANJA_ARRIBA = 12     # px de borde oscuro arriba de la hoja
FRANJA_ABAJO = 4       # y la línea de abajo
MANCHA_MINIMA = 2000   # px: menos que esto es un detalle suelto, no un cuadro
ALTO_FILA = 185        # px aproximados de cada fila, para ordenar los cuadros
ALTO_ARTE = 64         # px de arte del cuadro más alto: parado ~60, como los rehenes
MARGEN = 4
LEJOS = 30             # px: un detalle más lejos de todo cuadro se descarta


def main():
    hoja = quitar_fondo(Image.open(CARPETA + 'npc_power.jpeg'))
    hoja = hoja.crop((0, FRANJA_ARRIBA, hoja.width, hoja.height - FRANJA_ABAJO))
    cuadros = por_manchas(hoja, MANCHA_MINIMA, ALTO_FILA, LEJOS)

    medio = max(max(centro_pies(c, 0.85), c.width - centro_pies(c, 0.85)) for c in cuadros)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(c.height for c in cuadros) + MARGEN
    escala = ALTO_ARTE / alto
    chico = (round(ancho * escala), round(alto * escala))
    resultado = Image.new('RGBA', (chico[0] * len(cuadros), chico[1]))
    for i, c in enumerate(cuadros):
        celda = Image.new('RGBA', (ancho, alto))
        celda.paste(c, (round(ancho / 2 - centro_pies(c, 0.85)), alto - c.height), c)
        resultado.paste(a_pixel_art(celda, chico, 48), (i * chico[0], 0))
    resultado.save(CARPETA + 'npc_power_sheet.png')
    with open(CARPETA + 'npc_power_cuadros.json', 'w') as f:
        json.dump({'ancho': chico[0], 'alto': chico[1], 'cuadros': len(cuadros)}, f)
    print(f'npc_power_sheet.png: {len(cuadros)} cuadros de {chico[0]}x{chico[1]}')


if __name__ == '__main__':
    main()
