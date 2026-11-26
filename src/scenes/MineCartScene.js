// =============================================================================
// NIVEL 2 · LA PERSECUCIÓN EN CARRITO (escena MineCartScene). Viene de los
// túneles (Tuneles.js: la estación de carritos) y termina contra el tope de la
// vía, en la entrada a la caverna del jefe.
//
// Cámara: avanza sola (de CARRITO.velocidad.min a .max en los tramos rectos)
// y nunca vuelve; el jugador puede adelantarse o quedarse un poco dentro de
// la pantalla (← →), nunca salirse.
//
// Imágenes: assets/nivel2/mina/carrito/ (herramientas/mina_tuneles.py, a
// partir de B1..B4, B6 y heroe_carrito.jpeg). Parallax: B1 0.05, B2 0.25,
// B3 0.6, la vía 1.0 y el primer plano 1.6 por delante (no hay B5: se usan
// las franjas de A4 de los túneles). La vía se arma con los módulos de B4 en
// el orden de cart_track.json; cart_modulos.json (la herramienta) tiene la
// altura del riel de cada módulo a la izquierda y a la derecha: el carrito
// sigue esa línea módulo por módulo y se inclina con la pendiente.
//
// cart_track.json:
//   inicio.riel      y del riel al empezar (px del mundo)
//   anchoHueco       px sin riel entre las dos mitades de un hueco
//   altoDesvio       cuánto más arriba va la ruta B de un desvío
//   secuencia        módulos: "recta" o { "m": "recta", "eventos": [...] }
//                    o { "desvio": { "a": [...], "b": [...] } } (dos rutas que
//                    se juntan; se pasa a la B disparándole a la palanca del
//                    "cambio" de antes)
//   eventos          se disparan cuando el módulo entra a la pantalla:
//                    carrito_atras, carrito_adelante, carrito_fondo, soldado,
//                    barril, murcielagos, plata, "cartel:TEXTO"
//
// Controles: ESPACIO salta (el carrito salta con el jugador), ↓ se agacha
// (las vigas bajas), J/X dispara adelante (con ↑ arriba, agachado bajo),
// K/G lanza dinamita, ← → se adelanta o se queda.
//
// Todo es a mano (sin cuerpos de física): balas, enemigos y efectos salen de
// pozos que se reusan, para mantener 60 fps. Al cerrar la escena se borra
// todo (limpiar): los pozos, los eventos y el sonido de los rieles.
// =============================================================================

const CARRITO = {
  velocidad: { min: 180, max: 260, aceleracion: 40, arranque: 1600 },
  // Tramos a toda velocidad (en los huecos no frena: si no, el salto no llega).
  rectas: ['recta', 'puente', 'caballete', 'hueco_a', 'hueco', 'hueco_b'],
  pantalla: { x: 300, min: 110, max: 660, ajuste: 120 }, // x del carrito en pantalla
  rielPantalla: 410,       // la y del riel en la pantalla (la cámara sigue la altura)
  // Salto: sube ~225 px (salto² / 2·gravedad) y está ~1.1 s en el aire: a
  // toda velocidad pasa de sobra un hueco.
  salto: 820, gravedad: 1500,
  saltoLargo: 0.72,        // gravedad mientras sube con ESPACIO apretado (~300 px)
  margenSalto: 130,        // ms después de salir del riel en los que todavía puede saltar
  ruedas: 52,              // px del centro a cada rueda (se apoya si una está sobre riel)
  // El héroe dentro del carro: x respecto del centro del carro (su cuerpo está
  // corrido a la izquierda en la celda) y cuánto se hunde bajo el borde.
  heroe: { x: 4, hundido: 26, agachado: 30 }, // agachado: cuánto más se mete en el carro
  alto: { parado: 138, agachado: 84 }, // de la cabeza sobre el riel
  solape: 13,
  franjaRiel: 40,                      // px de cada módulo debajo del riel que se ven (rieles y durmientes)                          // px que cada módulo de vía se mete en sus vecinos
  disparo: { cadencia: 150, velocidad: 950, alcance: 900 },
  dinamita: { velocidad: { x: 260, y: 520 }, gravedad: 1500, mecha: 1300, radio: 130, dano: 6 },
  golpe: { invulnerable: 1300 },
  enemigo: { vida: 8, rafaga: 3, pausa: [1500, 2400], bala: 300, puntos: 500 },
  fondo: { vida: 4, escala: 0.6, y: 250, pausa: [1700, 2800] },
  soldado: { alto: 320, pausa: [1600, 2600], puntos: 100 },
  barril: { vida: 2, velocidad: 150 },
  murcielago: { velocidad: 0.35, puntos: 50 },
  viga: { sobreRiel: 118 },
  parallax: [
    { clave: 'mcB1', archivo: 'b1_fondo.png', factor: 0.05, y: 0, vertical: 0 },
    { clave: 'mcB2', archivo: 'b2_andamios.png', factor: 0.25, y: 0, vertical: 0.15, tinte: 0xb0a8a0 },
    { clave: 'mcB3', archivo: 'b3_mina.png', factor: 0.6, y: 20, vertical: 0.35, tinte: 0xc8c0b8 }
  ],
  // Por delante (1.6): las franjas de A4 de los túneles.
  frente: [
    { clave: 'tunA4arriba', archivo: 'a4_arriba.png', y: -60, factor: 1.6 },
    { clave: 'tunA4abajo', archivo: 'a4_abajo.png', y: 540, factor: 1.6 }
  ],
  siguiente: 'CavernaJefe'
};

class MineCartScene extends Phaser.Scene {
  constructor() {
    super('MineCartScene');
  }

  preload() {
    if (!this.textures.exists('enemigo2')) Nivel1.prototype.preload.call(this);
    cargarSfxArmas(this);
    const imagen = (clave, archivo, ruta = RUTA_CARRITO) => { if (!this.textures.exists(clave)) this.load.image(clave, ruta + archivo); };
    CARRITO.parallax.forEach((c) => imagen(c.clave, c.archivo));
    CARRITO.frente.forEach((c) => imagen(c.clave, c.archivo, RUTA_TUNELES));
    ['recta', 'subida', 'bajada', 'puente', 'caballete', 'hueco_a', 'hueco_b', 'viga', 'cambio', 'tope']
      .forEach((m) => imagen('mc_via_' + m, `via_${m}.png`));
    ['relleno', 'viga_tabla', 'viga_poste', 'dinamita'].forEach((n) => imagen('mc_' + n, n + '.png'));
    ['carro', 'enemigo', 'destruccion', 'chispas', 'polvo', 'astillas', 'velocidad', 'heroe']
      .forEach((n) => imagen('mcHoja_' + n, `hoja_${n}.png`));
    if (!this.cache.json.exists('cartModulos')) this.load.json('cartModulos', RUTA_CARRITO + 'cart_modulos.json');
    if (!this.cache.json.exists('cartTrack')) this.load.json('cartTrack', RUTA_CARRITO + 'cart_track.json');
  }

  create() {
    const { width, height } = this.scale;
    if (this.registry.get('vidas') === undefined) nuevaPartida(this.registry);
    if (this.registry.get('vida') === undefined) this.registry.set('vida', VIDA.mitades);
    // Sin dinamita de los mineros, al menos unas pocas.
    this.registry.set('dinamita', Math.max(3, this.registry.get('dinamita') || 0));
    this.estado = 'arranque';
    this.muerto = false;
    this.sinPausa = false;
    this.ruta = 'a';
    this.velocidad = 0;
    this.offset = CARRITO.pantalla.x;
    this.proximoDisparo = 0;
    this.invulnerableHasta = 0;
    this.ultimoRiel = 0;
    this.datos = this.cache.json.get('cartModulos');
    hojasDeJson(this, 'mcHoja_', this.datos.hojas);
    texturasEfectos(this);
    texturasCueva(this);
    texturasPotosi(this);
    texturasCarrito(this);
    texturasLuzMina(this); // Tuneles.js (resplandores)
    this.animacionesCarrito();

    this.crearFondo();
    this.armarVia(this.cache.json.get('cartTrack'));
    this.crearCarro();
    this.refRed = this.spriteCarro; // (Red.js: la posición que se manda)
    this.crearPozos();
    this.crearHUD();
    this.crearSonidoRieles();
    crearEco(this, { retardo: 0.18, realimentacion: 0.3, mezcla: 0.28, filtro: 2000 });

    this.teclas = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,J,X,K,G');
    this.input.keyboard.resetKeys();
    const cam = this.cameras.main;
    cam.setBounds(-200, -4000, this.finVia + 400, 9000).setBackgroundColor(0x060407);
    cam.scrollX = 0;
    cam.scrollY = this.rielEn(this.offset).y - CARRITO.rielPantalla;
    this.camY = cam.scrollY;
    cam.fadeIn(500, 0, 0, 0);
    tocarMusica(this, 'nivel1');
    this.titulo();
    this.events.once('shutdown', () => this.limpiar());
    this.alPausar = () => this.silenciarRieles(true);
    this.alSeguir = () => this.silenciarRieles(false);
    this.events.on('pause', this.alPausar);
    this.events.on('resume', this.alSeguir);
  }

  titulo() {
    const { width } = this.scale;
    const nombre = TextFX.letras(this, width / 2, 120, '¡PERSECUCIÓN!', {
      escala: 4, cada: 60, fijo: true, profundidad: 32,
      alTerminar: () => {
        const sub = TextFX.texto(this, width / 2, 168, 'LA VÍA DEL SOCAVÓN', { color: 'plata', escala: 1 }).setScrollFactor(0).setDepth(32);
        this.time.delayedCall(1500, () => { nombre.salir(400); this.tweens.add({ targets: sub, alpha: 0, duration: 400, onComplete: () => sub.destroy() }); });
      }
    });
    this.time.delayedCall(CARRITO.velocidad.arranque, () => { if (this.estado === 'arranque') this.estado = 'control'; });
  }

  animacionesCarrito() {
    const anim = (key, clave, frames, frameRate, repeat = 0) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(clave, { frames }), frameRate, repeat });
    };
    anim('mc_enemigo', 'mcHoja_enemigo', [0, 1, 2, 1], 8, -1);
    anim('mc_destruccion', 'mcHoja_destruccion', [0, 1, 2, 3, 4, 5], 12);
    anim('mc_chispas', 'mcHoja_chispas', [0, 1, 2, 3], 22);
    anim('mc_polvo', 'mcHoja_polvo', [0, 1, 2], 12);
    anim('mc_astillas', 'mcHoja_astillas', [0, 1, 2, 3], 14);
    anim('mc_murcielago', 'mc_murcielago', [0, 1], 10, -1);
    // Los soldados (enemigo1): las mismas animaciones que en los niveles.
    const E = ENEMIGO1;
    const porFila = E.caminar + E.ataque + E.muerte;
    E.camisas.forEach((camisa, fila) => {
      if (this.anims.exists(`soldado_${camisa}`)) return;
      const inicio = fila * porFila;
      const cuadros = (a, n) => this.anims.generateFrameNumbers('enemigo1', { start: inicio + a, end: inicio + a + n - 1 });
      this.anims.create({ key: `soldado_${camisa}`, frames: cuadros(0, E.caminar), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `soldado_ataque_${camisa}`, frames: cuadros(E.caminar, E.ataque), frameRate: 11 });
      this.anims.create({ key: `soldado_muerte_${camisa}`, frames: cuadros(E.caminar + E.ataque, E.muerte), frameRate: 9 });
      this.anims.create({ key: `soldado_quieto_${camisa}`, frames: cuadros(E.caminar, 1), frameRate: 1 });
    });
    texturaPixeles(this, 'balaSoldado', ['.yyyw', 'oyyyw'], { y: 0xffd23f, w: 0xffffff, o: 0xd06010 });
  }

  // ---------------------------------------------------------------------------
  // Fondo: parallax (fijo a la cámara) y las vías paralelas del fondo
  // ---------------------------------------------------------------------------

  crearFondo() {
    const { width } = this.scale;
    this.capas = CARRITO.parallax.map((c, i) => {
      const alto = this.textures.get(c.clave).getSourceImage().height;
      const capa = this.add.tileSprite(0, c.y, width, alto, c.clave).setOrigin(0).setScrollFactor(0).setDepth(i * 0.5);
      if (c.tinte) capa.setTint(c.tinte);
      return { capa, ...c };
    });
    // La vía paralela del fondo (carritos enemigos que disparan desde ahí).
    const recta = this.datos.modulos.recta;
    // (Solo la franja de los rieles y los durmientes, sin la roca de abajo.)
    this.viaFondo = this.add.tileSprite(0, CARRITO.fondo.y - recta.riel[0] * CARRITO.fondo.escala, width / CARRITO.fondo.escala, recta.riel[0] + 24, 'mc_via_recta')
      .setOrigin(0).setScale(CARRITO.fondo.escala).setScrollFactor(0).setDepth(2).setTint(0x8a7468);
    this.frente = CARRITO.frente.map((c) => {
      const alto = this.textures.get(c.clave).getSourceImage().height;
      return { capa: this.add.tileSprite(0, c.y, width, alto, c.clave).setOrigin(0).setScrollFactor(0).setDepth(14).setTint(0x8a7a70), ...c };
    });
  }

  moverFondo() {
    const cam = this.cameras.main;
    const dy = cam.scrollY - this.camY0;
    this.capas.forEach((c) => {
      c.capa.tilePositionX = cam.scrollX * c.factor;
      c.capa.y = c.y - dy * c.vertical;
    });
    this.viaFondo.tilePositionX = cam.scrollX * 0.85 / CARRITO.fondo.escala;
    this.frente.forEach((c) => { c.capa.tilePositionX = cam.scrollX * c.factor; });
  }

  // ---------------------------------------------------------------------------
  // La vía: módulos de B4 uno tras otro (cart_track.json)
  // ---------------------------------------------------------------------------

  armarVia(track) {
    const M = this.datos.modulos;
    this.vias = { a: [], b: [] };
    this.tramosVia = [];
    let x = 0;
    let riel = track.inicio.riel;
    // Pone un módulo en (x, riel) en la(s) ruta(s) dadas; devuelve el riel de la derecha.
    const poner = (item, rutas, xi, ri, profundidad) => {
      const { m, eventos = [] } = typeof item === 'string' ? { m: item } : item;
      const piezas = m === 'hueco'
        ? [{ m: 'hueco_a' }, { m: null, ancho: track.anchoHueco || 170 }, { m: 'hueco_b' }]
        : [{ m }];
      let px = xi;
      let pr = ri;
      piezas.forEach((p, k) => {
        const d = p.m ? M[p.m] : { ancho: p.ancho, riel: [M.hueco_a.riel[1], M.hueco_a.riel[1]] };
        if (!d) { console.warn('cart_track.json: módulo desconocido', p.m); return; }
        const seg = {
          nombre: p.m || 'hueco', x0: px, x1: px + d.ancho, y0: pr, y1: pr + d.riel[1] - d.riel[0],
          solido: !!p.m, rutas, eventos: k === 0 ? eventos.slice() : [], objetos: []
        };
        if (p.m) {
          const arriba = pr - d.riel[0];
          // Un poco más ancho que su lugar: los costados (difuminados en la
          // herramienta) se funden con los vecinos, sin costura.
          const S = CARRITO.solape;
          const img = this.add.image(px - S, arriba, 'mc_via_' + p.m).setOrigin(0).setDisplaySize(d.ancho + S * 2, d.alto).setDepth(profundidad);
          // Con roca debajo: del módulo queda solo la franja de los rieles y
          // los durmientes; la roca es una sola, continua (rocaVia).
          if (d.relleno) img.setCrop(0, 0, img.width, Math.max(...d.riel) + CARRITO.franjaRiel);
          seg.objetos.push(img);
          if (p.m === 'viga') this.ponerViga(seg, arriba, profundidad);
          if (p.m === 'cambio') {
            const [lx, ly, lr] = d.palanca;
            seg.palanca = { x: px + lx, y: arriba + ly, r: lr, activa: true };
            this.palancas.push(seg.palanca);
          }
        }
        rutas.forEach((r) => this.vias[r].push(seg));
        this.tramosVia.push(seg);
        px = seg.x1;
        pr = seg.y1;
      });
      return [px, pr];
    };
    this.palancas = [];
    this.desvios = [];
    track.secuencia.forEach((item) => {
      if (item.desvio) {
        const { a, b } = item.desvio;
        const alto = track.altoDesvio || -190;
        let [xa, ra] = [x, riel];
        let [xb, rb] = [x, riel + alto];
        a.forEach((m) => { [xa, ra] = poner(m, ['a'], xa, ra, 5); });
        b.forEach((m) => { [xb, rb] = poner(m, ['b'], xb, rb, 4.5); });
        if (Math.abs(xa - xb) > 12) console.warn('cart_track.json: las rutas del desvío no miden lo mismo', xa - x, xb - x);
        this.desvios.push({ x0: x, x1: Math.max(xa, xb), alto });
        x = Math.max(xa, xb);
        riel = ra;
        return;
      }
      [x, riel] = poner(item, ['a', 'b'], x, riel, 5);
    });
    this.finVia = x;
    this.rocaVia(track.inicio.riel);
    const tope = this.tramosVia[this.tramosVia.length - 1];
    this.tope = tope.nombre === 'tope' ? tope : null;
    this.xTope = this.tope ? this.tope.x1 - 70 : Infinity; // donde el carro choca con el tope
    // Detrás del tope: la boca de la caverna del jefe (oscura, con un resplandor rojo).
    this.add.image(x + 140, riel - 70, 'mc_boca').setScale(1.3, 1.6).setDepth(4.4);
    const rojo = this.add.image(x + 120, riel - 90, 'tun_luzCalida').setScale(1.6).setTint(0xff3020)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(4.45);
    this.tweens.add({ targets: rojo, alpha: 0.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.vias.a.sort((p, q) => p.x0 - q.x0);
    this.vias.b.sort((p, q) => p.x0 - q.x0);
    this.camY0 = track.inicio.riel - CARRITO.rielPantalla;
  }

  // La roca debajo de la vía: una sola pieza (sin uniones) que sigue la
  // altura de los rieles; en los huecos y los puentes, nada (el abismo).
  rocaVia() {
    const F = CARRITO.franjaRiel - 6;
    if (!this.textures.exists('mc_roca')) {
      // Roca dibujada que se repite sin costura ni simetría: piedras de
      // varios tonos (cada una dibujada también del otro lado del borde) y
      // vetas de plata.
      const T = 256;
      const c = document.createElement('canvas');
      c.width = T;
      c.height = T;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#5a2a1e';
      ctx.fillRect(0, 0, T, T);
      const rnd = new Phaser.Math.RandomDataGenerator(['roca']);
      const tonos = ['#62301f', '#6a3524', '#5a2a1c', '#70392a', '#542619'];
      // Grano: puntos sueltos.
      for (let k = 0; k < 1400; k++) {
        ctx.fillStyle = rnd.pick(['rgba(30,10,6,0.35)', 'rgba(150,90,70,0.25)']);
        ctx.fillRect(rnd.between(0, T - 1), rnd.between(0, T - 1), 2, 2);
      }
      const envolver = (fn) => [-T, 0, T].forEach((dx) => [-T, 0, T].forEach((dy) => fn(dx, dy)));
      for (let k = 0; k < 55; k++) {
        const x = rnd.between(0, T); const y = rnd.between(0, T);
        const rx = rnd.between(8, 22); const ry = rnd.between(5, 14);
        const rot = rnd.realInRange(-0.6, 0.6);
        const tono = rnd.pick(tonos);
        envolver((dx, dy) => {
          ctx.fillStyle = 'rgba(40,14,8,0.55)';
          ctx.beginPath(); ctx.ellipse(x + dx + 1, y + dy + 2, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = tono;
          ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(200,140,110,0.1)';
          ctx.beginPath(); ctx.ellipse(x + dx - rx * 0.3, y + dy - ry * 0.4, rx * 0.45, ry * 0.3, rot, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const pts = [[rnd.between(0, T), rnd.between(0, T)]];
        for (let q = 0; q < 5; q++) pts.push([pts[q][0] + rnd.between(-18, 18), pts[q][1] + rnd.between(4, 16)]);
        envolver((dx, dy) => {
          ctx.strokeStyle = 'rgba(200,204,212,0.6)';
          ctx.beginPath();
          pts.forEach(([x, y], q) => (q ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
          ctx.stroke();
        });
      }
      this.textures.addCanvas('mc_roca', c);
    }
    const forma = this.make.graphics({ add: false });
    forma.fillStyle(0xffffff);
    this.vias.a.forEach((s) => {
      const m = this.datos.modulos[s.nombre];
      if (!s.solido || !m || !m.relleno) return;
      forma.fillPoints([{ x: s.x0 - 1, y: s.y0 + F }, { x: s.x1 + 1, y: s.y1 + F }, { x: s.x1 + 1, y: s.y1 + 2000 }, { x: s.x0 - 1, y: s.y0 + 2000 }], true);
    });
    const ys = this.vias.a.map((s) => Math.min(s.y0, s.y1));
    const arriba = Math.min(...ys) - 50;
    this.roca = this.add.tileSprite(-200, arriba, this.finVia + 600, 2400, 'mc_roca').setOrigin(0).setDepth(4.95);
    this.roca.setMask(forma.createGeometryMask());
    this.formaRoca = forma;
    // Más oscuro hacia abajo (la roca se pierde en lo hondo).
    if (!this.textures.exists('mc_hondo')) {
      const c = this.textures.createCanvas('mc_hondo', 4, 256);
      const g = c.getContext().createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(10,3,2,0)'); g.addColorStop(1, 'rgba(10,3,2,0.85)');
      c.getContext().fillStyle = g; c.getContext().fillRect(0, 0, 4, 256); c.refresh();
    }
    this.add.image(0, this.scale.height - 200, 'mc_hondo').setOrigin(0).setDisplaySize(this.scale.width, 200).setScrollFactor(0).setDepth(5.05);
    this.events.once('shutdown', () => forma.destroy());
  }

  // Viga baja: la tabla colgada con dos postes que suben hasta el techo.
  ponerViga(seg, arriba, profundidad) {
    const tabla = this.textures.get('mc_viga_tabla').getSourceImage();
    const x = seg.x0 + (seg.x1 - seg.x0) / 2;
    const abajo = seg.y0 - CARRITO.viga.sobreRiel;
    const t = this.add.image(x, abajo, 'mc_viga_tabla').setOrigin(0.5, 1).setDepth(11.5);
    const postes = [-1, 1].map((l) => this.add.tileSprite(x + l * (tabla.width / 2 - 16), abajo - tabla.height + 6, 22, 700, 'mc_viga_poste')
      .setOrigin(0.5, 1).setDepth(11.4).setTint(0x9a8070));
    seg.objetos.push(t, ...postes);
    seg.viga = { x0: x - tabla.width / 2 + 8, x1: x + tabla.width / 2 - 8, abajo, tocada: false };
  }

  // El tramo de la ruta que tiene x (búsqueda binaria) y la y del riel ahí.
  rielEn(x, ruta = this.ruta) {
    const lista = this.vias[ruta];
    let lo = 0;
    let hi = lista.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (lista[m].x0 <= x) lo = m; else hi = m - 1;
    }
    const s = lista[lo];
    const t = Phaser.Math.Clamp((x - s.x0) / (s.x1 - s.x0), 0, 1);
    return { y: s.y0 + (s.y1 - s.y0) * t, seg: s, angulo: Math.atan2(s.y1 - s.y0, s.x1 - s.x0) };
  }

  // Dónde se apoya el carrito en x: el riel del medio o, sobre el borde de un
  // hueco, el de la rueda que todavía está sobre riel (se cae recién cuando
  // las dos ruedas quedan en el aire, y aterriza apenas llega la de adelante).
  apoyo(x, ruta = this.ruta) {
    const r = this.rielEn(x, ruta);
    if (r.seg.solido) return { ...r, solido: true };
    const R = CARRITO.ruedas;
    for (const dx of [R, -R]) {
      const q = this.rielEn(x + dx, ruta);
      if (q.seg.solido) return { ...q, solido: true };
    }
    return { ...r, solido: false };
  }

  // ---------------------------------------------------------------------------
  // El carrito y el héroe
  // ---------------------------------------------------------------------------

  crearCarro() {
    const x = this.offset;
    const r = this.rielEn(x);
    this.carro = { x, y: r.y, vy: 0, enRiel: true, angulo: 0, agachado: false };
    this.spriteCarro = this.add.image(x, r.y, 'mcHoja_carro', 0).setOrigin(0.5, 1).setDepth(10);
    // El origen en la cabeza (al 41,5 % de la celda): al darse vuelta para
    // disparar atrás gira sobre sí mismo, sin salirse del carro.
    this.heroe = this.add.image(x, r.y, 'mcHoja_heroe', 0).setOrigin(0.415, 1).setDepth(9.9);
    this.altoCarro = this.datos.hojas.carro[1];
    this.pose = { tipo: 'anda', desde: 0, hasta: 0, arriba: false };
  }

  moverCarro(dt) {
    const C = CARRITO;
    const k = this.teclas;
    const c = this.carro;
    const libre = this.estado === 'control';
    const cam = this.cameras.main;
    // ← →: un poco más adelante o atrás, dentro de la pantalla.
    if (libre) {
      const dir = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
      this.offset = Phaser.Math.Clamp(this.offset + dir * C.pantalla.ajuste * dt, C.pantalla.min, C.pantalla.max);
    }
    if (this.estado === 'frenando' || this.estado === 'final') {
      // Frenando: el carro sigue solo hasta el tope (la cámara ya casi no avanza).
      c.x = Math.min(this.xTope, c.x + this.velocidad * dt);
      this.offset = c.x - cam.scrollX;
    } else {
      c.x = cam.scrollX + this.offset;
    }
    // Desvíos: al llegar al cambio con la palanca pedida, salta a la ruta B;
    // al final del desvío, si iba por la B, cae a la A.
    this.desvios.forEach((d) => {
      if (this.rutaPedida === 'b' && this.ruta === 'a' && c.x >= d.x0 && c.x < d.x0 + 200) {
        this.ruta = 'b';
        this.rutaPedida = null;
        c.enRiel = false;
        c.vy = -Math.sqrt(2 * C.gravedad * (Math.abs(d.alto) + 60));
        this.aviso(c.x, c.y - 170, '¡CAMBIO DE VÍA!', 'oro');
      }
      if (this.ruta === 'b' && c.x >= d.x1 - 2 && c.x < d.x1 + 300) {
        this.ruta = 'a';
        c.enRiel = false;
        c.vy = Math.min(c.vy, -160);
      }
    });
    const r = this.apoyo(c.x);
    const ahora = this.time.now;
    const apreto = libre && Phaser.Input.Keyboard.JustDown(k.SPACE);
    // Margen: recién salido del riel (sin haber saltado) todavía puede saltar.
    const margen = !c.enRiel && !c.salto && ahora - (c.dejoRielEn || 0) < C.margenSalto;
    c.agachado = libre && c.enRiel && (k.DOWN.isDown || k.S.isDown);
    if (apreto && (c.enRiel || margen)) {
      c.enRiel = false;
      c.salto = true;
      c.vy = -C.salto;
      if (r.solido) c.y = Math.min(c.y, r.y);
      sonarSfx(this, 'salto');
      this.chispasRuedas(4);
    } else if (c.enRiel) {
      if (!r.solido) {
        c.enRiel = false; // las dos ruedas fuera del riel: cae al hueco
        c.salto = false;
        c.vy = 0;
        c.dejoRielEn = ahora;
      } else {
        c.y = r.y;
        this.ultimoRiel = c.x;
      }
    }
    if (!c.enRiel) {
      const antes = c.y;
      // Con ESPACIO apretado mientras sube, la gravedad es menor: salta más alto.
      const flota = c.salto && c.vy < 0 && libre && k.SPACE.isDown;
      c.vy += C.gravedad * (flota ? C.saltoLargo : 1) * dt;
      c.y += c.vy * dt;
      if (c.vy > 0 && r.solido && antes <= r.y + 4 && c.y >= r.y) this.aterrizar(r.y);
      else if (c.vy > 0 && r.solido && c.y > r.y + 4) {
        // Llegó al riel por debajo (saltó tarde un hueco): si es poco, se
        // agarra; si no, se pegó contra el borde y cae.
        if (c.y - r.y < 40) this.aterrizar(r.y);
        else if (!this.muerto) this.caerAlHueco();
      } else if (!r.solido && c.y > r.y + 120 && !this.muerto) this.caerAlHueco();
    }
    // Inclinación: hacia la pendiente del riel (en el aire, de a poco a plano).
    const objetivo = c.enRiel ? r.angulo : c.vy < 0 ? -0.12 : 0.1;
    if (c.enRiel) c.salto = false;
    c.angulo += (objetivo - c.angulo) * Math.min(1, dt * 12);
    this.spriteCarro.setPosition(Math.round(c.x), Math.round(c.y + 2)).setRotation(c.angulo)
      .setFrame(Math.floor(c.x / 26) % 4);
    // El héroe va adentro (la parte de abajo queda tapada por el carro).
    // (Muerto o saltando afuera al final lo mueven sus propias animaciones.)
    if (this.muerto || this.estado === 'final') return;
    // Agachado se mete bien adentro del carro (de a poco).
    this.hundidoHeroe = Phaser.Math.Linear(this.hundidoHeroe || 0, c.agachado ? CARRITO.heroe.agachado : 0, 0.35);
    const dx = CARRITO.heroe.x;
    const dy = -this.altoCarro + CARRITO.heroe.hundido + this.hundidoHeroe;
    const s = Math.sin(c.angulo);
    const co = Math.cos(c.angulo);
    this.heroe.setPosition(Math.round(c.x + dx * co - dy * s), Math.round(c.y + 2 + dx * s + dy * co)).setRotation(c.angulo);
    this.heroe.setFrame(this.cuadroHeroe());
    // Disparando para atrás: mira para atrás.
    // (El espejo da vuelta el dibujo en su celda: el origen, en la cabeza, también.)
    const atras = this.pose.tipo === 'dispara' && this.pose.atras && this.time.now < this.pose.hasta;
    this.heroe.setFlipX(atras).setOrigin(atras ? 1 - 0.415 : 0.415, 1);
    const parpadea = this.time.now < this.invulnerableHasta && !this.muerto;
    const alfa = parpadea ? (Math.floor(this.time.now / 80) % 2 ? 0.35 : 1) : 1;
    this.spriteCarro.setAlpha(alfa);
    this.heroe.setAlpha(alfa);
  }

  cuadroHeroe() {
    const ahora = this.time.now;
    const p = this.pose;
    if (p.tipo === 'lanza' && ahora < p.hasta) return 12 + Math.min(3, Math.floor((ahora - p.desde) / 70));
    if (this.carro.agachado) return 10 + (Math.floor(ahora / 260) % 2);
    if (p.tipo === 'dispara' && ahora < p.hasta) return (p.arriba ? 7 : 4) + Math.min(2, Math.floor((ahora - p.desde) / 50));
    return Math.floor(ahora / 120) % 4;
  }

  aterrizar(y) {
    const c = this.carro;
    const fuerte = c.vy > 500;
    c.y = y;
    c.vy = 0;
    c.enRiel = true;
    this.efecto('polvo', c.x, y + 4, { escala: fuerte ? 1.1 : 0.8, alfa: 0.9 });
    this.chispasRuedas(fuerte ? 10 : 5);
    this.cameras.main.shake(fuerte ? 160 : 90, fuerte ? 0.008 : 0.004);
    sonidoUI(this, 'golpe');
    this.clack(0.12);
  }

  // Cayó al hueco: pierde una vida y reaparece en el último riel.
  caerAlHueco() {
    this.aviso(this.carro.x, this.carro.y - 160, '¡NOOO!', 'rojo');
    this.tweens.add({ targets: this.heroe, y: this.heroe.y + 420, angle: 40, duration: 900, ease: 'Quad.in' });
    this.perderVida('caida');
  }

  // ---------------------------------------------------------------------------
  // Disparos y dinamita
  // ---------------------------------------------------------------------------

  disparar() {
    const C = CARRITO.disparo;
    const k = this.teclas;
    const c = this.carro;
    const arriba = k.UP.isDown || k.W.isDown;
    const bajo = c.agachado;
    // ← (o A) apretado: dispara para atrás (se da vuelta en el carro).
    const atras = !arriba && (k.LEFT.isDown || k.A.isDown);
    this.proximoDisparo = this.time.now + C.cadencia;
    this.pose = { tipo: 'dispara', desde: this.time.now, hasta: this.time.now + 150, arriba: arriba && !bajo, atras };
    const v = this.velocidad;
    let x; let y; let vx; let vy; let angulo;
    if (arriba && !bajo) {
      x = c.x + 26; y = c.y - CARRITO.alto.parado; vx = v; vy = -C.velocidad; angulo = -90;
    } else if (atras) {
      x = c.x - (bajo ? 50 : 30); y = c.y - (bajo ? 46 : 112); vx = v - C.velocidad; vy = 0; angulo = 180;
    } else {
      x = c.x + (bajo ? 70 : 52); y = c.y - (bajo ? 46 : 112); vx = v + C.velocidad; vy = 0; angulo = 0;
    }
    const b = this.tomar(this.pozoBalas);
    if (!b) return;
    b.setPosition(x, y).setAngle(angulo).setData({ vx, vy, hasta: this.time.now + C.alcance / C.velocidad * 1000 });
    fogonazo(this, x, y, 1.4, 10.4, angulo);
    sonarArma(this, 'pistola');
  }

  lanzarDinamita() {
    const n = this.registry.get('dinamita') || 0;
    const c = this.carro;
    if (n <= 0) { this.aviso(c.x, c.y - 170, '¡SIN DINAMITA!', 'rojo'); sonidoUI(this, 'tic'); return; }
    this.registry.set('dinamita', n - 1);
    this.actualizarHUD();
    this.pose = { tipo: 'lanza', desde: this.time.now, hasta: this.time.now + 300 };
    this.time.delayedCall(150, () => {
      if (!this.carro) return;
      const D = CARRITO.dinamita;
      const d = this.tomar(this.pozoDinamita);
      if (!d) return;
      d.setPosition(c.x + 30, c.y - 150).setData({ vx: this.velocidad + D.velocidad.x, vy: -D.velocidad.y, hasta: this.time.now + D.mecha, ruta: this.ruta });
    });
  }

  explotarDinamita(d) {
    const { x, y } = d;
    this.soltar(d);
    explotar(this, x, y, 'mediana', ESCALA);
    sonarImpacto(this, 'granada');
    this.cameras.main.shake(180, 0.009);
    this.danoEnArea(x, y, CARRITO.dinamita.radio, CARRITO.dinamita.dano);
  }

  danoEnArea(x, y, radio, dano) {
    this.enemigos.slice().forEach((e) => {
      if (e.fondo || !e.vivo) return;
      const r = e.caja();
      const cx = Phaser.Math.Clamp(x, r.x, r.right);
      const cy = Phaser.Math.Clamp(y, r.y, r.bottom);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) <= radio) this.danar(e, dano);
    });
  }

  // ---------------------------------------------------------------------------
  // Pozos (se reusan: nada se crea ni se borra en cada disparo)
  // ---------------------------------------------------------------------------

  crearPozos() {
    const pozo = (n, crear) => Array.from({ length: n }, () => crear().setActive(false).setVisible(false));
    this.pozoBalas = pozo(30, () => this.add.image(0, 0, 'fx_bala').setScale(2).setDepth(10.3).setBlendMode(Phaser.BlendModes.ADD));
    this.pozoBalasEnemigas = pozo(30, () => this.add.image(0, 0, 'balaSoldado').setScale(ESCALA).setDepth(10.5));
    this.pozoDinamita = pozo(6, () => this.add.image(0, 0, 'mc_dinamita').setScale(1.6).setDepth(10.3));
    this.pozoEfectos = pozo(24, () => this.add.sprite(0, 0, 'mcHoja_polvo', 0).setDepth(10.6));
    this.pozoVelocidad = pozo(8, () => this.add.image(0, 0, 'mcHoja_velocidad', 0).setScrollFactor(0).setDepth(13)
      .setBlendMode(Phaser.BlendModes.ADD));
    this.enemigos = [];
    this.chispero = this.add.particles(0, 0, 'fx_chispa', {
      speed: { min: 80, max: 260 }, angle: { min: 160, max: 230 }, gravityY: 600, lifespan: { min: 150, max: 380 },
      scale: { start: 1.8, end: 0.3 }, tint: [0xffe080, 0xff9a2a], blendMode: 'ADD', emitting: false
    }).setDepth(10.4);
    this.time.addEvent({ delay: 110, loop: true, callback: () => this.lineasVelocidad() });
  }

  tomar(pozo) {
    const o = pozo.find((p) => !p.active);
    return o ? o.setActive(true).setVisible(true).setAlpha(1) : null;
  }

  soltar(o) {
    o.setActive(false).setVisible(false);
    if (o.anims) o.anims.stop();
  }

  // Un efecto de B6 (chispas, polvo, astillas) que se borra solo al terminar.
  efecto(nombre, x, y, { escala = 1, alfa = 1, espejo = false, profundidad = 10.6, angulo = 0 } = {}) {
    const s = this.tomar(this.pozoEfectos);
    if (!s) return;
    s.setTexture('mcHoja_' + nombre, 0).setPosition(x, y).setOrigin(0.5, 1).setScale(escala).setAlpha(alfa)
      .setFlipX(espejo).setDepth(profundidad).setAngle(angulo);
    s.play('mc_' + nombre);
    s.once('animationcomplete', () => this.soltar(s));
  }

  chispasRuedas(n) {
    const c = this.carro;
    this.chispero.explode(n, c.x - 50, c.y);
    this.chispero.explode(Math.ceil(n / 2), c.x + 30, c.y);
  }

  // Líneas de velocidad que pasan (más cuanto más rápido).
  lineasVelocidad() {
    if (this.velocidad < CARRITO.velocidad.min + 20 || Math.random() > (this.velocidad - 160) / 140) return;
    const l = this.tomar(this.pozoVelocidad);
    if (!l) return;
    const { width, height } = this.scale;
    l.setFrame(Phaser.Math.Between(0, 2)).setPosition(width + 120, Phaser.Math.Between(40, height - 60)).setAlpha(0.45)
      .setScale(Phaser.Math.FloatBetween(0.8, 1.6), 1);
    this.tweens.add({ targets: l, x: -260, duration: 260 * 220 / this.velocidad, onComplete: () => this.soltar(l) });
  }

  // ---------------------------------------------------------------------------
  // Enemigos y obstáculos (los dispara cada módulo al entrar a la pantalla)
  // ---------------------------------------------------------------------------

  revisarEventos() {
    const cam = this.cameras.main;
    const borde = cam.scrollX + this.scale.width + 40;
    this.tramosVia.forEach((s) => {
      if (!s.eventos.length || s.x0 > borde) return;
      const eventos = s.eventos.splice(0);
      // Los de una ruta del desvío, solo si el carrito va (o irá) por ahí.
      if (s.rutas.length === 1 && s.rutas[0] !== (this.rutaPedida || this.ruta)) return;
      eventos.forEach((ev) => this.evento(ev, s));
    });
  }

  evento(ev, s) {
    const [tipo, texto] = String(ev).split(':');
    if (tipo === 'cartel') { this.cartel(texto); return; }
    if (tipo === 'carrito_atras') this.nuevoCarrito(-1);
    else if (tipo === 'carrito_adelante') this.nuevoCarrito(1);
    else if (tipo === 'carrito_fondo') this.nuevoCarritoFondo();
    else if (tipo === 'soldado') this.nuevoSoldado(s);
    else if (tipo === 'barril') this.nuevoBarril(s);
    else if (tipo === 'murcielagos') this.nuevosMurcielagos(5);
    else if (tipo === 'plata') this.nuevaPlata(s);
  }

  cartel(texto) {
    const { width } = this.scale;
    const c = TextFX.alert(this, width / 2, 110, texto, { escala: 3 }).setScrollFactor(0).setDepth(31);
    c.destellar(4, 90, () => this.tweens.add({ targets: c, alpha: 0, delay: 700, duration: 300, onComplete: () => c.destroy() }));
  }

  // Un enemigo: sprite, vida, caja (para las balas) y qué hace cada cuadro.
  agregar(e) {
    e.vivo = true;
    e.caja = e.caja || (() => e.sprite.getBounds());
    this.enemigos.push(e);
    return e;
  }

  quitar(e) {
    e.vivo = false;
    Phaser.Utils.Array.Remove(this.enemigos, e);
  }

  danar(e, dano, desdeX) {
    if (!e.vivo) return;
    e.vida -= dano;
    e.sprite.setTintFill(0xffffff);
    this.time.delayedCall(50, () => e.sprite.active && (e.tinte ? e.sprite.setTint(e.tinte) : e.sprite.clearTint()));
    if (e.vida <= 0) e.morir(desdeX);
  }

  // Carrito blindado en la misma vía: por detrás (lado -1) o por delante (1).
  nuevoCarrito(lado) {
    const E = CARRITO.enemigo;
    const { width } = this.scale;
    const ruta = this.ruta;
    const sprite = this.add.sprite(0, 0, 'mcHoja_enemigo', 0).setOrigin(0.5, 1).setDepth(9.8).setFlipX(lado > 0);
    sprite.play('mc_enemigo');
    const destino = lado < 0 ? 120 : width - 170;
    const e = this.agregar({
      tipo: 'carrito', sprite, vida: E.vida, sx: lado < 0 ? -180 : width + 180, lado, ruta, dispara: this.time.now + 1500,
      update: (dt) => {
        const cam = this.cameras.main;
        if (e.retira) {
          e.sx -= 160 * dt;
          if (e.sx < -220) { this.quitar(e); sprite.destroy(); return; }
        } else {
          e.sx += (destino + Math.sin(this.time.now / 700) * 30 - e.sx) * Math.min(1, dt * 1.4);
        }
        const x = cam.scrollX + e.sx;
        const r = this.rielEn(x, e.ruta);
        sprite.setPosition(Math.round(x), Math.round(r.y + 2)).setRotation(r.angulo);
        if (this.time.now > e.dispara && this.estado === 'control' && !e.retira) {
          e.dispara = this.time.now + Phaser.Math.Between(...E.pausa);
          for (let i = 0; i < E.rafaga; i++) {
            this.time.delayedCall(i * 140, () => e.vivo && this.balaEnemiga(sprite.x + (lado < 0 ? 60 : -60), sprite.y - 62, E.bala));
          }
        }
        // Chocar de costado con el carrito del jugador (misma ruta).
        if (e.ruta === this.ruta && Math.abs(x - this.carro.x) < 120 && this.carro.enRiel) this.golpear(x);
      },
      morir: () => this.destruirCarrito(e, CARRITO.enemigo.puntos)
    });
    this.aviso(this.cameras.main.scrollX + destino, this.carro.y - 200, lado < 0 ? '¡ATRÁS!' : '¡ADELANTE!', 'rojo');
  }

  destruirCarrito(e, puntos) {
    this.quitar(e);
    const s = e.sprite;
    sumarPuntos(this, puntos);
    // Los del fondo están en px de pantalla: la explosión va en el mundo.
    const cam = this.cameras.main;
    const [ex, ey] = e.fondo ? [cam.scrollX + s.x, cam.scrollY + s.y] : [s.x, s.y];
    explotar(this, ex, ey - 20, 'grande', ESCALA * (e.fondo ? 0.7 : 1.1));
    sonarImpacto(this, 'cohete');
    this.cameras.main.shake(220, 0.01);
    if (!e.fondo) {
      // Queda el carro roto en la vía (el mundo lo deja atrás).
      const roto = this.add.sprite(s.x, s.y, 'mcHoja_destruccion', 0).setOrigin(0.5, 1).setDepth(9.7).setRotation(s.rotation);
      roto.play('mc_destruccion');
      this.efecto('astillas', s.x, s.y - 30, { escala: 1.2 });
      this.time.delayedCall(4000, () => roto.destroy());
    }
    TextFX.popup(this, s.x, s.y - 90, `+${puntos}`, { color: 'oro', subir: 40 }).setScrollFactor(e.fondo ? 0 : 1).setDepth(20);
    s.destroy();
  }

  // Carrito en la vía paralela del fondo: chico, más oscuro, dispara en diagonal.
  nuevoCarritoFondo() {
    const F = CARRITO.fondo;
    const { width } = this.scale;
    const desdeIzq = Math.random() < 0.4;
    const sprite = this.add.sprite(desdeIzq ? -100 : width + 100, F.y + 2, 'mcHoja_enemigo', 0).setOrigin(0.5, 1).setScale(F.escala)
      .setScrollFactor(0).setDepth(2.1).setTint(0xa09080).setFlipX(true);
    sprite.play('mc_enemigo');
    const e = this.agregar({
      tipo: 'fondo', fondo: true, sprite, vida: F.vida, tinte: 0xa09080, sx: sprite.x, vx: desdeIzq ? 70 : -50,
      dispara: this.time.now + 1200,
      update: (dt) => {
        e.sx += e.vx * dt;
        if (e.sx > width - 140 && e.vx > 0) e.vx = -40;
        if (e.sx < 260 && e.vx < 0 && !desdeIzq) e.vx = -110; // se va
        sprite.x = Math.round(e.sx);
        if (e.sx < -150 || e.sx > width + 200) { this.quitar(e); sprite.destroy(); return; }
        if (this.time.now > e.dispara && this.estado === 'control') {
          e.dispara = this.time.now + Phaser.Math.Between(...F.pausa);
          const cam = this.cameras.main;
          this.balaEnemiga(cam.scrollX + sprite.x - 30, cam.scrollY + sprite.y - 36, 260);
        }
      },
      morir: () => this.destruirCarrito(e, 300)
    });
  }

  // Soldado arriba de un andamio (detrás de la vía): apunta al jugador.
  nuevoSoldado(s) {
    const S = CARRITO.soldado;
    const x = s.x0 + (s.x1 - s.x0) * 0.75;
    const base = s.y0 + 150;
    const andamio = this.add.image(x, base, 'mc_andamio').setOrigin(0.5, 1).setDepth(4.2).setTint(0xb0a090);
    const arriba = base - this.textures.get('mc_andamio').getSourceImage().height + 4;
    const camisa = Phaser.Utils.Array.GetRandom(ENEMIGO1.camisas);
    const sprite = this.add.sprite(x, arriba, 'enemigo1', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(4.3).setFlipX(true);
    sprite.play(`soldado_quieto_${camisa}`);
    const e = this.agregar({
      tipo: 'soldado', sprite, vida: 1, dispara: this.time.now + Phaser.Math.Between(700, 1400),
      caja: () => new Phaser.Geom.Rectangle(sprite.x - 20, sprite.y - 104, 40, 104),
      update: () => {
        const cam = this.cameras.main;
        if (sprite.x < cam.scrollX - 200) { this.quitar(e); sprite.destroy(); andamio.destroy(); return; }
        sprite.setFlipX(this.carro.x < sprite.x);
        if (this.time.now > e.dispara && this.estado === 'control' && sprite.x > cam.scrollX + 40) {
          e.dispara = this.time.now + Phaser.Math.Between(...S.pausa);
          sprite.play(`soldado_ataque_${camisa}`);
          sprite.once('animationcomplete', () => e.vivo && sprite.play(`soldado_quieto_${camisa}`));
          this.time.delayedCall(90, () => e.vivo && this.balaEnemiga(sprite.x + (sprite.flipX ? -36 : 36), sprite.y - 72, 260, true));
        }
      },
      morir: () => {
        this.quitar(e);
        sumarPuntos(this, S.puntos);
        sonarSfx(this, 'muerteNpc');
        estallidoSangre(this, sprite.x, sprite.y - 60);
        sprite.play(`soldado_muerte_${camisa}`);
        this.aviso(sprite.x, sprite.y - 120, Phaser.Utils.Array.GetRandom(['¡AAARGH!', '¡AY!']), 'rojo');
        this.tweens.add({ targets: sprite, y: sprite.y + 220, angle: 70, delay: 250, duration: 700, ease: 'Quad.in', onComplete: () => sprite.destroy() });
        this.time.delayedCall(6000, () => andamio.destroy());
      }
    });
  }

  // Barril que rueda por la vía hacia el jugador: se salta o se revienta.
  nuevoBarril(s) {
    const B = CARRITO.barril;
    const cam = this.cameras.main;
    const ruta = this.ruta;
    const sprite = this.add.image(cam.scrollX + this.scale.width + 60, 0, 'cueva_turril').setScale(ESCALA * 1.4).setDepth(9.8);
    const radio = sprite.displayHeight / 2;
    const e = this.agregar({
      tipo: 'barril', sprite, vida: B.vida, x: sprite.x,
      update: (dt) => {
        e.x -= B.velocidad * dt;
        const r = this.rielEn(e.x, ruta);
        sprite.setPosition(Math.round(e.x), Math.round(r.y - radio));
        sprite.angle -= B.velocidad * dt * 2.4;
        if (e.x < this.cameras.main.scrollX - 80) { this.quitar(e); sprite.destroy(); return; }
        const c = this.carro;
        if (ruta === this.ruta && Math.abs(e.x - c.x) < 70 && c.y > r.y - radio * 2 - 6) {
          this.golpear(e.x);
          e.morir();
        }
      },
      morir: () => {
        this.quitar(e);
        explotar(this, sprite.x, sprite.y + radio, 'mediana', ESCALA * 0.9);
        sonarImpacto(this, 'granada');
        this.cameras.main.shake(150, 0.007);
        sumarPuntos(this, 50);
        sprite.destroy();
      }
    });
  }

  // Murciélagos: bajan del techo en ondas y se tiran contra el jugador.
  nuevosMurcielagos(n) {
    const cam = this.cameras.main;
    for (let i = 0; i < n; i++) {
      const sprite = this.add.sprite(0, 0, 'mc_murcielago', 0).setScale(3).setDepth(10.8);
      sprite.play({ key: 'mc_murcielago', startFrame: i % 2 });
      const e = this.agregar({
        tipo: 'murcielago', sprite, vida: 1, sx: this.scale.width + 40 + i * 70, alto: Phaser.Math.Between(-260, -150),
        fase: Math.random() * 6, picada: false,
        update: (dt) => {
          const c = this.carro;
          e.sx -= this.velocidad * CARRITO.murcielago.velocidad * dt + 60 * dt;
          const x = this.cameras.main.scrollX + e.sx;
          let y = c.y + e.alto + Math.sin(this.time.now / 180 + e.fase) * 26;
          if (!e.picada && Math.abs(x - c.x) < 260) e.picada = true;
          if (e.picada) e.alto = Math.min(-60, e.alto + 160 * dt);
          sprite.setPosition(Math.round(x), Math.round(y)).setFlipX(x < c.x);
          if (e.sx < -60) { this.quitar(e); sprite.destroy(); return; }
          if (this.tocaAlJugador(x, y, 18)) { this.golpear(x); e.morir(); }
        },
        morir: () => {
          this.quitar(e);
          sumarPuntos(this, CARRITO.murcielago.puntos);
          sprite.anims.stop();
          this.tweens.add({ targets: sprite, y: sprite.y + 300, angle: 540, alpha: 0, duration: 800, ease: 'Quad.in', onComplete: () => sprite.destroy() });
        }
      });
    }
    this.aviso(cam.scrollX + this.scale.width - 120, this.carro.y - 260, '¡CHIIII!', 'plata');
  }

  // Lingotes de plata flotando sobre la vía (puntos).
  nuevaPlata(s) {
    for (let k = 0; k < 3; k++) {
      const x = s.x0 + (s.x1 - s.x0) * (0.25 + k * 0.25);
      const y = this.rielEn(x, s.rutas[0]).y - 150;
      const l = this.add.image(x, y, 'potosi_lingote').setScale(2).setDepth(10.7);
      this.tweens.add({ targets: l, y: y - 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.platas.push(l);
    }
  }

  balaEnemiga(x, y, velocidad, mundo = false) {
    const b = this.tomar(this.pozoBalasEnemigas);
    if (!b) return;
    const c = this.carro;
    // Apunta al pecho del héroe; la bala se mueve con el mundo (la cámara la deja atrás si no).
    const blanco = { x: c.x + this.velocidad * 0.35, y: c.y - 90 };
    const ang = Math.atan2(blanco.y - y, blanco.x - x);
    b.setPosition(x, y).setRotation(ang).setData({
      vx: Math.cos(ang) * velocidad + (mundo ? 0 : this.velocidad), vy: Math.sin(ang) * velocidad, hasta: this.time.now + 4000
    });
    sonarTramo(this, { ...SFX_SOLDADO, volumen: 0.18 }, 'soldado');
    fogonazo(this, x, y, 1.2, 10.6, Phaser.Math.RadToDeg(ang));
  }

  // ¿(x, y) toca al jugador (carro y héroe)? margen: radio de lo que toca.
  tocaAlJugador(x, y, margen = 0) {
    const c = this.carro;
    const alto = c.agachado ? CARRITO.alto.agachado : CARRITO.alto.parado;
    return x > c.x - 62 - margen && x < c.x + 62 + margen && y > c.y - alto - margen && y < c.y + margen;
  }

  // ---------------------------------------------------------------------------
  // Cada cuadro: balas, dinamita, enemigos, vigas, palancas, plata
  // ---------------------------------------------------------------------------

  moverBalas(dt) {
    const cam = this.cameras.main;
    const ahora = this.time.now;
    const { width } = this.scale;
    this.pozoBalas.forEach((b) => {
      if (!b.active) return;
      b.x += b.getData('vx') * dt;
      b.y += b.getData('vy') * dt;
      if (ahora > b.getData('hasta') || b.x > cam.scrollX + width + 40 || b.x < cam.scrollX - 40) { this.soltar(b); return; }
      // Palancas de los cambios de vía.
      for (const p of this.palancas) {
        if (p.activa && Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < p.r + 8) { this.tirarPalanca(p); this.soltar(b); return; }
      }
      for (const e of this.enemigos) {
        const r = e.caja();
        const bx = e.fondo ? b.x - cam.scrollX : b.x;
        const by = e.fondo ? b.y - cam.scrollY : b.y;
        if (r.contains(bx, by)) {
          chispas(this, b.x, b.y, 4, 180, 90, 10.5);
          this.soltar(b);
          this.danar(e, 1, b.x);
          return;
        }
      }
    });
    this.pozoBalasEnemigas.forEach((b) => {
      if (!b.active) return;
      b.x += b.getData('vx') * dt;
      b.y += b.getData('vy') * dt;
      if (ahora > b.getData('hasta') || b.x < cam.scrollX - 60 || b.x > cam.scrollX + width + 300) { this.soltar(b); return; }
      if (this.tocaAlJugador(b.x, b.y)) { this.soltar(b); this.golpear(b.x - b.getData('vx') * 0.05); }
    });
    const D = CARRITO.dinamita;
    this.pozoDinamita.forEach((d) => {
      if (!d.active) return;
      d.setData('vy', d.getData('vy') + D.gravedad * dt);
      d.x += d.getData('vx') * dt;
      d.y += d.getData('vy') * dt;
      d.angle += 600 * dt;
      if (Math.random() < 0.5) this.chispero.explode(1, d.x - 6, d.y - 6);
      const r = this.rielEn(d.x, d.getData('ruta'));
      const toca = this.enemigos.some((e) => !e.fondo && e.caja().contains(d.x, d.y));
      if (toca || ahora > d.getData('hasta') || (r.seg.solido && d.y >= r.y - 6) || d.y > r.y + 400) this.explotarDinamita(d);
    });
  }

  tirarPalanca(p) {
    p.activa = false;
    this.rutaPedida = 'b';
    chispas(this, p.x, p.y, 12, -90, 160, 11);
    fogonazo(this, p.x, p.y, 2.5, 11);
    sonidoUI(this, 'confirma');
    this.aviso(p.x, p.y - 60, '¡CLANK! VÍA B', 'oro');
    const marca = this.add.image(p.x, p.y, 'tun_luzCalida').setScale(0.4).setTint(0x60ff80).setBlendMode(Phaser.BlendModes.ADD).setDepth(11);
    this.tweens.add({ targets: marca, alpha: 0, scale: 0.8, duration: 700, onComplete: () => marca.destroy() });
  }

  revisarVigas() {
    const c = this.carro;
    const s = this.rielEn(c.x).seg;
    const v = s.viga;
    if (!v || v.tocada || s.rutas.indexOf(this.ruta) < 0) return;
    if (c.x + 40 < v.x0 || c.x - 40 > v.x1) return;
    const alto = c.agachado ? CARRITO.alto.agachado : CARRITO.alto.parado;
    if (c.y - alto < v.abajo) {
      v.tocada = true;
      this.efecto('astillas', c.x + 20, v.abajo + 10, { escala: 1 });
      this.cameras.main.shake(200, 0.01);
      this.aviso(c.x, v.abajo - 30, '¡PUM!', 'rojo');
      this.golpear(c.x + 100);
    }
  }

  revisarPlata() {
    this.platas = this.platas.filter((l) => {
      if (!l.active) return false;
      if (this.tocaAlJugador(l.x, l.y, 16)) {
        sumarPuntos(this, 500);
        TextFX.popup(this, l.x, l.y - 20, '¡PLATA! +500', { subir: 50 }).setDepth(20);
        sonidoUI(this, 'conteo');
        l.destroy();
        return false;
      }
      if (l.x < this.cameras.main.scrollX - 60) { l.destroy(); return false; }
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Golpes, vidas y reaparecer
  // ---------------------------------------------------------------------------

  golpear(desdeX) {
    if (this.muerto || this.time.now < this.invulnerableHasta || this.registry.get('inmune')) return;
    const vida = vidaJugador(this) - VIDA.golpe;
    this.registry.set('vida', vida);
    this.panelVida.setFrame(cuadroVida(vida));
    this.tweens.add({ targets: this.panelVida, scale: VIDA.escala * 1.15, duration: 80, yoyo: true });
    this.invulnerableHasta = this.time.now + CARRITO.golpe.invulnerable;
    this.cameras.main.shake(140, 0.008);
    sangrar(this, this.carro.x, this.carro.y - 90, desdeX < this.carro.x ? 1 : -1);
    if (vida <= 0) this.perderVida('golpe');
  }

  // Una vida menos. Con vidas: fundido y reaparece (después de un hueco, en
  // el último riel). Sin vidas: GAME OVER (Estado.js; CONTINUAR reinicia la escena).
  perderVida(motivo) {
    this.muerto = true;
    this.estado = 'muerto';
    const c = this.carro;
    if (motivo === 'golpe') {
      explotar(this, c.x, c.y - 40, 'grande', ESCALA);
      this.tweens.add({ targets: this.heroe, y: this.heroe.y - 80, angle: -90, alpha: 0, duration: 600 });
    }
    const vidas = vidasPartida(this) - 1;
    this.registry.set('vidas', Math.max(0, vidas));
    perderVidaHUD(this);
    if (vidas <= 0) {
      this.sinPausa = true;
      this.time.delayedCall(900, () => {
        this.silenciarRieles(true);
        this.scene.pause();
        this.scene.launch('GameOver', { escena: this.scene.key });
        this.scene.bringToTop('GameOver');
      });
      return;
    }
    this.time.delayedCall(1400, () => {
      const cam = this.cameras.main;
      cam.fadeOut(300, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => this.reaparecer(motivo === 'caida'));
    });
  }

  reaparecer(atras) {
    const cam = this.cameras.main;
    this.registry.set('vida', VIDA.mitades);
    this.panelVida.setFrame(cuadroVida(VIDA.mitades));
    this.offset = CARRITO.pantalla.x;
    if (atras) {
      // La cámara vuelve para que el último riel quede debajo del carrito.
      cam.scrollX = Math.max(0, this.ultimoRiel - 120 - this.offset);
      // Lo que quedó delante del jugador sigue ahí; los murciélagos y barriles, no.
      this.enemigos.slice().forEach((e) => { if (e.tipo === 'barril' || e.tipo === 'murcielago') { this.quitar(e); e.sprite.destroy(); } });
    }
    const c = this.carro;
    c.x = cam.scrollX + this.offset;
    const r = this.rielEn(c.x);
    c.y = r.y - 260;
    c.vy = 0;
    c.enRiel = false;
    this.tweens.killTweensOf(this.heroe);
    this.heroe.setAngle(0).setAlpha(1);
    this.muerto = false;
    this.estado = 'control';
    this.invulnerableHasta = this.time.now + 2200;
    this.registry.set('reaparecer', true);
    cam.scrollY = r.y - CARRITO.rielPantalla;
    cam.fadeIn(300, 0, 0, 0);
    const t = TextFX.texto(this, this.offset, 200, '¡LISTO!', { color: 'oro', escala: 2 }).setScrollFactor(0).setDepth(40);
    this.tweens.add({ targets: t, alpha: 0.3, duration: 150, yoyo: true, repeat: 6, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------------------
  // El final: frena contra el tope, salta afuera y a la caverna del jefe
  // ---------------------------------------------------------------------------

  revisarFinal() {
    if (!this.tope || !['control', 'frenando'].includes(this.estado)) return;
    const c = this.carro;
    if (this.estado === 'control' && c.x > this.tope.x0 - 700 && this.ruta === 'a') {
      this.estado = 'frenando';
      this.cartel('¡FRENA!');
      // Los carritos de adelante se estrellan contra el tope; los de atrás se quedan.
      this.enemigos.slice().forEach((e) => {
        if (e.tipo !== 'carrito') return;
        if (e.lado > 0) this.time.delayedCall(400, () => e.vivo && e.morir());
        else e.retira = true;
      });
    }
    if (this.estado === 'frenando' && c.x >= this.xTope - 2 && c.enRiel) this.chocarTope();
  }

  chocarTope() {
    this.estado = 'final';
    const c = this.carro;
    this.velocidad = 0;
    this.cameras.main.shake(400, 0.016);
    this.chispasRuedas(20);
    this.efecto('polvo', c.x + 50, c.y + 4, { escala: 1.3 });
    sonidoUI(this, 'golpe');
    this.clack(0.2);
    this.tweens.add({ targets: this.spriteCarro, angle: -8, duration: 90, yoyo: true });
    // Salta afuera, por encima del tope, hacia la caverna.
    this.time.delayedCall(350, () => {
      // Sale del carro de cuerpo entero (el personaje elegido: su hoja de
      // salto y, al caer, camina hacia la caverna). La hoja del carrito es
      // solo el torso: se oculta.
      const h = this.heroe;
      const p = personajeCuerpo(this); // CuerpoModular.js
      const cp = CUERPOS[p].prefijo;
      const datos = animacionesCuerpo(this, p);
      h.setVisible(false);
      const cuerpo = this.add.container(h.x, this.carro.y - 20).setDepth(10.2);
      const piernas = this.add.sprite(0, 0, cp + 'piernas_salto', '1');
      const torso = this.add.sprite(0, 0, cp + 'torso_aiming', '0');
      const anclar = (spr, hoja) => {
        const d = datos[hoja];
        const cuadro = Number(spr.frame.name);
        spr.setOrigin(d.ancla[0] / d.ancho, d.ancla[1] / d.alto);
        return d.cuadros[cuadro] && d.cuadros[cuadro].pies !== undefined ? d.cuadros[cuadro].pies - d.ancla[1] : 58;
      };
      // La cintura del container a la altura de los pies (y = 0: los pies).
      const pies = anclar(piernas, 'piernas_salto');
      anclar(torso, 'torso_aiming');
      piernas.y = -pies;
      torso.y = -pies;
      cuerpo.add([piernas, torso]);
      cuerpo.y = this.carro.y - 40;
      const suelo = this.rielEn(h.x + 260).y;
      this.tweens.add({ targets: cuerpo, x: h.x + 260, duration: 900, ease: 'Linear' });
      this.tweens.add({
        targets: cuerpo, y: cuerpo.y - 150, duration: 400, ease: 'Quad.out',
        onComplete: () => {
          piernas.setFrame('3');
          this.tweens.add({
            targets: cuerpo, y: suelo, duration: 420, ease: 'Quad.in',
            onComplete: () => {
              piernas.play(cp + 'correr');
              this.tweens.add({ targets: cuerpo, x: cuerpo.x + 160, alpha: 0, duration: 900 });
            }
          });
        }
      });
      this.time.delayedCall(700, () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.registry.remove('tioCheckpoint'); // la caverna empieza por el ritual
          if (this.scene.manager.keys[CARRITO.siguiente]) this.scene.start(CARRITO.siguiente);
          else misionCompleta(this); // (todavía no hay caverna del jefe)
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Cámara y velocidad
  // ---------------------------------------------------------------------------

  moverCamara(dt) {
    const V = CARRITO.velocidad;
    const cam = this.cameras.main;
    const seg = this.rielEn(this.carro.x).seg;
    if (this.estado === 'arranque') this.velocidad = Math.min(V.min, this.velocidad + V.min / (V.arranque / 1000) * dt);
    else if (this.estado === 'frenando') {
      // Frena justo para llegar al tope a ~90 px/s.
      const falta = Math.max(0, this.xTope - this.carro.x);
      this.velocidad = Math.min(this.velocidad, Math.max(90, Math.sqrt(2 * 180 * falta)));
    }
    else if (this.estado === 'final' || this.estado === 'muerto') this.velocidad = Math.max(0, this.velocidad - 400 * dt);
    else {
      const objetivo = CARRITO.rectas.includes(seg.nombre) ? V.max : V.min;
      const paso = V.aceleracion * dt * (objetivo > this.velocidad ? 1 : 2.5);
      this.velocidad += Phaser.Math.Clamp(objetivo - this.velocidad, -paso, paso);
    }
    const maximo = this.finVia + 320 - this.scale.width;
    if (this.estado !== 'muerto') cam.scrollX = Math.min(maximo, cam.scrollX + this.velocidad * dt);
    // Alto: sigue al riel (no al salto) con lerp, y vibra un poco con la velocidad.
    const riel = this.rielEn(this.carro.x).y;
    const objetivoY = riel - CARRITO.rielPantalla;
    this.camY += (objetivoY - this.camY) * Math.min(1, dt * 3);
    const vibra = (this.velocidad / V.max) * 1.1;
    cam.scrollY = Math.round(this.camY + Math.sin(this.time.now / 23) * vibra + (Math.random() - 0.5) * vibra);
  }

  // Lo que está lejos de la pantalla no se dibuja.
  recortar() {
    const cam = this.cameras.main;
    const a = cam.scrollX - 500;
    const b = cam.scrollX + this.scale.width + 100;
    this.tramosVia.forEach((s) => {
      const ver = s.x1 > a && s.x0 < b;
      if (s.visible !== ver) { s.visible = ver; s.objetos.forEach((o) => o.setVisible(ver)); }
    });
  }

  // ---------------------------------------------------------------------------
  // Sonido de los rieles: ruido filtrado en bucle (sube con la velocidad) y un
  // "clac" en cada junta (WebAudio, sin archivos)
  // ---------------------------------------------------------------------------

  crearSonidoRieles() {
    const ctx = this.sound.context;
    this.rieles = null;
    if (!ctx || !ctx.createBufferSource || this.sound.locked) return;
    const largo = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < largo; i++) { ultimo = ultimo * 0.97 + (Math.random() * 2 - 1) * 0.03; datos[i] = ultimo * 6; }
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 1.4;
    const volumen = ctx.createGain();
    volumen.gain.value = 0;
    const destino = this.sound.destination || this.sound.masterVolumeNode || ctx.destination;
    fuente.connect(filtro).connect(volumen).connect(destino);
    fuente.start();
    this.rieles = { ctx, fuente, filtro, volumen, destino, silencio: false, junta: 0 };
  }

  moverSonidoRieles() {
    const R = this.rieles;
    if (!R) return;
    const f = Phaser.Math.Clamp(this.velocidad / CARRITO.velocidad.max, 0, 1.2);
    const t = R.ctx.currentTime;
    const enAire = !this.carro.enRiel;
    const frena = this.estado === 'frenando';
    R.filtro.frequency.setTargetAtTime(frena ? 2400 : 260 + f * 700, t, 0.1);
    R.fuente.playbackRate.setTargetAtTime(0.7 + f * 0.6, t, 0.1);
    R.volumen.gain.setTargetAtTime(R.silencio ? 0 : (enAire ? 0.03 : 0.05 + f * 0.12) * (frena ? 1.6 : 1), t, 0.08);
    // Juntas de los rieles cada 216 px: clac-clac (las dos ruedas).
    const junta = Math.floor(this.carro.x / 216);
    if (junta !== R.junta && this.carro.enRiel && this.velocidad > 20) {
      R.junta = junta;
      this.clack(0.06 + f * 0.04);
      this.time.delayedCall(Math.max(40, 9000 / Math.max(this.velocidad, 1)), () => this.clack(0.05 + f * 0.03));
    }
  }

  clack(volumen) {
    const R = this.rieles;
    if (!R || R.silencio) return;
    const t = R.ctx.currentTime;
    const o = R.ctx.createOscillator();
    const g = R.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
    g.gain.setValueAtTime(volumen, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(R.destino);
    if (this.eco) g.connect(this.eco.entrada);
    o.start(t);
    o.stop(t + 0.08);
  }

  silenciarRieles(silencio) {
    if (!this.rieles) return;
    this.rieles.silencio = silencio;
    this.rieles.volumen.gain.setValueAtTime(silencio ? 0 : this.rieles.volumen.gain.value, this.rieles.ctx.currentTime);
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  crearHUD() {
    this.panelVida = panelVida(this);
    hudVidas(this);
    this.hud = TextFX.hud(this, 16, 8, '', { color: 'oro', origen: 0 }).setDepth(30);
    this.platas = [];
    this.actualizarHUD();
  }

  actualizarHUD() {
    this.hud.setText(`TNT x${this.registry.get('dinamita') || 0}`);
  }

  // Multijugador (Red.js): el compañero ve el carro con el héroe adentro.
  partesRed() {
    return [this.spriteCarro, this.heroe];
  }

  aviso(x, y, texto, color = 'plata') {
    TextFX.popup(this, x, y, texto, { color }).setDepth(20);
  }

  // ---------------------------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000; // (si el navegador se trabó, no salta lejos)
    this.moverCamara(dt);
    this.moverFondo();
    this.moverCarro(dt);
    const k = this.teclas;
    if (this.estado === 'control') {
      if ((k.J.isDown || k.X.isDown) && time >= this.proximoDisparo) this.disparar();
      if (Phaser.Input.Keyboard.JustDown(k.K) || Phaser.Input.Keyboard.JustDown(k.G)) this.lanzarDinamita();
    }
    this.moverBalas(dt);
    this.enemigos.slice().forEach((e) => e.vivo && e.update(dt));
    if (this.estado === 'control' || this.estado === 'frenando') { this.revisarVigas(); this.revisarPlata(); }
    this.revisarEventos();
    this.revisarFinal();
    this.recortar();
    this.moverSonidoRieles();
    // Chispas en las ruedas: en las bajadas, a toda velocidad y frenando.
    const c = this.carro;
    if (c.enRiel && (c.angulo > 0.15 || this.velocidad > 240 || this.estado === 'frenando') && Math.random() < 0.35) {
      this.chispasRuedas(2);
      if (Math.random() < 0.15) this.efecto('chispas', c.x - 56, c.y + 2, { escala: 0.8, espejo: true, profundidad: 10.1 });
    }
  }

  // Al salir: todo lo que no es de Phaser (sonido de los rieles) y las listas.
  limpiar() {
    if (this.rieles) {
      try { this.rieles.fuente.stop(); } catch (e) { /* ya parada */ }
      [this.rieles.fuente, this.rieles.filtro, this.rieles.volumen].forEach((n) => n.disconnect());
      this.rieles = null;
    }
    this.events.off('pause', this.alPausar);
    this.events.off('resume', this.alSeguir);
    this.enemigos = [];
    this.tramosVia = [];
    this.vias = null;
    this.palancas = [];
    this.platas = [];
    this.pozoBalas = this.pozoBalasEnemigas = this.pozoDinamita = this.pozoEfectos = this.pozoVelocidad = [];
    this.carro = null;
  }
}

// Texturas dibujadas: el murciélago (2 cuadros) y la torre de andamio.
function texturasCarrito(escena) {
  if (escena.textures.exists('mc_murcielago')) return;
  const filas = [
    ['k...........k', 'kk.........kk', '.kkk.k.k.kkk.', '..kkkkkkkkk..', '....krkrk....', '......k......'],
    ['.............', '....k...k....', '...kkrkrkk...', '..kkkkkkkkk..', '.kkk.....kkk.', 'kk.........kk']
  ];
  const t = escena.textures.createCanvas('mc_murcielago', 26, 6);
  const ctx = t.getContext();
  const colores = { k: '#241a2a', r: '#ff4040' };
  filas.forEach((f, i) => f.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (!colores[c]) return;
    ctx.fillStyle = colores[c];
    ctx.fillRect(i * 13 + x, y, 1, 1);
  })));
  t.refresh();
  t.add(0, 0, 0, 0, 13, 6);
  t.add(1, 0, 13, 0, 13, 6);
  // La boca de la caverna: negro en el medio que se pierde hacia los bordes.
  const boca = escena.textures.createCanvas('mc_boca', 256, 256);
  const cb = boca.getContext();
  const gb = cb.createRadialGradient(128, 128, 10, 128, 128, 128);
  gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(0.55, 'rgba(4,2,2,0.95)'); gb.addColorStop(1, 'rgba(10,4,4,0)');
  cb.fillStyle = gb;
  cb.fillRect(0, 0, 256, 256);
  boca.refresh();
  // Andamio: dos postes, crucetas y la plataforma de tablas.
  const g = escena.make.graphics({ add: false });
  const W = 110;
  const H = CARRITO.soldado.alto;
  g.fillStyle(0x3a2414).fillRect(8, 10, 14, H - 10).fillRect(W - 22, 10, 14, H - 10);
  g.fillStyle(0x6a4428).fillRect(10, 10, 6, H - 10).fillRect(W - 20, 10, 6, H - 10);
  g.lineStyle(6, 0x4a2e18);
  for (let y = 30; y < H - 40; y += 70) g.lineBetween(18, y, W - 18, y + 60).lineBetween(W - 18, y, 18, y + 60);
  g.fillStyle(0x2a180c).fillRect(0, 0, W, 16);
  g.fillStyle(0x8a5a30);
  for (let x = 2; x < W - 4; x += 14) g.fillRect(x, 2, 12, 10);
  g.generateTexture('mc_andamio', W, H);
  g.destroy();
}
