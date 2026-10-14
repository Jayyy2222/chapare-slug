"""Dibuja árboles de selva en pixel art (300x200 cada uno), al estilo del fondo
del Nivel 1: troncos retorcidos, ramas sinuosas, musgo colgante y lianas.

Guarda en assets/fondos/lvl1/ tres spritesheets horizontales con 3 árboles:
  arboles_300x200.png          -> árboles del plano de juego (colores normales)
  arboles_300x200_medio.png    -> capa de parallax cercana (un poco de niebla)
  arboles_300x200_lejanos.png  -> capa de parallax lejana (mucha niebla)
y arboles_300x200_ramas.json: por cada árbol, las líneas sobre las ramas
gruesas donde el jugador puede pararse ([[x, y], ...] en pixeles del dibujo).
Árboles: 0 = higuerón de copa ancha, 1 = árbol alto inclinado con mucho musgo,
2 = árbol estrangulado por lianas con grandes raíces.

La paleta sale del fondo "_calido" (cuantizado), así que combinan con él.
Sin anti-aliasing: cada pixel se pinta a mano y todo lleva contorno oscuro.

Uso (desde la raíz del proyecto):  python3 herramientas/arboles_selva.py
"""
import json
import math
import random

from PIL import Image

ANCHO, ALTO = 300, 200
LVL1 = 'assets/fondos/lvl1/'

CONTORNO = (34, 23, 4)
CORTEZA = [(45, 31, 3), (64, 46, 11), (93, 73, 21), (124, 104, 35), (155, 144, 77)]
MUSGO = [(78, 64, 19), (108, 100, 43), (140, 128, 57), (163, 155, 89), (188, 179, 109)]
HOJAS = [(52, 50, 12), (77, 76, 24), (101, 104, 34), (130, 132, 50), (168, 166, 76)]
LIANA = [(40, 34, 8), (66, 60, 18), (92, 86, 30)]
BROMELIA = [(150, 44, 22), (204, 86, 34), (236, 150, 60)]  # toque de color del Chapare
NIEBLA = (196, 184, 116)
NIEBLA_LEJANOS = 0.45
NIEBLA_MEDIO = 0.2
GROSOR_PISABLE = 2.5  # ramas más finas no aguantan al jugador
PENDIENTE_MAX = 0.6   # tramos más empinados no son caminables
LUZ = (-0.6, -0.8)  # la luz viene de arriba a la izquierda
MARGEN = 34        # espacio libre en los bordes (las copas caben sin cortarse)


class Lienzo:
    def __init__(self, semilla, ancho=ANCHO, alto=ALTO):
        self.ancho, self.alto = ancho, alto
        self.img = Image.new('RGBA', (ancho, alto))
        self.px = self.img.load()
        self.rnd = random.Random(semilla)
        self.ruido = {}

    def pixel(self, x, y, color):
        x, y = round(x), round(y)
        if 0 < x < self.ancho - 1 and 0 < y < self.alto - 1:  # deja 1 px para el contorno
            self.px[x, y] = tuple(color[:3]) + (255,)

    def grano(self, x, y, fuerza=0.18):
        """Ruido fijo por bloque de 2x2: textura sin pixeles sueltos."""
        clave = (round(x) // 2, round(y) // 2)
        if clave not in self.ruido:
            self.ruido[clave] = self.rnd.uniform(-1, 1)
        return self.ruido[clave] * fuerza

    def contorno(self):
        """Pinta de oscuro todo pixel vacío que toque uno pintado."""
        llenos = {(x, y) for x in range(self.ancho) for y in range(self.alto) if self.px[x, y][3]}
        for x, y in llenos:
            for vx, vy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= vx < self.ancho and 0 <= vy < self.alto and (vx, vy) not in llenos:
                    self.px[vx, vy] = CONTORNO + (255,)


def tono(paleta, valor):
    """valor de 0 (sombra) a 1 (luz) -> color de la paleta."""
    return paleta[max(0, min(len(paleta) - 1, int(valor * len(paleta))))]


def bezier(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def curva(p0, p1, p2):
    """Puntos de la curva con su normal unitaria."""
    largo = max(2, int(math.dist(p0, p1) + math.dist(p1, p2)) * 2)
    for i in range(largo + 1):
        t = i / largo
        x, y = bezier(p0, p1, p2, t)
        x2, y2 = bezier(p0, p1, p2, min(1, t + 0.01))
        x1, y1 = bezier(p0, p1, p2, max(0, t - 0.01))
        tx, ty = x2 - x1, y2 - y1
        n = math.hypot(tx, ty) or 1
        yield t, x, y, -ty / n, tx / n


def rama(l, p0, p1, p2, g0, g1, musgo=0.6, retorcer=0.0):
    """Rama o tronco con volumen: luz según la normal, vetas y musgo encima.
    Devuelve los puntos del eje (x, y, grosor) para colgarle musgo y lianas."""
    puntos = []
    for t, x, y, nx, ny in curva(p0, p1, p2):
        g = g0 + (g1 - g0) * t
        # Ondulación para que el tronco se vea retorcido.
        x += nx * math.sin(t * 9 + g0) * retorcer
        y += ny * math.sin(t * 9 + g0) * retorcer
        puntos.append((x, y, g))
        for k in range(-int(g * 2), int(g * 2) + 1):
            s = k / 2
            f = s / (g + 0.01)                       # -1..1 a lo ancho
            luz = 0.5 + 0.42 * f * (nx * LUZ[0] + ny * LUZ[1]) + l.grano(x + nx * s, y + ny * s)
            if g > 3 and abs(math.sin(s * 1.7 + t * 3)) > 0.93:
                luz -= 0.3                           # vetas de la corteza
            color = tono(CORTEZA, luz)
            arriba = f * ny < -0.55                  # borde que mira hacia el cielo
            if arriba and g >= 2.5 and l.rnd.random() < musgo:
                color = tono(MUSGO, 0.55 + l.grano(x, y, 0.3))
            l.pixel(x + nx * s, y + ny * s, color)
    return puntos


def copa(l, cx, cy, r):
    """Grupo de follaje ovalado con hojitas sueltas en el borde."""
    # Siempre dentro del lienzo, para que no quede cortado en línea recta.
    cx = min(max(cx, r * 1.3 + 6), l.ancho - r * 1.3 - 6)
    cy = max(cy, r + 4)
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r * 1.3), int(cx + r * 1.3) + 1):
            dx, dy = (x - cx) / 1.3, y - cy
            d = math.hypot(dx, dy)
            if d > r + l.grano(x, y, 2.5):
                continue
            luz = 0.5 + 0.45 * (dx * LUZ[0] + dy * LUZ[1]) / r + l.grano(x, y, 0.25)
            if d > r - 1.5:
                luz -= 0.2
            l.pixel(x, y, tono(HOJAS, luz))
    for _ in range(int(r * 2)):
        a = l.rnd.uniform(0, math.tau)
        x, y = cx + math.cos(a) * r * 1.3, cy + math.sin(a) * r
        l.pixel(x, y, HOJAS[2]); l.pixel(x + 1, y, HOJAS[3])


def musgo_colgante(l, puntos, densidad, largo_max):
    """Barba de musgo que cuelga de las ramas (como en el fondo)."""
    for x, y, g in puntos[::3]:
        if l.rnd.random() > densidad:
            continue
        largo = l.rnd.randint(4, largo_max)
        for k in range(largo):
            if l.rnd.random() < 0.15:
                continue  # hebras con huecos
            luz = 0.7 - k / largo * 0.5
            l.pixel(x + math.sin(k / 3) * 0.6, y + g + k, tono(MUSGO, luz))
            if k < largo / 3:
                l.pixel(x + 1, y + g + k, tono(MUSGO, luz - 0.2))


def liana(l, x0, y0, largo, onda):
    for k in range(largo):
        x = x0 + math.sin(k / 14 + x0) * onda
        l.pixel(x, y0 + k, tono(LIANA, 0.5 + 0.3 * math.sin(k / 3)))
        if k % 9 == 0 and l.rnd.random() < 0.6:  # hojitas en la liana
            lado = l.rnd.choice((-1, 1))
            l.pixel(x + lado, y0 + k, HOJAS[3]); l.pixel(x + 2 * lado, y0 + k + 1, HOJAS[2])


def liana_curva(l, a, b, caida):
    """Liana colgando entre dos ramas (forma de U)."""
    ctrl = ((a[0] + b[0]) / 2, max(a[1], b[1]) + caida)
    for _, x, y, _, _ in curva(a, ctrl, b):
        l.pixel(x, y, LIANA[1])
        l.pixel(x, y + 1, LIANA[0])


def bromelia(l, x, y):
    for dx, dy, c in ((0, 0, 1), (-1, 0, 0), (1, 0, 0), (0, -1, 2), (-2, -1, 1), (2, -1, 1), (-1, -2, 2), (1, -2, 2)):
        l.pixel(x + dx, y + dy, BROMELIA[c])


def ramificar(l, p, angulo, largo, grosor, nivel, puntas, ramas):
    """Rama recursiva: se curva (cae y vuelve a subir) y se divide en dos."""
    a = math.radians(angulo)
    # Se acorta si se saldría del lienzo (deja margen para el follaje).
    for limite, inicio, paso in ((MARGEN, p[0], math.cos(a)), (l.ancho - MARGEN, p[0], math.cos(a)),
                                 (MARGEN, p[1], math.sin(a))):
        if paso and 0 < (limite - inicio) / paso < largo:
            largo = (limite - inicio) / paso
    fin = (p[0] + math.cos(a) * largo, p[1] + math.sin(a) * largo)
    caida = l.rnd.uniform(0.1, 0.3) * largo
    ctrl = ((p[0] + fin[0]) / 2 + l.rnd.uniform(-8, 8), (p[1] + fin[1]) / 2 + caida)
    ramas.append(rama(l, p, ctrl, fin, grosor, max(1, grosor * 0.6)))
    if nivel <= 1:
        puntas.append(fin)
    if nivel == 0:
        return
    for desvio in (-l.rnd.uniform(18, 38), l.rnd.uniform(18, 38)):
        ramificar(l, fin, angulo + desvio, largo * l.rnd.uniform(0.55, 0.75), grosor * 0.6, nivel - 1, puntas, ramas)


def arbol(semilla, base_x, horquilla, extremidades, raices, retorcer, follaje, densidad_musgo, lianas):
    l = Lienzo(semilla)
    puntas, ramas = [], []

    # Raíces tablares que se abren hacia el suelo.
    for dx, alto in raices:
        rama(l, (base_x + dx * 0.15, ALTO - alto), (base_x + dx * 0.6, ALTO - alto * 0.3),
             (base_x + dx, ALTO - 2), 7, 2, musgo=0.4)

    # Tronco principal, retorcido (se inclina hacia la horquilla).
    ctrl = (base_x + (horquilla[0] - base_x) * 0.2, (ALTO + horquilla[1]) / 2)
    ramas.append(rama(l, (base_x, ALTO - 2), ctrl, horquilla, 15, 9, musgo=0.25, retorcer=retorcer))

    # Ramas principales: [ángulo, largo, grosor, niveles de división].
    for angulo, largo, grosor, nivel in extremidades:
        ramificar(l, horquilla, angulo, largo, grosor, nivel, puntas, ramas)

    # Follaje en las puntas (no en todas, como en el fondo).
    for x, y in puntas:
        if l.rnd.random() < follaje:
            copa(l, x, y, l.rnd.randint(9, 15))

    # Musgo colgante y bromelias sobre las ramas gruesas.
    for puntos in ramas:
        musgo_colgante(l, puntos, densidad_musgo, 20)
    for puntos in ramas[1:4]:
        x, y, g = puntos[len(puntos) // 2]
        bromelia(l, x, y - g - 1)

    # Lianas: colgando sueltas y en U entre puntas.
    for _ in range(lianas):
        x, y = l.rnd.choice(puntas)
        liana(l, x, y, l.rnd.randint(40, max(41, int(ALTO - y - 10))), l.rnd.uniform(1, 3))
    for _ in range(lianas // 2):
        a, b = l.rnd.sample(puntas, 2)
        if abs(a[0] - b[0]) > 30:
            liana_curva(l, a, b, l.rnd.randint(15, 40))

    l.contorno()
    return l.img, caminos_sobre_ramas(ramas[1:])


def caminos_sobre_ramas(ramas):
    """Líneas por encima de las ramas gruesas y poco inclinadas (cada ~3 px)."""
    caminos = []
    for puntos in ramas:
        tramo, ultimo = [], None
        for x, y, g in puntos:
            if ultimo and abs(x - ultimo[0]) < 3:
                continue
            pisable = g >= GROSOR_PISABLE
            if ultimo:
                pisable = pisable and abs((y - ultimo[1]) / (x - ultimo[0])) <= PENDIENTE_MAX
            if pisable:
                tramo.append([round(x), round(y - g)])
            elif len(tramo) >= 4:
                caminos.append(tramo)
                tramo = []
            else:
                tramo = []
            ultimo = (x, y)
        if len(tramo) >= 4:
            caminos.append(tramo)
    return caminos


def arboles():
    return [
        # Higuerón: copa ancha tipo paraguas.
        arbol('higueron', 150, (150, 88),
              [(-165, 80, 7, 3), (-125, 66, 6, 3), (-70, 56, 6, 3), (-20, 70, 6, 3), (12, 82, 7, 3)],
              [(-52, 30), (-30, 22), (32, 24), (56, 30)], retorcer=1.5,
              follaje=0.7, densidad_musgo=0.16, lianas=4),
        # Árbol alto, inclinado, cubierto de musgo.
        arbol('inclinado', 120, (172, 64),
              [(-150, 74, 6, 3), (-95, 50, 5, 3), (-40, 66, 6, 3), (10, 70, 6, 2)],
              [(-40, 22), (26, 26), (50, 20)], retorcer=2.5,
              follaje=0.5, densidad_musgo=0.35, lianas=3),
        # Árbol estrangulado por lianas, raíces enormes.
        arbol('estrangulado', 158, (146, 96),
              [(-170, 74, 7, 3), (-110, 60, 6, 3), (-55, 54, 5, 2), (-5, 64, 6, 3), (25, 70, 6, 2)],
              [(-74, 40), (-46, 30), (-20, 20), (24, 22), (50, 32), (80, 38)], retorcer=4,
              follaje=0.6, densidad_musgo=0.22, lianas=7),
    ]


def en_niebla(img, cantidad):
    """Versión para el fondo: mezclada con el color de la niebla."""
    niebla = Image.new('RGBA', img.size, NIEBLA + (255,))
    mezcla = Image.blend(img, niebla, cantidad)
    mezcla.putalpha(img.getchannel('A'))
    return mezcla


def main():
    lista = arboles()
    hoja = Image.new('RGBA', (ANCHO * len(lista), ALTO))
    for i, (img, _) in enumerate(lista):
        hoja.paste(img, (i * ANCHO, 0))
    hoja.save(LVL1 + 'arboles_300x200.png')
    en_niebla(hoja, NIEBLA_MEDIO).save(LVL1 + 'arboles_300x200_medio.png')
    en_niebla(hoja, NIEBLA_LEJANOS).save(LVL1 + 'arboles_300x200_lejanos.png')
    with open(LVL1 + 'arboles_300x200_ramas.json', 'w') as f:
        json.dump([caminos for _, caminos in lista], f)
    tramos = [len(caminos) for _, caminos in lista]
    print(f'{len(lista)} árboles de {ANCHO}x{ALTO}; tramos de rama pisables: {tramos}')


if __name__ == '__main__':
    main()
