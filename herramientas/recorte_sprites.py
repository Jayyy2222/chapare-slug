"""Funciones comunes para pasar tiras de personajes sobre fondo magenta (JPEG)
a spritesheets del juego. Las usan manfred_spritesheet.py y
npc_power_spritesheet.py.
"""
from PIL import Image


def es_fondo(r, g, b):
    """Magenta del fondo, también sus versiones oscuras (sombras pintadas
    encima) y los bordes manchados del JPEG."""
    return r > 60 and b > 60 and g < 0.6 * min(r, b) and abs(r - b) < 0.3 * max(r, b)


def quitar_fondo(img):
    rgba = img.convert('RGBA')
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            if es_fondo(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return rgba


def sin_tinte_magenta(img):
    """Quita el tinte magenta que el JPEG deja en los bordes finos (barandas,
    rejas): donde el rojo y el azul pasan al verde, se bajan hasta él. Los
    colores normales (madera, piel, pasto, banderas) tienen el azul o el rojo
    por debajo del verde y no cambian."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            exceso = min(r, b) - g
            if a and exceso > 0:
                px[x, y] = (r - exceso, g, b - exceso, a)
    return img


def cortar_sombra(img):
    """Quita la sombra pintada bajo los pies: una franja ancha que empieza en
    la primera fila (del cuarto de abajo) mucho más llena que las de arriba."""
    px = img.load()
    ancho, alto = img.size
    llenas = [sum(1 for x in range(ancho) if px[x, y][3]) for y in range(alto)]
    for y in range(int(alto * 0.75), alto):
        # Se compara con 3 filas antes: algunas sombras se ensanchan de a poco.
        if llenas[y - 3] and llenas[y] > llenas[y - 3] * 1.4:
            return img.crop((0, 0, ancho, y))
    return img


def componentes(img, minimo):
    """Manchas de píxeles opacos conectados (8 vecinos). Devuelve
    (grandes, chicas): listas de (cantidad, caja, píxeles); grandes son las de
    al menos `minimo` píxeles (los cuadros), chicas el resto (gotas,
    destellos, polvo)."""
    ancho, alto = img.size
    alfa = img.getchannel('A').load()
    visto = [[False] * ancho for _ in range(alto)]
    grandes, chicas = [], []
    for y in range(alto):
        for x in range(ancho):
            if not alfa[x, y] or visto[y][x]:
                continue
            visto[y][x] = True
            pila, pixeles = [(x, y)], []
            while pila:
                a, b = pila.pop()
                pixeles.append((a, b))
                for c in (a - 1, a, a + 1):
                    for d in (b - 1, b, b + 1):
                        if 0 <= c < ancho and 0 <= d < alto and alfa[c, d] and not visto[d][c]:
                            visto[d][c] = True
                            pila.append((c, d))
            xs = [p[0] for p in pixeles]
            ys = [p[1] for p in pixeles]
            caja = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
            (grandes if len(pixeles) >= minimo else chicas).append((len(pixeles), caja, pixeles))
    return grandes, chicas


def distancia_cajas(a, b):
    dx = max(a[0] - b[2], b[0] - a[2], 0)
    dy = max(a[1] - b[3], b[1] - a[3], 0)
    return dx * dx + dy * dy


def centro_pies(cuadro, desde=0.9):
    """x promedio de los píxeles de las filas de abajo."""
    ancho, alto = cuadro.size
    px = cuadro.load()
    xs = [x for y in range(int(alto * desde), alto) for x in range(ancho) if px[x, y][3]]
    return sum(xs) / len(xs) if xs else ancho / 2


def a_pixel_art(celda, tamano, colores=40):
    """Achica con buen filtro, bordes nítidos (alfa 0 o 255) y paleta reducida."""
    chica = celda.resize(tamano, Image.LANCZOS)
    alfa = chica.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    color = chica.convert('RGB').quantize(colores, method=Image.Quantize.MEDIANCUT).convert('RGB')
    resultado = color.convert('RGBA')
    resultado.putalpha(alfa)
    return resultado


def cortes(img, cuadros, zona=(-0.15, 0.3)):
    """Para cada borde entre cuadros (en una grilla de `cuadros` celdas iguales),
    la x del corte en cada fila. Se corta en el hueco de fondo más ancho cerca
    del borde (zona: fracción del ancho de la celda), justo donde empieza el
    cuadro de la derecha; las filas sin hueco se interpolan."""
    ancho, alto = img.size
    alfa = img.getchannel('A').load()
    celda = ancho / cuadros
    zona = [round(z * celda) for z in zona]
    lineas = []
    for i in range(1, cuadros):
        borde = round(i * celda)
        corte = [None] * alto
        for y in range(alto):
            mejor, x, inicio = None, borde + zona[0], None
            while x <= borde + zona[1]:
                if not alfa[x, y] and inicio is None:
                    inicio = x
                if (alfa[x, y] or x == borde + zona[1]) and inicio is not None:
                    if x - inicio >= 3 and (mejor is None or x - inicio > mejor[1] - mejor[0]):
                        mejor = (inicio, x)
                    inicio = None
                x += 1
            if mejor:
                corte[y] = mejor[1]  # justo donde empieza el cuadro de la derecha
        # Filas sin hueco: se interpola entre la de arriba y la de abajo que tienen.
        conocidas = [y for y in range(alto) if corte[y] is not None]
        for y in range(alto):
            if corte[y] is None:
                arriba = max((k for k in conocidas if k < y), default=None)
                abajo = min((k for k in conocidas if k > y), default=None)
                if arriba is None or abajo is None:
                    corte[y] = corte[abajo if arriba is None else arriba] if conocidas else borde
                else:
                    t = (y - arriba) / (abajo - arriba)
                    corte[y] = round(corte[arriba] + (corte[abajo] - corte[arriba]) * t)
        lineas.append(corte)
    return lineas


def sin_polvo(cuadro, minimo):
    """Borra las manchas de menos de `minimo` (fracción) de la más grande:
    polvo suelto o restos del cuadro vecino."""
    grandes, chicas = componentes(cuadro, 1)
    mayor = max(n for n, _, _ in grandes)
    px = cuadro.load()
    for n, _, pixeles in grandes:
        if n < mayor * minimo:
            for x, y in pixeles:
                px[x, y] = (0, 0, 0, 0)
    return cuadro.crop(cuadro.getbbox())


def separar_por_costuras(img, cuadros, limpiar=0, zona=(-0.15, 0.3)):
    """Separa una tira de `cuadros` celdas iguales aunque los cuadros se toquen
    (ver cortes). limpiar: si no es 0, borra manchas chicas (ver sin_polvo)."""
    ancho, alto = img.size
    lineas = cortes(img, cuadros, zona)
    resultado = []
    for i in range(cuadros):
        cuadro = Image.new('RGBA', img.size)
        origen, destino = img.load(), cuadro.load()
        for y in range(alto):
            x0 = lineas[i - 1][y] if i > 0 else 0
            x1 = lineas[i][y] if i < cuadros - 1 else ancho
            for x in range(x0, x1):
                destino[x, y] = origen[x, y]
        cuadro = cuadro.crop(cuadro.getbbox())
        resultado.append(sin_polvo(cuadro, limpiar) if limpiar else cuadro)
    return resultado


def centro_cabeza(cuadro):
    """x promedio de los píxeles de las filas de arriba (la cabeza)."""
    ancho, alto = cuadro.size
    px = cuadro.load()
    xs = [x for y in range(int(alto * 0.18)) for x in range(ancho) if px[x, y][3]]
    return sum(xs) / len(xs)


def por_manchas(img, minimo, alto_fila=None, lejos=30):
    """Cuadros sueltos en una hoja sin grilla: cada mancha de al menos
    `minimo` píxeles es un cuadro; las chicas (destellos, gotas, polvo) se
    suman a la grande más cercana si está a menos de `lejos` px (si no, son
    ruido del JPEG). Orden de lectura: por filas de `alto_fila` px (según el
    centro de cada cuadro) y de izquierda a derecha."""
    grandes, chicas = componentes(img, minimo)
    fila = (lambda m: round((m[1][1] + m[1][3]) / 2 // alto_fila)) if alto_fila else (lambda m: 0)
    grandes.sort(key=lambda m: (fila(m), m[1][0]))
    grupos = [list(m[2]) for m in grandes]
    for _, caja, pixeles in chicas:
        cerca = min(range(len(grandes)), key=lambda i: distancia_cajas(caja, grandes[i][1]))
        if distancia_cajas(caja, grandes[cerca][1]) <= lejos ** 2:
            grupos[cerca].extend(pixeles)
    origen = img.load()
    cuadros = []
    for pixeles in grupos:
        cuadro = Image.new('RGBA', img.size)
        destino = cuadro.load()
        for x, y in pixeles:
            destino[x, y] = origen[x, y]
        cuadros.append(cuadro.crop(cuadro.getbbox()))
    return cuadros


def en_celdas(img, columnas, filas, margen=0, limpiar=0):
    """Cuadros en una grilla de celdas iguales separadas por líneas: corta cada
    celda dejando afuera `margen` px de cada borde (las líneas)."""
    ancho, alto = img.width / columnas, img.height / filas
    cuadros = []
    for f in range(filas):
        for c in range(columnas):
            celda = img.crop((round(c * ancho) + margen, round(f * alto) + margen,
                              round((c + 1) * ancho) - margen, round((f + 1) * alto) - margen))
            celda = celda.crop(celda.getbbox())
            cuadros.append(sin_polvo(celda, limpiar) if limpiar else celda)
    return cuadros
