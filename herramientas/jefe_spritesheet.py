"""Convierte las hojas del jefe final (assets/jefes/) en los spritesheets del
juego.

Cada hoja original tiene otra distribución y otra resolución:
  llegda_boss.jpeg   9 cuadros sueltos en 4 filas: el minibús llega, frena,
                     levanta polvo, para, abre la puerta (2), el jefe se baja,
                     y 2 poses del jefe con la wiphala
  walk_boss.jpeg     12 cuadros de caminar, grilla de 6x2 (arriba las banderas
                     se apoyan en el vecino: CORTES_A_MANO)
  ataque_boss.jpeg   6 cuadros de ataque, grilla de 3x2
  revive_boss.jpeg   8 cuadros con marco (4x2): masca coca, se le inflan los
                     músculos y se prende el aura
  boss.jpeg          2 cuadros con marco: la transformación (rayos y polvo) y
                     el jefe gigante parado
  boss_camina.jpeg   7 cuadros del gigante caminando: 3 arriba y 4 abajo
  boss_ataque.jpeg   8 cuadros sin marco (3, 2 y 3 por fila): guardia, puñete
                     cargado, directo, puñete de energía (polvo), gancho,
                     uppercut, puñetazo al piso (onda) y vuelve a la guardia
  muerte_boss.jpeg   9 cuadros con marco (3 arriba y 2 en cada fila de abajo):
                     le explota el balazo, se tambalea, cae de espaldas, vuela,
                     aterriza entre el polvo, se arrastra y queda tendido
                     (estrellitas y humo)

Guarda en assets/jefes/:
  minibus_sheet.png       6 cuadros del minibús (el trufi): llega, frena, polvo,
                          parado y la puerta abierta (2). El cuadro del jefe
                          bajándose no se usa: el minibús va más grande que en
                          la hoja original y el jefe ahí quedaría de otro
                          tamaño; en el juego se baja el sprite del jefe.
  jefe_sheet.png          el jefe normal: poses, caminar, ataque y revive
  jefe_gigante_sheet.png  el gigante: transformación, parado, caminar, ataque y muerte
  jefe_cuadros.json       tamaño de celda de cada hoja y en qué cuadro empieza
                          cada animación (lo copia JEFE en JefeFinal.js)

Escala: cada hoja se lleva a px de arte con un cuadro de referencia de altura
conocida (uno sin la bandera por encima de la cabeza): el jefe normal mide
ALTO_JEFE, el gigante ALTO_GIGANTE y el minibús ALTO_TRUFI. Todos los cuadros de una hoja comparten
celda y van con los pies en el borde de abajo y centrados según los pies, así
el cuerpo de física no se mueve al cambiar de animación. El minibús se centra
según su carrocería (la mancha más grande), no según el polvo.

Uso (desde la raíz del proyecto):  python3 herramientas/jefe_spritesheet.py
"""
import json

from PIL import Image

from recorte_sprites import (a_pixel_art, centro_pies, componentes, distancia_cajas, en_celdas,
                             por_manchas, quitar_fondo)

CARPETA = 'assets/jefes/'
ALTO_JEFE = 58        # px de arte del jefe normal parado: como el soldado
ALTO_GIGANTE = 120    # px de arte del gigante parado
ALTO_TRUFI = 82       # px de arte del minibús parado (un poco más alto que una persona)
COLORES = 64          # la wiphala tiene muchos colores
MARGEN = 3            # px de arte libres alrededor en cada celda


# Pares de figuras pegadas (la bandera de la izquierda apoya en la espalda de
# la derecha): línea de corte medida a mano, puntos (x, y) en px de la hoja
# original. Lo que queda a la izquierda de la línea es de la figura izquierda.
CORTES_A_MANO = {
    'walk_boss.jpeg': [
        [(332, 0), (332, 110), (305, 160), (297, 200), (297, 290), (270, 330), (270, 768)],
        [(772, 0), (772, 150), (728, 160), (712, 200), (712, 768)],
        [(1222, 0), (1222, 150), (1178, 160), (1162, 200), (1162, 768)],
    ],
    'boss_camina.jpeg': [
        [(355, 0), (355, 1024)],
    ],
}


def x_de_linea(linea, y):
    for (xa, ya), (xb, yb) in zip(linea, linea[1:]):
        if ya <= y <= yb:
            return xa + (xb - xa) * ((y - ya) / (yb - ya) if yb != ya else 0)
    return linea[-1][0] if y > linea[-1][1] else linea[0][0]


def dividir_pegadas(cuadro, centros, banda):
    """Separa figuras pegadas (la bandera de una toca a la otra). Semillas: los
    píxeles a menos de `banda` px del centro de la celda de cada figura (la
    grilla de la hoja), de arriba a abajo; cada píxel restante va con la figura
    que lo alcanza primero caminando por píxeles opacos. La bandera llega por
    el palo desde la mano de quien la sostiene, así queda entera con él y no
    se corta en línea recta."""
    from collections import deque
    w, h = cuadro.size
    a = cuadro.getchannel('A').load()
    duenio = {}
    cola = deque()
    for y in range(h):
        for x in range(w):
            if not a[x, y]:
                continue
            cerca = min(range(len(centros)), key=lambda k: abs(x - centros[k]))
            if abs(x - centros[cerca]) <= banda:
                duenio[(x, y)] = cerca
                cola.append((x, y))
    while cola:
        x, y = cola.popleft()
        lado = duenio[(x, y)]
        for v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= v[0] < w and 0 <= v[1] < h and v not in duenio and a[v]:
                duenio[v] = lado
                cola.append(v)
    origen = cuadro.load()
    partes = [Image.new('RGBA', (w, h)) for _ in centros]
    destinos = [m.load() for m in partes]
    for (x, y), lado in duenio.items():
        destinos[lado][x, y] = origen[x, y]
    return partes


def por_figuras(img, cuadros_por_fila, minimo=2000, cortes_a_mano=()):
    """Cuadros sin marco en filas parejas. Cada figura (con su bandera) es
    una mancha de al menos `minimo` px: así la bandera no se corta en una
    línea recta como con separar_por_costuras. Si dos figuras vienen pegadas
    (la bandera de una toca a la otra), esa mancha sola se parte por la
    costura; si sobran manchas (una bandera suelta), se suman a la figura más
    cercana. Las manchitas chicas también van con la más cercana."""
    alto = img.height / len(cuadros_por_fila)
    cuadros = []
    for f, cantidad in enumerate(cuadros_por_fila):
        fila = img.crop((0, round(f * alto), img.width, round((f + 1) * alto)))
        grandes, chicas = componentes(fila, minimo)
        origen = fila.load()

        def imagen(pixeles):
            cuadro = Image.new('RGBA', fila.size)
            destino = cuadro.load()
            for x, y in pixeles:
                destino[x, y] = origen[x, y]
            return cuadro

        figuras = [[caja, list(pix)] for _, caja, pix in grandes]
        # Sobran: la más chica se suma a la más cercana.
        while len(figuras) > cantidad:
            figuras.sort(key=lambda m: len(m[1]))
            chica = figuras.pop(0)
            cerca = min(figuras, key=lambda m: distancia_cajas(chica[0], m[0]))
            cerca[1] += chica[1]
            cerca[0] = (min(cerca[0][0], chica[0][0]), min(cerca[0][1], chica[0][1]),
                        max(cerca[0][2], chica[0][2]), max(cerca[0][3], chica[0][3]))
        partes = []
        for caja, pix in figuras:
            partes.append((caja, imagen(pix)))
        # Figuras pegadas: una mancha que cubre el centro de más de una celda
        # de la grilla se reparte entre ellas (dividir_pegadas).
        celda = fila.width / cantidad
        centros = [(k + 0.5) * celda for k in range(cantidad)]
        separadas = []
        for caja, cuadro in partes:
            dentro = [c for c in centros if caja[0] <= c <= caja[2]]
            if len(dentro) < 2:
                separadas.append((caja, cuadro))
                continue
            y_fila = round(f * alto)
            linea = next((l for l in cortes_a_mano if caja[0] < l[0][0] < caja[2]), None)
            if linea and len(dentro) == 2:
                mitades = [Image.new('RGBA', fila.size) for _ in range(2)]
                origen_c, destinos = cuadro.load(), [m.load() for m in mitades]
                for y in range(caja[1], caja[3]):
                    corte = x_de_linea(linea, y + y_fila)
                    for x in range(caja[0], caja[2]):
                        if origen_c[x, y][3]:
                            destinos[0 if x < corte else 1][x, y] = origen_c[x, y]
                trozos = mitades
            else:
                trozos = dividir_pegadas(cuadro, dentro, celda * 0.2)
            for k, parte in enumerate(trozos):
                caja_k = parte.getbbox()
                if caja_k:
                    separadas.append((caja_k, parte))
        partes = separadas
        # Manchitas sueltas: a la figura más cercana.
        partes.sort(key=lambda m: (m[0][0] + m[0][2]) / 2)
        lienzos = []
        for caja, cuadro in partes:
            if cuadro.size != fila.size:
                grande = Image.new('RGBA', fila.size)
                grande.paste(cuadro, (caja[0], caja[1] + (caja[3] - caja[1] - cuadro.height)))
                cuadro = grande
            lienzos.append([caja, cuadro])
        for _, caja, pix in chicas:
            if len(pix) < 40:
                continue  # ruido del JPEG
            cerca = min(lienzos, key=lambda m: distancia_cajas(caja, m[0]))
            if distancia_cajas(caja, cerca[0]) <= 30 ** 2:
                destino = cerca[1].load()
                for x, y in pix:
                    destino[x, y] = origen[x, y]
        cuadros += [c.crop(c.getbbox()) for _, c in lienzos]
    return cuadros


def abrir(nombre, recorte_abajo=0, borde=0):
    img = quitar_fondo(Image.open(CARPETA + nombre))
    return img.crop((borde, borde, img.width - borde, img.height - recorte_abajo - borde))


def en_cajas(img, cajas, margen=6):
    """Cuadros en celdas de distinto tamaño (x0, y0, x1, y1), separadas por
    líneas: se deja afuera `margen` px de cada borde."""
    cuadros = []
    for x0, y0, x1, y1 in cajas:
        celda = img.crop((x0 + margen, y0 + margen, x1 - margen, y1 - margen))
        cuadros.append(celda.crop(celda.getbbox()))
    return cuadros


def cajas_muerte(img):
    """muerte_boss.jpeg: fila de arriba con 3 celdas y tres filas de 2 (las
    líneas medidas en la hoja de 806x795)."""
    ancho, alto = img.size
    filas = [(266, 398), (398, 612), (612, alto)]
    arriba = [(0, 0, 266, 266), (266, 0, 545, 266), (545, 0, ancho, 266)]
    return arriba + [(x0, y0, x1, y1) for y0, y1 in filas for x0, x1 in [(0, 403), (403, ancho)]]


def bordes_deshilachados(cuadro, ancho=60, semilla=7):
    """El polvo que llena la celda queda cortado en línea recta por el marco:
    cerca de los costados se borran píxeles al azar
    (más cuanto más cerca), así la nube termina irregular."""
    import random
    azar = random.Random(semilla)
    px = cuadro.load()
    w, h = cuadro.size
    for y in range(h):
        for x in range(w):
            if not px[x, y][3]:
                continue
            borde = min(x, w - 1 - x)
            if borde < ancho and azar.random() > (borde / ancho) ** 0.7:
                px[x, y] = (0, 0, 0, 0)
    return cuadro


def alto_sin_bandera(cuadro, columnas=0.6):
    """Alto desde los pies hasta la cabeza, mirando solo las columnas de la
    izquierda (la bandera va a la derecha, por encima de la cabeza)."""
    px = cuadro.load()
    limite = int(cuadro.width * columnas)
    for y in range(cuadro.height):
        if any(px[x, y][3] for x in range(limite)):
            return cuadro.height - y
    return cuadro.height


def alto_cuerpo(cuadro, cubierto=0.3):
    """Alto desde los pies hasta la primera fila bien cubierta: deja afuera
    llamas del aura, chispas y cosas finas que vuelan sobre la cabeza."""
    px = cuadro.load()
    for y in range(cuadro.height):
        if sum(1 for x in range(cuadro.width) if px[x, y][3]) > cuadro.width * cubierto:
            return cuadro.height - y
    return cuadro.height


def centro_carroceria(cuadro):
    grandes, _ = componentes(cuadro, 1)
    _, (x0, _, x1, _), _ = max(grandes, key=lambda m: m[0])
    return (x0 + x1) / 2


def armar_hoja(partes, centro=centro_pies):
    """partes: lista de (cuadros, escala). Devuelve la hoja, el tamaño de la
    celda y en qué cuadro empieza cada parte."""
    chicos = [(c.resize((max(1, round(c.width * e)), max(1, round(c.height * e))), Image.LANCZOS), c, e)
              for cuadros, e in partes for c in cuadros]
    # Lado más ancho medido desde el centro elegido, en px de arte.
    medio = max(max(centro(c) * e, (c.width - centro(c)) * e) for _, c, e in chicos)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(round(c.height * e) for _, c, e in chicos) + MARGEN
    hoja = Image.new('RGBA', (ancho * len(chicos), alto))
    # Cada cuadro se arma a su resolución original y se achica una sola vez.
    for i, (_, c, e) in enumerate(chicos):
        grande = Image.new('RGBA', (round(ancho / e), round(alto / e)))
        grande.paste(c, (round(ancho / 2 / e - centro(c)), round(alto / e) - c.height), c)
        hoja.paste(a_pixel_art(grande, (ancho, alto), COLORES), (i * ancho, 0))
    inicios, i = [], 0
    for cuadros, _ in partes:
        inicios.append(i)
        i += len(cuadros)
    return hoja, (ancho, alto), inicios


def main():
    llegada = por_manchas(abrir('llegda_boss.jpeg', 4), 4000, 160, 20)
    bus, poses = llegada[:6], llegada[7:]
    caminar = por_figuras(abrir('walk_boss.jpeg'), [6, 6], cortes_a_mano=CORTES_A_MANO['walk_boss.jpeg'])
    ataque = por_figuras(abrir('ataque_boss.jpeg'), [3, 3])
    revive = en_celdas(abrir('revive_boss.jpeg'), 4, 2, 7)
    gigante = en_celdas(abrir('boss.jpeg'), 2, 1, 8, 0.02)
    g_caminar = por_figuras(abrir('boss_camina.jpeg'), [3, 4], cortes_a_mano=CORTES_A_MANO['boss_camina.jpeg'])
    # Sin marco: cada cuadro es una mancha (el borde de la hoja trae una línea).
    g_ataque = por_manchas(abrir('boss_ataque.jpeg', borde=5), 3000, 190, 40)
    muerte = abrir('muerte_boss.jpeg')
    g_muerte = en_cajas(muerte, cajas_muerte(muerte))
    # Aterriza y se arrastra: nubes de polvo cortadas por el marco.
    for i in (5, 6):
        g_muerte[i] = bordes_deshilachados(g_muerte[i])

    # Escala de cada hoja según un cuadro de referencia (parado, sin la
    # bandera por encima de la cabeza). Al atacar o caminar se agacha un poco.
    def escala(cuadro, alto):
        return alto / cuadro.height
    e_llegada = escala(poses[1], ALTO_JEFE)
    e_caminar = escala(caminar[10], ALTO_JEFE * 0.98)
    e_ataque = escala(ataque[4], ALTO_JEFE * 0.95)
    e_revive = ALTO_JEFE / alto_sin_bandera(revive[0])
    e_gigante = escala(gigante[1], ALTO_GIGANTE)
    e_g_caminar = escala(g_caminar[3], ALTO_GIGANTE * 0.97)
    e_g_ataque = escala(g_ataque[0], ALTO_GIGANTE * 0.96)  # en guardia, un poco agachado
    e_g_muerte = ALTO_GIGANTE / alto_cuerpo(g_muerte[0])
    e_bus = escala(bus[3], ALTO_TRUFI)

    datos = {}
    hoja, celda, _ = armar_hoja([(bus, e_bus)], centro_carroceria)
    hoja.save(CARPETA + 'minibus_sheet.png')
    datos['minibus'] = {'ancho': celda[0], 'alto': celda[1], 'cuadros': len(bus)}

    partes = [(poses, e_llegada), (caminar, e_caminar), (ataque, e_ataque), (revive, e_revive)]
    hoja, celda, inicios = armar_hoja(partes)
    hoja.save(CARPETA + 'jefe_sheet.png')
    datos['jefe'] = {'ancho': celda[0], 'alto': celda[1],
                     **{n: [i, i + len(p[0]) - 1] for n, i, p in zip(['pose', 'caminar', 'ataque', 'revive'], inicios, partes)}}

    partes = [(gigante, e_gigante), (g_caminar, e_g_caminar), (g_ataque, e_g_ataque), (g_muerte, e_g_muerte)]
    hoja, celda, inicios = armar_hoja(partes)
    hoja.save(CARPETA + 'jefe_gigante_sheet.png')
    datos['gigante'] = {'ancho': celda[0], 'alto': celda[1],
                        **{n: [i, i + len(p[0]) - 1] for n, i, p in zip(['aparece', 'caminar', 'ataque', 'muerte'], inicios, partes)}}

    with open(CARPETA + 'jefe_cuadros.json', 'w') as f:
        json.dump(datos, f, indent=1)
    print(json.dumps(datos))


if __name__ == '__main__':
    main()
