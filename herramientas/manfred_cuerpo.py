"""Manfred armado con piernas + torso, como Tuto (CuerpoModular.js), a partir de
assets/personajes/jugador/manfred/*.jpeg (sobre magenta, mirando a la derecha):
  manfred_apuntando.jpeg             4 (2 filas): torso apuntando (marca celeste = mano)
  manfred_disparo_arriba.jpeg        4: torso disparando hacia arriba
  manfred_diagonal.jpeg              4: torso disparando en diagonal (45°)
  manfred_walk.jpeg                 12 (2 filas): piernas corriendo
  manfred_salto.jpeg                 6: impulso, sube, cima, cae, aterriza, parado
  manfred_agachado.jpeg              3: de parado a agachado
  manfred_agachado_caminando .jpeg   7 (2 filas): caminando agachado
  manfred_idle.jpeg                  6: cuerpo entero, quieto
  manfred_muerto.jpeg               10 (2 filas): cuerpo entero, del susto al suelo
  manfred_trepa.jpeg                 6: cuerpo entero, de espaldas, trepando
Usa las funciones de tuto_spritesheet.py (cambia su carpeta, prefijo y hojas).

Proporciones (ver TORSO y CINTURA): de la cabeza a la hebilla 65 px y de la
hebilla a la suela CINTURA (58: con 65 las piernas se veían muy largas, con
55 muy cortas y anchas). Cada hoja de piernas se lleva a ese largo y `ancho` deja el cinturón de
CINTURON px, el del torso (que tapa el de las piernas). El idle se dibujó con
las piernas cortas: se estiran hasta ese largo (ESTIRAR) y arriba va con la
cabeza del tamaño de la del torso.
Los torsos de arriba y diagonal no muestran el cinturón (el saco lo tapa): van
a la escala del de apuntar (los hombros miden lo mismo, ~300 px; la medalla
está dibujada más grande) y la cintura se pone donde estaría la hebilla: 13 px
debajo de la medalla y un poco detrás de su centro (ver HEBILLAS).

Guarda en assets/personajes/jugador/manfred/:
  manfred_<hoja>.png  una fila de celdas iguales por hoja
  anchors.json        lo mismo que el de Tuto (ver tuto_spritesheet.py)

Uso (desde herramientas/):  python3 manfred_cuerpo.py
"""
import json
from pathlib import Path

from PIL import Image

import manfred_cabeza
import tuto_spritesheet as t

CARPETA = Path('../assets/personajes/jugador/manfred')
# El torso mide 65 px de la cabeza a la hebilla (469 px en el jpeg) y las
# piernas de parado CINTURA de la hebilla a la suela. El idle tiene las
# piernas más cortas: se estiran (ESTIRAR).
TORSO = 65 / 469           # escala del torso
CINTURA = 58               # de la hebilla a la suela, de parado
ALTO = 65 + CINTURA        # px de pantalla de la figura entera
CINTURON = 36
# Idle: la cintura está en y 455 del jpeg (la cabeza empieza en 138, los pies
# en 672). Arriba con la cabeza del ancho de la del torso; abajo estirado
# hasta CINTURA.
E = (ALTO - CINTURA) / (455 - 138)
ESTIRAR = {'idle': (672 - 455, CINTURA / E / (672 - 455))}


def piernas(largo, cinturon, orden, objetivo=CINTURA):
    """Escala y ancho de una hoja de piernas: `largo` (hebilla a suela) y
    `cinturon` son los px del jpeg en su cuadro de referencia; `objetivo`, lo
    que tiene que medir ese largo en la pantalla."""
    escala = objetivo / largo
    return (escala, 'piernas', orden, CINTURON / (cinturon * escala))


# Medidas de referencia (con t.cuadros): largo de la hebilla a la suela y
# ancho del cinturón en el jpeg.
AGACHADO = CINTURA * 393 / 596  # de rodillas (agachado, cuadro 2) respecto de parado
HOJAS = {
    'torso_aiming': (TORSO, 'torso', 'filas'),
    # Arriba está dibujado más chico que el de apuntar (el saco 35 px contra 39): 12% más.
    'torso_arriba': (TORSO * 1.12, 'torso', 'x'),
    'torso_diagonal': (TORSO, 'torso', 'x'),
    # Parado (cuadro 5): 401; cinturón 184.
    'piernas_salto': piernas(401, 184, 'x'),
    # Pasando el paso: ~290 (un poco menos que parado); cinturón 170.
    'piernas_run': piernas(290, 170, 'filas', CINTURA * 0.95),
    # El cuadro 0 está de pie: 596; cinturón 343.
    'piernas_crouch': piernas(596, 343, 'x'),
    # ~265, del alto del agachado; cinturón 245.
    'piernas_crouch_walk': piernas(265, 245, 'filas', AGACHADO),
    'idle': (E, 'entero', 'x'),
    # La cabeza como la del idle (dibujada 1,65 veces más chica).
    'muerte': (E * 1.65, 'entero', 'suelos'),
    # Con los dos puños arriba (cuadro 3) de la cabeza al pie de abajo mide
    # 493 px; con una rodilla arriba es un poco más bajo que de pie.
    'trepar': (ALTO * 0.92 / 493, 'entero', 'suelos'),
}
FUENTES = {
    'torso_aiming': 'manfred_apuntando', 'torso_arriba': 'manfred_disparo_arriba', 'torso_diagonal': 'manfred_diagonal',
    'piernas_run': 'manfred_walk', 'piernas_salto': 'manfred_salto', 'piernas_crouch': 'manfred_agachado',
    'piernas_crouch_walk': 'manfred_agachado_caminando ', 'idle': 'manfred_idle', 'muerte': 'manfred_muerto',
    'trepar': 'manfred_trepa',
}
# El piso de cada fila (sin franja que borrar: no hay sombra). Trepando, el
# mismo para todos (justo bajo el pie más bajo): el cuerpo no salta de un
# cuadro al otro.
SUELOS = {'muerte': [(336, 336), (672, 672)], 'trepar': [(645, 645)]}
CERCA = {'muerte': 60}   # los anteojos que vuelan, las estrellitas
# En la fila de abajo del torso la hebilla está cortada por el borde del jpeg
# y se detecta más abajo: está a la misma altura que en la de arriba (respecto
# de la cabeza, que es el borde del cuadro).
# Arriba y diagonal: medidas en el cuadro 0 (la medalla termina en y 540 y
# 432 del jpeg, centrada en x 242 y 257) y llevadas a cada cuadro desde el
# borde de abajo (el pie del saco, que no se mueve; lo de arriba son los
# brazos con el retroceso) y el de atrás (la espalda).
ALTOS = {'torso_arriba': [608, 594, 551, 575], 'torso_diagonal': [506, 500, 506, 506]}
# En el torso de apuntar queda un puntito suelto (la marca de agua del jpeg).
LIMPIAR = ['torso_aiming']
# Sin cinturón (se veía doble: el del torso y el de las piernas, sobre todo
# agachado): el torso de apuntar termina en el saco y en las piernas la franja
# del cinturón se pinta con el pantalón que tiene debajo.
SIN_CINTURON_TORSO = ['torso_aiming']
SIN_CINTURON_PIERNAS = ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk']
HEBILLAS = {
    'torso_aiming': {2: (217.5, 467), 3: (214.5, 462)},
    'torso_arriba': {i: (204, h - 83) for i, h in enumerate(ALTOS['torso_arriba'])},
    'torso_diagonal': {i: (230, h - 67) for i, h in enumerate(ALTOS['torso_diagonal'])},
}


def sin_sueltos(ruta, minimo=25):
    """Borra de la hoja las manchas opacas de menos de `minimo` px."""
    img = Image.open(ruta).convert('RGBA')
    px = img.load()
    w, h = img.size
    vistos = set()
    for y0 in range(h):
        for x0 in range(w):
            if not px[x0, y0][3] or (x0, y0) in vistos:
                continue
            pila, mancha = [(x0, y0)], []
            vistos.add((x0, y0))
            while pila:
                x, y = pila.pop()
                mancha.append((x, y))
                for v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= v[0] < w and 0 <= v[1] < h and v not in vistos and px[v][3]:
                        vistos.add(v)
                        pila.append(v)
            if len(mancha) < minimo:
                for p in mancha:
                    px[p] = (0, 0, 0, 0)
    img.save(ruta)


def es_cinturon(r, g, b, a):
    """Cuero oscuro o hebilla gris o clara (sin el azul del pantalón y del saco)."""
    return a > 0 and abs(b - r) < 40 and not b > r + 20


def filas_cinturon(c, ancla_y):
    """Filas (y0, y1) del cinturón alrededor de la cintura: las que tienen
    más de la mitad de cuero."""
    px = c.load()
    filas = []
    for y in range(max(0, ancla_y - 8), min(c.height, ancla_y + 9)):
        opacos = [x for x in range(c.width) if px[x, y][3]]
        if opacos and sum(es_cinturon(*px[x, y]) for x in opacos) > len(opacos) * 0.5:
            filas.append(y)
    return (min(filas), max(filas)) if filas else None


def sin_cinturon(ruta, datos, torso):
    """Saca el cinturón de cada cuadro de la hoja."""
    hoja = Image.open(ruta).convert('RGBA')
    w, h = datos['ancho'], datos['alto']
    ay = datos['ancla'][1]
    for i in range(len(datos['cuadros'])):
        c = hoja.crop((i * w, 0, (i + 1) * w, h))
        px = c.load()
        filas = filas_cinturon(c, ay)
        if not filas:
            continue
        y0, y1 = filas
        if torso:
            # El torso termina en el saco: lo de la cintura para abajo se borra
            # y el borde del saco baja 2 filas (si no, entre el saco y el
            # pantalón quedaba una fila vacía y se veía el fondo).
            for y in range(y0, h):
                for x in range(w):
                    px[x, y] = (0, 0, 0, 0)
            for y in range(y0, min(h, y0 + 2)):
                for x in range(w):
                    px[x, y] = px[x, y0 - 1]
        else:
            # Piernas: de arriba hasta el fin del cinturón, el color del
            # pantalón de esa columna (el primero que no es cuero debajo).
            # La hebilla baja un poco más que el cuero: hasta 3 filas más.
            for x in range(w):
                abajo = next((px[x, y] for y in range(y1 + 1, min(h, y1 + 10))
                              if px[x, y][3] and not es_cinturon(*px[x, y])), None)
                for y in range(0, min(h, y1 + 4)):
                    if px[x, y][3] and (y <= y1 or es_cinturon(*px[x, y]) and max(px[x, y][:3]) > 110):
                        px[x, y] = abajo or (34, 42, 84, 255)
        hoja.paste(c, (i * w, 0))
    hoja.save(ruta)


def main():
    t.CARPETA = CARPETA
    t.PREFIJO = 'manfred_'
    t.FUENTES = FUENTES
    t.SUELOS = SUELOS
    t.ESPEJAR = {}
    t.CERCA = CERCA
    t.HEBILLAS = HEBILLAS
    t.ESTIRAR = ESTIRAR
    print(f'torso {TORSO:.4f}, piernas de parado {CINTURA} px')
    anclas = {nombre: t.hoja(nombre, *datos) for nombre, datos in HOJAS.items()}
    for nombre in LIMPIAR:
        sin_sueltos(CARPETA / f'manfred_{nombre}.png')
    for nombre in SIN_CINTURON_TORSO + SIN_CINTURON_PIERNAS:
        sin_cinturon(CARPETA / f'manfred_{nombre}.png', anclas[nombre], nombre in SIN_CINTURON_TORSO)
    (CARPETA / 'anchors.json').write_text(json.dumps(anclas, indent=1))
    manfred_cabeza.main()  # la cabeza más grande (sobre las hojas recién hechas)


if __name__ == '__main__':
    main()
