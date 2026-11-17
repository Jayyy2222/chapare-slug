"""Recorta assets/efectos/animacion_fondo.png (fogata de rebeldes de Metal Slug,
ripeada por Grey_Wolf_Leader; créditos en la imagen) para el fondo de Nivel1.

Guarda en assets/efectos/ hojas de una fila, con el fondo violeta transparente:
  fogata.png     celdas FOGO: normal 0-3, calentándose 4-7, a full 8-13
                 (apoyadas abajo)
  fogata_humo.png celdas HUMO: el humo 0-7 (apoyado abajo)
  rebeldes.png   celdas REBELDE: soplando 0-3, atizando 4-5, mirando 6
                 (apoyados abajo)
Las cajas son las de cada cuadro en la imagen, agrandadas a los costados y,
en la fogata, también hacia arriba (ARRIBA) para no perder las chispas
sueltas. En el humo y los rebeldes no: arriba están los números y textos de
la hoja.

Uso (desde la raíz del proyecto):  python3 herramientas/fogata.py
"""
from PIL import Image

ENTRADA = 'assets/efectos/animacion_fondo.png'
MARGEN = 3
ARRIBA = {'fogata': 7, 'fogata_humo': 0, 'rebeldes': 0}
HOJAS = {
    'fogata': [(3, 39, 39, 63), (44, 39, 76, 63), (81, 39, 115, 63), (120, 39, 152, 63),
               (163, 32, 199, 63), (204, 30, 236, 63), (241, 28, 273, 63), (278, 26, 310, 63),
               (3, 108, 39, 145), (43, 110, 79, 145), (84, 108, 118, 145), (123, 108, 159, 145),
               (164, 108, 200, 145), (205, 110, 241, 145)],
    'fogata_humo': [(315, 18, 331, 191), (337, 15, 353, 191), (361, 15, 377, 191), (382, 15, 398, 191),
                    (403, 15, 419, 191), (424, 21, 439, 191), (444, 20, 458, 191), (464, 21, 477, 191)],
    'rebeldes': [(29, 206, 63, 231), (68, 204, 102, 231), (107, 202, 141, 231), (146, 201, 180, 231),
                 (39, 271, 77, 301), (82, 271, 123, 301), (168, 269, 213, 301)],
}


def sin_fondo(img):
    img = img.convert('RGBA')
    px = img.load()
    fondo = px[0, 0]
    for y in range(img.height):
        for x in range(img.width):
            if sum(abs(px[x, y][i] - fondo[i]) for i in range(3)) < 20:
                px[x, y] = (0, 0, 0, 0)
    return img


def main():
    img = sin_fondo(Image.open(ENTRADA))
    for nombre, cajas in HOJAS.items():
        cuadros = []
        for x0, y0, x1, y1 in cajas:
            cuadros.append(img.crop((x0 - MARGEN, y0 - ARRIBA[nombre], x1 + MARGEN, y1 + 1)))
        ancho = max(c.width for c in cuadros)
        alto = max(c.height for c in cuadros)
        hoja = Image.new('RGBA', (ancho * len(cuadros), alto))
        for i, c in enumerate(cuadros):
            hoja.paste(c, (i * ancho + (ancho - c.width) // 2, alto - c.height), c)
        hoja.save(f'assets/efectos/{nombre}.png')
        print(f'{nombre}: {len(cuadros)} cuadros de {ancho}x{alto}')


if __name__ == '__main__':
    main()
