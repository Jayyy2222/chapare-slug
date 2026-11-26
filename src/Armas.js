// =============================================================================
// Armas que se recogen y las cajas que las traen (Nivel1 e Interior).
//
// Una caja de armas se abre a balazos (CAJA_ARMAS.vida tiros) o tocándola.
// Quieta brilla de a ratos; con cada balazo se ve más rota y al abrirse se
// desarma (polvo, tablas, el aguayo, una banana...) y suelta el arma, que
// flota hasta que el jugador la toma. Cada arma tiene su munición (la pistola
// es infinita): al gastarla vuelve a la pistola. Manteniendo TAB se abre el
// selector de armas (estilo GTA V, ver seguirSelector). El arma en la mano y
// la munición de cada una se guardan en el registry ('arma', 'municiones')
// para pasar a los interiores y al jefe. Sprites: herramientas/armas.py.
// =============================================================================

// cadencia: ms entre tiros; velocidad y alcance de la bala.
// Cada arma: nombre, textura (herramientas/armas.py; la pistola no tiene: es
// la del dibujo del personaje), casilla en el selector (0 arriba, en el
// sentido del reloj, 8 en total) y cómo dispara:
//   tipo       'bala', 'onda' (escopeta: el fogonazo lastima todo lo que
//              cubre), 'cohete' y 'granada' (explotan: EXPLOSIONES), 'llama'
//              o 'cuerpo' (machete)
//   proyectil  qué dispara (PROYECTILES), a tamaño real
//   cadencia   ms entre tiros;  velocidad y alcance de lo que dispara
//              (granada: alcance = ms hasta que explota sola)
//   dano       vida que le saca al jefe (las cholitas caen con cualquier golpe)
//   municion   balas que trae cada caja (sin municion: no se gasta)
//   ancho      px de arte a tamaño real (herramientas/armas.py las guarda a
//              TAMANO_ARMAS de eso: a tamaño real se veían muy grandes)
//   agarre, agarreY  la empuñadura (donde va la mano), en fracción de la
//              imagen (0,0 arriba a la izquierda; medida sobre cada dibujo)
//   cano       altura de la línea del caño (fracción): de ahí salen las balas
const ARMAS = {
  // La pistola: en el dibujo de Manfred; Tuto la lleva en la mano
  // ('armaPistola', de pistola.webp: herramientas/armas.py).
  pistola: {
    nombre: 'PISTOLA', icono: 'iconoPistola', casilla: 6, tipo: 'bala', proyectil: 'traza', cadencia: 140, velocidad: 950, alcance: 620,
    ancho: 15, tamano: 0.8, agarre: 0.2, agarreY: 0.62, cano: 0.15
  },
  ak47: {
    nombre: 'AK-47', textura: 'armaAk47', casilla: 0, tipo: 'bala', proyectil: 'trazaPesada',
    cadencia: 70, velocidad: 1150, alcance: 760, municion: 120, ancho: 31, agarre: 0.32, agarreY: 0.62, cano: 0.3
  },
  ametralladora: {
    nombre: 'AMETRALLADORA', textura: 'armaAmetralladora', casilla: 1, tipo: 'bala', proyectil: 'trazaPesada',
    cadencia: 50, velocidad: 1250, alcance: 820, dispersion: 4, municion: 200, ancho: 42, agarre: 0.27, agarreY: 0.65, cano: 0.35
  },
  escopeta: {
    // alcance: largo del fogonazo en metros (el escopetazo de Metal Slug).
    nombre: 'ESCOPETA', textura: 'armaEscopeta', casilla: 2, tipo: 'onda',
    cadencia: 650, alcance: 2.5, dano: 2, municion: 30, ancho: 35, agarre: 0.33, agarreY: 0.55, cano: 0.25
  },
  lanzacohetes: {
    nombre: 'LANZACOHETES', textura: 'armaLanzacohetes', casilla: 3, tipo: 'cohete', proyectil: 'cohete',
    cadencia: 900, velocidad: 620, alcance: 900, dano: 6, municion: 10, ancho: 46, agarre: 0.53, agarreY: 0.68, cano: 0.4
  },
  lanzagranadas: {
    nombre: 'LANZAGRANADAS', textura: 'armaLanzagranadas', casilla: 4, tipo: 'granada', proyectil: 'granada',
    cadencia: 700, velocidad: 520, alcance: 1400, dano: 4, municion: 12, ancho: 28, agarre: 0.33, agarreY: 0.68, cano: 0.35
  },
  lanzallamas: {
    nombre: 'LANZALLAMAS', textura: 'armaLanzallamas', casilla: 5, tipo: 'llama', proyectil: 'llama',
    cadencia: 70, velocidad: 380, alcance: 240, dano: 1, municion: 150, ancho: 19, agarre: 0.25, agarreY: 0.52, cano: 0.25
  },
  machete: {
    // alcance: px delante de la mano; el tajo es el de la espada Zantetsu (Efectos.js).
    nombre: 'MACHETE', textura: 'armaMachete', casilla: 7, tipo: 'cuerpo',
    cadencia: 380, alcance: 80, dano: 3, ancho: 21, agarre: 0.14, agarreY: 0.5, cano: 0.5
  }
};

// Los que explotan al pegar (Jugador.js: impactoBala).
const EXPLOSIVOS = ['cohete', 'granada'];

// Escala real: Manfred mide 62 px de arte (x ESCALA en pantalla) y 1,75 m.
function metros(m) {
  return m * ESCALA * 62 / 1.75; // px de pantalla
}

// Lo que dispara cada tipo, a tamaño real: textura, largo en px de esa
// textura (lo que cuenta como el proyectil) y cuánto mide de verdad. De las
// balas se ve el rastro de la trazadora, no la bala.
const PROYECTILES = {
  traza: { textura: 'fx_bala', largo: 16, metros: 0.35 },
  trazaPesada: { textura: 'balaAmetralladora', largo: 30, metros: 0.5 },
  cohete: { textura: 'vfx_cohete', largo: 32, metros: 0.5 },    // el cuerpo sin la llama (a 0,95 m reales era más largo que el lanzacohetes)
  granada: { textura: 'vfx_granada', largo: 14, metros: 0.1 },
  llama: { textura: 'vfx_llamarada', largo: 68, metros: 0.7 }    // crece hasta 2,4 veces
};

// Explosiones a tamaño real (alto de la nube): el radio de daño es el de lo
// que se ve (Jugador.js: explotarProyectil).
const EXPLOSIONES = {
  granada: { efecto: 'mediana', metros: 2.2 },
  cohete: { efecto: 'grande', metros: 3.2 }
};

function escalaProyectil(nombre) {
  const p = PROYECTILES[nombre];
  return metros(p.metros) / p.largo;
}

function escalaExplosion(nombre) {
  const e = EXPLOSIONES[nombre];
  return metros(e.metros) / EFECTOS[`explosion_${e.efecto}`].alto;
}

// Radio de daño: casi el medio ancho de la nube.
function radioExplosion(nombre) {
  const e = EXPLOSIONES[nombre];
  return EFECTOS[`explosion_${e.efecto}`].ancho * escalaExplosion(nombre) * 0.45;
}

// Cuadros de caja_armas.png: quieta 0-2 (brillo), golpeada 3-5, rompiéndose 6-11.
// caja_restos.png: 7 restos sueltos para las partículas.
// (herramientas/caja_armas.py, de caja_arma.jpeg y caja_arma_destruida.jpeg)
const CAJA_ARMAS = {
  vida: 3, ancho: 90, alto: 76, restos: 7,
  quieta: [0, 0, 0, 0, 0, 1, 2, 1], golpeada: 3, rompe: [6, 11]
};

// Las armas (herramientas/armas.py, de armas_varias.jpeg y ak47.jpeg) vienen
// a px de pantalla: van a escala ESCALA_ARMA (no a x2 como el pixel art), con
// el doble de detalle. Cada una tiene además su ícono grande para la rueda del
// selector (assets/armas/iconos/, textura 'icono...' en vez de 'arma...').
const ESCALA_ARMA = 1;
// Tamaño de las armas respecto del real (herramientas/armas.py, TAMANO): las
// largas a tamaño real; la pistola más chica (ARMAS.pistola.tamano).
const TAMANO_ARMAS = 1;

function iconoArma(arma) {
  const datos = ARMAS[arma];
  return datos.textura ? datos.textura.replace('arma', 'icono') : datos.icono;
}

// Sonidos de las armas (assets/audio/sfx/). Cada archivo trae más de un tiro
// (o silencio al principio): `inicio` y `dura` (segundos) son el tramo de un
// disparo limpio, medido sobre la forma de onda:
//   ak47           tiros sueltos en 0,4 / 1,3 / 2,3 s y una ráfaga desde 4,1 s
//   ametralladora  un tiro cada 0,09 s
//   escopeta       el estampido empieza en 0,6 s
//   lanza llamas   15 s de fuego: suena en bucle mientras se dispara
//   impacto_lanzacohetes  la explosión dura ~2 s (también la de la granada,
//                  un poco más aguda: no tiene sonido propio)
// El machete no tiene sonido. El volumen general es el del menú de pausa.
// volumen: igualados a la AK-47 (los archivos vienen a distinto nivel: la
// pistola suena el doble de fuerte y la escopeta el triple, y saturadas se
// oían chillonas). filtro: pasa-bajos en Hz (más bajo = más opaco), para que
// suenen con el mismo cuerpo, como de un juego y no de una grabación.
const SFX_ARMAS = {
  pistola: { archivo: 'pistola.mp3', inicio: 0, dura: 0.6, volumen: 0.26, filtro: 2200 },
  ak47: { archivo: 'ak47.mp3', inicio: 0.38, dura: 0.3, volumen: 0.45, filtro: 3800 },
  ametralladora: { archivo: 'ametralladora.mp3', inicio: 0, dura: 0.11, volumen: 0.5, filtro: 2800 },
  escopeta: { archivo: 'escopeta.mp3', inicio: 0.58, dura: 1.0, volumen: 0.3, filtro: 2400 },
  lanzacohetes: { archivo: 'lanzacohetes.mp3', inicio: 0, dura: 0.47, volumen: 0.6, filtro: 3200 },
  lanzagranadas: { archivo: 'lanza_granada.mp3', inicio: 0, dura: 1.2, volumen: 0.5, filtro: 3200 },
  lanzallamas: { archivo: 'lanza llamas.mp3', inicio: 0.1, dura: 14.5, volumen: 0.4, filtro: 2600, bucle: true }
};
const SFX_IMPACTOS = {
  cohete: { archivo: 'impacto_lanzacohetes.mp3', inicio: 0.1, dura: 1.9, volumen: 0.5, filtro: 2400 },
  granada: { archivo: 'impacto_lanzacohetes.mp3', inicio: 0.1, dura: 1.6, volumen: 0.42, tono: 1.2, filtro: 2600 }
};
// Otros sonidos del juego (assets/audio/sfx/): tramo de cada archivo. salto.mp3
// trae varios saltos seguidos (18 s): se usa el primero.
const SFX_VARIOS = {
  salto: { archivo: 'salto.mp3', inicio: 0.6, dura: 0.35, volumen: 0.45 },
  transformacion: { archivo: 'trasnformacion_enemigo.mp3', inicio: 0.05, dura: 7.2, volumen: 0.7 },
  muerteEnemigo: { archivo: 'muerte_enemigo.mp3', inicio: 0.05, dura: 1.55, volumen: 0.55 }, // el jefe final
  muerteNpc: { archivo: 'muerte_npc.mp3', inicio: 0.1, dura: 0.55, volumen: 0.55 },        // los enemigos comunes
  // Manfred al pisar tierra en el Nivel1 (Nivel1.entradaHelicoptero). Viene grabado bajo (pico a -14 dB):
  // volumen > 1 lo sube en el juego (+4 dB) sin tocar el archivo.
  manfredLlega: { archivo: 'manfred_llega.mp3', inicio: 0.05, dura: 4.5, volumen: 1.6 }
};

// Un sonido de SFX_VARIOS (con un poco de variación de tono).
function sonarSfx(escena, nombre) {
  const sfx = SFX_VARIOS[nombre];
  if (sfx) sonarTramo(escena, sfx, nombre);
}

// Uno largo que se puede cortar: devuelve { desvanecer(ms) } (se borra solo
// al terminar o al cerrarse la escena).
function sonarSfxLargo(escena, nombre) {
  const sfx = SFX_VARIOS[nombre];
  const nada = { desvanecer() {} };
  if (!sfx || !escena.cache.audio.exists(claveSfx(sfx.archivo)) || escena.sound.locked) return nada;
  const sonido = escena.sound.add(claveSfx(sfx.archivo));
  sonido.addMarker({ name: nombre, start: sfx.inicio, duration: sfx.dura, config: { volume: sfx.volumen } });
  sonido.once('complete', () => sonido.destroy());
  escena.events.once('shutdown', () => { if (sonido.manager) sonido.destroy(); });
  sonido.play(nombre);
  return {
    desvanecer(ms = 800) {
      if (!sonido.manager) return;
      escena.tweens.add({ targets: sonido, volume: 0, duration: ms, onComplete: () => { if (sonido.manager) sonido.destroy(); } });
    }
  };
}
const LLAMA_CORTE = 160; // ms sin disparar el lanzallamas para que se apague

function claveSfx(archivo) {
  return 'sfx_' + archivo.replace(/\.mp3$/, '').replace(/\s+/g, '_');
}

function cargarSfxArmas(escena) {
  [...Object.values(SFX_ARMAS), ...Object.values(SFX_IMPACTOS), ...Object.values(SFX_VARIOS)].forEach(({ archivo }) => {
    const clave = claveSfx(archivo);
    if (!escena.cache.audio.exists(clave)) escena.load.audio(clave, encodeURI(`assets/audio/sfx/${archivo}`));
  });
}

// Un sonido de `sfx` con su pasa-bajos (sfx.filtro, en Hz) entre el mute y
// el volumen del sonido (Phaser: muteNode -> volumeNode -> panner -> salida).
function sonidoFiltrado(escena, sfx) {
  const sonido = escena.sound.add(claveSfx(sfx.archivo));
  const ctx = escena.sound.context;
  if (sfx.filtro && ctx && sonido.muteNode && sonido.volumeNode) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = sfx.filtro;
    filtro.Q.value = 0.7;
    sonido.muteNode.disconnect();
    sonido.muteNode.connect(filtro);
    filtro.connect(sonido.volumeNode);
  }
  // Escenas con eco (la mina: crearEco): el sonido también entra al eco.
  if (escena.eco && sonido.volumeNode) sonido.volumeNode.connect(escena.eco.entrada);
  return sonido;
}

// Eco de galería (la mina): retardo con realimentación y un pasa-bajos (cada
// repetición sale más apagada). Todos los sonidos de la escena (sonidoFiltrado)
// y los que ella arma a mano (escena.eco.entrada) pasan por acá. Se desarma al
// cerrar la escena. retardo en s; realimentacion y mezcla de 0 a 1.
function crearEco(escena, { retardo = 0.26, realimentacion = 0.38, mezcla = 0.4, filtro = 1800 } = {}) {
  const ctx = escena.sound.context;
  if (!ctx || !ctx.createDelay) return null;
  const destino = escena.sound.destination || escena.sound.masterVolumeNode || ctx.destination;
  const entrada = ctx.createGain();
  const demora = ctx.createDelay(1);
  const vuelta = ctx.createGain();
  const apagado = ctx.createBiquadFilter();
  const salida = ctx.createGain();
  demora.delayTime.value = retardo;
  vuelta.gain.value = realimentacion;
  apagado.type = 'lowpass';
  apagado.frequency.value = filtro;
  salida.gain.value = mezcla;
  entrada.connect(demora);
  demora.connect(apagado);
  apagado.connect(vuelta);
  vuelta.connect(demora);
  apagado.connect(salida);
  salida.connect(destino);
  const eco = { entrada, nodos: [entrada, demora, vuelta, apagado, salida] };
  escena.eco = eco;
  escena.events.once('shutdown', () => {
    eco.nodos.forEach((n) => { try { n.disconnect(); } catch (e) { /* ya desconectado */ } });
    if (escena.eco === eco) escena.eco = null;
  });
  return eco;
}

// Un tramo de un archivo (se pueden superponer: cada uno es un sonido nuevo).
function sonarTramo(escena, sfx, nombre) {
  if (!escena.cache.audio.exists(claveSfx(sfx.archivo)) || escena.sound.locked) return;
  const sonido = sonidoFiltrado(escena, sfx);
  sonido.addMarker({
    name: nombre, start: sfx.inicio, duration: sfx.dura,
    config: { volume: sfx.volumen, rate: sfx.tono || 1, detune: Phaser.Math.Between(-60, 60) }
  });
  sonido.once('complete', () => sonido.destroy());
  sonido.play(nombre);
}

// El disparo de `arma`. quien: de quién es (cada uno tiene su lanzallamas).
function sonarArma(escena, arma, quien = 'yo') {
  const sfx = SFX_ARMAS[arma];
  if (!sfx) return;
  if (!sfx.bucle) { sonarTramo(escena, sfx, arma); return; }
  // Lanzallamas: un bucle que sigue mientras lleguen disparos.
  const clave = claveSfx(sfx.archivo);
  if (!escena.cache.audio.exists(clave) || escena.sound.locked) return;
  escena.llamas = escena.llamas || {};
  let llama = escena.llamas[quien];
  if (!llama) {
    const sonido = sonidoFiltrado(escena, sfx);
    sonido.addMarker({ name: 'fuego', start: sfx.inicio, duration: sfx.dura, config: { loop: true, volume: sfx.volumen } });
    sonido.play('fuego');
    llama = escena.llamas[quien] = { sonido, corte: null };
    escena.events.once('shutdown', () => sonido.destroy());
  }
  if (llama.corte) llama.corte.remove();
  llama.corte = escena.time.delayedCall(LLAMA_CORTE, () => {
    llama.sonido.destroy();
    delete escena.llamas[quien];
  });
}

// Sonidos del selector de armas: el mecanismo de carga que trae escopeta.mp3
// antes del disparo (medido cada 5 ms: golpes metálicos en 0,025 / 0,08 /
// 0,125 / 0,175 s, el corredor que vuelve de 0,3 a 0,5 s y el estampido en
// 0,61 s, que no entra).
const SFX_SELECTOR = {
  agarrar: { archivo: 'escopeta.mp3', inicio: 0.015, dura: 0.06, volumen: 0.3, filtro: 4500 },  // al abrir
  clic: { archivo: 'escopeta.mp3', inicio: 0.12, dura: 0.045, volumen: 0.32, filtro: 4500 },    // al pasar de casilla
  cargar: { archivo: 'escopeta.mp3', inicio: 0, dura: 0.52, volumen: 0.38, filtro: 4500 }       // al equipar otra
};

// abrir / cerrar: además, un soplido (generado con WebAudio, por el volumen
// general) que sube o baja con la cámara lenta.
function sonarSelector(escena, tipo) {
  if (tipo === 'abrir') sonarTramo(escena, SFX_SELECTOR.agarrar, 'sel_agarrar');
  else if (tipo === 'mover') sonarTramo(escena, SFX_SELECTOR.clic, 'sel_clic');
  else if (tipo === 'equipar') sonarTramo(escena, SFX_SELECTOR.cargar, 'sel_cargar');
  if (tipo === 'abrir' || tipo === 'cerrar') soplido(escena, tipo === 'abrir');
}

function soplido(escena, sube) {
  const ctx = escena.sound.context;
  if (!ctx || escena.sound.locked) return;
  const t = ctx.currentTime;
  const salida = escena.sound.destination || ctx.destination;
  // Ruido blanco filtrado: un golpe (clic) o un soplido (barrido de frecuencia).
  const ruido = (inicio, dura, tipoFiltro, desde, hasta, volumen) => {
    const largo = Math.max(1, Math.floor(ctx.sampleRate * dura));
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipoFiltro;
    filtro.Q.value = tipoFiltro === 'bandpass' ? 4 : 0.8;
    filtro.frequency.setValueAtTime(desde, t + inicio);
    filtro.frequency.exponentialRampToValueAtTime(hasta, t + inicio + dura);
    const vol = ctx.createGain();
    vol.gain.setValueAtTime(0.0001, t + inicio);
    vol.gain.exponentialRampToValueAtTime(volumen, t + inicio + Math.min(0.01, dura / 3));
    vol.gain.exponentialRampToValueAtTime(0.0001, t + inicio + dura);
    fuente.connect(filtro).connect(vol).connect(salida);
    fuente.start(t + inicio);
    fuente.stop(t + inicio + dura + 0.02);
  };
  if (sube) ruido(0, 0.2, 'lowpass', 300, 2200, 0.12);
  else ruido(0, 0.16, 'lowpass', 2000, 300, 0.08);
}

// La explosión de un cohete o una granada.
function sonarImpacto(escena, tipo) {
  if (SFX_IMPACTOS[tipo]) sonarTramo(escena, SFX_IMPACTOS[tipo], 'impacto_' + tipo);
}

function cargarArmas(escena) {
  cargarSfxArmas(escena);
  const archivos = { armaAk47: 'ak47', armaAmetralladora: 'ametralladora', armaEscopeta: 'escopeta', armaLanzacohetes: 'lanzacohetes',
    armaLanzagranadas: 'lanzagranadas', armaLanzallamas: 'lanzallamas', armaMachete: 'machete' };
  escena.load.image('armaPistola', 'assets/armas/pistola.png');
  escena.load.image('iconoPistola', 'assets/armas/iconos/pistola.png');
  Object.entries(archivos).forEach(([clave, archivo]) => {
    escena.load.image(clave, `assets/armas/${archivo}.png`);
    escena.load.image(clave.replace('arma', 'icono'), `assets/armas/iconos/${archivo}.png`);
  });
  escena.load.spritesheet('cajaArmas', 'assets/armas/caja_armas.png', { frameWidth: CAJA_ARMAS.ancho, frameHeight: CAJA_ARMAS.alto });
  escena.load.spritesheet('cajaRestos', 'assets/armas/caja_restos.png', { frameWidth: 28, frameHeight: 28 });
}

// Las animaciones son globales: se crean la primera vez.
function animacionesCaja(escena) {
  if (escena.anims.exists('caja_quieta')) return;
  escena.anims.create({ key: 'caja_quieta', frames: escena.anims.generateFrameNumbers('cajaArmas', { frames: CAJA_ARMAS.quieta }), frameRate: 6, repeat: -1 });
  const [a, b] = CAJA_ARMAS.rompe;
  // La rotura (caja_arma_destruida): más lenta, para que se vea cada paso;
  // el último cuadro (el montón de restos) se queda un rato.
  escena.anims.create({ key: 'caja_rompe', frames: escena.anims.generateFrameNumbers('cajaArmas', { start: a, end: b }), frameRate: 9 });
}

function armaJugador(escena) {
  return ARMAS[escena.registry.get('arma')] ? escena.registry.get('arma') : 'pistola';
}

// Balas que quedan de un arma (la pistola: Infinity; el machete, una vez
// recogido, también).
function municionDe(escena, arma) {
  if (arma === 'pistola') return Infinity;
  return (escena.registry.get('municiones') || {})[arma] || 0;
}

// Cuánto sale la boca del arma más allá de la mano, en px de arte.
function largoArma(arma) {
  return ARMAS[arma].ancho * (ARMAS[arma].tamano ?? TAMANO_ARMAS) * (1 - ARMAS[arma].agarre);
}

// Textura del arma en la mano (la pistola: 'armaPistola', de pistola.webp).
function texturaArma(nombre) {
  return ARMAS[nombre].textura || 'armaPistola';
}

// Elevación del arma en grados (0 adelante, 45 diagonal, 90 arriba): `arriba`
// puede ser true (90) o los grados.
function elevacionArma(arriba) {
  return arriba === true ? 90 : arriba || 0;
}

// Ángulo del disparo (grados de Phaser: 0 a la derecha, -90 arriba) mirando
// a `lado` con esa elevación.
function anguloDisparo(lado, elevacion) {
  return lado < 0 ? 180 + elevacion : -elevacion;
}

// Espejo y giro del fogonazo de la escopeta (dibujado hacia la derecha).
function fxEscopetazo(lado, elevacion) {
  return elevacion === 90 ? { espejo: false, angulo: -90 } : { espejo: lado < 0, angulo: -elevacion * lado };
}

// Pone la imagen del arma con la empuñadura en `mano` (px de pantalla),
// mirando a `lado` (1 derecha, -1 izquierda), levantada `arriba` (true o
// grados: 0 adelante, 45 diagonal, 90 arriba; gira alrededor de la
// empuñadura). Devuelve la punta del caño respecto de la mano (px de pantalla).
function colocarArma(escena, imagen, nombre, mano, lado, arriba) {
  const d = ARMAS[nombre];
  const textura = texturaArma(nombre);
  if (imagen.texture.key !== textura) imagen.setTexture(textura);
  imagen.setScale(ESCALA_ARMA).setFlipX(lado < 0)
    .setOrigin(lado < 0 ? 1 - d.agarre : d.agarre, d.agarreY)
    .setPosition(mano.x, mano.y);
  // Durante el tajo del machete el ángulo lo maneja el tween.
  if (escena.time.now >= (escena.tajoHasta || 0)) imagen.setAngle(-elevacionArma(arriba) * lado);
  return bocaDesdeMano(escena, nombre, lado, arriba);
}

function bocaDesdeMano(escena, nombre, lado, arriba) {
  const d = ARMAS[nombre];
  const img = escena.textures.get(texturaArma(nombre)).getSourceImage();
  const adelante = img.width * ESCALA_ARMA * (1 - d.agarre);
  const subir = img.height * ESCALA_ARMA * (d.agarreY - d.cano); // el caño va más arriba que la mano
  // (adelante, -subir) girado la elevación hacia arriba, espejado si mira a la izquierda.
  const r = Phaser.Math.DegToRad(elevacionArma(arriba));
  return { x: lado * (adelante * Math.cos(r) - subir * Math.sin(r)), y: -adelante * Math.sin(r) - subir * Math.cos(r) };
}

function ponerMunicion(escena, arma, cantidad) {
  escena.registry.set('municiones', { ...(escena.registry.get('municiones') || {}), [arma]: cantidad });
}

// Al empezar el nivel o al morir: solo la pistola.
function reiniciarArmas(escena) {
  escena.registry.set('arma', 'pistola');
  escena.registry.set('municiones', {});
}

// Arma y munición debajo del panel de vida.
function hudArma(escena) {
  const texto = TextFX.hud(escena, VIDA.x + 4, VIDA.y + 46, '', { origen: 0 }).setDepth(30);
  actualizarHudArma(escena, texto);
  return texto;
}

function actualizarHudArma(escena, texto) {
  const arma = armaJugador(escena);
  const balas = municionDe(escena, arma);
  texto.setText(balas === Infinity ? ARMAS[arma].nombre : `${ARMAS[arma].nombre}  ${balas}`);
  texto.setColor(arma === 'pistola' ? 'plata' : 'oro');
}

// Caja con los pies en `abajo` que trae `arma`. `id` (opcional) la recuerda
// abierta en el registry ('cajas'), para no volver a ponerla al entrar de
// nuevo a una casa. La escena le pega con sus balas llamando a golpearCaja.
function crearCajaArmas(escena, x, abajo, arma, id) {
  if (id && (escena.registry.get('cajas') || {})[id]) return null;
  animacionesCaja(escena);
  const caja = escena.physics.add.staticSprite(x, abajo, 'cajaArmas', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(8.5);
  caja.refreshBody();
  // No todas brillan al mismo tiempo.
  caja.play({ key: 'caja_quieta', startFrame: Phaser.Math.Between(0, CAJA_ARMAS.quieta.length - 1) });
  const sombra = escena.add.ellipse(x, abajo - 1, 54 * ESCALA, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(8.4);
  const brillo = brilloCaja(escena, caja);
  caja.setData({ vida: CAJA_ARMAS.vida, id, sombra, arma, brillo });
  escena.physics.add.overlap(escena.jugador, caja, () => abrirCaja(escena, caja));
  return caja;
}

// Texturas del brillo de la caja: resplandor suave (degradado radial) y una
// estrellita de 4 puntas.
function texturasBrilloCaja(escena) {
  if (!escena.textures.exists('cajaResplandor')) {
    const t = escena.textures.createCanvas('cajaResplandor', 128, 128);
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,236,150,0.85)');
    g.addColorStop(0.35, 'rgba(255,200,70,0.35)');
    g.addColorStop(1, 'rgba(255,170,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    t.refresh();
  }
  texturaPixeles(escena, 'cajaEstrella', [
    '....w....',
    '....y....',
    '....y....',
    '...yWy...',
    'wyyWWWyyw',
    '...yWy...',
    '....y....',
    '....y....',
    '....w....'
  ], { w: 0xfff2b0, y: 0xffd23f, W: 0xffffff });
}

// El brillo de una caja cerrada (todo ADD, detrás de la caja salvo las
// estrellitas): resplandor que respira, rayos que giran despacio, la silueta
// dorada de la caja latiendo, estrellitas que titilan en las esquinas y motas
// doradas que suben. Devuelve lo que hay que apagar al abrirla.
function brilloCaja(escena, caja) {
  texturasBrilloCaja(escena);
  texturaRayosArma(escena);
  const ADD = Phaser.BlendModes.ADD;
  const cx = caja.x;
  const cy = caja.y - caja.displayHeight * 0.32;
  const resplandor = escena.add.image(cx, cy, 'cajaResplandor').setBlendMode(ADD).setDepth(8.42)
    .setScale(2.1, 1.5).setAlpha(0.55);
  escena.tweens.add({ targets: resplandor, alpha: 0.3, scaleX: 2.4, scaleY: 1.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  const rayos = escena.add.image(cx, cy, 'fx_rayos').setBlendMode(ADD).setDepth(8.43).setScale(1.5, 1.1).setAlpha(0.28);
  escena.tweens.add({ targets: rayos, angle: 360, duration: 9000, repeat: -1 });
  const silueta = escena.add.image(caja.x, caja.y + 2, 'cajaArmas', 0).setOrigin(0.5, 1).setScale(ESCALA * 1.06)
    .setTintFill(0xffd23f).setBlendMode(ADD).setAlpha(0.45).setDepth(8.44);
  escena.tweens.add({ targets: silueta, alpha: 0.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  const motas = escena.add.particles(0, 0, 'fx_chispa', {
    emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(cx - 40, caja.y - 30, 80, 24) },
    speedY: { min: -45, max: -18 }, speedX: { min: -6, max: 6 }, lifespan: { min: 900, max: 1500 },
    scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffe680, 0xfff6c0, 0xffc040],
    frequency: 110, blendMode: 'ADD'
  }).setDepth(8.6);
  // Estrellitas: aparecen en una esquina o borde, crecen girando y se apagan.
  const estrellas = escena.time.addEvent({
    delay: 380, loop: true, callback: () => {
      if (!caja.active || caja.getData('abierta')) return;
      const w = caja.displayWidth * 0.45;
      const h = caja.displayHeight * 0.5;
      const e = escena.add.image(cx + Phaser.Math.Between(-w, w), caja.y - Phaser.Math.Between(6, h), 'cajaEstrella')
        .setBlendMode(ADD).setDepth(8.7).setScale(0).setAngle(Phaser.Math.Between(0, 45));
      escena.tweens.add({
        targets: e, scale: Phaser.Math.FloatBetween(1.6, 2.6), angle: e.angle + 90, duration: 260, yoyo: true,
        ease: 'Sine.out', onComplete: () => e.destroy()
      });
    }
  });
  return { partes: [resplandor, rayos, silueta, motas], estrellas };
}

function apagarBrilloCaja(escena, brillo) {
  if (!brillo) return;
  brillo.estrellas.remove();
  brillo.partes.forEach((o) => {
    if (o.stop) o.stop();
    escena.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() });
  });
}

function golpearCaja(escena, caja) {
  if (!caja.active) return;
  const vida = caja.getData('vida') - 1;
  caja.setData('vida', vida);
  efecto(escena, 'explosion_chica', caja.x + Phaser.Math.Between(-16, 16), caja.y - Phaser.Math.Between(20, 50), { escala: 1.2 });
  if (vida <= 0) {
    abrirCaja(escena, caja);
    return;
  }
  // Cada balazo la rompe un poco más (golpeada: 3 cuadros, el primero entero).
  caja.anims.stop();
  caja.setFrame(CAJA_ARMAS.golpeada + Math.min(2, CAJA_ARMAS.vida - vida));
  caja.setTintFill(0xffffff);
  escena.time.delayedCall(50, () => caja.active && caja.clearTint());
  escena.tweens.add({ targets: caja, x: caja.x + 3, duration: 40, yoyo: true, repeat: 1 });
}

// Se desarma (animación y restos que saltan) y deja el arma flotando.
function abrirCaja(escena, caja) {
  if (!caja.active || caja.getData('abierta')) return;
  caja.setData('abierta', true);
  caja.body.enable = false;
  const { x, y } = caja;
  const id = caja.getData('id');
  if (id) escena.registry.set('cajas', { ...(escena.registry.get('cajas') || {}), [id]: true });
  caja.clearTint().play('caja_rompe');
  apagarBrilloCaja(escena, caja.getData('brillo'));
  // La explosión de la hoja se ve sola; una chica encima en el cuadro en que estalla.
  escena.time.delayedCall(220, () => explotar(escena, x, y - 6, 'chica', ESCALA * 0.9)); // Efectos.js
  caja.once('animationcomplete', () => {
    escena.tweens.add({ targets: [caja, caja.getData('sombra')], alpha: 0, delay: 1400, duration: 500, onComplete: () => caja.destroy() });
  });
  const restos = escena.add.particles(x, y - 40, 'cajaRestos', {
    frame: Phaser.Utils.Array.NumberArray(0, CAJA_ARMAS.restos - 1),
    speed: { min: 160, max: 380 }, angle: { min: 210, max: 330 }, gravityY: 1100,
    lifespan: 900, scale: ESCALA, alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 }, emitting: false
  }).setDepth(10.3);
  restos.explode(10);
  escena.time.delayedCall(1000, () => restos.destroy());
  escena.cameras.main.shake(80, 0.004);

  const arma = caja.getData('arma');
  const objeto = escena.physics.add.staticImage(x, y - 60, ARMAS[arma].textura).setScale(ESCALA_ARMA).setDepth(9);
  objeto.refreshBody();
  objeto.setData('brillo', brilloArma(escena, objeto, ESCALA_ARMA));
  escena.tweens.add({ targets: objeto, y: y - 70, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 380 });
  escena.physics.add.overlap(escena.jugador, objeto, () => tomarArma(escena, objeto, arma));
}

// Rayos dorados que salen del centro (para el brillo de las armas y la
// presentación de un arma nueva).
function texturaRayosArma(escena) {
  if (escena.textures.exists('fx_rayos')) return;
  const t = escena.textures.createCanvas('fx_rayos', 128, 128);
  const ctx = t.getContext();
  ctx.translate(64, 64);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI * 2 / 12);
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,244,170,0.95)');
    g.addColorStop(1, 'rgba(255,190,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(64, i % 2 ? -5 : -8);
    ctx.lineTo(64, i % 2 ? 5 : 8);
    ctx.closePath();
    ctx.fill();
  }
  const r = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
  r.addColorStop(0, 'rgba(255,255,230,0.9)');
  r.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = r;
  ctx.fillRect(-64, -64, 128, 128);
  t.refresh();
}

// Un arma (o premio) para recoger: aparece de golpe (crece con un anillo de
// luz y un estallido de chispas) y mientras espera brilla: rayos dorados que
// giran detrás, su silueta dorada latiendo y chispitas que suben. Todo sigue
// al objeto (aunque caiga o flote). Devuelve lo que hay que borrar al tomarlo.
function brilloArma(escena, objeto, escala) {
  texturasEfectos(escena); // EfectosMenu.js: fx_chispa
  texturaRayosArma(escena);
  const ADD = Phaser.BlendModes.ADD;
  const rayos = escena.add.image(objeto.x, objeto.y, 'fx_rayos').setBlendMode(ADD).setDepth(8.85).setScale(0).setAlpha(0.85);
  escena.tweens.add({ targets: rayos, scale: 1, duration: 380, ease: 'Back.out' });
  escena.tweens.add({ targets: rayos, angle: 360, duration: 5000, repeat: -1 });
  escena.tweens.add({ targets: rayos, alpha: 0.45, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 380 });
  const halo = escena.add.image(objeto.x, objeto.y, objeto.texture.key).setScale(escala * 1.3).setTintFill(0xfff0a0)
    .setBlendMode(ADD).setAlpha(0.85).setDepth(8.95);
  escena.tweens.add({ targets: halo, alpha: 0.25, scale: escala * 1.55, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  const chispitas = escena.add.particles(0, 0, 'fx_chispa', {
    x: { min: -36, max: 36 }, y: { min: -10, max: 10 }, speedY: { min: -80, max: -25 }, speedX: { min: -12, max: 12 },
    lifespan: 750, frequency: 70, scale: { start: 1.8, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD'
  }).setDepth(9.1).startFollow(objeto);
  // Aparición: crece de golpe, un anillo de luz y chispas.
  objeto.setScale(0);
  escena.tweens.add({ targets: objeto, scale: escala, duration: 380, ease: 'Back.out' });
  const anillo = escena.add.circle(objeto.x, objeto.y, 12).setStrokeStyle(4, 0xfff0a0).setBlendMode(ADD).setDepth(9.2);
  escena.tweens.add({ targets: anillo, scale: 6, alpha: 0, duration: 500, ease: 'Quad.out', onComplete: () => anillo.destroy() });
  chispas(escena, objeto.x, objeto.y, 18, -90, 360, 9.2);
  // Rayos y silueta siguen al objeto.
  const seguir = () => {
    if (!objeto.active) return;
    rayos.setPosition(objeto.x, objeto.y);
    halo.setPosition(objeto.x, objeto.y).setAngle(objeto.angle);
  };
  escena.events.on('postupdate', seguir);
  objeto.once('destroy', () => escena.events.off('postupdate', seguir));
  return [rayos, halo, chispitas];
}

// La primera vez que se toma un arma (en la partida): presentación al estilo
// Metal Slug. El ícono grande vuela al centro de la pantalla girando sobre
// rayos dorados, "¡NUEVA ARMA!" y su nombre, y después se va al HUD.
function presentarArma(escena, arma, x, y) {
  texturaRayosArma(escena);
  const { width, height } = escena.scale;
  const cam = escena.cameras.main;
  const cx = width / 2;
  const cy = height / 2 - 20;
  const fijo = (o) => o.setScrollFactor(0).setDepth(45);
  const velo = fijo(escena.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0));
  escena.tweens.add({ targets: velo, fillAlpha: 0.45, duration: 200 });
  const rayos = fijo(escena.add.image(cx, cy, 'fx_rayos').setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0.95));
  escena.tweens.add({ targets: rayos, scale: 3.4, duration: 450, ease: 'Back.out' });
  escena.tweens.add({ targets: rayos, angle: 200, duration: 1700 });
  const icono = fijo(escena.add.image(x - cam.scrollX, y - cam.scrollY, iconoArma(arma)).setScale(0.4));
  escena.tweens.add({ targets: icono, x: cx, y: cy, scale: 1.8, angle: 360, duration: 480, ease: 'Back.out' });
  const titulo = fijo(TextFX.texto(escena, cx, cy - 110, '¡NUEVA ARMA!', { color: 'oro', escala: 4 })).setScale(0);
  escena.tweens.add({ targets: titulo, scale: 1, duration: 300, delay: 200, ease: 'Back.out', onComplete: () => titulo.destellar(3, 80) });
  const nombre = fijo(TextFX.texto(escena, cx, cy + 76, ARMAS[arma].nombre, { color: 'plata', escala: 3 })).setAlpha(0);
  escena.tweens.add({ targets: nombre, alpha: 1, y: cy + 66, duration: 250, delay: 350 });
  escena.time.delayedCall(250, () => chispas(escena, cx + cam.scrollX, cy + cam.scrollY, 30, -90, 360, 46));
  cam.flash(120, 255, 236, 150);
  // Al HUD (debajo de la vida) y se van.
  escena.time.delayedCall(1450, () => {
    escena.tweens.add({ targets: icono, x: VIDA.x + 70, y: VIDA.y + 54, scale: 0.35, alpha: 0.2, duration: 380, ease: 'Quad.in' });
    escena.tweens.add({ targets: [velo, rayos, titulo, nombre], alpha: 0, duration: 380 });
    escena.time.delayedCall(400, () => {
      [velo, rayos, icono, titulo, nombre].forEach((o) => o.destroy());
      if (escena.hudArma) escena.tweens.add({ targets: escena.hudArma, scale: 1.3, duration: 120, yoyo: true });
    });
  });
}

function tomarArma(escena, objeto, arma) {
  if (!objeto.active) return;
  (objeto.getData('brillo') || []).forEach((o) => o.destroy());
  objeto.destroy();
  escena.registry.set('arma', arma);
  // Queda guardada en el selector (TAB); el machete no gasta.
  ponerMunicion(escena, arma, ARMAS[arma].municion ? municionDe(escena, arma) + ARMAS[arma].municion : Infinity);
  if (escena.hudArma) actualizarHudArma(escena, escena.hudArma);
  // La primera vez en la partida: la presentación; si no, el aviso de siempre.
  const vistas = escena.registry.get('armasVistas') || {};
  if (!vistas[arma]) {
    escena.registry.set('armasVistas', { ...vistas, [arma]: true });
    presentarArma(escena, arma, objeto.x, objeto.y);
    return;
  }
  escena.cameras.main.flash(100, 255, 230, 140);
  TextFX.popup(escena, objeto.x, objeto.y - 20, `¡${ARMAS[arma].nombre}!`, { subir: 50, duracion: 1300 }).setDepth(20);
}

// Un tiro gastado: con la munición en 0 vuelve a la pistola.
function gastarMunicion(escena) {
  const arma = armaJugador(escena);
  if (municionDe(escena, arma) === Infinity) return;
  const quedan = municionDe(escena, arma) - 1;
  ponerMunicion(escena, arma, quedan);
  if (quedan <= 0) escena.registry.set('arma', 'pistola');
  if (escena.hudArma) actualizarHudArma(escena, escena.hudArma);
  if (quedan <= 0) sinMunicion(escena); // Estado.js: ¡SIN MUNICIÓN!
}

// -----------------------------------------------------------------------------
// Selector de armas (estilo GTA V): manteniendo TAB aparece una rueda de 8
// casillas, el juego se difumina detrás y va en cámara lenta. Se elige con el mouse (hacia dónde
// apunta desde el centro) o con ←/→ (A/D), que pasan por las armas que tiene;
// al soltar TAB se equipa. La casilla elegida va en blanco, la del arma en la
// mano lleva el arco celeste afuera y en el centro, el nombre y las balas.
// La rueda se dibuja en CapaSelector, una escena aparte encima de todo: así el
// desenfoque de la cámara del nivel no la toca.
// -----------------------------------------------------------------------------

class CapaSelector extends Phaser.Scene {
  constructor() {
    super({ key: 'CapaSelector', active: true }); // arranca con el juego, vacía
  }
}

const SELECTOR = {
  casillas: 8, afuera: 200, adentro: 128, hueco: 2.5, // radios en px y separación en grados
  lento: 4,          // cámara lenta: el tiempo va 4 veces más despacio
  entrada: 180,      // ms en llegar a la cámara lenta y al desenfoque
  desenfoque: 0.6,   // fuerza del desenfoque del fondo (solo con WebGL)
  gris: 0x333333, blanco: 0xd9d9d9, celeste: 0x46d2d2, borde: 0x0a0a0a
};

// Ícono de la pistola (la AK usa su sprite).
function texturasSelector(escena) {
  texturaPixeles(escena, 'armaPistola', [
    '.kkkkkkkkkkk',
    'kgggggggggwk',
    'kgggggggggk.',
    'kkkkggkkkk..',
    '...kggk.....',
    '...kggk.....',
    '...kkkk.....'
  ], { k: 0x1a1a1a, g: 0x7a7f86, w: 0xc8ccd0 });
}

// Armas que tiene (con balas), en el orden de las casillas.
function armasDisponibles(escena) {
  return Object.keys(ARMAS).filter((a) => municionDe(escena, a) > 0)
    .sort((a, b) => ARMAS[a].casilla - ARMAS[b].casilla);
}

// Las escenas lo llaman cada cuadro con si TAB está apretado. Devuelve true
// mientras el selector esté abierto (entonces el jugador no se mueve ni dispara).
function seguirSelector(escena, tab) {
  const sel = escena.selectorArmas;
  if (tab && !sel) abrirSelector(escena);
  if (!tab && sel) cerrarSelector(escena, true);
  if (!escena.selectorArmas) return false;
  elegirEnSelector(escena);
  return true;
}

// Cámara lenta: física, relojes, tweens y animaciones (estas son globales).
function camaraLenta(escena, factor) {
  escena.physics.world.timeScale = factor;
  escena.time.timeScale = 1 / factor;
  escena.tweens.timeScale = 1 / factor;
  escena.anims.globalTimeScale = 1 / factor;
}

function abrirSelector(escena) {
  texturasSelector(escena);
  const capa = escena.scene.get('CapaSelector');
  capa.scene.bringToTop();
  const { width, height } = escena.scale;
  const cx = width / 2;
  const cy = height / 2;
  const fijo = (o) => o.setScrollFactor(0).setDepth(50);
  // El fondo: desenfoque en la cámara del nivel y la cámara lenta, de a poco
  // (con los tweens de la capa, que no van lentos).
  const camara = escena.cameras.main;
  const desenfoque = escena.renderer.type === Phaser.WEBGL && camara.postFX ? camara.postFX.addBlur(0, 1, 1, 0) : null;
  const entrada = capa.tweens.addCounter({
    from: 0, to: 1, duration: SELECTOR.entrada,
    onUpdate: (t) => {
      const v = t.getValue();
      camaraLenta(escena, 1 + (SELECTOR.lento - 1) * v);
      if (desenfoque) desenfoque.strength = SELECTOR.desenfoque * v;
    }
  });
  const sel = {
    cx, cy, camara, desenfoque, entrada,
    elegida: armaJugador(escena),
    puntero: { x: escena.input.activePointer.x, y: escena.input.activePointer.y },
    velo: fijo(capa.add.rectangle(0, 0, width, height, 0x000000, 0.35).setOrigin(0)),
    rueda: fijo(capa.add.graphics()),
    iconos: {},
    nombre: fijo(TextFX.texto(capa, cx, cy - 22, '', { color: 'oro' })),
    balas: fijo(TextFX.texto(capa, cx, cy + 26, '', { color: 'plata', escala: 1 })),
    flechas: fijo(TextFX.texto(capa, cx, cy + 2, '◄          ►', { color: 'plata' })),
    ayuda: fijo(TextFX.texto(capa, cx, cy + SELECTOR.afuera + 26, 'MOUSE O ←/→ PARA ELEGIR · SUELTA TAB', { color: 'plata' }))
  };
  Object.entries(ARMAS).forEach(([arma, datos]) => {
    const angulo = Phaser.Math.DegToRad(datos.casilla * 360 / SELECTOR.casillas - 90);
    const radio = (SELECTOR.afuera + SELECTOR.adentro) / 2;
    // Los íconos grandes (armas_varias.jpeg) caben en la casilla (hasta 96x52
    // px); la pistola, dibujada en pixel art, más chica.
    const icono = iconoArma(arma);
    const fuente = capa.textures.get(icono).getSourceImage();
    const [maxAncho, maxAlto] = datos.textura ? [96, 52] : [72, 50]; // la pistola, más chica
    sel.iconos[arma] = fijo(capa.add.image(cx + Math.cos(angulo) * radio, cy + Math.sin(angulo) * radio, icono)
      .setScale(Math.min(maxAncho / fuente.width, maxAlto / fuente.height)));
  });
  escena.selectorArmas = sel;
  dibujarSelector(escena);
  sonarSelector(escena, 'abrir');
}

// equipar: si se equipa la elegida (al soltar TAB) o se cierra sin cambiar
// (al morir o quedar aturdido).
function cerrarSelector(escena, equipar) {
  const sel = escena.selectorArmas;
  if (!sel) return;
  escena.selectorArmas = null;
  [sel.velo, sel.rueda, sel.nombre, sel.balas, sel.flechas, sel.ayuda, ...Object.values(sel.iconos)].forEach((o) => o.destroy());
  sel.entrada.stop();
  if (sel.desenfoque) sel.camara.postFX.remove(sel.desenfoque);
  camaraLenta(escena, 1);
  if (equipar && sel.elegida !== armaJugador(escena) && municionDe(escena, sel.elegida) > 0) {
    escena.registry.set('arma', sel.elegida);
    if (escena.hudArma) actualizarHudArma(escena, escena.hudArma);
    sonarSelector(escena, 'equipar');
  } else if (equipar) {
    sonarSelector(escena, 'cerrar');
  }
}

function elegirEnSelector(escena) {
  const sel = escena.selectorArmas;
  const antes = sel.elegida;
  const teclas = escena.teclas;
  const extra = escena.teclasExtra;
  const paso = Phaser.Input.Keyboard.JustDown(teclas.right) || Phaser.Input.Keyboard.JustDown(extra.D) ? 1
    : Phaser.Input.Keyboard.JustDown(teclas.left) || Phaser.Input.Keyboard.JustDown(extra.A) ? -1 : 0;
  const disponibles = armasDisponibles(escena);
  if (paso) {
    const i = disponibles.indexOf(sel.elegida);
    sel.elegida = disponibles[(i + paso + disponibles.length) % disponibles.length];
  }
  // Mouse: solo si se movió desde que se abrió y está lejos del centro.
  const p = escena.input.activePointer;
  const movido = Math.abs(p.x - sel.puntero.x) + Math.abs(p.y - sel.puntero.y) > 4;
  if (movido && Phaser.Math.Distance.Between(p.x, p.y, sel.cx, sel.cy) > 40) {
    const grados = Phaser.Math.RadToDeg(Math.atan2(p.y - sel.cy, p.x - sel.cx)) + 90;
    const casilla = Math.round(grados / (360 / SELECTOR.casillas) + SELECTOR.casillas) % SELECTOR.casillas;
    const arma = disponibles.find((a) => ARMAS[a].casilla === casilla);
    if (arma) sel.elegida = arma;
    sel.puntero = { x: p.x, y: p.y };
  }
  if (sel.elegida !== antes) {
    dibujarSelector(escena);
    sonarSelector(escena, 'mover');
  }
}

function dibujarSelector(escena) {
  const sel = escena.selectorArmas;
  const g = sel.rueda.clear();
  const { cx, cy } = sel;
  const n = SELECTOR.casillas;
  const enMano = armaJugador(escena);
  const disponibles = armasDisponibles(escena);
  const casillaDe = (arma) => ARMAS[arma].casilla;
  // Centro negro.
  g.fillStyle(0x000000, 0.85).fillCircle(cx, cy, SELECTOR.adentro - 4);
  for (let i = 0; i < n; i++) {
    const desde = Phaser.Math.DegToRad(i * 360 / n - 90 - 180 / n + SELECTOR.hueco);
    const hasta = Phaser.Math.DegToRad(i * 360 / n - 90 + 180 / n - SELECTOR.hueco);
    const elegida = casillaDe(sel.elegida) === i;
    g.fillStyle(elegida ? SELECTOR.blanco : SELECTOR.gris, elegida ? 0.95 : 0.88);
    g.beginPath();
    g.arc(cx, cy, SELECTOR.afuera, desde, hasta, false);
    g.arc(cx, cy, SELECTOR.adentro, hasta, desde, true);
    g.closePath();
    g.fillPath();
    // Arco celeste afuera de la casilla del arma en la mano (con un brillo).
    if (casillaDe(enMano) === i) {
      g.lineStyle(12, SELECTOR.celeste, 0.25).beginPath().arc(cx, cy, SELECTOR.afuera + 9, desde, hasta).strokePath();
      g.lineStyle(5, SELECTOR.celeste, 1).beginPath().arc(cx, cy, SELECTOR.afuera + 7, desde, hasta).strokePath();
    }
  }
  Object.entries(sel.iconos).forEach(([arma, icono]) => {
    const tiene = disponibles.includes(arma);
    icono.setVisible(tiene);
    // Sobre la casilla blanca el ícono va oscuro, como en GTA.
    if (arma === sel.elegida) icono.setTintFill(0x1a1a1a);
    else icono.clearTint();
  });
  const balas = municionDe(escena, sel.elegida);
  sel.nombre.setText(ARMAS[sel.elegida].nombre);
  sel.balas.setText(balas === Infinity ? 'BALAS ILIMITADAS' : `${balas} BALAS`);
  sel.flechas.setVisible(disponibles.length > 1);
}
