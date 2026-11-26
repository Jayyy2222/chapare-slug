// =============================================================================
// Cinemática de la huida del jefe de la zona (JefeFinal): al vencerlo, en vez
// de ganar ahí mismo, se escapa en el helicóptero del Coronel Buitre. Sin
// control del jugador; cualquier tecla la salta. Unos 10 s:
//   1. derrota (0-1 s):        congelado 300 ms, destello; queda de rodillas
//                              temblando (vuelve a su tamaño). Se corta la música.
//   2. huida (1-3 s):          corre a la derecha, a la salida de la base,
//                              mirando atrás; la cámara lo sigue con lerp hasta
//                              un punto fijo afuera (el tope de la cámara).
//   3. helicóptero (3-5 s):    el rotor crece; entra arriba a la derecha y queda
//                              flotando; polvo y hojas abajo; baja la escalera.
//   4. se sube (5-6.5 s):      salta a la escalera y trepa; la escalera sube
//                              enrollándose y él entra al helicóptero.
//   5. el jefe (6.5-9 s):      zoom 1.3x a la puerta: se asoma burlándose; después
//                              asoma el Coronel Buitre en la ventanilla del
//                              copiloto (asomado, cortado en el umbral) y la
//                              cámara se acerca a él (2.1x). En su risa: risa
//                              malvada y temblor; música cómica corta.
//   6. se van (9-10 s):        zoom a 1x; el helicóptero gira, inclina la nariz
//                              y sale disparado arriba a la derecha dejando
//                              humo. "¡VUELVAN AQUÍ!" del héroe.
//   7. fin:                    registry 'coronelHuyo' (para el diálogo del nivel
//                              final) y directo MISIÓN COMPLETA (no hay que
//                              caminar hasta la salida).
//
// Afuera de la base (a la derecha de la sala, x > 1024) hay un claro de selva
// (cielo, cerros y selva de la entrada de Tuto) con la pared y la puerta.
// Hojas: herramientas/escape_cutscene.py -> assets/jefes/animacion/escape/.
// =============================================================================

const ESCAPE = {
  ruta: 'assets/jefes/animacion/escape/',
  pared: 1024,             // x de la pared de la base (el borde de la sala)
  puertaAlto: 175,         // alto de la puerta de la base
  // El exterior termina en el borde derecho de la vista fija (camaraFija +
  // 1024): la cámara queda fija afuera.
  fin: 2024,               // hasta dónde llega el exterior
  camaraFija: 1000,        // scrollX del punto fijo afuera de la base
  correA: 1560,            // x donde espera al helicóptero
  heli: { x: 1640, sobrePiso: 320, entra: [2500, -120] }, // ancla (alfombra) del helicóptero
  escalera: { largo: 190, baja: 500, sube: 850, x: 7, y: 36 }, // x, y: borde de abajo de la alfombra (respecto del ancla) // sube: lo que tarda en enrollarse (y él en llegar a la puerta)
  heroe: 1110,             // x donde aparece el héroe (salió de la base)
  zoom: 1.3,               // a la puerta (el enemigo burlándose)
  zoomCoronel: 2.1,        // después, a la ventanilla del copiloto (el Coronel)
  escalaBurla: 0.8,        // el busto del enemigo en la puerta (más grande tapaba la puerta)
  escalaCoronel: 1.05,     // la cabeza del Coronel asomada por la ventanilla
  // Cuánto pueden sobresalir del marco (px) y alto de la sombra sobre el cuerpo.
  asoma: { arriba: 26, costado: 22, sombra: 46 },
  // Trepando: la mano de arriba en la hoja sube.png (fracción de la celda): esa
  // mano va en el peldaño de la escalera.
  mano: [0.82, 0.03],
  t: { huida: 1000, heli: 3000, escalera: 4400, salta: 5000, jefe: 6500, coronel: 6900, vuelven: 9000, fin: 10000 }
};

function cargarEscape(escena) {
  const R = ESCAPE.ruta;
  if (!escena.cache.json.exists('escapeDatos')) escena.load.json('escapeDatos', R + 'escape.json');
  ['huida', 'sube', 'burla', 'coronel', 'helicoptero'].forEach((n) => {
    if (!escena.textures.exists('escape_hoja_' + n)) escena.load.image('escape_hoja_' + n, `${R}${n}.png`);
  });
  // El exterior, con lo mismo que el Nivel1 (que ya lo cargó; por si acaso).
  const lvl1 = 'assets/fondos/lvl1/';
  if (!escena.textures.exists('selvaFondo')) escena.load.image('selvaFondo', lvl1 + 'selva_fondo_288_calido.png');
  if (!escena.textures.exists('tilesSelva')) escena.load.spritesheet('tilesSelva', lvl1 + 'tileset_selva_64_calido.png', { frameWidth: 64, frameHeight: 64 });
  if (!escena.textures.exists('arbolesLejos')) escena.load.spritesheet('arbolesLejos', lvl1 + 'arboles_300x200_lejanos.png', { frameWidth: 300, frameHeight: 200 });
  if (!escena.textures.exists('arbolesMedio')) escena.load.spritesheet('arbolesMedio', lvl1 + 'arboles_300x200_medio.png', { frameWidth: 300, frameHeight: 200 });
}

function animacionesEscape(escena) {
  const d = escena.cache.json.get('escapeDatos');
  if (!d) return null;
  ['huida', 'sube', 'burla', 'coronel', 'helicoptero'].forEach((n) => {
    if (escena.textures.exists('escape_' + n) || !escena.textures.exists('escape_hoja_' + n)) return;
    escena.textures.addSpriteSheet('escape_' + n, escena.textures.get('escape_hoja_' + n).getSourceImage(), { frameWidth: d[n].ancho, frameHeight: d[n].alto });
  });
  const anim = (key, textura, frames, frameRate, repeat = -1) => {
    if (!escena.anims.exists(key)) escena.anims.create({ key, frames: frames.map((f) => ({ key: textura, frame: f })), frameRate, repeat });
  };
  anim('escape_corre', 'escape_huida', [1, 2, 3, 4, 5, 6, 7], 13);
  // Sin el cuadro 4 (la mano de arriba baja: parecía que flotaba sin agarrarse).
  anim('escape_sube', 'escape_sube', [0, 1, 2, 3, 5], 10);
  anim('escape_burla', 'escape_burla', [0, 1, 0, 1, 2, 2, 3, 4, 5, 4, 5], 6, 0);
  // El Coronel: asoma, sonríe, se ríe (6) y vuelve a sonreír.
  anim('escape_coronel', 'escape_coronel', [0, 1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3], 6, 0);
  anim('escape_rotor', 'escape_helicoptero', [0, 1, 2, 3], 18);
  return d;
}

// Texturas chicas: escalera de cuerda (se repite hacia abajo) y hoja.
function texturasEscape(escena) {
  const lienzo = (clave, w, h, dibujar) => {
    if (escena.textures.exists(clave)) return;
    const t = escena.textures.createCanvas(clave, w, h);
    dibujar(t.getContext(), w, h);
    t.refresh();
  };
  // Escalera de cuerda del ancho del borde de la alfombra (40 px): dos
  // cuerdas y un peldaño de madera cada 18 px.
  lienzo('escape_escalera', 40, 18, (c) => {
    c.fillStyle = '#5a3c1c'; c.fillRect(2, 0, 4, 18); c.fillRect(34, 0, 4, 18);
    c.fillStyle = '#c9a265'; c.fillRect(3, 0, 2, 18); c.fillRect(35, 0, 2, 18);
    c.fillStyle = '#6e4a22'; c.fillRect(4, 7, 32, 4);
    c.fillStyle = '#b08850'; c.fillRect(4, 7, 32, 2);
    c.fillStyle = '#3a2410'; c.fillRect(2, 8, 4, 2); c.fillRect(34, 8, 4, 2); // nudos
  });
  // Sombra del interior del helicóptero: transparente arriba y oscura abajo.
  lienzo('escape_sombra', 4, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(10,10,18,0)');
    g.addColorStop(0.55, 'rgba(10,10,18,0)');   // la cara queda con luz
    g.addColorStop(0.82, 'rgba(10,10,18,0.7)');
    g.addColorStop(1, 'rgba(10,10,18,0.95)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  lienzo('escape_hoja', 6, 4, (c) => {
    c.fillStyle = '#5d8a2e'; c.fillRect(1, 0, 4, 4); c.fillRect(0, 1, 6, 2);
    c.fillStyle = '#86b83a'; c.fillRect(1, 1, 3, 1);
  });
}

// Risa malvada (Web Audio): "¡ja ja ja ja!" que baja de tono, con voz ronca.
function risaMalvada(escena) {
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.masterVolumeNode || ctx.destination;
  const t0 = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const t = t0 + i * 0.16;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = 210 - i * 14;
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    const formante = ctx.createBiquadFilter();
    formante.type = 'bandpass';
    formante.frequency.value = 850;
    formante.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(formante).connect(g).connect(destino);
    o.start(t);
    o.stop(t + 0.15);
  }
}

// Música cómica corta: un "chan-chan" de tuba y trompeta y el "wa-wa-waaa" final.
function musicaComica(escena) {
  const ctx = escena.sound && escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.masterVolumeNode || ctx.destination;
  const t0 = ctx.currentTime + 0.05;
  const nota = (f, t, dura, tipo, vol, final = f) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (final !== f) o.frequency.linearRampToValueAtTime(final, t + dura);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + dura + 0.02);
  };
  const paso = 0.17;
  // Bajo (tuba) y melodía saltarina.
  [98, 147, 98, 147, 110, 165, 98, 147].forEach((f, i) => nota(f, t0 + i * paso, 0.15, 'triangle', 0.22));
  [392, 0, 494, 440, 392, 0, 330, 392].forEach((f, i) => { if (f) nota(f, t0 + i * paso, 0.12, 'square', 0.07); });
  // Wa-wa-waaa (trombón que baja).
  const t1 = t0 + 8 * paso + 0.05;
  [[311, 294, 0.22], [294, 277, 0.22], [277, 233, 0.6]].forEach(([a, b, d], i) => {
    nota(a, t1 + i * 0.26, d, 'sawtooth', 0.09, b);
  });
}

const AccionesEscape = {
  escapeCutscene() {
    const E = ESCAPE;
    const datos = animacionesEscape(this);
    if (!datos) { misionCompleta(this); return; } // sin hojas: el final de antes
    texturasEscape(this);
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    const piso = ARENA.piso;
    const v = this.escape = { objetos: [], eventos: [], tweens: [], updates: [], datos, terminado: false };
    const guardar = (o) => { v.objetos.push(o); return o; };
    const en = (ms, fn) => { const ev = this.time.delayedCall(ms, fn); v.eventos.push(ev); return ev; };
    const tween = (cfg) => { const t = this.tweens.add(cfg); v.tweens.push(t); return t; };
    const cadaCuadro = (fn) => { v.updates.push(fn); this.events.on('update', fn); };

    this.estado = 'cinematica';
    this.sinPausa = true;
    const j = this.jugador;
    j.setVelocity(0, j.body.velocity.y);
    // El HUD se esconde hasta el final.
    v.hud = this.children.list.filter((o) => o.scrollFactorX === 0 && o.depth >= 20 && o.visible);
    v.hud.forEach((o) => o.setData('alfaHud', o.alpha).setAlpha(0));
    this.crearExteriorBase();
    // El velo oscuro de la pelea (oscurecerSala) se apaga: si no, seguía al
    // jefe hasta afuera y dejaba media pantalla oscura y media clara (también
    // en la pantalla de MISIÓN COMPLETA).
    if (this.velo) { this.tweens.killTweensOf(this.velo); this.tweens.add({ targets: this.velo, alpha: 0, duration: 600 }); }

    // 1. DERROTA: congelado 300 ms, destello y queda de rodillas temblando.
    const gigante = this.jefe;
    v.gigante = gigante;
    const musica = this.sound.musicaActual;
    if (musica && musica.isPlaying) musica.stop();
    gigante.setTintFill(0xffffff);
    this.physics.pause();
    const enemigo = guardar(this.add.sprite(gigante.x, piso, 'escape_huida', 0).setOrigin(0.5, 1).setDepth(9.5).setVisible(false));
    v.enemigo = enemigo;
    en(300, () => {
      this.physics.resume();
      cam.flash(220, 255, 250, 235);
      sonidoUI(this, 'golpe');
      gigante.setVisible(false);
      this.jefe = enemigo; // la sombra lo sigue (actualizarSombras)
      enemigo.setVisible(true);
      v.tiembla = tween({ targets: enemigo, x: enemigo.x + 2, duration: 45, yoyo: true, repeat: -1 });
      chispas(this, enemigo.x, piso - 60, 10, -90, 200, 11);
    });

    // 2. HUIDA: corre a la derecha mirando atrás; la cámara lo sigue con lerp
    //    hasta el punto fijo afuera (el tope de la cámara).
    en(E.t.huida, () => {
      if (v.tiembla) v.tiembla.stop();
      enemigo.play('escape_corre');
      const dura = E.t.heli - E.t.huida;
      tween({ targets: enemigo, x: E.correA, duration: dura, ease: 'Linear' });
      cam.setBounds(0, 0, E.camaraFija + width, height);
      cam.startFollow(enemigo, false, 0.07, 0.07);
      // Polvo de los pies.
      v.eventos.push(this.time.addEvent({
        delay: 140, repeat: Math.floor(dura / 140) - 1, callback: () => {
          const p = guardar(this.add.particles(enemigo.x - 20, piso - 4, 'fx_humo', {
            speedX: { min: -80, max: -20 }, speedY: { min: -40, max: -5 }, lifespan: 380,
            scale: { start: 1, end: 2.4 }, alpha: { start: 0.5, end: 0 }, tint: 0xb8a080, emitting: false
          }).setDepth(9.4));
          p.explode(3);
        }
      }));
    });

    // 3. LLEGA EL HELICÓPTERO.
    en(E.t.heli, () => {
      enemigo.anims.stop();
      enemigo.setFrame(1).setFlipX(false); // manos arriba: ¡acá, acá!
      tween({ targets: enemigo, y: piso - 10, duration: 160, yoyo: true, repeat: 3 });
      v.rotor = sonidoHelicoptero(this, 0.05);
      v.rotor.volumen(0.3, 1.6);
      const hy = piso - E.heli.sobrePiso;
      // Un solo cuadro (los 4 de la lámina son dibujos distintos: animados,
      // temblaba) y encima el giro de los rotores dibujado. Van en un
      // contenedor: se mueve, se inclina y se da vuelta todo junto.
      const H = datos.helicoptero;
      const cuerpo = this.add.sprite(0, 0, 'escape_helicoptero', 0).setOrigin(H.ancla[0] / H.ancho, H.ancla[1] / H.alto);
      const rotor = this.add.graphics();
      const heli = guardar(this.add.container(E.heli.entra[0], E.heli.entra[1], [cuerpo, rotor]).setDepth(10.8).setAngle(-10));
      v.heli = heli;
      const [ex, ey, largo] = H.rotor.principal; // eje del rotor principal
      const [cx, cy, radio] = H.rotor.cola;
      cadaCuadro((time) => {
        if (!heli.active) return;
        const a = time * 0.045;
        rotor.clear();
        // Principal: el disco borroso y dos aspas que pasan (de costado se ven como líneas que se estiran).
        rotor.fillStyle(0xffffff, 0.14 + 0.06 * Math.sin(time * 0.05)).fillEllipse(ex, ey + 3, largo, 12);
        [a, a + Math.PI / 2].forEach((b) => {
          const c = Math.cos(b) * largo / 2;
          rotor.lineStyle(4, 0x2e3136, 0.85).lineBetween(ex - c, ey + 3, ex + c, ey + 3);
        });
        // Cola: disco y un aspa que gira.
        rotor.fillStyle(0xffffff, 0.16).fillCircle(cx, cy, radio);
        rotor.lineStyle(3, 0x2e3136, 0.8).lineBetween(cx + Math.cos(a * 1.6) * radio, cy + Math.sin(a * 1.6) * radio,
          cx - Math.cos(a * 1.6) * radio, cy - Math.sin(a * 1.6) * radio);
      });
      v.heliBase = { x: heli.x, y: heli.y };
      tween({ targets: v.heliBase, x: E.heli.x, y: hy, duration: 1500, ease: 'Cubic.out' });
      tween({ targets: heli, angle: 4, duration: 1100, ease: 'Sine.out', onComplete: () => tween({ targets: heli, angle: 0, duration: 400 }) });
      // Vaivén y todo lo que cuelga del helicóptero.
      cadaCuadro((time) => {
        if (!heli.active) return;
        heli.setPosition(v.heliBase.x, v.heliBase.y + Math.sin(time / 330) * 5);
      });
      // Polvo y hojas volando abajo cuando ya está cerca del piso.
      en(700, () => {
        v.polvo = guardar(this.add.particles(0, piso - 4, 'fx_humo', {
          x: { min: -90, max: 90 }, speedX: { min: -320, max: 320 }, speedY: { min: -60, max: -5 }, lifespan: 700,
          scale: { start: 1.6, end: 4 }, alpha: { start: 0.45, end: 0 }, tint: 0xcbb898, frequency: 40
        }).setDepth(9.45));
        v.hojas = guardar(this.add.particles(0, piso - 8, 'escape_hoja', {
          x: { min: -120, max: 120 }, speedX: { min: -380, max: 380 }, speedY: { min: -260, max: -60 }, gravityY: 300,
          rotate: { min: 0, max: 360 }, lifespan: 1100, scale: { min: 1.5, max: 2.5 }, alpha: { start: 1, end: 0 }, frequency: 70
        }).setDepth(10.9));
        cadaCuadro(() => {
          if (!heli.active || !v.polvo.active) return;
          const cerca = Phaser.Math.Clamp(1 - (piso - heli.y) / 600, 0, 1);
          v.polvo.setX(heli.x); v.hojas.setX(heli.x);
          v.polvo.setAlpha(cerca); v.hojas.setAlpha(cerca);
        });
      });
    });

    // ...baja la escalera de cuerda (estirada con un tween).
    en(E.t.escalera, () => {
      const L = E.escalera;
      const esc = guardar(this.add.tileSprite(0, 0, 40, 1, 'escape_escalera').setOrigin(0.5, 0).setDepth(10.75));
      // Los ganchos que la sujetan al borde de la alfombra (delante de ella).
      const ganchos = guardar(this.add.graphics().setDepth(10.82));
      v.escalera = esc;
      v.largo = { h: 1 };
      tween({ targets: v.largo, h: L.largo, duration: L.baja, ease: 'Bounce.out' });
      cadaCuadro(() => {
        if (!esc.active || !v.heli.active) return;
        esc.setPosition(v.heli.x + L.x, v.heli.y + L.y);
        ganchos.clear().fillStyle(0x8a8f98).fillRect(esc.x - 19, esc.y - 3, 6, 6).fillRect(esc.x + 13, esc.y - 3, 6, 6)
          .fillStyle(0xd0d4da).fillRect(esc.x - 18, esc.y - 3, 2, 2).fillRect(esc.x + 14, esc.y - 3, 2, 2);
        ganchos.setVisible(esc.visible);
        esc.height = Math.max(1, v.largo.h);
        esc.tilePositionY = -v.largo.h; // los peldaños suben con ella al enrollarse
      });
    });

    // 4. SE SUBE: salta a la escalera, trepa y la escalera sube enrollándose.
    en(E.t.salta, () => {
      const L = E.escalera;
      const x0 = enemigo.x, y0 = enemigo.y;
      enemigo.setFrame(3);
      const t = { p: 0 };
      tween({
        targets: t, p: 1, duration: 380, ease: 'Linear',
        onUpdate: () => {
          // Donde va a quedar colgado (la mano en el último peldaño): el cuerpo
          // a la izquierda de la escalera y los pies ~138 px más abajo.
          const ancho = datos.sube.ancho;
          const x1 = v.escalera.x - (E.mano[0] - 0.5) * ancho, y1 = v.escalera.y + v.largo.h - 22 + datos.sube.alto * (1 - E.mano[1]) - 6;
          enemigo.x = Phaser.Math.Linear(x0, x1, t.p);
          enemigo.y = Phaser.Math.Linear(y0, y1, t.p) - 90 * 4 * t.p * (1 - t.p);
        },
        onComplete: () => {
          // Trepa agarrado del último peldaño (origen en las manos), delante del
          // helicóptero: sube por la alfombra y entra por la puerta (la máscara
          // deja ver la puerta y todo lo de abajo; arriba de la puerta, no).
          const P = datos.helicoptero.puerta;
          const forma = this.make.graphics({}, false);
          v.objetos.push(forma);
          enemigo.setTexture('escape_sube', 0).setOrigin(E.mano[0], E.mano[1]).play('escape_sube').setDepth(10.9)
            .setMask(forma.createGeometryMask());
          this.jefe = null;
          this.sombraJefe.setVisible(false);
          // Se enrolla hasta dejar un tramo corto colgando de la alfombra (si no,
          // él quedaba colgado de nada antes de entrar).
          tween({ targets: v.largo, h: 18, duration: L.sube, ease: 'Sine.in' });
          v.entra = { d: 0 };
          let entrando = false;
          v.trepa = () => {
            if (!enemigo.active || !v.escalera.active || !v.heli.active) return;
            const px = v.heli.x + P[0], py = v.heli.y + P[1];
            forma.clear().fillStyle(0xffffff).fillRect(px, py, P[2], P[3]).fillRect(px - 60, py + P[3], P[2] + 120, piso);
            const abajo = v.escalera.y + v.largo.h - 22;
            const puertaX = px + P[2] / 2 + (E.mano[0] - 0.5) * datos.sube.ancho; // el cuerpo centrado en la puerta
            enemigo.setPosition(Phaser.Math.Linear(v.escalera.x, puertaX, v.entra.d), abajo - v.entra.d * (P[3] + 150));
            if (v.largo.h <= 18.5 && !entrando) {
              entrando = true;
              tween({
                targets: v.entra, d: 1, duration: 380, ease: 'Sine.in',
                onComplete: () => { enemigo.setVisible(false); v.escalera.setVisible(false); }
              });
            }
          };
          cadaCuadro(v.trepa);
        }
      });
    });

    // 5. EL JEFE: zoom a la puerta; se asoma burlándose y detrás el Coronel.
    en(E.t.jefe, () => {
      const P = datos.helicoptero.puerta;
      const puerta = () => ({ x: v.heli.x + P[0], y: v.heli.y + P[1], w: P[2], h: P[3] });
      const p = puerta();
      cam.stopFollow();
      cam.setBounds(0, 0, E.fin, height);
      cam.pan(p.x + p.w / 2, p.y + p.h / 2, 700, 'Sine.easeInOut');
      cam.zoomTo(E.zoom, 700, 'Sine.easeInOut');
      // El héroe ya salió de la base (mientras la cámara mira la puerta).
      this.physics.world.setBounds(ARENA.izquierda, 0, E.fin - ARENA.izquierda, height);
      j.body.reset(E.heroe, piso - 30 * ESCALA);
      j.setFlipX(false);
      // Los dos se asoman HACIA AFUERA: la cabeza sale por encima y al costado
      // del marco (se ve sobre el fuselaje) y el cuerpo se corta solo en el
      // borde de abajo (el umbral de la puerta y el de la ventanilla), con una
      // sombra que lo oscurece justo ahí: no se ve dónde termina el sprite.
      // Sin fondo propio detrás: se ve el vidrio oscuro del dibujo (con un
      // fondo aparte parecía una foto pegada).
      const VEN = datos.helicoptero.ventanilla;
      const ventanilla = () => ({ x: v.heli.x + VEN[0], y: v.heli.y + VEN[1], w: VEN[2], h: VEN[3] });
      const formaPuerta = this.make.graphics({}, false);
      const formaVentana = this.make.graphics({}, false);
      v.objetos.push(formaPuerta, formaVentana);
      const S = E.asoma;
      cadaCuadro(() => {
        if (!v.heli.active) return;
        const q = puerta(), w = ventanilla();
        // Todo lo que queda por encima del umbral (y un poco a los costados).
        // Miran al héroe (a la izquierda): sobresalen hacia ese lado.
        formaPuerta.clear().fillStyle(0xffffff).fillRect(q.x - S.costado, q.y - S.arriba, q.w + S.costado + 4, q.h + S.arriba);
        formaVentana.clear().fillStyle(0xffffff).fillRect(w.x - S.costado, w.y - S.arriba, w.w + S.costado, w.h + S.arriba);
      });
      // Las hojas miran a la derecha y el héroe está a la izquierda del
      // helicóptero: van espejadas para mirarlo (y señalarlo) a él.
      const burla = guardar(this.add.sprite(p.x + p.w / 2, p.y + p.h + 70, 'escape_burla', 0).setOrigin(0.5, 1).setDepth(10.9)
        .setScale(E.escalaBurla).setFlipX(true).setMask(formaPuerta.createGeometryMask()));
      const coronel = guardar(this.add.sprite(0, 0, 'escape_coronel', 0).setOrigin(1, 1).setDepth(10.85).setFlipX(true)
        .setScale(E.escalaCoronel).setMask(formaVentana.createGeometryMask()).setVisible(false));
      // Sombra sobre el cuerpo, en el umbral (degradado: transparente arriba).
      const sombra = guardar(this.add.image(0, 0, 'escape_sombra').setOrigin(0, 1).setDepth(10.91)
        .setMask(formaPuerta.createGeometryMask()));
      const sombraVentana = guardar(this.add.image(0, 0, 'escape_sombra').setOrigin(0, 1).setDepth(10.86)
        .setMask(formaVentana.createGeometryMask()).setVisible(false));
      v.burla = burla; v.coronel = coronel;
      v.dentro = { burla: 0, coronel: 0 }; // corrimiento (asomarse y esconderse)
      cadaCuadro(() => {
        if (!v.heli.active) return;
        const q = puerta(), w = ventanilla();
        // El enemigo: hombros justo sobre el umbral, inclinado hacia afuera.
        burla.setPosition(q.x + q.w / 2 - 8, q.y + q.h - 14 + v.dentro.burla); // la cara a la altura de la puerta
        sombra.setPosition(q.x - S.costado, q.y + q.h).setDisplaySize(q.w + S.costado + 4, S.sombra);
        // El Coronel: la cara asoma por arriba de la ventanilla mirando a la
        // izquierda; el borde recto de la hoja (espejada, a la derecha) queda
        // contra el marco. dentro.coronel < 0 lo esconde detrás del marco.
        coronel.setPosition(w.x + w.w - 1 - v.dentro.coronel, w.y + w.h + 8);
        sombraVentana.setPosition(w.x - S.costado, w.y + w.h).setDisplaySize(w.w + S.costado, S.sombra * 0.7);
      });
      v.dentro.burla = 60;
      tween({ targets: v.dentro, burla: 0, duration: 260, delay: 400, ease: 'Back.out', onStart: () => burla.play('escape_burla') });
      en(E.t.coronel - E.t.jefe, () => {
        coronel.setVisible(true);
        sombraVentana.setVisible(true);
        v.dentro.coronel = -28; // asoma desde el marco de la ventanilla
        // La cámara se acerca a él (sigue a la ventanilla, que se mece con el helicóptero).
        const w = ventanilla();
        // (force: si no, se ignoraban mientras terminaba el zoom a la puerta)
        cam.pan(w.x + w.w / 2, w.y + w.h / 2, 450, 'Sine.easeInOut', true);
        cam.zoomTo(E.zoomCoronel, 450, 'Sine.easeInOut', true);
        tween({ targets: v.dentro, coronel: 0, duration: 320, ease: 'Sine.out' });
        coronel.play('escape_coronel');
        musicaComica(this);
        coronel.on('animationupdate', (anim, cuadro) => {
          if (Number(cuadro.frame.name) === 6 && !v.rio) {
            v.rio = true;
            risaMalvada(this);
            cam.shake(260, 0.004);
          }
        });
      });
    });

    // 6. SE VAN: zoom a 1x; gira, inclina la nariz y sale disparado dejando humo.
    en(E.t.vuelven, () => {
      cam.zoomTo(1, 500, 'Sine.easeInOut', true);
      cam.pan(E.camaraFija + width / 2, height / 2, 500, 'Sine.easeInOut', true);
      tween({ targets: v.dentro, burla: 80, coronel: -40, duration: 220, ease: 'Sine.in' });
      const heli = v.heli;
      // Gira hacia la derecha (de frente un instante) y pica.
      tween({
        targets: heli, scaleX: -1, duration: 320, ease: 'Sine.inOut',
        onComplete: () => {
          tween({ targets: heli, angle: 14, duration: 250 });
          tween({ targets: v.heliBase, x: E.fin + 500, y: -320, duration: 1100, ease: 'Quad.in' });
          v.rotor.volumen(0.0001, 1.1);
          v.humo = guardar(this.add.particles(0, 0, 'fx_humo', {
            speedX: { min: -60, max: -10 }, speedY: { min: -20, max: 20 }, lifespan: 900,
            scale: { start: 2, end: 5 }, alpha: { start: 0.55, end: 0 }, tint: 0x8a8a8a, frequency: 35
          }).setDepth(10.7));
          cadaCuadro(() => { if (heli.active && v.humo.active) v.humo.setPosition(heli.x - 200, heli.y - 90); });
        }
      });
      if (v.polvo) v.polvo.stop();
      if (v.hojas) v.hojas.stop();
      // "¡VUELVAN AQUÍ!" en un globo sobre el héroe.
      en(250, () => this.globoHeroe('¡VUELVAN AQUÍ!'));
    });

    // 7. FIN.
    en(E.t.fin, () => this.terminarEscape(false));

    // Cualquier tecla la salta (no la que se venía apretando).
    en(400, () => {
      v.saltar = () => this.terminarEscape(true);
      this.input.keyboard.once('keydown', v.saltar);
      this.input.once('pointerdown', v.saltar);
    });
    this.events.once('shutdown', () => this.limpiarEscape());
  },

  // El exterior de la base, como el Nivel1: la selva de fondo, árboles en dos
  // capas y el piso de piedra con pasto del tileset. La sala termina en la
  // pared de la base: tablones con el alero de paja y la puerta abierta.
  crearExteriorBase() {
    const E = ESCAPE;
    const { height } = this.scale;
    const piso = ARENA.piso;
    const ancho = E.fin - E.pared;
    // Selva de fondo (la del nivel, escalada al alto de la pantalla).
    const fondo = this.textures.get('selvaFondo').getSourceImage();
    const e = height / fondo.height;
    this.add.tileSprite(E.pared, 0, ancho / e, fondo.height, 'selvaFondo').setOrigin(0).setScale(e).setDepth(0.1);
    // Árboles lejanos y medios (sin repetir el mismo seguido).
    [['arbolesLejos', piso - 40, 1.6, 0.2, [300, 420]], ['arbolesMedio', piso + 4, 2, 0.3, [420, 620]]].forEach(([textura, base, escala, prof, sep], k) => {
      let anterior = -1;
      for (let x = E.pared + 120 + k * 150; x < E.fin + 200; x += Phaser.Math.Between(...sep)) {
        const cuadro = (anterior + Phaser.Math.Between(1, 2)) % 3;
        anterior = cuadro;
        this.add.image(x, base, textura, cuadro).setOrigin(0.5, 1).setScale(escala).setDepth(prof).setFlipX(Math.random() < 0.5);
      }
    });
    // Piso: tiles del nivel a x2 (el pasto asoma 16 px sobre el suelo, como en Nivel1).
    const T = 128, arriba = piso - 16;
    for (let x = E.pared, i = 0; x < E.fin + T; x += T, i++) {
      this.add.image(x, arriba, 'tilesSelva', i === 0 ? 0 : Phaser.Math.RND.pick([1, 2, 3])).setOrigin(0).setScale(2).setDepth(0.4);
      for (let y = arriba + T; y < height; y += T) {
        this.add.image(x, y, 'tilesSelva', Phaser.Math.RND.pick([5, 6, 7])).setOrigin(0).setScale(2).setDepth(0.4);
      }
    }
    // La pared de la base: tablones arriba de la puerta, postes a los lados
    // y el alero de paja que sobresale hacia afuera.
    const g = this.add.graphics().setDepth(9.9);
    const x0 = E.pared - 24, x1 = E.pared + 30, dintel = piso - E.puertaAlto;
    g.fillStyle(0x4a3018).fillRect(x0, 0, x1 - x0, dintel);
    [0x7a5230, 0x6b4728, 0x83593a, 0x6b4728].forEach((col, i) => g.fillStyle(col).fillRect(x0 + 2 + i * 13, 0, 11, dintel));
    for (let y = 40; y < dintel; y += 70) g.fillStyle(0xc9a265).fillRect(x0, y, x1 - x0, 3); // amarras
    g.fillStyle(0x3a2410).fillRect(x0 - 6, dintel - 6, x1 - x0 + 12, 12);                    // dintel
    g.fillStyle(0x5a3a1c).fillRect(x0, dintel, 10, E.puertaAlto).fillRect(x1 - 10, dintel, 10, E.puertaAlto); // postes
    // Alero de paja: capas que caen en diagonal hacia afuera.
    for (let k = 0; k < 5; k++) {
      const y = 70 + k * 16;
      g.fillStyle(k % 2 ? 0xc9a24a : 0xb08a38);
      g.fillTriangle(x0 - 10, y - 50, x1 + 150 - k * 6, y + 26, x0 - 10, y + 26);
    }
    g.lineStyle(2, 0x7a5a20, 0.8);
    for (let x = x1; x < x1 + 140; x += 9) g.lineBetween(x, 110 + (x - x1) * 0.22, x + 3, 140 + (x - x1) * 0.18);
    // Sombra del alero sobre la pared de afuera.
    g.fillStyle(0x000000, 0.18).fillRect(x1, 0, 18, dintel);
    // El piso de afuera (la sala ya tiene el suyo).
    this.piso.add(this.add.zone(E.pared + ancho / 2, piso + 30, ancho, 60));
  },

  // Globo de diálogo sobre el héroe.
  globoHeroe(texto) {
    const v = this.escape;
    const j = this.jugador;
    const t = TextFX.texto(this, 0, 0, texto, { color: 'negro', escala: 2 }).setOrigin(0.5).setDepth(41);
    const w = t.anchoTexto + 28, h = t.altoTexto + 20; // (es un contenedor: width es 0)
    // A la derecha del héroe (la cola apunta a su cabeza): a la izquierda se
    // salía de la pantalla, porque él queda en el borde.
    const x = j.x + w / 2 + 10, y = j.y - 150;
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(0xffffff, 1).lineStyle(3, 0x1a0e04, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    const cx = x - w / 2 + 22; // la cola, cerca del borde izquierdo del globo
    g.fillTriangle(cx - 6, y + h / 2 - 2, cx + 8, y + h / 2 - 2, cx - 16, y + h / 2 + 18);
    g.lineStyle(3, 0x1a0e04, 1).lineBetween(cx - 6, y + h / 2, cx - 16, y + h / 2 + 18).lineBetween(cx - 16, y + h / 2 + 18, cx + 8, y + h / 2);
    t.setPosition(x, y);
    const globo = [g, t];
    globo.forEach((o) => o.setScale(0.3));
    this.tweens.add({ targets: globo, scale: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({ targets: t, x: x + 2, duration: 50, yoyo: true, repeat: 5 }); // grita
    this.time.delayedCall(1700, () => this.tweens.add({ targets: globo, alpha: 0, duration: 300, onComplete: () => globo.forEach((o) => o.destroy()) }));
    if (v) v.objetos.push(g, t);
  },

  // Termina (o se salta): guarda que el Coronel huyó y es MISIÓN COMPLETA.
  terminarEscape(saltada) {
    const v = this.escape;
    if (!v || v.terminado) return;
    v.terminado = true;
    const E = ESCAPE;
    const { height } = this.scale;
    const cam = this.cameras.main;
    if (v.saltar) { this.input.keyboard.off('keydown', v.saltar); this.input.off('pointerdown', v.saltar); }
    this.registry.set('coronelHuyo', true); // para el diálogo del nivel final
    const j = this.jugador;
    if (saltada) {
      // Salta al final: todo afuera, el héroe en la puerta, sin zoom.
      this.limpiarEscape();
      this.physics.resume();
      this.physics.world.setBounds(ARENA.izquierda, 0, E.fin - ARENA.izquierda, height);
      j.body.reset(E.heroe, ARENA.piso - 30 * ESCALA);
      if (v.gigante && v.gigante.active) v.gigante.setVisible(false);
      if (this.velo) { this.tweens.killTweensOf(this.velo); this.velo.setAlpha(0); }
      this.jefe = null;
      this.sombraJefe.setVisible(false);
      cam.stopFollow();
      cam.zoomTo(1, 1);
      cam.setScroll(E.camaraFija, 0);
      this.globoHeroe('¡VUELVAN AQUÍ!');
    } else {
      // Lo que queda (el helicóptero ya se fue) se borra en un rato.
      this.time.delayedCall(1500, () => this.limpiarEscape());
    }
    // Vuelven el HUD y la música, y directo MISIÓN COMPLETA (Estado.js): la
    // tabla de puntaje aparece sobre la escena congelada.
    v.hud.forEach((o) => this.tweens.add({ targets: o, alpha: o.getData('alfaHud') ?? 1, duration: 400 }));
    const musica = this.sound.musicaActual;
    if (musica && !musica.isPlaying) musica.play();
    j.setVelocityX(0);
    this.estado = 'ganado';
    misionCompleta(this);
  },

  // Borra todo lo de la cinemática: sprites, efectos, tweens, eventos y sonidos.
  limpiarEscape() {
    const v = this.escape;
    if (!v || v.limpio) return;
    v.limpio = true;
    v.updates.forEach((fn) => this.events.off('update', fn));
    if (v.saltar) { this.input.keyboard.off('keydown', v.saltar); this.input.off('pointerdown', v.saltar); }
    v.eventos.forEach((e) => e.remove(false));
    v.tweens.forEach((t) => t.stop());
    v.objetos.forEach((o) => { if (o && o.active) { this.tweens.killTweensOf(o); o.destroy(); } });
    if (v.rotor) v.rotor.parar(0.3);
  }
};

Object.assign(JefeFinal.prototype, AccionesEscape);
