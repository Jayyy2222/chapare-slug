"""Recorta los efectos de assets/vfx/ en hojas de una fila con celdas iguales.

Fuentes (sprites de Metal Slug; ver los créditos en cada imagen):
  explosiones.png  hoja de Gussprint (fondo verde)
  armas_vfx.png    efectos de las armas, también de Gussprint (fondo verde)
  sangre.gif       hoja de Kevin Huff (fondo transparente)
Cada efecto es una o más bandas (filas de la hoja): (y0, y1, inicios, fin),
con la x donde empieza cada cuadro y dónde termina el último (medidas a mano:
entre cuadro y cuadro quedan pedazos sueltos de humo o de sangre, así que no
se pueden separar por columnas vacías). Las explosiones se apoyan abajo; el
escopetazo, a la izquierda (sale de la boca del arma); la sangre, las balas y
el tajo van centrados.

Guarda assets/vfx/<nombre>.png e imprime el tamaño de celda y los cuadros
(van en EFECTOS de src/Efectos.js).

Uso (desde la raíz del proyecto):  python3 herramientas/vfx.py
"""
from PIL import Image

CARPETA = 'assets/vfx/'
# nombre: (archivo, apoyo, [(y0, y1, inicios, fin), ...])
EFECTOS = {
    'explosion_chica': ('explosiones.png', 'abajo', [
        (5, 46, [74, 105, 138, 172, 205, 238, 271, 304, 337, 370, 403, 435, 468, 500, 531, 560], 592),
        (49, 84, [4, 33, 61, 87, 112, 137, 162, 186, 207, 226], 242)]),
    'explosion_mediana': ('explosiones.png', 'abajo', [
        (89, 143, [106, 152, 201, 248, 297, 344, 396, 444, 492, 540], 592),
        (151, 204, [4, 51, 98, 145, 190, 234, 278, 320, 361, 399, 437, 473, 507, 546], 592)]),
    'explosion_grande': ('explosiones.png', 'abajo', [
        (236, 316, [172, 249, 332, 414, 496], 592),
        (319, 403, [4, 87, 166, 245, 324, 403, 481], 560),
        (408, 493, [4, 82, 157, 228, 299, 370, 437, 499], 560)]),
    'bala_ametralladora': ('armas_vfx.png', 'centro', [(4, 34, [4], 35)]),
    # Proyectiles de las armas de armas_varias (Armas.js).
    'cohete': ('armas_vfx.png', 'centro', [(356, 372, [4, 65], 117)]),
    'granada': ('armas_vfx.png', 'centro', [(265, 294, [4], 19)]),
    'llamarada': ('armas_vfx.png', 'centro', [(489, 522, [4, 36, 82, 140, 201, 266, 338, 402, 470], 536)]),
    # El fogonazo de la escopeta de Metal Slug (la versión normal, gris) y el
    # tajo de la espada Zantetsu (para el machete).
    'escopetazo': ('armas_vfx.png', 'izquierda', [
        (4156, 4219, [5, 78, 155, 242, 333, 426], 520),
        (4224, 4287, [5, 103, 188, 272, 346, 405], 487)]),
    'tajo': ('armas_vfx.png', 'centro', [(3960, 4023, [4, 12, 25, 37, 47, 72], 100)]),
    'sangre_salpicon': ('sangre.gif', 'centro', [(0, 39, [83, 135, 188, 238, 283, 329, 371], 420)]),
    'sangre_chorro': ('sangre.gif', 'centro', [(94, 129, [65, 89, 125, 161, 204, 250, 294, 340, 382, 424], 460)]),
    'sangre_estallido': ('sangre.gif', 'centro', [(140, 241, [58, 141, 238, 347], 460), (256, 365, [0, 122, 254, 382], 504)]),
}


def sin_fondo(img):
    img = img.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a < 10 or (g > 200 and r < 60 and b < 60):
                px[x, y] = (0, 0, 0, 0)
    return img


def main():
    fuentes = {}
    for nombre, (archivo, apoyo, bandas) in EFECTOS.items():
        if archivo not in fuentes:
            fuentes[archivo] = sin_fondo(Image.open(CARPETA + archivo))
        hoja = fuentes[archivo]
        cuadros = []
        for y0, y1, inicios, fin in bandas:
            banda = hoja.crop((0, y0, hoja.width, y1))
            for a, b in zip(inicios, inicios[1:] + [fin]):
                c = banda.crop((a, 0, b, banda.height))
                caja = c.getbbox()
                # Apoyado abajo: se conserva la base de la banda (el piso).
                cuadros.append(c.crop((caja[0], caja[1], caja[2], c.height if apoyo == 'abajo' else caja[3])))
        ancho = max(c.width for c in cuadros)
        alto = max(c.height for c in cuadros)
        salida = Image.new('RGBA', (ancho * len(cuadros), alto))
        for i, c in enumerate(cuadros):
            y = alto - c.height if apoyo == 'abajo' else (alto - c.height) // 2
            x = 0 if apoyo == 'izquierda' else (ancho - c.width) // 2
            salida.paste(c, (i * ancho + x, y))
        salida.save(f'{CARPETA}{nombre}.png')
        print(f"{nombre}: {len(cuadros)} cuadros de {ancho}x{alto}")


if __name__ == '__main__':
    main()
