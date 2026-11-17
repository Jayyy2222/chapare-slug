"""Guácharos de la cueva (escena Cueva y la boca de la cueva en Nivel1) a
partir de assets/efectos/cueva/aves/:
  ave_fly.jpeg     6 cuadros en una fila: posado (0), abre las alas (1),
                   alas arriba (2, 3) y alas abajo (4, 5)
  ave_ataque.jpeg  7 cuadros en dos filas: posado, abre el pico y chilla
  ave_jefe_vuelo.jpeg, ave_jefe_ataque.jpeg, ave_jefe_muere.jpeg
                   el Guácharo Rey (blindado, con ametralladoras): vuelo (8),
                   ataque (7: se da vuelta, carga y dispara la ráfaga) y
                   muerte (7: golpeado, cae de espaldas, choca, polvo,
                   tendido con estrellitas). Se escalan a JEFE.
  ave_muerta.jpeg  8 cuadros en una grilla de 4x2: golpeado (0), aturdido
                   (1), cae de espaldas (2), choca (3), rebota (4), nube de
                   polvo (5), tendido (6) y tendido con estrellitas (7). Trae
                   una línea de piso abajo, que se borra.

Recorta cada cuadro sobre el magenta (transparente, sin el borde rosado del
jpeg), lo achica a ESCALA (el grito, además, al tamaño del de vuelo) (el pájaro posado queda de ~100 px de largo en
pantalla: se dibuja a escala 1) y arma hojas de una fila con celdas iguales:
  ave_vuelo_sheet.png  celdas alineadas por la punta del pico y la altura de
                       la fila de la hoja (la cabeza no salta al aletear)
  ave_grito_sheet.png  celdas alineadas por los pies (abajo) y la punta del pico
  ave_muerte_sheet.png celdas alineadas abajo (el piso) y por el medio de la
                       celda de la grilla (como lo acomodó el dibujante)
  aves_cuadros.json    tamaño de las celdas de cada hoja

Uso (desde la raíz del proyecto):  python3 herramientas/aves_cueva.py
"""
import json
from pathlib import Path

from PIL import Image

CARPETA = Path('assets/efectos/cueva/aves')
ESCALA = 1 / 3
JEFE = 0.5      # el jefe (ave_jefe_*.jpeg), más grande que los guácharos
MINIMO = 3000  # píxeles de una mancha para ser un cuadro (no una pinta suelta)


def es_magenta(r, g, b):
    return r > 150 and b > 150 and g < 120 and abs(r - b) < 100


def mascara(im):
    w, h = im.size
    px = im.load()
    return [[not es_magenta(*px[x, y]) for x in range(w)] for y in range(h)]


def componentes(m, w, h):
    """Manchas conexas (8 vecinos) de la máscara: listas de (x, y). Los
    cuadros se tocan en columnas (un ala entra en el hueco del vecino), así
    que no alcanza con cortar por columnas vacías."""
    visto = [[False] * w for _ in range(h)]
    manchas = []
    for y in range(h):
        for x in range(w):
            if not m[y][x] or visto[y][x]:
                continue
            pila, mancha = [(x, y)], []
            visto[y][x] = True
            while pila:
                cx, cy = pila.pop()
                mancha.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and m[ny][nx] and not visto[ny][nx]:
                            visto[ny][nx] = True
                            pila.append((nx, ny))
            manchas.append(mancha)
    return manchas


def recortes(archivo):
    """Cuadros de la hoja, por filas y de izquierda a derecha: (imagen RGBA
    con solo los píxeles de ese pájaro, caja en la hoja)."""
    im = Image.open(CARPETA / archivo).convert('RGB')
    w, h = im.size
    m = mascara(im)
    manchas = componentes(m, w, h)
    grandes = [k for k in manchas if len(k) >= MINIMO]
    caja = lambda k: (min(p[0] for p in k), min(p[1] for p in k), max(p[0] for p in k) + 1, max(p[1] for p in k) + 1)
    cajas = [caja(k) for k in grandes]
    # Los puntitos sueltos (pintas, plumas) van con el pájaro más cercano; el
    # ruido del jpeg lejos de todo se descarta.
    for k in manchas:
        if len(k) >= MINIMO:
            continue
        x, y = k[0]
        dist = [max(c[0] - x, x - c[2], 0) + max(c[1] - y, y - c[3], 0) for c in cajas]
        i = min(range(len(cajas)), key=lambda j: dist[j])
        if dist[i] <= 6:
            grandes[i].extend(k)
    cajas = [caja(k) for k in grandes]
    # Orden: por filas (cuadros cuyo centro cae dentro de la fila de arriba
    # van con ella) y en cada fila de izquierda a derecha.
    filas = []
    for i in sorted(range(len(grandes)), key=lambda i: (cajas[i][1] + cajas[i][3]) / 2):
        centro = (cajas[i][1] + cajas[i][3]) / 2
        if filas and centro < max(cajas[j][3] for j in filas[-1]):
            filas[-1].append(i)
        else:
            filas.append([i])
    orden = [i for fila in filas for i in sorted(fila, key=lambda i: cajas[i][0])]
    px = im.load()
    cuadros = []
    for i in orden:
        x0, y0, x1, y1 = cajas[i]
        parte = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        pp = parte.load()
        for x, y in grandes[i]:
            r, g, b = px[x, y]
            # Despill: el borde rosado del jpeg se apaga.
            if r > g + 40 and b > g + 40:
                b = min(b, g + 20)
                r = min(r, (r + g) // 2 + 30)
            pp[x - x0, y - y0] = (r, g, b, 255)
        cuadros.append((parte, cajas[i]))
    return cuadros


def limpiar(px, x, y):
    """Color del píxel sin el borde rosado del jpeg (despill)."""
    r, g, b = px[x, y]
    if r > g + 40 and b > g + 40:
        b = min(b, g + 20)
        r = min(r, (r + g) // 2 + 30)
    return (r, g, b, 255)


def grilla(archivo, columnas, filas, cerca=None, voltear=()):
    """Cuadros de una hoja en grilla (cada celda un cuadro, aunque tenga
    partes sueltas como el polvo o las estrellitas): (imagen RGBA recortada a
    lo que tiene, caja en la celda, ancho de la celda). Las filas casi llenas
    (la línea del piso dibujada) se borran.
    columnas: un número o uno por fila (p. ej. [4, 3]).
    cerca: si se da, de cada celda queda la mancha más grande y lo que esté a
    menos de esos px de ella (fuera las balas sueltas dibujadas).
    voltear: índices de los cuadros que miran a la izquierda (se espejan:
    todos quedan mirando a la derecha)."""
    im = Image.open(CARPETA / archivo).convert('RGB')
    w, h = im.size
    if isinstance(columnas, int):
        columnas = [columnas] * filas
    ch = h // filas
    m = mascara(im)
    for y in range(h):
        if sum(m[y]) > w * 0.97:  # la línea cruza toda la hoja
            for yy in range(max(0, y - 1), min(h, y + 2)):
                m[yy] = [False] * w
    px = im.load()
    cuadros = []
    for f in range(filas):
        cw = w // columnas[f]
        for c in range(columnas[f]):
            x0, y0 = c * cw, f * ch
            parte = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            pp = parte.load()
            for y in range(y0, y0 + ch):
                for x in range(x0, x0 + cw):
                    if m[y][x]:
                        pp[x - x0, y - y0] = limpiar(px, x, y)
            # Fuera el ruido del jpeg: manchas de menos de 30 px.
            mm = [[pp[x, y][3] > 0 for x in range(cw)] for y in range(ch)]
            manchas = componentes(mm, cw, ch)
            for k in manchas:
                if len(k) < 30:
                    for x, y in k:
                        pp[x, y] = (0, 0, 0, 0)
            if cerca is not None:
                mayor = max(manchas, key=len)
                bx0, by0 = min(x for x, _ in mayor), min(y for _, y in mayor)
                bx1, by1 = max(x for x, _ in mayor), max(y for _, y in mayor)
                for k in manchas:
                    if k is mayor:
                        continue
                    d = min(max(bx0 - x, x - bx1, 0) + max(by0 - y, y - by1, 0) for x, y in k)
                    if d > cerca:
                        for x, y in k:
                            pp[x, y] = (0, 0, 0, 0)
            caja = parte.getbbox()
            recorte = parte.crop(caja)
            if len(cuadros) in voltear:
                recorte = recorte.transpose(Image.FLIP_LEFT_RIGHT)
                caja = (cw - caja[2], caja[1], cw - caja[0], caja[3])
            cuadros.append((recorte, caja, cw))
    return cuadros


def piezas(archivo, columnas, filas, cerca, minimo=20000, voltear=()):
    """Como grilla(), pero cada cuadro es un pájaro entero (mancha de más de
    `minimo` px, aunque sus alas crucen el borde de la celda) más las partes
    sueltas que estén a menos de `cerca` px (polvo, estrellitas, fogonazos);
    lo que quede más lejos (las balas dibujadas) se descarta. La caja se da
    respecto de la celda de la grilla en la que cae el centro del pájaro."""
    im = Image.open(CARPETA / archivo).convert('RGB')
    w, h = im.size
    if isinstance(columnas, int):
        columnas = [columnas] * filas
    ch = h // filas
    m = mascara(im)
    manchas = componentes(m, w, h)
    caja = lambda k: (min(p[0] for p in k), min(p[1] for p in k), max(p[0] for p in k) + 1, max(p[1] for p in k) + 1)
    grandes = [list(k) for k in manchas if len(k) >= minimo]
    cajas = [caja(k) for k in grandes]
    for k in manchas:
        if len(k) >= minimo or len(k) < 30:
            continue
        dist = [min(max(c[0] - x, x - c[2], 0) + max(c[1] - y, y - c[3], 0) for x, y in k[::7] or k) for c in cajas]
        i = min(range(len(cajas)), key=lambda j: dist[j])
        if dist[i] <= cerca:
            grandes[i].extend(k)
    cajas = [caja(k) for k in grandes]
    # Celda de cada pájaro (fila y columna de su centro) y orden de lectura.
    def celda(c):
        f = min(filas - 1, int((c[1] + c[3]) / 2 // ch))
        cw = w // columnas[f]
        return f, int((c[0] + c[2]) / 2 // cw), cw
    orden = sorted(range(len(grandes)), key=lambda i: celda(cajas[i])[:2])
    px = im.load()
    cuadros = []
    for n, i in enumerate(orden):
        x0, y0, x1, y1 = cajas[i]
        f, c, cw = celda(cajas[i])
        parte = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        pp = parte.load()
        for x, y in grandes[i]:
            pp[x - x0, y - y0] = limpiar(px, x, y)
        en_celda = (x0 - c * cw, y0 - f * ch, x1 - c * cw, y1 - f * ch)
        if n in voltear:
            parte = parte.transpose(Image.FLIP_LEFT_RIGHT)
            en_celda = (cw - en_celda[2], en_celda[1], cw - en_celda[0], en_celda[3])
        cuadros.append((parte, en_celda, cw))
    return cuadros


def achicar(parte, escala=ESCALA):
    w, h = parte.size
    nw, nh = max(1, round(w * escala)), max(1, round(h * escala))
    color = parte.resize((nw, nh), Image.BOX)
    # Bordes duros (pixel art): alfa todo o nada.
    a = color.getchannel('A').point(lambda v: 255 if v >= 110 else 0)
    color.putalpha(a)
    return color


def hoja(cuadros, anclas, nombre):
    """anclas: (x, y) de cada cuadro en su imagen achicada que tiene que caer
    en el mismo punto de todas las celdas."""
    izq = max(ax for ax, _ in anclas)
    der = max(c.width - ax for c, (ax, _) in zip(cuadros, anclas))
    arr = max(ay for _, ay in anclas)
    aba = max(c.height - ay for c, (_, ay) in zip(cuadros, anclas))
    ancho, alto = izq + der, arr + aba
    salida = Image.new('RGBA', (ancho * len(cuadros), alto), (0, 0, 0, 0))
    for i, (c, (ax, ay)) in enumerate(zip(cuadros, anclas)):
        salida.alpha_composite(c, (i * ancho + izq - ax, arr - ay))
    salida.save(CARPETA / nombre)
    print(f'{nombre}: {len(cuadros)} cuadros de {ancho}x{alto} (ancla en {izq},{arr})')
    return {'ancho': ancho, 'alto': alto, 'cuadros': len(cuadros), 'ancla': [izq, arr]}


def pico(parte):
    """x de la punta del pico (columna más a la derecha con contenido)."""
    a = parte.getchannel('A')
    w, h = parte.size
    for x in range(w - 1, -1, -1):
        if any(a.getpixel((x, y)) for y in range(h)):
            return x
    return w - 1


def main():
    datos = {}
    # Vuelo: ancla en el pico y en la y de la hoja (todas en la misma fila).
    vuelo = recortes('ave_fly.jpeg')
    chicos = [achicar(p) for p, _ in vuelo]
    y_hoja = min(c[1] for _, c in vuelo)
    anclas = [(pico(c), round((y_hoja - caja[1]) * ESCALA)) for c, (_, caja) in zip(chicos, vuelo)]
    datos['vuelo'] = hoja(chicos, anclas, 'ave_vuelo_sheet.png')
    # Grito: ancla en el pico (x) y en los pies (abajo).
    grito = recortes('ave_ataque.jpeg')
    # La hoja del grito está dibujada más grande: el pájaro posado (cuadro 0
    # de las dos) tiene que medir lo mismo.
    escala = ESCALA * vuelo[0][0].width / grito[0][0].width
    chicos = [achicar(p, escala) for p, _ in grito]
    anclas = [(pico(c), c.height) for c in chicos]
    datos['grito'] = hoja(chicos, anclas, 'ave_grito_sheet.png')
    # Muerte: al tamaño del de vuelo (el cuadro 0, parado, mide lo mismo que
    # el posado), ancla abajo y en el medio de la celda de la grilla.
    muerte = grilla('ave_muerta.jpeg', 4, 2)
    escala = ESCALA * vuelo[0][0].width / muerte[0][0].width
    chicos = [achicar(p, escala) for p, _, _ in muerte]
    anclas = [(round((cw / 2 - caja[0]) * escala), c.height) for c, (_, caja, cw) in zip(chicos, muerte)]
    datos['muerte'] = hoja(chicos, anclas, 'ave_muerte_sheet.png')

    # El Guácharo Rey (jefe): guácharo blindado con arnés y ametralladoras.
    # Todo queda mirando a la derecha. Vuelo y ataque: ancla en el pico y en
    # el borde de arriba de la celda (como los acomodó el dibujante); muerte:
    # abajo y en el medio de la celda.
    jv = piezas('ave_jefe_vuelo.jpeg', 4, 2, cerca=12, voltear=range(8))
    chicos = [achicar(p, JEFE) for p, _, _ in jv]
    anclas = [(pico(c), -round(caja[1] * JEFE)) for c, (_, caja, _) in zip(chicos, jv)]
    datos['jefeVuelo'] = hoja(chicos, anclas, 'ave_jefe_vuelo_sheet.png')
    ja = piezas('ave_jefe_ataque.jpeg', [4, 3], 2, cerca=25, voltear=[0])
    chicos = [achicar(p, JEFE) for p, _, _ in ja]
    anclas = [(pico(c), -round(caja[1] * JEFE)) for c, (_, caja, _) in zip(chicos, ja)]
    datos['jefeAtaque'] = hoja(chicos, anclas, 'ave_jefe_ataque_sheet.png')
    jm = piezas('ave_jefe_muere.jpeg', [4, 3], 2, cerca=90, voltear=[0, 2, 3, 4, 5, 6])
    chicos = [achicar(p, JEFE) for p, _, _ in jm]
    anclas = [(round((cw / 2 - caja[0]) * JEFE), c.height) for c, (_, caja, cw) in zip(chicos, jm)]
    datos['jefeMuerte'] = hoja(chicos, anclas, 'ave_jefe_muerte_sheet.png')
    (CARPETA / 'aves_cuadros.json').write_text(json.dumps(datos, indent=1))


if __name__ == '__main__':
    main()
