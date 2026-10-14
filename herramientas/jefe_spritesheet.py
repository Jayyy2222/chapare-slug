"""Convierte las hojas del jefe final (assets/jefes/) en los spritesheets del
juego.

Cada hoja original tiene otra distribución y otra resolución:
  llegda_boss.jpeg   9 cuadros sueltos en 4 filas: el minibús llega, frena,
                     levanta polvo, para, abre la puerta (2), el jefe se baja,
                     y 2 poses del jefe con la wiphala
  walk_boss.jpeg     12 cuadros de caminar, grilla de 6x2 (las banderas se tocan)
  ataque_boss.jpeg   6 cuadros de ataque, grilla de 3x2
  revive.jpeg        6 cuadros con marco: masca coca y se prende el aura
  boss.jpeg          2 cuadros con marco: la transformación (rayos y polvo) y
                     el jefe gigante parado
  boss_camina.jpeg   7 cuadros del gigante caminando: 3 arriba y 4 abajo
  boss_ataca.jpeg    4 cuadros con marco: levanta la bandera, la baja, golpe
                     contra el piso (onda), se levanta entre el polvo
  muerte_boss.jpeg   4 cuadros (grilla 2x2): le explotan los balazos, suelta la
                     bandera, cae de rodillas, queda tendido echando humo

Guarda en assets/jefes/:
  minibus_sheet.png       6 cuadros del minibús (el trufi): llega, frena, polvo,
                          parado y la puerta abierta (2). El cuadro del jefe
                          bajándose no se usa: el minibús va más grande que en
                          la hoja original y el jefe ahí quedaría de otro
                          tamaño; en el juego se baja el sprite del jefe.
  jefe_sheet.png          el jefe normal: poses, caminar, ataque y revive
  jefe_gigante_sheet.png  el gigante: transformación, parado, caminar, ataque y muerte
  jefe_cuadros.json       tamaño de celda de cada hoja y en qué cuadro empieza
                          cada animación (lo copia JEFE en JefeFinal.js)

Escala: cada hoja se lleva a px de arte con un cuadro de referencia de altura
conocida (uno sin la bandera por encima de la cabeza): el jefe normal mide
ALTO_JEFE, el gigante ALTO_GIGANTE y el minibús ALTO_TRUFI. Todos los cuadros de una hoja comparten
celda y van con los pies en el borde de abajo y centrados según los pies, así
el cuerpo de física no se mueve al cambiar de animación. El minibús se centra
según su carrocería (la mancha más grande), no según el polvo.

Uso (desde la raíz del proyecto):  python3 herramientas/jefe_spritesheet.py
"""
import json

from PIL import Image

from recorte_sprites import (a_pixel_art, centro_pies, componentes, en_celdas, por_manchas,
                             quitar_fondo, separar_por_costuras)

CARPETA = 'assets/jefes/'
ALTO_JEFE = 58        # px de arte del jefe normal parado: como el soldado
ALTO_GIGANTE = 120    # px de arte del gigante parado
ALTO_TRUFI = 82       # px de arte del minibús parado (un poco más alto que una persona)
COLORES = 64          # la wiphala tiene muchos colores
MARGEN = 3            # px de arte libres alrededor en cada celda


def filas_con_costuras(img, filas, columnas):
    """Grilla de filas iguales; dentro de cada fila, cortes por costuras."""
    alto = img.height / filas
    cuadros = []
    for f in range(filas):
        fila = img.crop((0, round(f * alto), img.width, round((f + 1) * alto)))
        cuadros += separar_por_costuras(fila, columnas, 0.1)
    return cuadros


def filas_desparejas(img, columnas_por_fila):
    """Como filas_con_costuras, con otra cantidad de cuadros en cada fila."""
    alto = img.height / len(columnas_por_fila)
    cuadros = []
    for f, columnas in enumerate(columnas_por_fila):
        fila = img.crop((0, round(f * alto), img.width, round((f + 1) * alto)))
        cuadros += separar_por_costuras(fila, columnas, 0.1)
    return cuadros


def abrir(nombre, recorte_abajo=0):
    img = quitar_fondo(Image.open(CARPETA + nombre))
    return img.crop((0, 0, img.width, img.height - recorte_abajo))


def centro_carroceria(cuadro):
    grandes, _ = componentes(cuadro, 1)
    _, (x0, _, x1, _), _ = max(grandes, key=lambda m: m[0])
    return (x0 + x1) / 2


def armar_hoja(partes, centro=centro_pies):
    """partes: lista de (cuadros, escala). Devuelve la hoja, el tamaño de la
    celda y en qué cuadro empieza cada parte."""
    chicos = [(c.resize((max(1, round(c.width * e)), max(1, round(c.height * e))), Image.LANCZOS), c, e)
              for cuadros, e in partes for c in cuadros]
    # Lado más ancho medido desde el centro elegido, en px de arte.
    medio = max(max(centro(c) * e, (c.width - centro(c)) * e) for _, c, e in chicos)
    ancho = int(medio * 2) + MARGEN * 2
    alto = max(round(c.height * e) for _, c, e in chicos) + MARGEN
    hoja = Image.new('RGBA', (ancho * len(chicos), alto))
    # Cada cuadro se arma a su resolución original y se achica una sola vez.
    for i, (_, c, e) in enumerate(chicos):
        grande = Image.new('RGBA', (round(ancho / e), round(alto / e)))
        grande.paste(c, (round(ancho / 2 / e - centro(c)), round(alto / e) - c.height), c)
        hoja.paste(a_pixel_art(grande, (ancho, alto), COLORES), (i * ancho, 0))
    inicios, i = [], 0
    for cuadros, _ in partes:
        inicios.append(i)
        i += len(cuadros)
    return hoja, (ancho, alto), inicios


def main():
    llegada = por_manchas(abrir('llegda_boss.jpeg', 4), 4000, 160, 20)
    bus, poses = llegada[:6], llegada[7:]
    caminar = filas_con_costuras(abrir('walk_boss.jpeg'), 2, 6)
    ataque = filas_con_costuras(abrir('ataque_boss.jpeg'), 2, 3)
    revive = en_celdas(abrir('revive.jpeg'), 3, 2, 10, 0.05)
    gigante = en_celdas(abrir('boss.jpeg'), 2, 1, 8, 0.02)
    g_caminar = filas_desparejas(abrir('boss_camina.jpeg'), [3, 4])
    g_ataque = en_celdas(abrir('boss_ataca.jpeg'), 2, 2, 8, 0.02)
    g_muerte = en_celdas(abrir('muerte_boss.jpeg'), 2, 2, 6, 0.02)

    # Escala de cada hoja según un cuadro de referencia (parado, sin la
    # bandera por encima de la cabeza). Al atacar o caminar se agacha un poco.
    def escala(cuadro, alto):
        return alto / cuadro.height
    e_llegada = escala(poses[1], ALTO_JEFE)
    e_caminar = escala(caminar[10], ALTO_JEFE * 0.98)
    e_ataque = escala(ataque[4], ALTO_JEFE * 0.95)
    e_revive = escala(revive[4], ALTO_JEFE)
    e_gigante = escala(gigante[1], ALTO_GIGANTE)
    e_g_caminar = escala(g_caminar[3], ALTO_GIGANTE * 0.97)
    e_g_ataque = escala(g_ataque[3], ALTO_GIGANTE)
    e_g_muerte = escala(g_muerte[0], ALTO_GIGANTE * 1.02)  # la bandera no pasa la cabeza
    e_bus = escala(bus[3], ALTO_TRUFI)

    datos = {}
    hoja, celda, _ = armar_hoja([(bus, e_bus)], centro_carroceria)
    hoja.save(CARPETA + 'minibus_sheet.png')
    datos['minibus'] = {'ancho': celda[0], 'alto': celda[1], 'cuadros': len(bus)}

    partes = [(poses, e_llegada), (caminar, e_caminar), (ataque, e_ataque), (revive, e_revive)]
    hoja, celda, inicios = armar_hoja(partes)
    hoja.save(CARPETA + 'jefe_sheet.png')
    datos['jefe'] = {'ancho': celda[0], 'alto': celda[1],
                     **{n: [i, i + len(p[0]) - 1] for n, i, p in zip(['pose', 'caminar', 'ataque', 'revive'], inicios, partes)}}

    partes = [(gigante, e_gigante), (g_caminar, e_g_caminar), (g_ataque, e_g_ataque), (g_muerte, e_g_muerte)]
    hoja, celda, inicios = armar_hoja(partes)
    hoja.save(CARPETA + 'jefe_gigante_sheet.png')
    datos['gigante'] = {'ancho': celda[0], 'alto': celda[1],
                        **{n: [i, i + len(p[0]) - 1] for n, i, p in zip(['aparece', 'caminar', 'ataque', 'muerte'], inicios, partes)}}

    with open(CARPETA + 'jefe_cuadros.json', 'w') as f:
        json.dump(datos, f, indent=1)
    print(json.dumps(datos))


if __name__ == '__main__':
    main()
