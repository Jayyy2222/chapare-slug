// =============================================================================
// NIVEL 2 · LA PERSECUCIÓN DEL TÍO. No es una escena aparte: es la segunda
// parte de la caverna (CavernaJefe.js). Cuando el Tío sale de la estatua, la
// arena se vuelve infierno, el piso empieza a romperse y caer a la lava desde
// la izquierda y el jugador corre a la derecha: el mundo sigue, sin cortes,
// con el mapa de la persecución repetido sin fin (un tramo normal y uno
// espejado) hasta vencer al Tío. Acá están el Tío (AccionesTio) y el camino
// que se destruye; CavernaJefe los mezcla en su prototipo.
//
// El piso es el mismo dibujo del mapa: herramientas/caverna_jefe.py separa la
// franja del piso (arena_piso.png, persecucion_piso.png) del resto
// (*_fondo.png) y el juego la corta en bloques de JEFE2.bloque px. Al
// alcanzarlos el frente de destrucción, cada bloque se agrieta (grietas de
// lava que brillan), tiembla, se parte en pedazos de su misma textura que
// caen girando a la lava, y queda la lava (lava_tile.png) que estaba debajo.
// El altar se hunde entero. Caer a la lava quema (una barra de vida) y lanza
// al jugador al primer bloque firme de adelante.
//
// El Tío (medio cuerpo, gigante, hundido hasta la cintura en la lava) sigue a
// la cámara, que avanza sola. Ataques (hojas jefe_*.png):
//   garra   persigue: se estira con la mano de lava (de cerca)
//   lata    lanza: tira una lata en arco que explota
//   fuego   fuego: escupe una llamarada hacia el jugador
//   suelo   suelo: golpea el piso y una onda de explosiones corre por el
//           suelo (se salta)
// Brilla rojo (glow), echa brasas y humo negro, y su propia luz lo deja ver
// en lo oscuro. Al morir se vuelve piedra y se derrumba: MISIÓN COMPLETA.
// =============================================================================

const JEFE2 = {
  vida: 160,
  // Cintura: x en pantalla (todo el cuerpo a la vista) e y en el mundo
  // (hundido en la lava). escala: su tamaño en la persecución.
  x: 250, y: 500, escala: 0.8,
  // El paso (andar): ms por paso, cuánto se hunde y avanza en cada uno.
  paso: { ms: 1150, baja: 12, empuje: 14, inclina: 0.035 },
  camara: 70,                     // px/s que avanza la cámara sola
  pausa: [1500, 2500],            // ms entre ataques
  torso: { x: -120, y: -320, w: 250, h: 300 }, // caja que recibe balas (desde la cintura)
  garra: { alcance: 440, alto: [-270, -40] },
  lata: { vuelo: 0.95, radio: 80 },
  fuego: { boca: [118, -248], velocidad: 520, dura: 950, cada: 32 },
  suelo: { paso: 72, cada: 90, ondas: 9 },
  piedras: [2600, 4200],
  frente: 330,                    // px delante de la cintura del Tío hasta donde se rompe el piso (fuera de su pozo: que se vea)
  avance: 260,                    // px/s máximos a los que avanza la destrucción
  bloque: 96,                     // ancho de cada bloque del piso
  rompe: { grieta: 380, abre: 260, cae: 1300 },
  // En el infierno el piso es una costra (alto px de arriba del dibujo) sobre
  // un lago de lava cuya superficie está en la y `lava`.
  costra: { alto: 46, lava: 500 }, // ms: las grietas avanzan, se abre, los pedazos caen
  lava: 518,                      // y: más abajo que esto, el jugador cayó a la lava
  dano: 14,                       // cada cuánto daño se encoge
  puntos: 5000
};

// El mapa de un tramo de la persecución (se repite) y cuánto se sube para que
// su piso quede a la altura del de la arena (482 → 476).
const TRAMO_PERSECUCION = 2322;
const TRAMO_DY = -6;
// Pedazos del mapa (x0, x1), cortados donde el fondo es negro (se juntan sin
// que se note). El último del mapa (la boca del túnel) no va.
const SEGMENTOS = [[0, 1040], [1040, 1399], [1399, 2220]];

const AccionesTio = {
  // ---------------------------------------------------------------------------
  // Arranque: el Tío (ya en pantalla, rugiendo) empieza a perseguir.
  // ---------------------------------------------------------------------------

  // El corte de la cinemática (bajo un destello, con la cámara cerca): el
  // altar ya se hundió, alrededor ya es lava y el Tío ya está hundido hasta la
  // cintura, respirando. Al alejarse la cámara se ve así, sin transición.
  tioALaLava() {
    const tio = this.tio;
    const A = this.altarPiedra;
    this.lavaVisible();
    A.firme = false;
    A.zonas.forEach((z) => { z.body.enable = false; });
    A.img.setVisible(false);
    this.bloques.forEach((b) => { if (b.estado === 'firme' && b.x1 > A.x0 - 80 && b.x0 < A.x1 + 10) this.bloqueALava(b); });
    tio.anims.stop();
    this.ponerHoja('ruge', 0);
    tio.clearTint().setScale(JEFE2.escala).setPosition(tio.x, JEFE2.y);
    this.tioBase = tio.x;
    this.pasoDesde = this.time.now;
    this.pasoAntes = 0;
    this.tioX = 0;
    this.efectosTio();
    // El jugador, a salvo del otro lado.
    const j = this.jugador;
    if (j.x < A.x1 + 120) {
      const x = A.x1 + 170;
      j.body.reset(x, this.superficie(x, 300).y - 30 * ESCALA);
      j.setFlipX(true);
    }
    for (let k = 0; k < 6; k++) this.salpicar(Phaser.Math.Between(A.x0, A.x1), this.cfg.piso + 18, 1.5);
    const lejos = this.capas.find((c) => c.texture.key === 'cavPersLejos');
    if (lejos) lejos.setAlpha(1);
    // Del marco de roca de adelante queda solo lo de arriba (lo de abajo
    // tapaba el piso que se rompe y la lava).
    if (this.marco) this.marco.setCrop(0, 0, this.marco.frame.width, this.marco.frame.height * 0.4);
    this.enLava = true;
  },

  iniciarPersecucion() {
    texturaLata(this);
    if (!this.enLava) this.tioALaLava();
    this.tioVida = JEFE2.vida;
    this.tioDano = 0;
    this.tioX = 0;
    this.llamas2 = [];
    // El piso se sigue rompiendo desde el altar hacia adelante.
    this.frente = this.altarPiedra.x1 + 20;
    this.lata = this.physics.add.group({ allowGravity: true });
    this.physics.add.collider(this.lata, [this.solidos, this.plataformas], (l) => this.explotarLata(l));
    this.physics.add.overlap(this.jugador, this.lata, (j, l) => this.explotarLata(l));
    this.agregarTramo();
    this.agregarTramo();
    this.agregarTramo();
    this.tioEstado = 'persigue';
    this.proximoAtaque = this.time.now + 2600;
    this.andar();
    const piedras = () => {
      if (this.tioEstado === 'muere' || !this.scene.isActive()) return;
      if (this.estado === 'control') this.piedraDelTecho(this.jugador.x + Phaser.Math.Between(-120, 220));
      this.time.delayedCall(Phaser.Math.Between(...JEFE2.piedras), piedras);
    };
    this.time.delayedCall(3000, piedras);
  },

  // Brillo rojo, contraluz, brasas, humo negro y su propia luz (sin Light2D:
  // se ve con sus colores, no apagado por lo oscuro).
  efectosTio() {
    const tio = this.tio;
    tio.resetPipeline();
    this.contraluz = this.add.image(tio.x, tio.y - 200, 'tun_luzCalida').setTint(0xff2a10).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.6).setAlpha(0.55).setDepth(9.3);
    this.tweens.add({ targets: this.contraluz, alpha: 0.3, scale: 3.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (tio.preFX && this.sys.renderer.type === Phaser.WEBGL) {
      // Brillo suave (fuerte, parecía un recorte con borde).
      this.brilloTio = tio.preFX.addGlow(0xff4a18, 1.2, 0, false, 0.1, 8);
      this.tweens.add({ targets: this.brilloTio, outerStrength: 2.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.tioFantasma = this.add.image(tio.x, tio.y, tio.texture.key, tio.frame.name).setDepth(9.41).setVisible(false);
    // Hundido en la lava: un pozo de lava delante de la cintura (borde
    // ondulado) tapa el corte del dibujo; burbujea y salpica.
    texturaPozo(this);
    this.pozo = this.add.image(tio.x, JEFE2.y - 40, 'tio_pozo').setOrigin(0.5, 0).setDepth(9.45);
    this.pozoBrillo = this.add.image(tio.x, JEFE2.y - 40, 'tio_pozo').setOrigin(0.5, 0).setDepth(9.46)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
    this.time.addEvent({ delay: 260, loop: true, callback: () => {
      if (this.tioEstado === 'muere' || !this.pozo.visible) return;
      this.salpicar(this.pozo.x + Phaser.Math.Between(-250, 250), this.pozo.y + 26, Phaser.Math.FloatBetween(0.6, 1.1));
      if (Math.random() < 0.5) {
        const b = this.add.sprite(this.tio.x + Phaser.Math.Between(-160, 160), this.tio.y - Phaser.Math.Between(60, 300), 'cav_lava_brasas', 0)
          .setDepth(9.5).setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
        b.play('lava_brasas');
        this.tweens.add({ targets: b, y: b.y - 60, alpha: 0, duration: 500, onComplete: () => b.destroy() });
      }
    } });
    this.brasasTio = this.add.particles(0, 0, 'fx_chispa', {
      x: { min: -150, max: 140 }, y: { min: -300, max: -20 }, speedY: { min: -120, max: -40 }, speedX: { min: -30, max: 30 },
      lifespan: { min: 700, max: 1500 }, scale: { start: 2, end: 0.3 }, alpha: { start: 1, end: 0 },
      tint: [0xffd040, 0xff7020, 0xff3010], blendMode: 'ADD', frequency: 35
    }).setDepth(9.5);
    this.humoTio = this.add.particles(0, 0, 'fx_humo', {
      x: { min: -120, max: 80 }, y: { min: -320, max: -220 }, speedY: { min: -60, max: -20 }, speedX: { min: -20, max: 20 },
      lifespan: 1800, scale: { start: 1.6, end: 4 }, alpha: { start: 0.45, end: 0 }, tint: 0x1a0606, frequency: 110
    }).setDepth(9.35);
    this.focoTio = this.nuevoFoco(tio.x, tio.y - 180, { radio: 340, color: 0xff3a18, intensidad: 1.6, brillo: 0.25, pulso: 0.2, ritmo: 1.6 });
  },

  moverTio(time) {
    const tio = this.tio;
    const cam = this.cameras.main;
    if (this.tioEstado !== 'muere') {
      // Sigue a la cámara; respira, se mece, sube y baja en la lava, se tira
      // hacia adelante con cada zarpazo y el fuego lo ilumina titilando.
      // Camina en la lava: en cada paso se hunde un poco, se inclina hacia
      // ese lado y empuja hacia adelante; al pisar, la lava salpica y tiembla.
      const P = JEFE2.paso;
      const fase = ((time - this.pasoDesde) / P.ms) * Math.PI; // un paso = media vuelta
      const pisada = Math.abs(Math.sin(fase));                    // 0 al pisar, 1 arriba
      const paso = Math.floor(fase / Math.PI);
      if (paso !== this.pasoAntes) { this.pasoAntes = paso; this.pisada(paso); }
      this.tioBase = Math.max(this.tioBase, cam.scrollX + JEFE2.x);
      tio.x = this.tioBase + pisada * P.empuje + (this.tioX || 0);
      {
        tio.y = JEFE2.y + (1 - pisada) * P.baja;
        tio.setScale(JEFE2.escala * (1 + (1 - pisada) * 0.01), JEFE2.escala * (1 - (1 - pisada) * 0.015));
      }
      tio.setRotation((paso % 2 ? 1 : -1) * P.inclina * pisada + (this.tioX || 0) * 0.0012);
      if (time > (this.flashTio || 0)) {
        const f = 0.85 + Math.sin(time / 70) * 0.06 + Math.sin(time / 23) * 0.04;
        tio.setTint(Phaser.Display.Color.GetColor(255, Math.round(225 * f), Math.round(200 * f)));
      }
      if (this.tioEstado === 'persigue' && this.estado === 'control' && time > this.proximoAtaque) this.elegirAtaque();
    }
    if (this.pozo) {
      // (Termina antes del borde del piso que todavía no se rompió.)
      const px = tio.x - 50;
      this.pozo.setPosition(px, JEFE2.y - 40 + Math.sin(time / 350) * 3).setScale(0.7, 1 + Math.sin(time / 280) * 0.06);
      this.pozoBrillo.setPosition(px + Math.sin(time / 200) * 8, this.pozo.y).setScale(0.7, 1).setAlpha(0.25 + Math.sin(time / 180) * 0.12);
    }
    // El cuadro anterior se desvanece encima del nuevo (sin saltos entre cuadros).
    if (this.tioFantasma) {
      if (this.cuadroAntes && this.cuadroAntes !== tio.frame) {
        const f = this.cuadroAntes;
        this.tioFantasma.setTexture(f.texture.key, f.name).setOrigin(this.origenAntes.x, this.origenAntes.y).setAlpha(0.9).setVisible(true);
        this.tweens.killTweensOf(this.tioFantasma);
        // (Más largo al cambiar de hoja: de andar a un ataque y vuelta.)
        const otraHoja = f.texture.key !== tio.texture.key;
        this.tweens.add({ targets: this.tioFantasma, alpha: 0, duration: otraHoja ? 320 : 220, onComplete: () => this.tioFantasma.setVisible(false) });
      }
      this.cuadroAntes = tio.frame;
      this.origenAntes = { x: tio.originX, y: tio.originY };
      this.tioFantasma.setPosition(tio.x, tio.y).setScale(tio.scaleX, tio.scaleY).setRotation(tio.rotation).setTint(tio.tintTopLeft);
    }
    if (this.contraluz) this.contraluz.setPosition(tio.x - 10, tio.y - 190);
    if (this.brasasTio) this.brasasTio.setPosition(tio.x, tio.y);
    if (this.humoTio) this.humoTio.setPosition(tio.x, tio.y);
    if (this.focoTio) this.focoTio.mover(tio.x, tio.y - 180);
  },

  // Andar: los cuadros de ruge (poses parecidas: no salta), uno por paso.
  // Andar: camina.jpeg (solo el torso: de la cintura para abajo está en la lava).
  andar() {
    if (this.tioEstado === 'muere') return;
    this.ponerHoja('camina', 0);
    this.tio.play('jefe2_camina');
    // Un paso de la hoja por pisada (JEFE2.paso.ms cada dos cuadros).
    this.tio.anims.msPerFrame = JEFE2.paso.ms / 2;
  },

  // Cada pisada: cambia de pie (cuadro), la lava salpica y el piso tiembla.
  pisada(paso) {
    if (this.tioEstado !== 'persigue') return;
    this.salpicar(this.tio.x + Phaser.Math.Between(60, 160) * JEFE2.escala, this.cfg.piso + 16, 1.1);
    this.cameras.main.shake(140, 0.0035);
    sonarPisada(this);
  },

  salpicar(x, y, escala = 1) {
    const sp = this.add.sprite(x, y, 'cav_lava_salpica', 0).setOrigin(0.5, 1).setDepth(9.47).setScale(escala)
      .setBlendMode(Phaser.BlendModes.ADD);
    sp.play('lava_salpica');
    sp.once('animationcomplete', () => sp.destroy());
  },

  ponerHoja(nombre, cuadro = 0) {
    this.tio.anims.stop();
    this.tio.setTexture('cavJefe_' + nombre, cuadro);
    origenJefe(this, this.tio, nombre);
  },

  // Una secuencia de cuadros fijos: [[cuadro, ms, acción?], ...] y al final, andar.
  secuencia(nombre, pasos, alTerminar) {
    this.ponerHoja(nombre, pasos[0][0]);
    let t = 0;
    pasos.forEach(([cuadro, ms, accion]) => {
      this.time.delayedCall(t, () => {
        if (this.tioEstado === 'muere' || !this.tio.active) return;
        if (this.tio.texture.key !== 'cavJefe_' + nombre) this.ponerHoja(nombre, cuadro);
        this.tio.setFrame(cuadro);
        if (accion) accion();
      });
      t += ms;
    });
    this.time.delayedCall(t, () => {
      if (this.tioEstado === 'muere') return;
      this.tioEstado = 'persigue';
      this.proximoAtaque = this.time.now + Phaser.Math.Between(...JEFE2.pausa);
      if (alTerminar) alTerminar();
      this.andar();
    });
  },

  // ---------------------------------------------------------------------------
  // Ataques
  // ---------------------------------------------------------------------------

  elegirAtaque() {
    const j = this.jugador;
    const cerca = j.x - this.tio.x < JEFE2.garra.alcance;
    const opciones = cerca ? ['garra', 'garra', 'suelo', 'fuego'] : ['lata', 'fuego', 'suelo', 'lata'];
    this.tioEstado = 'ataca';
    const a = Phaser.Utils.Array.GetRandom(opciones);
    if (a === 'garra') this.garra();
    else if (a === 'lata') this.tirarLata();
    else if (a === 'fuego') this.escupirFuego();
    else this.golpeSuelo();
  },

  garra() {
    const G = JEFE2.garra;
    const b = Phaser.Math.Between(0, 1) * 3; // las dos filas de persigue
    sonarGruñido(this, 0.6, 0.18);
    this.secuencia('persigue', [
      [b, 320],
      [b + 1, 460, () => {
        this.tweens.add({ targets: this, tioX: 60, duration: 120, yoyo: true, hold: 220 });
        this.cameras.main.shake(200, 0.006);
        const pega = () => {
          const jb = this.jugador.body;
          const x0 = this.tio.x;
          const E = JEFE2.escala;
          if (jb.right > x0 && jb.left < x0 + G.alcance * E && jb.bottom > JEFE2.y + G.alto[0] * E && jb.top < JEFE2.y + G.alto[1] * E) this.golpearJugador(x0);
        };
        pega();
        this.time.delayedCall(150, pega);
        chispas(this, this.tio.x + G.alcance * 0.8 * JEFE2.escala, JEFE2.y - 60, 10, -60, 120, 10.5);
      }],
      [b + 2, 300]
    ]);
  },

  tirarLata() {
    const L = JEFE2.lata;
    this.secuencia('lanza', [
      [0, 480],
      [1, 420, () => {
        const x = this.tio.x + 160 * JEFE2.escala;
        const y = JEFE2.y - 300 * JEFE2.escala;
        const j = this.jugador;
        const g = this.physics.world.gravity.y;
        const t = L.vuelo;
        const l = this.lata.create(x, y, 'cav_lata').setScale(2.2).setDepth(10.4);
        l.setVelocity((j.x - x) / t, (j.y - 30 - y - 0.5 * g * t * t) / t).setAngularVelocity(720);
        sonarGruñido(this, 0.5, 0.15);
      }],
      [2, 380]
    ]);
  },

  explotarLata(l) {
    if (!l.active) return;
    const { x, y } = l;
    l.destroy();
    const e = this.add.sprite(x, y + 20, 'cav_c_explosion', 0).setOrigin(0.5, 1).setDepth(10.6).setScale(0.9);
    e.play('c_explosion');
    e.once('animationcomplete', () => e.destroy());
    sonarImpacto(this, 'granada');
    this.cameras.main.shake(160, 0.007);
    const j = this.jugador.body;
    if (Phaser.Math.Distance.Between(x, y, j.center.x, j.center.y) < JEFE2.lata.radio) this.golpearJugador(x);
  },

  // La boca del Tío en el cuadro que muestra (caverna.json: puntos), en el mundo.
  bocaTio() {
    const tio = this.tio;
    const hoja = tio.texture.key.replace('cavJefe_', '');
    const j = this.cache.json.get('cavernaDatos').jefe[hoja];
    const p = j && j.puntos && j.puntos[Number(tio.frame.name)];
    if (!p) return null;
    const c = Math.cos(tio.rotation);
    const s = Math.sin(tio.rotation);
    const dx = p[0] * tio.scaleX;
    const dy = p[1] * tio.scaleY;
    return { x: tio.x + dx * c - dy * s, y: tio.y + dx * s + dy * c };
  },

  escupirFuego() {
    const F = JEFE2.fuego;
    // Mientras dura: un resplandor en la boca que la sigue.
    const brillo = this.add.image(0, 0, 'tun_luzCalida').setTint(0xffa030).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.48).setScale(0);
    const seguir = () => { const b = this.bocaTio(); if (b && brillo.active) brillo.setPosition(b.x, b.y); };
    this.events.on('update', seguir);
    this.time.delayedCall(520 + F.dura + 420, () => { this.events.off('update', seguir); brillo.destroy(); });
    this.secuencia('fuego', [
      [0, 520, () => {
        sonarGruñido(this, 0.5, 0.14);
        this.tweens.add({ targets: brillo, scale: 0.7, duration: 500, ease: 'Quad.in' });
      }],
      [1, F.dura, () => {
        brillo.setScale(1.1);
        const fin = this.time.now + F.dura;
        const llama = () => {
          if (this.time.now > fin || this.tioEstado === 'muere') return;
          this.nuevaLlama();
          this.time.delayedCall(F.cada, llama);
        };
        llama();
        sonarGruñido(this, F.dura / 1000, 0.22);
      }],
      [2, 420, () => {
        // Se apaga: humo y chispas por la boca.
        this.tweens.add({ targets: brillo, scale: 0.3, alpha: 0, duration: 400 });
        const b = this.bocaTio();
        if (!b) return;
        const humo = this.add.particles(b.x, b.y, 'fx_humo', {
          speedX: { min: 40, max: 110 }, speedY: { min: -60, max: -20 }, lifespan: 900, scale: { start: 1, end: 3 },
          alpha: { start: 0.6, end: 0 }, tint: 0x2a1a14, frequency: 50
        }).setDepth(9.49);
        this.time.delayedCall(380, () => humo.stop());
        this.time.delayedCall(1400, () => humo.destroy());
      }]
    ]);
  },

  // Una bola de la llamarada: sale de la boca hacia el jugador, crece y se apaga.
  nuevaLlama() {
    const F = JEFE2.fuego;
    const boca = this.bocaTio() || { x: this.tio.x + F.boca[0] * JEFE2.escala, y: this.tio.y + F.boca[1] * JEFE2.escala };
    const { x, y } = boca;
    const j = this.jugador;
    const ang = Phaser.Math.Clamp(Math.atan2(j.y - 40 - y, Math.max(60, j.x - x)), -0.15, 0.6) + Phaser.Math.FloatBetween(-0.05, 0.05);
    // Sale chica pegada a la boca y crece: un chorro continuo, sin corte.
    const f = this.add.image(x, y, 'cav_c_explosion', Phaser.Math.Between(1, 2)).setScale(0.12).setDepth(10.5)
      .setBlendMode(Phaser.BlendModes.ADD).setAngle(Phaser.Math.Between(0, 360));
    f.setData({ vx: Math.cos(ang) * F.velocidad, vy: Math.sin(ang) * F.velocidad, hasta: this.time.now + 1100 });
    this.llamas2.push(f);
  },

  moverLlamas2(dt) {
    const jb = this.jugador.body;
    this.llamas2 = this.llamas2.filter((f) => {
      if (!f.active) return false;
      f.x += f.getData('vx') * dt;
      f.y += f.getData('vy') * dt;
      f.angle += 160 * dt;
      f.setScale(f.scale + dt * 0.7).setAlpha(Math.max(0, (f.getData('hasta') - this.time.now) / 1100));
      if (this.time.now > f.getData('hasta')) { f.destroy(); return false; }
      const r = f.displayWidth * 0.3;
      if (f.x + r > jb.left && f.x - r < jb.right && f.y + r > jb.top && f.y - r < jb.bottom) this.golpearJugador(this.tio.x);
      return true;
    });
  },

  golpeSuelo() {
    const S = JEFE2.suelo;
    this.secuencia('suelo', [
      [0, 520, () => sonarGruñido(this, 0.7, 0.2)],
      [1, 500, () => {
        this.cameras.main.shake(380, 0.016);
        sonarImpacto(this, 'cohete');
        const piso = this.cfg.piso;
        let x = this.tio.x + 60;
        for (let k = 0; k < S.ondas; k++) {
          this.time.delayedCall(k * S.cada, () => {
            x += S.paso;
            const e = this.add.sprite(x, piso + 8, 'cav_c_explosion', 0).setOrigin(0.5, 1).setDepth(10.6).setScale(0.75);
            e.play('c_explosion');
            e.once('animationcomplete', () => e.destroy());
            const jb = this.jugador.body;
            if (Math.abs(jb.center.x - x) < 46 && jb.bottom > piso - 30) this.golpearJugador(x - 60);
          });
        }
      }],
      [2, 420]
    ]);
  },

  // ---------------------------------------------------------------------------
  // Daño y muerte
  // ---------------------------------------------------------------------------

  torso() {
    const T = JEFE2.torso;
    const E = JEFE2.escala;
    return new Phaser.Geom.Rectangle(this.tio.x + T.x * E, this.tio.y + T.y * E, T.w * E, T.h * E);
  },

  balasContraTio() {
    if (!['persigue', 'ataca', 'dano'].includes(this.tioEstado)) return;
    const r = this.torso();
    this.balas.getChildren().slice().forEach((b) => {
      if (!b.active || !r.contains(b.x, b.y)) return;
      if (this.impactoBala(b)) return; // explosivos: danoEnArea
      chispas(this, b.x, b.y, 4, 180, 90, 10.5);
      const d = b.getData('dano') || 1;
      b.destroy();
      this.danarTio(d);
    });
    // Tocarlo lastima.
    const jb = this.jugador.body;
    if (this.estado === 'control' && Phaser.Geom.Intersects.RectangleToRectangle(r, new Phaser.Geom.Rectangle(jb.x, jb.y, jb.width, jb.height))) {
      this.golpearJugador(this.tio.x - 200);
    }
  },

  // Explosiones (granadas, cohetes, dinamita) que alcanzan el torso.
  explosionContraTio(x, y, radio, dano) {
    if (!['persigue', 'ataca', 'dano'].includes(this.tioEstado)) return;
    const r = this.torso();
    const cx = Phaser.Math.Clamp(x, r.x, r.right);
    const cy = Phaser.Math.Clamp(y, r.y, r.bottom);
    if (Phaser.Math.Distance.Between(x, y, cx, cy) <= radio) this.danarTio(dano * 2);
  },

  danarTio(d) {
    if (this.tioEstado === 'muere') return;
    this.tioVida -= d;
    this.barraJefe.set(this.tioVida / JEFE2.vida);
    this.tio.setTintFill(0xffffff);
    this.flashTio = this.time.now + 60;
    if (this.tioVida <= 0) { this.morirTio(); return; }
    this.tioDano += d;
    if (this.tioDano >= JEFE2.dano && this.tioEstado === 'persigue') {
      this.tioDano = 0;
      this.tioEstado = 'dano';
      sonarGruñido(this, 0.6, 0.2);
      this.secuencia('dano', [[0, 160], [1, 200], [2, 240]]);
    }
  },

  // Revienta en explosiones, se vuelve piedra y se derrumba.
  morirTio() {
    this.tioEstado = 'muere';
    this.invulnerableHasta = Infinity;
    this.registry.remove('tioCheckpoint');
    sumarPuntos(this, JEFE2.puntos);
    if (this.ritmo) this.ritmo.detener(1200);
    this.barraJefe.ocultar();
    this.llamas2.forEach((f) => f.destroy());
    this.llamas2 = [];
    const tio = this.tio;
    // La cámara se queda con él (se acerca) mientras muere; el jugador quieto.
    this.zoomCine = true;
    this.estado = 'cinematica';
    this.jugador.setVelocity(0);
    const camara = this.cameras.main;
    camara.pan(tio.x + 40, tio.y - 170, 1200, 'Sine.easeInOut');
    camara.zoomTo(1.35, 1200, 'Sine.easeInOut');
    this.ponerHoja('muere', 0);
    sonarGruñido(this, 2.2, 0.35);
    const cam = this.cameras.main;
    const r = this.torso();
    for (let k = 0; k < 8; k++) {
      this.time.delayedCall(k * 140, () => explotar(this, Phaser.Math.Between(r.x, r.right), Phaser.Math.Between(r.y, r.bottom), k % 2 ? 'mediana' : 'grande', ESCALA));
    }
    cam.shake(1200, 0.014);
    this.time.delayedCall(1100, () => {
      tio.setFrame(1);
      cam.flash(200, 255, 255, 255);
      sonarImpacto(this, 'cohete');
      // Se apaga: piedra, sin brillo ni brasas.
      if (this.brilloTio) tio.preFX.remove(this.brilloTio);
      this.brasasTio.stop();
      this.humoTio.stop();
      this.tweens.add({ targets: this.contraluz, alpha: 0, duration: 800 });
      this.focoTio.apagar(1200);
      this.tio.setTint(0x9a8a8a);
    });
    this.time.delayedCall(2100, () => {
      tio.setFrame(2);
      cam.shake(800, 0.02);
      this.lluviaDeRocas(r.centerX, r.centerY, 18);
    });
    // Sigue: luego_de_muere.jpeg (se agrieta, arde por dentro y se derrumba
    // en la lava), despacio; al final, polvo y se hunde.
    this.time.delayedCall(2900, () => {
      this.ponerHoja('muere2', 0);
      tio.clearTint();
      tio.play('jefe2_muere2');
      tio.on('animationupdate', (a, f) => {
        if (a.key !== 'jefe2_muere2') return;
        cam.shake(300, 0.008 + f.index * 0.002);
        if (f.index >= 3) explotar(this, tio.x + Phaser.Math.Between(-80, 80), tio.y - Phaser.Math.Between(40, 200), 'mediana', ESCALA);
      });
      tio.once('animationcomplete', () => {
        tio.off('animationupdate');
        const polvo = this.add.sprite(tio.x + 40, JEFE2.y, 'cav_c_polvo', 0).setOrigin(0.5, 1).setDepth(9.6).setScale(2.6);
        polvo.play('c_polvo');
        polvo.once('animationcomplete', () => polvo.destroy());
        this.tweens.add({ targets: tio, alpha: 0, y: tio.y + 120, duration: 1200, ease: 'Quad.in' });
      });
    });
    this.time.delayedCall(2900 + 7 * 333 + 1400, () => {
      const { width } = this.scale;
      const t = TextFX.letras(this, width / 2, 160, '¡EL TÍO HA CAÍDO!', { escala: 3, cada: 60, fijo: true, profundidad: 40 });
      this.time.delayedCall(2200, () => { t.salir(400); misionCompleta(this); });
    });
  },

  // ---------------------------------------------------------------------------
  // El piso en bloques (la franja del piso del dibujo, cortada) y la lava
  // ---------------------------------------------------------------------------

  // Un bloque de piso: imagen = pedazo [sx, sx+w) de la textura del piso
  // (espejo: el tramo va dado vuelta), en el mundo en [x0, x0+w). En el
  // infierno (this.costra) se ve solo la costra de arriba: debajo, el lago de lava.
  nuevoBloque(clave, sx, x0, w, y, espejo) {
    const t = this.textures.get(clave);
    const nombre = `b${sx}_${w}`;
    const alto = t.getSourceImage().height;
    if (!t.has(nombre)) t.add(nombre, 0, sx, 0, w, alto);
    const img = this.add.image(x0, y, clave, nombre).setOrigin(0).setFlipX(!!espejo).setDepth(1.5);
    if (this.luz2d) img.setPipeline('Light2D');
    tinteInfierno(this, img);
    const zona = this.add.zone(x0 + w / 2, this.cfg.piso + 60, w, 120);
    this.solidos.add(zona);
    const b = { x0, x1: x0 + w, sx, w, clave, espejo: !!espejo, img, zona, estado: 'firme' };
    this.bloques.push(b);
    return b;
  },

  // El bloque pasa a ser costra sobre la lava: solo lo de arriba del dibujo y
  // un borde de abajo irregular, oscuro, con el reflejo de la lava.
  hacerCostra(b) {
    const C = JEFE2.costra;
    b.img.setCrop(0, 0, b.w, C.alto);
    b.borde = this.add.tileSprite(b.x0, b.img.y + C.alto - 10, b.w, 26, 'costra_borde').setOrigin(0).setDepth(1.51)
      .setTilePosition(b.x0 % 96, 0);
    b.reflejo = this.add.tileSprite(b.x0, b.img.y + C.alto - 10, b.w, 26, 'costra_reflejo').setOrigin(0).setDepth(1.515)
      .setTilePosition(b.x0 % 96, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
  },

  // El infierno: el piso pasa a costra sobre un lago de lava (fijo a la
  // cámara, con la superficie ondulada) que se ve debajo y en cada hueco.
  lavaVisible() {
    if (this.lago) return;
    texturasLago(this);
    const { width, height } = this.scale;
    const L = JEFE2.costra;
    // El piso queda entero (sólido); el lago de lava va DETRÁS de los
    // bloques: solo se ve en los huecos que deja el piso al romperse.
    this.lago = this.add.tileSprite(0, L.lava - 12, width, height - L.lava + 12, 'lago_lava').setOrigin(0).setScrollFactor(0).setDepth(1.45);
    this.lagoBrillo = this.add.tileSprite(0, L.lava - 12, width, height - L.lava + 12, 'lago_lava').setOrigin(0).setScrollFactor(0)
      .setDepth(1.46).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
    // El borde que se desmorona: resplandor y brasas que siguen al frente.
    this.bordeLava = this.add.image(0, this.cfg.piso, 'tun_luzCalida').setTint(0xff5010).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6, 1.1).setAlpha(0.8).setDepth(1.6);
    this.brasasBorde = this.add.particles(0, 0, 'fx_chispa', {
      x: { min: -40, max: 10 }, y: { min: -6, max: 20 }, speedY: { min: -160, max: -50 }, speedX: { min: -20, max: 40 },
      lifespan: { min: 600, max: 1300 }, scale: { start: 1.8, end: 0.3 }, alpha: { start: 1, end: 0 },
      tint: [0xffd040, 0xff7020], blendMode: 'ADD', frequency: 40
    }).setDepth(10.7);
    this.focoBorde = this.nuevoFoco(0, this.cfg.piso, { radio: 170, color: 0xff5a1a, intensidad: 1.5, brillo: 0.2, pulso: 0.25, ritmo: 2.4 });
    // El lago alumbra: focos a lo largo de la pantalla (siguen a la cámara).
    this.focosLago = [0, 1, 2, 3, 4].map(() => this.nuevoFoco(0, L.lava + 10, { radio: 160, color: 0xff4a14, intensidad: 1, brillo: 0.12, pulso: 0.2, ritmo: Phaser.Math.FloatBetween(0.8, 1.6) }));
  },

  moverLava(time) {
    if (!this.lago) return;
    this.tramosMundo.forEach((t) => (t.cascadas || []).forEach((c) => {
      if (c.type === 'TileSprite') c.tilePositionY = -time / 1000 * c.getData('velocidad');
    }));
    const cam = this.cameras.main;
    this.lago.tilePositionX = cam.scrollX + time / 40;
    this.lagoBrillo.tilePositionX = cam.scrollX - time / 25;
    this.lagoBrillo.y = this.lago.y + Math.sin(time / 400) * 2;
    this.lagoBrillo.setAlpha(0.22 + Math.sin(time / 300) * 0.1);
    this.focosLago.forEach((f, i) => f.mover(cam.scrollX + 100 + i * 210, JEFE2.costra.lava + 14));
    const x = this.frente;
    this.bordeLava.setPosition(x, this.cfg.piso + 10).setAlpha(0.65 + Math.sin(time / 90) * 0.15);
    this.brasasBorde.setPosition(x, this.cfg.piso);
    this.focoBorde.mover(x, this.cfg.piso);
  },

  // El frente de destrucción avanza (hasta JEFE2.avance px/s) hacia el Tío y
  // rompe todo lo que deja atrás: bloques, el altar, andamios y escaleras.
  destruirCamino(dt) {
    if (!['persigue', 'ataca', 'dano'].includes(this.tioEstado)) return;
    const meta = this.tio.x + JEFE2.frente;
    this.frente = Math.min(meta, this.frente + JEFE2.avance * dt);
    const frente = this.frente;
    let rotos = 0;
    for (const b of this.bloques) {
      if (b.x0 > frente) break;
      if (b.estado === 'firme' && b.x1 <= frente && rotos < 2) { this.romperBloque(b); rotos++; }
    }
    if (this.altarPiedra && this.altarPiedra.firme && frente > this.altarPiedra.x0 + 60) this.hundirAltar();
    this.plataformas.getChildren().forEach((z) => {
      if (!z.body.enable || z.getData('x1') > frente - 20) return;
      z.body.enable = false;
      const y = z.getData('y');
      for (let k = 0; k < 4; k++) {
        const r = this.add.image(Phaser.Math.Between(z.getData('x0'), z.getData('x1')), y, 'cav_c_rocas', Phaser.Math.Between(0, 7)).setDepth(9.5).setScale(0.6);
        this.tweens.add({ targets: r, y: JEFE2.lava + 20, angle: Phaser.Math.Between(-300, 300), duration: Phaser.Math.Between(500, 800), ease: 'Quad.in', onComplete: () => r.destroy() });
      }
    });
    this.escaleras = this.escaleras.filter((e) => e.x1 > frente - 20);
    // Lo que quedó muy atrás se borra (bloques ya en la lava).
    const lejos = this.cameras.main.scrollX - 300;
    this.bloques = this.bloques.filter((b) => {
      if (b.x1 > lejos || b.estado !== 'lava') return true;
      b.zona.destroy();
      if (b.foco) b.foco.destruir();
      return false;
    });
  },

  // Se derrumba (JEFE2.rompe ms por etapa): las grietas avanzan brillando y
  // la roca se calienta al rojo; se hunde un poco y se abre en pedazos (entre
  // ellos ya se ve la lava); los pedazos caen despacio girando, al rojo vivo y
  // echando brasas, y la lava salpica y echa vapor.
  romperBloque(b) {
    b.estado = 'rompe';
    const R = JEFE2.rompe;
    const piso = this.cfg.piso;
    const img = b.img;
    const cx = (b.x0 + b.x1) / 2;
    const tinte0 = Phaser.Display.Color.IntegerToColor(img.tintTopLeft);
    const rojo = Phaser.Display.Color.IntegerToColor(0xffb070); // al rojo vivo (claro: que se vea en lo oscuro)
    const mezcla = (k) => {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(tinte0, rojo, 100, k * 100);
      return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    };
    // Los cortes entre pedazos (al azar) y las grietas que bajan por ellos.
    const n = Phaser.Math.Between(2, 3);
    const cortes = [0];
    for (let k = 1; k < n; k++) cortes.push(Math.round(b.w * k / n + Phaser.Math.Between(-10, 10)));
    cortes.push(b.w);
    // Grietas cortas: bajan un poco por cada corte y corren por la superficie.
    const lineas = cortes.slice(1, -1).map((c) => {
      const pts = [[b.x0 + c, piso - 12]];
      for (let s2 = 0; s2 < 3; s2++) pts.push([pts[pts.length - 1][0] + Phaser.Math.Between(-10, 10), pts[pts.length - 1][1] + 9]);
      return pts;
    });
    for (let k = 0; k < 2; k++) {
      const x = Phaser.Math.Between(b.x0 + 8, b.x1 - 8);
      const pts = [[x, piso - 11]];
      for (let s2 = 0; s2 < 4; s2++) pts.push([pts[pts.length - 1][0] + Phaser.Math.Between(-16, 16), pts[pts.length - 1][1] + Phaser.Math.Between(0, 5)]);
      lineas.push(pts);
    }
    const grietas = this.add.graphics().setDepth(1.55).setBlendMode(Phaser.BlendModes.ADD);
    const polvo = this.add.particles(cx, piso - 8, 'fx_humo', {
      x: { min: -b.w / 2, max: b.w / 2 }, speedY: { min: -40, max: -10 }, speedX: { min: -15, max: 15 },
      lifespan: 700, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.35, end: 0 }, tint: 0x6a3020, frequency: 90
    }).setDepth(1.56);
    this.tweens.addCounter({
      from: 0, to: 1, duration: R.grieta,
      onUpdate: (tw) => {
        const v = tw.getValue();
        if (!img.active) return;
        img.setTint(mezcla(v * 0.6));
        img.x = b.x0 + (Math.random() - 0.5) * 2 * v * 2;
        grietas.clear();
        lineas.forEach((pts, k) => {
          const hasta = Math.max(1, Math.round((pts.length - 1) * Phaser.Math.Clamp(v * 1.4 - k * 0.1, 0, 1)));
          grietas.lineStyle(k < n - 1 ? 5 : 3, k % 2 ? 0xffe060 : 0xff8a20, 0.6 + v * 0.4);
          grietas.beginPath();
          grietas.moveTo(pts[0][0], pts[0][1]);
          for (let q = 1; q <= hasta; q++) grietas.lineTo(pts[q][0], pts[q][1]);
          grietas.strokePath();
        });
      },
      onComplete: () => {
        polvo.stop();
        this.time.delayedCall(800, () => polvo.destroy());
        grietas.destroy();
        if (!img.active || !b.zona.body) return;
        this.partirBloque(b, cortes, mezcla);
      }
    });
    if (this.time.now - (this.ultimoCrujido || 0) > 260) {
      this.ultimoCrujido = this.time.now;
      sonarCrujido(this);
    }
  },

  partirBloque(b, cortes, mezcla) {
    const R = JEFE2.rompe;
    const C = JEFE2.costra;
    const img = b.img;
    const t = this.textures.get(b.clave);
    const alto = img.height; // el pedazo entero del piso
    const superficie = C.lava; // la línea de la lava
    b.zona.body.enable = false;
    img.setVisible(false);
    if (b.borde) { b.borde.destroy(); b.reflejo.destroy(); }
    this.cameras.main.shake(120, 0.003);
    for (let i = 0; i < cortes.length - 1; i++) {
      const sx0 = cortes[i];
      const w = cortes[i + 1] - sx0;
      const sx = b.espejo ? b.w - sx0 - w : sx0;
      const nombre = `b${b.sx + sx}_${w}_e`;
      if (!t.has(nombre)) t.add(nombre, 0, b.sx + sx, 0, w, alto);
      // Detrás del lago: al hundirse, la lava lo va tapando.
      const p = this.add.image(b.x0 + sx0 + w / 2, img.y, b.clave, nombre).setOrigin(0.5, 0).setFlipX(b.espejo).setDepth(1.44)
        .setTint(mezcla(0.6));
      if (this.luz2d) p.setPipeline('Light2D');
      const lado = i - (cortes.length - 2) / 2 || (Math.random() < 0.5 ? -0.5 : 0.5);
      const giro = lado * Phaser.Math.Between(6, 14);
      const recortar = () => {};
      const tw = { k: 0 };
      // Un sacudón, se abre...
      this.tweens.add({
        targets: p, x: p.x + lado * Phaser.Math.Between(8, 16), y: { from: p.y - Phaser.Math.Between(6, 12), to: p.y + 6 },
        angle: giro * 0.5, duration: R.abre, ease: 'Quad.out', delay: i * 60, onUpdate: recortar,
        onComplete: () => {
          const brasas = this.add.particles(0, 0, 'fx_chispa', {
            x: { min: -w / 2, max: w / 2 }, y: { min: 0, max: 6 }, speedY: { min: -90, max: -30 },
            lifespan: 600, scale: { start: 1.4, end: 0.2 }, tint: [0xffd040, 0xff6a10], blendMode: 'ADD', frequency: 45
          }).setDepth(1.53);
          brasas.startFollow(p);
          brasas.setDepth(1.47);
          this.tweens.add({ targets: tw, k: 1, duration: R.cae, onUpdate: () => p.active && p.setTint(mezcla(0.6 + tw.k * 0.4)) });
          // ...y se hunde en la lava, inclinándose.
          this.tweens.add({
            targets: p, y: superficie + 30, x: p.x + lado * 10, angle: giro * 1.6, duration: R.cae, ease: 'Quad.in', onUpdate: recortar,
            onComplete: () => { brasas.destroy(); p.destroy(); }
          });
          // Al tocar la lava: salpica, una onda y vapor.
          this.time.delayedCall(R.cae * 0.35, () => {
            this.salpicar(p.x, superficie + 16, Phaser.Math.FloatBetween(0.9, 1.3));
            const onda = this.add.ellipse(p.x, superficie + 4, w, 8).setStrokeStyle(2, 0xffd080).setDepth(1.6).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: onda, scaleX: 2.2, scaleY: 1.6, alpha: 0, duration: 700, onComplete: () => onda.destroy() });
          });
          this.time.delayedCall(R.cae * 0.7, () => {
            const vapor = this.add.particles(p.x, superficie, 'fx_humo', {
              speedY: { min: -70, max: -30 }, speedX: { min: -20, max: 20 }, lifespan: 1100, scale: { start: 0.8, end: 2.6 },
              alpha: { start: 0.4, end: 0 }, tint: 0xd8b0a0, emitting: false
            }).setDepth(1.6);
            vapor.explode(5);
            this.time.delayedCall(1200, () => vapor.destroy());
          });
        }
      });
    }
    this.time.delayedCall(R.abre + R.cae, () => {
      b.estado = 'lava';
      if (img.active) img.destroy();
      b.foco = this.nuevoFoco((b.x0 + b.x1) / 2, superficie + 10, { radio: 80, color: 0xff5a1a, intensidad: 1.1, brillo: 0.25, pulso: 0.25, ritmo: Phaser.Math.FloatBetween(1.2, 2.2) });
    });
  },

  // Al instante (lo que ya está roto cuando pasa el corte de la cinemática).
  bloqueALava(b) {
    b.estado = 'lava';
    b.zona.body.enable = false;
    b.img.destroy();
    if (b.borde) { b.borde.destroy(); b.reflejo.destroy(); }
  },

  // El altar se hunde entero en la lava.
  hundirAltar() {
    const a = this.altarPiedra;
    a.firme = false;
    this.cameras.main.shake(900, 0.012);
    sonarCrujido(this);
    sonarGruñido(this, 1.2, 0.12);
    a.zonas.forEach((z) => { z.body.enable = false; });
    this.tweens.add({ targets: a.img, y: a.img.y + 240, angle: -3, duration: 1600, ease: 'Quad.in' });
    for (let k = 0; k < 5; k++) {
      this.time.delayedCall(k * 220, () => {
        const sp = this.add.sprite(Phaser.Math.Between(a.x0, a.x1), this.cfg.piso + 14, 'cav_lava_salpica', 0).setOrigin(0.5, 1).setDepth(1.6)
          .setBlendMode(Phaser.BlendModes.ADD).setScale(1.4);
        sp.play('lava_salpica');
        sp.once('animationcomplete', () => sp.destroy());
      });
    }
  },

  // Cayó a la lava: se quema y sale despedido al primer bloque firme de adelante.
  revisarLava() {
    const j = this.jugador;
    if (this.muerto || this.estado !== 'control' || j.body.bottom < JEFE2.lava) return;
    const x = j.x;
    const sp = this.add.sprite(x, this.cfg.piso + 14, 'cav_lava_salpica', 2).setOrigin(0.5, 1).setDepth(10.6).setScale(1.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    sp.play('lava_salpica');
    sp.once('animationcomplete', () => sp.destroy());
    this.aviso(x, this.cfg.piso - 140, '¡QUEMA!', 'rojo');
    const destino = this.bloques.find((b) => b.estado === 'firme' && b.x0 > Math.max(x, this.frente + 40));
    const dx = destino ? (destino.x0 + destino.x1) / 2 : x + 200;
    this.invulnerableHasta = 0;
    this.golpearJugador(x - 100);
    if (this.muerto) return;
    j.body.reset(dx, this.cfg.piso - 200);
    j.setVelocity(0, -300);
    j.setTint(0xff6030);
    this.time.delayedCall(400, () => j.active && j.clearTint());
  },

  // ---------------------------------------------------------------------------
  // El mundo sin fin: tramos del mapa de la persecución a la derecha de la
  // arena (uno normal y uno espejado) con su colisión, luces y piso.
  // ---------------------------------------------------------------------------

  // Un tramo = un pedazo del mapa (SEGMENTOS, cortados donde el fondo es
  // negro: las uniones no se notan) puesto en el mundo, a veces espejado.
  // x del mundo de una x del mapa dentro del tramo.
  xTramo(t, x) {
    return t.espejo ? t.x + (t.s1 - x) : t.x + (x - t.s0);
  },

  // El que sigue: al azar, nunca el mismo pedazo dos veces seguidas.
  siguienteSegmento() {
    const ant = this.tramosMundo[this.tramosMundo.length - 1];
    if (!ant) return { seg: SEGMENTOS[0], espejo: false };
    const opciones = SEGMENTOS.filter((sg) => sg !== ant.seg);
    return { seg: Phaser.Utils.Array.GetRandom(opciones), espejo: Math.random() < 0.35 };
  },

  agregarTramo() {
    const ant = this.tramosMundo[this.tramosMundo.length - 1];
    const x = ant ? ant.x + ant.ancho : this.cfg.anchoArena;
    const { seg, espejo } = this.siguienteSegmento();
    const [s0, s1] = seg;
    const ancho = s1 - s0;
    const tex = this.textures.get('cavPersFondo');
    const nombre = `seg${s0}`;
    if (!tex.has(nombre)) tex.add(nombre, 0, s0, 0, ancho, tex.getSourceImage().height);
    const img = this.add.image(x, TRAMO_DY, 'cavPersFondo', nombre).setOrigin(0).setDepth(1).setFlipX(espejo);
    if (this.luz2d) img.setPipeline('Light2D');
    tinteInfierno(this, img);
    // La unión: una sombra suave (por ahí el fondo es negro).
    const costura = this.add.image(x, 0, 'costura').setOrigin(0.5, 0).setDisplaySize(90, this.cfg.piso).setDepth(1.02);
    const t = { x, ancho, s0, s1, seg, espejo, img, zonas: [], escaleras: [], focos: [], bloques: [], cascadas: [costura] };
    this.tramosMundo.push(t);
    this.colisionTramo(t);
    const datos = this.cache.json.get('cavernaDatos').persecucion;
    const B = JEFE2.bloque;
    for (let bx = 0; bx < ancho; bx += B) {
      const w = Math.min(B, ancho - bx);
      const sx = espejo ? s1 - bx - w : s0 + bx;
      t.bloques.push(this.nuevoBloque('cavPersPiso', sx, x + bx, w, datos.corte + TRAMO_DY, espejo));
    }
    // Cascadas de lava al fondo.
    for (let c = 0; c < 2; c++) {
      const cx = x + Phaser.Math.Between(60, ancho - 60);
      const arriba = Phaser.Math.Between(60, 140);
      const caida = this.add.tileSprite(cx, arriba, Phaser.Math.Between(16, 30), datos.corte - arriba, 'cav_lava_tile').setOrigin(0.5, 0).setDepth(0.95)
        .setTileScale(0.6, 1.2).setAlpha(0.9);
      caida.setData('velocidad', Phaser.Math.Between(80, 140));
      const brillo = this.add.image(cx, datos.corte - 10, 'tun_luzCalida').setTint(0xff5010).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.9, 0.5).setDepth(0.96).setAlpha(0.7);
      t.cascadas.push(caida, brillo);
    }
    datos.luces.forEach(([lx, y]) => {
      if (lx < s0 || lx > s1) return;
      const fx = this.xTramo(t, lx);
      t.focos.push(y < 300
        ? this.nuevoFoco(fx, y + TRAMO_DY, { radio: 150, color: 0xffa060 })
        : this.nuevoFoco(fx, y + TRAMO_DY, { radio: 70, color: 0xff4a1c, intensidad: 0.9, brillo: 0.35, pulso: 0.3, ritmo: Phaser.Math.FloatBetween(1, 2) }));
    });
    return t;
  },

  // La colisión del JSON (la del mapa entero) que cae dentro del pedazo.
  colisionTramo(t) {
    const d = this.cache.json.get('persecucionColision');
    const dentro = (a, b) => Math.min(b, t.s1) - Math.max(a, t.s0) > 20;
    const rango = (a, b) => {
      const ca = Phaser.Math.Clamp(a, t.s0, t.s1);
      const cb = Phaser.Math.Clamp(b, t.s0, t.s1);
      return [Math.min(this.xTramo(t, ca), this.xTramo(t, cb)), Math.max(this.xTramo(t, ca), this.xTramo(t, cb))];
    };
    d.walls.forEach(({ x, y, w, h }) => {
      if (!dentro(x, x + w)) return;
      const [a, b] = rango(x, x + w);
      const z = this.add.zone((a + b) / 2, y + TRAMO_DY + h / 2, b - a, h);
      this.solidos.add(z);
      t.zonas.push(z);
    });
    d.platforms.forEach(({ x0, x1, y }) => {
      if (!dentro(x0, x1)) return;
      const [a, b] = rango(x0, x1);
      const z = this.add.zone((a + b) / 2, y + TRAMO_DY + 6, b - a, 12);
      this.plataformas.add(z);
      Object.assign(z.body.checkCollision, { down: false, left: false, right: false });
      z.setData({ x0: a, x1: b, y: y + TRAMO_DY });
      t.zonas.push(z);
    });
    d.ladders.forEach((e) => {
      const c = (e.x0 + e.x1) / 2;
      if (c < t.s0 || c > t.s1) return;
      const [a, b] = rango(e.x0, e.x1);
      const esc = { x0: a, x1: b, arriba: e.arriba + TRAMO_DY, abajo: e.abajo + TRAMO_DY, centro: (a + b) / 2 };
      t.escaleras.push(esc);
      this.escaleras.push(esc);
    });
  },

  quitarTramo(t) {
    t.img.destroy();
    (t.cascadas || []).forEach((c) => c.destroy());
    t.zonas.forEach((z) => z.destroy());
    t.focos.forEach((f) => f.destruir());
    t.bloques.forEach((b) => {
      if (b.zona.active) b.zona.destroy();
      if (b.img.active) b.img.destroy();
      if (b.borde && b.borde.active) { b.borde.destroy(); b.reflejo.destroy(); }
      if (b.foco) b.foco.destruir();
    });
    this.escaleras = this.escaleras.filter((e) => !t.escaleras.includes(e));
    this.bloques = this.bloques.filter((b) => !t.bloques.includes(b));
    Phaser.Utils.Array.Remove(this.tramosMundo, t);
  },

  // Siempre dos pantallas por delante; los que quedaron muy atrás se borran.
  mantenerTramos() {
    if (!this.tramosMundo.length) return;
    const cam = this.cameras.main;
    const ultimo = this.tramosMundo[this.tramosMundo.length - 1];
    if (ultimo.x + ultimo.ancho < cam.scrollX + this.scale.width * 2) this.agregarTramo();
    const primero = this.tramosMundo[0];
    if (primero.x + primero.ancho < cam.scrollX - 600) this.quitarTramo(primero);
  }
};

// Pisada pesada en la lava: golpe grave y un chapoteo (WebAudio).
function sonarPisada(escena) {
  const ctx = escena.sound.context;
  if (!ctx || !ctx.createOscillator || escena.sound.locked) return;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(70, t);
  o.frequency.exponentialRampToValueAtTime(32, t + 0.3);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g).connect(destino);
  if (escena.eco) g.connect(escena.eco.entrada);
  o.start(t);
  o.stop(t + 0.45);
}

// El pozo de lava de la cintura del Tío: la lava (lava_tile.png) con el borde
// de arriba ondulado, una costra oscura y un filo brillante.
function texturaPozo(escena) {
  if (escena.textures.exists('tio_pozo')) return;
  const W = 620;
  const H = 130;
  const t = escena.textures.createCanvas('tio_pozo', W, H);
  const c = t.getContext();
  const borde = (x) => 22 + Math.sin(x / 34) * 8 + Math.sin(x / 13) * 4;
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, borde(x) + Math.pow(Math.abs(x - W / 2) / (W / 2), 4) * 40);
  c.lineTo(W, H);
  c.closePath();
  c.clip();
  c.scale(1.6, 1.6);
  c.fillStyle = c.createPattern(escena.textures.get('cav_lava_tile').getSourceImage(), 'repeat');
  c.fillRect(0, 0, W, H);
  c.restore();
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(60,10,4,0.9)';
  c.beginPath();
  for (let x = 0; x <= W; x += 4) c.lineTo(x, borde(x) + Math.pow(Math.abs(x - W / 2) / (W / 2), 4) * 40);
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,220,120,0.9)';
  c.stroke();
  // Los costados se pierden de a poco (sin corte recto).
  c.globalCompositeOperation = 'destination-in';
  const g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.16, 'rgba(0,0,0,1)');
  g.addColorStop(0.84, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  t.refresh();
}

// El lago de lava (superficie ondulada que se repite cada 128 px, con costra
// oscura y filo brillante), el borde de abajo de la costra del piso (roca
// irregular) con su reflejo de lava, y la sombra de las uniones de tramos.
function texturasLago(escena) {
  if (escena.textures.exists('lago_lava')) return;
  const tile = escena.textures.get('cav_lava_tile').getSourceImage();
  const W = 512;
  const H = 90;
  const ola = (x) => 12 + Math.sin(x / W * Math.PI * 8) * 3 + Math.sin(x / W * Math.PI * 20) * 1.5;
  const t = escena.textures.createCanvas('lago_lava', W, H);
  const c = t.getContext();
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 2) c.lineTo(x, ola(x));
  c.lineTo(W, H);
  c.closePath();
  c.clip();
  c.scale(1.4, 1.4);
  c.fillStyle = c.createPattern(tile, 'repeat');
  c.fillRect(0, 0, W, H);
  c.restore();
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,240,160,0.25)');
  g.addColorStop(1, 'rgba(120,10,0,0.35)');
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(70,14,4,0.9)';
  c.beginPath();
  for (let x = 0; x <= W; x += 2) c.lineTo(x, ola(x));
  c.stroke();
  c.lineWidth = 1.5;
  c.strokeStyle = 'rgba(255,230,140,1)';
  c.stroke();
  t.refresh();

  // El borde de abajo de la costra: roca oscura con puntas, de 96 px (se repite).
  const roca = (x) => 10 + Math.abs(Math.sin(x * 0.21)) * 7 + Math.abs(Math.sin(x * 0.57 + 1)) * 5;
  const b = escena.textures.createCanvas('costra_borde', 96, 26);
  const cb = b.getContext();
  cb.fillStyle = '#2a120a';
  cb.beginPath();
  cb.moveTo(0, 0);
  for (let x = 0; x <= 96; x += 2) cb.lineTo(x, roca(x));
  cb.lineTo(96, 0);
  cb.closePath();
  cb.fill();
  cb.fillStyle = '#4a2214';
  cb.fillRect(0, 0, 96, 4);
  b.refresh();
  const r = escena.textures.createCanvas('costra_reflejo', 96, 26);
  const cr = r.getContext();
  cr.strokeStyle = 'rgba(255,120,30,0.9)';
  cr.lineWidth = 2;
  cr.beginPath();
  for (let x = 0; x <= 96; x += 2) cr.lineTo(x, roca(x) - 1);
  cr.stroke();
  r.refresh();

  const s = escena.textures.createCanvas('costura', 32, 8);
  const cs = s.getContext();
  const gs = cs.createLinearGradient(0, 0, 32, 0);
  gs.addColorStop(0, 'rgba(0,0,0,0)');
  gs.addColorStop(0.5, 'rgba(0,0,0,0.75)');
  gs.addColorStop(1, 'rgba(0,0,0,0)');
  cs.fillStyle = gs;
  cs.fillRect(0, 0, 32, 8);
  s.refresh();
}

// La lata (roja con la tapa plateada), dibujada.
function texturaLata(escena) {
  texturaPixeles(escena, 'cav_lata', [
    '.ssss.',
    'kwwwwk',
    'rrrrrr',
    'rwrrrr',
    'rwrrrr',
    'rrrrbr',
    'rrrbbr',
    'kssssk'
  ], { s: 0xb8c0c8, w: 0xffffff, r: 0xd02020, b: 0x2050c0, k: 0x401010 });
}

Object.assign(CavernaJefe.prototype, AccionesTio);
