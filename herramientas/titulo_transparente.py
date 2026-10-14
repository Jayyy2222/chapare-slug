"""Quita el fondo de cuadros grises/blancos "pintado" en assets/menu/titulo.png.

La imagen original no tiene canal alfa: el patrón de transparencia está dibujado
en los pixeles. Este script vuelve transparentes los pixeles grises claros
(poca saturación, incluida la sombra suave) y guarda assets/menu/titulo_transparente.png.

Uso (desde la raíz del proyecto):  python3 herramientas/titulo_transparente.py
"""
from PIL import Image

MENU = 'assets/menu/'
BRILLO_MIN = 110     # fondo ~197 (gris) y ~255 (blanco); la sombra suave sobre él, más oscura
SATURACION_MAX = 24  # diferencia máxima entre canales para considerarlo gris


def es_fondo(r, g, b):
    return min(r, g, b) >= BRILLO_MIN and max(r, g, b) - min(r, g, b) <= SATURACION_MAX


def main():
    img = Image.open(MENU + 'titulo.png').convert('RGBA')
    img.putdata([(r, g, b, 0) if es_fondo(r, g, b) else (r, g, b, a)
                 for r, g, b, a in img.getdata()])
    img.crop(img.getbbox()).save(MENU + 'titulo_transparente.png')


if __name__ == '__main__':
    main()
