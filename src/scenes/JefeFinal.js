// =============================================================================
// Pelea con el jefe final, dentro del edificio del final del nivel
// (assets/fondos/final/interiror_final.jpeg). Se llega por la puerta del
// edificio en Nivel1 y no se vuelve.
//
// Al vencerlo se escapa en helicóptero (EscapeCutscene.js) y se gana al salir
// de la base por la derecha.
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
    textura: 'jefe', ancho: 85, alto: 79,
    pose: [0, 1], caminar: [2, 13], ataque: [14, 19], revive: [20, 27],
    cuerpo: { ancho: 22, alto: 52 },
    vida: 25, velocidad: 95, alcance: 100, golpe: 3, pausa: 1100, alto_golpe: 80
  },
  gigante: {
    textura: 'jefeGigante', ancho: 257, alto: 127,
    aparece: [0, 1], caminar: [2, 5], ataque: [6, 13], muerte: [14, 22],
    // Los cuadros de `aparece` traen los rayos, el polvo y el aura dibujados:
    // quietos parecían una imagen pegada. La transformación usa la guardia
    // (puños cerrados, cuadros limpios) y los efectos de verdad (rayos,
    // arcos y estelas, que se mueven).
    guardia: [6, 13],
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

// Lo que tira el guion de la transformación cuando se cancela (no es un error).
const CANCELADO = { cancelado: true };

class JefeFinal extends Phaser.Scene {
  constructor() {
    super('JefeFinal');
  }

  preload() {
    cargarSfxArmas(this); // Armas.js (solo lo que falta)
    this.load.image('interiorFinal', 'assets/fondos/final/interiror_final.jpeg');
    this.load.spritesheet('minibus', 'assets/jefes/minibus_sheet.png', { frameWidth: JEFE.minibus.ancho, frameHeight: JEFE.minibus.alto });
    this.load.spritesheet('jefe', 'assets/jefes/jefe_sheet.png', { frameWidth: JEFE.normal.ancho, frameHeight: JEFE.normal.alto });
    this.load.spritesheet('jefeGigante', 'assets/jefes/jefe_gigante_sheet.png', { frameWidth: JEFE.gigante.ancho, frameHeight: JEFE.gigante.alto });
    cargarEscape(this); // EscapeCutscene.js: la huida en helicóptero
  }

  create() {
    const { width, height } = this.scale;
    this.furia = false;   // fondoFuria: una sola vez por pelea
    this.transfo = null;  // la transformación en curso (revivir)
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
    // Cargando la transformación: los últimos cuadros del revive (con el aura) en bucle.
    this.anims.create({ key: 'jefe_carga', repeat: -1, frameRate: 10,
      frames: [n.revive[1] - 2, n.revive[1] - 1, n.revive[1], n.revive[1] - 1].map((frame) => ({ key: 'jefe', frame })) });
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

  // Un tween como promesa. Termina con onComplete, con onStop (si alguien lo
  // corta) o, de respaldo, cuando ya pasó su duración: un guion nunca queda
  // esperando para siempre.
  moverA(objetivo, props) {
    return new Promise((listo) => {
      let hecho = false;
      const fin = () => { if (!hecho) { hecho = true; listo(); } };
      this.tweens.add({ targets: objetivo, ...props, onComplete: fin, onStop: fin });
      const vueltas = (props.repeat > 0 ? props.repeat + 1 : 1) * (props.yoyo ? 2 : 1);
      this.time.delayedCall((props.delay || 0) + (props.duration ?? 1000) * vueltas + 250, fin);
    });
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
      // Se copia el cuadro entero a un lienzo y se lee de una vez. (Antes era
      // un getPixelAlpha por píxel: miles de lecturas de la GPU por cuadro
      // nuevo, y con el cuadro del gigante el juego se congelaba al final de
      // la transformación.)
      const f = this.textures.getFrame(clave, cuadro);
      const w = f.cutWidth;
      const h = f.cutHeight;
      const lienzo = document.createElement('canvas');
      lienzo.width = w;
      lienzo.height = h;
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
      const datos = ctx.getImageData(0, 0, w, h).data;
      let arriba = h;
      let abajo = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (datos[(y * w + x) * 4 + 3] > 0) {
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
  // Si el guion falla (un error) o tarda de más, el gigante igual queda listo
  // para pelear (terminarTransformacion): el juego no se queda trabado.
  revivir() {
    this.estado = 'transformacion';
    const t = this.transfo = { cancelado: false, limpiar: [], xBase: this.jefe.x };
    const rescate = (motivo) => {
      if (this.transfo !== t || t.cancelado) return;
      console.warn('Transformación del jefe rescatada:', motivo);
      this.terminarTransformacion();
    };
    this.time.delayedCall(18000, () => rescate('tardó demasiado'));
    this.guionTransformacion(t).catch((e) => {
      if (e !== CANCELADO) { console.error(e); rescate(e); }
    });
  }

  async guionTransformacion(t) {
    const jefe = this.jefe;
    // Cada espera revisa que la transformación no se haya cancelado.
    const seguir = (v) => { if (t.cancelado) throw CANCELADO; return v; };
    const esperar = (ms) => this.esperar(ms).then(seguir);
    const moverA = (obj, props) => this.moverA(obj, props).then(seguir);
    const cuadroJefe = (cuadro, ms) => this.cuadroJefe(cuadro, ms).then(seguir);
    sonarSfx(this, 'transformacion'); // Armas.js: dura lo que la transformación
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
    const G = JEFE.gigante.guardia;
    const altoFinal = this.altoVisible('jefeGigante', G[0]) * ESCALA;
    const crecerA = (alto, duracion, ease = 'Sine.inOut') => moverA(jefe, {
      scale: jefe.scaleX * alto / this.altoJefe(), duration: duracion, ease
    });

    // Temblor del cuerpo (la fuerza crece): se suma a su x de base.
    const xBase = jefe.x;
    const tiembla = { amp: 1 };
    const temblorCuerpo = this.time.addEvent({
      delay: 40, loop: true, callback: () => { if (jefe.active) jefe.x = xBase + Phaser.Math.FloatBetween(-tiembla.amp, tiembla.amp); }
    });
    t.limpiar.push(() => temblorCuerpo.remove());
    // Piedras y polvo que se levantan del piso a su alrededor.
    const escombros = this.add.particles(xBase, ARENA.piso - 4, 'fx_humo', {
      x: { min: -110, max: 110 }, speedY: { min: -140, max: -40 }, speedX: { min: -30, max: 30 },
      lifespan: 900, scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.55, end: 0 }, tint: [0xc8b090, 0x8a7458],
      frequency: 160
    }).setDepth(9.4);
    t.limpiar.push(() => { if (escombros.active) escombros.destroy(); });

    // 1. Revive (revive_boss, cuadro por cuadro y nunca quieto): busca la
    //    coca en la ch'uspa, se la lleva a la boca, masca (las hojitas
    //    saltan), se le inflan los músculos de a golpes (se rompe la ropa) y
    //    se prende el aura. Respira todo el tiempo; la sala se apaga.
    jefe.anims.stop();
    this.oscurecerSala(0.7, 3000);
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.4, duration: 3000 });
    tiembla.amp = 0.4;
    escombros.frequency = 400;
    const r0 = JEFE.normal.revive[0];
    const respira = this.respirar(jefe, 0.035, 320);
    t.limpiar.push(() => respira.stop());
    // Busca en la ch'uspa (0-1): se agacha un poco cada vez que mete la mano.
    for (let k = 0; k < 3; k++) {
      await cuadroJefe(r0, 260);
      this.agacharse(jefe, 0.05, 130);
      await cuadroJefe(r0 + 1, 300);
      this.hojasCoca(this.puntoJefe(-0.3, 0.38), 4, 60);
    }
    this.aviso(jefe.x, jefe.y - this.altoJefe() - 20, '¿COQUITA?', 'plata');
    // Se la lleva a la boca (2) y masca (2-3): cabeceo y hojitas a cada mordida.
    await cuadroJefe(r0 + 2, 260);
    this.hojasCoca(this.puntoJefe(0.05, 0.8), 8, 120);
    for (let k = 0; k < 6; k++) {
      await cuadroJefe(r0 + 2 + (k % 2), 170);
      this.cabecear(jefe, k % 2 ? 2 : -2);
      if (k % 2) this.hojasCoca(this.puntoJefe(0.05, 0.8), 3, 80);
      if (k === 1 || k === 4) this.aviso(jefe.x + 40, jefe.y - this.altoJefe() - 10, '¡ÑAC ÑAC!', 'oro');
    }
    // Se infla (4-5): cada bombeo lo agranda de golpe, sacude y rompe la ropa.
    const pulsoAura = this.time.addEvent({ delay: 300, loop: true, callback: () => this.arcosAura(1) });
    t.limpiar.push(() => pulsoAura.remove());
    for (let k = 0; k < 5; k++) {
      await cuadroJefe(r0 + 4 + (k % 2), 210);
      const escala = s0 * (1 + 0.025 * (k + 1));
      this.tweens.add({ targets: jefe, scaleX: escala * 1.06, duration: 70, yoyo: true, ease: 'Quad.out',
        onComplete: () => jefe.setScale(escala, jefe.scaleY) });
      this.cameras.main.shake(120, 0.004 + k * 0.001);
      this.jironesRopa(this.puntoJefe(Phaser.Math.FloatBetween(-0.3, 0.3), Phaser.Math.FloatBetween(0.35, 0.7)));
      tiembla.amp = 0.6 + k * 0.4;
      if (k === 2) this.aviso(jefe.x, jefe.y - this.altoJefe() - 20, '¡GRRR!', 'rojo');
    }
    // Se prende el aura (6-7): fogonazo verde, anillo y estela.
    respira.stop();
    jefe.setScale(jefe.scaleX);
    await cuadroJefe(r0 + 6, 0);
    this.anilloAura(jefe.x, ARENA.piso - 4, 0x6aff9a);
    fogonazo(this, jefe.x, jefe.y - this.altoJefe() * 0.5, 3, 11);
    this.cameras.main.flash(120, 160, 255, 180);
    // Grita: el aura en bucle, tiembla más y suelta más escombros.
    jefe.play('jefe_carga');
    this.respiracion = this.respirar(jefe, 0.05, 200);
    tiembla.amp = 2.5;
    escombros.frequency = 70;
    this.cameras.main.shake(250, 0.008);
    await esperar(250);

    // 2. Carga: destellos cada vez más seguidos, rayos del techo y crece en cada uno.
    const temblor = this.time.addEvent({ delay: 110, loop: true, callback: () => this.cameras.main.shake(100, 0.004) });
    t.limpiar.push(() => temblor.remove());
    this.oscurecerSala(0.92, 3000);
    const alto0 = this.altoJefe();
    const pasos = [420, 360, 300, 250, 200, 160, 130, 110, 90, 80, 70, 60];
    for (const [i, espera] of pasos.entries()) {
      jefe.setTintFill(0xffffff);
      this.arcosAura(2 + Math.floor(i / 3));
      tiembla.amp = 2.5 + i * 0.4; // cada vez más fuerte
      if (i % 2 === 0) this.estelaJefe(i % 4 === 0 ? 0x6aff9a : 0xffffff);
      if (i % 4 === 1) this.anilloAura(jefe.x, ARENA.piso - 4, 0x9affc0);
      if (i % 3 === 2) {
        this.rayoSobreJefe(1 + Math.floor(i / 4));
        // Crece hasta ~75% del gigante, de a poco.
        crecerA(alto0 + (altoFinal * 0.75 - alto0) * ((i + 1) / pasos.length), 260, 'Back.out').catch(() => {}); // sin esperarlo
      }
      await esperar(50);
      jefe.clearTint();
      await esperar(espera);
    }
    pulsoAura.remove();
    jefe.setTintFill(0xffffff);
    await esperar(200);

    // 3. Estallido: rayo enorme y el gigante aparece del mismo alto, en blanco.
    temblor.remove();
    escombros.explode(30);
    for (let k = 0; k < 3; k++) this.rayoSobreJefe(3);
    this.cameras.main.flash(600, 255, 255, 235);
    this.cameras.main.shake(900, 0.02);
    explotar(this, jefe.x, ARENA.piso - 40, 'grande', ESCALA * 1.2); // Efectos.js
    const altoAntes = this.altoJefe();
    this.fase = 'gigante';
    if (this.respiracion) { this.respiracion.stop(); this.respiracion = null; }
    jefe.anims.stop();
    // Metamorfosis: salta entre el cuerpo de antes y el gigante, cada vez más
    // rápido y más grande (los dos del mismo alto en cada salto), con estela.
    const normal = { clave: 'jefe', cuadro: JEFE.normal.revive[1] };
    const gigante = { clave: 'jefeGigante', cuadro: G[0] };
    const saltos = [150, 130, 110, 90, 75, 60, 50, 40];
    for (const [k, espera] of saltos.entries()) {
      const cuerpo = k % 2 ? normal : gigante;
      const alto = altoAntes * (1 + 0.03 * k);
      jefe.setTexture(cuerpo.clave, cuerpo.cuadro).setScale(alto / this.altoVisible(cuerpo.clave, cuerpo.cuadro));
      if (k % 2) jefe.setTintFill(0xffffff); else jefe.clearTint().setTint(0xd0ffe0);
      this.estelaJefe(k % 2 ? 0xffffff : 0x6aff9a);
      this.cameras.main.shake(60, 0.006);
      await esperar(espera);
    }
    jefe.setTexture('jefeGigante', G[0]);
    jefe.setScale(altoAntes * 1.24 / this.altoVisible('jefeGigante', G[0]));
    jefe.setTintFill(0xffffff);
    this.anilloAura(jefe.x, ARENA.piso - 4, 0xffffff, 2);
    this.ajustarCuerpoJefe();
    chispas(this, jefe.x - 70, ARENA.piso - 4, 24, -110, 80, 11);
    chispas(this, jefe.x + 70, ARENA.piso - 4, 24, -70, 80, 11);
    this.fondoFuria();

    // 4. Termina de crecer en golpes, uno por rayo. Nunca queda quieto:
    //    respira (se hincha), tiembla, aprieta los puños (salta entre los dos
    //    cuadros de guardia), cabecea y el aura chisporrotea alrededor.
    const respiraG = this.respirar(jefe, 0.045, 230);
    t.limpiar.push(() => respiraG.stop());
    let puno = 0;
    const tension = this.time.addEvent({
      delay: 140, loop: true, callback: () => {
        if (!jefe.active) return;
        puno = 1 - puno;
        jefe.setFrame(G[puno]);
        this.arcosAura(1);
      }
    });
    t.limpiar.push(() => tension.remove());
    const altoG = this.altoJefe();
    for (let k = 1; k <= 4; k++) {
      this.rayoSobreJefe(2);
      this.arcosAura(4);
      this.estelaJefe(0xffd0a0);
      this.cabecear(jefe, k % 2 ? 3 : -3);
      tiembla.amp = 3 + k;
      await crecerA(altoG + (altoFinal - altoG) * (k / 4), 380, 'Back.out');
      if (k === 2) jefe.clearTint();
      // Entre golpe y golpe se encorva (toma aire) y suelta un anillo.
      this.agacharse(jefe, 0.06, 110);
      this.anilloAura(jefe.x, ARENA.piso - 4, 0xffb070, 1);
      await esperar(220);
    }
    tension.remove();
    respiraG.stop();
    temblorCuerpo.remove();
    escombros.stop();
    this.time.delayedCall(1000, () => escombros.destroy());
    jefe.x = xBase;
    jefe.setScale(ESCALA).setAngle(0).clearTint().setFrame(G[0]);
    // Cae con todo su peso: se aplasta, rebota y levanta polvo.
    this.polvoAterrizaje(jefe.x);
    this.cameras.main.shake(350, 0.015);
    this.tweens.add({ targets: jefe, scaleY: ESCALA * 0.88, scaleX: ESCALA * 1.08, duration: 90, yoyo: true, ease: 'Quad.out' });
    this.tweens.add({ targets: this.sombraJefe, scaleX: 1.9, duration: 400 });
    this.cartel('¡NO SE RINDE!', 'rojo');
    // Ruge: onda de choque, zoom de golpe y el grito.
    this.anilloAura(jefe.x, ARENA.piso - 4, 0xff6040, 3);
    this.aviso(jefe.x, jefe.y - this.altoJefe() - 10, '¡GRAAAH!', 'rojo');
    // La cámara solo entiende los nombres largos de ease ('Quad.easeOut'): con
    // 'Quad.out' tiraba "this.ease is not a function" en cada cuadro y el
    // juego quedaba congelado justo cuando el gigante terminaba de crecer.
    this.cameras.main.zoomTo(1.06, 90, 'Quad.easeOut', true);
    this.time.delayedCall(260, () => this.cameras.main.zoomTo(1, 400, 'Sine.easeInOut', true));
    // Mientras ruge: resopla fuerte, sacude la cabeza y aprieta los puños.
    const ruge = this.respirar(jefe, 0.04, 160);
    t.limpiar.push(() => ruge.stop());
    const sacude = this.time.addEvent({
      delay: 120, repeat: 12, callback: () => {
        if (!jefe.active) return;
        puno = 1 - puno;
        jefe.setFrame(G[puno]);
        this.cabecear(jefe, puno ? 2.5 : -2.5);
        if (puno) this.arcosAura(2);
      }
    });
    t.limpiar.push(() => sacude.remove());
    this.time.delayedCall(1600, () => { ruge.stop(); if (jefe.active) jefe.setScale(ESCALA); });
    // En la pelea la sala queda en penumbra (el velo sigue al jefe).
    this.oscurecerSala(0.5, 1200);
    this.tweens.add({ targets: jefe, alpha: 0.6, duration: 70, yoyo: true, repeat: 6 });
    await esperar(1000);
    jefe.setAlpha(1);
    jefe.body.setAllowGravity(true);
    jefe.body.reset(jefe.x, ARENA.piso);
    await esperar(700);
    this.terminarTransformacion();
  }

  // Deja al gigante listo para pelear (al final del guion o de rescate si el
  // guion se trabó): limpia temblores y respiraciones, cuerpo del gigante a
  // su escala en el piso, sala en furia, vida llena y a pelear.
  terminarTransformacion() {
    const jefe = this.jefe;
    const t = this.transfo || { limpiar: [] };
    if (t.cancelado) return;
    t.cancelado = true;
    t.limpiar.forEach((f) => { try { f(); } catch (e) { /* ya no existía */ } });
    if (this.respiracion) { this.respiracion.stop(); this.respiracion = null; }
    this.tweens.killTweensOf(jefe);
    this.fase = 'gigante';
    if (!this.furia) this.fondoFuria();
    jefe.anims.stop();
    if (t.xBase !== undefined) jefe.x = t.xBase;
    jefe.setTexture('jefeGigante', JEFE.gigante.caminar[0]).setScale(ESCALA).setAngle(0).setAlpha(1).clearTint();
    this.ajustarCuerpoJefe();
    jefe.body.setAllowGravity(true);
    jefe.body.reset(jefe.x, ARENA.piso);
    this.oscurecerSala(0.5, 600);
    this.vidaJefe = JEFE.gigante.vida;
    this.nombreJefe.setText('JEFE GIGANTE');
    this.actualizarBarra();
    this.jefeOcupado = false;
    this.ataqueDesde = this.time.now + 600;
    this.estado = 'pelea';
  }

  // ---------------------------------------------------------------------------
  // Ayudas de la transformación: que nunca quede quieto
  // ---------------------------------------------------------------------------

  // Un cuadro de la hoja del jefe normal durante `ms`.
  async cuadroJefe(cuadro, ms) {
    this.jefe.setTexture('jefe', cuadro);
    if (ms) await this.esperar(ms);
  }

  // Punto del cuerpo: dx en fracción del alto hacia donde mira, alto en
  // fracción desde los pies.
  puntoJefe(dx, alto) {
    const j = this.jefe;
    const h = this.altoJefe();
    return { x: j.x + (j.flipX ? -1 : 1) * dx * h, y: j.y - alto * h };
  }

  // Respiración: el pecho sube y baja. La escala Y se calcula cada cuadro a
  // partir de la X, así sigue bien aunque crezca (crecerA tween de `scale`).
  // Devuelve { stop() }; `agache` lo baja un momento (agacharse).
  respirar(sprite, cuanto, ms) {
    const r = { agache: 1 };
    const desde = this.time.now;
    const evento = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        if (!sprite.active) return;
        const fase = Math.sin(((this.time.now - desde) / ms) * Math.PI);
        sprite.scaleY = sprite.scaleX * (1 + cuanto * fase * fase) * r.agache;
      }
    });
    r.stop = () => { evento.remove(); if (sprite.active) sprite.scaleY = sprite.scaleX; };
    this.respiracionActual = r;
    return r;
  }

  agacharse(sprite, cuanto, ms) {
    const r = this.respiracionActual;
    if (r) this.tweens.add({ targets: r, agache: 1 - cuanto, duration: ms, yoyo: true, ease: 'Quad.out' });
  }

  // Cabeceo al mascar: se inclina un poco.
  cabecear(sprite, grados) {
    this.tweens.add({ targets: sprite, angle: grados, duration: 85, yoyo: true, ease: 'Sine.inOut' });
  }

  // Hojitas de coca que saltan (de la ch'uspa o de la boca).
  hojasCoca({ x, y }, cantidad, velocidad) {
    const p = this.add.particles(x, y, 'fx_chispa', {
      speed: { min: velocidad * 0.4, max: velocidad }, angle: { min: 200, max: 340 }, gravityY: 500,
      lifespan: 700, rotate: { min: 0, max: 360 }, scale: { start: 2.2, end: 1 }, tint: [0x3f9a2e, 0x6ac040, 0x2e7a22],
      emitting: false
    }).setDepth(11);
    p.explode(cantidad);
    this.time.delayedCall(800, () => p.destroy());
  }

  // Jirones de la ropa que se rompe al inflarse.
  jironesRopa({ x, y }) {
    const p = this.add.particles(x, y, 'fx_chispa', {
      speed: { min: 80, max: 200 }, angle: { min: 180, max: 360 }, gravityY: 600, lifespan: 800,
      rotate: { min: 0, max: 360 }, scale: { start: 2.6, end: 1.4 }, tint: [0xe8e8e0, 0x2a2e28, 0x3a4a5a], emitting: false
    }).setDepth(11);
    p.explode(6);
    this.time.delayedCall(900, () => p.destroy());
  }

  // Anillo de energía que se abre desde los pies.
  anilloAura(x, y, color, fuerza = 1) {
    const anillo = this.add.ellipse(x, y, 40, 10, color, 0).setStrokeStyle(3 + fuerza, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(9.45);
    this.tweens.add({ targets: anillo, scaleX: 6 + fuerza * 3, scaleY: 4 + fuerza * 2, alpha: 0, duration: 500 + fuerza * 150,
      ease: 'Quad.out', onComplete: () => anillo.destroy() });
  }

  // Estela: una copia del cuadro actual que se agranda y se desvanece.
  estelaJefe(color) {
    const j = this.jefe;
    const copia = this.add.image(j.x, j.y, j.texture.key, j.frame.name).setOrigin(j.originX, j.originY)
      .setFlipX(j.flipX).setScale(j.scaleX, j.scaleY).setTintFill(color).setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(j.depth - 0.05);
    this.tweens.add({ targets: copia, scaleX: j.scaleX * 1.18, scaleY: j.scaleY * 1.12, alpha: 0, duration: 380, ease: 'Quad.out',
      onComplete: () => copia.destroy() });
  }

  // Fase 2: la sala queda tenebrosa: casi a oscuras y teñida de rojo sangre,
  // con niebla baja, brasas que suben, el rojo que late, y tormenta (rayos de
  // fondo con relámpago) y temblores cada tanto.
  fondoFuria() {
    if (this.furia) return;
    this.furia = true;
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
      // Solo durante la pelea (en la huida y la salida ya no).
      if (!['pelea', 'transformacion'].includes(this.estado)) return;
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

    sonarSfx(this, 'muerteEnemigo'); // Armas.js
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

    // 2. Se tambalea (se mece de un lado al otro) y sale volando de espaldas
    //    en arco (cuadros 1-4), girando hacia atrás y dejando una estela.
    const t = g.muerteTiempos;
    jefe.setFrame(cuadro(1));
    this.tweens.add({ targets: jefe, angle: { from: -6, to: 6 }, duration: t[0] / 2, yoyo: true, ease: 'Sine.inOut' });
    await this.esperar(t[0]);
    jefe.setAngle(0);
    this.tweens.add({ targets: jefe, angle: atras * 28, duration: (t[1] + t[2]) * 1.1, ease: 'Quad.out' });
    this.tweens.add({ targets: jefe, scaleX: ESCALA * 1.06, scaleY: ESCALA * 0.94, duration: 120, yoyo: true });
    const estela = this.time.addEvent({
      delay: 35, repeat: 9, callback: () => {
        const copia = this.add.image(jefe.x, jefe.y, jefe.texture.key, jefe.frame.name).setOrigin(jefe.originX, jefe.originY)
          .setScale(jefe.scaleX, jefe.scaleY).setFlipX(jefe.flipX).setAngle(jefe.angle).setDepth(jefe.depth - 0.01)
          .setTintFill(0xffe0a0).setAlpha(0.45);
        this.tweens.add({ targets: copia, alpha: 0, duration: 220, onComplete: () => copia.destroy() });
      }
    });
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
    estela.remove();
    this.tweens.killTweensOf(jefe);
    jefe.setAngle(0).setScale(ESCALA);
    jefe.setY(ARENA.piso).setFrame(cuadro(5));
    // Se aplasta contra el piso y vuelve.
    this.tweens.add({ targets: jefe, scaleY: ESCALA * 0.85, scaleX: ESCALA * 1.1, duration: 80, yoyo: true, ease: 'Quad.out' });
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
    // Tendido no queda quieto: respira agitado, se le escapa humito y cada
    // tanto patalea (un tirón) y vuelve a las estrellitas.
    this.tweens.add({ targets: jefe, scaleY: ESCALA * 1.04, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        if (!jefe.active) return;
        jefe.setFrame(jefe.frame.name === cuadro(8) ? cuadro(7) : cuadro(8));
        this.tweens.add({ targets: jefe, angle: { from: 0, to: atras * -3 }, duration: 90, yoyo: true });
        const humo = this.add.particles(jefe.x, jefe.y - 30, 'fx_humo', {
          speedY: { min: -60, max: -25 }, speedX: { min: -15, max: 15 }, lifespan: 900,
          scale: { start: 1, end: 2.6 }, alpha: { start: 0.45, end: 0 }, tint: 0x9a9a9a, emitting: false
        }).setDepth(9.6);
        humo.explode(3);
        this.time.delayedCall(1000, () => humo.destroy());
      }
    });

    this.jugador.setVelocityX(0);
    sumarPuntos(this, 10000);
    // No gana todavía: se escapa en el helicóptero del Coronel Buitre
    // (EscapeCutscene.js). MISIÓN COMPLETA al salir de la base por la derecha.
    this.escapeCutscene();
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
    if (saltar && enSuelo && !this.saltoPresionado) { j.setVelocityY(-JUGADOR.salto); sonarSfx(this, 'salto'); }
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
    if (this.velo && this.jefe && ['pelea', 'transformacion'].includes(this.estado)) this.velo.x += (this.jefe.x - this.velo.x) * 0.08;
  }

  update() {
    const j = this.jugador;
    if (this.estado === 'entrada' && j.x >= 200) this.llegadaJefe();
    const admin = noclipJugador(this); // modo admin (Admin.js)
    if (admin) { /* vuela en noclip */ } else if (['pelea', 'transformacion', 'fin'].includes(this.estado)) this.moverJugador();
    else cerrarSelector(this, false); // Armas.js: sin cámara lenta fuera de la pelea
    // Al terminar la huida del jefe (EscapeCutscene.js) es MISIÓN COMPLETA directo.
    this.moverJefe();
    this.bloquearContraJefe();
    this.moverBalas();
    this.actualizarSombras();
  }

  // El jugador no atraviesa al jefe (normal o gigante): en el piso se queda
  // pegado al lado por donde llegó (casi siempre a su izquierda) en vez de
  // pasarle por delante. Saltando por encima de su cabeza sí pasa.
  bloquearContraJefe() {
    const jefe = this.jefe;
    if (!jefe || !jefe.body || !jefe.body.enable || !['pelea', 'transformacion'].includes(this.estado)) return;
    if (noclipJugador(this)) return; // modo admin
    const a = this.jugador.body;
    const b = jefe.body;
    const dx = a.center.x - b.center.x;
    // Distancia mínima entre centros: los dos cuerpos y un margen (el dibujo
    // del gigante es más ancho que su caja).
    const margen = this.fase === 'gigante' ? 18 : 6;
    const minimo = a.width / 2 + b.width / 2 + margen;
    const separados = Math.abs(dx) >= minimo || a.bottom <= b.top + 12 || a.top >= b.bottom;
    if (separados) {
      if (Math.abs(dx) >= minimo) this.ladoContraJefe = Math.sign(dx) || -1;
      return;
    }
    const lado = this.ladoContraJefe || (Math.sign(dx) || -1);
    a.x = b.center.x + lado * minimo - a.width / 2;
    if (Math.sign(a.velocity.x) === -lado) a.velocity.x = 0;
  }
}

// Movimiento, animación, disparos y golpes del jugador (Jugador.js).
Object.assign(JefeFinal.prototype, AccionesJugador);
// Carteles chicos sobre el jefe (¡ÑAC ÑAC!, ¡GRRR!...): los de Nivel1.
JefeFinal.prototype.aviso = Nivel1.prototype.aviso;
