// =============================================================================
// El jugador: lo que comparten las escenas en las que se juega (Nivel1 y
// JefeFinal). Las escenas mezclan AccionesJugador en su prototipo y usan:
//   this.jugador        el sprite con cuerpo de física
//   this.balas          lo crea crearBalas()
//   this.enSueloAntes   si estaba en el suelo el cuadro anterior
// Los spritesheets los carga Nivel1 (las texturas quedan para todo el juego).
// =============================================================================

const JUGADOR = {
  velocidad: 220,
  corrida: 1.6,      // SHIFT: multiplica la velocidad
  salto: 650,        // alcanza las ramas, las losas y dos cajas apiladas
  // Al recibir un golpe: lo que sale despedido y cuánto tarda en poder recibir otro.
  golpe: { empujon: { x: 360, y: 280 }, invulnerable: 1000 }
};

// Cuadros de cada personaje en su spritesheet (celdas de 84x84, pies en
// x 38, y 72). Lo que un personaje no tiene se reemplaza: sin correr usa
// caminar más rápido; sin saltar, el cuadro `aire`; sin ataque, el cuadro 0.
// boca: punta del arma en px de arte respecto del centro de la celda.
const CUADROS_JUGADOR = {
  jugador: { caminar: [0, 7], aire: 2, boca: { x: 12, y: 8 } },
  // herramientas/manfred_spritesheet.py
  jugadorManfred: {
    caminar: [0, 7], correr: [8, 15], ataque: [22, 25], aire: 18,
    saltar: { subir: 17, arriba: 18, bajar: 19, caer: 20, aterrizar: 21 },
    boca: { x: 28, y: 1 }
  }
};

// Disparo (J o X, se puede mantener apretado). Las balas son las trazadoras
// del menú (fx_bala de EfectosMenu.js).
const DISPARO = { cadencia: 140, velocidad: 950, alcance: 620, pose: 220 };

// Spritesheet del personaje elegido en la selección ('personaje' en el
// registry). Los dos tienen celdas de 84x84 con los pies en el mismo lugar,
// así que comparten caja de colisión. También lo usan Interior.js y JefeFinal.js.
function texturaJugador(escena) {
  return escena.registry.get('personaje') === 'manfred' ? 'jugadorManfred' : 'jugador';
}

const AccionesJugador = {
  // Animaciones del personaje elegido (se rehacen si cambió) y texturas de
  // efectos. Devuelve la textura del jugador.
  prepararJugador() {
    const textura = texturaJugador(this);
    const cuadros = CUADROS_JUGADOR[textura];
    this.cuadrosJugador = cuadros;
    const animacion = (key, [inicio, fin], frameRate, repeat = -1) => {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(textura, { start: inicio, end: fin }), frameRate, repeat });
    };
    animacion('jugador_caminar', cuadros.caminar, 10);
    animacion('jugador_correr', cuadros.correr || cuadros.caminar, cuadros.correr ? 14 : 16);
    if (this.anims.exists('jugador_ataque')) this.anims.remove('jugador_ataque');
    if (cuadros.ataque) animacion('jugador_ataque', cuadros.ataque, 18, 0);
    texturasEfectos(this); // fx_bala, fx_fogonazo, fx_chispa... (EfectosMenu.js)
    this.proximoDisparo = 0;
    this.disparandoHasta = 0;
    this.aterrizandoHasta = 0;
    this.golpeHasta = 0;
    this.invulnerableHasta = 0;
    return textura;
  },

  // Cuadro o animación del jugador según lo que está haciendo. Al caer, el
  // aterrizaje dura un instante (solo si el personaje tiene cuadros de salto).
  // lentitud: en el agua las animaciones van más lentas.
  animarJugador(enSuelo, direccion, corre, lentitud = 1) {
    const j = this.jugador;
    const cuadros = this.cuadrosJugador;
    const ahora = this.time.now;
    if (enSuelo && !this.enSueloAntes && cuadros.saltar) this.aterrizandoHasta = ahora + 90;
    j.anims.timeScale = lentitud;

    if (!enSuelo) {
      j.anims.stop();
      const s = cuadros.saltar;
      if (!s) {
        j.setFrame(cuadros.aire);
      } else {
        const vy = j.body.velocity.y;
        j.setFrame(vy < -300 ? s.subir : vy < 0 ? s.arriba : vy < 300 ? s.bajar : s.caer);
      }
    } else if (direccion) {
      j.anims.play(corre ? 'jugador_correr' : 'jugador_caminar', true);
    } else if (ahora < this.aterrizandoHasta) {
      j.anims.stop();
      j.setFrame(cuadros.saltar.aterrizar);
    } else if (ahora < this.disparandoHasta && cuadros.ataque) {
      j.anims.play('jugador_ataque', true);
    } else {
      j.anims.stop();
      j.setFrame(0);
    }
  },

  // Las balas se frenan contra los cuerpos de `solidos` (grupos estáticos).
  // Lo que les pasa al pegarle a un enemigo lo arma cada escena.
  crearBalas(solidos) {
    this.balas = this.physics.add.group({ allowGravity: false });
    const impacto = (bala) => {
      chispas(this, bala.x, bala.y, 6, bala.flipX ? 0 : 180, 100, 10.3);
      bala.destroy();
    };
    solidos.forEach((grupo) => this.physics.add.collider(this.balas, grupo, impacto));
  },

  // Una bala desde la punta del arma hacia donde mira, con fogonazo y casquillo.
  disparar() {
    const j = this.jugador;
    const lado = j.flipX ? -1 : 1;
    const boca = this.cuadrosJugador.boca;
    const x = j.x + lado * boca.x * ESCALA;
    const y = j.y + boca.y * ESCALA;
    const bala = this.balas.create(x, y, 'fx_bala').setScale(2).setFlipX(lado < 0).setDepth(10.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    bala.body.setSize(14, 3);
    bala.setVelocityX(lado * DISPARO.velocidad);
    bala.setData('hasta', this.time.now + DISPARO.alcance / DISPARO.velocidad * 1000);
    fogonazo(this, x + lado * 6, y, 1.2, 10.3, lado < 0 ? 180 : 0);
    casquillo(this, j.x + lado * 10, y - 4, 10.1);
    this.proximoDisparo = this.time.now + DISPARO.cadencia;
    this.disparandoHasta = this.time.now + DISPARO.pose;
  },

  moverBalas() {
    this.balas.getChildren().forEach((bala) => {
      if (this.time.now > bala.getData('hasta')) bala.destroy();
    });
  },

  // Empuja al jugador lejos de desdeX y lo deja parpadeando un rato sin
  // recibir otro golpe. Devuelve false si todavía era invulnerable.
  golpearJugador(desdeX) {
    if (this.time.now < this.invulnerableHasta) return false;
    const j = this.jugador;
    const lado = Math.sign(j.body.center.x - desdeX) || 1;
    this.trepando = null;
    this.rampaActual = null;
    j.body.setAllowGravity(true);
    j.setVelocity(lado * JUGADOR.golpe.empujon.x, -JUGADOR.golpe.empujon.y);
    this.golpeHasta = this.time.now + 350;
    this.invulnerableHasta = this.time.now + JUGADOR.golpe.invulnerable;
    this.cameras.main.shake(120, 0.006);
    j.setTint(0xff6060);
    this.tweens.add({
      targets: j, alpha: 0.3, duration: 90, yoyo: true, repeat: Math.floor(JUGADOR.golpe.invulnerable / 180) - 1,
      onComplete: () => j.setAlpha(1).clearTint()
    });
    return true;
  }
};
