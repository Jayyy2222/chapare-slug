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
//   4. revive:         al quedarse sin vida masca coca, se le inflan los
//                      músculos y se prende un aura (revive_boss.jpeg); brilla
//                      en blanco, crece y se transforma (rayos y polvo) en el
//                      jefe gigante.
//   5. pelea gigante:  la sala se pone roja (brasas, relámpagos, temblores).
//                      Más lento y con más vida. Combo a puñetes
//                      (boss_ataque.jpeg): el puñete de energía pega al frente
//                      y el puñetazo al piso larga una onda que alcanza más
//                      lejos, de los dos lados (saltando se esquiva).
//   6. fin:            le explota el balazo, se tambalea, sale volando de
//                      espaldas, aterriza entre el polvo y queda tendido con
//                      estrellitas (muerte_boss.jpeg); "MISIÓN CUMPLIDA".
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
    pose: [0, 1], caminar: [2, 13], ataque: [14, 19], revive: [20, 27],
    cuerpo: { ancho: 22, alto: 52 },
    vida: 25, velocidad: 95, alcance: 100, golpe: 3, pausa: 1100, alto_golpe: 80
  },
  gigante: {
    textura: 'jefeGigante', ancho: 215, alto: 127,
    aparece: [0, 1], caminar: [2, 8], ataque: [9, 16], muerte: [17, 25],
    cuerpo: { ancho: 52, alto: 110 },
    vida: 45, velocidad: 70, alcance: 200, pausa: 1500,
    // Cuadros del combo (0 = guardia): 3 puñete de energía al frente, 6
    // puñetazo al piso (onda).
    golpeFrente: 3, golpePiso: 6, alcanceFrente: 170, alto_golpe: 150,
    // Muerte (cuadros dentro de `muerte`): 0 balazo, 1 se tambalea, 2-4 sale
    // volando de espaldas, 5 aterriza (polvo), 6 se arrastra, 7 y 8 tendido.
    // ms de cada cuadro desde el 1; vuelo: px hacia atrás y alto del arco.
    muerteTiempos: [130, 100, 100, 110, 200, 190, 420], vuelo: { atras: 170, alto: 55 }
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
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,S,SPACE,J,X,TAB');

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
    animacion('jefe_revive', 'jefe', n.revive, 3);
    animacion('gigante_caminar', 'jefeGigante', g.caminar, 8, -1);
    animacion('gigante_ataque', 'jefeGigante', g.ataque, 9);
  }

  crearJugador() {
    const textura = this.prepararJugador(); // Jugador.js
    // En la celda de 84x84 los pies están 30 px bajo el centro.
    this.jugador = this.physics.add.sprite(-60, ARENA.piso - 30 * ESCALA, textura, 0).setScale(ESCALA).setDepth(10);
    fisicaJugador(this.jugador); // Jugador.js: cuerpo, gravedad y caída
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
    this.sinPausa = true; // Pausa.js: no durante la intro del jefe
    await new Promise((listo) => alertaJefe(this, listo)); // ¡ALERTA! (Estado.js)
    this.sinPausa = true;
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
    this.sinPausa = false;
  }

  // color: 'oro' (título) o 'rojo' (alerta).
  cartel(texto, color = 'oro') {
    const crear = color === 'rojo' ? TextFX.alert : TextFX.title;
    const t = crear(this, this.scale.width / 2, 170, texto, { escala: 5 }).setScrollFactor(0)
      .setDepth(30).setScale(2.5).setAlpha(0);
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

  // Normal: bandera y puñete al frente. Gigante: combo; el puñete de energía
  // pega al frente y el puñetazo al piso larga una onda que pega a los que
  // estén en el suelo a su alcance, de los dos lados.
  atacarJefe() {
    const jefe = this.jefe;
    const f = JEFE[this.fase];
    const lado = jefe.flipX ? -1 : 1;
    this.jefeOcupado = true;
    jefe.setVelocityX(0);
    jefe.play(this.fase === 'normal' ? 'jefe_ataque' : 'gigante_ataque');
    const alGolpe = (anim, cuadro) => {
      if (this.estado !== 'pelea') return;
      const i = cuadro.index - 1;
      const j = this.jugador;
      const dx = j.x - jefe.x;
      const alFrente = (alcance) => Math.sign(dx) === lado && Math.abs(dx) < alcance
        && Math.abs(j.body.bottom - jefe.body.bottom) < f.alto_golpe;
      if (this.fase === 'normal') {
        if (i === f.golpe && alFrente(f.alcance + 25)) this.golpearJugador(jefe.x);
      } else if (i === f.golpeFrente) {
        this.cameras.main.shake(120, 0.006);
        chispas(this, jefe.x + lado * 80 * ESCALA, jefe.y - 75 * ESCALA, 14, lado > 0 ? 0 : 180, 70, 11);
        if (alFrente(f.alcanceFrente)) this.golpearJugador(jefe.x);
      } else if (i === f.golpePiso) {
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
    if (this.impactoBala(bala)) return; // cohete o granada: explota en área (Jugador.js)
    sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1, ESCALA * 0.8); // Efectos.js
    const dano = bala.getData('dano') || 1;
    bala.destroy();
    this.danarJefe(dano);
  }

  // Explosiones y machete (Jugador.js): si el jefe está en el radio, le pega.
  danoEnArea(x, y, radio, dano) {
    const jefe = this.jefe;
    if (!jefe || !jefe.body || !jefe.body.enable) return;
    const c = jefe.body.center;
    if (Math.abs(x - c.x) > radio + jefe.body.width / 2 || Math.abs(y - c.y) > radio + jefe.body.height / 2) return;
    sangrar(this, c.x, y, x < c.x ? 1 : -1, ESCALA * 0.8);
    this.danarJefe(dano);
  }

  danarJefe(dano) {
    if (this.estado !== 'pelea') return;
    this.vidaJefe -= dano;
    this.actualizarBarra();
    this.jefe.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.jefe && this.jefe.clearTint());
    if (this.vidaJefe > 0) return;
    if (this.fase === 'normal') this.revivir();
    else this.vencerJefe();
  }

  // Alto visible (px de la textura, sin lo transparente) de un cuadro: para
  // que la transformación crezca pareja al pasar del jefe normal al gigante.
  altoVisible(clave, cuadro) {
    this.altos = this.altos || {};
    const id = clave + ':' + cuadro;
    if (this.altos[id] === undefined) {
      const f = this.textures.getFrame(clave, cuadro);
      let arriba = f.height;
      let abajo = 0;
      for (let y = 0; y < f.height; y++) {
        for (let x = 0; x < f.width; x += 2) {
          if (this.textures.getPixelAlpha(x, y, clave, cuadro) > 0) {
            arriba = Math.min(arriba, y);
            abajo = y;
            break;
          }
        }
      }
      this.altos[id] = Math.max(1, abajo - arriba + 1);
    }
    return this.altos[id];
  }

  // Alto en pantalla del jefe ahora mismo.
  altoJefe() {
    const j = this.jefe;
    return this.altoVisible(j.texture.key, j.frame.name) * j.scaleY;
  }

  // Rayo quebrado de (x0, y0) a (x1, y1): halo violeta, cuerpo celeste y
  // centro blanco (ADD), con ramitas; se apaga en `dura` ms.
  rayo(x0, y0, x1, y1, opciones = {}) {
    const { grosor = 3, ramas = 2, dura = 260, profundidad = 9.6 } = opciones;
    const g = this.add.graphics().setDepth(profundidad).setBlendMode(Phaser.BlendModes.ADD);
    const quebrado = (ax, ay, bx, by, desvio) => {
      const pasos = Math.max(4, Math.round(Phaser.Math.Distance.Between(ax, ay, bx, by) / 18));
      const nx = -(by - ay);
      const ny = bx - ax;
      const largo = Math.hypot(nx, ny) || 1;
      const puntos = [];
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const d = i === 0 || i === pasos ? 0 : Phaser.Math.FloatBetween(-desvio, desvio);
        puntos.push({ x: ax + (bx - ax) * t + (nx / largo) * d, y: ay + (by - ay) * t + (ny / largo) * d });
      }
      return puntos;
    };
    const trazar = (puntos, ancho, color, alfa) => {
      g.lineStyle(ancho, color, alfa).beginPath().moveTo(puntos[0].x, puntos[0].y);
      puntos.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
    };
    const principal = quebrado(x0, y0, x1, y1, 22);
    trazar(principal, grosor * 5, 0x7a3cff, 0.25);
    trazar(principal, grosor * 2.2, 0x6fd8ff, 0.7);
    trazar(principal, grosor, 0xffffff, 1);
    for (let r = 0; r < ramas; r++) {
      const desde = principal[Phaser.Math.Between(1, principal.length - 2)];
      const angulo = Math.atan2(y1 - y0, x1 - x0) + Phaser.Math.FloatBetween(-1, 1);
      const largo = Phaser.Math.Between(40, 110);
      const rama = quebrado(desde.x, desde.y, desde.x + Math.cos(angulo) * largo, desde.y + Math.sin(angulo) * largo, 10);
      trazar(rama, grosor * 2.5, 0x7a3cff, 0.25);
      trazar(rama, Math.max(1, grosor * 0.6), 0xe8f6ff, 0.9);
    }
    this.tweens.add({ targets: g, alpha: 0, duration: dura, ease: 'Quad.in', onComplete: () => g.destroy() });
    return g;
  }

  // Rayo que cae del techo sobre el jefe, con fogonazo, chispas y temblor.
  rayoSobreJefe(fuerza = 1) {
    const jefe = this.jefe;
    const arriba = jefe.y - this.altoJefe();
    const x = jefe.x + Phaser.Math.Between(-40, 40);
    this.rayo(x + Phaser.Math.Between(-160, 160), -20, x, arriba + 10, { grosor: 2 + fuerza * 2, ramas: 2 + fuerza, dura: 220 + fuerza * 80 });
    // Detrás del jefe, otro rayo lejano.
    this.rayo(Phaser.Math.Between(80, this.scale.width - 80), -20, Phaser.Math.Between(80, this.scale.width - 80),
      Phaser.Math.Between(200, 420), { grosor: 2, ramas: 1, dura: 300, profundidad: 1.6 });
    fogonazo(this, x, arriba + 10, 1.5 + fuerza, 11);
    chispas(this, x, arriba + 10, 8 + fuerza * 6, -90, 360, 11);
    this.cameras.main.shake(140 + fuerza * 60, 0.004 + fuerza * 0.003);
    this.cameras.main.flash(70, 200, 220, 255);
  }

  // Arcos eléctricos cortos alrededor del cuerpo (el aura chisporrotea).
  arcosAura(cantidad = 3) {
    const jefe = this.jefe;
    const alto = this.altoJefe();
    for (let i = 0; i < cantidad; i++) {
      const y = jefe.y - Phaser.Math.FloatBetween(0.15, 0.95) * alto;
      const lado = Phaser.Math.RND.sign();
      const x = jefe.x + lado * Phaser.Math.Between(10, 40);
      this.rayo(x, y, x + lado * Phaser.Math.Between(30, 70), y + Phaser.Math.Between(-50, 50), { grosor: 1.5, ramas: 0, dura: 140 });
    }
  }

  // La sala se apaga alrededor: velo negro con un círculo de luz en el jefe.
  oscurecerSala(alfa, duracion) {
    const { width, height } = this.scale;
    if (!this.velo) {
      if (!this.textures.exists('jefe_velo')) {
        const t = this.textures.createCanvas('jefe_velo', 512, 288);
        const ctx = t.getContext();
        const g = ctx.createRadialGradient(256, 190, 10, 256, 190, 230);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.25, 'rgba(0,0,0,0.35)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.85)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 288);
        t.refresh();
      }
      this.velo = this.add.image(width / 2, height / 2, 'jefe_velo').setDisplaySize(width * 1.3, height * 1.3)
        .setDepth(1.5).setAlpha(0);
    }
    this.velo.x = this.jefe.x;
    this.tweens.add({ targets: this.velo, alpha: alfa, duration: duracion });
  }

  // Se queda sin vida y se transforma, despacio y cada vez más fuerte:
  //   1. masca coca y se le inflan los músculos (revive_boss, lento) mientras
  //      la sala se apaga y crece un poco;
  //   2. carga: destellos blancos cada vez más seguidos, arcos eléctricos en
  //      el aura y rayos que caen del techo; crece en cada rayo;
  //   3. estallido: un rayo enorme, fogonazo, y en su lugar el gigante, del
  //      mismo alto que tenía (así las proporciones crecen parejas);
  //   4. el gigante termina de crecer en golpes, uno por rayo, y ruge.
  async revivir() {
    const jefe = this.jefe;
    this.estado = 'transformacion';
    jefe.removeAllListeners('animationupdate');
    jefe.removeAllListeners('animationcomplete');
    jefe.setVelocityX(0).clearTint();
    // Mientras se transforma no cae ni choca: queda clavado en el piso.
    jefe.body.setAllowGravity(false);
    jefe.body.setVelocity(0);
    const s0 = jefe.scaleX;
    // Alto final (el gigante a su escala) y alto al empezar: todo el
    // crecimiento se reparte entre los dos.
    // (cuadro de los rayos, el que se ve mientras termina de crecer).
    const altoFinal = this.altoVisible('jefeGigante', JEFE.gigante.aparece[0]) * ESCALA;
    const crecerA = (alto, duracion, ease = 'Sine.inOut') => this.moverA(jefe, {
      scale: jefe.scaleX * alto / this.altoJefe(), duration: duracion, ease
    });

    // 1. Revive lento: masca coca, se infla; la sala se apaga.
    this.oscurecerSala(0.7, 2600);
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.4, duration: 2600 });
    jefe.play({ key: 'jefe_revive', frameRate: 3 });
    const pulsoAura = this.time.addEvent({ delay: 260, loop: true, callback: () => this.arcosAura(1) });
    this.tweens.add({ targets: jefe, scale: s0 * 1.12, duration: 2600, ease: 'Sine.inOut' });
    await new Promise((listo) => jefe.once('animationcomplete', listo));
    await this.esperar(250);

    // 2. Carga: destellos cada vez más seguidos, rayos del techo y crece en cada uno.
    const temblor = this.time.addEvent({ delay: 110, loop: true, callback: () => this.cameras.main.shake(100, 0.004) });
    this.oscurecerSala(0.92, 3000);
    const alto0 = this.altoJefe();
    const pasos = [420, 360, 300, 250, 200, 160, 130, 110, 90, 80, 70, 60];
    for (const [i, espera] of pasos.entries()) {
      jefe.setTintFill(0xffffff);
      this.arcosAura(2 + Math.floor(i / 3));
      if (i % 3 === 2) {
        this.rayoSobreJefe(1 + Math.floor(i / 4));
        // Crece hasta ~75% del gigante, de a poco.
        crecerA(alto0 + (altoFinal * 0.75 - alto0) * ((i + 1) / pasos.length), 260, 'Back.out');
      }
      await this.esperar(50);
      jefe.clearTint();
      await this.esperar(espera);
    }
    pulsoAura.remove();
    jefe.setTintFill(0xffffff);
    await this.esperar(200);

    // 3. Estallido: rayo enorme y el gigante aparece del mismo alto, en blanco.
    temblor.remove();
    for (let k = 0; k < 3; k++) this.rayoSobreJefe(3);
    this.cameras.main.flash(600, 255, 255, 235);
    this.cameras.main.shake(900, 0.02);
    explotar(this, jefe.x, ARENA.piso - 40, 'grande', ESCALA * 1.2); // Efectos.js
    const altoAntes = this.altoJefe();
    this.fase = 'gigante';
    jefe.anims.stop();
    jefe.setTexture('jefeGigante', JEFE.gigante.aparece[0]);
    jefe.setScale(altoAntes / this.altoVisible('jefeGigante', JEFE.gigante.aparece[0]));
    jefe.setTintFill(0xffffff);
    this.ajustarCuerpoJefe();
    chispas(this, jefe.x - 70, ARENA.piso - 4, 24, -110, 80, 11);
    chispas(this, jefe.x + 70, ARENA.piso - 4, 24, -70, 80, 11);
    this.fondoFuria();

    // 4. Termina de crecer en golpes, uno por rayo (el cuadro 0 es el de los rayos).
    const altoG = this.altoJefe();
    for (let k = 1; k <= 4; k++) {
      this.rayoSobreJefe(2);
      this.arcosAura(4);
      await crecerA(altoG + (altoFinal - altoG) * (k / 4), 380, 'Back.out');
      if (k === 2) jefe.clearTint();
      await this.esperar(220);
    }
    jefe.setScale(ESCALA).clearTint();
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.9, duration: 400 });
    this.cartel('¡NO SE RINDE!', 'rojo');
    // En la pelea la sala queda en penumbra (el velo sigue al jefe).
    this.oscurecerSala(0.5, 1200);
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

  // Fase 2: la sala queda tenebrosa: casi a oscuras y teñida de rojo sangre,
  // con niebla baja, brasas que suben, el rojo que late, y tormenta (rayos de
  // fondo con relámpago) y temblores cada tanto.
  fondoFuria() {
    const { width, height } = this.scale;
    // El fondo (y el trufi estacionado) pasan de su color a rojo muy oscuro.
    const tinte = { t: 0 };
    this.tweens.add({
      targets: tinte, t: 1, duration: 1600,
      onUpdate: () => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0x6a1c18), 1, tinte.t);
        this.fondo.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        if (this.bus) this.bus.setTint(Phaser.Display.Color.GetColor(c.r, (c.g + 160) / 2, (c.b + 160) / 2));
      }
    });
    // Oscuro arriba y en los costados: el centro queda apenas iluminado.
    const sombra = this.add.graphics().setDepth(1).setAlpha(0);
    for (let i = 0; i < 8; i++) {
      sombra.fillStyle(0x000000, 0.12);
      sombra.fillRect(0, 0, width, 50 + i * 34);
      sombra.fillRect(0, 0, 70 + i * 30, height);
      sombra.fillRect(width - 70 - i * 30, 0, 70 + i * 30, height);
    }
    this.tweens.add({ targets: sombra, alpha: 1, duration: 1600 });
    // Rojo que late, más lento y profundo.
    const rojo = this.add.rectangle(0, 0, width, height, 0xff1008).setOrigin(0).setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({ targets: rojo, alpha: { from: 0.02, to: 0.12 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Niebla baja que se arrastra por el piso.
    this.add.particles(0, 0, 'fx_humo', {
      x: { min: -60, max: width + 60 }, y: { min: ARENA.piso - 60, max: ARENA.piso + 30 },
      speedX: { min: -25, max: 25 }, lifespan: { min: 4000, max: 7000 },
      scale: { start: 5, end: 9 }, alpha: { start: 0, end: 0.35, ease: (t) => Math.sin(t * Math.PI) },
      tint: 0x2a0a0a, frequency: 160
    }).setDepth(8.4);
    // Brasas que suben del piso.
    this.add.particles(0, 0, 'fx_brasa', {
      x: { min: 0, max: width }, y: height + 10,
      speedY: { min: -160, max: -60 }, speedX: { min: -30, max: 30 },
      lifespan: { min: 2500, max: 4500 }, scale: { start: 2.5, end: 0.5 },
      alpha: { start: 1, end: 0 }, frequency: 70, blendMode: 'ADD'
    }).setDepth(2);
    // Tormenta: relámpago con rayos de fondo y temblor cada tanto.
    const tormenta = () => {
      if (this.estado === 'fin') return;
      this.cameras.main.flash(110, 150, 60, 60);
      this.cameras.main.shake(220, 0.005);
      const x = Phaser.Math.Between(60, width - 60);
      this.rayo(x, -20, x + Phaser.Math.Between(-120, 120), Phaser.Math.Between(180, 380), { grosor: 2.5, ramas: 3, dura: 380, profundidad: 1.6 });
      this.time.delayedCall(Phaser.Math.Between(1800, 3600), tormenta);
    };
    this.time.delayedCall(1200, tormenta);
  }

  // Muerte (muerte_boss): le explotan los balazos encima, se tambalea, sale
  // volando de espaldas, aterriza entre el polvo y queda tendido. Termina la
  // misión.
  // Nube de polvo baja que se abre a los costados al caer el jefe (detrás de
  // él, así se ve el cuerpo).
  polvoAterrizaje(x) {
    const polvo = this.add.particles(x, ARENA.piso - 10, 'fx_humo', {
      x: { min: -60, max: 60 }, speedX: { min: -260, max: 260 }, speedY: { min: -70, max: -10 },
      lifespan: { min: 500, max: 900 }, scale: { start: 2.5, end: 6 }, alpha: { start: 0.7, end: 0 },
      tint: [0xc8b090, 0xa89070, 0x8a7458], drag: 300, emitting: false
    }).setDepth(9.4);
    polvo.explode(26);
    this.time.delayedCall(1000, () => polvo.destroy());
  }

  async vencerJefe() {
    const jefe = this.jefe;
    const cam = this.cameras.main;
    this.estado = 'fin';
    jefe.removeAllListeners('animationupdate');
    jefe.removeAllListeners('animationcomplete');
    jefe.anims.stop();
    this.tweens.killTweensOf(jefe);
    jefe.setVelocityX(0).clearTint().setAlpha(1).setScale(ESCALA);
    jefe.body.enable = false;
    this.barra.forEach((o) => o.setVisible(false));
    const g = JEFE.gigante;
    const cuadro = (i) => g.muerte[0] + i;
    // Sale volando hacia atrás (los cuadros miran a la derecha y cae de espaldas).
    const atras = jefe.flipX ? 1 : -1;
    const xFinal = Phaser.Math.Clamp(jefe.x + atras * g.vuelo.atras, ARENA.izquierda + 120, ARENA.derecha - 120);

    // 1. El balazo final: pausa de golpe (todo se congela un instante), zoom,
    //    destellos blancos y una ráfaga corta de explosiones encima.
    jefe.setFrame(cuadro(0)).setTintFill(0xffffff);
    this.physics.pause();
    cam.zoomTo(1.1, 90, 'Quad.easeOut', true); // la cámara usa los nombres largos de ease
    cam.shake(260, 0.014);
    // Chicas, para no tapar al jefe mientras sale volando.
    for (let i = 0; i < 5; i++) {
      const x = jefe.x + Phaser.Math.Between(-50, 50);
      const y = jefe.y - Phaser.Math.Between(90, g.alto * ESCALA * 0.75);
      explotar(this, x, y + 20, 'chica', ESCALA * 0.8); // Efectos.js
      chispas(this, x, y, 14, -90, 360, 12);
      if (i % 2) jefe.setTintFill(0xffffff); else jefe.clearTint();
      await this.esperar(70);
    }
    jefe.clearTint();
    this.physics.resume();
    cam.zoomTo(1, 260, 'Quad.easeInOut', true);
    cam.flash(160, 255, 250, 230);

    // 2. Se tambalea y sale volando de espaldas en arco (cuadros 1-4).
    const t = g.muerteTiempos;
    jefe.setFrame(cuadro(1));
    await this.esperar(t[0]);
    const vuelo = t[1] + t[2] + t[3];
    this.tweens.add({ targets: jefe, x: xFinal, duration: vuelo + t[4] * 0.5, ease: 'Quad.out' });
    this.tweens.add({
      targets: jefe, y: ARENA.piso - g.vuelo.alto, duration: vuelo / 2, ease: 'Quad.out', yoyo: true,
    });
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.4, alpha: 0.5, duration: vuelo / 2, yoyo: true });
    for (let i = 2; i <= 4; i++) {
      jefe.setFrame(cuadro(i));
      await this.esperar(t[i - 1]);
    }

    // 3. Aterriza: golpe seco, polvo, piedras, rebote chico y se arrastra.
    jefe.setY(ARENA.piso).setFrame(cuadro(5));
    cam.shake(320, 0.016);
    this.polvoAterrizaje(jefe.x);
    chispas(this, jefe.x - 50, ARENA.piso - 4, 18, -150, 50, 11);
    chispas(this, jefe.x + 50, ARENA.piso - 4, 18, -30, 50, 11);
    this.tweens.add({ targets: jefe, y: ARENA.piso - 12, duration: t[4] / 2, yoyo: true, ease: 'Quad.out' });
    await this.esperar(t[4]);
    jefe.setY(ARENA.piso).setFrame(cuadro(6));
    this.tweens.add({ targets: jefe, x: xFinal + atras * 24, duration: t[5], ease: 'Quad.out' });
    await this.esperar(t[5]);

    // 4. Queda tendido: estrellitas y después humo.
    jefe.setFrame(cuadro(7));
    cam.shake(120, 0.005);
    await this.esperar(t[6]);
    jefe.setFrame(cuadro(8));
    this.tweens.add({ targets: this.sombraJefe, scaleX: 2.6, duration: 300 });

    this.jugador.setVelocityX(0);
    sumarPuntos(this, 10000);
    misionCompleta(this); // Estado.js: ¡MISIÓN COMPLETA! y la tabla de puntaje
  }

  // ---------------------------------------------------------------------------
  // Barra de vida
  // ---------------------------------------------------------------------------

  crearBarraJefe() {
    const x = this.scale.width / 2;
    const ancho = 420;
    this.anchoBarra = ancho;
    this.nombreJefe = TextFX.hud(this, x, 22, 'EL JEFE', { color: 'rojo' }).setDepth(30);
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
    // Aturdido (Jugador.js): ESPACIO lo libera y las demás teclas no cuentan.
    // Con TAB apretado, el selector de armas (Armas.js): tampoco se mueve.
    const aturdido = this.seguirAturdido(Phaser.Input.Keyboard.JustDown(this.teclasExtra.SPACE));
    const libre = !aturdido && !seguirSelector(this, this.teclasExtra.TAB.isDown && !this.aturdido);
    const izquierda = libre && (this.teclas.left.isDown || this.teclasExtra.A.isDown);
    const derecha = libre && (this.teclas.right.isDown || this.teclasExtra.D.isDown);
    const arriba = libre && (this.teclas.up.isDown || this.teclasExtra.W.isDown);
    const abajo = libre && (this.teclas.down.isDown || this.teclasExtra.S.isDown);
    const corre = libre && this.teclas.shift.isDown;
    const dispara = libre && (this.teclasExtra.J.isDown || this.teclasExtra.X.isDown);
    const enSuelo = j.body.blocked.down || j.body.touching.down;
    // ABAJO agacha; ARRIBA mira y apunta arriba (si el personaje no tiene esos
    // cuadros, salta).
    const apunta = this.posturaJugador(enSuelo, arriba, abajo);
    const saltar = (libre && this.teclasExtra.SPACE.isDown) || (arriba && !apunta);

    const direccion = izquierda ? -1 : derecha ? 1 : 0;
    const velocidad = JUGADOR.velocidad * (this.agachado ? JUGADOR.agachado : corre ? JUGADOR.corrida : 1);
    if (this.time.now > this.golpeHasta) j.setVelocityX(direccion * velocidad);
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
    // La luz del velo (oscurecerSala) acompaña al jefe, suave.
    if (this.velo && this.jefe) this.velo.x += (this.jefe.x - this.velo.x) * 0.08;
  }

  update() {
    const j = this.jugador;
    if (this.estado === 'entrada' && j.x >= 200) this.llegadaJefe();
    const admin = noclipJugador(this); // modo admin (Admin.js)
    if (admin) { /* vuela en noclip */ } else if (this.estado === 'pelea' || this.estado === 'transformacion' || this.estado === 'fin') this.moverJugador();
    else cerrarSelector(this, false); // Armas.js: sin cámara lenta fuera de la pelea
    this.moverJefe();
    this.moverBalas();
    this.actualizarSombras();
  }
}

// Movimiento, animación, disparos y golpes del jugador (Jugador.js).
Object.assign(JefeFinal.prototype, AccionesJugador);
