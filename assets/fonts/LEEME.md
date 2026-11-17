# Fuentes bitmap (BMFont)

`src/TextFX.js` usa cinco fuentes: `oro`, `plata`, `rojo`, `blanco` (destellos)
y `negro` (sombras). Mientras no haya archivos aquí, las genera solo a partir de
"Press Start 2P" (con contorno negro, degradé y tildes).

Para usar fuentes propias en formato BMFont (AngelCode, `.png` + `.xml`):

1. Copia los archivos aquí, por ejemplo `oro.png` + `oro.xml`.
2. En `fuentes.json` pon el nombre del archivo (sin extensión):

   ```json
   { "fuentes": { "oro": "oro", "plata": "plata", "rojo": "rojo" } }
   ```

Los colores que queden en `null` se siguen generando. Las fuentes tienen que
traer su propio contorno negro y las letras Á É Í Ó Ú Ñ ¡ ¿ © ►. Si no hay
`blanco` o `negro`, el destello y la sombra se hacen tiñendo la fuente (WebGL).
Para que se vean nítidas, los tamaños en TextFX son múltiplos del tamaño base
de la fuente (el `size` del .xml).
