// =============================================================================
// Interior de una casa: sala aparte del tamaño de la pantalla, cámara fija.
//
// Nivel1 se duerme (conserva todo su estado) y lanza esta escena con
//   { tipo: 'choza' | 'casa_destruida' | 'casa_ladrillo', id, recompensaTomada }.
// Al salir por la puerta, esta escena se detiene y despierta a Nivel1 con
//   { id, recompensa } para que deje al jugador frente a la misma puerta.
//
// Las imágenes (assets/fondos/Interiores/, 512x288; la casa de ladrillo 896x296). Las
// medidas vienen de medidas_interiores.txt, en píxeles de la imagen.
// Usa las texturas y animaciones que ya cargó Nivel1 (jugador elegido, rehén, power-up).
// =============================================================================

// Escala de las imágenes de interior. A x2 llenarían la pantalla, pero las
// puertas medirían 170 px contra los 116 del soldado: a x1.5 (puerta ~128 px)
// la casa queda a escala del personaje. La sala va centrada y lo que sobra
// alrededor queda oscuro. Para llenar la pantalla a esta escala, los
// interiores tendrían que medir 683x384.
const INTERIOR = { escala: 1.5, marco: 0x0d0a06 };

const INTERIORES = {
  casa_destruida: {
    paredes: [12, 500],
    pisoSolido: 257,
    // Piso de arriba one-way, con huecos entre los tramos (se cae abajo).
    pisos: [[11, 92, 144], [156, 261, 144], [339, 500, 144]],
    // Escalera en diagonal: pendiente caminable. Las medidas dan (238, 249) a
    // (349, 146); se alarga hasta el piso de abajo (y = 257) y termina justo a
    // la altura del piso de arriba (y = 144), si no el jugador se cae al llegar.
    pendiente: { desde: [229.5, 257], hasta: [351, 144] },
    salida: [26, 54, 172, 257],
    // Recompensa: un rehén atado en el piso de arriba.
    recompensa: { tipo: 'rehen', x: 450, y: 144 },
    // Caja de armas (Armas.js) abajo, antes de la escalera.
    cajaArmas: { x: 140, y: 257, arma: 'lanzagranadas' }
  },
  choza: {
    paredes: [30, 480],
    pisoSolido: 259,
    pisos: [],
    salida: [45, 79, 101, 259],
    // Recompensa: power-up junto a las cajas de la derecha.
    recompensa: { tipo: 'powerup', x: 400, y: 259 },
    cajaArmas: { x: 250, y: 259, arma: 'ak47' }
  },
  // Casa de ladrillo (assets/fondos/interior_casa.jpeg, achicada con
  // herramientas/interior_casa.py a 896x296). Más ancha que la pantalla: la
  // cámara sigue al jugador. Dos pisos; el de arriba tiene un agujero y se
  // sube por la escalera de la derecha.
  casa_ladrillo: {
    paredes: [42, 870],
    pisoSolido: 264,
    pisos: [[10, 498, 136], [582, 872, 136]],
    // Escalera: los escalones van de (687, 230) a (750, 172); se alarga hasta
    // el piso de abajo y termina a la altura del piso de arriba.
    pendiente: { desde: [650.5, 264], hasta: [790, 136] },
    salida: [57, 99, 183, 264],
    // Recompensa: un rehén atado arriba, pasando el agujero.
    recompensa: { tipo: 'rehen', x: 650, y: 136 },
    cajaArmas: { x: 385, y: 264, arma: 'escopeta' }
  }
};

class Interior extends Phaser.Scene {
  constructor() {
    super('Interior');
  }

  // Phaser reutiliza la misma instancia de la escena en cada entrada: todo el
  // estado de la visita anterior se limpia acá.
  init(datos) {
    this.datos = datos;
    this.sala = INTERIORES[datos.tipo];
    this.recompensa = null;
    this.recompensaTomada = false;
    this.enPendienteAntes = false;
    this.saltoPresionado = false;
  }

  preload() {
    this.load.image('interior_casa_destruida', 'assets/fondos/Interiores/casa_destruida.png');
    this.load.image('interior_choza', 'assets/fondos/Interiores/choza.png');
    this.load.image('interior_casa_ladrillo', 'assets/fondos/Interiores/casa_ladrillo.png');
  }

  create() {
    const { width, height } = this.scale;
    const sala = this.sala;
    const E = INTERIOR.escala;
    const imagen = this.textures.get(`interior_${this.datos.tipo}`).getSourceImage();
    // Sala centrada en la pantalla: píxeles de la imagen -> pantalla. Si es más
    // ancha que la pantalla, el mundo mide lo que la sala y la cámara la recorre.
    const mundo = Math.max(width, imagen.width * E);
    const ox = (mundo - imagen.width * E) / 2;
    const oy = (height - imagen.height * E) / 2;
    const px = (v) => ox + v * E;
    const py = (v) => oy + v * E;
    this.px = px;
    this.py = py;

    this.cameras.main.setBackgroundColor(INTERIOR.marco);
    this.add.image(ox, oy, `interior_${this.datos.tipo}`).setOrigin(0).setScale(E);

    // Cámara fija (o siguiendo al jugador en una sala ancha); paredes como límite del mundo.
    this.cameras.main.setBounds(0, 0, mundo, height);
    this.physics.world.setBounds(px(sala.paredes[0]), 0, (sala.paredes[1] - sala.paredes[0]) * E, height);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Colisiones: piso sólido de abajo y pisos one-way de arriba.
    this.suelo = this.physics.add.staticGroup();
    this.suelo.add(this.add.zone(mundo / 2, py(sala.pisoSolido) + 20, mundo, 40));
    this.pisos = this.physics.add.staticGroup();
    sala.pisos.forEach(([x0, x1, y]) => {
      const zona = this.add.zone(px((x0 + x1) / 2), py(y) + 3, (x1 - x0) * E, 6);
      this.pisos.add(zona);
      Object.assign(zona.body.checkCollision, { down: false, left: false, right: false });
    });

    // Jugador frente a la puerta de salida, mirando hacia adentro.
    const [s0, s1, , sAbajo] = sala.salida;
    this.puerta = { x0: px(s0), x1: px(s1), abajo: py(sAbajo) };
    this.jugador = this.physics.add.sprite(px((s0 + s1) / 2), py(sAbajo) - 30 * ESCALA, texturaJugador(this), 0)
      .setScale(ESCALA).setDepth(10).setCollideWorldBounds(true);
    fisicaJugador(this.jugador); // Jugador.js: cuerpo, gravedad y caída
    this.cuerpoTuto = cuerpoJugador(this); // piernas + torso de Tuto (CuerpoTuto.js) o null
    this.physics.add.collider(this.jugador, this.suelo);
    if (mundo > width) this.cameras.main.startFollow(this.jugador, true, 0.15, 0);
    else this.cameras.main.stopFollow().setScroll(0, 0);
    this.bajandoHasta = 0;
    this.sobrePisoEn = -Infinity;
    this.physics.add.collider(this.jugador, this.pisos, () => { this.sobrePisoEn = this.time.now; }, (j, piso) =>
      this.time.now >= this.bajandoHasta && j.body.velocity.y >= 0 && j.body.prev.y + j.body.height <= piso.body.top + 10);

    this.sombra = this.add.ellipse(0, 0, SOMBRA.jugador, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(9);
    panelVida(this); // Jugador.js: acá no hay golpes, solo se muestra
    hudVidas(this);  // Estado.js
    this.hudArma = hudArma(this);
    // Caja de armas: acá no se dispara, se abre tocándola (Armas.js). Abierta
    // una vez, no vuelve a aparecer.
    const caja = this.sala.cajaArmas;
    if (caja) crearCajaArmas(this, this.px(caja.x), this.py(caja.y) + HUNDIDO, caja.arma, `${this.datos.id}-caja`);
    this.crearRecompensa();
    this.crearFlechaSalida();

    this.teclas = this.input.keyboard.createCursorKeys();
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,S,SPACE');
    // La tecla con la que se entró puede seguir apretada: la puerta espera un poco.
    this.puertaDesde = this.time.now + 500;
    this.saliendo = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // Rehén atado o power-up, si todavía no se tomó en esta casa.
  crearRecompensa() {
    const r = this.sala.recompensa;
    if (this.datos.recompensaTomada) return;
    const x = this.px(r.x);
    const y = this.py(r.y);
    this.add.ellipse(x, y - 1, r.tipo === 'rehen' ? SOMBRA.rehen : 40, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(8);
    if (r.tipo === 'rehen') {
      this.recompensa = this.physics.add.staticSprite(x, y + HUNDIDO, 'npcRescate', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9);
      this.recompensa.play({ key: 'npc_atado', startFrame: 2 });
    } else {
      this.recompensa = this.physics.add.staticSprite(x, y - 40, 'powerup').setScale(ESCALA * 1.5);
      this.tweens.add({ targets: this.recompensa, y: y - 48, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.recompensa.refreshBody();
    this.physics.add.overlap(this.jugador, this.recompensa, () => this.tomarRecompensa());
  }

  tomarRecompensa() {
    const objeto = this.recompensa;
    if (!objeto || this.recompensaTomada) return;
    this.recompensaTomada = true;
    objeto.body.enable = false;
    const rehen = this.sala.recompensa.tipo === 'rehen';
    this.registry.inc(rehen ? 'rehenes' : 'powerups');
    this.aviso(objeto.x, objeto.y - (rehen ? NPC.alto * ESCALA : 40), rehen ? '¡GRACIAS!' : '¡POWER-UP!', rehen ? 'oro' : 'plata');
    if (!rehen) {
      this.cameras.main.flash(120, 255, 240, 160);
      objeto.destroy();
      return;
    }
    // El rehén se libera y sale corriendo hacia la puerta (se va de la casa).
    objeto.play('npc_libre');
    objeto.once('animationcomplete', () => {
      objeto.play('npc_sale');
      this.tweens.add({ targets: objeto, x: this.puerta.x0, alpha: 0, duration: 1600, onComplete: () => objeto.destroy() });
    });
  }

  // color: 'oro', 'plata' o 'rojo' (TextFX).
  aviso(x, y, texto, color) {
    TextFX.popup(this, x, y, texto, { color }).setDepth(20);
  }

  crearFlechaSalida() {
    const { x0, x1, abajo } = this.puerta;
    this.flecha = this.add.triangle((x0 + x1) / 2, abajo - 140, 0, 14, 10, 0, 20, 14, 0xffd23f)
      .setStrokeStyle(2, 0x2a1a05).setDepth(20).setVisible(false);
    this.tweens.add({ targets: this.flecha, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
  }

  // Altura de la pendiente (escalera de la casa) en x, o null fuera de ella.
  pendienteEn(x) {
    const p = this.sala.pendiente;
    if (!p) return null;
    const [ax, ay] = [this.px(p.desde[0]), this.py(p.desde[1])];
    const [bx, by] = [this.px(p.hasta[0]), this.py(p.hasta[1])];
    if (x < ax || x > bx) return null;
    return ay + ((x - ax) / (bx - ax)) * (by - ay);
  }

  update() {
    const j = this.jugador;
    const b = j.body;
    if (this.saliendo) return;
    if (noclipJugador(this)) return; // modo admin (Admin.js)
    const izquierda = this.teclas.left.isDown || this.teclasExtra.A.isDown;
    const derecha = this.teclas.right.isDown || this.teclasExtra.D.isDown;
    const arriba = this.teclas.up.isDown || this.teclasExtra.W.isDown;
    const abajo = this.teclas.down.isDown || this.teclasExtra.S.isDown;
    const espacio = this.teclasExtra.SPACE.isDown;

    // Pendiente: igual que las rampas del nivel, se pega el cuerpo a la línea.
    let enPendiente = false;
    const sup = this.pendienteEn(b.center.x);
    const tolerancia = this.enPendienteAntes ? 30 : 4;
    if (sup !== null && b.velocity.y >= 0 && this.time.now >= this.bajandoHasta &&
        b.bottom >= sup - tolerancia && b.bottom <= sup + 20) {
      b.y += sup - b.bottom;
      b.velocity.y = 0;
      enPendiente = true;
    }
    this.enPendienteAntes = enPendiente;
    const enSuelo = b.blocked.down || b.touching.down || enPendiente;

    // Puerta de salida.
    const enPuerta = b.center.x > this.puerta.x0 - 10 && b.center.x < this.puerta.x1 + 10 && Math.abs(b.bottom - this.puerta.abajo) < 12;
    this.flecha.setVisible(enPuerta);
    if (enPuerta && arriba && enSuelo && this.time.now > this.puertaDesde) {
      this.salir();
      return;
    }

    const direccion = izquierda ? -1 : derecha ? 1 : 0;
    j.setVelocityX(direccion * JUGADOR.velocidad);
    if (direccion) j.setFlipX(direccion < 0);
    const saltar = espacio || (arriba && !enPuerta);
    if (abajo && enSuelo && this.time.now - this.sobrePisoEn < 100) {
      this.bajandoHasta = this.time.now + 250; // ABAJO en el piso de arriba: se deja caer
    } else if (saltar && enSuelo && !this.saltoPresionado) {
      j.setVelocityY(-JUGADOR.salto);
    }
    this.saltoPresionado = saltar;

    if (!enSuelo) {
      j.anims.stop();
      j.setFrame(CUADROS_JUGADOR[texturaJugador(this)].aire);
    } else if (direccion) {
      j.anims.play('jugador_caminar', true);
    } else {
      j.anims.stop();
      j.setFrame(0);
    }

    // Sombra en el piso de abajo, en la pendiente o en el tramo de arriba.
    let suelo = this.py(this.sala.pisoSolido);
    if (sup !== null && sup >= b.bottom - 4) suelo = Math.min(suelo, sup);
    this.pisos.getChildren().forEach((z) => {
      if (b.center.x >= z.body.left && b.center.x <= z.body.right && z.body.top >= b.bottom - 4) suelo = Math.min(suelo, z.body.top);
    });
    const f = Phaser.Math.Clamp(1 - (suelo - b.bottom) / SOMBRA.alturaMaxima, 0.3, 1);
    this.sombra.setPosition(b.center.x, suelo - 1).setScale(f).setAlpha(f);
  }

  // Fade y vuelta al nivel, frente a la misma puerta.
  salir() {
    this.saliendo = true;
    this.jugador.setVelocity(0);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.wake('Nivel1', { id: this.datos.id, recompensa: !!this.recompensaTomada });
      this.scene.stop();
    });
  }
}
