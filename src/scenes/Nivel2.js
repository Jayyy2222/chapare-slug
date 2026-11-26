// =============================================================================
// NIVEL 2 · POTOSÍ. Tres escenas seguidas que comparten esta clase:
//   Nivel2  las calles coloniales hasta la Casa de la Moneda (este archivo)
//   Patio   el patio de la Casa de la Moneda y el jefe, el Mascarón (Patio.js)
//   Subida  la subida al Cerro Rico y la entrada a la mina (Subida.js)
// Viene después del Nivel 1 (la tabla de MISIÓN COMPLETA del jefe final,
// Estado.js: Resultado). Hereda de la Cueva (Cueva.js): jugador, colisión por
// JSON, editor (tecla E), rompibles, rehenes, zonas y GO →. Cada escena pasa
// su configuración (POTOSI, PATIO, SUBIDA) y cambia solo lo suyo.
//
// Imágenes: assets/fondos/potosi/ (herramientas/potosi_nivel2.py, a partir de
// assets/fondos/lvl1/lvl2/), a escala 1 y con la y del lienzo = la y del mundo:
//   calle_1.png, calle_2.png  los tramos de calle (scrollFactor 1), uno tras
//                             otro; la vereda en y 500 (y 250 a 512x288)
//   moneda.png                la Casa de la Moneda al final de la calle
//   cielo / cerros / cerro_rico / ciudad / techos / campanario   parallax
//   obj_*.png, obj_*2.png     objetos sueltos (objetos.jpeg y obejtos3.jpeg)
//   condor / palomas / humo / campana (hojas de 4 cuadros), viento_1..3
// Colisión: <escena>_collision.json. Como en la Cueva (ground, platforms,
// walls, ladders) más tejas: tramos de techo que se caen al pisarlos. Los
// balcones y los techos son pisos de un solo sentido. Tecla E: editor (T
// agrega tejas).
//
// Calles: dos rutas que la cámara ve a la vez. Abajo, la calle: enemigos que
// salen por las puertas, barricadas de sacos, carretas que se rompen y una
// llama que huye. Arriba, balcones y techos: francotiradores (también en los
// campanarios de la iglesia, que tocan a rebato), un rehén escondido detrás
// del tanque de agua, una caja de arma, palomas y tejas que se caen. Las dos se
// juntan en la plaza de la Casa de la Moneda: al vencer a sus guardias la
// puerta vuela con una explosión y se entra con un fundido al patio.
// =============================================================================

// Todos los objetos sueltos (obj_<nombre>.png y su variante obj_<nombre>2.png).
const OBJETOS_POTOSI = ['puesto', 'carreta', 'sacos', 'escalera', 'puerta', 'puerta_rota', 'ventana', 'ventana_abierta',
  'farol', 'llama', 'letrero', 'tejas'];
// Objetos de objetos_potosi.jpeg (herramientas/objetos_potosi.py; la fila de
// las cuevas no va): sueltos (obj_<nombre>.png, clave potosi_<nombre>) y
// hojas animadas (hoja_<nombre>.png, clave potosiHoja_<nombre>, celdas de
// objetos_potosi.json).
const OBJETOS_POTOSI_SUELTOS = ['sacos_verdes', 'escombros_carreta', 'turril_viejo', 'turril_viejo2', 'turril_rojo',
  'caja_botin', 'caja_botin_abierta'];
const HOJAS_OBJETOS_POTOSI = {
  bandera: [104, 92], reflector: [117, 96], palomas_comen: [40, 23], palomas_vuelan: [43, 48],
  pileta: [116, 135], farol_calle: [53, 177], llama_anda: [93, 113], llama_corre: [110, 108], turril_explota: [113, 75]
};
// Hojas animadas: clave, archivo, celda.
const HOJAS_POTOSI = [
  { clave: 'potosiCondor', archivo: 'condor.png', ancho: 100, alto: 48 },
  { clave: 'potosiPalomas', archivo: 'palomas.png', ancho: 110, alto: 56 },
  { clave: 'potosiHumo', archivo: 'humo.png', ancho: 64, alto: 72 },
  { clave: 'potosiCampana', archivo: 'campana.png', ancho: 40, alto: 44 }
];

const POTOSI = {
  ruta: 'assets/fondos/potosi/',
  colision: { clave: 'potosiColision', archivo: 'potosi_collision.json' },
  ancho: 4728,
  // Casas más grandes: el dibujo de las calles (y su colisión, puertas,
  // ventanas, enemigos y adornos) se agranda desde la vereda (piso). Las
  // coordenadas de esta configuración y del JSON siguen en px de los PNG; la
  // escena las pasa al mundo (escalarPotosi). Con más de 1.2 los techos más
  // altos se salen de la pantalla. El jugador y los objetos sueltos no cambian.
  escalaCasas: 1.2, piso: 500,
  inicio: { x: 60, desde: 470 },     // dónde aparece el jugador
  llenaVida: true,                   // al empezar el nivel la vida se llena
  titulo: { mision: 'MISIÓN 2', nombre: 'POTOSÍ', sub: 'LA VILLA IMPERIAL · CERRO RICO' },
  fondo: 0x9cc4e0,
  bruma: true,
  dia: true,             // de día: faroles apagados (sin luz ni titileo)
  // Tramos del nivel: clave, archivo y x del borde izquierdo.
  tramos: [
    { clave: 'potosiCalle1', archivo: 'calle_1.png', x: 0 },
    { clave: 'potosiCalle2', archivo: 'calle_2.png', x: 2064 },
    { clave: 'potosiMoneda', archivo: 'moneda.png', x: 4128, tinte: 0xfff2e2 } // un poco más cálida, como las calles
  ],
  // Parallax (fijo a la cámara). y: borde de arriba. El Cerro Rico no se
  // repite: va de a poco de la derecha hacia el medio (x: centro en pantalla
  // al empezar). Techos y campanario solo se ven entre las casas.
  parallax: [
    { clave: 'potosiCielo', archivo: 'cielo.png', factor: 0.05, y: 0 },
    { clave: 'potosiCerros', archivo: 'cerros.png', factor: 0.1, y: 58 },
    { clave: 'potosiCerroRico', archivo: 'cerro_rico.png', factor: 0.15, y: 22, x: 860, solo: true },
    { clave: 'potosiCiudad', archivo: 'ciudad.png', factor: 0.4, y: 74 },
    { clave: 'potosiTechos', archivo: 'techos.png', factor: 0.55, y: 96 },
    { clave: 'potosiCampanario', archivo: 'campanario.png', factor: 0.7, y: 70 }
  ],
  // Zonas: hasta dónde llega la cámara (scrollX) mientras queden enemigos.
  // campanas: al llegar tocan a rebato. cartel: se anuncia al llegar.
  zonas: [
    { limite: 250 }, { limite: 1150 }, { limite: 2100 }, { limite: 3050, campanas: true },
    { limite: 3704, final: true, cartel: 'CASA DE LA MONEDA' }
  ],
  // Puertas y ventanas que se abren (rectángulos del dibujo en el mundo). Las
  // hojas se recortan del mismo tramo: abiertas, se ve el interior oscuro.
  // (Con { r, obj } va el objeto suelto: puerta → puerta_rota, ventana → abierta.)
  aberturas: {
    a1: [318, 392, 378, 487], a2: [568, 394, 632, 487], a3: [935, 402, 990, 487],
    a4: [1210, 392, 1270, 487], a6: [1803, 387, 1865, 487],
    b1: [2124, 385, 2184, 490], b2: [2469, 380, 2534, 490], b3: [3509, 400, 3574, 490],
    b4: [3636, 400, 3699, 490], b5: [3779, 400, 3844, 490],
    m1: [4193, 425, 4228, 490], m2: [4628, 425, 4658, 490],
    // Ventanas de los balcones.
    va1: [260, 257, 300, 302], va3: [820, 262, 860, 302], va4: [1165, 257, 1200, 302],
    vp: [1805, 257, 1850, 302], vb1: [2264, 260, 2304, 302], vb2: [3031, 260, 3069, 302],
    vb3: [3956, 262, 3994, 307], vm: [4413, 255, 4448, 295]
  },
  // Enemigos: tipo (soldado: Soldados.js; garrotero: Garroteros.js), x, zona
  // y desde qué y buscar el piso. sale: la puerta o ventana por la que salen
  // ('aparece': sin puerta, entran de golpe); aparecen al trabarse la cámara
  // en su zona, `retraso` ms después. torre: quieto en su lugar (francotirador).
  enemigos: [
    { tipo: 'garrotero', x: 600, zona: 0, sale: 'a2', retraso: 300 },
    { tipo: 'soldado', x: 962, zona: 0, sale: 'a3', retraso: 1400 },
    { tipo: 'soldado', x: 840, zona: 0, desde: 300, sale: 'va3', retraso: 800, torre: true },
    { tipo: 'soldado', x: 1150, zona: 0, desde: 150, torre: true },
    { tipo: 'soldado', x: 1240, zona: 1, sale: 'a4', retraso: 200 },
    { tipo: 'garrotero', x: 1834, zona: 1, sale: 'a6', retraso: 900 },
    { tipo: 'garrotero', x: 1560, zona: 1 },
    { tipo: 'soldado', x: 1440, zona: 1, desde: 140, torre: true },
    { tipo: 'soldado', x: 1182, zona: 1, desde: 300, sale: 'va4', retraso: 600, torre: true },
    { tipo: 'soldado', x: 1828, zona: 1, desde: 300, sale: 'vp', retraso: 1800, torre: true },
    { tipo: 'garrotero', x: 2154, zona: 2, sale: 'b1', retraso: 300 },
    { tipo: 'soldado', x: 2501, zona: 2, sale: 'b2', retraso: 1200 },
    { tipo: 'soldado', x: 2284, zona: 2, desde: 300, sale: 'vb1', retraso: 700, torre: true },
    { tipo: 'soldado', x: 2600, zona: 2, desde: 140, torre: true },
    { tipo: 'garrotero', x: 2900, zona: 2 },
    { tipo: 'soldado', x: 3050, zona: 2, desde: 300, sale: 'vb2', retraso: 1500, torre: true },
    { tipo: 'soldado', x: 3168, zona: 3, desde: 160, torre: true },
    { tipo: 'soldado', x: 3421, zona: 3, desde: 160, torre: true },
    { tipo: 'garrotero', x: 3541, zona: 3, sale: 'b3', retraso: 300 },
    { tipo: 'soldado', x: 3667, zona: 3, sale: 'b4', retraso: 1000 },
    { tipo: 'garrotero', x: 3811, zona: 3, sale: 'b5', retraso: 1800 },
    { tipo: 'soldado', x: 3750, zona: 3, desde: 140 },
    { tipo: 'soldado', x: 3975, zona: 3, desde: 300, sale: 'vb3', retraso: 1200, torre: true },
    { tipo: 'soldado', x: 4650, zona: 4, desde: 140, torre: true },
    { tipo: 'soldado', x: 4430, zona: 4, desde: 300, sale: 'vm', retraso: 900, torre: true },
    { tipo: 'soldado', x: 4240, zona: 4, desde: 150, torre: true },
    { tipo: 'garrotero', x: 4211, zona: 4, sale: 'm1', retraso: 400 },
    { tipo: 'garrotero', x: 4643, zona: 4, sale: 'm2', retraso: 1600 }
  ],
  // Rehenes: el de arriba, escondido detrás del tanque de agua de la azotea
  // (tapa: el pedazo del dibujo que se pone delante); el otro en la calle.
  rehenes: [
    { x: 2722, desde: 150, tapa: [2686, 100, 2748, 190] },
    { x: 2380 }
  ],
  // Rompibles: carretas (se rompen y a veces sueltan algo), cajas de arma
  // (siempre un arma), turriles (explotan) y barricadas de sacos (sólidas: se
  // saltan o se rompen). obj: qué dibujo usa (la variante 2 de obejtos3).
  rompibles: [
    { tipo: 'carreta', x: 1400 }, { tipo: 'barricada', x: 1990 }, { tipo: 'caja', x: 1500, desde: 150 },
    { tipo: 'carreta', x: 2990, obj: 'carreta2' }, { tipo: 'barricada', x: 3300, obj: 'sacos2' }, { tipo: 'carreta', x: 4020 },
    // Turriles rojos (explotan con su animación) y otra barricada de sacos.
    { tipo: 'turril', x: 1180, obj: 'turril_rojo' }, { tipo: 'turril', x: 3740, obj: 'turril_rojo' },
    { tipo: 'barricada', x: 2660, obj: 'sacos_verdes' }
  ],
  vida: { carreta: 4, caja: 3, barricada: 12, turril: 2 },
  hundido: 3,                // los objetos se apoyan 2-3 px hundidos en el piso
  // Adornos: obj y x (apoyado en el piso, con sombra) o con y (colgado de la
  // pared: luz para los faroles, se mece para los letreros).
  decor: [
    { obj: 'puesto', x: 2330 }, { obj: 'puesto2', x: 3960 },
    { obj: 'farol', x: 470, y: 372, luz: true }, { obj: 'farol2', x: 1620, y: 372, luz: true },
    { obj: 'farol', x: 2560, y: 372, luz: true }, { obj: 'farol2', x: 3480, y: 362, luz: true },
    { obj: 'farol', x: 4300, y: 360, luz: true },
    { obj: 'letrero', x: 2700, y: 358, mece: true }, { obj: 'letrero2', x: 1030, y: 340, mece: true },
    // objetos_potosi.jpeg: escombros, turriles viejos y el botín de la banda
    // (frente a la Casa de la Moneda, con los lingotes a la vista).
    { obj: 'escombros_carreta', x: 2780 }, { obj: 'turril_viejo', x: 940 }, { obj: 'turril_viejo2', x: 2560 },
    { obj: 'caja_botin_abierta', x: 4280 }, { obj: 'caja_botin', x: 4535 }
  ],
  // Objetos animados (HOJAS_OBJETOS_POTOSI), apoyados en el piso de x (o en
  // el techo: desde = una y por encima de él). farol_calle: el farol de la
  // calle (titila; apagado: el cuadro apagado). bandera y reflector en los
  // techos; la pileta en la calle.
  animados: [
    { hoja: 'farol_calle', x: 140 }, { hoja: 'farol_calle', x: 1290 }, { hoja: 'farol_calle', x: 2430, apagado: true },
    { hoja: 'farol_calle', x: 2620 }, { hoja: 'farol_calle', x: 3870 },
    { hoja: 'bandera', x: 600, desde: 100 }, { hoja: 'bandera', x: 2300, desde: 100 }, { hoja: 'bandera', x: 3240 },
    { hoja: 'reflector', x: 1130, desde: 120 }, { hoja: 'reflector', x: 3640, desde: 120, espejo: true },
    { hoja: 'pileta', x: 1570, bajar: 16 }
  ],
  // Palomas comiendo en la calle: [x, cuántas]. Se van volando si el jugador se acerca.
  palomasSuelo: [[700, 3], [2210, 2], [3560, 3]],
  // Barandas de los balcones (crearBarandas): pisos one-way con la y entre
  // desde y hasta (px del PNG); se tapa `alto` px por encima y `abajo` por
  // debajo. profundidad: delante de los enemigos (9.6), detrás del jugador (10).
  barandas: { desde: 300, hasta: 440, alto: 40, abajo: 6, profundidad: 9.65 },
  // Escaleras de madera sueltas (su colisión está en el JSON: ladders).
  escaleras: [{ obj: 'escalera', x: 1920, arriba: 344, abajo: 500 }, { obj: 'escalera2', x: 4350, arriba: 328, abajo: 500 }],
  // animada: la de objetos_potosi.jpeg (pasta caminando en el lugar y huye
  // corriendo con su animación; mira a la derecha).
  llamas: [{ obj: 'llama', x: 1700 }, { x: 3440, animada: true }],
  llama: { cercania: 300, velocidad: 260 },
  // Palomas posadas en los techos: vuelan en bandada si el jugador se acerca.
  palomas: [[260, 158], [880, 168], [1450, 158], [2250, 160], [2950, 164], [3700, 163], [4240, 166]],
  bandadas: true, condor: true,
  // Humo de las chimeneas.
  humo: [[318, 124], [930, 120], [1225, 130], [2357, 128], [2619, 102], [3672, 128], [4036, 132]],
  // Campanas de los campanarios de la iglesia.
  campanas: [[3170, 150], [3420, 150]],
  tejas: { aviso: 450 },     // ms que cruje antes de caerse
  premios: { platano: 0.4, armas: ['ak47', 'ametralladora', 'escopeta', 'lanzacohetes', 'lanzagranadas', 'lanzallamas'] },
  camara: { lerp: 0.08, adelante: 0.4 },
  // La puerta de la Casa de la Moneda (rectángulo del dibujo) y por dónde se entra.
  puertaMoneda: [4390, 367, 4468, 480]
};

// Escala de las casas (POTOSI.escalaCasas): de px de los PNG a px del mundo,
// agrandando desde la vereda (la y del piso no cambia).
// Enemigos de a pie entre la vereda y la calle (seguirCalleEnemigos): ms
// hasta el primer cambio y entre cambios, a qué distancia siguen al jugador
// al otro nivel y la probabilidad por cuadro de cambiar solos patrullando.
const CALLE_ENEMIGOS = { primera: [600, 1400], pausa: [2500, 4500], distancia: 520, alAzar: 0.0015 };

function escalaPotosi(K, piso) {
  return { X: (x) => x * K, Y: (y) => piso - (piso - y) * K };
}

// La configuración de la escena en px del mundo. Quedan en px de los PNG las
// aberturas y las tapas: se recortan del dibujo (crearAberturas, crearRehenes).
function escalarPotosi(c, K, anchoPantalla) {
  const { X, Y } = escalaPotosi(K, c.piso);
  const conDesde = (o) => ({ ...o, x: X(o.x), ...(o.desde !== undefined ? { desde: Y(o.desde) } : {}) });
  const punto = ([x, y]) => [X(x), Y(y)];
  const ancho = Math.round(c.ancho * K);
  const [px0, py0, px1, py1] = c.puertaMoneda;
  return {
    ...c,
    ancho,
    inicio: conDesde(c.inicio),
    // El tope de la cámara de cada zona: lo mismo en el centro de la pantalla
    // (la última zona, hasta el final).
    zonas: c.zonas.map((z) => ({
      ...z,
      limite: z.limite >= c.ancho - anchoPantalla ? ancho - anchoPantalla : Math.round((z.limite + anchoPantalla / 2) * K - anchoPantalla / 2)
    })),
    enemigos: c.enemigos.map(conDesde),
    rehenes: c.rehenes.map(conDesde),
    rompibles: c.rompibles.map(conDesde),
    llamas: c.llamas.map(conDesde),
    animados: (c.animados || []).map(conDesde),
    decor: c.decor.map((d) => ({ ...conDesde(d), ...(d.y !== undefined ? { y: Y(d.y) } : {}) })),
    escaleras: c.escaleras.map((e) => ({ ...e, x: X(e.x), arriba: Y(e.arriba), abajo: Y(e.abajo) })),
    palomasSuelo: (c.palomasSuelo || []).map(([x, n]) => [X(x), n]),
    palomas: c.palomas.map(punto),
    // (Subida: la bocamina y el piso por defecto; Patio y Subida: los lingotes.)
    ...(c.boca ? { boca: c.boca.map(X) } : {}),
    ...(c.desde !== undefined ? { desde: Y(c.desde) } : {}),
    lingotes: (c.lingotes || []).map(punto),
    humo: c.humo.map(punto),
    campanas: c.campanas.map(punto),
    puertaMoneda: [X(px0), Y(py0), X(px1), Y(py1)]
  };
}

// La colisión (JSON) en px del mundo, o de vuelta a px de los PNG (inversa:
// para guardar lo editado con la tecla E).
function escalarColisionPotosi(d, K, piso, inversa = false) {
  const k = inversa ? 1 / K : K;
  const X = (x) => Math.round(x * k);
  const Y = (y) => Math.round(piso - (piso - y) * k);
  return {
    ...d,
    ancho: X(d.ancho),
    ground: d.ground.map((g) => ({ ...g, x0: X(g.x0), y0: Y(g.y0), x1: X(g.x1), y1: Y(g.y1) })),
    platforms: d.platforms.map((p) => ({ ...p, x0: X(p.x0), x1: X(p.x1), y: Y(p.y) })),
    tejas: (d.tejas || []).map((t) => ({ ...t, x0: X(t.x0), x1: X(t.x1), y: Y(t.y) })),
    walls: d.walls.map((w) => ({ ...w, x: X(w.x), y: Y(w.y), w: Math.round(w.w * k), h: Math.round(w.h * k) })),
    ladders: d.ladders.map((l) => ({ ...l, x0: X(l.x0), x1: X(l.x1), arriba: Y(l.arriba), abajo: Y(l.abajo) }))
  };
}

class Nivel2 extends Cueva {
  constructor(clave = 'Nivel2', cfg = POTOSI) {
    super(clave);
    this.cfg = cfg;
  }

  preload() {
    // Lo que carga Nivel1 (jugador, enemigos, rehenes, cajas, sonidos...).
    if (!this.textures.exists('enemigo2')) Nivel1.prototype.preload.call(this);
    cargarSfxArmas(this);
    cargarAves(this); // texturasCueva arma las animaciones de las aves
    const C = this.cfg;
    const r = POTOSI.ruta;
    const imagen = (clave, archivo, ruta = r) => { if (!this.textures.exists(clave)) this.load.image(clave, ruta + archivo); };
    // Las escenas con sus imágenes en otra carpeta (Tuneles) la dicen en cfg.ruta.
    [...C.tramos, ...C.parallax].forEach((t) => imagen(t.clave, t.archivo, C.ruta || r));
    OBJETOS_POTOSI.forEach((n) => {
      imagen('potosi_' + n, `obj_${n}.png`);
      imagen(`potosi_${n}2`, `obj_${n}2.png`);
    });
    OBJETOS_POTOSI_SUELTOS.forEach((n) => imagen('potosi_' + n, `obj_${n}.png`));
    Object.entries(HOJAS_OBJETOS_POTOSI).forEach(([n, [ancho, alto]]) => {
      if (!this.textures.exists('potosiHoja_' + n)) this.load.spritesheet('potosiHoja_' + n, `${r}hoja_${n}.png`, { frameWidth: ancho, frameHeight: alto });
    });
    [1, 2, 3].forEach((i) => imagen('potosiViento' + i, `viento_${i}.png`));
    HOJAS_POTOSI.forEach((h) => {
      if (!this.textures.exists(h.clave)) this.load.spritesheet(h.clave, r + h.archivo, { frameWidth: h.ancho, frameHeight: h.alto });
    });
    if (!this.cache.json.exists(C.colision.clave)) this.load.json(C.colision.clave, (C.ruta || r) + C.colision.archivo);
  }

  create() {
    const { width, height } = this.scale;
    // Escala de las casas (solo las calles: escalaCasas). this.X / this.Y
    // pasan px de los PNG a px del mundo.
    if (!this.cfgBase) this.cfgBase = this.cfg;
    this.K = this.cfgBase.escalaCasas || 1;
    const piso = this.cfgBase.piso || 500;
    ({ X: this.X, Y: this.Y } = escalaPotosi(this.K, piso));
    this.cfg = this.K === 1 ? this.cfgBase : escalarPotosi(this.cfgBase, this.K, width);
    const C = this.cfg;
    const colision = this.cache.json.get(C.colision.clave);
    if (!colision.tejas) colision.tejas = [];
    this.colisionBase = colision; // en px de los PNG (barandas)
    this.colision = this.K === 1 ? colision : escalarColisionPotosi(colision, this.K, piso);
    this.archivoColision = C.colision.archivo;
    this.coloresEditor = { ...EDITOR.colores, tejas: 0xff8a3a };
    this.estado = 'entrada';
    this.solidos = null;
    this.tejas = null; // (al reiniciar, los grupos de la vez anterior ya no existen)
    this.jefe = null;
    this.jefeIniciado = false;
    this.jefeVencido = false;
    this.editor = null;
    this.camaraMinima = 0;
    this.puertaRota = false;
    this.rnd = new Phaser.Math.RandomDataGenerator([String(Date.now())]);
    // Arrancando suelto (index.html?escena=Nivel2) no hay partida.
    if (this.registry.get('vidas') === undefined) nuevaPartida(this.registry);
    // Al empezar el nivel (no al reaparecer) la vida se llena.
    if (C.llenaVida && !this.registry.get('reaparecer')) this.registry.set('vida', VIDA.mitades);
    // Al morir se reinicia la escena: los rehenes cuentan desde la entrada.
    this.claveBase = this.scene.key + 'Base';
    const base = this.registry.get(this.claveBase) || { rehenes: this.registry.get('rehenes') || 0 };
    this.registry.set(this.claveBase, base);
    this.registry.set('rehenes', base.rehenes);
    this.rescatados = 0;

    texturasEfectos(this);
    texturasCueva(this); // astillas, plátano, turril...
    texturasPotosi(this);
    this.animacionesPotosi();
    this.physics.world.setBounds(0, -200, C.ancho, height + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.guacharos = this.physics.add.group(); // (la Cueva los cuenta: acá no hay)

    this.crearFondo();
    this.crearColision();
    this.crearAberturas();
    this.crearJugador();
    this.crearRompibles();
    this.crearEnemigos();
    this.crearBarandas();
    this.crearRehenes();
    this.crearAdornos();
    this.crearLlamas();
    this.crearPalomas();
    this.crearLingotes();
    this.crearAmbiente();
    this.crearExtras();
    this.crearHUD();
    this.crearEditor();
    this.ayudaEditor.setText('EDITOR  ARRASTRA PUNTOS · G P W L T AGREGAR · SUPR BORRAR · S GUARDAR · E SALIR');

    this.teclas = this.input.keyboard.createCursorKeys();
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,S,SPACE,J,X,TAB');
    this.input.keyboard.resetKeys();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, C.ancho, height).setBackgroundColor(C.fondo);
    cam.scrollX = 0;
    this.zona = 0;
    this.zonaEstado = 'camino';
    this.pendientes = C.zonas.map(() => 0);
    cam.fadeIn(600, 0, 0, 0);
    tocarMusica(this, 'nivel1');
    this.titulo(width);
  }

  // Lo propio de cada escena (Patio: el jefe y la prensa).
  crearExtras() {}
  actualizarExtras() {}

  titulo(width) {
    const T = this.cfg.titulo;
    const reaparece = this.reapareciendo;
    if (!reaparece && T.mision) comienzaMision(this, T.mision); // Estado.js
    this.time.delayedCall(reaparece || !T.mision ? 200 : 2600, () => {
      const nombre = TextFX.letras(this, width / 2, 120, T.nombre, {
        escala: T.escala || 4, cada: 60, fijo: true, profundidad: 32,
        alTerminar: () => {
          const sub = TextFX.texto(this, width / 2, 168, T.sub, { color: 'plata', escala: 1 })
            .setScrollFactor(0).setDepth(32).setAlpha(0);
          this.tweens.add({ targets: sub, alpha: 1, duration: 300 });
          this.time.delayedCall(1600, () => {
            nombre.salir(400);
            this.tweens.add({ targets: sub, alpha: 0, duration: 400, onComplete: () => sub.destroy() });
          });
        }
      });
    });
    // Entra caminando desde la izquierda.
    const j = this.jugador;
    j.setFlipX(false).setVelocityX(JUGADOR.velocidad * 0.7);
    if (this.anims.exists('jugador_caminar')) j.play('jugador_caminar');
    this.time.delayedCall(700, () => {
      if (this.estado !== 'entrada') return;
      this.estado = 'control';
      j.setVelocityX(0);
    });
  }

  animacionesPotosi() {
    const anim = (key, clave, frameRate, repeat = -1, frames = [0, 1, 2, 3]) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(clave, { frames }), frameRate, repeat });
    };
    anim('condor_vuela', 'potosiCondor', 3);
    anim('palomas_vuelan', 'potosiPalomas', 10);
    anim('humo_sube', 'potosiHumo', 4, 0);
    anim('campana_toca', 'potosiCampana', 8, 3, [0, 1, 2, 1, 0, 3, 0]);
    // objetos_potosi.jpeg
    anim('potosi_bandera', 'potosiHoja_bandera', 6, -1, [0, 1, 2, 1]);
    anim('potosi_reflector', 'potosiHoja_reflector', 3, -1, [0, 1, 2, 3, 2, 1]);
    anim('potosi_palomas_comen', 'potosiHoja_palomas_comen', 5, -1, [0, 1, 2, 1, 0, 0]);
    anim('potosi_palomas_vuelan', 'potosiHoja_palomas_vuelan', 12, -1, [0, 1, 2, 1]);
    anim('potosi_pileta', 'potosiHoja_pileta', 6, -1, [0, 1, 2, 3]);
    anim('potosi_llama_anda', 'potosiHoja_llama_anda', 4, -1, [0, 1, 2, 3]);
    anim('potosi_llama_corre', 'potosiHoja_llama_corre', 11, -1, [0, 1, 2]);
    anim('potosi_turril_explota', 'potosiHoja_turril_explota', 14, 0, [1, 2, 3, 4, 5]);
  }

  // ---------------------------------------------------------------------------
  // Fondo: parallax de la intro y los tramos
  // ---------------------------------------------------------------------------

  crearFondo() {
    const { width } = this.scale;
    this.capas = this.cfg.parallax.map((c, i) => {
      const img = this.textures.get(c.clave).getSourceImage();
      const capa = c.solo
        ? this.add.image(c.x, c.y, c.clave).setOrigin(0.5, 0)
        : this.add.tileSprite(0, c.y, width, img.height, c.clave).setOrigin(0);
      if (c.tinte) capa.setTint(c.tinte);
      if (c.alfa !== undefined) capa.setAlpha(c.alfa);
      // profundidad: una capa delante del jugador (el primer plano de la mina).
      return capa.setScrollFactor(0).setDepth(c.profundidad ?? i * 0.06).setData({ factor: c.factor, x: c.x, solo: !!c.solo });
    });
    // Tierra debajo del parallax (sueloFondo: { y, color }): que entre las
    // capas y el nivel nunca se vea el color de fondo de la cámara.
    if (this.cfg.sueloFondo) {
      const { y, color } = this.cfg.sueloFondo;
      this.add.rectangle(0, y, width, this.scale.height - y, color).setOrigin(0).setScrollFactor(0).setDepth(this.capas.length * 0.06);
    }
    // Neblina de altura entre la ciudad y las casas (Potosí está a 4000 m).
    if (this.cfg.bruma) {
      const bruma = this.add.graphics().setScrollFactor(0).setDepth(0.45);
      for (let i = 0; i < 16; i++) {
        bruma.fillStyle(0xdce8f0, 0.02 + i * 0.012);
        bruma.fillRect(0, 120 + i * 6, width, 6);
      }
    }
    this.cfg.tramos.forEach((t) => {
      // '__BASE': la imagen entera. (Al reiniciar la escena la textura ya tiene
      // los cuadros que se le agregan (puertas, prensa) y el cuadro por
      // defecto pasa a ser uno de ellos: el tramo se dibujaba recortado.)
      const img = this.add.image(this.X(t.x), this.Y(0), t.clave, '__BASE').setOrigin(0).setScale(this.K).setDepth(1);
      if (t.tinte) img.setTint(t.tinte);
    });
  }

  moverFondo() {
    const x = this.cameras.main.scrollX;
    this.capas.forEach((c) => {
      if (c.getData('solo')) c.x = Math.round(c.getData('x') - x * c.getData('factor'));
      else c.tilePositionX = x * c.getData('factor');
    });
  }

  // Polvo en el aire, cóndor, bandadas, viento, humo, campanas y la viñeta.
  crearAmbiente() {
    const C = this.cfg;
    const { width, height } = this.scale;
    this.add.particles(0, 0, 'fx_chispa', {
      x: { min: 0, max: width }, y: { min: 60, max: height - 80 },
      speedX: { min: 6, max: 24 }, speedY: { min: -4, max: 4 },
      lifespan: { min: 3000, max: 6000 }, scale: { min: 0.5, max: 1 },
      alpha: { start: 0, end: 0.3, ease: (t) => Math.sin(t * Math.PI) },
      tint: 0xe8d8b0, frequency: 260, maxAliveParticles: 20
    }).setScrollFactor(0).setDepth(6);
    const cada = (fn, min, max, primero) => {
      const vuelta = () => { fn(); this.time.delayedCall(Phaser.Math.Between(min, max), vuelta); };
      this.time.delayedCall(primero, vuelta);
    };
    if (C.condor) cada(() => this.cruzarCondor(), 12000, 20000, 4000);
    if (C.bandadas) cada(() => this.cruzarBandada(), 9000, 15000, 7000);
    if (C.viento) cada(() => this.rafagaViento(), 900, 2200, 500);
    (C.humo || []).forEach(([x, y], i) => {
      const humo = () => {
        const h = this.add.sprite(x, y, 'potosiHumo', 0).setOrigin(0.5, 1).setDepth(1.15).setAlpha(0.65).setScale(0.8);
        h.play('humo_sube');
        this.tweens.add({ targets: h, y: y - 40, x: x + 12, alpha: 0, scale: 1.3, duration: 1500, onComplete: () => h.destroy() });
      };
      this.time.addEvent({ delay: 650, loop: true, startAt: (i * 200) % 650, callback: humo });
    });
    this.campanas = (C.campanas || []).map(([x, y]) => this.add.sprite(x, y, 'potosiCampana', 0).setScale(this.K).setDepth(1.12));
    this.add.image(0, 0, 'fx_vineta').setOrigin(0).setDisplaySize(width, height).setScrollFactor(0).setDepth(19).setAlpha(0.45);
  }

  cruzarCondor() {
    if (this.estado === 'editor') return;
    const { width } = this.scale;
    const izquierda = Math.random() < 0.5;
    const y = Phaser.Math.Between(30, 90);
    const c = this.add.sprite(izquierda ? -80 : width + 80, y, 'potosiCondor', 0).setScrollFactor(0).setDepth(0.35)
      .setScale(Phaser.Math.FloatBetween(0.5, 0.8)).setFlipX(izquierda).setAlpha(0.9);
    c.play('condor_vuela');
    this.tweens.add({
      targets: c, x: izquierda ? width + 80 : -80, y: y + Phaser.Math.Between(-25, 25),
      duration: Phaser.Math.Between(14000, 19000), ease: 'Sine.inOut', onComplete: () => c.destroy()
    });
  }

  // Una bandada de palomas lejos, por el cielo.
  cruzarBandada() {
    if (this.estado === 'editor') return;
    const { width } = this.scale;
    const izquierda = Math.random() < 0.5;
    const y = Phaser.Math.Between(40, 120);
    const b = this.add.sprite(izquierda ? -60 : width + 60, y, 'potosiPalomas', 0).setScrollFactor(0).setDepth(0.4)
      .setScale(0.5).setFlipX(!izquierda).setAlpha(0.8).setTint(0xb8c0c8);
    b.play('palomas_vuelan');
    this.tweens.add({ targets: b, x: izquierda ? width + 60 : -60, y: y - 30, duration: 9000, onComplete: () => b.destroy() });
  }

  // Rayas de viento de altura que cruzan la pantalla.
  rafagaViento() {
    if (this.estado === 'editor') return;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(40, height - 120);
    const v = this.add.image(width + 200, y, 'potosiViento' + Phaser.Math.Between(1, 3)).setScrollFactor(0).setDepth(14)
      .setAlpha(0).setScale(Phaser.Math.FloatBetween(0.8, 1.4), 1);
    this.tweens.add({ targets: v, alpha: 0.55, duration: 250, yoyo: true, hold: 500 });
    this.tweens.add({ targets: v, x: -200, duration: 1100, onComplete: () => v.destroy() });
  }

  // Las campanas de la iglesia tocan a rebato.
  tocarCampanas() {
    this.campanas.forEach((c, i) => this.time.delayedCall(i * 250, () => {
      c.play('campana_toca');
      this.aviso(c.x, c.y - 40, '¡DONG!', 'oro');
    }));
  }

  // Adornos: apoyados en el piso (con sombra) o colgados de la pared.
  crearAdornos() {
    (this.cfg.decor || []).forEach((d) => {
      const clave = 'potosi_' + d.obj;
      if (d.y === undefined) {
        const o = this.apoyar(this.add.image(d.x, 0, clave), d.x, d.profundidad || 8.2, d.desde);
        if (d.escala) o.setScale(d.escala);
        if (d.espejo) o.setFlipX(true);
        return;
      }
      const o = this.add.image(d.x, d.y, clave).setDepth(d.profundidad || 1.2).setFlipX(!!d.espejo);
      if (d.luz && this.cfg.dia) {
        o.setOrigin(0, 0.5).setTint(0xb8b0a4); // de día: apagado (el vidrio sin brillo)
      } else if (d.luz) {
        o.setOrigin(0, 0.5);
        const luz = this.add.image(d.x + o.width * 0.72, d.y - 4, 'fx_chispa').setScale(5).setTint(0xffc860).setAlpha(0.35)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth + 0.01);
        this.tweens.add({ targets: luz, alpha: 0.15, duration: Phaser.Math.Between(300, 700), yoyo: true, repeat: -1 });
      } else if (d.mece) {
        o.setOrigin(0.1, 0.1);
        this.tweens.add({ targets: o, angle: { from: -2, to: 2 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
    // Objetos animados (objetos_potosi.jpeg).
    (this.cfg.animados || []).forEach((d) => {
      if (d.hoja === 'farol_calle') {
        // El farol colonial de la calle, dibujado (texturaFarol): más alto y nítido.
        texturaFarol(this);
        const o = this.apoyar(this.add.image(d.x, 0, 'potosi_farolAlto', this.cfg.dia || d.apagado ? 'apagado' : 'prendido'),
          d.x, d.profundidad || 9.7, d.desde); // (en la vereda: delante de las barandas de los balcones)
        o.getData('sombra').setScale(0.6, 1);
        if (!this.cfg.dia) this.farolCalle(o, d.apagado);
        return;
      }
      const o = this.apoyar(this.add.sprite(d.x, 0, 'potosiHoja_' + d.hoja, 0), d.x, d.profundidad || 8.2, d.desde);
      o.setFlipX(!!d.espejo);
      // bajar: px más abajo que el piso (la pileta, redonda, se apoya bien
      // adelante en la acera; en la línea del piso parecía flotar).
      if (d.bajar) { o.y += d.bajar; o.getData('sombra').y += d.bajar; }
      // Bandera y reflector: el poste o el trípode van a un costado de la
      // celda (la tela y el haz salen hacia el otro): la sombra, solo debajo de él.
      if (d.hoja === 'bandera' || d.hoja === 'reflector') {
        const lado = d.espejo ? 1 : -1;
        o.getData('sombra').setX(o.x + lado * (o.displayWidth / 2 - 22)).setScale(0.35, 1);
      }
      o.play({ key: 'potosi_' + d.hoja, startFrame: Phaser.Math.Between(0, 2) });
    });
    // Escaleras sueltas: la textura repetida a lo alto.
    // Se repite solo el medio (los peldaños); las puntas de arriba y abajo de
    // los largueros van una vez. (Repitiendo la imagen entera se veían
    // escaleritas chicas encimadas.)
    (this.cfg.escaleras || []).forEach(({ obj, x, arriba, abajo }) => {
      const clave = 'potosi_' + obj;
      const t = this.textures.get(clave);
      const { width: ancho, height: alto } = t.getSourceImage();
      // El medio va de un peldaño a otro (88 px: 8 peldaños): al repetirse,
      // las uniones caen sobre un peldaño y no se notan.
      const [punta, pie, medio] = [12, 6, 88];
      if (!t.has('medio')) {
        t.add('punta', 0, 0, 0, ancho, punta);
        t.add('medio', 0, 0, punta, ancho, Math.min(medio, alto - punta - pie));
        t.add('pie', 0, 0, alto - pie, ancho, pie);
      }
      const y0 = arriba - 6;
      const largo = abajo - arriba + 8;
      this.add.image(x, y0, clave, 'punta').setOrigin(0.5, 0).setDepth(1.3);
      this.add.tileSprite(x, y0 + punta, ancho, largo - punta - pie, clave, 'medio').setOrigin(0.5, 0).setDepth(1.3);
      this.add.image(x, y0 + largo - pie, clave, 'pie').setOrigin(0.5, 0).setDepth(1.3);
    });
  }

  // Farol de la calle: prendido con su resplandor, y cada tanto titila (falla
  // la luz). Apagado: el cuadro apagado, sin luz.
  farolCalle(o, apagado) {
    if (apagado) { o.setFrame('apagado'); return; }
    const luz = this.add.image(o.x, o.y - o.displayHeight + 30, 'fx_chispa').setScale(7).setTint(0xffd070).setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth + 0.01);
    this.tweens.add({ targets: luz, alpha: 0.25, duration: Phaser.Math.Between(500, 900), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const titilar = () => {
      if (!o.active) return;
      const veces = Phaser.Math.Between(2, 4);
      for (let k = 0; k < veces * 2; k++) {
        this.time.delayedCall(k * 70, () => {
          if (!o.active) return;
          const prendido = k % 2 === 1;
          o.setFrame(prendido ? 'prendido' : 'apagado');
          luz.setVisible(prendido);
        });
      }
      this.time.delayedCall(Phaser.Math.Between(3000, 7000), titilar);
    };
    this.time.delayedCall(Phaser.Math.Between(1000, 5000), titilar);
  }

  // Pone un objeto parado en el piso de x (2-3 px hundido) con sombra de contacto.
  apoyar(obj, x, profundidad, desde = this.cfg.desde || 470) {
    const y = this.superficie(x, desde).y + this.cfg.hundido;
    obj.setPosition(x, y).setOrigin(0.5, 1).setDepth(profundidad);
    const sombra = this.add.ellipse(x, y - 2, obj.displayWidth * 1.05, 8, 0x000000, 0.45).setDepth(profundidad - 0.05);
    obj.setData('sombra', sombra);
    return obj;
  }

  // ---------------------------------------------------------------------------
  // Colisión: lo de la Cueva más las tejas que se caen
  // ---------------------------------------------------------------------------

  crearColision() {
    super.crearColision();
    if (!this.tejas) this.tejas = this.physics.add.staticGroup();
    this.tejas.clear(true, true);
    this.colision.tejas.forEach((t) => {
      const zona = this.add.zone((t.x0 + t.x1) / 2, t.y + 6, t.x1 - t.x0, 12);
      this.tejas.add(zona);
      Object.assign(zona.body.checkCollision, { down: false, left: false, right: false });
      zona.setData({ tramo: t, estado: 'firme' });
    });
  }

  crearJugador() {
    super.crearJugador();
    // Donde empieza esta escena (la Cueva lo pone en su piso).
    const { x, desde } = this.cfg.inicio;
    const piso = this.superficie(x, desde).y;
    this.jugador.body.reset(x, piso - 30 * ESCALA);
    this.physics.add.collider(this.jugador, this.tejas,
      (j, t) => { this.sobrePlataformaEn = this.time.now; this.pisarTejas(t); }, (j, t) => this.puedePisar(j, t));
    this.barricadas = this.physics.add.staticGroup();
    // Las barricadas están en la vereda: por la calle de abajo se pasa por delante.
    this.physics.add.collider(this.jugador, this.barricadas, () => {
      if (this.jugador.body.touching.down) this.sobrePlataformaEn = this.time.now;
    }, (j, o) => j.body.bottom <= o.body.bottom + 6);
    // La vereda (piso con vereda: true en el JSON): un piso del que se baja a
    // la calle con ABAJO + SALTO (con ABAJO solo se agacha, como en el suelo).
    const vereda = this.colision.platforms.find((p) => p.vereda);
    this.yVereda = vereda ? vereda.y : null;
  }

  // Las tejas crujen (polvo y un temblor) y al rato se caen a la calle: queda
  // el hueco en el techo.
  pisarTejas(zona) {
    if (zona.getData('estado') !== 'firme') return;
    zona.setData('estado', 'cruje');
    const t = zona.getData('tramo');
    const polvo = (n) => {
      const p = this.add.particles(0, 0, 'fx_humo', {
        x: { min: t.x0, max: t.x1 }, y: t.y, speedY: { min: -30, max: 10 }, speedX: { min: -20, max: 20 },
        lifespan: 700, scale: { start: 1, end: 2.4 }, alpha: { start: 0.5, end: 0 }, tint: 0xb08060, emitting: false
      }).setDepth(11);
      p.explode(n);
      this.time.delayedCall(800, () => p.destroy());
    };
    polvo(6);
    this.aviso((t.x0 + t.x1) / 2, t.y - 30, '¡CRACK!', 'plata');
    this.cameras.main.shake(this.cfg.tejas.aviso, 0.002);
    this.time.delayedCall(this.cfg.tejas.aviso, () => {
      if (!zona.active) return;
      zona.setData('estado', 'caida');
      zona.body.enable = false;
      polvo(14);
      // El hueco: lo oscuro del entretecho con el borde de tejas rotas.
      const g = this.add.graphics().setDepth(1.05);
      g.fillStyle(0x1e120c, 1);
      for (let x = t.x0; x < t.x1; x += 6) {
        const arriba = t.y - 4 + ((x * 7) % 5);
        const abajo = t.y + 16 + ((x * 13) % 7);
        g.fillRect(x, arriba, 6, abajo - arriba);
      }
      g.fillStyle(0x8a3a22, 1);
      for (let x = t.x0; x < t.x1; x += 9) g.fillRect(x, t.y - 6 + ((x * 3) % 4), 5, 3);
      // Las tejas caen dando vueltas y quedan rotas en la calle.
      const piso = this.superficie((t.x0 + t.x1) / 2, t.y + 40).y;
      for (let k = 0; k < 3; k++) {
        const x = Phaser.Math.Linear(t.x0, t.x1, (k + 0.5) / 3);
        const clave = k % 2 ? 'potosi_tejas2' : 'potosi_tejas';
        const teja = this.add.image(x, t.y, clave).setScale(0.45).setDepth(10.8);
        this.tweens.add({
          targets: teja, y: piso - 6, angle: Phaser.Math.Between(-200, 200), duration: 520 + k * 90, ease: 'Quad.in',
          onComplete: () => {
            teja.destroy();
            if (k === 1) this.apoyar(this.add.image(x, 0, clave).setScale(0.8), x, 8.1, t.y + 40);
            chispas(this, x, piso - 6, 4, -90, 120, 11);
          }
        });
      }
    });
  }

  // Colisiones de lo que camina o cae: además, las barricadas son sólidas.
  // (Los enemigos que bajaron a la calle pasan por delante, como el jugador.)
  pisar(objetos) {
    super.pisar(objetos);
    if (this.barricadas) this.physics.add.collider(objetos, this.barricadas, null, (o, b) => o.body.bottom <= b.body.bottom + 6);
  }

  // Los pisos one-way: un enemigo que se está bajando de la vereda los atraviesa.
  puedePisar(personaje, tramo) {
    if (personaje !== this.jugador && personaje.getData && personaje.getData('bajaHasta') > this.time.now) return false;
    return super.puedePisar(personaje, tramo);
  }

  // ---------------------------------------------------------------------------
  // Puertas y ventanas. Las del dibujo: las hojas son recortes del mismo
  // tramo; al abrirse giran hacia afuera y se ve el interior oscuro. Las de
  // objeto suelto (obj): la puerta revienta (puerta_rota) y la ventana se abre.
  // ---------------------------------------------------------------------------

  // El tramo (textura) que tiene la x del mundo.
  tramoEn(x) {
    return [...this.cfg.tramos].reverse().find((tr) => x >= tr.x);
  }

  crearAberturas() {
    this.aberturas = {};
    Object.entries(this.cfg.aberturas || {}).forEach(([id, dato]) => {
      // En px del PNG (se recortan del dibujo); en el mundo, con this.X / this.Y.
      const [x0, y0, x1, y1] = Array.isArray(dato) ? dato : dato.r;
      const w = x1 - x0;
      const h = y1 - y0;
      const K = this.K;
      const hueco = this.add.rectangle(this.X(x0), this.Y(y0), w * K, h * K, 0x140c08).setOrigin(0).setDepth(1.05).setVisible(false);
      const a = { hueco, abierta: false, x: this.X((x0 + x1) / 2), y: this.Y(y1), hojas: [] };
      if (!Array.isArray(dato)) {
        a.obj = dato.obj;
        a.sprite = this.add.image(a.x, a.y, 'potosi_' + dato.obj).setOrigin(0.5, 1).setDisplaySize(w * K, h * K).setDepth(1.1);
      } else {
        const t = this.tramoEn(x0);
        const textura = this.textures.get(t.clave);
        const mitad = Math.floor(w / 2);
        a.hojas = [[0, mitad], [mitad, w - mitad]].map(([dx, ancho], lado) => {
          const cuadro = `hoja_${id}_${lado}`;
          if (!textura.has(cuadro)) textura.add(cuadro, 0, x0 - t.x + dx, y0, ancho, h);
          return this.add.image(this.X(lado ? x1 : x0), this.Y(y0), t.clave, cuadro).setOrigin(lado ? 1 : 0, 0).setScale(K).setDepth(1.1);
        });
      }
      this.aberturas[id] = a;
    });
  }

  abrir(id) {
    const a = this.aberturas[id];
    if (!a || a.abierta) return;
    a.abierta = true;
    a.hueco.setVisible(true);
    a.hojas.forEach((h) => {
      h.setTint(0xa89888);
      this.tweens.add({ targets: h, scaleX: h.scaleX * 0.22, duration: 260, ease: 'Back.out' });
    });
    if (a.sprite) {
      const { displayWidth: w, displayHeight: h } = a.sprite;
      if (a.obj.startsWith('puerta')) {
        // La puerta revienta de una patada.
        a.sprite.setTexture('potosi_' + a.obj.replace('puerta', 'puerta_rota')).setDisplaySize(w * 1.04, h * 1.04);
        this.astillas(a.x, a.y - h / 2, 10, 1);
        this.astillas(a.x, a.y - h / 2, 10, -1);
        this.cameras.main.shake(120, 0.004);
      } else {
        a.sprite.setTexture('potosi_' + a.obj.replace('ventana', 'ventana_abierta')).setDisplaySize(w, h);
      }
    }
    const p = this.add.particles(a.x, a.y - 10, 'fx_humo', {
      speedX: { min: -40, max: 40 }, speedY: { min: -30, max: 0 }, lifespan: 600,
      scale: { start: 1, end: 2.2 }, alpha: { start: 0.35, end: 0 }, tint: 0x9a8a70, emitting: false
    }).setDepth(11);
    p.explode(5);
    this.time.delayedCall(700, () => p.destroy());
  }

  // ---------------------------------------------------------------------------
  // Rompibles: carretas, cajas de arma, turriles y barricadas de sacos
  // ---------------------------------------------------------------------------

  crearRompibles() {
    const hoja = this.textures.get('cajaArmas');
    if (!hoja.has('cajaSola')) hoja.add('cajaSola', 0, 20, 45, 50, 29);
    animacionesCaja(this);
    (this.cfg.rompibles || []).forEach(({ tipo, x, desde = this.cfg.desde || 470, obj }) => {
      const y = this.superficie(x, desde).y + this.cfg.hundido;
      const grupo = tipo === 'barricada' ? this.barricadas : this.rompibles;
      let o;
      if (tipo === 'caja') o = grupo.create(x, y, 'cajaArmas', 'cajaSola').setScale(ESCALA * 0.8);
      else if (tipo === 'turril') o = obj ? grupo.create(x, y, 'potosi_' + obj) : grupo.create(x, y, 'cueva_turril').setScale(ESCALA * 1.25);
      else o = grupo.create(x, y, 'potosi_' + (obj || (tipo === 'carreta' ? 'carreta' : 'sacos')));
      o.setOrigin(0.5, 1).setDepth(8.5);
      o.refreshBody();
      if (tipo === 'carreta') o.body.setSize(o.displayWidth * 0.7, o.displayHeight * 0.55).setOffset(o.width * 0.15, o.height * 0.45);
      if (tipo !== 'barricada') Object.assign(o.body.checkCollision, { down: false, left: false, right: false });
      const sombra = this.add.ellipse(x, y - 2, o.displayWidth * 1.05, 8, 0x000000, 0.5).setDepth(8.4);
      o.setData({ tipo, vida: this.cfg.vida[tipo], sombra, encima: null });
    });
    const golpe = (bala, o) => {
      if (!bala.active || !o.active || this.impactoBala(bala)) return;
      const lado = bala.body.velocity.x >= 0 ? 1 : -1;
      const dano = bala.getData('dano') || 1;
      bala.destroy();
      this.danarRompible(o, dano, lado);
    };
    this.physics.add.overlap(this.balas, this.rompibles, golpe);
    this.physics.add.overlap(this.balas, this.barricadas, golpe);
  }

  danarRompible(o, dano, lado = 1) {
    if (!o.active || o.getData('roto')) return;
    o.setData('vida', o.getData('vida') - dano);
    o.setTintFill(0xffffff);
    this.time.delayedCall(50, () => o.active && o.clearTint());
    const tipo = o.getData('tipo');
    if (tipo === 'barricada' || tipo === 'turril') chispas(this, o.x - lado * 20, o.y - o.displayHeight / 2, 3, lado > 0 ? 180 : 0, 90, 11);
    else this.astillas(o.x - lado * 20, o.y - o.displayHeight / 2, 4, lado);
    if (o.getData('vida') <= 0) this.romper(o);
    else this.tweens.add({ targets: o, x: o.x + lado * 2, duration: 40, yoyo: true, repeat: 1 });
  }

  romper(o) {
    o.setData('roto', true);
    const tipo = o.getData('tipo');
    const x = o.x;
    const y = o.y - o.displayHeight / 2;
    if (tipo === 'turril') {
      // Revienta: explosión que lastima alrededor (como en la Cueva). El
      // turril rojo de objetos_potosi.jpeg con su propia animación.
      if (o.texture.key === 'potosi_turril_rojo') {
        const boom = this.add.sprite(x, o.y + 2, 'potosiHoja_turril_explota', 1).setOrigin(0.5, 1).setScale(1.6).setDepth(11);
        boom.play('potosi_turril_explota');
        boom.once('animationcomplete', () => boom.destroy());
        fogonazo(this, x, y, 3, 11);
      } else {
        explotar(this, x, o.y + 4, 'mediana', ESCALA * 1.1);
      }
      this.cameras.main.shake(200, 0.008);
      const j = this.jugador;
      if (Phaser.Math.Distance.Between(x, y, j.body.center.x, j.body.center.y) < CUEVA.turril.radio * 0.6) this.golpearJugador(x);
      o.getData('sombra').destroy();
      o.destroy();
      this.time.delayedCall(60, () => this.danoEnArea(x, y, CUEVA.turril.radio, CUEVA.turril.dano));
      return;
    }
    const polvo = this.add.particles(x, y, 'fx_humo', {
      speed: { min: 20, max: 80 }, lifespan: 800, scale: { start: 1.5, end: 3.5 },
      alpha: { start: 0.5, end: 0 }, tint: tipo === 'barricada' ? 0xc8b088 : 0xa89070, emitting: false
    }).setDepth(11);
    polvo.explode(tipo === 'barricada' ? 14 : 8);
    this.time.delayedCall(900, () => polvo.destroy());
    if (tipo === 'caja') {
      const rota = this.add.sprite(o.x, o.y, 'cajaArmas', 6).setOrigin(0.5, 1).setScale(ESCALA * 0.8).setDepth(8.5);
      rota.play('caja_rompe');
      rota.once('animationcomplete', () => this.tweens.add({ targets: rota, alpha: 0, delay: 1200, duration: 500, onComplete: () => rota.destroy() }));
    } else if (tipo === 'carreta') {
      // Las tablas vuelan y la rueda sale rodando.
      const rueda = this.add.circle(x + 30, o.y - 18, 16, 0x000000, 0).setStrokeStyle(4, 0x4a2e18).setDepth(8.6);
      this.tweens.add({ targets: rueda, x: x + 160, angle: 540, alpha: 0, duration: 1400, ease: 'Quad.out', onComplete: () => rueda.destroy() });
    } else {
      // Barricada: los sacos revientan y queda un montoncito bajo.
      const resto = this.add.image(x, o.y, o.texture.key).setOrigin(0.5, 1).setScale(1, 0.35).setTint(0x9a8a70).setDepth(8.3);
      this.tweens.add({ targets: resto, alpha: 0.85, duration: 200 });
    }
    this.astillas(x, y, 8, 1);
    this.astillas(x, y, 8, -1);
    o.getData('sombra').destroy();
    o.destroy();
    if (tipo === 'caja') this.soltarPremio(x, y, true);
    else if (tipo === 'carreta' && Math.random() < 0.5) this.soltarPremio(x, y);
  }

  // Un premio al azar (un arma o un plátano que cura). soloArma: la caja.
  soltarPremio(x, y, soloArma = false) {
    const guardado = CUEVA.premios;
    CUEVA.premios = soloArma ? { ...this.cfg.premios, platano: 0 } : this.cfg.premios;
    super.soltarPremio(x, y);
    CUEVA.premios = guardado;
  }

  danoEnArea(x, y, radio, dano, cuerpo = false) {
    super.danoEnArea(x, y, radio, dano, cuerpo);
    this.barricadas.getChildren().slice().forEach((o) => {
      if (!o.active) return;
      const cx = Phaser.Math.Clamp(x, o.body.left, o.body.right);
      const cy = Phaser.Math.Clamp(y, o.body.top, o.body.bottom);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) <= radio) this.danarRompible(o, dano * 2, o.x > x ? 1 : -1);
    });
  }

  // Lingotes de plata sueltos: puntos.
  crearLingotes() {
    this.lingotes = this.physics.add.staticGroup();
    (this.cfg.lingotes || []).forEach(([x, desde]) => {
      const l = this.lingotes.create(x, 0, 'potosi_lingote');
      this.apoyar(l, x, 8.6, desde);
      l.refreshBody();
      const brillo = this.add.image(x - 4, l.y - 6, 'fx_chispa').setScale(2).setTint(0xffffff)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(8.7);
      this.tweens.add({ targets: brillo, alpha: 0, scale: 0.5, duration: 600, yoyo: true, repeat: -1, repeatDelay: 900 });
      l.setData('brillo', brillo);
    });
    this.physics.add.overlap(this.jugador, this.lingotes, (j, l) => {
      if (!l.active) return;
      sumarPuntos(this, 500);
      TextFX.popup(this, l.x, l.y - 20, '¡PLATA! +500', { subir: 50 }).setDepth(20);
      sonidoUI(this, 'conteo');
      l.getData('brillo').destroy();
      l.getData('sombra').destroy();
      l.destroy();
    });
  }

  // ---------------------------------------------------------------------------
  // Enemigos: los de la calle salen por las puertas; los de arriba, por las
  // ventanas de los balcones o esperan en los techos y campanarios.
  // ---------------------------------------------------------------------------

  crearEnemigos() {
    const C = this.cfg;
    const listas = { soldado: [], garrotero: [] };
    const datos = { soldado: [], garrotero: [] };
    C.enemigos.forEach((e) => {
      const { tipo, x, zona, desde = C.desde || 470, torre } = e;
      const s = this.superficie(x, desde);
      const limite = Math.min(C.zonas[zona].limite, C.ancho - this.scale.width);
      const vista = [limite + 50, limite + this.scale.width - 50];
      listas[tipo].push({
        x, abajo: s.y, zona, torre,
        min: Math.max(s.x0 + 18, x - 170, vista[0]), max: Math.min(s.x1 - 18, x + 170, vista[1])
      });
      datos[tipo].push(e);
    });
    this.crearSoldados(listas.soldado);
    this.crearGarroteros(listas.garrotero);
    // Los que salen por puertas y ventanas esperan escondidos.
    this.soldados.getChildren().forEach((s, i) => this.esconder(s, datos.soldado[i]));
    this.garroteros.getChildren().forEach((g, i) => this.esconder(g, datos.garrotero[i]));
  }

  // Los que salen por una puerta o ventana esperan escondidos (sin cuerpo).
  esconder(enemigo, e) {
    if (!e.sale) return;
    enemigo.setVisible(false).setData({ estado: 'escondido', sale: e.sale, retraso: e.retraso || 0 });
    enemigo.body.enable = false;
    const sombra = enemigo.getData('sombra');
    if (sombra) sombra.setVisible(false);
  }

  salirEnemigo(enemigo) {
    if (!enemigo.active || enemigo.getData('estado') !== 'escondido') return;
    this.abrir(enemigo.getData('sale'));
    this.time.delayedCall(250, () => {
      if (!enemigo.active) return;
      enemigo.setVisible(true).setAlpha(0);
      enemigo.body.enable = true;
      enemigo.body.reset(enemigo.x, enemigo.y);
      if (enemigo.getData('torre')) { enemigo.body.moves = false; enemigo.body.setAllowGravity(false); }
      this.tweens.add({ targets: enemigo, alpha: 1, duration: 300 });
      enemigo.setData('estado', 'ronda');
      if (Math.random() < 0.5) this.aviso(enemigo.x, enemigo.y - 130, this.rnd.pick(['¡AHÍ ESTÁ!', '¡ALTO!', '¡FUEGO!']), 'rojo');
    });
  }

  // Sombras: los escondidos no tienen.
  actualizarSombra(sombra, sprite) {
    if (sombra && sprite.active && !sprite.visible) { sombra.setVisible(false); return; }
    super.actualizarSombra(sombra, sprite);
  }

  // ---------------------------------------------------------------------------
  // Rehenes (tapa: un pedazo del dibujo delante, para esconderlos)
  // ---------------------------------------------------------------------------

  crearRehenes() {
    this.crearAnimacionesNpc();
    this.rehenes = this.physics.add.group({ allowGravity: true });
    (this.cfg.rehenes || []).forEach(({ x, desde = this.cfg.desde || 470, tapa }) => {
      const y = this.superficie(x, desde).y;
      const r = this.rehenes.create(x, y - 6, 'npcRescate', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.5);
      r.body.setSize(NPC.cuerpo.ancho, NPC.cuerpo.alto).setOffset((NPC.ancho - NPC.cuerpo.ancho) / 2, NPC.alto - NPC.cuerpo.alto);
      r.setData('estado', 'atado');
      const sombra = this.crearSombra(SOMBRA.rehen, 9.3);
      r.setData('sombra', sombra);
      r.once('destroy', () => sombra.destroy());
      r.play({ key: 'npc_atado', startFrame: Phaser.Math.Between(0, 5) });
      if (tapa) this.pedazoDibujo(tapa, `tapa_${tapa[0]}`, 9.55); // (en px del PNG)
    });
    this.pisar(this.rehenes);
    this.physics.add.overlap(this.jugador, this.rehenes, (j, r) => this.rescatar(r));
  }

  // Un pedazo del dibujo de las calles [x0, y0, x1, y1] (px del PNG) puesto
  // en su lugar del mundo, delante de lo que tenga detrás (profundidad).
  pedazoDibujo([x0, y0, x1, y1], nombre, profundidad) {
    const t = this.tramoEn(x0);
    const textura = this.textures.get(t.clave);
    const fuente = textura.getSourceImage();
    const a = Math.max(0, x0 - t.x);
    const b = Math.min(fuente.width, x1 - t.x);
    if (b <= a || y1 <= y0) return null;
    if (!textura.has(nombre)) textura.add(nombre, 0, a, y0, b - a, y1 - y0);
    const img = this.add.image(this.X(t.x + a), this.Y(y0), t.clave, nombre).setOrigin(0).setScale(this.K).setDepth(profundidad);
    if (t.tinte) img.setTint(t.tinte);
    return img;
  }

  // Barandas de los balcones delante de los enemigos (no del jugador): el que
  // está en un balcón o sale por su ventana queda adentro, detrás de la
  // baranda, y no flotando delante. Balcones: los pisos one-way de la mitad
  // de la fachada (los techos están más arriba). Arriba no tapa las ventanas
  // (al abrirse se verían cerradas encima).
  crearBarandas() {
    const B = this.cfg.barandas;
    if (!B) return;
    const ventanas = Object.values(this.cfgBase.aberturas || {}).map((d) => (Array.isArray(d) ? d : d.r));
    this.colisionBase.platforms.forEach((p, i) => {
      if (p.y < B.desde || p.y > B.hasta) return;
      let arriba = p.y - B.alto;
      ventanas.forEach(([x0, , x1, y1]) => {
        if (x1 > p.x0 && x0 < p.x1 && y1 < p.y && y1 >= arriba) arriba = y1 + 1;
      });
      this.pedazoDibujo([p.x0, arriba, p.x1, p.y + B.abajo], `baranda_${i}`, B.profundidad);
    });
  }

  // ---------------------------------------------------------------------------
  // Llamas: pastan y, si el jugador se acerca, salen corriendo.
  // Palomas: posadas en los techos, vuelan en bandada al acercarse.
  // ---------------------------------------------------------------------------

  crearLlamas() {
    this.llamas = (this.cfg.llamas || []).map(({ obj, x, desde, animada }) => {
      if (animada) {
        // La de objetos_potosi.jpeg: pasta moviendo la cabeza (mira a la derecha).
        const l = this.apoyar(this.add.sprite(x, 0, 'potosiHoja_llama_anda', 0), x, 9.2, desde);
        l.setData({ estado: 'pasta', animada: true }).play('potosi_llama_anda');
        return l;
      }
      const l = this.apoyar(this.add.image(x, 0, 'potosi_' + obj), x, 9.2, desde);
      l.setData('estado', 'pasta');
      this.tweens.add({ targets: l, scaleY: 0.98, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return l;
    });
  }

  moverLlamas() {
    const L = this.cfg.llama;
    this.llamas.forEach((l) => {
      if (!l.active || l.getData('estado') !== 'pasta') return;
      if (Math.abs(this.jugador.x - l.x) > L.cercania) return;
      l.setData('estado', 'huye');
      this.tweens.killTweensOf(l);
      const lado = this.jugador.x < l.x ? 1 : -1;
      if (l.getData('animada')) l.setFlipX(lado < 0).play('potosi_llama_corre'); // mira a la derecha
      else l.setScale(1).setFlipX(lado > 0); // el dibujo mira a la izquierda
      this.aviso(l.x, l.y - 130, '¡MEEEH!', 'plata');
      const sombra = l.getData('sombra');
      const piso = l.y;
      const distancia = 1100;
      const duracion = distancia / L.velocidad * 1000;
      this.tweens.add({
        targets: [l, sombra], x: `+=${lado * distancia}`, duration: duracion, ease: 'Linear',
        onComplete: () => { this.tweens.killTweensOf(l); l.destroy(); sombra.destroy(); }
      });
      // La animada ya galopa en su hoja: salta menos.
      const salto = l.getData('animada') ? 6 : 18;
      this.tweens.add({ targets: l, y: piso - salto, duration: 160, yoyo: true, repeat: Math.ceil(duracion / 320), ease: 'Quad.out' });
    });
  }

  crearPalomas() {
    // Palomas comiendo en la calle (objetos_potosi.jpeg), cada una a su ritmo.
    this.palomasSuelo = [];
    (this.cfg.palomasSuelo || []).forEach(([x, cuantas]) => {
      for (let k = 0; k < cuantas; k++) {
        const px = x + (k - (cuantas - 1) / 2) * 26 + Phaser.Math.Between(-6, 6);
        const p = this.apoyar(this.add.sprite(px, 0, 'potosiHoja_palomas_comen', 0), px, 8.25);
        p.getData('sombra').setScale(0.6, 0.6);
        p.setFlipX(Math.random() < 0.5).play({ key: 'potosi_palomas_comen', startFrame: Phaser.Math.Between(0, 4) });
        p.anims.timeScale = Phaser.Math.FloatBetween(0.8, 1.2);
        this.palomasSuelo.push(p);
      }
    });
    this.palomas = (this.cfg.palomas || []).map(([x, y]) => {
      // Posadas: el primer cuadro chiquito, sin aletear.
      const p = this.add.sprite(x, y + 2, 'potosiPalomas', 3).setOrigin(0.5, 1).setScale(0.42).setDepth(1.2).setTint(0xd0d4d8);
      this.tweens.add({ targets: p, y: y + 1, duration: 500 + Math.random() * 400, yoyo: true, repeat: -1 });
      return p;
    });
  }

  moverPalomas() {
    // Las de la calle: si el jugador se acerca (o dispara cerca), salen volando.
    this.palomasSuelo.forEach((p) => {
      if (!p.active || p.getData('vuela') || Math.abs(this.jugador.x - p.x) > 200) return;
      p.setData('vuela', true);
      const lado = this.jugador.x < p.x ? 1 : -1;
      p.getData('sombra').destroy();
      p.setFlipX(lado < 0).play('potosi_palomas_vuelan');
      this.time.delayedCall(Phaser.Math.Between(0, 150), () => {
        if (!p.active) return;
        this.tweens.add({
          targets: p, x: p.x + lado * Phaser.Math.Between(400, 600), y: p.y - Phaser.Math.Between(260, 340),
          duration: Phaser.Math.Between(1600, 2200), ease: 'Quad.in', onComplete: () => p.destroy()
        });
      });
    });
    this.palomas.forEach((p) => {
      if (!p.active || p.getData('vuela') || Math.abs(this.jugador.x - p.x) > 220) return;
      p.setData('vuela', true);
      this.tweens.killTweensOf(p);
      p.play('palomas_vuelan').setFlipX(this.jugador.x > p.x);
      const lado = this.jugador.x < p.x ? 1 : -1;
      this.tweens.add({ targets: p, x: p.x + lado * 500, y: p.y - 260, scale: 0.6, duration: 2200, ease: 'Quad.in', onComplete: () => p.destroy() });
      const plumas = this.add.particles(p.x, p.y - 10, 'fx_chispa', {
        speed: { min: 20, max: 80 }, gravityY: 60, lifespan: 900, tint: 0xe0e4e8, scale: { start: 1.4, end: 0.6 }, emitting: false
      }).setDepth(11);
      plumas.explode(8);
      this.time.delayedCall(1000, () => plumas.destroy());
    });
  }

  // ---------------------------------------------------------------------------
  // Zonas, cámara, HUD y el final de cada escena
  // ---------------------------------------------------------------------------

  crearSalida() {} // (cada escena tiene la suya: alTerminar, revisarSalida)

  actualizarHUD() {
    this.hud.setText(`REHENES ${this.rescatados}/${(this.cfg.rehenes || []).length}`);
  }

  actualizarCamara(delta) {
    const C = this.cfg;
    const cam = this.cameras.main;
    if (this.estado === 'editor') return;
    const maximo = C.ancho - this.scale.width;
    if (this.jugador.getData('noclip')) {
      cam.scrollX = Phaser.Math.Clamp(this.jugador.x - this.scale.width / 2, 0, maximo);
      this.camaraMinima = cam.scrollX;
      return;
    }
    const limite = Math.min(C.zonas[this.zona].limite, maximo);
    const objetivo = Phaser.Math.Clamp(this.jugador.x - this.scale.width * C.camara.adelante, 0, limite);
    const t = 1 - Math.pow(1 - C.camara.lerp, delta / 16.67);
    let x = cam.scrollX + (objetivo - cam.scrollX) * t;
    x = Math.min(Math.max(x, this.camaraMinima || 0), limite);
    cam.scrollX = x;
    this.camaraMinima = x;
  }

  actualizarZonas() {
    const C = this.cfg;
    const z = C.zonas[this.zona];
    const cam = this.cameras.main;
    if (this.zonaEstado === 'camino') {
      if (this.flechaGo.visible && cam.scrollX - this.goDesde > 60) {
        this.mostrarGo(false);
        this.goDesde = cam.scrollX;
        this.goEn = this.time.now;
      } else if (!this.flechaGo.visible && this.time.now - this.goEn > 3000) {
        if (cam.scrollX - this.goDesde < 30) this.mostrarGo(true);
        else { this.goDesde = cam.scrollX; this.goEn = this.time.now; }
      }
      if (cam.scrollX < Math.min(z.limite, C.ancho - this.scale.width) - 2) return;
      this.zonaEstado = 'activa';
      this.mostrarGo(false);
      this.empezarZona(this.zona);
    } else if (this.zonaEstado === 'activa') {
      if (this.vivosEnZona(this.zona) > 0) return;
      // Zona con jefe: después de los de a pie, el jefe (Patio).
      if (z.jefe && !this.jefeVencido) {
        if (!this.jefeIniciado) { this.jefeIniciado = true; this.iniciarJefe(); }
        return;
      }
      if (this.zona < C.zonas.length - 1) {
        this.zona++;
        this.zonaEstado = 'camino';
        this.mostrarGo(true);
      } else {
        this.zonaEstado = 'fin';
        this.alTerminar();
      }
    } else if (this.zonaEstado === 'fin' && this.estado === 'control') {
      this.revisarSalida();
    }
  }

  // Los escondidos de la zona salen (cada uno a su tiempo) y cuentan como
  // pendientes hasta que aparecen.
  empezarZona(i) {
    const z = this.cfg.zonas[i];
    [...this.soldados.getChildren(), ...this.garroteros.getChildren()].forEach((e) => {
      if (e.getData('zona') !== i || e.getData('estado') !== 'escondido') return;
      this.pendientes[i]++;
      this.time.delayedCall(e.getData('retraso'), () => {
        this.pendientes[i]--;
        this.salirEnemigo(e);
      });
    });
    if (z.campanas) this.tocarCampanas();
    if (z.cartel) {
      const { width } = this.scale;
      const cartel = TextFX.alert(this, width / 2, 110, z.cartel, { escala: 3 }).setScrollFactor(0).setDepth(31);
      cartel.destellar(4, 90, () => this.tweens.add({ targets: cartel, alpha: 0, delay: 900, duration: 300, onComplete: () => cartel.destroy() }));
    }
  }

  // Calles: vencidos los guardias, la puerta de la Casa de la Moneda vuela.
  alTerminar() {
    const [x0, y0, x1, y1] = this.cfg.puertaMoneda;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const { width } = this.scale;
    const aviso = TextFX.alert(this, width / 2, 130, '¡CUIDADO!', { escala: 3 }).setScrollFactor(0).setDepth(31);
    aviso.destellar(6, 80, () => aviso.destroy());
    // Humo que sale por las rendijas antes de reventar.
    const humo = this.add.particles(cx, y1 - 10, 'fx_humo', {
      x: { min: -30, max: 30 }, speedY: { min: -40, max: -10 }, lifespan: 900, frequency: 70,
      scale: { start: 1, end: 2.5 }, alpha: { start: 0.4, end: 0 }, tint: 0x8a8a8a
    }).setDepth(8);
    this.time.delayedCall(1300, () => {
      humo.stop();
      this.time.delayedCall(1000, () => humo.destroy());
      explotar(this, cx, y1 - 20, 'grande', ESCALA * 1.4);
      this.time.delayedCall(120, () => explotar(this, cx - 20, cy, 'mediana', ESCALA));
      this.cameras.main.shake(500, 0.014);
      this.cameras.main.flash(160, 255, 230, 180);
      this.add.rectangle(x0, y0, x1 - x0, y1 - y0, 0x0e0806).setOrigin(0).setDepth(1.05);
      this.add.image(cx, y1 + 2, 'potosi_puerta_rota').setOrigin(0.5, 1).setDepth(1.1)
        .setDisplaySize(x1 - x0 + 6, y1 - y0 + 8).setTint(0x8a7060).setAlpha(0.9);
      this.astillas(cx, cy, 14, 1);
      this.astillas(cx, cy, 14, -1);
      if (Math.abs(this.jugador.x - cx) < 90) this.golpearJugador(cx);
      this.puertaRota = true;
      this.time.delayedCall(900, () => {
        const entra = TextFX.texto(this, cx, y0 - 30, '¡ENTRA!', { color: 'oro', escala: 2 }).setDepth(16);
        this.tweens.add({ targets: entra, y: entra.y + 8, duration: 400, yoyo: true, repeat: -1 });
        this.mostrarGo(true);
      });
    });
  }

  revisarSalida() {
    if (!this.puertaRota) return;
    const [x0, , x1] = this.cfg.puertaMoneda;
    const b = this.jugador.body;
    if (b.center.x > x0 && b.center.x < x1 && b.bottom > 470) this.salir();
  }

  // Entra por la puerta rota: fundido al patio.
  salir() {
    const [x0, , x1] = this.cfg.puertaMoneda;
    this.pasarA('Patio', (x0 + x1) / 2);
  }

  // Se va de la escena: camina hasta x (y se desvanece) y fundido a la siguiente.
  pasarA(siguiente, x) {
    if (this.estado === 'saliendo') return;
    this.estado = 'saliendo';
    cerrarSelector(this, false);
    this.mostrarGo(false);
    const j = this.jugador;
    j.setVelocity(0).body.setAllowGravity(false);
    this.registry.remove(this.claveBase);
    if (x !== undefined) this.tweens.add({ targets: j, x, alpha: 0, duration: 600 });
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (siguiente && this.scene.manager.keys[siguiente]) { this.scene.start(siguiente); return; }
      misionCompleta(this); // Estado.js
    });
  }

  // Parado en la vereda: no cuenta como repisa (ABAJO agacha, no baja); con
  // ABAJO + SALTO se deja caer a la calle (sin saltar).
  seguirVereda() {
    const j = this.jugador;
    if (this.yVereda === null || !j.body.blocked.down && !j.body.touching.down) return;
    if (Math.abs(j.body.bottom - this.yVereda) > 3) return;
    this.sobrePlataformaEn = -Infinity;
    const abajo = this.teclas.down.isDown || this.teclasExtra.S.isDown;
    // (Recién apretado: el salto del cuadro anterior no estaba apretado.)
    if (abajo && this.teclasExtra.SPACE.isDown && !this.saltoPresionado) {
      this.bajandoHasta = this.time.now + 250;
      this.saltoPresionado = true; // que moverJugador no lo haga saltar
    }
  }

  // Enemigos de a pie entre la vereda y la calle: si el jugador está en el
  // otro nivel y cerca, al rato se bajan (atraviesan la vereda) o suben de
  // un salto. Patrullando, de vez en cuando también cambian de nivel solos.
  seguirCalleEnemigos() {
    if (this.yVereda === null) return;
    const C = CALLE_ENEMIGOS;
    const j = this.jugador;
    const ahora = this.time.now;
    const jugadorAbajo = j.body.bottom > this.yVereda + 20;
    const jugadorEnVereda = Math.abs(j.body.bottom - this.yVereda) < 24 || j.body.bottom < this.yVereda - 4;
    [this.soldados, this.garroteros].forEach((grupo) => grupo && grupo.getChildren().forEach((e) => {
      if (e.getData('estado') !== 'ronda' || e.getData('torre') || !e.body.enable) return;
      const b = e.body;
      if (!b.blocked.down && !b.touching.down) return;
      const enVereda = Math.abs(b.bottom - this.yVereda) <= 3;
      const enCalle = b.bottom > this.yVereda + 20;
      if (!enVereda && !enCalle) return; // balcones y techos: no
      if (e.getData('cambiaDesde') === undefined) e.setData('cambiaDesde', ahora + Phaser.Math.Between(...C.primera));
      if (ahora < e.getData('cambiaDesde')) return;
      const cerca = Math.abs(j.body.center.x - b.center.x) < C.distancia && this.estado === 'control' && !this.muerto;
      let cambiar = cerca && (enVereda ? jugadorAbajo : jugadorEnVereda);
      if (!cambiar && !cerca && Math.random() < C.alAzar) cambiar = true;
      if (!cambiar) return;
      e.setData('cambiaDesde', ahora + Phaser.Math.Between(...C.pausa));
      if (enVereda) {
        e.setData('bajaHasta', ahora + 300);
        b.setVelocityY(40);
      } else {
        // Salta justo para pasar el borde de la vereda (con margen).
        const alto = b.bottom - this.yVereda + 26;
        b.setVelocityY(-Math.sqrt(2 * this.physics.world.gravity.y * alto));
      }
    }));
  }

  // Lo editado (tecla E) se guarda en px de los PNG, como está el JSON.
  guardarColision() {
    if (this.K === 1) { super.guardarColision(); return; }
    const mundo = this.colision;
    this.colision = escalarColisionPotosi(mundo, this.K, this.cfgBase.piso || 500, true);
    super.guardarColision();
    this.colision = mundo;
  }

  moverEditor() {
    const cam = this.cameras.main;
    const izq = this.teclas.left.isDown || this.teclasExtra.A.isDown;
    const der = this.teclas.right.isDown || this.teclasExtra.D.isDown;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (der ? 12 : 0) - (izq ? 12 : 0), 0, this.cfg.ancho - this.scale.width);
    this.dibujarEditor();
  }

  // Guardia: en la zona activa, un enemigo que quedó invisible (escondido
  // sin salir, transparente o sin cuerpo) aparece de verdad, dentro de la
  // pantalla. Si no, la zona quedaba trabada esperando a alguien que no se ve.
  revisarInvisibles(time) {
    if (this.zonaEstado !== 'activa' || time < (this.proximaRevision || 0)) return;
    this.proximaRevision = time + 1000;
    const cam = this.cameras.main;
    const { width } = this.scale;
    [...(this.soldados ? this.soldados.getChildren() : []), ...(this.garroteros ? this.garroteros.getChildren() : [])].forEach((e) => {
      if (!e.active || e.getData('zona') !== this.zona) return;
      const estado = e.getData('estado');
      const desde = e.getData('visibleDesde') ?? (e.setData('visibleDesde', time), time);
      if (estado === 'escondido') {
        // Su puerta no se abrió (pendientes ya en 0): sale ahora.
        if (!this.pendientes[this.zona] && time - desde > 2500) this.salirEnemigo(e);
        return;
      }
      if (!['ronda', 'ataque'].includes(estado)) return;
      const roto = !e.visible || e.alpha < 0.3 || (e.body && !e.body.enable);
      if (!roto) return;
      e.setVisible(true).setAlpha(1);
      if (e.body) e.body.enable = true;
      const sombra = e.getData('sombra');
      if (sombra) sombra.setVisible(true);
      // Si quedó fuera de la pantalla, adentro.
      const x = Phaser.Math.Clamp(e.x, cam.scrollX + 60, cam.scrollX + width - 60);
      if (x !== e.x && e.body) e.body.reset(x, e.y);
    });
  }

  update(time, delta) {
    this.moverFondo();
    if (this.estado !== 'editor') this.revisarInvisibles(time);
    if (this.estado === 'editor') { this.moverEditor(); return; }
    const admin = this.estado === 'control' && noclipJugador(this);
    if (this.estado === 'control' && !admin) { this.seguirVereda(); this.moverJugador(); }
    else if (this.estado !== 'muerto' && !admin) cerrarSelector(this, false);
    if (!this.muerto && this.estado !== 'saliendo' && !admin) this.limitarJugador();
    this.seguirCalleEnemigos();
    this.moverSoldados();
    this.moverGarroteros();
    this.moverRehenes();
    this.moverLlamas();
    this.moverPalomas();
    this.moverBalas();
    this.actualizarExtras(time, delta);
    this.actualizarCamara(delta);
    this.actualizarZonas();
    this.actualizarSombra(this.sombraJugador, this.jugador);
    this.rehenes.getChildren().forEach((r) => this.actualizarSombra(r.getData('sombra'), r));
  }
}

// Texturas chicas dibujadas: el lingote de plata y la moneda de plata (8
// reales macuquinos) que escupe el Mascarón.
function texturasPotosi(escena) {
  if (escena.textures.exists('potosi_lingote')) return;
  const dibujar = (clave, ancho, alto, fn) => {
    const g = escena.make.graphics({ add: false });
    fn(g);
    g.generateTexture(clave, ancho, alto);
    g.destroy();
  };
  dibujar('potosi_lingote', 22, 12, (g) => {
    g.fillStyle(0x2a2c30).fillRect(0, 2, 22, 10);
    g.fillStyle(0x9aa2ac).fillRect(1, 3, 20, 8);
    g.fillStyle(0xd8dee6).fillRect(3, 0, 16, 5);
    g.fillStyle(0xffffff).fillRect(5, 1, 8, 1);
    g.fillStyle(0x6a727c).fillRect(1, 9, 20, 2);
  });
  dibujar('potosi_moneda', 12, 12, (g) => {
    g.fillStyle(0x3a3c40).fillCircle(6, 6, 6);
    g.fillStyle(0xc8ced6).fillCircle(6, 6, 5);
    g.fillStyle(0xeef2f6).fillRect(3, 3, 3, 2);
    g.fillStyle(0x7a828c).fillRect(5, 5, 3, 3);
  });
}

// El farol colonial de la calle (hierro fundido, de pie): dos cuadros,
// 'prendido' y 'apagado'. Base escalonada, poste estriado con anillos, brazos
// con volutas y el farol de cuatro vidrios con su sombrerete y remate.
function texturaFarol(escena) {
  if (escena.textures.exists('potosi_farolAlto')) return;
  const W = 46;
  const H = 236;
  const t = escena.textures.createCanvas('potosi_farolAlto', W * 2, H);
  const c = t.getContext();
  const cx = W / 2;
  const hierro = '#24201c';
  const medio = '#3e3731';
  const brillo = '#6b6058';
  const caja = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const dibujar = (ox, prendido) => {
    const X = (x) => ox + x;
    // Base: tres escalones.
    caja(X(cx - 13), H - 8, 26, 8, hierro); caja(X(cx - 12), H - 8, 24, 2, medio);
    caja(X(cx - 10), H - 16, 20, 8, hierro); caja(X(cx - 9), H - 16, 3, 8, brillo);
    caja(X(cx - 7), H - 26, 14, 10, hierro); caja(X(cx - 6), H - 26, 2, 10, brillo);
    // Poste estriado con anillos.
    const p0 = 70;
    caja(X(cx - 4), p0, 8, H - 26 - p0, hierro);
    caja(X(cx - 3), p0, 2, H - 26 - p0, brillo);
    caja(X(cx + 1), p0, 1, H - 26 - p0, medio);
    [p0 + 6, p0 + 60, H - 40].forEach((y) => { caja(X(cx - 6), y, 12, 4, hierro); caja(X(cx - 5), y, 10, 1, brillo); });
    // Brazos con volutas debajo del farol.
    c.strokeStyle = hierro; c.lineWidth = 2;
    [-1, 1].forEach((l) => {
      c.beginPath();
      c.moveTo(X(cx), p0 + 4);
      c.quadraticCurveTo(X(cx + l * 12), p0 + 2, X(cx + l * 12), p0 + 12);
      c.arc(X(cx + l * 9), p0 + 12, 3, 0, Math.PI * 2);
      c.stroke();
    });
    // El farol: piso, cuatro vidrios (2 de frente) con marco, techo y remate.
    const f0 = 24;
    const fh = 40;
    caja(X(cx - 10), f0 + fh, 20, 5, hierro); caja(X(cx - 8), f0 + fh + 5, 16, 3, medio);
    if (prendido) {
      const g = c.createLinearGradient(0, f0, 0, f0 + fh);
      g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd870'); g.addColorStop(1, '#e89a38');
      c.fillStyle = g;
    } else {
      const g = c.createLinearGradient(0, f0, 0, f0 + fh);
      g.addColorStop(0, '#56677a'); g.addColorStop(1, '#2c3440');
      c.fillStyle = g;
    }
    c.beginPath();
    c.moveTo(X(cx - 12), f0); c.lineTo(X(cx + 12), f0); c.lineTo(X(cx + 9), f0 + fh); c.lineTo(X(cx - 9), f0 + fh); c.closePath();
    c.fill();
    if (!prendido) { caja(X(cx - 9), f0 + 4, 3, 22, 'rgba(200,220,240,0.45)'); caja(X(cx + 3), f0 + 6, 2, 12, 'rgba(200,220,240,0.3)'); }
    else caja(X(cx - 3), f0 + 14, 6, 14, '#fffbe8'); // la llama
    c.strokeStyle = hierro; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(X(cx - 12), f0); c.lineTo(X(cx - 9), f0 + fh); c.moveTo(X(cx + 12), f0); c.lineTo(X(cx + 9), f0 + fh);
    c.moveTo(X(cx), f0); c.lineTo(X(cx), f0 + fh);
    c.stroke();
    caja(X(cx - 14), f0 - 4, 28, 4, hierro); caja(X(cx - 13), f0 - 4, 26, 1, brillo);
    c.fillStyle = hierro;
    c.beginPath(); c.moveTo(X(cx - 13), f0 - 4); c.lineTo(X(cx), f0 - 16); c.lineTo(X(cx + 13), f0 - 4); c.closePath(); c.fill();
    caja(X(cx - 1), f0 - 22, 2, 7, hierro);
    c.beginPath(); c.arc(X(cx), f0 - 23, 2.5, 0, Math.PI * 2); c.fill();
  };
  dibujar(0, true);
  dibujar(W, false);
  t.add('prendido', 0, 0, 0, W, H);
  t.add('apagado', 0, W, 0, W, H);
  t.refresh();
}
