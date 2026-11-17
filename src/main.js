// Resolución igual al alto de lv1.jpeg (576 px) para que el fondo no se reescale; se ajusta a la ventana.
const config = {
  type: Phaser.AUTO,
  parent: 'juego',
  width: 1024,
  height: 576,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#bdc1a0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'juego' // pantalla completa (Pausa.js): el div del juego
  },
  physics: {
    default: 'arcade',
    // debug: true dibuja los cuerpos de física (y las escaleras en celeste)
    // para ajustar las plataformas de los props. Ponerlo en false al terminar.
    arcade: { gravity: { y: 800 }, debug: false }
  },
  // CapaSelector (Armas.js): la rueda del selector de armas, encima de todo.
  scene: [Menu, CharacterSelectScene, Nivel1, Interior, Cueva, JefeFinal, CapaSelector, Pausa, GameOver, Resultado]
};

// Para probar una escena suelta: index.html?escena=Cueva arranca directo en ella.
const escenaInicial = new URLSearchParams(location.search).get('escena');
if (escenaInicial) {
  const elegida = config.scene.find((c) => c.name === escenaInicial);
  if (elegida) config.scene = [elegida, ...config.scene.filter((c) => c !== elegida)];
}

// Espera "Press Start 2P" (Google Fonts): TextFX.js genera con ella las
// fuentes bitmap del juego. Sin internet arranca igual a los 2 s (con la
// fuente monoespaciada del sistema).
const fuentes = document.fonts.load('8px "Press Start 2P"');
const espera = new Promise((resolver) => setTimeout(resolver, 2000));
// window.juego: para revisar el juego desde la consola del navegador.
Promise.race([fuentes, espera]).catch(() => {}).finally(() => {
  window.juego = new Phaser.Game(config);
  window.juego.sound.volume = AJUSTES.general; // Pausa.js: el volumen guardado
});
