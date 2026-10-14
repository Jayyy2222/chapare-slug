"""Árboles gigantes de selva (200x420 cada uno) para las capas de parallax.

Troncos gruesos (20-40 px de arte = 40-80 px en pantalla) que suben más allá
del borde de la pantalla, grandes raíces tabulares en la base, ramas gruesas
con lianas y musgo colgando, una liana enroscada en el tronco y la copa
arriba del todo. Usa las mismas funciones y paleta que arboles_selva.py.

Guarda en assets/fondos/lvl1/ cuatro spritesheets con 3 árboles:
  arboles_gigantes.png          -> colores normales
  arboles_gigantes_medio.png    -> capa media (algo de niebla)
  arboles_gigantes_lejanos.png  -> capa lejana (mucha niebla)
  arboles_gigantes_frente.png   -> primer plano (casi silueta, más oscuro)

Uso (desde la raíz del proyecto):  python3 herramientas/arboles_gigantes.py
"""
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import arboles_selva as base  # noqa: E402

ANCHO, ALTO = 200, 420
LVL1 = 'assets/fondos/lvl1/'
NIEBLA_MEDIO, NIEBLA_LEJANOS = 0.25, 0.5
OSCURO_FRENTE = (40, 34, 18)


def liana_enroscada(l, puntos):
    """Liana que da vueltas alrededor del tronco (se ve de frente y se esconde detrás)."""
    for i, (x, y, g) in enumerate(puntos[::2]):
        fase = math.sin(y / 9)
        if math.cos(y / 9) < 0:
            continue  # pasa por detrás del tronco
        px = x + fase * (g - 1)
        l.pixel(px, y, base.LIANA[1])
        l.pixel(px, y + 1, base.LIANA[0])
        if i % 7 == 0:
            l.pixel(px + 1, y, base.HOJAS[3])
            l.pixel(px + 2, y + 1, base.HOJAS[2])


def manchas_musgo(l, puntos, cantidad):
    """Manchas de musgo sobre el lado iluminado del tronco."""
    for _ in range(cantidad):
        x, y, g = l.rnd.choice(puntos)
        r = l.rnd.randint(2, 5)
        for dy in range(-r * 2, r * 2):
            for dx in range(-r, r):
                if (dx / r) ** 2 + (dy / (r * 2)) ** 2 <= 1 and l.rnd.random() < 0.8:
                    l.pixel(x - g * 0.4 + dx, y + dy, base.tono(base.MUSGO, 0.6 + l.grano(x + dx, y + dy, 0.3)))


def aleta(l, bx, grosor, dx, alto):
    """Raíz tabular: placa con el borde de afuera cóncavo, más clara arriba."""
    lado = 1 if dx > 0 else -1
    pegada = bx + lado * grosor * 0.7          # donde nace, en el costado del tronco
    arriba = ALTO - 2 - alto
    for y in range(arriba, ALTO - 1):
        t = (y - arriba) / alto
        borde = pegada + (bx + dx - pegada) * t ** 2.2   # curva cóncava hacia afuera
        espesor = 3 + 14 * t                             # la placa se ensancha al bajar
        x0, x1 = sorted((borde - lado * espesor, borde))
        for x in range(int(x0), int(x1) + 1):
            # Luz desde la izquierda y vetas verticales de corteza.
            f = (x - x0) / max(1, x1 - x0)
            luz = 0.65 - (f if lado > 0 else 1 - f) * 0.35 - t * 0.15 + l.grano(x, y, 0.12)
            if abs(math.sin(x * 0.9 + y * 0.05)) > 0.95:
                luz -= 0.25
            color = base.tono(base.CORTEZA, luz)
            if y == arriba + int((x - x0) * 0.2) % 3 and l.rnd.random() < 0.5:
                color = base.tono(base.MUSGO, 0.6)
            l.pixel(x, y, color)
        # Bordes oscuros, para que cada placa se lea separada de las otras.
        l.pixel(borde, y, base.CORTEZA[0])
        l.pixel(borde - lado * espesor, y, base.CORTEZA[0])


def gigante(semilla, inclinacion, grosor, raices, ramas_principales, lianas):
    l = base.Lienzo(semilla, ANCHO, ALTO)
    bx = ANCHO // 2
    puntas, ramas = [], []

    # Raíces tabulares: aletas anchas que bajan del tronco al suelo (primero las de atrás).
    for dx, alto, g in sorted(raices, key=lambda r: -r[1]):
        aleta(l, bx, grosor, dx, alto)

    # Tronco grueso, apenas inclinado, hasta arriba del lienzo.
    tope = (bx + inclinacion, 30)
    ctrl = (bx + inclinacion * 0.2, ALTO * 0.55)
    tronco = base.rama(l, (bx, ALTO - 2), ctrl, tope, grosor, grosor * 0.65, musgo=0.2, retorcer=1.2)
    ramas.append(tronco)

    # Ramas gruesas que salen de lado y se dividen.
    for altura, angulo, largo, g in ramas_principales:
        x, y, _ = tronco[int(len(tronco) * altura)]
        base.ramificar(l, (x, y), angulo, largo, g, 2, puntas, ramas)

    # Copa arriba del todo (casi siempre fuera de la pantalla) y en las puntas.
    for k in range(7):
        base.copa(l, tope[0] + l.rnd.randint(-70, 70), l.rnd.randint(14, 44), l.rnd.randint(12, 18))
    for x, y in puntas:
        if l.rnd.random() < 0.7:
            base.copa(l, x, y, l.rnd.randint(9, 14))

    # Detalles: musgo en el tronco, liana enroscada, musgo colgante, bromelias y lianas largas.
    manchas_musgo(l, tronco[len(tronco) // 4:], 14)
    liana_enroscada(l, tronco[len(tronco) // 5: int(len(tronco) * 0.8)])
    for puntos in ramas[1:]:
        base.musgo_colgante(l, puntos, 0.3, 24)
    for puntos in ramas[1:4]:
        x, y, g = puntos[len(puntos) // 2]
        base.bromelia(l, x, y - g - 1)
    for _ in range(lianas):
        x, y = l.rnd.choice(puntas)
        base.liana(l, x, y, l.rnd.randint(80, int(ALTO - y - 30)), l.rnd.uniform(1.5, 4))

    l.contorno()
    return l.img


def arboles():
    return [
        # Ceibo: tronco muy grueso y recto, raíces tabulares enormes.
        gigante('ceibo', 6, 20, [(-90, 90, 9), (-55, 70, 8), (-30, 50, 6), (35, 60, 7), (70, 80, 8), (95, 60, 6)],
                [(0.62, -160, 70, 8), (0.7, -25, 66, 7), (0.85, -140, 50, 6)], lianas=5),
        # Árbol alto apenas inclinado, más fino, con muchas lianas.
        gigante('alto', -16, 14, [(-70, 60, 7), (-40, 44, 5), (45, 52, 6), (80, 40, 5)],
                [(0.55, -20, 64, 6), (0.68, -165, 60, 6), (0.82, -35, 46, 5)], lianas=8),
        # Gigante con raíces anchas y ramas bajas.
        gigante('gigante', 10, 18, [(-95, 70, 8), (-60, 96, 9), (-20, 40, 5), (40, 84, 8), (90, 70, 7)],
                [(0.48, -150, 74, 8), (0.58, -30, 70, 8), (0.8, -90, 40, 6)], lianas=6),
    ]


def mezclar(img, color, cantidad):
    capa = Image.new('RGBA', img.size, color + (255,))
    mezcla = Image.blend(img, capa, cantidad)
    mezcla.putalpha(img.getchannel('A'))
    return mezcla


def main():
    lista = arboles()
    hoja = Image.new('RGBA', (ANCHO * len(lista), ALTO))
    for i, img in enumerate(lista):
        hoja.paste(img, (i * ANCHO, 0))
    hoja.save(LVL1 + 'arboles_gigantes.png')
    mezclar(hoja, base.NIEBLA, NIEBLA_MEDIO).save(LVL1 + 'arboles_gigantes_medio.png')
    mezclar(hoja, base.NIEBLA, NIEBLA_LEJANOS).save(LVL1 + 'arboles_gigantes_lejanos.png')
    mezclar(hoja, OSCURO_FRENTE, 0.6).save(LVL1 + 'arboles_gigantes_frente.png')
    print(f'{len(lista)} árboles gigantes de {ANCHO}x{ALTO} (normal, medio, lejanos, frente)')


if __name__ == '__main__':
    main()
