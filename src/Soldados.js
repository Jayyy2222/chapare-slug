// =============================================================================
// Soldados (enemigo1): rebeldes con sombrero de selva y fusil. Patrullan
// alrededor de donde aparecen (marca E del mapa) o vigilan quietos arriba de
// las torres; al ver al jugador se plantan, apuntan y disparan ráfagas cortas.
// Caen con un balazo (o una explosión) con la animación de enemigo1_muerte.
//
// enemigo1_sheet.png (herramientas/enemigo1_spritesheet.py): una fila por
// camisa; en cada fila 12 cuadros de caminar, 4 de ataque y 6 de muerte. Las
// camisas se reparten mezcladas y cada uno camina a su ritmo, así los que
// aparecen juntos no se ven iguales.
// =============================================================================

const ENEMIGO1 = {
  ancho: 84, alto: 67,                  // celda (px de arte)
  caminar: 12, ataque: 4, muerte: 6,
  camisas: ['turquesa', 'roja', 'azul', 'naranja', 'gris', 'morada'],
  cuerpo: { ancho: 20, alto: 52 },      // caja de colisión (px de arte), en los pies
  velocidad: [42, 60],                  // px/s de ronda (cada uno la suya)
  ronda: 170,                           // px a cada lado de donde aparece
  vista: 470, vistaAlto: 170,           // ve al jugador a esta distancia
  disparo: 1,                           // cuadro del ataque con el fogonazo
  rafaga: [2, 4],                       // disparos seguidos (una animación cada uno)
  pausa: [650, 1250],                   // ms entre ráfagas
  bala: { velocidad: 400, vida: 2400 },
  boca: { x: 33, y: 36 },               // el caño (px de arte desde los pies, mirando a la derecha)
  puntos: 100
};

function cargarSoldados(escena) {
  if (!escena.textures.exists('enemigo1')) {
    escena.load.spritesheet('enemigo1', 'assets/personajes/enemigos/enemigo1_sheet.png',
      { frameWidth: ENEMIGO1.ancho, frameHeight: ENEMIGO1.alto });
  }
}

const AccionesSoldados = {
  // posiciones: [{ x, abajo, torre }]
  crearSoldados(posiciones) {
    const E = ENEMIGO1;
    const porFila = E.caminar + E.ataque + E.muerte;
    E.camisas.forEach((camisa, fila) => {
      if (this.anims.exists(`soldado_${camisa}`)) return;
      const inicio = fila * porFila;
      const cuadros = (a, n) => this.anims.generateFrameNumbers('enemigo1', { start: inicio + a, end: inicio + a + n - 1 });
      this.anims.create({ key: `soldado_${camisa}`, frames: cuadros(0, E.caminar), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `soldado_ataque_${camisa}`, frames: cuadros(E.caminar, E.ataque), frameRate: 16 });
      this.anims.create({ key: `soldado_muerte_${camisa}`, frames: cuadros(E.caminar + E.ataque, E.muerte), frameRate: 9 });
      // Parado (apuntando): el primer cuadro del ataque.
      this.anims.create({ key: `soldado_quieto_${camisa}`, frames: cuadros(E.caminar, 1), frameRate: 1 });
    });
    texturaPixeles(this, 'balaSoldado', ['.yyyw', 'oyyyw'], { y: 0xffd23f, w: 0xffffff, o: 0xd06010 });

    this.soldados = this.physics.add.group({ allowGravity: true });
    this.balasSoldados = this.physics.add.group({ allowGravity: false });
    const camisas = this.rnd.shuffle([...E.camisas]);
    posiciones.forEach(({ x, abajo, torre }, i) => {
      const camisa = camisas[i % camisas.length];
      const s = this.soldados.create(x, abajo - 2, 'enemigo1', 0).setOrigin(0.5, 1)
        .setScale(ESCALA * this.rnd.realInRange(0.96, 1.04)).setDepth(9.6);
      s.body.setSize(E.cuerpo.ancho, E.cuerpo.alto)
        .setOffset((E.ancho - E.cuerpo.ancho) / 2, E.alto - E.cuerpo.alto - 1);
      if (torre) { s.body.setAllowGravity(false); s.body.moves = false; }
      s.setData({
        estado: 'ronda', camisa, origen: x, torre: !!torre, direccion: torre ? -1 : this.rnd.pick([-1, 1]),
        velocidad: this.rnd.between(...E.velocidad), rampa: null, xAnterior: s.body.x,
        disparaDesde: this.time.now + this.rnd.between(300, 1000)
      });
      const sombra = this.crearSombra(SOMBRA.cholita, 9.3);
      s.setData('sombra', sombra);
      s.once('destroy', () => sombra.destroy());
      if (torre) s.setFlipX(true).play(`soldado_quieto_${camisa}`);
      else s.play({ key: `soldado_${camisa}`, startFrame: this.rnd.between(0, E.caminar - 1) });
      s.anims.timeScale = s.getData('velocidad') / 52;
    });

    this.physics.add.collider(this.soldados, this.suelo, null, (s) => !s.getData('rampa'));
    this.physics.add.collider(this.soldados, this.obstaculos);
    this.physics.add.collider(this.soldados, this.pasarelas, null, (s, tramo) => this.puedePisar(s, tramo));
    this.physics.add.overlap(this.jugador, this.soldados, (j, s) => this.pisarSoldado(s));
    this.physics.add.overlap(this.balas, this.soldados, (bala, s) => {
      if (!['ronda', 'ataque'].includes(s.getData('estado'))) return;
      if (this.impactoBala(bala)) return; // cohete o granada: explota en área (Jugador.js)
      const fuego = bala.getData('tipo') === 'llama';
      if (!fuego) sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1); // Efectos.js
      bala.destroy();
      this.vencerSoldado(s, bala.x, fuego);
    });
    this.physics.add.overlap(this.jugador, this.balasSoldados, (a, b) => {
      const bala = a === this.jugador ? b : a;
      if (this.estado !== 'control' || !bala.active || !bala.body) return;
      const desde = bala.x - (bala.getData('lado') || 1) * 20; // de dónde venía
      bala.destroy();
      this.golpearJugador(desde);
    });
    this.physics.add.collider(this.balasSoldados, this.suelo, (bala) => this.chispaBala(bala));
    this.physics.add.collider(this.balasSoldados, this.obstaculos, (bala) => this.chispaBala(bala));
  },

  chispaBala(bala) {
    if (!bala.active) return;
    chispas(this, bala.x, bala.y, 4, bala.body.velocity.x > 0 ? 180 : 0, 70, 11); // Efectos.js
    bala.destroy();
  },

  // Ronda y, si ve al jugador, se planta y dispara.
  moverSoldados() {
    if (!this.soldados) return;
    const E = ENEMIGO1;
    const j = this.jugador;
    this.soldados.getChildren().forEach((s) => {
      if (s.getData('estado') === 'vencido') return;
      this.actualizarSombra(s.getData('sombra'), s);
      if (s.getData('estado') !== 'ronda') return;
      const cuerpo = s.body;
      const torre = s.getData('torre');
      let rampa = null;
      if (!torre) {
        if (s.getData('rampa')) this.frenarContraMuro(s, s.getData('xAnterior'));
        rampa = this.pegarARampa(s, true);
        if (!rampa && s.getData('rampa')) this.asentarEnPiedra(s);
        s.setData('rampa', rampa).setData('xAnterior', cuerpo.x);
      }
      const dx = j.body.center.x - cuerpo.center.x;
      const dy = j.body.bottom - cuerpo.bottom;
      const ve = this.estado === 'control' && !this.muerto && Math.abs(dx) < E.vista &&
        Math.abs(dy) < (torre ? E.vistaAlto * 2.2 : E.vistaAlto);
      if (ve) {
        cuerpo.setVelocityX(0);
        s.setFlipX(dx < 0).setData('direccion', Math.sign(dx) || 1);
        if (s.anims.currentAnim.key !== `soldado_quieto_${s.getData('camisa')}`) s.play(`soldado_quieto_${s.getData('camisa')}`);
        if (this.time.now > s.getData('disparaDesde')) this.rafagaSoldado(s, this.rnd.between(...E.rafaga));
        return;
      }
      if (torre) return;
      if (s.anims.currentAnim.key !== `soldado_${s.getData('camisa')}`) s.play(`soldado_${s.getData('camisa')}`);
      const origen = s.getData('origen');
      let direccion = s.getData('direccion');
      if (cuerpo.center.x < origen - E.ronda) direccion = 1;
      else if (cuerpo.center.x > origen + E.ronda) direccion = -1;
      if ((direccion < 0 && (cuerpo.blocked.left || cuerpo.touching.left)) ||
        (direccion > 0 && (cuerpo.blocked.right || cuerpo.touching.right))) direccion = -direccion;
      const enSuelo = cuerpo.blocked.down || cuerpo.touching.down || !!rampa;
      const adelante = cuerpo.center.x + direccion * (cuerpo.width / 2 + 12);
      if (enSuelo && this.sueloBajo(adelante, cuerpo.bottom - 20) > cuerpo.bottom + 30) direccion = -direccion;
      s.setData('direccion', direccion).setFlipX(direccion < 0);
      cuerpo.setVelocityX(direccion * s.getData('velocidad'));
    });
    // Las balas viejas se apagan.
    this.balasSoldados.getChildren().forEach((b) => {
      if (this.time.now > b.getData('hasta')) b.destroy();
    });
  },

  // Una ráfaga de `n` tiros: cada uno es una vuelta de la animación de ataque
  // y la bala sale en el cuadro del fogonazo.
  rafagaSoldado(s, n) {
    const E = ENEMIGO1;
    const camisa = s.getData('camisa');
    s.setData('estado', 'ataque');
    const tiro = (quedan) => {
      if (s.getData('estado') !== 'ataque') return;
      s.play(`soldado_ataque_${camisa}`);
      const alCuadro = (anim, cuadro) => {
        if (cuadro.index - 1 !== E.disparo || s.getData('estado') !== 'ataque') return;
        s.off('animationupdate', alCuadro);
        this.balaSoldado(s);
      };
      s.on('animationupdate', alCuadro);
      s.once('animationcomplete', () => {
        s.off('animationupdate', alCuadro);
        if (s.getData('estado') !== 'ataque') return;
        if (quedan > 1) { tiro(quedan - 1); return; }
        s.setData('estado', 'ronda').setData('disparaDesde', this.time.now + this.rnd.between(...E.pausa));
        s.play(`soldado_quieto_${camisa}`);
      });
    };
    tiro(n);
  },

  balaSoldado(s) {
    const E = ENEMIGO1;
    const lado = s.flipX ? -1 : 1;
    const esc = s.scaleX;
    const x = s.x + lado * E.boca.x * esc;
    const y = s.y - E.boca.y * esc;
    const j = this.jugador;
    // Apunta al pecho del jugador, pero sin pasar de ±25° (no tira para atrás).
    let angulo = Math.atan2(j.body.center.y - y, j.body.center.x - x);
    const base = lado > 0 ? 0 : Math.PI;
    let d = Phaser.Math.Angle.Wrap(angulo - base);
    d = Phaser.Math.Clamp(d, -0.44, 0.44);
    angulo = base + d;
    const bala = this.balasSoldados.create(x, y, 'balaSoldado').setScale(ESCALA).setDepth(10.5)
      .setRotation(angulo).setFlipX(false);
    bala.body.setAllowGravity(false);
    bala.body.setSize(4, 2);
    bala.setVelocity(Math.cos(angulo) * E.bala.velocidad, Math.sin(angulo) * E.bala.velocidad);
    bala.setData({ hasta: this.time.now + E.bala.vida, lado });
    // Fogonazo chico en la boca.
    const fogonazo = this.add.image(x, y, 'fx_chispa').setScale(ESCALA * 2.2).setTint(0xffd060)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(10.6);
    this.tweens.add({ targets: fogonazo, alpha: 0, scale: ESCALA, duration: 90, onComplete: () => fogonazo.destroy() });
  },

  // El jugador le cae encima: queda fuera de combate y el jugador rebota.
  pisarSoldado(s) {
    if (this.estado !== 'control' || !['ronda', 'ataque'].includes(s.getData('estado'))) return;
    const j = this.jugador;
    if (j.body.velocity.y > 0 && j.body.prev.y + j.body.height <= s.body.top + 14) {
      j.setVelocityY(-JUGADOR.salto * 0.6);
      this.vencerSoldado(s);
    }
  },

  // enemigo1_muerte: el golpe, grita, sale volando hacia atrás (se le cae el
  // sombrero y el fusil), destello y queda tendido. Con fuego, quemado.
  vencerSoldado(s, desdeX = this.jugador.x, fuego = false) {
    s.setData('estado', 'vencido');
    sumarPuntos(this, ENEMIGO1.puntos);
    s.body.enable = false;
    s.anims.timeScale = 1;
    s.removeAllListeners('animationupdate');
    s.removeAllListeners('animationcomplete');
    const lejos = desdeX < s.x ? 1 : -1;
    // Los cuadros miran a la derecha y cae para atrás: mira hacia quien le pegó.
    s.setFlipX(desdeX < s.x);
    s.play(`soldado_muerte_${s.getData('camisa')}`);
    this.aviso(s.x, s.y - ENEMIGO1.alto * ESCALA, this.rnd.pick(['¡AAARGH!', '¡AY!', '¡NOOO!']), 'rojo');
    if (fuego) {
      s.setTint(0x5a3a2a); // chamuscado
      chispas(this, s.x, s.y - 50, 10, -90, 120, 11);
    } else {
      estallidoSangre(this, s.x, s.y - ENEMIGO1.alto * ESCALA * 0.5); // Efectos.js
    }
    this.tweens.add({ targets: s, x: s.x + lejos * 34, duration: 500, ease: 'Quad.out' });
    s.once('animationcomplete', () => {
      this.tweens.add({ targets: [s, s.getData('sombra')], alpha: 0, delay: 1500, duration: 500, onComplete: () => s.destroy() });
    });
  },

  // Explosiones (cohete, granada, turril): también los soldados.
  soldadosEnArea(x, y, radio, cuerpo) {
    if (!this.soldados) return;
    this.soldados.getChildren().forEach((s) => {
      if (!['ronda', 'ataque'].includes(s.getData('estado'))) return;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y - ENEMIGO1.alto * ESCALA / 2) > radio + 20) return;
      this.vencerSoldado(s, x, !cuerpo);
    });
  }
};

Object.assign(Nivel1.prototype, AccionesSoldados);
