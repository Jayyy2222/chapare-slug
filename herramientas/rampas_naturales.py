"""Rampas de terreno natural de la selva, en pixel art (todas suben hacia la derecha).

Guarda assets/fondos/lvl1/rampas_naturales_64.png con 5 cuadros de 64x64:
  0 -> ladera de tierra 45°: tierra compacta, raíces, piedritas, pasto y helechos
  1 -> orilla de barro suave, mitad baja (de y=64 a y=32)
  2 -> orilla de barro suave, mitad alta (de y=32 a y=0)
       (1 y 2 se dibujan juntas como una pieza de 128x64 y se cortan)
  3 -> escalones de roca 45°: peñascos con musgo
  4 -> ladera de raíces 45°: raíces gruesas de un árbol sobre la tierra

La superficie que se pisa sigue exactamente la diagonal de la función de
altura del juego (RAMPAS en Nivel1.js); solo pasto, juncos y bordes de roca
asoman unos pixeles por encima. Base plana y borde derecho vertical para
empalmar con el suelo. Sin anti-aliasing, contorno oscuro.

Uso (desde la raíz del proyecto):  python3 herramientas/rampas_naturales.py
"""
import math
import random

from PIL import Image

LVL1 = 'assets/fondos/lvl1/'
TILE = 64
CONTORNO = (34, 23, 4)
TIERRA = [(66, 42, 18), (94, 64, 30), (124, 88, 46), (152, 114, 64), (180, 142, 88)]
BARRO = [(40, 30, 16), (58, 42, 22), (78, 58, 30), (100, 76, 42)]
ROCA = [(58, 62, 46), (82, 88, 66), (110, 116, 88), (142, 146, 112), (176, 176, 138)]
MUSGO = [(62, 80, 24), (90, 112, 36), (124, 146, 54), (160, 176, 78)]
CORTEZA = [(62, 40, 16), (98, 70, 34), (136, 102, 56), (176, 142, 88)]
AGUA = [(86, 120, 102), (132, 168, 140), (190, 214, 180)]
LUZ = (-0.6, -0.8)


class Pieza:
    def __init__(self, ancho, alto, superficie, semilla):
        self.ancho, self.alto = ancho, alto
        self.sup = superficie                 # x -> y de la superficie
        self.img = Image.new('RGBA', (ancho, alto))
        self.px = self.img.load()
        self.rnd = random.Random(semilla)
        self.ruido = {}

    def pixel(self, x, y, color, sobre=0):
        """Pinta si está bajo la superficie (o hasta 'sobre' pixeles encima)."""
        x, y = round(x), round(y)
        if 0 <= x < self.ancho and 0 <= y < self.alto and y >= self.sup(x + 0.5) - sobre:
            self.px[x, y] = tuple(color[:3]) + (255,)

    def grano(self, x, y, fuerza=0.15, bloque=2):
        clave = (round(x) // bloque, round(y) // bloque, bloque)
        if clave not in self.ruido:
            self.ruido[clave] = self.rnd.uniform(-1, 1)
        return self.ruido[clave] * fuerza

    def profundidad(self, x, y):
        return y - self.sup(x + 0.5)

    def contorno(self):
        llenos = {(x, y) for x in range(self.ancho) for y in range(self.alto) if self.px[x, y][3]}
        for x, y in llenos:
            for vx, vy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= vx < self.ancho and 0 <= vy < self.alto and (vx, vy) not in llenos:
                    self.px[vx, vy] = CONTORNO + (255,)


def tono(paleta, valor):
    return paleta[max(0, min(len(paleta) - 1, int(valor * len(paleta))))]


# --- Elementos comunes ---------------------------------------------------------

def suelo(p, paleta, vetas=True):
    """Relleno de tierra: más claro cerca de la superficie, vetas paralelas a la pendiente."""
    for x in range(p.ancho):
        for y in range(p.alto):
            d = p.profundidad(x, y)
            if d < 0:
                continue
            luz = 0.8 - min(d, 48) / 48 * 0.45 - (x / p.ancho) * 0.08 + p.grano(x, y)
            if vetas and int(d + p.grano(x, y, 3, 4)) % 9 == 0:
                luz -= 0.2
            p.pixel(x, y, tono(paleta, luz))


def piedra(p, cx, cy, rx, ry, paleta=ROCA, sobre=0):
    """Piedra o peñasco sombreado, con contorno propio y una grieta."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            d = dx * dx + dy * dy
            if d <= 1:
                luz = 0.55 + 0.4 * (dx * LUZ[0] + dy * LUZ[1]) + p.grano(x, y, 0.12)
                p.pixel(x, y, tono(paleta, luz), sobre)
            elif d <= 1.35:
                p.pixel(x, y, CONTORNO, sobre)
    if rx > 5:  # grieta
        x, y = cx - rx * 0.3, cy - ry * 0.2
        for _ in range(int(rx)):
            p.pixel(x, y, paleta[0], sobre)
            x += 1
            y += p.rnd.choice((0, 0, 1, -1)) * 0.7


def raiz(p, puntos, grosor, sobre=0):
    """Raíz como tubo sombreado a lo largo de una curva cuadrática."""
    (x0, y0), (x1, y1), (x2, y2) = puntos
    largo = int(math.dist(puntos[0], puntos[1]) + math.dist(puntos[1], puntos[2])) * 2
    for i in range(largo + 1):
        t = i / largo
        u = 1 - t
        x = u * u * x0 + 2 * u * t * x1 + t * t * x2
        y = u * u * y0 + 2 * u * t * y1 + t * t * y2
        g = grosor * (1 - t * 0.6)
        for k in range(-int(g * 2), int(g * 2) + 1):
            s = k / 2
            luz = 0.7 - (s + g) / (2 * g + 0.01) * 0.6 + p.grano(x, y + s, 0.1)
            color = CONTORNO if abs(s) > g - 0.6 else tono(CORTEZA, luz)
            p.pixel(x, y + s, color, sobre)


def pasto(p, x, alto, paleta=MUSGO):
    """Mata de pasto que crece desde la superficie (asoma por encima)."""
    base = p.sup(x + 0.5)
    for k in range(-2, 3):
        h = alto - abs(k) * 1.5 + p.rnd.uniform(-1, 1)
        for j in range(int(max(1, h))):
            p.pixel(x + k + j * 0.15 * k, base - j, paleta[min(3, 1 + j // 2)], sobre=alto + 1)


def helecho(p, x):
    base = p.sup(x + 0.5)
    for lado in (-1, 1):
        for j in range(10):
            px_, py_ = x + lado * j, base - 6 - j * 0.6 + (j * j) * 0.1
            p.pixel(px_, py_, MUSGO[2], sobre=14)
            if j % 2 == 0:
                p.pixel(px_, py_ - 1, MUSGO[3], sobre=14)
    for j in range(7):
        p.pixel(x, base - j, MUSGO[1], sobre=14)


def capa_musgo(p, grosor=3, paleta=MUSGO):
    """Franja de pasto/musgo pegada a la superficie."""
    for x in range(p.ancho):
        s = p.sup(x + 0.5)
        borde = grosor + (1 if p.grano(x, 0, 1, 3) > 0.3 else 0)
        for d in range(1, borde + 1):
            p.pixel(x, s + d, tono(paleta, 0.8 - d / borde * 0.5))


# --- Piezas -------------------------------------------------------------------

def ladera_tierra():
    p = Pieza(TILE, TILE, lambda x: TILE - x, 'tierra')
    suelo(p, TIERRA)
    for _ in range(9):  # piedritas metidas en la tierra
        x, y = p.rnd.randint(8, 60), 0
        y = p.sup(x) + p.rnd.randint(8, 50)
        piedra(p, x, y, p.rnd.randint(2, 4), p.rnd.randint(2, 3), ROCA[:4])
    raiz(p, [(64, 30), (40, 34), (18, 60)], 1.6)       # raíces que atraviesan la tierra
    raiz(p, [(64, 12), (50, 22), (34, 40)], 1.2)
    capa_musgo(p, 3)
    for x in range(3, 62, 5):
        pasto(p, x, p.rnd.randint(2, 5))
    helecho(p, 20)
    helecho(p, 46)
    p.contorno()
    return p.img


def orilla_barro():
    p = Pieza(TILE * 2, TILE, lambda x: TILE - x / 2, 'barro')
    suelo(p, BARRO)
    # Brillo de barro mojado: pixeles claros sueltos cerca de la superficie.
    for _ in range(80):
        x = p.rnd.randint(0, p.ancho - 1)
        y = p.sup(x + 0.5) + p.rnd.randint(2, 10)
        p.pixel(x, y, BARRO[3])
    # Charcos poco hondos, achatados sobre la pendiente.
    for cx in (30, 74, 104):
        cy = p.sup(cx) + 4
        for x in range(cx - 7, cx + 8):
            for y in range(int(cy) - 1, int(cy) + 2):
                if ((x - cx) / 7) ** 2 + ((y - cy) / 1.6) ** 2 <= 1:
                    color = AGUA[2] if y < cy and x < cx else AGUA[1] if y < cy else AGUA[0]
                    p.pixel(x, y, color)
    for _ in range(18):  # cantos rodados
        x = p.rnd.randint(4, p.ancho - 4)
        piedra(p, x, p.sup(x) + p.rnd.randint(6, 30), p.rnd.randint(2, 3), 2, ROCA[:4])
    capa_musgo(p, 2, [(52, 66, 22), (74, 92, 30), (100, 120, 42), (136, 152, 64)])
    for x in range(4, p.ancho - 2, 7):
        pasto(p, x, p.rnd.randint(2, 4))
    # Juncos arriba, donde la orilla se junta con el suelo plano.
    for x in range(100, 126, 3):
        base = p.sup(x + 0.5)
        alto = p.rnd.randint(8, 16)
        for j in range(alto):
            p.pixel(x + j * 0.08, base - j, MUSGO[2] if x % 2 else MUSGO[1], sobre=17)
        if x % 6 == 1:
            for j in range(3):
                p.pixel(x + alto * 0.08, base - alto - j, (110, 66, 30), sobre=20)
    p.contorno()
    return p.img


def escalones_roca():
    p = Pieza(TILE, TILE, lambda x: TILE - x, 'rocas')
    suelo(p, [(36, 30, 18), (52, 44, 26), (70, 60, 36)], vetas=False)  # tierra oscura entre rocas
    # Peñascos de abajo hacia arriba: su borde superior sigue la diagonal y
    # forma escalones irregulares (asoman hasta 3 px).
    for cx, cy, rx, ry in ((54, 50, 12, 14), (30, 52, 10, 9), (12, 60, 9, 6), (44, 28, 11, 10),
                           (22, 40, 8, 7), (58, 16, 8, 12), (36, 12, 6, 6)):
        piedra(p, cx, max(cy, p.sup(cx) + ry - 2), rx, ry, sobre=3)
    # Musgo en las caras superiores.
    for x in range(TILE):
        for y in range(TILE):
            if p.px[x, y][3] and p.px[x, y][:3] in ROCA[2:] and (y < 2 or not p.px[x, y - 2][3]):
                p.pixel(x, y, MUSGO[2] if (x + y) % 3 else MUSGO[3], sobre=3)
    for x in (10, 33, 51):
        pasto(p, x, 3)
    p.contorno()
    return p.img


def ladera_raices():
    p = Pieza(TILE, TILE, lambda x: TILE - x, 'raices')
    suelo(p, BARRO)  # tierra oscura: las raíces resaltan
    for _ in range(5):
        x = p.rnd.randint(10, 58)
        piedra(p, x, p.sup(x) + p.rnd.randint(10, 40), p.rnd.randint(3, 5), p.rnd.randint(2, 4), ROCA[:4])
    # Raíces gruesas que bajan por la ladera desde arriba a la derecha.
    for (x0, y0), (cx, cy), (x1, y1), g in (((66, 2), (38, 22), (4, 62), 6), ((66, 22), (46, 36), (24, 66), 4.5),
                                            ((66, 42), (56, 52), (44, 66), 3.5), ((62, 4), (44, 6), (28, 32), 3)):
        raiz(p, [(x0, y0 + 2), (cx, cy + 2), (x1, y1)], g, sobre=3)
    # Musgo sobre las raíces y lianas que cuelgan.
    for x in range(TILE):
        s = p.sup(x + 0.5)
        if p.grano(x, 1, 1, 4) > 0.2:
            for d in range(0, 3):
                p.pixel(x, s + d, MUSGO[2 - d // 2], sobre=3)
    for x in (16, 38):
        for j in range(10):
            p.pixel(x + math.sin(j / 2), p.sup(x) + 4 + j, MUSGO[1])
    pasto(p, 28, 4)
    pasto(p, 54, 3)
    p.contorno()
    return p.img


def main():
    barro = orilla_barro()
    cuadros = [ladera_tierra(), barro.crop((0, 0, TILE, TILE)), barro.crop((TILE, 0, TILE * 2, TILE)),
               escalones_roca(), ladera_raices()]
    hoja = Image.new('RGBA', (TILE * len(cuadros), TILE))
    for i, cuadro in enumerate(cuadros):
        hoja.paste(cuadro, (i * TILE, 0))
    hoja.save(LVL1 + 'rampas_naturales_64.png')
    print('rampas_naturales_64.png:', len(cuadros), 'cuadros de 64x64')


if __name__ == '__main__':
    main()
