"""Recorta el giro de Manfred para la pantalla de selección.

Lee assets/personajes/jugador/manfred/selec_manfred.jpeg (12 vistas en dos
filas de 6, sobre fondo magenta con una sombra bajo los pies) y guarda
assets/seleccion/2/giro_0.png ... giro_11.png, cuadros sueltos de 64x64.

Todas las vistas usan la misma escala (la más alta mide ALTO_ARTE) y se
alinean por los pies: la pistola cambia de lado al girar y, si se centrara
por la caja, el cuerpo bailaría.

Uso (desde la raíz del proyecto):  python3 herramientas/manfred_seleccion.py
"""
import os

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, cortar_sombra, por_manchas, quitar_fondo

ARCHIVO = 'assets/personajes/jugador/manfred/selec_manfred.jpeg'
SELECCION = 'assets/seleccion/2/'
CUADROS = 12
CELDA = 64
ALTO_ARTE = 60        # px de la vista más alta en la celda
MINIMO = 3000         # px de una mancha para contar como vista


def main():
    hoja = quitar_fondo(Image.open(ARCHIVO))
    vistas = [cortar_sombra(v) for v in por_manchas(hoja, MINIMO, alto_fila=hoja.height // 2)]
    vistas = [v.crop(v.getbbox()) for v in vistas]
    if len(vistas) != CUADROS:
        raise SystemExit(f'se esperaban {CUADROS} vistas y salieron {len(vistas)}')
    escala = ALTO_ARTE / max(v.height for v in vistas)
    grande = round(CELDA / escala)
    os.makedirs(SELECCION, exist_ok=True)
    for k, v in enumerate(vistas):
        x = round(grande / 2 - centro_pies(v))
        y = grande - round(2 / escala) - v.height
        if x < 0 or x + v.width > grande:
            print(f'  ojo: la vista {k} no entra entera en la celda')
        celda = Image.new('RGBA', (grande, grande))
        celda.paste(v, (x, y), v)
        a_pixel_art(celda, (CELDA, CELDA)).save(f'{SELECCION}giro_{k}.png')
    print(f'{CUADROS} vistas de {CELDA}x{CELDA} en {SELECCION}')


if __name__ == '__main__':
    main()
