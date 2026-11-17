// =============================================================================
// Selección de personaje al estilo Metal Slug.
// Viene del Menu y, al confirmar, guarda el personaje en el registry
// ('personaje') y arranca Nivel1.
//
// Fondo: assets/seleccion/seleccion1.jpeg (título, cóndor, tres ventanas con
// su placa de nombre arriba y otra abajo), lo más grande que entra (sin la
// franja de abajo), en una sala oscura como de interrogatorio: penumbra en los
// bordes, una lámpara que cuelga sobre el centro, titila y deja ver el polvo
// en su luz. En cada ventana va el personaje y una
// persiana metálica que sube al entrar y baja al elegir; abajo, una luz y el
// cartel P1 sobre el elegido. Piezas: herramientas/seleccion.py.
// =============================================================================

// --- Personajes --------------------------------------------------------------
// Cada uno muestra o un retrato (hoja con gris / normal / gritando, como en
// Metal Slug: gris si no está elegido, grita al confirmar) o una animación
// (ANIMACIONES, o las de su hoja: Tuto, CuerpoTuto.js). escala: la del
// animado (si no, DISENO_SELECCION.escalaPersonaje). Para agregar uno basta
// con editar este array.
const PERSONAJES = [
  // Tuto: el idle de cuerpo entero (a px de pantalla: x2 llena la ventana).
  { id: 'tuto', nombre: 'TUTO', animIdle: 'tuto_idle', animPose: 'tuto_sel_pose', escala: 2, bloqueado: false },
  { id: 'manfred', nombre: 'MANFRED', retratos: 'selRetratoManfred', bloqueado: false },
  { id: 'proximo', nombre: '???', bloqueado: true }
];

// Cuadros de las hojas de retratos.
const RETRATO = { gris: 0, normal: 1, grita: 2 };

// --- Animaciones -------------------------------------------------------------
// Cada frame es un PNG suelto dentro de "carpeta" (p. ej. { carpeta:
// 'assets/seleccion/1/', frames: ['south', 'east'], fps: 8, repeat: -1 }).
const ANIMACIONES = {};

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
// Medidas en píxeles de seleccion1.jpeg. Se ve de y 0 a `altoVisible` (la
// franja de aguayos de abajo queda fuera) llenando el alto de la pantalla.
const DISENO_SELECCION = {
  fondo: { ancho: 1232, alto: 864 },
  altoVisible: 768,
  ventana: { ancho: 245, alto: 355 },            // donde va el personaje
  ventanas: [[140, 312], [496, 314], [843, 315]], // esquina de arriba a la izquierda
  placaNombre: [[265, 237], [616, 237], [966, 236]], // centro de la placa negra de arriba
  placaAbajo: [[269, 733], [617, 733], [964, 733]],  // centro de la placa de metal de abajo
  escalaPersonaje: 3, // el soldado animado, entero para no deformar el pixel art
  segundos: 20,
  // Sala de interrogatorio: color de la pared, cuánto se oscurece el panel y
  // la luz de la lámpara.
  sala: { pared: 0x0b0a08, tintePanel: 0x9a8e7c, luz: 0xffe2a0 }
};


class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  preload() {
    const c = 'assets/seleccion/';
    this.load.image('selFondo', c + 'seleccion1.jpeg');
    // Piezas ya al tamaño de pantalla (herramientas/seleccion.py).
    this.load.spritesheet('selPersiana', c + 'persiana.png', { frameWidth: 184, frameHeight: 266 });
    this.load.spritesheet('selCartel', c + 'carteles.png', { frameWidth: 63, frameHeight: 68 });
    this.load.spritesheet('selBoton', c + 'botones.png', { frameWidth: 34, frameHeight: 34 });
    this.load.spritesheet('selRetratoManfred', c + 'manfred_retratos.png', { frameWidth: 193, frameHeight: 266 });
    cargarTuto(this); // CuerpoTuto.js

    // Un frame puede repetirse entre animaciones: se carga una sola vez.
    Object.values(ANIMACIONES).forEach(({ carpeta, frames }) => {
      frames.forEach((frame) => {
        const key = this.keyFrame(carpeta, frame);
        if (!this.textures.exists(key)) this.load.image(key, carpeta + frame + '.png');
      });
    });

    Object.entries(SONIDOS_SELECCION).forEach(([key, { archivo }]) => this.load.audio(key, archivo));
    cargarMusica(this, 'seleccion');

    // Un archivo que falta (sonido) no detiene la escena.
    this.load.on('loaderror', (archivo) => console.info('Selección: no se encontró', archivo.src));
  }

  create() {
    const { width, height } = this.scale;
    this.indice = PERSONAJES.findIndex((p) => !p.bloqueado);
    this.confirmado = false;

    // Pared oscura, el panel (un poco apagado) y encima la penumbra y la lámpara.
    const { sala } = DISENO_SELECCION;
    this.add.rectangle(0, 0, width, height, sala.pared).setOrigin(0).setDepth(-10);
    const f = this.disenoEscala();
    this.add.image(f.x0, 0, 'selFondo').setOrigin(0).setScale(f.s).setDepth(-1).setTint(sala.tintePanel);
    this.crearSalaInterrogatorio();

    this.crearAnimaciones();
    this.casillas = PERSONAJES.map((personaje, i) => this.crearCasilla(personaje, i));
    this.crearCursor();
    this.actualizarCasillas();
    this.abrirPersianas();
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

  // Escala del fondo (altoVisible llena el alto) y dónde empieza en x (centrado).
  disenoEscala() {
    const { fondo, altoVisible } = DISENO_SELECCION;
    const s = this.scale.height / altoVisible;
    return { s, x0: (this.scale.width - fondo.ancho * s) / 2 };
  }

  // Un punto de seleccion1.jpeg en la pantalla.
  aPantalla([x, y]) {
    const { s, x0 } = this.disenoEscala();
    return { x: x0 + x * s, y: y * s };
  }

  // Ventana de la casilla i en la pantalla.
  rectCasilla(i) {
    const { s } = this.disenoEscala();
    const { x, y } = this.aPantalla(DISENO_SELECCION.ventanas[i]);
    const ancho = DISENO_SELECCION.ventana.ancho * s;
    const alto = DISENO_SELECCION.ventana.alto * s;
    return { x, y, ancho, alto, cx: x + ancho / 2 };
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
    // Tuto: sus animaciones (CuerpoTuto.js) y, al confirmar, el idle rápido.
    animacionesTuto(this);
    if (!this.anims.exists('tuto_sel_pose')) {
      this.anims.create({ key: 'tuto_sel_pose', frames: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0].map((f) => ({ key: 'tuto_idle', frame: String(f) })), frameRate: 18 });
    }
    Object.entries(ANIMACIONES).forEach(([key, { carpeta, frames, fps, repeat }]) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map((frame) => ({ key: this.keyFrame(carpeta, frame) })),
        frameRate: fps,
        repeat
      });
    });
    if (!this.anims.exists('sel_persiana_abre')) {
      this.anims.create({ key: 'sel_persiana_abre', frames: this.anims.generateFrameNumbers('selPersiana', { frames: [4, 3, 2, 1, 0] }), frameRate: 14 });
      this.anims.create({ key: 'sel_persiana_cierra', frames: this.anims.generateFrameNumbers('selPersiana', { frames: [0, 1, 2, 3, 4] }), frameRate: 16 });
    }
  }

  // Penumbra en los bordes (más oscura cuanto más lejos del centro), la luz de
  // una lámpara que cuelga sobre el centro y se mece, polvo flotando en la luz
  // y, cada tanto, un parpadeo de la lámpara que oscurece todo.
  crearSalaInterrogatorio() {
    const { width, height } = this.scale;
    const { luz } = DISENO_SELECCION.sala;
    if (!this.textures.exists('selPenumbra')) {
      const lienzo = this.textures.createCanvas('selPenumbra', width, height);
      const ctx = lienzo.getContext();
      const degrade = ctx.createRadialGradient(width / 2, height * 0.52, height * 0.3, width / 2, height * 0.52, width * 0.62);
      degrade.addColorStop(0, 'rgba(0,0,0,0)');
      degrade.addColorStop(0.55, 'rgba(0,0,0,0.45)');
      degrade.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = degrade;
      ctx.fillRect(0, 0, width, height);
      lienzo.refresh();
    }
    this.add.image(0, 0, 'selPenumbra').setOrigin(0).setDepth(20);

    // La lámpara está arriba, fuera de la pantalla: se ve su cono de luz.
    texturasEfectos(this); // fx_haz (EfectosMenu.js)
    const cono = this.add.image(width / 2, -40, 'fx_haz').setOrigin(0, 0.5).setAngle(90)
      .setScale(5, 7).setTint(luz).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.22).setDepth(21);
    this.tweens.add({ targets: cono, angle: { from: 86, to: 94 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Polvo flotando en la luz.
    if (!this.textures.exists('selPolvo')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
      g.generateTexture('selPolvo', 2, 2);
      g.destroy();
    }
    this.add.particles(0, 0, 'selPolvo', {
      x: { min: width * 0.3, max: width * 0.7 }, y: { min: 40, max: height - 60 },
      speedX: { min: -6, max: 6 }, speedY: { min: -4, max: 8 }, lifespan: 4000, frequency: 120,
      alpha: { start: 0, end: 0.5, ease: (t) => Math.sin(t * Math.PI) }, tint: luz, blendMode: 'ADD'
    }).setDepth(21);

    // Parpadeo de lámpara vieja: la sala se oscurece un instante.
    const apagon = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setAlpha(0).setDepth(22);
    this.time.addEvent({
      delay: 3800, loop: true,
      callback: () => {
        this.tweens.add({ targets: apagon, alpha: 0.55, duration: 45, yoyo: true, repeat: Phaser.Math.Between(1, 3) });
        this.tweens.add({ targets: cono, alpha: 0.05, duration: 45, yoyo: true, repeat: 2 });
      }
    });
  }

  crearCasilla(personaje, i) {
    const r = this.rectCasilla(i);
    const { escalaPersonaje } = DISENO_SELECCION;
    const casilla = { personaje, rect: r };
    // Lo que va adentro de la ventana no se sale de ella.
    const mascara = this.make.graphics({ add: false }).fillRect(r.x, r.y, r.ancho, r.alto).createGeometryMask();

    if (personaje.retratos) {
      // Retrato apoyado abajo (gris, normal o gritando: actualizarCasillas).
      casilla.retrato = this.add.image(r.cx, r.y + r.alto, personaje.retratos, RETRATO.gris).setOrigin(0.5, 1).setMask(mascara);
      casilla.respiracion = this.tweens.add({
        targets: casilla.retrato, scaleY: 1.012, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    } else if (!personaje.bloqueado && this.anims.exists(personaje.animIdle)) {
      const primerFrame = this.anims.get(personaje.animIdle).frames[0];
      casilla.sprite = this.add.sprite(r.cx, r.y + r.alto - 10, primerFrame.textureKey, primerFrame.textureFrame)
        .setOrigin(0.5, 1).setScale(personaje.escala || escalaPersonaje).setMask(mascara).play(personaje.animIdle);
      // "Respiración": sube y baja 2 px.
      casilla.respiracion = this.tweens.add({
        targets: casilla.sprite, y: casilla.sprite.y - 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    }

    // Persiana: arranca cerrada (abrirPersianas la sube si no está bloqueada).
    casilla.persiana = this.add.sprite(r.x, r.y, 'selPersiana', 4).setOrigin(0).setDisplaySize(r.ancho, r.alto);
    if (personaje.bloqueado) {
      casilla.candado = this.crearCandado(r.cx, r.y + r.alto * 0.45);
      TextFX.texto(this, r.cx, r.y + r.alto - 30, 'PRÓXIMAMENTE', { color: 'rojo', escala: 1 });
    }

    // Destello blanco para la confirmación y marco rojo si se elige una bloqueada.
    casilla.flash = this.add.rectangle(r.cx, r.y, r.ancho, r.alto, 0xffffff).setOrigin(0.5, 0).setAlpha(0);
    casilla.marcoError = this.add.rectangle(r.cx, r.y + r.alto / 2, r.ancho + 12, r.alto + 12)
      .setStrokeStyle(4, 0xff2020).setAlpha(0);

    // Nombre en la placa negra de arriba.
    const nombre = this.aPantalla(DISENO_SELECCION.placaNombre[i]);
    casilla.nombre = TextFX.menu(this, nombre.x, nombre.y, personaje.nombre, { escala: 1 });
    if (personaje.bloqueado) casilla.nombre.setAlpha(0.5);

    // Luz en la placa de abajo: roja en la casilla elegida.
    const abajo = this.aPantalla(DISENO_SELECCION.placaAbajo[i]);
    casilla.luz = this.add.image(abajo.x - 46, abajo.y, 'selBoton', 0);

    // Zona para el mouse.
    this.add.zone(r.cx, r.y + r.alto / 2, r.ancho, r.alto).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!personaje.bloqueado) this.seleccionar(i); })
      .on('pointerdown', () => {
        if (personaje.bloqueado) this.errorBloqueada(i);
        else { this.seleccionar(i); this.confirmar(); }
      });

    return casilla;
  }

  crearCandado(x, y) {
    const g = this.add.graphics({ x, y });
    g.lineStyle(5, 0x8c8f80).strokeRect(-10, -4, 20, 22);              // arco
    g.fillStyle(0x000000).fillRect(-14, 10, 32, 26);                   // sombra
    g.fillStyle(0xc9a227).fillRect(-16, 8, 32, 26);                    // cuerpo
    g.fillStyle(0xf1d36b).fillRect(-16, 8, 32, 4);                     // brillo
    g.fillStyle(0x3a2a05).fillRect(-3, 16, 6, 6).fillRect(-1, 22, 2, 6); // cerradura
    return g.setDepth(2);
  }

  // Cartel P1 en la placa de abajo de la casilla elegida: se prende y se apaga.
  crearCursor() {
    // Flecha que parpadea a la izquierda del nombre elegido.
    this.flechaNombre = TextFX.flecha(this, 0, 0, { escala: 1 }).setDepth(41);
    this.ponerFlechaNombre(false);
    const abajo = this.aPantalla(DISENO_SELECCION.placaAbajo[this.indice]);
    this.cursor = this.add.sprite(abajo.x + 8, abajo.y - 6, 'selCartel', 0).setDepth(41);
    this.parpadeoCursor = this.time.addEvent({
      delay: 260, loop: true, callback: () => this.cursor.setFrame(this.cursor.frame.name === 0 ? 1 : 0)
    });
    this.tweens.add({ targets: this.cursor, y: '-=4', duration: 300, yoyo: true, repeat: -1 });
  }

  ponerFlechaNombre(animada = true) {
    const nombre = this.casillas[this.indice].nombre;
    const x = Math.round(nombre.x - nombre.anchoTexto / 2 - 14);
    if (animada) this.tweens.add({ targets: this.flechaNombre, x, y: nombre.y, duration: 120, ease: 'Quad.out' });
    else this.flechaNombre.setPosition(x, nombre.y);
  }

  // Retratos en gris salvo el elegido; luz roja en el elegido. Nombres
  // plateados y el elegido en dorado (con un rebote).
  actualizarCasillas() {
    this.casillas.forEach((casilla, i) => {
      const elegida = i === this.indice;
      if (!casilla.personaje.bloqueado) casilla.nombre.seleccionar(elegida);
      if (casilla.retrato) casilla.retrato.setFrame(elegida ? RETRATO.normal : RETRATO.gris);
      if (casilla.sprite) {
        if (elegida) casilla.sprite.clearTint();
        else casilla.sprite.setTint(0x6a6a6a);
      }
      casilla.luz.setFrame(elegida ? 1 : 0);
    });
  }

  // Al entrar, las persianas de las casillas libres suben una tras otra.
  abrirPersianas() {
    this.casillas.forEach((casilla, i) => {
      if (casilla.personaje.bloqueado) return;
      this.time.delayedCall(250 + i * 180, () => {
        this.sonar('sel_persiana');
        casilla.persiana.play('sel_persiana_abre');
      });
    });
  }

  crearCuentaRegresiva() {
    this.tiempo = DISENO_SELECCION.segundos;
    const x = this.scale.width - 40;

    // TIEMPO arriba a la derecha; el número pasa a rojo en los últimos 5 s.
    TextFX.hud(this, x, 26, 'TIEMPO', { origen: 1, origenY: 0.5 }).setDepth(30);
    this.textoTiempo = TextFX.hud(this, x, 64, String(this.tiempo), { color: 'oro', escala: 4, origen: 1, origenY: 0.5 })
      .setDepth(30);

    this.reloj = this.time.addEvent({
      delay: 1000,
      repeat: this.tiempo - 1,
      callback: () => {
        this.tiempo--;
        this.textoTiempo.setText(String(this.tiempo));
        if (this.tiempo <= 5) {
          this.textoTiempo.setColor('rojo');
          this.tweens.add({ targets: this.textoTiempo, scale: 1.15, duration: 90, yoyo: true });
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
    const abajo = this.aPantalla(DISENO_SELECCION.placaAbajo[i]);
    this.tweens.add({ targets: this.cursor, x: abajo.x + 8, duration: 120, ease: 'Quad.out' });
    this.actualizarCasillas();
    this.ponerFlechaNombre();
    // Chispas en las esquinas de la ventana al llegar.
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
    const { personaje, sprite, retrato } = casilla;
    this.registry.set('personaje', personaje.id);
    nuevaPartida(this.registry); // Estado.js: vidas, puntaje y tiempo de la partida

    // 1. Flash blanco sobre la ventana, el nombre destella 3 veces y el
    //    cartel P1 queda fijo y prendido.
    casilla.nombre.destellar(3, 80);
    this.flechaNombre.destroy();
    this.parpadeoCursor.remove();
    this.cursor.setFrame(1);
    casilla.flash.setAlpha(1);
    this.tweens.add({ targets: casilla.flash, alpha: 0, duration: 400 });

    // 2. El personaje reacciona: el retrato grita (con un sacudón) o el
    //    animado hace su pose.
    if (retrato) {
      casilla.respiracion.stop();
      retrato.setFrame(RETRATO.grita).setScale(1);
      this.tweens.add({ targets: retrato, x: retrato.x + 4, duration: 40, yoyo: true, repeat: 5 });
    } else if (sprite) {
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

    // 4. Se cierran las persianas de las demás casillas (las bloqueadas ya lo están).
    this.casillas.forEach((otra) => {
      if (otra === casilla || otra.personaje.bloqueado) return;
      this.time.delayedCall(250, () => {
        this.sonar('sel_persiana');
        otra.persiana.play('sel_persiana_cierra');
      });
    });

    // 5. Fade a negro y al nivel.
    this.time.delayedCall(1600, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Nivel1'));
    });
  }
}
