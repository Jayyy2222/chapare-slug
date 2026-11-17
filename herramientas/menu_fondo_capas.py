"""Corta las capas del fondo animado del menú (src/scenes/Menu.js) de
assets/menu/fondo1.jpeg, fondo2.jpeg y fondo3.jpeg y las guarda en
assets/menu_bg/ a la resolución del fondo (512x288, en el juego se dibuja a x2).

fondo1.jpeg  cielo del atardecer con nubes:
    cielo.png   el cielo sin las nubes (las nubes se tapan con el color de la
                misma fila: el cielo son franjas horizontales)
    nubes.png   solo las nubes, 1024 de ancho: la imagen + su espejo, así el
                tileSprite se repite sin costura
fondo2.jpeg  tres franjas sobre magenta:
    montanas.png  la cordillera (se borra el cielo de arriba), espejada
    selva.png     palmeras y río (se borra el cielo entre los árboles), espejada
    hojas.png     hojas del primer plano, espejada
fondo3.jpeg  sprites sueltos sobre magenta:
    paraba.png    4 cuadros de la paraba (hoja de cuadros iguales, ver JSON)
    mariposa.png  2 cuadros
    bandada.png, brillo.png (3 cuadros), niebla1..4.png (espejadas)
    menu_bg.json  tamaño de cuadro de cada hoja

Uso (desde la raíz del proyecto):  python3 herramientas/menu_fondo_capas.py
"""
import json
import os

from PIL import Image, ImageOps

from recorte_sprites import a_pixel_art, componentes, quitar_fondo, sin_tinte_magenta

ORIGEN = 'assets/menu/'
DESTINO = 'assets/menu_bg/'
ANCHO, ALTO = 512, 288
COLORES = 64

# Franjas de fondo2.jpeg (y en la imagen original, 768 de alto).
FRANJA_MONTANAS = (0, 186)
FRANJA_SELVA = (200, 514)
FRANJA_HOJAS = (516, 768)
# Fila (dentro de la franja de la selva) desde la que todo es río: se guarda entero.
RIO_DESDE = 222

# Cajas aproximadas de cada grupo de sprites en fondo3.jpeg; dentro de cada una
# se buscan las manchas y se ordenan de izquierda a derecha.
GRUPOS_SPRITES = {
    'paraba': ((0, 0, 1375, 250), 4),
    'mariposa': ((40, 250, 340, 365), 2),
    'bandada': ((400, 250, 640, 370), 1),
    'brillo': ((60, 395, 540, 515), 3),
    'niebla1': ((700, 300, 1345, 375), 1),
    'niebla2': ((700, 400, 1345, 500), 1),
    'niebla3': ((30, 550, 1345, 615), 1),
    'niebla4': ((30, 640, 1345, 740), 1),
}
ESCALA_SPRITES = ALTO / 768


def espejada(img):
    """La imagen + su espejo a la derecha: se repite sin costura."""
    doble = Image.new('RGBA', (img.width * 2, img.height))
    doble.paste(img, (0, 0))
    doble.paste(ImageOps.mirror(img), (img.width, 0))
    return doble


def nitida(img, colores=COLORES):
    """Alfa 0/255 y paleta reducida, como el resto del arte del juego."""
    alfa = img.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    color = img.convert('RGB').quantize(colores, method=Image.Quantize.MEDIANCUT).convert('RGB')
    resultado = color.convert('RGBA')
    resultado.putalpha(alfa)
    return resultado


def cielo_y_nubes():
    img = Image.open(ORIGEN + 'fondo1.jpeg').convert('RGB').resize((ANCHO, ALTO), Image.LANCZOS)
    img = img.quantize(COLORES, method=Image.Quantize.MEDIANCUT).convert('RGB')
    px = img.load()
    limite = round(ALTO * 0.64)  # las nubes están arriba del sol
    # Nube = píxel que se aparta del color típico de su fila: la mediana de
    # los píxeles que no son naranjas (el cielo de arriba es violeta/rosado).
    nube = [[False] * ANCHO for _ in range(ALTO)]
    for y in range(limite):
        fila = sorted(p for p in (px[x, y] for x in range(ANCHO)) if p[2] >= p[1]) or [px[0, y]]
        tipico = fila[len(fila) // 2]
        for x in range(ANCHO):
            r, g, b = px[x, y]
            diferencia = abs(r - tipico[0]) + abs(g - tipico[1]) + abs(b - tipico[2])
            # Las nubes son naranjas (más verde que azul) o mucho más claras/oscuras.
            nube[y][x] = (g > b + 10 and r > 150) or diferencia > 60
    # Sin puntos sueltos (el tramado de algunas franjas se marca como nube).
    nube = [[nube[y][x] and sum(nube[y + dy][x + dx]
                                for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                                if 0 <= y + dy < ALTO and 0 <= x + dx < ANCHO) >= 5
             for x in range(ANCHO)] for y in range(ALTO)]
    # Se agranda un píxel la máscara para llevarse los bordes.
    gruesa = [[any(nube[y + dy][x + dx]
                   for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                   if 0 <= y + dy < ALTO and 0 <= x + dx < ANCHO)
               for x in range(ANCHO)] for y in range(ALTO)]

    nubes = Image.new('RGBA', (ANCHO, ALTO))
    pn = nubes.load()
    cielo = img.copy()
    pc = cielo.load()
    for y in range(limite):
        libres = [x for x in range(ANCHO) if not gruesa[y][x]]
        for x in range(ANCHO):
            if not gruesa[y][x]:
                continue
            if nube[y][x]:
                pn[x, y] = px[x, y] + (255,)
            # Tapa con el píxel libre más cercano de la misma fila y misma
            # paridad (conserva el tramado de las franjas).
            if libres:
                cerca = min(libres, key=lambda k: (abs(k - x) + (0 if (k - x) % 2 == 0 else 0.5)))
                pc[x, y] = px[cerca, y]
    cielo.save(DESTINO + 'cielo.png')
    espejada(nubes).save(DESTINO + 'nubes.png')
    print('cielo', cielo.size, 'nubes', (ANCHO * 2, ALTO))


def es_cielo(r, g, b):
    """Cielo violeta/azul noche o naranja/rosado detrás de los árboles."""
    violeta = b > g + 20
    naranja = r > 150 and r > g + 50
    return violeta or naranja


def recortar_cielo(franja, guardar_desde):
    """Borra el cielo de la franja de la selva: los píxeles de cielo conectados
    con el borde de arriba, sin bajar al río (sus reflejos también son naranjas)."""
    px = franja.load()
    ancho, alto = franja.size
    borrar = [[False] * ancho for _ in range(alto)]
    # Lo transparente (el magenta de arriba) también deja pasar el relleno.
    pasa = lambda c, d: px[c, d][3] == 0 or es_cielo(*px[c, d][:3])
    pila = [(x, 0) for x in range(ancho) if pasa(x, 0)]
    for x, y in pila:
        borrar[y][x] = True
    while pila:
        x, y = pila.pop()
        for c, d in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= c < ancho and 0 <= d < guardar_desde and not borrar[d][c]:
                if pasa(c, d):
                    borrar[d][c] = True
                    pila.append((c, d))
    for y in range(alto):
        for x in range(ancho):
            if borrar[y][x]:
                px[x, y] = (0, 0, 0, 0)
    return franja


def recortar_sobre_montanas(franja):
    """Borra, columna por columna, todo lo que está arriba de la primera
    fila de montaña (azul: verde casi tan alto como el rojo)."""
    px = franja.load()
    ancho, alto = franja.size
    for x in range(ancho):
        for y in range(alto):
            r, g, b, a = px[x, y]
            if a and g >= 0.85 * r and r + g + b > 150:
                break
            px[x, y] = (0, 0, 0, 0)
    return franja


def sin_linea_blanca(franja):
    """Corta las filas de abajo de la cordillera: la línea blanca de niebla
    que en fondo2 separa las montañas del río (en el menú quedaba como una
    raya entre las montañas y la selva)."""
    px = franja.load()
    ancho, alto = franja.size
    corte = alto
    while corte > 1:
        fila = [px[x, corte - 1] for x in range(ancho) if px[x, corte - 1][3]]
        if fila and sum(sum(p[:3]) for p in fila) / (3 * len(fila)) < 110:
            break
        corte -= 1
    # Dos filas más: la de transición también es clara.
    return franja.crop((0, 0, ancho, max(1, corte - 2)))


def capas_fondo2():
    original = Image.open(ORIGEN + 'fondo2.jpeg')
    img = sin_tinte_magenta(quitar_fondo(original.resize((ANCHO, ALTO), Image.LANCZOS)))
    a_chica = lambda y: round(y * ALTO / original.height)

    def franja(desde_hasta):
        y0, y1 = (a_chica(v) for v in desde_hasta)
        return img.crop((0, y0, ANCHO, y1))

    montanas = sin_linea_blanca(recortar_sobre_montanas(franja(FRANJA_MONTANAS)))
    selva = recortar_cielo(franja(FRANJA_SELVA), a_chica(RIO_DESDE + FRANJA_SELVA[0]) - a_chica(FRANJA_SELVA[0]))
    hojas = franja(FRANJA_HOJAS)
    for nombre, capa in (('montanas', montanas), ('selva', selva), ('hojas', hojas)):
        capa = nitida(capa)
        espejada(capa).save(DESTINO + nombre + '.png')
        print(nombre, (capa.width * 2, capa.height))


def sprites_fondo3():
    img = sin_tinte_magenta(quitar_fondo(Image.open(ORIGEN + 'fondo3.jpeg')))
    datos = {}
    for nombre, (caja, cantidad) in GRUPOS_SPRITES.items():
        zona = img.crop(caja)
        if nombre == 'brillo':
            # El tercer cuadro es polvo suelto: se corta en tercios iguales.
            tercio = zona.width / cantidad
            cuadros = [zona.crop((round(i * tercio), 0, round((i + 1) * tercio), zona.height))
                       for i in range(cantidad)]
            cuadros = [c.crop(c.getbbox()) for c in cuadros]
        elif cantidad == 1:
            # Una sola pieza (la bandada son pájaros sueltos): todo lo opaco.
            cuadros = [zona.crop(zona.getbbox())]
        else:
            grandes, _ = componentes(zona, 200)
            grandes.sort(key=lambda m: -m[0])
            grandes = sorted(grandes[:cantidad], key=lambda m: m[1][0])
            cuadros = [zona.crop((max(0, x0 - 2), max(0, y0 - 2), x1 + 2, y1 + 2))
                       for _, (x0, y0, x1, y1), _p in grandes]
            cuadros = [c.crop(c.getbbox()) for c in cuadros]
        celda = (max(c.width for c in cuadros), max(c.height for c in cuadros))
        tam = (max(1, round(celda[0] * ESCALA_SPRITES)), max(1, round(celda[1] * ESCALA_SPRITES)))
        hoja = Image.new('RGBA', (tam[0] * len(cuadros), tam[1]))
        for i, c in enumerate(cuadros):
            # Centrado en su celda.
            lienzo = Image.new('RGBA', celda)
            lienzo.paste(c, ((celda[0] - c.width) // 2, (celda[1] - c.height) // 2))
            hoja.paste(a_pixel_art(lienzo, tam, 32), (i * tam[0], 0))
        if nombre.startswith('niebla'):
            # Sin las puntas cortadas en recto, que se verían en la unión.
            hoja = espejada(hoja.crop((3, 0, hoja.width - 3, hoja.height)))
        hoja.save(DESTINO + nombre + '.png')
        datos[nombre] = {'ancho': hoja.width // len(cuadros), 'alto': tam[1], 'cuadros': len(cuadros)}
        print(nombre, datos[nombre])
    with open(DESTINO + 'menu_bg.json', 'w') as f:
        json.dump(datos, f, indent=2)


def main():
    os.makedirs(DESTINO, exist_ok=True)
    cielo_y_nubes()
    capas_fondo2()
    sprites_fondo3()


if __name__ == '__main__':
    main()
