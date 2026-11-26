"""Hojas de la entrada en lancha de Tuto (src/IntroLevel.js) a partir de las
láminas sobre magenta de assets/personajes/jugador/tuto/:
  fondo1.jpeg      el cielo (se usa tal cual)
  fondo2.jpeg      4 franjas: cerros, selva lejana, orilla cercana (choza y
                   muelle), juncos del primer plano
  fondo3.jpeg      agua lejana; agua cercana (4 cuadros); espuma del motor (4)
                   y salpicadura de la proa (4); destellos, un tronco y lirios
  lancha.jpeg      6 lanchas (2 filas de 3): se usan las 4 con motor y bandera
  animacion1.jpeg  "boat_ride": Tuto parado en la proa, el viento en el pelo (6)
  animacion2.jpeg  "boat_jump": se agacha en la proa, salta, se encoge, baja,
                   cae con barro y señala (6)

Guarda en assets/personajes/jugador/tuto/lancha/ (todo a px de pantalla):
  cerros.png, selva.png, orilla.png, juncos.png, agua_lejana.png
                   franjas repetibles de costado (las puntas fundidas)
  agua_cercana.png los 4 cuadros uno al lado del otro
  lancha.png, boat_ride.png, boat_jump.png, espuma.png, salpicadura.png
                   cuadros en celdas iguales, apoyados abajo
  destello_<i>.png, tronco.png, lirios.png
  lancha.json      celdas, escalas y puntos (proa, motor, pies en la lancha)

La lancha mira a la derecha (en la lámina va al revés): la proa a la
derecha, el motor atrás. El cuadro 0 del salto traía un pedazo de la proa:
se borra (se ve la lancha de verdad).

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/tuto_lancha.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

from cielo_cinematica import fundir
from recorte_sprites import a_pixel_art, centro_pies, quitar_fondo, sin_tinte_magenta

CARPETA = Path('assets/personajes/jugador/tuto')
SALIDA = CARPETA / 'lancha'
ALTO_TUTO = 128            # px de pantalla de pie (como sus otras hojas)
ALTO_RIDE = 552            # alto de Tuto de pie en animacion1.jpeg
ALTO_JUMP = 366            # alto de la pose final en animacion2.jpeg
CASCO_JUMP = 100           # grosor del casco en animacion2 (cuadro 0)
CASCO_LANCHA = 62          # grosor del casco en lancha.jpeg
COSTURA = 120
# Cerros y selva lejana traen su cielo pintado arriba: se funde con fondo1
# (fracción de arriba que pasa de transparente a opaco). La orilla y los
# juncos tienen huecos transparentes: sin fundir las puntas (quedaba un
# fantasma oscuro), se repiten tal cual.
FUNDIR_ARRIBA = {'cerros': 0.4, 'selva': 0.45, 'orilla': 0.35}
SIN_COSTURA = ['cerros', 'selva']

# Franjas (y0, y1) de cada lámina.
FONDO2 = {'cerros': (3, 220), 'selva': (227, 444), 'orilla': (452, 670), 'juncos': (680, 896)}
AGUA_LEJANA = (80, 220)    # sin el horizonte con cerros de arriba (ya están los de fondo2)
AGUA_CERCANA = [(229, 330), (340, 441), (451, 552), (562, 663)]
ESPUMA = [(29, 149), (165, 293), (307, 437), (450, 581)]
SALPICADURA = [(626, 749), (771, 890), (909, 1029), (1051, 1177)]
FILA_EFECTOS = (672, 782)
DESTELLOS = [(60, 262), (330, 420), (460, 570), (620, 700)]
TRONCO, LIRIOS = (779, 969), (994, 1142)
FILA_FLOTANTES = (785, 890)
# Lanchas: (fila y0, y1, x0, x1); las 4 con motor y bandera (la bandera flamea).
LANCHAS = [(180, 312, 29, 505), (180, 312, 575, 1033), (355, 492, 23, 513), (355, 492, 1071, 1562)]
RIDE = [(19, 239), (315, 573), (653, 872), (923, 1180), (1252, 1473), (1551, 1772)]
JUMP = [(0, 266), (308, 580), (621, 774), (816, 1028), (1047, 1266), (1319, 1551)]
# Cuadro 0 del salto: desde esta fila empieza la proa (se deja solo lo oscuro: los zapatos).
PROA_JUMP = 466


def lamina(nombre):
    return sin_tinte_magenta(quitar_fondo(Image.open(CARPETA / nombre)))


def recortar(img):
    caja = img.getbbox()
    return img.crop(caja) if caja else img


def sin_costura(img):
    w, h = img.size
    salida = img.crop((0, 0, w - COSTURA, h))
    for x in range(COSTURA):
        t = x / COSTURA
        fin = img.crop((w - COSTURA + x, 0, w - COSTURA + x + 1, h))
        ini = img.crop((x, 0, x + 1, h))
        salida.paste(Image.blend(fin, ini, t), (x, 0))
    return salida


def achicar(img, escala, colores=48):
    return a_pixel_art(img, (max(1, round(img.width * escala)), max(1, round(img.height * escala))), colores)


def celdas(cuadros, anclas=None):
    """Celdas iguales, cada cuadro con su ancla (x) en el centro y apoyado abajo."""
    anclas = anclas or [centro_pies(c, 0.9) for c in cuadros]
    medio = round(max(max(a, c.width - a) for c, a in zip(cuadros, anclas))) + 2
    ancho, alto = medio * 2, max(c.height for c in cuadros) + 2
    hoja = Image.new('RGBA', (ancho * len(cuadros), alto))
    for i, (c, a) in enumerate(zip(cuadros, anclas)):
        hoja.alpha_composite(c, (i * ancho + round(medio - a), alto - c.height - 1))
    return hoja, {'ancho': ancho, 'alto': alto, 'cuadros': len(cuadros)}


def main():
    SALIDA.mkdir(exist_ok=True)
    datos = {}

    # Franjas de fondo2 y el agua lejana, repetibles de costado.
    f2 = lamina('fondo2.jpeg')
    for nombre, (y0, y1) in FONDO2.items():
        franja = f2.crop((0, y0, f2.width, y1))
        caja = franja.getbbox()
        franja = franja.crop((0, caja[1], f2.width, caja[3]))
        if nombre in SIN_COSTURA:
            franja = sin_costura(franja)
        if nombre in FUNDIR_ARRIBA:
            franja = fundir(franja, FUNDIR_ARRIBA[nombre])
        franja.save(SALIDA / f'{nombre}.png')
        datos[nombre] = list(franja.size)
    f3 = lamina('fondo3.jpeg')
    # Opaca (fundida dejaba ver el cielo): en la llegada se desvanece con las
    # otras capas del viaje (IntroLevel.fundirIntroLancha).
    lejana = sin_costura(f3.crop((0, AGUA_LEJANA[0], f3.width, AGUA_LEJANA[1])))
    lejana.save(SALIDA / 'agua_lejana.png')
    datos['agua_lejana'] = list(lejana.size)
    olas = [sin_costura(f3.crop((0, y0, f3.width, y1))) for y0, y1 in AGUA_CERCANA]
    w, h = olas[0].size
    hoja = Image.new('RGBA', (w * len(olas), h))
    for i, o in enumerate(olas):
        hoja.paste(o, (i * w, 0))
    hoja.save(SALIDA / 'agua_cercana.png')
    datos['agua_cercana'] = {'ancho': w, 'alto': h, 'cuadros': len(olas)}

    # Tuto: misma altura de pie que en el juego.
    a1, a2 = lamina('animacion1.jpeg'), lamina('animacion2.jpeg')
    e_ride, e_jump = ALTO_TUTO / ALTO_RIDE, ALTO_TUTO / ALTO_JUMP
    ride = [achicar(recortar(a1.crop((x0, 0, x1, a1.height))), e_ride) for x0, x1 in RIDE]
    hoja, d = celdas(ride)
    hoja.save(SALIDA / 'boat_ride.png')
    datos['boat_ride'] = d
    saltos = []
    for i, (x0, x1) in enumerate(JUMP):
        c = a2.crop((x0, 0, x1, a2.height))
        if i == 0:
            px = c.load()
            for y in range(PROA_JUMP, c.height):
                for x in range(c.width):
                    r, g, b, a = px[x, y]
                    if a and (y > PROA_JUMP + 20 or max(r, g, b) > 70):
                        px[x, y] = (0, 0, 0, 0)
        saltos.append(achicar(recortar(c), e_jump))
    hoja, d = celdas(saltos)
    hoja.save(SALIDA / 'boat_jump.png')
    datos['boat_jump'] = d

    # La lancha: el casco del mismo grosor que la proa del cuadro 0 del salto.
    e_lancha = CASCO_JUMP * e_jump / CASCO_LANCHA
    lamina_lancha = lamina('lancha.jpeg')
    lanchas = []
    for y0, y1, x0, x1 in LANCHAS:
        l = recortar(lamina_lancha.crop((x0, y0, x1, y1)))
        lanchas.append(achicar(ImageOps.mirror(l), e_lancha, 64))
    # Todas del ancho del casco, centradas en el medio.
    hoja, d = celdas(lanchas, [c.width / 2 for c in lanchas])
    hoja.save(SALIDA / 'lancha.png')
    datos['lancha'] = d
    datos['escalas'] = {'ride': e_ride, 'jump': e_jump, 'lancha': e_lancha}

    # Efectos.
    fila = f3.crop((0, FILA_EFECTOS[0], f3.width, FILA_EFECTOS[1]))
    for nombre, tramos in (('espuma', ESPUMA), ('salpicadura', SALPICADURA)):
        cuadros = [achicar(recortar(fila.crop((x0, 0, x1, fila.height))), 0.6) for x0, x1 in tramos]
        hoja, d = celdas(cuadros, [c.width / 2 for c in cuadros])
        hoja.save(SALIDA / f'{nombre}.png')
        datos[nombre] = d
    fila = f3.crop((0, FILA_FLOTANTES[0], f3.width, FILA_FLOTANTES[1]))
    for i, (x0, x1) in enumerate(DESTELLOS):
        achicar(recortar(fila.crop((x0, 0, x1, fila.height))), 0.6).save(SALIDA / f'destello_{i}.png')
    datos['destellos'] = len(DESTELLOS)
    for nombre, (x0, x1) in (('tronco', TRONCO), ('lirios', LIRIOS)):
        achicar(recortar(fila.crop((x0, 0, x1, fila.height))), 0.6).save(SALIDA / f'{nombre}.png')

    (SALIDA / 'lancha.json').write_text(json.dumps(datos, indent=1))
    print(json.dumps(datos))


if __name__ == '__main__':
    main()
