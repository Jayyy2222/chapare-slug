"""El jefe de la Casa de la Moneda (el jinete fantasma, escena Patio) a partir
de assets/jefes/jefe_casa_de_la_moneda/*.jpeg (sobre magenta, mirando a la
derecha).

Guarda en assets/jefes/jefe_casa_de_la_moneda/:
  jinete_galope.png   embestida.jpeg: 6 cuadros galopando
  jinete_ataque.png   ataque.jpeg: 5, el sablazo (el 3 con la media luna)
  jinete_lanza.png    ataque2_.jpeg (fila de arriba): 6, junta y tira la bola
  jinete_bola.png     ataque2_.jpeg (fila de abajo): 4 de la bola que vuela y
                      6 de la explosión
  jinete_muerte.png   muerte.jpeg: 11, se electrocuta, cae, se vuelve huesos
  jinete_sale.png     sale_portal.jpeg: 8, sale del portal
  portal.png          portal.jpeg: 18 cuadros del portal en el suelo (se abre,
                      arde y se cierra) sin la franja de piso dibujada
  portal_luz.png      portal.jpeg: 4 de la columna de luz
  fx_<efecto>.png     efectos.jpeg: llama (el aura de fuego), muro (fuego por
                      el piso), pilar, caballo (espectral), niebla, explota,
                      calavera y rayo
  ../../fondos/potosi/patio_embrujado.png  casa_embruiajda.jpeg: el patio
                      embrujado, alineado con patio.png
  jinete.json         celdas y origen (los cascos, al medio del caballo) de
                      cada hoja

Cada cuadro es una caja de la hoja: se queda la mancha más grande y lo que
esté cerca (la galera que vuela, las llamas). Cada hoja se escala para que
el jinete mida lo mismo: ALTO px de la galera a los cascos en los cuadros de
referencia (REF).

Uso (desde la raíz del proyecto):  python3 herramientas/jefe_moneda.py
"""
import json
from pathlib import Path

from PIL import Image

from recorte_sprites import quitar_fondo, sin_tinte_magenta, componentes

CARPETA = Path('assets/jefes/jefe_casa_de_la_moneda')
ALTO = 215  # px de la galera a los cascos (el jugador mide ~125)


def cajas_x(xs, y0, y1):
    return [(a, y0, b, y1) for a, b in zip(xs, xs[1:])]


# hoja: (archivo, cajas, cuadros de referencia para la escala, cerca)
HOJAS = {
    'galope': ('embestida', [(0, 0, 480, 322), (480, 0, 1040, 336), (1040, 0, 1584, 336),
                             (0, 318, 480, 672), (690, 336, 1140, 672), (1140, 310, 1584, 672)], [1, 2], 30),
    'ataque': ('ataque', cajas_x([0, 325, 632, 990, 1222, 1584], 100, 600), [3, 4], 30),
    'lanza': ('ataque2_', cajas_x([0, 312, 600, 880, 1170, 1460, 1792], 0, 350), [0, 1, 2, 3], 30),
    'muerte': ('muerte', cajas_x([0, 288, 588, 925, 1251, 1584], 0, 340)
               + cajas_x([0, 318, 600, 862, 1096, 1352, 1584], 340, 672), [0], 90),
    'sale': ('sale_portal', cajas_x([0, 318, 627, 945, 1259, 1579, 1872, 2172, 2544], 0, 416), [5, 6, 7], 30),
}
# La bola: sin escala de jinete; se lleva a BOLA px de alto (la que vuela).
BOLA = {'archivo': 'ataque2_', 'cajas': cajas_x([20, 140, 330, 525, 720, 870, 1030, 1270, 1450, 1620, 1792], 360, 592), 'escala': 0.55}
# El portal: 4 filas (la última de 6 cuadros más chicos) y la columna de luz.
PORTAL = {
    'cajas': cajas_x([0, 300, 600, 900, 1200], 20, 150) + cajas_x([0, 300, 600, 900, 1200], 150, 300)
    + cajas_x([0, 300, 600, 900, 1200], 300, 480) + cajas_x([0, 200, 400, 600, 800, 1000, 1200], 500, 640),
    'luz': cajas_x([200, 380, 600, 800, 1000], 640, 896),
    'escala': 0.72,
}


# efectos.jpeg: nombre -> (cajas de los cuadros, escala, ancla abajo?).
EFECTOS = {
    'llama': ([(60, 6, 85, 44), (223, 4, 250, 45), (226, 570, 243, 599), (373, 568, 402, 604)], 1.0, True),
    'muro': ([(51, 58, 94, 102), (174, 68, 300, 102), (325, 75, 792, 103)], 0.8, True),
    'pilar': ([(210, 140, 265, 202), (51, 112, 94, 202), (359, 106, 439, 202), (509, 105, 603, 202), (665, 104, 765, 202)], 1.6, True),
    'caballo': ([(19, 238, 138, 280), (175, 208, 313, 280), (377, 208, 528, 281), (644, 212, 756, 282)], 1.5, True),
    'niebla': ([(321, 288, 792, 329)], 1.4, True),
    'explota': ([(823, 410, 914, 494), (968, 411, 1079, 494), (1105, 396, 1241, 494), (1260, 396, 1399, 494), (1430, 437, 1560, 494)], 1.1, True),
    'calavera': ([(846, 497, 891, 556), (995, 496, 1050, 559), (1147, 497, 1203, 558)], 1.0, False),
    'rayo': ([(794, 609, 943, 671), (948, 609, 1097, 672), (1102, 609, 1250, 671), (1256, 610, 1404, 670)], 1.0, False),
}


def suave(img):
    """Quita el magenta sin cortar en seco: los bordes de las llamas y los
    brillos (mezclados con el fondo) quedan semitransparentes. Cada píxel se
    piensa como a·color + (1-a)·magenta: a sale de cuánto verde le falta
    respecto del rojo y el azul, y el color se recupera."""
    rgb = img.convert('RGB')
    out = Image.new('RGBA', rgb.size)
    src, dst = rgb.load(), out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src[x, y]
            m = min(r, b) - g
            if m <= 30:
                dst[x, y] = (r, g, b, 255)
                continue
            a = max(0.0, min(1.0, 1 - (m - 30) / 200))
            if a < 0.06:
                continue
            k = (1 - a) * 255
            dst[x, y] = (max(0, min(255, round((r - k) / a))), g if a == 1 else min(255, round(g / a)),
                         max(0, min(255, round((b - k) / a))), round(a * 255))
    return out


def sin_marco(img):
    """Borra el contorno del rectángulo de piso dibujado alrededor de cada
    cuadro del portal: filas o columnas casi enteras de píxeles oscuros o
    grises (las llamas son verdes y no se tocan)."""
    px = img.load()
    W, H = img.size
    gris = lambda c: c[3] and max(c[:3]) - min(c[:3]) < 45 and max(c[:3]) < 170
    for y in range(H):
        if sum(1 for x in range(W) if gris(px[x, y])) > W * 0.6:
            for x in range(W):
                if gris(px[x, y]):
                    px[x, y] = (0, 0, 0, 0)
    for x in list(range(min(10, W))) + list(range(max(0, W - 10), W)):  # (solo los bordes: el hueco también es oscuro)
        if sum(1 for y in range(H) if gris(px[x, y])) > H * 0.2:
            for y in range(H):
                if gris(px[x, y]):
                    px[x, y] = (0, 0, 0, 0)
    return img


def escalar_suave(img, k):
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


def limpio(img):
    return sin_tinte_magenta(quitar_fondo(img))


def es_piso(r, g, b):
    """La franja de piso gris-morada dibujada bajo el portal."""
    return abs(r - b) < 22 and 70 < r < 140 and g < r - 6 and g > r - 40


# Cuadros de la embestida en los que la galera del cuadro de abajo se mete en
# la caja (negra, tocando las llamas de los cascos): se borra lo negro de las
# últimas filas de la caja.
SIN_GALERA = {('embestida', 0), ('embestida', 2)}


def recortar(hoja, caja, cerca, todo=False, sin_negro=0):
    trozo = hoja.crop(caja)
    if sin_negro:
        px = trozo.load()
        for y in range(trozo.height - sin_negro, trozo.height):
            for x in range(trozo.width):
                r, g, b, a = px[x, y]
                if a and max(r, g, b) < 60:
                    px[x, y] = (0, 0, 0, 0)
    if todo:
        # Fuera lo que toca el borde de la caja y es chico (pedazos del cuadro vecino).
        grandes, _ = componentes(trozo, 1)
        mayor = max((n for n, _, _ in grandes), default=0)
        px = trozo.load()
        W, H = trozo.size
        for n, (x0, y0, x1, y1), pts in grandes:
            if n < mayor * 0.15 and (x0 == 0 or y0 == 0 or x1 == W or y1 == H):
                for x, y in pts:
                    px[x, y] = (0, 0, 0, 0)
        c = trozo.getchannel('A').getbbox()
        return trozo.crop(c) if c else trozo
    grandes, chicas = componentes(trozo, 1)
    grandes.sort(key=lambda m: -m[0])
    _, (bx0, by0, bx1, by1), _ = grandes[0]
    out = Image.new('RGBA', trozo.size)
    o, d = trozo.load(), out.load()
    for n, (x0, y0, x1, y1), px in grandes:
        dist = max(bx0 - x1, x0 - bx1, 0) + max(by0 - y1, y0 - by1, 0)
        # (Lo que queda entero debajo del cuerpo es de otro cuadro: la galera
        # del de abajo que se metió en la caja.)
        debajo = y0 >= by1 - 6 and n < 600
        if (x0, y0, x1, y1) == (bx0, by0, bx1, by1) or (dist <= cerca and n >= 12 and not debajo):
            for x, y in px:
                d[x, y] = o[x, y]
    return out.crop(out.getchannel('A').getbbox())


def escalar(img, k):
    chica = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    chica.putalpha(chica.getchannel('A').point(lambda a: 255 if a > 100 else 0))
    return chica


def ancla(img):
    """(x, y) de los cascos: abajo, y en x la mediana de la franja del cuerpo
    del caballo (del 45 al 75 % del alto)."""
    a = img.getchannel('A').load()
    xs = sorted(x for y in range(int(img.height * 0.45), int(img.height * 0.75)) for x in range(img.width) if a[x, y])
    # Abajo: la última fila con cuerpo (no las puntas finas de las llamas).
    cuenta = [sum(1 for x in range(img.width) if a[x, y]) for y in range(img.height)]
    minimo = max(cuenta) * 0.08
    y = img.height
    while y > img.height * 0.6 and cuenta[y - 1] < minimo:
        y -= 1
    return (xs[len(xs) // 2] if xs else img.width / 2), y


def tira(cuadros, anclas):
    L = max(ax for ax, _ in anclas); R = max(c.width - ax for c, (ax, _) in zip(cuadros, anclas))
    T = max(ay for _, ay in anclas); B = max(c.height - ay for c, (_, ay) in zip(cuadros, anclas))
    w, h = round(L + R) + 2, round(T + B) + 2
    out = Image.new('RGBA', (w * len(cuadros), h))
    for i, (c, (ax, ay)) in enumerate(zip(cuadros, anclas)):
        out.alpha_composite(c, (i * w + round(L - ax) + 1, round(T - ay) + 1))
    return out, w, h, [round((L + 1) / w, 4), round((T + 1) / h, 4)]


def main():
    datos = {}
    fuentes = {}
    for nombre, (archivo, cajas, ref, cerca) in HOJAS.items():
        if archivo not in fuentes:
            # Recorte suave: las llamas del jinete y del caballo conservan su brillo.
            fuentes[archivo] = suave(Image.open(CARPETA / f'{archivo}.jpeg'))
        hoja = fuentes[archivo]
        crudos = [recortar(hoja, c, cerca, sin_negro=40 if (archivo, i) in SIN_GALERA else 0) for i, c in enumerate(cajas)]
        alto_ref = sorted(crudos[i].height for i in ref)[len(ref) // 2]
        k = ALTO / alto_ref
        cuadros = [escalar_suave(c, k) for c in crudos]
        img, w, h, origen = tira(cuadros, [ancla(c) for c in cuadros])
        img.save(CARPETA / f'jinete_{nombre}.png')
        datos[nombre] = {'ancho': w, 'alto': h, 'cuadros': len(cuadros), 'origen': origen}
        print(nombre, len(cuadros), w, h, round(k, 3))

    hoja = suave(Image.open(CARPETA / 'ataque2_.jpeg'))
    cuadros = [escalar_suave(recortar(hoja, c, 0, todo=True), BOLA['escala']) for c in BOLA['cajas']]
    cuadros = [c for c in cuadros if c.width > 4]
    img, w, h, origen = tira(cuadros, [(c.width / 2, c.height / 2) for c in cuadros])
    img.save(CARPETA / 'jinete_bola.png')
    datos['bola'] = {'ancho': w, 'alto': h, 'cuadros': len(cuadros), 'origen': [0.5, 0.5]}

    # La franja de piso se borra antes de limpiar el magenta (si no, queda gris).
    portal = quitar_fondo(Image.open(CARPETA / 'portal.jpeg'))
    px = portal.load()
    for y in range(portal.height):
        for x in range(portal.width):
            r, g, b, a = px[x, y]
            if a and es_piso(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    portal = sin_tinte_magenta(portal)
    for nombre, cajas in (('portal', PORTAL['cajas']), ('portal_luz', PORTAL['luz'])):
        cuadros = []
        for c in cajas:
            t = sin_marco(portal.crop(c))
            cuadros.append(escalar_suave(t, PORTAL['escala']))
        # Abajo al medio (el piso: la línea de abajo del hueco).
        img, w, h, origen = tira(cuadros, [(c.width / 2, c.height) for c in cuadros])
        img.save(CARPETA / f'{nombre}.png')
        datos[nombre] = {'ancho': w, 'alto': h, 'cuadros': len(cuadros), 'origen': origen}
    # efectos.jpeg: una hoja por efecto (cajas de cada cuadro).
    fx = suave(Image.open(CARPETA / 'efectos.jpeg'))
    for nombre, (cajas, k, abajo) in EFECTOS.items():
        # Margen a los costados y abajo; arriba poco (encima está la fila
        # anterior de la hoja, y su borde se colaba).
        cuadros = [escalar_suave(recortar(fx, (x0 - 8, y0 - 1, x1 + 8, y1 + 6), 0, todo=True), k) for x0, y0, x1, y1 in cajas]
        anclas = [(c.width / 2, c.height if abajo else c.height / 2) for c in cuadros]
        img, w, h, origen = tira(cuadros, anclas)
        img.save(CARPETA / f'fx_{nombre}.png')
        datos['fx_' + nombre] = {'ancho': w, 'alto': h, 'cuadros': len(cuadros), 'origen': origen}

    # La casa embrujada: el mismo patio (interior_de_la_casa.jpeg) pero
    # embrujado; se lleva igual que patio.png (piso en y 500, 576 de alto).
    casa = limpio(Image.open(CARPETA / 'casa_embruiajda.jpeg'))
    casa = casa.crop((0, 0, 1792, casa.height))
    lienzo = Image.new('RGBA', (casa.width, 576))
    dy = 500 - 545
    lienzo.alpha_composite(casa, (0, max(0, dy)), (0, max(0, -dy)))
    # Debajo del dibujo, su empedrado repetido (como patio.png): si no, ahí
    # se veía la franja del patio normal.
    desde = dy + casa.height
    for y in range(desde, 576):
        lienzo.paste(lienzo.crop((0, y - 12, lienzo.width, y - 11)), (0, y))
    lienzo.save(Path('assets/fondos/potosi/patio_embrujado.png'))
    (CARPETA / 'jinete.json').write_text(json.dumps(datos, indent=1))
    print({k: (v['cuadros'], v['ancho'], v['alto']) for k, v in datos.items()})


if __name__ == '__main__':
    main()
