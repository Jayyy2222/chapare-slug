// =============================================================================
// Menú principal de BOLIVIA SLUG: intro del logo al estilo arcade de los 90
// (pieza por pieza), "PRESIONA START" y un menú de opciones con una flecha
// que parpadea como cursor. Textos con TextFX.js; abajo el copyright y el
// contador de créditos (C o 5 mete una moneda). Detrás, el fondo animado de
// la selva (FondoMenu.js) y luces de atardecer (solo con WebGL).
//
// Intro: fade-in del fondo desde negro (1 s) -> baja el cóndor y abre las alas
// -> entra BOLIVIA desde la izquierda con rebote -> cae SLUG (shake, flash,
// polvo, golpe metálico) -> se despliega el aguayo -> brillo cada 3 s,
// PRESIONA START y música. Cualquier tecla (o clic) durante la intro salta al
// estado final.
//
// Capas (depth): ver CAPAS_MENU en FondoMenu.js (cielo < montañas < niebla <
// selva/río < pájaros < hojas < overlay oscuro < sol y rayos < cóndor < aguayo
// < BOLIVIA < SLUG < brillo < START).
// =============================================================================

// Piezas del logo (assets/menu/logo/, recortadas de titulo2.jpeg con
// herramientas/logo_piezas.py). Centro y ancho en píxeles del logo armado de
// referencia (titulo1.jpeg, 1407x768). El aguayo no está acá: va debajo de
// SLUG, con su mismo ancho (ver medidasLogo).
const LOGO_PIEZAS = {
  montana: { x: 710, y: 105, ancho: 330 },
  condor: { x: 705, y: 270, ancho: 1110 },
  bolivia: { x: 705, y: 295, ancho: 1120 },
  slug: { x: 710, y: 545, ancho: 1190 }
};
// Aguayo: alto en px de referencia. Polvo: escala de sus cuadros respecto de
// la referencia (polvo1-3.png son los 3 cuadros de la nube).
const LOGO_AGUAYO = { alto: 40 };
const LOGO_POLVO = { escala: 1.06, cuadro: 100, salida: 40, duracion: 600 };

// El logo entero ocupa como máximo este ancho y alto de la pantalla, y su
// borde de arriba queda en `arriba` px.
const LOGO = { maxAncho: 0.7, maxAlto: 0.55, arriba: 16 };

// Profundidades del logo y las luces (CAPAS_MENU está en FondoMenu.js).
const PROFUNDIDAD = {
  sol: CAPAS_MENU.sol, rayos: CAPAS_MENU.rayos, montana: CAPAS_MENU.montanaLogo,
  condor: CAPAS_MENU.condor, aguayo: CAPAS_MENU.aguayo, polvo: CAPAS_MENU.polvo,
  bolivia: CAPAS_MENU.bolivia, slug: CAPAS_MENU.slug, chispas: CAPAS_MENU.chispas,
  bandaStart: CAPAS_MENU.bandaStart, start: CAPAS_MENU.start, flash: CAPAS_MENU.flash,
  telon: CAPAS_MENU.negro
};

// PRESIONA START (y en px de pantalla: 250 del arte a x2).
const START = { y: 500, bandaAncho: 620, bandaAlto: 54 };

// Momentos de la intro (ms desde que arranca la escena). El fondo aparece
// desde negro durante los primeros `fondo` ms y después empieza el logo.
const INTRO = { fondo: 1000, condor: 1100, bolivia: 2100, slug: 2650, aguayo: 3150, fin: 3900, cadaBrillo: 3000 };

const OPCIONES_MENU = [
  { texto: 'INICIAR MISIÓN', accion: 'jugar' },
  { texto: 'CONTROLES', accion: 'controles' }
];

class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    this.cameras.main.setBackgroundColor(0x000000);
    cargarFondoMenu(this);
    cargarFuentesTextFX(this);
    ['condor', 'montana', 'bolivia', 'slug', 'aguayo', 'polvo1', 'polvo2', 'polvo3']
      .forEach((n) => this.load.image('logo_' + n, 'assets/menu/logo/' + n + '.png'));
    this.load.on('loaderror', (archivo) => console.info('Menú: no se encontró', archivo.src));
    cargarMusica(this, 'titulo');
  }

  create() {
    const { width, height } = this.scale;
    this.webgl = this.renderer.type === Phaser.WEBGL;
    this.opcion = 0;
    this.listo = false;
    this.panelAbierto = false;
    this.introTerminada = false;
    this.esperandoStart = false;
    this.polvos = [];
    texturasEfectos(this);
    this.events.once('shutdown', () => this.limpiar());

    // Fondo animado de la selva (FondoMenu.js), con la sombra detrás del logo
    // y, sin WebGL, la viñeta tramada.
    fondoMenu(this);

    // Telón negro: el fondo aparece desde negro antes de que arranque el logo.
    this.negro = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setDepth(PROFUNDIDAD.telon);

    this.crearLogo();
    this.crearLuces();
    this.crearPie();
    this.configurarControles();
    this.intro();
  }

  // Al salir de la escena: nada sigue corriendo (tweens, esperas, efectos de cámara).
  limpiar() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.keyboard.removeAllListeners();
    this.input.off('pointerdown');
    // La cámara puede haberse destruido ya (el CameraManager cierra antes).
    const camara = this.cameras && this.cameras.main;
    if (this.webgl && camara) camara.postFX.clear();
  }

  // ---------------------------------------------------------------------------
  // Logo
  // ---------------------------------------------------------------------------

  // Medidas de cada pieza en pantalla: escala para que el logo entre en
  // LOGO.maxAncho x LOGO.maxAlto, tamaños pares y centros enteros (así cada
  // pieza, dibujada a escala 1, cae justo sobre la grilla de píxeles).
  medidasLogo() {
    const { width, height } = this.scale;
    const imagen = (n) => this.textures.get('logo_' + n).getSourceImage();
    const ref = {};
    Object.entries(LOGO_PIEZAS).forEach(([n, p]) => {
      const img = imagen(n);
      ref[n] = { x: p.x, y: p.y, ancho: p.ancho, alto: p.ancho * img.height / img.width };
    });
    const s = ref.slug;
    ref.aguayo = { x: s.x, y: s.y + s.alto / 2 + LOGO_AGUAYO.alto / 2, ancho: s.ancho, alto: LOGO_AGUAYO.alto };

    const piezas = Object.values(ref);
    const izq = Math.min(...piezas.map((p) => p.x - p.ancho / 2));
    const der = Math.max(...piezas.map((p) => p.x + p.ancho / 2));
    const arriba = Math.min(...piezas.map((p) => p.y - p.alto / 2));
    const abajo = Math.max(...piezas.map((p) => p.y + p.alto / 2));
    const escala = Math.min(width * LOGO.maxAncho / (der - izq), height * LOGO.maxAlto / (abajo - arriba));
    const par = (n) => Math.max(2, Math.round(n / 2) * 2);
    const centroX = (izq + der) / 2;

    const medidas = {};
    Object.entries(ref).forEach(([n, p]) => {
      medidas[n] = {
        x: Math.round(width / 2 + (p.x - centroX) * escala),
        y: Math.round(LOGO.arriba + (p.y - arriba) * escala),
        ancho: par(p.ancho * escala),
        alto: par(p.alto * escala)
      };
    });
    medidas.escala = escala;
    return medidas;
  }

  // Copia de una textura achicada (con buen filtro) a un tamaño exacto, para
  // dibujarla a escala 1 sin bordes borrosos.
  texturaEscalada(clave, ancho, alto) {
    const nueva = `${clave}_${ancho}x${alto}`;
    if (this.textures.exists(nueva)) return nueva;
    const lienzo = this.textures.createCanvas(nueva, ancho, alto);
    const ctx = lienzo.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.textures.get(clave).getSourceImage(), 0, 0, ancho, alto);
    lienzo.refresh();
    return nueva;
  }

  // Crea las piezas en su lugar final (guardado en .final) y las esconde.
  crearLogo() {
    const medidas = this.medidasLogo();
    this.logo = {};
    ['montana', 'condor', 'aguayo', 'bolivia', 'slug'].forEach((n) => {
      const m = medidas[n];
      const img = this.add.image(m.x, m.y, this.texturaEscalada('logo_' + n, m.ancho, m.alto))
        .setDepth(PROFUNDIDAD[n]).setAlpha(0);
      img.final = { x: img.x, y: img.y, scaleX: 1, scaleY: 1 };
      this.logo[n] = img;
    });
    // Cuadros de la nube de polvo, al tamaño del logo.
    this.texPolvo = [1, 2, 3].map((i) => {
      const img = this.textures.get('logo_polvo' + i).getSourceImage();
      const k = LOGO_POLVO.escala * medidas.escala;
      return this.texturaEscalada('logo_polvo' + i, Math.round(img.width * k), Math.round(img.height * k));
    });

    // Glow dorado suave en las letras (el brillo diagonal se suma al terminar la intro).
    if (this.webgl) {
      [this.logo.bolivia, this.logo.slug].forEach((l) => {
        l.preFX.padding = 8;
        l.preFX.addGlow(0xffc94a, 1.2, 0, false, 0.1, 8);
      });
    }

    // El aguayo se despliega dentro de un rectángulo que crece hacia la
    // derecha; la máscara se quita al terminar.
    this.mascaraAguayo = this.make.graphics({ add: false });
    this.logo.aguayo.setMask(this.mascaraAguayo.createGeometryMask());
    this.desplegarAguayo(0);
  }

  desplegarAguayo(fraccion) {
    if (!this.mascaraAguayo) return;
    const b = this.logo.aguayo.getBounds();
    this.mascaraAguayo.clear().fillStyle(0xffffff).fillRect(b.x, b.y - 2, b.width * fraccion, b.height + 4);
  }

  sinMascaraAguayo() {
    if (!this.mascaraAguayo) return;
    this.logo.aguayo.clearMask(true);
    this.mascaraAguayo.destroy();
    this.mascaraAguayo = null;
  }

  // ---------------------------------------------------------------------------
  // Luces (WebGL; sin WebGL se omiten y queda la viñeta tramada del fondo)
  // ---------------------------------------------------------------------------

  crearLuces() {
    const { width } = this.scale;
    const { condor, slug } = this.logo;

    if (!this.webgl) return;
    texturasLuz(this);

    // Sol: glow grande detrás del cóndor que pulsa lento.
    const sol = { x: condor.x, y: condor.y - 10 };
    const glow = this.add.image(sol.x, sol.y, 'luz_sol').setScale(1.6)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(PROFUNDIDAD.sol);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 3200, ease: 'Sine.inOut', yoyo: true, repeat: -1 });

    // Rayos diagonales que bajan desde el sol, moviéndose y cambiando de alfa despacio.
    [-40, -16, 14, 38].forEach((angulo, i) => {
      const rayo = this.add.image(sol.x, sol.y, 'luz_rayo').setOrigin(0.5, 0).setAngle(angulo)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.2), 1.1)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.08).setDepth(PROFUNDIDAD.rayos);
      this.tweens.add({
        targets: rayo, alpha: 0.15, angle: angulo + (i % 2 ? 4 : -4),
        duration: Phaser.Math.Between(3500, 5500), delay: i * 600, ease: 'Sine.inOut', yoyo: true, repeat: -1
      });
    });

    // Cámara: color de atardecer (más saturación y calidez).
    const fx = this.cameras.main.postFX;
    const color = fx.addColorMatrix();
    color.saturate(0.3);
    color.brightness(1.08, true);
    color.multiply([
      1.06, 0, 0, 0, 0,
      0, 1.0, 0, 0, 0,
      0, 0, 0.9, 0, 0,
      0, 0, 0, 1, 0
    ], true);
    // Sin addBloom: en Phaser 3.80 el bloom de cámara mezcla toda la imagen
    // con su copia desenfocada (con color blanco la lava, con gris la apaga a
    // la mitad). El "bloom" lo dan el glow dorado del logo y el sol en ADD.
    // La viñeta (radio 0.8, fuerza 0.4) es una imagen en FondoMenu.js: el
    // addVignette de la cámara baja el alfa de los bordes y lavaba la pantalla
    // con el color de fondo del juego.
  }

  // ---------------------------------------------------------------------------
  // Intro
  // ---------------------------------------------------------------------------

  // Los tweens y esperas de la intro se guardan para poder cortarlos al saltar.
  paso(ms, fn) {
    this.introEventos.push(this.time.delayedCall(ms, fn));
  }

  tween(config) {
    const t = this.tweens.add(config);
    this.introTweens.push(t);
    return t;
  }

  intro() {
    const { montana, condor, bolivia, slug } = this.logo;
    this.introEventos = [];
    this.introTweens = [];

    // 1. El fondo aparece desde negro.
    this.tween({ targets: this.negro, alpha: 0, duration: INTRO.fondo, ease: 'Sine.out' });

    // 2. El cóndor baja desde arriba y abre las alas (0.8 -> 1); la montaña aparece detrás.
    this.paso(INTRO.condor, () => {
      const f = condor.final;
      condor.setPosition(f.x, f.y - 240).setScale(0.8);
      this.tween({ targets: condor, y: f.y, alpha: 1, duration: 900, ease: 'Sine.out' });
      this.tween({ targets: condor, scaleY: 1, duration: 900, ease: 'Sine.out' });
      // Las alas se abren un poco después de empezar a bajar.
      this.tween({ targets: condor, scaleX: 1, duration: 650, delay: 300, ease: 'Back.out' });
      this.tween({ targets: montana, alpha: 1, duration: 900, delay: 200 });
    });

    // 3. BOLIVIA entra rápido desde la izquierda y frena con un rebote.
    this.paso(INTRO.bolivia, () => {
      bolivia.setX(-bolivia.displayWidth / 2).setAlpha(1);
      this.tween({ targets: bolivia, x: bolivia.final.x, duration: 380, ease: 'Back.out', easeParams: [2.4] });
    });

    // 4. SLUG cae desde arriba y golpea.
    this.paso(INTRO.slug, () => {
      slug.setY(-slug.displayHeight).setAlpha(1);
      this.tween({ targets: slug, y: slug.final.y, duration: 320, ease: 'Quad.in', onComplete: () => this.impactoSlug() });
    });

    // 5. La franja de aguayo se despliega de izquierda a derecha bajo SLUG.
    this.paso(INTRO.aguayo, () => {
      this.logo.aguayo.setAlpha(1);
      const avance = { f: 0 };
      this.tween({
        targets: avance, f: 1, duration: 650, ease: 'Cubic.out',
        onUpdate: () => this.desplegarAguayo(avance.f),
        onComplete: () => this.sinMascaraAguayo()
      });
    });

    // 6 y 7. Brillo, PRESIONA START y música.
    this.paso(INTRO.fin, () => this.finalizarIntro());
  }

  impactoSlug() {
    const { width, height } = this.scale;
    const { slug } = this.logo;
    this.cameras.main.shake(200, 0.012);
    this.sonarImpacto();
    // Flash blanco de pantalla completa (80 ms).
    const flash = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0).setAlpha(0.6).setDepth(PROFUNDIDAD.flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 80, onComplete: () => flash.destroy() });
    // Aplastón del golpe.
    this.tween({ targets: slug, scaleY: 0.88, duration: 70, yoyo: true });
    const b = slug.getBounds();
    chispas(this, b.left + b.width * 0.12, b.bottom - 8, 18, -130, 80, PROFUNDIDAD.chispas);
    chispas(this, b.right - b.width * 0.12, b.bottom - 8, 18, -50, 80, PROFUNDIDAD.chispas);

    // Nubes de polvo a los costados de la base: sus 3 cuadros, se abren hacia
    // afuera y se desvanecen; quedan debajo de las letras y se destruyen.
    [[b.left + b.width * 0.08, -1], [b.right - b.width * 0.08, 1]].forEach(([x, lado]) => {
      const nube = this.add.image(x, b.bottom - 4, this.texPolvo[0]).setOrigin(0.5, 0.8)
        .setFlipX(lado < 0).setDepth(PROFUNDIDAD.polvo);
      this.polvos.push(nube);
      this.texPolvo.slice(1).forEach((t, i) => {
        this.paso(LOGO_POLVO.cuadro * (i + 1), () => { if (nube.active) nube.setTexture(t); });
      });
      this.tween({
        targets: nube, x: x + lado * LOGO_POLVO.salida, y: nube.y - 6, alpha: 0,
        duration: LOGO_POLVO.duracion, ease: 'Quad.out', onComplete: () => nube.destroy()
      });
    });
  }

  // Golpe metálico sintetizado: ruido corto + parciales inarmónicos (suena a
  // chapa) que se apagan.
  sonarImpacto() {
    const ctx = this.sound.context;
    if (!ctx || this.sound.locked) return;
    const t = ctx.currentTime;
    const salida = ctx.createGain();
    salida.gain.value = 0.22;
    salida.connect(ctx.destination);

    const largo = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    const ruido = ctx.createBufferSource();
    ruido.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 2400;
    filtro.Q.value = 0.7;
    ruido.connect(filtro).connect(salida);
    ruido.start(t);

    // [frecuencia, volumen, duración]
    [[173, 0.5, 1.1], [431, 0.35, 0.9], [788, 0.25, 0.7], [1263, 0.18, 0.5], [2117, 0.1, 0.3]].forEach(([fr, vol, dur]) => {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(fr * 1.04, t);
      osc.frequency.exponentialRampToValueAtTime(fr, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(salida);
      osc.start(t);
      osc.stop(t + dur);
    });
  }


  // Tecla durante la intro: corta todo y deja el logo armado, con las luces.
  saltarIntro() {
    if (this.introTerminada) return;
    this.introEventos.forEach((e) => e.remove(false));
    this.introTweens.forEach((t) => t.stop());
    this.negro.setAlpha(0);
    this.polvos.forEach((p) => p.destroy());
    this.polvos = [];
    Object.values(this.logo).forEach((img) => {
      const f = img.final;
      img.setPosition(f.x, f.y).setScale(f.scaleX, f.scaleY).setAlpha(1);
    });
    this.sinMascaraAguayo();
    this.finalizarIntro();
  }

  finalizarIntro() {
    if (this.introTerminada) return;
    this.introTerminada = true;
    const { width } = this.scale;
    this.negro.destroy();

    // 6. Brillo diagonal automático sobre las letras cada 3 s (Shine: una
    // pasada cada 2/velocidad segundos).
    if (this.webgl) {
      [this.logo.bolivia, this.logo.slug].forEach((l) => l.preFX.addShine(2000 / INTRO.cadaBrillo, 0.25, 3));
    }

    // 7. PRESIONA START sobre una banda oscura, parpadeando suave, y música.
    this.bandaStart = this.add.image(width / 2, START.y, texturaBandaStart(this))
      .setDepth(PROFUNDIDAD.bandaStart);
    this.textoStart = TextFX.texto(this, width / 2, START.y, 'PRESIONA START', { color: 'oro', escala: 3 })
      .setDepth(PROFUNDIDAD.start);
    this.parpadeo = this.tweens.add({
      targets: this.textoStart, alpha: 0.2, duration: 550, ease: 'Sine.inOut', yoyo: true, repeat: -1
    });
    tocarMusica(this, 'titulo');
    // La misma tecla que saltó la intro no cuenta como START.
    this.time.delayedCall(200, () => { this.esperandoStart = true; });
  }

  // Pie de pantalla arcade: copyright y contador de créditos (la tecla C o 5
  // "mete una moneda").
  crearPie() {
    const { width, height } = this.scale;
    TextFX.texto(this, width / 2, height - 14, '© 2026 ESCUADRÓN CÓNDOR', { color: 'plata', escala: 1 })
      .setDepth(PROFUNDIDAD.start);
    this.textoCreditos = TextFX.texto(this, width - 16, height - 12, '', { color: 'plata', escala: 2, origen: 1 })
      .setDepth(PROFUNDIDAD.start);
    this.mostrarCreditos();
    const moneda = () => {
      this.registry.set('creditos', Math.min(99, (this.registry.get('creditos') || 0) + 1));
      this.mostrarCreditos();
      this.textoCreditos.destellar(1, 80);
    };
    this.input.keyboard.on('keydown-C', moneda);
    this.input.keyboard.on('keydown-FIVE', moneda);
  }

  mostrarCreditos() {
    const n = this.registry.get('creditos') || 0;
    this.textoCreditos.setText('CRÉDITOS ' + String(n).padStart(2, '0'));
  }

  presionarStart() {
    if (!this.esperandoStart) return;
    this.esperandoStart = false;
    this.parpadeo.stop();
    this.textoStart.setAlpha(1);
    this.cameras.main.flash(120, 255, 240, 200);
    this.tweens.add({ targets: this.bandaStart, alpha: 0, duration: 220, onComplete: () => this.bandaStart.destroy() });
    this.tweens.add({
      targets: this.textoStart, alpha: 0, scale: 1.4, duration: 220,
      onComplete: () => {
        this.textoStart.destroy();
        this.crearOpciones();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Menú de opciones
  // ---------------------------------------------------------------------------

  // Opciones en placas de metal: plateadas, la elegida en dorado con una
  // flecha que parpadea a la izquierda.
  crearOpciones() {
    const { width, height } = this.scale;
    const y0 = height * 0.74;
    this.textos = OPCIONES_MENU.map((op, i) => {
      const y = y0 + i * 46;
      const placa = this.add.rectangle(width / 2, y, 360, 38, 0x14120c, 0.75).setStrokeStyle(2, 0x5a5e50).setDepth(45).setAlpha(0);
      const texto = TextFX.menu(this, width / 2, y, op.texto).setDepth(46).setAlpha(0);
      // Entran deslizándose desde los costados.
      const desde = i % 2 ? width + 200 : -200;
      [placa, texto].forEach((o) => {
        const x = o.x;
        o.x = desde;
        this.tweens.add({ targets: o, x, alpha: 1, duration: 320, delay: i * 120, ease: 'Back.out' });
      });
      return { placa, texto };
    });
    this.cursor = TextFX.flecha(this, 0, y0).setDepth(47).setAlpha(0);
    this.tweens.add({ targets: this.cursor, alpha: 1, delay: 400, duration: 200 });
    this.time.delayedCall(450, () => {
      this.listo = true;
      this.marcar(0);
    });

    TextFX.texto(this, width / 2, height - 52, 'ARRIBA/ABAJO ELEGIR   ENTER CONFIRMAR', { color: 'plata', escala: 1 })
      .setDepth(46).setAlpha(0.8);
  }

  marcar(i) {
    this.opcion = i;
    this.textos.forEach(({ placa, texto }, k) => {
      const activa = k === i;
      texto.seleccionar(activa);
      placa.setStrokeStyle(2, activa ? 0xffd23f : 0x5a5e50);
    });
    const { placa, texto } = this.textos[i];
    const x = Math.round(placa.x - texto.anchoTexto / 2 - 28);
    this.tweens.add({ targets: this.cursor, x, y: placa.y, duration: 90, ease: 'Quad.out' });
  }

  configurarControles() {
    const al = (evento, fn) => this.input.keyboard.on(evento, (e) => { if (!e.repeat) fn(); });
    const mover = (d) => {
      if (!this.listo || this.panelAbierto) return;
      this.marcar((this.opcion + d + OPCIONES_MENU.length) % OPCIONES_MENU.length);
    };
    al('keydown-UP', () => mover(-1));
    al('keydown-W', () => mover(-1));
    al('keydown-DOWN', () => mover(1));
    al('keydown-S', () => mover(1));
    al('keydown-ENTER', () => this.elegir());
    al('keydown-SPACE', () => this.elegir());
    al('keydown-ESC', () => this.cerrarPanel());
    // Cualquier tecla o clic durante la intro la salta.
    this.input.keyboard.on('keydown', () => this.saltarIntro());
    this.input.on('pointerdown', () => this.saltarIntro());
  }

  elegir() {
    if (!this.introTerminada) return;
    if (this.esperandoStart) {
      this.presionarStart();
      return;
    }
    if (this.panelAbierto) {
      this.cerrarPanel();
      return;
    }
    if (!this.listo) return;
    const { placa, texto } = this.textos[this.opcion];
    // La opción destella en blanco 3 veces, con chispas sobre la placa.
    texto.destellar(3, 70);
    for (let k = 0; k < 3; k++) {
      this.time.delayedCall(k * 140, () => {
        chispas(this, placa.x + Phaser.Math.Between(-150, 150), placa.y, 10, -90, 160, 48);
      });
    }
    this.cameras.main.shake(120, 0.006);
    if (OPCIONES_MENU[this.opcion].accion === 'controles') {
      this.abrirPanel();
      return;
    }
    this.listo = false;
    this.cameras.main.flash(150, 255, 240, 200);
    // Después del destello (3 x 140 ms).
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
    });
  }

  // Panel con los controles del juego.
  abrirPanel() {
    const { width, height } = this.scale;
    this.panelAbierto = true;
    const lineas = [
      ['FLECHAS  /  A D', 'CAMINAR'],
      ['SHIFT + CAMINAR', 'CORRER'],
      ['ARRIBA / W / ESPACIO', 'SALTAR'],
      ['J  /  X', 'DISPARAR'],
      ['ARRIBA EN ESCALERA', 'TREPAR'],
      ['ABAJO + SALTO', 'BAJAR DE UNA PLATAFORMA'],
      ['ARRIBA EN UNA PUERTA', 'ENTRAR / SALIR']
    ];
    const elementos = [
      this.add.rectangle(width / 2, height / 2, 780, 400, 0x0e0c08, 0.92).setStrokeStyle(4, 0xffd23f),
      TextFX.title(this, width / 2, height / 2 - 156, 'CONTROLES', { escala: 3 }),
      ...lineas.flatMap(([tecla, accion], i) => {
        const y = height / 2 - 96 + i * 36;
        return [
          TextFX.texto(this, width / 2 - 350, y, tecla, { color: 'oro', origen: 0, origenY: 0.5 }),
          TextFX.menu(this, width / 2 + 350, y, accion, { origen: 1, origenY: 0.5 })
        ];
      }),
      TextFX.menu(this, width / 2, height / 2 + 168, 'ENTER PARA VOLVER', { escala: 1 })
    ];
    elementos.forEach((e) => e.setDepth(60).setAlpha(0));
    this.tweens.add({ targets: elementos, alpha: 1, duration: 160 });
    this.panel = elementos;
  }

  cerrarPanel() {
    if (!this.panelAbierto) return;
    this.panelAbierto = false;
    const panel = this.panel;
    this.tweens.add({ targets: panel, alpha: 0, duration: 140, onComplete: () => panel.forEach((e) => e.destroy()) });
  }
}

// Texturas de luz (una sola vez por juego).
function texturasLuz(escena) {
  const t = escena.textures;
  if (!t.exists('luz_sol')) {
    // Glow circular naranja/amarillo.
    const r = 200;
    const lienzo = t.createCanvas('luz_sol', r * 2, r * 2);
    const ctx = lienzo.getContext();
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,236,160,1)');
    g.addColorStop(0.25, 'rgba(255,190,90,0.75)');
    g.addColorStop(0.6, 'rgba(255,120,40,0.25)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
    lienzo.refresh();
  }
  if (!t.exists('luz_rayo')) {
    // Haz: fuerte arriba (en el sol), se apaga hacia abajo y hacia los costados.
    const ancho = 110;
    const alto = 560;
    const lienzo = t.createCanvas('luz_rayo', ancho, alto);
    const ctx = lienzo.getContext();
    const largo = ctx.createLinearGradient(0, 0, 0, alto);
    largo.addColorStop(0, 'rgba(255,214,140,1)');
    largo.addColorStop(0.5, 'rgba(255,190,110,0.5)');
    largo.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = largo;
    // Cono: angosto arriba, ancho abajo.
    ctx.beginPath();
    ctx.moveTo(ancho / 2 - 8, 0);
    ctx.lineTo(ancho / 2 + 8, 0);
    ctx.lineTo(ancho, alto);
    ctx.lineTo(0, alto);
    ctx.closePath();
    ctx.fill();
    // Bordes difuminados.
    ctx.globalCompositeOperation = 'destination-in';
    const lados = ctx.createLinearGradient(0, 0, ancho, 0);
    lados.addColorStop(0, 'rgba(0,0,0,0)');
    lados.addColorStop(0.5, 'rgba(0,0,0,1)');
    lados.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lados;
    ctx.fillRect(0, 0, ancho, alto);
    lienzo.refresh();
  }
}

// Banda negra al 40% con bordes difuminados, detrás de PRESIONA START.
function texturaBandaStart(escena) {
  const clave = 'menu_banda_start';
  if (escena.textures.exists(clave)) return clave;
  const { bandaAncho: ancho, bandaAlto: alto } = START;
  const lienzo = escena.textures.createCanvas(clave, ancho, alto);
  const ctx = lienzo.getContext();
  const vertical = ctx.createLinearGradient(0, 0, 0, alto);
  vertical.addColorStop(0, 'rgba(0,0,0,0)');
  vertical.addColorStop(0.3, 'rgba(0,0,0,0.4)');
  vertical.addColorStop(0.7, 'rgba(0,0,0,0.4)');
  vertical.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.globalCompositeOperation = 'destination-in';
  const lados = ctx.createLinearGradient(0, 0, ancho, 0);
  lados.addColorStop(0, 'rgba(0,0,0,0)');
  lados.addColorStop(0.2, 'rgba(0,0,0,1)');
  lados.addColorStop(0.8, 'rgba(0,0,0,1)');
  lados.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lados;
  ctx.fillRect(0, 0, ancho, alto);
  lienzo.refresh();
  return clave;
}
