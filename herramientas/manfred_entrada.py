"""Hojas de la entrada de Manfred (Cinematica.js y Nivel1.entradaHelicoptero)
a partir de las tiras sobre magenta de assets/personajes/jugador/manfred/:
  entrada.jpeg   4 cuadros: el helicóptero (Huey boliviano) con el rotor girando
  entrada1.jpeg  6 cuadros de Manfred: baja por la soga (2), se suelta, cae
                 agachado (polvo), se para, saluda

Guarda en la misma carpeta:
  helicoptero_sheet.png     los 4 cuadros en celdas iguales (a ESCALA_HELI del
                            jpeg; el juego lo dibuja al doble)
  manfred_entrada.png       los 6 de Manfred en celdas iguales, a la escala de
                            sus otras hojas (px de pantalla), apoyados abajo:
                            los de la soga con la soga en el centro de la
                            celda; los otros, con los pies en el centro
  entrada_cuadros.json      celdas y el punto de la soga del helicóptero (el
                            extremo de la soga enrollada, px de la celda)

La soga de las manos de Manfred venía en magenta (queda transparente): la
dibuja el juego detrás de él, así se ve entre las manos.

Uso (desde la raíz del proyecto):
  PYTHONPATH=herramientas python3 herramientas/manfred_entrada.py
"""
import json

from PIL import Image

from recorte_sprites import a_pixel_art, centro_pies, por_manchas, quitar_fondo, sin_tinte_magenta

CARPETA = 'assets/personajes/jugador/manfred/'
ESCALA_HELI = 0.68          # el juego lo dibuja x2: ~540 px de ancho
ALTO_MANFRED = 128          # px de pantalla de pie (cuadro 4), como el idle
ALTO_PIE_JPEG = 515         # alto del cuadro 4 en el jpeg
CON_SOGA = 2                # los primeros cuadros van colgados de la soga
MARGEN = 2


def tira(nombre):
    img = sin_tinte_magenta(quitar_fondo(Image.open(CARPETA + nombre)))
    img.paste((0, 0, 0, 0), (0, 0, img.width, 6))  # borde del jpeg
    return img


def x_soga(cuadro):
    """La soga (transparente) entre las manos: la columna de los huecos
    angostos dentro del cuerpo, en la franja del medio del cuadro."""
    px = cuadro.load()
    w, h = cuadro.size
    xs = []
    for y in range(int(h * 0.38), int(h * 0.62)):
        fila = [px[x, y][3] > 0 for x in range(w)]
        x = 0
        while x < w:
            if not fila[x]:
                x0 = x
                while x < w and not fila[x]:
                    x += 1
                if 0 < x0 and x < w and 2 <= x - x0 <= 14:
                    xs.append((x0 + x) / 2)
            x += 1
    xs.sort()
    return xs[len(xs) // 2] if xs else w / 2


def celdas(cuadros, anclas):
    """Celdas iguales con cada ancla en el centro y todo apoyado abajo."""
    medio = round(max(max(a, c.width - a) for c, a in zip(cuadros, anclas))) + MARGEN
    ancho, alto = medio * 2, max(c.height for c in cuadros) + MARGEN
    hoja = Image.new('RGBA', (ancho * len(cuadros), alto))
    for i, (c, a) in enumerate(zip(cuadros, anclas)):
        hoja.alpha_composite(c, (i * ancho + round(medio - a), alto - c.height - 1))
    return hoja, ancho, alto


def main():
    # Helicóptero: lo de arriba (el rotor) es lo que cambia; todos apoyados
    # abajo y centrados en la soga.
    helis = por_manchas(tira('entrada.jpeg'), 20000, lejos=60)
    helis = [a_pixel_art(c, (round(c.width * ESCALA_HELI), round(c.height * ESCALA_HELI)), 64) for c in helis]
    sogas = [centro_pies(c, 0.95) for c in helis]
    hoja, ancho_h, alto_h = celdas(helis, sogas)
    hoja.save(CARPETA + 'helicoptero_sheet.png')

    escala = ALTO_MANFRED / ALTO_PIE_JPEG
    manfreds = por_manchas(tira('entrada1.jpeg'), 20000, lejos=50)
    anclas_m, chicos = [], []
    for i, c in enumerate(manfreds):
        chico = a_pixel_art(c, (round(c.width * escala), round(c.height * escala)))
        chicos.append(chico)
        anclas_m.append(x_soga(chico) if i < CON_SOGA else centro_pies(chico, 0.9))
    hoja_m, ancho_m, alto_m = celdas(chicos, anclas_m)
    hoja_m.save(CARPETA + 'manfred_entrada.png')

    datos = {
        'helicoptero': {'ancho': ancho_h, 'alto': alto_h, 'cuadros': len(helis), 'soga': [ancho_h // 2, alto_h - 1]},
        'manfred': {'ancho': ancho_m, 'alto': alto_m, 'cuadros': len(chicos)},
    }
    json.dump(datos, open(CARPETA + 'entrada_cuadros.json', 'w'), indent=1)
    print(datos, [round(a, 1) for a in anclas_m])


if __name__ == '__main__':
    main()
