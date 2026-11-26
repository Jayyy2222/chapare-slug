"""Imágenes de la mina del Nivel 2 (parte 3: los túneles, escena Tuneles, y la
persecución en carrito, escena MineCartScene) a partir de
assets/fondos/lvl1/lvl2/mina_potosi/ (JPEG con fondo magenta).

Guarda en assets/nivel2/mina/tuneles/ (src/scenes/Tuneles.js), a escala 1 y
con la y del lienzo = la y del mundo (576 de alto):
  a1_roca.png         A1, la roca del fondo (tileSprite, parallax 0.1)
  a2_estructuras.png  A2, andamios, escaleras y faroles (parallax 0.35); el
                      magenta queda transparente (se ve A1)
  a3_nivel.png        A3, el nivel jugable (scrollFactor 1): dos pisos, la
                      pasarela, el altar del Tío y la pared con grietas. Sin
                      la jaula del ascensor (va aparte y se mueve)
  a3_jaula.png        la jaula del ascensor de cuerda
  a4_arriba.png, a4_abajo.png
                      A4, el primer plano (parallax 1.25, delante del
                      jugador): la franja de arriba (estalactitas, cadenas,
                      cables) y la de abajo (piedras y vigas). El medio de A4
                      tapaba todo el nivel: no va
  gota.png, hoja_salpica.png (3), hoja_polvo.png (4), hoja_destello.png (6),
  haz.png             efectos de A5 (goteo, polvo que cae, destellos de plata
                      y un haz de luz)
  tuneles_objetos.json  dónde están las lámparas de A3 (para sus luces), en
                      px del mundo

Y en assets/nivel2/mina/carrito/ (src/scenes/MineCartScene.js):
  b1_fondo.png, b2_andamios.png, b3_mina.png   parallax (0.05, 0.25, 0.6)
  via_<módulo>.png    los módulos de vía de B4 (recta, subida, bajada,
                      puente, caballete, hueco_a, hueco_b, viga, cambio,
                      tope). La viga sin el banco (la viga baja va aparte,
                      colgada: viga_tabla.png, viga_poste.png); el tope
                      espejado (el carrito llega desde la izquierda)
  relleno.png         roca para rellenar debajo de los módulos
  hoja_carro.png (4), hoja_enemigo.png (3, el blindado), hoja_destruccion.png (6),
  hoja_chispas.png (4), hoja_polvo.png (3), hoja_astillas.png (4),
  hoja_velocidad.png (3)   de B6 (sin la vía dibujada debajo de los carros)
  hoja_heroe.png (16)  heroe_carrito.jpeg: 0-3 andando, 4-6 dispara adelante,
                       7-9 dispara arriba, 10-11 agachado, 12-15 lanza
  dinamita.png         el cartucho de dinamita (también en los túneles)
  cart_modulos.json    ancho, alto y altura del riel (izquierda y derecha) de
                       cada módulo, y las celdas de las hojas

El recorrido de la vía (qué módulos van y en qué orden) NO sale de acá: está
en assets/nivel2/mina/carrito/cart_track.json (se edita a mano).

Uso (desde la raíz del proyecto):  python3 herramientas/mina_tuneles.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

from recorte_sprites import quitar_fondo, sin_tinte_magenta, componentes

ORIGEN = Path('assets/fondos/lvl1/lvl2/mina_potosi')
TUNELES = Path('assets/nivel2/mina/tuneles')
CARRITO = Path('assets/nivel2/mina/carrito')
ALTO = 576

# --- Túneles -----------------------------------------------------------------
# A3 (2064x512) se agranda a 576 de alto: x1.125.
A3_ESCALA = ALTO / 512
# La jaula del ascensor en A3 (px del JPEG): se saca del nivel.
JAULA = (1126, 296, 1217, 433)
# A4: franjas (y0, y1) del JPEG que quedan (arriba y abajo).
A4_ARRIBA = (0, 236)
A4_ABAJO = (676, 768)
# A5: cajas (x0, y0, x1, y1).
A5 = {
    'gota': [(879, 305, 895, 336)],
    'salpica': [(985, 338, 1058, 388), (1100, 322, 1208, 390), (1236, 304, 1370, 390)],
    'polvo': [(40, 458, 122, 548), (178, 458, 272, 592), (312, 458, 448, 622), (478, 458, 612, 622)],
    'destello': [(44, 664, 112, 724), (160, 628, 298, 762), (344, 654, 422, 734), (714, 648, 816, 738),
                 (844, 622, 988, 768), (1028, 648, 1112, 734)],
    'haz': [(694, 394, 1330, 614)],
}
A5_ESCALA = {'gota': 1, 'salpica': 0.55, 'polvo': 0.6, 'destello': 0.35, 'haz': 0.75}

# --- Carrito -----------------------------------------------------------------
B_ESCALA = ALTO / 768  # B1, B2, B3 (1376x768) a 576 de alto
VIA_ESCALA = 1
# Módulos de B4: caja y altura del riel de adelante (donde van las ruedas)
# en px de la caja, a la izquierda y a la derecha (medidas con el brillo de
# los rieles). espejo: se da vuelta.
MODULOS = {
    'recta': ((488, 58, 920, 249), 56, 56),
    'subida': ((958, 34, 1390, 249), 163, 39),
    'bajada': ((18, 302, 450, 504), 43, 160),
    'puente': ((958, 306, 1390, 504), 93, 93),
    'caballete': ((18, 68, 450, 249), 34, 34),
    'hueco_a': ((488, 354, 669, 504), 45, 45),
    'hueco_b': ((740, 354, 920, 504), 45, 45),
    'viga': ((19, 565, 450, 738), 98, 98),
    'cambio': ((488, 552, 920, 737), 111, 111),
    'tope': ((1006, 555, 1329, 738), 108, 108, True),
}
# Sin piso de roca debajo (se ve el abismo).
SIN_RELLENO = ['puente', 'caballete']
# La viga: el banco (caja en px del módulo) se borra; la tabla y un tramo de
# poste quedan sueltos.
VIGA_BANCO = (104, 0, 346, 72)
VIGA_TABLA = (108, 8, 342, 50)
VIGA_POSTE = (128, 48, 150, 68)
# La palanca del cambio de vía (centro y radio, px del módulo).
PALANCA = (282, 46, 34)

# Hojas de B6: cajas de cada cuadro y escala.
def fila(xs, y0, y1):
    return [(a, y0, b, y1) for a, b in xs]

XS_CARRO = [(23, 201), (260, 439), (497, 675), (734, 912)]
HOJAS_B6 = {
    'carro': (fila(XS_CARRO, 29, 103), 0.85),
    # El primero de la fila es un carro común (y arriba está el rótulo): solo los blindados.
    'enemigo': (fila(XS_CARRO[1:], 146, 226), 0.85),
    'destruccion': (fila([(23, 201), (258, 440), (495, 680), (730, 915), (968, 1152), (1238, 1356)], 270, 352), 0.85),
    'chispas': (fila([(120, 280), (440, 610), (775, 945), (1095, 1260)], 400, 462), 0.6),
    'polvo': (fila([(440, 640), (755, 975), (1085, 1300)], 470, 568), 0.8),
    'astillas': (fila([(125, 310), (440, 630), (775, 960), (1090, 1290)], 595, 670), 0.6),
    'velocidad': (fila([(130, 400), (440, 710), (780, 1070)], 697, 765), 1),
}
# heroe_carrito.jpeg: cajas de los cuadros (los de la componentes grandes).
HEROE = [
    (4, 12, 235, 218), (244, 12, 470, 218), (475, 12, 704, 218), (708, 12, 915, 218),
    (4, 230, 275, 434), (259, 230, 577, 433), (566, 230, 773, 433),
    (780, 221, 945, 420), (946, 218, 1153, 420), (1136, 233, 1371, 420),
    (915, 438, 1117, 572), (1130, 438, 1324, 572),
    (13, 577, 306, 767), (340, 577, 640, 767), (656, 577, 969, 767), (1098, 577, 1367, 767),
]
DINAMITA = (1018, 650, 1074, 672)
HEROE_ESCALA = 0.42


def limpio(img):
    return sin_tinte_magenta(quitar_fondo(img))


def escalar(img, k):
    if k == 1:
        return img
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


def alfa_nitido(img, corte=110):
    img.putalpha(img.getchannel('A').point(lambda a: 255 if a > corte else 0))
    return img


def espejada(img):
    doble = Image.new('RGBA', (img.width * 2, img.height))
    doble.paste(img, (0, 0))
    doble.paste(ImageOps.mirror(img), (img.width, 0))
    return doble


def hoja(cuadros, anclas=None):
    """Cuadros en una tira de celdas iguales, apoyados abajo. anclas: x de
    cada cuadro que va al mismo lugar de la celda (si no, el centro)."""
    anclas = anclas or [c.width / 2 for c in cuadros]
    izq = max(a for a in anclas)
    der = max(c.width - a for c, a in zip(cuadros, anclas))
    ancho = round(izq + der)
    alto = max(c.height for c in cuadros)
    tira = Image.new('RGBA', (ancho * len(cuadros), alto))
    for i, (c, a) in enumerate(zip(cuadros, anclas)):
        tira.paste(c, (i * ancho + round(izq - a), alto - c.height), c)
    return tira, ancho, alto


def recortar(img):
    caja = img.getchannel('A').getbbox()
    return img.crop(caja) if caja else img


def centro_cabeza(img):
    """x promedio de las filas de la cara (15-35 % de arriba)."""
    px = img.load()
    y0, y1 = int(img.height * 0.15), int(img.height * 0.35)
    xs = [x for y in range(y0, y1) for x in range(img.width) if px[x, y][3]]
    return sum(xs) / len(xs) if xs else img.width / 2


def lamparas(a3):
    """Lámparas de A3: manchas de píxeles muy claros y cálidos."""
    px = a3.load()
    puntos = [(x, y) for y in range(0, a3.height, 2) for x in range(0, a3.width, 2)
              if px[x, y][3] and px[x, y][0] > 238 and px[x, y][1] > 190 and px[x, y][2] < 190]
    grupos = []
    for x, y in puntos:
        for g in grupos:
            if abs(g[0] / g[2] - x) < 26 and abs(g[1] / g[2] - y) < 26:
                g[0] += x; g[1] += y; g[2] += 1
                break
        else:
            grupos.append([x, y, 1])
    return [(round(g[0] / g[2] * A3_ESCALA), round(g[1] / g[2] * A3_ESCALA), g[2]) for g in grupos if g[2] >= 3]


BORDE = 26  # px de los costados del módulo donde la roca se desvanece


def difuminar_bordes(m, izq, der):
    """La roca de los costados (debajo de los rieles) se desvanece: en el
    juego los módulos se superponen y la roca de uno se funde con la del otro,
    sin el corte vertical. Los rieles y durmientes no se tocan."""
    px = m.load()
    w, h = m.size
    for x in list(range(BORDE)) + list(range(w - BORDE, w)):
        f = min(x, w - 1 - x) / BORDE
        riel = izq + (der - izq) * x / max(1, w - 1)
        for y in range(int(riel + 16), h):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (r, g, b, round(a * f))


def tuneles():
    TUNELES.mkdir(parents=True, exist_ok=True)
    a1 = Image.open(ORIGEN / 'A1.jpeg').convert('RGBA')
    espejada(escalar(a1, ALTO / a1.height)).save(TUNELES / 'a1_roca.png')
    a2 = limpio(Image.open(ORIGEN / 'A2.jpeg'))
    espejada(alfa_nitido(escalar(a2, ALTO / a2.height))).save(TUNELES / 'a2_estructuras.png')

    a3 = limpio(Image.open(ORIGEN / 'A3.jpeg'))
    luces = lamparas(a3)
    jaula = recortar(a3.crop(JAULA))
    caja = a3.crop(JAULA).getchannel('A').getbbox()
    jaula_x = round((JAULA[0] + caja[0]) * A3_ESCALA)
    jaula_y = round((JAULA[1] + caja[1]) * A3_ESCALA)
    # Saca la jaula del nivel (queda lo de atrás: transparente).
    hueco = Image.new('RGBA', (JAULA[2] - JAULA[0], JAULA[3] - JAULA[1]))
    mascara = a3.crop(JAULA).getchannel('A')
    a3.paste(hueco, JAULA[:2], mascara)
    a3 = alfa_nitido(escalar(a3, A3_ESCALA))
    a3.save(TUNELES / 'a3_nivel.png')
    alfa_nitido(escalar(jaula, A3_ESCALA)).save(TUNELES / 'a3_jaula.png')

    a4 = limpio(Image.open(ORIGEN / 'A4.jpeg'))
    k4 = ALTO / a4.height
    for nombre, (y0, y1) in (('arriba', A4_ARRIBA), ('abajo', A4_ABAJO)):
        franja = alfa_nitido(escalar(a4.crop((0, y0, a4.width, y1)), k4))
        espejada(franja).save(TUNELES / f'a4_{nombre}.png')

    a5 = limpio(Image.open(ORIGEN / 'A5.jpeg'))
    celdas = {}
    for nombre, cajas in A5.items():
        cuadros = [alfa_nitido(escalar(recortar(a5.crop(c)), A5_ESCALA[nombre])) for c in cajas]
        if len(cuadros) == 1:
            cuadros[0].save(TUNELES / f'{nombre}.png')
            continue
        tira, w, h = hoja(cuadros)
        tira.save(TUNELES / f'hoja_{nombre}.png')
        celdas[nombre] = [w, h, len(cuadros)]

    datos = {
        'ancho': a3.width, 'alto': a3.height,
        'lamparas': [[x, y] for x, y, _ in luces],
        'jaula': {'x': jaula_x, 'y': jaula_y, 'ancho': round(jaula.width * A3_ESCALA), 'alto': round(jaula.height * A3_ESCALA)},
        'hojas': celdas,
    }
    (TUNELES / 'tuneles_objetos.json').write_text(json.dumps(datos, indent=1))
    print('túneles:', a3.size, len(luces), 'lámparas; jaula en', jaula_x, jaula_y)


def carrito():
    CARRITO.mkdir(parents=True, exist_ok=True)
    b1 = Image.open(ORIGEN / 'B1.jpeg').convert('RGBA')
    espejada(escalar(b1, B_ESCALA)).save(CARRITO / 'b1_fondo.png')
    b2 = limpio(Image.open(ORIGEN / 'B2.jpeg'))
    espejada(alfa_nitido(escalar(b2, B_ESCALA))).save(CARRITO / 'b2_andamios.png')
    b3 = limpio(Image.open(ORIGEN / 'B3.jpeg'))
    espejada(alfa_nitido(escalar(b3, B_ESCALA))).save(CARRITO / 'b3_mina.png')

    b4 = limpio(Image.open(ORIGEN / 'B4.jpeg'))
    modulos = {}
    for nombre, (caja, izq, der, *espejo) in MODULOS.items():
        m = b4.crop(caja)
        if nombre == 'viga':
            alfa_nitido(escalar(m.crop(VIGA_TABLA), VIA_ESCALA)).save(CARRITO / 'viga_tabla.png')
            alfa_nitido(escalar(m.crop(VIGA_POSTE), VIA_ESCALA)).save(CARRITO / 'viga_poste.png')
            m.paste(Image.new('RGBA', (VIGA_BANCO[2] - VIGA_BANCO[0], VIGA_BANCO[3] - VIGA_BANCO[1])), VIGA_BANCO[:2])
        if espejo:
            m = ImageOps.mirror(m)
            izq, der = der, izq
        m = alfa_nitido(escalar(m, VIA_ESCALA))
        difuminar_bordes(m, izq * VIA_ESCALA, der * VIA_ESCALA)
        m.save(CARRITO / f'via_{nombre}.png')
        k = VIA_ESCALA
        modulos[nombre] = {'ancho': m.width, 'alto': m.height, 'riel': [round(izq * k), round(der * k)],
                           'relleno': nombre not in SIN_RELLENO}
    px, py, pr = PALANCA
    modulos['cambio']['palanca'] = [round(px * VIA_ESCALA), round(py * VIA_ESCALA), round(pr * VIA_ESCALA)]
    # Relleno: las últimas filas de roca de la recta, oscurecidas.
    recta = Image.open(CARRITO / 'via_recta.png')
    franja = recta.crop((0, recta.height - 40, recta.width, recta.height - 4)).convert('RGBA')
    oscuro = Image.new('RGBA', franja.size, (20, 8, 6, 255))
    relleno = Image.blend(franja, oscuro, 0.55)
    relleno.putalpha(255)
    relleno.save(CARRITO / 'relleno.png')

    b6 = limpio(Image.open(ORIGEN / 'B6.jpeg'))
    celdas = {}
    for nombre, (cajas, k) in HOJAS_B6.items():
        cuadros = [alfa_nitido(escalar(recortar(b6.crop(c)), k)) for c in cajas]
        # Los carros: el cuadro entero (sin recortar) para que no salte.
        if nombre in ('carro', 'enemigo', 'destruccion'):
            cuadros = [alfa_nitido(escalar(b6.crop(c), k)) for c in cajas]
        tira, w, h = hoja(cuadros)
        tira.save(CARRITO / f'hoja_{nombre}.png')
        celdas[nombre] = [w, h, len(cuadros)]

    heroe = limpio(Image.open(ORIGEN / 'heroe_carrito.jpeg'))
    grandes, _ = componentes(heroe, 400)
    cuadros = []
    for caja in HEROE:
        # Solo los píxeles de las manchas cuyo centro cae en la caja (los
        # cuadros vecinos se pisan un poco).
        limpio_c = Image.new('RGBA', heroe.size)
        o, d = heroe.load(), limpio_c.load()
        for _, (x0, y0, x1, y1), pixeles in grandes:
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            if caja[0] <= cx <= caja[2] and caja[1] <= cy <= caja[3]:
                for x, y in pixeles:
                    d[x, y] = o[x, y]
        cuadros.append(alfa_nitido(escalar(recortar(limpio_c.crop(caja)), HEROE_ESCALA)))
    tira, w, h = hoja(cuadros, [centro_cabeza(c) for c in cuadros])
    tira.save(CARRITO / 'hoja_heroe.png')
    celdas['heroe'] = [w, h, len(cuadros)]
    din = alfa_nitido(escalar(recortar(heroe.crop(DINAMITA)), 0.6))
    din.save(CARRITO / 'dinamita.png')

    datos = {'modulos': modulos, 'hojas': celdas}
    (CARRITO / 'cart_modulos.json').write_text(json.dumps(datos, indent=1))
    print('carrito:', {n: (m['ancho'], m['riel']) for n, m in modulos.items()})
    print('hojas:', celdas)


if __name__ == '__main__':
    tuneles()
    carrito()
