"""Capas de la Cueva de los Guácharos (escena Cueva, src/scenes/Cueva.js) a
partir de assets/efectos/cueva/:
  img3.jpeg  el nivel completo (2064x512): roca, repisa, escalera, escombros
  img2.jpeg  tres franjas de parallax separadas por líneas magenta, con el
             fondo de las de abajo en magenta (transparente)

Guarda en assets/fondos/cueva/, a escala 1 (resolución de pantalla):
  cueva.png         el nivel. Los huecos más oscuros de la roca (lo negro del
                    fondo de la cueva, arriba del piso) quedan transparentes
                    con borde suave: por ahí se ven las capas de parallax.
                    El piso y lo de abajo quedan opacos.
  cueva_cielo.png   franja de arriba de img2 (nubes de noche)
  cueva_lejano.png  franja del medio (cerros lejanos), sin el magenta
  cueva_medio.png   franja de abajo (roca de la cueva), sin el magenta
  _vista_previa.png cueva.png sobre magenta, para ver qué quedó transparente

La colisión (cueva_collision.json) no sale de acá: se dibuja a mano sobre el
nivel con el editor de la escena (tecla E).

Uso (desde la raíz del proyecto):  python3 herramientas/cueva_guacharos.py
"""
from pathlib import Path

from PIL import Image, ImageFilter

ORIGEN = Path('assets/efectos/cueva')
DESTINO = Path('assets/fondos/cueva')

# Huecos: luminancia (suavizada) por debajo de OSCURO es transparente, por
# encima de CLARO opaca, y en el medio, un degradé. Solo arriba de PISO (y de
# img3): el piso y lo de adelante quedan enteros.
OSCURO, CLARO, PISO = 4, 13, 400
# La cueva se alarga: antes de la arena del jefe se intercala una copia del
# tramo [DESDE, DESDE + LARGO) (piso parejo, sin repisas). A la izquierda sigue
# igual (empieza donde estaba); a la derecha se funde en FUNDIDO px.
DESDE, LARGO, FUNDIDO = 1480, 500, 64
# Rocas de la arena: tamaño (px) y de dónde se saca la textura (x0, y0, x1, y1
# de img3: la cara de la repisa de la derecha y el pilar grande).
ROCA = (150, 64)
FUENTES_ROCA = [(1330, 288, 1470, 322), (1880, 300, 1960, 440), (1215, 288, 1330, 320)]


def es_magenta(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def nivel():
    im = Image.open(ORIGEN / 'img3.jpeg').convert('RGB')
    ancho, alto = im.size
    luz = im.convert('L').filter(ImageFilter.GaussianBlur(2.2))
    alfa = Image.new('L', im.size, 255)
    pl, pa = luz.load(), alfa.load()
    for y in range(PISO):
        # Cerca del piso el corte se apaga de a poco (sin escalón).
        margen = min(1.0, (PISO - y) / 40)
        for x in range(ancho):
            v = (pl[x, y] - OSCURO) / (CLARO - OSCURO)
            v = max(0.0, min(1.0, v))
            pa[x, y] = round(255 * (1 - (1 - v) * margen))
    salida = im.convert('RGBA')
    salida.putalpha(alfa)
    rocas(salida)
    salida = alargar(salida)
    ancho = salida.width
    salida.save(DESTINO / 'cueva.png')
    fondo = Image.new('RGBA', salida.size, (255, 0, 255, 255))
    fondo.alpha_composite(salida)
    fondo.convert('RGB').save(DESTINO / '_vista_previa.png')
    transparente = sum(1 for v in alfa.getdata() if v < 128) / (ancho * alto)
    print(f'cueva.png {ancho}x{alto}  transparente: {transparente:.1%}')


def alargar(img):
    """Intercala otra vez el tramo [DESDE, DESDE + LARGO) a continuación de sí
    mismo (sin espejar): la cueva queda LARGO px más larga. La unión de la
    derecha es continua (la copia termina donde sigue el original); la de la
    izquierda se funde en FUNDIDO px. Las rocas de la arena (rocas()) tapan lo
    que se repite."""
    ancho, alto = img.size
    tramo = img.crop((DESDE, 0, DESDE + LARGO, alto))
    salida = Image.new('RGBA', (ancho + LARGO, alto))
    salida.paste(img.crop((0, 0, DESDE + LARGO, alto)), (0, 0))
    salida.paste(tramo, (DESDE + LARGO, 0))
    salida.paste(img.crop((DESDE + LARGO, 0, ancho, alto)), (DESDE + 2 * LARGO, 0))
    for i in range(FUNDIDO):
        t = (i + 1) / (FUNDIDO + 1)
        x = DESDE + LARGO + i
        for y in range(alto):
            a = img.getpixel((min(ancho - 1, DESDE + LARGO + i), y))
            b = img.getpixel((DESDE + i, y))
            salida.putpixel((x, y), tuple(round(a[k] * (1 - t) + b[k] * t) for k in range(4)))
    return salida


def rocas(img):
    """Rocas sueltas para la arena del jefe, con la MISMA textura que la cueva:
    se rellenan con pedazos (ovalados, fundidos, al azar) de la roca del
    dibujo (la cara de la repisa y el pilar), con luz arriba, sombra abajo y
    contorno oscuro.
      repisa: losa flotante, arriba plana (se pisa) y abajo con goteras.
      pena:   peñasco apoyado en el piso, arriba casi plano (se pisa).
    Guarda cueva_rocas.png con las dos una al lado de la otra (ROCA px c/u)."""
    import math
    import random
    rnd = random.Random(11)
    W, H = ROCA
    # Pedazos de roca opaca (sin fondo oscuro ni transparente).
    pedazos = []
    for caja in FUENTES_ROCA:
        intentos = 0
        while intentos < 400 and len(pedazos) < 70:
            intentos += 1
            pw, ph = rnd.randint(18, 34), rnd.randint(12, 24)
            if caja[2] - caja[0] <= pw or caja[3] - caja[1] <= ph:
                continue
            x = rnd.randint(caja[0], caja[2] - pw)
            y = rnd.randint(caja[1], caja[3] - ph)
            p = img.crop((x, y, x + pw, y + ph))
            datos = list(p.getdata())
            if all(a > 250 for *_, a in datos) and sum(r + g + b for r, g, b, _ in datos) / len(datos) > 3 * 70:
                pedazos.append(p.convert('RGB'))
    assert len(pedazos) > 20, len(pedazos)

    def mascara(w, h):
        m = Image.new('L', (w, h))
        mp = m.load()
        for i in range(w):
            for j in range(h):
                d = ((i - w / 2) / (w / 2)) ** 2 + ((j - h / 2) / (h / 2)) ** 2
                mp[i, j] = int(255 * max(0.0, min(1.0, (1 - d) / 0.45)))
        return m

    def textura():
        lienzo = Image.new('RGB', (W, H), (110, 92, 66))
        for _ in range(int(W * H / 90)):
            p = rnd.choice(pedazos)
            lienzo.paste(p, (rnd.randint(-20, W), rnd.randint(-14, H)), mascara(*p.size))
        return lienzo

    def ruido(x, k):
        return math.sin(x * 0.31 + k) * 0.6 + math.sin(x * 0.11 + k * 2.3) * 0.4

    # Formas: arriba y abajo de cada columna.
    goteras = {rnd.randint(14, W - 14): rnd.randint(8, 16) for _ in range(6)}
    def forma_repisa(x):
        borde = min(x, W - 1 - x)
        arriba = 4 + round(ruido(x, 1) * 1.5) + (max(0, 6 - borde) if borde < 6 else 0)
        abajo = 30 + round(ruido(x, 4) * 4)
        for gx, largo in goteras.items():
            d = abs(x - gx)
            if d < 5:
                abajo = max(abajo, 30 + largo - d * largo // 5)
        abajo -= max(0, 10 - borde * 2)
        return arriba, abajo

    def forma_pena(x):
        t = (2 * x / (W - 1) - 1)
        arriba = 8 + round(abs(t) ** 4 * 34 + ruido(x, 7) * 2)
        return arriba, H

    hoja = Image.new('RGBA', (W * 2, H))
    for n, forma in enumerate((forma_repisa, forma_pena)):
        tex = textura().load()
        img_r = Image.new('RGBA', (W, H))
        px = img_r.load()
        lim = [forma(x) for x in range(W)]
        def dentro(x, y):
            return 0 <= x < W and 0 <= y < H and lim[x][0] <= y < lim[x][1]
        for x in range(W):
            arriba, abajo = lim[x]
            for y in range(arriba, min(H, abajo)):
                if not all(dentro(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, -1), (0, 1))) and \
                        not (n == 1 and y == H - 1):
                    px[x, y] = (26, 19, 12, 255)
                    continue
                r, g, b = tex[x, y]
                prof = y - arriba
                if prof < 3:
                    f = 1.45                                   # el canto de arriba, con luz
                elif prof < 6:
                    f = 1.2
                else:
                    f = 1.05 - 0.5 * (y - arriba) / max(1, (abajo - arriba))
                f += 0.12 * (1 - x / W)                        # luz desde la izquierda
                # Más contraste y un poco más oscura (como la roca de la cueva).
                c = [max(0, min(255, int(((v * f) - 110) * 1.25 + 100))) for v in (r, g, b)]
                px[x, y] = (c[0], c[1], c[2], 255)
        hoja.paste(img_r, (W * n, 0))
    hoja.save(DESTINO / 'cueva_rocas.png')
    print(f'cueva_rocas.png {hoja.size}')


def franjas():
    im = Image.open(ORIGEN / 'img2.jpeg').convert('RGB')
    ancho, alto = im.size
    px = im.load()
    # Líneas separadoras: filas casi todas magenta.
    llenas = [y for y in range(alto)
              if sum(es_magenta(*px[x, y]) for x in range(0, ancho, 4)) > ancho / 4 * 0.97]
    cortes, inicio = [], 0
    for y in llenas + [alto + 1]:
        if y - inicio > 20:
            cortes.append((inicio, y))
        inicio = y + 1
    nombres = ['cueva_cielo.png', 'cueva_lejano.png', 'cueva_medio.png']
    assert len(cortes) == 3, cortes
    for nombre, (y0, y1) in zip(nombres, cortes):
        franja = im.crop((0, y0, ancho, y1)).convert('RGBA')
        datos = []
        for r, g, b, _ in franja.getdata():
            if es_magenta(r, g, b):
                datos.append((0, 0, 0, 0))
            else:
                # Despill: el borde rosado del jpeg se apaga hacia el gris.
                if r > g + 30 and b > g + 30:
                    m = (g + min(r, b)) // 2
                    r, b = m, m
                datos.append((r, g, b, 255))
        franja.putdata(datos)
        franja.save(DESTINO / nombre)
        print(f'{nombre} {ancho}x{y1 - y0}  (y {y0}-{y1} de img2)')


if __name__ == '__main__':
    DESTINO.mkdir(parents=True, exist_ok=True)
    nivel()
    franjas()
