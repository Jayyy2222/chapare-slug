"""Imágenes de la caverna del jefe del Nivel 2 (escenas CavernaJefe y
PersecucionJefe) a partir de:
  assets/fondos/lvl1/lvl2/mina_potosi/jefe2/  A1, A2, A3, B, C, persecucion
  assets/jefes/jefe2/                          la estatua y el jefe (El Tío)

Guarda en assets/nivel2/mina/caverna/ (todo con el magenta transparente, a
escala del juego, 576 de alto):
  a1_fondo.png        A1, la caverna del fondo (parallax 0.2), espejada
  a2_arena.png        A2, la arena del altar (scrollFactor 1)
  a3_frente.png       A3, el marco de roca delante (parallax 1.2), espejado
  persecucion.png     el mapa de la persecución; *_fondo.png sin el piso (y lo
                      negro del fondo de la cueva transparente: se ve el
                      parallax), *_piso.png la franja del piso (se rompe en
                      bloques), arena_altar.png, persecucion_lejos.png (el
                      mapa chico y oscuro: parallax del medio)
  hoja_minero.png     B: los mineros del ritual (26 cuadros, ver MINERO)
  hoja_c_<fila>.png   C: velas, vela que cae, botella, serpentinas, incienso,
                      aura, rocas, polvo, explosión (una hoja por fila)
  estatua.png         la estatua del Tío sobre el altar
  hoja_lava*.png      obejtos lava.jpeg: el suelo que se rompe, la lava, rocas,
                      salpicaduras, brasas y el borde (la persecución)
  jefe_<anim>.png     el jefe: despierta (la estatua se rompe y sale), ruge,
                      persigue, lanza, fuego, suelo, dano, muere
  caverna.json        las luces de los dos mapas (faroles y velas, para Light2D),
                      celdas de cada hoja y el punto de apoyo (origen) de las
                      del jefe: todas sus animaciones quedan con la cintura en
                      el mismo lugar (las hojas venían a escalas distintas:
                      ESCALAS las iguala)

Uso (desde la raíz del proyecto):  python3 herramientas/caverna_jefe.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

from recorte_sprites import quitar_fondo, sin_tinte_magenta

FONDOS = Path('assets/fondos/lvl1/lvl2/mina_potosi/jefe2')
JEFE = Path('assets/jefes/jefe2')
DESTINO = Path('assets/nivel2/mina/caverna')
ALTO = 576

# El jefe: cada hoja con su escala y sus cuadros. Las hojas venían dibujadas
# a tamaños distintos: las escalas igualan el tamaño de la cabeza y la
# separación de los cuernos al de persigue (la referencia). despierta queda
# más chica a propósito (crece desde la estatua).
# (unión), 'quitar' (cajas que no van) y 'pie' (y de la cintura en la hoja,
# si abajo hay una explosión o polvo que no cuenta).
JEFE_HOJAS = {
    'despierta': ('despierta_jefe.jpeg', 0.77, [
        (8, 318, 210, 592), (200, 296, 386, 548), {'cajas': [(365, 200, 590, 590)]},
        {'cajas': [(552, 90, 796, 488)], 'pie': 470}, {'cajas': [(790, 52, 1044, 488)], 'pie': 470},
        {'cajas': [(1038, 38, 1445, 488)], 'pie': 478},
    ]),
    'ruge': ('despierta2.jpeg', 0.92, [(6, 68, 504, 430), (510, 64, 936, 512), (945, 86, 1436, 450)]),
    'persigue': ('persigue.jpeg', 1.28, [
        (12, 30, 548, 296), (604, 44, 1060, 318), (1246, 36, 1560, 312),
        (14, 372, 596, 640), {'cajas': [(658, 368, 1150, 650)], 'pie': 632}, (1186, 358, 1574, 640),
    ]),
    'lanza': ('lanza_ataque.jpeg', 0.8, [
        (12, 20, 552, 630),
        # (la lata que vuela la tira el juego: no va dibujada)
        {'cajas': [(552, 96, 1070, 630)]},
        {'cajas': [(1046, 175, 1566, 632)], 'quitar': [(1070, 100, 1200, 245)]},
    ]),
    # La llamarada y el humo vienen cortados en recto por el borde del dibujo:
    # se sacan y los hace el juego desde la boca ('punto': la boca en la hoja).
    'fuego': ('ataque_fuego.jpeg', 0.83, [
        {'cajas': [(6, 24, 496, 524)], 'punto': (338, 160)},
        {'cajas': [(502, 78, 1048, 300), (502, 300, 942, 584)], 'quitar': [(880, 78, 1048, 300)], 'punto': (872, 238)},
        {'cajas': [(942, 126, 1439, 584)], 'quitar': [(942, 78, 1048, 300), (1318, 126, 1439, 360)], 'punto': (1300, 288)},
    ]),
    'suelo': ('ataque_suelo.jpeg', 0.88, [
        (6, 16, 488, 556), {'cajas': [(498, 94, 934, 592)], 'pie': 508}, (942, 150, 1414, 558),
    ]),
    'dano': ('recibe_dano.jpeg', 0.82, [(6, 30, 512, 594), (512, 78, 946, 594), (946, 80, 1426, 594)]),
    # camina.jpeg: de cuerpo entero, pero en la persecución va hundido en la
    # lava: solo de la cintura (la pollera de hojas) para arriba.
    'camina': ('camina.jpeg', 1.4, [
        {'cajas': [(x0, 40, x1, 330)], 'pie': 300} for x0, x1 in
        [(0, 352), (352, 602), (602, 832), (832, 1072), (1072, 1312), (1312, 1581)]
    ]),
    # luego_de_muere.jpeg: sigue a muere (se agrieta, arde y se derrumba).
    'muere2': ('luego_de_muere.jpeg', 1.15, [
        (30, 4, 372, 390), (372, 30, 726, 392), (710, 50, 1112, 390), (1090, 80, 1560, 362),
        (255, 405, 626, 648), (648, 398, 1020, 650), (1070, 398, 1415, 660),
    ]),
    'muere': ('muere.jpeg', 0.85, [(18, 24, 502, 552), (514, 52, 988, 552), (990, 196, 1422, 552)]),
}
ESTATUA = ('estatua.jpeg', 205)  # alto en el juego (como el primer cuadro de despierta)

# Mineros (B.jpeg): cajas de los 26 cuadros, en orden:
#  0-3   arrodillado (reza, se inclina, postrado, arrodillado)
#  4-7   con la botella (la tiene, se inclina, la vierte, la tiene)
#  8-11  con la vela
#  12-14 festeja (de frente)   15-19 de espaldas con los brazos arriba (trepa)
#  20    festeja   21 sorprendido   22 cae de espaldas
#  23    agachado con el garrote   24 garrote arriba   25 en guardia
MINERO = [
    (36, 6, 162, 183), (181, 40, 341, 183), (346, 87, 533, 183), (560, 6, 687, 183),
    (36, 193, 153, 381), (201, 204, 330, 381), (360, 211, 486, 381), (546, 193, 662, 381),
    (720, 196, 828, 381), (885, 193, 1002, 381), (1053, 193, 1175, 381), (1222, 197, 1344, 381),
    (23, 390, 162, 574), (184, 389, 317, 574), (340, 392, 445, 574), (485, 389, 604, 573),
    (633, 388, 756, 573), (777, 392, 887, 574), (909, 389, 1029, 573), (1049, 390, 1179, 574),
    (1209, 389, 1343, 573),
    (25, 580, 195, 767), (237, 581, 437, 731), (455, 612, 576, 767), (602, 582, 714, 767), (1215, 583, 1332, 767),
]
MINERO_ESCALA = 0.62
# En el cuadro "sorprendido" y en el que cae, la botella y la vela que suelta
# van aparte (las tira el juego): solo la mancha más grande.
MINERO_SOLO_CUERPO = [21, 22]

# C.jpeg: filas (y0, y1) y escala. Los cuadros se buscan solos (columnas con
# píxeles, separadas por huecos de más de HUECO px).
C_FILAS = {
    'velas': ((22, 128), 0.55),
    'vela_cae': ((138, 198), 0.55),
    'botella': ((200, 266), 0.55),
    'serpentina': ((266, 322), 0.6),
    'incienso': ((326, 404), 0.6),
    'aura': ((412, 464), 0.9),
    'rocas': ((466, 556), 0.8),
    'polvo': ((556, 658), 1.2),
    'explosion': ((660, 768), 1.1),
}
HUECO = 18

# obejtos lava.jpeg (assets/jefes/jefe2/): filas (y0, y1) y escala, como C.
# Los rótulos de cada fila (texto blanco) se tapan antes (LAVA_ROTULOS).
LAVA_FILAS = {
    'lava_rompe': ((24, 118), 0.6),    # el bloque de suelo se agrieta y cae a la lava (8)
    'lava': ((150, 246), 0.46),        # la superficie de lava (4, en bucle)
    'lava_rocas': ((262, 376), 0.6),   # rocas y rieles rotos que saltan (6)
    'lava_salpica': ((406, 506), 0.6), # salpicadura de lava (6)
    'lava_brasas': ((536, 640), 0.7),  # brasas que suben (4)
    'lava_borde': ((670, 766), 0.46),  # borde de suelo con lava (4)
}
# Los cuadros de lava se tocan: columnas fijas (x0, x1) de cada fila.
COL_ROMPE = [(8, 177), (182, 352), (356, 527), (530, 702), (704, 877), (879, 1052), (1054, 1227), (1230, 1402)]
COL_4 = [(4, 236), (239, 471), (474, 702), (705, 933)]
COL_6 = COL_4 + [(937, 1167), (1169, 1401)]
LAVA_COLUMNAS = {'lava_rompe': COL_ROMPE, 'lava': COL_4, 'lava_rocas': COL_6, 'lava_salpica': COL_6,
                 'lava_brasas': COL_4, 'lava_borde': COL_4}
LAVA_ROTULOS = [(0, 0, 400, 24), (0, 120, 330, 150), (0, 250, 515, 280), (0, 381, 262, 406), (0, 510, 332, 537), (0, 640, 286, 670)]

A2_ESCALA = ALTO / 720

# El piso se separa del dibujo (en el juego se rompe en bloques y cae a la
# lava): y del corte (px del juego) en la arena y en la persecución. El altar
# (la caja, px del juego) también va aparte: se hunde en la lava.
CORTE_ARENA = 462
CORTE_PERSECUCION = 468
ALTAR = (350, 160, 808, 466)
# La lava que se ve debajo del piso roto: el medio de un cuadro de la
# superficie de lava (obejtos lava.jpeg), repetido.
LAVA_TILE = (24, 166, 214, 232)


def limpio(img):
    return sin_tinte_magenta(quitar_fondo(img))


def escalar(img, k):
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


def alfa_nitido(img, corte=110):
    img.putalpha(img.getchannel('A').point(lambda a: 255 if a > corte else 0))
    return img


def espejada(img):
    doble = Image.new('RGBA', (img.width * 2, img.height))
    doble.paste(img, (0, 0))
    doble.paste(ImageOps.mirror(img), (img.width, 0))
    return doble


def recortar_cuadro(hoja, d):
    """Los píxeles de la unión de cajas (menos las de 'quitar'), recortados."""
    d = d if isinstance(d, dict) else {'cajas': [d]}
    cajas = d['cajas']
    x0 = min(c[0] for c in cajas); y0 = min(c[1] for c in cajas)
    x1 = max(c[2] for c in cajas); y1 = max(c[3] for c in cajas)
    out = Image.new('RGBA', (x1 - x0, y1 - y0))
    for c in cajas:
        out.paste(hoja.crop(c), (c[0] - x0, c[1] - y0))
    for q in d.get('quitar', []):
        a = (max(q[0], x0) - x0, max(q[1], y0) - y0, min(q[2], x1) - x0, min(q[3], y1) - y0)
        if a[2] > a[0] and a[3] > a[1]:
            out.paste(Image.new('RGBA', (a[2] - a[0], a[3] - a[1])), a[:2])
    caja = out.getchannel('A').getbbox()
    pie = d.get('pie')
    pie = (pie - y0 - caja[1]) if pie is not None else None
    return out.crop(caja), pie, (x0 + caja[0], y0 + caja[1])


def mascara(img, f):
    a = img.getchannel('A').resize((max(1, img.width // f), max(1, img.height // f)), Image.BILINEAR)
    return a.point(lambda v: 255 if v > 100 else 0)


def alinear(img, ax, ay, ref, rax, ray, f=3, rango=(60, 26)):
    """Corre el ancla (ax, ay) del cuadro para que su figura caiga lo más
    encima posible de la de referencia (la pose de andar): así, al pasar de
    andar a un ataque, el cuerpo no salta. Busca el corrimiento con más
    superposición (IoU) de las siluetas, a 1/f de tamaño."""
    from PIL import ImageChops
    m, r = mascara(img, f), mascara(ref, f)
    na = m.histogram()[255]
    nb = r.histogram()[255]
    bx, by = round((rax - ax) / f), round((ray - ay) / f)  # dónde cae el cuadro (en la referencia), por la cintura
    W, H = r.size
    mejor = (-1, 0, 0)
    for dy in range(-rango[1], rango[1] + 1):
        for dx in range(-rango[0], rango[0] + 1, 2):
            lienzo = Image.new('L', (W, H))
            lienzo.paste(m, (bx + dx, by + dy))
            inter = ImageChops.multiply(lienzo, r).histogram()[255]
            iou = inter / (na + nb - inter)
            if iou > mejor[0]:
                mejor = (iou, dx, dy)
    _, dx, dy = mejor
    return ax - dx * f, ay - dy * f


def solo_mayor(img):
    from recorte_sprites import componentes
    grandes, _ = componentes(img, 1)
    _, _, px = max(grandes, key=lambda m: m[0])
    out = Image.new('RGBA', img.size)
    o, d = img.load(), out.load()
    for x, y in px:
        d[x, y] = o[x, y]
    return out.crop(out.getchannel('A').getbbox())


def ancla_cintura(img, pie=None):
    """x de la cintura: mediana de los píxeles de una franja justo encima del pie."""
    pie = img.height if pie is None else pie
    a = img.getchannel('A').load()
    y0, y1 = int(pie - img.height * 0.14), int(pie - img.height * 0.03)
    xs = sorted(x for y in range(max(0, y0), max(1, y1)) for x in range(img.width) if a[x, y])
    return (xs[len(xs) // 2] if xs else img.width / 2), pie


def hoja_anclada(cuadros):
    """cuadros: [(img, ax, ay)] -> (tira, ancho, alto, origen_x, origen_y)."""
    L = max(ax for _, ax, _ in cuadros); R = max(i.width - ax for i, ax, _ in cuadros)
    T = max(ay for _, _, ay in cuadros); B = max(i.height - ay for i, _, ay in cuadros)
    w, h = round(L + R), round(T + B)
    tira = Image.new('RGBA', (w * len(cuadros), h))
    for k, (img, ax, ay) in enumerate(cuadros):
        tira.paste(img, (k * w + round(L - ax), round(T - ay)), img)
    return tira, w, h, round(L) / w, round(T) / h


def columnas(img, y0, y1):
    a = img.getchannel('A').load()
    llenas = [any(a[x, y] for y in range(y0, y1)) for x in range(img.width)]
    tramos, x = [], 0
    while x < img.width:
        if not llenas[x]:
            x += 1
            continue
        inicio = x
        hueco = 0
        while x < img.width and hueco <= HUECO:
            hueco = 0 if llenas[x] else hueco + 1
            x += 1
        tramos.append((inicio, x - hueco))
    return [t for t in tramos if t[1] - t[0] >= 8]


def luces(img, minimo=2):
    """Faroles y velas del dibujo: manchas de píxeles muy claros y cálidos."""
    px = img.load()
    g = []
    for y in range(0, img.height, 2):
        for x in range(0, img.width, 2):
            r, gr, b, a = px[x, y]
            if not (a and r > 240 and gr > 190 and b < 190):
                continue
            for q in g:
                if abs(q[0] / q[2] - x) < 20 and abs(q[1] / q[2] - y) < 20:
                    q[0] += x; q[1] += y; q[2] += 1
                    break
            else:
                g.append([x, y, 1])
    return [[round(a / n), round(b / n)] for a, b, n in g if n >= minimo]


def huecos_oscuros(img, desde=14, hasta=46):
    """Lo casi negro del fondo de la cueva se vuelve transparente (de a poco):
    por ahí se ven las capas de parallax de atrás."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            m = max(r, g, b)
            if a and m < hasta:
                px[x, y] = (r, g, b, round(a * max(0, m - desde) / (hasta - desde)))
    return img


def lava_hoja_original():
    return Image.open(JEFE / 'obejtos lava.jpeg').convert('RGB')


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    datos = {'hojas': {}, 'jefe': {}}

    a1 = Image.open(FONDOS / 'A1.jpeg').convert('RGBA')
    espejada(escalar(a1, ALTO / a1.height)).save(DESTINO / 'a1_fondo.png')
    a2 = alfa_nitido(escalar(limpio(Image.open(FONDOS / 'A2.jpeg')), A2_ESCALA))
    a2.save(DESTINO / 'a2_arena.png')
    a3 = limpio(Image.open(FONDOS / 'A3.jpeg'))
    espejada(alfa_nitido(escalar(a3, ALTO / a3.height))).save(DESTINO / 'a3_frente.png')
    pe = limpio(Image.open(FONDOS / 'persecucion.jpeg'))
    pe = alfa_nitido(escalar(pe, ALTO / pe.height))
    pe.save(DESTINO / 'persecucion.png')
    # Sin el piso (fondo) y el piso solo (franja): el juego lo corta en bloques.
    # Una copia lejana del mapa (más chica y oscura) para el parallax del medio.
    lejos = escalar(pe, 0.72)
    oscuro = Image.new('RGBA', lejos.size, (24, 6, 4, 255))
    lejos = Image.composite(Image.blend(lejos, oscuro, 0.55), Image.new('RGBA', lejos.size), lejos.getchannel('A'))
    huecos_oscuros(lejos).save(DESTINO / 'persecucion_lejos.png')  # (sin espejo: se notaba)
    for nombre, img, corte in (('arena', a2, CORTE_ARENA), ('persecucion', pe, CORTE_PERSECUCION)):
        fondo = img.copy()
        if nombre == 'persecucion':
            huecos_oscuros(fondo)
        fondo.paste(Image.new('RGBA', (img.width, img.height - corte)), (0, corte))
        if nombre == 'arena':
            img.crop(ALTAR).save(DESTINO / 'arena_altar.png')
            fondo.paste(Image.new('RGBA', (ALTAR[2] - ALTAR[0], ALTAR[3] - ALTAR[1])), ALTAR[:2])
        fondo.save(DESTINO / f'{nombre}_fondo.png')
        img.crop((0, corte, img.width, img.height)).save(DESTINO / f'{nombre}_piso.png')
    datos['arena'] = {'ancho': a2.width, 'escala': A2_ESCALA, 'luces': luces(a2), 'corte': CORTE_ARENA, 'altar': ALTAR}
    datos['persecucion'] = {'ancho': pe.width, 'escala': ALTO / 512, 'luces': luces(pe, 3), 'corte': CORTE_PERSECUCION}

    # Mineros: apoyados abajo y centrados.
    b = limpio(Image.open(FONDOS / 'B.jpeg'))
    cuadros = []
    for i, c in enumerate(MINERO):
        img = b.crop(c)
        img = solo_mayor(img) if i in MINERO_SOLO_CUERPO else img.crop(img.getchannel('A').getbbox())
        img = alfa_nitido(escalar(img, MINERO_ESCALA))
        cuadros.append((img, img.width / 2, img.height))
    tira, w, h, ox, oy = hoja_anclada(cuadros)
    tira.save(DESTINO / 'hoja_minero.png')
    datos['hojas']['minero'] = [w, h, len(cuadros)]

    # C: una hoja por fila.
    c = limpio(Image.open(FONDOS / 'C.jpeg'))
    for nombre, ((y0, y1), k) in C_FILAS.items():
        cuadros = []
        for x0, x1 in columnas(c, y0, y1):
            img = c.crop((x0, y0, x1, y1))
            caja = img.getchannel('A').getbbox()
            if not caja:
                continue
            # Apoyados abajo (la fila entera, así no saltan entre cuadros).
            img = img.crop((caja[0], 0, caja[2], img.height))
            img = alfa_nitido(escalar(img, k))
            cuadros.append((img, img.width / 2, img.height))
        tira, w, h, ox, oy = hoja_anclada(cuadros)
        tira.save(DESTINO / f'hoja_c_{nombre}.png')
        datos['hojas']['c_' + nombre] = [w, h, len(cuadros)]

    # Lava (la persecución: el camino que se rompe).
    lava = limpio(Image.open(JEFE / 'obejtos lava.jpeg'))
    for caja in LAVA_ROTULOS:
        lava.paste(Image.new('RGBA', (caja[2] - caja[0], caja[3] - caja[1])), caja[:2])
    for nombre, ((y0, y1), k) in LAVA_FILAS.items():
        cuadros = []
        for x0, x1 in LAVA_COLUMNAS[nombre]:
            # La celda entera (sin recortar): todos los cuadros quedan del mismo ancho.
            img = alfa_nitido(escalar(lava.crop((x0, y0, x1, y1)), k))
            cuadros.append((img, img.width / 2, img.height))
        tira, w, h, ox, oy = hoja_anclada(cuadros)
        tira.save(DESTINO / f'hoja_{nombre}.png')
        datos['hojas'][nombre] = [w, h, len(cuadros)]

    # La lava de abajo, que se repite.
    tile = lava_hoja_original().crop(LAVA_TILE).convert('RGBA')
    tile.putalpha(255)
    espejada(escalar(tile, 0.6)).save(DESTINO / 'lava_tile.png')

    # Estatua.
    archivo, alto = ESTATUA
    est = limpio(Image.open(JEFE / archivo))
    est = est.crop(est.getchannel('A').getbbox())
    est = alfa_nitido(escalar(est, alto / est.height))
    est.save(DESTINO / 'estatua.png')
    datos['estatua'] = {'ancho': est.width, 'alto': est.height}

    # El jefe: cada animación en su hoja, con la cintura en el mismo punto.
    ref = None
    for nombre, (archivo, k, defs) in JEFE_HOJAS.items():
        hoja = limpio(Image.open(JEFE / archivo))
        cuadros = []
        puntos = []
        for d in defs:
            img, pie, (cx0, cy0) = recortar_cuadro(hoja, d)
            if nombre == 'camina':
                # Solo la figura (al borde de la caja asoman pedazos del vecino).
                w0, h0 = img.size
                img = solo_mayor(img)
                pie = pie - (h0 - img.height) if pie is not None else None
            img = alfa_nitido(escalar(img, k))
            ax, ay = ancla_cintura(img, None if pie is None else pie * k)
            # Todo (menos el despertar) alineado a la pose de andar (ruge 0).
            if nombre == 'ruge' and ref is None:
                ref = (img, ax, ay)
            elif nombre != 'despierta' and ref is not None:
                ax, ay = alinear(img, ax, ay, *ref)
            cuadros.append((img, ax, ay))
            p = d.get('punto') if isinstance(d, dict) else None
            puntos.append([round((p[0] - cx0) * k - ax), round((p[1] - cy0) * k - ay)] if p else None)
        tira, w, h, ox, oy = hoja_anclada(cuadros)
        tira.save(DESTINO / f'jefe_{nombre}.png')
        datos['jefe'][nombre] = {'ancho': w, 'alto': h, 'cuadros': len(cuadros), 'origen': [round(ox, 4), round(oy, 4)]}
        if any(puntos):
            datos['jefe'][nombre]['puntos'] = puntos  # (px desde el origen, a escala 1)
        print(nombre, w, h, len(cuadros), (round(ox, 2), round(oy, 2)))

    (DESTINO / 'caverna.json').write_text(json.dumps(datos, indent=1))
    print('hojas:', datos['hojas'])


if __name__ == '__main__':
    main()
