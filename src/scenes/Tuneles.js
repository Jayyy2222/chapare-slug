// =============================================================================
// NIVEL 2 · PARTE 3 · LOS TÚNELES DE LA MINA (escena Tuneles). Viene de la
// Subida (se entra por la bocamina) y sigue en la persecución en carrito
// (MineCartScene.js). Hereda de Nivel2 (y este de la Cueva): jugador, zonas,
// soldados y garroteros, rehenes, rompibles, colisión por JSON y su editor.
//
// Imágenes: assets/nivel2/mina/tuneles/ (herramientas/mina_tuneles.py, a
// partir de assets/fondos/lvl1/lvl2/mina_potosi/A1..A5.jpeg):
//   A1 a1_roca.png         roca del fondo, tileSprite, parallax 0.1
//   A2 a2_estructuras.png  andamios y faroles, parallax 0.35
//   A3 a3_nivel.png        el nivel jugable (scrollFactor 1). Para alargarlo
//                          se agregan más tramos a TUNELES.tramos (uno tras
//                          otro: x = borde izquierdo de cada uno)
//   A4 a4_arriba/abajo     primer plano, parallax 1.25, delante del jugador
//   A5                     gotas, salpicaduras, polvo, destellos y un haz
// Colisión: tuneles_collision.json (tecla E). Lo de siempre (ground: el suelo
// del túnel de abajo; platforms: la pasarela de arriba, one-way; walls: el
// techo y las paredes; ladders: escaleras) y además:
//   ascensores  el ascensor de cuerda [x0, x1, arriba, abajo] (tecla C): la
//               jaula sube y baja sola (espera / viaje ms: TUNELES.ascensor)
//   grietas     la pared con grietas [x, y, w, h] (tecla R): sólida hasta
//               que la rompe la dinamita; detrás hay un rehén escondido
//
// Luz: todo bajo un velo negro al 70 % (una RenderTexture) con agujeros de
// luz en cada lámpara (de tuneles_objetos.json) y alrededor del jugador; un
// resplandor cálido (ADD) que titila en cada lámpara y, con WebGL, Light2D:
// las lámparas y el jugador iluminan la roca. Sin WebGL quedan solo las
// máscaras de luz.
//
// Ambiente: goteo del techo, polvo que cae, destellos de plata en la roca y
// eco en todos los sonidos (Armas.js: crearEco).
//
// Juego: enemigos en los dos pisos, mineros atados que al soltarlos dan
// dinamita (K o G la lanza; en el celular, el botón TNT), la pared con
// grietas y, al final, la estación de carritos: el jugador se sube y empieza
// la persecución.
// =============================================================================

const RUTA_TUNELES = 'assets/nivel2/mina/tuneles/';
const RUTA_CARRITO = 'assets/nivel2/mina/carrito/';

const TUNELES = {
  ...POTOSI,
  ruta: RUTA_TUNELES,
  colision: { clave: 'tunelesColision', archivo: 'tuneles_collision.json' },
  ancho: 2322,
  escalaCasas: 1, piso: 512,
  inicio: { x: 60, desde: 470 },
  desde: 470,
  llenaVida: false,
  titulo: { nombre: 'EL SOCAVÓN', sub: 'LOS TÚNELES DEL CERRO RICO', escala: 4 },
  fondo: 0x050407,
  bruma: false,
  tramos: [{ clave: 'tunA3', archivo: 'a3_nivel.png', x: 0 }],
  parallax: [
    { clave: 'tunA1', archivo: 'a1_roca.png', factor: 0.1, y: 0 },
    { clave: 'tunA2', archivo: 'a2_estructuras.png', factor: 0.35, y: 0, tinte: 0xa89890 },
    // Primer plano (A4): delante del jugador (10) y los enemigos, debajo del velo de la luz.
    { clave: 'tunA4arriba', archivo: 'a4_arriba.png', factor: 1.25, y: -34, profundidad: 12 },
    { clave: 'tunA4abajo', archivo: 'a4_abajo.png', factor: 1.25, y: 524, profundidad: 12 }
  ],
  zonas: [{ limite: 0 }, { limite: 640 }, { limite: 1298, final: true, cartel: 'ESTACIÓN DE CARRITOS' }],
  aberturas: {},
  // desde: 200 = la pasarela de arriba; 470 = el túnel de abajo.
  enemigos: [
    { tipo: 'soldado', x: 610, zona: 0 },
    { tipo: 'garrotero', x: 840, zona: 0, sale: 'aparece', retraso: 900 },
    { tipo: 'soldado', x: 420, zona: 0, desde: 200, torre: true },
    { tipo: 'soldado', x: 760, zona: 0, desde: 200 },
    { tipo: 'garrotero', x: 1180, zona: 1 },
    { tipo: 'soldado', x: 1520, zona: 1 },
    { tipo: 'soldado', x: 1110, zona: 1, desde: 200, torre: true },
    { tipo: 'soldado', x: 1470, zona: 1, desde: 200 },
    { tipo: 'garrotero', x: 1600, zona: 1, sale: 'aparece', retraso: 1600 },
    { tipo: 'soldado', x: 1880, zona: 2 },
    { tipo: 'garrotero', x: 2040, zona: 2 },
    { tipo: 'soldado', x: 2000, zona: 2, desde: 200, torre: true },
    { tipo: 'soldado', x: 2210, zona: 2, sale: 'aparece', retraso: 1400 },
    { tipo: 'garrotero', x: 1700, zona: 2, sale: 'aparece', retraso: 2600 }
  ],
  // Mineros atados (dan dinamita al soltarlos). oculto: detrás de la pared con grietas.
  rehenes: [{ x: 330, desde: 470 }, { x: 980, desde: 200 }, { x: 1644, desde: 200, oculto: true }],
  rompibles: [
    { tipo: 'turril', x: 900 }, { tipo: 'caja', x: 1500 }, { tipo: 'turril', x: 1980, desde: 200 }, { tipo: 'caja', x: 560, desde: 200 }
  ],
  decor: [], animados: [], escaleras: [], llamas: [], palomas: [], palomasSuelo: [], humo: [], campanas: [],
  condor: false, bandadas: false, viento: false,
  lingotes: [[760, 470], [2140, 200], [1240, 200]],
  // Luces: velo (alfa del negro), radio de la luz del jugador y de las
  // lámparas (px), titileo y Light2D (ambiente y color). extra: lámparas que
  // no están en tuneles_objetos.json [x, y].
  luz: {
    velo: 0.7, jugador: 150, lampara: 190, brillo: 0.32, color: 0xffb46a,
    ambiente: 0x7c7068, intensidad: 1.5, alcance: 240, luzJugador: { alcance: 180, intensidad: 0.9, color: 0xfff0d2 },
    extra: [[2140, 420]]
  },
  ascensor: { espera: 1600, viaje: 2400 },
  dinamita: { porMinero: 3, mecha: 1400, dano: 8, radio: 150, velocidad: { x: 330, y: 390 } },
  goteo: [380, 900],          // ms entre gotas
  destellos: [220, 520],      // ms entre destellos de plata
  haces: [[1215, 128], [1850, 96]], // haces de luz que bajan de los agujeros del techo
  estacion: { x: 2140, y: 524 }
};

class Tuneles extends Nivel2 {
  constructor() {
    super('Tuneles', TUNELES);
  }

  preload() {
    super.preload();
    const imagen = (clave, archivo, ruta = RUTA_TUNELES) => { if (!this.textures.exists(clave)) this.load.image(clave, ruta + archivo); };
    imagen('tun_jaula', 'a3_jaula.png');
    imagen('tun_gota', 'gota.png');
    imagen('tun_haz', 'haz.png');
    imagen('mc_dinamita', 'dinamita.png', RUTA_CARRITO);
    if (!this.cache.json.exists('tunelesObjetos')) this.load.json('tunelesObjetos', RUTA_TUNELES + 'tuneles_objetos.json');
    // Las hojas de A5 y el carrito de la estación (el tamaño de cada cuadro
    // está en los JSON: se cargan como imagen y los cuadros se agregan en create).
    ['salpica', 'polvo', 'destello'].forEach((n) => imagen('tunHoja_' + n, `hoja_${n}.png`));
    imagen('mcHoja_carro', 'hoja_carro.png', RUTA_CARRITO);
    imagen('mcHoja_heroe', 'hoja_heroe.png', RUTA_CARRITO);
    if (!this.cache.json.exists('cartModulos')) this.load.json('cartModulos', RUTA_CARRITO + 'cart_modulos.json');
  }

  create() {
    const colision = this.cache.json.get(TUNELES.colision.clave);
    if (!colision.grietas) colision.grietas = [];
    if (!colision.ascensores) colision.ascensores = [];
    this.paredRota = false;
    this.premiosDinamita = 0;
    this.ascensores = null;
    this.paredes = null;
    this.subiendo = false;
    if (this.registry.get('dinamita') === undefined) this.registry.set('dinamita', 0);
    const objetos = this.cache.json.get('tunelesObjetos');
    hojasDeJson(this, 'tunHoja_', objetos.hojas);
    hojasDeJson(this, 'mcHoja_', this.cache.json.get('cartModulos').hojas, ['carro', 'heroe']);
    super.create();
    this.coloresEditor = { ...EDITOR.colores, ascensores: 0xff9a3a, grietas: 0xd070ff };
    this.ayudaEditor.setText('EDITOR  ARRASTRA · G P W L C(ASCENSOR) R(GRIETA) AGREGAR · SUPR BORRAR · S GUARDAR · E SALIR');
    this.teclasTNT = this.input.keyboard.addKeys('K,G');
    this.events.once('shutdown', () => this.limpiarTuneles());
  }

  // ---------------------------------------------------------------------------
  // Fondo: A3 y la jaula con Light2D
  // ---------------------------------------------------------------------------

  crearFondo() {
    super.crearFondo();
    this.capaNivel = this.children.list.filter((o) => o.texture && this.cfg.tramos.some((t) => t.clave === o.texture.key));
  }

  // ---------------------------------------------------------------------------
  // Colisión: lo de Nivel2 más el ascensor y la pared con grietas
  // ---------------------------------------------------------------------------

  crearColision() {
    super.crearColision();
    if (!this.ascensores) {
      this.ascensores = this.physics.add.group({ allowGravity: false, immovable: true });
      this.paredes = this.physics.add.staticGroup();
    }
    // Las jaulas, sogas y cuerpos anteriores (al salir del editor se rearman).
    (this.datosAscensores || []).forEach((a) => { a.jaula.destroy(); a.soga.destroy(); });
    this.ascensores.clear(true, true);
    this.paredes.clear(true, true);
    const A = this.cfg.ascensor;
    this.datosAscensores = this.colision.ascensores.map((p, i) => {
      const zona = this.add.zone((p.x0 + p.x1) / 2, p.abajo + 6, p.x1 - p.x0, 12);
      this.ascensores.add(zona);
      zona.body.moves = false;
      Object.assign(zona.body.checkCollision, { down: false, left: false, right: false });
      const jaula = this.add.image(zona.x, p.abajo + 4, 'tun_jaula').setOrigin(0.5, 1).setDepth(9);
      const soga = this.add.graphics().setDepth(8.9);
      if (this.luz2d) jaula.setPipeline('Light2D');
      return { pieza: p, zona, jaula, soga, y: p.abajo, desfase: i * 900, espera: p.espera || A.espera, viaje: p.viaje || A.viaje };
    });
    if (!this.paredRota) {
      this.colision.grietas.forEach(({ x, y, w, h }) => this.paredes.add(this.add.zone(x + w / 2, y + h / 2, w, h)));
    }
  }

  crearJugador() {
    super.crearJugador();
    this.physics.add.collider(this.jugador, this.ascensores, () => { this.sobrePlataformaEn = this.time.now; },
      (j, t) => this.puedePisar(j, t));
    this.physics.add.collider(this.jugador, this.paredes);
    // Contra la pared: las balas sacan chispas y los explosivos revientan.
    this.physics.add.collider(this.balas, this.paredes, (bala) => {
      if (this.impactoBala(bala)) return;
      chispas(this, bala.x, bala.y, 6, bala.getData('rebote'), 100, 10.3);
      bala.destroy();
    });
    // La dinamita queda sobre la pasarela (y sobre la jaula) hasta que explota.
    const esDinamita = (b, t) => b.getData('dinamita') && b.body.velocity.y >= 0 && b.body.prev.y + b.body.height <= t.body.top + 10;
    this.physics.add.collider(this.balas, [this.plataformas, this.ascensores], (b) => this.rebotarDinamita(b), esDinamita);
  }

  pisar(objetos) {
    super.pisar(objetos);
    if (this.paredes) this.physics.add.collider(objetos, this.paredes);
  }

  // El ascensor: espera abajo, sube, espera arriba y baja, siempre con el
  // mismo tiempo. Lleva al jugador si está parado encima.
  moverAscensores() {
    const j = this.jugador;
    const ahora = this.time.now;
    this.datosAscensores.forEach((a) => {
      const { arriba, abajo, x0, x1 } = a.pieza;
      const ciclo = (a.espera + a.viaje) * 2;
      const t = (ahora + a.desfase) % ciclo;
      let f;
      if (t < a.espera) f = 0;
      else if (t < a.espera + a.viaje) f = (t - a.espera) / a.viaje;
      else if (t < a.espera * 2 + a.viaje) f = 1;
      else f = 1 - (t - a.espera * 2 - a.viaje) / a.viaje;
      const y = Math.round(Phaser.Math.Linear(abajo, arriba, Phaser.Math.Easing.Sine.InOut(f)));
      const dy = y - a.y;
      // ¿Va encima? (los pies a la altura del piso de la jaula y dentro de ella)
      const b = j.body;
      const encima = !this.muerto && b.right > x0 && b.left < x1 && Math.abs(b.bottom - a.y) < 8 && b.velocity.y >= -5 && !this.trepando;
      if (encima && dy) { j.y += dy; this.sobrePlataformaEn = ahora; }
      a.y = y;
      a.zona.y = y + 6;
      a.jaula.y = y + 4;
      // La soga: de la polea (arriba) al techo de la jaula.
      const techo = a.jaula.y - a.jaula.height;
      a.soga.clear().lineStyle(2, 0x3a2614, 1).lineBetween(a.jaula.x - 4, arriba - 8, a.jaula.x - 4, techo + 4)
        .lineBetween(a.jaula.x + 4, arriba - 8, a.jaula.x + 4, techo + 4);
    });
  }

  // ---------------------------------------------------------------------------
  // Mineros: atados como los rehenes; al soltarlos dan dinamita. Uno está
  // escondido detrás de la pared con grietas.
  // ---------------------------------------------------------------------------

  crearRehenes() {
    super.crearRehenes();
    this.rehenes.getChildren().forEach((r, i) => {
      if (!this.cfg.rehenes[i].oculto) return;
      r.setVisible(false).setData('estado', 'oculto');
      r.body.enable = false;
      this.rehenOculto = r;
    });
  }

  rescatar(r) {
    if (r.getData('estado') !== 'atado' || this.estado !== 'control') return;
    this.premiosDinamita++;
    super.rescatar(r);
    this.aviso(r.x, r.y - NPC.alto * ESCALA - 24, '¡TOMA, DINAMITA!', 'oro');
  }

  // El regalo del minero es dinamita (los rompibles sueltan lo de siempre).
  soltarPremio(x, y, soloArma = false) {
    if (this.premiosDinamita > 0) {
      this.premiosDinamita--;
      this.darDinamita(x, y, this.cfg.dinamita.porMinero);
      return;
    }
    super.soltarPremio(x, y, soloArma);
  }

  darDinamita(x, y, n) {
    this.registry.set('dinamita', (this.registry.get('dinamita') || 0) + n);
    for (let k = 0; k < n; k++) {
      const d = this.add.image(x, y, 'mc_dinamita').setScale(2).setDepth(20).setAngle(Phaser.Math.Between(-30, 30));
      this.tweens.add({
        targets: d, x: x + (k - 1) * 26, y: y - 60 - k * 8, angle: d.angle + 360, duration: 500, ease: 'Quad.out',
        onComplete: () => this.tweens.add({ targets: d, alpha: 0, y: d.y - 30, delay: 300, duration: 300, onComplete: () => d.destroy() })
      });
    }
    TextFX.popup(this, x, y - 90, `DINAMITA +${n}`, { color: 'oro', subir: 50 }).setDepth(20);
    sonidoUI(this, 'confirma');
    this.actualizarHUD();
  }

  actualizarHUD() {
    const tnt = this.registry.get('dinamita') || 0;
    this.hud.setText(`MINEROS ${this.rescatados}/${(this.cfg.rehenes || []).length}   TNT x${tnt}`);
  }

  // ---------------------------------------------------------------------------
  // Dinamita: se lanza en arco (K o G), rebota, chisporrotea la mecha y
  // explota a los `mecha` ms o al tocar un enemigo o la pared.
  // ---------------------------------------------------------------------------

  lanzarDinamita() {
    const D = this.cfg.dinamita;
    const n = this.registry.get('dinamita') || 0;
    const j = this.jugador;
    if (n <= 0) {
      this.aviso(j.x, j.y - 90, '¡SIN DINAMITA!', 'rojo');
      sonidoUI(this, 'tic');
      return;
    }
    this.registry.set('dinamita', n - 1);
    this.actualizarHUD();
    const lado = j.flipX ? -1 : 1;
    const b = this.balas.create(j.x + lado * 14, j.y - 30, 'mc_dinamita').setScale(1.6).setDepth(10.2);
    b.body.setAllowGravity(true).setSize(b.width * 0.8, b.height * 0.8);
    b.setVelocity(lado * D.velocidad.x + j.body.velocity.x * 0.4, -D.velocidad.y);
    b.setAngularVelocity(lado * 520);
    b.setData({ tipo: 'granada', dinamita: true, dano: D.dano, rebote: -90, hasta: this.time.now + D.mecha });
    // La mecha chisporrotea.
    const mecha = this.add.particles(0, 0, 'fx_chispa', {
      speed: { min: 20, max: 80 }, lifespan: 260, scale: { start: 1.2, end: 0.2 }, frequency: 40,
      tint: [0xffe080, 0xff8a1a], blendMode: 'ADD'
    }).setDepth(10.3);
    mecha.startFollow(b);
    b.once('destroy', () => mecha.destroy());
    this.proximoDisparo = Math.max(this.proximoDisparo || 0, this.time.now + 200);
  }

  rebotarDinamita(b) {
    if (!b.active) return;
    b.setVelocityX(b.body.velocity.x * 0.6);
    b.setAngularVelocity(b.body.angularVelocity * 0.6);
  }

  // La dinamita no explota al tocar el suelo: rebota y espera la mecha. Al
  // explotar, si alcanza la pared con grietas, la rompe.
  explotarProyectil(bala) {
    if (!bala.active) return;
    if (bala.getData('dinamita')) {
      const enElSuelo = bala.body.blocked.down || bala.body.touching.down;
      if (enElSuelo && this.time.now < bala.getData('hasta')) {
        bala.setVelocity(bala.body.velocity.x * 0.5, -Math.abs(bala.body.velocity.y) * 0.3);
        return;
      }
      const { x, y } = bala;
      super.explotarProyectil(bala);
      this.polvoDelTecho(x, 3);
      this.alcanzarPared(x, y);
      return;
    }
    super.explotarProyectil(bala);
  }

  alcanzarPared(x, y) {
    if (this.paredRota) return;
    const R = this.cfg.dinamita.radio;
    const pared = this.colision.grietas.find((g) => {
      const cx = Phaser.Math.Clamp(x, g.x, g.x + g.w);
      const cy = Phaser.Math.Clamp(y, g.y, g.y + g.h);
      return Phaser.Math.Distance.Between(x, y, cx, cy) <= R;
    });
    if (pared) this.romperPared(pared);
  }

  // La pared revienta: queda el hueco oscuro, cascotes en la pasarela y
  // aparece el minero que estaba encerrado.
  romperPared(g) {
    this.paredRota = true;
    this.paredes.clear(true, true);
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;
    explotar(this, cx, cy + 20, 'grande', ESCALA * 1.3);
    this.cameras.main.shake(500, 0.016);
    this.cameras.main.flash(140, 255, 220, 170);
    // El hueco: borde de roca rota, más oscuro adentro.
    const hueco = this.add.graphics().setDepth(1.05);
    hueco.fillStyle(0x1a0f0a, 1);
    for (let x = g.x - 18; x < g.x + g.w + 18; x += 6) {
      const borde = Math.min(x - (g.x - 18), g.x + g.w + 18 - x);
      const arriba = g.y + 26 - Math.min(borde, 26) + ((x * 7) % 9);
      hueco.fillRect(x, arriba, 6, g.y + g.h - arriba);
    }
    hueco.fillStyle(0x0a0604, 1).fillRect(g.x + 10, g.y + 40, g.w - 20, g.h - 40);
    // Una velita del minero, adentro.
    const vela = this.add.image(cx + 26, g.y + g.h - 10, 'fx_chispa').setScale(4).setTint(0xffc070)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(1.1);
    this.tweens.add({ targets: vela, alpha: 0.5, duration: 140, yoyo: true, repeat: -1 });
    this.lamparas.push(this.nuevaLampara(cx + 26, g.y + g.h - 24, 0.6));
    // Cascotes que vuelan y quedan en la pasarela.
    for (let k = 0; k < 10; k++) {
      const roca = this.add.rectangle(cx, cy, Phaser.Math.Between(6, 16), Phaser.Math.Between(5, 12), k % 2 ? 0x6a4a34 : 0x4a3222)
        .setDepth(10.8);
      const piso = this.superficie(cx, g.y + g.h - 20).y;
      this.tweens.add({
        targets: roca, x: cx + Phaser.Math.Between(-140, 140), y: piso - roca.height / 2, angle: Phaser.Math.Between(-300, 300),
        duration: Phaser.Math.Between(500, 900), ease: 'Quad.in'
      });
    }
    this.polvoDelTecho(cx, 6);
    this.aviso(cx, g.y - 10, '¡BOOM!', 'oro');
    const r = this.rehenOculto;
    if (r && r.active) {
      this.time.delayedCall(700, () => {
        if (!r.active) return;
        r.setVisible(true).setAlpha(0).setData('estado', 'atado');
        r.body.enable = true;
        this.tweens.add({ targets: r, alpha: 1, duration: 400 });
        this.aviso(r.x, r.y - NPC.alto * ESCALA, '¡SOCORRO!', 'plata');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Luz: velo negro con agujeros (máscara de luz), resplandores que titilan y
  // Light2D (si hay WebGL)
  // ---------------------------------------------------------------------------

  crearExtras() {
    const L = this.cfg.luz;
    const { width, height } = this.scale;
    texturasLuzMina(this);
    this.luz2d = this.sys.renderer.type === Phaser.WEBGL && !!this.lights && !esMovil();
    if (this.luz2d) {
      this.lights.enable().setAmbientColor(L.ambiente);
      [...this.capaNivel, ...this.capas.filter((c) => c.texture.key === 'tunA2')].forEach((o) => o.setPipeline('Light2D'));
      this.datosAscensores.forEach((a) => a.jaula.setPipeline('Light2D'));
      this.luzJugador = this.lights.addLight(0, 0, L.luzJugador.alcance, L.luzJugador.color, L.luzJugador.intensidad);
    }
    this.velo = this.add.renderTexture(0, 0, width, height).setOrigin(0).setScrollFactor(0).setDepth(17.5);
    this.sello = this.make.image({ x: 0, y: 0, key: 'tun_luzMascara', add: false });
    const objetos = this.cache.json.get('tunelesObjetos');
    this.lamparas = [...objetos.lamparas, ...L.extra].map(([x, y]) => this.nuevaLampara(x, y));
    this.crearEstacion();
    crearEco(this, { retardo: 0.24, realimentacion: 0.42, mezcla: 0.42, filtro: 1700 });
  }

  nuevaLampara(x, y, fuerza = 1) {
    const L = this.cfg.luz;
    const brillo = this.add.image(x, y, 'tun_luzCalida').setScale(L.lampara / 128 * 0.9 * fuerza)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(L.brillo).setDepth(17.6);
    const luz = this.luz2d ? this.lights.addLight(x, y, L.alcance * fuerza, L.color, L.intensidad * fuerza) : null;
    return { x, y, fuerza, brillo, luz, fase: Math.random() * 10, ritmo: Phaser.Math.FloatBetween(2.2, 3.6), caida: 0 };
  }

  moverLuces(time) {
    const L = this.cfg.luz;
    const cam = this.cameras.main;
    const t = time / 1000;
    const v = this.velo;
    v.clear().fill(0x000000, L.velo);
    const borrar = (x, y, radio, alfa) => {
      this.sello.setScale(radio / 128).setAlpha(alfa);
      v.erase(this.sello, Math.round(x - cam.scrollX), Math.round(y - cam.scrollY));
    };
    this.lamparas.forEach((l) => {
      // Titila suave (dos senos) y cada tanto falla un instante.
      if (l.caida <= 0 && Math.random() < 0.0015) l.caida = Phaser.Math.Between(3, 7);
      const falla = l.caida > 0 ? 0.55 : 1;
      if (l.caida > 0) l.caida--;
      const f = (0.88 + Math.sin(t * l.ritmo + l.fase) * 0.07 + Math.sin(t * l.ritmo * 2.7 + l.fase * 2) * 0.05) * falla;
      l.brillo.setAlpha(L.brillo * f * l.fuerza);
      if (l.luz) l.luz.setIntensity(L.intensidad * f * l.fuerza);
      if (l.x < cam.scrollX - L.lampara || l.x > cam.scrollX + this.scale.width + L.lampara) return;
      borrar(l.x, l.y, L.lampara * l.fuerza * (0.94 + f * 0.06), 0.95 * f);
    });
    const j = this.jugador;
    borrar(j.x, j.y - 20, L.jugador, j.alpha > 0.1 ? 1 : 0);
    if (this.luzJugador) this.luzJugador.setPosition(j.x, j.y - 30);
  }

  // ---------------------------------------------------------------------------
  // Ambiente: goteo, polvo que cae, destellos de plata y haces de luz
  // ---------------------------------------------------------------------------

  crearAmbiente() {
    super.crearAmbiente();
    const C = this.cfg;
    const { width } = this.scale;
    // Polvo fino que cae siempre (fijo a la pantalla).
    this.add.particles(0, 0, 'fx_chispa', {
      x: { min: 0, max: width }, y: -8, speedY: { min: 14, max: 40 }, speedX: { min: -6, max: 6 },
      lifespan: 9000, scale: { min: 0.4, max: 0.9 }, alpha: { start: 0.5, end: 0 }, tint: 0x9a8060,
      frequency: 140, maxAliveParticles: 45
    }).setScrollFactor(0).setDepth(11);
    const cada = (fn, [min, max]) => {
      const vuelta = () => { if (this.estado !== 'editor') fn(); this.time.delayedCall(Phaser.Math.Between(min, max), vuelta); };
      this.time.delayedCall(Phaser.Math.Between(min, max), vuelta);
    };
    cada(() => this.gota(), C.goteo);
    cada(() => this.destello(), C.destellos);
    cada(() => this.polvoDelTecho(), [2500, 5000]);
    (C.haces || []).forEach(([x, y]) => {
      const h = this.add.image(x, y, 'tun_haz').setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.14).setDepth(17.7);
      this.tweens.add({ targets: h, alpha: 0.06, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    if (!this.anims.exists('tun_salpica')) {
      this.anims.create({ key: 'tun_salpica', frames: this.anims.generateFrameNumbers('tunHoja_salpica', { start: 0, end: 2 }), frameRate: 14 });
      this.anims.create({ key: 'tun_polvo', frames: this.anims.generateFrameNumbers('tunHoja_polvo', { start: 0, end: 3 }), frameRate: 7 });
    }
  }

  // El techo arriba de x: el de la pasarela (de arriba) o el de abajo de ella.
  techoEn(x, abajo) {
    const techo = this.colision.walls.filter((w) => x >= w.x && x <= w.x + w.w && w.y + w.h <= 200)
      .reduce((m, w) => Math.max(m, w.y + w.h), 90);
    if (!abajo) return techo;
    const pasarela = this.colision.platforms.find((p) => x >= p.x0 && x <= p.x1);
    return pasarela ? pasarela.y + 14 : techo;
  }

  // Una gota cae del techo y salpica (con su "plic" con eco).
  gota() {
    const cam = this.cameras.main;
    const x = Phaser.Math.Between(cam.scrollX + 40, cam.scrollX + this.scale.width - 40);
    const abajo = Math.random() < 0.5;
    const desde = this.techoEn(x, abajo);
    const piso = this.superficie(x, desde + 10).y;
    if (!isFinite(piso)) return;
    const g = this.add.image(x, desde, 'tun_gota').setScale(1.5).setDepth(10.9).setAlpha(0);
    this.tweens.add({ targets: g, alpha: 0.9, scaleY: 2, duration: 350 });
    this.tweens.add({
      targets: g, y: piso - 4, delay: 380, duration: Math.sqrt((piso - desde) / 1200) * 1000, ease: 'Quad.in',
      onComplete: () => {
        g.destroy();
        const s = this.add.sprite(x, piso + 2, 'tunHoja_salpica', 0).setOrigin(0.5, 1).setDepth(10.9).setAlpha(0.85);
        s.play('tun_salpica');
        s.once('animationcomplete', () => s.destroy());
        sonarGota(this, x);
      }
    });
  }

  // Destello de plata en la roca (las vetas del Cerro Rico).
  destello() {
    const cam = this.cameras.main;
    const x = Phaser.Math.Between(cam.scrollX, cam.scrollX + this.scale.width);
    const y = Phaser.Math.Between(70, 500);
    const d = this.add.image(x, y, 'tunHoja_destello', Phaser.Math.Between(0, 5)).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17.7).setScale(0).setAngle(Phaser.Math.Between(0, 45)).setAlpha(0.8);
    this.tweens.add({ targets: d, scale: Phaser.Math.FloatBetween(0.6, 1.2), angle: d.angle + 60, duration: 260, yoyo: true, onComplete: () => d.destroy() });
  }

  // Un chorro de polvo y piedritas del techo (también con cada explosión).
  polvoDelTecho(x, cuantos = 1) {
    const cam = this.cameras.main;
    for (let k = 0; k < cuantos; k++) {
      const px = (x ?? Phaser.Math.Between(cam.scrollX + 60, cam.scrollX + this.scale.width - 60)) + (cuantos > 1 ? Phaser.Math.Between(-220, 220) : 0);
      const desde = this.techoEn(px, Math.random() < 0.4);
      const p = this.add.sprite(px, desde, 'tunHoja_polvo', 0).setOrigin(0.5, 0).setScale(1.4).setDepth(11).setAlpha(0.8);
      p.play('tun_polvo');
      this.tweens.add({ targets: p, y: desde + 70, alpha: 0, duration: 1100, ease: 'Quad.in', onComplete: () => p.destroy() });
    }
  }

  // ---------------------------------------------------------------------------
  // La estación de carritos: al final, el jugador se sube y arranca la persecución.
  // ---------------------------------------------------------------------------

  crearEstacion() {
    const E = this.cfg.estacion;
    this.carroEstacion = this.add.image(E.x, E.y, 'mcHoja_carro', 0).setOrigin(0.5, 1).setDepth(9.2);
    this.cartelEstacion = TextFX.texto(this, E.x, E.y - 110, 'ESTACIÓN', { color: 'plata', escala: 2 }).setDepth(16);
  }

  alTerminar() {
    const E = this.cfg.estacion;
    this.cartelEstacion.setText('¡AL CARRITO!').setColor('oro');
    this.tweens.add({ targets: this.cartelEstacion, y: this.cartelEstacion.y + 8, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.carroEstacion, angle: { from: -1.5, to: 1.5 }, duration: 160, yoyo: true, repeat: 5 });
    this.time.delayedCall(800, () => this.mostrarGo(true));
    this.aviso(E.x, E.y - 150, '¡SÚBETE!', 'oro');
  }

  revisarSalida() {
    const E = this.cfg.estacion;
    const b = this.jugador.body;
    if (Math.abs(b.center.x - E.x) < 60 && b.bottom > 470 && (b.blocked.down || b.touching.down)) this.subirAlCarro();
  }

  // Salta adentro del carrito, el carrito arranca hacia el túnel y fundido.
  subirAlCarro() {
    if (this.estado === 'saliendo') return;
    this.estado = 'saliendo';
    cerrarSelector(this, false);
    this.mostrarGo(false);
    this.registry.remove(this.claveBase);
    const E = this.cfg.estacion;
    const j = this.jugador;
    const carro = this.carroEstacion;
    j.setVelocity(0).body.setAllowGravity(false);
    j.body.enable = false;
    this.tweens.add({ targets: j, x: E.x, duration: 420 });
    this.tweens.add({
      targets: j, y: j.y - 90, duration: 210, ease: 'Quad.out', yoyo: true,
      onComplete: () => {
        j.setAlpha(0);
        const heroe = this.add.image(carro.x - 4, carro.y - carro.height + 22, 'mcHoja_heroe', 0).setOrigin(0.5, 1).setDepth(9.1);
        this.cameras.main.shake(160, 0.006);
        this.tweens.add({ targets: carro, angle: 3, duration: 80, yoyo: true });
        this.time.delayedCall(350, () => {
          this.tweens.add({ targets: [carro, heroe], x: '+=420', duration: 1500, ease: 'Quad.in' });
          const chispasRuedas = this.time.addEvent({ delay: 90, loop: true, callback: () => chispas(this, carro.x - 40, carro.y - 4, 3, 200, 40, 9.3) });
          this.cameras.main.fadeOut(1300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            chispasRuedas.remove();
            if (this.scene.manager.keys.MineCartScene) this.scene.start('MineCartScene');
            else misionCompleta(this);
          });
        });
      }
    });
  }

  // ---------------------------------------------------------------------------

  update(time, delta) {
    super.update(time, delta);
    if (this.estado === 'editor') { this.moverLuces(time); return; }
    this.moverAscensores();
    this.moverLuces(time);
    const k = this.teclasTNT;
    if (this.estado === 'control' && !this.aturdido && (Phaser.Input.Keyboard.JustDown(k.K) || Phaser.Input.Keyboard.JustDown(k.G))) {
      this.lanzarDinamita();
    }
  }

  // (Las luces de Light2D las borra Phaser al cerrar la escena; el eco, Armas.js.)
  limpiarTuneles() {
    if (this.sello) this.sello.destroy();
    this.sello = null;
    this.lamparas = [];
    this.datosAscensores = [];
    this.luzJugador = null;
  }
}

// Agrega los cuadros de una hoja cargada como imagen (las celdas vienen en un
// JSON: { nombre: [ancho, alto, cuadros] }). Así una hoja con celdas de otro
// tamaño no necesita tocar el código.
function hojasDeJson(escena, prefijo, hojas, solo) {
  Object.entries(hojas).forEach(([nombre, [ancho, alto, n]]) => {
    if (solo && !solo.includes(nombre)) return;
    const clave = prefijo + nombre;
    if (!escena.textures.exists(clave)) return;
    const t = escena.textures.get(clave);
    for (let i = 0; i < n; i++) if (!t.has(i)) t.add(i, 0, i * ancho, 0, ancho, alto);
  });
}

// Texturas de la luz: la máscara (blanco en el centro → transparente; borra
// el velo) y el resplandor cálido de las lámparas.
function texturasLuzMina(escena) {
  const lienzo = (clave, colores) => {
    if (escena.textures.exists(clave)) return;
    const t = escena.textures.createCanvas(clave, 256, 256);
    const c = t.getContext();
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    colores.forEach(([p, color]) => g.addColorStop(p, color));
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    t.refresh();
  };
  lienzo('tun_luzMascara', [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.85)'], [0.7, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]);
  lienzo('tun_luzCalida', [[0, 'rgba(255,214,150,0.9)'], [0.25, 'rgba(255,170,90,0.45)'], [0.6, 'rgba(255,130,60,0.12)'], [1, 'rgba(255,120,50,0)']]);
}

// "Plic" de una gota (WebAudio, sin archivo), por el eco de la escena. Más
// bajo cuanto más lejos del jugador.
function sonarGota(escena, x) {
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const lejos = escena.jugador ? Math.abs(escena.jugador.x - x) : 0;
  const volumen = 0.05 * Phaser.Math.Clamp(1.2 - lejos / 900, 0.25, 1);
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = Phaser.Math.Between(1500, 2300);
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.07);
  g.gain.setValueAtTime(volumen, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g);
  g.connect(destino);
  if (escena.eco) g.connect(escena.eco.entrada);
  o.start(t);
  o.stop(t + 0.12);
}
