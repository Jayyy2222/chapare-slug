"""Objetos para el Nivel 1, recortados de láminas sobre fondo magenta.

Entradas (assets/fondos/lvl1/):
  objetos_chapare.jpeg  aldea: puesto de frutas, mototaxi, combi, hamaca...
                        (el horno de barro no va)
  objetos2.jpeg         campamento: atalaya, carpa, radio, jeep quemado
  objetos3.jpeg         cobertura: barricada de llantas, muros de sacos, turriles
  objeto4.jpeg          cajas, galpones de calamina, escombros, reflector
Salida: assets/fondos/lvl1/objetos/<nombre>.png, transparentes y a la escala
de arte del juego (Nivel1 los dibuja a ESCALA = 2, como los demás props), y
objetos.json con el tamaño de cada uno.

Cada lámina está dibujada a otra escala: cada objeto lleva la suya para que
queden proporcionados con el jugador (~56 px de arte de alto).

Uso: python3 herramientas/objetos_chapare.py
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from recorte_sprites import es_fondo, sin_tinte_magenta  # noqa: E402

RAIZ = os.path.join(os.path.dirname(__file__), '..')
CARPETA = os.path.join(RAIZ, 'assets/fondos/lvl1')
SALIDA = os.path.join(CARPETA, 'objetos')

# Por lámina: { nombre: ([x0, y0, x1, y1] en la lámina, escala lámina -> arte) }.
# La caja va por encima del nombre escrito (si lo tiene).
LAMINAS = {
    'objetos_chapare.jpeg': {
        'puesto_frutas': ([15, 15, 405, 320], 0.31),
        'mototaxi': ([410, 110, 695, 320], 0.31),
        'combi_vieja': ([698, 60, 1015, 320], 0.31),
        'hamaca': ([1025, 110, 1295, 320], 0.31),
        'banca_mesa': ([1298, 200, 1570, 320], 0.31),
        # horno de barro: no va
        'cajas_platano': ([325, 395, 605, 610], 0.31),
        'turril_lluvia': ([635, 415, 780, 610], 0.31),
        'tendedero': ([800, 370, 1110, 610], 0.31),
        'letrero': ([1125, 370, 1300, 610], 0.31),
        'cerca': ([1320, 450, 1560, 610], 0.31),
    },
    'objetos2.jpeg': {
        'atalaya': ([20, 60, 415, 625], 0.29),
        'carpa': ([420, 100, 875, 610], 0.29),
        'radio': ([855, 25, 1145, 625], 0.29),
        'jeep_quemado': ([1148, 365, 1570, 625], 0.29),
    },
    'objetos3.jpeg': {
        'barricada_tablas': ([30, 20, 510, 305], 0.19),
        'sacos_bajo': ([530, 140, 1010, 305], 0.19),
        'sacos_alto': ([1035, 30, 1550, 305], 0.19),
        'sacos_pila': ([35, 405, 435, 595], 0.19),
        'sacos_pila2': ([475, 400, 815, 595], 0.19),
        'turril_oxidado': ([865, 355, 1020, 595], 0.19),
        'turril_tirado': ([1070, 415, 1345, 595], 0.19),
        'turril_tnt': ([1385, 355, 1540, 595], 0.19),
    },
    'objeto4.jpeg': {
        'caja_madera': ([20, 25, 320, 315], 0.15),
        'caja_rota': ([345, 25, 705, 330], 0.15),
        'galpon': ([730, 20, 1265, 325], 0.25),
        'galpon_roto': ([25, 340, 670, 645], 0.25),
        'escombros': ([715, 355, 1265, 650], 0.22),
        'reflector': ([1295, 35, 1565, 620], 0.125),
    },
}

# Manchas sueltas más chicas que esto (px de la lámina) se borran (restos
# del JPEG y de las letras).
MANCHA_MINIMA = 60


def componentes(mascara, w, h):
    """Grupos de píxeles opacos conectados (4 vecinos): lista de listas."""
    visto = bytearray(w * h)
    grupos = []
    for inicio in range(w * h):
        if not mascara[inicio] or visto[inicio]:
            continue
        pila = [inicio]
        visto[inicio] = 1
        grupo = []
        while pila:
            i = pila.pop()
            grupo.append(i)
            x, y = i % w, i // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if mascara[j] and not visto[j]:
                        visto[j] = 1
                        pila.append(j)
        grupos.append(grupo)
    return grupos


def recortar(lamina, caja, escala):
    img = lamina.crop(caja).convert('RGBA')
    w, h = img.size
    px = img.load()
    mascara = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if not es_fondo(r, g, b):
                mascara[y * w + x] = 1
    # Se quedan las manchas grandes (el objeto); el resto, transparente.
    for grupo in componentes(mascara, w, h):
        if len(grupo) < MANCHA_MINIMA:
            for i in grupo:
                mascara[i] = 0
    for y in range(h):
        for x in range(w):
            if not mascara[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
    img = sin_tinte_magenta(img)
    img = img.crop(img.getbbox())
    # Achicar premultiplicado (los bordes no se oscurecen) y alfa dura (pixel art).
    nuevo = (max(1, round(img.width * escala)), max(1, round(img.height * escala)))
    chico = img.convert('RGBa').resize(nuevo, Image.BOX).convert('RGBA')
    p = chico.load()
    for y in range(chico.height):
        for x in range(chico.width):
            r, g, b, a = p[x, y]
            p[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return chico.crop(chico.getbbox())


def main():
    os.makedirs(SALIDA, exist_ok=True)
    datos = {}
    for archivo, objetos in LAMINAS.items():
        lamina = Image.open(os.path.join(CARPETA, archivo)).convert('RGB')
        for nombre, (caja, escala) in objetos.items():
            img = recortar(lamina, caja, escala)
            img.save(os.path.join(SALIDA, nombre + '.png'))
            datos[nombre] = {'ancho': img.width, 'alto': img.height, 'lamina': archivo}
            print(f'{nombre:17s} {img.width:4d} x {img.height:4d}')
    with open(os.path.join(SALIDA, 'objetos.json'), 'w') as f:
        json.dump(datos, f, indent=1)


if __name__ == '__main__':
    main()
