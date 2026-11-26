// =============================================================================
// Cinemática de entrada de Manfred, antes del Nivel1: el helicóptero (Huey
// boliviano) vuela sobre las nubes al amanecer, con franjas negras de cine y
// el cartel CHAPARE, BOLIVIA; después pica hacia la selva y se pasa al nivel,
// donde llega el mismo helicóptero y Manfred baja por la soga
// (Nivel1.entradaHelicoptero). Cualquier tecla o toque la salta.
//
// Hojas (herramientas/manfred_entrada.py, de entrada.jpeg y entrada1.jpeg):
//   helicoptero_sheet.png  4 cuadros del rotor girando
//   manfred_entrada.png    6 de Manfred: soga (2), se suelta, cae, se para, saluda
//   entrada_cuadros.json   celdas y el extremo de la soga del helicóptero
// Fondo: cielo.jpeg (el cielo del amanecer) y las capas de cielo2.jpeg
// recortadas por herramientas/cielo_cinematica.py en manfred/cine/: nubes
// finas, cerros con neblina, banco de nubes grandes, selva con río (franjas
// que se repiten de costado) y nubes suaves sueltas. Cada capa corre a su
// velocidad (parallax); las rayitas de velocidad se generan acá.
// =============================================================================

const CINE = {
  franja: 56,          // alto de las franjas negras
  heli: { escala: 2, x: 470, y: 425 }, // y: el extremo de la soga (abajo)
  llega: 1900,         // ms: el helicóptero entra y se acomoda
  cartel: 700,         // ms: CHAPARE, BOLIVIA
  pica: 3900,          // ms: pica hacia la selva
  fin: 4900,           // ms: fundido al nivel
  nubesSuaves: 3,      // cine_nube_suave_<i>.png (cine.json)
  // Franjas del fondo: [textura, y de abajo (desde abajo de la pantalla), escala, px/s, profundidad, alfa]
  capas: [
    ['nubes_finas', 330, 1.3, 6, 0.5, 0.45],
    ['cerros', 150, 1.25, 14, 1, 1],
    ['nubes_grandes', 110, 1.1, 30, 1.2, 1],
    ['selva', 0, 1.35, 55, 1.5, 1]
  ]
};

// Lo comparte con Nivel1: las hojas y sus animaciones.
function cargarEntradaHeli(escena) {
  const ruta = 'assets/personajes/jugador/manfred/';
  if (!escena.cache.json.exists('entradaCuadros')) escena.load.json('entradaCuadros', ruta + 'entrada_cuadros.json');
  if (!escena.textures.exists('helicoptero')) escena.load.image('helicopteroHoja', ruta + 'helicoptero_sheet.png');
  if (!escena.textures.exists('manfredEntrada')) escena.load.image('manfredEntradaHoja', ruta + 'manfred_entrada.png');
}

// Corta las hojas en cuadros (con el tamaño del json) y crea las animaciones.
function animacionesEntradaHeli(escena) {
  const d = escena.cache.json.get('entradaCuadros');
  if (!d) return null;
  [['helicoptero', 'helicopteroHoja', d.helicoptero], ['manfredEntrada', 'manfredEntradaHoja', d.manfred]].forEach(([clave, hoja, c]) => {
    if (escena.textures.exists(clave) || !escena.textures.exists(hoja)) return;
    escena.textures.addSpriteSheet(clave, escena.textures.get(hoja).getSourceImage(), { frameWidth: c.ancho, frameHeight: c.alto });
  });
  if (!escena.anims.exists('heli_rotor')) {
    escena.anims.create({ key: 'heli_rotor', frames: escena.anims.generateFrameNumbers('helicoptero', { start: 0, end: 3 }), frameRate: 22, repeat: -1 });
    escena.anims.create({ key: 'manfred_soga', frames: escena.anims.generateFrameNumbers('manfredEntrada', { start: 0, end: 1 }), frameRate: 9, repeat: -1 });
  }
  return d;
}

// El helicóptero con el origen en el extremo de la soga enrollada.
function crearHelicoptero(escena, x, y, escala) {
  const d = escena.cache.json.get('entradaCuadros').helicoptero;
  return escena.add.sprite(x, y, 'helicoptero', 0)
    .setOrigin(d.soga[0] / d.ancho, d.soga[1] / d.alto).setScale(escala).play('heli_rotor');
}

// Ruido del rotor (Web Audio): ruido grave que late ~12 veces por segundo.
// Devuelve { volumen(v, segundos), parar(segundos) }.
function sonidoHelicoptero(escena, volumen = 0.25) {
  const nada = { volumen() {}, parar() {} };
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createBufferSource || escena.sound.locked) return nada;
  const destino = escena.sound.masterVolumeNode || ctx.destination;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const ruido = ctx.createBufferSource();
  ruido.buffer = buffer;
  ruido.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 520;
  const latido = ctx.createGain();
  latido.gain.value = 0.55;
  const lfo = ctx.createOscillator();
  lfo.type = 'sawtooth';
  lfo.frequency.value = 12;
  const lfoGanancia = ctx.createGain();
  lfoGanancia.gain.value = 0.45;
  lfo.connect(lfoGanancia).connect(latido.gain);
  const salida = ctx.createGain();
  salida.gain.setValueAtTime(0.0001, ctx.currentTime);
  salida.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 0.6);
  ruido.connect(filtro).connect(latido).connect(salida).connect(destino);
  ruido.start();
  lfo.start();
  let parado = false;
  const s = {
    volumen(v, segundos = 0.5) {
      if (parado) return;
      salida.gain.cancelScheduledValues(ctx.currentTime);
      salida.gain.setValueAtTime(salida.gain.value, ctx.currentTime);
      salida.gain.linearRampToValueAtTime(Math.max(0.0001, v), ctx.currentTime + segundos);
    },
    parar(segundos = 0.4) {
      if (parado) return;
      s.volumen(0.0001, segundos);
      parado = true;
      ruido.stop(ctx.currentTime + segundos + 0.05);
      lfo.stop(ctx.currentTime + segundos + 0.05);
    }
  };
  escena.events.once('shutdown', () => s.parar(0.1));
  return s;
}

class Cinematica extends Phaser.Scene {
  constructor() {
    super('Cinematica');
  }

  preload() {
    cargarEntradaHeli(this);
    const ruta = 'assets/personajes/jugador/manfred/';
    this.load.image('cine_cielo', ruta + 'cielo.jpeg');
    ['nubes_finas', 'cerros', 'nubes_grandes', 'selva'].forEach((n) => this.load.image('cine_' + n, `${ruta}cine/cine_${n}.png`));
    for (let i = 0; i < CINE.nubesSuaves; i++) this.load.image(`cine_nube_${i}`, `${ruta}cine/cine_nube_suave_${i}.png`);
  }

  create() {
    const { width, height } = this.scale;
    animacionesEntradaHeli(this);
    this.texturas();
    this.saliendo = false;
    this.velocidad = 1; // multiplica el paso de nubes y cerros (al picar, más rápido)

    // Cielo: cubre la pantalla, pegado a la derecha (ahí está el sol).
    const cielo = this.add.image(width, 0, 'cine_cielo').setOrigin(1, 0).setDepth(0);
    cielo.setScale(Math.max(width / cielo.width, height / cielo.height));
    // Franjas repetibles: cada una corre a su velocidad (las de abajo, más rápido).
    this.capas = CINE.capas.map(([nombre, abajo, escala, velocidad, prof, alfa]) => {
      const t = this.textures.get('cine_' + nombre).getSourceImage();
      const capa = this.add.tileSprite(0, height - abajo, width / escala, t.height, 'cine_' + nombre)
        .setOrigin(0, 1).setScale(escala).setDepth(prof).setAlpha(alfa);
      return { capa, velocidad };
    });
    // Nubes suaves sueltas: atrás chicas y lentas, adelante grandes y rápidas.
    this.nubes = [];
    const capa = (n, escala, velocidad, prof, alfa, y0, y1) => {
      for (let i = 0; i < n; i++) {
        const nube = this.add.image(Phaser.Math.RND.between(0, width + 300), Phaser.Math.RND.between(y0, y1), `cine_nube_${i % CINE.nubesSuaves}`)
          .setScale(escala * Phaser.Math.RND.realInRange(0.8, 1.2)).setDepth(prof).setAlpha(alfa).setFlipX(Phaser.Math.RND.pick([true, false]));
        this.nubes.push({ nube, velocidad: velocidad * Phaser.Math.RND.realInRange(0.85, 1.15) });
      }
    };
    capa(4, 0.6, 35, 0.8, 0.8, 90, 260);
    capa(3, 1, 90, 3, 0.9, 140, 380);
    capa(2, 2.2, 380, 20, 0.85, 330, 520);
    // Rayitas de velocidad.
    this.rayas = [];
    for (let i = 0; i < 14; i++) {
      const r = this.add.image(Phaser.Math.RND.between(0, width), Phaser.Math.RND.between(90, height - 90), 'cine_raya')
        .setDepth(4).setAlpha(Phaser.Math.RND.realInRange(0.2, 0.5)).setScale(Phaser.Math.RND.realInRange(1, 3), 1);
      this.rayas.push(r);
    }

    // El helicóptero entra desde la izquierda y se acomoda en el centro.
    const H = CINE.heli;
    this.heli = crearHelicoptero(this, -380, H.y, H.escala).setDepth(10).setAngle(14);
    this.heliBase = { x: -380, y: H.y };
    this.tweens.add({ targets: this.heliBase, x: H.x, duration: CINE.llega, ease: 'Cubic.out' });
    this.tweens.add({ targets: this.heli, angle: 4, duration: CINE.llega, ease: 'Sine.out' });
    this.rotor = sonidoHelicoptero(this, 0.28);

    // Franjas de cine.
    const arriba = this.add.rectangle(0, 0, width, CINE.franja, 0x000000).setOrigin(0, 1).setDepth(30);
    const abajo = this.add.rectangle(0, height, width, CINE.franja, 0x000000).setOrigin(0, 0).setDepth(30);
    this.tweens.add({ targets: arriba, y: CINE.franja, duration: 600, ease: 'Quad.out' });
    this.tweens.add({ targets: abajo, y: height - CINE.franja, duration: 600, ease: 'Quad.out' });

    // Carteles.
    this.time.delayedCall(CINE.cartel, () => {
      this.cartel = TextFX.letras(this, width / 2, height - 122, 'CHAPARE, BOLIVIA', { escala: 4, cada: 60, profundidad: 31 });
      this.time.delayedCall(1100, () => {
        this.subtitulo = TextFX.letras(this, width / 2, height - 82, 'AL AMANECER - ZONA ROJA', { escala: 2, color: 'plata', cada: 35, caida: 160, profundidad: 31 });
      });
    });

    // Pica hacia la selva: se inclina, acelera y las nubes pasan más rápido.
    this.time.delayedCall(CINE.pica, () => {
      if (this.cartel) this.cartel.salir(300);
      if (this.subtitulo) this.subtitulo.salir(300);
      this.tweens.add({ targets: this.heli, angle: 18, duration: 500, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.heliBase, x: width + 420, y: H.y + 120, duration: 1300, ease: 'Quad.in' });
      this.tweens.add({ targets: this, velocidad: 3.2, duration: 900, ease: 'Quad.in' });
      this.rotor.volumen(0.12, 1.2);
    });
    this.time.delayedCall(CINE.fin, () => this.salir());

    this.cameras.main.fadeIn(600, 0, 0, 0);
    // Saltar: cualquier tecla o toque (no la que se venía apretando).
    this.time.delayedCall(350, () => {
      this.input.keyboard.once('keydown', () => this.salir());
      this.input.once('pointerdown', () => this.salir());
    });
  }

  salir() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.rotor.volumen(0.0001, 0.5);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Nivel1'));
  }

  update(time, delta) {
    const { width } = this.scale;
    const dt = delta / 1000;
    const v = this.velocidad;
    // El helicóptero se mece un poco (y el ángulo sigue al vaivén).
    this.heli.setPosition(this.heliBase.x, this.heliBase.y + Math.sin(time / 320) * 7);
    this.nubes.forEach((n) => {
      n.nube.x -= n.velocidad * v * dt;
      if (n.nube.x < -n.nube.displayWidth) {
        n.nube.x = width + n.nube.displayWidth * Phaser.Math.RND.realInRange(0.5, 1.5);
        n.nube.y = Phaser.Math.Clamp(n.nube.y + Phaser.Math.RND.between(-60, 60), 80, 520);
      }
    });
    this.rayas.forEach((r) => {
      r.x -= 900 * v * dt;
      if (r.x < -100) { r.x = width + Phaser.Math.RND.between(0, 300); r.y = Phaser.Math.RND.between(90, this.scale.height - 90); }
    });
    this.capas.forEach((c) => { c.capa.tilePositionX += c.velocidad * v * dt / c.capa.scaleX; });
  }

  // Rayita de velocidad (una vez por juego).
  texturas() {
    const lienzo = (clave, w, h, dibujar) => {
      if (this.textures.exists(clave)) return;
      const t = this.textures.createCanvas(clave, w, h);
      dibujar(t.getContext(), w, h);
      t.refresh();
    };
    lienzo('cine_raya', 60, 2, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.9)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
  }
}
