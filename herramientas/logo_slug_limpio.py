"""Borra el aguayo que quedó pegado a la pieza SLUG (assets/menu/logo/slug.png)
al recortarla de titulo2.jpeg: el que se ve por el hueco entre la L y la U,
dentro de la U y la franja de abajo. En el menú el aguayo es otra pieza que va
DEBAJO de las letras, así que slug.png tiene que ser solo letras + su sombra.

Correr después de logo_piezas.py. Es idempotente.

Uso (desde la raíz del proyecto):  python3 herramientas/logo_slug_limpio.py
"""
from PIL import Image

RUTA = 'assets/menu/logo/slug.png'

# Rectángulos (x0, y0, x1, y1) en px de slug.png que son solo aguayo: se borran enteros.
BORRAR = [
    (246, 60, 342, 108),   # hueco entre la L y la U
    (410, 60, 449, 108),   # adentro de la U
    (175, 166, 525, 186),  # franja de aguayo debajo de las letras
]
# Zonas donde el aguayo se mezcla con la sombra negra de las letras: se borran
# solo los píxeles que no son oscuros (la sombra queda).
SOLO_COLOR = [
    (336, 108, 372, 166),  # triángulo entre el pie de la L y la U
    (175, 150, 525, 166),  # borde de abajo, bajo la sombra
]
OSCURO = 60  # luminancia máxima de la sombra
MOTA = 40    # manchas opacas sueltas más chicas que esto (px) se borran


def borrar_motas(img):
    """Borra las motitas opacas que quedan sueltas (restos del aguayo)."""
    px = img.load()
    visto = set()
    for y0 in range(img.height):
        for x0 in range(img.width):
            if (x0, y0) in visto or px[x0, y0][3] == 0:
                continue
            mancha, pila = [], [(x0, y0)]
            visto.add((x0, y0))
            while pila:
                x, y = pila.pop()
                mancha.append((x, y))
                for v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= v[0] < img.width and 0 <= v[1] < img.height and v not in visto and px[v][3]:
                        visto.add(v)
                        pila.append(v)
            if len(mancha) < MOTA:
                for v in mancha:
                    px[v] = (0, 0, 0, 0)


def main():
    img = Image.open(RUTA).convert('RGBA')
    px = img.load()
    for x0, y0, x1, y1 in BORRAR:
        for y in range(y0, min(y1, img.height)):
            for x in range(x0, min(x1, img.width)):
                px[x, y] = (0, 0, 0, 0)
    for x0, y0, x1, y1 in SOLO_COLOR:
        for y in range(y0, min(y1, img.height)):
            for x in range(x0, min(x1, img.width)):
                r, g, b, a = px[x, y]
                if a and 0.299 * r + 0.587 * g + 0.114 * b > OSCURO:
                    px[x, y] = (0, 0, 0, 0)
    borrar_motas(img)
    img = img.crop(img.getbbox())
    img.save(RUTA)
    print('slug.png limpio', img.size)


if __name__ == '__main__':
    main()
