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
  // Salto: sube ~195 px (1.6 veces su altura) y cae rápido, sin flotar. Con
  // la gravedad del mundo (800) + `gravedad` (solo el jugador) = 1300:
  // altura = salto² / (2 · 1300). Alcanza dos cajas apiladas (152 px), la
  // cornisa de la casa de ladrillo (180) y, desde los sacos, el techo de la
  // casa destruida. Antes subía 264 px y tardaba 1.6 s en volver al piso.
  salto: 715,
  gravedad: 500,
  caidaMaxima: 760,  // px/s: más rápido atravesaría las plataformas finas (6 px)
  // Al recibir un golpe: lo que sale despedido y cuánto tarda en poder recibir otro.
  golpe: { empujon: { x: 360, y: 280 }, invulnerable: 1000 },
  // El golpe que lo deja en VIDA.aturde lo marea (si el personaje tiene esos
  // cuadros): se libera apretando ESPACIO `toques` veces (o solo, a los
  // `maximo` ms).
  aturdido: { toques: 6, maximo: 4000, golpe: 250, recupera: 250 },
  agachado: 0.4      // agachado camina más lento (40%)
};

// Salud, en medias barras: 4 barras = 8 `mitades`. El panel es
// assets/panel/vida_sheet.png (herramientas/vida_panel.py), un cuadro por
// media barra, del lleno (0) a media barra (7). Cada golpe saca una barra
// entera (`golpe`); el que lo deja en `aturde` o menos lo marea, y sin vida
// muere. La hamburguesa del NPC cura media barra (`hamburguesa`). Se guarda en
// el registry ('vida') para pasar del nivel a los interiores y al jefe.
const VIDA = { mitades: 8, golpe: 2, aturde: 4, hamburguesa: 1, escala: 0.4, x: 12, y: 36 };

function vidaJugador(escena) {
  const vida = escena.registry.get('vida');
  return vida === undefined ? VIDA.mitades : vida;
}

function cuadroVida(vida) {
  return VIDA.mitades - Phaser.Math.Clamp(vida, 1, VIDA.mitades);
}

// El panel de vida fijo en pantalla (también lo usa Interior.js).
function panelVida(escena) {
  return escena.add.image(VIDA.x, VIDA.y, 'panelVida', cuadroVida(vidaJugador(escena)))
    .setOrigin(0).setScale(VIDA.escala).setScrollFactor(0).setDepth(30);
}

// Caja de colisión en la celda de 84x84, apoyada en los pies (y 72).
// Agachado se achica: las balas a la altura del pecho le pasan por encima.
const CUERPO_JUGADOR = { ancho: 20, alto: 56, altoAgachado: 40, x: 28, pies: 72 };

// Cuadros de cada personaje en su spritesheet (celdas de 84x84, pies en
// x 38, y 72). El cuadro 0 es el parado. Lo que un personaje no tiene se
// reemplaza: sin correr usa caminar más rápido; sin saltar, el cuadro `aire`;
// sin ataque, el cuadro 0; sin agachado no se agacha; sin ataqueArriba no
// apunta arriba; sin trepar usa caminar en las escaleras; sin aturdido, al
// recibir un golpe solo parpadea.
// boca: punta del arma en px de arte respecto del centro de la celda, parado.
// Si las hay, bocaCorrer (moviéndose), bocaAire, bocaArriba y bocaAgachado
// son las de esas poses; si no, se usa boca.
const CUADROS_JUGADOR = {
  jugador: { caminar: [0, 7], aire: 2, boca: { x: 12, y: 8 } },
  // herramientas/manfred_spritesheet.py (el orden de TIRAS)
  jugadorManfred: {
    agacharse: [0, 3], agachado: 3, caminar: [4, 15], correr: [16, 23], aire: 26,
    saltar: { subir: 25, arriba: 26, bajar: 27, caer: 28, aterrizar: 29 },
    ataque: [30, 33], ataqueArriba: [34, 37], agachadoAtaque: [38, 41], agachadoCaminar: [42, 47],
    trepar: [48, 53], aturdido: [54, 59],
    boca: { x: 22, y: -18 }, bocaCorrer: { x: 28, y: -6 }, bocaAire: { x: 25, y: -10 },
    bocaArriba: { x: 7, y: -42 }, bocaAgachado: { x: 18, y: 6 }
  },
  // Tuto (CuerpoTuto.js): el sprite del jugador es una celda vacía (cuadro
  // 0) y lo que se ve son sus piernas y su torso. Los rangos solo habilitan
  // las acciones (agacharse, apuntar arriba, trepar); la boca del arma sale
  // de la mano de cada cuadro (anchors.json). Agachado, la caja de colisión
  // queda a la mitad del alto.
  jugadorTuto: {
    caminar: [0, 0], correr: [0, 0], aire: 0, agacharse: [0, 0], agachado: 0, agachadoCaminar: [0, 0],
    ataque: [0, 0], ataqueArriba: [0, 0], agachadoAtaque: [0, 0], trepar: [0, 0],
    boca: { x: 12, y: -10 }, bocaCorrer: { x: 12, y: -10 }, altoAgachado: 28, modular: true
  }
};

// Disparo (J o X, se puede mantener apretado). Las balas son las trazadoras
// del menú (fx_bala de EfectosMenu.js). Cadencia, velocidad y alcance son los
// del arma que lleva (ARMAS en Armas.js); pose: cuánto dura la pose de disparo.
const DISPARO = { pose: 220 };

// Arma larga (las de Armas.js) dibujada sobre la mano: la mano está `pistola`
// px de arte detrás de la boca de la pistola del dibujo (manoArma) y ahí va
// la empuñadura de cada arma (ARMAS: agarre, agarreY; Armas.colocarArma).
const ARMA_LARGA = { pistola: 7 };

// Spritesheet del personaje elegido en la selección ('personaje' en el
// registry). Los dos tienen celdas de 84x84 con los pies en el mismo lugar,
// así que comparten caja de colisión. También lo usan Interior.js y JefeFinal.js.
function texturaJugador(escena) {
  if (escena.registry.get('personaje') === 'tuto') {
    texturaBaseTuto(escena); // CuerpoTuto.js
    return 'jugadorTuto';
  }
  return 'jugadorManfred';
}

// Cuerpo de colisión y gravedad del jugador (iguales en todas las escenas).
function fisicaJugador(sprite) {
  sprite.body.setSize(20, 56).setOffset(28, 16);
  sprite.body.setGravityY(JUGADOR.gravedad);
  sprite.body.setMaxVelocityY(JUGADOR.caidaMaxima);
  return sprite;
}

const AccionesJugador = {
  // Animaciones del personaje elegido (se rehacen si cambió) y texturas de
  // efectos. Devuelve la textura del jugador.
  prepararJugador() {
    const textura = texturaJugador(this);
    const cuadros = CUADROS_JUGADOR[textura];
    this.cuadrosJugador = cuadros;
    // Las del personaje anterior se borran aunque este no tenga esos cuadros.
    const animacion = (key, rango, frameRate, repeat = -1) => {
      if (this.anims.exists(key)) this.anims.remove(key);
      if (!rango) return;
      const [inicio, fin] = rango;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(textura, { start: inicio, end: fin }), frameRate, repeat });
    };
    animacion('jugador_caminar', cuadros.caminar, cuadros.caminar[1] - cuadros.caminar[0] > 8 ? 14 : 10);
    animacion('jugador_correr', cuadros.correr || cuadros.caminar, cuadros.correr ? 14 : 16);
    animacion('jugador_ataque', cuadros.ataque, 18, 0);
    animacion('jugador_ataque_arriba', cuadros.ataqueArriba, 18, 0);
    animacion('jugador_agacharse', cuadros.agacharse, 24, 0);
    animacion('jugador_agachado_ataque', cuadros.agachadoAtaque, 18, 0);
    animacion('jugador_agachado_caminar', cuadros.agachadoCaminar, 10);
    animacion('jugador_trepar', cuadros.trepar, 10);
    // Aturdido: 2 cuadros del golpe, 3 de mareo (se repiten) y 1 de recuperarse.
    const a = cuadros.aturdido;
    animacion('jugador_golpeado', a && [a[0], a[0] + 1], 8, 0);
    animacion('jugador_mareado', a && [a[0] + 2, a[0] + 4], 5);
    texturasEfectos(this); // fx_bala, fx_fogonazo, fx_chispa... (EfectosMenu.js)
    this.agachado = false;
    this.apuntaArriba = false;
    this.proximoDisparo = 0;
    this.disparandoHasta = 0;
    this.aterrizandoHasta = 0;
    this.golpeHasta = 0;
    this.aturdido = null;
    this.recuperandoHasta = 0;
    this.muerto = false;
    this.panelVida = panelVida(this);
    this.hudVidas = hudVidas(this); // Estado.js: x3 con la carita
    // Reaparece después de perder una vida: ¡LISTO! mientras parpadea.
    this.reapareciendo = !!this.registry.get('reaparecer');
    this.registry.set('reaparecer', false);
    this.sinPausa = false;
    if (this.reapareciendo) this.time.delayedCall(400, () => textoListo(this));
    this.hudArma = hudArma(this); // Armas.js
    this.armaLarga = null;        // la de la escena anterior se destruyó con ella
    this.enSueloAhora = true;
    this.invulnerableHasta = 0;
    this.cuerpoTuto = cuerpoJugador(this); // piernas + torso (CuerpoTuto.js) o null
    return textura;
  },

  // Postura según las teclas: ABAJO en el suelo agacha (achica la caja de
  // colisión) y ARRIBA mira y apunta hacia arriba. Solo si el personaje tiene
  // esos cuadros. Devuelve true si ARRIBA quedó para apuntar (entonces no
  // salta: se salta con ESPACIO).
  posturaJugador(enSuelo, arriba, abajo) {
    const cuadros = this.cuadrosJugador;
    const agachado = enSuelo && abajo && cuadros.agachado !== undefined;
    if (agachado !== this.agachado) {
      this.agachado = agachado;
      const c = CUERPO_JUGADOR;
      const alto = agachado ? cuadros.altoAgachado || c.altoAgachado : c.alto;
      this.jugador.body.setSize(c.ancho, alto, false).setOffset(c.x, c.pies - alto);
      if (agachado) this.agachandoHasta = this.time.now + 150;
    }
    this.apuntaArriba = !agachado && arriba && !!cuadros.ataqueArriba;
    return this.apuntaArriba;
  },

  // Cuadro o animación del jugador según lo que está haciendo. Al caer, el
  // aterrizaje dura un instante (solo si el personaje tiene cuadros de salto).
  // lentitud: en el agua las animaciones van más lentas.
  animarJugador(enSuelo, direccion, corre, lentitud = 1) {
    const j = this.jugador;
    const cuadros = this.cuadrosJugador;
    const ahora = this.time.now;
    const disparando = ahora < this.disparandoHasta;
    // Con un arma larga (Armas.js) la lleva siempre al frente: parado apunta y
    // al caminar usa los cuadros de correr (los del arma al frente), más lentos.
    const armado = this.llevaArmaLarga();
    if (enSuelo && !this.enSueloAntes && cuadros.saltar) this.aterrizandoHasta = ahora + 90;
    j.anims.timeScale = lentitud;
    this.enSueloAhora = enSuelo;

    if (this.aturdido) {
      const golpeado = ahora - this.aturdido.desde < JUGADOR.aturdido.golpe;
      j.anims.timeScale = 1;
      const anim = golpeado ? 'jugador_golpeado' : 'jugador_mareado';
      if (cuadros.aturdido) j.anims.play(anim, true); // Tuto no tiene: lo muestra CuerpoTuto
    } else if (ahora < this.recuperandoHasta) {
      j.anims.stop();
      if (cuadros.aturdido) j.setFrame(cuadros.aturdido[1]);
    } else if (!enSuelo && this.apuntaArriba) {
      j.anims.stop();
      j.setFrame(cuadros.ataqueArriba[0]);
    } else if (!enSuelo) {
      j.anims.stop();
      const s = cuadros.saltar;
      if (!s) {
        j.setFrame(cuadros.aire);
      } else {
        const vy = j.body.velocity.y;
        j.setFrame(vy < -300 ? s.subir : vy < 0 ? s.arriba : vy < 300 ? s.bajar : s.caer);
      }
    } else if (this.agachado) {
      if (direccion) j.anims.play('jugador_agachado_caminar', true);
      else if (disparando && cuadros.agachadoAtaque) j.anims.play('jugador_agachado_ataque', true);
      else if (ahora < this.agachandoHasta && cuadros.agacharse) j.anims.play('jugador_agacharse', true);
      else { j.anims.stop(); j.setFrame(cuadros.agachado); }
    } else if (this.apuntaArriba && disparando) {
      j.anims.play('jugador_ataque_arriba', true);
    } else if (this.apuntaArriba) {
      j.anims.stop();
      j.setFrame(cuadros.ataqueArriba[0]);
    } else if (direccion && (disparando || armado) && cuadros.correr && !corre) {
      // Al caminar lleva el arma en la cadera: para disparar la levanta como
      // al correr (esos cuadros, más lentos).
      j.anims.play('jugador_correr', true);
      j.anims.timeScale = lentitud * 0.7;
    } else if (direccion) {
      j.anims.play(corre ? 'jugador_correr' : 'jugador_caminar', true);
    } else if (ahora < this.aterrizandoHasta) {
      j.anims.stop();
      j.setFrame(cuadros.saltar.aterrizar);
    } else if (disparando && cuadros.ataque) {
      j.anims.play('jugador_ataque', true);
    } else {
      j.anims.stop();
      j.setFrame(armado ? cuadros.ataque[0] : 0);
    }
    this.mostrarArmaLarga();
  },

  // Si lleva un arma que no es la pistola y el personaje tiene las bocas de
  // cada pose (Manfred).
  llevaArmaLarga() {
    return armaJugador(this) !== 'pistola' && !!this.cuadrosJugador.bocaCorrer;
  },

  // Qué boca usa la pose actual (ver CUADROS_JUGADOR).
  poseArma() {
    const j = this.jugador;
    if (this.apuntaArriba) return 'bocaArriba';
    if (this.agachado) return 'bocaAgachado';
    if (!this.enSueloAhora) return 'bocaAire';
    return j.body.velocity.x ? 'bocaCorrer' : 'boca';
  },

  // Punta del arma en px de arte respecto del centro de la celda. Con un arma
  // larga, la punta de su caño: la empuñadura va en la mano (donde estaba la
  // pistola) y el caño sale de ahí (Armas.bocaDesdeMano).
  bocaArma() {
    if (this.cuerpoTuto) return this.cuerpoTuto.bocaRelativa(); // la mano del cuadro (CuerpoTuto.js)
    const cuadros = this.cuadrosJugador;
    const pose = this.poseArma();
    const boca = cuadros[pose] || cuadros.boca;
    if (!this.llevaArmaLarga()) return boca;
    // La punta del caño del arma larga: desde la mano (manoArma), en px de arte.
    const mano = this.manoArma();
    const lado = this.jugador.flipX ? -1 : 1;
    const punta = bocaDesdeMano(this, armaJugador(this), lado, pose === 'bocaArriba'); // Armas.js
    return { x: mano.x + punta.x * lado / ESCALA, y: mano.y + punta.y / ESCALA };
  },

  // La mano que sostiene la pistola del dibujo (px de arte respecto del
  // centro de la celda): ARMA_LARGA.pistola detrás de la boca de la pose (o
  // debajo, apuntando arriba) y un poco más abajo, en la empuñadura.
  manoArma() {
    const cuadros = this.cuadrosJugador;
    const pose = this.poseArma();
    const boca = cuadros[pose] || cuadros.boca;
    return pose === 'bocaArriba'
      ? { x: boca.x - 1, y: boca.y + ARMA_LARGA.pistola }
      : { x: boca.x - ARMA_LARGA.pistola, y: boca.y + 2 };
  },

  // El arma larga dibujada sobre la mano (no hay cuadros del personaje con
  // ella): sigue la boca de la pose; de espaldas, mareado o muerto no se ve.
  mostrarArmaLarga() {
    if (this.cuerpoTuto) return; // la pone CuerpoTuto en la mano de cada cuadro
    const j = this.jugador;
    const arma = ARMAS[armaJugador(this)];
    const visible = this.llevaArmaLarga() && !this.trepando && !this.aturdido && !this.muerto &&
      this.time.now >= this.recuperandoHasta;
    if (!this.armaLarga || this.armaLarga.texture.key !== arma.textura) {
      if (this.armaLarga) this.armaLarga.destroy();
      this.armaLarga = arma.textura ? this.add.image(0, 0, arma.textura).setScale(ESCALA_ARMA).setDepth(10.1) : null;
    }
    if (!this.armaLarga) return;
    this.armaLarga.setVisible(visible);
    if (!visible) return;
    const lado = j.flipX ? -1 : 1;
    const mano = this.manoArma();
    const arriba = this.poseArma() === 'bocaArriba';
    // Con la empuñadura en la mano (Armas.js: colocarArma).
    colocarArma(this, this.armaLarga, armaJugador(this), { x: j.x + lado * mano.x * ESCALA, y: j.y + mano.y * ESCALA }, lado, arriba);
  },

  // Las balas se frenan contra los cuerpos de `solidos` (grupos estáticos);
  // las granadas y los cohetes, además, explotan contra `suelos`. Lo que les
  // pasa al pegarle a un enemigo lo arma cada escena (ver impactoBala).
  crearBalas(solidos, suelos = []) {
    this.balas = this.physics.add.group({ allowGravity: false });
    const impacto = (bala) => {
      if (this.impactoBala(bala)) return;
      chispas(this, bala.x, bala.y, 6, bala.getData('rebote'), 100, 10.3);
      bala.destroy();
    };
    solidos.forEach((grupo) => this.physics.add.collider(this.balas, grupo, impacto));
    const explosivo = (bala) => EXPLOSIVOS.includes(bala.getData('tipo'));
    suelos.forEach((grupo) => this.physics.add.collider(this.balas, grupo, (bala) => this.explotarProyectil(bala), explosivo));
  },

  // Las escenas lo llaman cuando una bala le pega a algo: si es un cohete o una
  // granada explota (y lastima en área con danoEnArea de la escena) y devuelve
  // true; si no, la escena hace lo suyo (sangre, daño de la bala: 'dano').
  impactoBala(bala) {
    if (!bala.active) return true;
    if (!EXPLOSIVOS.includes(bala.getData('tipo'))) return false;
    this.explotarProyectil(bala);
    return true;
  },

  explotarProyectil(bala) {
    if (!bala.active) return;
    const { x, y } = bala;
    const tipo = bala.getData('tipo');
    bala.destroy();
    // A tamaño real (EXPLOSIONES en Armas.js), apoyada un poco debajo del impacto.
    const escala = escalaExplosion(tipo);
    explotar(this, x, y + 12 * escala, EXPLOSIONES[tipo].efecto, escala); // Efectos.js
    this.cameras.main.shake(tipo === 'cohete' ? 220 : 150, tipo === 'cohete' ? 0.012 : 0.007);
    if (this.danoEnArea) this.danoEnArea(x, y, radioExplosion(tipo), bala.getData('dano'));
  },


  // Un disparo del arma que lleva (ARMAS en Armas.js) desde la punta del arma
  // hacia donde mira (o hacia arriba), con fogonazo. 'rebote': hacia dónde
  // saltan las chispas al pegar.
  disparar() {
    const j = this.jugador;
    const lado = j.flipX ? -1 : 1;
    const arriba = this.apuntaArriba;
    const arma = ARMAS[armaJugador(this)];
    const boca = this.bocaArma();
    const x = j.x + lado * boca.x * ESCALA;
    const y = j.y + boca.y * ESCALA;
    const angulo = arriba ? -90 : lado < 0 ? 180 : 0;
    this.proximoDisparo = this.time.now + arma.cadencia;
    this.disparandoHasta = this.time.now + DISPARO.pose;
    if (arma.tipo === 'cuerpo') {
      this.golpeCuerpo(arma, lado);
      return;
    }
    if (arma.tipo === 'onda') {
      this.escopetazo(arma, x, y, lado, arriba);
      gastarMunicion(this);
      return;
    }
    this.crearProyectil(arma, x, y, angulo + Phaser.Math.FloatBetween(-1, 1) * (arma.dispersion || 0));
    const rad = Phaser.Math.DegToRad(angulo);
    if (arma.tipo !== 'llama') fogonazo(this, x + Math.cos(rad) * 6, y + Math.sin(rad) * 6, arma.tipo === 'bala' ? 1.2 : 1.8, 10.3, angulo);
    if (arma.tipo === 'bala') casquillo(this, j.x + lado * 10, y - 4, 10.1);
    if (arma.tipo === 'cohete') this.cameras.main.shake(80, 0.003);
    gastarMunicion(this);
  },

  // Un proyectil hacia `angulo` (grados: 0 a la derecha, -90 arriba).
  crearProyectil(arma, x, y, angulo) {
    const rad = Phaser.Math.DegToRad(angulo);
    const tipo = arma.tipo;
    // A tamaño real (PROYECTILES en Armas.js).
    const { textura } = PROYECTILES[arma.proyectil];
    const escala = escalaProyectil(arma.proyectil);
    const bala = this.balas.create(x, y, textura, 0).setDepth(10.2).setAngle(angulo).setScale(escala);
    if (tipo === 'bala' || tipo === 'llama') bala.setBlendMode(Phaser.BlendModes.ADD);
    // La caja: largo en la dirección del tiro (en px de la textura).
    const [largo, grueso] = { bala: [PROYECTILES[arma.proyectil].largo * 0.8, 4], cohete: [32, 9], granada: [14, 14], llama: [40, 24] }[tipo];
    const vertical = Math.abs(Math.sin(rad)) > 0.7;
    bala.body.setSize(vertical ? grueso : largo, vertical ? largo : grueso);
    bala.setVelocity(Math.cos(rad) * arma.velocidad, Math.sin(rad) * arma.velocidad);
    bala.setData({ tipo, dano: arma.dano || 1, rebote: angulo + 180 });
    // Granada: `alcance` es cuánto tarda en explotar sola; el resto, la distancia.
    bala.setData('hasta', this.time.now + (tipo === 'granada' ? arma.alcance : arma.alcance / arma.velocidad * 1000));
    animacionesEfectos(this);
    if (tipo === 'cohete' || tipo === 'llama') bala.play(textura);
    if (tipo === 'granada') {
      // Sale en arco: hacia arriba y cae con la gravedad.
      bala.body.setAllowGravity(true);
      if (!vertical) bala.setVelocityY(-arma.velocidad * 0.45);
      bala.setAngularVelocity(Math.cos(rad) < 0 ? -540 : 540);
    }
    if (tipo === 'llama') {
      this.tweens.add({ targets: bala, scale: escala * 2.4, alpha: 0.2, duration: arma.alcance / arma.velocidad * 1000 });
    }
    return bala;
  },

  // Escopeta: el fogonazo de Metal Slug sale de la boca y lastima todo lo que
  // cubre (tres círculos a lo largo del cono, cada vez más anchos).
  escopetazo(arma, x, y, lado, arriba) {
    const largo = metros(arma.alcance); // Armas.js
    const escala = largo / EFECTOS.escopetazo.ancho;
    efecto(this, 'escopetazo', x, y, { escala, espejo: !arriba && lado < 0, angulo: arriba ? -90 : 0, profundidad: 10.3 });
    this.cameras.main.shake(90, 0.004);
    casquillo(this, this.jugador.x + lado * 10, y - 4, 10.1);
    if (!this.danoEnArea) return;
    [0.25, 0.55, 0.85].forEach((t) => {
      const px = arriba ? x : x + lado * largo * t;
      const py = arriba ? y - largo * t : y;
      this.danoEnArea(px, py, largo * (0.12 + t * 0.25), arma.dano, true);
    });
  },

  // Machete: un tajo delante (el arma gira en la mano y se ve el corte) que
  // lastima en un área chica.
  golpeCuerpo(arma, lado) {
    const j = this.jugador;
    this.tajoHasta = this.time.now + 160;
    efecto(this, 'tajo', j.x + lado * arma.alcance * 0.75, j.y - 8, { escala: metros(1.1) / EFECTOS.tajo.alto, espejo: lado < 0 });
    if (this.armaLarga) {
      this.tweens.add({ targets: this.armaLarga, angle: { from: -70 * lado, to: 40 * lado }, duration: 150, ease: 'Quad.out' });
    }
    if (this.danoEnArea) this.danoEnArea(j.x + lado * arma.alcance * 0.7, j.y - 6, arma.alcance * 0.6, arma.dano, true);
  },


  moverBalas() {
    this.balas.getChildren().forEach((bala) => {
      if (this.time.now <= bala.getData('hasta')) return;
      if (EXPLOSIVOS.includes(bala.getData('tipo'))) this.explotarProyectil(bala);
      else bala.destroy();
    });
  },


  // Empuja al jugador lejos de desdeX y le baja la vida (VIDA): en
  // VIDA.aturde queda mareado (ver seguirAturdido), sin vida muere y si no,
  // parpadea un rato sin recibir otro golpe. Devuelve false si no le pegó
  // (todavía invulnerable, mareado o muerto).
  golpearJugador(desdeX) {
    if (this.muerto || this.aturdido || this.time.now < this.invulnerableHasta) return false;
    const j = this.jugador;
    const lado = Math.sign(j.body.center.x - desdeX) || 1;
    this.trepando = null;
    this.posturaJugador(false, false, false); // se levanta
    this.rampaActual = null;
    j.body.setAllowGravity(true);
    j.setVelocity(lado * JUGADOR.golpe.empujon.x, -JUGADOR.golpe.empujon.y);
    this.golpeHasta = this.time.now + 350;
    this.cameras.main.shake(120, 0.006);
    j.setTint(0xff6060);
    sangrar(this, j.x, j.y - 10, lado); // Efectos.js

    const antes = vidaJugador(this);
    const vida = antes - VIDA.golpe;
    this.registry.set('vida', vida);
    this.panelVida.setFrame(cuadroVida(vida));
    this.tweens.add({ targets: this.panelVida, scale: VIDA.escala * 1.15, duration: 80, yoyo: true });
    if (vida <= 0) this.morirJugador(lado);
    else if (antes > VIDA.aturde && vida <= VIDA.aturde && (this.cuadrosJugador.aturdido || this.cuerpoTuto)) this.aturdirJugador();
    else this.parpadearJugador();
    return true;
  },

  // Suma `mitades` de vida (la hamburguesa: media barra), sin pasarse del máximo.
  curarJugador(mitades) {
    const vida = Math.min(VIDA.mitades, vidaJugador(this) + mitades);
    this.registry.set('vida', vida);
    this.panelVida.setFrame(cuadroVida(vida));
    this.tweens.add({ targets: this.panelVida, scale: VIDA.escala * 1.15, duration: 120, yoyo: true });
  },

  // Cae de espaldas y pierde una vida (Estado.finDeVida: la escena vuelve a
  // empezar con la vida llena, o GAME OVER). Las escenas dejan de mover al jugador (estado 'muerto').
  morirJugador(lado) {
    const j = this.jugador;
    const cuadros = this.cuadrosJugador;
    this.muerto = true;
    this.estado = 'muerto';
    cerrarSelector(this, false); // Armas.js
    this.mostrarArmaLarga(); // la esconde
    this.panelVida.setVisible(false);
    this.hudArma.setVisible(false);
    j.anims.stop();
    j.setFrame(cuadros.aturdido ? cuadros.aturdido[0] : cuadros.aire);
    j.setVelocity(lado * 160, -JUGADOR.golpe.empujon.y).setDragX(300);
    // De espaldas: la cabeza va hacia donde lo empujaron.
    this.tweens.add({ targets: j, angle: lado * 90, duration: 450, delay: 150, ease: 'Quad.in' });
    this.cameras.main.shake(300, 0.012);
    estallidoSangre(this, j.x, j.y); // Efectos.js

    // Una vida menos: reaparece con ¡LISTO! o, sin vidas, GAME OVER (Estado.js).
    finDeVida(this);
  },

  // Invulnerable un rato, parpadeando.
  parpadearJugador() {
    const j = this.jugador;
    this.invulnerableHasta = this.time.now + JUGADOR.golpe.invulnerable;
    this.tweens.add({
      targets: j, alpha: 0.3, duration: 90, yoyo: true, repeat: Math.floor(JUGADOR.golpe.invulnerable / 180) - 1,
      onComplete: () => j.setAlpha(1).clearTint()
    });
  },

  // Mareado: no se mueve ni dispara y no recibe otros golpes. En la pantalla
  // aparece solo la barra espaciadora (assets/mecanicas/espacio/,
  // herramientas/mecanica_espacio.py), latiendo, con el aviso de apretarla
  // varias veces: se hunde con cada toque y se prende un puntito por toque.
  aturdirJugador() {
    cerrarSelector(this, false); // Armas.js
    const { width, height } = this.scale;
    const y = height - 96;
    const fijo = (o) => o.setScrollFactor(0);
    const texto = fijo(TextFX.texto(this, 0, -66, '¡PRESIONA VARIAS VECES!', { color: 'oro', escala: 2 }));
    const tecla = fijo(this.add.image(0, 0, 'teclaEspacio').setScale(0.55));
    const n = JUGADOR.aturdido.toques;
    const puntos = [];
    for (let i = 0; i < n; i++) {
      puntos.push(fijo(this.add.circle((i - (n - 1) / 2) * 22, 60, 6, 0x000000, 0.45).setStrokeStyle(2, 0xffffff)));
    }
    const cartel = fijo(this.add.container(width / 2, y, [texto, tecla, ...puntos])).setDepth(35);
    this.tweens.add({ targets: tecla, scale: 0.6, duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: texto, alpha: 0.35, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: cartel, y: { from: y + 60, to: y }, alpha: { from: 0, to: 1 }, duration: 220, ease: 'Back.out' });
    this.aturdido = { toques: 0, desde: this.time.now, cartel, tecla, puntos };
    this.invulnerableHasta = Infinity;
    this.proximoDisparo = Infinity;
    if (this.cuadrosJugador.aturdido) this.jugador.anims.play('jugador_golpeado');
  },

  // Las escenas lo llaman cada cuadro con si ESPACIO se acaba de apretar.
  // Devuelve true mientras siga aturdido (entonces se ignoran las teclas).
  seguirAturdido(apreto) {
    const a = this.aturdido;
    if (!a) return false;
    const j = this.jugador;
    const ahora = this.time.now;
    // Los toques cuentan después del golpe (si no, el salto que venía apretado vale).
    if (apreto && ahora - a.desde > JUGADOR.aturdido.golpe) {
      a.toques++;
      const punto = a.puntos[a.toques - 1];
      if (punto) punto.setFillStyle(0x6fdc5a, 1);
      apretarTecla(this, a.tecla);
      this.tweens.add({ targets: j, angle: a.toques % 2 ? 6 : -6, duration: 50, yoyo: true });
    }
    if (a.toques >= JUGADOR.aturdido.toques || ahora - a.desde > JUGADOR.aturdido.maximo) {
      this.liberarJugador();
      return false;
    }
    return true;
  },

  liberarJugador() {
    this.aturdido.cartel.destroy();
    this.aturdido = null;
    this.jugador.setAngle(0);
    this.recuperandoHasta = this.time.now + JUGADOR.aturdido.recupera;
    this.proximoDisparo = this.recuperandoHasta;
    this.parpadearJugador();
  }
};

// La tecla del cartel de mareado se hunde un instante con cada toque.
function apretarTecla(escena, tecla) {
  tecla.setData('y', tecla.getData('y') ?? tecla.y);
  tecla.y = tecla.getData('y') + 7;
  escena.time.delayedCall(80, () => { if (tecla.active) tecla.y = tecla.getData('y'); });
}
