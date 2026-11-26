// =============================================================================
// NIVEL 2 · EL PATIO DE LA CASA DE LA MONEDA (escena Patio). Se entra por la
// puerta que vuela al final de las calles (Nivel2) y se sale por la puerta del
// fondo a la derecha, hacia la subida al Cerro Rico (Subida.js).
//
// patio.png (interior_de_la_casa.jpeg, herramientas/potosi_nivel2.py): el
// claustro con la galería de arriba, los carros de plata y la prensa de
// acuñar. Colisión: patio_collision.json (galería, prensa, carros y cajas;
// tecla E para editar).
//
// Primero los guardias (salen por las puertas, que revientan, y por las
// ventanas de la galería, que se abren). Después, EL JINETE FANTASMA: se abre
// un portal en el suelo (tiembla, saltan piedritas, sube una columna de luz)
// y el jinete sale del hueco (una máscara corta lo que está bajo la línea del
// suelo); el portal se cierra. Embiste galopando, tira sablazos y bolas de
// fuego. En la fase 2 (media vida) abre portales bajo el jugador: avisan con
// grietas brillantes 0.8 s y sale embistiendo desde ahí. La prensa de acuñar
// golpea cada tanto: pararse en su base duele.
// =============================================================================

const PATIO = {
  ...POTOSI,
  colision: { clave: 'patioColision', archivo: 'patio_collision.json' },
  ancho: 1792,
  inicio: { x: 150, desde: 470 },
  llenaVida: false,
  titulo: { nombre: 'CASA DE LA MONEDA', sub: 'EL PATIO DE LA ACUÑACIÓN · 1773', escala: 3 },
  fondo: 0x9cc4e0,
  bruma: false,
  tramos: [{ clave: 'potosiPatio', archivo: 'patio.png', x: 0 }],
  // El cielo arriba del techo y, por el arco de atrás de la prensa, la ciudad.
  parallax: [
    { clave: 'potosiCielo', archivo: 'cielo.png', factor: 0.05, y: -60 },
    { clave: 'potosiCampanario', archivo: 'campanario.png', factor: 0.3, y: -100 },
    { clave: 'potosiCiudad', archivo: 'ciudad.png', factor: 0.3, y: 300 }
  ],
  zonas: [{ limite: 0, jefe: true }, { limite: 768, final: true }],
  aberturas: {
    pi: { r: [38, 360, 82, 495], obj: 'puerta' },
    pc: { r: [1137, 357, 1190, 455], obj: 'puerta2' },
    pd: { r: [1703, 360, 1752, 495], obj: 'puerta' },
    vi: { r: [536, 116, 594, 186], obj: 'ventana' },
    vd: { r: [1185, 116, 1245, 186], obj: 'ventana2' }
  },
  enemigos: [
    { tipo: 'garrotero', x: 60, zona: 0, sale: 'pi', retraso: 1800 },
    { tipo: 'soldado', x: 565, zona: 0, desde: 170, sale: 'vi', retraso: 900, torre: true },
    { tipo: 'garrotero', x: 700, zona: 0 },
    // (En la zona 0 la cámara se traba en 0-1024: a x 1000 (1200 en el mundo)
    // quedaba fuera de la vista y no aparecía.)
    { tipo: 'soldado', x: 680, zona: 0, desde: 170 },
    { tipo: 'garrotero', x: 60, zona: 0, sale: 'pi', retraso: 4200 },
    { tipo: 'soldado', x: 1163, zona: 1, sale: 'pc', retraso: 300 },
    { tipo: 'soldado', x: 1215, zona: 1, desde: 170, sale: 'vd', retraso: 700, torre: true },
    { tipo: 'soldado', x: 1345, zona: 1, desde: 340, torre: true },
    { tipo: 'garrotero', x: 1727, zona: 1, sale: 'pd', retraso: 1000 },
    { tipo: 'garrotero', x: 1600, zona: 1 }
  ],
  rehenes: [{ x: 1250, desde: 170 }],
  rompibles: [
    { tipo: 'caja', x: 720, desde: 170 }, { tipo: 'turril', x: 1240 },
    { tipo: 'carreta', x: 1600, obj: 'carreta2' }, { tipo: 'caja', x: 1480 }
  ],
  decor: [
    { obj: 'farol', x: 330, y: 300, luz: true }, { obj: 'farol2', x: 1450, y: 300, luz: true, espejo: true },
    { obj: 'letrero2', x: 1010, y: 330, mece: true }, { obj: 'sacos', x: 230 }, { obj: 'sacos2', x: 1530 },
    { obj: 'tejas2', x: 1660 }
  ],
  escaleras: [{ obj: 'escalera', x: 440, arriba: 187, abajo: 500 }, { obj: 'escalera2', x: 1422, arriba: 187, abajo: 500 }],
  lingotes: [[150, 470], [610, 470], [1110, 470], [1700, 470], [900, 170]],
  llamas: [], palomas: [[620, 26], [1300, 26]], humo: [], campanas: [],
  bandadas: true, condor: false,
  // El jefe: el jinete fantasma (assets/jefes/jefe_casa_de_la_moneda/,
  // herramientas/jefe_moneda.py). Galopa por todo el patio (arenaJinete).
  // galope: px/s de la embestida; sable: alcance del sablazo; bola:
  // px/s de la bola de fuego; portal: ms de las grietas antes de abrirse
  // (fase 2); furia: cuánto más rápido en la fase 2 (la mitad de la vida).
  jinete: {
    nombre: 'EL JINETE FANTASMA', vida: 90, galope: 340, sable: 170, bola: 310,
    pausa: [900, 1600], portal: 800, furia: 1.35, puntos: 6000
  },
  // La prensa de acuñar: el volante que baja (rectángulo del dibujo), cada
  // cuánto golpea y la base donde duele.
  prensa: { r: [858, 375, 948, 447], baja: 9, cada: 3200, base: [838, 968] },
  salida: [1700, 1760],
  // La baranda de la galería de arriba (px del PNG): va delante de los que
  // andan por la galería (están adentro del pasillo, no parados encima).
  baranda: { y0: 140, barrotes: [147, 165], y1: 192, profundidad: 9.65, cara: [814, 118, 958, 262] }
};

class Patio extends Nivel2 {
  constructor() {
    super('Patio', PATIO);
  }

  preload() {
    super.preload();
    const r = 'assets/jefes/jefe_casa_de_la_moneda/';
    HOJAS_JINETE.forEach((n) => { if (!this.textures.exists('jin_' + n)) this.load.image('jin_' + n, `${r}${n === 'portal' || n === 'portal_luz' || n.startsWith('fx_') ? n : 'jinete_' + n}.png`); });
    if (!this.cache.json.exists('jineteDatos')) this.load.json('jineteDatos', r + 'jinete.json');
    if (!this.textures.exists('potosiPatioEmbrujado')) this.load.image('potosiPatioEmbrujado', POTOSI.ruta + 'patio_embrujado.png');
  }

  create() {
    // (Al morir la escena se reinicia con la misma instancia: nada de antes.)
    this.embrujada = false;
    this.anilloCasa = null;
    this.aura = null;
    this.frio = null;
    this.niebla = null;
    this.zoomCine = false;
    this.ultimoAtaque = null;
    super.create();
    this.events.once('shutdown', () => {
      // Sin máscaras puestas al cerrar (si no, al volver no se dibujaba el patio).
      if (this.anilloCasa) { this.anilloCasa.tween.stop(); this.anilloCasa = null; }
      this.children.list.forEach((o) => { if (o.mask) o.clearMask(true); });
      this.aura = null;
    });
  }

  // Los de la galería no pasan por la cara de la fachada: su ronda queda de
  // un lado (el de su origen).
  crearEnemigos() {
    super.crearEnemigos();
    const [cx0, , cx1] = this.cfg.baranda.cara;
    const a = this.X(cx0) - 40;
    const b = this.X(cx1) + 40;
    const galeria = this.Y(this.cfg.baranda.y1) + 40;
    [...this.soldados.getChildren(), ...this.garroteros.getChildren()].forEach((e) => {
      if (e.y > galeria) return;
      let o = e.getData('origen') ?? e.x;
      if (o > a && o < b) {
        o = o - a < b - o ? a - 10 : b + 10;
        e.x = o;
        if (e.body) e.body.reset(o, e.y);
        e.setData('origen', o);
      }
      const min = e.getData('min') ?? o - ENEMIGO1.ronda;
      const max = e.getData('max') ?? o + ENEMIGO1.ronda;
      let [m0, m1] = o <= a ? [min, Math.min(max, a)] : [Math.max(min, b), max];
      if (m1 < m0 + 60) [m0, m1] = o <= a ? [Math.min(m0, m1 - 60), m1] : [m0, Math.max(m1, m0 + 60)]; // (siempre un tramo válido)
      e.setData({ min: m0, max: m1 });
    });
  }

  crearExtras() {
    this.crearPrensa();
    animacionesJinete(this);
    this.bolas = [];
    this.fuegos = [];      // muros de fuego, caballos espectrales y calaveras
    this.embrujada = false;
    // La casa embrujada (casa_embruiajda.jpeg), encima del patio, invisible:
    // aparece y desaparece cada vez que el jinete tira fuego.
    this.casaEmbrujada = this.add.image(this.X(0), this.Y(0), 'potosiPatioEmbrujado', '__BASE').setOrigin(0).setScale(this.K)
      .setDepth(1.15).setAlpha(0);
  }

  // La casa cambia de estilo (normal ↔ embrujada) con un rayo y un trueno.
  // La casa se transforma (normal ↔ embrujada) desde (x, y): un anillo de
  // fuego azul que crece y va dejando la otra casa detrás. ms: lo que tarda.
  transformarCasa(x, y, aEmbrujada, ms = 900) {
    this.embrujada = aEmbrujada;
    const capas = [this.casaEmbrujada, ...(this.barandasEmbrujadas || [])];
    if (this.anilloCasa) { this.anilloCasa.tween.stop(); this.anilloCasa.fin(); }
    const forma = this.make.graphics({ add: false });
    const mascara = forma.createGeometryMask();
    // Embrujándose: se ve la embrujada adentro del círculo; volviendo: afuera.
    mascara.setInvertAlpha(!aEmbrujada);
    capas.forEach((c) => c.setAlpha(1).setMask(mascara));
    const r = { v: 0 };
    const maximo = Math.hypot(Math.max(x, this.cfg.ancho * this.K - x), 600) + 40;
    const fin = () => {
      capas.forEach((c) => { c.clearMask(); c.setAlpha(aEmbrujada ? 1 : 0); });
      forma.destroy();
      this.anilloCasa = null;
    };
    const tween = this.tweens.add({
      targets: r, v: maximo, duration: ms, ease: 'Sine.in',
      onUpdate: () => {
        forma.clear().fillStyle(0xffffff).fillCircle(x, y, r.v);
        // El borde del anillo arde: llamas azules y chispas sobre él (las que se ven).
        const cam = this.cameras.main;
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          const px = x + Math.cos(a) * r.v;
          const py = y + Math.sin(a) * r.v;
          if (px < cam.scrollX - 20 || px > cam.scrollX + this.scale.width + 20 || py < -20 || py > this.scale.height) continue;
          const f = this.add.sprite(px, py, 'jin_fx_llama', String(Phaser.Math.Between(0, 3))).setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(9.6).setScale(Phaser.Math.FloatBetween(1, 2));
          this.tweens.add({ targets: f, y: py - 30, alpha: 0, scale: 0.3, duration: 500, onComplete: () => f.destroy() });
        }
      },
      onComplete: fin
    });
    this.anilloCasa = { tween, fin };
    if (this.volante) this.volante.setTint(aEmbrujada ? 0x6a7aa8 : 0xffffff);
    if (this.frio) this.tweens.add({ targets: this.frio[0], alpha: aEmbrujada ? 0.18 : 0.42, duration: ms });
  }

  // Un rayo en el cielo (detrás de todo) con destello y trueno.
  rayoCielo() {
    const { width, height } = this.scale;
    const rayo = this.add.sprite(width * Phaser.Math.FloatBetween(0.2, 0.8), 0, 'jin_fx_rayo', '0').setOrigin(0.5, 0)
      .setScrollFactor(0).setDisplaySize(width * 0.6, height * 0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    rayo.play('jin_fx_rayo');
    rayo.once('animationcomplete', () => rayo.destroy());
    this.cameras.main.flash(160, 160, 230, 255);
    this.cameras.main.shake(220, 0.005);
    sonarImpacto(this, 'cohete');
  }

  // Ataca: la casa se embruja (si no lo está ya), con un rayo.
  cambiarCasa() {
    if (this.embrujada) return;
    this.rayoCielo();
    const J = this.jefe;
    if (J) this.transformarCasa(J.x, J.y - 100, true, 700);
    else this.transformarCasa(this.cameras.main.scrollX + this.scale.width / 2, 300, true, 700);
  }

  // Terminó de atacar: vuelve a la casa normal.
  normalizarCasa() {
    if (!this.embrujada) return;
    const J = this.jefe;
    this.transformarCasa(J ? J.x : this.cameras.main.scrollX + this.scale.width / 2, J ? J.y - 100 : 300, false, 800);
  }

  actualizarExtras(time, delta) {
    this.moverJefe(time, delta);
  }

  // La baranda de la galería (la de Potosí, la de los balcones, acá no va):
  // el pedazo del dibujo delante de los de arriba, y su gemela de la casa
  // embrujada (cambian juntas).
  crearBarandas() {
    const B = this.cfg.baranda;
    const galeria = this.colisionBase.platforms.find((p) => p.y < 200);
    if (!galeria) return;
    const x0 = galeria.x0;
    const w = galeria.x1 - galeria.x0;
    const h = B.y1 - B.y0;
    // Pedazo del dibujo en un lienzo: [ImageData].
    const pedazo = (clave) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(this.textures.get(clave).getSourceImage(), x0, B.y0, w, h, 0, 0, w, h);
      return { c, ctx, datos: ctx.getImageData(0, 0, w, h) };
    };
    const normal = pedazo('potosiPatio');
    const embrujada = pedazo('potosiPatioEmbrujado');
    // Los balaustres: en la franja de los barrotes, las columnas más oscuras
    // que su alrededor (o muy oscuras: los postes gruesos) son madera; entre
    // ellas se ve la pared de atrás, que se vuelve transparente: por ahí se
    // ven las piernas de los que andan por la galería. Arriba (la baranda) y
    // abajo (el tablero), todo.
    const [b0, b1] = B.barrotes.map((y) => y - B.y0);
    const d = normal.datos.data;
    const media = [];
    for (let x = 0; x < w; x++) {
      let t = 0;
      for (let y = b0; y < b1; y++) { const i = (y * w + x) * 4; t += Math.max(d[i], d[i + 1], d[i + 2]); }
      media.push(t / (b1 - b0));
    }
    const madera = media.map((m, x) => {
      let t = 0;
      let n = 0;
      for (let k = Math.max(0, x - 5); k <= Math.min(w - 1, x + 5); k++) { t += media[k]; n++; }
      return m < 38 || m < t / n - 10;
    });
    [normal, embrujada].forEach(({ ctx, datos }) => {
      const px = datos.data;
      for (let y = b0; y < b1; y++) {
        for (let x = 0; x < w; x++) if (!madera[x]) px[(y * w + x) * 4 + 3] = 0;
      }
      ctx.putImageData(datos, 0, 0);
    });
    ['galeriaNormal', 'galeriaEmbrujada'].forEach((k) => { if (this.textures.exists(k)) this.textures.remove(k); });
    this.textures.addCanvas('galeriaNormal', normal.c);
    this.textures.addCanvas('galeriaEmbrujada', embrujada.c);
    this.add.image(this.X(x0), this.Y(B.y0), 'galeriaNormal').setOrigin(0).setScale(this.K).setDepth(B.profundidad);
    this.barandasEmbrujadas = [this.add.image(this.X(x0), this.Y(B.y0), 'galeriaEmbrujada').setOrigin(0).setScale(this.K)
      .setDepth(B.profundidad + 0.001).setAlpha(this.embrujada ? 1 : 0)];
    // La cara de la fachada (solo la cara: recortada en elipse) también va
    // delante: el que camina por la galería pasa por detrás, no la atraviesa.
    const [cx0, cy0, cx1, cy1] = B.cara;
    const cw = cx1 - cx0;
    const ch = cy1 - cy0;
    const cara = (clave, nombre) => {
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext('2d');
      ctx.beginPath();
      ctx.ellipse(cw / 2, ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.textures.get(clave).getSourceImage(), cx0, cy0, cw, ch, 0, 0, cw, ch);
      if (this.textures.exists(nombre)) this.textures.remove(nombre);
      this.textures.addCanvas(nombre, c);
      return this.add.image(this.X(cx0), this.Y(cy0), nombre).setOrigin(0).setScale(this.K).setDepth(B.profundidad + 0.01);
    };
    cara('potosiPatio', 'caraNormal');
    const caraEmb = cara('potosiPatioEmbrujado', 'caraEmbrujada').setDepth(B.profundidad + 0.011).setAlpha(this.embrujada ? 1 : 0);
    this.barandasEmbrujadas.push(caraEmb);
  }

  // ---------------------------------------------------------------------------
  // La prensa de acuñar
  // ---------------------------------------------------------------------------

  crearPrensa() {
    const P = this.cfg.prensa;
    const [x0, y0, x1, y1] = P.r;
    const textura = this.textures.get('potosiPatio');
    if (!textura.has('prensa')) textura.add('prensa', 0, x0, y0, x1 - x0, y1 - y0);
    this.volante = this.add.image(x0, y0, 'potosiPatio', 'prensa').setOrigin(0).setDepth(1.2);
    this.time.addEvent({ delay: P.cada, loop: true, callback: () => this.golpePrensa() });
  }

  golpePrensa() {
    if (this.estado === 'editor') return;
    const P = this.cfg.prensa;
    const y0 = P.r[1];
    this.tweens.add({
      targets: this.volante, y: y0 + P.baja, duration: 90, ease: 'Quad.in',
      onComplete: () => {
        this.cameras.main.shake(120, 0.003);
        chispas(this, (P.r[0] + P.r[2]) / 2, P.r[3] + P.baja, 8, -90, 160, 11);
        const b = this.jugador.body;
        if (this.estado === 'control' && b.center.x > P.base[0] && b.center.x < P.base[1] && b.bottom < 462 && b.bottom > 430) {
          this.golpearJugador((P.base[0] + P.base[1]) / 2);
        }
        this.tweens.add({ targets: this.volante, y: y0, duration: 700, delay: 150, ease: 'Sine.inOut' });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // El jinete fantasma
  // ---------------------------------------------------------------------------

  iniciarJefe() {
    alertaJefe(this, () => this.entradaJinete()); // Estado.js: ¡ALERTA!
  }

  // Lo que pisa en x (el piso del patio).
  // (Solo el suelo: no los carros de plata ni las cajas, que son plataformas.)
  pisoJinete(x) {
    return this.pisoEn(x) ?? this.cfg.piso;
  }

  // Durante la pelea la cámara sigue al jugador por todo el patio (puede
  // volver: el jinete va de punta a punta).
  actualizarCamara(delta) {
    if (this.zoomCine || this.estado === 'editor') return;
    if (!this.jefeIniciado || this.jefeVencido) { super.actualizarCamara(delta); return; }
    const cam = this.cameras.main;
    const objetivo = Phaser.Math.Clamp(this.jugador.x - this.scale.width / 2, 0, this.cfg.ancho - this.scale.width);
    cam.scrollX += (objetivo - cam.scrollX) * (1 - Math.pow(0.92, delta / 16.67));
    this.camaraMinima = 0;
  }

  // El jugador no se sale del patio (ni de lo que ve la cámara).
  limitarJugador() {
    if (!this.jefeIniciado || this.jefeVencido) { super.limitarJugador(); return; }
    const j = this.jugador;
    j.body.x = Phaser.Math.Clamp(j.body.x, 10, this.cfg.ancho - 10 - j.body.width);
  }

  // Arena: todo el patio.
  arenaJinete() {
    return [90, this.cfg.ancho - 90];
  }

  // Pone la hoja `nombre` (con su origen; espejado si mira a la izquierda).
  hojaJinete(spr, nombre, lado = spr.getData('lado') || 1) {
    const d = this.cache.json.get('jineteDatos')[nombre];
    spr.setData('lado', lado).setFlipX(lado < 0);
    spr.setOrigin(lado < 0 ? 1 - d.origen[0] : d.origen[0], d.origen[1]);
  }

  animarJinete(nombre, lado) {
    const J = this.jefe;
    J.play('jin_' + nombre);
    this.hojaJinete(J, nombre, lado);
  }

  // Abre un portal en x (en el piso). grietas: ms con solo las grietas que
  // brillan antes de abrirse (fase 2). listo(): ya abierto (con la luz).
  abrirPortal(x, { grietas = 0, temblor = 1 } = {}, listo) {
    const piso = this.pisoJinete(x);
    const portal = this.add.sprite(x, piso + 26, 'jin_portal', '0').setDepth(1.6);
    this.hojaJinete(portal, 'portal', 1);
    const brillo = this.add.image(x, piso, 'jin_resplandor').setScale(1.4, 0.5).setTint(0x6affd0).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0).setDepth(1.61);
    const abrir = () => {
      portal.play('jin_portal_abre');
      // Tiembla cada vez más y saltan piedritas.
      [0.002, 0.004, 0.007, 0.011].forEach((f, i) => this.time.delayedCall(i * 150, () => this.cameras.main.shake(170, f * temblor)));
      const piedras = this.add.particles(x, piso - 4, 'jin_piedra', {
        x: { min: -60, max: 60 }, speedY: { min: -360, max: -140 }, speedX: { min: -140, max: 140 }, gravityY: 900,
        lifespan: 900, scale: { min: 1.5, max: 3 }, rotate: { min: 0, max: 360 }, frequency: 35
      }).setDepth(10.6);
      this.time.delayedCall(600, () => piedras.stop());
      this.time.delayedCall(1600, () => piedras.destroy());
      sonarImpacto(this, 'granada');
      portal.once('animationcomplete', () => {
        portal.play('jin_portal_arde');
        const luz = this.add.sprite(x, piso + 6, 'jin_portal_luz', '0').setDepth(1.62).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        this.hojaJinete(luz, 'portal_luz', 1);
        luz.setScale(1.4, 1.8).play('jin_portal_luz');
        this.tweens.add({ targets: luz, alpha: 0.85, duration: 200 });
        this.tweens.add({ targets: brillo, alpha: 0.6, duration: 200 });
        listo({ portal, luz, brillo, piso });
      });
    };
    if (!grietas) { abrir(); return; }
    // Aviso: las grietas (cuadros 0 y 1) brillan y laten.
    portal.setFrame('1');
    this.tweens.add({ targets: brillo, alpha: { from: 0.2, to: 0.7 }, duration: 160, yoyo: true, repeat: Math.floor(grietas / 320) });
    this.cameras.main.shake(grietas, 0.002);
    this.time.delayedCall(grietas, abrir);
  }

  cerrarPortal({ portal, luz, brillo }) {
    this.tweens.add({ targets: [luz, brillo], alpha: 0, duration: 400, onComplete: () => { luz.destroy(); brillo.destroy(); } });
    portal.play('jin_portal_cierra');
    portal.once('animationcomplete', () => this.tweens.add({ targets: portal, alpha: 0, duration: 400, onComplete: () => portal.destroy() }));
  }

  // El jinete sube del hueco: una máscara rectangular corta todo lo que está
  // por debajo de la línea del suelo.
  salirDelPortal(p, lado, rapido, alTerminar, lento = false) {
    const J = this.jefe;
    const alto = this.cache.json.get('jineteDatos').sale.alto;
    const mascara = this.make.graphics({ add: false });
    mascara.fillRect(p.portal.x - 260, p.piso - 600, 520, 600);
    J.setMask(mascara.createGeometryMask()).setVisible(true).setAlpha(1);
    J.setPosition(p.portal.x, p.piso + alto);
    this.animarJinete('sale', lado);
    J.anims.timeScale = rapido ? 2.2 : lento ? 0.45 : 1;
    this.tweens.add({
      targets: J, y: p.piso, duration: rapido ? 420 : lento ? 3000 : 1300, ease: rapido ? 'Quad.out' : 'Sine.inOut',
      onComplete: () => {
        J.clearMask(true);
        J.anims.timeScale = 1;
        this.cerrarPortal(p);
        alTerminar();
      }
    });
  }

  entradaJinete() {
    const C = this.cfg.jinete;
    const [a, b] = this.arenaJinete();
    // A media pantalla del jugador, del lado que tenga más lugar.
    const x = Phaser.Math.Clamp(this.jugador.x + (this.jugador.x < (a + b) / 2 ? 380 : -380), a + 120, b - 120);
    const lado = this.jugador.x < x ? -1 : 1;
    this.jefeVida = C.vida;
    this.jefeFuria = 1;
    this.jefeVencido = false;
    this.jefeEstado = 'llega';
    this.jefe = this.add.sprite(x, 0, 'jin_sale', '0').setDepth(9.8).setVisible(false);
    const piso = this.pisoJinete(x);
    // La cámara se acerca despacio al portal; el ambiente se enfría.
    this.zoomCine = true;
    this.estado = 'cinematica';
    this.jugador.setVelocity(0);
    const cam = this.cameras.main;
    cam.pan(x, piso - 120, 1400, 'Sine.easeInOut');
    cam.zoomTo(1.6, 1400, 'Sine.easeInOut');
    this.ambienteFrio(2500);
    this.time.delayedCall(900, () => this.abrirPortal(x, { temblor: 1.4 }, (p) => {
      this.efectosSalida(x, p.piso);
      // La casa se embruja desde el portal mientras él sale (con rayos).
      this.transformarCasa(x, p.piso - 40, true, 3000);
      [300, 1300, 2300].forEach((t) => this.time.delayedCall(t, () => this.rayoCielo()));
      this.salirDelPortal(p, lado, false, () => {
        // Se planta, ríe y la cámara vuelve.
        this.aviso(this.jefe.x, this.jefe.y - 240, '¡JA JA JA!', 'rojo');
        this.cameras.main.shake(400, 0.008);
        this.time.delayedCall(900, () => {
          const { width, height } = this.scale;
          const sx = Phaser.Math.Clamp(this.jugador.x - width / 2, 0, this.cfg.ancho - width);
          cam.zoomTo(1, 900, 'Sine.easeInOut', true);
          cam.pan(sx + width / 2, height / 2, 900, 'Sine.easeInOut', true, (c, t) => {
            if (t < 1) return;
            this.zoomCine = false;
            this.estado = 'control';
            this.barraJefe = crearBarraJefe(this, C.nombre); // CavernaJefe.js
            this.barraJefe.llenar();
            this.quieto(900);
          });
        });
      }, true);
    }));
  }

  // Mientras sale: llamas verdes que suben, chispas y un resplandor.
  efectosSalida(x, piso) {
    this.crearAura();
    const luz = this.add.image(x, piso - 60, 'jin_resplandor').setScale(1.2, 3).setTint(0xb0fff0).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0).setDepth(9.9);
    this.tweens.add({ targets: luz, alpha: 0.4, y: piso - 160, scaleX: 2.4, duration: 1400, yoyo: true, ease: 'Sine.inOut', onComplete: () => luz.destroy() });
    this.time.delayedCall(2400, () => this.cameras.main.flash(250, 140, 255, 220));
    // Al salir el aura arde fuerte y después queda pareja.
    this.auraFuerza(1.5);
    this.time.delayedCall(3000, () => this.auraFuerza(1));
  }

  // El aura: el jinete bota fuego azul por todo su alrededor (llamas de
  // efectos.jpeg que nacen en su contorno y suben), con un resplandor grande
  // detrás que late y brasas.
  crearAura() {
    const J = this.jefe;
    this.aura = {
      detras: this.add.image(J.x, J.y, 'jin_resplandor').setTint(0x3ad8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.7).setScale(4.2, 3.6).setAlpha(0.45),
      cerca: this.add.image(J.x, J.y, 'jin_resplandor').setTint(0x9af6ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.75).setScale(2.4, 2.2).setAlpha(0.4),
      llamas: this.add.particles(0, 0, 'jin_fx_llama', {
        frame: ['0', '1', '2', '3'], x: { min: -95, max: 95 }, y: { min: -205, max: -5 },
        speedY: { min: -110, max: -40 }, speedX: { min: -25, max: 25 }, lifespan: { min: 450, max: 900 },
        scale: { start: 1.1, end: 0.2 }, alpha: { start: 0.8, end: 0 }, blendMode: 'ADD', frequency: 26
      }).setDepth(9.82),
      atras: this.add.particles(0, 0, 'jin_fx_llama', {
        frame: ['0', '1'], x: { min: -120, max: 120 }, y: { min: -230, max: 0 }, speedY: { min: -140, max: -60 },
        lifespan: { min: 600, max: 1100 }, scale: { start: 1.8, end: 0.4 }, alpha: { start: 0.4, end: 0 }, tint: 0x6ab8ff,
        blendMode: 'ADD', frequency: 35
      }).setDepth(9.72),
      brasas: this.add.particles(0, 0, 'fx_chispa', {
        x: { min: -100, max: 100 }, y: { min: -220, max: -10 }, speedY: { min: -180, max: -60 }, speedX: { min: -40, max: 40 },
        lifespan: 900, scale: { start: 1.8, end: 0.2 }, tint: [0xc8f6ff, 0x5ad0ff], blendMode: 'ADD', frequency: 45
      }).setDepth(9.85),
      fuerza: 1
    };
  }

  auraFuerza(k) {
    const A = this.aura;
    if (!A) return;
    A.fuerza = k;
    A.llamas.frequency = 22 / k;
    A.atras.frequency = 35 / k;
    A.brasas.frequency = 45 / k;
  }

  moverAura(time) {
    const A = this.aura;
    const J = this.jefe;
    if (!A || !J) return;
    // (Al revés que la cabeza: el centro del cuerpo es la mitad de su alto.)
    const lado = J.getData('lado') || 1;
    const cx = J.x - lado * 10;
    const late = 1 + Math.sin(time / 160) * 0.06 + Math.sin(time / 57) * 0.03;
    A.detras.setPosition(cx, J.y - 110).setScale(4.2 * late * A.fuerza ** 0.4, 3.6 * late * A.fuerza ** 0.4).setAlpha(J.visible ? 0.3 : 0);
    A.cerca.setPosition(cx, J.y - 105).setScale(2.4 * late, 2.2 * late).setAlpha(J.visible ? 0.25 : 0);
    [A.llamas, A.atras, A.brasas].forEach((p) => { p.setPosition(cx, J.y); p.emitting = J.visible; });
  }

  apagarAura() {
    const A = this.aura;
    if (!A) return;
    [A.llamas, A.atras, A.brasas].forEach((p) => p.stop());
    this.tweens.add({ targets: [A.detras, A.cerca], alpha: 0, duration: 800 });
    this.time.delayedCall(1500, () => [A.llamas, A.atras, A.brasas, A.detras, A.cerca].forEach((o) => o.destroy()));
    this.aura = null;
  }

  // El patio se pone frío y oscuro, del color de sus llamas (y vuelve al morir).
  // (Sin ambiente frío: el patio queda con sus colores; lo embrujado es la casa.)
  ambienteFrio() {}


  calentarAmbiente() {
    if (this.frio) this.tweens.add({ targets: this.frio, alpha: 0, duration: 2000, onComplete: () => this.frio.forEach((o) => o.destroy()) });
    if (this.niebla) { this.niebla.stop(); this.time.delayedCall(5000, () => this.niebla && this.niebla.destroy()); }
  }

  // Parado (el primer cuadro del galope), mirando al jugador; al rato elige.
  quieto(ms) {
    const J = this.jefe;
    this.normalizarCasa();
    this.jefeEstado = 'elige';
    J.anims.stop();
    this.hojaJinete(J, 'galope', this.jugador.x < J.x ? -1 : 1);
    J.setTexture('jin_galope', '0');
    this.jefeHasta = this.time.now + ms / this.jefeFuria;
  }

  elegirAtaque() {
    const J = this.jefe;
    const C = this.cfg.jinete;
    const dx = Math.abs(this.jugador.x - J.x);
    const opciones = dx < C.sable + 40 ? ['sable', 'sable', 'carga', 'pilares'] : ['carga', 'lanza', 'muro', 'muro', 'pilares', 'calaveras'];
    if (this.jefeFuria > 1) opciones.push('portal', 'portal', 'caballos');
    // (No repite el mismo dos veces seguidas.)
    const a = Phaser.Utils.Array.GetRandom(opciones.filter((o) => o !== this.ultimoAtaque)) || opciones[0];
    this.cambiarCasa(); // todo ataque embruja la casa
    this.ultimoAtaque = a;
    if (a === 'sable') this.sablazo();
    else if (a === 'lanza') this.lanzarBola();
    else if (a === 'portal') this.ataquePortal();
    else if (a === 'muro') this.muroDeFuego();
    else if (a === 'pilares') this.pilaresDeFuego();
    else if (a === 'calaveras') this.calaveras();
    else if (a === 'caballos') this.caballosEspectrales();
    else this.embestir(this.jugador.x < J.x ? -1 : 1);
  }

  // Galopa hacia un lado hasta pasar al jugador (o llegar al borde).
  // Avisa (se planta, brilla y relincha) y galopa. Se esquiva saltando: solo
  // el caballo (la parte de abajo) lastima al pasar.
  embestir(lado, sinAviso = false) {
    const J = this.jefe;
    this.jefeEstado = 'prepara';
    this.hojaJinete(J, 'galope', lado);
    J.anims.stop();
    J.setTexture('jin_galope', '0');
    this.aviso(J.x, J.y - 230, '¡HIAAA!', 'rojo');
    const espera = sinAviso ? 0 : 650 / this.jefeFuria;
    if (espera) this.tweens.add({ targets: J, x: J.x - lado * 14, duration: espera, ease: 'Sine.out' });
    J.setTintFill(0xc8fff0);
    this.time.delayedCall(80, () => J.active && this.jefeEstado === 'prepara' && this.tintarJinete());
    this.time.delayedCall(espera, () => {
      if (!J.active || this.jefeEstado !== 'prepara') return;
      this.jefeEstado = 'carga';
      this.animarJinete('galope', lado);
      J.anims.timeScale = this.jefeFuria;
      this.cargaHasta = Phaser.Math.Clamp(this.jugador.x + lado * 300, ...this.arenaJinete());
    });
  }

  sablazo() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'sable';
    this.animarJinete('ataque', lado);
    this.tweens.add({ targets: J, x: J.x + lado * 50, duration: 320, ease: 'Quad.out' });
    // El cuadro de la media luna: lastima adelante.
    J.on('animationupdate', (a, f) => {
      if (f.index !== 3) return;
      J.off('animationupdate');
      this.cameras.main.shake(140, 0.006);
      sonarTramo(this, { ...SFX_ARMAS.escopeta, tono: 1.6, volumen: 0.25 }, 'sable');
      const b = this.jugador.body;
      const x0 = lado > 0 ? J.x : J.x - C.sable;
      if (b.right > x0 && b.left < x0 + C.sable && b.bottom > J.y - 220) this.golpearJugador(J.x);
    });
    J.once('animationcomplete', () => { J.off('animationupdate'); this.quieto(Phaser.Math.Between(...C.pausa)); });
  }

  // Un sablazo al piso a distancia: una ola de fuego azul corre por el
  // suelo hacia el jugador (se salta).
  muroDeFuego() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'sable';
    this.animarJinete('ataque', lado);
    J.on('animationupdate', (a, f) => {
      if (f.index !== 3) return;
      J.off('animationupdate');
      this.cameras.main.shake(200, 0.008);
      this.cambiarCasa();
      const x = J.x + lado * 90;
      const ola = this.add.sprite(x, this.pisoJinete(x) + 4, 'jin_fx_muro', '1').setOrigin(0.5, 1).setDepth(10.5)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(1.5, 2.2).setFlipX(lado < 0);
      ola.play('jin_fx_muro');
      ola.setData({ tipo: 'ola', vx: lado * 380 * this.jefeFuria, hasta: this.time.now + 3200, alto: 60, ancho: 50 });
      this.fuegos.push(ola);
    });
    J.once('animationcomplete', () => { J.off('animationupdate'); this.quieto(Phaser.Math.Between(...C.pausa)); });
  }

  // Levanta la espada (pose de sale) y del piso brotan pilares de fuego en
  // fila hacia el jugador: avisan con una llamita antes de crecer.
  pilaresDeFuego() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'sable';
    J.anims.stop();
    this.hojaJinete(J, 'sale', lado);
    J.setTexture('jin_sale', '3'); // la espada en alto
    this.auraFuerza(2);
    this.aviso(J.x, J.y - 250, '¡ARDED!', 'rojo');
    this.cambiarCasa();
    const n = this.jefeFuria > 1 ? 7 : 5;
    for (let k = 0; k < n; k++) {
      const x = J.x + lado * (160 + k * 175);
      if (x < 40 || x > this.cfg.ancho - 40) break;
      this.time.delayedCall(200 + k * 170, () => this.pilar(x));
    }
    this.time.delayedCall(200 + n * 170 + 500, () => {
      if (this.jefeEstado !== 'sable') return;
      this.auraFuerza(1);
      this.quieto(Phaser.Math.Between(...C.pausa));
    });
  }

  pilar(x) {
    const piso = this.pisoJinete(x);
    const aviso = this.add.sprite(x, piso + 2, 'jin_fx_llama', '0').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.5).setScale(1.2);
    this.tweens.add({ targets: aviso, scale: 1.8, alpha: { from: 0.5, to: 1 }, duration: 160, yoyo: true, repeat: 1 });
    this.time.delayedCall(650, () => {
      aviso.destroy();
      const p = this.add.sprite(x, piso + 6, 'jin_fx_pilar', '0').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.5);
      p.play('jin_fx_pilar');
      this.cameras.main.shake(90, 0.004);
      p.setData({ tipo: 'pilar', vx: 0, hasta: this.time.now + 900, alto: 240, ancho: 46 });
      this.fuegos.push(p);
      this.time.delayedCall(700, () => this.tweens.add({ targets: p, alpha: 0, scaleY: 0.3, duration: 250 }));
    });
  }

  // Tira tres calaveras de fuego en arco que explotan al caer.
  calaveras() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'lanza';
    this.animarJinete('lanza', lado);
    J.on('animationupdate', (a, f) => {
      if (f.index !== 3) return;
      J.off('animationupdate');
      this.cambiarCasa();
      [0.75, 1, 1.25].forEach((d) => {
        const x = J.x + lado * 70;
        const y = J.y - 160;
        const dist = (this.jugador.x - x) * d;
        const t = 1.1;
        const c = this.add.sprite(x, y, 'jin_fx_calavera', '0').setDepth(10.5).setFlipX(lado < 0);
        c.play('jin_fx_calavera');
        c.setData({ tipo: 'calavera', vx: dist / t, vy: -480, g: 900, hasta: this.time.now + 4000, alto: 40, ancho: 40 });
        this.fuegos.push(c);
      });
    });
    J.once('animationcomplete', () => { J.off('animationupdate'); this.quieto(Phaser.Math.Between(...C.pausa)); });
  }

  // Fase 2: apunta con la espada y una manada de caballos espectrales cruza
  // el patio galopando por el piso (se saltan).
  caballosEspectrales() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'sable';
    J.anims.stop();
    this.hojaJinete(J, 'sale', lado);
    J.setTexture('jin_sale', '6'); // la espada apuntando
    this.aviso(J.x, J.y - 250, '¡A LA CARGA!', 'rojo');
    this.cambiarCasa();
    for (let k = 0; k < 3; k++) {
      this.time.delayedCall(400 + k * 650, () => {
        const x = J.x + lado * 40;
        const c = this.add.sprite(x, this.pisoJinete(x) + 6, 'jin_fx_caballo', '1').setOrigin(0.5, 1).setDepth(10.45)
          .setBlendMode(Phaser.BlendModes.ADD).setFlipX(lado < 0).setAlpha(0);
        c.play('jin_fx_caballo');
        this.tweens.add({ targets: c, alpha: 0.95, duration: 200 });
        c.setData({ tipo: 'caballo', vx: lado * 520, hasta: this.time.now + 3500, alto: 80, ancho: 90 });
        this.fuegos.push(c);
      });
    }
    this.time.delayedCall(400 + 3 * 650 + 300, () => { if (this.jefeEstado === 'sable') this.quieto(Phaser.Math.Between(...C.pausa)); });
  }

  // Muros, pilares, calaveras y caballos: se mueven y queman al jugador.
  moverFuegos(dt) {
    const jb = this.jugador.body;
    this.fuegos = this.fuegos.filter((f) => {
      if (!f.active) return false;
      const d = f.data.values;
      f.x += (d.vx || 0) * dt;
      if (d.g) {
        d.vy += d.g * dt;
        f.y += d.vy * dt;
        f.angle += 400 * dt;
        if (f.y >= this.pisoJinete(f.x) - 10) {
          const e = this.add.sprite(f.x, this.pisoJinete(f.x) + 4, 'jin_fx_explota', '0').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.6);
          e.play('jin_fx_explota');
          e.once('animationcomplete', () => e.destroy());
          sonarImpacto(this, 'granada');
          if (Math.abs(jb.center.x - f.x) < 60 && jb.bottom > f.y - 90) this.golpearJugador(f.x);
          f.destroy();
          return false;
        }
      }
      const fuera = f.x < -100 || f.x > this.cfg.ancho + 100 || this.time.now > d.hasta;
      if (fuera) {
        this.tweens.add({ targets: f, alpha: 0, duration: 250, onComplete: () => f.destroy() });
        return false;
      }
      const base = d.g ? f.y + d.alto / 2 : f.y;
      const toca = jb.right > f.x - d.ancho && jb.left < f.x + d.ancho && jb.bottom > base - d.alto && jb.top < base;
      if (toca && this.estado === 'control' && f.alpha > 0.3) this.golpearJugador(f.x - (d.vx || 0) * 0.1);
      return true;
    });
  }

  lanzarBola() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    const lado = this.jugador.x < J.x ? -1 : 1;
    this.jefeEstado = 'lanza';
    this.animarJinete('lanza', lado);
    J.on('animationupdate', (a, f) => {
      if (f.index !== 3) return;
      J.off('animationupdate');
      const x = J.x + lado * 70;
      const y = J.y - 150;
      const j = this.jugador.body;
      const ang = Math.atan2(j.center.y - y, j.center.x - x);
      const bola = this.add.sprite(x, y, 'jin_bola', '0').setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD).setFlipX(lado < 0);
      bola.play('jin_bola_vuela');
      bola.setData({ vx: Math.cos(ang) * C.bola * this.jefeFuria, vy: Math.sin(ang) * C.bola * this.jefeFuria, hasta: this.time.now + 3500 });
      this.bolas.push(bola);
      sonarImpacto(this, 'granada');
      this.cambiarCasa();
    });
    J.once('animationcomplete', () => { J.off('animationupdate'); this.quieto(Phaser.Math.Between(...C.pausa)); });
  }

  moverBolas(dt) {
    const jb = this.jugador.body;
    this.bolas = this.bolas.filter((b) => {
      if (!b.active) return false;
      b.x += b.getData('vx') * dt;
      b.y += b.getData('vy') * dt;
      const toca = b.x > jb.left - 10 && b.x < jb.right + 10 && b.y > jb.top - 10 && b.y < jb.bottom + 10;
      if (!toca && b.y < this.pisoJinete(b.x) && this.time.now < b.getData('hasta')) return true;
      if (toca) this.golpearJugador(b.x - b.getData('vx') * 0.1);
      b.play('jin_bola_explota');
      b.setData({ vx: 0, vy: 0 });
      b.once('animationcomplete', () => b.destroy());
      return false;
    });
  }

  // Fase 2: se hunde en un portal y sale embistiendo de otro, bajo el jugador.
  ataquePortal() {
    const C = this.cfg.jinete;
    const J = this.jefe;
    this.jefeEstado = 'portal';
    this.abrirPortal(J.x, {}, (p) => {
      // Se hunde en su portal (la máscara corta lo de abajo del suelo).
      const mascara = this.make.graphics({ add: false });
      mascara.fillRect(J.x - 260, p.piso - 600, 520, 600);
      J.setMask(mascara.createGeometryMask());
      this.tweens.add({
        targets: J, y: p.piso + 240, duration: 500, ease: 'Quad.in',
        onComplete: () => {
          J.clearMask(true).setVisible(false);
          this.cerrarPortal(p);
          const [a, b] = this.arenaJinete();
          const x = Phaser.Math.Clamp(this.jugador.x, a + 40, b - 40);
          this.abrirPortal(x, { grietas: C.portal }, (q) => {
            const b = this.jugador.body;
            if (Math.abs(b.center.x - x) < 70 && b.bottom > q.piso - 20) this.golpearJugador(x);
            const lado = x < (a + b) / 2 ? 1 : -1;
            this.salirDelPortal(q, lado, true, () => this.embestir(lado, true));
          });
        }
      });
    });
  }

  // La caja del jinete (para balas y choques).
  cajaJinete() {
    const J = this.jefe;
    return new Phaser.Geom.Rectangle(J.x - 70, J.y - 200, 140, 200);
  }

  danarJefe(dano) {
    if (!this.jefe || ['muerto', 'llega', 'portal'].includes(this.jefeEstado)) return;
    const C = this.cfg.jinete;
    this.jefeVida -= dano;
    this.jefe.setTintFill(0xffffff);
    this.time.delayedCall(50, () => this.jefe && this.jefe.active && this.jefeEstado !== 'muerto' && this.tintarJinete());
    this.barraJefe.set(this.jefeVida / C.vida);
    if (this.jefeVida <= C.vida / 2 && this.jefeFuria === 1) {
      this.jefeFuria = C.furia;
      this.aviso(this.jefe.x, this.jefe.y - 240, '¡NO PODRÁS CONMIGO!', 'rojo');
      this.cameras.main.flash(200, 120, 255, 210);
    }
    if (this.jefeVida <= 0) this.matarJefe();
  }

  tintarJinete() {
    if (this.jefeFuria > 1) this.jefe.setTint(0xc8fff0);
    else this.jefe.clearTint();
  }

  moverJefe(time, delta) {
    const dt = Math.min(delta || 16, 50) / 1000;
    this.moverBolas(dt);
    this.moverFuegos(dt);
    this.moverAura(time);
    const J = this.jefe;
    if (!J || !J.active || ['muerto', 'llega'].includes(this.jefeEstado)) return;
    const C = this.cfg.jinete;
    // Balas del jugador.
    if (this.jefeEstado !== 'portal') {
      const r = this.cajaJinete();
      this.balas.getChildren().slice().forEach((b) => {
        if (!b.active || !r.contains(b.x, b.y) || this.impactoBala(b)) return;
        chispas(this, b.x, b.y, 4, 180, 90, 10.5);
        const d = b.getData('dano') || 1;
        b.destroy();
        this.danarJefe(d);
      });
    }
    if (this.jefeEstado === 'elige') {
      J.y = this.pisoJinete(J.x) + Math.sin(time / 300) * 2;
      if (this.estado === 'control' && time > this.jefeHasta) this.elegirAtaque();
    } else if (this.jefeEstado === 'carga') {
      const lado = J.getData('lado');
      J.x += lado * C.galope * this.jefeFuria * dt;
      J.y = this.pisoJinete(J.x);
      if (Math.random() < 0.3) chispas(this, J.x - lado * 40, J.y - 6, 2, lado > 0 ? 200 : -20, 50, 9.9);
      const jb = this.jugador.body;
      const caballo = new Phaser.Geom.Rectangle(J.x - 70, J.y - 105, 140, 105);
      if (this.estado === 'control' && Phaser.Geom.Intersects.RectangleToRectangle(caballo, new Phaser.Geom.Rectangle(jb.x, jb.y, jb.width, jb.height))) {
        this.golpearJugador(J.x);
      }
      if ((lado > 0 && J.x >= this.cargaHasta) || (lado < 0 && J.x <= this.cargaHasta)) {
        J.anims.timeScale = 1;
        this.cameras.main.shake(120, 0.004);
        this.quieto(Phaser.Math.Between(...C.pausa));
      }
    }
  }

  // Se electrocuta, se le cae la galera, se vuelve huesos y estalla en fuego verde.
  matarJefe() {
    const J = this.jefe;
    const C = this.cfg.jinete;
    this.jefeEstado = 'muerto';
    sumarPuntos(this, C.puntos);
    J.removeAllListeners('animationupdate');
    J.removeAllListeners('animationcomplete');
    this.tweens.killTweensOf(J);
    J.clearTint().clearMask(true).setVisible(true);
    this.apagarAura();
    this.fuegos.forEach((f) => f.destroy());
    this.fuegos = [];
    this.normalizarCasa();
    J.y = this.pisoJinete(J.x);
    this.bolas.forEach((b) => b.destroy());
    this.bolas = [];
    this.barraJefe.ocultar();
    this.calentarAmbiente();
    this.aviso(J.x, J.y - 240, '¡NOOO!', 'rojo');
    this.animarJinete('muerte');
    J.anims.timeScale = 0.5; // despacio
    // La cámara se acerca a él mientras muere y después vuelve.
    this.zoomCine = true;
    this.estado = 'cinematica';
    this.jugador.setVelocity(0);
    const cam = this.cameras.main;
    cam.pan(J.x, J.y - 110, 1000, 'Sine.easeInOut');
    cam.zoomTo(1.7, 1000, 'Sine.easeInOut');
    this.cameras.main.shake(600, 0.01);
    this.time.delayedCall(900, () => { this.cameras.main.flash(200, 200, 255, 230); sonarImpacto(this, 'cohete'); });
    J.once('animationcomplete', () => {
      const { width: an, height: al } = this.scale;
      const sx = Phaser.Math.Clamp(this.jugador.x - an / 2, 0, this.cfg.ancho - an);
      cam.zoomTo(1, 1200, 'Sine.easeInOut', true);
      cam.pan(sx + an / 2, al / 2, 1200, 'Sine.easeInOut', true, (c, t) => {
        if (t < 1) return;
        this.zoomCine = false;
        this.estado = 'control';
      });
      this.tweens.add({ targets: J, alpha: 0, duration: 1600, onComplete: () => { J.destroy(); this.jefe = null; } });
      this.jefeVencido = true;
      const { width, height } = this.scale;
      const fin = TextFX.letras(this, width / 2, height / 2 - 60, '¡JINETE DERROTADO!', { escala: 3, cada: 45, fijo: true, profundidad: 32 });
      this.time.delayedCall(2400, () => fin.salir(400));
    });
  }

  // ---------------------------------------------------------------------------
  // Salida: la puerta del fondo a la derecha, hacia el Cerro Rico
  // ---------------------------------------------------------------------------

  alTerminar() {
    const [x0, x1] = this.cfg.salida;
    this.abrir('pd');
    const t = TextFX.texto(this, (x0 + x1) / 2, 320, 'AL CERRO RICO →', { color: 'oro', escala: 2 }).setDepth(16);
    this.tweens.add({ targets: t, x: t.x - 10, duration: 400, yoyo: true, repeat: -1 });
    this.time.delayedCall(800, () => this.mostrarGo(true));
  }

  revisarSalida() {
    const b = this.jugador.body;
    if (b.center.x > this.cfg.salida[0] && b.bottom > 470) this.salir();
  }

  salir() {
    this.pasarA('Subida', (this.cfg.salida[0] + this.cfg.salida[1]) / 2);
  }
}

// Las hojas del jinete (jinete.json: celdas y orígenes) y sus animaciones.
const HOJAS_JINETE = ['galope', 'ataque', 'lanza', 'muerte', 'sale', 'bola', 'portal', 'portal_luz',
  'fx_llama', 'fx_muro', 'fx_pilar', 'fx_caballo', 'fx_niebla', 'fx_explota', 'fx_calavera', 'fx_rayo'];

function animacionesJinete(escena) {
  const datos = escena.cache.json.get('jineteDatos');
  const celdas = {};
  HOJAS_JINETE.forEach((n) => { const d = datos[n]; celdas[n] = [d.ancho, d.alto, d.cuadros]; });
  hojasDeJson(escena, 'jin_', celdas); // Tuneles.js
  // Resplandor redondo y suave (para los brillos del portal).
  if (!escena.textures.exists('jin_resplandor')) {
    const t = escena.textures.createCanvas('jin_resplandor', 128, 128);
    const c = t.getContext();
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    t.refresh();
  }
  texturaPixeles(escena, 'jin_piedra', ['.kk.', 'kddk', 'kddk', '.kk.'], { k: 0x3a3030, d: 0x7a6a60 });
  const anim = (key, hoja, frames, frameRate, repeat = 0) => {
    if (!escena.anims.exists(key)) escena.anims.create({ key, frames: frames.map((f) => ({ key: 'jin_' + hoja, frame: String(f) })), frameRate, repeat });
  };
  const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  anim('jin_galope', 'galope', rango(0, 5), 12, -1);
  anim('jin_ataque', 'ataque', rango(0, 4), 11);
  anim('jin_lanza', 'lanza', rango(0, 5), 10);
  anim('jin_sale', 'sale', rango(0, 7), 6);
  anim('jin_muerte', 'muerte', rango(0, 10), 7);
  anim('jin_bola_vuela', 'bola', rango(0, 3), 14, -1);
  anim('jin_bola_explota', 'bola', rango(4, 9), 16);
  anim('jin_portal_abre', 'portal', rango(0, 7), 12);
  anim('jin_portal_arde', 'portal', rango(8, 11), 8, -1);
  anim('jin_portal_cierra', 'portal', rango(12, 17), 12);
  anim('jin_portal_luz', 'portal_luz', rango(0, 3), 10, -1);
  anim('jin_fx_muro', 'fx_muro', [0, 1, 2, 1], 10, -1);
  anim('jin_fx_pilar', 'fx_pilar', rango(0, 4), 14);
  anim('jin_fx_caballo', 'fx_caballo', [1, 2, 1, 2], 10, -1);
  anim('jin_fx_explota', 'fx_explota', rango(0, 4), 14);
  anim('jin_fx_calavera', 'fx_calavera', [0, 1, 2, 1], 10, -1);
  anim('jin_fx_rayo', 'fx_rayo', [0, 1, 2, 1, 3], 16);
}
