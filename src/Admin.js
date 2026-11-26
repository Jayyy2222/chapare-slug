// =============================================================================
// Modo admin oculto (para probar los mapas): escribir "jaime" con el teclado
// en cualquier momento lo prende; escribirlo otra vez lo apaga. Se guarda en el
// registry ('admin'), así sigue al pasar de una escena a otra.
//
// Con el modo admin el jugador vuela en noclip: atraviesa todo (sin gravedad
// ni colisiones), no recibe daño y se mueve con las flechas o WASD en las
// cuatro direcciones (SHIFT: más rápido). Puede seguir disparando. En la
// cueva la cámara no se traba en las zonas y se puede salir sin vencer al jefe.
//
// Las escenas llaman noclipJugador(this) en su update: devuelve true mientras
// el modo esté prendido (entonces no mueven al jugador ellas).
// =============================================================================

const ADMIN = { clave: 'jaime', velocidad: 520, rapido: 2.2 };

// La clave se escucha en la ventana (no en una escena): funciona en el menú,
// en el nivel y en los interiores.
(function escucharClaveAdmin() {
  let escrito = '';
  window.addEventListener('keydown', (ev) => {
    if (!ev.key || ev.key.length !== 1) return;
    escrito = (escrito + ev.key.toLowerCase()).slice(-ADMIN.clave.length);
    if (escrito !== ADMIN.clave || !window.juego) return;
    escrito = '';
    // La última letra (E) también es la tecla del editor de la cueva: que no lo abra.
    window.claveAdminEn = performance.now();
    const activo = !window.juego.registry.get('admin');
    window.juego.registry.set('admin', activo);
    window.juego.scene.getScenes(true).forEach((escena) => avisoAdmin(escena, activo));
  });
})();

// Truco secreto: escribir "vida" con el teclado en cualquier momento prende la
// inmunidad (no recibe daño; en la arena, caerse no le quita vidas); escribirlo
// otra vez la apaga. Se guarda en el registry ('inmune').
const INMUNIDAD = { clave: 'vida' };

(function escucharClaveInmunidad() {
  let escrito = '';
  window.addEventListener('keydown', (ev) => {
    if (!ev.key || ev.key.length !== 1) return;
    escrito = (escrito + ev.key.toLowerCase()).slice(-INMUNIDAD.clave.length);
    if (escrito !== INMUNIDAD.clave || !window.juego) return;
    escrito = '';
    const activo = !window.juego.registry.get('inmune');
    window.juego.registry.set('inmune', activo);
    window.juego.scene.getScenes(true).forEach((escena) => avisoTruco(escena, activo ? '¡INMUNIDAD ACTIVADA!' : 'INMUNIDAD APAGADA', activo));
  });
})();

function avisoTruco(escena, texto, activo) {
  if (!escena.add || !escena.scale) return;
  const { width, height } = escena.scale;
  const t = TextFX.texto(escena, width / 2, height / 2 - 120, texto, { color: activo ? 'oro' : 'plata', escala: 3 })
    .setScrollFactor(0).setDepth(60);
  escena.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 500, onComplete: () => t.destroy() });
}

// Si se acaba de escribir la clave (para ignorar sus letras como comandos).
function recienClaveAdmin() {
  return performance.now() - (window.claveAdminEn || 0) < 400;
}

function avisoAdmin(escena, activo) {
  if (!escena.add || !escena.scale) return;
  const { width, height } = escena.scale;
  const texto = TextFX.texto(escena, width / 2, height / 2 - 120, activo ? 'MODO ADMIN · NOCLIP' : 'MODO ADMIN APAGADO',
    { color: activo ? 'oro' : 'plata', escala: 3 }).setScrollFactor(0).setDepth(60);
  escena.tweens.add({ targets: texto, alpha: 0, delay: 1200, duration: 500, onComplete: () => texto.destroy() });
}

function noclipJugador(escena) {
  const j = escena.jugador;
  if (!j || !j.body) return false;
  if (!escena.registry.get('admin')) {
    if (j.getData('noclip')) salirNoclip(escena);
    return false;
  }
  if (!j.getData('noclip')) entrarNoclip(escena);
  const t = escena.teclas;
  const k = escena.teclasExtra || {};
  const tecla = (a, b) => (a && a.isDown) || (b && b.isDown);
  const dx = (tecla(t.right, k.D) ? 1 : 0) - (tecla(t.left, k.A) ? 1 : 0);
  const dy = (tecla(t.down, k.S) ? 1 : 0) - (tecla(t.up, k.W) ? 1 : 0);
  const v = ADMIN.velocidad * (t.shift.isDown ? ADMIN.rapido : 1);
  j.body.setVelocity(dx * v, dy * v);
  if (dx) j.setFlipX(dx < 0);
  escena.invulnerableHasta = Infinity;
  // Dentro del mundo (si no, se pierde fuera del mapa).
  const m = escena.physics.world.bounds;
  j.body.x = Phaser.Math.Clamp(j.body.x, m.x, m.right - j.body.width);
  j.body.y = Phaser.Math.Clamp(j.body.y, Math.max(m.y, -200), m.bottom - j.body.height);
  if ((dx || dy) && escena.anims.exists('jugador_caminar')) j.anims.play('jugador_caminar', true);
  else { j.anims.stop(); j.setFrame(0); }
  // Disparar sigue andando (para probar enemigos y cajas).
  const dispara = tecla(k.J, k.X);
  if (dispara && escena.disparar && escena.cuadrosJugador && escena.time.now >= escena.proximoDisparo) escena.disparar();
  if (escena.mostrarArmaLarga && escena.cuadrosJugador) escena.mostrarArmaLarga();
  return true;
}

function entrarNoclip(escena) {
  const j = escena.jugador;
  j.setData('noclip', true);
  if (escena.aturdido && escena.liberarJugador) escena.liberarJugador();
  escena.trepando = null;
  escena.rampaActual = null;
  if (escena.posturaJugador && escena.cuadrosJugador) escena.posturaJugador(false, false, false);
  j.body.setAllowGravity(false);
  j.body.checkCollision.none = true;
  j.setAlpha(0.8);
  const { width, height } = escena.scale;
  escena.etiquetaAdmin = TextFX.texto(escena, width - 12, height - 14, 'ADMIN · NOCLIP', { color: 'rojo', escala: 1, origen: 1 })
    .setScrollFactor(0).setDepth(60);
}

function salirNoclip(escena) {
  const j = escena.jugador;
  j.setData('noclip', false);
  j.body.setAllowGravity(true);
  j.body.checkCollision.none = false;
  j.body.setVelocity(0);
  j.setAlpha(1);
  escena.invulnerableHasta = escena.time.now + 1000;
  // Si quedó metido en la roca, la escena lo sube al piso de arriba.
  if (escena.salirDeLaRoca) escena.salirDeLaRoca();
  if (escena.etiquetaAdmin) escena.etiquetaAdmin.destroy();
  escena.etiquetaAdmin = null;
}
