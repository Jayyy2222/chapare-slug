"""El fondo de la selección de personaje con 4 ventanas (Tuto, Manfred,
Eduardo y Bartolina) a partir de assets/seleccion/seleccion1.jpeg (3).

El panel se corta en tiras verticales por el medio de los adornos que hay
entre ventanas: A (borde izquierdo + ventana 1), B (ventana 2) y C (ventana 3
+ borde derecho). Se arma A + B + B + C y se angosta (solo a lo ancho, ESCALA)
para que entre en el ancho del panel. Imprime las posiciones nuevas de las
ventanas y placas (DISENO_SELECCION en CharacterSelectScene.js).

Uso (desde la raíz del proyecto):  python3 herramientas/seleccion4.py
"""
from PIL import Image

ORIGEN = 'assets/seleccion/seleccion1.jpeg'
DESTINO = 'assets/seleccion/seleccion4.jpeg'
P0, P1 = 55, 1175        # el panel (x) en el original
CORTES = [443, 791]      # el medio de los adornos entre ventanas
Y0, Y1 = 150, 828        # de dónde a dónde (y) se rearma


def main():
    img = Image.open(ORIGEN).convert('RGB')
    a = img.crop((P0, Y0, CORTES[0], Y1))
    b = img.crop((CORTES[0], Y0, CORTES[1], Y1))
    c = img.crop((CORTES[1], Y0, P1, Y1))
    tiras = [a, b, b, c]
    total = sum(t.width for t in tiras)
    k = (P1 - P0) / total
    armado = Image.new('RGB', (total, Y1 - Y0))
    x = 0
    for t in tiras:
        armado.paste(t, (x, 0))
        x += t.width
    armado = armado.resize((P1 - P0, Y1 - Y0), Image.LANCZOS)
    salida = img.copy()
    salida.paste(armado, (P0, Y0))
    salida.save(DESTINO, quality=95)
    # Posición nueva de una x del original en la tira i.
    inicio = [0, a.width, a.width + b.width, a.width + 2 * b.width]
    origen = [P0, CORTES[0], CORTES[0], CORTES[1]]
    nx = lambda i, xo: round(P0 + (inicio[i] + xo - origen[i]) * k)
    ventanas = [(140, 312), (496, 314), (496, 314), (843, 315)]
    nombres = [(265, 237), (616, 237), (616, 237), (966, 236)]
    abajo = [(269, 733), (617, 733), (617, 733), (964, 733)]
    print('k', round(k, 4), 'ancho ventana', round(245 * k))
    print('ventanas', [[nx(i, x), y] for i, (x, y) in enumerate(ventanas)])
    print('placaNombre', [[nx(i, x), y] for i, (x, y) in enumerate(nombres)])
    print('placaAbajo', [[nx(i, x), y] for i, (x, y) in enumerate(abajo)])


if __name__ == '__main__':
    main()
