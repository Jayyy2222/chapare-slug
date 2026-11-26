// =============================================================================
// Soldados (enemigo1): rebeldes con sombrero de selva y fusil. Patrullan
// alrededor de donde aparecen (marca E del mapa) o vigilan quietos arriba de
// las torres; al ver al jugador se plantan, apuntan y, después de reaccionar,
// disparan de a un tiro (a veces dos), como los soldados de Metal Slug: balas
// lentas que se esquivan, por turnos (TURNOS) y solo los que están a la vista.
// Caen con un balazo (o una explosión) con la animación de enemigo1_muerte.
// Los usan Nivel1 (marcas E) y la Cueva (CUEVA.enemigos): cada escena pone
// sus colisiones con colisionesEnemigos(grupo); las rampas y los bordes
// (pegarARampa, sueloBajo) solo si la escena los tiene; si no, no pasan de min/max.
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
  rafaga: [1, 1, 1, 2],                 // disparos seguidos (se elige uno; una animación cada uno)
  reaccion: [500, 850],                 // ms desde que ve al jugador hasta el primer tiro
  pausa: [1700, 2900],                  // ms entre ráfagas
  bala: { velocidad: 230, vida: 4000 }, // lenta: se ve venir y se esquiva
  boca: { x: 33, y: 36 },               // el caño (px de arte desde los pies, mirando a la derecha)
  puntos: 100
};

// Hacia dónde sale la bala (radianes), según dónde está el jugador al
// disparar: si la altura del caño le cruza el cuerpo, recta; si está más
// arriba o más abajo (el soldado en una cornisa, o él saltando o en otro
// piso), en diagonal, redondeada a pasos de 22,5° y hasta 67,5°. Después va
// recta: no lo sigue.
const PASO_DISPARO = Math.PI / 8;
function anguloSoldado(x, y, lado, cuerpo) {
  const base = lado > 0 ? 0 : Math.PI;
  if (y >= cuerpo.top && y <= cuerpo.bottom) return base;
  // Ángulo hacia el pecho, del lado al que mira (no tira para atrás).
  const dx = Math.max(Math.abs(cuerpo.center.x - x), 1);
  const caida = Math.atan2(cuerpo.center.y - y, dx); // + abajo, - arriba
  const paso = Phaser.Math.Clamp(Math.round(caida / PASO_DISPARO), -3, 3);
  return lado > 0 ? paso * PASO_DISPARO : Math.PI - paso * PASO_DISPARO;
}

// Para que no disparen todos a la vez: cuántos pueden estar disparando, cuánto
// tiene que pasar entre que empieza uno y el siguiente, cuántas balas de
// soldados puede haber en el aire y, si no le toca, cuánto espera para volver a probar.
const TURNOS = { tiradores: 2, separacion: 400, balas: 4, espera: [300, 700] };

// El tiro de los soldados: el de la AK-47, más grave y más bajo que el del
// jugador; se oye menos cuanto más lejos está (Armas.js: sonarTramo).
const SFX_SOLDADO = { archivo: 'ak47.mp3', inicio: 0.38, dura: 0.3, volumen: 0.3, tono: 0.85, filtro: 2000 };

function cargarSoldados(escena) {
  if (!escena.textures.exists('enemigo1')) {
    escena.load.spritesheet('enemigo1', 'assets/personajes/enemigos/enemigo1_sheet.png',
      { frameWidth: ENEMIGO1.ancho, frameHeight: ENEMIGO1.alto });
  }
}

const AccionesSoldados = {
  // posiciones: [{ x, abajo, torre?, min?, max?, zona? }]
  crearSoldados(posiciones) {
    const E = ENEMIGO1;
    const porFila = E.caminar + E.ataque + E.muerte;
    E.camisas.forEach((camisa, fila) => {
      if (this.anims.exists(`soldado_${camisa}`)) return;
      const inicio = fila * porFila;
      const cuadros = (a, n) => this.anims.generateFrameNumbers('enemigo1', { start: inicio + a, end: inicio + a + n - 1 });
      this.anims.create({ key: `soldado_${camisa}`, frames: cuadros(0, E.caminar), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `soldado_ataque_${camisa}`, frames: cuadros(E.caminar, E.ataque), frameRate: 11 }); // apunta, dispara y baja el fusil
      this.anims.create({ key: `soldado_muerte_${camisa}`, frames: cuadros(E.caminar + E.ataque, E.muerte), frameRate: 9 });
      // Parado (apuntando): el primer cuadro del ataque.
      this.anims.create({ key: `soldado_quieto_${camisa}`, frames: cuadros(E.caminar, 1), frameRate: 1 });
    });
    texturaPixeles(this, 'balaSoldado', ['.yyyw', 'oyyyw'], { y: 0xffd23f, w: 0xffffff, o: 0xd06010 });

    this.soldados = this.physics.add.group({ allowGravity: true });
    this.balasSoldados = this.physics.add.group({ allowGravity: false });
    const camisas = this.rnd.shuffle([...E.camisas]);
    posiciones.forEach(({ x, abajo, torre, min, max, zona }, i) => {
      const camisa = camisas[i % camisas.length];
      const s = this.soldados.create(x, abajo - 2, 'enemigo1', 0).setOrigin(0.5, 1)
        .setScale(ESCALA * this.rnd.realInRange(0.96, 1.04)).setDepth(9.6);
      s.body.setSize(E.cuerpo.ancho, E.cuerpo.alto)
        .setOffset((E.ancho - E.cuerpo.ancho) / 2, E.alto - E.cuerpo.alto - 1);
      if (torre) { s.body.setAllowGravity(false); s.body.moves = false; }
      s.setData({
        estado: 'ronda', camisa, origen: x, torre: !!torre, min, max, zona, direccion: torre ? -1 : this.rnd.pick([-1, 1]),
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

    this.colisionesEnemigos(this.soldados);
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
    // Las balas se frenan contra la piedra (Nivel1: suelo y obstáculos; Cueva: sólidos).
    (this.solidos ? [this.solidos] : [this.suelo, this.obstaculos]).forEach((grupo) =>
      this.physics.add.collider(this.balasSoldados, grupo, (bala) => this.chispaBala(bala)));
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
      const cuerpo = s.body;
      const torre = s.getData('torre');
      // Rampas (solo Nivel1), también mientras dispara: parado en una rampa
      // sin esto se hundía y se caía del mapa (el suelo no choca en rampas).
      const rampa = !torre && this.seguirTerreno ? this.seguirTerreno(s) : null;
      if (s.getData('estado') !== 'ronda') return;
      const dx = j.body.center.x - cuerpo.center.x;
      const dy = j.body.bottom - cuerpo.bottom;
      const ve = this.estado === 'control' && !this.muerto && Math.abs(dx) < E.vista &&
        Math.abs(dy) < (torre ? E.vistaAlto * 2.2 : E.vistaAlto);
      if (ve) {
        cuerpo.setVelocityX(0);
        s.setFlipX(dx < 0).setData('direccion', Math.sign(dx) || 1);
        if (s.anims.currentAnim.key !== `soldado_quieto_${s.getData('camisa')}`) s.play(`soldado_quieto_${s.getData('camisa')}`);
        // Recién lo ve: tarda un momento en reaccionar.
        if (!s.getData('viendo')) {
          s.setData('viendo', true);
          s.setData('disparaDesde', Math.max(s.getData('disparaDesde'), this.time.now + this.rnd.between(...E.reaccion)));
        }
        if (this.time.now > s.getData('disparaDesde')) {
          if (this.leTocaDisparar(s)) this.rafagaSoldado(s, this.rnd.pick(E.rafaga));
          else s.setData('disparaDesde', this.time.now + this.rnd.between(...TURNOS.espera));
        }
        return;
      }
      s.setData('viendo', false);
      if (torre) return;
      if (s.anims.currentAnim.key !== `soldado_${s.getData('camisa')}`) s.play(`soldado_${s.getData('camisa')}`);
      const origen = s.getData('origen');
      const min = s.getData('min') ?? origen - E.ronda;
      const max = s.getData('max') ?? origen + E.ronda;
      let direccion = s.getData('direccion');
      if (cuerpo.center.x < min) direccion = 1;
      else if (cuerpo.center.x > max) direccion = -1;
      if ((direccion < 0 && (cuerpo.blocked.left || cuerpo.touching.left)) ||
        (direccion > 0 && (cuerpo.blocked.right || cuerpo.touching.right))) direccion = -direccion;
      const enSuelo = cuerpo.blocked.down || cuerpo.touching.down || !!rampa;
      const adelante = cuerpo.center.x + direccion * (cuerpo.width / 2 + 12);
      if (enSuelo && this.sueloBajo && this.sueloBajo(adelante, cuerpo.bottom - 20) > cuerpo.bottom + 30) direccion = -direccion;
      s.setData('direccion', direccion).setFlipX(direccion < 0);
      cuerpo.setVelocityX(direccion * s.getData('velocidad'));
    });
    // Las balas viejas se apagan.
    this.balasSoldados.getChildren().forEach((b) => {
      if (this.time.now > b.getData('hasta')) b.destroy();
    });
  },

  // Si este soldado puede empezar a disparar ahora (TURNOS): tiene que estar
  // a la vista, no puede haber muchos disparando ni muchas balas en el aire,
  // y desde la última ráfaga de cualquiera tiene que haber pasado un rato.
  leTocaDisparar(s) {
    const vista = this.cameras.main.worldView;
    if (!Phaser.Geom.Rectangle.Overlaps(vista, s.getBounds())) return false;
    const disparando = this.soldados.getChildren().filter((o) => o.getData('estado') === 'ataque').length;
    if (disparando >= TURNOS.tiradores) return false;
    if (this.balasSoldados.countActive() >= TURNOS.balas) return false;
    if (this.time.now < (this.ultimaRafagaSoldado || 0) + TURNOS.separacion) return false;
    this.ultimaRafagaSoldado = this.time.now;
    return true;
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
    // Apunta al jugador como si estuviera de pie: agachado en el mismo piso,
    // la bala sale recta y le pasa por encima (así se esquiva, como en Metal Slug).
    const c = this.jugador.body;
    const alto = this.agachado ? CUERPO_JUGADOR.alto * this.jugador.scaleY : c.height;
    const blanco = { top: c.bottom - alto, bottom: c.bottom, center: { x: c.center.x, y: c.bottom - alto / 2 } };
    const angulo = anguloSoldado(x, y, lado, blanco);
    const bala = this.balasSoldados.create(x, y, 'balaSoldado').setScale(ESCALA).setDepth(10.5)
      .setRotation(angulo).setFlipX(false);
    bala.body.setAllowGravity(false);
    bala.body.setSize(4, 2);
    bala.setVelocity(Math.cos(angulo) * E.bala.velocidad, Math.sin(angulo) * E.bala.velocidad);
    bala.setData({ hasta: this.time.now + E.bala.vida, lado });
    // El sonido, más bajo cuanto más lejos del jugador.
    const lejos = Phaser.Math.Distance.Between(x, y, this.jugador.x, this.jugador.y);
    sonarTramo(this, { ...SFX_SOLDADO, volumen: SFX_SOLDADO.volumen * Phaser.Math.Clamp(1.2 - lejos / 900, 0.35, 1) }, 'soldado');
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
    sonarSfx(this, 'muerteNpc'); // Armas.js (enemigo común)
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
