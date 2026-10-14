// =============================================================================
// Pelea con el jefe final, dentro del edificio del final del nivel
// (assets/fondos/final/interiror_final.jpeg). Se llega por la puerta del
// edificio en Nivel1 y no se vuelve.
//
// Guion:
//   1. entrada:        el jugador entra caminando desde la izquierda.
//   2. llegada:        un minibús entra desde la izquierda (por detrás del
//                      jugador), frena entre el polvo,
//                      abre la puerta y se baja el jefe, que levanta la wiphala.
//   3. pelea normal:   camina hacia el jugador y, de cerca, ataca con la bandera.
//   4. revive:         al quedarse sin vida masca coca y se prende un aura;
//                      brilla en blanco, crece y se transforma (rayos y polvo)
//                      en el jefe gigante.
//   5. pelea gigante:  la sala se pone roja (brasas, relámpagos, temblores).
//                      Más lento y con más vida; golpea el piso con la bandera
//                      y la onda alcanza más lejos (saltando se esquiva).
//   6. fin:            le explotan los balazos, suelta la bandera, cae de
//                      rodillas y queda tendido; aparece "MISIÓN CUMPLIDA".
//
// Los spritesheets salen de herramientas/jefe_spritesheet.py (ver
// assets/jefes/jefe_cuadros.json). Los cuadros miran a la derecha.
// =============================================================================

// Sala: la imagen se estira a la pantalla. piso: y de los pies; paredes: hasta
// dónde se camina.
const ARENA = { piso: 515, izquierda: 40, derecha: 984 };

const JEFE = {
  // El trufi entra por la izquierda (los cuadros miran a la derecha: así el
  // letrero no se ve al revés) y frena en `frena`. puerta: dónde está la
  // puerta corrediza respecto del centro (px de arte).
  minibus: { ancho: 218, alto: 90, cuadros: 6, llegada: -300, frena: 640, puerta: -33 },
  // Celdas y cuadros (jefe_cuadros.json).
  normal: {
    textura: 'jefe', ancho: 88, alto: 79,
    pose: [0, 1], caminar: [2, 13], ataque: [14, 19], revive: [20, 25],
    cuerpo: { ancho: 22, alto: 52 },
    vida: 25, velocidad: 95, alcance: 100, golpe: 3, pausa: 1100, alto_golpe: 80
  },
  gigante: {
    textura: 'jefeGigante', ancho: 160, alto: 125,
    aparece: [0, 1], caminar: [2, 8], ataque: [9, 12], muerte: [13, 16],
    cuerpo: { ancho: 52, alto: 110 },
    vida: 45, velocidad: 70, alcance: 200, golpe: 2, pausa: 1500
  }
};

class JefeFinal extends Phaser.Scene {
  constructor() {
    super('JefeFinal');
  }

  preload() {
    this.load.image('interiorFinal', 'assets/fondos/final/interiror_final.jpeg');
    this.load.spritesheet('minibus', 'assets/jefes/minibus_sheet.png', { frameWidth: JEFE.minibus.ancho, frameHeight: JEFE.minibus.alto });
    this.load.spritesheet('jefe', 'assets/jefes/jefe_sheet.png', { frameWidth: JEFE.normal.ancho, frameHeight: JEFE.normal.alto });
    this.load.spritesheet('jefeGigante', 'assets/jefes/jefe_gigante_sheet.png', { frameWidth: JEFE.gigante.ancho, frameHeight: JEFE.gigante.alto });
  }

  create() {
    const { width, height } = this.scale;
    this.fondo = this.add.image(0, 0, 'interiorFinal').setOrigin(0).setDisplaySize(width, height).setDepth(0);
    this.physics.world.setBounds(ARENA.izquierda, 0, ARENA.derecha - ARENA.izquierda, height);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.piso = this.physics.add.staticGroup();
    this.piso.add(this.add.zone(width / 2, ARENA.piso + 30, width * 2, 60));

    this.crearAnimaciones();
    this.crearJugador();
    this.crearBarraJefe();
    this.teclas = this.input.keyboard.createCursorKeys();
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,SPACE,J,X');

    tocarMusica(this, 'nivel1'); // sigue la del nivel (no se corta si ya suena)
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.estado = 'entrada';
    this.jugador.setVelocityX(JUGADOR.velocidad * 0.8).play('jugador_caminar');
  }

  crearAnimaciones() {
    if (this.anims.exists('jefe_caminar')) return;
    const animacion = (key, textura, [inicio, fin], frameRate, repeat = 0) =>
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(textura, { start: inicio, end: fin }), frameRate, repeat });
    const n = JEFE.normal;
    const g = JEFE.gigante;
    animacion('jefe_pose', 'jefe', n.pose, 3);
    animacion('jefe_caminar', 'jefe', n.caminar, 12, -1);
    animacion('jefe_ataque', 'jefe', n.ataque, 10);
    animacion('jefe_revive', 'jefe', n.revive, 4);
    animacion('gigante_caminar', 'jefeGigante', g.caminar, 8, -1);
    animacion('gigante_ataque', 'jefeGigante', g.ataque, 6);
  }

  crearJugador() {
    const textura = this.prepararJugador(); // Jugador.js
    // En la celda de 84x84 los pies están 30 px bajo el centro.
    this.jugador = this.physics.add.sprite(-60, ARENA.piso - 30 * ESCALA, textura, 0).setScale(ESCALA).setDepth(10);
    this.jugador.body.setSize(20, 56).setOffset(28, 16);
    this.physics.add.collider(this.jugador, this.piso);
    this.sombraJugador = this.add.ellipse(0, ARENA.piso, SOMBRA.jugador, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(9);
    this.crearBalas([this.piso]);
    this.enSueloAntes = true;
    this.saltoPresionado = false;
  }

  // ---------------------------------------------------------------------------
  // Guion
  // ---------------------------------------------------------------------------

  esperar(ms) {
    return new Promise((listo) => this.time.delayedCall(ms, listo));
  }

  moverA(objetivo, props) {
    return new Promise((listo) => this.tweens.add({ targets: objetivo, ...props, onComplete: listo }));
  }

  // El minibús entra desde la izquierda pasando por detrás del jugador, frena,
  // abre la puerta y se baja el jefe. El minibús queda estacionado de fondo.
  async llegadaJefe() {
    this.estado = 'escena';
    const j = this.jugador;
    j.setVelocityX(0).anims.stop();
    j.setFrame(0).setFlipX(false);

    const m = JEFE.minibus;
    const bus = this.add.sprite(m.llegada, ARENA.piso + 4, 'minibus', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(8);
    this.bus = bus;
    const traqueteo = this.tweens.add({ targets: bus, y: bus.y - 3, duration: 90, yoyo: true, repeat: -1 });
    await this.moverA(bus, { x: m.frena - 90, duration: 1300 });
    traqueteo.stop();
    bus.setY(ARENA.piso + 4).setFrame(1); // frena
    await this.moverA(bus, { x: m.frena, duration: 260, ease: 'Quad.out' });
    this.cameras.main.shake(150, 0.004);
    bus.setFrame(2); // polvo
    await this.esperar(320);
    bus.setFrame(3);
    await this.esperar(450);
    bus.setFrame(4); // abre la puerta
    await this.esperar(260);
    bus.setFrame(5);
    await this.esperar(300);

    // El jefe se baja por la puerta: aparece adentro (un poco más arriba, a
    // la altura del piso del trufi) y baja caminando hacia el jugador.
    const puerta = bus.x + m.puerta * ESCALA;
    this.crearJefe(puerta);
    const jefe = this.jefe;
    jefe.body.setAllowGravity(false);
    jefe.setY(ARENA.piso - 14).setAlpha(0).play('jefe_caminar');
    this.sombraJefe.setAlpha(0);
    await this.moverA(jefe, { alpha: 1, duration: 200 });
    this.tweens.add({ targets: this.sombraJefe, alpha: 1, duration: 300 });
    await this.moverA(jefe, { x: puerta - 90, y: ARENA.piso, duration: 650, ease: 'Sine.out' });
    jefe.body.setAllowGravity(true);
    jefe.body.reset(jefe.x, jefe.y);
    jefe.play('jefe_pose');
    await this.esperar(350);
    this.cartel('¡EL JEFE!');
    await this.esperar(1100);
    bus.setFrame(3); // cierra la puerta

    this.barra.forEach((o) => o.setVisible(true));
    this.actualizarBarra();
    this.estado = 'pelea';
  }

  cartel(texto, color = '#ffd23f') {
    const t = this.add.text(this.scale.width / 2, 170, texto, {
      fontFamily: FUENTE_TITULO, fontSize: '56px', color, stroke: '#2a1a05', strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', fill: true, stroke: true }
    }).setOrigin(0.5).setDepth(30).setScale(2.5).setAlpha(0);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1, alpha: 1, duration: 300, ease: 'Back.out' },
        { alpha: 0, delay: 1200, duration: 400 }
      ],
      onComplete: () => t.destroy()
    });
  }

  // ---------------------------------------------------------------------------
  // Jefe
  // ---------------------------------------------------------------------------

  crearJefe(x) {
    const jefe = this.physics.add.sprite(x, ARENA.piso, 'jefe', JEFE.normal.caminar[0])
      .setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.5).setFlipX(true);
    jefe.setCollideWorldBounds(true);
    this.jefe = jefe;
    this.fase = 'normal';
    this.ajustarCuerpoJefe();
    this.vidaJefe = JEFE.normal.vida;
    this.jefeOcupado = false;
    this.ataqueDesde = 0;
    this.physics.add.collider(jefe, this.piso);
    this.sombraJefe = this.add.ellipse(x, ARENA.piso, 90, SOMBRA.alto + 2, 0x000000, SOMBRA.alfa).setDepth(8.5);

    // Tocarlo empuja al jugador; las balas le bajan la vida.
    this.physics.add.overlap(this.jugador, jefe, () => {
      if (this.estado === 'pelea') this.golpearJugador(jefe.x);
    });
    this.physics.add.overlap(this.balas, jefe, (a, b) => this.balaAlJefe(a === jefe ? b : a));
  }

  // Caja de colisión apoyada en los pies, según la fase (cambian las celdas).
  ajustarCuerpoJefe() {
    const f = JEFE[this.fase];
    this.jefe.body.setSize(f.cuerpo.ancho, f.cuerpo.alto)
      .setOffset((f.ancho - f.cuerpo.ancho) / 2, f.alto - f.cuerpo.alto);
  }

  // Camina hacia el jugador y, de cerca y si ya pasó la pausa, ataca.
  moverJefe() {
    const jefe = this.jefe;
    if (!jefe || this.estado !== 'pelea' || this.jefeOcupado) return;
    const f = JEFE[this.fase];
    const dx = this.jugador.x - jefe.x;
    jefe.setFlipX(dx < 0);
    if (Math.abs(dx) < f.alcance && this.time.now > this.ataqueDesde) {
      this.atacarJefe();
    } else if (Math.abs(dx) > f.alcance * 0.6) {
      jefe.setVelocityX(Math.sign(dx) * f.velocidad);
      jefe.anims.play(this.fase === 'normal' ? 'jefe_caminar' : 'gigante_caminar', true);
    } else {
      jefe.setVelocityX(0);
      jefe.anims.stop();
      jefe.setFrame(f.caminar[0]);
    }
  }

  // Normal: bandera y puñete al frente. Gigante: golpea el piso; la onda pega
  // a los que estén en el suelo a su alcance, de los dos lados.
  atacarJefe() {
    const jefe = this.jefe;
    const f = JEFE[this.fase];
    const lado = jefe.flipX ? -1 : 1;
    this.jefeOcupado = true;
    jefe.setVelocityX(0);
    jefe.play(this.fase === 'normal' ? 'jefe_ataque' : 'gigante_ataque');
    const alGolpe = (anim, cuadro) => {
      if (cuadro.index - 1 !== f.golpe || this.estado !== 'pelea') return;
      const j = this.jugador;
      const dx = j.x - jefe.x;
      if (this.fase === 'normal') {
        const adelante = Math.sign(dx) === lado;
        if (adelante && Math.abs(dx) < f.alcance + 25 && Math.abs(j.body.bottom - jefe.body.bottom) < f.alto_golpe) {
          this.golpearJugador(jefe.x);
        }
      } else {
        this.cameras.main.shake(260, 0.012);
        chispas(this, jefe.x + lado * 70, ARENA.piso - 4, 22, -90, 150, 11);
        chispas(this, jefe.x - lado * 40, ARENA.piso - 4, 10, -90, 150, 11);
        const enSuelo = j.body.blocked.down || j.body.touching.down;
        if (enSuelo && Math.abs(dx) < f.alcance) this.golpearJugador(jefe.x);
      }
    };
    jefe.on('animationupdate', alGolpe);
    jefe.once('animationcomplete', () => {
      jefe.off('animationupdate', alGolpe);
      if (this.estado !== 'pelea') return;
      this.jefeOcupado = false;
      this.ataqueDesde = this.time.now + f.pausa;
    });
  }

  balaAlJefe(bala) {
    if (!bala.active) return;
    chispas(this, bala.x, bala.y, 8, bala.flipX ? 0 : 180, 120, 11);
    bala.destroy();
    if (this.estado !== 'pelea') return;
    this.vidaJefe--;
    this.actualizarBarra();
    this.jefe.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.jefe && this.jefe.clearTint());
    if (this.vidaJefe > 0) return;
    if (this.fase === 'normal') this.revivir();
    else this.vencerJefe();
  }

  // Se queda sin vida, masca coca y se prende el aura. Después la
  // transformación: brilla en blanco cada vez más rápido mientras crece,
  // un fogonazo de luz, y en su lugar el gigante crece desde el tamaño del
  // jefe normal entre rayos y polvo.
  async revivir() {
    const jefe = this.jefe;
    this.estado = 'transformacion';
    jefe.removeAllListeners('animationupdate');
    jefe.removeAllListeners('animationcomplete');
    jefe.setVelocityX(0).clearTint();
    jefe.play('jefe_revive');
    await new Promise((listo) => jefe.once('animationcomplete', listo));
    await this.esperar(300);

    // Mientras se transforma no cae ni choca: queda clavado en el piso.
    jefe.body.setAllowGravity(false);
    jefe.body.setVelocity(0);
    const temblor = this.time.addEvent({ delay: 120, loop: true, callback: () => this.cameras.main.shake(110, 0.004) });
    // 1. Destellos blancos cada vez más seguidos, crece y le saltan chispas.
    this.tweens.add({ targets: jefe, scale: ESCALA * 1.3, duration: 1300, ease: 'Quad.in' });
    for (const espera of [260, 220, 180, 150, 120, 100, 80, 70, 60, 60]) {
      jefe.setTintFill(0xffffff);
      chispas(this, jefe.x + Phaser.Math.Between(-30, 30), jefe.y - Phaser.Math.Between(20, 110), 6, -90, 360, 11);
      await this.esperar(40);
      jefe.clearTint();
      await this.esperar(espera);
    }
    jefe.setTintFill(0xffffff);
    await this.esperar(150);

    // 2. Fogonazo: cambia al gigante, todavía blanco y del tamaño del normal.
    temblor.remove();
    this.cameras.main.flash(500, 255, 255, 230);
    this.cameras.main.shake(700, 0.016);
    this.fase = 'gigante';
    jefe.anims.stop();
    jefe.setTexture('jefeGigante', JEFE.gigante.aparece[0]);
    jefe.setScale(ESCALA * JEFE.normal.alto / JEFE.gigante.alto * 1.2);
    jefe.setTintFill(0xffffff);
    this.ajustarCuerpoJefe();
    chispas(this, jefe.x - 70, ARENA.piso - 4, 18, -110, 80, 11);
    chispas(this, jefe.x + 70, ARENA.piso - 4, 18, -70, 80, 11);
    // 3. Crece hasta su tamaño entre rayos (el cuadro 0 es el de los rayos).
    await this.moverA(jefe, { scale: ESCALA, duration: 600, ease: 'Back.out' });
    jefe.clearTint();
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.9, duration: 400 });
    this.cartel('¡NO SE RINDE!', '#ff7a2a');
    this.fondoFuria();
    this.tweens.add({ targets: jefe, alpha: 0.6, duration: 70, yoyo: true, repeat: 6 });
    await this.esperar(1000);
    jefe.setAlpha(1).setFrame(JEFE.gigante.aparece[1]);
    jefe.body.setAllowGravity(true);
    jefe.body.reset(jefe.x, ARENA.piso);
    await this.esperar(700);

    this.vidaJefe = JEFE.gigante.vida;
    this.nombreJefe.setText('JEFE GIGANTE');
    this.actualizarBarra();
    this.jefeOcupado = false;
    this.ataqueDesde = this.time.now + 600;
    this.estado = 'pelea';
  }

  // Fase 2: la sala se pone roja y oscura, con brasas que suben, el rojo
  // que late, relámpagos y temblores cada tanto.
  fondoFuria() {
    const { width, height } = this.scale;
    // El fondo (y el trufi estacionado) pasan de su color a rojo oscuro.
    const tinte = { t: 0 };
    this.tweens.add({
      targets: tinte, t: 1, duration: 1200,
      onUpdate: () => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0xc04030), 1, tinte.t);
        this.fondo.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        if (this.bus) this.bus.setTint(Phaser.Display.Color.GetColor(c.r, (c.g + 255) / 2, (c.b + 255) / 2));
      }
    });
    // Oscuro arriba y en los costados: el centro queda iluminado.
    const sombra = this.add.graphics().setDepth(1).setAlpha(0);
    for (let i = 0; i < 6; i++) {
      sombra.fillStyle(0x000000, 0.1);
      sombra.fillRect(0, 0, width, 40 + i * 30);
      sombra.fillRect(0, 0, 60 + i * 25, height);
      sombra.fillRect(width - 60 - i * 25, 0, 60 + i * 25, height);
    }
    this.tweens.add({ targets: sombra, alpha: 1, duration: 1200 });
    // Rojo que late.
    const rojo = this.add.rectangle(0, 0, width, height, 0xff2010).setOrigin(0).setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({ targets: rojo, alpha: { from: 0.04, to: 0.16 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Brasas que suben del piso.
    this.add.particles(0, 0, 'fx_brasa', {
      x: { min: 0, max: width }, y: height + 10,
      speedY: { min: -160, max: -60 }, speedX: { min: -30, max: 30 },
      lifespan: { min: 2500, max: 4500 }, scale: { start: 2.5, end: 0.5 },
      alpha: { start: 1, end: 0 }, frequency: 70, blendMode: 'ADD'
    }).setDepth(2);
    // Relámpagos y temblores cada tanto.
    this.time.addEvent({
      delay: 2600, loop: true,
      callback: () => {
        if (this.estado === 'fin') return;
        this.cameras.main.flash(90, 255, 90, 50);
        this.cameras.main.shake(200, 0.004);
      }
    });
  }

  // Muerte (muerte_boss): le explotan los balazos encima, suelta la bandera,
  // cae de rodillas y queda tendido echando humo. Termina la misión.
  async vencerJefe() {
    const jefe = this.jefe;
    this.estado = 'fin';
    jefe.removeAllListeners('animationupdate');
    jefe.removeAllListeners('animationcomplete');
    jefe.anims.stop();
    jefe.setVelocityX(0).clearTint();
    jefe.body.enable = false;
    this.barra.forEach((o) => o.setVisible(false));
    const g = JEFE.gigante;
    jefe.setFrame(g.muerte[0]);
    for (let i = 0; i < 10; i++) {
      const x = jefe.x + Phaser.Math.Between(-g.ancho * 0.5, g.ancho * 0.5);
      const y = jefe.y - Phaser.Math.Between(30, g.alto * ESCALA * 0.85);
      fogonazo(this, x, y, Phaser.Math.FloatBetween(2, 3.5), 12, Phaser.Math.Between(0, 90));
      chispas(this, x, y, 12, -90, 360, 12);
      this.cameras.main.shake(120, 0.008);
      jefe.setTintFill(0xffffff);
      await this.esperar(50);
      jefe.clearTint();
      await this.esperar(90);
    }
    this.cameras.main.flash(400, 255, 255, 255);
    for (const cuadro of g.muerte.slice(1)) {
      jefe.setFrame(cuadro);
      if (cuadro === g.muerte[g.muerte.length - 1]) {
        this.cameras.main.shake(300, 0.012);
        chispas(this, jefe.x, ARENA.piso - 4, 24, -90, 160, 11);
      }
      await this.esperar(650);
    }
    this.tweens.add({ targets: this.sombraJefe, scaleX: 2.6, duration: 300 });

    this.jugador.setVelocityX(0);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, '¡MISIÓN CUMPLIDA!', {
      fontFamily: FUENTE_TITULO, fontSize: '56px', color: '#ffd23f', stroke: '#2a1a05', strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', fill: true, stroke: true }
    }).setOrigin(0.5).setDepth(30);
    await this.esperar(5000);
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }

  // ---------------------------------------------------------------------------
  // Barra de vida
  // ---------------------------------------------------------------------------

  crearBarraJefe() {
    const x = this.scale.width / 2;
    const ancho = 420;
    this.anchoBarra = ancho;
    this.nombreJefe = this.add.text(x, 22, 'EL JEFE', {
      fontFamily: FUENTE_PIXEL, fontSize: '12px', color: '#ffd23f', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);
    const fondo = this.add.rectangle(x, 44, ancho + 6, 18, 0x1b1d18).setStrokeStyle(2, 0xffd23f).setDepth(30);
    this.rellenoBarra = this.add.rectangle(x - ancho / 2, 44, ancho, 12, 0xd8402a).setOrigin(0, 0.5).setDepth(31);
    this.barra = [this.nombreJefe, fondo, this.rellenoBarra];
    this.barra.forEach((o) => o.setVisible(false));
  }

  actualizarBarra() {
    const f = Math.max(0, this.vidaJefe) / JEFE[this.fase].vida;
    this.rellenoBarra.width = this.anchoBarra * f;
  }

  // ---------------------------------------------------------------------------
  // Jugador
  // ---------------------------------------------------------------------------

  // Sala plana: caminar, correr (SHIFT), saltar y disparar.
  moverJugador() {
    const j = this.jugador;
    const izquierda = this.teclas.left.isDown || this.teclasExtra.A.isDown;
    const derecha = this.teclas.right.isDown || this.teclasExtra.D.isDown;
    const saltar = this.teclasExtra.SPACE.isDown || this.teclas.up.isDown || this.teclasExtra.W.isDown;
    const corre = this.teclas.shift.isDown;
    const dispara = this.teclasExtra.J.isDown || this.teclasExtra.X.isDown;
    const enSuelo = j.body.blocked.down || j.body.touching.down;

    const direccion = izquierda ? -1 : derecha ? 1 : 0;
    if (this.time.now > this.golpeHasta) j.setVelocityX(direccion * JUGADOR.velocidad * (corre ? JUGADOR.corrida : 1));
    if (direccion) j.setFlipX(direccion < 0);
    if (saltar && enSuelo && !this.saltoPresionado) j.setVelocityY(-JUGADOR.salto);
    this.saltoPresionado = saltar;

    if (dispara && this.time.now >= this.proximoDisparo) this.disparar();
    this.animarJugador(enSuelo, direccion, corre);
    this.enSueloAntes = enSuelo;
  }

  // Sombra pegada al piso; se achica al saltar.
  actualizarSombras() {
    const j = this.jugador;
    const f = Phaser.Math.Clamp(1 - (ARENA.piso - j.body.bottom) / SOMBRA.alturaMaxima, 0.3, 1);
    this.sombraJugador.setPosition(j.body.center.x, ARENA.piso - 1).setScale(f).setAlpha(f);
    if (this.jefe) this.sombraJefe.setPosition(this.jefe.x, ARENA.piso - 1);
  }

  update() {
    const j = this.jugador;
    if (this.estado === 'entrada' && j.x >= 200) this.llegadaJefe();
    if (this.estado === 'pelea' || this.estado === 'transformacion' || this.estado === 'fin') this.moverJugador();
    this.moverJefe();
    this.moverBalas();
    this.actualizarSombras();
  }
}

// Movimiento, animación, disparos y golpes del jugador (Jugador.js).
Object.assign(JefeFinal.prototype, AccionesJugador);
