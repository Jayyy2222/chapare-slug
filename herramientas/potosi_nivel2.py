"""Imágenes del Nivel 2 (Potosí, escena Nivel2: src/scenes/Nivel2.js) a partir
de assets/fondos/lvl1/lvl2/ (JPEG con fondo magenta).

Guarda en assets/fondos/potosi/:
  calle_1.png, calle_2.png  los dos tramos de calle (inicio.jpeg, inicio1.jpeg)
                            en lienzos de 2064x576 a escala 1: la y del lienzo
                            ES la y del mundo. Cada tramo se baja/sube para que
                            la vereda quede en y 500 (y 250 a 512x288) y debajo
                            se repite el empedrado hasta el borde.
  moneda.png                la Casa de la Moneda (casa_de_la_moneda.jpeg) a la
                            mitad (escala entera 1/2), con su vereda en y 500,
                            la vereda y la calle de calle_2.png debajo y los
                            costados completados (sin cielo entre las casas).
  cielo.png                 cielo.jpeg
  cerros.png, cerro_rico.png, ciudad.png
                            franjas de inicio_efectos.jpeg (parallax)
  obj_*.png                 objetos sueltos de objetos.jpeg, achicados al
                            tamaño del juego
  obj_*2.png                las variantes de obejtos3.jpeg (mismos nombres + 2)
  condor.png, palomas.png, humo.png, campana.png
                            hojas de 4 cuadros de obejtos2.jpeg
  viento_1..3.png           rayas de viento (obejtos2.jpeg)
  techos.png, campanario.png  las otras dos franjas de inicio_efectos.jpeg
  patio.png                 el patio de la Casa de la Moneda
                            (interior_de_la_casa.jpeg), piso en y 500
  subida.png                la subida a la mina (subida_mina.jpeg); el cielo
                            azul plano también queda transparente
  mina_fuera.png, mina_dentro.png
                            los dos cuadros de entrada_mina.jpeg (escena
                            final: la boca de la mina y el socavón)
  _vista_previa.png         los tramos uno tras otro sobre gris

El cielo magenta queda transparente. La colisión (potosi_collision.json) no
sale de acá: se dibuja con el editor de la escena (tecla E).

Uso (desde la raíz del proyecto):  python3 herramientas/potosi_nivel2.py
"""
from pathlib import Path

from PIL import Image

from recorte_sprites import quitar_fondo, sin_tinte_magenta

ORIGEN = Path('assets/fondos/lvl1/lvl2')
DESTINO = Path('assets/fondos/potosi')
ALTO = 576
SUELO = 500  # y de la vereda en el mundo

# Tramos: archivo, salida, y de la vereda en la imagen original.
TRAMOS = [('inicio.jpeg', 'calle_1.png', 448), ('inicio1.jpeg', 'calle_2.png', 470)]
# Casa de la Moneda: se achica a la mitad; vereda a 840 px del original.
MONEDA = ('casa_de_la_moneda.jpeg', 'moneda.png', 840)

# Franjas de inicio_efectos.jpeg: (x0, y0, x1, y1).
FRANJAS = {
    'cerros.png': (0, 0, 1376, 112),
    'cerro_rico.png': (288, 118, 1092, 310),
    'ciudad.png': (0, 322, 1376, 464),
}

# Objetos de objetos.jpeg: caja (x0, y0, x1, y1) y ancho final en px (el alto
# sale proporcional). Medidos contra las puertas y carretas de las calles.
OBJETOS = {
    'puesto': ((20, 12, 432, 292), 176),
    'carreta': ((476, 40, 844, 268), 150),
    'sacos': ((868, 68, 1244, 216), 150),
    'escalera': ((1128, 252, 1240, 620), 40),
    'puerta': ((208, 312, 376, 584), 60),
    'puerta_rota': ((420, 316, 588, 604), 80),
    'ventana': ((660, 312, 812, 520), 48),
    'ventana_abierta': ((860, 312, 1092, 520), 72),
    'farol': ((24, 360, 164, 564), 42),
    'llama': ((900, 540, 1140, 828), 92),
    'letrero': ((648, 564, 856, 796), 70),
    'tejas': ((116, 656, 452, 800), 110),
}
OBJETOS3 = {
    'puesto': ((56, 20, 376, 284), 150),
    'carreta': ((456, 36, 764, 260), 140),
    'sacos': ((844, 48, 1228, 236), 160),
    'escalera': ((1124, 268, 1244, 680), 40),
    'puerta': ((224, 320, 392, 584), 60),
    'puerta_rota': ((416, 320, 588, 600), 62),
    'ventana': ((624, 320, 844, 516), 66),
    'ventana_abierta': ((864, 320, 1080, 516), 66),
    'farol': ((28, 348, 180, 560), 44),
    'llama': ((904, 548, 1124, 828), 86),
    'letrero': ((648, 560, 864, 776), 70),
    'tejas': ((132, 648, 484, 804), 110),
}
CONDOR = [(24 + i * 344, 200, 324 + i * 344, 344) for i in range(4)]
CONDOR_CUADRO = (100, 48)
# Hojas de obejtos2.jpeg: cajas de cada cuadro, ancho del cuadro final y
# tamaño de la celda (el cuadro va abajo y al medio de su celda).
HOJAS = {
    'palomas.png': ([(10 + i * 344, 6, 340 + i * 344, 170) for i in range(4)], 110, (110, 56)),
    'humo.png': ([(30, 380, 190, 580), (190, 380, 340, 580), (345, 380, 512, 580), (515, 380, 690, 580)], None, (64, 72)),
    'campana.png': ([(20 + i * 172, 618, 156 + i * 172, 766) for i in range(4)], 40, (40, 44)),
}
HUMO_ESCALA = 0.38
VIENTO = [(876, 404, 1210, 452), (876, 476, 1210, 522), (876, 544, 1210, 592)]
# Otras franjas de inicio_efectos.jpeg.
FRANJAS_EXTRA = {'techos.png': (0, 466, 1376, 620), 'campanario.png': (0, 616, 1376, 768)}
# Escenas siguientes: archivo, salida, y del piso en la imagen (va a y 500).
PATIO = ('interior_de_la_casa.jpeg', 'patio.png', 545)
SUBIDA = ('subida_mina.jpeg', 'subida.png', 428)
# entrada_mina.jpeg: dos cuadros (x0, x1); se recorta el alto de pantalla.
MINA = {'mina_dentro.png': (0, 797), 'mina_fuera.png': (830, 1456)}
MINA_Y = 80


def es_cielo_azul(r, g, b):
    """El azul plano que hace de cielo en subida_mina.jpeg."""
    return b > 105 and r < 60 and 55 < g < 110 and b - g > 40


def sin_cielo_azul(img):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and es_cielo_azul(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    # La raya que queda entre el magenta y el azul: píxeles sueltos con
    # transparencia arriba y abajo.
    for y in range(3, img.height - 3):
        for x in range(img.width):
            if px[x, y][3] and not px[x, y - 3][3] and not px[x, y + 3][3]:
                px[x, y] = (0, 0, 0, 0)
    return img


def limpio(img):
    """Sin el magenta (transparente) ni su tinte en los bordes."""
    return sin_tinte_magenta(quitar_fondo(img))


def recortar_opaco(img):
    caja = img.getchannel('A').getbbox()
    return img.crop(caja) if caja else img


def achicar(img, ancho):
    """Achica con suavizado y deja el alfa duro (borde de pixel art)."""
    alto = max(1, round(img.height * ancho / img.width))
    chico = img.resize((ancho, alto), Image.LANCZOS)
    a = chico.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    chico.putalpha(a)
    return chico


def rellenar_abajo(lienzo, desde, periodo=12):
    """Debajo de `desde`, repite las últimas filas del empedrado (las de más
    arriba tienen sacos y ruedas pintados encima)."""
    for y in range(desde, ALTO):
        fila = lienzo.crop((0, y - periodo, lienzo.width, y - periodo + 1))
        lienzo.paste(fila, (0, y))


def tramo(archivo, salida, vereda):
    im = limpio(Image.open(ORIGEN / archivo).convert('RGB'))
    lienzo = Image.new('RGBA', (im.width, ALTO), (0, 0, 0, 0))
    dy = SUELO - vereda
    lienzo.alpha_composite(im, (0, max(0, dy)), (0, max(0, -dy)))
    rellenar_abajo(lienzo, dy + im.height)
    lienzo.save(DESTINO / salida)
    print(f'{salida} {lienzo.size} (imagen en y {dy})')
    return lienzo


def escena(archivo, salida, piso, azul=False):
    """Una imagen de nivel a escala 1 con su piso en y 500."""
    im = limpio(Image.open(ORIGEN / archivo).convert('RGB'))
    if azul:
        sin_cielo_azul(im)
    lienzo = Image.new('RGBA', (im.width, ALTO), (0, 0, 0, 0))
    dy = SUELO - piso
    lienzo.alpha_composite(im, (0, max(0, dy)), (0, max(0, -dy)))
    if dy + im.height < ALTO:
        rellenar_abajo(lienzo, dy + im.height)
    lienzo.save(DESTINO / salida)
    print(f'{salida} {lienzo.size} (imagen en y {dy})')


def mina():
    im = Image.open(ORIGEN / 'entrada_mina.jpeg').convert('RGB')
    for salida, (x0, x1) in MINA.items():
        cuadro = limpio(im.crop((x0, MINA_Y, x1, MINA_Y + ALTO)))
        cuadro.save(DESTINO / salida)
        print(salida, cuadro.size)


def hoja_cuadros(origen, cajas, ancho, celda, escala=None):
    w, h = celda
    tira = Image.new('RGBA', (w * len(cajas), h), (0, 0, 0, 0))
    for i, caja in enumerate(cajas):
        c = recortar_opaco(limpio(origen.crop(caja)))
        c = achicar(c, ancho if ancho else max(1, round(c.width * escala)))
        c = c.crop((0, max(0, c.height - h), min(w, c.width), c.height))
        tira.alpha_composite(c, (i * w + (w - c.width) // 2, h - c.height))
    return tira


# La calle frente a la Casa de la Moneda: la misma vereda y empedrado de
# calle_2.png (un tramo sin sacos ni carretas pintados), desde el pie del
# edificio. Su empedrado propio era otro y, repetido, dejaba rayas de cielo.
CALLE_MONEDA = ('calle_2.png', 100, 494)  # archivo, x de donde se copia, y desde la que se reemplaza
BORDE_MONEDA = 40  # px desde cada costado en los que se completa la pared (no queda cielo)


def completar_bordes(lienzo, hasta):
    """A los costados del edificio quedaban franjas de cielo: en cada fila, lo
    transparente entre el borde y el edificio se completa con la pared que
    sigue (espejada), así se pega a las casas de al lado."""
    px = lienzo.load()
    w = lienzo.width
    for y in range(hasta):
        opacos = [x for x in range(w) if px[x, y][3]]
        if not opacos:
            continue
        izq, der = opacos[0], opacos[-1]
        if 0 < izq <= BORDE_MONEDA:
            for x in range(izq):
                px[x, y] = px[min(w - 1, 2 * izq - x), y]
        if w - 1 - BORDE_MONEDA <= der < w - 1:
            for x in range(der + 1, w):
                px[x, y] = px[max(0, 2 * der - x), y]


def moneda():
    archivo, salida, vereda = MONEDA
    im = limpio(Image.open(ORIGEN / archivo).convert('RGB'))
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    lienzo = Image.new('RGBA', (im.width, ALTO), (0, 0, 0, 0))
    dy = SUELO - vereda // 2
    lienzo.alpha_composite(im, (0, dy))
    rellenar_abajo(lienzo, dy + im.height)
    origen, x0, y0 = CALLE_MONEDA
    calle = Image.open(DESTINO / origen).convert('RGBA')
    lienzo.paste(calle.crop((x0, y0, x0 + lienzo.width, ALTO)), (0, y0))
    completar_bordes(lienzo, y0)
    lienzo.save(DESTINO / salida)
    print(f'{salida} {lienzo.size} (imagen en y {dy})')
    return lienzo


def parallax():
    Image.open(ORIGEN / 'cielo.jpeg').convert('RGB').save(DESTINO / 'cielo.png')
    efectos = Image.open(ORIGEN / 'inicio_efectos.jpeg').convert('RGB')
    for salida, caja in {**FRANJAS, **FRANJAS_EXTRA}.items():
        franja = recortar_opaco(limpio(efectos.crop(caja)))
        franja.save(DESTINO / salida)
        print(salida, franja.size)


def objetos():
    hoja = Image.open(ORIGEN / 'objetos.jpeg').convert('RGB')
    for nombre, (caja, ancho) in OBJETOS.items():
        o = achicar(recortar_opaco(limpio(hoja.crop(caja))), ancho)
        o.save(DESTINO / f'obj_{nombre}.png')
        print(f'obj_{nombre}.png', o.size)
    aves = Image.open(ORIGEN / 'obejtos2.jpeg').convert('RGB')
    w, h = CONDOR_CUADRO
    tira = Image.new('RGBA', (w * len(CONDOR), h), (0, 0, 0, 0))
    for i, caja in enumerate(CONDOR):
        c = achicar(recortar_opaco(limpio(aves.crop(caja))), w)
        tira.alpha_composite(c, (i * w, max(0, (h - c.height) // 2)))
    tira.save(DESTINO / 'condor.png')
    print('condor.png', tira.size)
    for salida, (cajas, ancho, celda) in HOJAS.items():
        t = hoja_cuadros(aves, cajas, ancho, celda, HUMO_ESCALA)
        t.save(DESTINO / salida)
        print(salida, t.size)
    for i, caja in enumerate(VIENTO, 1):
        v = recortar_opaco(limpio(aves.crop(caja)))
        v = v.resize((v.width // 2, max(1, v.height // 2)), Image.LANCZOS)
        v.save(DESTINO / f'viento_{i}.png')
    # Variantes de obejtos3.jpeg (los mismos objetos en otras posiciones).
    hoja3 = Image.open(ORIGEN / 'obejtos3.jpeg').convert('RGB')
    for nombre, (caja, ancho) in OBJETOS3.items():
        o = achicar(recortar_opaco(limpio(hoja3.crop(caja))), ancho)
        o.save(DESTINO / f'obj_{nombre}2.png')
        print(f'obj_{nombre}2.png', o.size)


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    partes = [tramo(*t) for t in TRAMOS] + [moneda()]
    parallax()
    objetos()
    escena(*PATIO)
    escena(*SUBIDA, azul=True)
    mina()
    ancho = sum(p.width for p in partes)
    vista = Image.new('RGBA', (ancho, ALTO), (90, 110, 140, 255))
    x = 0
    for p in partes:
        vista.alpha_composite(p, (x, 0))
        x += p.width
    vista.convert('RGB').resize((ancho // 2, ALTO // 2)).save(DESTINO / '_vista_previa.png')
    print('ancho del nivel:', ancho)


if __name__ == '__main__':
    main()
