# Chapare Slug

Juego de acción y plataformas estilo Metal Slug hecho con Phaser 3.

## Cómo jugar

Servir la carpeta con cualquier servidor estático y abrir `index.html`:

```
python3 -m http.server 8000
```

Luego entrar a http://localhost:8000.

## Controles

- Flechas / A-D: moverse
- SHIFT: correr
- Espacio / W: saltar
- J / X: disparar

## Estructura

- `src/`: escenas y lógica del juego
- `assets/`: sprites, fondos y música
- `herramientas/`: scripts en Python (PIL) que generan los spritesheets a partir de las imágenes originales
