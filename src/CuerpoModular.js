// =============================================================================
// Cuerpo armado con piernas + torso, al estilo Metal Slug (Tuto y Manfred).
// Las hojas de cada personaje (CUERPOS) salen de herramientas/
// tuto_spritesheet.py y herramientas/manfred_cuerpo.py (a px de pantalla,
// escala 1); su anchors.json trae, por hoja, la celda, el ancla (la cintura en
// piernas y torso, los pies en las de cuerpo entero) y por cuadro la suela
// (piernas) y la mano (torsos).
//
// El sprite del jugador (con la física, Jugador.js) queda invisible. Encima
// se dibujan, cada cuadro (después de la física):
//   piernas  parado, corriendo (run, 12 fps), en el aire (el cuadro según la
//            velocidad: sube, cima, cae, aterriza), agachado (crouch) o
//            caminando agachado (crouch_walk)
//   torso    apuntando, disparando o apuntando arriba. Va con su cintura
//            sobre la de las piernas: al agacharse baja con ellas.
//   arma     en el pixel de la mano de cada cuadro; 0° adelante y -90° arriba
//   entero   trepando (solo avanza mientras se aprieta una tecla), quieto un
//            rato sin hacer nada (idle), mareado y al morir (muerte: se
//            asusta, sale volando de espaldas, rebota en el piso y queda
//            tendido con estrellitas; la cabeza hacia donde lo empujaron)
// Sus parpadeos, tintes y giros se copian del sprite del jugador.
// =============================================================================

const CUERPO = {
  quieto: 2500,       // ms parado sin hacer nada para pasar al idle de cuerpo entero
  aterrizaje: 110,    // ms del cuadro de aterrizar
  salto: { sube: -250, cae: 250 }, // velocity.y que separa subir / cima / caer
  // Contra una pared o el límite de una zona la física lo frena un cuadro sí y
  // otro no (y en rampas y escalones toca el piso un cuadro sí y otro no): las
  // piernas saltaban entre correr y parado (o suelo y aire) y el personaje
  // parpadeaba. Deja de correr o despega solo si dura esto (ms); saltando
  // (subiendo rápido) despega enseguida.
  margen: 90,
  despegue: -120,     // velocity.y por debajo de esta: está saltando de verdad
  // Agachado, el torso se hunde un poco en las piernas para que quede más
  // abajo. Sin achatar (1): achatado se deformaba y a Manfred se le veía la
  // cabeza chica; con más de ~14 px de hundido se le tapan las piernas.
  // hundir: px; achatar: escala vertical del torso; suave: 0-1 por cuadro.
  agachado: { hundir: 12, achatar: 1, suave: 0.45 }
};

// Por personaje: carpeta, prefijo de las texturas (y de las animaciones),
// hojas, el cuadro de las piernas de parado, el torso y sus animaciones.
// anims: [hoja, cuadros, fps, repeat]. Torsos: `torso` (adelante), `arriba` y
// `diagonal` (↑ caminando: solo si lo tiene), cada uno con su `_disparo` si
// lo tiene. Sin `arriba`, apunta arriba con el torso de siempre y el arma a -90°. muerte: [cuadro, ms]; el último queda
// hasta que la escena se reinicia.
const CUERPOS = {
  tuto: {
    ruta: 'assets/personajes/jugador/tuto/', prefijo: 'tuto_', textura: 'jugadorTuto',
    hojas: ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk', 'torso_aiming', 'aiming_straight_up', 'idle', 'trepar', 'muerte'],
    parado: ['piernas_run', 0],
    anims: {
      correr: ['piernas_run', [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], 12],
      agacharse: ['piernas_crouch', [0, 1, 2], 18, 0],
      agachado_caminar: ['piernas_crouch_walk', [0, 1, 2, 3, 4, 5], 10],
      torso: ['torso_aiming', [0, 1, 2, 3, 2, 1], 5],
      torso_disparo: ['torso_aiming', [1, 2], 20],
      arriba: ['aiming_straight_up', [0, 1, 2, 3], 24, 0],
      idle: ['idle', [0, 1, 2, 3, 4, 5], 6],
      trepar: ['trepar', [0, 1, 2, 3, 4, 5], 10]
    },
    muerte: [[0, 140], [1, 110], [2, 90], [3, 90], [4, 100], [5, 140], [6, 120], [7, 260], [8, 520], [9, 0]]
  },
  manfred: {
    ruta: 'assets/personajes/jugador/manfred/', prefijo: 'manfred_', textura: 'jugadorManfred',
    hojas: ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk', 'torso_aiming', 'torso_arriba', 'torso_diagonal', 'idle', 'trepar', 'muerte'],
    parado: ['piernas_salto', 5],
    anims: {
      correr: ['piernas_run', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 12],
      agacharse: ['piernas_crouch', [0, 1, 2], 18, 0],
      agachado_caminar: ['piernas_crouch_walk', [0, 1, 2, 3, 4, 5, 6], 10],
      torso: ['torso_aiming', [0, 1, 2, 3, 2, 1], 5],
      torso_disparo: ['torso_aiming', [1, 2], 20],
      // Arriba y diagonal: el cuadro 0 apunta; disparando, los 4 (el retroceso).
      arriba: ['torso_arriba', [0], 1],
      arriba_disparo: ['torso_arriba', [0, 1, 2, 3], 20],
      diagonal: ['torso_diagonal', [0], 1],
      diagonal_disparo: ['torso_diagonal', [0, 1, 2, 3], 20],
      idle: ['idle', [0, 1, 2, 3, 4, 5], 6],
      trepar: ['trepar', [0, 1, 2, 3, 4, 5], 10]
    },
    // Quieto no pasa al idle de cuerpo entero: ese dibujo es otro (saco más
    // largo, piernas más cortas) y no se veía igual que caminando. Sigue con
    // sus piernas y su torso (que respira). La hoja idle queda para mareado.
    sinIdle: true,
    // El 5 (de pie otra vez) y el 7 (solo el polvo) no van.
    muerte: [[0, 140], [1, 110], [2, 90], [3, 90], [4, 120], [6, 140], [8, 260], [9, 520], [10, 0]]
  },
  // Eduardo y Bartolina (herramientas/heroes_cuerpo.py). El compañero de
  // Eduardo, Juan, va aparte (Companero.js).
  eduardo: {
    ruta: 'assets/personajes/jugador/eduardo/', prefijo: 'eduardo_', textura: 'jugadorTuto',
    hojas: ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk', 'torso_aiming', 'torso_arriba', 'idle', 'trepar', 'muerte'],
    parado: ['piernas_salto', 5],
    anims: {
      correr: ['piernas_run', [0, 1, 2, 3, 4, 5, 6, 7], 12],
      agacharse: ['piernas_crouch', [0, 1, 2], 18, 0],
      agachado_caminar: ['piernas_crouch_walk', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 12],
      torso: ['torso_aiming', [0, 1, 2, 3, 2, 1], 5],
      torso_disparo: ['torso_aiming', [1, 2], 20],
      arriba: ['torso_arriba', [0], 1],
      arriba_disparo: ['torso_arriba', [0, 1, 2, 3], 20],
      // (espanta un mosquito, se marea, se rasca y aprueba con el pulgar)
      idle: ['idle', [0, 1, 2, 3, 4, 5, 6, 0, 0, 0], 4],
      trepar: ['trepar', [0, 1, 2, 3, 4, 5], 10]
    },
    muerte: [[0, 140], [1, 110], [2, 90], [3, 90], [4, 100], [5, 140], [6, 120], [7, 260], [8, 520], [9, 0]]
  },
  bartolina: {
    ruta: 'assets/personajes/jugador/bartolina/', prefijo: 'bartolina_', textura: 'jugadorTuto',
    hojas: ['piernas_run', 'piernas_salto', 'piernas_crouch', 'piernas_crouch_walk', 'torso_aiming', 'torso_arriba', 'idle', 'trepar', 'muerte'],
    parado: ['piernas_salto', 5],
    anims: {
      correr: ['piernas_run', [0, 1, 2, 3, 4, 5, 6, 7], 12],
      agacharse: ['piernas_crouch', [0, 1, 2], 18, 0],
      agachado_caminar: ['piernas_crouch_walk', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 12],
      torso: ['torso_aiming', [0, 1, 2, 3, 2, 1], 5],
      torso_disparo: ['torso_aiming', [1, 2], 20],
      arriba: ['torso_arriba', [0], 1],
      arriba_disparo: ['torso_arriba', [0, 1, 2, 3], 20],
      // (se mira al espejo, se despeina, se asusta y se acomoda la manta)
      idle: ['idle', [0, 1, 2, 3, 4, 5, 6, 7, 0, 0], 4],
      trepar: ['trepar', [0, 1, 2, 3, 4, 5], 10]
    },
    // El 6 es solo la nube de polvo: no va.
    muerte: [[0, 140], [1, 110], [2, 90], [3, 90], [4, 100], [5, 140], [7, 120], [8, 260], [9, 520], [10, 0]]
  }
};

// Los que se arman con CuerpoModular sobre la celda vacía (jugadorTuto).
const PERSONAJES_MODULARES = ['tuto', 'eduardo', 'bartolina'];

function personajeCuerpo(escena) {
  const p = escena.registry.get('personaje');
  return CUERPOS[p] ? p : 'manfred';
}

// Las hojas y los anchors de los dos personajes (solo lo que falta).
function cargarCuerpos(escena) {
  if (typeof cargarJuan !== 'undefined') cargarJuan(escena); // Companero.js: Juan, el de Eduardo
  Object.values(CUERPOS).forEach((c) => {
    if (!escena.cache.json.exists(c.prefijo + 'anclas')) escena.load.json(c.prefijo + 'anclas', c.ruta + 'anchors.json');
    c.hojas.forEach((h) => {
      if (!escena.textures.exists(c.prefijo + h)) escena.load.image(c.prefijo + h, `${c.ruta}${c.prefijo}${h}.png`);
    });
  });
}

// Cuadros de cada tira (del ancho de celda de anchors.json) y animaciones
// (claves: prefijo + nombre, p. ej. 'tuto_correr'). Devuelve los anchors.
function animacionesCuerpo(escena, personaje) {
  const c = CUERPOS[personaje];
  const datos = escena.cache.json.get(c.prefijo + 'anclas');
  if (!datos) return null;
  c.hojas.forEach((h) => {
    const t = escena.textures.get(c.prefijo + h);
    if (t.has('0')) return;
    datos[h].cuadros.forEach((_, i) => t.add(String(i), 0, i * datos[h].ancho, 0, datos[h].ancho, datos[h].alto));
  });
  Object.entries(c.anims).forEach(([nombre, [hoja, frames, frameRate, repeat = -1]]) => {
    const key = c.prefijo + nombre;
    if (!escena.anims.exists(key)) {
      escena.anims.create({ key, frames: frames.map((f) => ({ key: c.prefijo + hoja, frame: String(f) })), frameRate, repeat });
    }
  });
  if (!escena.anims.exists(c.prefijo + 'muerte')) {
    escena.anims.create({
      key: c.prefijo + 'muerte', repeat: 0,
      frames: c.muerte.map(([i, duration]) => ({ key: c.prefijo + 'muerte', frame: String(i), duration }))
    });
  }
  return datos;
}

// Las dos (Red.js dibuja a los otros jugadores con cualquiera de ellas).
function animacionesCuerpos(escena) {
  Object.keys(CUERPOS).forEach((p) => animacionesCuerpo(escena, p));
}

// El sprite del jugador de Tuto: una celda vacía de 84x84 (la física es la
// misma que la de Manfred).
function texturaBaseTuto(escena) {
  if (escena.textures.exists('jugadorTuto')) return;
  const t = escena.textures.createCanvas('jugadorTuto', 84, 84);
  t.add('0', 0, 0, 0, 84, 84);
  t.refresh();
}

// El cuerpo del personaje elegido.
function cuerpoJugador(escena) {
  // Eduardo va con Juan, su compañero (Companero.js).
  if (personajeCuerpo(escena) === 'eduardo' && typeof Companero !== 'undefined') escena.companero = new Companero(escena);
  return new CuerpoModular(escena, personajeCuerpo(escena));
}

class CuerpoModular {
  constructor(escena, personaje) {
    this.escena = escena;
    this.c = CUERPOS[personaje];
    this.p = this.c.prefijo;
    this.datos = animacionesCuerpo(escena, personaje);
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
    const [hojaParado, cuadroParado] = this.c.parado;
    texturasSelector(e); // 'armaPistola' (Armas.js): la pistola en la mano
    this.piernas = e.add.sprite(0, 0, this.p + hojaParado, String(cuadroParado)).setDepth(10);
    this.torso = e.add.sprite(0, 0, this.p + this.c.anims.torso[0], '0').setDepth(10.05);
    this.entero = e.add.sprite(0, 0, this.p + 'idle', '0').setDepth(10).setVisible(false);
    this.arma = e.add.image(0, 0, 'armaPistola').setDepth(10.1);
    this.creado = true;
  }

  // Reproduce la animación `nombre` del personaje.
  animar(sprite, nombre, seguir = true) {
    sprite.play(this.p + nombre, seguir);
  }

  esta(sprite, nombre) {
    return sprite.anims.currentAnim?.key === this.p + nombre;
  }

  // Origen de una parte en su ancla (espejada si mira a la izquierda).
  anclar(sprite, hoja, izquierda) {
    const d = this.datos[hoja];
    const [ax, ay] = d.ancla;
    sprite.setFlipX(izquierda).setOrigin((izquierda ? d.ancho - ax : ax) / d.ancho, ay / d.alto);
  }

  // Hoja y número del cuadro que muestra un sprite.
  cuadro(sprite) {
    return { hoja: sprite.texture.key.slice(this.p.length), i: Number(sprite.frame.name) };
  }

  partes() {
    return [this.piernas, this.torso, this.entero, this.arma];
  }

  actualizar() {
    const e = this.escena;
    const j = e.jugador;
    if (!j || !j.active || !j.body || !this.datos) return;
    if (!this.creado) this.crear();
    // Mientras una cinemática lo dibuja con otra hoja (Nivel1.entradaHelicoptero).
    if (e.ocultarJugador) {
      j.setVisible(false);
      this.partes().forEach((p) => p.setVisible(false));
      return;
    }
    const b = j.body;
    const ahora = e.time.now;
    const izquierda = j.flipX;
    const lado = izquierda ? -1 : 1;
    // Si en una entrada llega caminando sin gravedad (no toca el piso), camina.
    const entrando = e.estado === 'entrada' && !b.allowGravity && Math.abs(b.velocity.y) < 1;
    const pisa = b.blocked.down || b.touching.down || !!e.rampaActual || !!e.enPendienteAntes || entrando;
    if (pisa) this.pisaHasta = ahora + CUERPO.margen;
    const enSuelo = pisa || (ahora < (this.pisaHasta || 0) && b.velocity.y > CUERPO.despegue && !e.trepando);
    if (Math.abs(b.velocity.x) > 5) this.correHasta = ahora + CUERPO.margen;
    const camina = ahora < (this.correHasta || 0);
    // vx solo se usa para "se mueve": con el margen, no parpadea contra una pared.
    const vx = camina ? (b.velocity.x || (izquierda ? -6 : 6)) : 0;
    const disparando = ahora < (e.disparandoHasta || 0);
    const arriba = !!e.apuntaArriba;
    const diagonal = !!e.apuntaDiagonal && !!this.c.anims.diagonal;
    const agachado = !!e.agachado;
    if (enSuelo && !this.enSueloAntes) this.aterrizaHasta = ahora + CUERPO.aterrizaje;
    this.enSueloAntes = enSuelo;
    if (Math.abs(vx) > 5 || !enSuelo || disparando || arriba || diagonal || agachado || e.trepando) this.quietoDesde = ahora;

    // Lo que se copia del sprite del jugador: parpadeo, tinte, giro.
    this.partes().forEach((p) => {
      p.setAlpha(j.alpha);
      if (j.isTinted) p.setTint(j.tintTopLeft); else p.clearTint();
    });

    j.setVisible(false);

    // Cuerpo entero: muerto, trepando o quieto un rato.
    const muerto = e.muerto;
    const trepando = !!e.trepando;
    const quieto = !this.c.sinIdle && enSuelo && ahora - this.quietoDesde > CUERPO.quieto;
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
        if (!this.esta(s, 'trepar') || (!s.anims.isPlaying && !s.anims.isPaused)) this.animar(s, 'trepar', false);
        if (j.anims.isPlaying) s.anims.resume(); else s.anims.pause();
      } else if (muerto) {
        if (!this.esta(s, 'muerte')) this.animar(s, 'muerte', false);
      } else if (mareado) {
        s.anims.stop();
        s.setTexture(this.p + 'idle', '0');
      } else if (!this.esta(s, 'idle') || !s.anims.isPlaying) {
        this.animar(s, 'idle', false);
      }
      // La hoja de la muerte cae de espaldas hacia la izquierda: se espeja si
      // lo empujaron a la derecha. Ya cae dibujado: sin el giro del jugador.
      const espejo = muerto ? (e.ladoMuerte || -1) > 0 : izquierda;
      this.anclar(s, this.cuadro(s).hoja, espejo);
      s.setPosition(b.center.x, b.bottom).setAngle(muerto ? 0 : j.angle);
      this.boca = null;
      return;
    }
    this.entero.setVisible(false).anims.stop();
    this.piernas.setVisible(true);
    this.torso.setVisible(true);

    // Piernas.
    const p = this.piernas;
    const [hojaParado, cuadroParado] = this.c.parado;
    p.anims.timeScale = 1;
    if (!enSuelo) {
      p.anims.stop();
      const vy = b.velocity.y;
      p.setTexture(this.p + 'piernas_salto', String(vy < CUERPO.salto.sube ? 1 : vy < CUERPO.salto.cae ? 2 : 3));
    } else if (agachado) {
      if (Math.abs(vx) > 5) this.animar(p, 'agachado_caminar');
      // Si la última animación de las piernas fue agacharse pero después se
      // paró (stop + otra textura), currentAnim sigue siendo 'agacharse': hay
      // que mirar la hoja que muestra, si no al agacharse de nuevo quedaban
      // las piernas de parado con el torso hundido.
      else if (!this.esta(p, 'agacharse') || this.cuadro(p).hoja !== 'piernas_crouch') this.animar(p, 'agacharse', false);
    } else if (ahora < this.aterrizaHasta) {
      p.anims.stop();
      p.setTexture(this.p + 'piernas_salto', '4');
    } else if (Math.abs(vx) > 5) {
      this.animar(p, 'correr');
      // Corriendo (SHIFT) a 12 fps; caminando, más lento.
      p.anims.timeScale = Math.abs(vx) > JUGADOR.velocidad * 1.2 ? 1 : 0.75;
    } else {
      p.anims.stop();
      p.setTexture(this.p + hojaParado, String(cuadroParado));
    }
    const cp = this.cuadro(p);
    const dp = this.datos[cp.hoja];
    this.anclar(p, cp.hoja, izquierda);
    // Cintura: en el piso, los pies del cuadro sobre el suelo; en el aire, a
    // la altura de parado.
    const parado = this.datos[hojaParado];
    const alturaCintura = enSuelo
      ? dp.cuadros[cp.i].pies - dp.ancla[1]
      : parado.cuadros[cuadroParado].pies - parado.ancla[1];
    const cx = b.center.x;
    const cy = b.bottom - alturaCintura;
    p.setPosition(cx, cy);
    // Agachado: el torso baja hacia las piernas (con una transición corta).
    const A = CUERPO.agachado;
    this.hundido = Phaser.Math.Linear(this.hundido || 0, enSuelo && agachado ? 1 : 0, A.suave);
    if (this.hundido < 0.01) this.hundido = 0;
    const ty = cy + A.hundir * this.hundido;
    const sy = 1 - (1 - A.achatar) * this.hundido;

    // Torso, con la cintura sobre la de las piernas.
    const t = this.torso;
    const pose = arriba && this.c.anims.arriba ? 'arriba' : diagonal ? 'diagonal' : 'torso';
    const nombre = disparando && this.c.anims[pose + '_disparo'] ? pose + '_disparo' : pose;
    // Las que no se repiten (el arriba de Tuto: sube el brazo) quedan en su último cuadro.
    if (this.c.anims[nombre][3] === 0) {
      if (!this.esta(t, nombre)) this.animar(t, nombre, false);
    } else {
      this.animar(t, nombre);
    }
    const ct = this.cuadro(t);
    const dt = this.datos[ct.hoja];
    this.anclar(t, ct.hoja, izquierda);
    t.setPosition(cx, ty).setScale(1, sy);

    // Arma en la mano de este cuadro.
    const [mx, my] = dt.cuadros[ct.i].mano;
    const mano = { x: cx + lado * (mx - dt.ancla[0]), y: ty + (my - dt.ancla[1]) * sy };
    this.ponerArma(mano, lado, arriba ? 90 : diagonal ? 45 : 0);
  }

  // El arma con la empuñadura en la mano: 0° adelante, -45° en diagonal, -90°
  // arriba (elevacion en grados). Guarda la punta del caño (de ahí salen las balas).
  ponerArma(mano, lado, elevacion) {
    // La empuñadura de cada arma (ARMAS: agarre, agarreY) en la mano.
    const punta = colocarArma(this.escena, this.arma.setVisible(true), armaJugador(this.escena), mano, lado, elevacion);
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
