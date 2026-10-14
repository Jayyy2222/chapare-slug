"""Caja de madera más chica (a la altura de la cintura del soldado).

Toma la caja del tileset cálido (54x54 px de arte), la achica a TAMANO con
buen filtro, deja los bordes nítidos y reduce la paleta, y le vuelve a
poner el contorno oscuro. Guarda assets/fondos/lvl1/caja_chica.png.

Uso (desde la raíz del proyecto):  python3 herramientas/caja_chica.py
"""
from PIL import Image

LVL1 = 'assets/fondos/lvl1/'
TAMANO = 38          # px de arte (76 en pantalla): la cintura del soldado
CONTORNO = (36, 23, 0, 255)


def main():
    tileset = Image.open(LVL1 + 'tileset_selva_64_calido.png').convert('RGBA')
    caja = tileset.crop((3 * 64, 2 * 64, 4 * 64, 3 * 64))   # cuadro 19
    caja = caja.crop(caja.getbbox())
    chica = caja.resize((TAMANO, TAMANO), Image.LANCZOS)
    alfa = chica.getchannel('A').point(lambda a: 255 if a > 100 else 0)
    color = chica.convert('RGB').quantize(20, method=Image.Quantize.MEDIANCUT).convert('RGBA')
    color.putalpha(alfa)
    px = color.load()
    for x in range(TAMANO):        # contorno nítido en el borde
        for y in (0, TAMANO - 1):
            if px[x, y][3]:
                px[x, y] = CONTORNO
    for y in range(TAMANO):
        for x in (0, TAMANO - 1):
            if px[x, y][3]:
                px[x, y] = CONTORNO
    color.save(LVL1 + 'caja_chica.png')
    print('caja_chica.png:', color.size)


if __name__ == '__main__':
    main()
