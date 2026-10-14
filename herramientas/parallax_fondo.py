"""Convierte assets/fondos/lv1.jpeg en capas de parallax para el Nivel 1.

Genera en assets/fondos/ (al tamaño original, sin reescalar ni desenfocar):
  nivel1_lejano.png  -> niebla y selva lejana, se mueve lento
  nivel1_selva.png   -> árboles, lianas y ruinas; la niebla queda transparente
  nivel1_piso.png    -> piso de piedra donde camina el jugador

Cada capa se duplica en espejo para que se repita sin cortes en un tileSprite.

Uso (desde la raíz del proyecto):  python3 herramientas/parallax_fondo.py
"""
from PIL import Image, ImageFilter

FONDOS = 'assets/fondos/'
CORTE_PISO = 484     # fila de lv1.jpeg donde empieza el piso de piedra
UMBRAL_SELVA = 125   # brillo bajo el cual un pixel pertenece a la capa "selva"
VENTANA = 90         # ancho (px) para promediar la niebla que rellena huecos


def espejo(img):
    """Pega la imagen con su reflejo horizontal para que sea repetible."""
    out = Image.new(img.mode, (img.width * 2, img.height))
    out.paste(img, (0, 0))
    out.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (img.width, 0))
    return out


def main():
    img = Image.open(FONDOS + 'lv1.jpeg').convert('RGB')
    W, H = img.size
    px = img.load()

    # Máscara de la capa selva: pixeles oscuros (árboles, lianas, rocas).
    mascara = Image.new('L', (W, H), 0)
    m = mascara.load()
    for y in range(CORTE_PISO):
        for x in range(W):
            r, g, b = px[x, y]
            if 0.3 * r + 0.59 * g + 0.11 * b < UMBRAL_SELVA:
                m[x, y] = 255
    mascara = mascara.filter(ImageFilter.ModeFilter(5))  # quita pixeles sueltos

    selva = img.convert('RGBA')
    selva.putalpha(mascara)

    # Capa lejana: se conserva la niebla tal cual; donde había árboles se rellena
    # con el promedio de la niebla cercana en la misma fila (sin desenfoque).
    hueco = mascara.filter(ImageFilter.MaxFilter(5)).load()
    lejano = img.copy()
    lp = lejano.load()
    for y in range(H):
        suma = [[0, 0, 0, 0]]
        for x in range(W):
            s = suma[-1][:]
            if not hueco[x, y]:
                r, g, b = px[x, y]
                s = [s[0] + r, s[1] + g, s[2] + b, s[3] + 1]
            suma.append(s)
        for x in range(W):
            if not hueco[x, y]:
                continue
            a, b_ = max(0, x - VENTANA), min(W, x + VENTANA)
            n = suma[b_][3] - suma[a][3]
            if n:
                lp[x, y] = tuple((suma[b_][i] - suma[a][i]) // n for i in range(3))
            elif y:
                lp[x, y] = lp[x, y - 1]
    lejano = Image.blend(lejano, Image.new('RGB', (W, H), (189, 193, 160)), 0.15)

    piso = img.crop((0, CORTE_PISO, W, H))

    espejo(lejano).save(FONDOS + 'nivel1_lejano.png')
    espejo(selva).save(FONDOS + 'nivel1_selva.png')
    espejo(piso).save(FONDOS + 'nivel1_piso.png')
    print(f'Capas de {W * 2}x{H}px; el piso empieza en y={CORTE_PISO}')


if __name__ == '__main__':
    main()
