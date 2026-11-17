// =============================================================================
// Menú de pausa: ESC o P en cualquier escena del juego (Nivel1, Interior, Cueva,
// JefeFinal) la pausa y abre este menú encima:
//   CONTINUAR       vuelve al juego (también con ESC)
//   REINICIAR NIVEL  reinicia la escena en la que se está
//   CONTROLES       las teclas del juego
//   AJUSTES         volumen de la música y del sonido en general, pantalla completa
//   SALIR AL MENÚ   vuelve a la pantalla de título
// Se maneja con ↑/↓ (W/S), ENTER/ESPACIO/J para elegir y ←/→ (A/D) para
// cambiar los ajustes. Los ajustes se guardan en el navegador (localStorage).
// =============================================================================

const ESCENAS_JUEGO = ['JefeFinal', 'Cueva', 'Interior', 'Nivel1'];

const AJUSTES = { musica: 1, general: 1, ...leerAjustes() };

function leerAjustes() {
  try { return JSON.parse(localStorage.getItem('boliviaSlugAjustes')) || {}; } catch (e) { return {}; }
}

function guardarAjustes() {
  try { localStorage.setItem('boliviaSlugAjustes', JSON.stringify(AJUSTES)); } catch (e) { /* sin almacenamiento */ }
}

// Aplica el volumen: `general` a todo el sonido y `musica` además a la pista.
function aplicarAjustes(juego) {
  juego.sound.volume = AJUSTES.general;
  const musica = juego.sound.musicaActual;
  if (musica) musica.setVolume(volumenMusica(musica.key.replace('musica_', '')));
}

// ESC o P se escuchan en la ventana: pausan la escena del juego que esté
// activa. No durante GAME OVER, el resultado, la muerte ni la intro del jefe
// (sinPausa).
window.addEventListener('keydown', (ev) => {
  // ev.repeat: mantener la tecla apretada no vuelve a abrir la pausa; y
  // recién cerrada, no se reabre con la misma tecla.
  if ((ev.code !== 'Escape' && ev.code !== 'KeyP') || ev.repeat || !window.juego) return;
  if (performance.now() - (window.pausaCerradaEn || 0) < 400) return;
  const juego = window.juego;
  if (['Pausa', 'GameOver', 'Resultado'].some((k) => juego.scene.isActive(k))) return; // la maneja el menú
  const escena = ESCENAS_JUEGO.map((k) => juego.scene.getScene(k)).find((e) => e && e.sys.isActive());
  if (!escena || escena.estado === 'editor' || escena.sinPausa || escena.muerto) return;
  if (escena.cameras.main.fadeEffect.isRunning) return;
  cerrarSelector(escena, false); // Armas.js: sin cámara lenta
  window.teclaQueAbrioPausa = ev.timeStamp; // el menú no cuenta esta misma tecla
  escena.scene.pause();
  escena.scene.launch('Pausa', { escena: escena.scene.key });
  escena.scene.bringToTop('Pausa');
});

class Pausa extends Phaser.Scene {
  constructor() {
    super('Pausa');
  }

  init(datos) {
    this.clave = datos.escena;
  }

  create() {
    const { width, height } = this.scale;
    // La escena se reutiliza: lo de la pausa anterior no cuenta (si no,
    // la segunda vez ESC no cerraba el menú).
    this.contando = false;
    this.cerrada = false;
    this.enAjustes = false;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    // Marco del panel.
    const panel = this.add.rectangle(width / 2, height / 2 + 20, 500, 380, 0x0c0a08, 0.92).setStrokeStyle(3, 0xe0b85a);
    this.add.rectangle(width / 2, height / 2 + 20, 490, 370).setStrokeStyle(1, 0x5a4422);
    this.tweens.add({ targets: panel, scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 }, duration: 160, ease: 'Back.out' });
    // PAUSA grande, entra con rebote de escala (0 → 1.2 → 1).
    this.titulo = TextFX.title(this, width / 2, height / 2 - 120, 'PAUSA', { escala: 5 });
    this.titulo.setScale(0);
    this.tweens.chain({ targets: this.titulo, tweens: [{ scale: 1.2, duration: 160, ease: 'Quad.out' }, { scale: 1, duration: 110, ease: 'Quad.in' }] });
    this.ayuda = TextFX.texto(this, width / 2, height / 2 + 186, '↑↓ ELEGIR · ENTER ACEPTAR · ESC VOLVER', { color: 'plata', escala: 1 });
    // Flecha parpadeante junto a la opción elegida.
    this.flecha = TextFX.flecha(this, 0, 0, { escala: 2 });
    // La música baja al 30 % mientras está en pausa.
    const musica = this.sound.musicaActual;
    if (musica) {
      this.volumenAntes = musica.volume;
      musica.setVolume(musica.volume * 0.3);
    }
    this.verPrincipal();

    // Las teclas se escuchan en la ventana (no con el teclado de Phaser: con
    // el juego en pausa, Phaser volvía a mandar las teclas anteriores y cada
    // una contaba varias veces). Se quita al cerrar el menú.
    const acciones = {
      ArrowUp: () => this.mover(-1), KeyW: () => this.mover(-1),
      ArrowDown: () => this.mover(1), KeyS: () => this.mover(1),
      ArrowLeft: () => this.cambiar(-1), KeyA: () => this.cambiar(-1),
      ArrowRight: () => this.cambiar(1), KeyD: () => this.cambiar(1),
      Enter: () => this.elegir(), Space: () => this.elegir(), KeyJ: () => this.elegir(),
      Escape: () => (this.enAjustes && !this.contando ? this.verPrincipal() : this.continuar()),
      KeyP: () => (this.enAjustes && !this.contando ? this.verPrincipal() : this.continuar())
    };
    const alTeclear = (ev) => {
      if (ev.repeat || !acciones[ev.code] || ev.timeStamp <= (window.teclaQueAbrioPausa || 0)) return;
      ev.preventDefault();
      acciones[ev.code]();
    };
    window.addEventListener('keydown', alTeclear);
    this.events.once('shutdown', () => window.removeEventListener('keydown', alTeclear));
  }

  // Arma la lista de opciones: [{ texto, accion, valor? }].
  opciones(lista) {
    (this.items || []).forEach((o) => o.obj.destroy());
    const { width, height } = this.scale;
    this.lista = lista;
    const paso = lista.length > 5 ? 34 : 44;
    this.items = lista.map((o, i) => ({
      ...o, obj: TextFX.menu(this, width / 2, height / 2 - 50 + i * paso, this.etiqueta(o), { escala: o.info ? 1 : 2 })
    }));
    this.indice = 0;
    this.actualizar();
  }

  etiqueta(o) {
    return o.valor ? `${o.texto}  ◄ ${o.valor()} ►` : o.texto;
  }

  verPrincipal() {
    this.enAjustes = false;
    this.titulo.setText('PAUSA');
    this.opciones([
      { texto: 'CONTINUAR', accion: () => this.continuar() },
      { texto: 'REINICIAR NIVEL', accion: () => this.reiniciar() },
      { texto: 'CONTROLES', accion: () => this.verControles() },
      { texto: 'AJUSTES', accion: () => this.verAjustes() },
      { texto: 'SALIR AL MENÚ', accion: () => this.salirAlMenu() }
    ]);
  }

  // Los controles del juego (solo para leer; ESC o ENTER vuelve).
  verControles() {
    this.enAjustes = true;
    this.titulo.setText('CONTROLES');
    this.opciones([
      { texto: '←→ / A D   MOVERSE', info: true },
      { texto: '↑ / W   APUNTAR ARRIBA · TREPAR', info: true },
      { texto: '↓ / S   AGACHARSE', info: true },
      { texto: 'ESPACIO   SALTAR', info: true },
      { texto: 'J / X   DISPARAR  ·  SHIFT CORRER', info: true },
      { texto: 'TAB   ARMAS  ·  ESC / P   PAUSA', info: true },
      { texto: 'VOLVER', accion: () => this.verPrincipal() }
    ]);
    this.indice = this.items.length - 1;
    this.actualizar();
  }

  verAjustes() {
    this.enAjustes = true;
    this.titulo.setText('AJUSTES');
    const porcentaje = (v) => `${Math.round(v * 100)}%`;
    const pasoVolumen = (clave) => (d) => {
      AJUSTES[clave] = Phaser.Math.Clamp(Math.round((AJUSTES[clave] + d * 0.1) * 10) / 10, 0, 1);
      aplicarAjustes(this.game);
      const musica = this.sound.musicaActual;
      if (musica) { this.volumenAntes = musica.volume; musica.setVolume(musica.volume * 0.3); }
      guardarAjustes();
    };
    this.opciones([
      { texto: 'MÚSICA', valor: () => porcentaje(AJUSTES.musica), cambiar: pasoVolumen('musica') },
      { texto: 'SONIDO', valor: () => porcentaje(AJUSTES.general), cambiar: pasoVolumen('general') },
      {
        texto: 'PANTALLA COMPLETA', valor: () => (this.scale.isFullscreen ? 'SÍ' : 'NO'),
        cambiar: () => this.pantallaCompleta(), accion: () => this.pantallaCompleta()
      },
      { texto: 'VOLVER', accion: () => this.verPrincipal() }
    ]);
  }

  pantallaCompleta() {
    try { this.scale.toggleFullscreen(); } catch (e) { /* el navegador no lo permite */ }
  }

  mover(d) {
    if (this.contando) return;
    // Las líneas de información (CONTROLES) no se eligen.
    do { this.indice = (this.indice + d + this.items.length) % this.items.length; } while (this.items[this.indice].info);
    sonidoUI(this, 'tic');
    this.actualizar();
  }

  cambiar(d) {
    const o = this.items[this.indice];
    if (!o.cambiar) return;
    o.cambiar(d);
    this.time.delayedCall(50, () => this.actualizar());
  }

  elegir() {
    if (this.contando) return;
    const o = this.items[this.indice];
    sonidoUI(this, 'confirma');
    if (o.accion) o.accion();
    else if (o.cambiar) this.cambiar(1);
  }

  actualizar() {
    this.items.forEach((o, i) => {
      o.obj.setText(this.etiqueta(o));
      if (!o.info) o.obj.seleccionar(i === this.indice);
    });
    const elegida = this.items[this.indice].obj;
    this.flecha.setPosition(Math.round(elegida.x - elegida.anchoTexto / 2 - 22), elegida.y);
  }

  escenaJuego() {
    return this.scene.get(this.clave);
  }

  // Cuenta 3, 2, 1 rápida y devuelve el control.
  continuar() {
    // ESC/P otra vez durante la cuenta: vuelve al juego en el acto.
    if (this.contando) { this.volverAlJuego(); return; }
    this.contando = true;
    const { width, height } = this.scale;
    this.flecha.destroy(); // (parpadea sola: se borra)
    // Se va el menú y el velo se aclara: se ve el juego mientras cuenta.
    this.children.list.slice(1).forEach((o) => o.setVisible(false));
    this.tweens.add({ targets: this.children.list[0], alpha: 0.25, duration: 150 });
    const numero = TextFX.title(this, width / 2, height / 2, '3', { escala: 8 });
    [3, 2, 1].forEach((n, i) => this.time.delayedCall(i * 380, () => {
      numero.setText(String(n)).setScale(1.6).setAlpha(1);
      this.tweens.add({ targets: numero, scale: 1, duration: 200, ease: 'Back.out' });
      sonidoUI(this, 'tic');
    }));
    this.time.delayedCall(3 * 380, () => this.volverAlJuego());
    this.numeroCuenta = numero;
  }

  volverAlJuego() {
    if (this.cerrada) return;
    this.cerrada = true;
    window.pausaCerradaEn = performance.now();
    // Las teclas que se apretaron en el menú no quedan apretadas en el juego.
    const escena = this.escenaJuego();
    escena.input.keyboard.resetKeys();
    if (escena.input.keyboard.manager) escena.input.keyboard.manager.queue.length = 0;
    this.restaurarMusica();
    this.scene.resume(this.clave);
    this.scene.stop();
  }

  restaurarMusica() {
    const musica = this.sound.musicaActual;
    if (musica && this.volumenAntes !== undefined) musica.setVolume(this.volumenAntes);
  }

  // Reinicia la escena en la que se estaba (con la vida llena).
  reiniciar() {
    const escena = this.escenaJuego();
    this.restaurarMusica();
    this.registry.set('vida', VIDA.mitades);
    this.scene.stop();
    escena.scene.restart();
  }

  // Corta todas las escenas del juego y vuelve al título.
  salirAlMenu() {
    ESCENAS_JUEGO.forEach((k) => { if (this.scene.isActive(k) || this.scene.isPaused(k) || this.scene.isSleeping(k)) this.scene.stop(k); });
    this.registry.remove('cuevaBase');
    this.scene.start('Menu');
  }
}
