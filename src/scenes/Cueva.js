// =============================================================================
// La Cueva de los Guácharos (Parque Nacional Carrasco, Chapare): un nivel
// aparte a mitad de Nivel1 (la escena se llama Cueva). Se entra por la boca de
// la izquierda del peñón (Nivel1.crearCueva), se cruza hacia la derecha y, al
// salir, se vuelve a Nivel1 por la boca del otro lado (Nivel1 se duerme
// mientras tanto y conserva todo).
//
// Imágenes: assets/fondos/cueva/ (herramientas/cueva_guacharos.py, a partir de
// assets/efectos/cueva/img2.jpeg e img3.jpeg), a escala 1:
//   cueva.png        el nivel completo, con scrollFactor 1. Su piso queda en
//                    y 500 (y 250 a 512x288). Los huecos negros del fondo son
//                    transparentes: por ahí se ven las capas de parallax.
//   cueva_cielo / cueva_lejano / cueva_medio  parallax (0.05, 0.2 y 0.45)
// Colisión: assets/fondos/cueva/cueva_collision.json (cuerpos invisibles, no
// hay tiles). ground: líneas del suelo (pueden ser inclinadas), platforms:
// pisos de un solo sentido, walls: paredes, ladders: escaleras. La tecla E
// abre el editor para verlas, moverlas y guardar el JSON (ver EDITOR).
//
// Recorrido (como en Metal Slug): 3 zonas. La cámara se traba al llegar a
// cada una hasta vencer a sus enemigos (cholitas en el piso y en las alturas,
// guácharos que bajan en picada); después parpadea "GO →". La tercera es la
// arena del GUÁCHARO REY. Hay 2 rehenes; las cajas y los turriles se rompen a
// balazos y sueltan un power-up al azar (un arma o un plátano que cura).
// =============================================================================

// Tinte de los objetos sueltos: la luz fría de la cueva (no brillan como afuera).
const CUEVA_LUZ = 0xb4b8c6;

const CUEVA = {
  ancho: 2564, // (cueva.png alargada 500 px: herramientas/cueva_guacharos.py)
  alto: 576,
  ruta: 'assets/fondos/cueva/',
  // Capas de parallax: fijas a la cámara, la textura corre con scrollX * factor.
  // y, escala y tinte: dónde van y cuán oscuras (es el fondo de una cueva).
  parallax: [
    { clave: 'cuevaCielo', archivo: 'cueva_cielo.png', factor: 0.05, y: 0, escala: 2, tinte: 0x8a92aa },
    { clave: 'cuevaLejano', archivo: 'cueva_lejano.png', factor: 0.2, y: 60, escala: 1.8, tinte: 0x6e7484 },
    // La de la roca empieza arriba de la pantalla: su borde de arriba no se ve.
    { clave: 'cuevaMedio', archivo: 'cueva_medio.png', factor: 0.45, y: -40, escala: 2.5, tinte: 0x8a7c6c }
  ],
  // Zonas: hasta dónde llega la cámara (scrollX) mientras queden enemigos.
  // guacharos: cuántos bajan del techo al llegar. jefe: la arena final.
  zonas: [
    { limite: 0, guacharos: 2 },
    { limite: 560, guacharos: 3 },
    { limite: 1040, guacharos: 3 },
    { limite: 1540, jefe: true }
  ],
  // Enemigos de a pie: x, zona y desde qué y buscar el piso (para pararlas en
  // una repisa en vez del suelo).
  cholitas: [
    { x: 430, zona: 0 }, { x: 760, zona: 0 }, { x: 980, zona: 0, desde: 330 },
    { x: 1150, zona: 1 }, { x: 1320, zona: 1 }, { x: 1260, zona: 1, desde: 300 }, { x: 1420, zona: 1, desde: 300 },
    { x: 1640, zona: 2 }, { x: 1830, zona: 2 }, { x: 2010, zona: 2 }
  ],
  rehenes: [{ x: 615, desde: 360 }, { x: 1120, desde: 300 }],
  // Rompibles (se pisan desde arriba). pila: cajas una arriba de la otra.
  // Charcos de agua en el piso: x del centro y ancho (px).
  charcos: [[150, 150], [400, 130], [760, 180], [1050, 120], [1280, 170], [1540, 140], [1760, 190], [2200, 170]],
  rompibles: [
    { tipo: 'caja', x: 280 }, { tipo: 'turril', x: 500 }, { tipo: 'caja', x: 870, pila: 2 },
    { tipo: 'turril', x: 1190 }, { tipo: 'caja', x: 1340, desde: 300 }, { tipo: 'turril', x: 1455 },
    { tipo: 'turril', x: 1600 }, { tipo: 'caja', x: 1720, pila: 2 }, { tipo: 'caja', x: 1910 },
    { tipo: 'turril', x: 2215 }
  ],
  vidaRompible: { caja: 3, turril: 2 },
  hundido: 3,                         // los objetos se apoyan 2-3 px hundidos en el suelo
  turril: { radio: 110, dano: 4 },    // explota al romperse
  // Power-ups que sueltan los rompibles y los rehenes.
  premios: { platano: 0.35, armas: ['ak47', 'ametralladora', 'escopeta', 'lanzacohetes', 'lanzagranadas', 'lanzallamas'] },
  // Guácharos (assets/efectos/cueva/aves/, ver AVE): los que bajan del techo
  // y los posados en las alturas (chillan y salen volando si el jugador se acerca).
  // escala: tamaño de la hoja (0.65: un poco más chicos que el jugador).
  // ataque: al tirarse en picada se agrandan (escala x ataque) y aletean rápido
  // (ave_ataca). grito: cada cuánto chillan los posados (ms).
  guacharo: { vida: 1, alto: [110, 250], picada: 460, espera: [1300, 2600], escala: 0.65, ataque: 1.35, cercania: 380, grito: [1800, 3600] },
  posados: [{ x: 722, desde: 420, zona: 0 }, { x: 1360, desde: 300, zona: 1 }, { x: 1950, desde: 470, zona: 2 }],
  // El Guácharo Rey (AVE.jefe*). alto y suelo: y del centro del cuerpo al
  // planear y en el barrido rasante. bala: las de la ráfaga de ametralladora
  // (px/s y grados entre una y otra del abanico).
  jefe: {
    vida: 80, x: 2260, alto: 200, arena: [1970, 2430], escala: 1.15, tinteFuria: 0xffa898,
    velocidad: 260, picada: 560, barrido: 460, suelo: 452, bala: { velocidad: 480, dispersion: 7 }
  },
  camara: { lerp: 0.08, adelante: 0.4 },     // el jugador queda al 40% de la pantalla
  salida: 2350,                              // x donde se sale (después del jefe)
  helechos: [24, 300, 640, 1000, 1330, 1680, 2040, 2300, 2520],
  lianas: [140, 720, 1360, 1880, 2380],
  // Agua: cascadas y lago lejanos (detrás de la roca, se ven por los huecos),
  // la cascada entre los dos pilares, el río de abajo (corre a la derecha) y
  // sus piedras.
  agua: {
    cascadaFrente: { x: 1980, arriba: 70, abajo: 420 },
    rio: { y: 516, velocidad: 0.05 },
    piedras: [210, 590, 980, 1390, 1810, 2230]
  },
  // Rocas de la arena del jefe (cueva_rocas.png, herramientas/cueva_guacharos.py):
  // repisas flotantes (arriba: y del borde de arriba) y peñas en el piso, para
  // subir y esquivar los barridos del jefe. Sus plataformas están en el JSON.
  rocas: [
    { tipo: 'pena', x: 2020 }, { tipo: 'repisa', x: 2150, arriba: 390 },
    { tipo: 'repisa', x: 2290, arriba: 325, espejo: true }, { tipo: 'pena', x: 2400, espejo: true }
  ],
  // Puntas (estalactitas) que se desprenden del techo y escombros con temblor.
  derrumbe: { cada: [2600, 4600], temblor: [11000, 17000], aviso: 650, dano: true }
};

// Editor de colisión (tecla E). Colores por tipo.
const EDITOR = {
  colores: { ground: 0x5aff6a, platforms: 0x40d8ff, walls: 0xff4a4a, ladders: 0xffd23f },
  agarre: 10 // px de distancia para tomar un punto
};

class Cueva extends Phaser.Scene {
  constructor() {
    super('Cueva');
  }

  preload() {
    // Arrancando directo (index.html?escena=Cueva) falta lo que carga Nivel1.
    if (!this.textures.exists('cholita')) Nivel1.prototype.preload.call(this);
    const r = CUEVA.ruta;
    cargarAves(this, true);
    if (!this.textures.exists('cuevaNivel')) this.load.image('cuevaNivel', r + 'cueva.png');
    CUEVA.parallax.forEach((c) => {
      if (!this.textures.exists(c.clave)) this.load.image(c.clave, r + c.archivo);
    });
    if (!this.textures.exists('cuevaRocas')) this.load.spritesheet('cuevaRocas', r + 'cueva_rocas.png', { frameWidth: 150, frameHeight: 64 });
    if (!this.cache.json.exists('cuevaColision')) this.load.json('cuevaColision', r + 'cueva_collision.json');
  }

  create() {
    const { width, height } = this.scale;
    // El JSON del cache: lo que cambie el editor queda para los reintentos.
    this.colision = this.cache.json.get('cuevaColision');
    this.estado = 'entrada';
    // Al reiniciar (MISIÓN FALLIDA) la instancia es la misma: nada de la vez anterior.
    this.solidos = null;
    this.jefe = null;
    this.editor = null;
    this.camaraMinima = 0;
    this.rnd = new Phaser.Math.RandomDataGenerator([String(Date.now())]);
    // Al morir se reinicia la escena: los rehenes vuelven a contar desde la entrada.
    const base = this.registry.get('cuevaBase') || { rehenes: this.registry.get('rehenes') || 0 };
    this.registry.set('rehenes', base.rehenes);
    this.rescatados = 0;

    texturasEfectos(this);
    texturasCueva(this);
    this.physics.world.setBounds(0, -200, CUEVA.ancho, height + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.crearFondo();
    this.crearAmbiente();
    this.crearColision();
    this.crearJugador();
    this.crearRompibles();
    this.crearEnemigos();
    this.crearRehenes();
    this.crearCharcos();
    this.crearAgua();
    this.crearRocas();
    this.crearDerrumbes();
    this.crearPrimerPlano();
    this.crearHUD();
    this.crearEditor();

    this.teclas = this.input.keyboard.createCursorKeys();
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,S,SPACE,J,X,TAB');
    this.input.keyboard.resetKeys(); // ARRIBA (con la que se entró) puede seguir apretada

    // Cámara manual (actualizarCamara): sigue con lerp, nunca retrocede y se
    // traba en el límite de la zona.
    const cam = this.cameras.main;
    cam.setBounds(0, 0, CUEVA.ancho, height).setBackgroundColor(0x07060a);
    cam.scrollX = 0;
    this.zona = 0;
    this.zonaEstado = 'camino';
    this.pendientes = CUEVA.zonas.map(() => 0);
    cam.fadeIn(500, 0, 0, 0);
    tocarMusica(this, 'nivel1');
    this.titulo(width);
  }

  // Cartel de entrada; después se puede mover.
  titulo(width) {
    const nombre = TextFX.letras(this, width / 2, 150, 'CUEVA DE LOS GUÁCHAROS', {
      escala: 3, cada: 45, fijo: true, profundidad: 32,
      alTerminar: () => {
        const sub = TextFX.texto(this, width / 2, 196, 'PARQUE NACIONAL CARRASCO · CHAPARE', { color: 'plata', escala: 1 })
          .setScrollFactor(0).setDepth(32).setAlpha(0);
        this.tweens.add({ targets: sub, alpha: 1, duration: 300 });
        this.time.delayedCall(1600, () => {
          nombre.salir(400);
          this.tweens.add({ targets: sub, alpha: 0, duration: 400, onComplete: () => sub.destroy() });
        });
      }
    });
    // Entra caminando desde la izquierda (viene de la boca de la cueva en Nivel1).
    const j = this.jugador;
    j.setFlipX(false).setVelocityX(JUGADOR.velocidad * 0.7);
    if (this.anims.exists('jugador_caminar')) j.play('jugador_caminar');
    this.time.delayedCall(700, () => {
      if (this.estado !== 'entrada') return;
      this.estado = 'control';
      j.setVelocityX(0);
    });
  }

  // ---------------------------------------------------------------------------
  // Fondo y ambiente
  // ---------------------------------------------------------------------------

  crearFondo() {
    const { width, height } = this.scale;
    this.capas = CUEVA.parallax.map((c, i) => {
      const alto = this.textures.get(c.clave).getSourceImage().height;
      // La tira se agranda con setScale: tilePositionX queda en px de la textura.
      return this.add.tileSprite(0, c.y, Math.ceil(width / c.escala), alto, c.clave)
        .setOrigin(0).setScrollFactor(0).setDepth(i * 0.1).setScale(c.escala).setTint(c.tinte)
        .setData('factor', c.factor);
    });
    // El nivel: el piso del dibujo (y 466 de cueva.png) cae en y 500.
    const y = this.colision.imagenY;
    this.add.image(0, y, 'cuevaNivel').setOrigin(0).setDepth(1);
    const abajo = y + this.textures.get('cuevaNivel').getSourceImage().height;
    this.add.rectangle(0, abajo, CUEVA.ancho, height - abajo + 4, 0x120c06).setOrigin(0).setDepth(1);
    // Arriba de la imagen: el techo se funde en negro.
    this.add.image(0, 0, 'cueva_techo').setOrigin(0).setDisplaySize(CUEVA.ancho, y + 70).setDepth(1.01);
  }

  moverFondo() {
    const x = this.cameras.main.scrollX;
    this.capas.forEach((t) => { t.tilePositionX = x * t.getData('factor') / t.scaleX; });
  }

  // Niebla, polvo, goteo, plumas, haces de luz, bandadas en el fondo y viñeta.
  crearAmbiente() {
    const { width, height } = this.scale;
    // Haces de luz de luna que bajan por las grietas del techo.
    [430, 900, 1640, 2140].forEach((x, i) => {
      const haz = this.add.image(x, 0, 'fx_haz').setOrigin(0, 0.5).setAngle(96 - i * 5).setScale(2.6, 2.2)
        .setTint(0x9ab8d0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.13).setDepth(1.5);
      this.tweens.add({ targets: haz, alpha: 0.07, duration: 2400 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    // Niebla baja: una capa detrás del jugador y otra, más tenue, delante.
    this.nieblas = [
      this.add.tileSprite(0, height - 250, width / 2, 64, 'cueva_niebla').setOrigin(0).setScrollFactor(0)
        .setDepth(5).setAlpha(0.32).setScale(2, 3.2).setData({ factor: 0.85, deriva: 0.012 }),
      this.add.tileSprite(0, height - 130, width / 2.5, 64, 'cueva_niebla').setOrigin(0).setScrollFactor(0)
        .setDepth(14).setAlpha(0.14).setScale(2.5, 2.4).setData({ factor: 1.2, deriva: -0.02 })
    ];
    // Polvo que flota en la luz.
    this.add.particles(0, 0, 'fx_chispa', {
      x: { min: 0, max: width }, y: { min: 40, max: height - 90 },
      speedX: { min: -8, max: 8 }, speedY: { min: -5, max: 5 },
      lifespan: { min: 3000, max: 6000 }, scale: { min: 0.5, max: 1 },
      alpha: { start: 0, end: 0.45, ease: (t) => Math.sin(t * Math.PI) },
      tint: 0xd8e0c8, frequency: 200, maxAliveParticles: 28, blendMode: 'ADD'
    }).setScrollFactor(0).setDepth(6);
    // Plumas de guácharo que caen meciéndose.
    this.add.particles(0, -10, 'cueva_pluma', {
      x: { min: 0, max: width }, speedY: { min: 25, max: 45 }, speedX: { min: -20, max: 20 },
      rotate: { start: -40, end: 220 }, lifespan: 9000, frequency: 900, scale: ESCALA, alpha: 0.85,
      maxAliveParticles: 10
    }).setScrollFactor(0).setDepth(6);
    // Goteo de las estalactitas mojadas del dibujo y gotas sueltas del techo.
    [528, 548, 571].forEach((x, i) => {
      this.add.particles(x, 262 + i * 6, 'cuevaGota', {
        gravityY: 900, lifespan: 720, frequency: 900 + i * 300, scale: ESCALA, alpha: { start: 0.9, end: 0.5 }
      }).setDepth(2);
    });
    this.add.particles(0, 40, 'cuevaGota', {
      x: { min: 0, max: width }, speedY: { min: 180, max: 240 }, gravityY: 600, frequency: 380,
      lifespan: 800, alpha: { start: 0.7, end: 0.2 }, scale: ESCALA
    }).setScrollFactor(0).setDepth(6);
    // Bandadas en el fondo (detrás de la roca: se ven por los huecos).
    const bandada = () => {
      this.bandada();
      this.time.delayedCall(Phaser.Math.Between(7000, 12000), bandada);
    };
    this.time.delayedCall(2500, bandada);
    // Viñeta suave.
    this.add.image(0, 0, 'fx_vineta').setOrigin(0).setDisplaySize(width, height).setScrollFactor(0).setDepth(19).setAlpha(0.85);
  }

  // Una bandada de guácharos cruza lejos, entre las capas y la roca.
  bandada() {
    if (this.estado === 'editor') return;
    const f = 0.45;
    const cam = this.cameras.main;
    const izquierda = Math.random() < 0.5;
    const n = Phaser.Math.Between(5, 9);
    for (let i = 0; i < n; i++) {
      const desde = cam.scrollX * f + (izquierda ? -60 - i * 26 : this.scale.width + 60 + i * 26);
      const y0 = Phaser.Math.Between(60, 260);
      const ave = this.add.sprite(desde, y0, AVE.vuelo.clave, 2).setScrollFactor(f, 0).setDepth(0.6)
        .setTint(0x1a100c).setScale(Phaser.Math.FloatBetween(0.35, 0.55)).setFlipX(!izquierda);
      ave.play({ key: 'ave_vuela', startFrame: i % 4 });
      this.tweens.add({
        targets: ave, x: desde + (izquierda ? 1 : -1) * (this.scale.width + 400), y: y0 + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(5000, 7000), ease: 'Sine.inOut', onComplete: () => ave.destroy()
      });
    }
  }

  moverAmbiente(time) {
    const x = this.cameras.main.scrollX;
    this.nieblas.forEach((n) => {
      n.tilePositionX = (x * n.getData('factor') + time * n.getData('deriva') * 16) / n.scaleX;
    });
  }

  // Plantas y lianas delante de todo (más profundidad que el jugador).
  crearPrimerPlano() {
    CUEVA.helechos.forEach((x, i) => {
      // Tapan un poco el piso (y los pies), como las plantas de adelante de Metal Slug.
      this.add.image(x, this.scale.height + 6, 'cueva_helecho').setOrigin(0.5, 1)
        .setScale(ESCALA * (1.3 + (i % 3) * 0.25)).setFlipX(i % 2 === 1).setTint(0xa8b898).setDepth(15);
    });
    CUEVA.lianas.forEach((x, i) => {
      const liana = this.add.image(x, -6, 'cueva_liana').setOrigin(0.5, 0).setScale(ESCALA).setTint(0x6c7c64).setDepth(15)
        .setFlipX(i % 2 === 1);
      this.tweens.add({ targets: liana, angle: { from: -2, to: 2 }, duration: 2600 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }

  // ---------------------------------------------------------------------------
  // Colisión (cueva_collision.json)
  // ---------------------------------------------------------------------------

  // Cuerpos estáticos invisibles con el borde de arriba en la línea del dibujo.
  // Las líneas de suelo inclinadas se cortan en tiras de 4 px (escalones de
  // 1-2 px que el jugador sube sin trabarse).
  crearColision() {
    if (!this.solidos) {
      this.solidos = this.physics.add.staticGroup();
      this.plataformas = this.physics.add.staticGroup();
    }
    this.solidos.clear(true, true);
    this.plataformas.clear(true, true);
    const d = this.colision;
    d.ground.forEach(({ x0, y0, x1, y1 }) => {
      const a = Math.min(x0, x1);
      const b = Math.max(x0, x1);
      if (Math.abs(y1 - y0) < 1) {
        this.solidos.add(this.add.zone((a + b) / 2, y0 + 60, b - a, 120));
        return;
      }
      for (let x = a; x < b; x += 4) {
        const w = Math.min(4, b - x);
        const y = this.lineaEn({ x0, y0, x1, y1 }, x + w / 2);
        this.solidos.add(this.add.zone(x + w / 2, y + 60, w, 120));
      }
    });
    d.walls.forEach(({ x, y, w, h }) => this.solidos.add(this.add.zone(x + w / 2, y + h / 2, w, h)));
    d.platforms.forEach(({ x0, x1, y }) => {
      const zona = this.add.zone((x0 + x1) / 2, y + 6, x1 - x0, 12);
      this.plataformas.add(zona);
      Object.assign(zona.body.checkCollision, { down: false, left: false, right: false });
    });
    this.escaleras = d.ladders.map((e) => ({ ...e, centro: (e.x0 + e.x1) / 2 }));
  }

  // y de una línea de suelo en x.
  lineaEn({ x0, y0, x1, y1 }, x) {
    if (x1 === x0) return Math.min(y0, y1);
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }

  // Primer apoyo (suelo, plataforma o rompible) en x con la cara de arriba en
  // desdeY o más abajo: { y, x0, x1 }.
  superficie(x, desdeY = 0, conRompibles = false) {
    let mejor = { y: Infinity, x0: 0, x1: CUEVA.ancho };
    const ver = (y, x0, x1) => { if (y >= desdeY - 10 && y < mejor.y) mejor = { y, x0, x1 }; };
    this.colision.ground.forEach((l) => {
      const a = Math.min(l.x0, l.x1);
      const b = Math.max(l.x0, l.x1);
      if (x >= a && x <= b) ver(this.lineaEn(l, x), a, b);
    });
    this.colision.platforms.forEach((p) => { if (x >= p.x0 && x <= p.x1) ver(p.y, p.x0, p.x1); });
    if (conRompibles && this.rompibles) {
      this.rompibles.getChildren().forEach((o) => {
        if (o.active && x >= o.body.left && x <= o.body.right) ver(o.body.top, o.body.left, o.body.right);
      });
    }
    return mejor;
  }

  // processCallback de los pisos one-way: solo si viene cayendo desde arriba
  // (y el jugador no pidió bajarse).
  puedePisar(personaje, tramo) {
    if (personaje === this.jugador && this.time.now < this.bajandoHasta) return false;
    const pies = personaje.body.prev.y + personaje.body.height;
    return personaje.body.velocity.y >= 0 && pies <= tramo.body.top + 10;
  }

  // Colisiones de algo que camina o cae (cholitas, rehenes, premios).
  pisar(objetos) {
    this.physics.add.collider(objetos, this.solidos);
    this.physics.add.collider(objetos, [this.plataformas, this.rompibles], null, (o, t) => this.puedePisar(o, t));
  }

  // ---------------------------------------------------------------------------
  // Jugador
  // ---------------------------------------------------------------------------

  crearJugador() {
    const textura = this.prepararJugador(); // Jugador.js
    // En la celda de 84x84 los pies están 30 px bajo el centro.
    const suelo = this.superficie(180, 470).y; // en el piso, a la derecha de la piedra con musgo
    // Aparece desde la izquierda (entra caminando: titulo).
    this.jugador = this.physics.add.sprite(60, suelo - 30 * ESCALA, textura, 0).setScale(ESCALA).setDepth(10);
    fisicaJugador(this.jugador);
    this.sombraJugador = this.crearSombra(SOMBRA.jugador, 9.4);
    this.bajandoHasta = 0;
    this.sobrePlataformaEn = -Infinity;
    this.trepando = null;
    this.rampaActual = null;
    this.enSueloAntes = true;
    this.saltoPresionado = false;
    this.xAnterior = this.jugador.body.x;
    this.rompibles = this.physics.add.staticGroup();
    this.physics.add.collider(this.jugador, this.solidos);
    this.physics.add.collider(this.jugador, [this.plataformas, this.rompibles],
      () => { this.sobrePlataformaEn = this.time.now; }, (j, t) => this.puedePisar(j, t));
    // Las balas pasan por la roca (como en Nivel1); granadas y cohetes explotan contra ella.
    this.crearBalas([], [this.solidos]);
  }

  moverJugador() {
    const j = this.jugador;
    const aturdido = this.seguirAturdido(Phaser.Input.Keyboard.JustDown(this.teclasExtra.SPACE));
    const libre = !aturdido && !seguirSelector(this, this.teclasExtra.TAB.isDown && !this.aturdido);
    const izquierda = libre && (this.teclas.left.isDown || this.teclasExtra.A.isDown);
    const derecha = libre && (this.teclas.right.isDown || this.teclasExtra.D.isDown);
    const arriba = libre && (this.teclas.up.isDown || this.teclasExtra.W.isDown);
    const abajo = libre && (this.teclas.down.isDown || this.teclasExtra.S.isDown);
    const espacio = libre && this.teclasExtra.SPACE.isDown;
    const corre = libre && this.teclas.shift.isDown;
    const dispara = libre && (this.teclasExtra.J.isDown || this.teclasExtra.X.isDown);

    // Escaleras (Nivel1.trepar): ARRIBA sube; ABAJO parado arriba, baja.
    const escalera = this.escaleraEn(j);
    if (this.trepando) {
      this.trepar(arriba, abajo, espacio, izquierda || derecha);
      return;
    }
    if (escalera && arriba && j.body.bottom > escalera.arriba + 6) {
      this.empezarATrepar(escalera);
      return;
    }
    if (escalera && abajo && !espacio && Math.abs(j.body.bottom - escalera.arriba) < 12) {
      this.empezarATrepar(escalera);
      return;
    }
    const enSuelo = j.body.blocked.down || j.body.touching.down;
    const sobrePlataforma = this.time.now - this.sobrePlataformaEn < 100;
    const apunta = this.posturaJugador(enSuelo && !sobrePlataforma, arriba, abajo);
    const saltar = espacio || (arriba && !apunta && !escalera);

    const direccion = izquierda ? -1 : derecha ? 1 : 0;
    const velocidad = JUGADOR.velocidad * (this.agachado ? JUGADOR.agachado : corre ? JUGADOR.corrida : 1);
    if (this.time.now > this.golpeHasta) j.setVelocityX(direccion * velocidad);
    if (direccion) j.setFlipX(direccion < 0);
    // ABAJO sobre una repisa: se deja caer a través.
    if (abajo && sobrePlataforma) this.bajandoHasta = this.time.now + 250;
    else if (saltar && enSuelo && !this.saltoPresionado) j.setVelocityY(-JUGADOR.salto);
    this.saltoPresionado = saltar;

    if (dispara && this.time.now >= this.proximoDisparo) this.disparar();
    this.animarJugador(enSuelo, direccion, corre);
    this.enSueloAntes = enSuelo;
    this.xAnterior = j.body.x;
  }

  // Dentro de lo que muestra la cámara (no puede volver atrás) y, si se cae
  // del mapa, vuelve arriba del suelo.
  limitarJugador() {
    const j = this.jugador;
    const cam = this.cameras.main;
    const izq = cam.scrollX + 8;
    const der = cam.scrollX + this.scale.width - 8;
    if (j.body.x < izq) { j.body.x = izq; if (j.body.velocity.x < 0) j.body.velocity.x = 0; }
    if (j.body.right > der) { j.body.x = der - j.body.width; if (j.body.velocity.x > 0) j.body.velocity.x = 0; }
    if (j.body.top > this.scale.height + 60) {
      const x = Phaser.Math.Clamp(j.body.center.x, izq + 60, der - 60);
      j.body.reset(x, this.superficie(x, 0).y - 30 * ESCALA - 120);
    }
  }

  actualizarCamara(delta) {
    const cam = this.cameras.main;
    if (this.estado === 'editor') return;
    if (this.jugador.getData('noclip')) {
      // Admin: la cámara sigue al jugador a cualquier lado (sin zonas).
      cam.scrollX = Phaser.Math.Clamp(this.jugador.x - this.scale.width / 2, 0, CUEVA.ancho - this.scale.width);
      this.camaraMinima = cam.scrollX;
      return;
    }
    const z = CUEVA.zonas[this.zona];
    const limite = Math.min(z.limite, CUEVA.ancho - this.scale.width);
    const objetivo = Phaser.Math.Clamp(this.jugador.x - this.scale.width * CUEVA.camara.adelante, 0, limite);
    const t = 1 - Math.pow(1 - CUEVA.camara.lerp, delta / 16.67);
    let x = cam.scrollX + (objetivo - cam.scrollX) * t;
    x = Math.max(x, this.camaraMinima || 0); // nunca retrocede
    x = Math.min(x, limite);
    cam.scrollX = x;
    this.camaraMinima = x;
  }

  // y del suelo (las líneas 'ground', no las repisas) en x; null si no hay.
  pisoEn(x) {
    const suelos = this.colision.ground.filter((l) => x >= Math.min(l.x0, l.x1) && x <= Math.max(l.x0, l.x1));
    return suelos.length ? Math.min(...suelos.map((l) => this.lineaEn(l, x))) : null;
  }

  // Al apagar el modo admin (Admin.js) bajo el suelo: vuelve arriba del piso.
  // Solo el suelo (no las repisas: en el aire bajo una repisa no está atrapado).
  salirDeLaRoca() {
    const b = this.jugador.body;
    const piso = this.pisoEn(b.center.x);
    if (piso !== null && b.bottom > piso + 4) this.jugador.body.reset(b.center.x, piso - 30 * ESCALA);
  }

  // Volver a Nivel1, del otro lado del peñón.
  salir() {
    if (this.estado === 'saliendo') return;
    this.estado = 'saliendo';
    cerrarSelector(this, false);
    this.jugador.setVelocity(0);
    this.registry.remove('cuevaBase');
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.scene.isSleeping('Nivel1')) this.scene.wake('Nivel1', { cueva: true });
      else this.scene.start('Nivel1');
      this.scene.stop();
    });
  }

  // ---------------------------------------------------------------------------
  // Sombras de contacto
  // ---------------------------------------------------------------------------

  crearSombra(ancho, profundidad) {
    return this.add.ellipse(0, 0, ancho, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(profundidad);
  }

  actualizarSombra(sombra, sprite) {
    if (!sombra || !sprite.active || !sprite.body) return;
    const b = sprite.body;
    const suelo = this.superficie(b.center.x, b.bottom, true).y;
    const distancia = Math.max(0, suelo - b.bottom);
    if (!isFinite(suelo) || distancia > SOMBRA.alturaMaxima) { sombra.setVisible(false); return; }
    const f = Phaser.Math.Clamp(1 - distancia / SOMBRA.alturaMaxima, 0.3, 1);
    sombra.setVisible(true).setPosition(b.center.x, suelo - 1).setScale(f).setAlpha(f * SOMBRA.alfa / 0.35);
  }

  // ---------------------------------------------------------------------------
  // Rompibles: cajas y turriles (se pisan, se rompen, sueltan un premio)
  // ---------------------------------------------------------------------------

  crearRompibles() {
    // La caja militar (Armas.js) sin el aire de su celda: el cuerpo justo.
    const hoja = this.textures.get('cajaArmas');
    if (!hoja.has('cajaSola')) hoja.add('cajaSola', 0, 20, 45, 50, 29);
    animacionesCaja(this);
    CUEVA.rompibles.forEach(({ tipo, x, pila = 1, desde = 470 }) => {
      let y = this.superficie(x, desde).y + CUEVA.hundido;
      // Sombra de contacto oscura, solo debajo del de abajo.
      const ancho = tipo === 'caja' ? 80 : 40;
      const sombra = this.add.ellipse(x, y - 2, ancho * 1.1, 8, 0x000000, 0.5).setDepth(8.4);
      let abajo = null;
      for (let i = 0; i < pila; i++) {
        const o = (tipo === 'caja'
          ? this.rompibles.create(x + (i % 2 ? 6 : 0), y, 'cajaArmas', 'cajaSola').setScale(ESCALA * 0.8)
          : this.rompibles.create(x, y, 'cueva_turril').setScale(ESCALA * 1.25))
          .setOrigin(0.5, 1).setDepth(8.5 + i * 0.01).setTint(CUEVA_LUZ);
        o.refreshBody();
        Object.assign(o.body.checkCollision, { down: false, left: false, right: false });
        o.setData({ tipo, vida: CUEVA.vidaRompible[tipo], sombra: i === 0 ? sombra : null, encima: null });
        if (abajo) abajo.setData('encima', o);
        abajo = o;
        y = o.body.top + 2;
      }
    });
    this.physics.add.overlap(this.balas, this.rompibles, (bala, o) => {
      if (!bala.active || !o.active || this.impactoBala(bala)) return;
      const lado = bala.body.velocity.x >= 0 ? 1 : -1;
      const dano = bala.getData('dano') || 1;
      bala.destroy();
      this.danarRompible(o, dano, lado);
    });
  }

  danarRompible(o, dano, lado = 1) {
    if (!o.active || o.getData('roto')) return;
    o.setData('vida', o.getData('vida') - dano);
    o.setTintFill(0xffffff);
    this.time.delayedCall(50, () => o.active && o.setTint(CUEVA_LUZ));
    if (o.getData('tipo') === 'caja') this.astillas(o.x - lado * 20, o.y - o.displayHeight / 2, 4, lado);
    else chispas(this, o.x - lado * 14, o.y - o.displayHeight / 2, 5, lado > 0 ? 180 : 0, 90, 11);
    if (o.getData('vida') <= 0) this.romper(o);
    else this.tweens.add({ targets: o, x: o.x + lado * 2, duration: 40, yoyo: true, repeat: 1 });
  }

  romper(o) {
    o.setData('roto', true);
    const x = o.x;
    const y = o.y - o.displayHeight / 2;
    const alto = o.displayHeight;
    if (o.getData('tipo') === 'caja') {
      // La caja se rompe con la animación de caja_arma_destruida.
      const rota = this.add.sprite(o.x, o.y, 'cajaArmas', 6).setOrigin(0.5, 1).setScale(ESCALA * 0.8)
        .setTint(CUEVA_LUZ).setDepth(8.5);
      rota.play('caja_rompe');
      rota.once('animationcomplete', () => this.tweens.add({ targets: rota, alpha: 0, delay: 1200, duration: 500, onComplete: () => rota.destroy() }));
      this.astillas(x, y, 8, 1);
      this.astillas(x, y, 10, -1);
      const polvo = this.add.particles(x, y, 'fx_humo', {
        speed: { min: 20, max: 70 }, lifespan: 700, scale: { start: 1.5, end: 3.5 },
        alpha: { start: 0.45, end: 0 }, tint: 0xa89070, emitting: false
      }).setDepth(11);
      polvo.explode(8);
      this.time.delayedCall(800, () => polvo.destroy());
    } else {
      // El turril revienta: explosión que lastima a los enemigos de alrededor.
      explotar(this, x, o.y + 4, 'mediana', ESCALA * 1.1);
      this.cameras.main.shake(200, 0.008);
      const j = this.jugador;
      if (Phaser.Math.Distance.Between(x, y, j.body.center.x, j.body.center.y) < CUEVA.turril.radio * 0.6) this.golpearJugador(x);
      this.time.delayedCall(60, () => this.danoEnArea(x, y, CUEVA.turril.radio, CUEVA.turril.dano));
    }
    const sombra = o.getData('sombra');
    if (sombra) sombra.destroy();
    const encima = o.getData('encima');
    o.destroy();
    if (encima && encima.active) {
      // El de arriba cae a donde estaba este (y hereda la sombra).
      if (sombra) encima.setData('sombra', this.add.ellipse(encima.x, o.y - 2, 70, 8, 0x000000, 0.5).setDepth(8.4));
      this.tweens.add({ targets: encima, y: encima.y + alto - 2, duration: 200, ease: 'Bounce.out', onComplete: () => encima.active && encima.refreshBody() });
    }
    this.soltarPremio(x, y);
  }

  astillas(x, y, cantidad, lado = 1) {
    const p = this.add.particles(x, y, 'cueva_astilla', {
      speed: { min: 80, max: 240 }, angle: lado > 0 ? { min: 200, max: 300 } : { min: 240, max: 340 },
      gravityY: 800, lifespan: 700, rotate: { min: 0, max: 360 }, scale: { start: 2, end: 1.2 }, emitting: false
    }).setDepth(11);
    p.explode(cantidad);
    this.time.delayedCall(800, () => p.destroy());
  }

  // Un premio al azar que salta y cae al piso: un arma (Armas.js) o un plátano
  // del Chapare (cura una barra).
  soltarPremio(x, y) {
    const platano = Math.random() < CUEVA.premios.platano;
    const arma = Phaser.Utils.Array.GetRandom(CUEVA.premios.armas);
    const textura = platano ? 'cueva_platano' : ARMAS[arma].textura;
    const p = this.physics.add.image(x, y, textura).setScale(platano ? ESCALA * 1.4 : ESCALA_ARMA).setDepth(9);
    p.setVelocity(Phaser.Math.Between(-60, 60), -320);
    p.body.setMaxVelocityY(700);
    this.pisar(p);
    // Aparece de golpe y brilla mientras espera (Armas.js).
    const brillo = brilloArma(this, p, platano ? ESCALA * 1.4 : ESCALA_ARMA);
    p.setData('brillo', brillo);
    this.physics.add.overlap(this.jugador, p, () => {
      if (!p.active || this.muerto) return;
      if (!platano) { tomarArma(this, p, arma); return; } // Armas.js (borra el brillo)
      brillo.forEach((o) => o.destroy());
      p.destroy();
      this.curarJugador(VIDA.golpe);
      this.cameras.main.flash(100, 255, 240, 140);
      TextFX.popup(this, p.x, p.y - 20, '¡PLÁTANO!', { subir: 50 }).setDepth(20);
    });
  }

  // ---------------------------------------------------------------------------
  // Enemigos: cholitas (Nivel1) y guácharos
  // ---------------------------------------------------------------------------

  crearEnemigos() {
    this.crearAnimacionesCholita();
    this.cholitas = this.physics.add.group({ allowGravity: true });
    const polleras = Phaser.Utils.Array.Shuffle([...CHOLITA.polleras]);
    CUEVA.cholitas.forEach(({ x, zona, desde = 470 }, i) => {
      const s = this.superficie(x, desde);
      // Su ronda no sale de lo que se ve con la cámara trabada en su zona: si
      // no, una cholita fuera de la pantalla no dejaba avanzar.
      const limite = Math.min(CUEVA.zonas[zona].limite, CUEVA.ancho - this.scale.width);
      const vista = [limite + 50, limite + this.scale.width - 50];
      const pollera = polleras[i % polleras.length];
      const c = this.cholitas.create(x, s.y - 4, 'cholita', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.6);
      c.body.setSize(CHOLITA.cuerpo.ancho, CHOLITA.cuerpo.alto)
        .setOffset((CHOLITA.ancho - CHOLITA.cuerpo.ancho) / 2, CHOLITA.alto - CHOLITA.cuerpo.alto);
      // Su ronda no pasa de los bordes del piso en el que está.
      c.setData({
        estado: 'ronda', pollera, zona, origen: x, direccion: Phaser.Math.RND.sign(), atacaDesde: 0,
        min: Math.max(s.x0 + 18, x - CHOLITA.ronda, vista[0]), max: Math.min(s.x1 - 18, x + CHOLITA.ronda, vista[1])
      });
      const sombra = this.crearSombra(SOMBRA.cholita, 9.3);
      c.setData('sombra', sombra);
      c.once('destroy', () => sombra.destroy());
      c.play({ key: `cholita_${pollera}`, startFrame: Phaser.Math.Between(0, CHOLITA.caminar - 1) });
    });
    this.pisar(this.cholitas);
    this.physics.add.overlap(this.jugador, this.cholitas, (j, c) => this.chocarCholita(c));
    this.physics.add.overlap(this.balas, this.cholitas, (bala, c) => {
      const estado = c.getData('estado');
      if (estado !== 'ronda' && estado !== 'ataque') return;
      if (this.impactoBala(bala)) return;
      const fuego = bala.getData('tipo') === 'llama';
      if (!fuego) sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1);
      bala.destroy();
      this.vencerCholita(c, bala.x, fuego);
    });

    // Guácharos: vuelan bajo el techo y bajan en picada.
    this.guacharos = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.jugador, this.guacharos, (j, g) => {
      if (this.estado === 'control' && g.getData('estado') !== 'muerto') this.golpearJugador(g.x);
    });
    this.physics.add.overlap(this.balas, this.guacharos, (bala, g) => {
      if (g.getData('estado') === 'muerto' || this.impactoBala(bala)) return;
      bala.destroy();
      this.danarGuacharo(g, bala.getData('dano') || 1, bala.getData('tipo') === 'llama');
    });
    // Los muertos caen hasta el piso (atraviesan repisas, cajas y turriles);
    // los vivos vuelan a través de todo.
    // El choque se dispara desde la colisión con el suelo (no con
    // body.touching: eso también lo marcan las balas y el jugador al
    // superponerse, y quedaban tendidos en el aire).
    this.physics.add.collider(this.guacharos, this.solidos,
      (g) => { if (!g.getData('caida')) this.caidaGuacharo(g); },
      (g) => g.getData('estado') === 'muerto' && !g.getData('caida'));
    CUEVA.posados.forEach(({ x, desde, zona }) => this.nuevoGuacharo(zona, x, 0, desde));
    this.ondas = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.jugador, this.ondas, (j, o) => {
      if (this.golpearJugador(o.x) || this.muerto) o.destroy();
    });
  }

  // Las animaciones de las cholitas (las crea Nivel1; acá por si se arranca directo).
  crearAnimacionesCholita() {
    const porFila = CHOLITA.caminar + CHOLITA.ataque;
    CHOLITA.polleras.forEach((pollera, fila) => {
      if (this.anims.exists(`cholita_${pollera}`)) return;
      const inicio = fila * porFila;
      const rango = (clave, start, end) => this.anims.generateFrameNumbers(clave, { start, end });
      this.anims.create({ key: `cholita_${pollera}`, frames: rango('cholita', inicio, inicio + CHOLITA.caminar - 1), frameRate: 10, repeat: -1 });
      this.anims.create({ key: `cholita_ataque_${pollera}`, frames: rango('cholita', inicio + CHOLITA.caminar, inicio + porFila - 1), frameRate: 11 });
      const rip = fila * CHOLITA.rip.cuadros;
      this.anims.create({ key: `cholita_rip_${pollera}`, frames: rango('cholitaRip', rip, rip + CHOLITA.rip.cuadros - 1), frameRate: 9 });
      const q = fila * CHOLITA.quemada.cuadros;
      this.anims.create({
        key: `cholita_quemada_${pollera}`, frameRate: 8,
        frames: this.anims.generateFrameNumbers('cholitaQuemada', { frames: CHOLITA.quemada.secuencia.map((k) => q + k) })
      });
    });
  }

  // Ronda dentro de su piso; si ve al jugador lo corre y de cerca le pega
  // (atacarCholita de Nivel1). En el borde se planta: no se tira.
  moverCholitas() {
    const j = this.jugador;
    this.cholitas.getChildren().forEach((c) => {
      if (c.getData('estado') !== 'ronda') return;
      const cuerpo = c.body;
      const dx = j.body.center.x - cuerpo.center.x;
      const ve = this.estado === 'control' && Math.abs(dx) < CHOLITA.vista && Math.abs(j.body.bottom - cuerpo.bottom) < CHOLITA.vistaAlto;
      const enSuelo = cuerpo.blocked.down || cuerpo.touching.down;
      if (ve && enSuelo && Math.abs(dx) < CHOLITA.alcance && this.time.now > c.getData('atacaDesde')) {
        this.atacarCholita(c, Math.sign(dx) || 1);
        return;
      }
      let direccion = c.getData('direccion');
      const min = c.getData('min');
      const max = c.getData('max');
      if (ve) direccion = Math.sign(dx) || direccion;
      else if (cuerpo.center.x <= min) direccion = 1;
      else if (cuerpo.center.x >= max) direccion = -1;
      let velocidad = ve ? CHOLITA.persecucion : CHOLITA.velocidad;
      const adelante = cuerpo.center.x + direccion * 6;
      if (adelante < min - 30 || adelante > max + 30 || (ve && Math.abs(dx) < CHOLITA.alcance)) velocidad = 0;
      c.setData('direccion', direccion).setFlipX(direccion < 0);
      cuerpo.setVelocityX(enSuelo ? direccion * velocidad : 0);
      if (velocidad) { c.anims.resume(); c.anims.timeScale = velocidad / CHOLITA.velocidad * 0.7; } else c.anims.pause();
    });
  }

  // Un guácharo entra volando por arriba, del lado derecho de la pantalla.
  // posadoDesde: en cambio, queda posado en el piso que haya bajo x desde esa
  // y (mirando a la izquierda, por donde llega el jugador).
  nuevoGuacharo(zona, x, y, posadoDesde) {
    const cam = this.cameras.main;
    const G = CUEVA.guacharo;
    const g = this.guacharos.create(x ?? cam.scrollX + this.scale.width + 40, y ?? -30, AVE.vuelo.clave, 2)
      .setScale(G.escala).setDepth(9.7);
    g.setData({
      estado: 'vuela', zona, vida: G.vida, fase: Math.random() * Math.PI * 2,
      ancla: { x: cam.scrollX + Phaser.Math.Between(200, this.scale.width - 200), y: Phaser.Math.Between(...G.alto) },
      proxima: this.time.now + Phaser.Math.Between(...G.espera)
    });
    if (posadoDesde !== undefined) {
      hojaAve(g, 'grito', true);
      const piso = this.superficie(g.x, posadoDesde).y;
      g.y = piso - AVE.pies * G.escala + 2; // apenas hundido
      const sombra = this.add.ellipse(g.x - 4, piso - 1, 56 * G.escala, 6, 0x000000, 0.45).setDepth(9.3);
      g.setData({ estado: 'posado', sombra, proxima: this.time.now + Phaser.Math.Between(...G.grito) });
      g.once('destroy', () => sombra.destroy());
      g.play({ key: 'ave_posada', startFrame: Phaser.Math.Between(0, 7) });
      return g;
    }
    hojaAve(g, 'vuelo', false);
    g.play({ key: 'ave_vuela', startFrame: Phaser.Math.Between(0, 3) });
    // Chillido al entrar (el guácharo hace clics y chillidos en la oscuridad).
    this.aviso(g.x - 60, Math.max(40, g.y + 60), '¡KRRAA!', 'rojo');
    return g;
  }

  // El posado ve al jugador: chilla (ave_grita), abre las alas y sale volando.
  despegarGuacharo(g) {
    const G = CUEVA.guacharo;
    g.setData('estado', 'grita');
    hojaAve(g, 'grito', this.jugador.x < g.x);
    g.play({ key: 'ave_grita', repeat: 1 }); // chilla dos veces antes de salir
    this.aviso(g.x, g.y - 60, '¡KRRAA!', 'rojo');
    g.once('animationcomplete', () => {
      if (!g.active || g.getData('estado') !== 'grita') return;
      g.getData('sombra').setVisible(false);
      hojaAve(g, 'vuelo', g.flipX);
      g.setData('estado', 'despega').setVelocity(0, -90);
      g.play('ave_despega');
      g.once('animationcomplete', () => {
        if (!g.active || g.getData('estado') !== 'despega') return;
        g.play('ave_vuela');
        g.setData({ estado: 'sube', ancla: { x: g.x, y: Phaser.Math.Between(...G.alto) }, proxima: this.time.now + 1200 });
        if (g.y < g.getData('ancla').y) g.setData('estado', 'vuela');
      });
    });
  }

  // Revolotea alrededor de su ancla (que sigue de lejos al jugador) y cada
  // tanto se tira en picada hacia él y vuelve a subir.
  moverGuacharos(time) {
    const j = this.jugador;
    const cam = this.cameras.main;
    const G = CUEVA.guacharo;
    this.guacharos.getChildren().forEach((g) => {
      const estado = g.getData('estado');
      if (estado === 'muerto') {
        // Por si atravesó el suelo en un cuadro: si ya está a la altura del
        // piso, se lo apoya ahí.
        const piso = this.pisoEn(g.x);
        if (!g.getData('caida') && piso !== null && g.body.velocity.y > 0 && g.y >= piso) {
          g.y = piso;
          this.caidaGuacharo(g);
        }
        if (g.y > this.scale.height + 80) g.destroy(); // se cayó fuera del piso
        return;
      }
      if (estado === 'grita' || estado === 'despega') return;
      if (estado === 'posado') {
        g.setVelocity(0);
        if (this.estado === 'control' && Math.abs(j.x - g.x) < G.cercania && Math.abs(j.y - g.y) < 300) {
          this.despegarGuacharo(g);
        } else if (time > g.getData('proxima')) {
          // De a ratos chilla desde donde está (mirando hacia el jugador).
          g.setData('proxima', time + Phaser.Math.Between(...G.grito));
          hojaAve(g, 'grito', j.x < g.x);
          g.play('ave_grita');
          g.once('animationcomplete', () => g.active && g.getData('estado') === 'posado' && g.play('ave_posada'));
        }
        return;
      }
      const a = g.getData('ancla');
      if (estado === 'vuela') {
        a.x += (j.x - a.x) * 0.004;
        a.x = Phaser.Math.Clamp(a.x, cam.scrollX + 80, cam.scrollX + this.scale.width - 80);
        const f = g.getData('fase');
        const tx = a.x + Math.sin(time * 0.0014 + f) * 140;
        const ty = a.y + Math.sin(time * 0.003 + f) * 22;
        g.setVelocity(Phaser.Math.Clamp((tx - g.x) * 2.2, -260, 260), Phaser.Math.Clamp((ty - g.y) * 2.5, -260, 260));
        if (this.estado === 'control' && time > g.getData('proxima')) {
          const ang = Phaser.Math.Angle.Between(g.x, g.y, j.body.center.x, j.body.center.y);
          g.setVelocity(Math.cos(ang) * G.picada, Math.sin(ang) * G.picada);
          g.setData({ estado: 'picada', hasta: time + 1100 });
          // Ataque: aletazo rápido, se agranda al lanzarse y chilla.
          g.play('ave_ataca');
          this.tweens.add({ targets: g, scale: G.escala * G.ataque, duration: 160, ease: 'Back.out' });
          g.setTint(0xffb0a0);
          this.time.delayedCall(120, () => g.active && g.clearTint());
          if (Math.random() < 0.5) this.aviso(g.x, g.y - 40, '¡KRRAA!', 'rojo');
        }
      } else if (estado === 'picada') {
        if (time > g.getData('hasta') || g.y > this.superficie(g.x, g.y).y - 30) {
          g.setData('estado', 'sube');
          g.play('ave_vuela');
          this.tweens.add({ targets: g, scale: G.escala, duration: 300 });
        }
      } else if (estado === 'sube') {
        g.setVelocity(g.body.velocity.x * 0.96, -230);
        if (g.y <= a.y) g.setData({ estado: 'vuela', proxima: time + Phaser.Math.Between(...G.espera) });
      }
      hojaAve(g, 'vuelo', g.body.velocity.x < 0);
    });
  }

  danarGuacharo(g, dano, fuego = false) {
    g.setData('vida', g.getData('vida') - dano);
    if (g.getData('vida') > 0) {
      g.setTintFill(0xffffff);
      this.time.delayedCall(50, () => g.active && g.clearTint());
      return;
    }
    // Muerte (ave_muerta.jpeg): golpeado y aturdido, cae de espaldas, choca
    // contra el piso con polvo y queda tendido con estrellitas (moverGuacharos).
    g.setData('estado', 'muerto');
    sumarPuntos(this, 150);
    this.tweens.killTweensOf(g);
    if (g.getData('sombra')) g.getData('sombra').setVisible(false);
    hojaAve(g, 'muerte', g.flipX);
    g.setScale(CUEVA.guacharo.escala);
    g.clearTint();
    if (fuego) g.setTint(0x6a3a20);
    g.play('ave_golpe');
    g.once('animationcomplete', () => g.active && !g.getData('caida') && g.setFrame(2));
    this.plumas(g.x, g.y - 20, 10);
    sangrar(this, g.x, g.y - 20, g.body.velocity.x < 0 ? -1 : 1, ESCALA * 0.7);
    g.body.setAllowGravity(true).setVelocity(g.body.velocity.x * 0.25, -180);
  }

  // Un guácharo muerto llega al piso: choca, rebota con polvo, queda tendido
  // con estrellitas un rato y se desvanece.
  caidaGuacharo(g) {
    g.setData('caida', true);
    g.body.setVelocity(0).setAllowGravity(false);
    g.play('ave_choca');
    g.once('animationcomplete', () => g.active && g.play('ave_tendida'));
    this.polvoAve(g.x, g.y, g.scaleX);
    this.tweens.add({ targets: g, alpha: 0, delay: 2600, duration: 500, onComplete: () => g.destroy() });
  }

  // La nube de polvo del choque (cuadro 5 de ave_muerta), que sube y se va.
  polvoAve(x, y, escala) {
    const polvo = this.add.sprite(x, y + 2, AVE.muerte.clave, 5).setOrigin(0.5, 1).setScale(escala * 1.2).setDepth(9.9);
    this.tweens.add({ targets: polvo, alpha: 0, y: y - 10, scale: escala * 1.6, duration: 600, ease: 'Quad.out', onComplete: () => polvo.destroy() });
  }

  plumas(x, y, cantidad) {
    const p = this.add.particles(x, y, 'cueva_pluma', {
      speed: { min: 40, max: 180 }, gravityY: 120, lifespan: 1400, rotate: { min: 0, max: 360 },
      scale: ESCALA, alpha: { start: 1, end: 0 }, emitting: false
    }).setDepth(11);
    p.explode(cantidad);
    this.time.delayedCall(1500, () => p.destroy());
  }

  // Explosiones, escopetazo y machete (Jugador.js): todo lo que esté en el radio.
  danoEnArea(x, y, radio, dano, cuerpo = false) {
    this.cholitas.getChildren().forEach((c) => {
      const estado = c.getData('estado');
      if (estado !== 'ronda' && estado !== 'ataque') return;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y - CHOLITA.alto * ESCALA / 2) > radio + 20) return;
      if (cuerpo) sangrar(this, c.x, c.y - CHOLITA.alto * ESCALA / 2, c.x < x ? -1 : 1);
      this.vencerCholita(c, x, !cuerpo);
    });
    this.guacharos.getChildren().forEach((g) => {
      if (g.getData('estado') !== 'muerto' && Phaser.Math.Distance.Between(x, y, g.x, g.y) <= radio + 20) this.danarGuacharo(g, dano, !cuerpo);
    });
    const J = this.jefe;
    if (J && J.active && this.jefeEstado !== 'muerto' && Phaser.Math.Distance.Between(x, y, J.x, J.y) <= radio + 60) this.danarJefe(dano);
    this.rompibles.getChildren().slice().forEach((o) => {
      if (!o.active) return;
      const cx = Phaser.Math.Clamp(x, o.body.left, o.body.right);
      const cy = Phaser.Math.Clamp(y, o.body.top, o.body.bottom);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) <= radio) this.danarRompible(o, dano, o.x > x ? 1 : -1);
    });
  }

  // ---------------------------------------------------------------------------
  // Rehenes
  // ---------------------------------------------------------------------------

  crearRehenes() {
    this.crearAnimacionesNpc(); // Nivel1
    this.rehenes = this.physics.add.group({ allowGravity: true });
    CUEVA.rehenes.forEach(({ x, desde = 470 }) => {
      const y = this.superficie(x, desde).y;
      const r = this.rehenes.create(x, y - 6, 'npcRescate', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.5);
      r.body.setSize(NPC.cuerpo.ancho, NPC.cuerpo.alto).setOffset((NPC.ancho - NPC.cuerpo.ancho) / 2, NPC.alto - NPC.cuerpo.alto);
      r.setData('estado', 'atado');
      const sombra = this.crearSombra(SOMBRA.rehen, 9.3);
      r.setData('sombra', sombra);
      r.once('destroy', () => sombra.destroy());
      r.play({ key: 'npc_atado', startFrame: Phaser.Math.Between(0, 5) });
    });
    this.pisar(this.rehenes);
    this.physics.add.overlap(this.jugador, this.rehenes, (j, r) => this.rescatar(r));
  }

  // Se suelta, agradece, deja un regalo y sale corriendo hacia la entrada.
  rescatar(r) {
    if (r.getData('estado') !== 'atado' || this.estado !== 'control') return;
    r.setData('estado', 'libre');
    this.registry.inc('rehenes');
    this.rescatados++;
    this.actualizarHUD();
    rescateHUD(this); // Estado.js
    this.aviso(r.x, r.y - NPC.alto * ESCALA, '¡GRACIAS!', 'oro');
    r.play('npc_libre');
    r.once('animationcomplete', () => {
      if (!r.active) return;
      this.soltarPremio(r.x + 20, r.y - 60);
      this.time.delayedCall(NPC.saludo, () => {
        if (!r.active) return;
        r.setData({ estado: 'sale', desde: this.time.now });
        r.play('npc_sale');
      });
    });
  }

  moverRehenes() {
    const cam = this.cameras.main;
    this.rehenes.getChildren().forEach((r) => {
      if (r.getData('estado') !== 'sale') return;
      const b = r.body;
      if ((b.blocked.down || b.touching.down) && (b.blocked.left || b.touching.left)) b.setVelocityY(-JUGADOR.salto * 0.8);
      b.setVelocityX(-NPC.velocidadHuida);
      if (b.right < cam.scrollX - 40 || this.time.now - r.getData('desde') > 7000) r.destroy();
    });
  }

  // ---------------------------------------------------------------------------
  // Charcos de agua (CUEVA.charcos): agua oscura que refleja el azul de la
  // cueva, con borde húmedo, brillos que se mueven, ondas cuando caen gotas
  // del techo y salpicaduras cuando el jugador camina por encima.
  // ---------------------------------------------------------------------------

  crearCharcos() {
    this.charcos = CUEVA.charcos.map(([x, ancho], i) => {
      const piso = this.superficie(x, 470).y;
      const clave = 'charco' + ancho;
      if (!this.textures.exists(clave)) texturaCharco(this, clave, ancho);
      const agua = this.add.image(x, piso + 1, clave).setOrigin(0.5, 0.5).setDepth(8.3);
      // Brillo que se desliza por la superficie.
      const brillo = this.add.rectangle(x - ancho * 0.3, piso - 1, ancho * 0.14, 1, 0xd8f0ff, 0.45)
        .setDepth(8.31).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: brillo, x: x + ancho * 0.3, alpha: { from: 0.55, to: 0.15 }, duration: 2200 + i * 300,
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
      return { x, ancho, piso, agua, proximaGota: this.time.now + Phaser.Math.Between(400, 2500), pasoEn: 0 };
    });
  }

  // Onda que se abre en la superficie del charco.
  ondaCharco(c, x, fuerza = 1) {
    const onda = this.add.ellipse(x, c.piso + 1, 6 * fuerza, 2, 0x000000, 0).setStrokeStyle(1, 0xb8dcf0, 0.8).setDepth(8.32);
    this.tweens.add({
      targets: onda, scaleX: 5, scaleY: 2.2, alpha: 0, duration: 650 * fuerza, ease: 'Quad.out',
      onComplete: () => onda.destroy()
    });
  }

  // Gotas que caen del techo sobre los charcos y el chapoteo del jugador.
  pisarCharcos() {
    if (!this.charcos) return;
    const ahora = this.time.now;
    const j = this.jugador;
    const b = j.body;
    const enSuelo = b.blocked.down || b.touching.down;
    this.charcos.forEach((c) => {
      // Una gota del techo cada tanto: cae, salpica y abre una onda.
      if (ahora > c.proximaGota) {
        c.proximaGota = ahora + Phaser.Math.Between(900, 2600);
        const gx = c.x + Phaser.Math.Between(-c.ancho * 0.35, c.ancho * 0.35);
        const gota = this.add.image(gx, c.piso - 160, 'cuevaGota').setScale(ESCALA).setDepth(8.33);
        this.tweens.add({
          targets: gota, y: c.piso, duration: 420, ease: 'Quad.in',
          onComplete: () => { gota.destroy(); this.ondaCharco(c, gx); this.salpicar(gx, c.piso, 3); }
        });
      }
      // El jugador camina (o cae) dentro del charco: salpica y hace ondas.
      const dentro = Math.abs(b.center.x - c.x) < c.ancho / 2 - 4 && Math.abs(b.bottom - c.piso) < 6 && enSuelo;
      if (!dentro) { c.dentro = false; return; }
      const llego = !c.dentro;
      c.dentro = true;
      const moviendose = Math.abs(b.velocity.x) > 20;
      if (llego || (moviendose && ahora > c.pasoEn)) {
        c.pasoEn = ahora + (Math.abs(b.velocity.x) > JUGADOR.velocidad * 1.2 ? 160 : 260);
        this.salpicar(b.center.x, c.piso, llego ? 9 : 5, b.velocity.x);
        this.ondaCharco(c, b.center.x, llego ? 1.4 : 1);
      }
    });
  }

  salpicar(x, y, cantidad, vx = 0) {
    const p = this.add.particles(x, y - 1, 'cuevaGota', {
      speed: { min: 60, max: 150 }, angle: { min: 215, max: 325 }, gravityY: 800, lifespan: 420,
      speedX: { min: vx * 0.15 - 40, max: vx * 0.15 + 40 }, scale: { start: ESCALA * 1.5, end: 0.6 }, alpha: { start: 0.9, end: 0.2 },
      emitting: false
    }).setDepth(10.4);
    p.explode(cantidad);
    this.time.delayedCall(500, () => p.destroy());
  }

  // ---------------------------------------------------------------------------
  // Agua (CUEVA.agua): cascadas y lago lejanos en parallax (detrás de la roca,
  // se ven por los huecos del dibujo), la cascada entre los dos pilares con su
  // pozo y el río que corre abajo, con piedras, espuma y neblina.
  // ---------------------------------------------------------------------------

  crearAgua() {
    texturasAgua(this);
    const { width, height } = this.scale;
    const A = CUEVA.agua;
    const ADD = Phaser.BlendModes.ADD;
    // Lejos (parallax 0.3): cascadas que caen a un lago.
    this.aguaFondo = [
      this.add.tileSprite(0, -10, width / ESCALA, 190, 'cuevaCascadas').setOrigin(0).setScale(ESCALA)
        .setScrollFactor(0).setDepth(0.3).setTint(0x7c98ac).setAlpha(0.7).setData({ factor: 0.3, caida: 0.07 }),
      this.add.tileSprite(0, 336, width / ESCALA, 20, 'cuevaLago').setOrigin(0).setScale(ESCALA)
        .setScrollFactor(0).setDepth(0.31).setTint(0x8aa4b4).setAlpha(0.85).setData({ factor: 0.3, deriva: 0.006 })
    ];
    // La cascada entre los pilares (en el plano del dibujo).
    const c = A.cascadaFrente;
    const alto = (c.abajo - c.arriba) / ESCALA;
    this.cascada = this.add.tileSprite(c.x, c.arriba, 14, alto, 'cuevaCascada').setOrigin(0.5, 0).setScale(ESCALA)
      .setDepth(1.02).setAlpha(0.62).setTint(0xb4c8d2);
    const brilloCascada = this.add.tileSprite(c.x, c.arriba, 14, alto, 'cuevaCascada').setOrigin(0.5, 0).setScale(ESCALA)
      .setDepth(1.03).setAlpha(0.14).setBlendMode(ADD);
    this.cascadas = [this.cascada, brilloCascada];
    // Arriba sale de una grieta: rocío que se abre y un degradé oscuro que la tapa.
    this.add.image(c.x, c.arriba - 4, 'fx_vineta').setDisplaySize(60, 70).setOrigin(0.5, 0.2).setDepth(1.035).setAlpha(0);
    const sombraArriba = this.add.graphics().setDepth(1.035);
    for (let i = 0; i < 12; i++) {
      sombraArriba.fillStyle(0x07060a, 0.85 * (1 - i / 12));
      sombraArriba.fillRect(c.x - 16, c.arriba + i * 3, 32, 3);
    }
    this.add.particles(c.x, c.arriba + 6, 'fx_humo', {
      x: { min: -6, max: 6 }, speedY: { min: 10, max: 30 }, speedX: { min: -18, max: 18 }, lifespan: 1400,
      frequency: 200, scale: { start: 0.6, end: 1.8 }, alpha: { start: 0.18, end: 0 }, tint: 0xc8e0ec
    }).setDepth(1.04);
    // Pozo: luz, espuma que salpica y neblina.
    const pozo = this.add.ellipse(c.x, c.abajo, 90, 16, 0x9fd0e8, 0.25).setBlendMode(ADD).setDepth(1.04);
    this.tweens.add({ targets: pozo, scaleX: 1.15, alpha: 0.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.particles(c.x, c.abajo - 4, 'cuevaGota', {
      x: { min: -12, max: 12 }, speedY: { min: -150, max: -60 }, speedX: { min: -70, max: 70 }, gravityY: 700,
      lifespan: 500, frequency: 45, scale: { start: ESCALA, end: 0.6 }, alpha: { start: 0.9, end: 0 }
    }).setDepth(1.05);
    this.add.particles(c.x, c.abajo - 10, 'fx_humo', {
      x: { min: -30, max: 30 }, speedY: { min: -25, max: -8 }, speedX: { min: -15, max: 15 }, lifespan: 1800,
      frequency: 160, scale: { start: 1.2, end: 3.4 }, alpha: { start: 0.22, end: 0 }, tint: 0xc8e0ec
    }).setDepth(1.05);

    // El río de abajo: el agua, los reflejos (más rápidos) y la orilla mojada.
    const yr = A.rio.y;
    this.rio = [
      this.add.tileSprite(0, yr, width / ESCALA, (height - yr) / ESCALA + 2, 'cuevaRio').setOrigin(0).setScale(ESCALA)
        .setScrollFactor(0).setDepth(1.1).setData({ velocidad: A.rio.velocidad }),
      this.add.tileSprite(0, yr + 8, width / ESCALA, (height - yr) / ESCALA, 'cuevaRioBrillo').setOrigin(0).setScale(ESCALA)
        .setScrollFactor(0).setDepth(1.11).setBlendMode(ADD).setAlpha(0.7).setData({ velocidad: A.rio.velocidad * 1.8 }),
      this.add.tileSprite(0, yr - 6, width / ESCALA, 6, 'cuevaOrilla').setOrigin(0).setScale(ESCALA)
        .setScrollFactor(0).setDepth(1.12).setData({ velocidad: 0 })
    ];
    // Neblina pegada al agua.
    this.rioNiebla = this.add.tileSprite(0, yr - 18, width / 2, 32, 'cueva_niebla').setOrigin(0).setScrollFactor(0)
      .setDepth(1.16).setScale(2, 1.4).setAlpha(0.22).setTint(0xb8d4e0);
    // Piedras en el río con espuma que las rodea.
    A.piedras.forEach((x, i) => {
      const y = yr + 26 + (i % 2) * 8;
      this.add.image(x, y, 'cuevaRocaRio').setScale(ESCALA * (1 + (i % 3) * 0.2)).setFlipX(i % 2 === 1).setDepth(1.13);
      const espuma = this.add.particles(x - 10, y + 2, 'fx_chispa', {
        y: { min: -3, max: 5 }, speedX: { min: 30, max: 70 }, speedY: { min: -6, max: 6 }, lifespan: 600,
        frequency: 90, scale: { start: 1.4, end: 0.4 }, alpha: { start: 0.8, end: 0 }, tint: 0xd8f0f4
      }).setDepth(1.14);
      espuma.setData('x', x);
    });
    // Burbujas y destellos que pasan con la corriente.
    this.add.particles(0, 0, 'fx_chispa', {
      x: { min: 0, max: width }, y: { min: yr + 10, max: height - 4 }, speedX: { min: 40, max: 90 },
      lifespan: 900, frequency: 70, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: 0xa8d8e8,
      blendMode: 'ADD'
    }).setScrollFactor(0).setDepth(1.15);
  }

  moverAgua(time) {
    if (!this.rio) return;
    const x = this.cameras.main.scrollX;
    this.aguaFondo.forEach((t) => {
      t.tilePositionX = (x * t.getData('factor') + time * (t.getData('deriva') || 0) * 16) / ESCALA;
      if (t.getData('caida')) t.tilePositionY = -time * t.getData('caida');
    });
    this.cascadas.forEach((t, i) => { t.tilePositionY = -time * (0.09 + i * 0.03); });
    this.rio.forEach((t) => { t.tilePositionX = x / ESCALA - time * t.getData('velocidad'); });
    this.rioNiebla.tilePositionX = (x * 1.05 - time * 0.02) / 2;
  }

  // Rocas de la arena (CUEVA.rocas): la peña se apoya hundida en el piso con
  // sombra de contacto; la repisa flota con su sombra suave en el piso.
  crearRocas() {
    texturasDerrumbe(this);
    CUEVA.rocas.forEach(({ tipo, x, arriba, espejo }) => {
      if (tipo === 'pena') {
        const piso = this.superficie(x, 470).y + CUEVA.hundido + 2;
        this.add.ellipse(x, piso - 3, 180, 12, 0x000000, 0.6).setDepth(1.9);
        this.add.image(x, piso, 'cuevaRocas', 1).setOrigin(0.5, 1).setScale(1.25).setFlipX(!!espejo).setDepth(2).setTint(0xc4bcb0);
      } else {
        this.add.image(x, arriba, 'cuevaRocas', 0).setOrigin(0.5, 0).setScale(1.15).setFlipX(!!espejo).setDepth(2).setTint(0xc4bcb0);
        const piso = this.superficie(x, 470).y;
        this.add.ellipse(x, piso - 1, 120, 8, 0x000000, 0.3).setDepth(1.9);
        // Polvo que se desprende de abajo cada tanto.
        this.add.particles(x, arriba + 34, 'cuevaEscombro', {
          x: { min: -50, max: 50 }, speedY: { min: 20, max: 50 }, gravityY: 400, lifespan: 1200,
          frequency: 1400, scale: { min: 0.6, max: 1.2 }, tint: [0x8a7a64, 0xa89478]
        }).setDepth(2.1);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Derrumbes (CUEVA.derrumbe): cada tanto una punta del techo tiembla, suelta
  // polvo (y una sombra en el piso avisa dónde va a caer), se desprende y se
  // hace pedazos contra el suelo; lastima si cae encima. Cada tanto, además,
  // la cueva retumba y llueven escombros.
  // ---------------------------------------------------------------------------

  crearDerrumbes() {
    texturasDerrumbe(this);
    const D = CUEVA.derrumbe;
    const punta = () => {
      this.caerPunta();
      this.time.delayedCall(Phaser.Math.Between(...D.cada), punta);
    };
    this.time.delayedCall(3500, punta);
    const temblor = () => {
      this.temblor();
      this.time.delayedCall(Phaser.Math.Between(...D.temblor), temblor);
    };
    this.time.delayedCall(Phaser.Math.Between(...D.temblor), temblor);
  }

  caerPunta(x) {
    if (this.estado !== 'control' || this.muerto) return;
    const cam = this.cameras.main;
    const j = this.jugador;
    // Cerca del jugador, casi siempre un poco adelante.
    x = x ?? Phaser.Math.Clamp(j.x + Phaser.Math.Between(-140, 280), cam.scrollX + 40, cam.scrollX + this.scale.width - 40);
    const piso = this.superficie(x, 470).y;
    const escala = ESCALA * Phaser.Math.FloatBetween(0.9, 1.35);
    const techo = this.colision.imagenY + Phaser.Math.Between(4, 30);
    const p = this.add.image(x, techo, 'cuevaPunta').setOrigin(0.5, 0).setScale(escala).setDepth(9.6).setTint(0xc8bca8);
    // Aviso: tiembla, cae polvo y crece la sombra donde va a pegar.
    const polvo = this.add.particles(x, techo + 6, 'cuevaEscombro', {
      x: { min: -8, max: 8 }, speedY: { min: 40, max: 90 }, gravityY: 500, lifespan: 900, frequency: 70,
      scale: { min: 0.8, max: 1.6 }, tint: [0x8a7a64, 0x6e604e, 0xa89478]
    }).setDepth(9.5);
    const sombra = this.add.ellipse(x, piso - 1, 30, 6, 0x000000, 0).setDepth(8.4);
    this.tweens.add({ targets: sombra, fillAlpha: 0.55, scaleX: 1.4, duration: CUEVA.derrumbe.aviso });
    this.tweens.add({ targets: p, x: x + 1.5, duration: 45, yoyo: true, repeat: Math.floor(CUEVA.derrumbe.aviso / 90) });
    this.time.delayedCall(CUEVA.derrumbe.aviso, () => {
      polvo.stop();
      this.time.delayedCall(1000, () => polvo.destroy());
      if (!p.active) return;
      const alto = p.displayHeight;
      const hasta = piso - alto + 6;
      this.tweens.add({
        targets: p, y: hasta, duration: Math.sqrt((hasta - techo) / 1400) * 1000, ease: 'Quad.in',
        onUpdate: () => {
          const b = j.body;
          if (p.active && Math.abs(b.center.x - p.x) < 16 && p.y + alto > b.top + 6 && p.y < b.bottom) {
            this.golpearJugador(p.x - 1);
          }
        },
        onComplete: () => { sombra.destroy(); this.romperPunta(p, piso); }
      });
    });
  }

  romperPunta(p, piso) {
    const x = p.x;
    p.destroy();
    this.cameras.main.shake(140, 0.004);
    const pedazos = this.add.particles(x, piso - 8, 'cuevaEscombro', {
      speed: { min: 80, max: 230 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: 800,
      rotate: { min: 0, max: 360 }, scale: { min: 1.4, max: 2.6 }, tint: [0xc8bca8, 0x9a8c78, 0x7a6c5a], emitting: false
    }).setDepth(10.5);
    pedazos.explode(14);
    const nube = this.add.particles(x, piso - 6, 'fx_humo', {
      speed: { min: 20, max: 80 }, angle: { min: 180, max: 360 }, lifespan: 800, scale: { start: 1.2, end: 3.2 },
      alpha: { start: 0.5, end: 0 }, tint: 0x9a8a72, emitting: false
    }).setDepth(10.4);
    nube.explode(9);
    // Queda un montoncito de piedras que se desvanece.
    const resto = this.add.image(x, piso + 1, 'cuevaRestoPunta').setOrigin(0.5, 1).setScale(ESCALA).setDepth(8.45).setTint(0xb0a490);
    this.tweens.add({ targets: resto, alpha: 0, delay: 2500, duration: 800, onComplete: () => resto.destroy() });
    this.time.delayedCall(900, () => { pedazos.destroy(); nube.destroy(); });
    // Si cae en un charco, salpica.
    (this.charcos || []).forEach((c) => {
      if (Math.abs(x - c.x) < c.ancho / 2) { this.salpicar(x, c.piso, 8); this.ondaCharco(c, x, 1.5); }
    });
  }

  // La cueva retumba: temblor, lluvia de escombros chicos y dos puntas.
  temblor() {
    if (this.estado !== 'control' || this.muerto) return;
    const { width } = this.scale;
    this.cameras.main.shake(900, 0.004);
    const lluvia = this.add.particles(0, 20, 'cuevaEscombro', {
      x: { min: 0, max: width }, speedY: { min: 60, max: 160 }, speedX: { min: -20, max: 20 }, gravityY: 700,
      lifespan: 1300, frequency: 25, rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 2 },
      tint: [0x8a7a64, 0x6e604e, 0xa89478]
    }).setScrollFactor(0).setDepth(9.5);
    const tierra = this.add.particles(0, 30, 'fx_humo', {
      x: { min: 0, max: width }, speedY: { min: 20, max: 50 }, lifespan: 1600, frequency: 120,
      scale: { start: 1, end: 3 }, alpha: { start: 0.25, end: 0 }, tint: 0x8a7a64
    }).setScrollFactor(0).setDepth(9.4);
    this.time.delayedCall(900, () => { lluvia.stop(); tierra.stop(); });
    this.time.delayedCall(2600, () => { lluvia.destroy(); tierra.destroy(); });
    this.time.delayedCall(250, () => this.caerPunta());
    this.time.delayedCall(700, () => this.caerPunta());
  }

  // ---------------------------------------------------------------------------
  // Zonas, GO → y HUD
  // ---------------------------------------------------------------------------

  crearHUD() {
    const { width, height } = this.scale;
    this.hud = TextFX.hud(this, 16, 8, '', { color: 'oro', origen: 0 }).setDepth(30);
    this.actualizarHUD();
    // GO! al estilo Metal Slug: el cartel y tres flechas que se prenden en secuencia.
    const go = TextFX.texto(this, 0, 0, 'GO!', { color: 'oro', escala: 5 });
    const finGo = go.anchoTexto / 2 + 22; // las flechas, después del "!"
    this.flechasGo = [0, 1, 2].map((i) => TextFX.texto(this, finGo + i * 34, 4, '►', { color: 'rojo', escala: 4 }));
    this.flechaGo = this.add.container(width - 220, height / 2 - 90, [go, ...this.flechasGo])
      .setScrollFactor(0).setDepth(31).setVisible(false);
    this.textoGo = go;
    this.parpadeoGo = null;
    this.crearSalida();
  }

  actualizarHUD() {
    // El nombre de la cueva solo aparece al entrar (titulo); acá, los rehenes.
    this.hud.setText(`REHENES ${this.rescatados}/${CUEVA.rehenes.length}`);
  }

  // La salida, a la derecha de la arena: luz de afuera y un cartel. Hasta
  // vencer al jefe dice CERRADA; después, SALIDA → y se sale caminando.
  crearSalida() {
    const x = CUEVA.salida + 50;
    if (!this.textures.exists('cuevaLuzSalida')) {
      const t = this.textures.createCanvas('cuevaLuzSalida', 64, 8);
      const ctx = t.getContext();
      const g = ctx.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(216,240,192,0)');
      g.addColorStop(0.5, 'rgba(216,240,192,1)');
      g.addColorStop(1, 'rgba(216,240,192,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 8);
      t.refresh();
    }
    const luz = this.add.image(x, 0, 'cuevaLuzSalida').setOrigin(0.5, 0).setDisplaySize(160, this.scale.height)
      .setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
    this.tweens.add({ targets: luz, alpha: 0.05, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.cartelSalida = TextFX.texto(this, CUEVA.salida, 240, 'SALIDA', { color: 'plata', escala: 2 }).setDepth(16);
    this.cartelSalidaSub = TextFX.texto(this, CUEVA.salida, 262, '(VENCE AL JEFE)', { color: 'rojo', escala: 1 }).setDepth(16);
  }

  abrirSalida() {
    this.cartelSalidaSub.destroy();
    this.cartelSalida.setText('SALIDA →').setColor('oro');
    this.tweens.add({ targets: this.cartelSalida, x: this.cartelSalida.x + 10, duration: 400, yoyo: true, repeat: -1 });
  }

  // Entra deslizándose desde la derecha; las flechas se prenden una tras
  // otra (►►►) y el GO! destella y late.
  mostrarGo(visible) {
    if (this.parpadeoGo) { this.parpadeoGo.remove(); this.parpadeoGo = null; }
    this.tweens.killTweensOf([this.flechaGo, this.textoGo]);
    this.flechaGo.setVisible(visible);
    if (!visible) return;
    const x = this.scale.width - 220;
    this.flechaGo.setX(x + 260).setAlpha(1);
    this.tweens.add({ targets: this.flechaGo, x, duration: 260, ease: 'Back.out' });
    this.textoGo.setScale(1);
    this.tweens.add({ targets: this.textoGo, scale: 1.12, duration: 240, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.textoGo.destellar(3, 70);
    sonidoUI(this, 'alerta'); // Estado.js
    this.goDesde = this.cameras.main.scrollX;
    this.goEn = this.time.now;
    let paso = 0;
    this.parpadeoGo = this.time.addEvent({
      delay: 160, loop: true, callback: () => {
        this.flechasGo.forEach((f, i) => f.setAlpha(i === paso % 4 || paso % 4 === 3 ? 1 : 0.2));
        paso++;
      }
    });
  }

  // Enemigos de la zona que faltan vencer. Solo cuentan los que están a la
  // vista (con margen): uno que quedó fuera de la pantalla no traba el juego.
  vivosEnZona(z) {
    const cam = this.cameras.main;
    const aLaVista = (o) => o.x > cam.scrollX - 80 && o.x < cam.scrollX + this.scale.width + 80;
    const vivas = this.cholitas.getChildren().filter((c) => c.getData('zona') === z &&
      ['ronda', 'ataque'].includes(c.getData('estado')) && aLaVista(c)).length;
    const aves = this.guacharos.getChildren().filter((g) => g.getData('zona') === z && g.getData('estado') !== 'muerto' && aLaVista(g)).length;
    return vivas + aves + this.pendientes[z];
  }

  // camino: la cámara va hacia el límite de la zona; activa: trabada hasta
  // vencer a todos; fin: después del jefe, a la salida.
  actualizarZonas() {
    const z = CUEVA.zonas[this.zona];
    const cam = this.cameras.main;
    if (this.zonaEstado === 'camino') {
      // GO: se va cuando el jugador avanza y vuelve (con su alerta) si en 3 s no avanzó.
      if (this.flechaGo.visible && cam.scrollX - this.goDesde > 60) {
        this.mostrarGo(false);
        this.goDesde = cam.scrollX;
        this.goEn = this.time.now;
      } else if (!this.flechaGo.visible && this.time.now - this.goEn > 3000) {
        if (cam.scrollX - this.goDesde < 30) this.mostrarGo(true);
        else { this.goDesde = cam.scrollX; this.goEn = this.time.now; }
      }
      if (cam.scrollX < Math.min(z.limite, CUEVA.ancho - this.scale.width) - 2) return;
      this.zonaEstado = 'activa';
      this.mostrarGo(false);
      this.empezarZona(this.zona);
    } else if (this.zonaEstado === 'activa') {
      if (this.vivosEnZona(this.zona) > 0 || (z.jefe && !this.jefeVencido)) return;
      if (this.zona < CUEVA.zonas.length - 1) {
        this.zona++;
        this.zonaEstado = 'camino';
        this.mostrarGo(true);
      } else {
        this.zonaEstado = 'fin';
        this.abrirSalida();
        this.time.delayedCall(2600, () => this.mostrarGo(true));
      }
    } else if (this.zonaEstado === 'fin' && this.estado === 'control' && this.jugador.body.center.x > CUEVA.salida) {
      this.salir();
    }
  }

  empezarZona(i) {
    const z = CUEVA.zonas[i];
    // El jefe: antes, ¡ALERTA! con franjas (Estado.js).
    if (z.jefe) { alertaJefe(this, () => this.iniciarJefe()); return; }
    this.pendientes[i] = z.guacharos || 0;
    for (let k = 0; k < this.pendientes[i]; k++) {
      this.time.delayedCall(600 + k * 900, () => {
        this.pendientes[i]--;
        this.nuevoGuacharo(i);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Jefe: el GUÁCHARO REY, un guácharo blindado con arnés y ametralladoras
  // (ave_jefe_vuelo / ave_jefe_ataque / ave_jefe_muere, ver AVE)
  // ---------------------------------------------------------------------------

  iniciarJefe() {
    const J = CUEVA.jefe;
    const { width } = this.scale;
    this.jefeVencido = false;
    this.jefeVida = J.vida;
    this.jefeFuria = 1;
    this.jefeLado = -1;
    this.jefe = this.physics.add.sprite(J.x, -140, AVE.jefeVuelo.clave, 0).setScale(J.escala).setDepth(9.8);
    this.jefe.body.setAllowGravity(false);
    hojaAve(this.jefe, 'jefeVuelo', true);
    this.jefe.play('jefe_vuela');
    this.jefeEstado = 'llega';
    this.cameras.main.shake(900, 0.006);
    const cartel = TextFX.alert(this, width / 2, 120, '¡EL GUÁCHARO REY!', { escala: 4 }).setScrollFactor(0).setDepth(31);
    cartel.destellar(6, 90, () => this.tweens.add({ targets: cartel, alpha: 0, delay: 600, duration: 300, onComplete: () => cartel.destroy() }));
    this.tweens.add({
      targets: this.jefe, y: J.alto, duration: 1600, ease: 'Sine.out',
      onComplete: () => { this.jefeEstado = 'planea'; this.jefeHasta = this.time.now + 1500; }
    });
    // Barra de vida arriba a la derecha (a la izquierda está el HUD).
    const bx = width - 340;
    this.barraJefe = [
      this.add.rectangle(bx - 3, 40, 326, 16, 0x000000, 0.7).setOrigin(0, 0.5).setStrokeStyle(2, 0xffd23f),
      this.add.rectangle(bx, 40, 320, 10, 0xd0302a).setOrigin(0, 0.5),
      TextFX.texto(this, bx + 160, 20, 'GUÁCHARO REY', { color: 'rojo', escala: 2 })
    ];
    this.barraJefe.forEach((o) => o.setScrollFactor(0).setDepth(30));
    this.physics.add.overlap(this.jugador, this.jefe, () => {
      if (this.estado === 'control' && !['llega', 'muerto'].includes(this.jefeEstado)) this.golpearJugador(this.jefe.x);
    });
    this.physics.add.overlap(this.balas, this.jefe, (a, b) => {
      const bala = a === this.jefe ? b : a;
      if (this.jefeEstado === 'muerto' || this.jefeEstado === 'llega' || this.impactoBala(bala)) return;
      chispas(this, bala.x, bala.y, 4, bala.getData('rebote'), 80, 11);
      bala.destroy();
      this.danarJefe(bala.getData('dano') || 1);
    });
  }

  danarJefe(dano) {
    if (!this.jefe || ['muerto', 'llega'].includes(this.jefeEstado)) return;
    // Un daño que no sea número (un arma sin 'dano') cuenta 1: la vida nunca
    // queda en NaN (si no, el jefe no moría más).
    this.jefeVida = (Number.isFinite(this.jefeVida) ? this.jefeVida : 0) - (Number.isFinite(dano) ? dano : 1);
    this.barraJefe[1].width = 320 * Math.max(0, this.jefeVida / CUEVA.jefe.vida);
    this.jefe.setTintFill(0xffffff);
    this.time.delayedCall(50, () => this.jefe && this.jefe.active && this.jefeEstado !== 'muerto' && this.tintarJefe());
    if (Math.random() < 0.3) this.plumas(this.jefe.x, this.jefe.y, 2);
    if (this.jefeVida <= CUEVA.jefe.vida / 2 && this.jefeFuria === 1) {
      // Furioso: más rápido, dispara más y llama a la bandada.
      this.jefeFuria = 1.3;
      this.tintarJefe();
      this.cameras.main.shake(400, 0.008);
      this.aviso(this.jefe.x, this.jefe.y - 100, '¡KRAAAAA!', 'rojo');
    }
    if (this.jefeVida <= 0) this.matarJefe();
  }

  // Furioso se pone rojizo; si no, con sus colores.
  tintarJefe() {
    if (this.jefeFuria > 1) this.jefe.setTint(CUEVA.jefe.tinteFuria);
    else this.jefe.clearTint();
  }

  // Elige el próximo ataque: picada, ráfaga de ametralladora o, furioso, llama
  // a su bandada.
  elegirAtaqueJefe() {
    const J = this.jefe;
    const j = this.jugador;
    const opciones = ['picada', 'rafaga', 'rafaga'];
    if (this.jefeFuria > 1 && this.guacharos.countActive() < 2) opciones.push('invoca');
    const ataque = Phaser.Utils.Array.GetRandom(opciones);
    J.setVelocity(0);
    if (ataque === 'picada') {
      // Aviso: se queda quieto y titila.
      this.jefeEstado = 'aviso';
      this.jefeHasta = this.time.now + 550 / this.jefeFuria;
      this.tweens.add({ targets: J, alpha: 0.6, duration: 80, yoyo: true, repeat: 3 });
      chispas(this, J.x + (J.flipX ? -60 : 60), J.y - 20, 6, -90, 360, 11);
    } else if (ataque === 'rafaga') {
      // ave_jefe_ataque: se da vuelta hacia el jugador, carga y dispara con las
      // ametralladoras del arnés (las balas salen en los cuadros del fogonazo).
      this.jefeEstado = 'rafaga';
      hojaAve(J, 'jefeAtaque', j.x < J.x);
      J.play({ key: 'jefe_ataca', repeat: this.jefeFuria > 1 ? 1 : 0 });
      const alCuadro = (anim, cuadro) => {
        if (this.jefeEstado !== 'rafaga') return;
        // Cuadros 3 (fogonazo) y 4 (ráfaga) de la hoja, dos veces por animación.
        if (cuadro.index === 4 || cuadro.index === 6) this.rafagaJefe(2);
        if (cuadro.index === 5 || cuadro.index === 7) this.rafagaJefe(3);
      };
      J.on('animationupdate', alCuadro);
      J.once('animationcomplete', () => {
        J.off('animationupdate', alCuadro);
        if (!J.active || this.jefeEstado !== 'rafaga') return;
        hojaAve(J, 'jefeVuelo', J.flipX);
        J.play('jefe_vuela');
        this.jefeEstado = 'planea';
        this.jefeHasta = this.time.now + 1400 / this.jefeFuria;
      });
    } else {
      this.jefeEstado = 'invoca';
      this.jefeHasta = this.time.now + 1100;
      this.aviso(J.x, J.y - 100, '¡KRRAA KRRAA!', 'rojo');
      const cam = this.cameras.main;
      this.time.delayedCall(300, () => this.nuevoGuacharo(2, cam.scrollX + this.scale.width + 30, 80));
      this.time.delayedCall(600, () => this.nuevoGuacharo(2, cam.scrollX + 600, -30));
    }
  }

  // Balas de las ametralladoras: n tiros hacia el jugador, abiertos en abanico.
  // Le pegan al tocarlo (se esquivan saltando o agachado según la altura).
  rafagaJefe(n) {
    const J = this.jefe;
    if (!J || this.jefeEstado === 'muerto') return;
    const B = CUEVA.jefe.bala;
    const j = this.jugador;
    const lado = J.flipX ? -1 : 1;
    const x = J.x + lado * 40 * J.scaleX;  // las ametralladoras del pecho
    const y = J.y + 12 * J.scaleY;
    const base = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, j.body.center.x, j.body.center.y));
    fogonazo(this, x, y, 2.4, 11, lado < 0 ? 180 : 0);
    this.cameras.main.shake(90, 0.003);
    for (let k = 0; k < n; k++) {
      const ang = base + (k - (n - 1) / 2) * B.dispersion + Phaser.Math.FloatBetween(-2, 2);
      const rad = Phaser.Math.DegToRad(ang);
      const bala = this.ondas.create(x, y, 'fx_bala').setDepth(11).setAngle(ang).setScale(2.4)
        .setTint(0xff9a40).setBlendMode(Phaser.BlendModes.ADD);
      bala.body.setSize(10, 4);
      const v = B.velocidad * this.jefeFuria;
      bala.setVelocity(Math.cos(rad) * v, Math.sin(rad) * v);
      this.time.delayedCall(2500, () => bala.active && bala.destroy());
    }
  }

  moverJefe(time) {
    const J = this.jefe;
    if (!J || !J.active || this.jefeEstado === 'muerto' || this.jefeEstado === 'llega') return;
    const C = CUEVA.jefe;
    const j = this.jugador;
    const f = this.jefeFuria;
    const [ax0, ax1] = C.arena;
    switch (this.jefeEstado) {
      case 'planea': {
        // Va de un lado al otro de la arena, ondulando.
        const tx = this.jefeLado < 0 ? ax0 + 80 : ax1 - 80;
        const ty = C.alto + Math.sin(time * 0.004) * 28;
        J.setVelocity(Phaser.Math.Clamp((tx - J.x) * 1.6, -C.velocidad * f, C.velocidad * f), (ty - J.y) * 3);
        if (Math.abs(tx - J.x) < 30) this.jefeLado = -this.jefeLado;
        hojaAve(J, 'jefeVuelo', J.body.velocity.x < 0);
        if (time > this.jefeHasta && this.estado === 'control') this.elegirAtaqueJefe();
        break;
      }
      case 'aviso':
        J.setVelocity(0, Math.sin(time * 0.05) * 30);
        hojaAve(J, 'jefeVuelo', j.x < J.x);
        if (time > this.jefeHasta) {
          const ang = Phaser.Math.Angle.Between(J.x, J.y, j.body.center.x, C.suelo);
          J.setVelocity(Math.cos(ang) * C.picada * f, Math.sin(ang) * C.picada * f);
          this.jefeEstado = 'picada';
          this.jefeHasta = time + 1300;
        }
        break;
      case 'picada':
        if (J.y >= C.suelo || time > this.jefeHasta) {
          // Barrido rasante: hay que saltarlo.
          this.jefeEstado = 'barrido';
          this.jefeHasta = time + 700;
          J.setVelocity((J.body.velocity.x >= 0 ? 1 : -1) * C.barrido * f, 0);
          this.cameras.main.shake(150, 0.004);
        }
        break;
      case 'barrido':
        J.body.velocity.y = (C.suelo - J.y) * 5;
        hojaAve(J, 'jefeVuelo', J.body.velocity.x < 0);
        if (time > this.jefeHasta || J.x < ax0 - 40 || J.x > ax1 + 40) this.jefeEstado = 'sube';
        break;
      case 'sube':
        J.setVelocity(J.body.velocity.x * 0.95, -300);
        if (J.y <= C.alto) { this.jefeEstado = 'planea'; this.jefeHasta = time + Phaser.Math.Between(1300, 2200) / f; }
        break;
      case 'rafaga':
        // Quieto en el aire mientras dispara (la animación lo termina).
        J.setVelocity(0, Math.sin(time * 0.01) * 16);
        break;
      default: // invoca
        J.setVelocity(0, Math.sin(time * 0.01) * 20);
        hojaAve(J, 'jefeVuelo', j.x < J.x);
        if (time > this.jefeHasta) { this.jefeEstado = 'planea'; this.jefeHasta = time + 1600 / f; }
    }
    J.x = Phaser.Math.Clamp(J.x, ax0 - 60, ax1 + 60);
  }

  // ave_jefe_muere: golpeado en el aire mientras explota, cae de espaldas,
  // choca levantando polvo y queda tendido con las estrellitas.
  matarJefe() {
    const J = this.jefe;
    sumarPuntos(this, 5000);
    this.jefeEstado = 'muerto';
    J.body.enable = false;
    J.removeAllListeners('animationupdate');
    J.removeAllListeners('animationcomplete');
    J.anims.stop();
    J.clearTint();
    hojaAve(J, 'jefeMuerte', J.flipX);
    J.play({ key: 'jefe_golpe', repeat: 3 });
    this.ondas.clear(true, true);
    this.barraJefe.forEach((o) => this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() }));
    for (let k = 0; k < 8; k++) {
      this.time.delayedCall(k * 140, () => {
        explotar(this, J.x + Phaser.Math.Between(-70, 70), J.y - Phaser.Math.Between(20, 120), 'chica', ESCALA * 1.4);
        this.plumas(J.x, J.y - 60, 6);
      });
    }
    // Cae hasta el piso (no se queda en una repisa).
    const suelo = (this.pisoEn(Phaser.Math.Clamp(J.x, 0, CUEVA.salida)) ?? this.superficie(J.x, J.y).y) + 2;
    this.time.delayedCall(1100, () => { J.anims.stop(); J.setFrame(2); });
    this.tweens.add({
      targets: J, y: suelo, delay: 1100, duration: 650, ease: 'Quad.in',
      onComplete: () => {
        explotar(this, J.x, suelo + 4, 'grande', ESCALA * 1.3);
        this.cameras.main.shake(500, 0.016);
        this.cameras.main.flash(150, 255, 220, 160);
        this.plumas(J.x, suelo - 40, 24);
        J.play('jefe_choca');
        J.once('animationcomplete', () => J.active && J.play('jefe_tendido'));
        this.jefeVencido = true;
        const { width, height } = this.scale;
        const fin = TextFX.letras(this, width / 2, height / 2 - 60, '¡CUEVA DESPEJADA!', { escala: 4, cada: 50, fijo: true, profundidad: 32 });
        this.time.delayedCall(2400, () => fin.salir(400));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Editor de colisión (tecla E)
  //   clic y arrastrar   mueve un punto (o la pieza entera si se toma del medio)
  //   G / P / W / L      agrega suelo, plataforma, pared o escalera en el mouse
  //   SUPR / BORRAR      borra la pieza elegida
  //   ← → (A D)          mueve la cámara
  //   S                  guarda: descarga cueva_collision.json (y lo copia)
  //   E                  sale y rearma los cuerpos
  // ---------------------------------------------------------------------------

  crearEditor() {
    this.dibujoEditor = this.add.graphics().setDepth(50).setVisible(false);
    this.ayudaEditor = TextFX.texto(this, 12, this.scale.height - 34,
      'EDITOR  ARRASTRA PUNTOS · G P W L AGREGAR · SUPR BORRAR · S GUARDAR · E SALIR', { color: 'plata', escala: 1, origen: 0 })
      .setScrollFactor(0).setDepth(51).setVisible(false);
    this.input.keyboard.on('keydown', (ev) => this.teclaEditor(ev));
    this.input.on('pointerdown', (p) => this.editorTomar(p));
    this.input.on('pointermove', (p) => this.editorArrastrar(p));
    this.input.on('pointerup', () => { if (this.editor) this.editor.arrastre = null; });
  }

  teclaEditor(ev) {
    const k = ev.key.toLowerCase();
    if (k === 'e' && recienClaveAdmin()) return; // la E de "jaime" (Admin.js)
    if (k === 'e' && ['control', 'editor'].includes(this.estado)) { this.alternarEditor(); return; }
    if (this.estado !== 'editor') return;
    const p = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const d = this.colision;
    const nuevo = {
      g: () => ['ground', { x0: x - 60, y0: y, x1: x + 60, y1: y }],
      p: () => ['platforms', { x0: x - 50, x1: x + 50, y }],
      w: () => ['walls', { x: x - 15, y: y - 80, w: 30, h: 160 }],
      l: () => ['ladders', { x0: x - 25, x1: x + 25, arriba: y - 100, abajo: y + 100 }]
    }[k];
    if (nuevo) {
      const [tipo, pieza] = nuevo();
      d[tipo].push(pieza);
      this.editor.sel = { tipo, pieza };
    } else if ((k === 'delete' || k === 'backspace') && this.editor.sel) {
      const lista = d[this.editor.sel.tipo];
      lista.splice(lista.indexOf(this.editor.sel.pieza), 1);
      this.editor.sel = null;
    } else if (k === 's') {
      this.guardarColision();
    }
  }

  alternarEditor() {
    const entra = this.estado !== 'editor';
    if (entra) {
      this.estadoAntesEditor = this.estado;
      this.estado = 'editor';
      this.editor = { sel: null, arrastre: null };
      this.physics.world.pause();
      this.tweens.pauseAll();
    } else {
      this.estado = this.estadoAntesEditor;
      this.editor = null;
      this.crearColision(); // rearma los cuerpos con lo editado
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.camaraMinima = Math.min(this.camaraMinima, this.cameras.main.scrollX);
    }
    this.dibujoEditor.setVisible(entra).clear();
    this.ayudaEditor.setVisible(entra);
  }

  // Puntos de agarre de cada pieza: [x, y, clave].
  puntosPieza(tipo, p) {
    if (tipo === 'ground') return [[p.x0, p.y0, 'a'], [p.x1, p.y1, 'b']];
    if (tipo === 'platforms') return [[p.x0, p.y, 'a'], [p.x1, p.y, 'b']];
    if (tipo === 'walls') return [[p.x, p.y, 'a'], [p.x + p.w, p.y + p.h, 'b']];
    return [[p.x0, p.arriba, 'a'], [p.x1, p.abajo, 'b']];
  }

  editorTomar(puntero) {
    if (this.estado !== 'editor') return;
    const p = this.cameras.main.getWorldPoint(puntero.x, puntero.y);
    const d = this.colision;
    let mejor = null;
    Object.keys(EDITOR.colores).forEach((tipo) => d[tipo].forEach((pieza) => {
      this.puntosPieza(tipo, pieza).forEach(([x, y, clave]) => {
        const dist = Phaser.Math.Distance.Between(p.x, p.y, x, y);
        if (dist < EDITOR.agarre && (!mejor || dist < mejor.dist)) mejor = { tipo, pieza, clave, dist };
      });
      if (mejor) return;
      // Del medio: toda la pieza.
      const [[ax, ay], [bx, by]] = this.puntosPieza(tipo, pieza);
      const rect = tipo === 'walls' || tipo === 'ladders';
      const dentro = rect
        ? p.x >= Math.min(ax, bx) && p.x <= Math.max(ax, bx) && p.y >= Math.min(ay, by) && p.y <= Math.max(ay, by)
        : Phaser.Geom.Intersects.PointToLine(new Phaser.Geom.Point(p.x, p.y), new Phaser.Geom.Line(ax, ay, bx, by), 6);
      if (dentro && !mejor) mejor = { tipo, pieza, clave: 'todo', dist: EDITOR.agarre };
    }));
    this.editor.sel = mejor ? { tipo: mejor.tipo, pieza: mejor.pieza } : null;
    this.editor.arrastre = mejor ? { ...mejor, x: p.x, y: p.y } : null;
  }

  editorArrastrar(puntero) {
    if (this.estado !== 'editor' || !this.editor.arrastre || !puntero.isDown) return;
    const a = this.editor.arrastre;
    const p = this.cameras.main.getWorldPoint(puntero.x, puntero.y);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const s = a.pieza;
    if (a.clave === 'todo') {
      const dx = Math.round(p.x - a.x);
      const dy = Math.round(p.y - a.y);
      a.x += dx;
      a.y += dy;
      ['x0', 'x1', 'x'].forEach((c) => { if (c in s) s[c] += dx; });
      ['y0', 'y1', 'y', 'arriba', 'abajo'].forEach((c) => { if (c in s) s[c] += dy; });
      return;
    }
    const b = a.clave === 'b';
    if (a.tipo === 'ground') { s[b ? 'x1' : 'x0'] = x; s[b ? 'y1' : 'y0'] = y; }
    else if (a.tipo === 'platforms') { s[b ? 'x1' : 'x0'] = x; s.y = y; }
    else if (a.tipo === 'ladders') { s[b ? 'x1' : 'x0'] = x; s[b ? 'abajo' : 'arriba'] = y; }
    else if (b) { s.w = Math.max(4, x - s.x); s.h = Math.max(4, y - s.y); }
    else { s.w += s.x - x; s.h += s.y - y; s.x = x; s.y = y; }
  }

  dibujarEditor() {
    const g = this.dibujoEditor.clear();
    const d = this.colision;
    const sel = this.editor.sel && this.editor.sel.pieza;
    Object.entries(EDITOR.colores).forEach(([tipo, color]) => d[tipo].forEach((p) => {
      const c = p === sel ? 0xffffff : color;
      const [[ax, ay], [bx, by]] = this.puntosPieza(tipo, p);
      if (tipo === 'walls' || tipo === 'ladders') {
        g.fillStyle(c, 0.18).fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
        g.lineStyle(2, c, 1).strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
        if (tipo === 'ladders') for (let y = ay + 12; y < by; y += 16) g.lineBetween(ax, y, bx, y);
      } else {
        g.lineStyle(3, c, 1).lineBetween(ax, ay, bx, by);
      }
      g.fillStyle(c, 1).fillRect(ax - 4, ay - 4, 8, 8).fillRect(bx - 4, by - 4, 8, 8);
    }));
  }

  // Descarga el JSON (el navegador no puede escribir en assets/: hay que
  // reemplazar assets/fondos/cueva/cueva_collision.json con lo descargado).
  guardarColision() {
    const texto = JSON.stringify(this.colision, null, 1);
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    enlace.download = this.archivoColision || 'cueva_collision.json';
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    if (navigator.clipboard) navigator.clipboard.writeText(texto).catch(() => {});
    console.log(texto);
    TextFX.popup(this, this.scale.width / 2, 80, 'JSON GUARDADO', { color: 'plata' }).setScrollFactor(0).setDepth(52);
  }

  moverEditor() {
    const cam = this.cameras.main;
    const izq = this.teclas.left.isDown || this.teclasExtra.A.isDown;
    const der = this.teclas.right.isDown || this.teclasExtra.D.isDown;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (der ? 12 : 0) - (izq ? 12 : 0), 0, CUEVA.ancho - this.scale.width);
    this.dibujarEditor();
  }

  // ---------------------------------------------------------------------------

  update(time, delta) {
    this.moverFondo();
    this.moverAmbiente(time);
    this.moverAgua(time);
    if (this.estado === 'editor') { this.moverEditor(); return; }
    // Modo admin (Admin.js): noclip, sin límites de cámara y la salida abierta.
    const admin = this.estado === 'control' && noclipJugador(this);
    if (this.estado === 'control' && !admin) this.moverJugador();
    else if (this.estado !== 'muerto' && !admin) cerrarSelector(this, false);
    if (!this.muerto && this.estado !== 'saliendo' && !admin) this.limitarJugador();
    if (admin && this.jugador.body.center.x > CUEVA.salida) this.salir();
    this.moverCholitas();
    this.moverGuacharos(time);
    this.moverJefe(time);
    this.moverRehenes();
    this.moverBalas();
    this.actualizarCamara(delta);
    this.actualizarZonas();
    this.actualizarSombra(this.sombraJugador, this.jugador);
    this.cholitas.getChildren().forEach((c) => { if (c.getData('estado') !== 'vencida') this.actualizarSombra(c.getData('sombra'), c); });
    this.rehenes.getChildren().forEach((r) => this.actualizarSombra(r.getData('sombra'), r));
    this.pisarCharcos();
  }
}

// Movimiento, disparos y golpes del jugador (Jugador.js) y, de Nivel1, las
// escaleras, el ataque de las cholitas, los rehenes y los avisos.
Object.assign(Cueva.prototype, AccionesJugador);
['escaleraEn', 'empezarATrepar', 'trepar', 'atacarCholita', 'chocarCholita', 'vencerCholita', 'aviso', 'crearAnimacionesNpc']
  .forEach((m) => { Cueva.prototype[m] = Nivel1.prototype[m]; });
// Y al revés: Nivel1 usa este editor de colisión para la entrada a la cueva
// (su alternarEditor y moverEditor son propios).
['crearEditor', 'teclaEditor', 'puntosPieza', 'editorTomar', 'editorArrastrar', 'dibujarEditor', 'guardarColision']
  .forEach((m) => { Nivel1.prototype[m] = Cueva.prototype[m]; });

// =============================================================================
// Texturas dibujadas (pixel art, se dibujan a x2). También las usa Nivel1 para
// los guácharos que salen de la boca de la cueva.
// =============================================================================

// El guácharo (Steatornis caripensis): pájaro nocturno rojizo con pintas
// blancas que vive en la cueva. Hojas de herramientas/aves_cueva.py (a escala
// 1, de assets/efectos/cueva/aves/ave_fly.jpeg y ave_ataque.jpeg), mirando a
// la derecha:
//   vuelo  0 posado, 1 abre las alas, 2-3 alas arriba, 4-5 alas abajo
//   grito  0 posado, 1-2 mueve la cabeza, 3-6 abre el pico y chilla
//   muerte 0 golpeado, 1 aturdido, 2 cae de espaldas, 3 choca, 4 rebota,
//          5 nube de polvo (va aparte), 6 tendido, 7 tendido con estrellitas
// origen: centro del cuerpo en la celda (px), igual en las dos hojas: al
// pasar de una a la otra el pájaro no salta. cuerpo: caja de colisión [ancho,
// alto, x, y] en la celda. pies: px de los pies bajo el origen (posado); al
// cambiar de hoja se corrige la y para que los pies queden en el mismo lugar.
const AVE = {
  ruta: 'assets/efectos/cueva/aves/',
  vuelo: { clave: 'aveVuelo', archivo: 'ave_vuelo_sheet.png', ancho: 95, alto: 125, origen: [50, 74], cuerpo: [52, 42, 22, 52], pies: 26 },
  grito: { clave: 'aveGrito', archivo: 'ave_grito_sheet.png', ancho: 136, alto: 56, origen: [91, 30], cuerpo: [60, 40, 60, 12], pies: 26 },
  // Muerte: el origen está en el piso (abajo, al medio): cae y queda tendido.
  muerte: { clave: 'aveMuerte', archivo: 'ave_muerte_sheet.png', ancho: 97, alto: 70, origen: [49, 70], cuerpo: [50, 20, 24, 50], pies: 0 },
  // El Guácharo Rey (ave_jefe_*.jpeg): vuelo 0-7 (aleteo); ataque 0 alas
  // abiertas, 1 se encoge, 2 se da vuelta, 3 fogonazo, 4 ráfaga, 5-6 vuelve;
  // muerte 0-1 golpeado, 2 cae de espaldas, 3 choca, 4 tendido, 5 polvo,
  // 6 tendido con estrellitas. Vuelo y ataque tienen el pico en el mismo lugar.
  jefeVuelo: { clave: 'jefeVuelo', archivo: 'ave_jefe_vuelo_sheet.png', ancho: 202, alto: 163, origen: [126, 86], cuerpo: [110, 70, 70, 52], pies: 74 },
  jefeAtaque: { clave: 'jefeAtaque', archivo: 'ave_jefe_ataque_sheet.png', ancho: 250, alto: 180, origen: [174, 89], cuerpo: [110, 70, 118, 55], pies: 74 },
  jefeMuerte: { clave: 'jefeMuerte', archivo: 'ave_jefe_muerte_sheet.png', ancho: 266, alto: 168, origen: [144, 168], cuerpo: [120, 40, 84, 128], pies: 0 },
  pies: 26
};

// Las cargan Cueva y Nivel1 (los que salen de la boca de la cueva); las del
// jefe, solo la cueva.
function cargarAves(escena, conJefe = false) {
  const hojas = [AVE.vuelo, AVE.grito, AVE.muerte];
  if (conJefe) hojas.push(AVE.jefeVuelo, AVE.jefeAtaque, AVE.jefeMuerte);
  hojas.forEach((h) => {
    if (!escena.textures.exists(h.clave)) escena.load.spritesheet(h.clave, AVE.ruta + h.archivo, { frameWidth: h.ancho, frameHeight: h.alto });
  });
}

function animacionesAves(escena) {
  const cuadros = (clave, frames) => escena.anims.generateFrameNumbers(clave, { frames });
  // El jefe (si se cargó su hoja).
  if (escena.textures.exists(AVE.jefeVuelo.clave) && !escena.anims.exists('jefe_vuela')) {
    escena.anims.create({ key: 'jefe_vuela', frames: escena.anims.generateFrameNumbers(AVE.jefeVuelo.clave, { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
    escena.anims.create({ key: 'jefe_ataca', frames: cuadros(AVE.jefeAtaque.clave, [0, 1, 2, 3, 4, 3, 4, 5, 6]), frameRate: 9 });
    escena.anims.create({ key: 'jefe_golpe', frames: cuadros(AVE.jefeMuerte.clave, [0, 1]), frameRate: 6 });
    escena.anims.create({ key: 'jefe_choca', frames: cuadros(AVE.jefeMuerte.clave, [3, 5, 5, 4]), frameRate: 7 });
    escena.anims.create({ key: 'jefe_tendido', frames: cuadros(AVE.jefeMuerte.clave, [6, 6, 4, 6]), frameRate: 3, repeat: -1 });
  }
  if (escena.anims.exists('ave_vuela')) return;
  escena.anims.create({ key: 'ave_vuela', frames: cuadros(AVE.vuelo.clave, [2, 3, 4, 5]), frameRate: 12, repeat: -1 });
  // Picada: alas arriba y abajo al doble de velocidad.
  escena.anims.create({ key: 'ave_ataca', frames: cuadros(AVE.vuelo.clave, [3, 2, 4, 5, 4]), frameRate: 24, repeat: -1 });
  escena.anims.create({ key: 'ave_despega', frames: cuadros(AVE.vuelo.clave, [0, 1, 2, 3]), frameRate: 12 });
  escena.anims.create({ key: 'ave_grita', frames: cuadros(AVE.grito.clave, [0, 1, 2, 3, 4, 5, 6]), frameRate: 12 });
  // Muerte (ave_muerta.jpeg): golpeado y aturdido en el aire, el choque
  // contra el piso con rebote, y tendido con las estrellitas que titilan.
  escena.anims.create({ key: 'ave_golpe', frames: cuadros(AVE.muerte.clave, [0, 0, 1, 1]), frameRate: 10 });
  escena.anims.create({ key: 'ave_choca', frames: cuadros(AVE.muerte.clave, [3, 4, 3, 6]), frameRate: 10 });
  escena.anims.create({ key: 'ave_tendida', frames: cuadros(AVE.muerte.clave, [6, 7, 7, 6, 7]), frameRate: 5, repeat: -1 });
  escena.anims.create({ key: 'ave_posada', frames: cuadros(AVE.grito.clave, [0, 0, 0, 0, 1, 2, 1, 0]), frameRate: 4, repeat: -1 });
}

// Pone al pájaro en una hoja de AVE ('vuelo', 'grito', 'jefeVuelo'...) mirando a un lado: textura,
// origen y caja de colisión espejados. No hace nada si ya estaba así.
function hojaAve(sprite, hoja, izquierda) {
  if (sprite.getData('hoja') === hoja && sprite.getData('izq') === izquierda) return sprite;
  const h = AVE[hoja];
  const antes = AVE[sprite.getData('hoja')];
  if (antes && antes !== h) sprite.y += (antes.pies - h.pies) * sprite.scaleY;
  if (sprite.texture.key !== h.clave) sprite.setTexture(h.clave, 0);
  sprite.setFlipX(izquierda).setOrigin((izquierda ? h.ancho - h.origen[0] : h.origen[0]) / h.ancho, h.origen[1] / h.alto);
  if (sprite.body) {
    const [w, a, x, y] = h.cuerpo;
    sprite.body.setSize(w, a, false).setOffset(izquierda ? h.ancho - x - w : x, y);
  }
  sprite.setData({ hoja, izq: izquierda });
  return sprite;
}

function texturasCueva(escena) {
  animacionesAves(escena);
  if (escena.textures.exists('cueva_turril')) return;
  const pixeles = (clave, ancho, alto, fn) => {
    const g = escena.make.graphics({ add: false });
    fn((x, y, c, w = 1, h = 1) => g.fillStyle(c).fillRect(x, y, w, h));
    g.generateTexture(clave, ancho, alto);
    g.destroy();
  };
  // Turril de combustible oxidado (16x22), con aros y manchas.
  pixeles('cueva_turril', 16, 22, (px) => {
    const tonos = [0x4a1c10, 0x7a3018, 0x9a4420, 0xb05a2a, 0x9a4420, 0x8a3a1c, 0x8a3a1c, 0x7a3018, 0x7a3018, 0x6a2a14, 0x6a2a14, 0x5a2410, 0x5a2410, 0x4a1c10];
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 16; x++) {
        const borde = x === 0 || x === 15 || y === 0 || y === 21;
        if (borde && (x === 0 || x === 15) && (y === 0 || y === 21)) continue;
        let c = borde ? 0x1a0e08 : tonos[x - 1];
        if (!borde && [5, 6, 15, 16].includes(y)) c = y % 5 === 0 ? 0xc87a40 : 0x3a160a;
        if (!borde && y <= 2) c = y === 1 ? 0xd88a50 : 0x5a2410;
        px(x, y, c);
      }
    }
    [[4, 9], [10, 12], [6, 18], [11, 3], [3, 14]].forEach(([x, y]) => px(x, y, 0x3a2a14, 2, 1));
  });
  // Plátano del Chapare.
  texturaPixeles(escena, 'cueva_platano', [
    '........kk',
    '.......kgk',
    '......kyk.',
    '.....kyyk.',
    'k...kyyyk.',
    'kykkyyyyk.',
    '.kyyyyyk..',
    '..kkkkk...'
  ], { k: 0x3a2a08, y: 0xffd84a, g: 0x6a8a2a });
  texturaPixeles(escena, 'cueva_pluma', ['.lm', 'lmd', 'md.'], { l: 0xb07040, m: 0x7a3e1c, d: 0x3a1a0a });
  texturaPixeles(escena, 'cueva_astilla', ['lmmd', 'mddk'], { l: 0xb08a58, m: 0x7a5a36, d: 0x4e3820, k: 0x2a1c10 });
  if (!escena.textures.exists('cuevaGota')) {
    texturaPixeles(escena, 'cuevaGota', ['l', 'm', 'm', 'd'], { l: 0xdff0ff, m: 0x9ab8c8, d: 0x6a8898 });
  }
  // Onda del chillido: arcos concéntricos.
  const onda = escena.make.graphics({ add: false });
  onda.lineStyle(2, 0xd8c8ff, 1).strokeCircle(12, 12, 10);
  onda.lineStyle(1, 0xffffff, 0.8).strokeCircle(12, 12, 6);
  onda.generateTexture('cueva_onda', 24, 24);
  onda.destroy();
  // Helecho del frente (64x40): frondas curvas con foliolos.
  pixeles('cueva_helecho', 64, 40, (px) => {
    const colores = [0x1c3410, 0x2c5a1c, 0x4a8a2c];
    [-158, -132, -108, -86, -64, -42, -20].forEach((angulo, i) => {
      const largo = 20 + (i % 3) * 5 + (i === 3 ? 6 : 0);
      const a = Phaser.Math.DegToRad(angulo);
      const caida = (Math.cos(a) >= 0 ? 1 : -1) * 0.012;
      for (let t = 0; t < largo; t++) {
        const x = 32 + Math.cos(a) * t;
        const y = 39 + Math.sin(a) * t + t * t * 0.02;
        px(Math.round(x), Math.round(y), colores[0]);
        if (t > 2 && t % 2 === 0) {
          const hoja = Math.max(1, Math.round((1 - t / largo) * 5));
          const nx = -Math.sin(a);
          const ny = Math.cos(a);
          for (let h = 1; h <= hoja; h++) {
            const c = colores[h === 1 ? 1 : 2 - (t % 4 === 0 ? 1 : 0)];
            px(Math.round(x + nx * h), Math.round(y + ny * h + h * 0.4), c);
            px(Math.round(x - nx * h), Math.round(y - ny * h + h * 0.4), c);
          }
        }
        if (caida && t === largo - 1) px(Math.round(x), Math.round(y) + 1, colores[1]);
      }
    });
  });
  // Liana con musgo que cuelga del techo (10x90).
  pixeles('cueva_liana', 10, 90, (px) => {
    for (let y = 0; y < 90; y++) {
      const x = Math.round(5 + Math.sin(y * 0.12) * 2);
      px(x, y, 0x2a3a14);
      if (y % 5 === 0) px(x + (y % 10 ? 1 : -2), y, 0x4a7a24, 2, 2);
      if (y % 9 === 0) px(x - 1, y + 1, 0x6a9a34);
    }
  });
  // Niebla (canvas 256x64, se repite a lo ancho): manchas suaves.
  const niebla = escena.textures.createCanvas('cueva_niebla', 256, 64);
  const ctx = niebla.getContext();
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 256;
    const y = 24 + Math.random() * 30;
    const r = 18 + Math.random() * 26;
    [x - 256, x, x + 256].forEach((cx) => {
      const gr = ctx.createRadialGradient(cx, y, 0, cx, y, r);
      gr.addColorStop(0, 'rgba(170,190,180,0.35)');
      gr.addColorStop(1, 'rgba(170,190,180,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(cx - r, y - r, r * 2, r * 2);
    });
  }
  niebla.refresh();
  // Techo: negro arriba que se aclara hacia abajo (sobre el borde de la imagen).
  const techo = escena.textures.createCanvas('cueva_techo', 4, 64);
  const t = techo.getContext();
  const gr = t.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(4,3,6,1)');
  gr.addColorStop(0.55, 'rgba(4,3,6,0.85)');
  gr.addColorStop(1, 'rgba(4,3,6,0)');
  t.fillStyle = gr;
  t.fillRect(0, 0, 4, 64);
  techo.refresh();
}

// Charco de agua (canvas): agua oscura y quieta que refleja la luz fría de
// la cueva (un poco más clara hacia el centro, con un reflejo difuso y una
// línea fina de brillo), rodeada de tierra mojada que se funde con el piso.
// Bordes irregulares (no una elipse perfecta) y alfa suave en el contorno.
function texturaCharco(escena, clave, ancho) {
  const alto = 14;
  const t = escena.textures.createCanvas(clave, ancho, alto);
  const ctx = t.getContext();
  const img = ctx.createImageData(ancho, alto);
  const borde = (x) => 1 + Math.sin(x * 0.19) * 0.07 + Math.sin(x * 0.47 + 1) * 0.05;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const dx = (x + 0.5 - ancho / 2) / (ancho / 2);
      const dy = (y + 0.5 - alto / 2) / (alto / 2);
      const d = dx * dx + dy * dy;
      const lim = borde(x);
      if (d > lim) continue;
      const i = (y * ancho + x) * 4;
      let c;
      if (d > lim * 0.7) {
        // Tierra mojada: oscura, se funde con el piso hacia afuera.
        const f = (lim - d) / (lim * 0.3);
        c = [22, 18, 12, Math.round(170 * f)];
      } else {
        const t2 = 1 - d / (lim * 0.7);
        // Agua: casi negra con un reflejo azul verdoso que se aclara al centro
        // y un poco arriba (la luz que entra de lejos).
        const luz = t2 * 0.7 + Math.max(0, -dy) * 0.3;
        c = [Math.round(14 + 34 * luz), Math.round(22 + 46 * luz), Math.round(28 + 56 * luz), 230];
        // Reflejo difuso de la luz y una línea fina de brillo.
        if (Math.abs(dy + 0.25) < 0.12 && Math.abs(dx) < 0.5) c = [120, 150, 160, 200];
        if (y === Math.floor(alto / 2) - 2 && Math.abs(dx - 0.15) < 0.22) c = [200, 225, 230, 230];
      }
      img.data.set(c, i);
    }
  }
  ctx.putImageData(img, 0, 0);
  t.refresh();
}

// -----------------------------------------------------------------------------
// Agua de la cueva (canvas, pixel art a x2). Todo se repite sin costura: las
// ondas usan senos con período del ancho (o alto) de la textura.
// -----------------------------------------------------------------------------

function lienzoPixeles(escena, clave, ancho, alto, pintar) {
  if (escena.textures.exists(clave)) return;
  const t = escena.textures.createCanvas(clave, ancho, alto);
  const ctx = t.getContext();
  const img = ctx.createImageData(ancho, alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const c = pintar(x, y);
      if (c) img.data.set(c, (y * ancho + x) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  t.refresh();
}

function texturasAgua(escena) {
  const TAU = Math.PI * 2;
  // Ruido parejo y repetible a partir de (x, y).
  const ruido = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  // Cascadas lejanas: tres chorros de distinto ancho; 64 px de alto que se repiten.
  const chorros = [[14, 7], [56, 4], [98, 10]];
  lienzoPixeles(escena, 'cuevaCascadas', 128, 64, (x, y) => {
    for (const [cx, w] of chorros) {
      const d = Math.abs(x - cx) / w;
      if (d > 1) continue;
      const veta = 0.5 + 0.5 * Math.sin((y / 64) * TAU * 2 + x * 1.7) * Math.sin(x * 2.3);
      const v = Math.round(150 + 90 * veta - 40 * d);
      return [v, Math.min(255, v + 15), 255, Math.round(255 * (1 - d * d) * (0.55 + 0.45 * veta))];
    }
    return null;
  });
  // Lago lejano: agua oscura con líneas de brillo.
  lienzoPixeles(escena, 'cuevaLago', 128, 20, (x, y) => {
    const ola = Math.sin((x / 128) * TAU * 3 + y * 0.9);
    const brillo = y > 1 && ola > 0.93 - y * 0.01 ? 70 : 0;
    const a = y === 0 ? 120 : 230;
    return [24 + brillo, 40 + brillo, 54 + brillo, a];
  });
  // La cascada del frente (un solo chorro, 14 px de ancho).
  lienzoPixeles(escena, 'cuevaCascada', 14, 64, (x, y) => {
    const d = Math.abs(x - 6.5) / 7;
    const veta = 0.5 + 0.5 * Math.sin((y / 64) * TAU * 3 + x * 1.3) * Math.sin(x * 1.9 + 1);
    const v = Math.round(150 + 100 * veta);
    const a = Math.round(255 * Math.max(0, 1 - d * d) * (0.35 + 0.65 * veta));
    return [v, Math.min(255, v + 8), Math.min(255, v + 24), a];
  });
  // Río: verde azulado oscuro, más hondo abajo, con vetas de corriente.
  lienzoPixeles(escena, 'cuevaRio', 128, 24, (x, y) => {
    const t = y / 23;
    const corriente = Math.sin((x / 128) * TAU * 2 + y * 0.7) * Math.sin((x / 128) * TAU * 5 - y * 0.4);
    let r = 26 - 14 * t;
    let g = 58 - 30 * t;
    let b = 66 - 28 * t;
    if (corriente > 0.55) { r += 14; g += 22; b += 22; }
    if (corriente < -0.7) { r -= 6; g -= 8; b -= 8; }
    if (y < 3 && ruido(x % 128, y) > 0.55) { r = 180; g = 210; b = 214; } // espuma en la orilla
    return [Math.max(0, r), Math.max(0, g), Math.max(0, b), 255];
  });
  // Reflejos sueltos (se mueven más rápido que el agua).
  lienzoPixeles(escena, 'cuevaRioBrillo', 128, 16, (x, y) => {
    const v = ruido(Math.floor(x / 5), y);
    return v > 0.94 && y % 3 === 0 ? [120, 180, 190, 255] : null;
  });
  // Orilla: borde mojado de piedra y tierra, irregular.
  lienzoPixeles(escena, 'cuevaOrilla', 128, 6, (x, y) => {
    const borde = 2 + Math.round(1.5 * Math.sin((x / 128) * TAU * 4) + Math.sin((x / 128) * TAU * 9 + 1));
    if (y < borde) return null;
    if (y === borde) return [92, 78, 58, 255];
    const piedra = ruido(Math.floor(x / 3), y) > 0.6;
    return piedra ? [62, 54, 44, 255] : [34, 28, 22, 255];
  });
  // Piedra del río: redonda, mojada (brillo arriba), con musgo.
  texturaPixeles(escena, 'cuevaRocaRio', [
    '....kkkkkk....',
    '..kkhhhhgkkk..',
    '.khhssssgggkk.',
    'khsssssggggmmk',
    'kgssggggggmmmk',
    '.kgggggggmmmk.',
    '..kkkkkkkkkk..'
  ], { k: 0x1a1612, h: 0xc8d4d8, s: 0x7a7468, g: 0x55504a, m: 0x3a5a34 });
}

// Punta de roca (estalactita) y escombros.
function texturasDerrumbe(escena) {
  if (!escena.textures.exists('cuevaPunta')) {
    const ancho = 14;
    const alto = 34;
    lienzoPixeles(escena, 'cuevaPunta', ancho, alto, (x, y) => {
      const medio = (ancho - 1) / 2;
      const w = Math.max(0.6, medio * Math.pow(1 - y / alto, 0.75));
      const d = (x - medio) / w;
      if (Math.abs(d) > 1) return null;
      if (Math.abs(d) > 0.78) return [40, 32, 24, 255];                // contorno
      const luz = d < -0.2 ? 30 : d > 0.35 ? -26 : 0;                  // luz desde la izquierda
      const veta = (y % 7 === 3 && Math.abs(d) < 0.6) ? -18 : 0;
      return [150 + luz + veta, 132 + luz + veta, 108 + luz + veta, 255];
    });
  }
  texturaPixeles(escena, 'cuevaEscombro', [
    '.kk.',
    'kssk',
    'ksgk',
    '.kk.'
  ], { k: 0x2a221a, s: 0xd8ccb8, g: 0x9a8c78 });
  texturaPixeles(escena, 'cuevaRestoPunta', [
    '.....kk.......',
    '..kk.ksk..kk..',
    '.kssk.kk.kssk.',
    'kssgskkkksggsk'
  ], { k: 0x2a221a, s: 0xb4a690, g: 0x857762 });
}
