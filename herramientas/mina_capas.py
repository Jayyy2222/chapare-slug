"""Capas del fondo de la mina (la escena Cueva, src/scenes/Cueva.js) a partir
de assets/fondos/mina/mina.jpeg (la mina armada) y mina1.jpeg (las mismas
piezas sueltas sobre magenta).

Guarda en assets/fondos/mina/, a escala 1 (resolución de pantalla). La mina
se achica a TAMANO_MINA del alto de la pantalla para que guarde proporción con
el jugador (sin achicar, una zorra medía lo mismo que él); arriba queda un
techo de roca y abajo el piso llega justo al borde de la pantalla:
  mina_techo.png   roca del techo con los tirantes (la franja de arriba de
                   mina.jpeg espejada hacia arriba), oscureciéndose hacia
                   arriba. Va con la pared.
  mina_pared.png   de mina.jpeg, todo lo de arriba de la vía del fondo:
                   paredes de roca, vigas, faroles, cajones y zorras. Parallax
                   lento.
  mina_piso.png    de mina.jpeg, la grava y la vía de adelante (por donde
                   camina el jugador). Corre igual que el jugador, así los pies
                   no resbalan.
  mina_frente.png  de mina1.jpeg, las piedras de la franja de abajo, sin el
                   magenta ni la marca de agua (✦). La zorra de esa franja no
                   se usa: sube hasta la grava (opaca) y no se puede recortar
                   limpia; la de mina.jpeg ya está en el piso. Va delante del
                   jugador y corre más rápido.
Cada capa va espejada (imagen + espejo) para repetirse sin costura.

Y las piezas sueltas de mina1.jpeg (objetos del nivel, Cueva.js):
  mina_estructura.png  marco de vigas con faroles, el caño y dos reflectores
                       (parallax delante del jugador, colgando del techo)
  mina_poste.png       un tramo de la madera de un poste de la estructura: en
                       el juego se repite para alargar los postes hasta el
                       piso (si no, quedaban colgando en el aire)
  mina_cajon.png, mina_zorra.png, mina_pico.png, mina_casco.png
  mina_objetos.json    tamaños, dónde están los faroles y los reflectores
                       dentro de la estructura (para sus luces) y la y de cada
                       capa y del piso (los lee Cueva.js)

Imprime la y del corte y la del piso (en px de pantalla) que usa CUEVA en
Cueva.js.

Uso (desde la raíz del proyecto):  python3 herramientas/mina_capas.py
"""
from PIL import Image, ImageOps

from recorte_sprites import quitar_fondo, sin_tinte_magenta

CARPETA = 'assets/fondos/mina/'
ALTO_PANTALLA = 576
ESCALA_JUEGO = 1
TAMANO_MINA = 0.72   # alto de mina.jpeg / alto de la pantalla
TECHO = 60           # filas de arriba de mina.jpeg (roca y tirantes) que forman el techo
CORTE = 505        # y en mina.jpeg: debajo de la vía del fondo
PISO = 615         # y en mina.jpeg: los durmientes de la vía de adelante
FRENTE = (592, 690)          # filas de mina1.jpeg con la zorra y las piedras
MARCA_AGUA = (1460, 588)     # mina1.jpeg: desde acá a la derecha y abajo, la ✦
ZORRA = (480, 730)           # mina1.jpeg: columnas de la zorra de la franja de abajo


def espejada(img):
    doble = Image.new('RGBA', (img.width * 2, img.height))
    doble.paste(img, (0, 0))
    doble.paste(ImageOps.mirror(img), (img.width, 0))
    return doble


# Piezas de mina1.jpeg: caja (x0, y0, x1, y1) en px de la hoja. Dentro de cada
# caja se queda la mancha más grande (y lo que la toca).
PIEZAS = {
    'estructura': (0, 196, 1600, 362),
    'cajon': (36, 400, 116, 466),
    'zorra': (866, 352, 1003, 472),
    'pico': (1452, 372, 1510, 468),
    'casco': (1155, 430, 1207, 466),
}
# Faroles (luz amarilla) y reflectores (cono hacia abajo) en mina1.jpeg.
FAROLES = [(218, 305), (466, 305), (806, 305), (1085, 305), (1590, 305)]  # (y en la hoja)
REFLECTORES = [(578, 252), (875, 252)]


def pieza(hoja, caja, escala):
    from recorte_sprites import componentes
    trozo = hoja.crop(caja)
    grandes, _ = componentes(trozo, 50)
    _, _, pixeles = max(grandes, key=lambda m: m[0])
    limpio = Image.new('RGBA', trozo.size)
    origen, destino = trozo.load(), limpio.load()
    for x, y in pixeles:
        destino[x, y] = origen[x, y]
    limpio = limpio.crop(limpio.getbbox())
    chico = limpio.resize((max(1, round(limpio.width * escala)), max(1, round(limpio.height * escala))), Image.LANCZOS)
    chico.putalpha(chico.getchannel('A').point(lambda a: 255 if a > 140 else 0))
    return chico, limpio.getbbox()


def main():
    mina = Image.open(CARPETA + 'mina.jpeg').convert('RGBA')
    escala = ALTO_PANTALLA / mina.height / ESCALA_JUEGO * TAMANO_MINA
    tam = lambda w, h: (round(w * escala), round(h * escala))
    chica = mina.resize(tam(*mina.size), Image.LANCZOS)
    corte = round(CORTE * escala)
    pared = chica.crop((0, 0, chica.width, corte))
    piso = chica.crop((0, corte, chica.width, chica.height))
    espejada(pared).save(CARPETA + 'mina_pared.png')
    espejada(piso).save(CARPETA + 'mina_piso.png')
    # Posiciones en pantalla: el piso termina en el borde de abajo.
    piso_y = ALTO_PANTALLA - piso.height
    pared_y = piso_y - pared.height
    pies = piso_y + round((PISO - CORTE) * escala)

    # Techo: la franja de arriba espejada hacia arriba (empalma sin costura con
    # la pared), repetida hasta cubrir y oscureciéndose hacia arriba.
    franja = chica.crop((0, 0, chica.width, round(TECHO * escala)))
    techo = Image.new('RGBA', (chica.width, max(1, pared_y)))
    y, k = techo.height, 0
    while y > 0:
        trozo = ImageOps.flip(franja) if k % 2 == 0 else franja
        y -= trozo.height
        techo.paste(trozo, (0, y))
        k += 1
    sombra = Image.new('RGBA', techo.size)
    for fila in range(techo.height):
        alfa = round(255 * (1 - fila / techo.height) ** 1.3 * 0.85)
        sombra.paste((0, 0, 0, alfa), (0, fila, techo.width, fila + 1))
    techo = Image.alpha_composite(techo, sombra)
    espejada(techo).save(CARPETA + 'mina_techo.png')

    piezas = sin_tinte_magenta(quitar_fondo(Image.open(CARPETA + 'mina1.jpeg')))
    px = piezas.load()
    for y in range(MARCA_AGUA[1], piezas.height):
        for x in range(MARCA_AGUA[0], piezas.width):
            px[x, y] = (0, 0, 0, 0)
    for y in range(FRENTE[0], FRENTE[1]):
        for x in range(*ZORRA):
            px[x, y] = (0, 0, 0, 0)
    frente = piezas.crop((0, FRENTE[0], piezas.width, FRENTE[1]))
    frente = frente.resize(tam(*frente.size), Image.LANCZOS)
    # Bordes nítidos (sin halo magenta semitransparente).
    frente.putalpha(frente.getchannel('A').point(lambda a: 255 if a > 140 else 0))
    espejada(frente).save(CARPETA + 'mina_frente.png')

    datos = {'capas': {'techo': 0, 'pared': pared_y, 'piso': piso_y}, 'pies': pies, 'escala': escala}
    for nombre, caja in PIEZAS.items():
        img, _ = pieza(piezas, caja, escala)
        img.save(CARPETA + 'mina_%s.png' % nombre)
        datos[nombre] = {'ancho': img.width, 'alto': img.height}
    # Postes: columnas opacas en las filas de abajo de la estructura.
    estructura = Image.open(CARPETA + 'mina_estructura.png')
    alfa = estructura.getchannel('A').load()
    fila = estructura.height - 6
    postes, x = [], 0
    while x < estructura.width:
        if alfa[x, fila]:
            x0 = x
            while x < estructura.width and alfa[x, fila]:
                x += 1
            if x - x0 >= 12:
                postes.append([x0, x - 1])
        x += 1
    datos['postes'] = postes
    p0, p1 = postes[1]
    estructura.crop((p0, estructura.height - 14, p1 + 1, estructura.height)).save(CARPETA + 'mina_poste.png')
    x0, y0 = PIEZAS['estructura'][:2]
    datos['faroles'] = [[round((x - x0) * escala), round((y - y0) * escala)] for x, y in FAROLES]
    datos['reflectores'] = [[round((x - x0) * escala), round((y - y0) * escala)] for x, y in REFLECTORES]
    import json
    with open(CARPETA + 'mina_objetos.json', 'w') as f:
        json.dump(datos, f, indent=1)
    print(json.dumps(datos))
    print('pared y:', pared_y, ' piso y:', piso_y, ' pies:', pies, ' ancho capa:', chica.width * 2)


if __name__ == '__main__':
    main()
