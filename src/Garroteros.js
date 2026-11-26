// =============================================================================
// Garroteros (enemigo2): comunarios con chullo, poncho y garrote. Patrullan
// alrededor de donde aparecen; al ver al jugador lo corren y, de cerca, le dan
// un garrotazo (el golpe pega en el cuadro del arco blanco). Aguantan
// ENEMIGO2.vida balazos; al caer, la animación de enemigo2_muerte: el golpe,
// grita (se le vuela el garrote), cae de espaldas, se sienta de golpe con
// polvo y queda tendido; después se desvanece.
//
// Los usan Nivel1 (marcas G del mapa) y la Cueva (CUEVA.enemigos). Cada escena
// pone sus colisiones con colisionesEnemigos(grupo). Si la escena tiene rampas
// (Nivel1: pegarARampa, sueloBajo) las usan; si no, no pasan de min/max.
//
// enemigo2_sheet.png (herramientas/enemigo2_spritesheet.py): una fila por
// poncho; en cada fila 8 cuadros de caminar, 6 de ataque y 6 de muerte.
// =============================================================================

const ENEMIGO2 = {
  ancho: 110, alto: 70,                   // celda (px de arte)
  caminar: 8, ataque: 6, muerte: 6,
  sentado: 4,                             // cuadro de la muerte en que golpea el piso
  ponchos: ['granate', 'verde', 'ocre', 'azul'],
  cuerpo: { ancho: 22, alto: 50 },        // caja de colisión (px de arte), en los pies
  velocidad: [40, 58],                    // px/s de ronda
  persecucion: 125,                       // px/s corriendo al jugador
  ronda: 170,                             // px a cada lado de donde aparece
  vista: 380, vistaAlto: 120,
  alcance: 78,                            // px de pantalla (centro a centro) para pegar
  golpe: 2,                               // cuadro del ataque en que pega (el arco)
  pausa: [650, 1150],                     // ms entre garrotazos
  pausaAcerto: [1300, 1900],              // ms después de pegarle (no lo encadena)
  empuje: 0.6,                            // el garrotazo despide menos que otros golpes
  vida: 2,                                // balazos que aguanta
  puntos: 150
};

function cargarGarroteros(escena) {
  if (!escena.textures.exists('enemigo2')) {
    escena.load.spritesheet('enemigo2', 'assets/personajes/enemigos/enemigo2_sheet.png',
      { frameWidth: ENEMIGO2.ancho, frameHeight: ENEMIGO2.alto });
  }
}

const AccionesGarroteros = {
  // posiciones: [{ x, abajo, min?, max?, zona? }]
  crearGarroteros(posiciones) {
    const E = ENEMIGO2;
    const porFila = E.caminar + E.ataque + E.muerte;
    E.ponchos.forEach((poncho, fila) => {
      if (this.anims.exists(`garrotero_${poncho}`)) return;
      const inicio = fila * porFila;
      const cuadros = (a, n) => this.anims.generateFrameNumbers('enemigo2', { start: inicio + a, end: inicio + a + n - 1 });
      this.anims.create({ key: `garrotero_${poncho}`, frames: cuadros(0, E.caminar), frameRate: 10, repeat: -1 });
      this.anims.create({ key: `garrotero_ataque_${poncho}`, frames: cuadros(E.caminar, E.ataque), frameRate: 12 });
      this.anims.create({ key: `garrotero_quieto_${poncho}`, frames: cuadros(E.caminar, 1), frameRate: 1 });
      this.anims.create({ key: `garrotero_muerte_${poncho}`, frames: cuadros(E.caminar + E.ataque, E.muerte), frameRate: 10 });
    });

    this.garroteros = this.physics.add.group({ allowGravity: true });
    const ponchos = this.rnd.shuffle([...E.ponchos]);
    posiciones.forEach(({ x, abajo, min, max, zona }, i) => {
      const poncho = ponchos[i % ponchos.length];
      const g = this.garroteros.create(x, abajo - 2, 'enemigo2', 0).setOrigin(0.5, 1)
        .setScale(ESCALA * this.rnd.realInRange(0.96, 1.05)).setDepth(9.6);
      g.body.setSize(E.cuerpo.ancho, E.cuerpo.alto).setOffset((E.ancho - E.cuerpo.ancho) / 2, E.alto - E.cuerpo.alto - 1);
      g.setData({
        estado: 'ronda', poncho, zona, origen: x, min, max, vida: E.vida, direccion: this.rnd.pick([-1, 1]),
        velocidad: this.rnd.between(...E.velocidad), rampa: null, xAnterior: g.body.x, atacaDesde: 0
      });
      const sombra = this.crearSombra(SOMBRA.cholita, 9.3);
      g.setData('sombra', sombra);
      g.once('destroy', () => sombra.destroy());
      g.play({ key: `garrotero_${poncho}`, startFrame: this.rnd.between(0, E.caminar - 1) });
    });

    this.colisionesEnemigos(this.garroteros);
    this.physics.add.overlap(this.jugador, this.garroteros, (j, g) => this.pisarGarrotero(g));
    this.physics.add.overlap(this.balas, this.garroteros, (bala, g) => {
      if (!['ronda', 'ataque'].includes(g.getData('estado')) || !bala.active) return;
      if (this.impactoBala(bala)) return; // cohete o granada: explota en área (Jugador.js)
      const fuego = bala.getData('tipo') === 'llama';
      if (!fuego) sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1); // Efectos.js
      bala.destroy();
      this.danarGarrotero(g, bala.x, fuego, bala.getData('dano') || 1);
    });
  },

  vivoGarrotero(g) {
    return ['ronda', 'ataque'].includes(g.getData('estado'));
  },

  // Ronda; si ve al jugador lo corre y de cerca le pega.
  moverGarroteros() {
    if (!this.garroteros) return;
    const E = ENEMIGO2;
    const j = this.jugador;
    this.garroteros.getChildren().forEach((g) => {
      if (g.getData('estado') === 'vencido') return;
      this.actualizarSombra(g.getData('sombra'), g);
      const cuerpo = g.body;
      const poncho = g.getData('poncho');
      // Rampas (solo Nivel1), también mientras ataca: si no, se hundía en la rampa.
      const rampa = this.seguirTerreno ? this.seguirTerreno(g) : null;
      if (g.getData('estado') !== 'ronda') return;
      const enSuelo = cuerpo.blocked.down || cuerpo.touching.down || !!rampa;
      const dx = j.body.center.x - cuerpo.center.x;
      const ve = this.estado === 'control' && !this.muerto && Math.abs(dx) < E.vista &&
        Math.abs(j.body.bottom - cuerpo.bottom) < E.vistaAlto;
      if (ve && enSuelo && Math.abs(dx) < E.alcance && this.time.now > g.getData('atacaDesde')) {
        this.atacarGarrotero(g, Math.sign(dx) || 1);
        return;
      }
      const min = g.getData('min') ?? g.getData('origen') - E.ronda;
      const max = g.getData('max') ?? g.getData('origen') + E.ronda;
      let direccion = g.getData('direccion');
      if (ve) direccion = Math.sign(dx) || direccion;
      else if (cuerpo.center.x <= min) direccion = 1;
      else if (cuerpo.center.x >= max) direccion = -1;
      if (!ve && ((direccion < 0 && (cuerpo.blocked.left || cuerpo.touching.left)) ||
        (direccion > 0 && (cuerpo.blocked.right || cuerpo.touching.right)))) direccion = -direccion;
      let velocidad = ve ? E.persecucion : g.getData('velocidad');
      // No se tira por un borde (ni persiguiendo): ahí se planta.
      const adelante = cuerpo.center.x + direccion * (cuerpo.width / 2 + 12);
      const borde = this.sueloBajo
        ? enSuelo && this.sueloBajo(adelante, cuerpo.bottom - 20) > cuerpo.bottom + 30
        : (g.getData('min') !== undefined && (adelante < g.getData('min') - 30 || adelante > g.getData('max') + 30));
      if (borde) {
        if (ve) velocidad = 0; else direccion = -direccion;
      }
      if (ve && Math.abs(dx) < E.alcance * 0.7) velocidad = 0;
      g.setData('direccion', direccion).setFlipX(direccion < 0);
      cuerpo.setVelocityX(enSuelo ? direccion * velocidad : 0);
      if (velocidad) {
        if (g.anims.currentAnim.key !== `garrotero_${poncho}`) g.play(`garrotero_${poncho}`);
        g.anims.timeScale = velocidad / 52;
      } else if (g.anims.currentAnim.key !== `garrotero_quieto_${poncho}`) {
        g.play(`garrotero_quieto_${poncho}`);
      }
    });
  },

  // Garrotazo: levanta, baja con el arco y, en ese cuadro, si el jugador sigue
  // al alcance, le pega.
  atacarGarrotero(g, lado) {
    const E = ENEMIGO2;
    const poncho = g.getData('poncho');
    g.setData('estado', 'ataque');
    g.body.setVelocityX(0);
    g.setFlipX(lado < 0);
    g.anims.timeScale = 1;
    g.play(`garrotero_ataque_${poncho}`);
    const alCuadro = (anim, cuadro) => {
      if (cuadro.index - 1 !== E.golpe || g.getData('estado') !== 'ataque') return;
      g.off('animationupdate', alCuadro);
      const j = this.jugador;
      const dx = j.body.center.x - g.body.center.x;
      const alAlcance = Math.sign(dx) === lado && Math.abs(dx) < E.alcance + 26 && Math.abs(j.body.bottom - g.body.bottom) < 70;
      this.cameras.main.shake(70, 0.004);
      if (alAlcance && this.estado === 'control' && this.golpearJugador(g.x, E.empuje)) g.setData('acerto', true);
    };
    g.on('animationupdate', alCuadro);
    g.once('animationcomplete', () => {
      g.off('animationupdate', alCuadro);
      if (g.getData('estado') !== 'ataque') return;
      const pausa = g.getData('acerto') ? E.pausaAcerto : E.pausa;
      g.setData('estado', 'ronda').setData('acerto', false).setData('atacaDesde', this.time.now + this.rnd.between(...pausa));
      g.play(`garrotero_quieto_${poncho}`);
    });
  },

  // El jugador le cae encima: queda fuera de combate y el jugador rebota.
  pisarGarrotero(g) {
    if (this.estado !== 'control' || !this.vivoGarrotero(g)) return;
    const j = this.jugador;
    if (j.body.velocity.y > 0 && j.body.prev.y + j.body.height <= g.body.top + 14) {
      j.setVelocityY(-JUGADOR.salto * 0.6);
      this.vencerGarrotero(g, j.x);
    }
  },

  danarGarrotero(g, desdeX, fuego, dano = 1) {
    const vida = g.getData('vida') - (fuego ? 1 : dano);
    g.setData('vida', vida);
    if (vida <= 0) { this.vencerGarrotero(g, desdeX, fuego); return; }
    // Aguanta: destello blanco y un pasito para atrás.
    g.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (g.active && g.getData('estado') !== 'vencido') g.clearTint(); });
    this.tweens.add({ targets: g, x: g.x + (desdeX < g.x ? 8 : -8), duration: 90 });
  },

  // Cae de espaldas, lejos de quien le pegó (animación de muerte), y se desvanece.
  vencerGarrotero(g, desdeX = this.jugador.x, fuego = false) {
    if (g.getData('estado') === 'vencido') return;
    const E = ENEMIGO2;
    g.setData('estado', 'vencido');
    sonarSfx(this, 'muerteNpc'); // Armas.js (enemigo común)
    sumarPuntos(this, E.puntos);
    g.body.enable = false;
    g.removeAllListeners('animationupdate');
    g.removeAllListeners('animationcomplete');
    const lejos = desdeX < g.x ? 1 : -1;
    g.setFlipX(lejos > 0); // mira hacia quien le pegó y cae para atrás
    this.aviso(g.x, g.y - E.alto * ESCALA, this.rnd.pick(['¡AYAYAY!', '¡ACHACHAY!', '¡UFF!']), 'rojo');
    if (fuego) {
      g.setTint(0x5a3a2a);
      chispas(this, g.x, g.y - 50, 10, -90, 120, 11);
    } else {
      g.clearTint();
      estallidoSangre(this, g.x, g.y - E.alto * ESCALA * 0.5); // Efectos.js
    }
    g.anims.timeScale = 1;
    g.play(`garrotero_muerte_${g.getData('poncho') || E.ponchos[0]}`);
    // Sale despedido para atrás con un saltito; al sentarse golpea el piso.
    this.tweens.add({ targets: g, x: g.x + lejos * 46, duration: 480, ease: 'Quad.out' });
    this.tweens.add({ targets: g, y: g.y - 22, duration: 180, delay: 120, ease: 'Quad.out', yoyo: true });
    g.on('animationupdate', (anim, cuadro) => {
      if (cuadro.index - 1 === E.sentado) this.cameras.main.shake(60, 0.003);
    });
    g.once('animationcomplete', () => {
      g.removeAllListeners('animationupdate');
      this.tweens.add({ targets: [g, g.getData('sombra')], alpha: 0, delay: 1200, duration: 500, onComplete: () => g.destroy() });
    });
  },

  // Explosiones, escopetazo y machete.
  garroterosEnArea(x, y, radio, cuerpo) {
    if (!this.garroteros) return;
    this.garroteros.getChildren().forEach((g) => {
      if (!this.vivoGarrotero(g)) return;
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y - ENEMIGO2.alto * ESCALA / 2) > radio + 20) return;
      if (cuerpo) sangrar(this, g.x, g.y - ENEMIGO2.alto * ESCALA / 2, g.x < x ? -1 : 1);
      this.vencerGarrotero(g, x, !cuerpo);
    });
  }
};

Object.assign(Nivel1.prototype, AccionesGarroteros);
