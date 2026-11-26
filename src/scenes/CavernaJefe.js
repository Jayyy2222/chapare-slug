// =============================================================================
// NIVEL 2 · LA CAVERNA DEL JEFE (escena CavernaJefe). Viene de la persecución
// en carrito (MineCartScene: el tope de la vía); la persecución del jefe sigue
// en la misma escena, sin cortes (PersecucionJefe.js). Hereda de Nivel2: jugador, colisión por JSON y
// su editor (tecla E), HUD, vidas.
//
// Imágenes: assets/nivel2/mina/caverna/ (herramientas/caverna_jefe.py, a
// partir de assets/fondos/lvl1/lvl2/mina_potosi/jefe2/ y assets/jefes/jefe2/):
//   a1_fondo.png (parallax 0.2), a2_arena.png (la arena, scrollFactor 1),
//   a3_frente.png (primer plano, 1.2), hoja_minero.png (B), hoja_c_*.png (C),
//   estatua.png, jefe_*.png y caverna.json (celdas, orígenes y luces).
// Colisión: caverna_collision.json: el suelo, el altar (sólido: el suelo sube
// por las escaleras de piedra y pasa por arriba), los andamios de los lados
// (one-way) y sus escaleras.
//
// 1. LLEGADA: el jugador entra desde la izquierda; la cámara se traba al
//    pasar el centro de la arena. La estatua del Tío en el altar y 6 mineros
//    en el ritual (2 rezan arrodillados, 2 vierten la botella, 2 con velas).
//    Velas, incienso, serpentinas, tambores y cánticos (WebAudio).
// 2. Al ver al jugador (o con el primer disparo) se sorprenden, sueltan las
//    velas (caen y se apagan con humo) y las botellas, y atacan con garrotes.
//    Vencidos, bajan 4 más por las escaleras de los andamios.
// 3. LA ESTATUA SE ROMPE (sin control): silencio, las velas titilan y se
//    apagan una por una, la estatua tiembla cada vez más, anillos de aura, el
//    resplandor del altar al máximo; temblor, destello, la estatua revienta
//    (rocas con física y polvo) y sale el jefe rugiendo. ¡ALERTA!, su barra
//    de vida y su música.
// 4. ¡CORRE!: todo se vuelve infierno, el piso se rompe y cae a la lava
//    desde la izquierda y el jugador corre a la derecha, perseguido por el Tío,
//    por un camino sin fin hasta vencerlo (PersecucionJefe.js).
// =============================================================================

const RUTA_CAVERNA = 'assets/nivel2/mina/caverna/';
const NOMBRE_JEFE2 = 'EL TÍO · SEÑOR DEL SOCAVÓN';

const CAVERNA = {
  ...POTOSI,
  ruta: RUTA_CAVERNA,
  colision: { clave: 'cavernaColision', archivo: 'caverna_collision.json' },
  // La arena y, a su derecha, la persecución sin fin (PersecucionJefe.js).
  anchoArena: 1165,
  ancho: 1165 + 2322 * 400,
  escalaCasas: 1, piso: 476,
  inicio: { x: 40, desde: 440 },
  desde: 440,
  llenaVida: false,
  titulo: { nombre: 'EL ALTAR DEL TÍO', sub: 'LO MÁS HONDO DEL SOCAVÓN', escala: 3 },
  fondo: 0x050304,
  bruma: false,
  // La arena sin el piso ni el altar (van aparte: se rompen y se hunden).
  tramos: [{ clave: 'cavArenaFondo', archivo: 'arena_fondo.png', x: 0 }],
  // A3 (el marco de roca de adelante, 1.2) no va acá: crearMarco.
  // A1 lejos y, en la persecución, una copia chica y oscura del mapa en el
  // medio (aparece al empezar a correr); se ven por los huecos negros del mapa.
  parallax: [
    { clave: 'cavA1', archivo: 'a1_fondo.png', factor: 0.2, y: 0, tinte: 0x8a7a70 },
    { clave: 'cavPersLejos', archivo: 'persecucion_lejos.png', factor: 0.5, y: 70, alfa: 0 }
  ],
  marco: 1.2,
  escalaJefe: 0.85,          // la estatua y el jefe en la arena (si no, no entran)
  zonas: [{ limite: 141, final: true }],
  aberturas: {}, enemigos: [], rehenes: [], rompibles: [], decor: [], animados: [], escaleras: [], llamas: [],
  palomas: [], palomasSuelo: [], humo: [], campanas: [], lingotes: [], barandas: null,
  condor: false, bandadas: false, viento: false,
  // Donde la cámara se traba (x del jugador) y dónde está la estatua (pie).
  centro: 582,
  estatua: { x: 575, y: 380 },
  // Los del ritual: x, desde qué y buscar el piso, qué hacen y si miran a la izquierda.
  ritual: [
    { x: 505, desde: 340, rol: 'reza' }, { x: 645, desde: 340, rol: 'reza', espejo: true },
    { x: 320, rol: 'vierte' }, { x: 830, rol: 'vierte', espejo: true },
    { x: 250, rol: 'vela' }, { x: 920, rol: 'vela', espejo: true }
  ],
  refuerzos: 4,              // los que bajan por las escaleras
  minero: { vida: 3, velocidad: [80, 115], alcance: 64, golpe: 1300, vista: 300, puntos: 150 },
  // Grupos de velas (C, fila de velas) sobre el altar: x, y (pie) y cuadros.
  velas: [[470, 372, 'a'], [528, 374, 'b'], [622, 380, 'b'], [688, 372, 'a'], [372, 474, 'a'], [790, 474, 'a']],
  serpentinas: [[515, 248], [640, 248]],
  incienso: [[455, 362], [700, 362]],
  luz: { velo: 0.65, vela: 120, farol: 150, jugador: 140, colorVela: 0xffa860, colorAltar: 0xff4a1c }
};

class CavernaJefe extends Nivel2 {
  constructor() {
    super('CavernaJefe', CAVERNA);
  }

  preload() {
    super.preload();
    cargarCaverna(this);
  }

  create() {
    this.ritualEstado = 'ritual';
    this.camaraTrabada = false;
    this.oleada = 1;
    this.mineros = null;
    this.tio = null;
    this.tioEstado = 'quieto';
    this.creados = 0;
    this.tramosMundo = [];
    this.bloques = [];
    this.altarPiedra = null;
    this.zonasArena = [];
    this.franjaLava = null;
    this.enLava = false;
    this.rojos = [];
    this.rojo = 0;
    this.contraluz = this.brasasTio = this.humoTio = this.focoTio = this.brilloTio = null;
    // Murió durante la persecución: vuelve directo a ella (sin el ritual).
    this.desdeCheckpoint = !!this.registry.get('tioCheckpoint');
    prepararCaverna(this);
    super.create();
    this.events.once('shutdown', () => this.limpiarCaverna());
  }

  crearExtras() {
    const C = this.cfg;
    const datos = this.cache.json.get('cavernaDatos');
    crearLucesCaverna(this, C.luz, [...this.capaNivel(), this.altarPiedra.img, ...this.bloques.map((b) => b.img)]);
    this.marco = crearMarco(this, C.marco);
    crearEco(this, { retardo: 0.3, realimentacion: 0.45, mezcla: 0.4, filtro: 1500 });
    // Faroles colgados del techo (los de arriba del dibujo).
    datos.arena.luces.filter(([, y]) => y < 200).forEach(([x, y]) => this.nuevoFoco(x, y, { radio: C.luz.farol, color: 0xffc070 }));
    // El altar: resplandor rojo-naranja que pulsa lento.
    const { x, y } = C.estatua;
    this.luzAltar = this.nuevoFoco(x, y - 90, { radio: 230, color: C.luz.colorAltar, intensidad: 1.6, brillo: 0.4, pulso: 0.35, ritmo: 0.9 });
    this.crearAltar();
    this.crearRitual();
    // Sin la música del nivel: tambores y cánticos.
    callarMusica(this);
    if (this.desdeCheckpoint) { this.saltarAEscape(); return; }
    this.ritmo = ritmoMina(this, { bpm: 76, volumen: 0.5, canto: true });
  }

  // Reaparece en la persecución: sin ritual, el Tío ya afuera y todo infierno.
  saltarAEscape() {
    const C = this.cfg;
    this.mineros.clear(true, true);
    this.estatua.setVisible(false);
    this.velas.forEach((v) => { v.foco.apagar(10); v.s.anims.stop(); v.s.setTint(0x403028); });
    this.incienso.forEach((s) => s.setVisible(false));
    this.ritualEstado = 'cinematica';
    this.camaraTrabada = true;
    this.cameras.main.scrollX = C.anchoArena - this.scale.width;
    infierno(this, 0);
    const { x, y } = C.estatua;
    this.tio = this.add.sprite(x, y, 'cavJefe_ruge', 0).setDepth(9.1).setScale(C.escalaJefe);
    origenJefe(this, this.tio, 'ruge');
    this.tio.play('jefe2_ruge');
    this.barraJefe = crearBarraJefe(this, NOMBRE_JEFE2);
    this.barraJefe.llenar(500);
    this.ritmo = musicaJefe(this);
    this.time.delayedCall(900, () => this.empezarEscape());
  }

  // ---------------------------------------------------------------------------
  // Colisión: lo del JSON de la arena (paredes, andamios, escaleras y el altar,
  // que es sólido) más el piso en bloques (el dibujo, cortado: se rompe). Al
  // salir del editor (E) se rearma solo lo del JSON.
  // ---------------------------------------------------------------------------

  crearColision() {
    if (!this.solidos) {
      this.solidos = this.physics.add.staticGroup();
      this.plataformas = this.physics.add.staticGroup();
      this.tejas = this.physics.add.staticGroup(); // (Nivel2: acá no hay)
    }
    this.zonasArena.forEach((z) => z.destroy());
    this.zonasArena = [];
    const d = this.colision;
    d.walls.forEach(({ x, y, w, h }) => {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.solidos.add(z);
      this.zonasArena.push(z);
    });
    d.platforms.forEach(({ x0, x1, y }) => {
      const z = this.add.zone((x0 + x1) / 2, y + 6, x1 - x0, 12);
      this.plataformas.add(z);
      Object.assign(z.body.checkCollision, { down: false, left: false, right: false });
      z.setData({ x0, x1, y });
      this.zonasArena.push(z);
    });
    // El altar (ground del JSON): las escaleras de piedra y arriba.
    const altar = [];
    d.ground.forEach(({ x0, y0, x1, y1 }) => {
      const a = Math.min(x0, x1);
      const b = Math.max(x0, x1);
      for (let x = a; x < b; x += 4) {
        const w = Math.min(4, b - x);
        const y = this.lineaEn({ x0, y0, x1, y1 }, x + w / 2);
        const z = this.add.zone(x + w / 2, y + 60, w, 120);
        this.solidos.add(z);
        altar.push(z);
        this.zonasArena.push(z);
      }
    });
    this.escaleras = [...d.ladders.map((e) => ({ ...e, centro: (e.x0 + e.x1) / 2 })), ...this.tramosMundo.flatMap((t) => t.escaleras)];
    if (!this.altarPiedra) {
      const datos = this.cache.json.get('cavernaDatos').arena;
      const [ax0, ay0, ax1] = datos.altar;
      const img = this.add.image(ax0, ay0, 'cavArenaAltar').setOrigin(0).setDepth(0.85);
      tinteInfierno(this, img);
      this.altarPiedra = { img, x0: ax0, x1: ax1, firme: true, zonas: [] };
      // El piso de la arena en bloques.
      const ancho = this.textures.get('cavArenaPiso').getSourceImage().width;
      for (let x = 0; x < ancho; x += JEFE2.bloque) {
        this.nuevoBloque('cavArenaPiso', x, x, Math.min(JEFE2.bloque, ancho - x), datos.corte, false);
      }
    }
    this.altarPiedra.zonas = altar;
    if (!this.altarPiedra.firme) altar.forEach((z) => { z.body.enable = false; });
  }

  // Primer apoyo en x: el altar (si no se hundió), andamios y el piso (o la lava).
  superficie(x, desdeY = 0) {
    let mejor = { y: Infinity, x0: x - 50, x1: x + 50 };
    const ver = (y, x0, x1) => { if (y >= desdeY - 10 && y < mejor.y) mejor = { y, x0, x1 }; };
    if (this.altarPiedra && this.altarPiedra.firme) {
      this.colision.ground.forEach((l) => {
        const a = Math.min(l.x0, l.x1);
        const b = Math.max(l.x0, l.x1);
        if (x >= a && x <= b) ver(this.lineaEn(l, x), a, b);
      });
    }
    this.plataformas.getChildren().forEach((z) => {
      if (z.body.enable && x >= z.getData('x0') && x <= z.getData('x1')) ver(z.getData('y'), z.getData('x0'), z.getData('x1'));
    });
    const b = this.bloques.find((q) => x >= q.x0 && x < q.x1);
    ver(b && b.estado === 'firme' ? this.cfg.piso : JEFE2.lava + 30, b ? b.x0 : x - 50, b ? b.x1 : x + 50);
    return mejor;
  }

  pisoEn() {
    return this.cfg.piso;
  }

  capaNivel() {
    return this.children.list.filter((o) => o.texture && this.cfg.tramos.some((t) => t.clave === o.texture.key));
  }

  // La estatua, las velas, el incienso y las serpentinas.
  crearAltar() {
    const C = this.cfg;
    const { x, y } = C.estatua;
    this.estatua = this.add.image(x, y, 'cav_estatua').setOrigin(0.5, 1).setDepth(8.8).setScale(C.escalaJefe);
    if (this.luz2d) this.estatua.setPipeline('Light2D');
    this.velas = C.velas.map(([vx, vy, tipo]) => {
      const s = this.add.sprite(vx, vy, 'cav_c_velas', tipo === 'a' ? 0 : 2).setOrigin(0.5, 1).setDepth(8.9);
      s.play({ key: 'c_velas_' + tipo, startFrame: Phaser.Math.Between(0, 1) });
      const foco = this.nuevoFoco(vx, vy - 22, { radio: C.luz.vela, color: C.luz.colorVela, intensidad: 1.1, brillo: 0.3 });
      return { s, foco };
    });
    this.serpentinas = C.serpentinas.map(([sx, sy]) => this.add.sprite(sx, sy, 'cav_c_serpentina', 0).setDepth(8.85).setScale(1.4)
      .play({ key: 'c_serpentina', startFrame: Phaser.Math.Between(0, 5) }));
    this.incienso = C.incienso.map(([ix, iy]) => this.add.sprite(ix, iy, 'cav_c_incienso', 0).setOrigin(0.5, 1).setDepth(8.9)
      .setScale(1.6).setAlpha(0.7).play({ key: 'c_incienso', startFrame: Phaser.Math.Between(0, 4) }));
  }

  // ---------------------------------------------------------------------------
  // Los mineros del ritual
  // ---------------------------------------------------------------------------

  crearRitual() {
    this.mineros = this.physics.add.group({ allowGravity: true });
    this.pisar(this.mineros);
    this.cfg.ritual.forEach((r) => this.nuevoMinero(r.x, r.desde || 440, r.rol, r.espejo));
    this.physics.add.overlap(this.balas, this.mineros, (bala, m) => {
      if (!['ritual', 'sorpresa', 'ataque', 'baja'].includes(m.getData('estado'))) return;
      this.descubrir();
      if (this.impactoBala(bala)) return;
      sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1);
      const dano = bala.getData('dano') || 1;
      bala.destroy();
      this.danarMinero(m, dano, bala.x);
    });
  }

  nuevoMinero(x, desde, rol, espejo) {
    const M = this.cfg.minero;
    const y = this.superficie(x, desde).y;
    this.creados++;
    const m = this.mineros.create(x, y - 2, 'cav_minero', 0).setOrigin(0.5, 1).setDepth(9.6).setFlipX(!!espejo);
    m.body.setSize(34, 96).setOffset(44, 18);
    m.setData({ rol, estado: 'ritual', vida: M.vida, proximoGolpe: 0, golpeHasta: 0, velocidad: Phaser.Math.Between(...M.velocidad) });
    const sombra = this.crearSombra(SOMBRA.rehen * 0.8, 9.3);
    m.setData('sombra', sombra);
    m.once('destroy', () => sombra.destroy());
    if (rol) m.play({ key: 'min_' + rol, startFrame: Phaser.Math.Between(0, 2) });
    if (rol === 'vela') {
      const lado = espejo ? -1 : 1;
      m.setData('foco', this.nuevoFoco(x + lado * 22, y - 72, { radio: 90, color: 0xffb070, intensidad: 0.9, brillo: 0.25 }));
    }
    return m;
  }

  // Lo vieron (o sonó un disparo): se sorprenden, sueltan todo y atacan.
  descubrir() {
    if (this.ritualEstado !== 'ritual') return;
    this.ritualEstado = 'pelea';
    if (this.ritmo) this.ritmo.detener(300);
    this.time.delayedCall(700, () => { if (this.ritualEstado === 'pelea') this.ritmo = ritmoMina(this, { bpm: 132, volumen: 0.45 }); });
    this.mineros.getChildren().forEach((m, i) => {
      m.setData('estado', 'sorpresa');
      m.anims.stop();
      m.setFrame(21);
      m.setVelocityY(-180);
      this.soltarCosas(m);
      if (i % 2 === 0) this.aviso(m.x, m.y - 130, Phaser.Utils.Array.GetRandom(['¡¿QUÉ?!', '¡UN EXTRAÑO!', '¡PROFANADOR!']), 'rojo');
      this.time.delayedCall(650 + i * 90, () => {
        if (!m.active || m.getData('estado') !== 'sorpresa') return;
        m.setData('estado', 'ataque').play('min_corre');
      });
    });
  }

  // La vela cae al suelo y se apaga con humo; la botella cae y se derrama.
  soltarCosas(m) {
    const rol = m.getData('rol');
    const lado = m.flipX ? -1 : 1;
    const x = m.x + lado * 22;
    const piso = this.superficie(x, m.y - 20).y;
    if (rol === 'vela') {
      const foco = m.getData('foco');
      const v = this.add.sprite(x, m.y - 70, 'cav_c_vela_cae', 0).setOrigin(0.5, 1).setDepth(9.7).setScale(1.5);
      this.tweens.add({ targets: v, y: piso, x: x + lado * 20, duration: 420, ease: 'Quad.in', onUpdate: () => foco && foco.mover(v.x, v.y - 14) });
      this.time.delayedCall(420, () => {
        v.play('c_vela_cae');
        v.once('animationcomplete', () => this.tweens.add({ targets: v, alpha: 0, delay: 1500, duration: 600, onComplete: () => v.destroy() }));
        if (foco) this.time.delayedCall(350, () => foco.apagar(300));
      });
    } else if (rol === 'vierte') {
      const b = this.add.image(x, m.y - 60, 'cav_c_botella', 0).setOrigin(0.5, 1).setDepth(9.7).setScale(1.3);
      this.tweens.add({ targets: b, y: piso + 2, x: x + lado * 30, angle: lado * 200, duration: 450, ease: 'Quad.in',
        onComplete: () => { b.setAngle(0); chispas(this, b.x, piso - 4, 3, -90, 80, 9.8); this.tweens.add({ targets: b, alpha: 0, delay: 3500, duration: 600, onComplete: () => b.destroy() }); } });
    }
  }

  moverMineros() {
    if (!this.mineros) return;
    const M = this.cfg.minero;
    const j = this.jugador;
    const ahora = this.time.now;
    this.mineros.getChildren().forEach((m) => {
      if (!m.active) return;
      this.actualizarSombra(m.getData('sombra'), m);
      const estado = m.getData('estado');
      if (estado === 'ritual') {
        if (this.estado === 'control' && Math.abs(j.x - m.x) < M.vista && Math.abs(j.y - m.y) < 160) this.descubrir();
        return;
      }
      if (estado !== 'ataque') return;
      const dx = j.x - m.x;
      const dy = j.body.bottom - m.body.bottom;
      m.setFlipX(dx < 0);
      if (ahora < m.getData('golpeHasta')) { m.setVelocityX(0); return; }
      if (Math.abs(dx) < M.alcance && Math.abs(dy) < 60) {
        m.setVelocityX(0);
        if (ahora > m.getData('proximoGolpe') && !this.muerto) this.golpeMinero(m);
        else if (m.anims.currentAnim?.key !== 'min_guardia') m.play('min_guardia');
        return;
      }
      m.setVelocityX(Math.sign(dx) * m.getData('velocidad'));
      if (m.anims.currentAnim?.key !== 'min_corre') m.play('min_corre');
      const b = m.body;
      if ((b.blocked.down || b.touching.down) && (b.blocked.left || b.blocked.right)) b.setVelocityY(-420);
    });
  }

  golpeMinero(m) {
    const ahora = this.time.now;
    m.setData({ golpeHasta: ahora + 480, proximoGolpe: ahora + this.cfg.minero.golpe });
    m.play('min_golpe');
    this.time.delayedCall(230, () => {
      if (!m.active || m.getData('estado') !== 'ataque') return;
      const j = this.jugador;
      if (Math.abs(j.x - m.x) < this.cfg.minero.alcance + 16 && Math.abs(j.body.bottom - m.body.bottom) < 70) this.golpearJugador(m.x);
    });
  }

  danarMinero(m, dano, desdeX = this.jugador.x) {
    if (m.getData('estado') === 'muerto') return;
    m.setData('vida', m.getData('vida') - dano);
    m.setTintFill(0xffffff);
    this.time.delayedCall(60, () => m.active && m.clearTint());
    if (m.getData('vida') > 0) return;
    m.setData('estado', 'muerto');
    m.body.enable = false;
    m.anims.stop();
    m.setFrame(22).setFlipX(desdeX > m.x);
    sumarPuntos(this, this.cfg.minero.puntos);
    sonarSfx(this, 'muerteNpc');
    estallidoSangre(this, m.x, m.y - 50);
    const foco = m.getData('foco');
    if (foco) foco.apagar(200);
    const lejos = desdeX < m.x ? 1 : -1;
    this.tweens.add({ targets: m, x: m.x + lejos * 40, y: m.y - 20, duration: 220, yoyo: true, ease: 'Quad.out' });
    this.tweens.add({ targets: m, alpha: 0, delay: 1300, duration: 500, onComplete: () => m.destroy() });
  }

  danoEnArea(x, y, radio, dano, cuerpo = false) {
    super.danoEnArea(x, y, radio, dano, cuerpo);
    if (this.tio) this.explosionContraTio(x, y, radio, dano);
    if (!this.mineros) return;
    this.mineros.getChildren().slice().forEach((m) => {
      if (m.active && Phaser.Math.Distance.Between(x, y, m.x, m.y - 50) <= radio + 20) { this.descubrir(); this.danarMinero(m, dano * 2, x); }
    });
  }

  disparar() {
    this.descubrir();
    super.disparar();
  }

  vivos() {
    return this.mineros ? this.mineros.getChildren().filter((m) => m.active && m.getData('estado') !== 'muerto').length : 0;
  }

  // Bajan por las escaleras de los andamios (de espaldas, trepando).
  refuerzos() {
    this.oleada = 2;
    const escaleras = this.colision.ladders;
    const { width } = this.scale;
    const cartel = TextFX.alert(this, width / 2, 110, '¡MÁS MINEROS!', { escala: 3 }).setScrollFactor(0).setDepth(31);
    cartel.destellar(4, 90, () => this.tweens.add({ targets: cartel, alpha: 0, delay: 600, duration: 300, onComplete: () => cartel.destroy() }));
    for (let i = 0; i < this.cfg.refuerzos; i++) {
      const e = escaleras[i % escaleras.length];
      this.time.delayedCall(300 + i * 900, () => {
        const x = (e.x0 + e.x1) / 2;
        const m = this.nuevoMinero(x, e.arriba - 20, null, x > this.cfg.estatua.x);
        m.setData('estado', 'baja').setAlpha(0).play('min_trepa');
        m.body.enable = false;
        m.y = e.arriba;
        this.tweens.add({ targets: m, alpha: 1, duration: 300 });
        this.tweens.add({
          targets: m, y: e.abajo - 2, duration: 1700, delay: 250, ease: 'Linear',
          onComplete: () => {
            if (!m.active || m.getData('estado') !== 'baja') return;
            m.body.enable = true;
            m.body.reset(m.x, m.y);
            m.setData('estado', 'ataque').play('min_corre');
          }
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Cámara: sigue al jugador hasta que pasa el centro de la arena y se traba.
  // ---------------------------------------------------------------------------

  actualizarCamara(delta) {
    const cam = this.cameras.main;
    if (this.estado === 'editor' || this.zoomCine) return; // (el zoom de la cinemática mueve la cámara)
    if (this.ritualEstado === 'escape') {
      // La persecución: avanza sola y nunca vuelve; si el jugador se adelanta, lo acompaña.
      const corre = ['persigue', 'ataca', 'dano'].includes(this.tioEstado) && !this.muerto && this.estado !== 'saliendo';
      let x = cam.scrollX + (corre ? JEFE2.camara * delta / 1000 : 0);
      x = Math.max(x, this.jugador.x - this.scale.width * 0.62);
      cam.scrollX = Math.min(this.cfg.ancho - this.scale.width, Math.max(cam.scrollX, x));
      this.camaraMinima = cam.scrollX;
      return;
    }
    const maximo = this.cfg.anchoArena - this.scale.width;
    if (!this.camaraTrabada && this.jugador.x > this.cfg.centro) this.camaraTrabada = true;
    const objetivo = this.camaraTrabada ? maximo : Phaser.Math.Clamp(this.jugador.x - this.scale.width * 0.4, 0, maximo);
    const t = 1 - Math.pow(1 - 0.08, delta / 16.67);
    cam.scrollX = Math.max(this.camaraMinima || 0, cam.scrollX + (objetivo - cam.scrollX) * t);
    this.camaraMinima = cam.scrollX;
  }

  // El orden de la escena (en vez de las zonas de Nivel2).
  actualizarZonas() {
    if (this.ritualEstado === 'pelea' && this.vivos() === 0) {
      if (this.oleada === 1) this.refuerzos();
      else if (!this.pendienteRefuerzos()) { this.ritualEstado = 'cinematica'; this.romperEstatua(); }
    }
  }

  pendienteRefuerzos() {
    return this.creados < this.cfg.ritual.length + this.cfg.refuerzos;
  }

  actualizarHUD() {
    this.hud.setText('');
  }

  // ---------------------------------------------------------------------------
  // La estatua se rompe y sale el jefe (cinemática, sin control, ~5 s)
  // ---------------------------------------------------------------------------

  romperEstatua() {
    const j = this.jugador;
    this.estado = 'cinematica';
    cerrarSelector(this, false);
    j.setVelocityX(0);
    this.invulnerableHasta = Infinity;
    this.mostrarGo(false);
    if (this.ritmo) this.ritmo.detener(400);
    const E = this.estatua;
    const { x, y } = this.cfg.estatua;
    // 1 s de silencio; las velas titilan fuerte y se apagan una por una.
    this.time.delayedCall(1000, () => {
      this.velas.forEach((v, i) => this.time.delayedCall(i * 180, () => {
        v.foco.titilarFuerte(true);
        this.time.delayedCall(260, () => {
          v.foco.apagar(120);
          v.s.anims.stop();
          v.s.setTint(0x403028);
          const humo = this.add.sprite(v.s.x, v.s.y - 16, 'cav_c_incienso', 0).setOrigin(0.5, 1).setDepth(9).setScale(1.4);
          humo.play('c_incienso');
          this.tweens.add({ targets: humo, alpha: 0, y: humo.y - 30, duration: 1200, onComplete: () => humo.destroy() });
        });
      }));
      this.incienso.forEach((s) => this.tweens.add({ targets: s, alpha: 0, duration: 800 }));
    });
    // La estatua tiembla cada vez más; anillos de aura y el altar al máximo.
    const temblor = { amp: 0 };
    this.time.delayedCall(1900, () => {
      // La cámara se acerca de a poco a la estatua mientras tiembla.
      this.zoomCine = true;
      const cam = this.cameras.main;
      cam.pan(x, y - 120, 1800, 'Sine.easeInOut');
      cam.zoomTo(1.45, 1800, 'Sine.easeInOut');
      this.tweens.add({ targets: temblor, amp: 5, duration: 1800, ease: 'Quad.in' });
      this.luzAltar.subir(2.6, 1800);
      sonarGruñido(this, 1.8, 0.12);
      this.cameras.main.shake(1800, 0.003);
      for (let k = 0; k < 6; k++) {
        this.time.delayedCall(k * 280, () => {
          const a = this.add.sprite(x, y - 30 - k * 26, 'cav_c_aura', 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.6 + k * 0.08, 0.6);
          a.play('c_aura');
          this.tweens.add({ targets: a, scaleX: a.scaleX * 1.6, scaleY: 0.9, alpha: 0, duration: 700, delay: 380, onComplete: () => a.destroy() });
        });
      }
    });
    this.temblorEstatua = () => { if (E.active) E.x = x + (Math.random() * 2 - 1) * temblor.amp; };
    this.events.on('update', this.temblorEstatua);
    // ¡CRACK! La estatua revienta.
    this.time.delayedCall(3800, () => {
      this.events.off('update', this.temblorEstatua);
      const cam = this.cameras.main;
      // ¡CRACK!: el zoom pega un golpe más cerca y sigue al Tío mientras sale.
      cam.zoomTo(1.8, 350, 'Quad.easeOut', true);
      cam.pan(x, y - 160, 350, 'Quad.easeOut', true);
      cam.shake(700, 0.022);
      cam.flash(260, 255, 255, 255);
      sonarImpacto(this, 'cohete');
      E.setVisible(false);
      infierno(this, 1500); // salió del infierno: todo se pone rojo lava
      const jefe = this.add.sprite(x, y, 'cavJefe_despierta', 1).setDepth(9.1).setScale(this.cfg.escalaJefe);
      origenJefe(this, jefe, 'despierta');
      if (this.luz2d) jefe.setPipeline('Light2D');
      this.tio = jefe;
      jefe.play('jefe2_despierta');
      this.lluviaDeRocas(x, y - 120, 14);
      const polvo = this.add.sprite(x, y + 20, 'cav_c_polvo', 0).setOrigin(0.5, 1).setDepth(9.3).setScale(2.4);
      polvo.play('c_polvo');
      polvo.once('animationcomplete', () => this.tweens.add({ targets: polvo, alpha: 0, duration: 600, onComplete: () => polvo.destroy() }));
      jefe.once('animationcomplete', () => this.rugido());
    });
  }

  // Rocas con física: saltan del altar, rebotan y se desvanecen.
  lluviaDeRocas(x, y, n) {
    for (let k = 0; k < n; k++) {
      const r = this.physics.add.image(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 'cav_c_rocas', Phaser.Math.Between(0, 7))
        .setDepth(10.5).setScale(Phaser.Math.FloatBetween(0.5, 0.9));
      r.body.setSize(r.width * 0.4, r.height * 0.4);
      r.setVelocity(Phaser.Math.Between(-380, 380), Phaser.Math.Between(-620, -260)).setBounce(0.45).setAngularVelocity(Phaser.Math.Between(-400, 400));
      r.setDragX(60);
      this.physics.add.collider(r, this.solidos);
      this.tweens.add({ targets: r, alpha: 0, delay: Phaser.Math.Between(1300, 2000), duration: 500, onComplete: () => r.destroy() });
    }
  }

  // Ruge (con temblor), ¡ALERTA!, su barra de vida y la música del jefe.
  rugido() {
    const jefe = this.tio;
    jefe.setTexture('cavJefe_ruge', 0);
    origenJefe(this, jefe, 'ruge');
    jefe.play('jefe2_ruge');
    sonarGruñido(this, 1.6, 0.3);
    this.cameras.main.shake(900, 0.014);
    // Ruge de cerca; un estallido de lava (destello) y, detrás, el corte: ya
    // está hundido en la lava y el altar ya no está. La cámara se aleja.
    this.time.delayedCall(1300, () => {
      const cam = this.cameras.main;
      cam.flash(450, 255, 200, 140);
      cam.shake(500, 0.016);
      sonarImpacto(this, 'cohete');
      const { x, y } = this.cfg.estatua;
      const e = this.add.sprite(x, y + 40, 'cav_c_explosion', 0).setOrigin(0.5, 1).setDepth(10.6).setScale(2.2);
      e.play('c_explosion');
      e.once('animationcomplete', () => e.destroy());
      this.tioALaLava();
    });
    this.time.delayedCall(1700, () => {
      const cam = this.cameras.main;
      const { width, height } = this.scale;
      cam.zoomTo(1, 1000, 'Sine.easeInOut', true);
      cam.pan(this.cfg.anchoArena - width / 2, height / 2, 1000, 'Sine.easeInOut', true, (c, t) => {
        if (t >= 1) this.zoomCine = false;
      });
    });
    this.time.delayedCall(2900, () => {
      alertaJefe(this, () => {
        this.barraJefe = crearBarraJefe(this, NOMBRE_JEFE2);
        this.barraJefe.llenar();
        this.ritmo = musicaJefe(this);
        this.time.delayedCall(1100, () => this.empezarEscape());
      });
    });
  }

  // ¡CORRE!: el jugador recupera el control y escapa a la derecha: el piso
  // se rompe detrás de él y el Tío lo persigue (PersecucionJefe.js).
  empezarEscape() {
    this.ritualEstado = 'escape';
    this.estado = 'control';
    this.invulnerableHasta = this.time.now + 600;
    const { width } = this.scale;
    const corre = TextFX.alert(this, width / 2, 150, '¡CORRE!', { escala: 5 }).setScrollFactor(0).setDepth(31);
    corre.destellar(8, 90, () => this.tweens.add({ targets: corre, alpha: 0, duration: 300, onComplete: () => corre.destroy() }));
    this.mostrarGo(true);
    this.time.delayedCall(2500, () => this.mostrarGo(false));
    // Si muere de acá en adelante, reaparece acá (saltarAEscape).
    this.registry.set('tioCheckpoint', true);
    this.iniciarPersecucion(); // PersecucionJefe.js: el piso empieza a romperse
  }

  // Una piedra cae del techo (con su sombra de aviso) y lastima si pega.
  piedraDelTecho(x) {
    const piso = this.superficie(x, 200).y;
    const sombra = this.add.ellipse(x, piso - 2, 10, 5, 0x000000, 0.5).setDepth(9.2);
    this.tweens.add({ targets: sombra, displayWidth: 46, duration: 700 });
    const p = this.add.image(x, -40, 'cav_c_rocas', Phaser.Math.Between(0, 7)).setDepth(10.6).setScale(0.8);
    this.tweens.add({
      targets: p, y: piso - 14, angle: 300, duration: 700, ease: 'Quad.in',
      onComplete: () => {
        sombra.destroy();
        chispas(this, x, piso - 6, 5, -90, 120, 10.6);
        const b = this.jugador.body;
        if (Math.abs(b.center.x - x) < 36 && b.bottom > piso - 140 && b.top < piso) this.golpearJugador(x);
        this.tweens.add({ targets: p, alpha: 0, duration: 400, onComplete: () => p.destroy() });
      }
    });
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.estado !== 'editor') {
      this.moverMineros();
      if (this.enLava) this.moverTio(time); // (ya respira en la lava antes de correr)
      if (this.ritualEstado === 'escape' && this.tio) {
        const dt = Math.min(delta, 50) / 1000;
        this.moverLlamas2(dt);
        this.balasContraTio();
        this.mantenerTramos();
        this.destruirCamino(dt);
        this.revisarLava();
      }
    }
    this.moverLava(time);
    moverLucesCaverna(this, time);
  }

  limpiarCaverna() {
    if (this.temblorEstatua) this.events.off('update', this.temblorEstatua);
    this.mineros = null;
    this.velas = [];
    this.focos = [];
  }
}

// =============================================================================
// Lo que comparten la caverna y la persecución
// =============================================================================

const HOJAS_CAVERNA = ['minero', 'c_velas', 'c_vela_cae', 'c_botella', 'c_serpentina', 'c_incienso', 'c_aura', 'c_rocas', 'c_polvo', 'c_explosion',
  'lava_rompe', 'lava', 'lava_rocas', 'lava_salpica', 'lava_brasas', 'lava_borde'];
const ANIMS_JEFE2 = ['despierta', 'ruge', 'persigue', 'lanza', 'fuego', 'suelo', 'dano', 'muere', 'camina', 'muere2'];

function cargarCaverna(escena) {
  const imagen = (clave, archivo) => { if (!escena.textures.exists(clave)) escena.load.image(clave, RUTA_CAVERNA + archivo); };
  imagen('cavA3', 'a3_frente.png');
  imagen('cavArenaAltar', 'arena_altar.png');
  imagen('cavArenaPiso', 'arena_piso.png');
  imagen('cavPersFondo', 'persecucion_fondo.png');
  imagen('cavPersPiso', 'persecucion_piso.png');
  imagen('cav_lava_tile', 'lava_tile.png');
  if (!escena.cache.json.exists('persecucionColision')) escena.load.json('persecucionColision', RUTA_CAVERNA + 'persecucion_collision.json');
  HOJAS_CAVERNA.forEach((n) => imagen('cav_' + n, `hoja_${n}.png`));
  ANIMS_JEFE2.forEach((n) => imagen('cavJefe_' + n, `jefe_${n}.png`));
  imagen('cav_estatua', 'estatua.png');
  if (!escena.cache.json.exists('cavernaDatos')) escena.load.json('cavernaDatos', RUTA_CAVERNA + 'caverna.json');
}

// Cuadros de las hojas y animaciones (una sola vez para todo el juego).
function prepararCaverna(escena) {
  const datos = escena.cache.json.get('cavernaDatos');
  hojasDeJson(escena, 'cav_', datos.hojas);
  const jefe = {};
  Object.entries(datos.jefe).forEach(([n, d]) => { jefe[n] = [d.ancho, d.alto, d.cuadros]; });
  hojasDeJson(escena, 'cavJefe_', jefe);
  texturasLuzMina(escena);
  const anim = (key, clave, frames, frameRate, repeat = 0) => {
    if (!escena.anims.exists(key)) escena.anims.create({ key, frames: escena.anims.generateFrameNumbers(clave, { frames }), frameRate, repeat });
  };
  anim('min_reza', 'cav_minero', [0, 1, 2, 2, 1, 0, 3, 3], 3, -1);
  anim('min_vierte', 'cav_minero', [4, 5, 6, 6, 6, 5, 4, 7], 4, -1);
  anim('min_vela', 'cav_minero', [8, 9, 10, 11, 10, 9], 5, -1);
  anim('min_trepa', 'cav_minero', [15, 16, 17, 18, 19], 8, -1);
  anim('min_corre', 'cav_minero', [25, 23, 25, 24], 7, -1);
  anim('min_guardia', 'cav_minero', [25], 1, -1);
  anim('min_golpe', 'cav_minero', [23, 24, 24, 25], 9);
  anim('c_velas_a', 'cav_c_velas', [0, 1], 5, -1);
  anim('c_velas_b', 'cav_c_velas', [2, 3, 4, 5, 4, 3], 6, -1);
  anim('c_vela_cae', 'cav_c_vela_cae', [0, 1, 2, 3, 4, 5], 10);
  anim('c_serpentina', 'cav_c_serpentina', [0, 1, 2, 3, 4, 5], 6, -1);
  anim('c_incienso', 'cav_c_incienso', [0, 1, 2, 3, 4], 5, -1);
  anim('c_aura', 'cav_c_aura', [0, 1, 2, 3, 4, 5, 6], 12);
  anim('c_polvo', 'cav_c_polvo', [0, 1, 2, 3, 4, 5, 6], 9);
  anim('c_explosion', 'cav_c_explosion', [0, 1, 2, 3, 4, 5, 6, 7], 16);
  anim('lava_rompe', 'cav_lava_rompe', [0, 1, 2, 3, 4, 5, 6, 7], 13);
  anim('lava_bucle', 'cav_lava', [0, 1, 0, 1, 2, 3], 4, -1);
  anim('lava_rocas', 'cav_lava_rocas', [0, 1, 2, 3, 4, 5], 12);
  anim('lava_salpica', 'cav_lava_salpica', [0, 1, 2, 3, 4, 5], 12);
  // Sale de la estatua despacio (cada cuadro se ve bien).
  anim('jefe2_despierta', 'cavJefe_despierta', [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5], 4);
  // Persiguiendo: arrastra las garras por la lava (las dos filas de persigue).
  anim('jefe2_anda', 'cavJefe_persigue', [0, 1, 2, 1], 4, -1);
  // camina.jpeg (de la cintura para arriba): el paso de la persecución.
  anim('jefe2_camina', 'cavJefe_camina', [0, 1, 2, 3, 4, 5], 6, -1);
  // luego_de_muere.jpeg: después de muere, se agrieta, arde y se derrumba.
  anim('jefe2_muere2', 'cavJefe_muere2', [0, 1, 2, 3, 4, 5, 6], 3);
  anim('jefe2_anda2', 'cavJefe_persigue', [3, 4, 5, 4], 4, -1);
  anim('lava_brasas', 'cav_lava_brasas', [0, 1, 2], 8);
  anim('jefe2_ruge', 'cavJefe_ruge', [0, 1, 2, 1, 2, 1, 0], 7);
  anim('jefe2_suelo', 'cavJefe_suelo', [0, 0, 1, 1, 2], 6);
}

// El Tío salió del infierno: todo se pone rojo lava. Las capas del fondo y
// el nivel se tiñen, la luz ambiente pasa a rojo, sube el resplandor de la
// lava desde abajo y suben brasas. ms: en cuánto pasa (0: ya).
function infierno(escena, ms = 1500) {
  const { width, height } = escena.scale;
  if (!escena.textures.exists('lava_resplandor')) {
    const t = escena.textures.createCanvas('lava_resplandor', 4, 256);
    const c = t.getContext();
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,60,10,0)');
    g.addColorStop(0.6, 'rgba(255,70,15,0.35)');
    g.addColorStop(1, 'rgba(255,120,30,0.75)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
    t.refresh();
  }
  // Las capas del fondo y la arena (los bloques, tramos y el altar ya están
  // anotados: tinteInfierno).
  escena.children.list.forEach((o) => {
    if (o.texture && /^(cavA1|cavArenaFondo)$/.test(o.texture.key) && !escena.rojos.includes(o)) tinteInfierno(escena, o);
  });
  const rojo = { k: escena.rojo || 0 };
  const resplandor = escena.add.image(0, height, 'lava_resplandor').setOrigin(0, 1).setDisplaySize(width, 300)
    .setScrollFactor(0).setDepth(17.65).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const brasas = escena.add.particles(0, 0, 'fx_chispa', {
    x: { min: 0, max: width }, y: height + 6, speedY: { min: -120, max: -45 }, speedX: { min: -20, max: 20 },
    lifespan: { min: 2500, max: 4500 }, scale: { start: 1.6, end: 0.3 }, alpha: { start: 0.9, end: 0 },
    tint: [0xff5a1a, 0xffa030, 0xff3010], blendMode: 'ADD', frequency: 70, maxAliveParticles: 70
  }).setScrollFactor(0).setDepth(17.7);
  brasas.setAlpha(0);
  escena.tweens.add({
    targets: rojo, k: 1, duration: Math.max(1, ms),
    onUpdate: () => {
      escena.rojo = rojo.k;
      escena.rojos = escena.rojos.filter((o) => o.active);
      escena.rojos.forEach((o) => aplicarRojo(escena, o));
      resplandor.setAlpha(rojo.k * 0.8);
      brasas.setAlpha(rojo.k);
      if (escena.luz2d) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(0x8a7a70), Phaser.Display.Color.IntegerToColor(0xa04a34), 100, rojo.k * 100);
        escena.lights.setAmbientColor(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      }
    },
    onComplete: () => escena.tweens.add({ targets: resplandor, alpha: 0.55, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  });
}

// Anota una imagen para teñirla de rojo infierno (ahora y cuando suba).
function tinteInfierno(escena, o) {
  if (!escena.rojos) escena.rojos = [];
  escena.rojos.push(o);
  aplicarRojo(escena, o);
}

function aplicarRojo(escena, o) {
  const fondo = o.texture.key === 'cavA1';
  const a = Phaser.Display.Color.IntegerToColor(fondo ? 0x8a7a70 : 0xffffff);
  const b = Phaser.Display.Color.IntegerToColor(fondo ? 0xb03a26 : 0xff9478);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, (escena.rojo || 0) * 100);
  o.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
}

// Crujido de piedra que se parte (ruido grave corto, WebAudio).
function sonarCrujido(escena) {
  const ctx = escena.sound.context;
  if (!ctx || !ctx.createBufferSource || escena.sound.locked) return;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const largo = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2) * (Math.random() < 0.08 ? 1 : 0.4);
  const f = ctx.createBufferSource();
  f.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.value = 0.45;
  f.connect(filtro).connect(g).connect(destino);
  if (escena.eco) g.connect(escena.eco.entrada);
  f.start();
}

// El marco de roca de adelante (A3): una sola vez, un poco más grande que la
// pantalla, y corre `factor` (1.2: un 20 % más que el mundo) hasta donde le
// sobra (repetido, su borde y el del espejo hacían una columna en el medio).
function crearMarco(escena, factor, bajar = 0) {
  const { width, height } = escena.scale;
  const t = escena.textures.get('cavA3');
  const ancho = t.getSourceImage().width / 2; // (la imagen viene espejada: la mitad)
  if (!t.has('marco')) t.add('marco', 0, 0, 0, ancho, t.getSourceImage().height);
  const k = 1.14;
  const marco = escena.add.image(width / 2, height / 2 + bajar, 'cavA3', 'marco').setScale(width * k / ancho, height * 1.04 / t.getSourceImage().height)
    .setScrollFactor(0).setDepth(12);
  const sobra = (marco.displayWidth - width) / 2;
  // (En la persecución el mundo no termina: el marco va y vuelve suave.)
  const mover = () => {
    const x = escena.cameras.main.scrollX * (factor - 1);
    marco.x = width / 2 + sobra - (x <= sobra * 2 ? x : sobra + Math.sin(x / 300) * sobra);
  };
  escena.events.on('update', mover);
  escena.events.once('shutdown', () => escena.events.off('update', mover));
  return marco;
}

// Pone el origen de la hoja del jefe (todas apoyan la cintura en el mismo punto).
function origenJefe(escena, sprite, nombre) {
  const [ox, oy] = escena.cache.json.get('cavernaDatos').jefe[nombre].origen;
  sprite.setOrigin(ox, oy);
}

function callarMusica(escena) {
  const m = escena.sound.musicaActual;
  if (!m) return;
  escena.tweens.add({ targets: m, volume: 0, duration: 800, onComplete: () => { m.destroy(); if (escena.sound.musicaActual === m) escena.sound.musicaActual = null; } });
}

// Música del jefe: la pista 'jefe2' si se agrega a MUSICAS (Musica.js); si
// no, tambores de guerra sintetizados.
function musicaJefe(escena) {
  if (MUSICAS.jefe2 && escena.cache.audio.exists('musica_jefe2')) { tocarMusica(escena, 'jefe2'); return null; }
  return ritmoMina(escena, { bpm: 150, volumen: 0.55, patron: 'BxbxBbxbBxbxBbbb', canto: true, tono: 73 });
}

// -----------------------------------------------------------------------------
// Luz: velo negro (RenderTexture) con agujeros en cada foco, resplandores ADD
// que titilan y Light2D (si hay WebGL). Los focos se pueden apagar, titilar
// fuerte, moverse y subir de intensidad (el altar).
// -----------------------------------------------------------------------------

function crearLucesCaverna(escena, L, capas) {
  const { width, height } = escena.scale;
  escena.luzCfg = L;
  escena.focos = [];
  escena.luz2d = escena.sys.renderer.type === Phaser.WEBGL && !!escena.lights && !esMovil();
  if (escena.luz2d) {
    escena.lights.enable().setAmbientColor(L.ambiente || 0x8a7a70);
    capas.forEach((o) => o.setPipeline('Light2D'));
    escena.luzJugador = escena.lights.addLight(0, 0, 170, 0xfff0d2, 0.8);
  }
  escena.velo = escena.add.renderTexture(0, 0, width, height).setOrigin(0).setScrollFactor(0).setDepth(17.5);
  escena.sello = escena.make.image({ x: 0, y: 0, key: 'tun_luzMascara', add: false });
  escena.events.once('shutdown', () => { if (escena.sello) escena.sello.destroy(); escena.sello = null; escena.focos = []; });
  escena.nuevoFoco = (x, y, o = {}) => {
    const f = {
      x, y, radio: o.radio || 140, color: o.color || 0xffb060, intensidad: o.intensidad || 1.2, brillo: o.brillo ?? 0.32,
      pulso: o.pulso || 0, ritmo: o.ritmo || Phaser.Math.FloatBetween(2.2, 3.6), fase: Math.random() * 10,
      fuerza: 1, fuerte: false, caida: 0
    };
    f.img = escena.add.image(x, y, 'tun_luzCalida').setScale(f.radio / 128).setTint(f.color).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(f.brillo).setDepth(17.6);
    f.luz = escena.luz2d ? escena.lights.addLight(x, y, f.radio * 1.4, f.color, f.intensidad) : null;
    f.mover = (nx, ny) => { f.x = nx; f.y = ny; f.img.setPosition(nx, ny); if (f.luz) f.luz.setPosition(nx, ny); };
    f.apagar = (ms = 200) => { f.fuerte = false; escena.tweens.add({ targets: f, fuerza: 0, duration: ms }); };
    f.titilarFuerte = (si) => { f.fuerte = si; };
    f.subir = (k, ms) => escena.tweens.add({ targets: f, fuerza: k, duration: ms, ease: 'Quad.in' });
    f.destruir = () => {
      f.img.destroy();
      if (f.luz) escena.lights.removeLight(f.luz);
      Phaser.Utils.Array.Remove(escena.focos, f);
    };
    escena.focos.push(f);
    return f;
  };
}

function moverLucesCaverna(escena, time) {
  if (!escena.velo || !escena.sello) return;
  const L = escena.luzCfg;
  const cam = escena.cameras.main;
  const t = time / 1000;
  const v = escena.velo.clear().fill(0x000000, L.velo);
  const borrar = (x, y, radio, alfa) => {
    escena.sello.setScale(radio / 128).setAlpha(Phaser.Math.Clamp(alfa, 0, 1));
    v.erase(escena.sello, Math.round(x - cam.scrollX), Math.round(y - cam.scrollY));
  };
  escena.focos.forEach((f) => {
    if (f.caida <= 0 && Math.random() < 0.0015) f.caida = Phaser.Math.Between(3, 7);
    const falla = f.caida > 0 ? 0.55 : 1;
    if (f.caida > 0) f.caida--;
    let k = (0.88 + Math.sin(t * f.ritmo + f.fase) * 0.07 + Math.sin(t * f.ritmo * 2.7 + f.fase * 2) * 0.05) * falla;
    if (f.pulso) k = 1 - f.pulso + Math.sin(t * f.ritmo) * f.pulso; // el altar: lento
    if (f.fuerte) k *= Phaser.Math.FloatBetween(0.3, 1.5);
    k *= f.fuerza;
    f.img.setAlpha(f.brillo * Math.min(k, 2)).setScale(f.radio / 128 * (0.9 + Math.min(k, 2.6) * 0.1));
    if (f.luz) f.luz.setIntensity(f.intensidad * k);
    if (k > 0.02 && f.x > cam.scrollX - f.radio && f.x < cam.scrollX + escena.scale.width + f.radio) borrar(f.x, f.y, f.radio * (0.9 + Math.min(k, 2) * 0.1), 0.95 * Math.min(k, 1.2));
  });
  const j = escena.jugador;
  if (j) {
    borrar(j.x, j.y - 20, L.jugador, j.alpha > 0.1 ? 1 : 0);
    if (escena.luzJugador) escena.luzJugador.setPosition(j.x, j.y - 30);
  }
}

// -----------------------------------------------------------------------------
// Barra de vida del jefe (arriba al medio, con su nombre).
// -----------------------------------------------------------------------------

function crearBarraJefe(escena, nombre) {
  const { width } = escena.scale;
  const ancho = 420;
  const x = width / 2 - ancho / 2;
  const y = 64;
  const fijo = (o) => o.setScrollFactor(0).setDepth(33);
  const marco = fijo(escena.add.rectangle(x - 4, y - 4, ancho + 8, 22, 0x000000, 0.85).setOrigin(0).setStrokeStyle(2, 0xffd23f));
  const fondo = fijo(escena.add.rectangle(x, y, ancho, 14, 0x3a0a0a).setOrigin(0));
  const atras = fijo(escena.add.rectangle(x, y, ancho, 14, 0xffffff).setOrigin(0));
  const barra = fijo(escena.add.rectangle(x, y, 0, 14, 0xd8301c).setOrigin(0));
  const texto = fijo(TextFX.texto(escena, width / 2, y - 18, nombre, { color: 'rojo', escala: 1 }));
  let valor = 0;
  return {
    objetos: [marco, fondo, atras, barra, texto],
    llenar(ms = 900) {
      escena.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (tw) => { valor = tw.getValue(); barra.width = ancho * valor; atras.width = ancho * valor; } });
    },
    set(f) {
      f = Phaser.Math.Clamp(f, 0, 1);
      barra.width = ancho * f;
      barra.setFillStyle(f < 0.3 ? 0xff6020 : 0xd8301c);
      escena.tweens.killTweensOf(atras);
      escena.tweens.add({ targets: atras, width: ancho * f, delay: 250, duration: 400 });
      valor = f;
    },
    ocultar() { [marco, fondo, atras, barra, texto].forEach((o) => escena.tweens.add({ targets: o, alpha: 0, duration: 500 })); }
  };
}

// -----------------------------------------------------------------------------
// Sonido (WebAudio, sin archivos): tambores y cánticos, y el gruñido del jefe.
// -----------------------------------------------------------------------------

// Tambores en bucle (B fuerte, b suave, x platillo seco, . silencio; cada
// letra una corchea) y, con canto, un zumbido grave de voces que respira.
function ritmoMina(escena, { bpm = 80, volumen = 0.5, patron = 'B..b..B.b.B..b..', canto = false, tono = 98 } = {}) {
  const ctx = escena.sound.context;
  const nada = { detener() {} };
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return nada;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const general = ctx.createGain();
  general.gain.value = volumen;
  general.connect(destino);
  if (escena.eco) general.connect(escena.eco.entrada);
  const golpe = (fuerte) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(fuerte ? 120 : 160, t);
    o.frequency.exponentialRampToValueAtTime(fuerte ? 42 : 70, t + 0.22);
    g.gain.setValueAtTime(fuerte ? 0.5 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(general);
    o.start(t);
    o.stop(t + 0.4);
  };
  const seco = () => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(900, t);
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(general);
    o.start(t);
    o.stop(t + 0.05);
  };
  let paso = 0;
  const reloj = escena.time.addEvent({
    delay: 60000 / bpm / 2, loop: true, callback: () => {
      const c = patron[paso % patron.length];
      if (c === 'B') golpe(true); else if (c === 'b') golpe(false); else if (c === 'x') seco();
      paso++;
    }
  });
  const voces = [];
  let vozGain = null;
  if (canto) {
    vozGain = ctx.createGain();
    vozGain.gain.value = 0;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 420;
    filtro.Q.value = 2.5;
    [1, 1.5, 1.006].forEach((m) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = tono * m;
      o.connect(filtro);
      o.start();
      voces.push(o);
    });
    filtro.connect(vozGain).connect(general);
    // Respira: sube y baja cada ~4 s.
    const lfo = ctx.createOscillator();
    const prof = ctx.createGain();
    lfo.frequency.value = 0.25;
    prof.gain.value = 0.05;
    lfo.connect(prof).connect(vozGain.gain);
    lfo.start();
    voces.push(lfo);
    vozGain.gain.setTargetAtTime(0.06, ctx.currentTime, 1.5);
  }
  const silenciar = (si) => general.gain.setTargetAtTime(si ? 0 : volumen, ctx.currentTime, 0.05);
  const alPausar = () => silenciar(true);
  const alSeguir = () => silenciar(false);
  escena.events.on('pause', alPausar);
  escena.events.on('resume', alSeguir);
  let vivo = true;
  const cortar = () => {
    if (!vivo) return;
    vivo = false;
    reloj.remove();
    escena.events.off('pause', alPausar);
    escena.events.off('resume', alSeguir);
    voces.forEach((o) => { try { o.stop(); } catch (e) { /* ya */ } });
    try { general.disconnect(); } catch (e) { /* ya */ }
  };
  escena.events.once('shutdown', cortar);
  return {
    detener(ms = 400) {
      if (!vivo) return;
      reloj.remove();
      general.gain.setTargetAtTime(0, ctx.currentTime, ms / 3000);
      setTimeout(cortar, ms + 100);
    }
  };
}

// Gruñido grave (dientes de sierra que bajan y ruido), de `dura` segundos.
function sonarGruñido(escena, dura = 1.4, volumen = 0.25) {
  const ctx = escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(900, t);
  filtro.frequency.exponentialRampToValueAtTime(260, t + dura);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volumen, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
  filtro.connect(g).connect(destino);
  if (escena.eco) g.connect(escena.eco.entrada);
  [55, 58.5, 82].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.4, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, t + dura);
    o.connect(filtro);
    o.start(t);
    o.stop(t + dura + 0.05);
  });
}
