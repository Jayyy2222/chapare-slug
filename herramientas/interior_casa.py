"""Prepara assets/fondos/interior_casa.jpeg (interior de la casa de ladrillo) para el juego.

La imagen original (1792x592) se achica a la mitad (896x296), a la misma escala
de arte que los otros interiores: la puerta (~160 px de alto en el original)
queda de ~80 px de arte, y la escena Interior la dibuja a x1.5 (~120 px, a
escala del soldado). Bordes nítidos y paleta reducida, como pixel art.

Guarda assets/fondos/Interiores/casa_ladrillo.png. Las medidas de colisión
(INTERIORES.casa_ladrillo en Interior.js) están en píxeles de esa imagen.

Uso (desde la raíz del proyecto):  python3 herramientas/interior_casa.py
"""
from PIL import Image

ENTRADA = 'assets/fondos/interior_casa.jpeg'
SALIDA = 'assets/fondos/Interiores/casa_ladrillo.png'
COLORES = 200


def main():
    img = Image.open(ENTRADA).convert('RGB')
    chica = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    chica = chica.quantize(COLORES, method=Image.Quantize.MEDIANCUT).convert('RGB')
    chica.save(SALIDA)
    print(f'{SALIDA}: {chica.size}')


if __name__ == '__main__':
    main()
