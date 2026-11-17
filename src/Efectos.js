// =============================================================================
// Efectos animados: explosiones y sangre (sprites de Metal Slug recortados con
// herramientas/vfx.py; créditos: explosiones de Gussprint, sangre de Kevin Huff).
// Los carga Nivel1 y quedan para todo el juego.
//   efecto(escena, nombre, x, y, opciones)  una animación que se borra sola
//   sangrar(escena, x, y, dir)              chorro y salpicón hacia `dir` (1 o -1)
//   estallidoSangre(escena, x, y)           al morir
//   explotar(escena, x, y, tamano)          'chica', 'mediana' o 'grande'
// =============================================================================

// Celda de cada hoja (assets/vfx/<nombre>.png), cuadros, velocidad y si se
// apoya abajo (explosiones) o va centrada.
const EFECTOS = {
  explosion_chica: { ancho: 31, alto: 41, cuadros: 26, fps: 40, abajo: true },
  explosion_mediana: { ancho: 51, alto: 54, cuadros: 24, fps: 30, abajo: true },
  explosion_grande: { ancho: 82, alto: 85, cuadros: 20, fps: 24, abajo: true },
  sangre_salpicon: { ancho: 44, alto: 39, cuadros: 7, fps: 24 },
  sangre_chorro: { ancho: 37, alto: 35, cuadros: 10, fps: 28 },
  sangre_estallido: { ancho: 122, alto: 108, cuadros: 8, fps: 16 },
  // Proyectiles (Armas.js): el cohete con su llama (2 cuadros que se repiten),
  // la granada y la llamarada del lanzallamas.
  cohete: { ancho: 59, alto: 15, cuadros: 2, fps: 16, repetir: true },
  granada: { ancho: 14, alto: 21, cuadros: 1, fps: 1 },
  llamarada: { ancho: 68, alto: 33, cuadros: 9, fps: 24 },
  // El escopetazo sale de la boca del arma (izquierda de la celda); el tajo del machete.
  escopetazo: { ancho: 97, alto: 62, cuadros: 12, fps: 24, izquierda: true },
  tajo: { ancho: 24, alto: 60, cuadros: 6, fps: 30 }
};

function cargarEfectos(escena) {
  Object.entries(EFECTOS).forEach(([nombre, e]) =>
    escena.load.spritesheet(`vfx_${nombre}`, `assets/vfx/${nombre}.png`, { frameWidth: e.ancho, frameHeight: e.alto }));
  escena.load.image('balaAmetralladora', 'assets/vfx/bala_ametralladora.png');
}

// Las animaciones son globales: se crean la primera vez que se usan.
function animacionesEfectos(escena) {
  Object.entries(EFECTOS).forEach(([nombre, e]) => {
    if (escena.anims.exists(`vfx_${nombre}`) || !escena.textures.exists(`vfx_${nombre}`)) return;
    escena.anims.create({
      key: `vfx_${nombre}`, frameRate: e.fps, repeat: e.repetir ? -1 : 0,
      frames: escena.anims.generateFrameNumbers(`vfx_${nombre}`, { start: 0, end: e.cuadros - 1 })
    });
  });
}

// opciones: escala (por defecto ESCALA), espejo, angulo, profundidad.
function efecto(escena, nombre, x, y, { escala = ESCALA, espejo = false, angulo = 0, profundidad = 10.4 } = {}) {
  animacionesEfectos(escena);
  if (!escena.anims.exists(`vfx_${nombre}`)) return null;
  const e = EFECTOS[nombre];
  const s = escena.add.sprite(x, y, `vfx_${nombre}`, 0).setOrigin(e.izquierda ? (espejo ? 1 : 0) : 0.5, e.abajo ? 1 : 0.5)
    .setScale(escala).setFlipX(espejo).setAngle(angulo).setDepth(profundidad);
  s.play(`vfx_${nombre}`);
  s.once('animationcomplete', () => s.destroy());
  return s;
}

// Un balazo que entra: el chorro sale para el lado al que iba la bala.
function sangrar(escena, x, y, dir = 1, escala = ESCALA) {
  efecto(escena, 'sangre_chorro', x + dir * 14, y, { escala, espejo: dir < 0 });
  efecto(escena, 'sangre_salpicon', x, y, { escala: escala * 0.8, espejo: Math.random() < 0.5 });
}

function estallidoSangre(escena, x, y, escala = ESCALA * 0.7) {
  efecto(escena, 'sangre_estallido', x, y, { escala, espejo: Math.random() < 0.5, profundidad: 10.5 });
}

function explotar(escena, x, y, tamano = 'mediana', escala = ESCALA) {
  return efecto(escena, `explosion_${tamano}`, x, y, { escala, profundidad: 12 });
}
