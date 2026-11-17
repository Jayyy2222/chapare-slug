// =============================================================================
// Fondo animado del menú: atardecer en la selva del Chapare, con capas de
// assets/menu_bg/ (recortadas de assets/menu/fondo1-3.jpeg con
// herramientas/menu_fondo_capas.py).
//
// Todo se arma a la resolución del arte (512x288) dentro de contenedores
// dibujados a x2, así los píxeles quedan iguales a los del resto del juego.
// Cada grupo de capas es un contenedor con su propia profundidad (CAPAS_MENU),
// para poder intercalar el logo y las luces de Menu.js en el orden correcto.
// La cámara no se mueve: el parallax es un paneo automático de cada capa.
// =============================================================================

const FONDO_ARTE = { ancho: 512, alto: 288, escala: 2 };

// Orden de dibujo de toda la pantalla de título (de atrás para adelante).
const CAPAS_MENU = {
  cielo: 0,          // cielo fijo + nubes
  montanas: 1,
  niebla: 2,
  selva: 3,          // selva y río
  rio: 3.5,          // destellos del agua y reflejo del sol (ADD)
  pajaros: 4,        // bandada lejana y paraba
  hojas: 5,          // hojas del primer plano (contraluz)
  mariposas: 5.5,
  luciernagas: 6,
  overlay: 20,       // sombra oscura detrás del logo + viñeta
  sol: 22,           // glow del sol detrás del cóndor
  rayos: 23,         // haces de luz, detrás del logo
  montanaLogo: 24,
  condor: 25,
  aguayo: 26,
  polvo: 26.5,       // nubes de polvo del golpe (detrás de las letras)
  bolivia: 27,
  slug: 28,
  chispas: 29,
  brillo: 30,
  bandaStart: 31,
  start: 32,
  opciones: 45,
  panel: 60,
  flash: 90,
  negro: 95
};

// Cuadros de las hojas de sprites (ver assets/menu_bg/menu_bg.json).
const FONDO_SPRITES = {
  paraba: { ancho: 105, alto: 69 },
  mariposa: { ancho: 43, alto: 32 },
  brillo: { ancho: 36, alto: 38 }
};

// Capas con paneo: y de arriba (en px de arte) y velocidad en px por cuadro a
// 60 fps (tilePositionX +=).
const FONDO_CAPAS = {
  nubes: { y: 0, velocidad: 0.05 },
  montanas: { y: 112, velocidad: 0.1 },
  selva: { y: 170, velocidad: 0.3 },
  hojas: { y: 298, velocidad: 0.6 }   // y = base: las hojas se cuelgan desde abajo
};

// Nieblas entre las montañas y la selva: textura, y, velocidad, alfa mínimo y
// máximo del tween que respira. Quedan por encima de la base de las montañas
// (y=174): una niebla clara justo ahí marcaba una línea blanca en el horizonte.
const FONDO_NIEBLAS = [
  { textura: 'niebla2', y: 148, velocidad: 0.18, alfa: [0.3, 0.45], duracion: 4200 },
  { textura: 'niebla3', y: 152, velocidad: 0.07, alfa: [0.35, 0.5], duracion: 5600 },
  { textura: 'niebla1', y: 146, velocidad: 0.24, alfa: [0.3, 0.42], duracion: 3600 }
];

// Unión montañas/selva: franja suave del color del horizonte que tapa el
// corte recto de la base de las montañas (y en px de arte).
const FONDO_UNION = { arriba: 158, base: 174, abajo: 184, color: [200, 52, 92] };

// Franja del río (en px de arte) donde aparecen los brillos del agua.
const FONDO_RIO = { x: [70, 442], y: [258, 284], cada: [250, 650] };
// Columna del reflejo del sol en el río (x = debajo del sol).
const FONDO_REFLEJO = { x: 256, y: [254, 286], ancho: [3, 14] };

// Vuelos: nacen y desaparecen a esta distancia fuera del borde (px de arte).
const FONDO_FUERA = 40;

function cargarFondoMenu(escena) {
  const ruta = 'assets/menu_bg/';
  ['cielo', 'nubes', 'montanas', 'selva', 'hojas', 'bandada', 'niebla1', 'niebla2', 'niebla3']
    .forEach((n) => escena.load.image('menubg_' + n, ruta + n + '.png'));
  Object.entries(FONDO_SPRITES).forEach(([n, c]) => escena.load.spritesheet('menubg_' + n, ruta + n + '.png', {
    frameWidth: c.ancho, frameHeight: c.alto
  }));
}

function menuConWebGL(escena) {
  return escena.renderer.type === Phaser.WEBGL;
}

// Arma el fondo y lo anima.
function fondoMenu(escena) {
  const { ancho, escala } = FONDO_ARTE;
  const azar = Phaser.Math.Between;
  const tex = (n) => 'menubg_' + n;
  const webgl = menuConWebGL(escena);
  const capaCont = (nombre) => escena.add.container(0, 0).setScale(escala).setDepth(CAPAS_MENU[nombre]);

  crearAnimacionesFondo(escena);
  texturasFondo(escena);

  const paneo = [];
  const capa = (nombre, origenY = 0) => {
    const c = FONDO_CAPAS[nombre];
    const alto = escena.textures.get(tex(nombre)).getSourceImage().height;
    const t = escena.add.tileSprite(ancho / 2, c.y, ancho, alto, tex(nombre)).setOrigin(0.5, origenY);
    paneo.push([t, c.velocidad]);
    return t;
  };

  // 1. Cielo fijo y nubes que se corren muy lento.
  capaCont('cielo').add([escena.add.image(0, 0, tex('cielo')).setOrigin(0), capa('nubes')]);

  // 2. Montañas.
  capaCont('montanas').add(capa('montanas'));

  // 3. Nieblas semitransparentes que respiran.
  const nieblas = capaCont('niebla');
  FONDO_NIEBLAS.forEach((n) => {
    const alto = escena.textures.get(tex(n.textura)).getSourceImage().height;
    const t = escena.add.tileSprite(ancho / 2, n.y, ancho, alto, tex(n.textura))
      .setOrigin(0.5, 0).setAlpha(n.alfa[0]);
    t.tilePositionX = azar(0, 400);
    paneo.push([t, n.velocidad]);
    escena.tweens.add({
      targets: t, alpha: n.alfa[1], duration: n.duracion, ease: 'Sine.inOut', yoyo: true, repeat: -1
    });
    nieblas.add(t);
  });

  // 4. Selva y río. Debajo, la franja que funde la base de las montañas con
  //    el horizonte (sin línea blanca).
  const u = FONDO_UNION;
  capaCont('selva').add([
    escena.add.image(ancho / 2, u.arriba, 'menubg_union').setOrigin(0.5, 0).setDisplaySize(ancho, u.abajo - u.arriba),
    capa('selva')
  ]);

  // 5. Agua: destellos al azar y el reflejo del sol (todo en ADD).
  const agua = capaCont('rio');
  const brillo = () => {
    const b = escena.add.sprite(azar(...FONDO_RIO.x), azar(...FONDO_RIO.y), tex('brillo'))
      .setScale(Phaser.Math.FloatBetween(0.25, 0.4)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
    agua.add(b);
    b.play('menubg_brillo');
    b.once('animationcomplete', () => b.destroy());
    escena.time.delayedCall(azar(...FONDO_RIO.cada), brillo);
  };
  brillo();
  agua.add(reflejoSol(escena));

  // 6. Pájaros: la bandada a lo lejos y la paraba.
  const aves = capaCont('pajaros');

  // 7. Hojas del primer plano a contraluz: más oscuras, con un borde naranja
  //    de 1 px del lado del sol (una copia teñida, 1 px más arriba, detrás).
  const hojasCont = capaCont('hojas');
  const hojas = capa('hojas', 1).setTint(0x7a4a33);
  const hojasMecer = [hojas];
  if (webgl) {
    const borde = escena.add.tileSprite(hojas.x, hojas.y - 1, ancho, hojas.height, tex('hojas'))
      .setOrigin(0.5, 1).setTintFill(0xff8a3a).setAlpha(0.5);
    paneo.push([borde, FONDO_CAPAS.hojas.velocidad]);
    hojasCont.add(borde);
    hojasMecer.push(borde);
  }
  hojasCont.add(hojas);
  // Se mecen desde la base (±2°).
  hojasMecer.forEach((h) => h.setAngle(-2));
  escena.tweens.add({ targets: hojasMecer, angle: 2, duration: 2600, ease: 'Sine.inOut', yoyo: true, repeat: -1 });

  // 8. Mariposas, cerca de las hojas.
  const cerca = capaCont('mariposas');

  // 9. Luciérnagas.
  capaCont('luciernagas').add(luciernagas(escena));

  // Vuelos.
  const programar = (min, max, fn) => {
    const otra = () => escena.time.delayedCall(azar(min, max), () => { fn(); otra(); });
    otra();
  };
  // La paraba vuela en la franja y 150-230 (contando la onda y su alto), así
  // nunca pasa por la banda de PRESIONA START (que además va por encima).
  programar(4000, 7000, () => {
    const escalaAve = Phaser.Math.FloatBetween(0.5, 0.65);
    const medioAlto = (FONDO_SPRITES.paraba.alto * escalaAve) / 2;
    const onda = azar(6, 12);
    vuelo(escena, aves, {
      textura: tex('paraba'), anim: 'menubg_paraba', escala: escalaAve,
      y: azar(150 + medioAlto + onda, 230 - medioAlto - onda), onda,
      ciclos: Phaser.Math.FloatBetween(1, 2), duracion: azar(5500, 8000)
    });
  });
  programar(11000, 18000, () => vuelo(escena, aves, {
    textura: tex('bandada'), escala: 0.45, alfa: 0.7, y: azar(55, 95),
    onda: 3, ciclos: 1.5, duracion: azar(16000, 22000), aleteo: true
  }));
  programar(9000, 15000, () => vuelo(escena, cerca, {
    textura: tex('mariposa'), anim: 'menubg_mariposa', escala: 0.4,
    y: azar(205, 235), onda: azar(8, 14), ciclos: azar(4, 6), duracion: azar(9000, 12000), zigzag: true
  }));

  // Paneo automático (velocidades por cuadro a 60 fps).
  const actualizar = (_t, delta) => {
    const k = delta / (1000 / 60);
    paneo.forEach(([t, v]) => { t.tilePositionX += v * k; });
  };
  escena.events.on('update', actualizar);
  escena.events.once('shutdown', () => escena.events.off('update', actualizar));

  // Overlay oscuro: sombra detrás del logo (negro al 30%) y viñeta que
  // oscurece los bordes. La viñeta es una imagen y no el addVignette de la
  // cámara: ese efecto baja el alfa del borde y deja ver el color de fondo del
  // juego (beige), así que lavaba la pantalla en vez de oscurecerla.
  sombraLogo(escena);
  escena.add.image(escena.scale.width / 2, 180, 'menubg_sombra').setDepth(CAPAS_MENU.overlay);
  escena.add.image(escena.scale.width / 2, escena.scale.height / 2, vinetaSuave(escena))
    .setDisplaySize(escena.scale.width, escena.scale.height).setDepth(CAPAS_MENU.overlay + 0.5);
}

// Viñeta suave (radio ~0.8 de la media diagonal, fuerza ~0.4): transparente en
// el centro y negra hacia las esquinas.
function vinetaSuave(escena) {
  const clave = 'menubg_vineta';
  if (escena.textures.exists(clave)) return clave;
  const ancho = 512;
  const alto = 288;
  const lienzo = escena.textures.createCanvas(clave, ancho, alto);
  const ctx = lienzo.getContext();
  ctx.save();
  ctx.translate(ancho / 2, alto / 2);
  ctx.scale(1, alto / ancho);
  const r = ancho / 2 / 0.8 * 0.95;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(0.8, 'rgba(0,0,0,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(-ancho, -ancho, ancho * 2, ancho * 2);
  ctx.restore();
  lienzo.refresh();
  return clave;
}

function crearAnimacionesFondo(escena) {
  const anims = escena.anims;
  const crear = (key, config) => { if (!anims.exists(key)) anims.create({ key, ...config }); };
  crear('menubg_paraba', {
    frameRate: 9, repeat: -1, yoyo: true,
    frames: anims.generateFrameNumbers('menubg_paraba', { start: 0, end: 3 })
  });
  crear('menubg_mariposa', {
    frameRate: 10, repeat: -1,
    frames: anims.generateFrameNumbers('menubg_mariposa', { start: 0, end: 1 })
  });
  crear('menubg_brillo', {
    frameRate: 9,
    frames: anims.generateFrameNumbers('menubg_brillo', { start: 0, end: 2 })
  });
}

// Texturas generadas: unión del horizonte, luciérnaga y destello del reflejo.
function texturasFondo(escena) {
  if (!escena.textures.exists('menubg_union')) {
    const { arriba, base, abajo, color: [r, g, b] } = FONDO_UNION;
    const alto = abajo - arriba;
    const lienzo = escena.textures.createCanvas('menubg_union', 4, alto);
    const ctx = lienzo.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, alto);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop((base - arriba) / alto, `rgba(${r},${g},${b},0.9)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, alto);
    lienzo.refresh();
  }
  const pixel = (clave, ancho, alto, dibujar) => {
    if (escena.textures.exists(clave)) return;
    const g = escena.make.graphics({ add: false });
    dibujar(g);
    g.generateTexture(clave, ancho, alto);
    g.destroy();
  };
  pixel('menubg_luz', 3, 3, (g) => {
    g.fillStyle(0xffd23f, 0.5).fillRect(0, 1, 3, 1).fillRect(1, 0, 1, 3);
    g.fillStyle(0xfff6a0, 1).fillRect(1, 1, 1, 1);
  });
  // Rayita horizontal de luz sobre el agua: centro claro, puntas naranjas.
  pixel('menubg_destello', 6, 1, (g) => {
    g.fillStyle(0xff9a3a, 0.7).fillRect(0, 0, 6, 1);
    g.fillStyle(0xffe6a0, 1).fillRect(1, 0, 4, 1);
  });
}

// Reflejo del sol en el río: una columna vertical de rayitas de luz (ADD) que
// titilan y se abren hacia abajo, como el sol sobre el agua.
function reflejoSol(escena) {
  const { x, y, ancho } = FONDO_REFLEJO;
  return escena.add.particles(0, 0, 'menubg_destello', {
    // Cada rayita elige una fila; la columna se abre hacia abajo.
    x: {
      onEmit: (p) => {
        p.ancla = Math.random();
        p.filaY = y[0] + Math.pow(Math.random(), 1.4) * (y[1] - y[0]);
        const abierto = ancho[0] + (ancho[1] - ancho[0]) * (p.filaY - y[0]) / (y[1] - y[0]);
        return x + (p.ancla * 2 - 1) * abierto;
      }
    },
    y: { onEmit: (p) => p.filaY },
    scaleX: { min: 0.5, max: 1.6 },
    scaleY: 1,
    lifespan: { min: 250, max: 700 },
    alpha: {
      onEmit: () => 0,
      onUpdate: (p, _k, t) => Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(t * 40 + p.ancla * 9))
    },
    frequency: 35,
    maxAliveParticles: 22,
    blendMode: Phaser.BlendModes.ADD
  });
}

// Cruza la pantalla de un lado al otro con una onda suave en Y (seno). Nace y
// desaparece del todo fuera de la pantalla (x < -40 o x > 552, en px de arte).
// o: textura, anim, escala, alfa, y, onda (amplitud), ciclos, duracion,
//    aleteo (bandada sin cuadros: se estira en Y), zigzag (mariposa: va y viene un poco).
function vuelo(escena, capa, o) {
  const { ancho } = FONDO_ARTE;
  const ZIGZAG = 14;
  const haciaDerecha = Math.random() < 0.5;
  const ave = escena.add.sprite(0, o.y, o.textura).setScale(o.escala).setAlpha(o.alfa ?? 1);
  // Los sprites miran a la derecha.
  ave.setFlipX(!haciaDerecha);
  if (o.anim) ave.play({ key: o.anim, startFrame: Phaser.Math.Between(0, 1) });
  capa.add(ave);
  const margen = FONDO_FUERA + ave.displayWidth / 2 + (o.zigzag ? ZIGZAG : 0);
  const [desde, hasta] = haciaDerecha ? [-margen, ancho + margen] : [ancho + margen, -margen];
  const fase = Math.random() * Math.PI * 2;
  const avance = { t: 0 };
  const colocar = () => {
    const t = avance.t;
    const onda = Math.sin(fase + t * o.ciclos * Math.PI * 2);
    let x = desde + (hasta - desde) * t;
    if (o.zigzag) x += Math.sin(t * Math.PI * 2 * o.ciclos * 1.7) * ZIGZAG;
    ave.setPosition(x, o.y + onda * o.onda);
    if (o.aleteo) ave.setScale(o.escala, o.escala * (0.85 + 0.15 * Math.abs(Math.sin(t * 90))));
  };
  colocar();
  escena.tweens.add({ targets: avance, t: 1, duration: o.duracion, onUpdate: colocar, onComplete: () => ave.destroy() });
}

// Luciérnagas: puntitos amarillos (ADD) que suben despacio, se prenden y
// apagan, y a veces parpadean. Como mucho 25 a la vez.
function luciernagas(escena) {
  const { ancho } = FONDO_ARTE;
  return escena.add.particles(0, 0, 'menubg_luz', {
    x: { min: 0, max: ancho },
    y: { min: 150, max: 290 },
    lifespan: { min: 4500, max: 8000 },
    speedX: { min: -4, max: 4 },
    speedY: { min: -6, max: -1.5 },
    scale: { min: 0.7, max: 1.2 },
    alpha: {
      onEmit: (p) => { p.fase = Math.random() * 100; p.parpadea = Math.random() < 0.35; return 0; },
      onUpdate: (p, _k, t) => {
        const vida = Math.sin(t * Math.PI);
        const respira = 0.6 + 0.4 * Math.sin(t * 14 + p.fase);
        const apagon = p.parpadea && Math.sin(t * 31 + p.fase) > 0.85 ? 0.1 : 1;
        return vida * respira * apagon;
      }
    },
    frequency: 260,
    maxAliveParticles: 25,
    blendMode: Phaser.BlendModes.ADD
  });
}

// Mancha negra al 30% detrás del logo (elipse que se desvanece hacia afuera).
function sombraLogo(escena) {
  if (escena.textures.exists('menubg_sombra')) return;
  const anchoT = 960;
  const altoT = 440;
  const lienzo = escena.textures.createCanvas('menubg_sombra', anchoT, altoT);
  const ctx = lienzo.getContext();
  ctx.save();
  ctx.translate(anchoT / 2, altoT / 2);
  ctx.scale(1, altoT / anchoT);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, anchoT / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-anchoT / 2, -anchoT / 2, anchoT, anchoT);
  ctx.restore();
  lienzo.refresh();
}
