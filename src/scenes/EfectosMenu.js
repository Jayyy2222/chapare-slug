// =============================================================================
// Efectos para el menú y la selección de personaje (estilo Metal Slug):
// balas trazadoras, chispas, brasas, humo, explosiones lejanas, fuego,
// reflectores, viñeta y el "golpe" del título con chispas y balazos.
//
// Las texturas se generan acá en pixel art (sin anti-aliasing), así que no
// hacen falta archivos. Se usan desde Menu.js y CharacterSelectScene.js.
// =============================================================================

const COLOR_FX = {
  chispa: [0xfff6c0, 0xffd23f, 0xff8a1a],
  fuego: [0xfff0a0, 0xffb02a, 0xe8541a, 0x8a2a10]
};

// Dibuja una textura chica píxel por píxel: filas de caracteres -> colores.
function texturaPixeles(escena, clave, filas, colores) {
  if (escena.textures.exists(clave)) return;
  const g = escena.make.graphics({ add: false });
  filas.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (colores[c] !== undefined) g.fillStyle(colores[c]).fillRect(x, y, 1, 1);
  }));
  g.generateTexture(clave, filas[0].length, filas.length);
  g.destroy();
}

// Círculo tramado (bordes en escalones de alfa, sin degradé liso).
function texturaCirculoTramado(escena, clave, radio, color, niveles = [0.25, 0.5, 0.8, 1]) {
  if (escena.textures.exists(clave)) return;
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const g = escena.make.graphics({ add: false });
  for (let y = 0; y < radio * 2; y++) {
    for (let x = 0; x < radio * 2; x++) {
      const d = Math.hypot(x + 0.5 - radio, y + 0.5 - radio) / radio;
      if (d >= 1) continue;
      const v = (1 - d) * niveles.length;
      const nivel = Math.min(niveles.length - 1, Math.floor(v + bayer[y % 4][x % 4] / 16) - 1);
      if (nivel < 0) continue;
      g.fillStyle(color, niveles[nivel]).fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture(clave, radio * 2, radio * 2);
  g.destroy();
}

function texturasEfectos(escena) {
  if (escena.textures.exists('fx_bala')) return;
  // Bala trazadora: cabeza blanca, cuerpo amarillo, cola naranja (apunta a la derecha).
  texturaPixeles(escena, 'fx_bala', [
    '....oooyyyyyyyww.',
    '.oooyyyyyyyywwww',
    '....oooyyyyyyyww.'
  ], { o: 0xc8641a, y: 0xffd23f, w: 0xffffff });
  texturaPixeles(escena, 'fx_chispa', ['wy', 'yo'], { w: 0xffffff, y: 0xffd23f, o: 0xff8a1a });
  texturaPixeles(escena, 'fx_brasa', ['oy', 'ro'], { y: 0xffe080, o: 0xff8a1a, r: 0xc83a10 });
  texturaPixeles(escena, 'fx_casquillo', ['kyyw', 'kooy'], { k: 0x5a3a10, y: 0xe0b040, o: 0xa07020, w: 0xfff0b0 });
  // Fogonazo de disparo: estrella de 4 puntas.
  texturaPixeles(escena, 'fx_fogonazo', [
    '......w......',
    '......y......',
    '.....yyy.....',
    '.....ywy.....',
    '..y.yywyy.y..',
    '...yywwwyy...',
    'wyyywwwwwyyyw',
    '...yywwwyy...',
    '..y.yywyy.y..',
    '.....ywy.....',
    '.....yyy.....',
    '......y......',
    '......w......'
  ], { w: 0xffffff, y: 0xffd23f });
  texturaCirculoTramado(escena, 'fx_humo', 10, 0x5a554a, [0.15, 0.3, 0.45, 0.6]);
  // Humo claro (el puf del NPC de la hamburguesa) y polvo de tierra: el tinte
  // solo oscurece, así que necesitan su propio color.
  texturaCirculoTramado(escena, 'fx_puf', 10, 0xf4f0e6, [0.3, 0.55, 0.8, 0.95]);
  texturaCirculoTramado(escena, 'fx_polvo', 8, 0xcdbb98, [0.25, 0.45, 0.65, 0.8]);
  texturaCirculoTramado(escena, 'fx_explosion', 16, 0xffb02a, [0.3, 0.6, 0.85, 1]);
  texturaCirculoTramado(escena, 'fx_llama', 5, 0xff9a2a, [0.4, 0.75, 1]);
  // Agujero de bala: centro negro con borde claro astillado.
  texturaPixeles(escena, 'fx_agujero', [
    '.l.l.',
    'lkkkl',
    '.kkk.',
    'lkkkl',
    '.l.l.'
  ], { k: 0x120a04, l: 0xc8b890 });
  texturaVineta(escena);
  texturaHaz(escena);
}

// Viñeta: bordes oscuros tramados, para centrar la mirada (y tapar esquinas).
function texturaVineta(escena) {
  if (escena.textures.exists('fx_vineta')) return;
  const ancho = 512;   // a x2: tramado fino
  const alto = 288;
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const g = escena.make.graphics({ add: false });
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const dx = (x + 0.5) / ancho * 2 - 1;
      const dy = (y + 0.5) / alto * 2 - 1;
      const d = Math.max(0, Math.hypot(dx * 0.85, dy) - 0.78) / 0.5; // solo los bordes
      const nivel = Math.floor(Math.min(1, d) * 4 + bayer[y % 4][x % 4] / 16);
      if (nivel <= 0) continue;
      g.fillStyle(0x000000, [0, 0.2, 0.38, 0.55, 0.7][Math.min(4, nivel)]).fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture('fx_vineta', ancho, alto);
  g.destroy();
}

// Haz de reflector: cono angosto en el origen, ancho al final (para ADD).
function texturaHaz(escena) {
  if (escena.textures.exists('fx_haz')) return;
  const largo = 220;
  const ancho = 70;
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const g = escena.make.graphics({ add: false });
  for (let x = 0; x < largo; x++) {
    const t = x / largo;
    const medio = (ancho / 2) * (0.08 + t * 0.92);
    for (let y = 0; y < ancho; y++) {
      const u = Math.abs(y + 0.5 - ancho / 2) / medio;
      if (u >= 1) continue;
      const v = (1 - u) * (1 - t * 0.85) * 3;
      const nivel = Math.floor(v + bayer[y % 4][x % 4] / 16);
      if (nivel <= 0) continue;
      g.fillStyle(0xfff0c0, [0, 0.12, 0.22, 0.32][Math.min(3, nivel)]).fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture('fx_haz', largo, ancho);
  g.destroy();
}

// --- Piezas sueltas -----------------------------------------------------------

// Explosión de chispas en (x, y). dir (grados) y abertura orientan el abanico.
function chispas(escena, x, y, cantidad = 14, dir = -90, abertura = 140, profundidad = 50) {
  const emisor = escena.add.particles(x, y, 'fx_chispa', {
    speed: { min: 120, max: 420 }, angle: { min: dir - abertura / 2, max: dir + abertura / 2 },
    gravityY: 700, lifespan: { min: 250, max: 650 }, scale: { start: 2, end: 0.5 },
    tint: COLOR_FX.chispa, blendMode: 'ADD', emitting: false
  }).setDepth(profundidad);
  emisor.explode(cantidad);
  escena.time.delayedCall(800, () => emisor.destroy());
}

// Fogonazo breve (disparo o impacto).
function fogonazo(escena, x, y, escala = 2, profundidad = 50, angulo = 0) {
  const f = escena.add.image(x, y, 'fx_fogonazo').setScale(escala).setAngle(angulo)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidad);
  escena.tweens.add({ targets: f, alpha: 0, scale: escala * 1.4, duration: 110, onComplete: () => f.destroy() });
}

// Casquillo que sale volando, gira y cae.
function casquillo(escena, x, y, profundidad = 50) {
  const c = escena.add.image(x, y, 'fx_casquillo').setScale(2).setDepth(profundidad);
  const lado = Phaser.Math.Between(0, 1) ? 1 : -1;
  escena.tweens.add({ targets: c, x: x + lado * Phaser.Math.Between(30, 70), angle: lado * 720, duration: 650 });
  escena.tweens.add({
    targets: c, y: y - Phaser.Math.Between(30, 60), duration: 220, ease: 'Quad.out',
    onComplete: () => escena.tweens.add({
      targets: c, y: y + 120, alpha: 0, duration: 430, ease: 'Quad.in', onComplete: () => c.destroy()
    })
  });
}

// Bala trazadora de (x0,y0) a (x1,y1) con estela de chispas. alLlegar(x, y)
// se llama en el punto final (impacto).
function trazadora(escena, x0, y0, x1, y1, opciones = {}) {
  const { velocidad = 1500, profundidad = 5, escala = 2, alLlegar } = opciones;
  const angulo = Phaser.Math.RadToDeg(Math.atan2(y1 - y0, x1 - x0));
  const bala = escena.add.image(x0, y0, 'fx_bala').setScale(escala).setAngle(angulo)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidad);
  const estela = escena.add.particles(0, 0, 'fx_brasa', {
    follow: bala, lifespan: 160, speed: 0, scale: { start: escala * 0.8, end: 0 },
    alpha: { start: 0.8, end: 0 }, frequency: 16, blendMode: 'ADD'
  }).setDepth(profundidad - 0.1);
  const duracion = (Phaser.Math.Distance.Between(x0, y0, x1, y1) / velocidad) * 1000;
  escena.tweens.add({
    targets: bala, x: x1, y: y1, duration: duracion,
    onComplete: () => {
      if (alLlegar) alLlegar(x1, y1);
      bala.destroy();
      estela.stop();
      escena.time.delayedCall(200, () => estela.destroy());
    }
  });
}

// --- Fondo de batalla --------------------------------------------------------

// Capa de batalla animada encima de un fondo: humo que pasa, brasas que suben,
// trazadoras cruzando, explosiones lejanas (sobre la línea del horizonte),
// reflectores, fuegos y viñeta. opciones:
//   horizonte: y donde ocurren las explosiones lejanas
//   fuegos:    [[x, y, tamaño]] fogatas animadas con columna de humo
//   reflectores: [[x, y, ánguloCentro]]
//   profundidad: base de profundidad de la capa
function fondoBatalla(escena, opciones = {}) {
  const { width, height } = escena.scale;
  const {
    horizonte = height * 0.6, fuegos = [], reflectores = [], profundidad = 1,
    trazadoras: conTrazadoras = true, explosiones = true
  } = opciones;
  texturasEfectos(escena);

  // Reflectores que barren el cielo despacio.
  reflectores.forEach(([x, y, centro], i) => {
    const haz = escena.add.image(x, y, 'fx_haz').setOrigin(0, 0.5).setScale(4)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidad).setAngle(centro - 18);
    escena.tweens.add({
      targets: haz, angle: centro + 18, duration: 4200 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 700
    });
  });

  // Explosiones lejanas: destello, bola de fuego, humo y escombros.
  if (explosiones) {
    const explotar = () => {
      const x = Phaser.Math.Between(width * 0.08, width * 0.92);
      const y = horizonte + Phaser.Math.Between(-20, 15);
      const bola = escena.add.image(x, y, 'fx_explosion').setScale(0.6).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(profundidad + 0.2).setAlpha(0.9);
      escena.tweens.add({ targets: bola, scale: 2.6, alpha: 0, duration: 520, ease: 'Quad.out', onComplete: () => bola.destroy() });
      const humo = escena.add.particles(x, y, 'fx_humo', {
        speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 }, lifespan: 2400,
        scale: { start: 1.5, end: 4 }, alpha: { start: 0.55, end: 0 }, emitting: false
      }).setDepth(profundidad + 0.1);
      humo.explode(8);
      chispas(escena, x, y, 10, -90, 120, profundidad + 0.3);
      escena.time.delayedCall(2600, () => humo.destroy());
      escena.time.delayedCall(Phaser.Math.Between(1600, 3800), explotar);
    };
    escena.time.delayedCall(900, explotar);
  }

  // Fuegos: llamas que titilan (partículas ADD) y una columna de humo.
  fuegos.forEach(([x, y, tam = 1]) => {
    escena.add.particles(x, y, 'fx_humo', {
      speedX: { min: 4, max: 18 }, speedY: { min: -45, max: -25 }, lifespan: 4200,
      scale: { start: 1 * tam, end: 4 * tam }, alpha: { start: 0.45, end: 0 }, frequency: 220
    }).setDepth(profundidad + 0.1);
    escena.add.particles(x, y, 'fx_llama', {
      x: { min: -10 * tam, max: 10 * tam }, speedY: { min: -70, max: -30 }, speedX: { min: -8, max: 8 },
      lifespan: { min: 300, max: 600 }, scale: { start: 2 * tam, end: 0.3 }, tint: COLOR_FX.fuego,
      blendMode: 'ADD', frequency: 40
    }).setDepth(profundidad + 0.2);
  });

  // Humo bajo que cruza la pantalla.
  escena.add.particles(-60, 0, 'fx_humo', {
    y: { min: horizonte - 40, max: height }, speedX: { min: 18, max: 40 }, speedY: { min: -6, max: 4 },
    lifespan: 26000, scale: { min: 4, max: 9 }, alpha: { start: 0.18, end: 0 }, frequency: 650
  }).setDepth(profundidad + 0.4);

  // Brasas que suben desde abajo, ondulando.
  escena.add.particles(0, height + 10, 'fx_brasa', {
    x: { min: 0, max: width }, speedY: { min: -90, max: -40 }, speedX: { min: -20, max: 20 },
    lifespan: { min: 3000, max: 6000 }, scale: { min: 1.5, max: 3 }, alpha: { start: 1, end: 0 },
    blendMode: 'ADD', frequency: 90, accelerationX: { min: -12, max: 12 }
  }).setDepth(profundidad + 0.5);

  // Trazadoras que cruzan; a veces rebotan con chispas.
  if (conTrazadoras) {
    const disparar = () => {
      const izq = Phaser.Math.Between(0, 1) === 0;
      const y0 = Phaser.Math.Between(height * 0.1, height * 0.8);
      const y1 = y0 + Phaser.Math.Between(-140, 140);
      const rebota = Phaser.Math.Between(0, 3) === 0;
      const xFin = rebota ? Phaser.Math.Between(width * 0.3, width * 0.7) : (izq ? width + 60 : -60);
      const yFin = rebota ? (y0 + y1) / 2 : y1;
      const rafaga = Phaser.Math.Between(1, 3);
      for (let k = 0; k < rafaga; k++) {
        escena.time.delayedCall(k * 90, () => trazadora(escena, izq ? -40 : width + 40, y0 + k * 6, xFin, yFin + k * 6, {
          profundidad: profundidad + 0.6,
          alLlegar: rebota ? (x, y) => chispas(escena, x, y, 12, izq ? 200 : -20, 120, profundidad + 0.7) : null
        }));
      }
      escena.time.delayedCall(Phaser.Math.Between(500, 1500), disparar);
    };
    escena.time.delayedCall(400, disparar);
  }

  // Viñeta encima de todo el fondo.
  escena.add.image(0, 0, 'fx_vineta').setOrigin(0).setDisplaySize(width, height).setDepth(profundidad + 0.9);
}

// --- Título -------------------------------------------------------------------

// El título cae y "golpea" la pantalla (sacudida + chispas + polvo), después
// un brillo lo recorre cada tanto y algunas balas le pegan dejando agujeros.
// alTerminar: se llama tras el golpe (para mostrar el resto del menú).
function golpeTitulo(escena, titulo, opciones = {}) {
  const { profundidad = 40, balazos = true, alTerminar } = opciones;
  texturasEfectos(escena);
  const escala = titulo.scaleX;
  const yFinal = titulo.y;
  titulo.setDepth(profundidad).setScale(escala * 2.6).setAlpha(0).setY(yFinal - 30);

  escena.tweens.add({
    targets: titulo, scale: escala, alpha: 1, y: yFinal, duration: 380, ease: 'Quad.in', delay: 250,
    onComplete: () => {
      escena.cameras.main.shake(220, 0.012);
      const b = titulo.getBounds();
      // Chispas que salen de los costados de abajo y polvo del impacto.
      chispas(escena, b.left + b.width * 0.15, b.bottom - 6, 22, -120, 90, profundidad + 1);
      chispas(escena, b.right - b.width * 0.15, b.bottom - 6, 22, -60, 90, profundidad + 1);
      chispas(escena, b.centerX, b.bottom - 4, 18, -90, 160, profundidad + 1);
      const polvo = escena.add.particles(b.centerX, b.bottom, 'fx_humo', {
        x: { min: -b.width / 2, max: b.width / 2 }, speedY: { min: -40, max: -10 }, speedX: { min: -60, max: 60 },
        lifespan: 1200, scale: { start: 1.5, end: 3.5 }, alpha: { start: 0.5, end: 0 }, emitting: false
      }).setDepth(profundidad - 1);
      polvo.explode(18);
      escena.time.delayedCall(1400, () => polvo.destroy());
      // Rebote chico del título.
      escena.tweens.add({ targets: titulo, scaleY: escala * 0.92, duration: 70, yoyo: true });
      brilloTitulo(escena, titulo, profundidad + 0.5);
      if (balazos) balazosTitulo(escena, titulo, profundidad + 1);
      if (alTerminar) alTerminar();
    }
  });
}

// Franja de luz diagonal que cruza el título (recortada con su silueta).
function brilloTitulo(escena, titulo, profundidad) {
  const b = titulo.getBounds();
  const brillo = escena.add.rectangle(b.left - 80, b.centerY, 40, b.height * 1.6, 0xffffff, 0.55)
    .setAngle(20).setBlendMode(Phaser.BlendModes.ADD).setDepth(profundidad);
  const mascara = titulo.createBitmapMask();
  brillo.setMask(mascara);
  escena.tweens.add({
    targets: brillo, x: b.right + 80, duration: 900, ease: 'Sine.inOut', repeat: -1, repeatDelay: 2600
  });
}

// De vez en cuando una bala le pega al título: fogonazo, chispas, tiembla y
// queda un agujero que se borra solo.
function balazosTitulo(escena, titulo, profundidad) {
  const { width } = escena.scale;
  const disparo = () => {
    const b = titulo.getBounds();
    const x = Phaser.Math.Between(b.left + b.width * 0.1, b.right - b.width * 0.1);
    const y = Phaser.Math.Between(b.top + b.height * 0.25, b.bottom - b.height * 0.25);
    const desdeIzq = x > width / 2;
    trazadora(escena, desdeIzq ? -40 : width + 40, y + Phaser.Math.Between(-60, 60), x, y, {
      profundidad: profundidad + 1, velocidad: 2200,
      alLlegar: (hx, hy) => {
        fogonazo(escena, hx, hy, 1.6, profundidad + 2);
        chispas(escena, hx, hy, 16, desdeIzq ? 200 : -20, 130, profundidad + 2);
        const agujero = escena.add.image(hx, hy, 'fx_agujero').setScale(2).setDepth(profundidad);
        escena.tweens.add({ targets: agujero, alpha: 0, delay: 2500, duration: 800, onComplete: () => agujero.destroy() });
        const x0 = titulo.x;
        escena.tweens.add({ targets: titulo, x: x0 + (desdeIzq ? 4 : -4), duration: 40, yoyo: true, repeat: 1, onComplete: () => titulo.setX(x0) });
      }
    });
    escena.time.delayedCall(Phaser.Math.Between(1800, 3600), disparo);
  };
  escena.time.delayedCall(1200, disparo);
}
