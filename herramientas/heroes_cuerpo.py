"""Eduardo y Bartolina armados con piernas + torso, como Tuto y Manfred
(CuerpoModular.js), y Juan, el compañero de Eduardo (Companero.js), a partir
de assets/personajes/jugador/eduardo/ y bartolina/ (JPEG sobre magenta,
mirando a la derecha).

Usa las funciones de tuto_spritesheet.py (cambia carpeta, prefijo, hojas).
Las escalas se miden solas en cada hoja para que queden con las proporciones
de los otros héroes: de la cabeza a la cintura TORSO px y de la cintura a la
suela CINTURA px (Manfred: 65 y 58).
  piernas de caminar   la altura de la cintura al pie
  piernas de saltar    la del cuadro de parado (el último)
  agachado y agachado caminando: el ancho de la cintura igual al de caminar
  torso apuntando      la cabeza del mismo ancho que la del idle
  torso arriba         el ancho de la cintura igual al del torso apuntando
  idle                 ALTO de la cabeza a los pies
  muerte               el primer cuadro (de pie, asustado) un poco menos que ALTO
  trepar               de los puños a los pies, un poco más que ALTO
El ancla de piernas y torsos (la cintura) es el medio de la franja de la
cintura de cada cuadro (estas hojas no tienen hebilla gris: la de Tuto).

Guarda en cada carpeta <personaje>_<hoja>.png y anchors.json (el formato de
Tuto) y, para Juan, juan_<hoja>.png y juan.json (celdas y origen: los pies).

Uso (desde herramientas/):  python3 heroes_cuerpo.py
"""
import json
from pathlib import Path

from PIL import Image

import tuto_spritesheet as t
from recorte_sprites import quitar_fondo, sin_tinte_magenta, componentes

RAIZ = Path('../assets/personajes/jugador')
TORSO = 65
CINTURA = 58
ALTO = TORSO + CINTURA

# Por personaje: hoja del juego -> (archivo sin .jpeg, tipo, orden).
HEROES = {
    'eduardo': {
        'piernas_run': ('walk_e', 'piernas', 'x'),
        'piernas_salto': ('salto_e', 'piernas', 'x'),
        'piernas_crouch': ('agachado_e', 'piernas', 'x'),
        'piernas_crouch_walk': ('agachado_camina_e', 'piernas', 'filas'),
        'torso_aiming': ('apunta', 'torso', 'x'),
        'torso_arriba': ('disparo_arriba', 'torso', 'x'),
        'idle': ('idle', 'entero', 'x'),
        'muerte': ('muerte', 'entero', 'suelos'),
        'trepar': ('trepar', 'entero', 'x'),
    },
    'bartolina': {
        'piernas_run': ('walk', 'piernas', 'x'),
        'piernas_salto': ('jump', 'piernas', 'x'),
        'piernas_crouch': ('agacha', 'piernas', 'x'),
        'piernas_crouch_walk': ('agacha_camina', 'piernas', 'filas'),
        'torso_aiming': ('dispara', 'torso', 'x'),
        'torso_arriba': ('apunta arriba', 'torso', 'x'),
        'idle': ('idle', 'entero', 'x'),
        'muerte': ('muerte', 'entero', 'suelos'),
        'trepar': ('trepa', 'entero', 'x'),
    },
}

# Juan: hoja -> (archivo, cuadros esperados). Alto de Juan (un chico con su
# bombo): JUAN_ALTO px de la gorra a los pies, medido en juan_toca.
JUAN = {
    'camina': 'juan_camina', 'toca': 'juan_toca', 'ataca': 'juan_ataca', 'muere': 'juan_muere',
}
JUAN_ALTO = 92
JUAN_MUERE = 8  # cuadros de juan_muere


def mediana(v):
    v = sorted(v)
    return v[len(v) // 2]


def franja(img, arriba, frac=0.06):
    """(x0, x1) de lo opaco en la franja de arriba o de abajo de la imagen."""
    a = img.getchannel('A').load()
    h = img.height
    n = max(2, round(h * frac))
    filas = range(0, n) if arriba else range(h - n, h)
    xs = [x for y in filas for x in range(img.width) if a[x, y]]
    return (min(xs), max(xs) + 1) if xs else (0, img.width)


def suelos_por_fila(nombre):
    """Para orden 'suelos': el piso de cada fila de cuadros (el borde de abajo
    del cuadro más bajo de la fila)."""
    t.SUELOS[nombre] = [(0, 0)]
    cajas = [c for _, c, *_ in t.cuadros(nombre, 'filas', 'entero')]
    alto = mediana([c[3] - c[1] for c in cajas])
    filas = {}
    for c in cajas:
        filas.setdefault(round(c[1] / alto), []).append(c[3])
    return [(max(v), max(v)) for _, v in sorted(filas.items())]


# El cinturón de las piernas (también lo tiene el torso abajo: se veían dos y
# el torso flotaba encima). Por personaje, qué píxel es del cinturón.
CINTURON_DE = {
    # Eduardo: todo lo que no es el pantalón mostaza.
    'eduardo': lambda r, g, b: not (r > 110 and g > 80 and b < 90 and r > b + 50),
    # Bartolina: la faja morada sobre la pollera negra.
    'bartolina': lambda r, g, b: b > g + 8 and r > g + 4 and max(r, g, b) > 40,
}


# Largo de las piernas respecto de CINTURA (de parado): como en Manfred.
LARGO_PIERNAS = {'piernas_salto': 1, 'piernas_crouch': 0.8, 'piernas_crouch_walk': 0.67}
# Ancho de la cintura de las piernas / ancho del torso abajo (Manfred: 0.94;
# en Bartolina el torso tiene la manta encima: la pollera, algo menos).
PROPORCION = {'eduardo': 0.9, 'bartolina': 0.82}


def medir(ruta, datos, piernas):
    """(ancho de la cintura, largo) medianos de una hoja, a escala de juego:
    en las piernas, 2 filas debajo del ancla y del ancla a la suela; en los
    torsos, 3 filas arriba del ancla y del ancla a la cabeza."""
    im = Image.open(ruta).convert('RGBA')
    px = im.load()
    w, h = datos['ancho'], datos['alto']
    ay = datos['ancla'][1]
    anchos, largos = [], []
    for i in range(len(datos['cuadros'])):
        y = ay + 2 if piernas else ay - 3
        xs = [x for x in range(w) if 0 <= y < h and px[i * w + x, y][3]]
        if xs:
            anchos.append(max(xs) - min(xs))
        filas = [yy for yy in range(h) if any(px[i * w + x, yy][3] for x in range(0, w, 2))]
        if filas:
            largos.append(max(filas) - ay if piernas else ay - min(filas))
    return mediana(anchos), mediana(largos)


def bajar_ancla(ruta, datos, es_cinturon):
    """El ancla de las piernas (la cintura) baja al borde de abajo del
    cinturón: el torso, que termina en su propio cinturón, queda encima y lo
    tapa (uno solo, sin hueco)."""
    img = Image.open(ruta).convert('RGBA')
    w, h = datos['ancho'], datos['alto']
    oy = datos['ancla'][1]
    bordes = []
    for i in range(len(datos['cuadros'])):
        c = img.crop((i * w, 0, (i + 1) * w, h))
        px = c.load()
        # Desde el borde de arriba: se busca el cinturón (las primeras filas
        # pueden ser el contorno oscuro) y el ancla va donde termina.
        y = oy
        visto = False
        while y < min(h - 4, oy + 24):
            opacos = [px[x, y] for x in range(w) if px[x, y][3]]
            es = bool(opacos) and sum(es_cinturon(*q[:3]) for q in opacos) >= len(opacos) * 0.5
            if es:
                visto = True
            elif visto:
                break
            y += 1
        if not visto:
            y = oy
        bordes.append(y)
    datos['ancla'][1] = mediana(bordes)


def heroe(nombre, hojas):
    carpeta = RAIZ / nombre
    t.CARPETA = carpeta
    t.PREFIJO = nombre + '_'
    t.FUENTES = {h: f for h, (f, _, _) in hojas.items()}
    t.SUELOS = {}
    t.ESPEJAR = {}
    t.CERCA = {'muerte': 60, 'idle': 40}
    t.HEBILLAS = {}
    t.ESTIRAR = {}

    # Las cinturas no tienen hebilla gris: el ancla es el medio de la franja
    # de la cintura (arriba en las piernas, abajo en el torso).
    original = t.cuadros.__wrapped__ if hasattr(t.cuadros, '__wrapped__') else t.cuadros

    def cuadros(hoja, orden, tipo):
        res = original(hoja, orden, tipo)
        salida = []
        for parte, caja, _, mano, suelo in res:
            heb = None
            if tipo in ('piernas', 'torso'):
                x0, x1 = franja(parte, tipo == 'piernas')
                heb = ((x0 + x1) / 2, 1 if tipo == 'piernas' else parte.height - 1)
            salida.append((parte, caja, heb, mano, suelo))
        return salida
    cuadros.__wrapped__ = original
    t.cuadros = cuadros

    for h, (_, tipo, orden) in hojas.items():
        if orden == 'suelos':
            t.SUELOS[h] = suelos_por_fila(h)

    medidas = {h: t.cuadros(h, orden, tipo) for h, (_, tipo, orden) in hojas.items()}
    alto = lambda h: [c[3] - c[1] for _, c, *_ in medidas[h]]
    cintura = lambda h, arriba: [franja(p, arriba)[1] - franja(p, arriba)[0] for p, *_ in medidas[h]]

    s_run = CINTURA * 0.95 / mediana(alto('piernas_run'))
    ancho_cintura = mediana(cintura('piernas_run', True)) * s_run
    # El torso, con la cabeza del mismo ancho que la del idle (así lo arman
    # Tuto y Manfred): se mide el ancho de la cabeza (unas filas debajo de lo
    # más alto) en el primer cuadro de cada hoja.
    def cabeza(h, k):
        """Ancho de la cabeza a la escala k (9 filas debajo de lo más alto)."""
        img = t.achicar(medidas[h][0][0], k)
        al = img.getchannel('A').load()
        top = next(y for y in range(img.height) if any(al[x, y] for x in range(img.width)))
        xs = [x for x in range(img.width) if al[x, top + 9]]
        return max(xs) - min(xs)
    s_idle = ALTO / mediana(alto('idle'))
    meta = cabeza('idle', s_idle)
    s_torso = TORSO / mediana(alto('torso_aiming'))
    for _ in range(4):  # (el ancho a escala no es lineal: se ajusta de a poco)
        s_torso *= meta / cabeza('torso_aiming', s_torso)
    ancho_torso = mediana(cintura('torso_aiming', False)) * s_torso
    escalas = {
        'piernas_run': s_run,
        'piernas_salto': CINTURA / alto('piernas_salto')[-1],
        'piernas_crouch': ancho_cintura / mediana(cintura('piernas_crouch', True)),
        'piernas_crouch_walk': ancho_cintura / mediana(cintura('piernas_crouch_walk', True)),
        'torso_aiming': s_torso,
        'torso_arriba': ancho_torso / mediana(cintura('torso_arriba', False)),
        'idle': s_idle,
        'muerte': ALTO * 0.95 / alto('muerte')[0],
        'trepar': ALTO * 1.05 / mediana(alto('trepar')) if 'trepar' in hojas else None,
    }
    anclas = {}
    # Primero torsos y cuerpo entero; las piernas, al final, se ajustan al torso.
    orden_hojas = sorted(hojas, key=lambda h: hojas[h][1] == 'piernas')
    for h in orden_hojas:
        _, tipo, orden = hojas[h]
        if tipo != 'piernas':
            anclas[h] = t.hoja(h, escalas[h], tipo, orden)
            continue
        ruta = carpeta / f'{nombre}_{h}.png'
        # Largo (de la cintura a la suela) como en Manfred y la cintura tan
        # ancha como la del torso (proporción de PROPORCION).
        k, ancho = escalas[h], 1
        for paso in range(3):
            anclas[h] = t.hoja(h, k, tipo, orden, ancho)
            bajar_ancla(ruta, anclas[h], CINTURON_DE[nombre])
            cintura, largo = medir(ruta, anclas[h], True)
            if paso == 2:
                break
            # Nueva escala (el ancho de la cintura crece con ella) y el
            # estirado a lo ancho que falta para llegar a la del torso.
            factor = CINTURA * LARGO_PIERNAS[h] / largo if h in LARGO_PIERNAS else 1
            k *= factor
            meta = medir(carpeta / f'{nombre}_torso_aiming.png', anclas['torso_aiming'], False)[0] * PROPORCION[nombre]
            ancho *= meta / max(1, cintura * factor)
        print(f'  {h}: cintura {cintura}, largo {largo}, ancho x{ancho:.2f}')
    (carpeta / 'anchors.json').write_text(json.dumps(anclas, indent=1))
    print(nombre, {h: round(e, 3) for h, e in escalas.items() if e})


def juan():
    carpeta = RAIZ / 'eduardo'
    datos = {}
    hojas = {}
    for h, archivo in JUAN.items():
        img = sin_tinte_magenta(quitar_fondo(Image.open(carpeta / f'{archivo}.jpeg')))
        grandes, chicas = componentes(img, 800)
        # Lo chico (las notas, las lágrimas, el palo que vuela) va con el cuadro más cercano.
        cajas = [c for _, c, _ in grandes]
        piezas = [list(p) for _, _, p in grandes]
        for _, (x0, y0, x1, y1), p in chicas:
            if len(p) < 15:
                continue
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            d = [max(c[0] - cx, cx - c[2], 0) + max(c[1] - cy, cy - c[3], 0) for c in cajas]
            i = min(range(len(cajas)), key=lambda k: d[k])
            if d[i] < 70:
                piezas[i] += p
        orden = sorted(range(len(cajas)), key=lambda k: (round(cajas[k][1] / 120), cajas[k][0]))
        cuadros = []
        for k in orden:
            xs = [x for x, _ in piezas[k]]
            ys = [y for _, y in piezas[k]]
            x0, y0 = min(xs), min(ys)
            c = Image.new('RGBA', (max(xs) - x0 + 1, max(ys) - y0 + 1))
            o, d = img.load(), c.load()
            for x, y in piezas[k]:
                d[x - x0, y - y0] = o[x, y]
            cuadros.append(c)
        # juan_muere viene con los cuadros pegados por una línea de piso: se
        # borra la línea y se corta en JUAN_MUERE columnas iguales.
        if h == 'muere' and len(cuadros) < JUAN_MUERE:
            c = max(cuadros, key=lambda im: im.width)
            c = c.crop((0, 0, c.width, c.height - 4))
            w = c.width / JUAN_MUERE
            # Cada corte, en la columna más vacía cerca de donde caería.
            al = c.getchannel('A').load()
            llenas = [sum(1 for y in range(c.height) if al[x, y]) for x in range(c.width)]
            cortes = [0] + [min(range(round(i * w - w * 0.3), round(i * w + w * 0.3)), key=lambda x: llenas[x])
                            for i in range(1, JUAN_MUERE)] + [c.width]
            cuadros = [c.crop((cortes[i], 0, cortes[i + 1], c.height)) for i in range(JUAN_MUERE)]
            cuadros = [q.crop(q.getchannel('A').getbbox()) for q in cuadros]
        hojas[h] = cuadros
    # Escala: Juan tocando mide JUAN_ALTO; cada hoja, por la altura del cuerpo
    # (mediana), al mismo alto (camina está dibujada más chica).
    for h, cuadros in hojas.items():
        k = JUAN_ALTO / mediana([c.height for c in cuadros])
        if h == 'muere':
            k *= 0.95
        chicos = [t.achicar(c, k) for c in cuadros]
        ancho = max(c.width for c in chicos) + 2
        alto = max(c.height for c in chicos) + 2
        tira = Image.new('RGBA', (ancho * len(chicos), alto))
        for i, c in enumerate(chicos):
            tira.alpha_composite(c, (i * ancho + (ancho - c.width) // 2, alto - c.height))
        tira.save(carpeta / f'juan_{h}.png')
        datos[h] = [ancho, alto, len(chicos)]
    # El palo que tira y la estrella del golpe (palo_ataque_juan.jpeg).
    img = sin_tinte_magenta(quitar_fondo(Image.open(carpeta / 'palo_ataque_juan.jpeg')))
    grandes, _ = componentes(img, 300)
    grandes.sort(key=lambda m: (round(m[1][1] / 150), m[1][0]))
    palos = [g for g in grandes if g[1][3] - g[1][1] < 220 and g[1][1] < 520][:6]
    estrellas = [g for g in grandes if g not in palos][:2]
    for nombre, grupo, k in (('palo', palos, 0.35), ('estrella', estrellas, 0.3)):
        cuadros = []
        for _, (x0, y0, x1, y1), p in grupo:
            c = Image.new('RGBA', (x1 - x0, y1 - y0))
            o, d = img.load(), c.load()
            for x, y in p:
                d[x - x0, y - y0] = o[x, y]
            cuadros.append(t.achicar(c, k))
        lado = max(max(c.width, c.height) for c in cuadros) + 2
        tira = Image.new('RGBA', (lado * len(cuadros), lado))
        for i, c in enumerate(cuadros):
            tira.alpha_composite(c, (i * lado + (lado - c.width) // 2, (lado - c.height) // 2))
        tira.save(carpeta / f'juan_{nombre}.png')
        datos[nombre] = [lado, lado, len(cuadros)]
    (carpeta / 'juan.json').write_text(json.dumps(datos, indent=1))
    print('juan', datos)


def main():
    for nombre, hojas in HEROES.items():
        heroe(nombre, hojas)
    juan()


if __name__ == '__main__':
    main()
