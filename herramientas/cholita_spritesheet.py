"""Convierte las tiras de la cholita (enemigo) en un spritesheet con varias
polleras de distinto color.

Lee de assets/personajes/enemigos/ (sobre fondo magenta, con una sombra
pintada debajo):
  cholita.jpeg          8 cuadros de caminar (grilla de celdas iguales)
  cholita_ataque.jpeg   6 cuadros: levanta la bolsa, la carga, la revolea, el
                        golpe (con destellos), se recupera, se acomoda el sombrero
y guarda
  cholita_sheet.png     una fila por color de pollera; en cada fila, los 8
                        cuadros de caminar y después los 6 de ataque
  cholita_rip_sheet.png la muerte (cholita_rip.png, 6 cuadros), una fila por pollera
  cholita_quemada_sheet.png la muerte por fuego o explosión (cholita_quemad.jpeg,
                        14 cuadros: se prende y corre, queda carbonizada, se
                        hace ceniza, esqueleto y montoncito humeante), una fila
                        por pollera
  cholita_cuadros.json  tamaño de celda, cuadros por fila y nombres de los colores

Pasos:
  1. Quita el magenta (es JPEG: se usa una tolerancia, no un color exacto).
  2. Corta la sombra pintada bajo los pies: en el juego cada personaje
     tiene su propia sombra (ver SOMBRA en Nivel1.js).
  3. Separa los cuadros y los alinea por los pies, como
     herramientas/npc_spritesheet.py. Los de caminar van en una grilla; en
     el ataque el brazo y los destellos se pasan a la celda vecina, así que
     cada cuadro es una mancha grande y los detalles sueltos (destellos, el
     revoleo) se suman a la más cercana.
  4. Marca la pollera: azul muy saturado de la cintura para abajo (la blusa
     también es celeste, pero más clara y más arriba).
  5. Achica a la escala de arte (ALTO_ARTE) y, por cada color de POLLERAS,
     rota el tono de los píxeles de la pollera manteniendo luces y sombras.

Uso (desde la raíz del proyecto):  python3 herramientas/cholita_spritesheet.py
"""
import json

from PIL import Image

from PIL import ImageFilter

from recorte_sprites import componentes, cortar_sombra, por_manchas

CARPETA = 'assets/personajes/enemigos/'
ALTO_ARTE = 66      # px de arte del cuadro más alto: caminando mide 62 con el sombrero, como Manfred de pie
MARGEN = 4
COLORES = 40
CUADROS = 8         # de caminar
MANCHA_CUADRO = 20000  # px: en el ataque, una mancha más grande es un cuadro
LEJOS = 80          # px: un detalle más lejos de todo cuadro es ruido del JPEG
SIN_SOMBRERO = 0.88  # el cuerpo sin sombrero mide esto del cuadro de caminar (para escalar la muerte)
TRAMO = 60         # px (sin escalar) de pollera que tiene que haber debajo del borde
CINTURA = 0.40      # la pollera empieza más abajo de este % de la altura del cuadro
# Nombre y tono (0-360) de cada pollera. 'azul' es el original.
# Cuadros de cholita_quemad.jpeg: las llamas de uno tocan al vecino, así que
# no se separan por manchas sino por estas cajas (filas y columnas con dibujo).
QUEMADA_CAJAS = [
    (40, 13, 233, 344), (259, 13, 489, 344), (510, 13, 749, 344),
    (26, 354, 268, 677), (283, 354, 532, 677), (571, 354, 726, 677),
    (35, 690, 190, 1010), (218, 690, 373, 1010), (399, 690, 554, 1010), (579, 690, 734, 1010),
    (28, 1035, 182, 1334), (221, 1035, 366, 1334), (391, 1035, 569, 1334), (598, 1035, 742, 1334),
]
QUEMADA_MONTONES = 12   # desde este cuadro, los montoncitos de ceniza

POLLERAS = [
    ('azul', None),
    ('roja', 352),
    ('verde', 135),
    ('morada', 280),
    ('rosada', 325),
    ('naranja', 22)
]


def es_magenta(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def quitar_fondo(img):
    rgba = img.convert('RGBA')
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            if es_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return rgba


def cortar(img):
    """La tira es una grilla de CUADROS celdas iguales (algunos cuadros se
    tocan, así que no alcanza con buscar columnas vacías)."""
    ancho = img.width / CUADROS
    cuadros = []
    for i in range(CUADROS):
        c = img.crop((round(i * ancho), 0, round((i + 1) * ancho), img.height))
        cuadros.append(c.crop(c.getbbox()))
    return cuadros


def centro_pies(cuadro):
    ancho, alto = cuadro.size
    px = cuadro.load()
    xs = [x for y in range(int(alto * 0.9), alto) for x in range(ancho) if px[x, y][3]]
    return sum(xs) / len(xs) if xs else ancho / 2


def mascara_pollera(cuadro):
    """L: 255 donde está la pollera. Primero el azul muy saturado debajo de la
    cintura con un buen tramo de pollera debajo; después, en cada columna, se suman los
    pliegues claros (menos saturados) que quedan debajo de ese borde, sin
    tocar el ruedo de la blusa, que es del mismo azul claro."""
    hsv = cuadro.convert('RGB').convert('HSV').load()
    alfa = cuadro.getchannel('A').load()
    mascara = Image.new('L', cuadro.size)
    m = mascara.load()
    cintura = int(cuadro.height * CINTURA)
    azul = lambda x, y, saturacion: alfa[x, y] and 125 <= hsv[x, y][0] <= 170 and hsv[x, y][1] > saturacion and hsv[x, y][2] > 40
    for x in range(cuadro.width):
        # El borde es el primer azul con pollera debajo: así se salta el
        # ruedo de la blusa, una franja fina de azul oscuro.
        borde = next((y for y in range(cintura, cuadro.height - TRAMO) if azul(x, y, 190) and
                      sum(1 for k in range(TRAMO) if azul(x, y + k, 100)) > TRAMO * 0.85), None)
        if borde is None:
            continue
        for y in range(borde, cuadro.height):
            if azul(x, y, 100):
                m[x, y] = 255
    return mascara


def mascara_pollera_suelta(cuadro):
    """Para la muerte, donde la cholita cae y queda acostada: no hay una
    cintura fija. La pollera es el azul muy saturado (la blusa, aun en sus
    sombras, es menos saturada); se le suman los pliegues claros que estén
    pegados a ese azul."""
    hsv = cuadro.convert('RGB').convert('HSV')
    alfa = cuadro.getchannel('A')
    def azul(saturacion):
        h, s, v = hsv.split()
        tono = h.point(lambda x: 255 if 125 <= x <= 170 else 0)
        sat = s.point(lambda x: 255 if x > saturacion else 0)
        return Image.composite(Image.composite(tono, Image.new('L', cuadro.size), sat), Image.new('L', cuadro.size), alfa)
    nucleo = azul(200)
    cerca = nucleo.filter(ImageFilter.MaxFilter(5))
    return Image.composite(azul(100), Image.new('L', cuadro.size), cerca)


def sin_sombras_chatas(img):
    """Borra las sombras pintadas bajo los pies: manchas sueltas mucho más
    anchas que altas (en el juego cada personaje tiene su propia sombra)."""
    px = img.load()
    for _, (x0, y0, x1, y1), pixeles in componentes(img, 1)[0]:
        if y1 - y0 <= 10 and x1 - x0 >= 3 * (y1 - y0):
            for x, y in pixeles:
                px[x, y] = (0, 0, 0, 0)
    return img


def a_pixel_art(celda, tamano):
    chica = celda.resize(tamano, Image.LANCZOS)
    alfa = chica.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    color = chica.convert('RGB').quantize(COLORES, method=Image.Quantize.MEDIANCUT).convert('RGB')
    resultado = color.convert('RGBA')
    resultado.putalpha(alfa)
    return resultado


def tenir(cuadro, mascara, tono):
    """Cambia el tono de los píxeles de la pollera; saturación y brillo quedan."""
    if tono is None:
        return cuadro
    hsv = cuadro.convert('RGB').convert('HSV')
    h, s, v = hsv.split()
    nuevo = round(tono / 360 * 255)
    h = Image.composite(Image.new('L', cuadro.size, nuevo), h, mascara)
    rgb = Image.merge('HSV', (h, s, v)).convert('RGB').convert('RGBA')
    rgb.putalpha(cuadro.getchannel('A'))
    return rgb


def main():
    caminar = cortar(cortar_sombra(quitar_fondo(Image.open(CARPETA + 'cholita.jpeg'))))
    ataque = por_manchas(cortar_sombra(quitar_fondo(Image.open(CARPETA + 'cholita_ataque.jpeg'))), MANCHA_CUADRO, None, LEJOS)
    cuadros = caminar + ataque
    # Las dos tiras están dibujadas al mismo tamaño: la escala sale de caminar
    # y la celda es la que entra todo (el ataque es más ancho).
    escala = ALTO_ARTE / (max(c.height for c in caminar) + MARGEN)
    medio = max(max(centro_pies(c), c.width - centro_pies(c)) for c in cuadros)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(c.height for c in cuadros) + MARGEN
    chico = (round(ancho * escala), round(alto * escala))

    hoja = Image.new('RGBA', (chico[0] * len(cuadros), chico[1] * len(POLLERAS)))
    for i, c in enumerate(cuadros):
        celda = Image.new('RGBA', (ancho, alto))
        lugar = (round(ancho / 2 - centro_pies(c)), alto - c.height)
        celda.paste(c, lugar, c)
        mascara = Image.new('L', (ancho, alto))
        mascara.paste(mascara_pollera(c), lugar)
        for fila, (_, tono) in enumerate(POLLERAS):
            hoja.paste(a_pixel_art(tenir(celda, mascara, tono), chico), (i * chico[0], fila * chico[1]))
    hoja.save(CARPETA + 'cholita_sheet.png')
    datos = {'ancho': chico[0], 'alto': chico[1], 'caminar': len(caminar), 'ataque': len(ataque),
             'polleras': [n for n, _ in POLLERAS]}
    with open(CARPETA + 'cholita_cuadros.json', 'w') as f:
        json.dump(datos, f)
    print(f'cholita_sheet.png: {len(caminar)} + {len(ataque)} cuadros de {chico[0]}x{chico[1]}, {len(POLLERAS)} polleras')

    # Muerte (cholita_rip.png, ya transparente y dibujada más chica): hoja
    # aparte con su propia celda. El sombrero vuela suelto: se suma al cuadro
    # más cercano. La escala iguala el cuerpo sin sombrero del primer cuadro
    # con el de caminar.
    rip = por_manchas(sin_sombras_chatas(Image.open(CARPETA + 'cholita_rip.png').convert('RGBA')), 5000, None, 60)
    grandes, _ = componentes(rip[0], 1)
    cuerpo = max(grandes, key=lambda m: m[0])[1]
    escala_rip = escala * caminar[0].height * SIN_SOMBRERO / (cuerpo[3] - cuerpo[1])
    medio = max(max(centro_pies(c), c.width - centro_pies(c)) for c in rip)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(c.height for c in rip) + MARGEN
    chico = (round(ancho * escala_rip), round(alto * escala_rip))
    hoja = Image.new('RGBA', (chico[0] * len(rip), chico[1] * len(POLLERAS)))
    for i, c in enumerate(rip):
        celda = Image.new('RGBA', (ancho, alto))
        celda.paste(c, (round(ancho / 2 - centro_pies(c)), alto - c.height), c)
        mascara = mascara_pollera_suelta(celda)
        for fila, (_, tono) in enumerate(POLLERAS):
            hoja.paste(a_pixel_art(tenir(celda, mascara, tono), chico), (i * chico[0], fila * chico[1]))
    hoja.save(CARPETA + 'cholita_rip_sheet.png')
    datos['rip'] = {'ancho': chico[0], 'alto': chico[1], 'cuadros': len(rip)}
    with open(CARPETA + 'cholita_cuadros.json', 'w') as f:
        json.dump(datos, f)
    print(f'cholita_rip_sheet.png: {len(rip)} cuadros de {chico[0]}x{chico[1]}')

    # Quemada (ver QUEMADA_CAJAS). La escala iguala la carbonizada parada
    # (cuadro 5, sin llamas) con caminar.
    hoja_q = quitar_fondo(Image.open(CARPETA + 'cholita_quemad.jpeg'))
    quemada = []
    for i, caja in enumerate(QUEMADA_CAJAS):
        # Los dos montoncitos de ceniza son chatos: cortar_sombra los borraría.
        c = hoja_q.crop(caja) if i >= QUEMADA_MONTONES else cortar_sombra(hoja_q.crop(caja))
        quemada.append(c.crop(c.getbbox()))
    escala_q = escala * caminar[0].height / quemada[5].height
    medio = max(max(centro_pies(c), c.width - centro_pies(c)) for c in quemada)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(c.height for c in quemada) + MARGEN
    chico = (round(ancho * escala_q), round(alto * escala_q))
    hoja = Image.new('RGBA', (chico[0] * len(quemada), chico[1] * len(POLLERAS)))
    for i, c in enumerate(quemada):
        celda = Image.new('RGBA', (ancho, alto))
        celda.paste(c, (round(ancho / 2 - centro_pies(c)), alto - c.height), c)
        mascara = mascara_pollera_suelta(celda)
        for fila, (_, tono) in enumerate(POLLERAS):
            hoja.paste(a_pixel_art(tenir(celda, mascara, tono), chico), (i * chico[0], fila * chico[1]))
    hoja.save(CARPETA + 'cholita_quemada_sheet.png')
    datos['quemada'] = {'ancho': chico[0], 'alto': chico[1], 'cuadros': len(quemada)}
    with open(CARPETA + 'cholita_cuadros.json', 'w') as f:
        json.dump(datos, f)
    print(f'cholita_quemada_sheet.png: {len(quemada)} cuadros de {chico[0]}x{chico[1]}')


if __name__ == '__main__':
    main()
