"""Objetos del Nivel 2 (Potosí) recortados de assets/fondos/potosi/objetos_potosi.jpeg
(lámina sobre fondo magenta). La fila 5 (las cuevas) no va.

Salida en assets/fondos/potosi/ (el Nivel 2 dibuja a escala 1: px de la
imagen = px del mundo; el jugador mide ~112 px):
  obj_<nombre>.png     objetos sueltos (sacos, escombros, turriles, cajas)
  hoja_<nombre>.png    animaciones en una fila de celdas iguales (bandera,
                       reflector, palomas, pileta, farol, llama, explosión)
  objetos_potosi.json  celda y cuadros de cada hoja

Uso: python3 herramientas/objetos_potosi.py
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from recorte_sprites import es_fondo, sin_tinte_magenta  # noqa: E402

RAIZ = os.path.join(os.path.dirname(__file__), '..')
CARPETA = os.path.join(RAIZ, 'assets/fondos/potosi')
ENTRADA = os.path.join(CARPETA, 'objetos_potosi.jpeg')

# Bandas de cada fila de la lámina (y0, y1).
F1, F2, F3, F4, F6 = (8, 132), (145, 262), (272, 382), (395, 512), (638, 755)

# Sueltos: nombre -> (x0, x1, fila, escala).
SUELTOS = {
    'sacos_verdes': (26, 266, F1, 0.65),
    'escombros_carreta': (316, 650, F1, 0.65),
    'turril_viejo': (723, 797, F1, 0.7),
    'turril_rojo': (866, 937, F1, 0.7),
    'caja_botin': (994, 1118, F1, 0.6),
    'caja_botin_abierta': (1160, 1316, F1, 0.6),
    'turril_viejo2': (45, 118, F2, 0.7),
}

# Hojas: nombre -> ([(x0, x1), ...], fila, escala, alineación, luz).
# alineación: 'abajo' (centro de los pies) o 'izquierda' (el poste o el
# trípode a la izquierda, como la bandera y el reflector). luz: el haz o el
# resplandor sobre el magenta se separa del fondo (semitransparente).
HOJAS = {
    'bandera': ([(178, 286), (332, 451), (531, 647)], F2, 0.9, 'izquierda', False),
    'reflector': ([(724, 823), (887, 999), (1048, 1176), (1200, 1336)], F2, 0.9, 'izquierda', True),
    'palomas_comen': ([(31, 102), (131, 199), (209, 294)], F3, 0.6, 'abajo', False),
    'palomas_vuelan': ([(341, 414), (456, 526), (580, 655)], F3, 0.6, 'abajo', False),
    'pileta': ([(729, 825), (890, 986), (1049, 1145), (1207, 1302)], F3, 1.3, 'abajo', False),
    'farol_calle': ([(30, 112), (140, 200)], F4, 1.6, 'abajo', True),
    'llama_anda': ([(267, 361), (417, 510), (560, 655), (735, 829)], F4, 1.05, 'abajo', False),
    'llama_corre': ([(881, 992), (1061, 1157), (1206, 1313)], F4, 1.05, 'abajo', False),
    'turril_explota': ([(92, 158), (287, 409), (490, 657), (712, 883), (946, 1092), (1222, 1261)], F6, 0.7, 'abajo', True),
}

MANCHA_MINIMA = 25
LUZ = (255, 244, 200)  # color del haz y del resplandor


def separar_luz(px, w, h):
    """Píxeles de luz mezclada con el magenta (haz del reflector, resplandor):
    se despeja el magenta y quedan semitransparentes."""
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r > 150 and b > 150 and g < min(r, b) - 20:
                # Cuánta luz hay sobre el magenta: el verde (el magenta no tiene).
                alfa = max(0.15, min(1.0, g / 235))
                px[x, y] = LUZ + (round(alfa * 215),)


def recorte(lamina, x0, x1, fila, luz):
    img = lamina.crop((x0 - 4, fila[0], x1 + 4, fila[1])).convert('RGBA')
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if es_fondo(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    if luz:
        separar_luz(px, w, h)
    img = sin_tinte_magenta(img)
    quitar_manchas(img)
    return img.crop(img.getbbox())


def quitar_manchas(img):
    w, h = img.size
    px = img.load()
    visto = bytearray(w * h)
    for inicio in range(w * h):
        x0, y0 = inicio % w, inicio // w
        if visto[inicio] or not px[x0, y0][3]:
            continue
        pila, grupo = [inicio], []
        visto[inicio] = 1
        while pila:
            i = pila.pop()
            grupo.append(i)
            x, y = i % w, i // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                j = ny * w + nx
                if 0 <= nx < w and 0 <= ny < h and not visto[j] and px[nx, ny][3]:
                    visto[j] = 1
                    pila.append(j)
        if len(grupo) < MANCHA_MINIMA:
            for i in grupo:
                px[i % w, i // w] = (0, 0, 0, 0)


def achicar(img, escala):
    nuevo = (max(1, round(img.width * escala)), max(1, round(img.height * escala)))
    chico = img.convert('RGBa').resize(nuevo, Image.BOX).convert('RGBA')
    p = chico.load()
    for y in range(chico.height):
        for x in range(chico.width):
            r, g, b, a = p[x, y]
            if a < 40:
                p[x, y] = (0, 0, 0, 0)
    return chico


def main():
    lamina = Image.open(ENTRADA).convert('RGB')
    datos = {}
    for nombre, (x0, x1, fila, escala) in SUELTOS.items():
        img = achicar(recorte(lamina, x0, x1, fila, False), escala)
        img.save(os.path.join(CARPETA, f'obj_{nombre}.png'))
        print(f'obj_{nombre:20s} {img.width:4d} x {img.height:4d}')
    for nombre, (cuadros, fila, escala, alinear, luz) in HOJAS.items():
        imgs = [achicar(recorte(lamina, a, b, fila, luz), escala) for a, b in cuadros]
        ancho = max(i.width for i in imgs) + 2
        alto = max(i.height for i in imgs) + 1
        hoja = Image.new('RGBA', (ancho * len(imgs), alto), (0, 0, 0, 0))
        for k, i in enumerate(imgs):
            x = k * ancho + (1 if alinear == 'izquierda' else (ancho - i.width) // 2)
            hoja.alpha_composite(i, (x, alto - i.height))
        hoja.save(os.path.join(CARPETA, f'hoja_{nombre}.png'))
        datos[nombre] = {'ancho': ancho, 'alto': alto, 'cuadros': len(imgs)}
        print(f'hoja_{nombre:19s} {ancho:4d} x {alto:4d} x {len(imgs)}')
    with open(os.path.join(CARPETA, 'objetos_potosi.json'), 'w') as f:
        json.dump(datos, f, indent=1)


if __name__ == '__main__':
    main()
