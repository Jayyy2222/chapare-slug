"""Entrada a la Cueva de los Guácharos (Nivel1, en la cara izquierda del
peñón) a partir de assets/fondos/cueva/cueva_front_back.jpeg: dos paneles
sobre magenta, BACK (la cueva entera) y FRONT (el arco con los colmillos).
Todo pasa por la paleta cálida del nivel (calidez_chapare.calentar) y queda a
ESCALA_DIBUJO (en el juego va a escala 1). Guarda en assets/cueva/:

  cueva_back.png    (scroll 1, detrás del jugador) la ladera de la izquierda,
                    la jamba del arco y el borde de adelante del piso de losas
                    (con el comienzo roto e irregular: se mezcla con la tierra).
                    Abajo de la ladera queda transparente: se ve la tierra del
                    nivel, sin cambio de suelo.
  cueva_tunel.png   (parallax, más lento) paredes, techo y el piso que se
                    aleja; un poco más ancho (por el parallax)
  cueva_hueco.png   máscara de la abertura: el túnel y la oscuridad solo se
                    ven por ahí (nunca tapan los colmillos ni la roca de afuera)
  cueva_front.png   el arco con los colmillos (delante del jugador)
  cueva_colina.png  la colina de arriba, del mismo ancho que la cueva y
                    alineada con ella: su ladera sigue la de la cueva y su pie
                    se funde sobre el borde de arriba; matorrales en la cresta
  roca_1..4.png     rocas sueltas
  entrada_collision.json  piso y pared del fondo, en px del mundo de Nivel1
                    (se ajusta en el juego con la tecla E)

Las capas se recortan en CORTE, más allá de donde llega la cámara (el borde
derecho del peñón): no se ve ningún corte vertical.

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/entrada_cueva.py
"""
import json
import math
import random
from pathlib import Path

from PIL import Image

from calidez_chapare import calentar

CARPETA = Path('assets/cueva')
DIBUJO = Path('assets/fondos/cueva/cueva_front_back.jpeg')
MUNDO = {'borde': 39 * 128, 'piso': 528}  # borde del peñón y piso en Nivel1

# --- Medidas del dibujo (px de cueva_front_back.jpeg) ---------------------
BACK = (43, 40, 1364, 361)  # el panel BACK
DESFASE = 365               # FRONT = BACK + DESFASE (alineados por la roca de arriba)
PISO_DIBUJO = 345           # y (BACK) donde van los pies (la línea de abajo de FRONT)
PISO_CERCA = 330            # y (BACK) del borde de adelante del piso (va con el jugador)
CORTE = 905                 # x hasta donde se usa (más allá de la cámara)
LABIO = 535                 # y (FRONT) de abajo del arco que va delante
JAMBA = 250                 # x (FRONT) desde donde el arco va delante
BOCA_DIBUJO = 370           # x donde empieza la abertura al ras del piso
ROTO = 46                   # px del comienzo roto de las losas
ESCALA_DIBUJO = 0.75
MARGEN_TUNEL = 60           # px de más del túnel a la derecha (por el parallax)

PALETA = {
    'contorno': (36, 23, 0),
    'piedra': [(70, 56, 15), (91, 75, 25), (114, 95, 37), (139, 120, 56), (168, 149, 80)],
    'musgo': [(56, 74, 20), (84, 106, 32), (118, 140, 50), (156, 172, 74)],
}


def ruido(t, k):
    return math.sin(t * 0.37 + k) * 0.5 + math.sin(t * 0.13 + k * 2.1) * 0.35 + math.sin(t * 0.71 + k * 0.7) * 0.15


def grano(x, y, bloque=3, k=0):
    """Ruido fijo por bloque, entre -1 y 1."""
    n = math.sin((x // bloque) * 127.1 + (y // bloque) * 311.7 + k * 74.7) * 43758.5453
    return (n - math.floor(n)) * 2 - 1


def clamp(v, a, b):
    return max(a, min(b, v))


def es_magenta(r, g, b):
    """Magenta del fondo y sus bordes manchados (también los oscuros)."""
    return r > 60 and b > 60 and g < 0.62 * min(r, b) and abs(r - b) < 0.35 * max(r, b)


def limpio(r, g, b):
    """El dibujo es de roca y lianas (marrones/verdes: azul <= verde): lo que
    tiene más azul que verde es mezcla con el magenta del jpeg."""
    if b > g:
        b = int(g * 0.85)
        r = min(r, int(g * 1.12) + 4)
    return (r, g, b, 255)


def achicar(img, factor, calido=True, alfa_suave=False):
    """A `factor` del tamaño. Bordes duros (alfa 0 o 255), salvo con
    alfa_suave (los degradados, como el fundido de la colina, se conservan)."""
    tam = (round(img.width * factor), round(img.height * factor))
    chica = img.resize(tam, Image.LANCZOS)
    if not alfa_suave:
        chica.putalpha(chica.getchannel('A').point(lambda a: 255 if a > 110 else 0))
    return calentar(chica, saturacion=1.1) if calido else chica


def ladera_izquierda(sy):
    """x (en el dibujo) donde empieza la ladera en la fila sy: el panel corta
    recto a la izquierda; se reemplaza por una pendiente irregular que baja
    hasta el suelo."""
    return BACK[0] + max(0, (PISO_CERCA - sy)) * 0.55 + ruido(sy * 0.8, 4) * 5 + 5


def contorno_arriba(sx):
    """y (en el dibujo) del borde de arriba de la cueva: el panel corta recto;
    se rompe en un contorno irregular de rocas que va bajando un poco hacia
    la derecha (se mete en la selva)."""
    return 44 + max(0, sx - 300) * 0.012 + abs(ruido(sx * 0.45, 9)) * 9 + grano(sx, 0, 6, 4) * 2.5


def ladera_abajo(sx):
    """y (en el dibujo) donde termina la ladera sobre la tierra: irregular."""
    return PISO_CERCA + 6 + ruido(sx * 0.9, 6) * 4 + grano(sx, 0, 4, 2) * 2


# --- Capas de la cueva ------------------------------------------------------

def capas_cueva(im):
    px = im.load()
    x0, y0, _, y1 = BACK
    w, h = CORTE - x0, y1 - y0
    marco = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    tunel = Image.new('RGBA', (w + MARGEN_TUNEL, h), (0, 0, 0, 0))
    hueco = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    front = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    pm, pt, ph, pf = marco.load(), tunel.load(), hueco.load(), front.load()
    for y in range(h):
        sy = y + y0
        for x in range(w + MARGEN_TUNEL):
            sx = x + x0
            borde_panel = sy >= 357 or sx >= 1362 or (sx > 200 and sy < contorno_arriba(sx))
            r, g, b = px[sx, sy]
            atras = None if borde_panel or es_magenta(r, g, b) else limpio(r, g, b)
            # Túnel: lo de adentro (paredes, techo y el piso que se aleja).
            if atras and sx >= JAMBA and sy < PISO_CERCA:
                pt[x, y] = atras
            if x >= w:
                continue
            adentro = sx >= BOCA_DIBUJO - 10
            # Marco: la ladera (sin su base: ahí se ve la tierra del nivel) y
            # el borde de adelante del piso de losas, con el comienzo roto.
            # La ladera: pendiente irregular a la izquierda y abajo (sin cortes rectos).
            fuera_ladera = sx < ladera_izquierda(sy) or (not adentro and sy >= ladera_abajo(sx))
            contorno = not fuera_ladera and (sx < ladera_izquierda(sy) + 2 or (not adentro and sy >= ladera_abajo(sx) - 2))
            if atras and not fuera_ladera:
                if sx < JAMBA and sy < PISO_CERCA + 8:
                    pm[x, y] = (40, 30, 10, 255) if contorno else atras
                elif adentro and sy >= PISO_CERCA:
                    t = (sx - BOCA_DIBUJO) / ROTO
                    if t > 1 or grano(sx, sy, 3, 5) * 0.5 + 0.5 < t + ruido(sy, 2) * 0.15:
                        pm[x, y] = atras
            fy = sy + DESFASE
            if fy < 708:
                r, g, b = px[sx, fy]
                if es_magenta(r, g, b):
                    if sx > JAMBA + 40:
                        ph[x, y] = (255, 255, 255, 255)
                elif fy < LABIO and sx >= JAMBA:
                    if sy >= contorno_arriba(sx):
                        borde = sy < contorno_arriba(sx) + 2
                        pf[x, y] = (40, 30, 10, 255) if borde else limpio(r, g, b)
                elif not fuera_ladera:
                    pm[x, y] = (40, 30, 10, 255) if contorno else limpio(r, g, b)
            elif sx > JAMBA + 40 and sy < 360:
                ph[x, y] = (255, 255, 255, 255)  # el hueco llega hasta abajo
    for img, nombre in [(marco, 'cueva_back'), (tunel, 'cueva_tunel'), (front, 'cueva_front')]:
        achicar(img, ESCALA_DIBUJO).save(CARPETA / f'{nombre}.png')
    achicar(hueco, ESCALA_DIBUJO, calido=False).save(CARPETA / 'cueva_hueco.png')
    e = lambda v: round(v * ESCALA_DIBUJO)
    return {'ancho': e(w), 'alto': e(h), 'piso': e(PISO_DIBUJO - y0), 'boca': e(BOCA_DIBUJO - x0)}


# --- Colina de arriba ---------------------------------------------------------
# Del MISMO ancho que la cueva y alineada con ella (misma x de la textura): su
# ladera izquierda sigue la pendiente de la ladera de la cueva (ladera_izquierda)
# y su pie tapa, fundido, el borde de arriba de la cueva.
ALTO_COLINA = 560           # px del dibujo: pasa el borde de arriba de la pantalla (no se ve la cima)
FUNDIDO = 60                # px del pie de la colina que se funden sobre la cueva
PARCHE = 132                # px de los parches de roca (grandes: la misma escala de piedras que la cueva)


def roca_parches(im, W, H, semilla):
    """Roca con la MISMA textura que la cueva, siguiendo lo que tiene debajo:
    a la izquierda la de la ladera (vetas diagonales) y a la derecha la de
    la franja de arriba del arco (piedras horizontales), mezcladas en el medio.
    Pedazos de tamaño y lugar al azar (sin grilla), con bordes ovalados y
    fundidos, sin espejar."""
    rnd = random.Random(semilla)
    def juntar(caja, cantidad):
        lista = []
        for _ in range(cantidad * 8):
            pw_, ph_ = rnd.randint(70, 150), rnd.randint(44, 90)
            pw_, ph_ = min(pw_, caja[2] - caja[0]), min(ph_, caja[3] - caja[1])
            x = rnd.randint(caja[0], caja[2] - pw_)
            y = rnd.randint(caja[1], caja[3] - ph_)
            p = im.crop((x, y, x + pw_, y + ph_))
            if not any(es_magenta(*p.getpixel((i, j))) for i in range(0, pw_, 3) for j in range(0, ph_, 3)):
                lista.append(p)
            if len(lista) >= cantidad:
                break
        return lista
    ladera = juntar((50, 115, 240, 330), 40)        # BACK: la ladera
    franja = juntar((640, 407, 1355, 456), 40)      # FRONT: arriba del arco
    lienzo = Image.new('RGB', (W, H), (70, 60, 36))
    def mascara(w, h):
        m = Image.new('L', (w, h))
        mp = m.load()
        for i in range(w):
            for j in range(h):
                d = ((i - w / 2) / (w / 2)) ** 2 + ((j - h / 2) / (h / 2)) ** 2
                mp[i, j] = int(255 * clamp((1 - d) / 0.45, 0, 1))
        return m
    # Primero un fondo parejo y después capas de pedazos al azar (muchos).
    for _ in range(int(W * H / 1400)):
        cx, cy = rnd.randint(-40, W), rnd.randint(-30, H)
        t = clamp((cx / W - 0.25) / 0.3, 0, 1)        # 0: ladera, 1: franja
        p = rnd.choice(franja if rnd.random() < t else ladera)
        k = rnd.uniform(0.95, 1.04)
        p = p.point(lambda v: min(255, int(v * k)))
        lienzo.paste(p, (cx - p.width // 2, cy - p.height // 2), mascara(*p.size))
    return lienzo


def igualar_color(img, im, caja):
    """Lleva la media y el contraste de cada canal de `img` a los de la roca
    de la cueva en `caja` (la ladera del dibujo, sin magenta)."""
    ref = [p for p in im.crop(caja).getdata() if not es_magenta(*p)]
    act = list(img.getdata())
    salida = []
    medias = []
    for c in range(3):
        a = [p[c] for p in act]
        b = [p[c] for p in ref]
        ma, mb = sum(a) / len(a), sum(b) / len(b)
        sa = (sum((v - ma) ** 2 for v in a) / len(a)) ** 0.5 or 1
        sb = (sum((v - mb) ** 2 for v in b) / len(b)) ** 0.5
        medias.append((ma, mb, sb / sa))
    for p in act:
        salida.append(tuple(clamp(int(mb + (p[c] - ma) * k), 0, 255) for c, (ma, mb, k) in enumerate(medias)))
    img.putdata(salida)
    return img


def colina(im):
    """cueva_colina.png: tan ancha como la cueva (x 0 = x 0 de cueva_back).
    El pie (abajo de la textura) va sobre el borde de arriba de la cueva con
    FUNDIDO px de solape. Contorno irregular, musgo abajo, matorrales en la
    cresta y más oscura hacia el pie."""
    x0 = BACK[0]
    W, H = CORTE - x0, ALTO_COLINA
    rnd = random.Random(23)
    roca = igualar_color(roca_parches(im, W, H, 11), im, (60, 120, 900, 330))
    lp = roca.load()
    pie = 44  # y (dibujo) del borde de arriba de la cueva: ahí cae el pie
    def izquierda(y):
        """La ladera de la cueva, seguida hacia arriba (misma pendiente)."""
        sy = pie + FUNDIDO - (H - y)   # y del dibujo a la que corresponde esta fila
        base = ladera_izquierda(sy) - x0
        # Más arriba la pendiente se empina (un cerro alto que sube recto).
        sobre = max(0, pie - sy)
        return base - sobre * 0.55 + sobre * 0.32 if sobre else base
    def arriba(x):
        """Cresta: sube desde la ladera y sigue ondulada hasta la derecha."""
        return 4 + abs(ruido(x * 0.5, 3)) * 10
    salida = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sp = salida.load()
    for y in range(H):
        sombra = 0.98 - 0.3 * clamp((y - H * 0.6) / (H * 0.4), 0, 1)
        izq = izquierda(y)
        for x in range(W):
            if y < arriba(x) or x < izq:
                continue
            r, g, b = lp[x, y]
            if grano(x // 3, y // 3, 4, 3) > 0.55:     # manchas de musgo
                r, g, b = int(r * 0.7 + 60 * 0.3), int(g * 0.7 + 96 * 0.3), int(b * 0.7 + 30 * 0.3)
            canto = min(y - arriba(x), x - izq)
            # Luz como en el dibujo: desde arriba a la izquierda; el canto
            # del contorno en sombra y el pie (junto al arco) más oscuro.
            luz = 1.06 - 0.14 * (x / W)
            f = sombra * luz * (0.72 if canto < 4 else 0.86 if canto < 9 else 1)
            alfa = 255 if H - y >= FUNDIDO else int(255 * (H - y) / FUNDIDO)
            sp[x, y] = (int(r * f), int(g * f), int(b * f), alfa)
            if canto < 2:
                sp[x, y] = (36, 23, 0, alfa)
    # Matorrales sobre la cresta (y sobre la parte alta de la ladera).
    hojas = [(40, 62, 18), (62, 92, 28), (92, 126, 40), (128, 158, 58)]
    def mata(cx, cy, rr):
        for j in range(-rr - 1, rr + 2):
            for i in range(-rr - 1, rr + 2):
                d = (i * i + j * j) ** 0.5
                xx, yy = int(cx + i), int(cy + j)
                if not (0 <= xx < W and 0 <= yy < H) or d > rr + 1:
                    continue
                if d > rr:
                    if sp[xx, yy][3] == 0:
                        sp[xx, yy] = (20, 30, 8, 255)
                    continue
                luz = -(i + j) / (2 * rr) + grano(xx, yy, 2, 9) * 0.35
                sp[xx, yy] = hojas[clamp(int(1.5 + luz * 2), 0, 3)] + (255,)
    x = 0
    while x < W - 4:
        x += rnd.randint(6, 16)
        # El primer punto de roca de esta columna (la cresta o la ladera).
        y = next((yy for yy in range(H - FUNDIDO) if sp[min(x, W - 1), yy][3] == 255), None)
        if y is None or rnd.random() < 0.15:
            continue
        mata(x, y + rnd.randint(-1, 4), rnd.randint(5, 9) + (rnd.randint(2, 7) if y < H * 0.3 else 0))
    # Raíces que bajan de la colina y cruzan la unión con la cueva (como las
    # del dibujo): curvas marrones con contorno y brillo, opacas aunque
    # pasen por el fundido; y lianas verdes colgando.
    def trazo(puntos, grosor, colores):
        for k in range(len(puntos) - 1):
            (ax, ay), (bx, by) = puntos[k], puntos[k + 1]
            pasos = int(max(abs(bx - ax), abs(by - ay))) + 1
            for t in range(pasos):
                xx = ax + (bx - ax) * t / pasos
                yy = ay + (by - ay) * t / pasos
                for d in range(-grosor - 1, grosor + 2):
                    px_, py_ = int(xx + d), int(yy)
                    if 0 <= px_ < W and 0 <= py_ < H:
                        c = colores[0] if abs(d) > grosor else colores[1] if d < 0 else colores[2]
                        sp[px_, py_] = c + (255,)
    raiz = [(28, 20, 8), (96, 74, 44), (64, 48, 26)]
    for _ in range(9):
        x = rnd.randint(int(W * 0.25), W - 20)
        y = rnd.randint(H - FUNDIDO - 60, H - FUNDIDO - 10)
        puntos = [(x, y)]
        for k in range(rnd.randint(4, 7)):
            x += rnd.randint(-5, 5)
            y += rnd.randint(10, 16)
            puntos.append((x, min(y, H - 1)))
        trazo(puntos, rnd.choice([1, 1, 2]), raiz)
    for _ in range(6):
        x = rnd.randint(int(W * 0.3), W - 10)
        y = rnd.randint(H - FUNDIDO - 30, H - FUNDIDO + 10)
        for k in range(rnd.randint(14, 30)):
            xx = int(x + math.sin(k * 0.5 + x) * 1.5)
            if y + k < H:
                sp[xx, y + k] = hojas[2 if k % 3 else 1] + (255,)
                if k % 4 == 2 and xx + 1 < W:
                    sp[xx + 1, y + k] = hojas[3] + (255,)
    achicar(salida, ESCALA_DIBUJO, alfa_suave=True).save(CARPETA / 'cueva_colina.png')
    return {'alto': round(H * ESCALA_DIBUJO), 'solape': round((FUNDIDO - (pie - BACK[1])) * ESCALA_DIBUJO)}


# --- Rocas sueltas ------------------------------------------------------------

def roca_suelta(im, nombre, ancho, alto, semilla):
    """Una roca suelta hecha con la roca del mismo dibujo (un pedazo de la
    ladera): forma de canto rodado irregular, luz arriba a la izquierda,
    sombra abajo, contorno oscuro y un poco de musgo arriba."""
    rnd = random.Random(semilla)
    W, H = round(ancho / ESCALA_DIBUJO), round(alto / ESCALA_DIBUJO)
    while True:
        x, y = rnd.randint(50, 240 - W), rnd.randint(120, 330 - H)
        pedazo = im.crop((x, y, x + W, y + H))
        if not any(es_magenta(*pedazo.getpixel((i, j))) for i in range(0, W, 2) for j in range(0, H, 2)):
            break
    pp = pedazo.load()
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    cx, cy = W / 2, H * 0.58
    def dentro(i, j):
        a = math.atan2(j - cy, i - cx)
        borde = 1 + 0.08 * math.sin(a * 3 + semilla) + 0.05 * math.sin(a * 5 + semilla * 2)
        return ((i - cx) / (W / 2)) ** 2 + ((j - cy) / (H * 0.6)) ** 2 < borde * 0.98 and j < H
    for j in range(H):
        for i in range(W):
            if not dentro(i, j):
                continue
            if not (dentro(i - 2, j) and dentro(i + 2, j) and dentro(i, j - 2) and (j + 2 >= H or dentro(i, j + 2))):
                px[i, j] = (36, 26, 8, 255)
                continue
            nx, ny = (i - cx) / (W / 2), (j - cy) / (H * 0.6)
            f = clamp(1.05 - (nx + ny) * 0.35, 0.55, 1.35)
            r, g, b = limpio(*pp[i, j])[:3]
            if ny < -0.55 and grano(i, j, 4, semilla) > 0:   # musgo arriba
                r, g, b = int(r * 0.6 + 70 * 0.4), int(g * 0.6 + 110 * 0.4), int(b * 0.6 + 32 * 0.4)
            px[i, j] = (clamp(int(r * f), 0, 255), clamp(int(g * f), 0, 255), clamp(int(b * f), 0, 255), 255)
    achicar(img, ESCALA_DIBUJO).save(CARPETA / f'{nombre}.png')


def main():
    CARPETA.mkdir(parents=True, exist_ok=True)
    im = Image.open(DIBUJO).convert('RGB')
    m = capas_cueva(im)
    c = colina(im)
    for nombre, ancho, alto, s in [('roca_1', 52, 34, 41), ('roca_2', 38, 26, 42), ('roca_3', 26, 18, 43), ('roca_4', 64, 40, 44)]:
        roca_suelta(im, nombre, ancho, alto, s)
    # Colisión (px del mundo): la boca cae sobre el borde del peñón; el piso a
    # la misma altura que el de afuera; la pared del fondo antes del corte.
    izq = MUNDO['borde'] - m['boca']
    fondo = MUNDO['borde'] + 300
    datos = {
        'nivel': 'Nivel1: entrada a la Cueva de los Guácharos',
        'nota': 'px del mundo de Nivel1. Editar en el juego con la tecla E (frente a la cueva).',
        'ground': [{'x0': izq, 'y0': MUNDO['piso'], 'x1': izq + m['ancho'], 'y1': MUNDO['piso']}],
        'platforms': [],
        'walls': [{'x': fondo, 'y': MUNDO['piso'] - 240, 'w': izq + m['ancho'] - fondo, 'h': 240}],
        'ladders': [],
        # Desde dónde caen las gotas (las estalactitas del techo de adentro).
        'gotas': [[MUNDO['borde'] + d, MUNDO['piso'] - round((PISO_DIBUJO - 112) * ESCALA_DIBUJO)] for d in (40, 110, 175, 240)],
    }
    (CARPETA / 'entrada_collision.json').write_text(json.dumps(datos, indent=1))
    for viejo in ('cueva_interior.png', 'cueva_acantilado.png', 'colina.png', 'cueva_cima.png'):
        (CARPETA / viejo).unlink(missing_ok=True)
    print('cueva:', m, 'colina:', c)
    print('colision:', datos['ground'], datos['walls'])


if __name__ == '__main__':
    main()
