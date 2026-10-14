"""Tiles de rampa provisionales (64x64) con la piedra del tileset cálido.

Guarda assets/fondos/lvl1/rampas_64.png con 3 cuadros, todos subiendo hacia
la derecha (las bajadas se dibujan espejados en el juego):
  0 -> rampa 45°: de abajo-izquierda a arriba-derecha
  1 -> rampa suave 22.5°, mitad baja: de y=64 a y=32
  2 -> rampa suave 22.5°, mitad alta: de y=32 a y=0

Rellena la parte bajo la pendiente con los bloques de piedra del muro y
pinta una franja de musgo a lo largo de la pendiente, con contorno oscuro.

Uso (desde la raíz del proyecto):  python3 herramientas/rampas_placeholder.py
"""
from PIL import Image

LVL1 = 'assets/fondos/lvl1/'
TILE = 64
CONTORNO = (34, 23, 4, 255)
MUSGO = [(72, 84, 26), (104, 120, 40), (140, 156, 62)]


def tile(tileset, indice):
    x, y = (indice % 8) * TILE, (indice // 8) * TILE
    return tileset.crop((x, y, x + TILE, y + TILE))


def rampa(muro, superficie):
    """superficie(x) -> y de la pendiente en la columna x (0..64)."""
    img = Image.new('RGBA', (TILE, TILE))
    px, fuente = img.load(), muro.load()
    for x in range(TILE):
        s = superficie(x + 0.5)
        for y in range(TILE):
            d = y - s  # distancia bajo la pendiente
            if d < 0:
                continue
            if d < 1:
                color = CONTORNO
            elif d < 4:
                color = MUSGO[2] + (255,) if (x + y) % 3 else MUSGO[1] + (255,)
            elif d < 6:
                color = MUSGO[0] + (255,) if (x // 2 + y) % 2 else fuente[x, y]
            else:
                color = fuente[x, y]
            px[x, y] = color
    return img


def main():
    tileset = Image.open(LVL1 + 'tileset_selva_64_calido.png').convert('RGBA')
    muro = tile(tileset, 6)
    cuadros = [
        rampa(muro, lambda x: TILE - x),          # 45°
        rampa(muro, lambda x: TILE - x / 2),      # suave, mitad baja
        rampa(muro, lambda x: TILE / 2 - x / 2),  # suave, mitad alta
    ]
    hoja = Image.new('RGBA', (TILE * len(cuadros), TILE))
    for i, cuadro in enumerate(cuadros):
        hoja.paste(cuadro, (i * TILE, 0))
    hoja.save(LVL1 + 'rampas_64.png')
    print('rampas_64.png:', len(cuadros), 'cuadros de 64x64')


if __name__ == '__main__':
    main()
