"""Piezas de la pantalla de selección (CharacterSelectScene.js), sobre el fondo
assets/seleccion/seleccion1.jpeg (se ve de y 0 a 768, sin la franja de abajo:
768 px -> 576, x 3/4).

Lee de assets/seleccion/ (sobre fondo magenta):
  seleccion2.jpeg  carteles P1/P2/P3 (apagado y encendido), la persiana en 5
                   etapas (de abierta a cerrada) y dos botones (apagado, rojo)
  seleccion3.jpeg  retratos de Manfred: en gris, normal y gritando
y guarda, ya al tamaño de pantalla (las medidas de las ventanas del fondo x 3/4):
  carteles.png         6 cuadros de CARTEL
  persiana.png         5 cuadros del tamaño de la ventana (VENTANA)
  botones.png          2 cuadros de BOTON
  manfred_retratos.png 3 cuadros, todos a la misma escala: el más alto llena
                       el alto de la ventana (apoyados abajo, centrados)

Uso (desde la raíz del proyecto):  python3 herramientas/seleccion.py
"""
from PIL import Image

from recorte_sprites import a_pixel_art, quitar_fondo

CARPETA = 'assets/seleccion/'
ESCALA = 3 / 4            # 768 px del fondo en una pantalla de 576 (DISENO_SELECCION)
VENTANA = (184, 266)      # ventana del retrato: 245 x 355 en seleccion1.jpeg
CARTEL = (63, 68)
BOTON = (34, 34)
COLORES = 64
CAJAS2 = {
    'carteles': [(35, 30, 240, 248), (253, 30, 457, 247), (493, 30, 698, 248), (710, 30, 915, 248),
                 (951, 30, 1156, 248), (1168, 30, 1373, 247)],
    'persiana': [(35, 280, 240, 738), (258, 280, 463, 738), (480, 280, 685, 738), (704, 280, 903, 738),
                 (920, 280, 1121, 738)],
    'botones': [(1196, 345, 1346, 497), (1196, 540, 1346, 692)],
}
RETRATOS = [(53, 37, 397, 641), (451, 37, 832, 635), (875, 37, 1328, 661)]


def hoja(cuadros, celda):
    salida = Image.new('RGBA', (celda[0] * len(cuadros), celda[1]))
    for i, c in enumerate(cuadros):
        salida.paste(c, (i * celda[0] + (celda[0] - c.width) // 2, celda[1] - c.height), c)
    return salida


def main():
    piezas = quitar_fondo(Image.open(CARPETA + 'seleccion2.jpeg'))
    tamanos = {'carteles': CARTEL, 'persiana': VENTANA, 'botones': BOTON}
    for nombre, cajas in CAJAS2.items():
        cuadros = [a_pixel_art(piezas.crop(caja), tamanos[nombre], COLORES) for caja in cajas]
        hoja(cuadros, tamanos[nombre]).save(f'{CARPETA}{nombre}.png')
        print(f'{nombre}.png: {len(cuadros)} cuadros de {tamanos[nombre][0]}x{tamanos[nombre][1]}')

    retratos = quitar_fondo(Image.open(CARPETA + 'seleccion3.jpeg'))
    cuadros = [retratos.crop(caja) for caja in RETRATOS]
    escala = VENTANA[1] / max(c.height for c in cuadros)
    cuadros = [a_pixel_art(c, (round(c.width * escala), round(c.height * escala)), COLORES) for c in cuadros]
    celda = (max(c.width for c in cuadros), VENTANA[1])
    hoja(cuadros, celda).save(CARPETA + 'manfred_retratos.png')
    print(f'manfred_retratos.png: 3 cuadros de {celda[0]}x{celda[1]}')


if __name__ == '__main__':
    main()
