// =============================================================================
// Tuto (segundo jugador): cuerpo armado con piernas + torso, al estilo Metal
// Slug. Las hojas salen de herramientas/tuto_spritesheet.py (a px de
// pantalla, escala 1) y assets/personajes/jugador/tuto/anchors.json trae, por
// hoja, la celda, el ancla (la hebilla del cinturón en piernas y torso, los
// pies en las de cuerpo entero) y por cuadro la suela (piernas) y la mano
// (torsos).
//
// El sprite del jugador (con la física, Jugador.js) queda invisible: es una
// celda vacía de 84x84 con la misma caja de colisión que Manfred. Encima se
// dibujan, cada cuadro (después de la física):
//   piernas  parado, corriendo (run, 12 fps), en el aire (el cuadro según la
//            velocidad: sube, cima, cae, aterriza), agachado (crouch) o
//            caminando agachado (crouch_walk)
//   torso    apuntando (aiming), disparando (aiming rápido) o apuntando
//            arriba (aiming_straight_up). Va con su cintura sobre la de las
//            piernas: al agacharse baja con ellas.
//   arma     en el pixel de la mano de cada cuadro; 0° adelante y -90° arriba
//   entero   trepando (solo avanza mientras se aprieta una tecla), quieto un
//            rato sin hacer nada (idle) y al morir
// Sus parpadeos, tintes y giros se copian del sprite del jugador.
// =============================================================================

const TUTO = {
  ruta: 'assets/personajes/jugador/tuto/',
  hojas: ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk', 'torso_aiming', 'aiming_straight_up', 'idle', 'trepar'],
  quieto: 2500,       // ms parado sin hacer nada para pasar al idle de cuerpo entero
  aterrizaje: 110,    // ms del cuadro de aterrizar
  salto: { sube: -250, cae: 250 }, // velocity.y que separa subir / cima / caer
};

function cargarTuto(escena) {
  if (!escena.cache.json.exists('tutoAnclas')) escena.load.json('tutoAnclas', TUTO.ruta + 'anchors.json');
  TUTO.hojas.forEach((h) => {
    if (!escena.textures.exists('tuto_' + h)) escena.load.image('tuto_' + h, `${TUTO.ruta}tuto_${h}.png`);
  });
}

// Cuadros de cada tira (del ancho de celda de anchors.json) y animaciones.
function animacionesTuto(escena) {
  const datos = escena.cache.json.get('tutoAnclas');
  if (!datos) return null;
  TUTO.hojas.forEach((h) => {
    const t = escena.textures.get('tuto_' + h);
    if (t.has('0')) return;
    datos[h].cuadros.forEach((_, i) => t.add(String(i), 0, i * datos[h].ancho, 0, datos[h].ancho, datos[h].alto));
  });
  const anim = (key, hoja, frames, frameRate, repeat = -1) => {
    if (!escena.anims.exists(key)) {
      escena.anims.create({ key, frames: frames.map((f) => ({ key: 'tuto_' + hoja, frame: String(f) })), frameRate, repeat });
    }
  };
  anim('tuto_correr', 'piernas_run', [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], 12);
  anim('tuto_agacharse', 'piernas_crouch', [0, 1, 2], 18, 0);
  anim('tuto_agachado_caminar', 'piernas_crouch_walk', [0, 1, 2, 3, 4, 5], 10);
  anim('tuto_torso', 'torso_aiming', [0, 1, 2, 3, 2, 1], 5);
  anim('tuto_torso_disparo', 'torso_aiming', [1, 2], 20);
  anim('tuto_arriba', 'aiming_straight_up', [0, 1, 2, 3], 24, 0);
  anim('tuto_idle', 'idle', [0, 1, 2, 3, 4, 5], 6);
  anim('tuto_trepar', 'trepar', [0, 1, 2, 3, 4, 5], 10);
  return datos;
}

// El sprite del jugador de Tuto: una celda vacía de 84x84 (la física es la
// misma que la de Manfred).
function texturaBaseTuto(escena) {
  if (escena.textures.exists('jugadorTuto')) return;
  const t = escena.textures.createCanvas('jugadorTuto', 84, 84);
  t.add('0', 0, 0, 0, 84, 84);
  t.refresh();
}

// El cuerpo si el personaje elegido es Tuto (si no, null).
function cuerpoJugador(escena) {
  return texturaJugador(escena) === 'jugadorTuto' ? new CuerpoTuto(escena) : null;
}

class CuerpoTuto {
  constructor(escena) {
    this.escena = escena;
    this.datos = animacionesTuto(escena);
    this.creado = false;
    this.quietoDesde = 0;
    this.enSueloAntes = true;
    this.aterrizaHasta = 0;
    this.boca = null;       // punta del arma (mundo), para los disparos
    const actualizar = () => this.actualizar();
    escena.events.on('postupdate', actualizar);
    escena.events.once('shutdown', () => escena.events.off('postupdate', actualizar));
  }

  crear() {
    const e = this.escena;
    texturasSelector(e); // 'armaPistola' (Armas.js): la pistola en la mano
    this.piernas = e.add.sprite(0, 0, 'tuto_piernas_run', '0').setDepth(10);
    this.torso = e.add.sprite(0, 0, 'tuto_torso_aiming', '0').setDepth(10.05);
    this.entero = e.add.sprite(0, 0, 'tuto_idle', '0').setDepth(10).setVisible(false);
    this.arma = e.add.image(0, 0, 'armaPistola').setDepth(10.1);
    this.creado = true;
  }

  // Origen de una parte en su ancla (espejada si mira a la izquierda).
  anclar(sprite, hoja, izquierda) {
    const d = this.datos[hoja];
    const [ax, ay] = d.ancla;
    sprite.setFlipX(izquierda).setOrigin((izquierda ? d.ancho - ax : ax) / d.ancho, ay / d.alto);
  }

  // Hoja y número del cuadro que muestra un sprite.
  cuadro(sprite) {
    return { hoja: sprite.texture.key.slice(5), i: Number(sprite.frame.name) };
  }

  actualizar() {
    const e = this.escena;
    const j = e.jugador;
    if (!j || !j.active || !j.body || !this.datos) return;
    if (!this.creado) this.crear();
    j.setVisible(false);
    const b = j.body;
    const ahora = e.time.now;
    const izquierda = j.flipX;
    const lado = izquierda ? -1 : 1;
    const enSuelo = b.blocked.down || b.touching.down || !!e.rampaActual || !!e.enPendienteAntes;
    const vx = b.velocity.x;
    const disparando = ahora < (e.disparandoHasta || 0);
    const arriba = !!e.apuntaArriba;
    const agachado = !!e.agachado;
    if (enSuelo && !this.enSueloAntes) this.aterrizaHasta = ahora + TUTO.aterrizaje;
    this.enSueloAntes = enSuelo;
    if (Math.abs(vx) > 5 || !enSuelo || disparando || arriba || agachado || e.trepando) this.quietoDesde = ahora;

    // Lo que se copia del sprite del jugador: parpadeo, tinte, giro.
    const partes = [this.piernas, this.torso, this.entero, this.arma];
    partes.forEach((p) => {
      p.setAlpha(j.alpha);
      if (j.isTinted) p.setTint(j.tintTopLeft); else p.clearTint();
    });

    // Cuerpo entero: muerto, trepando o quieto un rato.
    const muerto = e.muerto;
    const trepando = !!e.trepando;
    const quieto = enSuelo && ahora - this.quietoDesde > TUTO.quieto;
    // Mareado (Jugador.aturdirJugador): parado, se tambalea con el giro del jugador.
    const mareado = !!e.aturdido || ahora < (e.recuperandoHasta || 0);
    if (muerto || trepando || quieto || mareado) {
      this.piernas.setVisible(false);
      this.torso.setVisible(false);
      this.arma.setVisible(false);
      const s = this.entero.setVisible(true);
      if (trepando) {
        // Solo avanza mientras trepa (Nivel1.trepar anima el sprite del
        // jugador); quieto en la escalera se queda en el cuadro en que iba.
        // (Si se había detenido al salir de la escalera, arranca de nuevo: con
        // resume() solo, un anim detenido queda congelado.)
        if (s.anims.currentAnim?.key !== 'tuto_trepar' || (!s.anims.isPlaying && !s.anims.isPaused)) s.play('tuto_trepar');
        if (j.anims.isPlaying) s.anims.resume(); else s.anims.pause();
      } else if (muerto || mareado) {
        s.anims.stop();
        s.setTexture('tuto_idle', '0');
      } else if (s.anims.currentAnim?.key !== 'tuto_idle' || !s.anims.isPlaying) {
        s.play('tuto_idle');
      }
      this.anclar(s, this.cuadro(s).hoja, izquierda);
      s.setPosition(b.center.x, b.bottom).setAngle(j.angle);
      this.boca = null;
      return;
    }
    this.entero.setVisible(false).anims.stop();
    this.piernas.setVisible(true);
    this.torso.setVisible(true);

    // Piernas.
    const p = this.piernas;
    if (!enSuelo) {
      p.anims.stop();
      const vy = b.velocity.y;
      p.setTexture('tuto_piernas_salto', String(vy < TUTO.salto.sube ? 1 : vy < TUTO.salto.cae ? 2 : 3));
    } else if (agachado) {
      if (Math.abs(vx) > 5) p.play('tuto_agachado_caminar', true);
      else if (p.anims.currentAnim?.key !== 'tuto_agacharse') p.play('tuto_agacharse');
    } else if (ahora < this.aterrizaHasta) {
      p.anims.stop();
      p.setTexture('tuto_piernas_salto', '4');
    } else if (Math.abs(vx) > 5) {
      p.play('tuto_correr', true);
      // Corriendo (SHIFT) a 12 fps; caminando, más lento.
      p.anims.timeScale = Math.abs(vx) > JUGADOR.velocidad * 1.2 ? 1 : 0.75;
    } else {
      p.anims.stop();
      p.setTexture('tuto_piernas_run', '0');
    }
    const cp = this.cuadro(p);
    const dp = this.datos[cp.hoja];
    this.anclar(p, cp.hoja, izquierda);
    // Cintura: en el piso, los pies del cuadro sobre el suelo; en el aire, a
    // la altura de parado.
    const parado = this.datos.piernas_run;
    const alturaCintura = enSuelo
      ? dp.cuadros[cp.i].pies - dp.ancla[1]
      : parado.cuadros[0].pies - parado.ancla[1];
    const cx = b.center.x;
    const cy = b.bottom - alturaCintura;
    p.setPosition(cx, cy);

    // Torso, con la cintura sobre la de las piernas.
    const t = this.torso;
    if (arriba) {
      if (t.anims.currentAnim?.key !== 'tuto_arriba') t.play('tuto_arriba');
    } else if (disparando) {
      t.play('tuto_torso_disparo', true);
    } else {
      t.play('tuto_torso', true);
    }
    const ct = this.cuadro(t);
    const dt = this.datos[ct.hoja];
    this.anclar(t, ct.hoja, izquierda);
    t.setPosition(cx, cy);

    // Arma en la mano de este cuadro.
    const [mx, my] = dt.cuadros[ct.i].mano;
    const mano = { x: cx + lado * (mx - dt.ancla[0]), y: cy + (my - dt.ancla[1]) };
    this.ponerArma(mano, lado, arriba);
  }

  // El arma con la empuñadura en la mano: 0° adelante, -90° arriba. Guarda la
  // punta del caño (de ahí salen las balas).
  ponerArma(mano, lado, arriba) {
    // La empuñadura de cada arma (ARMAS: agarre, agarreY) en la mano.
    const punta = colocarArma(this.escena, this.arma.setVisible(true), armaJugador(this.escena), mano, lado, arriba);
    this.boca = { x: mano.x + punta.x, y: mano.y + punta.y };
  }

  // Punta del arma en px de arte respecto del centro del sprite del jugador
  // (lo que espera Jugador.disparar).
  bocaRelativa() {
    const j = this.escena.jugador;
    const lado = j.flipX ? -1 : 1;
    if (!this.boca) return { x: 12, y: -10 };
    return { x: (this.boca.x - j.x) * lado / ESCALA, y: (this.boca.y - j.y) / ESCALA };
  }
}
