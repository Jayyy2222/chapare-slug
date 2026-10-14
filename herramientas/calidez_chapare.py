"""Versiones cálidas (estilo Chapare: trópico húmedo, sol dorado, tierra rojiza)
del fondo y el tileset del Nivel 1.

Lee de assets/fondos/lvl1/ y guarda, sin reescalar ni desenfocar:
  selva_fondo_288_calido.png   -> fondo con bruma dorada que baja desde arriba
  tileset_selva_64_calido.png  -> mismos colores que el fondo, sin la bruma
Y también el jugador (sin bruma), para que combine con el nivel:
  assets/personajes/jugador/1_sheet.png -> 1_sheet_calido.png

Uso (desde la raíz del proyecto):  python3 herramientas/calidez_chapare.py
"""
import colorsys

from PIL import Image

LVL1 = 'assets/fondos/lvl1/'
JUGADOR = 'assets/personajes/jugador/'
SATURACION = 1.25            # colores más vivos en general
SATURACION_TIERRA = 1.35     # extra para marrones y naranjas (tierra roja del Chapare)
SATURACION_JUGADOR = 1.08     # el personaje apenas más saturado
GIRO_TIERRA = -0.02          # marrones un poco más rojizos
SOMBRAS = (12, 0, -10)       # zonas oscuras hacia marrón rojizo
LUCES = (20, 10, -22)        # zonas claras hacia el dorado del sol
BRUMA = (255, 176, 80)       # luz de sol filtrada por la humedad
BRUMA_MAX = 0.14             # opacidad de la bruma arriba del fondo (abajo es 0)


def calentar_pixel(r, g, b, a, saturacion=SATURACION, con_tierra=True):
    if a == 0:
        return (r, g, b, a)
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    tierra = con_tierra and h < 0.11 and s > 0.15
    s = min(1.0, s * saturacion * (SATURACION_TIERRA if tierra else 1))
    if tierra:
        h = (h + GIRO_TIERRA) % 1
    r, g, b = (c * 255 for c in colorsys.hsv_to_rgb(h, s, v))

    # Virado de color: las sombras a marrón rojizo y las luces a dorado.
    color = [c + SOMBRAS[i] * (1 - v) + LUCES[i] * v for i, c in enumerate((r, g, b))]
    return tuple(max(0, min(255, round(c))) for c in color) + (a,)


def calentar(img, **opciones):
    out = Image.new('RGBA', img.size)
    out.putdata([calentar_pixel(*p, **opciones) for p in img.getdata()])
    return out


def bruma_dorada(img):
    """Mezcla un degradado dorado, fuerte arriba y nulo abajo."""
    W, H = img.size
    color = Image.new('RGBA', (W, H), BRUMA + (255,))
    mascara = Image.new('L', (W, H))
    mascara.putdata([int(255 * BRUMA_MAX * (1 - y / H) ** 1.5) for y in range(H) for _ in range(W)])
    return Image.composite(color, img, mascara)


def main():
    fondo = Image.open(LVL1 + 'selva_fondo_288.png').convert('RGBA')
    bruma_dorada(calentar(fondo)).save(LVL1 + 'selva_fondo_288_calido.png')

    tileset = Image.open(LVL1 + 'tileset_selva_64.png').convert('RGBA')
    calentar(tileset).save(LVL1 + 'tileset_selva_64_calido.png')

    jugador = Image.open(JUGADOR + '1_sheet.png').convert('RGBA')
    # Al personaje solo se le da la luz cálida: sin el refuerzo de "tierra",
    # que le pondría la piel roja.
    calentar(jugador, saturacion=SATURACION_JUGADOR, con_tierra=False).save(JUGADOR + '1_sheet_calido.png')


if __name__ == '__main__':
    main()
