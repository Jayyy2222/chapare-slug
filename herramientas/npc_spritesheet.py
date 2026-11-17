"""Convierte las tiras de los NPC (cuadros de distinto ancho, sin grilla) en
spritesheets de celdas iguales, con los pies alineados.

Lee assets/personajes/npc/rescate.png y saledepantalla.png y guarda
  rescate_sheet.png, saledepantalla_sheet.png  (celdas de ANCHO x ALTO)
  npc_cuadros.json                             (tamaño de celda y cantidad de cuadros)

Cómo corta: busca columnas vacías para separar los cuadros; los trozos muy
angostos (el polvo que levanta el poncho) se juntan con el cuadro siguiente.
Cada cuadro se pega con la base en el borde de abajo de la celda y centrado
según los pies (las filas de más abajo), así el personaje no "salta" al
cambiar de cuadro aunque las sogas o el poncho lo hagan más ancho.

Las tiras originales no son pixel art real (miles de colores, sin bloques):
cada celda se achica a la escala de arte del juego (ESCALA_ARTE), se dejan
los bordes nítidos (alfa 0 o 255) y se reduce la paleta. En el juego se
dibujan a x2, como el soldado, así quedan de su tamaño y con píxeles iguales.

Uso (desde la raíz del proyecto):  python3 herramientas/npc_spritesheet.py
"""
import json

from PIL import Image

CARPETA = 'assets/personajes/npc/'
TIRAS = ['rescate', 'saledepantalla']
TROZO_MINIMO = 20   # px: más angosto que esto se une al cuadro siguiente
MARGEN = 4
ESCALA_ARTE = 0.37  # Manfred mide 62 px de arte: el NPC parado ~60 (1,70 m), sentado ~54
COLORES = 48


def cortar(img):
    ancho, alto = img.size
    px = img.load()
    vacia = [all(px[x, y][3] == 0 for y in range(alto)) for x in range(ancho)]
    trozos, inicio = [], None
    for x, v in enumerate(vacia + [True]):
        if not v and inicio is None:
            inicio = x
        if v and inicio is not None:
            trozos.append([inicio, x])
            inicio = None
    cuadros = []
    pendiente = None
    for a, b in trozos:
        if pendiente is not None:
            a, pendiente = pendiente, None
        if b - a < TROZO_MINIMO:
            pendiente = a  # polvo suelto: va con el cuadro de la derecha
            continue
        cuadros.append(img.crop((a, 0, b, alto)))
    return [c.crop(c.getbbox()) for c in cuadros]


def centro_pies(cuadro):
    """x promedio de los píxeles del cuarto de abajo."""
    ancho, alto = cuadro.size
    px = cuadro.load()
    xs = [x for y in range(int(alto * 0.75), alto) for x in range(ancho) if px[x, y][3]]
    return sum(xs) / len(xs) if xs else ancho / 2


def a_pixel_art(celda, tamano):
    """Achica con buen filtro, bordes nítidos y paleta reducida."""
    chica = celda.resize(tamano, Image.LANCZOS)
    alfa = chica.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    color = chica.convert('RGB').quantize(COLORES, method=Image.Quantize.MEDIANCUT).convert('RGB')
    resultado = color.convert('RGBA')
    resultado.putalpha(alfa)
    return resultado


def main():
    tiras = {nombre: cortar(Image.open(CARPETA + nombre + '.png').convert('RGBA')) for nombre in TIRAS}
    todos = [c for cuadros in tiras.values() for c in cuadros]
    # Celda común: lo bastante ancha para el cuadro más ancho visto desde sus pies.
    medio = max(max(centro_pies(c), c.width - centro_pies(c)) for c in todos)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(c.height for c in todos) + MARGEN
    chico = (round(ancho * ESCALA_ARTE), round(alto * ESCALA_ARTE))
    datos = {'ancho': chico[0], 'alto': chico[1]}
    for nombre, cuadros in tiras.items():
        hoja = Image.new('RGBA', (chico[0] * len(cuadros), chico[1]))
        for i, c in enumerate(cuadros):
            celda = Image.new('RGBA', (ancho, alto))
            celda.paste(c, (round(ancho / 2 - centro_pies(c)), alto - c.height), c)
            hoja.paste(a_pixel_art(celda, chico), (i * chico[0], 0))
        hoja.save(CARPETA + nombre + '_sheet.png')
        datos[nombre] = len(cuadros)
        print(f'{nombre}_sheet.png: {len(cuadros)} cuadros de {chico[0]}x{chico[1]}')
    with open(CARPETA + 'npc_cuadros.json', 'w') as f:
        json.dump(datos, f)


if __name__ == '__main__':
    main()
