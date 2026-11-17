// =============================================================================
// Música de fondo: una sola pista a la vez para todo el juego.
//
// Cada escena carga su pista en preload() con cargarMusica() y la arranca en
// create() con tocarMusica(). Al cambiar de escena se corta la anterior; si
// la pista pedida ya está sonando (por ejemplo al volver de un interior a
// Nivel1) sigue sin cortarse.
//
// Los archivos son MP3 con extensión .mpeg: Phaser decide el formato por la
// extensión, así que se le dice el tipo a mano.
// =============================================================================

const MUSICAS = {
  titulo: { archivo: 'assets/musicas/titulo/muisca_titulo.mpeg', volumen: 0.5 },
  seleccion: { archivo: 'assets/musicas/seleccion/musica_seleccion.mpeg', volumen: 0.5 },
  nivel1: { archivo: 'assets/musicas/lvl1/de_fondo.mpeg', volumen: 0.4 }
};

function cargarMusica(escena, nombre) {
  const clave = 'musica_' + nombre;
  if (!escena.cache.audio.exists(clave)) escena.load.audio(clave, { type: 'mp3', url: MUSICAS[nombre].archivo });
}

function tocarMusica(escena, nombre) {
  const sonidos = escena.sound;
  const clave = 'musica_' + nombre;
  const actual = sonidos.musicaActual;
  if (actual && actual.key === clave) return;
  if (actual) actual.destroy();
  if (!escena.cache.audio.exists(clave)) return; // no se pudo cargar: el juego sigue sin música

  const musica = sonidos.add(clave, { loop: true, volume: volumenMusica(nombre) });
  sonidos.musicaActual = musica;
  // El navegador no deja sonar nada hasta que el jugador toca una tecla o
  // hace clic: en ese caso arranca apenas se desbloquee el audio.
  if (sonidos.locked) {
    sonidos.once('unlocked', () => { if (sonidos.musicaActual === musica) musica.play(); });
  } else {
    musica.play();
  }
}

// Volumen de una pista con el ajuste de música del menú de pausa (Pausa.js).
function volumenMusica(nombre) {
  const ajuste = typeof AJUSTES !== 'undefined' ? AJUSTES.musica : 1;
  return (MUSICAS[nombre] ? MUSICAS[nombre].volumen : 0.4) * ajuste;
}
