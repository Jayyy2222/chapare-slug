// =============================================================================
// Textos de estado del juego (todos con TextFX: letras con contorno negro y
// sombra dura, posiciones redondeadas, sin blur) y sus sonidos:
//   sonidoUI(escena, tipo)       tic, confirma, alerta, oneup, golpe, conteo, fanfarria
//   hudVidas(escena)             "x3" con la carita del personaje, junto a la vida
//   perderVidaHUD / ganarVida    el número parpadea en rojo y tiembla / ¡1UP!
//   sumarPuntos(escena, n)       puntaje de la partida (registry 'puntos')
//   rescateHUD(escena, x, y)     ¡REHÉN RESCATADO! y el contador rebota
//   sinMunicion(escena)          ¡SIN MUNICIÓN! junto al arma del HUD
//   alertaJefe(escena, listo)    ¡ALERTA! con franjas amarillas y negras
//   textoListo(escena)           ¡LISTO! sobre el jugador al reaparecer
//   comienzaMision(escena)       MISIÓN 1 letra por letra y ¡COMIENZA!
//   GAME OVER y MISIÓN COMPLETA son escenas aparte (GameOver, Resultado).
// La partida (vidas, puntos, rehenes, tiempo) se guarda en el registry y se
// arranca con nuevaPartida() al elegir personaje.
// =============================================================================

const PARTIDA = { vidas: 3, puntosRehen: 1000, puntosPowerup: 500, rehenesPor1UP: 3 };

function nuevaPartida(registry) {
  registry.set('vidas', PARTIDA.vidas);
  registry.set('puntos', 0);
  registry.set('rehenesTotal', 0);
  registry.set('powerupsTotal', 0);
  registry.set('inicioMision', Date.now());
  registry.set('reaparecer', false);
  registry.remove('tioCheckpoint'); // (CavernaJefe: reaparecer en la persecución)
}

function vidasPartida(escena) {
  const v = escena.registry.get('vidas');
  return v === undefined ? PARTIDA.vidas : v;
}

// --- Sonidos (WebAudio, sin archivos) ----------------------------------------

function sonidoUI(escena, tipo) {
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.masterVolumeNode || ctx.destination;
  const nota = (frecuencia, inicio, duracion, onda = 'square', volumen = 0.12, final = frecuencia) => {
    const t = ctx.currentTime + inicio;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = onda;
    o.frequency.setValueAtTime(frecuencia, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, final), t + duracion);
    g.gain.setValueAtTime(volumen, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + duracion + 0.02);
  };
  switch (tipo) {
    case 'tic': nota(1300, 0, 0.04, 'square', 0.06); break;
    case 'conteo': nota(1800, 0, 0.025, 'square', 0.04); break;
    case 'confirma': nota(880, 0, 0.08); nota(1320, 0.07, 0.12); break;
    case 'alerta': [0, 0.18].forEach((d) => { nota(620, d, 0.08, 'sawtooth', 0.09); nota(930, d + 0.08, 0.08, 'sawtooth', 0.09); }); break;
    case 'oneup': [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.06, 0.1, 'square', 0.09)); break;
    case 'golpe': nota(160, 0, 0.18, 'triangle', 0.25, 50); break;
    case 'fanfarria': [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.62]].forEach(([f, d]) => nota(f, d, 0.18, 'square', 0.1)); break;
    default: break;
  }
}

// --- Vidas, puntos y rehenes -------------------------------------------------

// "x3" con la carita del personaje, a la derecha de la barra de vida.
function hudVidas(escena) {
  const x = VIDA.x + 196;
  const y = VIDA.y + 22;
  const textura = texturaJugador(escena);
  const prefijo = CUERPOS[personajeCuerpo(escena)].prefijo;
  animacionesCuerpo(escena, personajeCuerpo(escena)); // CuerpoModular.js: los cuadros de sus hojas
  // La cabeza del personaje, entera: se busca leyendo los píxeles del cuadro
  // de parado (la franja de arriba de lo que no es transparente) y se recorta
  // con un poco de margen. Va a ~26 px de alto, centrada en (x, y).
  const [clave, cuadro] = escena.textures.exists(prefijo + 'idle') ? [prefijo + 'idle', '0'] : [textura, 0];
  const cara = escena.add.image(x, y, clave, cuadro);
  const w = cara.frame.width;
  const h = cara.frame.height;
  const opaco = (px, py) => (escena.textures.getPixelAlpha(px, py, clave, cuadro) || 0) > 40;
  let arriba = 0;
  while (arriba < h && ![...Array(w).keys()].some((px) => opaco(px, arriba))) arriba++;
  let abajo = h - 1;
  while (abajo > arriba && ![...Array(w).keys()].some((px) => opaco(px, abajo))) abajo--;
  const altoCabeza = Math.max(8, Math.round((abajo - arriba) * 0.27)); // la cabeza: ~27 % de la figura
  let izq = w;
  let der = 0;
  for (let py = arriba; py < arriba + altoCabeza; py++) {
    for (let px = 0; px < w; px++) if (opaco(px, py)) { izq = Math.min(izq, px); der = Math.max(der, px); }
  }
  const margen = 2;
  const cx = Math.max(0, izq - margen);
  const cy = Math.max(0, arriba - margen);
  const cw = Math.min(w - cx, der - izq + 1 + margen * 2);
  const ch = Math.min(h - cy, altoCabeza + margen * 2);
  cara.setCrop(cx, cy, cw, ch).setOrigin((cx + cw / 2) / w, (cy + ch / 2) / h)
    .setScale(26 / ch).setScrollFactor(0).setDepth(30);
  const texto = TextFX.hud(escena, x + 22, y, 'x' + vidasPartida(escena), { color: 'oro', origen: 0 }).setDepth(30);
  texto.setOrigin(0, 0.5);
  escena.hudVidasTexto = texto;
  return { cara, texto };
}

function actualizarHudVidas(escena) {
  if (escena.hudVidasTexto) escena.hudVidasTexto.setText('x' + vidasPartida(escena));
}

// Se perdió una vida: el número parpadea en rojo y tiembla.
function perderVidaHUD(escena) {
  const t = escena.hudVidasTexto;
  if (!t || !t.active) return;
  actualizarHudVidas(escena);
  t.setColor('rojo');
  const x0 = t.x;
  escena.tweens.add({ targets: t, x: x0 + 3, duration: 40, yoyo: true, repeat: 7, onComplete: () => { t.x = x0; } });
  escena.tweens.add({ targets: t, alpha: 0.2, duration: 90, yoyo: true, repeat: 5, onComplete: () => { t.setAlpha(1).setColor('oro'); } });
}

// Una vida más: ¡1UP! verde sale del jugador.
function ganarVida(escena) {
  escena.registry.set('vidas', vidasPartida(escena) + 1);
  actualizarHudVidas(escena);
  const j = escena.jugador;
  if (j) {
    const t = TextFX.texto(escena, j.x, j.y - 70, '¡1UP!', { color: 'verde', escala: 3 }).setDepth(40);
    escena.tweens.add({ targets: t, y: t.y - 70, duration: 1300, ease: 'Quad.out' });
    escena.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 500, onComplete: () => t.destroy() });
  }
  sonidoUI(escena, 'oneup');
  if (escena.hudVidasTexto) escena.tweens.add({ targets: escena.hudVidasTexto, scale: 1.4, duration: 120, yoyo: true });
}

function sumarPuntos(escena, n) {
  escena.registry.set('puntos', (escena.registry.get('puntos') || 0) + n);
}

// Un rehén más: ¡REHÉN RESCATADO! arriba al medio, el contador del HUD
// rebota y cada PARTIDA.rehenesPor1UP rehenes, una vida.
function rescateHUD(escena) {
  sumarPuntos(escena, PARTIDA.puntosRehen);
  const total = (escena.registry.get('rehenesTotal') || 0) + 1;
  escena.registry.set('rehenesTotal', total);
  const { width } = escena.scale;
  const t = TextFX.texto(escena, width / 2, 120, '¡REHÉN RESCATADO!', { color: 'oro', escala: 3 }).setScrollFactor(0).setDepth(40);
  t.setScale(0.3);
  escena.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out', onComplete: () => t.destellar(2, 70) });
  escena.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() });
  sonidoUI(escena, 'confirma');
  if (escena.hud) escena.tweens.add({ targets: escena.hud, scale: 1.12, duration: 110, yoyo: true, ease: 'Quad.out' });
  if (total % PARTIDA.rehenesPor1UP === 0) escena.time.delayedCall(700, () => ganarVida(escena));
}

// ¡SIN MUNICIÓN! chico, junto al nombre del arma (que vuelve a PISTOLA).
function sinMunicion(escena) {
  const h = escena.hudArma;
  if (!h) return;
  const t = TextFX.texto(escena, h.x + 150, h.y + 2, '¡SIN MUNICIÓN!', { color: 'rojo', escala: 1, origen: 0 })
    .setScrollFactor(0).setDepth(31);
  escena.tweens.add({ targets: t, alpha: 0.2, duration: 100, yoyo: true, repeat: 5 });
  escena.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 300, onComplete: () => t.destroy() });
  sonidoUI(escena, 'tic');
}

// --- Avisos grandes ------------------------------------------------------------

// ¡ALERTA! rojo grande parpadeando, con franjas amarillas y negras arriba y
// abajo de la pantalla. Mientras dura no se puede pausar. listo() al final.
function alertaJefe(escena, listo) {
  const { width, height } = escena.scale;
  if (!escena.textures.exists('franjasAlerta')) {
    const g = escena.make.graphics({ add: false });
    g.fillStyle(0x111111).fillRect(0, 0, 32, 20);
    g.fillStyle(0xffcc22);
    for (let x = -20; x < 40; x += 16) g.fillPoints([{ x, y: 20 }, { x: x + 8, y: 20 }, { x: x + 28, y: 0 }, { x: x + 20, y: 0 }], true);
    g.generateTexture('franjasAlerta', 32, 20);
    g.destroy();
  }
  escena.sinPausa = true;
  const fijo = (o) => o.setScrollFactor(0).setDepth(45);
  const arriba = fijo(escena.add.tileSprite(0, -24, width, 20, 'franjasAlerta').setOrigin(0).setScale(1, 1.2));
  const abajo = fijo(escena.add.tileSprite(0, height, width, 20, 'franjasAlerta').setOrigin(0).setScale(1, 1.2));
  escena.tweens.add({ targets: arriba, y: 70, duration: 250, ease: 'Quad.out' });
  escena.tweens.add({ targets: abajo, y: height - 24, duration: 250, ease: 'Quad.out' });
  const texto = fijo(TextFX.alert(escena, width / 2, height / 2 - 60, '¡ALERTA!', { escala: 6 }));
  texto.setScale(0);
  escena.tweens.add({ targets: texto, scale: 1, duration: 260, ease: 'Back.out' });
  const correr = escena.time.addEvent({ delay: 16, loop: true, callback: () => { arriba.tilePositionX += 2; abajo.tilePositionX -= 2; } });
  const parpadeo = escena.time.addEvent({ delay: 180, loop: true, callback: () => texto.setVisible(!texto.visible) });
  sonidoUI(escena, 'alerta');
  const sonido = escena.time.addEvent({ delay: 600, repeat: 2, callback: () => sonidoUI(escena, 'alerta') });
  escena.time.delayedCall(2200, () => {
    correr.remove(); parpadeo.remove(); sonido.remove();
    escena.tweens.add({
      targets: [arriba, abajo, texto], alpha: 0, duration: 250,
      onComplete: () => { arriba.destroy(); abajo.destroy(); texto.destroy(); escena.sinPausa = false; if (listo) listo(); }
    });
  });
}

// ¡LISTO! chico sobre el jugador mientras parpadea invulnerable.
function textoListo(escena) {
  const j = escena.jugador;
  if (!j) return;
  escena.invulnerableHasta = escena.time.now + 2200;
  escena.tweens.add({ targets: j, alpha: 0.3, duration: 100, yoyo: true, repeat: 10, onComplete: () => j.setAlpha(1) });
  const t = TextFX.texto(escena, j.x, j.y - 80, '¡LISTO!', { color: 'oro', escala: 2 }).setDepth(40);
  escena.textoListo = t;
  const seguir = escena.time.addEvent({ delay: 16, loop: true, callback: () => t.setPosition(Math.round(j.x), Math.round(j.y - 80)) });
  escena.tweens.add({ targets: t, alpha: 0.3, duration: 150, yoyo: true, repeat: 6, onComplete: () => { seguir.remove(); t.destroy(); } });
}

// MISIÓN 1 letra por letra (caen con rebote) y después ¡COMIENZA! con zoom
// 2 → 1, flash y un shake corto.
function comienzaMision(escena, nombre = 'MISIÓN 1') {
  const { width } = escena.scale;
  escena.time.delayedCall(300, () => {
    const mision = TextFX.letras(escena, width / 2, 170, nombre, {
      escala: 6, cada: 90, fijo: true, profundidad: 40,
      alTerminar: () => {
        const ya = TextFX.alert(escena, width / 2, 250, '¡COMIENZA!', { escala: 4 })
          .setScrollFactor(0).setDepth(40).setScale(2).setAlpha(0);
        escena.tweens.add({ targets: ya, scale: 1, alpha: 1, duration: 220, ease: 'Back.out', onComplete: () => ya.destellar(2, 70) });
        escena.cameras.main.flash(120, 255, 240, 200);
        escena.cameras.main.shake(180, 0.006);
        sonidoUI(escena, 'confirma');
        escena.time.delayedCall(1300, () => {
          mision.salir(400);
          escena.tweens.add({ targets: ya, alpha: 0, duration: 400, onComplete: () => ya.destroy() });
        });
      }
    });
  });
}

// --- Fin de una vida -----------------------------------------------------------

// El jugador murió (Jugador.morirJugador): pierde una vida. Con vidas, la
// escena vuelve a empezar y reaparece con ¡LISTO!; sin vidas, GAME OVER.
function finDeVida(escena) {
  if (escena.textoListo && escena.textoListo.active) escena.textoListo.destroy();
  const vidas = vidasPartida(escena) - 1;
  escena.registry.set('vidas', Math.max(0, vidas));
  perderVidaHUD(escena);
  if (vidas > 0) {
    escena.time.delayedCall(2400, () => {
      escena.cameras.main.fadeOut(500, 0, 0, 0);
      escena.cameras.main.once('camerafadeoutcomplete', () => {
        escena.registry.set('vida', VIDA.mitades);
        escena.registry.set('reaparecer', true);
        reiniciarArmas(escena); // Armas.js
        escena.scene.restart();
      });
    });
    return;
  }
  // GAME OVER: medio segundo congelado y la escena GameOver encima.
  escena.sinPausa = true;
  escena.time.delayedCall(500, () => {
    escena.scene.pause();
    escena.scene.launch('GameOver', { escena: escena.scene.key });
    escena.scene.bringToTop('GameOver');
  });
}

// =============================================================================
// GAME OVER: la pantalla se oscurece y pasa a gris, las letras caen una por
// una con un golpe, y "¿CONTINUAR?" con cuenta 9 → 0. START (ENTER/ESPACIO)
// continúa en el mismo lugar con vidas nuevas y el mismo puntaje; a 0, el
// puntaje final y los rehenes, y al menú en 3 s.
// =============================================================================
class GameOver extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(datos) {
    this.clave = datos.escena;
  }

  create() {
    const { width, height } = this.scale;
    const juego = this.scene.get(this.clave);
    const cam = juego.cameras.main;
    if (cam.postFX) this.gris = cam.postFX.addColorMatrix();
    if (this.gris) this.gris.grayscale(1);
    const velo = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0);
    this.tweens.add({ targets: velo, fillAlpha: 0.55, duration: 600 });
    if (this.sound.musicaActual) this.sound.musicaActual.pause();

    // GAME OVER: cada letra cae desde arriba, rebota y golpea.
    const texto = 'GAME OVER';
    const escala = 7;
    const paso = 9 * escala;
    const x0 = Math.round(width / 2 - (texto.length * paso) / 2 + paso / 2);
    [...texto].forEach((c, i) => {
      if (c === ' ') return;
      const l = TextFX.alert(this, x0 + i * paso, -80, c, { escala });
      this.tweens.add({
        targets: l, y: height / 2 - 90, duration: 420, delay: 300 + i * 140, ease: 'Bounce.out',
        onStart: () => this.time.delayedCall(260, () => { sonidoUI(this, 'golpe'); cam.shake(90, 0.008); })
      });
    });
    this.time.delayedCall(300 + texto.length * 140 + 500, () => this.preguntar());
    this.teclas = (ev) => {
      if (ev.repeat) return;
      if ((ev.code === 'Enter' || ev.code === 'Space') && this.cuenta !== undefined && this.cuenta >= 0) this.continuar();
    };
    window.addEventListener('keydown', this.teclas);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.teclas);
      if (this.gris && cam.postFX) cam.postFX.remove(this.gris);
    });
  }

  preguntar() {
    const { width, height } = this.scale;
    TextFX.menu(this, width / 2, height / 2 + 10, '¿CONTINUAR?', { escala: 3 });
    this.numero = TextFX.title(this, width / 2, height / 2 + 90, '9', { escala: 8 });
    TextFX.texto(this, width / 2, height / 2 + 160, 'PRESIONA START', { color: 'plata', escala: 2 });
    this.cuenta = 9;
    sonidoUI(this, 'tic');
    this.reloj = this.time.addEvent({
      delay: 1000, repeat: 9, callback: () => {
        this.cuenta--;
        if (this.cuenta < 0) { this.finPartida(); return; }
        this.numero.setText(String(this.cuenta)).setScale(1.5);
        this.tweens.add({ targets: this.numero, scale: 1, duration: 200, ease: 'Back.out' });
        sonidoUI(this, 'tic');
      }
    });
  }

  // Vidas nuevas, mismo puntaje, mismo lugar.
  continuar() {
    this.cuenta = -1;
    sonidoUI(this, 'confirma');
    this.registry.set('vidas', PARTIDA.vidas);
    this.registry.set('vida', VIDA.mitades);
    this.registry.set('reaparecer', true);
    reiniciarArmas(this);
    if (this.sound.musicaActual) this.sound.musicaActual.resume();
    const juego = this.scene.get(this.clave);
    this.scene.stop();
    juego.scene.restart();
  }

  finPartida() {
    this.reloj.remove();
    const { width, height } = this.scale;
    this.children.list.slice().forEach((o) => { if (o.type !== 'Rectangle') o.destroy(); });
    TextFX.alert(this, width / 2, height / 2 - 90, 'GAME OVER', { escala: 7 });
    TextFX.title(this, width / 2, height / 2 + 10, `PUNTAJE  ${this.registry.get('puntos') || 0}`, { escala: 3 });
    TextFX.menu(this, width / 2, height / 2 + 60, `REHENES  ${this.registry.get('rehenesTotal') || 0}`, { escala: 3 });
    this.time.delayedCall(3000, () => {
      ['CavernaJefe', 'MineCartScene', 'Tuneles', 'Subida', 'Patio', 'Nivel2', 'JefeFinal', 'Cueva', 'Interior', 'Nivel1'].forEach((k) => {
        if (this.scene.isActive(k) || this.scene.isPaused(k) || this.scene.isSleeping(k)) this.scene.stop(k);
      });
      this.scene.start('Menu');
    });
  }
}

// =============================================================================
// MISIÓN COMPLETA: el título letra por letra con fanfarria y una tabla que
// va sumando (REHENES x 1000, POWER-UPS x 500, TIEMPO) con sonido de conteo,
// TOTAL con flash y PRESIONA START para volver al menú.
// =============================================================================
class Resultado extends Phaser.Scene {
  constructor() {
    super('Resultado');
  }

  init(datos) {
    this.clave = datos.escena;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0);
    TextFX.letras(this, width / 2, 90, '¡MISIÓN COMPLETA!', { escala: 5, cada: 60, profundidad: 5 });
    sonidoUI(this, 'fanfarria');
    const reg = this.registry;
    const segundos = Math.round((Date.now() - (reg.get('inicioMision') || Date.now())) / 1000);
    const filas = [
      ['REHENES', reg.get('rehenesTotal') || 0, PARTIDA.puntosRehen],
      ['POWER-UPS', reg.get('powerupsTotal') || 0, PARTIDA.puntosPowerup],
      [`TIEMPO ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`, Math.max(0, 600 - segundos), 10]
    ];
    let total = reg.get('puntos') || 0;
    const y0 = 180;
    const contar = (i) => {
      if (i >= filas.length) { this.mostrarTotal(total, y0 + filas.length * 50 + 20); return; }
      const [nombre, cantidad, valor] = filas[i];
      const y = y0 + i * 50;
      TextFX.menu(this, width / 2 - 300, y, i < 2 ? `${nombre}  x ${cantidad}` : nombre, { escala: 2, origen: 0 });
      const puntos = TextFX.title(this, width / 2 + 300, y, '0', { escala: 3, origen: 1 });
      puntos.setOrigin(1, 0.5);
      const meta = cantidad * valor;
      const contador = { v: 0 };
      this.tweens.add({
        targets: contador, v: meta, duration: Math.min(1200, 200 + meta / 5),
        onUpdate: () => { puntos.setText(String(Math.round(contador.v))); sonidoUI(this, 'conteo'); },
        onComplete: () => { total += i === 2 ? meta : 0; this.time.delayedCall(250, () => contar(i + 1)); }
      });
    };
    this.time.delayedCall(1300, () => contar(0));
    this.teclas = (ev) => {
      if (!this.listo || ev.repeat || (ev.code !== 'Enter' && ev.code !== 'Space')) return;
      sonidoUI(this, 'confirma');
      ['CavernaJefe', 'MineCartScene', 'Tuneles', 'Subida', 'Patio', 'Nivel2', 'JefeFinal', 'Cueva', 'Interior', 'Nivel1'].forEach((k) => {
        if (this.scene.isActive(k) || this.scene.isPaused(k) || this.scene.isSleeping(k)) this.scene.stop(k);
      });
      // Terminado el Nivel 1 (su jefe final) sigue el Nivel 2, Potosí, con el
      // mismo puntaje y las mismas vidas.
      if (['JefeFinal', 'Nivel1'].includes(this.clave)) {
        ['Nivel2Base', 'PatioBase', 'SubidaBase'].forEach((k) => this.registry.remove(k));
        this.registry.set('rehenes', 0);
        this.scene.start('Nivel2');
        return;
      }
      this.scene.start('Menu');
    };
    window.addEventListener('keydown', this.teclas);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.teclas));
  }

  mostrarTotal(total, y) {
    const { width } = this.scale;
    this.registry.set('puntos', total);
    const linea = this.add.rectangle(width / 2, y - 22, 600, 2, 0xe0b85a);
    linea.setAlpha(0.8);
    TextFX.title(this, width / 2 - 300, y + 10, 'TOTAL', { escala: 3, origen: 0 });
    const t = TextFX.title(this, width / 2 + 300, y + 10, String(total), { escala: 4 });
    t.setOrigin(1, 0.5);
    t.destellar(4, 70);
    this.cameras.main.flash(150, 255, 240, 180);
    sonidoUI(this, 'confirma');
    this.time.delayedCall(800, () => {
      this.listo = true;
      const start = TextFX.menu(this, width / 2, y + 90, 'PRESIONA START', { escala: 2 });
      this.time.addEvent({ delay: 400, loop: true, callback: () => start.setVisible(!start.visible) });
    });
  }
}

// Fin de la misión: la escena del juego se congela y aparece la tabla.
function misionCompleta(escena) {
  escena.sinPausa = true;
  escena.time.delayedCall(1200, () => {
    escena.scene.pause();
    escena.scene.launch('Resultado', { escena: escena.scene.key });
    escena.scene.bringToTop('Resultado');
  });
}
