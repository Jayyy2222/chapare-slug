"""Hojas de la cinemática de la huida del jefe (src/EscapeCutscene.js) a
partir de las láminas sobre magenta de assets/jefes/animacion/:
  huida.jpeg        8: de rodillas asustado, manos arriba, corre mirando atrás
  helicoptero.jpeg  4 (2 filas de 2): el helicóptero de lujo (mira a la
                    izquierda), con la puerta abierta y la alfombra roja. Los 4
                    son dibujos distintos (cambian el largo y las ventanas):
                    animados, el helicóptero temblaba. El juego usa el 0 y
                    dibuja encima el giro de los rotores (ROTOR).
  sube.jpeg         6: trepa con la wiphala en la espalda
  burla.jpeg        6: se ríe señalando, saluda, se frota las manos, se baja
                    el párpado, saca la lengua, señala con la lengua afuera
  jefefinal.jpeg    8: la cabeza del Coronel Buitre: asoma (borde recto a la
                    izquierda: sale de detrás del marco), sonríe, se ríe a
                    carcajadas, se esconde

Guarda en assets/jefes/animacion/escape/ las hojas (celdas iguales; los de
cuerpo entero apoyados abajo y centrados en los pies) y escape.json con las
celdas y, del helicóptero, el ancla (centro y borde de arriba de la
alfombra) y la puerta respecto del ancla, a la escala de la hoja.

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/escape_cutscene.py
"""
import json
from pathlib import Path

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, por_manchas, quitar_fondo, sin_tinte_magenta

CARPETA = Path('assets/jefes/animacion')
SALIDA = CARPETA / 'escape'
# Escalas (del jpeg a px de pantalla). El jefe normal mide ~140 px en el juego.
ESCALAS = {'huida': 0.36, 'sube': 0.36, 'burla': 0.24, 'coronel': 0.17, 'helicoptero': 0.85}
SUBE = [(6, 263), (303, 562), (602, 863), (901, 1188), (1198, 1489), (1499, 1758)]
BURLA = [(14, 296), (322, 636), (653, 902), (926, 1194), (1216, 1486), (1510, 1782)]
CORONEL = [(45, 108), (236, 400), (458, 632), (680, 875), (897, 1107), (1123, 1326), (1344, 1562), (1597, 1722)]
HELI = [(26, 747, 10, 295), (783, 1565, 10, 295), (46, 755, 370, 646), (839, 1567, 370, 646)]
# Puerta del helicóptero respecto del centro y el borde de arriba de la
# alfombra, en px del jpeg (medida en el cuadro 0): x, y, ancho, alto.
PUERTA = (-48, -97, 72, 95)
# Ventanilla del copiloto (detrás del parabrisas), igual: ahí asoma el Coronel.
VENTANILLA = (-104, -88, 40, 54)
# Rotor principal (el eje) y de cola, respecto del ancla, en px del jpeg
# (cuadro 0) y el largo de las aspas: el juego dibuja encima el giro.
ROTOR = {'principal': (-6, -192, 430), 'cola': (388, -127, 46)}


def lamina(nombre):
    return sin_tinte_magenta(quitar_fondo(Image.open(CARPETA / f'{nombre}.jpeg')))


def recortar(img):
    caja = img.getbbox()
    return img.crop(caja) if caja else img


def achicar(img, escala, colores=56):
    return a_pixel_art(img, (max(1, round(img.width * escala)), max(1, round(img.height * escala))), colores)


def celdas(cuadros, anclas, abajo=None):
    """Celdas iguales: cada cuadro con su ancla x en el centro. abajo: lista de
    y del ancla (por defecto, apoyados abajo)."""
    if abajo is None:
        medio = round(max(max(a, c.width - a) for c, a in zip(cuadros, anclas))) + 2
        alto = max(c.height for c in cuadros) + 2
        hoja = Image.new('RGBA', (medio * 2 * len(cuadros), alto))
        for i, (c, a) in enumerate(zip(cuadros, anclas)):
            hoja.alpha_composite(c, (i * medio * 2 + round(medio - a), alto - c.height - 1))
        return hoja, {'ancho': medio * 2, 'alto': alto, 'cuadros': len(cuadros)}
    medio = round(max(max(a, c.width - a) for c, a in zip(cuadros, anclas))) + 2
    arriba = round(max(abajo)) + 2
    bajo = round(max(c.height - y for c, y in zip(cuadros, abajo))) + 2
    hoja = Image.new('RGBA', (medio * 2 * len(cuadros), arriba + bajo))
    for i, (c, a, y) in enumerate(zip(cuadros, anclas, abajo)):
        hoja.alpha_composite(c, (i * medio * 2 + round(medio - a), round(arriba - y)))
    return hoja, {'ancho': medio * 2, 'alto': arriba + bajo, 'cuadros': len(cuadros), 'ancla': [medio, arriba]}


def alfombra(img):
    """Centro x y borde de arriba de lo rojo de la mitad de abajo."""
    px = img.load()
    w, h = img.size
    rojos = [(x, y) for y in range(int(h * 0.6), h) for x in range(w)
             if px[x, y][3] and px[x, y][0] > 150 and px[x, y][1] < 70 and px[x, y][2] < 80]
    xs = [x for x, _ in rojos]
    return (min(xs) + max(xs)) / 2, min(y for _, y in rojos)


def main():
    SALIDA.mkdir(exist_ok=True)
    datos = {}

    # El jefe corriendo y trepando: apoyados abajo, centrados en los pies.
    huida = [achicar(c, ESCALAS['huida']) for c in por_manchas(lamina('huida'), 15000, lejos=40)]
    hoja, d = celdas(huida, [centro_pies(c, 0.85) for c in huida])
    hoja.save(SALIDA / 'huida.png')
    datos['huida'] = d
    s = lamina('sube')
    sube = [achicar(recortar(s.crop((x0, 0, x1, s.height))), ESCALAS['sube']) for x0, x1 in SUBE]
    # Trepando: centrados en la mano de arriba (la que agarra la escalera) ~ el centro.
    hoja, d = celdas(sube, [c.width / 2 for c in sube])
    hoja.save(SALIDA / 'sube.png')
    datos['sube'] = d

    # Bustos de la burla y cabeza del Coronel: apoyados abajo, centrados.
    b = lamina('burla')
    burla = [achicar(recortar(b.crop((x0, 0, x1, b.height))), ESCALAS['burla']) for x0, x1 in BURLA]
    hoja, d = celdas(burla, [c.width / 2 for c in burla])
    hoja.save(SALIDA / 'burla.png')
    datos['burla'] = d
    j = lamina('jefefinal')
    # La cabeza asoma desde la izquierda: todos con el borde izquierdo recto en x 0.
    coronel = [achicar(recortar(j.crop((x0, 0, x1, j.height))), ESCALAS['coronel']) for x0, x1 in CORONEL]
    ancho = max(c.width for c in coronel) + 2
    alto = max(c.height for c in coronel) + 2
    hoja = Image.new('RGBA', (ancho * len(coronel), alto))
    for i, c in enumerate(coronel):
        hoja.alpha_composite(c, (i * ancho, alto - c.height - 1))
    hoja.save(SALIDA / 'coronel.png')
    datos['coronel'] = {'ancho': ancho, 'alto': alto, 'cuadros': len(coronel)}

    # Helicóptero: los 4 cuadros alineados por la alfombra.
    h = lamina('helicoptero')
    e = ESCALAS['helicoptero']
    helis, anclas_x, anclas_y = [], [], []
    for x0, x1, y0, y1 in HELI:
        grande = h.crop((x0, y0, x1, y1))
        ax, ay = alfombra(grande)  # en el recorte grande (achicado, el rojo cambia)
        helis.append(achicar(grande, e, 64))
        anclas_x.append(ax * e)
        anclas_y.append(ay * e)
    hoja, d = celdas(helis, anclas_x, anclas_y)
    hoja.save(SALIDA / 'helicoptero.png')
    d['puerta'] = [round(v * e) for v in PUERTA]
    d['ventanilla'] = [round(v * e) for v in VENTANILLA]
    d['rotor'] = {k: [round(v * e) for v in r] for k, r in ROTOR.items()}
    datos['helicoptero'] = d
    datos['escalas'] = ESCALAS

    (SALIDA / 'escape.json').write_text(json.dumps(datos, indent=1))
    print(json.dumps(datos))


if __name__ == '__main__':
    main()
