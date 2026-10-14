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
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    // debug: true dibuja los cuerpos de física (y las escaleras en celeste)
    // para ajustar las plataformas de los props. Ponerlo en false al terminar.
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scene: [Menu, CharacterSelectScene, Nivel1, Interior, JefeFinal]
};

// Espera las fuentes de index.html (Google Fonts) para que los textos de Phaser
// no se dibujen con la fuente por defecto; sin internet arranca igual a los 2 s.
const fuentes = Promise.all([
  document.fonts.load('32px "Black Ops One"'),
  document.fonts.load('16px "Press Start 2P"')
]);
const espera = new Promise((resolver) => setTimeout(resolver, 2000));
Promise.race([fuentes, espera]).catch(() => {}).finally(() => new Phaser.Game(config));
