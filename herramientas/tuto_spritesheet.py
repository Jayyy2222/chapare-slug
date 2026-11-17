"""Tuto (segundo jugador): hojas de piernas, torso y cuerpo entero a partir de
assets/personajes/jugador/tuto/*.jpeg (sobre magenta, mirando a la derecha):
  piernas_run.jpeg          12 cuadros (2 filas): parado (0) y corriendo
  piernas_salto.jpeg        6: impulso, sube, cima, cae, aterriza, aterriza
  piernas_crouch.jpeg       3: de parado a agachado
  piernas_crouch_walk.jpeg  6: caminando agachado
  torso_aiming.jpeg         4: torso apuntando adelante (marca celeste = mano)
  aiming_straight_up.jpeg   4: de adelante a apuntar arriba (marca celeste)
  idle.jpeg                 6: cuerpo entero, quieto
  trepar.jpeg               6: cuerpo entero, de espaldas, trepando
Cada hoja está dibujada a otra escala: se llevan todas al tamaño del juego
(la figura entera mide ALTO px de pantalla: va a escala 1, como las armas)
con ESCALAS, medidas sobre la hebilla del cinturón y el largo de piernas y
torso del idle y el ancho de la cabeza (pelo y piel), que tiene que medir
lo mismo en todas (~31 px). Las líneas de piso dibujadas se borran.

Guarda en assets/personajes/jugador/tuto/:
  tuto_<hoja>.png  una fila de celdas iguales por hoja
  anchors.json     por hoja: celda (ancho, alto), ancla (px de la celda donde
                   está la hebilla del cinturón en piernas y torso, o los pies
                   en las de cuerpo entero) y por cuadro:
                     pies  y de la suela en la celda (piernas)
                     mano  [x, y] de la mano en la celda (torsos: la marca
                           celeste, que después se pinta del color de la piel)
En el juego las piernas y el torso se dibujan con el ancla en el mismo punto
(la cintura), así el torso baja cuando las piernas se agachan.

Uso (desde la raíz del proyecto):  python3 herramientas/tuto_spritesheet.py
"""
import json
from pathlib import Path

from PIL import Image

from aves_cueva import componentes, es_magenta, limpiar

CARPETA = Path('assets/personajes/jugador/tuto')
ALTO = 128  # px de pantalla de la figura entera (Manfred mide 124)

# hoja: (escala, tipo, orden[, ancho]). tipo: 'piernas', 'torso' o 'entero'.
# orden: 'filas' (de arriba abajo y de izquierda a derecha) o 'x'.
# ancho: cuánto más se ensancha (solo en x). Las piernas están dibujadas más
# angostas que el cuerpo del idle: con su largo justo (cintura-suela ~51 px)
# el cinturón medía 23 px y el muslo 29, contra 35 del idle. Se ensanchan
# para que todas tengan el cinturón de CINTURON px (y el muslo del idle).
CINTURON = 28
HOJAS = {
    'piernas_run': (0.187, 'piernas', 'filas', CINTURON / 23),
    'piernas_salto': (0.165, 'piernas', 'x', CINTURON / 26.7),
    'piernas_crouch': (0.108, 'piernas', 'x', CINTURON / 29),
    'piernas_crouch_walk': (0.155, 'piernas', 'x', CINTURON / 22.7),
    'torso_aiming': (0.135, 'torso', 'x'),
    'aiming_straight_up': (0.2, 'torso', 'x'),
    'idle': (ALTO / 580, 'entero', 'x'),
    # De espaldas y con el brazo arriba: de la cabeza al pie mide 534 px.
    'trepar': (ALTO / 534, 'entero', 'x'),
}


def es_gris(r, g, b):
    """La hebilla: gris medio, sin color (la camisa es más clara y celeste)."""
    return max(r, g, b) - min(r, g, b) < 14 and 105 < (r + g + b) / 3 < 205


def es_cian(r, g, b):
    return r < 120 and g > 190 and b > 190


def partir(k, caja, ancho_normal):
    """Dos cuadros pegados (las piernas de uno tocan las del otro): se cortan
    en la columna con menos píxeles cerca del medio."""
    x0, _, x1, _ = caja
    columnas = {}
    for x, _ in k:
        columnas[x] = columnas.get(x, 0) + 1
    medio = (x0 + x1) // 2
    zona = range(medio - (x1 - x0) // 5, medio + (x1 - x0) // 5)
    corte = min(zona, key=lambda x: columnas.get(x, 0))
    return [p for p in k if p[0] < corte], [p for p in k if p[0] >= corte]


def cuadros(nombre, orden, tipo):
    """Cada cuadro: (imagen RGBA, caja en la hoja, hebilla (x, y) o None,
    mano (x, y) o None), en coordenadas de la imagen recortada."""
    im = Image.open(CARPETA / f'{nombre}.jpeg').convert('RGB')
    w, h = im.size
    px = im.load()
    m = [[not es_magenta(*px[x, y]) for x in range(w)] for y in range(h)]
    # Línea de piso: filas casi enteras de negro (y las vecinas, que el jpeg
    # dejó a medias).
    for y in range(h):
        negros = sum(1 for x in range(w) if max(px[x, y]) < 20)
        if negros > w * 0.6:
            for yy in range(max(0, y - 2), min(h, y + 3)):
                m[yy] = [False] * w
    manchas = componentes(m, w, h)
    grandes = [k for k in manchas if len(k) > 3000]
    caja = lambda k: (min(p[0] for p in k), min(p[1] for p in k), max(p[0] for p in k) + 1, max(p[1] for p in k) + 1)
    # Pedacitos sueltos (los dedos de una mano, el arma de la espalda) van con
    # el cuadro más cercano.
    cajas = [caja(k) for k in grandes]
    for k in manchas:
        if len(k) > 3000 or len(k) < 20:
            continue
        x, y = k[0]
        d = [max(c[0] - x, x - c[2], 0) + max(c[1] - y, y - c[3], 0) for c in cajas]
        i = min(range(len(cajas)), key=lambda j: d[j])
        if d[i] < 12:
            grandes[i] = grandes[i] + k
    cajas = [caja(k) for k in grandes]
    anchos = sorted(c[2] - c[0] for c in cajas)
    normal = anchos[len(anchos) // 2]
    for i in range(len(grandes) - 1, -1, -1):
        if cajas[i][2] - cajas[i][0] > normal * 1.6:
            a, b = partir(grandes[i], cajas[i], normal)
            grandes[i:i + 1] = [a, b]
    cajas = [caja(k) for k in grandes]
    if orden == 'x':
        indices = sorted(range(len(grandes)), key=lambda i: cajas[i][0])
    else:
        alto_medio = sum(c[3] - c[1] for c in cajas) / len(cajas)
        indices = sorted(range(len(grandes)), key=lambda i: (round(cajas[i][1] / alto_medio), cajas[i][0]))
    resultado = []
    for i in indices:
        x0, y0, x1, y1 = cajas[i]
        parte = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        pp = parte.load()
        grises, cianes = [], []
        for x, y in grandes[i]:
            r, g, b = px[x, y]
            if es_cian(r, g, b):
                cianes.append((x - x0, y - y0))
            elif es_gris(r, g, b):
                grises.append((x - x0, y - y0))
            pp[x - x0, y - y0] = limpiar(px, x, y)
        # La marca celeste se pinta con la piel de al lado (el pixel de la izquierda
        # que no sea celeste).
        celestes = set(cianes)
        for x, y in cianes:
            k = x - 1
            while (k, y) in celestes and k > 0:
                k -= 1
            pp[x, y] = pp[k, y] if pp[k, y][3] else (200, 140, 100, 255)
        mano = None
        if cianes:
            mano = (sum(x for x, _ in cianes) / len(cianes), sum(y for _, y in cianes) / len(cianes))
        # La hebilla está en el cinturón: arriba de las piernas, abajo del torso.
        alto = y1 - y0
        if tipo == 'piernas':
            grises = [p for p in grises if p[1] < alto * 0.3]
        elif tipo == 'torso':
            grises = [p for p in grises if p[1] > alto * 0.75]
        resultado.append((parte, cajas[i], hebilla(grises), mano))
    return resultado


def hebilla(grises):
    """Centro y borde de arriba de la hebilla: la mancha gris más ancha que
    alta (no los puños de la camisa ni los botones)."""
    if not grises:
        return None
    pts = set(grises)
    vistos, mejor = set(), None
    for p in grises:
        if p in vistos:
            continue
        pila, mancha = [p], []
        vistos.add(p)
        while pila:
            x, y = pila.pop()
            mancha.append((x, y))
            for v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if v in pts and v not in vistos:
                    vistos.add(v)
                    pila.append(v)
        xs = [x for x, _ in mancha]
        ys = [y for _, y in mancha]
        ancho, alto = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        if len(mancha) > 25 and ancho >= alto * 0.8 and ancho < 60:
            # La de más abajo en un torso, la de más arriba en las piernas: se
            # elige la más grande (la hebilla tiene más píxeles que un botón).
            if not mejor or len(mancha) > mejor[2]:
                mejor = ((min(xs) + max(xs)) / 2, min(ys), len(mancha))
    return mejor[:2] if mejor else None


def achicar(img, escala, ancho=1):
    w, h = img.size
    chica = img.resize((max(1, round(w * escala * ancho)), max(1, round(h * escala))), Image.LANCZOS)
    chica.putalpha(chica.getchannel('A').point(lambda a: 255 if a > 110 else 0))
    color = chica.convert('RGB').quantize(64, method=Image.Quantize.MEDIANCUT).convert('RGB').convert('RGBA')
    color.putalpha(chica.getchannel('A'))
    return color


def hoja(nombre, escala, tipo, orden, ancho=1):
    fuente = cuadros(nombre, orden, tipo)
    chicos, anclas, extras = [], [], []
    ultima = None
    for parte, caja, heb, mano in fuente:
        c = achicar(parte, escala, ancho)
        if tipo == 'entero':
            # Pies: abajo, en el medio.
            ancla = (c.width / 2, c.height)
        else:
            # La hebilla (si en un cuadro no se encontró, la del anterior en la
            # misma posición relativa).
            heb = heb or ultima or (parte.width / 2, 0 if tipo == 'piernas' else parte.height)
            ultima = heb
            ancla = (heb[0] * escala * ancho, heb[1] * escala)
        chicos.append(c)
        anclas.append(ancla)
        extras.append({'pies': c.height, 'mano': (mano[0] * escala * ancho, mano[1] * escala) if mano else None})
    izq = max(ax for ax, _ in anclas)
    der = max(c.width - ax for c, (ax, _) in zip(chicos, anclas))
    arr = max(ay for _, ay in anclas)
    aba = max(c.height - ay for c, (_, ay) in zip(chicos, anclas))
    ancho, alto = round(izq + der) + 2, round(arr + aba) + 2
    ox, oy = round(izq) + 1, round(arr) + 1
    salida = Image.new('RGBA', (ancho * len(chicos), alto), (0, 0, 0, 0))
    datos = {'ancho': ancho, 'alto': alto, 'ancla': [ox, oy], 'cuadros': []}
    for i, (c, (ax, ay), e) in enumerate(zip(chicos, anclas, extras)):
        dx, dy = round(ox - ax), round(oy - ay)
        salida.alpha_composite(c, (i * ancho + dx, dy))
        cuadro = {}
        if tipo == 'piernas':
            cuadro['pies'] = dy + e['pies']
        if e['mano']:
            cuadro['mano'] = [round(dx + e['mano'][0]), round(dy + e['mano'][1])]
        datos['cuadros'].append(cuadro)
    salida.save(CARPETA / f'tuto_{nombre}.png')
    print(f'tuto_{nombre}.png: {len(chicos)} cuadros de {ancho}x{alto}, ancla {ox},{oy}')
    return datos


def main():
    anclas = {nombre: hoja(nombre, *datos) for nombre, datos in HOJAS.items()}
    (CARPETA / 'anchors.json').write_text(json.dumps(anclas, indent=1))


if __name__ == '__main__':
    main()
