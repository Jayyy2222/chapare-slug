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
  scene: [Menu, CharacterSelectScene, Cinematica, Nivel1, Interior, Cueva, JefeFinal, Nivel2, Patio, Subida, Tuneles, MineCartScene, CavernaJefe, Arena, CapaSelector, Pausa, GameOver, Resultado]
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

// =============================================================================
// Celular: que el juego siempre entre completo y el navegador no haga zoom.
// =============================================================================
(function pantallaCelular() {
  // Al girar el celular, mostrar/ocultar la barra del navegador, cerrar el
  // teclado o entrar a pantalla completa, el área visible cambia de tamaño
  // (a veces sin avisar con 'resize'): se vuelve a ajustar el canvas.
  let pendiente = null;
  function ajustar() {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => {
      // iOS deja la página corrida hacia arriba después de cerrar el teclado.
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      if (window.juego && window.juego.scale) window.juego.scale.refresh();
    }, 60);
  }
  function ajustarVarias() { ajustar(); setTimeout(ajustar, 300); setTimeout(ajustar, 800); }
  window.addEventListener('resize', ajustar);
  window.addEventListener('orientationchange', ajustarVarias);
  if (screen.orientation) screen.orientation.addEventListener('change', ajustarVarias);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', ajustar);
    window.visualViewport.addEventListener('scroll', ajustar);
  }
  document.addEventListener('fullscreenchange', ajustarVarias);
  document.addEventListener('webkitfullscreenchange', ajustarVarias);
  document.addEventListener('focusout', ajustarVarias); // se cerró el teclado
  window.addEventListener('pageshow', ajustarVarias);

  // Sin zoom: pellizco con dos dedos (Safari ignora user-scalable=no) ni doble toque.
  const sinZoom = (e) => e.preventDefault();
  document.addEventListener('gesturestart', sinZoom);
  document.addEventListener('gesturechange', sinZoom);
  document.addEventListener('gestureend', sinZoom);
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
  }, { passive: false });
  let ultimoToque = 0;
  document.addEventListener('touchend', (e) => {
    const ahora = Date.now();
    const enCampo = e.target.closest && e.target.closest('input, textarea, button, select');
    if (!enCampo && ahora - ultimoToque < 350) e.preventDefault();
    ultimoToque = ahora;
  }, { passive: false });
  document.addEventListener('dblclick', sinZoom);
}());
