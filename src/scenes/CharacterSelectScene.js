// =============================================================================
// Selección de personaje al estilo Metal Slug.
// Viene del Menu y, al confirmar, guarda el personaje en el registry
// ('personaje') y arranca Nivel1.
// =============================================================================

// --- Personajes --------------------------------------------------------------
// Para agregar un personaje nuevo basta con editar este array (y ANIMACIONES).
const PERSONAJES = [
  { id: 'rene', nombre: 'RENE "TRUENO"', animIdle: 'p1_idle', animPose: 'p1_pose', bloqueado: false },
  { id: 'manfred', nombre: 'MANFRED', animIdle: 'p2_idle', animPose: 'p2_pose', bloqueado: false }
];

// --- Animaciones -------------------------------------------------------------
// Cada frame es un PNG suelto dentro de "carpeta". Los de assets/seleccion/1/
// son las 8 vistas del soldado (sur, sureste, este...), así que el idle usa la
// vista de frente y la pose es un giro completo de 360°.
const ANIMACIONES = {
  p1_idle: {
    carpeta: 'assets/seleccion/1/',
    frames: ['south'],
    fps: 8,
    repeat: -1
  },
  p1_pose: {
    carpeta: 'assets/seleccion/1/',
    frames: ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south'],
    fps: 16,
    repeat: 0
  },
  // assets/seleccion/2/: los 8 pasos de Manfred de perfil, con la metralleta
  // (herramientas/manfred_spritesheet.py). La pose son dos pasos completos.
  p2_idle: {
    carpeta: 'assets/seleccion/2/',
    frames: ['caminar_0'],
    fps: 8,
    repeat: -1
  },
  p2_pose: {
    carpeta: 'assets/seleccion/2/',
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0].map((i) => 'caminar_' + i),
    fps: 14,
    repeat: 0
  }
};

// --- Sonidos (opcionales) ----------------------------------------------------
// Si el archivo no existe se usa un pitido generado con WebAudio.
const SONIDOS_SELECCION = {
  sel_mover: { archivo: 'assets/audio/sfx/seleccion_mover.mp3', frecuencia: 660, duracion: 0.06, onda: 'square' },
  sel_error: { archivo: 'assets/audio/sfx/seleccion_error.mp3', frecuencia: 110, duracion: 0.25, onda: 'sawtooth' },
  sel_confirmar: { archivo: 'assets/audio/sfx/seleccion_confirmar.mp3', frecuencia: 880, duracion: 0.35, onda: 'square' },
  sel_persiana: { archivo: 'assets/audio/sfx/seleccion_persiana.mp3', frecuencia: 70, duracion: 0.2, onda: 'triangle' },
  sel_tic: { archivo: 'assets/audio/sfx/seleccion_tic.mp3', frecuencia: 1200, duracion: 0.04, onda: 'square' }
};

// --- Diseño de la pantalla ---------------------------------------------------
// Si el fondo definitivo (assets/seleccion/fondo.png) tiene los marcos en otra
// posición, basta con ajustar estos valores.
const DISENO_SELECCION = {
  anchoCasilla: 240,
  altoCasilla: 300,
  separacion: 60,     // espacio entre casillas
  yCasilla: 110,      // borde superior de las casillas
  altoPlaca: 34,      // placa con el nombre, debajo de cada casilla
  escalaPersonaje: 3, // entero, para no deformar el pixel art
  segundos: 20
};

const FUENTE_TITULO = '"Black Ops One", Impact, sans-serif';
const FUENTE_PIXEL = '"Press Start 2P", monospace';

class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  preload() {
    this.load.image('selFondo', 'assets/seleccion/fondo.png');

    // Un frame puede repetirse entre animaciones: se carga una sola vez.
    Object.values(ANIMACIONES).forEach(({ carpeta, frames }) => {
      frames.forEach((frame) => {
        const key = this.keyFrame(carpeta, frame);
        if (!this.textures.exists(key)) this.load.image(key, carpeta + frame + '.png');
      });
    });

    Object.entries(SONIDOS_SELECCION).forEach(([key, { archivo }]) => this.load.audio(key, archivo));
    cargarMusica(this, 'seleccion');

    // Un archivo que falta (fondo o sonido) no detiene la escena.
    this.load.on('loaderror', (archivo) => console.info('Selección: no se encontró', archivo.src));
  }

  create() {
    const { width, height } = this.scale;
    this.indice = PERSONAJES.findIndex((p) => !p.bloqueado);
    this.confirmado = false;

    if (!this.textures.exists('selFondo')) this.crearFondoPlaceholder();
    this.add.image(0, 0, 'selFondo').setOrigin(0).setDisplaySize(width, height).setDepth(-10);

    // Fondo vivo detrás de las casillas (EfectosMenu.js): humo, brasas,
    // balas que cruzan, reflectores y lámparas colgantes que se mecen.
    fondoBatalla(this, {
      profundidad: -6, explosiones: false,
      reflectores: [[0, height, -55], [width, height, -125]]
    });
    this.crearLamparas();

    this.crearTexturaPersiana();
    this.crearAnimaciones();
    this.crearTitulo();
    this.casillas = PERSONAJES.map((personaje, i) => this.crearCasilla(personaje, i));
    this.crearCursor();
    this.crearCuentaRegresiva();
    this.configurarControles();
    tocarMusica(this, 'seleccion');

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  keyFrame(carpeta, frame) {
    return 'sel:' + carpeta + frame;
  }

  // Rectángulo de la casilla i (centradas en fila).
  rectCasilla(i) {
    const { anchoCasilla, altoCasilla, separacion, yCasilla } = DISENO_SELECCION;
    const anchoTotal = PERSONAJES.length * anchoCasilla + (PERSONAJES.length - 1) * separacion;
    const x = (this.scale.width - anchoTotal) / 2 + i * (anchoCasilla + separacion);
    return { x, y: yCasilla, ancho: anchoCasilla, alto: altoCasilla, cx: x + anchoCasilla / 2 };
  }

  // Reproduce el sonido si existe; si no, un pitido sintetizado.
  sonar(key) {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key);
      return;
    }
    const ctx = this.sound.context;
    const datos = SONIDOS_SELECCION[key];
    if (!ctx || !datos) return;

    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = datos.onda;
    osc.frequency.value = datos.frecuencia;
    if (key === 'sel_confirmar') osc.frequency.setValueAtTime(datos.frecuencia * 1.5, ctx.currentTime + 0.1);
    vol.gain.setValueAtTime(0.08, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + datos.duracion);
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + datos.duracion);
  }

  // ---------------------------------------------------------------------------
  // Creación de elementos
  // ---------------------------------------------------------------------------

  crearAnimaciones() {
    Object.entries(ANIMACIONES).forEach(([key, { carpeta, frames, fps, repeat }]) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map((frame) => ({ key: this.keyFrame(carpeta, frame) })),
        frameRate: fps,
        repeat
      });
    });
  }

  // Dos lámparas colgadas del techo, con su cono de luz, que se mecen.
  crearLamparas() {
    const { width } = this.scale;
    [width * 0.18, width * 0.82].forEach((x, i) => {
      const cable = this.add.rectangle(0, 0, 2, 70, 0x1b1d18).setOrigin(0.5, 0);
      const pantalla = this.add.triangle(0, 70, -14, 12, 14, 12, 0, 0, 0x3b3e33).setStrokeStyle(2, 0x15170f);
      const foco = this.add.ellipse(0, 84, 10, 6, 0xfff0a0);
      const luz = this.add.image(0, 82, 'fx_haz').setOrigin(0, 0.5).setAngle(90).setScale(2.6, 3.2)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      const lampara = this.add.container(x, -4, [luz, cable, pantalla, foco]).setDepth(-5);
      this.tweens.add({ targets: lampara, angle: { from: -7, to: 7 }, duration: 1900 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // Parpadeo de lámpara vieja, cada tanto.
      this.time.addEvent({
        delay: 2600 + i * 900, loop: true,
        callback: () => this.tweens.add({ targets: [luz, foco], alpha: 0.2, duration: 50, yoyo: true, repeat: 2 })
      });
    });
  }

  crearTitulo() {
    const titulo = this.add.text(this.scale.width / 2, 52, 'SELECCIONA TU SOLDADO', {
      fontFamily: FUENTE_TITULO,
      fontSize: '44px',
      color: '#ffd23f',
      stroke: '#2a1a05',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', fill: true, stroke: true }
    }).setOrigin(0.5);

    // Cae con chispas y le pegan balazos (EfectosMenu.js).
    golpeTitulo(this, titulo, { profundidad: 40 });
  }

  crearCasilla(personaje, i) {
    const r = this.rectCasilla(i);
    const { altoPlaca, escalaPersonaje } = DISENO_SELECCION;
    const casilla = { personaje, rect: r };

    // Personaje animado (solo si está desbloqueado y su animación existe).
    if (!personaje.bloqueado && this.anims.exists(personaje.animIdle)) {
      const primerFrame = this.anims.get(personaje.animIdle).frames[0].textureKey;
      casilla.sprite = this.add.sprite(r.cx, r.y + r.alto - 20, primerFrame)
        .setOrigin(0.5, 1)
        .setScale(escalaPersonaje)
        .play(personaje.animIdle);
      // "Respiración": sube y baja 2 px.
      casilla.respiracion = this.tweens.add({
        targets: casilla.sprite, y: casilla.sprite.y - 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    }

    // Texto en la parte visible de una casilla bloqueada.
    if (personaje.bloqueado) {
      this.add.text(r.cx, r.y + r.alto - 50, 'PROXIMAMENTE', {
        fontFamily: FUENTE_PIXEL, fontSize: '14px', color: '#c0392b', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
    }

    // Persiana metálica: medio cerrada si está bloqueada, abierta si no.
    casilla.persiana = this.add.tileSprite(r.cx, r.y, r.ancho, 1, 'selPersiana').setOrigin(0.5, 0);
    casilla.borde = this.add.rectangle(r.cx, r.y, r.ancho, 6, 0x1b1d18).setOrigin(0.5, 0);
    this.ajustarPersiana(casilla, personaje.bloqueado ? r.alto * 0.55 : 0);

    if (personaje.bloqueado) casilla.candado = this.crearCandado(r.cx, r.y + r.alto * 0.55 + 4);

    // Destello blanco para la confirmación.
    casilla.flash = this.add.rectangle(r.cx, r.y, r.ancho, r.alto, 0xffffff).setOrigin(0.5, 0).setAlpha(0);

    // Marco rojo para cuando se intenta elegir una casilla bloqueada.
    casilla.marcoError = this.add.rectangle(r.cx, r.y + r.alto / 2, r.ancho + 12, r.alto + 12)
      .setStrokeStyle(4, 0xff2020).setAlpha(0);

    // Nombre en la placa.
    this.add.text(r.cx, r.y + r.alto + 14 + altoPlaca / 2, personaje.nombre, {
      fontFamily: FUENTE_PIXEL, fontSize: '12px', color: personaje.bloqueado ? '#7d7f72' : '#ffd23f'
    }).setOrigin(0.5);

    // Zona para el mouse.
    this.add.zone(r.cx, r.y + r.alto / 2, r.ancho, r.alto).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!personaje.bloqueado) this.seleccionar(i); })
      .on('pointerdown', () => {
        if (personaje.bloqueado) this.errorBloqueada(i);
        else { this.seleccionar(i); this.confirmar(); }
      });

    return casilla;
  }

  // Cambia el alto de la persiana (0 = abierta, alto de la casilla = cerrada).
  ajustarPersiana(casilla, alto) {
    const a = Math.round(alto);
    casilla.persiana.setSize(casilla.rect.ancho, Math.max(a, 1)).setVisible(a > 0);
    casilla.borde.setY(casilla.rect.y + a - 6).setVisible(a > 0);
    casilla.altoPersiana = a;
  }

  crearCandado(x, y) {
    const g = this.add.graphics({ x, y });
    g.lineStyle(5, 0x8c8f80).strokeRect(-10, -4, 20, 22);              // arco
    g.fillStyle(0x000000).fillRect(-14, 10, 32, 26);                   // sombra
    g.fillStyle(0xc9a227).fillRect(-16, 8, 32, 26);                    // cuerpo
    g.fillStyle(0xf1d36b).fillRect(-16, 8, 32, 4);                     // brillo
    g.fillStyle(0x3a2a05).fillRect(-3, 16, 6, 6).fillRect(-1, 22, 2, 6); // cerradura
    return g;
  }

  crearCursor() {
    const r = this.rectCasilla(this.indice);
    this.cursor = this.add.container(r.cx, 0).setDepth(41); // encima del título

    const marco = this.add.rectangle(0, r.y + r.alto / 2, r.ancho + 12, r.alto + 12).setStrokeStyle(4, 0xffd23f);
    const etiqueta = this.add.text(0, r.y - 22, '1P', {
      fontFamily: FUENTE_PIXEL, fontSize: '16px', color: '#ff3b3b', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5, 1);
    const flecha = this.add.triangle(0, r.y - 12, -8, 0, 8, 0, 0, 8, 0xffd23f).setOrigin(0.5, 0.5);
    this.cursor.add([marco, etiqueta, flecha]);

    this.parpadeoCursor = this.tweens.add({ targets: marco, alpha: 0.2, duration: 220, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [etiqueta, flecha], y: '-=4', duration: 300, yoyo: true, repeat: -1 });
  }

  crearCuentaRegresiva() {
    this.tiempo = DISENO_SELECCION.segundos;
    const x = this.scale.width - 40;

    this.add.text(x, 28, 'TIEMPO', {
      fontFamily: FUENTE_PIXEL, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(1, 0.5);
    this.textoTiempo = this.add.text(x, 62, String(this.tiempo), {
      fontFamily: FUENTE_PIXEL, fontSize: '32px', color: '#ffd23f', stroke: '#000000', strokeThickness: 6
    }).setOrigin(1, 0.5);

    this.reloj = this.time.addEvent({
      delay: 1000,
      repeat: this.tiempo - 1,
      callback: () => {
        this.tiempo--;
        this.textoTiempo.setText(String(this.tiempo));
        if (this.tiempo <= 5) {
          this.textoTiempo.setColor('#ff3b3b');
          this.sonar('sel_tic');
        }
        if (this.tiempo === 0) this.confirmar();
      }
    });
  }

  configurarControles() {
    // Se ignoran las repeticiones de tecla (el Enter del menú puede seguir apretado).
    const al = (evento, fn) => this.input.keyboard.on(evento, (e) => { if (!e.repeat) fn(); });
    al('keydown-LEFT', () => this.mover(-1));
    al('keydown-A', () => this.mover(-1));
    al('keydown-RIGHT', () => this.mover(1));
    al('keydown-D', () => this.mover(1));
    al('keydown-ENTER', () => this.confirmar());
    al('keydown-SPACE', () => this.confirmar());
  }

  // ---------------------------------------------------------------------------
  // Comportamiento
  // ---------------------------------------------------------------------------

  // Avanza hacia la siguiente casilla libre en esa dirección; si solo hay
  // casillas bloqueadas, el cursor no se mueve y suena el error.
  mover(direccion) {
    if (this.confirmado) return;
    let i = this.indice + direccion;
    while (i >= 0 && i < PERSONAJES.length && PERSONAJES[i].bloqueado) i += direccion;

    if (i < 0 || i >= PERSONAJES.length) {
      const vecina = this.indice + direccion;
      if (vecina >= 0 && vecina < PERSONAJES.length) this.errorBloqueada(vecina);
      return;
    }
    this.seleccionar(i);
  }

  seleccionar(i) {
    if (this.confirmado || i === this.indice) return;
    this.indice = i;
    this.sonar('sel_mover');
    this.tweens.add({ targets: this.cursor, x: this.rectCasilla(i).cx, duration: 120, ease: 'Quad.out' });
    // Chispas en las esquinas del marco al llegar.
    const r = this.rectCasilla(i);
    this.time.delayedCall(110, () => {
      chispas(this, r.x - 6, r.y - 6, 8, -135, 90, 30);
      chispas(this, r.x + r.ancho + 6, r.y - 6, 8, -45, 90, 30);
    });
  }

  errorBloqueada(i) {
    if (this.confirmado) return;
    const casilla = this.casillas[i];
    this.sonar('sel_error');
    casilla.marcoError.setAlpha(1);
    this.tweens.add({ targets: casilla.marcoError, alpha: 0, duration: 350 });
    if (casilla.candado) {
      this.tweens.add({ targets: casilla.candado, x: casilla.rect.cx + 4, duration: 40, yoyo: true, repeat: 3 });
    }
  }

  confirmar() {
    if (this.confirmado) return;
    this.confirmado = true;
    this.reloj.remove();

    const casilla = this.casillas[this.indice];
    const { personaje, sprite } = casilla;
    this.registry.set('personaje', personaje.id);

    // 1. Flash blanco sobre la casilla y el cursor fijo.
    this.parpadeoCursor.stop();
    this.cursor.list[0].setAlpha(1);
    casilla.flash.setAlpha(1);
    this.tweens.add({ targets: casilla.flash, alpha: 0, duration: 400 });

    // 2. Pose del personaje (animación o, si no hay, un saltito).
    if (sprite) {
      casilla.respiracion.stop();
      if (personaje.animPose && this.anims.exists(personaje.animPose)) {
        sprite.play(personaje.animPose);
        sprite.once('animationcomplete', () => sprite.play(personaje.animIdle));
      } else {
        this.tweens.add({ targets: sprite, y: sprite.y - 30, duration: 180, yoyo: true, ease: 'Quad.out' });
      }
    }

    // 3. Sonido de confirmación y una ráfaga de balas que pegan en el marco.
    this.sonar('sel_confirmar');
    const r = casilla.rect;
    this.cameras.main.shake(180, 0.008);
    for (let k = 0; k < 8; k++) {
      this.time.delayedCall(k * 70, () => {
        const izq = k % 2 === 0;
        const y = Phaser.Math.Between(r.y, r.y + r.alto);
        const x = izq ? r.x - 6 : r.x + r.ancho + 6;
        trazadora(this, izq ? -40 : this.scale.width + 40, y + Phaser.Math.Between(-80, 80), x, y, {
          profundidad: 31, velocidad: 2400,
          alLlegar: (hx, hy) => {
            fogonazo(this, hx, hy, 1.4, 32);
            chispas(this, hx, hy, 10, izq ? 180 : 0, 120, 32);
          }
        });
      });
    }

    // 4. Se cierran las persianas de las demás casillas.
    this.casillas.forEach((otra) => {
      if (otra === casilla) return;
      const estado = { alto: otra.altoPersiana };
      this.tweens.add({
        targets: estado,
        alto: otra.rect.alto,
        delay: 250,
        duration: 450,
        ease: 'Bounce.out',
        onUpdate: () => this.ajustarPersiana(otra, estado.alto),
        onStart: () => this.sonar('sel_persiana')
      });
      if (otra.candado) {
        this.tweens.add({ targets: otra.candado, y: otra.rect.y + otra.rect.alto - 40, delay: 250, duration: 450, ease: 'Bounce.out' });
      }
    });

    // 5. Fade a negro y al nivel.
    this.time.delayedCall(1600, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Nivel1'));
    });
  }

  // ---------------------------------------------------------------------------
  // Texturas generadas
  // ---------------------------------------------------------------------------

  // Láminas horizontales de la persiana (se repiten con un tileSprite).
  crearTexturaPersiana() {
    if (this.textures.exists('selPersiana')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x5c6052).fillRect(0, 0, 16, 12);
    g.fillStyle(0x80846f).fillRect(0, 0, 16, 2);
    g.fillStyle(0x3b3e33).fillRect(0, 9, 16, 1);
    g.fillStyle(0x1b1d18).fillRect(0, 10, 16, 2);
    g.generateTexture('selPersiana', 16, 12);
    g.destroy();
  }

  // Fondo provisional: pared de metal con remaches, óxido, lianas, sacos de
  // arena y los marcos de las casillas. Se usa solo si falta fondo.png.
  crearFondoPlaceholder() {
    const { width: W, height: H } = this.scale;
    const { altoPlaca } = DISENO_SELECCION;
    const rnd = new Phaser.Math.RandomDataGenerator(['chapare']);
    const g = this.make.graphics({ add: false });

    const remache = (x, y) => {
      g.fillStyle(0x15170f).fillRect(x - 2, y - 1, 5, 5);
      g.fillStyle(0x6b6f5f).fillRect(x - 3, y - 3, 5, 5);
      g.fillStyle(0xa3a690).fillRect(x - 2, y - 2, 2, 2);
    };

    // Planchas de metal.
    g.fillStyle(0x2a2d27).fillRect(0, 0, W, H);
    for (let y = 0, fila = 0; y < H; y += 96, fila++) {
      g.fillStyle(0x34382f).fillRect(0, y, W, 94);
      g.fillStyle(0x464b3e).fillRect(0, y, W, 2);
      g.fillStyle(0x15170f).fillRect(0, y + 94, W, 2);
      for (let x = (fila % 2) * 128; x < W; x += 256) g.fillStyle(0x15170f).fillRect(x, y, 2, 94);
      for (let x = 8; x < W; x += 32) { remache(x, y + 8); remache(x, y + 86); }
    }

    // Manchas de óxido.
    const oxidos = [0x6b3a1e, 0x8a4a22, 0x4f2b17];
    for (let i = 0; i < 70; i++) {
      g.fillStyle(rnd.pick(oxidos), 0.45);
      g.fillRect(rnd.between(0, W / 4) * 4, rnd.between(0, H / 4) * 4, rnd.between(2, 8) * 4, rnd.between(1, 4) * 4);
    }

    // Luz cálida tenue en el centro.
    for (let r = 420; r > 0; r -= 60) g.fillStyle(0xffa040, 0.025).fillCircle(W / 2, H / 2, r);

    // Marcos de las casillas y sus placas.
    PERSONAJES.forEach((_, i) => {
      const c = this.rectCasilla(i);
      g.fillStyle(0x000000, 0.5).fillRect(c.x - 10, c.y - 10, c.ancho + 28, c.alto + 28);
      g.fillStyle(0x5a5e50).fillRect(c.x - 14, c.y - 14, c.ancho + 28, c.alto + 28);
      g.fillStyle(0x7c8070).fillRect(c.x - 14, c.y - 14, c.ancho + 28, 3);
      g.fillStyle(0x0d0e0c).fillRect(c.x, c.y, c.ancho, c.alto);
      g.fillStyle(0x16180f).fillRect(c.x, c.y + c.alto - 40, c.ancho, 40);
      for (let x = c.x - 7; x <= c.x + c.ancho + 7; x += 28) { remache(x, c.y - 7); remache(x, c.y + c.alto + 7); }
      for (let y = c.y + 21; y < c.y + c.alto; y += 28) { remache(c.x - 7, y); remache(c.x + c.ancho + 7, y); }

      const py = c.y + c.alto + 14;
      g.fillStyle(0x5a5e50).fillRect(c.cx - 110, py, 220, altoPlaca);
      g.fillStyle(0x1e2019).fillRect(c.cx - 104, py + 4, 208, altoPlaca - 8);
      [[c.cx - 107, py + 3], [c.cx + 107, py + 3], [c.cx - 107, py + altoPlaca - 4], [c.cx + 107, py + altoPlaca - 4]]
        .forEach(([x, y]) => remache(x, y));
    });

    // Lianas y musgo colgando desde arriba.
    for (let i = 0; i < 9; i++) {
      const x0 = rnd.between(0, W / 4) * 4;
      const largo = rnd.between(60, 220);
      for (let y = 0; y < largo; y += 4) {
        const x = x0 + Math.round(Math.sin(y / 18) * 6 / 2) * 2;
        g.fillStyle(0x2f4a1c).fillRect(x, y, 4, 4);
        if (y % 16 === 0) g.fillStyle(0x4f7a2a).fillRect(y % 32 ? x + 4 : x - 6, y, 6, 4);
      }
    }
    for (let x = 0; x < W; x += 4) {
      const alto = rnd.between(0, 3) * 4;
      if (alto) g.fillStyle(rnd.pick([0x2f4a1c, 0x3d5e22])).fillRect(x, 0, 4, alto);
    }

    // Sacos de arena abajo.
    for (let fila = 0; fila < 3; fila++) {
      const y = H - 14 - fila * 18;
      for (let x = -20 + (fila % 2) * 22; x < W + 40; x += 44) {
        g.fillStyle(0x3d3826).fillEllipse(x + 2, y + 3, 46, 22);
        g.fillStyle(0x8a7d55).fillEllipse(x, y, 44, 20);
        g.fillStyle(0xa3966a).fillEllipse(x - 4, y - 5, 28, 6);
      }
    }

    g.generateTexture('selFondo', W, H);
    g.destroy();
  }
}
