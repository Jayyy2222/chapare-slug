// =============================================================================
// PELEA: modo de pelea aparte, al estilo Smash. Se elige en el menú (PELEA):
//   - CONTRA BOTS: el jugador contra PELEA.bots luchadores de la compu.
//   - EN LÍNEA: con las salas de Red.js (hasta 4 jugadores, cada uno en su
//     celular o compu). El anfitrión elige el modo al crear la sala.
//
// Reglas: cada golpe sube el % de daño; cuanto más %, más lejos te manda el
// siguiente. Se pierde una vida al salir de la pantalla (por los costados,
// por abajo o muy arriba). PELEA.vidas vidas; gana el último que queda.
//
// El mapa: una isla flotante (sólida), tablas flotantes (se atraviesan desde
// abajo y con ↓ se baja de ellas), dos losas que suben y bajan y bidones
// explosivos que flotan colgados de globos. Cada tanto cae en paracaídas una
// caja con un arma: se abre tocándola o a balazos (suelta el arma flotando).
//
// En línea cada uno mueve su luchador y manda lo que se ve de él (Red.js); el
// daño lo calcula el que recibe el golpe (con las balas de los demás que ve en
// su pantalla). Las cajas las tira el anfitrión; las losas y los bidones se
// mueven según la hora (iguales en todas las pantallas).
//
// Controles: ←/→ (A/D) caminar · ESPACIO saltar (dos veces) · ↑ (W) apuntar
// arriba · ↓ (S) bajar de una tabla o caer rápido · J/X disparar.
// =============================================================================

const PELEA = {
  vidas: 3,
  bots: 3,
  // Fuera de estos límites se pierde una vida (la pantalla es 1024 x 576).
  ko: { izq: -170, der: 1194, abajo: 700, arriba: -260 },
  isla: { x: 512, y: 462, ancho: 600 },           // y: el piso
  tablas: [{ x: 262, y: 300, ancho: 176 }, { x: 762, y: 300, ancho: 176 }, { x: 512, y: 168, ancho: 190 }],
  losas: [{ x: 84, y: 300, ancho: 124, dy: 105, periodo: 5600, fase: 0 }, { x: 940, y: 300, ancho: 124, dy: 105, periodo: 5600, fase: 0.5 }],
  bidones: [{ x: 300, y: 92, dx: 80, dy: 16, periodo: 9000, fase: 0 }, { x: 724, y: 92, dx: 80, dy: 16, periodo: 9000, fase: 0.5 }],
  bidon: { golpes: 3, radio: 125, vuelve: 9000 },
  aparece: { x: 512, y: 60 },
  velocidad: 250,
  salto: 690,
  saltoAire: 610,
  caidaMaxima: 1100,
  // Empuje de un golpe: (base + % x porPct) x el multiplicador del arma.
  empuje: { base: 170, porPct: 7.5 },
  reaparece: 1500,      // ms fuera hasta volver
  invulnerable: 2200,   // ms parpadeando al volver
  cajas: { primera: 5000, cada: [8000, 13000], max: 2, golpes: 2, municion: 0.5 },
  cuenta: 2400          // 3, 2, 1, ¡PELEA!
};

// Por arma: [% de daño, multiplicador del empuje]. 'bidon' es la explosión del bidón.
const DANO_PELEA = {
  pistola: [3, 0.32], ak47: [3, 0.36], ametralladora: [2, 0.28], escopeta: [13, 1.1], lanzacohetes: [18, 1.35],
  lanzagranadas: [15, 1.2], lanzallamas: [1.5, 0.2], machete: [11, 1], bidon: [16, 1.3]
};

// Las armas que pueden venir en las cajas.
const ARMAS_PELEA = ['ak47', 'ametralladora', 'escopeta', 'lanzacohetes', 'lanzagranadas', 'lanzallamas', 'machete'];

const COLORES_PELEA = [0xffd23f, 0x5ac8ff, 0xff6a5a, 0x7ae070];

// -----------------------------------------------------------------------------
// Un luchador: el sprite con física (invisible, con su cuerpo de
// CuerpoModular encima) y lo que necesita para pelear. Lo maneja
// el teclado (el jugador) o pensarBot (los de la compu). `control` son las
// teclas de este cuadro.
// -----------------------------------------------------------------------------
class Luchador {
  constructor(escena, datos) {
    const { x: x0, y: y0, ...resto } = datos;
    Object.assign(this, resto); // id, numero, nombre, personaje, color, bot
    this.escena = escena;
    this.pct = 0;
    this.vidas = PELEA.vidas;
    this.arma = 'pistola';
    this.municion = Infinity;
    this.saltosAire = 1;
    this.aturdidoHasta = 0;
    this.invulnerableHasta = 0;
    this.proximoDisparo = 0;
    this.disparandoHasta = 0;
    this.bajandoHasta = 0;
    this.sobreTablaEn = -Infinity;
    this.rojoHasta = 0;
    this.esperando = false; // fuera de la pantalla, por volver
    this.fuera = false;     // sin vidas
    this.eliminaciones = 0;
    this.control = {};
    this.ia = { proxima: 0, objetivo: null };

    const tuto = PERSONAJES_MODULARES.includes(this.personaje);
    if (tuto) texturaBaseTuto(escena); // CuerpoModular.js
    const s = escena.grupoLuchadores.create(x0, y0, tuto ? 'jugadorTuto' : 'jugadorManfred', 0);
    s.setScale(ESCALA).setDepth(10 + datos.numero * 0.01);
    fisicaJugador(s); // Jugador.js: caja, gravedad
    s.body.setMaxVelocity(4000, PELEA.caidaMaxima);
    s.setData('luchador', this);
    this.sprite = s;

    // CuerpoModular y colocarArma leen todo de "la escena": cada luchador tiene
    // la suya (hereda de la escena de verdad) con su sprite, su arma y su pose.
    const v = Object.create(escena);
    Object.assign(v, {
      jugador: s, rampaActual: null, enPendienteAntes: false, trepando: null, aturdido: null, recuperandoHasta: 0,
      muerto: false, agachado: false, apuntaArriba: false, apuntaDiagonal: false, disparandoHasta: 0, tajoHasta: 0
    });
    v.registry = { get: (k) => (k === 'arma' ? this.arma : k === 'personaje' ? this.personaje : undefined), set() {} };
    this.vista = v;
    this.cuerpo = new CuerpoModular(v, CUERPOS[this.personaje] ? this.personaje : 'manfred');

    const hex = '#' + this.color.toString(16).padStart(6, '0');
    this.etiqueta = escena.add.text(0, 0, this.bot ? `CPU${this.numero}` : `J${this.numero}`, {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: hex, stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(26);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.body.center.y; }
  get lado() { return this.sprite.flipX ? -1 : 1; }
  get enJuego() { return !this.esperando && !this.fuera; }

  enSuelo() {
    const b = this.sprite.body;
    return b.blocked.down || b.touching.down;
  }

  // Esconde o muestra todo lo que se dibuja de él.
  mostrar(si) {
    const s = this.sprite;
    s.body.enable = si;
    this.vista.jugador = si ? s : null; // sin jugador, CuerpoModular no hace nada
    if (this.cuerpo.creado) this.cuerpo.partes().forEach((p) => p.setVisible(false));
    this.etiqueta.setVisible(si);
  }

  destruir() {
    this.etiqueta.destroy();
  }
}

class Arena extends Phaser.Scene {
  constructor() {
    super('Arena');
  }

  preload() {
    if (!this.textures.exists('jugadorManfred')) { // el sprite con física de Manfred (invisible)
      this.load.spritesheet('jugadorManfred', 'assets/personajes/jugador/manfred_sheet_calido.png', { frameWidth: 84, frameHeight: 84 });
    }
    cargarCuerpos(this); // CuerpoModular.js (carga solo lo que falta)
    if (!this.textures.exists('cajaArmas')) cargarArmas(this);
    cargarSfxArmas(this); // Armas.js (solo lo que falta)
    if (!this.textures.exists('vfx_cohete')) cargarEfectos(this);
    if (!this.textures.exists('selvaFondo')) this.load.image('selvaFondo', 'assets/fondos/lvl1/selva_fondo_288_calido.png');
    cargarMusica(this, 'nivel1');
  }

  create() {
    const { width, height } = this.scale;
    this.enLinea = RED.enSala();
    this.miId = this.enLinea ? RED.sala.id : 'yo';
    this.inicio = this.time.now;
    this.bloqueado = true;   // hasta ¡PELEA!
    this.terminado = false;
    this.sinPausa = false;
    this.muerto = false;
    this.proximaId = 1;
    this.proximaCaja = this.time.now + PELEA.cajas.primera;
    this.physics.world.setBounds(-2000, -2000, width + 4000, height + 4000);
    // Lo que quedó de una pelea anterior (revancha) no cuenta.
    RED.remotos.forEach((r) => { r.estado = null; });

    texturasEfectos(this);     // fx_bala, fx_chispa... (EfectosMenu.js)
    animacionesEfectos(this);  // cohete, llamarada, explosiones (Efectos.js)
    animacionesCaja(this);     // Armas.js
    animacionesCuerpos(this);  // corta las hojas de Tuto y Manfred
    texturasSelector(this);    // 'armaPistola'
    this.texturasArena();

    this.crearFondo();
    this.crearMapa();
    this.balas = this.physics.add.group({ allowGravity: false });
    this.grupoLuchadores = this.physics.add.group();
    this.cajas = [];
    this.armasSueltas = [];
    this.crearLuchadores();
    this.crearColisiones();
    this.crearHUD();

    this.teclas = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,J,X,ENTER');
    this.input.keyboard.on('keydown-ENTER', () => this.revancha());
    this.input.keyboard.on('keydown-ESC', () => { if (this.terminado) this.salir(); });

    tocarMusica(this, 'nivel1');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cuentaRegresiva();
    this.events.once('shutdown', () => this.luchadores.forEach((l) => l.destruir()));
  }

  // ---------------------------------------------------------------------------
  // Texturas dibujadas acá (isla, tablas, losas, bidón con globo, paracaídas)
  // ---------------------------------------------------------------------------
  texturasArena() {
    const hacer = (clave, ancho, alto, dibujar) => {
      if (this.textures.exists(clave)) return;
      const g = this.make.graphics({ add: false });
      dibujar(g);
      g.generateTexture(clave, ancho, alto);
      g.destroy();
    };
    const azar = new Phaser.Math.RandomDataGenerator(['arena']);
    const ancho = PELEA.isla.ancho;

    // La isla: pasto arriba y una roca que se angosta hacia abajo.
    hacer('arenaIsla', ancho, 190, (g) => {
      g.fillStyle(0x5a3d26).fillPoints([
        { x: 0, y: 12 }, { x: ancho, y: 12 }, { x: ancho - 34, y: 60 }, { x: ancho - 110, y: 120 },
        { x: ancho / 2 + 70, y: 176 }, { x: ancho / 2 - 20, y: 190 }, { x: ancho / 2 - 90, y: 160 }, { x: 120, y: 118 }, { x: 30, y: 58 }
      ], true);
      g.fillStyle(0x6e4c30).fillPoints([{ x: 8, y: 12 }, { x: ancho - 8, y: 12 }, { x: ancho - 40, y: 50 }, { x: 36, y: 50 }], true);
      for (let i = 0; i < 70; i++) {
        const x = azar.between(40, ancho - 40);
        const y = azar.between(24, 40 + (1 - Math.abs(x - ancho / 2) / (ancho / 2)) * 120);
        g.fillStyle(azar.pick([0x8a7a66, 0x4a3220, 0x7b6650, 0x3c2818])).fillRect(x, y, azar.between(4, 12), azar.between(3, 7));
      }
      g.fillStyle(0x3f2a18);
      for (let y = 30; y < 150; y += 22) g.fillRect(ancho / 2 - (150 - y) * 1.6, y, (150 - y) * 3.2, 2);
      g.fillStyle(0x3e7a24).fillRect(0, 0, ancho, 14);
      g.fillStyle(0x6fb83a).fillRect(0, 0, ancho, 5);
      g.fillStyle(0x9ad85a).fillRect(0, 0, ancho, 2);
      g.fillStyle(0x3e7a24);
      for (let x = 4; x < ancho - 4; x += 9) g.fillTriangle(x, 13, x + 7, 13, x + 3, 13 + azar.between(4, 14));
    });

    // Tablas de madera con musgo.
    PELEA.tablas.forEach(({ ancho: a }) => hacer('arenaTabla' + a, a, 22, (g) => {
      g.fillStyle(0x3e2412).fillRect(0, 4, a, 18);
      g.fillStyle(0x7a4e2a).fillRect(0, 4, a, 14);
      g.fillStyle(0x9c6a3a).fillRect(0, 4, a, 3);
      g.fillStyle(0x5a361c);
      for (let x = 30; x < a; x += 32) g.fillRect(x, 4, 2, 14);
      g.fillStyle(0xc9b28a);
      for (let x = 8; x < a; x += 32) { g.fillRect(x, 9, 2, 2); g.fillRect(x + 14, 9, 2, 2); }
      g.fillStyle(0x5d9a35);
      for (let x = 0; x < a; x += azar.between(6, 16)) g.fillRect(x, azar.between(1, 3), azar.between(5, 12), 4);
    }));

    // Losas de piedra con runas que brillan.
    PELEA.losas.forEach(({ ancho: a }) => hacer('arenaLosa' + a, a, 26, (g) => {
      g.fillStyle(0x3d3f46).fillRect(0, 2, a, 24);
      g.fillStyle(0x7d7f86).fillRect(0, 2, a, 18);
      g.fillStyle(0xa6a8b0).fillRect(0, 2, a, 3);
      g.fillStyle(0x56585f).fillRect(a * 0.3, 6, 2, 10).fillRect(a * 0.62, 8, 2, 9);
      g.fillStyle(0x46d2d2);
      for (let x = 12; x < a - 8; x += 22) g.fillRect(x, 12, 6, 2).fillRect(x + 2, 10, 2, 6);
    }));

    // Bidón rojo colgado de un globo.
    hacer('arenaBidon', 34, 86, (g) => {
      g.fillStyle(0x2a7fc0).fillEllipse(17, 15, 28, 30);
      g.fillStyle(0x5ab4ec).fillEllipse(12, 10, 9, 11);
      g.fillStyle(0xffffff).fillRect(9, 6, 3, 3);
      g.fillStyle(0x1a5a8a).fillTriangle(14, 29, 20, 29, 17, 33);
      g.lineStyle(1, 0xd8d0b8).lineBetween(17, 33, 17, 48);
      g.fillStyle(0x6a1a12).fillRect(4, 48, 26, 38);
      g.fillStyle(0xb8322a).fillRect(6, 48, 22, 38);
      g.fillStyle(0xd85a42).fillRect(8, 48, 4, 38);
      g.fillStyle(0x5a1a14).fillRect(4, 54, 26, 3).fillRect(4, 76, 26, 3);
      g.fillStyle(0xf2c230).fillRect(6, 61, 22, 11);
      g.fillStyle(0x1a1a1a).fillTriangle(17, 62, 12, 71, 22, 71);
      g.fillStyle(0xf2c230).fillRect(16, 65, 2, 3);
    });

    // Paracaídas de rayas.
    hacer('arenaParacaidas', 76, 56, (g) => {
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? 0xe9e1c8 : 0xc0392b);
        g.slice(38, 24, 36, Phaser.Math.DegToRad(180 + i * 30), Phaser.Math.DegToRad(210 + i * 30), false).fillPath();
      }
      g.fillStyle(0x7a1f16).fillRect(2, 23, 72, 3);
      g.lineStyle(1, 0x2a2a2a);
      [4, 20, 38, 56, 72].forEach((x) => g.lineBetween(x, 25, 38, 56));
    });
  }

  crearFondo() {
    const { width, height } = this.scale;
    const fondo = this.add.image(width / 2, 0, 'selvaFondo').setOrigin(0.5, 0).setScale(height / 288).setDepth(0);
    fondo.setTint(0xb8b0a0);
    // Abajo, el vacío: se oscurece hacia el fondo de la pantalla.
    for (let i = 0; i < 8; i++) {
      this.add.rectangle(0, height - 150 + i * 20, width, 20, 0x0a0806, 0.08 + i * 0.09).setOrigin(0).setDepth(0.5);
    }
    // Luciérnagas.
    this.add.particles(0, 0, 'fx_chispa', {
      x: { min: 0, max: width }, y: { min: 40, max: height - 60 }, lifespan: 4000, speedY: { min: -18, max: -6 },
      speedX: { min: -10, max: 10 }, alpha: { start: 0.7, end: 0 }, scale: { start: 1.6, end: 0.6 }, frequency: 260,
      blendMode: 'ADD'
    }).setDepth(0.8);
  }

  // ---------------------------------------------------------------------------
  // Mapa: isla (sólida), tablas (de un solo sentido), losas que se mueven y
  // bidones flotantes.
  // ---------------------------------------------------------------------------
  crearMapa() {
    const I = PELEA.isla;
    this.add.image(I.x, I.y, 'arenaIsla').setOrigin(0.5, 0).setDepth(5);
    this.solido = this.physics.add.staticGroup();
    const piso = this.add.rectangle(I.x, I.y + 20, I.ancho, 40).setVisible(false);
    this.solido.add(piso);

    this.tablas = this.physics.add.staticGroup();
    PELEA.tablas.forEach((t) => {
      this.add.image(t.x, t.y - 4, 'arenaTabla' + t.ancho).setOrigin(0.5, 0).setDepth(5);
      this.tablas.add(this.add.rectangle(t.x, t.y + 8, t.ancho, 16).setVisible(false));
    });

    this.losas = PELEA.losas.map((d) => {
      const losa = this.physics.add.image(d.x, d.y, 'arenaLosa' + d.ancho).setOrigin(0.5, 0.1).setDepth(5);
      losa.body.setAllowGravity(false).setImmovable(true).setSize(d.ancho, 18).setOffset(0, 2);
      losa.setData('datos', d);
      return losa;
    });
    this.moverLosas(16, true);

    this.bidones = PELEA.bidones.map((d, i) => {
      const img = this.add.image(d.x, d.y, 'arenaBidon').setOrigin(0.5, 0).setScale(1.2).setDepth(6);
      return { i, d, img, golpes: 0, activo: true };
    });
  }

  // Posición según la hora (igual en todas las pantallas de una sala).
  onda(periodo, fase) {
    return Math.sin(((Date.now() / periodo) + fase) * Math.PI * 2);
  }

  moverLosas(delta, saltar = false) {
    this.losas.forEach((losa) => {
      const d = losa.getData('datos');
      const y = d.y + this.onda(d.periodo, d.fase) * d.dy;
      if (saltar) { losa.setY(y); return; }
      losa.body.setVelocityY((y - losa.y) / (delta / 1000));
    });
  }

  moverBidones() {
    this.bidones.forEach((b) => {
      const { d } = b;
      b.img.setPosition(d.x + this.onda(d.periodo, d.fase) * d.dx, d.y + this.onda(d.periodo / 2.3, d.fase + 0.25) * d.dy);
      b.img.setAngle(this.onda(d.periodo / 3, d.fase) * 6);
    });
  }

  // El centro del bidón (para las balas y la explosión).
  centroBidon(b) {
    return { x: b.img.x, y: b.img.y + 66 * 1.2 };
  }

  // ---------------------------------------------------------------------------
  // Luchadores
  // ---------------------------------------------------------------------------
  crearLuchadores() {
    const yo = {
      id: this.miId, nombre: this.registry.get('nombreJugador') || 'J1',
      personaje: CUERPOS[this.registry.get('personaje')] ? this.registry.get('personaje') : 'manfred', bot: false
    };
    // Los participantes: en línea, los de la sala; si no, yo y los bots.
    if (this.enLinea) {
      this.participantes = RED.sala.jugadores.slice().sort((a, b) => a.numero - b.numero)
        .map((j) => ({ id: j.id, numero: j.numero, nombre: j.nombre, personaje: j.personaje, local: j.id === this.miId }));
    } else {
      this.participantes = [{ ...yo, numero: 1, local: true }];
      for (let i = 0; i < PELEA.bots; i++) {
        this.participantes.push({ id: 'cpu' + i, numero: i + 2, nombre: 'CPU', personaje: Phaser.Utils.Array.GetRandom(Object.keys(CUERPOS)), bot: true, local: true });
      }
    }
    const n = this.participantes.length;
    this.luchadores = [];
    this.participantes.forEach((p, i) => {
      p.color = COLORES_PELEA[(p.numero - 1) % COLORES_PELEA.length];
      if (!p.local) return;
      const I = PELEA.isla;
      const x = I.x - I.ancho / 2 + 70 + (I.ancho - 140) * (n > 1 ? i / (n - 1) : 0.5);
      const l = new Luchador(this, { ...p, personaje: p.id === this.miId ? yo.personaje : p.personaje, x, y: I.y - 70 });
      l.sprite.setFlipX(x > I.x);
      this.luchadores.push(l);
    });
    this.yo = this.luchadores.find((l) => l.id === this.miId);
    // Lo que manda Red.js de mí: mi sprite y su cuerpo (con el arma).
    this.jugador = this.yo.sprite;
    this.cuerpoModular = this.yo.cuerpo;
    this.armaLarga = null;
  }

  crearColisiones() {
    const G = this.grupoLuchadores;
    this.physics.add.collider(G, this.solido);
    const deUnSentido = (cuerpo, plataforma, alPisar) => {
      const b = cuerpo.body;
      const p = plataforma.body;
      if (b.velocity.y < p.velocity.y - 5) return false;
      if (b.prev.y + b.height > p.top + 14) return false;
      return alPisar ? alPisar() : true;
    };
    const pisa = (a, b) => {
      // Phaser a veces pasa los dos al revés (grupo contra lista de losas).
      const [spr, plat] = a.getData && a.getData('luchador') ? [a, b] : [b, a];
      const l = spr.getData('luchador');
      return deUnSentido(spr, plat, () => {
        if (this.time.now < l.bajandoHasta) return false;
        l.sobreTablaEn = this.time.now;
        return true;
      });
    };
    this.physics.add.collider(G, this.tablas, null, pisa);
    this.physics.add.collider(G, this.losas, null, pisa);
    this.deUnSentido = deUnSentido;

    // Balas contra la isla: se frenan (las que explotan, explotan).
    this.physics.add.collider(this.balas, this.solido, (bala) => this.impacto(bala));
    this.physics.add.overlap(this.balas, G, (bala, spr) => this.balaLuchador(bala, spr.getData('luchador')));
  }

  // ---------------------------------------------------------------------------
  // Cuadro a cuadro
  // ---------------------------------------------------------------------------
  update(time, delta) {
    // Truco secreto: escribir "vida" (Admin.js) prende la inmunidad: no recibe
    // daño ni pierde vidas al caerse.
    this.yo.inmune = !!this.registry.get('inmune');
    this.moverLosas(delta);
    this.moverBidones();
    this.leerTeclado();
    this.luchadores.forEach((l) => {
      if (l.bot && l.enJuego) this.pensarBot(l, time);
      this.moverLuchador(l, time, delta);
      this.animarLuchador(l, time);
    });
    this.revisarBalas(time);
    this.revisarCajas(time);
    this.actualizarHUD();
    if (!this.terminado) this.revisarGanador();
  }

  leerTeclado() {
    const t = this.teclas;
    const c = this.yo.control;
    c.izq = t.LEFT.isDown || t.A.isDown;
    c.der = t.RIGHT.isDown || t.D.isDown;
    c.arriba = t.UP.isDown || t.W.isDown;
    c.abajo = t.DOWN.isDown || t.S.isDown;
    c.bajar = Phaser.Input.Keyboard.JustDown(t.DOWN) || Phaser.Input.Keyboard.JustDown(t.S);
    c.saltar = Phaser.Input.Keyboard.JustDown(t.SPACE);
    c.disparar = t.J.isDown || t.X.isDown;
  }

  moverLuchador(l, ahora, delta) {
    if (!l.enJuego) return;
    const s = l.sprite;
    const b = s.body;
    const c = l.control;
    const enSuelo = l.enSuelo();
    if (enSuelo) l.saltosAire = 1;
    const aturdido = ahora < l.aturdidoHasta;
    const k = delta / 1000;

    if (aturdido || this.bloqueado) {
      // Despedido: el empuje se va frenando de a poco (en el piso, rápido).
      b.velocity.x *= enSuelo ? Math.pow(0.02, k) : Math.pow(0.45, k);
    } else {
      const dir = (c.der ? 1 : 0) - (c.izq ? 1 : 0);
      const objetivo = dir * PELEA.velocidad;
      if (enSuelo) {
        b.setVelocityX(objetivo);
      } else {
        // En el aire: se puede corregir, pero si viene volando rápido cuesta más.
        const fuerza = Math.abs(b.velocity.x) > PELEA.velocidad * 1.2 ? 2.2 : 9;
        b.velocity.x += (objetivo - b.velocity.x) * Math.min(1, fuerza * k);
      }
      if (dir) s.setFlipX(dir < 0);
      else if (c.mirar) s.setFlipX(c.mirar < 0);
      if (c.saltar) {
        if (enSuelo) {
          b.setVelocityY(-PELEA.salto);
        } else if (l.saltosAire > 0) {
          l.saltosAire--;
          b.setVelocityY(-PELEA.saltoAire);
          this.polvo(s.x, b.bottom);
        }
      }
      // ↓: baja de la tabla; en el aire, cae más rápido.
      if (c.bajar && enSuelo && ahora - l.sobreTablaEn < 120) l.bajandoHasta = ahora + 260;
      if (c.abajo && !enSuelo && b.velocity.y > -60) b.setVelocityY(Math.max(b.velocity.y, 650));
      // ↑ caminando: en diagonal (si su cuerpo tiene ese torso).
      l.apuntaDiagonal = !!c.arriba && Math.abs(b.velocity.x) > 5 && !!l.cuerpo.c.anims.diagonal;
      l.apuntaArriba = !!c.arriba && !l.apuntaDiagonal;
      if (c.disparar && ahora >= l.proximoDisparo) this.disparar(l);
    }
    c.saltar = false;
    c.bajar = false;

    // Parpadeo al volver y el rojo del golpe (CuerpoModular los copia).
    s.setAlpha(ahora < l.invulnerableHasta ? (Math.floor(ahora / 80) % 2 ? 0.35 : 1) : 1);
    if (ahora < l.rojoHasta) s.setTint(0xff7060); else s.clearTint();

    // Fuera de la pantalla: pierde una vida.
    const K = PELEA.ko;
    if (s.x < K.izq || s.x > K.der || s.y > K.abajo || s.y < K.arriba) this.ko(l);
  }

  // Lo dibuja CuerpoModular con lo que dice la "vista" del luchador.
  animarLuchador(l, ahora) {
    if (!l.enJuego) return;
    const s = l.sprite;
    const b = s.body;
    const aturdido = ahora < l.aturdidoHasta;
    const v = l.vista;
    v.apuntaArriba = l.apuntaArriba && !aturdido;
    v.apuntaDiagonal = l.apuntaDiagonal && !aturdido;
    v.disparandoHasta = l.disparandoHasta;
    v.recuperandoHasta = aturdido ? l.aturdidoHasta : 0;

    // El inmune brilla dorado.
    if (l.inmune && ahora >= l.rojoHasta && ahora >= l.invulnerableHasta) s.setTint(Math.floor(ahora / 150) % 2 ? 0xffe680 : 0xfff6c0);
    const top = (l.cuerpo.creado && l.cuerpo.torso.visible) ? Math.min(b.top, l.cuerpo.torso.getBounds().top) : s.getBounds().top + 10 * ESCALA;
    const W = this.scale.width;
    let texto = l.bot ? `CPU${l.numero}` : `J${l.numero}`;
    let ex = s.x;
    let ey = top - 6;
    if (s.y < 30) { texto = `▲${texto}`; ey = 24; }
    if (s.x < 16) { texto = `◀${texto}`; ex = 40; }
    if (s.x > W - 16) { texto = `${texto}▶`; ex = W - 40; }
    l.etiqueta.setText(texto).setPosition(ex, ey);
  }

  // Punta del arma en la pantalla.
  boca(l) {
    return l.cuerpo.boca || { x: l.x + l.lado * 24, y: l.y - 20 };
  }

  // ---------------------------------------------------------------------------
  // Disparos (como Jugador.disparar, pero de cualquier luchador)
  // ---------------------------------------------------------------------------
  disparar(l) {
    const arma = ARMAS[l.arma];
    const ahora = this.time.now;
    const lado = l.lado;
    const elevacion = l.apuntaArriba ? 90 : l.apuntaDiagonal ? 45 : 0;
    const { x, y } = this.boca(l);
    l.proximoDisparo = ahora + arma.cadencia;
    l.disparandoHasta = ahora + DISPARO.pose;
    sonarArma(this, l.arma, l.id); // Armas.js
    if (arma.tipo === 'cuerpo') {
      // Machete: un tajo delante.
      const px = l.x + lado * arma.alcance * 0.75;
      const py = l.y - 10;
      l.vista.tajoHasta = ahora + 160;
      const fx = { nombre: 'tajo', x: px, y: py, escala: metros(1.1) / EFECTOS.tajo.alto, espejo: lado < 0, angulo: 0 };
      this.golpeEnArea(l.id, l.arma, [[px, py, arma.alcance * 0.65]], lado, fx);
    } else if (arma.tipo === 'onda') {
      // Escopeta: el fogonazo lastima todo lo que cubre.
      const largo = metros(arma.alcance);
      const fx = { nombre: 'escopetazo', x, y, escala: largo / EFECTOS.escopetazo.ancho, ...fxEscopetazo(lado, elevacion) };
      const rad = Phaser.Math.DegToRad(anguloDisparo(lado, elevacion));
      const puntos = [0.25, 0.55, 0.85].map((t) => [x + Math.cos(rad) * largo * t, y + Math.sin(rad) * largo * t, largo * (0.12 + t * 0.25)]);
      this.golpeEnArea(l.id, l.arma, puntos, elevacion === 90 ? 0 : lado, fx);
      this.cameras.main.shake(70, 0.003);
    } else {
      const angulo = anguloDisparo(lado, elevacion) + Phaser.Math.FloatBetween(-1, 1) * (arma.dispersion || 0);
      this.crearBala(l, arma, x, y, angulo);
      const rad = Phaser.Math.DegToRad(angulo);
      if (arma.tipo !== 'llama') fogonazo(this, x + Math.cos(rad) * 6, y + Math.sin(rad) * 6, arma.tipo === 'bala' ? 1.2 : 1.8, 10.3, angulo);
      if (arma.tipo === 'bala') casquillo(this, l.x + lado * 10, y - 4, 10.1);
    }
    if (l.municion !== Infinity) {
      l.municion--;
      if (l.municion <= 0) {
        l.arma = 'pistola';
        l.municion = Infinity;
        TextFX.popup(this, l.x, l.y - 70, '¡SIN BALAS!', { color: 'rojo', escala: 1, subir: 30 }).setDepth(30);
      }
    }
  }

  crearBala(l, arma, x, y, angulo) {
    const rad = Phaser.Math.DegToRad(angulo);
    const tipo = arma.tipo;
    const { textura } = PROYECTILES[arma.proyectil];
    const escala = escalaProyectil(arma.proyectil);
    const bala = this.balas.create(x, y, textura, 0).setDepth(10.2).setAngle(angulo).setScale(escala);
    this.prepararBala(bala, tipo, Math.abs(Math.sin(rad)) > 0.7);
    bala.setVelocity(Math.cos(rad) * arma.velocidad, Math.sin(rad) * arma.velocidad);
    const vida = tipo === 'granada' ? arma.alcance : arma.alcance / arma.velocidad * 1000;
    bala.setData({ tipo, arma: l.arma, duenio: l.id, hasta: this.time.now + vida });
    if (tipo === 'granada') {
      bala.body.setAllowGravity(true);
      if (Math.abs(Math.sin(rad)) < 0.7) bala.setVelocityY(-arma.velocidad * 0.45);
      bala.setAngularVelocity(Math.cos(rad) < 0 ? -540 : 540);
    }
    if (tipo === 'llama') this.tweens.add({ targets: bala, scale: escala * 2.4, alpha: 0.2, duration: vida });
    // Las de los bots no salen a la red (no hay bots en línea).
    if (l.bot) bala.setData('red', true);
    return bala;
  }

  prepararBala(bala, tipo, vertical) {
    if (tipo === 'bala' || tipo === 'llama') bala.setBlendMode(Phaser.BlendModes.ADD);
    const [largo, grueso] = { bala: [PROYECTILES.traza.largo * 0.8, 4], cohete: [32, 9], granada: [14, 14], llama: [40, 24] }[tipo] || [10, 4];
    bala.body.setSize(vertical ? grueso : largo, vertical ? largo : grueso);
    if (tipo === 'cohete') bala.play('vfx_cohete');
    if (tipo === 'llama') bala.play('vfx_llamarada');
  }

  // Una bala de otro jugador (Red.js la manda acá): se ve y, si me pega, me lastima.
  disparoRemoto(m) {
    if (!this.textures.exists(m.k)) return;
    const tipo = m.tp || 'bala';
    const bala = this.balas.create(m.x, m.y, m.k, m.f).setRotation(m.r).setScale(m.sx, m.sy).setFlipX(!!m.fx).setDepth(10.2);
    this.prepararBala(bala, tipo, Math.abs(m.vy) > Math.abs(m.vx));
    bala.setVelocity(m.vx, m.vy);
    bala.body.setAllowGravity(!!m.g);
    if (tipo === 'granada') bala.setAngularVelocity(m.vx < 0 ? -540 : 540);
    bala.setData({ tipo, arma: ARMAS[m.ar] ? m.ar : 'pistola', duenio: m.de, hasta: this.time.now + (m.h || 1200), red: true, remota: true });
    sonarArma(this, bala.getData('arma'), m.de); // el tiro del otro jugador también se oye
    if (tipo === 'llama') this.tweens.add({ targets: bala, scale: m.sx * 2.4, alpha: 0.2, duration: m.h || 600 });
  }

  // Balas vencidas, fuera del mapa, contra los bidones, las cajas y (en línea)
  // contra los dibujos de los demás jugadores.
  revisarBalas(ahora) {
    this.balas.getChildren().slice().forEach((bala) => {
      if (!bala.active) return;
      if (ahora > bala.getData('hasta') || bala.y > 900 || bala.x < -400 || bala.x > 1424) {
        if (EXPLOSIVOS.includes(bala.getData('tipo')) && bala.y < 700) this.explotar(bala);
        else bala.destroy();
        return;
      }
      const remota = bala.getData('remota');
      // Bidones (solo cuentan las mías y las de los bots: las de los demás las cuenta su dueño).
      for (const b of this.bidones) {
        if (!b.activo) continue;
        const c = this.centroBidon(b);
        if (Math.abs(bala.x - c.x) < 22 && Math.abs(bala.y - c.y) < 26) {
          if (!remota) this.golpearBidon(b, bala.getData('duenio'), EXPLOSIVOS.includes(bala.getData('tipo')));
          this.impacto(bala);
          return;
        }
      }
      // Cajas.
      for (const caja of this.cajas) {
        if (caja.abierta || !caja.sprite.body) continue;
        const r = caja.sprite.body;
        if (bala.x > r.left && bala.x < r.right && bala.y > r.top - 6 && bala.y < r.bottom) {
          if (!remota) this.golpearCaja(caja, true);
          this.impacto(bala);
          return;
        }
      }
      // Los demás jugadores (en línea): la bala se frena en su dibujo (el daño lo hace él).
      if (this.enLinea && !remota) {
        for (const r of RED.remotos.values()) {
          const d = r.dibujo;
          if (!d || !r.estado || !r.estado.p || !r.estado.p.length) continue;
          if (Math.abs(bala.x - d.x) < 22 && bala.y > r.estado.arriba - r.estado.y + d.y && bala.y < d.y + 56) {
            if (bala.getData('tipo') === 'bala' || bala.getData('tipo') === 'llama') sangrar(this, bala.x, bala.y, Math.sign(bala.body.velocity.x) || 1, 1.2);
            this.impacto(bala);
            return;
          }
        }
      }
    });
  }

  // La bala pega contra algo: explota o se frena con chispas.
  impacto(bala) {
    if (!bala.active) return;
    if (EXPLOSIVOS.includes(bala.getData('tipo'))) { this.explotar(bala); return; }
    if (bala.getData('tipo') !== 'llama') chispas(this, bala.x, bala.y, 6, Phaser.Math.RadToDeg(Math.atan2(-bala.body.velocity.y, -bala.body.velocity.x)), 100, 10.3);
    bala.destroy();
  }

  balaLuchador(bala, l) {
    if (!bala.active || !l || !l.enJuego || l.id === bala.getData('duenio')) return;
    if (this.time.now < l.invulnerableHasta) return;
    const tipo = bala.getData('tipo');
    if (EXPLOSIVOS.includes(tipo)) { this.explotar(bala); return; }
    const vx = bala.body.velocity.x;
    const vy = bala.body.velocity.y;
    const vertical = Math.abs(vy) > Math.abs(vx);
    this.golpear(l, bala.getData('arma'), vertical ? 0 : Math.sign(vx), vertical ? Math.sign(vy) : -0.3, bala.getData('duenio'));
    if (tipo === 'bala') sangrar(this, bala.x, bala.y, Math.sign(vx) || 1, 1.2);
    bala.destroy();
  }

  explotar(bala) {
    if (!bala.active) return;
    const { x, y } = bala;
    const tipo = bala.getData('tipo');
    const duenio = bala.getData('duenio');
    const arma = bala.getData('arma');
    const remota = bala.getData('remota');
    bala.destroy();
    const escala = escalaExplosion(tipo);
    explotar(this, x, y + 12 * escala, EXPLOSIONES[tipo].efecto, escala);
    sonarImpacto(this, tipo); // Armas.js
    this.cameras.main.shake(tipo === 'cohete' ? 220 : 150, tipo === 'cohete' ? 0.012 : 0.007);
    const radio = radioExplosion(tipo) * 1.15;
    this.danoEnArea(x, y, radio, arma, duenio, null);
    // Los bidones de alrededor también (los avisa el dueño de la bala).
    if (!remota) {
      this.bidones.forEach((b) => {
        const c = this.centroBidon(b);
        if (b.activo && Phaser.Math.Distance.Between(x, y, c.x, c.y) < radio + 20) this.golpearBidon(b, duenio, true);
      });
    }
  }

  // Tajo o escopetazo: el efecto y el daño en cada círculo. En línea se avisa
  // a los demás para que lo vean (y se lastimen si les toca).
  golpeEnArea(duenio, arma, puntos, lado, fx, desdeRed = false) {
    if (fx) efecto(this, fx.nombre, fx.x, fx.y, { escala: fx.escala, espejo: fx.espejo, angulo: fx.angulo, profundidad: 10.3 });
    puntos.forEach(([x, y, r]) => this.danoEnArea(x, y, r, arma, duenio, lado));
    if (!desdeRed && this.enLinea && duenio === this.miId) {
      this.mandarEvento({ tipo: 'area', arma, puntos: puntos.map((p) => p.map(Math.round)), lado, fx });
    }
    // Las cajas también se rompen a tajos y escopetazos.
    if (!desdeRed) {
      this.cajas.forEach((caja) => {
        if (caja.abierta) return;
        if (puntos.some(([x, y, r]) => Phaser.Math.Distance.Between(x, y, caja.sprite.x, caja.sprite.y) < r + 30)) this.golpearCaja(caja, true);
      });
      this.bidones.forEach((b) => {
        const c = this.centroBidon(b);
        if (b.activo && puntos.some(([x, y, r]) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < r + 20)) this.golpearBidon(b, duenio, false);
      });
    }
  }

  // Lastima a los luchadores de esta pantalla dentro del círculo. lado: hacia
  // dónde empuja (null: hacia afuera del centro, como una explosión).
  danoEnArea(x, y, radio, arma, duenio, lado) {
    this.luchadores.forEach((l) => {
      if (!l.enJuego || l.id === duenio) return;
      const dx = l.x - x;
      const dy = l.y - y;
      if (Math.hypot(dx, dy * 0.8) > radio + 22) return;
      if (lado === null || lado === undefined) this.golpear(l, arma, dx, dy - 40, duenio);
      else this.golpear(l, arma, lado, lado ? -0.35 : -1, duenio);
    });
  }

  // El golpe: sube el % y lo despide (más lejos cuanto más % tiene).
  golpear(l, arma, dx, dy, duenio) {
    const ahora = this.time.now;
    if (!l.enJuego || ahora < l.invulnerableHasta) return;
    if (l.inmune) {
      chispas(this, l.x, l.y, 6, -90, 360, 10.3);
      return;
    }
    const [dano, mult] = DANO_PELEA[arma] || [5, 0.5];
    l.pct = Math.min(999, l.pct + dano);
    const fuerza = (PELEA.empuje.base + l.pct * PELEA.empuje.porPct) * mult;
    const n = Math.hypot(dx, dy) || 1;
    const vx = (dx / n) * fuerza;
    const vy = Math.min((dy / n) * fuerza, -fuerza * 0.45 - 60);
    l.sprite.body.setVelocity(vx, vy);
    if (fuerza > 140) l.aturdidoHasta = Math.max(l.aturdidoHasta, ahora + Math.min(900, 60 + fuerza * 0.45));
    l.rojoHasta = ahora + 110;
    l.ultimoGolpe = duenio;
    l.ultimoGolpeEn = ahora;
    if (fuerza > 650) {
      this.cameras.main.shake(140, 0.008);
      this.estela(l, Math.min(900, fuerza * 0.7));
    }
    const panel = this.paneles && this.paneles[l.id];
    if (panel) this.tweens.add({ targets: panel.pct, scale: 1.35, duration: 70, yoyo: true });
  }

  // Humo detrás del que sale volando fuerte.
  estela(l, duracion) {
    const humo = this.add.particles(0, 0, 'fx_humo', {
      follow: l.sprite, lifespan: 500, speed: 10, scale: { start: 1.6, end: 0.4 }, alpha: { start: 0.6, end: 0 }, frequency: 30
    }).setDepth(9.5);
    this.time.delayedCall(duracion, () => { humo.stop(); this.time.delayedCall(600, () => humo.destroy()); });
  }

  polvo(x, y) {
    const p = this.add.particles(x, y, 'fx_humo', {
      speed: { min: 30, max: 90 }, angle: { min: 160, max: 380 }, lifespan: 380, scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.5, end: 0 }, emitting: false
    }).setDepth(9.6);
    p.explode(8);
    this.time.delayedCall(500, () => p.destroy());
  }

  // ---------------------------------------------------------------------------
  // Bidones flotantes
  // ---------------------------------------------------------------------------
  golpearBidon(b, duenio, explota, desdeRed = false) {
    if (!b.activo) return;
    b.golpes += explota ? PELEA.bidon.golpes : 1;
    this.tweens.add({ targets: b.img, scaleX: 1.32, scaleY: 1.1, duration: 50, yoyo: true });
    b.img.setTintFill(0xffffff);
    this.time.delayedCall(60, () => b.img.clearTint());
    if (!desdeRed && this.enLinea) this.mandarEvento({ tipo: 'bidon', i: b.i, explota, de: duenio });
    if (b.golpes >= PELEA.bidon.golpes) this.explotarBidon(b, duenio);
  }

  explotarBidon(b, duenio) {
    const { x, y } = this.centroBidon(b);
    b.activo = false;
    b.golpes = 0;
    b.img.setVisible(false);
    explotar(this, x, y + 50, 'grande', 2.4);
    chispas(this, x, y, 24, -90, 360, 12);
    this.cameras.main.shake(260, 0.014);
    this.danoEnArea(x, y, PELEA.bidon.radio, 'bidon', null, null);
    // El globo suelto se va volando.
    const globo = this.add.image(x, y - 70, 'arenaBidon').setCrop(0, 0, 34, 34).setScale(1.2).setDepth(6);
    this.tweens.add({ targets: globo, y: y - 400, x: x + Phaser.Math.Between(-60, 60), duration: 2200, onComplete: () => globo.destroy() });
    this.time.delayedCall(PELEA.bidon.vuelve, () => {
      b.activo = true;
      b.img.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: b.img, alpha: 1, duration: 600 });
    });
  }

  // ---------------------------------------------------------------------------
  // Cajas con armas: caen en paracaídas (las tira el anfitrión, o esta
  // pantalla si no hay sala).
  // ---------------------------------------------------------------------------
  revisarCajas(ahora) {
    const tiro = !this.enLinea || RED.sala.anfitrion === this.miId;
    if (tiro && !this.terminado && ahora > this.proximaCaja) {
      this.proximaCaja = ahora + Phaser.Math.Between(...PELEA.cajas.cada);
      if (this.cajas.filter((c) => !c.abierta).length < PELEA.cajas.max) {
        const lugares = [PELEA.isla.x + Phaser.Math.Between(-250, 250), ...PELEA.tablas.map((t) => t.x)];
        const datos = { id: `${this.miId}-${this.proximaId++}`, x: Phaser.Utils.Array.GetRandom(lugares), arma: Phaser.Utils.Array.GetRandom(ARMAS_PELEA) };
        this.soltarCaja(datos);
        if (this.enLinea) this.mandarEvento({ tipo: 'caja', ...datos });
      }
    }
    // Tocar una caja la abre; tocar un arma suelta la toma.
    this.luchadores.forEach((l) => {
      if (!l.enJuego) return;
      const b = l.sprite.body;
      this.cajas.forEach((caja) => {
        if (caja.abierta || !caja.sprite.body) return;
        const r = caja.sprite.body;
        if (b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) this.abrirCaja(caja, l);
      });
      this.armasSueltas.forEach((s) => {
        if (s.tomada) return;
        if (Math.abs(s.img.x - l.x) < 40 && Math.abs(s.img.y - l.y) < 70) this.tomarSuelta(s, l);
      });
    });
    // Los paracaídas siguen a su caja hasta que toca el piso.
    this.cajas.forEach((caja) => {
      const s = caja.sprite;
      if (!s.active) return;
      if (s.y > 800) { this.quitarCaja(caja); return; }
      if (caja.paracaidas) {
        caja.paracaidas.setPosition(s.x, s.body.top + 6).setAngle(Math.sin(ahora / 300) * 6);
        if (s.body.blocked.down || s.body.touching.down) {
          const p = caja.paracaidas;
          caja.paracaidas = null;
          s.body.setMaxVelocity(4000, PELEA.caidaMaxima);
          this.tweens.add({ targets: p, y: p.y + 30, x: p.x + 40, angle: 70, alpha: 0, scaleY: 0.3, duration: 700, onComplete: () => p.destroy() });
        }
      }
    });
  }

  soltarCaja({ id, x, arma }) {
    if (this.cajas.some((c) => c.id === id)) return;
    const s = this.physics.add.sprite(x, -60, 'cajaArmas', 0).setScale(ESCALA).setDepth(8.5);
    s.body.setSize(50, 29).setOffset(20, 45).setMaxVelocity(0, 150);
    s.play('caja_quieta');
    const paracaidas = this.add.image(x, -80, 'arenaParacaidas').setOrigin(0.5, 1).setScale(1.3).setDepth(8.4);
    const caja = { id, sprite: s, arma, golpes: 0, abierta: false, paracaidas };
    this.physics.add.collider(s, this.solido);
    const pisa = (a, b) => (a === s ? this.deUnSentido(a, b) : this.deUnSentido(b, a));
    this.physics.add.collider(s, this.tablas, null, pisa);
    this.physics.add.collider(s, this.losas, null, pisa);
    this.cajas.push(caja);
  }

  golpearCaja(caja, avisar) {
    if (caja.abierta) return;
    caja.golpes++;
    caja.sprite.setFrame(CAJA_ARMAS.golpeada);
    this.time.delayedCall(80, () => { if (caja.sprite.active && !caja.abierta) caja.sprite.play('caja_quieta'); });
    if (avisar && this.enLinea) this.mandarEvento({ tipo: 'golpeCaja', id: caja.id });
    if (caja.golpes >= PELEA.cajas.golpes) this.romperCaja(caja, false);
  }

  // Se abre: si alguien la tocó se lleva el arma; si la rompieron a balazos,
  // el arma queda flotando para el primero que llegue.
  abrirCaja(caja, l, desdeRed = false) {
    if (caja.abierta) return;
    this.romperCaja(caja, true);
    if (l) this.darArma(l, caja.arma, caja.sprite.x, caja.sprite.y);
    if (!desdeRed && this.enLinea) this.mandarEvento({ tipo: 'abreCaja', id: caja.id });
  }

  romperCaja(caja, tomada) {
    caja.abierta = true;
    const s = caja.sprite;
    if (caja.paracaidas) { caja.paracaidas.destroy(); caja.paracaidas = null; }
    s.body.enable = false;
    s.play('caja_rompe');
    s.once('animationcomplete', () => this.tweens.add({ targets: s, alpha: 0, duration: 400, onComplete: () => this.quitarCaja(caja) }));
    chispas(this, s.x, s.y, 14, -90, 200, 11);
    if (tomada) return;
    // El arma flota donde estaba la caja.
    const img = this.add.image(s.x, s.y - 20, texturaArma(caja.arma)).setScale(1.6).setDepth(9);
    this.tweens.add({ targets: img, y: img.y - 14, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const brillo = this.add.particles(0, 0, 'fx_chispa', {
      follow: img, lifespan: 600, speed: { min: 10, max: 40 }, scale: { start: 1.4, end: 0 }, frequency: 90, blendMode: 'ADD'
    }).setDepth(8.9);
    this.armasSueltas.push({ id: caja.id, img, brillo, arma: caja.arma, tomada: false });
  }

  quitarCaja(caja) {
    if (caja.paracaidas) caja.paracaidas.destroy();
    caja.sprite.destroy();
    this.cajas = this.cajas.filter((c) => c !== caja);
  }

  tomarSuelta(s, l, desdeRed = false) {
    if (s.tomada) return;
    s.tomada = true;
    const { x, y } = s.img;
    s.img.destroy();
    s.brillo.destroy();
    this.armasSueltas = this.armasSueltas.filter((o) => o !== s);
    if (l) this.darArma(l, s.arma, x, y);
    if (!desdeRed && this.enLinea) this.mandarEvento({ tipo: 'tomaArma', id: s.id });
  }

  darArma(l, arma, x, y) {
    l.arma = arma;
    l.municion = ARMAS[arma].municion ? Math.ceil(ARMAS[arma].municion * PELEA.cajas.municion) : Infinity;
    TextFX.popup(this, x, y - 30, `¡${ARMAS[arma].nombre}!`, { escala: 1, subir: 40 }).setDepth(30);
    if (l === this.yo) this.cameras.main.flash(90, 255, 230, 140);
  }

  // ---------------------------------------------------------------------------
  // KO, volver y quién gana
  // ---------------------------------------------------------------------------
  ko(l, desdeRed = false) {
    const { width, height } = this.scale;
    const x = Phaser.Math.Clamp(l.x, 20, width - 20);
    const y = Phaser.Math.Clamp(l.y, 30, height - 20);
    this.explosionKO(x, y, l.color);
    if (!l.inmune) l.vidas--;
    l.esperando = true;
    l.mostrar(false);
    l.sprite.body.setVelocity(0, 0);
    const quien = this.luchadores.find((o) => o.id === l.ultimoGolpe);
    if (quien && this.time.now - (l.ultimoGolpeEn || 0) < 6000) quien.eliminaciones++;
    if (this.enLinea) this.mandarEvento({ tipo: 'ko', x: Math.round(x), y: Math.round(y), color: l.color });
    if (l.vidas <= 0) {
      l.fuera = true;
      return;
    }
    this.time.delayedCall(PELEA.reaparece, () => this.reaparecer(l));
  }

  explosionKO(x, y, color) {
    const { width } = this.scale;
    // Un rayo de luz desde el borde hacia el centro (como en Smash) y la explosión.
    const angulo = Phaser.Math.RadToDeg(Math.atan2(288 - y, width / 2 - x));
    const rayo = this.add.rectangle(x, y, 900, 60, color, 0.85).setOrigin(0, 0.5).setAngle(angulo).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: rayo, scaleY: 0, alpha: 0, duration: 650, ease: 'Quad.in', onComplete: () => rayo.destroy() });
    explotar(this, x, y + 60, 'grande', 2.8);
    chispas(this, x, y, 30, angulo, 120, 21);
    this.cameras.main.shake(320, 0.016);
    this.cameras.main.flash(120, 255, 255, 255);
  }

  reaparecer(l) {
    if (this.terminado && l !== this.yo) return;
    const A = PELEA.aparece;
    l.esperando = false;
    l.pct = 0;
    l.arma = 'pistola';
    l.municion = Infinity;
    l.aturdidoHasta = 0;
    l.ultimoGolpe = null;
    l.sprite.setPosition(A.x, A.y);
    l.mostrar(true);
    l.sprite.body.reset(A.x, A.y);
    l.invulnerableHasta = this.time.now + PELEA.invulnerable;
    const halo = this.add.circle(A.x, A.y, 50, l.color, 0.4).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: halo, scale: 2, alpha: 0, duration: 500, onComplete: () => halo.destroy() });
  }

  // Vivos: los luchadores de esta pantalla con vidas y (en línea) los demás
  // jugadores según lo último que mandaron (si todavía no mandaron, cuentan
  // como vivos con todas sus vidas).
  vivos() {
    return this.participantes.filter((p) => {
      if (this.enLinea && !RED.jugador(p.id)) return false; // se fue de la sala
      return this.datosDe(p).vidas > 0;
    });
  }

  datosDe(p) {
    const l = this.luchadores.find((o) => o.id === p.id);
    if (l) return { pct: l.pct, vidas: l.vidas, personaje: l.personaje };
    const r = RED.remotos.get(p.id);
    const est = r && r.estado && r.estado.e === 'Arena' ? r.estado : null;
    return { pct: est ? est.pct || 0 : 0, vidas: est && est.vidas !== undefined ? est.vidas : PELEA.vidas, personaje: (est && est.pj) || p.personaje };
  }

  revisarGanador() {
    if (this.bloqueado || this.time.now - this.inicio < 4000) return;
    const vivos = this.vivos();
    if (vivos.length > 1) return;
    this.terminar(vivos[0]);
  }

  terminar(ganador) {
    const { width, height } = this.scale;
    this.terminado = true;
    this.sinPausa = true;
    const fijo = (o) => o.setScrollFactor(0).setDepth(50);
    const velo = fijo(this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0));
    this.tweens.add({ targets: velo, fillAlpha: 0.5, duration: 600 });
    this.time.delayedCall(300, () => {
      const titulo = ganador ? `¡GANA ${ganador.bot ? 'CPU' + ganador.numero : ganador.nombre}!` : '¡EMPATE!';
      const t = fijo(TextFX.title(this, width / 2, height / 2 - 60, titulo, { escala: 4 })).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out', onComplete: () => t.destellar(4, 90) });
      if (ganador && ganador.id === this.miId) {
        for (let k = 0; k < 6; k++) this.time.delayedCall(k * 180, () => chispas(this, Phaser.Math.Between(200, 824), Phaser.Math.Between(120, 300), 24, -90, 360, 51));
      }
      const anfitrion = !this.enLinea || RED.sala.anfitrion === this.miId;
      const ayuda = anfitrion ? 'ENTER REVANCHA · ESC MENÚ' : 'ESPERANDO AL ANFITRIÓN · ESC MENÚ';
      this.time.delayedCall(900, () => fijo(TextFX.texto(this, width / 2, height / 2 + 30, ayuda, { color: 'plata', escala: 2 })));
      // En el celular: un toque es revancha.
      this.time.delayedCall(900, () => { this.puedeTocar = true; });
      this.input.once('pointerdown', () => this.revancha());
    });
  }

  revancha() {
    if (!this.terminado || !this.puedeTocar) return;
    if (this.enLinea) {
      if (RED.sala.anfitrion === this.miId) RED.mandar({ t: 'empezar', modo: 'arena' });
      return;
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }

  salir() {
    if (this.enLinea) {
      RED.mandar({ t: 'salir' });
      RED.sala = null;
      RED.limpiarRemotos();
    }
    this.scene.start('Menu');
  }

  cuentaRegresiva() {
    const { width, height } = this.scale;
    const ayuda = TextFX.texto(this, width / 2, height - 22, 'ESPACIO SALTA (2 VECES) · J DISPARA · ABAJO BAJA DE LA TABLA · TOCA LAS CAJAS', { color: 'plata', escala: 1 })
      .setDepth(40);
    this.time.delayedCall(PELEA.cuenta + 3500, () => this.tweens.add({ targets: ayuda, alpha: 0, duration: 600, onComplete: () => ayuda.destroy() }));
    const paso = PELEA.cuenta / 3;
    ['3', '2', '1'].forEach((n, i) => this.time.delayedCall(i * paso, () => {
      const t = TextFX.title(this, width / 2, height / 2 - 40, n, { escala: 8 }).setDepth(40).setScale(2).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
      this.tweens.add({ targets: t, alpha: 0, duration: 200, delay: paso - 220, onComplete: () => t.destroy() });
    }));
    this.time.delayedCall(PELEA.cuenta, () => {
      this.bloqueado = false;
      const t = TextFX.alert(this, width / 2, height / 2 - 40, '¡PELEA!', { escala: 6 }).setDepth(40).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.out', onComplete: () => t.destellar(3, 70) });
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 400, delay: 900, onComplete: () => t.destroy() });
      this.cameras.main.shake(150, 0.006);
    });
  }

  // ---------------------------------------------------------------------------
  // HUD: abajo, un panel por jugador con su %, sus vidas y su personaje.
  // ---------------------------------------------------------------------------
  crearHUD() {
    const { width, height } = this.scale;
    const n = this.participantes.length;
    const ancho = Math.min(200, (width - 40) / n - 10);
    this.paneles = {};
    this.participantes.forEach((p, i) => {
      const x = width / 2 + (i - (n - 1) / 2) * (ancho + 10);
      const y = height - 56;
      const fondo = this.add.rectangle(x, y, ancho, 50, 0x0c0a08, 0.72).setStrokeStyle(2, p.color).setDepth(30);
      const icono = this.add.image(x - ancho / 2 + 22, y + 24, 'manfred_idle', '0').setOrigin(0.5, 1).setDepth(31);
      const hex = '#' + p.color.toString(16).padStart(6, '0');
      const nombre = this.add.text(x - ancho / 2 + 44, y - 19, p.bot ? `CPU${p.numero}` : (p.nombre === `J${p.numero}` ? p.nombre : `J${p.numero} ${p.nombre}`).slice(0, 13), {
        fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: hex, stroke: '#000', strokeThickness: 2
      }).setDepth(31);
      const pct = TextFX.texto(this, x + 18, y + 6, '0%', { color: 'plata', escala: 2, origen: 0.5 }).setDepth(31);
      const vidas = [];
      for (let k = 0; k < PELEA.vidas; k++) vidas.push(this.add.circle(x + ancho / 2 - 12 - k * 12, y - 15, 4, p.color).setStrokeStyle(1, 0x000000).setDepth(31));
      this.paneles[p.id] = { fondo, icono, nombre, pct, vidas, ultimo: -1, ultimasVidas: -1, pj: null };
    });
  }

  actualizarHUD() {
    this.participantes.forEach((p) => {
      const panel = this.paneles[p.id];
      const d = this.datosDe(p);
      // La carita: el personaje que eligió (en línea se sabe cuando manda su estado).
      if (d.personaje !== panel.pj) {
        panel.pj = d.personaje;
        panel.icono.setTexture(CUERPOS[CUERPOS[d.personaje] ? d.personaje : 'manfred'].prefijo + 'idle', '0').setScale(0.33);
      }
      const pct = Math.floor(d.pct);
      if (pct !== panel.ultimo) {
        panel.ultimo = pct;
        panel.pct.setText(`${pct}%`);
        panel.pct.setColor(pct < 40 ? 'plata' : pct < 100 ? 'oro' : 'rojo');
      }
      if (d.vidas !== panel.ultimasVidas) {
        panel.ultimasVidas = d.vidas;
        panel.vidas.forEach((c, k) => c.setAlpha(k < d.vidas ? 1 : 0.15));
        const afuera = d.vidas <= 0 || (this.enLinea && !RED.jugador(p.id));
        [panel.fondo, panel.icono, panel.nombre, panel.pct].forEach((o) => o.setAlpha(afuera ? 0.35 : 1));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Bots: eligen a quién atacar (el más cercano, o un arma si tienen la
  // pistola), se acercan a la distancia de su arma, saltan a las tablas, se
  // bajan, disparan cuando lo tienen enfrente y, si se caen, intentan volver.
  // Deciden cada ~150 ms (no son perfectos).
  // ---------------------------------------------------------------------------
  pensarBot(l, ahora) {
    const c = l.control;
    const s = l.sprite;
    const b = s.body;
    const I = PELEA.isla;
    const izq = I.x - I.ancho / 2;
    const der = I.x + I.ancho / 2;
    const enSuelo = l.enSuelo();

    // Volver al escenario: si está en el aire fuera de la isla (y no sobre una losa).
    const afuera = s.x < izq + 6 || s.x > der - 6;
    if (!enSuelo && afuera && b.velocity.y > -120 && s.y > I.y - 230) {
      const hacia = Math.sign(I.x - s.x);
      Object.assign(c, { izq: hacia < 0, der: hacia > 0, arriba: false, abajo: false, disparar: false, mirar: hacia });
      if (l.saltosAire > 0 && (s.y > I.y - 40 || b.velocity.y > 350)) c.saltar = true;
      return;
    }

    if (ahora < l.ia.proxima) {
      // Entre decisiones solo cuida no caerse de la isla caminando.
      if (enSuelo && ahora - l.sobreTablaEn > 150) {
        if (c.izq && s.x < izq + 30) c.izq = false;
        if (c.der && s.x > der - 30) c.der = false;
      }
      return;
    }
    l.ia.proxima = ahora + Phaser.Math.Between(110, 220);

    // A quién (o a qué) va.
    const rivales = this.luchadores.filter((o) => o !== l && o.enJuego);
    let meta = null;
    let distMeta = Infinity;
    rivales.forEach((o) => {
      const d = Math.hypot(o.x - s.x, (o.y - s.y) * 1.5);
      if (d < distMeta) { distMeta = d; meta = o; }
    });
    if (l.arma === 'pistola') {
      const premios = [
        ...this.armasSueltas.map((a) => ({ x: a.img.x, y: a.img.y })),
        ...this.cajas.filter((k) => !k.abierta && !k.paracaidas).map((k) => ({ x: k.sprite.x, y: k.sprite.y }))
      ];
      premios.forEach((p) => {
        const d = Math.hypot(p.x - s.x, (p.y - s.y) * 1.5) * 0.7;
        if (d < distMeta && d < 420) { distMeta = d; meta = { x: p.x, y: p.y, premio: true }; }
      });
    }
    Object.assign(c, { izq: false, der: false, arriba: false, abajo: false, disparar: false, mirar: 0 });
    if (!meta) return;

    const dx = meta.x - s.x;
    const dy = meta.y - s.y;
    const arma = ARMAS[l.arma];
    const cerca = meta.premio ? 8 : arma.tipo === 'cuerpo' ? 50 : arma.tipo === 'onda' ? 110 : arma.tipo === 'llama' ? 150 : 260;
    if (Math.abs(dx) > cerca) { c.der = dx > 0; c.izq = dx < 0; }
    else if (!meta.premio && Math.abs(dx) < cerca * 0.4 && arma.tipo !== 'cuerpo') { c.der = dx < 0; c.izq = dx > 0; }
    c.mirar = Math.sign(dx) || 1;
    // Sin caerse de la isla.
    if (enSuelo && ahora - l.sobreTablaEn > 150) {
      if (c.izq && s.x < izq + 40) c.izq = false;
      if (c.der && s.x > der - 40) c.der = false;
    }
    // Arriba o abajo.
    if (dy < -80 && Math.abs(dx) < 260 && enSuelo && Math.random() < 0.55) c.saltar = true;
    else if (dy < -60 && !enSuelo && b.velocity.y > -60 && l.saltosAire > 0 && Math.random() < 0.5) c.saltar = true;
    if (dy > 90 && enSuelo && ahora - l.sobreTablaEn < 150) c.bajar = true;
    if (meta.premio) return;
    // Disparar: si lo tiene enfrente (o arriba).
    const mira = Math.sign(dx) === (c.izq ? -1 : c.der ? 1 : c.mirar);
    const alcance = arma.tipo === 'cuerpo' ? 90 : arma.tipo === 'onda' ? metros(arma.alcance) : arma.tipo === 'granada' ? 500 : (arma.alcance || 600) * 0.9;
    if (Math.abs(dy) < 55 && mira && Math.abs(dx) < alcance && Math.random() < 0.8) c.disparar = true;
    if (dy < -110 && Math.abs(dx) < 36 && Math.random() < 0.7) { c.arriba = true; c.disparar = true; }
    // De vez en cuando, un salto para esquivar.
    if (enSuelo && Math.random() < 0.05) c.saltar = true;
  }

  // ---------------------------------------------------------------------------
  // Red (en línea)
  // ---------------------------------------------------------------------------

  // Lo que va con mi estado (Red.js lo agrega a cada envío).
  datosRed() {
    const yo = this.yo;
    return { pct: Math.round(yo.pct), vidas: yo.vidas, pj: yo.personaje };
  }

  mandarEvento(datos) {
    RED.mandar({ t: 'evento', e: 'Arena', ...datos });
  }

  eventoRed(m) {
    switch (m.tipo) {
      case 'caja': this.soltarCaja(m); break;
      case 'golpeCaja': { const caja = this.cajas.find((c) => c.id === m.id); if (caja) this.golpearCaja(caja, false); break; }
      case 'abreCaja': { const caja = this.cajas.find((c) => c.id === m.id); if (caja) this.abrirCaja(caja, null, true); break; }
      case 'tomaArma': { const s = this.armasSueltas.find((o) => o.id === m.id); if (s) this.tomarSuelta(s, null, true); break; }
      case 'bidon': { const b = this.bidones[m.i]; if (b) this.golpearBidon(b, m.de, m.explota, true); break; }
      case 'area': this.golpeEnArea(m.de, m.arma, m.puntos, m.lado, m.fx, true); break;
      case 'ko': this.explosionKO(m.x, m.y, m.color); break;
      default: break;
    }
  }
}
