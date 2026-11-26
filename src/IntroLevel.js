// =============================================================================
// Entrada "boat" de Tuto al Nivel1: llega en lancha por el río.
//
// FASE 1, viaje por el río (LANCHA.viaje): la lancha queda quieta en la
// pantalla con un vaivén suave y Tuto ("boat_ride") parado en la proa; el
// fondo corre solo en capas (cielo, cerros, selva lejana, agua lejana, orilla
// de enfrente, agua cercana animada por delante del casco y juncos por delante
// de todo). Espuma del motor, salpicadura en la proa, destellos y troncos o
// lirios que pasan. Suenan el motor fuera de borda, el agua y los pájaros.
// FASE 2, llegada (LANCHA.llegada): el fondo frena (Quad.Out), el motor baja,
// la cámara avanza hasta que el borde izquierdo del nivel (el suelo de verdad)
// llega junto a la proa, y las capas del viaje se funden con el parallax del
// nivel (LANCHA.fundido).
// FASE 3, desembarco: Tuto salta a la orilla ("boat_jump"; barro y temblor al
// caer, la pose final), la lancha retrocede y se va por la izquierda, MISIÓN 1
// / ¡COMIENZA!, vuelve el HUD y el control. Con 2 jugadores en la sala (Red.js)
// van los dos en la lancha y el segundo salta LANCHA.segundo ms después.
// Cualquier tecla salta a la fase 3. Al terminar se borra todo lo del viaje.
//
// El río está a la izquierda del nivel (x < 0): mientras dura la entrada la
// cámara puede ir hasta ahí. Las capas de fondo van fijas en la pantalla
// detrás del terreno (justo encima del parallax del nivel); el agua va en el
// mundo (termina en x 0, donde empieza el suelo).
//
// Hojas: herramientas/tuto_lancha.py -> assets/personajes/jugador/tuto/lancha/
// (y fondo1.jpeg, el cielo). Las coordenadas del pedido (512x288) van al doble.
// =============================================================================

const LANCHA = {
  ruta: 'assets/personajes/jugador/tuto/lancha/',
  x: 340,                 // centro de la lancha en la pantalla
  aguaPantalla: 430,      // línea del agua en la pantalla
  sueloSobreAgua: 30,     // el suelo del nivel queda tanto más alto que el agua
  hundida: 24,            // px del casco bajo la línea del agua (los tapa el agua cercana)
  altoAguaLejana: 50,     // px de agua entre la orilla de enfrente y la línea del agua
  vaiven: 2 * 2,          // ± px del seno en Y
  viaje: 4000,
  llegada: 2000,
  fundido: 400,
  velocidad: 520,         // px/s de la capa de factor 1
  factores: { cielo: 0.05, cerros: 0.15, selva: 0.3, aguaLejana: 0.5, orilla: 0.9, aguaCercana: 1.4, juncos: 2.2 },
  avance: 620,            // px que avanza la cámara en la llegada (Quad.Out: arranca a ~ 1.2 x velocidad)
  proaAOrilla: 6,         // px entre la punta de la proa y el borde del suelo
  proa: 128,              // px del centro de la lancha a la punta de la proa
  popa: -128,             // ... al motor
  pies: [70, 8],          // pies de Tuto en la proa: px detrás de la punta, px sobre la línea del agua
  aterriza: 70,           // px del borde del suelo donde cae
  segundo: 400,           // ms de diferencia del segundo jugador
  salto: { agacha: 260, vuelo: 620, alto: 120, barro: 380, pose: 1150 }, // pose: con las luces (Luces.js)
  // Barranca de barro en el borde del nivel (tapa el corte entre el agua y la
  // piedra): px a la izquierda y a la derecha de x 0.
  barranca: { izquierda: 96, derecha: 60 },
  estela: 45,             // ms entre las copias de la estela en el aire
  neblina: 0.35           // alfa de la neblina que tapa el cambio de fondo
};

// Texturas chicas de la entrada (una vez por juego): gota, raya de viento y
// la barranca de barro (con pasto, piedras, raíces y totoras).
function texturasIntroLancha(escena, altoBarranca, caida) {
  const lienzo = (clave, w, h, dibujar) => {
    if (escena.textures.exists(clave)) return;
    const t = escena.textures.createCanvas(clave, w, h);
    dibujar(t.getContext(), w, h);
    t.refresh();
  };
  lienzo('lancha_gota', 3, 4, (c) => {
    c.fillStyle = '#e8f6ff'; c.fillRect(1, 0, 1, 1); c.fillRect(0, 1, 3, 2);
    c.fillStyle = '#9fd0f0'; c.fillRect(1, 3, 1, 1);
  });
  lienzo('lancha_viento', 48, 2, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  // Barranca y fin del agua: se dibujan a medio tamaño (se ven al doble, en
  // píxeles como el resto del juego).
  const B = LANCHA.barranca;
  const mitad = (n) => Math.round(n / 2);
  const agua = mitad(caida);                // la línea del agua, desde el suelo
  const x0 = mitad(B.izquierda);            // x 0 del nivel
  const w = mitad(B.izquierda + B.derecha);
  const h = agua + 12;
  lienzo('lancha_barranca', w, h, (c) => {
    const pixel = (x, y, color, ancho = 1, alto = 1) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), ancho, alto); };
    // Arriba: del suelo (derecha) baja al agua (izquierda); abajo, un borde
    // irregular que entra apenas en el agua.
    const arriba = (x) => {
      if (x >= x0 + 18) return 1;
      if (x <= x0 - 36) return agua + 5;
      const t = (x0 + 18 - x) / 54;
      return 1 + (agua + 4) * (t * t * (3 - 2 * t));
    };
    const abajo = (x) => agua + 7 + Math.round(Math.sin(x * 0.9) * 1.5 + Math.sin(x * 0.37) * 1.5);
    for (let x = x0 - 40; x < w; x++) {
      const y0 = Math.round(arriba(x)), y1 = abajo(x);
      for (let y = y0; y <= y1; y++) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        const mojado = y >= agua - 2;
        const base = mojado ? ['#3b2915', '#33230f'] : t < 0.3 ? ['#7a5631', '#6e4d2b'] : ['#5f4224', '#553a1f'];
        pixel(x, y, base[(x + y) % 3 === 0 ? 1 : 0]);
      }
      // Borde de arriba más claro (luz) y pasto sobre la tierra seca.
      pixel(x, y0, arriba(x) < agua - 2 ? '#8d6a3e' : '#4a3520');
      if (arriba(x) < agua - 3 && (x * 7) % 3 !== 0) {
        const alto = 1 + ((x * 13) % 4);
        pixel(x, y0 - alto, (x % 2) ? '#5d7a2e' : '#86a83a', 1, alto);
      }
      // Brillo del agua contra el barro.
      if (y1 > agua && (x * 5) % 7 === 0) pixel(x, agua + 1, 'rgba(235,240,220,0.7)', 2, 1);
    }
    // Piedritas y raíces.
    [[x0 - 14, agua - 4, '#6d665a'], [x0 + 6, 6, '#7c7468'], [x0 - 26, agua + 2, '#5c564c'], [x0 + 24, 4, '#6d665a']].forEach(([x, y, col]) => {
      pixel(x, y, col, 3, 2); pixel(x, y, '#9a9384', 1, 1);
    });
    for (let k = 0; k < 6; k++) pixel(x0 - 2 - k * 2, 8 + k * 2, '#3a2614', 2, 1);
    // Totoras en la orilla del agua.
    [[x0 - 30, 13], [x0 - 26, 10], [x0 - 34, 9], [x0 - 20, 8]].forEach(([x, alto]) => {
      pixel(x, agua + 2 - alto, '#4f6b26', 1, alto);
      pixel(x, agua + 2 - alto - 3, '#6b4320', 1, 3);
    });
    // El borde derecho se funde con la piedra del nivel (una sola máscara:
    // con destination-in cada relleno borra lo que queda fuera de él).
    const funde = c.createLinearGradient(0, 0, w, 0);
    funde.addColorStop(0, 'rgba(0,0,0,1)'); funde.addColorStop((w - 14) / w, 'rgba(0,0,0,1)'); funde.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = funde; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  });
  // Fin del agua cercana: del color del agua a transparente, sobre la piedra.
  lienzo('lancha_agua_borde', 24, Math.ceil(altoBarranca / 2), (c, ancho, alto) => {
    const g = c.createLinearGradient(0, 0, ancho, 0);
    g.addColorStop(0, 'rgba(90,82,50,1)'); g.addColorStop(1, 'rgba(90,82,50,0)');
    c.fillStyle = g; c.fillRect(0, 0, ancho, alto);
    c.fillStyle = 'rgba(123,106,76,0.9)'; c.fillRect(0, 0, ancho - 6, 2);
    c.fillStyle = 'rgba(235,235,210,0.5)';
    [[2, 9, 6], [5, 20, 5], [1, 33, 7], [4, 47, 4]].forEach(([x, y, l]) => c.fillRect(x, y, l, 1));
  });
}

function cargarIntroLancha(escena) {
  const L = LANCHA.ruta;
  if (!escena.cache.json.exists('lanchaDatos')) escena.load.json('lanchaDatos', L + 'lancha.json');
  const imagen = (clave, archivo) => { if (!escena.textures.exists(clave)) escena.load.image(clave, archivo); };
  imagen('lancha_cielo', 'assets/personajes/jugador/tuto/fondo1.jpeg');
  ['cerros', 'selva', 'orilla', 'juncos', 'agua_lejana', 'tronco', 'lirios'].forEach((n) => imagen('lancha_' + n, `${L}${n}.png`));
  for (let i = 0; i < 4; i++) imagen(`lancha_destello_${i}`, `${L}destello_${i}.png`);
  ['agua_cercana', 'lancha', 'boat_ride', 'boat_jump', 'espuma', 'salpicadura'].forEach((n) => imagen('lancha_hoja_' + n, `${L}${n}.png`));
}

// Corta las hojas en cuadros (tamaños de lancha.json) y crea las animaciones.
function animacionesIntroLancha(escena) {
  const d = escena.cache.json.get('lanchaDatos');
  if (!d) return null;
  ['agua_cercana', 'lancha', 'boat_ride', 'boat_jump', 'espuma', 'salpicadura'].forEach((n) => {
    const clave = 'lancha_' + n;
    if (escena.textures.exists(clave) || !escena.textures.exists('lancha_hoja_' + n)) return;
    escena.textures.addSpriteSheet(clave, escena.textures.get('lancha_hoja_' + n).getSourceImage(), { frameWidth: d[n].ancho, frameHeight: d[n].alto });
  });
  const anim = (key, textura, frames, frameRate, repeat = -1) => {
    if (!escena.anims.exists(key)) escena.anims.create({ key, frames: frames.map((f) => ({ key: textura, frame: f })), frameRate, repeat });
  };
  // La lancha: los cuadros 0 y 1 (bandera y hélice); los otros dos llevan otra carga.
  anim('lancha_motor', 'lancha_lancha', [0, 1, 0, 1], 9);
  anim('boat_ride', 'lancha_boat_ride', [0, 1, 2, 3, 4, 5], 8);
  anim('lancha_espuma', 'lancha_espuma', [0, 1, 2, 3], 12);
  anim('lancha_salpicadura', 'lancha_salpicadura', [0, 1, 2, 3], 12);
  return d;
}

// Sonido del viaje (Web Audio): motor fuera de borda, agua y pájaros.
// Devuelve { motor(volumen, tono, segundos), parar(segundos) }.
function sonidoRio(escena) {
  const nada = { motor() {}, parar() {} };
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return nada;
  const destino = escena.sound.masterVolumeNode || ctx.destination;
  const ahora = ctx.currentTime;
  const nodos = [];
  // Motor: dos sierras graves que tiemblan rápido, filtradas.
  const motorGanancia = ctx.createGain();
  motorGanancia.gain.setValueAtTime(0.0001, ahora);
  motorGanancia.gain.linearRampToValueAtTime(0.16, ahora + 0.5);
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 700;
  const temblor = ctx.createGain();
  temblor.gain.value = 0.6;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 22;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.4;
  lfo.connect(lfoG).connect(temblor.gain);
  const osc = [58, 117].map((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(filtro);
    return o;
  });
  filtro.connect(temblor).connect(motorGanancia).connect(destino);
  // Agua: ruido filtrado que sube y baja despacio.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const ruido = ctx.createBufferSource();
  ruido.buffer = buffer;
  ruido.loop = true;
  const banda = ctx.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = 900;
  banda.Q.value = 0.6;
  const aguaG = ctx.createGain();
  aguaG.gain.value = 0.05;
  const ola = ctx.createOscillator();
  ola.frequency.value = 0.35;
  const olaG = ctx.createGain();
  olaG.gain.value = 0.03;
  ola.connect(olaG).connect(aguaG.gain);
  ruido.connect(banda).connect(aguaG).connect(destino);
  [lfo, ola, ...osc].forEach((o) => o.start());
  ruido.start();
  nodos.push(lfo, ola, ruido, ...osc);
  // Pájaros: dos o tres silbidos cada tanto.
  const pio = () => {
    const t = ctx.currentTime;
    const notas = 2 + Math.floor(Math.random() * 2);
    const base = 2300 + Math.random() * 1200;
    for (let i = 0; i < notas; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const t0 = t + i * 0.11;
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.45, t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(g).connect(destino);
      o.start(t0);
      o.stop(t0 + 0.1);
    }
  };
  const pajaros = escena.time.addEvent({ delay: 900, loop: true, callback: () => { if (Math.random() < 0.7) pio(); } });
  let parado = false;
  const rampa = (param, v, segundos) => {
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(v, ctx.currentTime + segundos);
  };
  const s = {
    // volumen del motor (0-1 del normal) y tono (1 = normal).
    motor(volumen, tono = 1, segundos = 0.5) {
      if (parado) return;
      rampa(motorGanancia.gain, Math.max(0.0001, 0.16 * volumen), segundos);
      osc.forEach((o, i) => rampa(o.frequency, [58, 117][i] * tono, segundos));
      rampa(lfo.frequency, 22 * tono, segundos);
    },
    parar(segundos = 0.4) {
      if (parado) return;
      parado = true;
      pajaros.remove();
      rampa(motorGanancia.gain, 0.0001, segundos);
      rampa(aguaG.gain, 0.0001, segundos);
      nodos.forEach((n) => { try { n.stop(ctx.currentTime + segundos + 0.05); } catch (e) { /* ya parado */ } });
    }
  };
  escena.events.once('shutdown', () => s.parar(0.05));
  return s;
}

const AccionesIntroLancha = {
  entradaLancha() {
    const L = LANCHA;
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    const j = this.jugador;
    const suelo = this.inicio.abajo;            // el suelo del borde izquierdo del nivel
    const agua = suelo + L.sueloSobreAgua;      // línea del agua (mundo)
    const scrollY = Phaser.Math.Clamp(agua - L.aguaPantalla, 0, this.altoNivel - height);
    const aguaPantalla = agua - scrollY;
    const xOrilla = L.x + L.proa + L.proaAOrilla; // donde queda el borde del suelo en la pantalla
    const scrollFinal = -xOrilla;
    const v = this.introLancha = {
      fase: 1, vel: 1, objetos: [], tileSprites: [], eventos: [], tweens: [], fondo: [], riders: []
    };
    const guardar = (o) => { v.objetos.push(o); return o; };
    const tween = (cfg) => { const t = this.tweens.add(cfg); v.tweens.push(t); return t; };
    const despues = (ms, fn) => { const e = this.time.delayedCall(ms, fn); v.eventos.push(e); return e; };

    // El jugador de verdad espera invisible donde va a caer.
    this.aterrizoEntrada = true;
    this.ocultarJugador = true;
    j.body.reset(L.aterriza, suelo - 30 * ESCALA);
    j.body.setAllowGravity(true);
    j.setVelocity(0).setFlipX(false);

    // El HUD se esconde hasta el desembarco.
    v.hud = this.children.list.filter((o) => o.scrollFactorX === 0 && o.depth >= 20 && o.visible);
    v.hud.forEach((o) => o.setData('alfaHud', o.alpha).setAlpha(0));

    // Cámara: a la izquierda del nivel, el río.
    cam.stopFollow();
    cam.setBounds(-4000, 0, this.anchoNivel + 4000, this.altoNivel);
    cam.setScroll(scrollFinal - L.avance, scrollY);

    // Capas del fondo, fijas en la pantalla, detrás del terreno: se insertan
    // en la lista de dibujo justo después del parallax del nivel.
    let indice = this.indiceParalaje ?? 0;
    const alFondo = (o) => { this.children.moveTo(o, indice++); v.fondo.push(o); return guardar(o); };
    const franja = (clave, y, factor, escala = 1, alto) => {
      const t = this.textures.get(clave).getSourceImage();
      const s = this.add.tileSprite(0, y, width / escala, alto || t.height, clave).setOrigin(0, 1).setScale(escala).setScrollFactor(0);
      v.tileSprites.push({ s, factor });
      return s;
    };
    const cielo = this.add.image(width, 0, 'lancha_cielo').setOrigin(1, 0).setScrollFactor(0);
    cielo.setScale(Math.max(width / cielo.width, height / cielo.height));
    alFondo(cielo);
    alFondo(franja('lancha_cerros', aguaPantalla - 150, L.factores.cerros, 1.1));
    alFondo(franja('lancha_selva', aguaPantalla - 70, L.factores.selva, 1.05));
    alFondo(franja('lancha_orilla', aguaPantalla - 30, L.factores.orilla, 1));
    // El agua va en el mundo, a la izquierda del nivel (termina en x 0).
    const largoRio = 4000;
    // Una franja delgada entre la orilla de enfrente y la línea del agua.
    const lejana = this.add.tileSprite(-largoRio, agua + 12, largoRio, L.altoAguaLejana, 'lancha_agua_lejana').setOrigin(0, 1);
    this.children.moveTo(lejana, indice++);
    guardar(lejana);
    v.lejana = lejana;
    v.tileSprites.push({ s: lejana, factor: L.factores.aguaLejana });
    const cercana = guardar(this.add.tileSprite(-largoRio, agua + 6, largoRio / 1.4, (height - aguaPantalla) / 1.4 + 4, 'lancha_agua_cercana', 0)
      .setOrigin(0, 0).setScale(1.4).setDepth(10.9));
    v.tileSprites.push({ s: cercana, factor: L.factores.aguaCercana });
    v.cercana = cercana;
    // Barranca de barro en el borde del nivel, delante del agua (tapa el corte
    // entre el agua y la piedra; la piedra de la derecha se funde).
    const caida = agua - suelo;
    const altoBarranca = Math.ceil(height - aguaPantalla + caida + 40);
    texturasIntroLancha(this, altoBarranca, caida);
    guardar(this.add.image(-L.barranca.izquierda, suelo - 2, 'lancha_barranca').setOrigin(0, 0).setScale(2).setDepth(10.95));
    guardar(this.add.image(0, agua + 6, 'lancha_agua_borde').setOrigin(0, 0).setScale(2).setDepth(10.9));
    // Juncos por delante de todo (menos el HUD).
    const juncos = guardar(franja('lancha_juncos', height + 30, L.factores.juncos, 0.85).setDepth(16));
    v.juncos = juncos;

    // La lancha y quién va en ella (fijos en la pantalla: el viaje lo hace el fondo).
    const lancha = guardar(this.add.sprite(L.x, aguaPantalla + L.hundida, 'lancha_lancha', 0)
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(10.5).play('lancha_motor'));
    v.lancha = lancha;
    const jugadores = typeof RED !== 'undefined' && RED.sala && RED.sala.jugadores ? Math.min(2, RED.sala.jugadores.length) : 1;
    for (let i = 0; i < jugadores; i++) {
      const r = guardar(this.add.sprite(0, 0, 'lancha_boat_ride', 0).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10.6 - i * 0.01)
        .play({ key: 'boat_ride', startFrame: i * 3 }));
      if (i > 0) r.setTint(0xd9dcff);
      r.setData('detras', i * 62); // el segundo, más atrás en la lancha
      v.riders.push(r);
    }
    const espuma = guardar(this.add.sprite(0, 0, 'lancha_espuma', 0).setOrigin(1, 1).setScrollFactor(0).setDepth(10.45)
      .setFlipX(true).play('lancha_espuma'));
    const salpica = guardar(this.add.sprite(0, 0, 'lancha_salpicadura', 0).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10.95)
      .play('lancha_salpicadura'));
    v.espuma = espuma;
    v.salpica = salpica;

    // Cada cuadro: el fondo corre, la lancha se mece y todo la sigue.
    let cuadroAgua = 0;
    v.seguir = (time, delta) => {
      // (La limpieza puede pasar dentro del mismo update: ya no hay nada que mover.)
      if (!cercana.active) return;
      const dt = delta / 1000;
      v.tileSprites.forEach(({ s, factor }) => { s.tilePositionX += L.velocidad * factor * v.vel * dt / s.scaleX; });
      cuadroAgua += dt * 8;
      cercana.setFrame(Math.floor(cuadroAgua) % 4);
      if (!lancha.active) return;
      // (Desde el desembarco la lancha va en el mundo: v.mundo es el scroll de entonces.)
      const y = aguaPantalla + (v.mundo ? v.mundo.y : 0) + L.hundida + Math.sin(time / 380) * L.vaiven;
      if (v.fase < 3 || v.lanchaQuieta) lancha.y = y;
      const punta = lancha.x + L.proa;
      v.riders.forEach((r) => {
        if (r.getData('salto')) return;
        r.setPosition(punta - L.pies[0] - r.getData('detras'), lancha.y - L.hundida - L.pies[1]);
      });
      espuma.setPosition(lancha.x + L.popa + 4, lancha.y - L.hundida + 10).setAlpha(0.9 * Math.max(v.vel, v.fase === 3 ? 0.8 : 0));
      salpica.setPosition(punta + 6, lancha.y - L.hundida + 8).setAlpha(v.vel).setScale(0.6 + 0.4 * v.vel);
      v.gotas.setPosition(punta, lancha.y - L.hundida);
      v.gotas.frequency = v.vel > 0.25 && v.fase < 3 ? 60 / v.vel : -1;
    };
    this.events.on('update', v.seguir);

    // Destellos del agua al azar y troncos o lirios que pasan.
    v.eventos.push(this.time.addEvent({
      delay: 140, loop: true, callback: () => {
        if (v.vel < 0.15) return;
        const d = guardar(this.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(aguaPantalla + 8, height - 20),
          `lancha_destello_${Phaser.Math.Between(0, 3)}`).setScrollFactor(0).setDepth(10.92).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));
        tween({ targets: d, alpha: 1, x: d.x - 40 * v.vel, duration: 260, yoyo: true, onComplete: () => d.destroy() });
      }
    }));
    v.eventos.push(this.time.addEvent({
      delay: 1100, loop: true, callback: () => {
        if (v.fase !== 1 || Math.random() < 0.35) return; // solo en el viaje (si no, frenaban sobre el suelo)
        const clave = Math.random() < 0.5 ? 'lancha_tronco' : 'lancha_lirios';
        const adelante = Math.random() < 0.5;
        const y = adelante ? Phaser.Math.Between(aguaPantalla + 60, height - 50) : aguaPantalla + Phaser.Math.Between(2, 12);
        const f = guardar(this.add.image(width + 140, y, clave).setScrollFactor(0).setDepth(adelante ? 10.93 : 10.4));
        tween({ targets: f, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1 });
        v.flotantes = (v.flotantes || []).concat(f);
        f.setData('factor', adelante ? L.factores.aguaCercana : L.factores.aguaLejana);
      }
    }));
    v.moverFlotantes = (time, delta) => {
      if (!this.introLancha) return;
      (v.flotantes || []).forEach((f) => {
        if (!f.active) return;
        f.x -= L.velocidad * f.getData('factor') * v.vel * delta / 1000;
        if (f.x < -200) f.destroy();
      });
    };
    this.events.on('update', v.moverFlotantes);

    v.sonido = sonidoRio(this);

    // Efectos del viaje en Tuto: rayas de viento que le pasan y gotas que
    // salta la proa contra él.
    v.eventos.push(this.time.addEvent({
      delay: 90, loop: true, callback: () => {
        if (v.vel < 0.3 || v.fase >= 3 || !v.riders[0]) return;
        const r = v.riders[0];
        const raya = guardar(this.add.image(r.x + Phaser.Math.Between(40, 160), r.y - Phaser.Math.Between(20, 120), 'lancha_viento')
          .setScrollFactor(0).setDepth(10.65).setAlpha(0.5 * v.vel).setScale(Phaser.Math.FloatBetween(0.6, 1.6), 1));
        tween({ targets: raya, x: raya.x - 260, alpha: 0, duration: 320, onComplete: () => raya.destroy() });
      }
    }));
    v.gotas = guardar(this.add.particles(0, 0, 'lancha_gota', {
      speedX: { min: -260, max: -120 }, speedY: { min: -220, max: -90 }, gravityY: 700, lifespan: 600,
      scale: { min: 1, max: 2 }, alpha: { start: 1, end: 0.2 }, frequency: 60, quantity: 2
    }).setScrollFactor(0).setDepth(10.7));

    // FASE 2: llega a la orilla.
    despues(L.viaje, () => this.llegadaLancha(scrollFinal));
    // Cualquier tecla salta a la fase 3.
    despues(300, () => {
      v.saltar = () => this.saltarIntroLancha(scrollFinal);
      this.input.keyboard.once('keydown', v.saltar);
      this.input.once('pointerdown', v.saltar);
    });
    this.events.once('shutdown', () => this.limpiarIntroLancha());
  },

  llegadaLancha(scrollFinal) {
    const v = this.introLancha;
    if (!v || v.fase !== 1) return;
    v.fase = 2;
    const L = LANCHA;
    v.tweens.push(this.tweens.add({ targets: v, vel: 0, duration: L.llegada, ease: 'Quad.Out' }));
    v.tweens.push(this.tweens.add({ targets: this.cameras.main, scrollX: scrollFinal, duration: L.llegada, ease: 'Quad.Out' }));
    v.sonido.motor(0.45, 0.8, L.llegada / 1000);
    // Los troncos y lirios que quedaban se van (si no, frenaban sobre el suelo).
    (v.flotantes || []).forEach((f) => {
      if (f.active) this.tweens.add({ targets: f, alpha: 0, duration: 600, onComplete: () => f.destroy() });
    });
    v.eventos.push(this.time.delayedCall(L.llegada - L.fundido, () => this.fundirIntroLancha(L.fundido)));
    v.eventos.push(this.time.delayedCall(L.llegada, () => this.desembarcoLancha()));
  },

  // Las capas del viaje se van y queda el parallax del nivel (el agua queda).
  fundirIntroLancha(ms) {
    const v = this.introLancha;
    if (v.fundido) return;
    v.fundido = true;
    v.tweens.push(this.tweens.add({ targets: [...v.fondo.filter((o) => o.scrollFactorX === 0), v.juncos, v.lejana], alpha: 0, duration: ms }));
    // Una neblina blanca tapa el cambio del cielo del río a la selva del nivel.
    const { width, height } = this.scale;
    const neblina = this.add.rectangle(0, 0, width, height, 0xf4f2e4).setOrigin(0).setScrollFactor(0).setDepth(15).setAlpha(0);
    v.objetos.push(neblina);
    v.tweens.push(this.tweens.add({ targets: neblina, alpha: LANCHA.neblina, duration: ms, yoyo: true, ease: 'Sine.inOut', onComplete: () => neblina.destroy() }));
  },

  saltarIntroLancha(scrollFinal) {
    const v = this.introLancha;
    if (!v || v.fase >= 3) return;
    v.eventos.forEach((e) => e.remove(false));
    v.tweens.forEach((t) => t.stop());
    v.vel = 0;
    this.cameras.main.setScroll(scrollFinal, this.cameras.main.scrollY);
    v.sonido.motor(0.45, 0.8, 0.2);
    this.fundirIntroLancha(200);
    this.desembarcoLancha();
  },

  // FASE 3: saltan a la orilla y la lancha se va.
  desembarcoLancha() {
    const v = this.introLancha;
    if (!v || v.fase >= 3) return;
    v.fase = 3;
    v.vel = 0;
    v.lanchaQuieta = true;
    if (v.saltar) { this.input.keyboard.off('keydown', v.saltar); this.input.off('pointerdown', v.saltar); }
    const L = LANCHA;
    const S = L.salto;
    const cam = this.cameras.main;
    // Desde acá la lancha, sus efectos y quienes saltan van en el mundo: al
    // final la cámara vuelve al nivel y, fijos en la pantalla, la lancha
    // parecía avanzar mientras retrocedía.
    v.mundo = { x: cam.scrollX, y: cam.scrollY };
    [v.lancha, v.espuma, v.salpica, ...v.riders].forEach((o) => o.setScrollFactor(1).setPosition(o.x + v.mundo.x, o.y + v.mundo.y));
    v.gotas.setScrollFactor(1);
    v.riders.forEach((r, i) => {
      const espera = i * L.segundo;
      this.time.delayedCall(espera, () => {
        r.setData('salto', true).anims.stop();
        r.setTexture('lancha_boat_jump', 0);
        const x0 = r.x, y0 = r.y;
        const x1 = L.aterriza - i * 34, y1 = this.inicio.abajo; // el borde del nivel es x 0
        // Se agacha: tiembla un poco juntando fuerza.
        this.tweens.add({ targets: r, scaleY: 0.94, duration: S.agacha * 0.8, yoyo: true, ease: 'Sine.inOut' });
        this.time.delayedCall(S.agacha, () => {
          this.efectoDespegue(r);
          const t = { p: 0 };
          let ultimaCopia = 0;
          this.tweens.add({
            targets: t, p: 1, duration: S.vuelo, ease: 'Linear',
            onUpdate: () => {
              const p = t.p;
              r.x = Phaser.Math.Linear(x0, x1, p);
              r.y = Phaser.Math.Linear(y0, y1, p) - S.alto * 4 * p * (1 - p);
              r.setFrame(p < 0.35 ? 1 : p < 0.65 ? 2 : 3);
              // Estela: copias que se desvanecen detrás de él.
              if (this.time.now - ultimaCopia > L.estela) {
                ultimaCopia = this.time.now;
                const copia = this.add.image(r.x, r.y, r.texture.key, r.frame.name).setOrigin(0.5, 1)
                  .setDepth(r.depth - 0.01).setTint(0x8fd0ff).setAlpha(0.45);
                this.tweens.add({ targets: copia, alpha: 0, duration: 240, onComplete: () => copia.destroy() });
              }
            },
            onComplete: () => {
              r.setFrame(4);
              this.efectoAterrizaje(r, i === 0);
              this.time.delayedCall(S.barro, () => {
                r.setFrame(5);
                if (i === 0) this.efectoPose(r);
              });
            }
          });
        });
        // Al saltar, la lancha se hunde un poco y se mece.
        if (i === 0) this.tweens.add({ targets: v.lancha, y: v.lancha.y + 6, duration: 120, yoyo: true });
      });
    });

    // La lancha retrocede y sale por la izquierda con el motor alejándose.
    const ultimo = (v.riders.length - 1) * L.segundo;
    this.time.delayedCall(S.agacha + S.vuelo + 200 + ultimo, () => {
      v.lanchaQuieta = false;
      v.sonido.motor(1, 1.05, 0.3);
      this.tweens.add({ targets: v.lancha, x: v.lancha.x - 700, duration: 2200, ease: 'Quad.In' });
      v.lancha.setFlipX(false);
      v.salpica.setVisible(false);
      this.time.delayedCall(400, () => v.sonido.motor(0.0001, 0.7, 1.8));
    });

    // MISIÓN 1, el HUD y el control.
    const fin = S.agacha + S.vuelo + S.barro + S.pose + ultimo;
    this.time.delayedCall(fin - 200, () => {
      if (!this.reapareciendo) comienzaMision(this, 'MISIÓN 1');
      v.hud.forEach((o) => this.tweens.add({ targets: o, alpha: o.getData('alfaHud') ?? 1, duration: 400 }));
    });
    this.time.delayedCall(fin, () => {
      v.riders.forEach((r) => r.setVisible(false));
      this.ocultarJugador = false;
      // La cámara vuelve al nivel antes de seguir al jugador (si no, el tope
      // la llevaba de golpe a x 0).
      this.tweens.add({
        targets: this.cameras.main, scrollX: 0, duration: 650, ease: 'Sine.inOut',
        onComplete: () => {
          v.fase = 4;            // limitarCamaraPenon vuelve a poner los topes
          this.ladoPenon = null;
          this.terminarEntrada();
        }
      });
    });
    this.time.delayedCall(fin + 2400, () => this.limpiarIntroLancha());
  },

  // Despega de la proa: chorro de gotas, una nube de agua y un silbido.
  efectoDespegue(r) {
    const gotas = this.add.particles(r.x + 10, r.y - 4, 'lancha_gota', {
      speedX: { min: -80, max: 160 }, speedY: { min: -260, max: -80 }, gravityY: 800, lifespan: 650,
      scale: { min: 1, max: 2.5 }, alpha: { start: 1, end: 0 }, emitting: false
    }).setDepth(10.97);
    gotas.explode(22);
    const puf = this.add.particles(r.x, r.y - 2, 'fx_puf', {
      speedX: { min: -90, max: 60 }, speedY: { min: -30, max: 0 }, lifespan: 420,
      scale: { start: 0.8, end: 2 }, alpha: { start: 0.6, end: 0 }, tint: 0xd8f0ff, emitting: false
    }).setDepth(10.96);
    puf.explode(6);
    this.time.delayedCall(800, () => { gotas.destroy(); puf.destroy(); });
    this.silbido();
  },

  // Cae en la orilla: barro, anillo de polvo, destello del golpe y temblor.
  efectoAterrizaje(r, fuerte) {
    const cam = this.cameras.main;
    const x = r.x;
    const y = this.inicio.abajo;
    if (fuerte) cam.shake(150, 0.007);
    sonidoUI(this, 'golpe');
    const barro = this.add.particles(x, y - 4, 'fx_humo', {
      speedX: { min: -150, max: 150 }, speedY: { min: -190, max: -50 }, gravityY: 600, lifespan: 560,
      scale: { start: 0.9, end: 0.3 }, alpha: { start: 0.95, end: 0 }, tint: 0x5a3a1c, emitting: false
    }).setDepth(11);
    barro.explode(18);
    const polvo = this.add.particles(x, y - 2, 'fx_puf', {
      speedX: { min: -220, max: 220 }, speedY: { min: -25, max: -5 }, lifespan: 520,
      scale: { start: 0.7, end: 2.4 }, alpha: { start: 0.5, end: 0 }, tint: 0xcbb898, emitting: false
    }).setDepth(10.99);
    polvo.explode(12);
    // Anillo del golpe: una elipse blanca que se abre sobre el piso.
    const anillo = this.add.graphics().setDepth(11).setPosition(x, y - 4);
    const radio = { r: 6, a: 0.9 };
    this.tweens.add({
      targets: radio, r: 46, a: 0, duration: 260, ease: 'Quad.out',
      onUpdate: () => anillo.clear().lineStyle(3, 0xfff6dc, radio.a).strokeEllipse(0, 0, radio.r * 2, radio.r * 0.6),
      onComplete: () => anillo.destroy()
    });
    // Rayitas del impacto a los costados.
    [-1, 1].forEach((lado) => {
      for (let k = 0; k < 3; k++) {
        const raya = this.add.image(x + lado * 20, y - 8 - k * 10, 'lancha_viento').setDepth(11).setFlipX(lado < 0)
          .setScale(0.7, 1).setOrigin(lado < 0 ? 1 : 0, 0.5);
        this.tweens.add({ targets: raya, x: raya.x + lado * 40, alpha: 0, duration: 260, delay: k * 30, onComplete: () => raya.destroy() });
      }
    });
    this.time.delayedCall(800, () => { barro.destroy(); polvo.destroy(); });
  },

  // La pose: el fondo se hace sombra con un foco sobre él y brillos
  // (Luces.js), destello en la mano que señala y un golpe de zoom.
  efectoPose(r) {
    r.setDepth(11.2); // encima del oscuro (y del agua y la barranca)
    momentoHeroe(this, r, { dura: LANCHA.salto.pose - 250, profundidad: 11 });
    const x = r.x + 34, y = r.y - 86;
    const brillo = this.add.image(x, y, 'lancha_destello_1').setDepth(11).setScale(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: brillo, scale: 1.6, angle: 90, duration: 220, yoyo: true, ease: 'Back.out', onComplete: () => brillo.destroy()
    });
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: 1.04, duration: 140, yoyo: true, ease: 'Sine.out' });
    sonidoUI(this, 'confirma');
  },

  // Silbido corto del salto (ruido que baja de tono).
  silbido() {
    const ctx = this.sound && this.sound.context;
    if (!ctx || !ctx.createBufferSource || this.sound.locked) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ruido = ctx.createBufferSource();
    ruido.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 3;
    filtro.frequency.setValueAtTime(2600, t);
    filtro.frequency.exponentialRampToValueAtTime(700, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    ruido.connect(filtro).connect(g).connect(this.sound.masterVolumeNode || ctx.destination);
    ruido.start(t);
  },

  // Borra todo lo del viaje: capas, efectos, tweens, eventos y sonido.
  limpiarIntroLancha() {
    const v = this.introLancha;
    if (!v) return;
    this.introLancha = null;
    this.events.off('update', v.seguir);
    this.events.off('update', v.moverFlotantes);
    if (v.saltar) { this.input.keyboard.off('keydown', v.saltar); this.input.off('pointerdown', v.saltar); }
    v.eventos.forEach((e) => e.remove(false));
    v.tweens.forEach((t) => t.stop());
    v.objetos.forEach((o) => { if (o.active) { this.tweens.killTweensOf(o); o.destroy(); } });
    v.sonido.parar(0.3);
  }
};

Object.assign(Nivel1.prototype, AccionesIntroLancha);
