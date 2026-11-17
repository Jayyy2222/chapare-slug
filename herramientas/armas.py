"""Sprites de las armas que se recogen y de la caja que las trae.

Lee de assets/armas/proyectiles/ (sobre fondo magenta):
  ak47.jpeg   la AK-47
  cajas.jpeg  la caja de armas, en 4 filas separadas por líneas:
              quieta (3, con un brillo), golpeada (3, cada vez más rota),
              rompiéndose (6) y los restos sueltos (7: tabla, astilla,
              aguayo, aguayo, banana, hoja, soga)
  armas_varias.jpeg (en assets/armas/) las demás armas (ver VARIAS)
  pistola.webp (en assets/armas/) la pistola, sobre fondo gris claro (se
              recorta arriba de la marca de agua y se le saca el fondo)
y guarda en assets/armas/:
  ak47.png         la AK-47 y cada una de VARIAS (<arma>.png) a resolución de
  <arma>.png       pantalla: su ancho en px de arte x ESCALA (en el juego van
                   a escala 1: el doble de detalle que el pixel art a x2)
  iconos/<arma>.png  la misma arma grande (ANCHO_ICONO px), con todo el
                   detalle del dibujo, para la rueda del selector (TAB)
  (caja_armas.png: herramientas/caja_armas.py)
  caja_restos.png  los 7 restos (CELDA_RESTO), para las partículas

Todo va a la misma escala: la caja mide ANCHO_CAJA px de arte (la caja chica
del nivel mide 38). En cada celda la caja se apoya abajo y va centrada por
su base.

Uso (desde la raíz del proyecto):  python3 herramientas/armas.py
"""
from PIL import Image

from pathlib import Path

from recorte_sprites import a_pixel_art, centro_pies, quitar_fondo, sin_tinte_magenta

# Anchos a escala real: Manfred mide 62 px de arte y 1,75 m (35 px por metro).
ANCHO_ARMA = 31   # AK-47: 0,88 m
ESCALA = 2        # la del juego: las armas se guardan a px de pantalla
TAMANO = 1.0      # las largas a tamaño real (Armas.js: TAMANO_ARMAS)
TAMANO_PISTOLA = 0.8  # la pistola, más chica (ARMAS.pistola.tamano)
ANCHO_ICONO = 112 # px de los íconos del selector
ANCHO_CAJA = 40
CELDA_CAJA = (64, 52)
CELDA_RESTO = 28
# Filas de cajas.jpeg: (arriba, abajo) y los tramos en x de cada cuadro.
FILAS_CAJA = [
    ((0, 184), [(0, 220), (220, 430), (430, 640)]),
    ((191, 381), [(0, 230), (230, 470), (470, 700)]),
    ((387, 597), [(0, 221), (221, 492), (492, 745), (745, 965), (965, 1195), (1195, 1408)]),
]
FILA_RESTOS = (603, 768)
# Armas de armas_varias.jpeg: nombre, caja en la imagen y ancho en px de arte
# (a escala real, ver ANCHO_ARMA).
# (El segundo lanzacohetes, el caño corto y los cuchillos no se usan.)
VARIAS = [
    ('ametralladora', (34, 24, 635, 216), 42),   # 1,19 m (PKM)
    ('escopeta', (36, 244, 604, 368), 35),        # 1,0 m
    ('lanzacohetes', (36, 371, 686, 533), 46),    # 1,3 m (RPG-7 con el cohete)
    ('lanzagranadas', (729, 200, 1247, 407), 28), # 0,8 m
    ('lanzallamas', (938, 449, 1212, 582), 19),   # 0,55 m
    ('machete', (35, 639, 533, 703), 21),         # 0,6 m
]



def achicar(img, ancho, colores=None):
    """A `ancho` px, con buen filtro y bordes nítidos (alfa 0 o 255)."""
    alto = max(1, round(img.height * ancho / img.width))
    if colores:
        return a_pixel_art(img, (ancho, alto), colores)
    chica = img.resize((ancho, alto), Image.LANCZOS)
    chica.putalpha(chica.getchannel('A').point(lambda a: 255 if a > 110 else 0))
    return chica


def sin_fondo_claro(img, recorte):
    """Saca el fondo gris claro (y blanco) rellenando desde los bordes: lo
    claro de adentro del dibujo (brillos) no se toca."""
    img = img.convert('RGB').crop(recorte)
    w, h = img.size
    px = img.load()
    claro = lambda p: min(p) > 165 and max(p) - min(p) < 30
    fondo = set()
    pila = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while pila:
        x, y = pila.pop()
        if (x, y) in fondo or not (0 <= x < w and 0 <= y < h) or not claro(px[x, y]):
            continue
        fondo.add((x, y))
        pila += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    # El fondo encerrado (el hueco del guardamonte) también: es más claro que
    # cualquier gris del dibujo.
    fondo |= {(x, y) for x in range(w) for y in range(h) if min(px[x, y]) > 182 and max(px[x, y]) - min(px[x, y]) < 20}
    salida = img.convert('RGBA')
    for x, y in fondo:
        salida.putpixel((x, y), (0, 0, 0, 0))
    return salida.crop(salida.getbbox())


def guardar_arma(nombre, img, ancho_arte):
    """La del juego (a px de pantalla) y el ícono grande del selector."""
    ancho = round(ancho_arte * ESCALA * (TAMANO_PISTOLA if nombre == 'pistola' else TAMANO))
    achicar(img, ancho, colores=64).save(f'assets/armas/{nombre}.png')
    achicar(img, ANCHO_ICONO).save(f'assets/armas/iconos/{nombre}.png')
    print(f'{nombre}.png ({ancho} px) e iconos/{nombre}.png ({ANCHO_ICONO} px)')


def main():
    Path('assets/armas/iconos').mkdir(exist_ok=True)
    arma = quitar_fondo(Image.open('assets/armas/proyectiles/ak47.jpeg'))
    guardar_arma('ak47', arma.crop(arma.getbbox()), ANCHO_ARMA)

    # La pistola (0,2 m; un poco más grande para que se vea en la mano).
    guardar_arma('pistola', sin_fondo_claro(Image.open('assets/armas/pistola.webp'), (0, 0, 260, 240)), 15)

    varias = sin_tinte_magenta(quitar_fondo(Image.open('assets/armas/armas_varias.jpeg')))
    for nombre, caja, ancho in VARIAS:
        a = varias.crop(caja)
        guardar_arma(nombre, a.crop(a.getbbox()), ancho)

    hoja = quitar_fondo(Image.open('assets/armas/proyectiles/cajas.jpeg'))
    (y0, y1), tramos = FILAS_CAJA[0]
    primera = hoja.crop((tramos[0][0], y0, tramos[0][1], y1))
    escala = ANCHO_CAJA / primera.crop(primera.getbbox()).width

    cw, ch = CELDA_CAJA
    cuadros = []
    for (y0, y1), tramos in FILAS_CAJA:
        fila = hoja.crop((0, y0, hoja.width, y1))
        base = fila.crop((tramos[0][0], 0, tramos[0][1], fila.height)).getbbox()[3]  # el piso de la fila
        for x0, x1 in tramos:
            c = fila.crop((x0, 0, x1, base))
            caja = c.getbbox()
            c = c.crop((caja[0], caja[1], caja[2], base))
            grande = Image.new('RGBA', (round(cw / escala), round(ch / escala)))
            x = round(grande.width / 2 - centro_pies(c, 0.75))
            grande.paste(c, (x, grande.height - round(2 / escala) - c.height), c)
            cuadros.append(a_pixel_art(grande, CELDA_CAJA))
    salida = Image.new('RGBA', (cw * len(cuadros), ch))
    for i, c in enumerate(cuadros):
        salida.paste(c, (i * cw, 0))
    # (caja_armas.png la genera ahora herramientas/caja_armas.py con el dibujo nuevo)

    # Restos: cada mancha de la última fila, centrada en su celda.
    fila = hoja.crop((0, FILA_RESTOS[0], hoja.width, FILA_RESTOS[1]))
    alfa = fila.getchannel('A').load()
    columnas = [any(alfa[x, y] for y in range(fila.height)) for x in range(fila.width)]
    restos, inicio = [], None
    for x, llena in enumerate(columnas + [False]):
        if llena and inicio is None:
            inicio = x
        if not llena and inicio is not None:
            r = fila.crop((inicio, 0, x, fila.height))
            restos.append(r.crop(r.getbbox()))
            inicio = None
    salida = Image.new('RGBA', (CELDA_RESTO * len(restos), CELDA_RESTO))
    for i, r in enumerate(restos):
        chico = a_pixel_art(r, (max(1, round(r.width * escala)), max(1, round(r.height * escala))))
        salida.paste(chico, (i * CELDA_RESTO + (CELDA_RESTO - chico.width) // 2, (CELDA_RESTO - chico.height) // 2))
    salida.save('assets/armas/caja_restos.png')
    print(f'ak47.png, caja_restos.png ({len(restos)} de {CELDA_RESTO})')


if __name__ == '__main__':
    main()
