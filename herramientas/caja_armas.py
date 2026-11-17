"""Caja de armas (Armas.js) a partir de assets/armas/caja_arma.jpeg (la caja
entera) y caja_arma_destruida.jpeg (9 cuadros: grieta, más grietas, se abre,
explota, se desarma, vuelan las tablas, caen, caja rota, montón de restos),
sobre magenta.

Guarda assets/armas/caja_armas.png: una fila de celdas de CELDA px de arte
(en el juego van a x2), con el mismo orden que antes:
  0-2   quieta (0 normal; 1 y 2 con un brillo que la recorre)
  3-5   golpeada (entera, una grieta, muchas grietas)
  6-11  rompiéndose (se abre, explota, se desarma, vuelan las tablas,
        caen, el montón de restos)
Todas a la misma escala (la caja mide ANCHO px de arte) y apoyadas abajo,
centradas en la caja.

Uso (desde la raíz del proyecto):  python3 herramientas/caja_armas.py
"""
from PIL import Image, ImageDraw

from recorte_sprites import a_pixel_art, quitar_fondo, sin_tinte_magenta

ANCHO = 50            # px de arte de la caja entera (más grande y alta que la de antes)
CELDA = (90, 76)      # px de arte de cada celda
# Cajas de cada cuadro de caja_arma_destruida.jpeg y la y del piso de su fila.
DESTRUIDA = [(30, 40, 300, 335), (300, 40, 565, 335), (565, 40, 860, 335), (860, 40, 1245, 335),
             (1245, 40, 1570, 335), (40, 335, 400, 650), (430, 335, 790, 650), (790, 335, 1190, 650),
             (1190, 335, 1570, 650)]
PISO_FILA = [321, 321, 321, 321, 321, 628, 628, 628, 628]
ANCHO_CAJA_DESTRUIDA = 237  # px de la caja entera en caja_arma_destruida (cuadro 0)


def sin_rosado(img):
    """El humo (gris y semitransparente en el dibujo) quedó mezclado con el
    magenta: lo que tiene rojo y azul por encima del verde pasa a gris."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and r > g + 12 and b > g + 12:
                v = (r + g + b) // 3
                px[x, y] = (v, v, int(v * 0.97), a)
    return img


def celda(img, escala, piso, centro_x):
    """La imagen achicada en una celda: su `piso` (y en la imagen) abajo de
    la celda y `centro_x` en el medio."""
    cw, ch = CELDA
    grande = Image.new('RGBA', (round(cw / escala), round(ch / escala)), (0, 0, 0, 0))
    x = round(grande.width / 2 - centro_x)
    y = round(grande.height - 2 / escala - piso)
    grande.alpha_composite(img, (max(0, x), max(0, y)), (max(0, -x), max(0, -y)))
    return a_pixel_art(grande, CELDA)


def brillo(img, t):
    """Un reflejo diagonal que cruza la caja (t de 0 a 1)."""
    out = img.copy()
    capa = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    x = int(-img.height + t * (img.width + img.height))
    ancho = 46
    d.polygon([(x, img.height), (x + ancho, img.height), (x + ancho + img.height, 0), (x + img.height, 0)], fill=(255, 250, 200, 150))
    d.polygon([(x + ancho + 14, img.height), (x + ancho + 26, img.height), (x + ancho + 26 + img.height, 0), (x + ancho + 14 + img.height, 0)], fill=(255, 250, 200, 90))
    alfa = img.getchannel('A')
    capa.putalpha(Image.composite(capa.getchannel('A'), Image.new('L', img.size, 0), alfa))
    out.alpha_composite(capa)
    return out


def main():
    entera = sin_tinte_magenta(quitar_fondo(Image.open('assets/armas/caja_arma.jpeg')))
    caja = entera.getbbox()
    entera = entera.crop(caja)
    escala_entera = ANCHO / entera.width
    cuadros = []
    for t in (None, 0.35, 0.7):  # quieta: normal y el brillo que pasa
        img = entera if t is None else brillo(entera, t)
        cuadros.append(celda(img, escala_entera, entera.height, entera.width / 2))

    hoja = sin_rosado(sin_tinte_magenta(quitar_fondo(Image.open('assets/armas/caja_arma_destruida.jpeg'))))
    escala = ANCHO / ANCHO_CAJA_DESTRUIDA
    partes = []
    for (x0, y0, x1, y1), piso in zip(DESTRUIDA, PISO_FILA):
        p = hoja.crop((x0, y0, x1, y1))
        partes.append((p, piso - y0))
    # El centro de la caja de cada fila: el de su cuadro 0 (fila 1) o del montón.
    def poner(i):
        p, piso = partes[i]
        b = p.getbbox()
        return celda(p, escala, piso, (b[0] + b[2]) / 2)
    cuadros.append(cuadros[0])        # 3: golpeada, entera
    cuadros.append(poner(0))          # 4: una grieta
    cuadros.append(poner(1))          # 5: muchas grietas
    for i in (2, 3, 4, 5, 6, 8):      # 6-11: se rompe y queda el montón
        cuadros.append(poner(i))
    cuadros = [sin_rosado(c) for c in cuadros]

    cw, ch = CELDA
    salida = Image.new('RGBA', (cw * len(cuadros), ch))
    for i, c in enumerate(cuadros):
        salida.paste(c, (i * cw, 0))
    salida.save('assets/armas/caja_armas.png')
    print(f'caja_armas.png: {len(cuadros)} cuadros de {cw}x{ch}')


if __name__ == '__main__':
    main()
