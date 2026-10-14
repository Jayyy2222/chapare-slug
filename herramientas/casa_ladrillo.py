"""Prepara assets/fondos/casa.jpeg (casa de ladrillo sobre fondo magenta) para el juego.

1. Saca el fondo magenta (#FF00FF) con tolerancia, y le quita el tinte rosa
   que deja el JPEG en los bordes (despill).
2. Recorta lo que sobra y la achica a la escala de arte del juego: la puerta
   (203 px de alto en el original) queda de ~70 px de arte, un poco más alta
   que el soldado (58). Bordes nítidos y paleta reducida, como pixel art.
3. Guarda assets/fondos/lvl1/casa_ladrillo.png e imprime las medidas que usa
   Nivel1.js (techo, cornisa del medio, puerta), en píxeles de la imagen final.

Uso (desde la raíz del proyecto):  python3 herramientas/casa_ladrillo.py
"""
from PIL import Image

ENTRADA = 'assets/fondos/casa.jpeg'
SALIDA = 'assets/fondos/lvl1/casa_ladrillo.png'
ESCALA = 70 / 203
COLORES = 110  # alcanza para la bandera y el mural


def es_magenta(r, g, b):
    # Mucho rojo y azul, poco verde: el fondo y su borde suavizado del JPEG.
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def main():
    img = Image.open(ENTRADA).convert('RGB')
    ancho, alto = img.size
    px = img.load()
    salida = Image.new('RGBA', img.size)
    po = salida.load()
    for y in range(alto):
        for x in range(ancho):
            r, g, b = px[x, y]
            if es_magenta(r, g, b):
                continue
            # Despill: el borde rosado se lleva al gris del verde.
            limite = g + 40
            if r > limite and b > limite:
                r = b = min(r, b, limite)
            po[x, y] = (r, g, b, 255)
    recorte = salida.getbbox()
    salida = salida.crop(recorte)

    chica = salida.resize((round(salida.width * ESCALA), round(salida.height * ESCALA)), Image.LANCZOS)
    alfa = chica.getchannel('A').point(lambda a: 255 if a > 140 else 0)
    color = chica.convert('RGB').quantize(COLORES, method=Image.Quantize.MEDIANCUT).convert('RGBA')
    color.putalpha(alfa)
    color.save(SALIDA)

    print(f'{SALIDA}: {color.size}  (recorte del original en {recorte})')
    # Medidas del original (x, y), pasadas a la imagen final.
    for nombre, (x, y) in {'losa del techo': (60, 174), 'cornisa del medio': (85, 432),
                           'puerta arriba-izq': (245, 517), 'puerta abajo-der': (365, 720)}.items():
        print(f'  {nombre}: x={round((x - recorte[0]) * ESCALA)}, y={round((y - recorte[1]) * ESCALA)}')


if __name__ == '__main__':
    main()
