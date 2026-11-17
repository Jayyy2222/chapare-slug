"""Convierte las tiras de Manfred (segundo jugador) en el spritesheet del juego.

Lee de assets/personajes/jugador/manfred/ (vistas sueltas sobre fondo
magenta, con una sombra pintada bajo los pies; ver TIRAS) y guarda
  manfred_sheet.png         todos los cuadros en una fila de celdas de 84x84
  manfred_sheet_calido.png  el mismo con los colores del nivel (calentar() de
                            calidez_chapare.py): es el que usa Nivel1
El giro de la pantalla de selección lo hace manfred_seleccion.py.

Cada tira está dibujada a otro tamaño y con otras proporciones (al caminar
la cabeza es más grande respecto del cuerpo que en el quieto), así que
escalar parejo nunca las iguala. Cada cuadro se escala en dos partes: de la
cabeza para arriba y del cuello para abajo, para que en todas las poses
  - la cabeza (ver cabeza()) tenga el alto y el ancho de la del quieto, y
  - de la cabeza a los pies mida `alto` veces lo que mide el quieto (1 de pie,
    RODILLAS de rodillas...), medido en su cuadro `referencia`.
A lo ancho el cuerpo va con la misma escala que la cabeza. Las tiras de
DE_ESPALDAS (solo se ve el pelo) se escalan parejo por el alto.

En la celda los pies quedan donde los tiene el soldado (x 38, y 72), así
Nivel1 usa la misma caja de colisión para todos los cuadros. En x se alinea
por los pies o, donde las piernas se abren (correr, saltar, trepar), por la
cabeza. En el aire también van con los pies en PIES: la altura la da la física.

Uso (desde la raíz del proyecto):  python3 herramientas/manfred_spritesheet.py
"""
from collections import deque

from PIL import Image

from calidez_chapare import SATURACION_JUGADOR, calentar
from recorte_sprites import a_pixel_art, centro_cabeza, centro_pies, componentes, por_manchas, quitar_fondo

CARPETA = 'assets/personajes/jugador/manfred/'
SALIDA = 'assets/personajes/jugador/'
# nombre, archivo, cuadros, filas, escala, alineación en x y, si no van todos,
# cuáles cuadros van a la hoja. El orden es el de la hoja:
# CUADROS_JUGADOR.jugadorManfred en Jugador.js.
# Quieto: la vista de perfil del giro de selección (la 8), con el arma abajo.
# La de manfred_agachado está dibujada más delgada y de piernas largas que
# caminar; esta tiene el mismo cuerpo. Después siguen los 3 de agacharse.
RODILLAS = 0.74       # alto de rodillas / alto de pie
#  nombre, archivo, cuadros, filas, (referencia, alto), alineación, [cuadros que van]
TIRAS = [
    ('quieto', 'selec_manfred.jpeg', 12, 2, (8, 1.0), 'pies', [8]),
    ('agacharse', 'manfred_agachado.jpeg', 4, 1, (3, RODILLAS), 'pies', [1, 2, 3]),
    ('caminar', 'manfred_camina.jpeg', 12, 2, (0, 0.97), 'pies'),
    ('correr', 'manfred_corre.jpeg', 8, 2, (0, 0.87), 'cabeza'),
    # Su cuadro 0 es el impulso, medio agachado.
    ('saltar', 'manfred_salto.jpeg', 6, 1, (0, 0.84), 'cabeza'),
    ('ataque', 'manfred_disparo.jpeg', 4, 1, (0, 1.0), 'pies'),
    ('ataque_arriba', 'manfred_disparo_arriba.jpeg', 4, 1, (0, 1.0), 'pies'),
    ('agachado_ataque', 'manfred_agachado_ataque.jpeg', 4, 2, (0, RODILLAS), 'pies'),
    ('agachado_caminar', 'manfred_agachado_camina.png', 6, 1, (0, RODILLAS), 'pies'),
    ('trepar', 'manfred_escala.jpeg', 6, 1, (5, 0.96), 'cabeza'),
    # Al recibir un golpe. De frente; el cuadro 5 es de pie.
    ('aturdido', 'manfred _aturdido.png', 6, 1, (5, 1.0), 'pies'),
]
DE_ESPALDAS = {'trepar'}
CELDA = 84
PIES = (38, 72)       # dónde van los pies en la celda (como el soldado)
ALTO_ARTE = 62        # px de Manfred de pie
T = 4                 # px por px de arte al armar cada cuadro (después se achica a la celda)
MINIMO = 3000         # px de una mancha para contar como cuadro
LEJOS = 6             # manchas chicas más lejos que esto: polvo o ruido, se descartan
# Excepto en el aturdido: las estrellas y las líneas del mareo están sueltas
# alrededor de la cabeza.
LEJOS_TIRA = {'manfred _aturdido.png': 45}
# En el salto el arma de cada cuadro toca el cuerpo del siguiente: no se
# separan por manchas. Puntos de cada cuadro en la imagen: cabeza, torso,
# piernas, pies y arma (sin las piernas, el arma del anterior se las lleva).
SEMILLAS_SALTO = [
    [(165, 430), (150, 600), (140, 700), (290, 525)],
    [(390, 290), (380, 430), (360, 530), (320, 660), (410, 570), (500, 380)],
    [(600, 200), (580, 320), (535, 350), (540, 430), (660, 400), (570, 480), (545, 540), (625, 470), (710, 275)],
    [(790, 90), (770, 200), (730, 230), (760, 330), (780, 370), (820, 290), (930, 155)],
    [(990, 280), (970, 400), (1020, 550), (1000, 620), (1120, 335)],
    [(1230, 440), (1200, 600), (1200, 700), (1330, 540)]
]
# El cuadro del fogonazo de 'ataque' trae un halo rosado que no se puede
# separar del fondo: se usa el de apuntar (el juego pone su propio fogonazo).
# El cuadro 1 de agacharse está de pie y con las piernas largas de esa tira:
# con la escala del cuerpo de rodillas queda más alto que el quieto. Se usa el
# medio agachado (la animación es quieto, medio, medio, de rodillas).
REEMPLAZOS = {('ataque', 1): 0, ('agacharse', 1): 2}


def por_semillas(img, semillas):
    """Cuadros que se tocan: cada píxel opaco va al cuadro cuya semilla lo
    alcanza primero recorriendo solo píxeles opacos (todas crecen a la vez).
    Lo que ninguna alcanza (polvo suelto) queda afuera."""
    alfa = img.getchannel('A').load()
    ancho, alto = img.size
    duenio = {}
    cola = deque()
    for i, puntos in enumerate(semillas):
        for x, y in puntos:
            # La semilla más cercana que caiga sobre el dibujo.
            x, y = min(((a, b) for a in range(x - 15, x + 16) for b in range(y - 15, y + 16)
                        if 0 <= a < ancho and 0 <= b < alto and alfa[a, b]),
                       key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)
            duenio[(x, y)] = i
            cola.append((x, y))
    while cola:
        a, b = cola.popleft()
        for c in (a - 1, a, a + 1):
            for d in (b - 1, b, b + 1):
                if 0 <= c < ancho and 0 <= d < alto and alfa[c, d] and (c, d) not in duenio:
                    duenio[(c, d)] = duenio[(a, b)]
                    cola.append((c, d))
    origen = img.load()
    cuadros = [Image.new('RGBA', img.size) for _ in semillas]
    destinos = [c.load() for c in cuadros]
    for (x, y), i in duenio.items():
        destinos[i][x, y] = origen[x, y]
    return [c.crop(c.getbbox()) for c in cuadros]


def cuadros_de(archivo, n, filas):
    hoja = quitar_fondo(Image.open(CARPETA + archivo))
    if archivo == 'manfred_salto.jpeg':
        return por_semillas(hoja, SEMILLAS_SALTO)
    cuadros = por_manchas(hoja, MINIMO, hoja.height // filas, LEJOS_TIRA.get(archivo, LEJOS))
    if len(cuadros) != n:
        raise SystemExit(f'{archivo}: se esperaban {n} cuadros y salieron {len(cuadros)}')
    return cuadros


def cabeza(c):
    """(arriba, alto, ancho) de la cabeza: la mancha más grande de colores
    cálidos (piel y pelo; el traje es gris azulado) que empieza en la mitad
    de arriba. La mano con el arma levantada es más chica."""
    mascara = Image.new('RGBA', c.size)
    origen, destino = c.load(), mascara.load()
    for y in range(c.height):
        for x in range(c.width):
            r, g, b, a = origen[x, y]
            if a and r > b + 25 and r > 50:
                destino[x, y] = (255, 255, 255, 255)
    grandes, _ = componentes(mascara, 50)
    _, (x0, y0, x1, y1), _ = max((m for m in grandes if m[1][1] < c.height / 2), key=lambda m: m[0])
    return y0, y1 - y0, x1 - x0


def mediana(valores):
    valores = sorted(valores)
    return valores[len(valores) // 2]


def normalizar(c, cuello, ex, ey_cabeza, ey_cuerpo):
    """El cuadro escalado a T px por px de arte: ex a lo ancho, ey_cabeza
    hasta la fila `cuello` y ey_cuerpo de ahí para abajo."""
    ancho = max(1, round(c.width * ex * T))
    partes = []
    if cuello > 0:
        partes.append(c.crop((0, 0, c.width, cuello)).resize((ancho, max(1, round(cuello * ey_cabeza * T))), Image.LANCZOS))
    partes.append(c.crop((0, cuello, c.width, c.height))
                  .resize((ancho, max(1, round((c.height - cuello) * ey_cuerpo * T))), Image.LANCZOS))
    resultado = Image.new('RGBA', (ancho, sum(p.height for p in partes)))
    y = 0
    for p in partes:
        resultado.paste(p, (0, y))
        y += p.height
    return resultado


def a_celda(c, alineacion, cabeza_x):
    """El cuadro (ya a T px por px de arte) en una celda de CELDA x CELDA con
    los pies en PIES."""
    lado = CELDA * T
    if alineacion == 'cabeza':
        x = round((PIES[0] + cabeza_x) * T - centro_cabeza(c))
    else:
        x = round(PIES[0] * T - centro_pies(c))
    # Lo que se sale por arriba (la punta del arma, el puño) se corta.
    y = PIES[1] * T - c.height
    if x < 0 or x + c.width > lado:
        print('  ojo: un cuadro no entra entero en la celda')
    celda = Image.new('RGBA', (lado, lado))
    celda.paste(c, (x, y), c)
    return a_pixel_art(celda, (CELDA, CELDA))


def main():
    tiras = {nombre: cuadros_de(archivo, n, filas) for nombre, archivo, n, filas, *_ in TIRAS}
    usados = {t[0]: t[6] if len(t) > 6 else list(range(t[2])) for t in TIRAS}
    hoja = Image.new('RGBA', (CELDA * sum(len(u) for u in usados.values()), CELDA))
    # Dónde queda la cabeza respecto de los pies estando quieto.
    quieto = tiras['quieto'][8]
    cabeza_x = (centro_cabeza(quieto) - centro_pies(quieto)) * ALTO_ARTE / quieto.height
    # La cabeza del quieto (escalado parejo a ALTO_ARTE) es la de todos.
    e = ALTO_ARTE / quieto.height
    arriba_q, alto_q, ancho_q = cabeza(quieto)
    cabeza_alto, cabeza_ancho = alto_q * e, ancho_q * e
    # Del borde de arriba al cuello (lo más alto del pelo no es "cálido").
    corona = (arriba_q + alto_q) * e
    i = 0
    for nombre, archivo, n, filas, (referencia, alto), alineacion, *_ in TIRAS:
        cuadros = tiras[nombre]
        if nombre in DE_ESPALDAS:
            e = ALTO_ARTE * alto / cuadros[referencia].height
            ex = ey_cabeza = ey_cuerpo = e
            cuellos = dict.fromkeys(range(n), 0)
        else:
            fuentes = {REEMPLAZOS.get((nombre, k), k) for k in usados[nombre]}
            medidas = {k: cabeza(cuadros[k]) for k in fuentes | {referencia}}
            alto_c = mediana(m[1] for m in medidas.values())
            ancho_c = mediana(m[2] for m in medidas.values())
            ex, ey_cabeza = cabeza_ancho / ancho_c, cabeza_alto / alto_c
            # El cuello: arriba de la cabeza más su alto (la mediana: en algún
            # cuadro la mano se pega a la cara y agranda la mancha).
            cuellos = {k: min(m[0] + alto_c, cuadros[k].height - 1) for k, m in medidas.items()}
            # De la cabeza a los pies mide ALTO_ARTE * alto. Lo que haya por
            # encima de la cabeza (el arma levantada) va con la escala de la cabeza.
            cuerpo_ref = cuadros[referencia].height - cuellos[referencia]
            ey_cuerpo = (ALTO_ARTE * alto - corona) / cuerpo_ref
        print(f'{nombre}: cuadros {i}-{i + len(usados[nombre]) - 1}  '
              f'(ancho {ex:.3f}, cabeza {ey_cabeza:.3f}, cuerpo {ey_cuerpo:.3f})')
        for k in usados[nombre]:
            fuente = REEMPLAZOS.get((nombre, k), k)
            c = normalizar(cuadros[fuente], cuellos[fuente], ex, ey_cabeza, ey_cuerpo)
            hoja.paste(a_celda(c, alineacion, cabeza_x), (i * CELDA, 0))
            i += 1
    hoja.save(SALIDA + 'manfred_sheet.png')
    calentar(hoja, saturacion=SATURACION_JUGADOR, con_tierra=False).save(SALIDA + 'manfred_sheet_calido.png')
    print(f'manfred_sheet.png: {i} cuadros de {CELDA}x{CELDA}')


if __name__ == '__main__':
    main()
