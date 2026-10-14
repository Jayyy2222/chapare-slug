"""Convierte las tiras de Manfred (segundo jugador) en los sprites del juego.

Lee de assets/personajes/jugador/ (cuadros sobre fondo magenta, con una sombra
pintada bajo los pies):
  manfred.jpeg          8 cuadros: caminar con la metralleta
  manfred_correr.jpeg   8 cuadros: correr (SHIFT)
  manfred_salto.jpeg    6 cuadros: agacharse, subir, arriba, bajar, caer, aterrizar
  manfred_ataque.jpeg   4 cuadros: apuntar, disparo (fogonazo), retroceso, apuntar
y guarda
  manfred_sheet.png         todos en una fila de celdas de 84x84 (orden: TIRAS)
  manfred_sheet_calido.png  el mismo con los colores del nivel (calentar() de
                            calidez_chapare.py): es el que usa Nivel1
  assets/seleccion/2/caminar_0.png ... caminar_7.png  cuadros sueltos de 64x64
                            para la pantalla de selección

Los cuadros de cada tira van en una grilla de celdas iguales, pero la
metralleta de uno llega hasta la espalda del siguiente: no se pueden separar
por columnas vacías. En cada fila se corta en el hueco de fondo más ancho cerca
del borde de la celda, justo donde empieza la espalda del cuadro de la derecha;
en las filas donde se tocan (la punta del arma) se interpola desde las de
arriba y abajo. En correr y saltar se borran además las manchas chicas
sueltas (el polvo de los pies, restos del vecino) y se alinean por la cabeza
(con las piernas abiertas el centro de los pies baila de un cuadro a otro).

En la celda de 84x84 los pies quedan donde los tiene el soldado (x 38, y 72),
así Nivel1 usa la misma caja de colisión para todos los cuadros. Escala: el
cuadro más alto de caminar mide ALTO_ARTE; correr y saltar tienen la misma
resolución que caminar y usan la misma escala; ataque está dibujado a la
mitad, así que se escala para que su primer cuadro (parado) mida lo mismo que
el primero de caminar.

Uso (desde la raíz del proyecto):  python3 herramientas/manfred_spritesheet.py
"""
import os

from PIL import Image

from calidez_chapare import SATURACION_JUGADOR, calentar
from recorte_sprites import a_pixel_art, centro_cabeza, centro_pies, cortar_sombra, quitar_fondo, separar_por_costuras

CARPETA = 'assets/personajes/jugador/'
SELECCION = 'assets/seleccion/2/'
# nombre, archivo, cuadros, si se limpia el polvo. El orden es el de la hoja:
# caminar 0-7, correr 8-15, saltar 16-21, ataque 22-25 (ver MANFRED en Nivel1.js).
TIRAS = [
    ('caminar', 'manfred.jpeg', 8, False),
    ('correr', 'manfred_correr.jpeg', 8, True),
    ('saltar', 'manfred_salto.jpeg', 6, True),
    ('ataque', 'manfred_ataque.jpeg', 4, False)
]
CELDA = 84
PIES = (38, 72)       # dónde van los pies en la celda (como el soldado)
ALTO_ARTE = 62        # px de arte del cuadro más alto de caminar (sube la pierna: queda como el soldado)
CELDA_SELECCION = 64
POLVO = 0.1           # manchas de menos de este % del cuadro: polvo o restos del vecino, se borran


def a_celda(c, escala, nombre, cabeza):
    """El cuadro en una celda de CELDA x CELDA con los pies en PIES. Si se da
    `cabeza` (px de arte delante de los pies), se alinea por la cabeza: al
    correr y saltar las piernas se abren y el centro de los pies baila."""
    grande = round(CELDA / escala)
    if cabeza is None:
        x = round(PIES[0] / escala - centro_pies(c))
    else:
        x = round((PIES[0] + cabeza) / escala - centro_cabeza(c))
    y = round(PIES[1] / escala) - c.height
    if x < 0 or y < 0 or x + c.width > grande:
        print(f'  ojo: un cuadro de {nombre} no entra entero en la celda')
    celda = Image.new('RGBA', (grande, grande))
    celda.paste(c, (x, y), c)
    return a_pixel_art(celda, (CELDA, CELDA))


def main():
    tiras = {nombre: separar_por_costuras(cortar_sombra(quitar_fondo(Image.open(CARPETA + archivo))), n,
                                          POLVO if limpiar else 0)
             for nombre, archivo, n, limpiar in TIRAS}
    caminar = tiras['caminar']
    escala = ALTO_ARTE / max(c.height for c in caminar)
    escalas = {nombre: escala for nombre in tiras}
    escalas['ataque'] = escala * caminar[0].height / tiras['ataque'][0].height
    # Dónde queda la cabeza respecto de los pies al caminar (cuadro 0).
    cabeza = (centro_cabeza(caminar[0]) - centro_pies(caminar[0])) * escala

    total = sum(len(c) for c in tiras.values())
    hoja = Image.new('RGBA', (CELDA * total, CELDA))
    os.makedirs(SELECCION, exist_ok=True)
    i = 0
    for nombre, cuadros in tiras.items():
        print(f'{nombre}: cuadros {i}-{i + len(cuadros) - 1}')
        for k, c in enumerate(cuadros):
            chico = a_celda(c, escalas[nombre], nombre, cabeza if nombre in ('correr', 'saltar') else None)
            hoja.paste(chico, (i * CELDA, 0))
            i += 1
            if nombre == 'caminar':
                # Selección: centrado por su caja (la metralleta adelante) y apoyado abajo.
                x0, y0, x1, y1 = chico.getbbox()
                suelto = Image.new('RGBA', (CELDA_SELECCION, CELDA_SELECCION))
                suelto.paste(chico.crop((x0, y0, x1, y1)), ((CELDA_SELECCION - (x1 - x0)) // 2, CELDA_SELECCION - 2 - (y1 - y0)))
                suelto.save(f'{SELECCION}caminar_{k}.png')
    hoja.save(CARPETA + 'manfred_sheet.png')
    calentar(hoja, saturacion=SATURACION_JUGADOR, con_tierra=False).save(CARPETA + 'manfred_sheet_calido.png')
    print(f'manfred_sheet.png: {total} cuadros de {CELDA}x{CELDA}; selección en {SELECCION}')


if __name__ == '__main__':
    main()
