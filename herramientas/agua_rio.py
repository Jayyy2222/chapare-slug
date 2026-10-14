"""Texturas pixel art para los ríos del Nivel 1 (camino de abajo).

Guarda en assets/fondos/lvl1/agua/ (todo se dibuja a x2 en el juego):
  agua_cuerpo.png      64x64  repetible: franjas de profundidad con tramado,
                              reflejos de luz (cáusticas) y burbujas
  agua_superficie.png  64x12  repetible: cresta de olas con espuma y brillos
  lecho_rio.png        128x24 repetible: arena, cantos rodados y algas
  juncos.png           40x56  juncos y totoras para las orillas
  hoja_flotante.png    10x6   hoja que flota río abajo
  nenufar.png          32x8   dos nenúfares (16x8): liso y con flor
  gota.png             3x3    gota para las salpicaduras

Agua verde jade, a juego con la paleta cálida del nivel. Sin anti-aliasing.

Uso (desde la raíz del proyecto):  python3 herramientas/agua_rio.py
"""
import math
import os
import random

from PIL import Image

CARPETA = 'assets/fondos/lvl1/agua/'
CONTORNO = (30, 26, 8, 255)
ESPUMA = [(150, 196, 160), (206, 226, 184), (240, 244, 214)]
AGUA = [(124, 168, 124), (98, 144, 110), (74, 118, 96), (54, 92, 80), (40, 70, 64)]
LUZ_AGUA = (168, 206, 156)
ARENA = [(84, 66, 34), (110, 88, 48), (138, 114, 66), (164, 140, 86)]
PIEDRAS = [[(64, 60, 50), (96, 92, 76), (132, 126, 104)],
           [(80, 56, 36), (116, 84, 52), (150, 116, 76)],
           [(60, 70, 58), (88, 102, 82), (122, 136, 110)]]
VERDES = [(40, 64, 22), (64, 96, 32), (96, 132, 46), (140, 168, 70)]
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def nueva(ancho, alto):
    img = Image.new('RGBA', (ancho, alto))
    return img, img.load()


def tramado(x, y, mezcla):
    """True si el pixel (x, y) toma el color siguiente (tramado ordenado 4x4)."""
    return mezcla * 16 > BAYER[y % 4][x % 4]


def contorno(img, px):
    ancho, alto = img.size
    llenos = {(x, y) for x in range(ancho) for y in range(alto) if px[x, y][3]}
    for x, y in llenos:
        for vx, vy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= vx < ancho and 0 <= vy < alto and (vx, vy) not in llenos:
                px[vx, vy] = CONTORNO


def agua_cuerpo():
    """Franjas de color según la profundidad, con tramado en los bordes."""
    img, px = nueva(64, 64)
    limites = [0, 8, 20, 36, 52, 64]
    rnd = random.Random('agua')
    for y in range(64):
        banda = max(i for i in range(len(limites) - 1) if y >= limites[i])
        inicio, fin = limites[banda], limites[banda + 1]
        mezcla = (y - inicio) / (fin - inicio)  # se acerca al color de abajo
        for x in range(64):
            i = min(banda + (1 if tramado(x, y, mezcla * 0.7) else 0), len(AGUA) - 1)
            color = AGUA[i]
            # Cáusticas: suma de ondas con periodo 64 (la textura se repite sin cortes).
            # Las líneas aparecen donde la suma cruza cero: una red fina de luz.
            c = (math.sin(2 * math.pi * (2 * x + y) / 64) + 0.8 * math.sin(2 * math.pi * (3 * x - 2 * y) / 64)
                 + 0.5 * math.sin(2 * math.pi * (x + 3 * y) / 64))
            if abs(c) < 0.16 - y / 64 * 0.1 and y < 48:
                color = LUZ_AGUA if y < 16 else AGUA[max(0, i - 1)]
            px[x, y] = color + (255,)
    for _ in range(14):  # burbujas
        x, y = rnd.randrange(64), rnd.randrange(10, 62)
        px[x, y] = ESPUMA[1] + (255,)
        if rnd.random() < 0.4:
            px[x, (y - 2) % 64] = ESPUMA[0] + (255,)
    return img


def agua_superficie():
    """Cresta de olas: transparente arriba, espuma en la cresta y brillo abajo."""
    img, px = nueva(64, 12)
    rnd = random.Random('superficie')
    for x in range(64):
        cresta = 5 + round(1.6 * math.sin(2 * math.pi * x * 2 / 64) + 0.8 * math.sin(2 * math.pi * x * 5 / 64))
        for y in range(cresta, 12):
            d = y - cresta
            if d == 0:
                color = ESPUMA[2]
            elif d == 1:
                color = ESPUMA[1] if (x + y) % 3 else ESPUMA[2]
            elif d == 2:
                color = ESPUMA[0]
            else:
                color = AGUA[0] if not tramado(x, y, (d - 3) / 4) else AGUA[1]
            px[x, y] = color + (255,)
        # Brillos sueltos sobre la cresta (gotitas de espuma).
        if rnd.random() < 0.12 and cresta > 2:
            px[x, cresta - 2] = ESPUMA[1] + (255,)
    # Rayitas de brillo en el agua.
    for _ in range(6):
        x, y = rnd.randrange(64), rnd.randrange(9, 12)
        for k in range(rnd.randint(2, 5)):
            px[(x + k) % 64, y] = LUZ_AGUA + (255,)
    return img


def lecho_rio():
    """Arena con cantos rodados y algas; repetible en horizontal."""
    img, px = nueva(128, 24)
    rnd = random.Random('lecho')
    for y in range(4, 24):
        for x in range(128):
            v = 0.55 - (y - 4) / 20 * 0.35 + rnd.uniform(-0.15, 0.15)
            px[x, y] = ARENA[max(0, min(3, int(v * 4)))] + (255,)
    for _ in range(26):
        cx, cy = rnd.randrange(128), rnd.randint(6, 21)
        rx, ry = rnd.randint(2, 6), rnd.randint(2, 4)
        tonos = rnd.choice(PIEDRAS)
        for y in range(cy - ry - 1, cy + ry + 2):
            for x in range(cx - rx - 1, cx + rx + 2):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if not 0 <= y < 24:
                    continue
                xx = x % 128  # se envuelve: repetible
                if d <= 1:
                    luz = 2 if (x - cx) + (y - cy) < -rx * 0.6 else 1 if (y - cy) < ry * 0.3 else 0
                    px[xx, y] = tonos[luz] + (255,)
                elif d <= 1.6 and px[xx, y][3] and px[xx, y][:3] in [c for c in ARENA]:
                    px[xx, y] = CONTORNO
    for _ in range(9):  # algas que salen del fondo
        x = rnd.randrange(128)
        alto = rnd.randint(4, 9)
        for k in range(alto):
            xx = (x + round(math.sin(k / 2) * 0.8)) % 128
            px[xx, 6 - k + 4] = VERDES[1 if k < alto - 2 else 2] + (255,)
    return img


def juncos():
    img, px = nueva(40, 56)
    rnd = random.Random('juncos')
    for i in range(11):
        x0 = 6 + i * 2.6 + rnd.uniform(-1, 1)
        alto = rnd.randint(26, 50)
        curva = rnd.uniform(-6, 6)
        for k in range(alto):
            t = k / alto
            x = round(x0 + curva * t * t)
            y = 55 - k
            px[x, y] = VERDES[2 if i % 3 else 3] + (255,)
            if k < alto * 0.6:
                px[x + 1, y] = VERDES[1] + (255,)
        if i % 3 == 0:  # espiga de totora
            x = round(x0 + curva)
            for k in range(6):
                px[x, 55 - alto - k + 3] = (96, 58, 26, 255)
                px[x + 1, 55 - alto - k + 3] = (126, 80, 38, 255)
    contorno(img, px)
    return img


def hoja_flotante():
    img, px = nueva(10, 6)
    for x in range(1, 9):
        alto = 2 - abs(x - 4.5) // 2
        for y in range(int(3 - alto), int(3 + alto)):
            px[x, y] = (VERDES[3] if y < 3 else VERDES[2]) + (255,)
    for x in range(2, 8):
        px[x, 3] = VERDES[1] + (255,)  # nervio
    contorno(img, px)
    return img


def nenufar():
    img, px = nueva(32, 8)
    for n in range(2):
        cx, cy = n * 16 + 8, 4
        for y in range(1, 7):
            for x in range(n * 16 + 1, n * 16 + 15):
                if ((x - cx) / 6.5) ** 2 + ((y - cy) / 2.6) ** 2 <= 1 and not (x > cx and abs(y - cy) < 1):
                    px[x, y] = (VERDES[2] if y < cy else VERDES[1]) + (255,)
        if n == 1:  # flor
            for dx, dy, c in ((0, -1, (236, 170, 190)), (-1, 0, (214, 120, 150)), (1, 0, (214, 120, 150)),
                              (0, 0, (250, 220, 120))):
                px[cx - 2 + dx, cy - 1 + dy] = c + (255,)
    contorno(img, px)
    return img


def gota():
    img, px = nueva(3, 3)
    for x, y, c in ((1, 0, ESPUMA[2]), (0, 1, ESPUMA[1]), (1, 1, ESPUMA[2]), (2, 1, ESPUMA[1]), (1, 2, ESPUMA[0])):
        px[x, y] = c + (255,)
    return img


def main():
    os.makedirs(CARPETA, exist_ok=True)
    texturas = {
        'agua_cuerpo': agua_cuerpo(), 'agua_superficie': agua_superficie(), 'lecho_rio': lecho_rio(),
        'juncos': juncos(), 'hoja_flotante': hoja_flotante(), 'nenufar': nenufar(), 'gota': gota()
    }
    for nombre, img in texturas.items():
        img.save(CARPETA + nombre + '.png')
    print('Texturas de agua en', CARPETA, ':', ', '.join(texturas))


if __name__ == '__main__':
    main()
