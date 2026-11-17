// =============================================================================
// Nivel 1: selva del Chapare, al estilo Metal Slug.
//
// El terreno sale de MAPA_NIVEL1 (un carácter por celda de 128x128 px) y tiene
// tres rutas que se separan y se vuelven a juntar:
//   arriba -> plataformas de piedra y ramas de árboles, con rehenes y power-ups
//   medio  -> el suelo principal, con lomas y rampas
//   abajo  -> rampa hacia el río (agua poco profunda) y cueva bajo las ruinas
//
// Arcade Physics no tiene pendientes: las rampas se resuelven a mano (cada
// tipo tiene una función de altura) y en update() se pega al personaje a la
// superficie.
//
// Recursos (assets/fondos/lvl1/): fondo y tileset "_calido"
// (herramientas/calidez_chapare.py), árboles (arboles_selva.py), agua
// (agua_rio.py). Pendientes y paredes de cueva: TerrenoNatural.js.
// =============================================================================

const ESCALA = 2;
const TILE = 64 * ESCALA; // 128 px en pantalla
// La cara de arriba de la piedra no está en el borde de la celda: el tile
// tiene 2 filas vacías, el contorno y una franja clara de piedras (filas 3 a
// 13). Toda la colisión del suelo (piedra, rampas, lecho, losas y puentes)
// queda en el medio de esa franja: 8 px de arte = 16 en pantalla.
const SUELO_Y = 16;

// Leyenda del mapa:
//   .  aire                     S  piedra sólida
//   /  rampa 45° que sube       \  rampa 45° que baja        (hacia la derecha)
//   1 2  rampa suave 22.5° que sube (mitad baja, mitad alta; 2 tiles)
//   3 4  rampa suave 22.5° que baja (mitad alta, mitad baja; 2 tiles)
//   P  plataforma de un solo sentido (puentes y losas)
//   A  agua poco profunda (el fondo es la celda S de abajo)
//   T  tronco de un árbol trepable (sus ramas son plataformas)
//   B  ramas (solo referencia: la colisión sale del dibujo del árbol)
//   H  rehén   *  power-up   x  caja   s  sacos   J  inicio   F  meta (sin uso: el
//   nivel termina en la puerta del edificio final, ver PROPS_NIVEL1)
//   C  cholita (enemigo que patrulla)   N  NPC que regala una hamburguesa (power-up)
//   E  soldado (enemigo1: patrulla y dispara; Soldados.js)
//   En las columnas CUEVA_NIVEL1 hay un peñón de roca de arriba abajo: se
//   cruza solo por la cueva (escena Cueva), que sale del otro lado.
//   W  caja de armas (se abre a balazos o tocándola; trae un arma: CAJAS_NIVEL1, Armas.js)
// Qué arma trae cada caja de armas (W), de izquierda a derecha.
const CAJAS_NIVEL1 = ['ak47', 'escopeta', 'machete', 'lanzallamas', 'ametralladora', 'lanzacohetes'];

const MAPA_NIVEL1 = [
  '..........*............................SSS.................................', // 0 (y = 0)
  '...............................H.......SSS..........*......................', // 1 (y = 128)
  '...........x.......H...................SSS.................................', // 2 (y = 256)
  '.J.Ns.H.WC.xEE.E..............W.EEsEN..SSSW.EC.HEEW.E.EWE.HE.EC.sWEE..EE.E.', // 3 (y = 384)
  'SSSSSSSSSSSSSS34......H.....12SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 4 (y = 512)
  'SSSSSSSSSSSSSSSS\\AAAAAAAAAA/SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', // 5 (y = 640)
  'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS' // 6 (y = 768)
];

// Rampas: hacia dónde sube (1 = hacia la derecha) y altura de la línea de
// colisión desde el borde superior de la celda para cada x local (0..TILE).
// Esa línea es invisible: el dibujo (escalones rotos, tierra, raíces) lo hace
// TerrenoNatural.js y sobresale unos píxeles por encima y por debajo.
const RAMPAS = {
  '/': { sube: 1, altura: (x) => TILE - x },
  '\\': { sube: -1, altura: (x) => x },
  '1': { sube: 1, altura: (x) => TILE - x / 2 },
  '2': { sube: 1, altura: (x) => TILE / 2 - x / 2 },
  '3': { sube: -1, altura: (x) => x / 2 },
  '4': { sube: -1, altura: (x) => TILE / 2 + x / 2 }
};
const RAMPA_VELOCIDAD = { subida: 0.85, bajada: 1.1 };

// Índices del tileset (8 columnas x 3 filas de 64x64).
const T = {
  pisoIzq: 0, pisoMedio: [1, 2, 3], pisoDer: 4, muro: [5, 6, 7],
  plataformaIzq: 8, plataformaMedio: 9, plataformaDer: 10, muroIzq: 11, muroDer: 12,
  roca: 14, tronco: 15, pasto: 16, lianas: 17, musgo: 18,
  caja: 19, sacos: 20, barril: 21, helecho: 22, lianas2: 23
};

// Cajas, sacos, barriles...: textura, tamaño de la imagen y caja en píxeles
// de esa imagen [x0, y0, x1, y1]. Como en Metal Slug no frenan al pasar por
// delante: su cara de arriba es una plataforma one-way (se pisa al caer
// encima) y el resto se atraviesa. La caja es la chica (38 px de arte,
// a la cintura del soldado: herramientas/caja_chica.py).
const OBSTACULOS = {
  roca: { textura: 'tilesSelva', frame: 14, tam: [64, 64], caja: [4, 17, 61, 64] },
  tronco: { textura: 'tilesSelva', frame: 15, tam: [64, 64], caja: [1, 33, 63, 61] },
  caja: { textura: 'cajaChica', tam: [38, 38], caja: [0, 0, 38, 38] },
  sacos: { textura: 'tilesSelva', frame: 20, tam: [64, 64], caja: [0, 29, 64, 64] },
  barril: { textura: 'tilesSelva', frame: 21, tam: [64, 64], caja: [13, 11, 51, 64] }
};
const HUNDIDO = 3; // los objetos se apoyan 2-4 px hundidos en el suelo, no encima
const MARCAS_OBSTACULO = { x: 'caja', s: 'sacos' };

// Parallax: velocidad respecto a la cámara en X y en Y (1 = como el nivel).
// sendero: franja de tierra y maleza (y = borde de arriba, en coordenadas de
// la capa) donde se apoyan los árboles de esa capa; asoma por encima del suelo
// jugable y, en el río, hace de orilla lejana. Están calculadas para la cámara
// con el jugador en el suelo (scrollY ~100): ahí la del medio asoma 40 px y la
// lejana 24 px más arriba.
// base = y (del mundo) de las raíces de los árboles de fondo: elegida para
// que nunca se vean flotando, tanto arriba como abajo del nivel.
// gigantes = árboles enormes (200x420, a x2) cuyo tronco sube más allá del
// borde de la pantalla; se mezclan con los árboles comunes de cada capa.
const CAPAS = {
  // Fondo dibujado (selva_fondo_288): se repite a lo ancho y se escala para
  // cubrir todo el alto que recorre la cámara sin dejar huecos.
  cielo: { x: 0.3, y: 0.15 },
  lejanos: {
    textura: 'arbolesLejos', x: 0.42, y: 0.2, base: 394, separacion: [380, 560],
    sendero: { y: 384, niebla: 0.55 },
    gigantes: { textura: 'gigantesLejos', separacion: [700, 1100] }
  },
  medios: {
    textura: 'arbolesMedio', x: 0.6, y: 0.4, base: 442, separacion: [600, 900],
    sendero: { y: 428, niebla: 0.25 },
    gigantes: { textura: 'gigantesMedio', separacion: [900, 1400] }
  },
  // El primer plano queda fijo en Y (pegado al borde de la pantalla) y en X
  // corre más rápido que el nivel: pasa por delante del jugador. Incluye
  // troncos gigantes casi en silueta, cada tanto.
  frente: { x: 1.2, y: 0, troncos: [1600, 2600] }
};

// Luz del sol entre las copas (texturas de TerrenoNatural.js, mezcla ADD).
// Los rayos van en su propia capa de parallax, delante del terreno y detrás
// del jugador; "respiran" (el brillo sube y baja) y tienen polvo flotando.
const LUZ = {
  rayos: { x: 0.8, y: 0.6, arriba: -60, separacion: [550, 1200], brillo: [0.6, 1], variantes: 4 },
  sol: { x: 900, y: 70, brillo: 0.85 }
};

// Árboles trepables: sus ramas gruesas son plataformas de un solo sentido. Las
// líneas pisables vienen de arboles_300x200_ramas.json.
const ARBOLES_JUEGO = {
  variantes: [2, 0],    // qué árbol del spritesheet usa cada T del mapa (en orden)
  hundido: 56,          // cuánto se esconde la base detrás del suelo
  grosorRama: 12,       // alto del cuerpo de colisión de cada tramo
  verRamas: false       // true: dibuja las zonas pisables (para ajustar el nivel)
};

// Ríos: el lecho tiene forma de cuenca (más hondo en el centro) y el jugador
// camina sobre él, como sobre una rampa (ver superficieRampa). Si una punta
// del río da contra suelo plano, se levanta una orilla de barro.
const RIO = {
  profundidad: 40,   // agua en las orillas: a la rodilla
  hondo: 40,         // cuánto más hondo es el centro: a la cintura
  orilla: { alto: 76, ancho: 64 },
  corriente: 0.35,   // velocidad de las hojas flotando
  lentitud: 0.6,     // multiplica la velocidad del jugador dentro del agua
  salto: 0.92
};
const LECHO_RIO = { sube: 0 }; // "rampa" del lecho: sin cambio de velocidad

// Rehenes (NPC): tiras de assets/personajes/npc/ cortadas en celdas iguales
// y llevadas a la escala de arte con herramientas/npc_spritesheet.py (ver
// npc_cuadros.json). Se dibujan a x2, como el soldado.
const NPC = {
  // Del tamaño de Manfred: parados ~60 px de arte (herramientas/npc_spritesheet.py).
  ancho: 97, alto: 64,               // celda de los spritesheets (px de arte)
  cuerpo: { ancho: 27, alto: 47 },   // caja de colisión (px de arte), apoyada en los pies
  velocidadHuida: 260,               // corre hacia la izquierda hasta salir del mapa
  saludo: 600                        // ms que se queda saludando antes de correr
};

// NPC de la hamburguesa: assets/personajes/npc/npc_power.jpeg pasado a
// spritesheet por herramientas/npc_power_spritesheet.py (17 cuadros en una
// fila, ver npc_power_cuadros.json). Espera saludando; al tocarlo el jugador
// saca una hamburguesa, se la da (cuenta como power-up), salta de alegría,
// hace la venia y desaparece en una nube de humo.
const NPC_POWER = {
  // Del tamaño de Manfred: parado ~60 px de arte (herramientas/npc_power_spritesheet.py).
  ancho: 72, alto: 64,                 // celda del spritesheet (px de arte)
  cuerpo: { ancho: 27, alto: 49 },     // caja de colisión (px de arte), apoyada en los pies
  cuadros: {
    espera: [0, 0, 0, 0, 2, 0, 0, 0],  // parado, cada tanto se acomoda
    saluda: [1, 3, 1, 3, 4, 3],        // agita la mano cuando el jugador se acerca
    entrega: [8, 9, 10, 10, 11, 11],   // se da vuelta, saca la hamburguesa, la ofrece, pulgares
    festeja: [5, 6, 7, 7, 6, 5],       // se agacha y salta
    venia: [12, 12, 12],
    corre: [14, 15, 16]
  },
  cercania: 260,                       // px a los que empieza a saludar
  salto: 56,                           // px que sube al festejar
  velocidadHuida: 240                  // corre hacia la derecha hasta salir de la pantalla
};

// Cholitas (enemigos): cholita.jpeg y cholita_ataque.jpeg de
// assets/personajes/enemigos/, pasadas a spritesheet por
// herramientas/cholita_spritesheet.py (ver cholita_cuadros.json): una fila
// por color de pollera con 8 cuadros de caminar y 6 de ataque.
// Patrullan alrededor de donde aparecen y, si ven al jugador, lo corren; de
// cerca le pegan con la bolsa. Tocarla o recibir el bolsazo empuja al
// jugador; caerle encima o dispararle la deja fuera de combate.
const CHOLITA = {
  // Del tamaño de Manfred: caminando mide 62 px de arte con el sombrero
  // (herramientas/cholita_spritesheet.py).
  ancho: 72, alto: 68,               // celda del spritesheet (px de arte)
  caminar: 8, ataque: 6,             // cuadros de cada fila: primero caminar, después ataque
  rip: { ancho: 58, alto: 63, cuadros: 6 }, // la muerte (cholita_rip_sheet.png): otra hoja, una fila por pollera
  // La muerte por fuego o explosión (cholita_quemada_sheet.png, una fila por
  // pollera): se prende y corre (0-4), carbonizada (5-9), ceniza (10-11),
  // esqueleto y montoncito (12-13). `corre`: px que corre prendida fuego.
  quemada: { ancho: 66, alto: 69, cuadros: 14, corre: 110,
    secuencia: [0, 1, 2, 3, 4, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  golpe: 3,                          // cuadro del ataque en que la bolsa pega
  alcance: 108,                      // px (entre centros) desde los que ataca
  pausaAtaque: 1300,                 // ms entre un bolsazo y el siguiente
  polleras: ['azul', 'roja', 'verde', 'morada', 'rosada', 'naranja'],
  cuerpo: { ancho: 20, alto: 50 },   // caja de colisión (px de arte), apoyada en los pies
  velocidad: 70,                     // caminando de ronda
  persecucion: 140,                  // corriendo al jugador
  ronda: 220,                        // px a cada lado de donde aparece
  vista: 380, vistaAlto: 120         // distancia a la que ve al jugador
};

// Props de la aldea de perfil (assets/fondos/Props_Aldea_Perfil/), medidas
// de medidas_colision.txt. Son solo dibujo; encima van, en píxeles de la
// imagen sin escalar:
//   pisos:     [x0, x1, y]      plataformas one-way de 6 px
//   escaleras: [x0, x1, yArriba] bajan hasta el suelo (se sube con ARRIBA)
//   solidos:   [x0, x1, yArriba] cobertura (barricadas): como en Metal Slug se
//                                atraviesa caminando y su parte de arriba es
//                                una plataforma one-way (se puede subir saltando)
//   pilotes:   [x0, x1]          columnas que se alargan hasta el suelo o el
//                                lecho si no llegan (nunca se sube el objeto)
//   puerta:    [x0, x1, yArriba, yAbajo] zona para entrar con ARRIBA al
//              interior (escena Interior, ver INTERIORES en Interior.js)
//   detras:    se dibuja detrás del terreno: los pilotes que entran en la
//              tierra quedan tapados por la orilla, como enterrados
const PROPS = {
  muelle: {
    pisos: [[0, 216, 29]], detras: true,
    pilotes: [[11, 18], [22, 30], [72, 79], [82, 88], [137, 144], [147, 154], [175, 182], [186, 193], [197, 204]]
  },
  choza_palafito: {
    pisos: [[0, 149, 118]], escaleras: [[62, 88, 118]], detras: true,
    puerta: [50, 78, 60, 118], interior: 'choza',
    pilotes: [[13, 20], [28, 34], [42, 49], [58, 62], [75, 80], [91, 98], [118, 125], [130, 139]]
  },
  casa_destruida: { pisos: [[0, 159, 74]], puerta: [58, 96, 125, 183], interior: 'casa_destruida' },
  torre_vigia: {
    pisos: [[0, 114, 22]], escaleras: [[70, 97, 22]], detras: true,
    pilotes: [[2, 9], [36, 43], [72, 79], [86, 90], [100, 104], [107, 114]]
  },
  // Cobertura con el perfil de arriba de la imagen (si fuera una sola línea
  // a la altura de la pila de llantas, sobre los sacos se vería flotando):
  // llantas chicas, pila de llantas, llantas apoyadas, turriles y sacos.
  barricada_llantas_turriles: { solidos: [[4, 22, 19], [22, 56, 2], [56, 80, 10], [80, 139, 8], [139, 174, 23]] },
  canoa: { pisos: [[10, 168, 6]], flota: true },
  // Casa de ladrillo (assets/fondos/casa.jpeg, limpiada con
  // herramientas/casa_ladrillo.py). base: fila de la imagen que va en el suelo
  // (debajo quedan los escombros). Se trepa por la cornisa del medio hasta la
  // terraza: una ruta de arriba más en la aldea. Por la puerta de metal se
  // entra a su interior (assets/fondos/interior_casa.jpeg).
  casa_ladrillo: {
    ruta: 'assets/fondos/lvl1/', base: 246, pisos: [[22, 448, 140], [12, 455, 51]],
    puerta: [76, 117, 170, 246], interior: 'casa_ladrillo'
  },
  // Edificio del final (assets/fondos/final/edif_final.jpeg, limpiado con
  // herramientas/edificio_final.py). Su puerta lleva a la pelea con el jefe
  // (escena JefeFinal); el umbral es el pie de la escalera.
  edif_final: { ruta: 'assets/fondos/final/', puerta: [293, 387, 380, 514], interior: 'final' }
};

// Distribución por tramos (x = centro en el mundo). Variaciones para que las
// copias no se vean iguales: espejo, escala 0.9-1.1 y un tinte apenas distinto.
// piso: altura del mundo a la que queda el piso (muelles y chozas sobre el
// agua); sin piso, la base se apoya en el suelo.
const PROPS_NIVEL1 = [
  // Entrada (0-1800): primera cobertura y una torre con un enemigo arriba.
  { prop: 'barricada_llantas_turriles', x: 760 },
  { prop: 'torre_vigia', x: 1330, enemigo: true },
  // Río (1800-3840): muelle apoyado en la orilla, choza sobre el agua, otro
  // muelle, la canoa y una choza con los pilotes en la orilla derecha.
  { prop: 'muelle', x: 1978, piso: 528 },
  { prop: 'choza_palafito', x: 2480, piso: 528, tinte: 0xe4e8d8 },
  { prop: 'muelle', x: 2980, piso: 528, espejo: true, tinte: 0xe8e4dc },
  { prop: 'canoa', x: 3290 },
  { prop: 'choza_palafito', x: 3560, espejo: true, escala: 1.05 },
  // Aldea (3840-6000): casa y chozas alternadas, barricada y una torre.
  { prop: 'casa_destruida', x: 4150 },
  { prop: 'choza_palafito', x: 4620, espejo: true, escala: 0.95, tinte: 0xe0e6d4 },
  { prop: 'casa_ladrillo', x: 5800, escala: 0.85 }, // más chica: entra entre el peñón y la barricada
  { prop: 'barricada_llantas_turriles', x: 6364, espejo: true, escala: 0.9 },
  // Campamento (6000-8192): torre, casa grande y dos barricadas.
  { prop: 'torre_vigia', x: 6664, espejo: true, enemigo: true },
  { prop: 'casa_destruida', x: 6984, espejo: true, escala: 1.1, tinte: 0xe8e2d8 },
  { prop: 'barricada_llantas_turriles', x: 7334 },
  { prop: 'torre_vigia', x: 7634, escala: 0.9, tinte: 0xe4e8d8, enemigo: true },
  // Final (8192-9216): el edificio del jefe.
  { prop: 'edif_final', x: 9088, escala: 0.7 }
];

// Copias lejanas sin colisión, entre los árboles (parallax 0.6). x en la capa.
// Se evitan las x en las que pasarían por delante del hueco del río (se verían
// flotando): con 0.6, entre ~700 y ~3100.
const PROPS_FONDO = {
  x: 0.6, y: 0.4, escala: 0.6, alfa: 0.8, tinte: 0x9fa88a, base: 440,
  lista: [['torre_vigia', 300], ['choza_palafito', 3350], ['casa_destruida', 3900], ['torre_vigia', 4450], ['choza_palafito', 5000]]
};
// Fogatas de rebeldes en esa misma capa lejana (solo decorado, como en Metal
// Slug): la fogata con su humo, uno atizando y otro que cada `ciclo` ms sopla,
// el fuego se aviva y se aparta mirando. x en la capa (herramientas/fogata.py).
const FOGATAS_FONDO = { lista: [650, 4720], ciclo: 7000, brillo: 0xff9a3a };

// El peñón de la cueva: columnas del mapa (llenas de 'S' de arriba abajo).
// Por la boca de la Cueva de los Guácharos de la izquierda (caminando hasta el
// fondo, ver ENTRADA_CUEVA) se entra a la escena Cueva; al salir de ella se aparece del otro lado del peñón y sigue la otra
// mitad del mapa. La cámara no pasa del peñón: desde un lado nunca se ve el
// otro (el peñón es más angosto que la pantalla).
const CUEVA_NIVEL1 = { col: 39, columnas: 3 };

// Entrada a la Cueva de los Guácharos (assets/cueva/, de
// assets/fondos/cueva/cueva_front_back.jpeg con herramientas/entrada_cueva.py;
// van a escala 1). En px de la textura: ancho/alto de cueva_back y
// cueva_front, piso (y del piso) y boca (x donde empieza la abertura: cae
// sobre el borde del peñón). El fondo es la pared del JSON. Se camina hacia adentro (el piso baja en pendiente: la línea de
// assets/cueva/entrada_collision.json, editable con la tecla E) y en el fondo
// oscuro se pasa a la escena Cueva.
//   hueco    celdas del peñón sin colisión (adentro manda el JSON)
//   rocas    rocas sueltas: x respecto del borde del peñón (px del mundo),
//            delante o detrás del jugador
//   tunel    parallax del interior de la cueva (más lento: está más lejos)
//   oscuro   alpha del negro en el fondo; tinte: el del jugador al fondo
//   sonido   distancia (px) desde la que se oye y volumen máximo
const ENTRADA_CUEVA = {
  ancho: 646, alto: 241, piso: 229, boca: 245,
  hueco: [[39, 3], [40, 3], [41, 3]],
  // Celdas del peñón que no se dibujan: las tapa la colina (siguen sólidas).
  sinDibujo: [[39, 0], [40, 0], [41, 0], [39, 1], [40, 1], [41, 1], [39, 2], [40, 2], [41, 2]],
  // Rocas sueltas (x respecto de la boca): delante o detrás del jugador.
  rocas: [{ img: 'roca_1', x: -34, delante: true }, { img: 'roca_3', x: 30, delante: false }, { img: 'roca_2', x: 92, delante: true }],
  // Sobre el contorno de la ladera (x en cueva_back): helechos y piedras.
  ladera: [[40, 'helecho'], [78, 'piedra'], [112, 'helecho'], [150, 'piedra']],
  // Colina de arriba: x de su borde izquierdo (en la textura de la cueva),
  // parallax, árboles detrás de la cresta [dx, cuadro, escala] y lianas que
  // cuelgan sobre el arco [dx respecto de la boca, largo].
  // Colina de arriba (herramientas/entrada_cueva.py: cueva_colina, del mismo
  // ancho que la cueva): solape = px de su pie bajo el borde de arriba de la
  // cueva (fundido); árboles detrás [x, cuadro, escala] con el pie
  // `pieArboles` px bajo la cresta (los tapa la colina), su parallax, y las
  // lianas [dx desde la boca, largo].
  colina: {
    solape: 42, factor: 0.9, pieArboles: 60,
    arboles: [[260, 0, 1.0], [420, 2, 1.1], [580, 1, 0.95]],
    lianas: [[40, 0.4], [150, 0.55], [235, 0.35]]
  },


  tunel: 1,        // el interior va pegado a la cueva (con parallax el piso se partía)
  // oscuro: alpha del negro adentro (llega rápido, desde la misma boca: la
  // sombra del arco); tinte: el del jugador y los enemigos al fondo.
  oscuro: 0.96, tinte: 0x3a3a4a,
  sonido: { alcance: 720, volumen: 0.5 }
};

const ESCALERA = { velocidad: 160 };

// Sombras de contacto: elipse negra semitransparente pegada al suelo.
const SOMBRA = { alfa: 0.35, alto: 6, jugador: 58, rehen: 78, cholita: 64, npcPower: 74, alturaMaxima: 260 };

const CAMARA = { bajarJugador: 140 }; // px que el jugador queda por debajo del centro

class Nivel1 extends Phaser.Scene {
  constructor() {
    super('Nivel1');
  }

  preload() {
    const lvl1 = 'assets/fondos/lvl1/';
    this.load.image('selvaFondo', lvl1 + 'selva_fondo_288_calido.png');
    this.load.spritesheet('tilesSelva', lvl1 + 'tileset_selva_64_calido.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('arbolesLejos', lvl1 + 'arboles_300x200_lejanos.png', { frameWidth: 300, frameHeight: 200 });
    this.load.spritesheet('arbolesMedio', lvl1 + 'arboles_300x200_medio.png', { frameWidth: 300, frameHeight: 200 });
    this.load.spritesheet('arbolesCerca', lvl1 + 'arboles_300x200.png', { frameWidth: 300, frameHeight: 200 });
    this.load.json('ramasArboles', lvl1 + 'arboles_300x200_ramas.json');

    const gigante = { frameWidth: 200, frameHeight: 420 };
    this.load.spritesheet('gigantesLejos', lvl1 + 'arboles_gigantes_lejanos.png', gigante);
    this.load.spritesheet('gigantesMedio', lvl1 + 'arboles_gigantes_medio.png', gigante);
    this.load.spritesheet('gigantesFrente', lvl1 + 'arboles_gigantes_frente.png', gigante);

    // El lecho y el cuerpo del agua se dibujan en TerrenoNatural.dibujarRio.
    const agua = lvl1 + 'agua/';
    this.load.image('juncos', agua + 'juncos.png');
    this.load.image('hojaFlotante', agua + 'hoja_flotante.png');
    this.load.image('gota', agua + 'gota.png');

    Object.entries(PROPS).forEach(([nombre, datos]) =>
      this.load.image(nombre, `${datos.ruta || 'assets/fondos/Props_Aldea_Perfil/'}${nombre}.png`));
    this.load.image('cajaChica', lvl1 + 'caja_chica.png');
    this.load.spritesheet('fogata', 'assets/efectos/fogata.png', { frameWidth: 42, frameHeight: 45 });
    this.load.spritesheet('fogataHumo', 'assets/efectos/fogata_humo.png', { frameWidth: 22, frameHeight: 177 });
    this.load.spritesheet('rebeldes', 'assets/efectos/rebeldes.png', { frameWidth: 51, frameHeight: 33 });

    const celdaNpc = { frameWidth: NPC.ancho, frameHeight: NPC.alto };
    this.load.spritesheet('npcRescate', 'assets/personajes/npc/rescate_sheet.png', celdaNpc);
    this.load.spritesheet('npcSale', 'assets/personajes/npc/saledepantalla_sheet.png', celdaNpc);
    cargarSoldados(this); // Soldados.js
    this.load.spritesheet('cholita', 'assets/personajes/enemigos/cholita_sheet.png', { frameWidth: CHOLITA.ancho, frameHeight: CHOLITA.alto });
    this.load.spritesheet('cholitaRip', 'assets/personajes/enemigos/cholita_rip_sheet.png', { frameWidth: CHOLITA.rip.ancho, frameHeight: CHOLITA.rip.alto });
    this.load.spritesheet('cholitaQuemada', 'assets/personajes/enemigos/cholita_quemada_sheet.png', { frameWidth: CHOLITA.quemada.ancho, frameHeight: CHOLITA.quemada.alto });

    cargarMusica(this, 'nivel1');
    this.load.spritesheet('npcPower', 'assets/personajes/npc/npc_power_sheet.png', { frameWidth: NPC_POWER.ancho, frameHeight: NPC_POWER.alto });
    this.load.spritesheet('jugador', 'assets/personajes/jugador/1_sheet_calido.png', { frameWidth: 84, frameHeight: 84 });
    // Segundo jugador (herramientas/manfred_spritesheet.py).
    this.load.spritesheet('jugadorManfred', 'assets/personajes/jugador/manfred_sheet_calido.png', { frameWidth: 84, frameHeight: 84 });
    cargarTuto(this); // Tuto: piernas, torso y cuerpo entero (CuerpoTuto.js)
    // Entrada a la cueva (herramientas/entrada_cueva.py).
    ['cueva_back', 'cueva_front', 'cueva_tunel', 'cueva_hueco', 'cueva_colina', 'roca_1', 'roca_2', 'roca_3', 'roca_4'].forEach((n) => this.load.image('entrada_' + n, `assets/cueva/${n}.png`));
    this.load.json('entradaColision', 'assets/cueva/entrada_collision.json');
    // La barra espaciadora del cartel de mareado (Jugador.aturdirJugador).
    this.load.image('teclaEspacio', 'assets/mecanicas/espacio/espacio_tecla.png');
    cargarAves(this);  // guácharos de la boca de la cueva (Cueva.js)
    cargarArmas(this); // AK-47 y caja de armas (Armas.js); también para Interior
    cargarEfectos(this); // explosiones y sangre (Efectos.js); también para JefeFinal
    // Panel de vida (herramientas/vida_panel.py); lo usan también Interior y JefeFinal.
    this.load.spritesheet('panelVida', 'assets/panel/vida_sheet.png', { frameWidth: 455, frameHeight: 107 });
  }

  create() {
    this.filas = MAPA_NIVEL1.length;
    this.columnas = MAPA_NIVEL1[0].length;
    this.anchoNivel = this.columnas * TILE;
    this.altoNivel = this.filas * TILE;
    this.rnd = new Phaser.Math.RandomDataGenerator(['nivel1']);

    this.cameras.main.setBounds(0, 0, this.anchoNivel, this.altoNivel).setBackgroundColor(0xb9ab6a);
    // El tope de la cámara en el peñón se pone en el primer update (también
    // al reiniciar la escena después de morir: si no, quedaba sin tope).
    this.ladoPenon = null;
    this.physics.world.setBounds(0, 0, this.anchoNivel, this.altoNivel);

    this.crearTexturasProvisionales();
    this.crearParalaje();

    // Grupos de cuerpos estáticos.
    this.suelo = this.physics.add.staticGroup();       // piedra del mapa (S)
    this.obstaculos = this.physics.add.staticGroup();  // bloques sólidos (hoy ninguno: las barricadas son pasarelas)
    this.pasarelas = this.physics.add.staticGroup();   // un solo sentido: ramas y losas

    // Orden de dibujo: cuevas y árboles detrás del terreno, el agua delante del jugador.
    texturasDetallesSuelo(this); // matas, piedras, troncos... (TerrenoNatural.js)
    this.prepararRios();   // antes del terreno: bajo los ríos no hay bloques
    this.crearCuevas();
    this.crearArbolesJuego();
    this.crearProps();        // detrás del terreno: el puente tapa el techo de la choza
    this.crearCueva();
    this.crearTerreno();
    this.crearRios();
    this.crearCaminoTierra();
    this.crearDetallesSuelo();
    this.crearLuz();
    this.crearObstaculos();
    this.crearRecompensas();
    this.crearJugador();
    this.crearCajasArmas();
    this.crearEnemigos();
    this.crearPrimerPlano();
    this.crearHUD();

    this.teclas = this.input.keyboard.createCursorKeys();
    this.teclasExtra = this.input.keyboard.addKeys('A,D,W,S,SPACE,J,X,TAB');

    this.crearFlechaPuerta();
    this.crearEditor(); // Cueva.js: editor de colisión (tecla E) para la entrada a la cueva
    this.events.on('wake', (sys, datos) => this.volverDeInterior(datos));

    tocarMusica(this, 'nivel1');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.animacionEntrada();
  }

  // ---------------------------------------------------------------------------
  // Puertas e interiores
  // ---------------------------------------------------------------------------

  crearFlechaPuerta() {
    this.flechaPuerta = this.add.triangle(0, 0, 0, 14, 10, 0, 20, 14, 0xffd23f)
      .setStrokeStyle(2, 0x2a1a05).setDepth(20).setVisible(false);
    this.tweens.add({ targets: this.flechaPuerta, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
    this.puertaDesde = 0;
  }

  // Puerta frente a la que está parado el jugador (pies a la altura de su umbral).
  puertaEn(sprite) {
    const b = sprite.body;
    return this.puertas.find((p) => b.center.x > p.x0 - 6 && b.center.x < p.x1 + 6 && Math.abs(b.bottom - p.abajo) < 14) || null;
  }

  // Fade a negro y el interior como sala aparte; este nivel se duerme
  // (conserva todo) hasta volver.
  entrarA(puerta) {
    this.estado = 'interior';
    this.puertaActual = puerta;
    this.flechaPuerta.setVisible(false);
    this.jugador.setVelocity(0).anims.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    if (puerta.interior === 'final') {
      // El edificio final: la pelea con el jefe es una escena aparte y no se vuelve.
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('JefeFinal'));
      return;
    }
    if (puerta.interior === 'cueva') {
      // La cueva: otro nivel (Cueva.js); al terminarlo se vuelve por la otra boca.
      // Si muere adentro, la cueva vuelve a empezar con los rehenes de antes.
      this.registry.set('cuevaBase', { rehenes: this.registry.get('rehenes') });
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.launch('Cueva');
        this.scene.sleep();
      });
      return;
    }
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const tomada = !!this.registry.get('interiores')[puerta.id];
      this.scene.launch('Interior', { tipo: puerta.interior, id: puerta.id, recompensaTomada: tomada });
      this.scene.sleep();
    });
  }

  // Vuelve frente a la misma puerta, mirando hacia afuera (de la cueva, por la
  // boca del otro lado del peñón).
  volverDeInterior(datos) {
    const p = datos && datos.cueva ? this.salidaCueva : this.puertaActual;
    if (datos && datos.recompensa) this.registry.set('interiores', { ...this.registry.get('interiores'), [datos.id]: true });
    const j = this.jugador;
    const x = (p.x0 + p.x1) / 2;
    if (datos && datos.cueva) {
      j.setFlipX(false);
      // Sale de la cueva: polvo a sus pies.
      const humo = this.add.particles(j.x, p.abajo - 10, 'fx_humo', {
        speedX: { min: -90, max: 90 }, speedY: { min: -50, max: -10 }, lifespan: 800,
        scale: { start: 2, end: 4.5 }, alpha: { start: 0.55, end: 0 }, tint: 0xb8a888, emitting: false
      }).setDepth(11);
      humo.explode(12);
      this.time.delayedCall(900, () => humo.destroy());
    }
    // reset() también actualiza la posición anterior del cuerpo: si solo se
    // moviera el cuerpo, el piso one-way de la choza no lo reconocería.
    // Los pies van 30 px de arte bajo el centro del sprite (celda de 84x84).
    // No se usa j.body.bottom: al despertar la escena todavía es el del cuadro
    // en que se entró y podía dejarlo hundido en el piso (y se caía a través
    // de la roca al volver de la cueva).
    this.posturaJugador(false, false, false); // de pie: caja de colisión normal
    j.body.reset(x, p.abajo - 30 * ESCALA); // pies en el umbral
    j.setVelocity(0).setFrame(0);
    this.input.keyboard.resetKeys();
    this.puertaDesde = this.game.loop.time + 500; // la tecla ARRIBA puede seguir apretada
    this.rampaActual = null;
    this.trepando = null;
    j.body.setAllowGravity(true);
    this.estado = 'control';
    this.actualizarHUD();
    this.cameras.main.fadeIn(datos && datos.cueva ? 400 : 300, 0, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // Mapa
  // ---------------------------------------------------------------------------

  // Carácter de una celda. Fuera del mapa: piedra abajo, aire a los costados y arriba.
  celda(col, fila) {
    if (fila >= this.filas) return 'S';
    if (fila < 0 || col < 0 || col >= this.columnas) return '.';
    return MAPA_NIVEL1[fila][col];
  }

  // Recorre todas las celdas con ese carácter (o lista de caracteres).
  cadaCelda(caracteres, fn) {
    for (let fila = 0; fila < this.filas; fila++) {
      for (let col = 0; col < this.columnas; col++) {
        if (caracteres.includes(MAPA_NIVEL1[fila][col])) fn(col, fila);
      }
    }
  }

  // Tramos horizontales seguidos de un carácter: [{ fila, desde, hasta }].
  // excluir(col, fila): celdas que no cuentan (por ejemplo, el lecho de un río).
  tramos(caracter, excluir = () => false) {
    const lista = [];
    for (let fila = 0; fila < this.filas; fila++) {
      let desde = null;
      for (let col = 0; col <= this.columnas; col++) {
        const es = col < this.columnas && MAPA_NIVEL1[fila][col] === caracter && !excluir(col, fila);
        if (es && desde === null) desde = col;
        if (!es && desde !== null) {
          lista.push({ fila, desde, hasta: col - 1 });
          desde = null;
        }
      }
    }
    return lista;
  }

  // Piedra que bloquea: S que no sea lecho de río.
  esSolido(col, fila) {
    return this.celda(col, fila) === 'S' && !this.esLecho(col, fila);
  }

  esLecho(col, fila) {
    return this.celdasLecho.has(`${col},${fila}`);
  }

  // Tile del tileset a x2 con la esquina superior izquierda en la celda.
  tile(col, fila, frame, textura = 'tilesSelva') {
    return this.add.image(col * TILE, fila * TILE, textura, frame).setOrigin(0).setScale(ESCALA);
  }

  // ---------------------------------------------------------------------------
  // Terreno: piedra, rampas y plataformas de un solo sentido
  // ---------------------------------------------------------------------------

  crearTerreno() {
    const esPiedra = (c) => c === 'S' || RAMPAS[c];

    this.cadaCelda('S', (col, fila) => {
      if (this.esLecho(col, fila)) return; // bajo el río: lo dibuja dibujarRio
      // La entrada a la cueva: lo que tapa la colina y el hueco no
      // se dibujan; abajo del hueco sigue el piso de tierra de afuera (no muro).
      const enLista = (lista, c, f) => lista.some(([a, b]) => a === c && b === f);
      if (enLista(ENTRADA_CUEVA.sinDibujo, col, fila) || enLista(ENTRADA_CUEVA.hueco, col, fila)) return;
      const arriba = this.celda(col, fila - 1);
      const borde = !esPiedra(arriba) || enLista(ENTRADA_CUEVA.hueco, col, fila - 1); // cara superior a la vista
      const izq = !esPiedra(this.celda(col - 1, fila));
      const der = !esPiedra(this.celda(col + 1, fila));
      const frame = borde
        ? (izq ? T.pisoIzq : der ? T.pisoDer : this.rnd.pick(T.pisoMedio))
        : (izq ? T.muroIzq : der ? T.muroDer : this.rnd.pick(T.muro));
      this.tile(col, fila, frame);
    });

    this.crearPendientes();

    // Un cuerpo por tramo horizontal de piedra (menos cuerpos que uno por celda).
    // Bajo el río no hay bloques; en el hueco de la cueva tampoco (manda el JSON de la entrada).
    const hueco = (col, fila) => ENTRADA_CUEVA.hueco.some(([c, f]) => c === col && f === fila);
    this.tramos('S', (col, fila) => this.esLecho(col, fila) || hueco(col, fila)).forEach(({ fila, desde, hasta }) => {
      const ancho = (hasta - desde + 1) * TILE;
      this.suelo.add(this.add.zone(desde * TILE + ancho / 2, fila * TILE + SUELO_Y + TILE / 2, ancho, TILE));
    });

    // Losas y puentes de un solo sentido.
    this.tramos('P').forEach(({ fila, desde, hasta }) => {
      for (let col = desde; col <= hasta; col++) {
        const frame = col === desde ? T.plataformaIzq : col === hasta ? T.plataformaDer : T.plataformaMedio;
        this.tile(col, fila, frame);
      }
      const ancho = (hasta - desde + 1) * TILE;
      this.agregarPasarela(this.add.zone(desde * TILE + ancho / 2, fila * TILE + SUELO_Y + 6, ancho, 12));
    });
  }

  // Pared oscura detrás de las celdas vacías que tienen piedra encima (cuevas),
  // con raíces, grietas, musgo y piedras salientes encima (TerrenoNatural.js).
  crearCuevas() {
    const columnas = new Map(); // col -> [filaMin, filaMax]
    for (let col = 0; col < this.columnas; col++) {
      let techo = false;
      for (let fila = 0; fila < this.filas; fila++) {
        const c = this.celda(col, fila);
        if (c === 'S') techo = true;
        else if (techo && !RAMPAS[c]) {
          this.tile(col, fila, this.rnd.pick(T.muro)).setTint(0x5a5040);
          const [a, b] = columnas.get(col) || [fila, fila];
          columnas.set(col, [Math.min(a, fila), Math.max(b, fila)]);
        }
      }
    }
    // Columnas seguidas forman una cueva; cada una se decora con su semilla.
    const cols = [...columnas.keys()].sort((a, b) => a - b);
    const arte = 64; // tamaño de la celda en píxeles de arte
    let inicio = 0;
    for (let i = 1; i <= cols.length; i++) {
      if (i < cols.length && cols[i] === cols[i - 1] + 1) continue;
      const grupo = cols.slice(inicio, i);
      const filas = grupo.flatMap((c) => columnas.get(c));
      const region = {
        x0: grupo[0] * arte, x1: (grupo[grupo.length - 1] + 1) * arte,
        y0: Math.min(...filas) * arte, y1: (Math.max(...filas) + 1) * arte
      };
      const { x, y } = dibujarCueva(this, `cueva${inicio}`, region, `cueva-${grupo[0]}`);
      this.add.image(x * ESCALA, y * ESCALA, `cueva${inicio}`).setOrigin(0).setScale(ESCALA);
      inicio = i;
    }
  }

  // Agrupa las celdas de rampa que forman una misma pendiente (seguidas y con
  // la línea continua) y dibuja cada una con TerrenoNatural.dibujarPendiente.
  crearPendientes() {
    const celdas = [];
    this.cadaCelda(Object.keys(RAMPAS), (col, fila) => celdas.push({ col, fila, rampa: RAMPAS[this.celda(col, fila)] }));
    celdas.sort((a, b) => a.col - b.col);
    const yEn = (c, xLocal) => c.fila * TILE + c.rampa.altura(xLocal) + SUELO_Y;

    const cadenas = [];
    celdas.forEach((c) => {
      const cadena = cadenas.find((k) => {
        const ultima = k[k.length - 1];
        return ultima.col === c.col - 1 && Math.abs(yEn(ultima, TILE) - yEn(c, 0)) < 1;
      });
      if (cadena) cadena.push(c);
      else cadenas.push([c]);
    });

    // En píxeles de arte (la mitad de la pantalla).
    const arte = TILE / ESCALA;
    cadenas.forEach((cadena, i) => {
      const primera = cadena[0];
      const celdaEn = (xa) => cadena[Phaser.Math.Clamp(Math.floor(xa / arte) - primera.col, 0, cadena.length - 1)];
      const tramo = {
        x0: primera.col * arte,
        x1: (cadena[cadena.length - 1].col + 1) * arte,
        superficie: (xa) => { const c = celdaEn(xa); return yEn(c, xa * ESCALA - c.col * TILE) / ESCALA; },
        fondo: (xa) => (celdaEn(xa).fila + 1) * arte
      };
      const { x, y } = dibujarPendiente(this, `pendiente${i}`, tramo, `pendiente-${primera.col}-${primera.fila}`);
      this.add.image(x * ESCALA, y * ESCALA, `pendiente${i}`).setOrigin(0).setScale(ESCALA);
    });
  }

  // ---------------------------------------------------------------------------
  // Rampas (a mano, Arcade no tiene pendientes)
  // ---------------------------------------------------------------------------

  // Superficie de una rampa en la columna de x, cerca de la altura de los pies.
  superficieRampa(x, pies) {
    const col = Math.floor(x / TILE);
    const fila = Math.floor((pies - SUELO_Y - 1) / TILE);
    for (const f of [fila, fila + 1]) {
      const rampa = RAMPAS[this.celda(col, f)];
      if (rampa) return { y: f * TILE + rampa.altura(x - col * TILE) + SUELO_Y, rampa };
    }
    // El lecho de un río también es una superficie curva.
    const rio = this.rios.find((r) => x >= r.x0 && x < r.x1);
    if (rio) return { y: rio.lecho(x), rampa: LECHO_RIO };
    return null;
  }

  // Pega al personaje (jugador o enemigo) a la pendiente: ajusta su y a la
  // superficie y anula la velocidad vertical. Devuelve la rampa o null.
  // venia: si estaba en el suelo el cuadro anterior (así sigue las bajadas).
  // Ojo: en update() el sprite todavía tiene la posición del paso anterior;
  // la actual es la del cuerpo. Por eso se lee y se mueve solo el cuerpo
  // (Phaser copia ese movimiento al sprite al final del cuadro).
  pegarARampa(sprite, venia) {
    const cuerpo = sprite.body;
    if (cuerpo.velocity.y < 0) return null; // está saltando
    const sup = this.superficieRampa(cuerpo.center.x, cuerpo.bottom);
    if (!sup) return null;
    const tolerancia = venia ? 40 : 2;
    // Bajo el lecho de un río no hay nada sólido: si quedó por debajo, sube siempre.
    const hundido = sup.rampa === LECHO_RIO ? Infinity : 30;
    if (cuerpo.bottom < sup.y - tolerancia || cuerpo.bottom > sup.y + hundido) return null;
    cuerpo.y += sup.y - cuerpo.bottom;
    cuerpo.velocity.y = 0;
    return sup.rampa;
  }

  // En una rampa se ignora el suelo de piedra (los bloques vecinos tienen
  // esquinas que frenarían al personaje). Para no meterse dentro de una pared
  // al subir o bajar, se revisa el mapa a la altura de los pies.
  // xAnterior: posición x del cuerpo en el cuadro anterior.
  frenarContraMuro(sprite, xAnterior) {
    const cuerpo = sprite.body;
    const col = Math.floor(cuerpo.center.x / TILE);
    const fila = Math.floor((cuerpo.bottom - SUELO_Y - 2) / TILE);
    if (this.esSolido(col, fila)) {
      cuerpo.x = xAnterior;
      cuerpo.velocity.x = 0;
    }
  }

  // Al pasar de una rampa (o del lecho) a piedra plana, apoya los pies justo
  // sobre la piedra. Si quedaran un píxel adentro, Arcade ve dos cuerpos ya
  // encimados sin movimiento vertical y no los separa: el personaje se traba.
  asentarEnPiedra(sprite) {
    const cuerpo = sprite.body;
    const col = Math.floor(cuerpo.center.x / TILE);
    const fila = Math.floor((cuerpo.bottom - SUELO_Y) / TILE);
    const dentro = cuerpo.bottom - (fila * TILE + SUELO_Y);
    if (cuerpo.velocity.y >= 0 && this.esSolido(col, fila) && dentro < 12) {
      cuerpo.y -= dentro;
      cuerpo.velocity.y = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Plataformas de un solo sentido
  // ---------------------------------------------------------------------------

  // Solo chocan por arriba: se atraviesan saltando desde abajo.
  agregarPasarela(zona) {
    this.pasarelas.add(zona);
    Object.assign(zona.body.checkCollision, { down: false, left: false, right: false });
  }

  // processCallback: la pasarela sostiene solo si el personaje viene cayendo
  // desde arriba y no pidió bajarse (↓ + salto).
  puedePisar(personaje, tramo) {
    if (personaje === this.jugador && this.time.now < this.bajandoHasta) return false;
    const pies = personaje.body.prev.y + personaje.body.height;
    return personaje.body.velocity.y >= 0 && pies <= tramo.body.top + 10;
  }

  // ---------------------------------------------------------------------------
  // Árboles trepables
  // ---------------------------------------------------------------------------

  // Cada columna con T es un árbol. Su base es la primera celda sólida o
  // plataforma debajo del tronco; sus ramas gruesas son pasarelas.
  crearArbolesJuego() {
    const ramas = this.cache.json.get('ramasArboles');
    const depurar = ARBOLES_JUEGO.verRamas && this.add.graphics().setDepth(30).lineStyle(2, 0xff0000);
    const columnas = [...new Set(this.posiciones('T').map((p) => p.col))];

    columnas.forEach((col, i) => {
      let fila = 0;
      while (fila < this.filas && !'SP'.includes(this.celda(col, fila))) fila++;
      const base = fila * TILE + ARBOLES_JUEGO.hundido;
      const x = col * TILE + TILE / 2;
      const arbol = ARBOLES_JUEGO.variantes[i % ARBOLES_JUEGO.variantes.length];
      const espejado = i % 2 === 1;
      this.add.image(x, base, 'arbolesCerca', arbol).setOrigin(0.5, 1).setScale(ESCALA).setFlipX(espejado);

      const izquierda = x - 150 * ESCALA;
      const arriba = base - 200 * ESCALA;
      ramas[arbol].forEach((camino) => {
        for (let k = 0; k < camino.length - 1; k++) {
          let [ax, ay] = camino[k];
          let [bx, by] = camino[k + 1];
          if (espejado) { ax = 300 - ax; bx = 300 - bx; }
          const x0 = izquierda + Math.min(ax, bx) * ESCALA;
          const ancho = Math.abs(bx - ax) * ESCALA;
          const y = arriba + Math.min(ay, by) * ESCALA;
          this.agregarPasarela(this.add.zone(x0 + ancho / 2, y + ARBOLES_JUEGO.grosorRama / 2, ancho, ARBOLES_JUEGO.grosorRama));
          if (depurar) depurar.lineBetween(x0, y, x0 + ancho, y);
        }
      });
    });
  }

  // Centro de cada celda con ese carácter.
  posiciones(caracter) {
    const lista = [];
    this.cadaCelda(caracter, (col, fila) => lista.push({ col, fila, x: col * TILE + TILE / 2, abajo: (fila + 1) * TILE + SUELO_Y }));
    return lista;
  }

  // ---------------------------------------------------------------------------
  // Obstáculos, rehenes, power-ups y meta
  // ---------------------------------------------------------------------------

  // Las marcas apiladas en una columna son cajas o sacos uno encima del otro.
  crearObstaculos() {
    this.posiciones(Object.keys(MARCAS_OBSTACULO))
      .filter(({ col, fila }) => !MARCAS_OBSTACULO[this.celda(col, fila + 1)]) // la de más abajo de cada pila
      .forEach(({ col, fila, x }) => {
        let fondo = (fila + 1) * TILE + SUELO_Y + HUNDIDO;
        for (let f = fila; MARCAS_OBSTACULO[this.celda(col, f)]; f--) {
          const ob = OBSTACULOS[MARCAS_OBSTACULO[this.celda(col, f)]];
          const [ancho, alto] = ob.tam.map((v) => v * ESCALA);
          const [x0, y0, x1, y1] = ob.caja.map((v) => v * ESCALA);
          if (f === fila) this.sombraBase(x, fondo, (x1 - x0) * 0.95, 1.5); // solo la de abajo toca el suelo
          this.add.image(x, fondo, ob.textura, ob.frame).setOrigin(0.5, 1).setScale(ESCALA).setDepth(2);
          const izq = x - ancho / 2;
          const arriba = fondo - alto;
          this.agregarPasarela(this.add.zone(izq + (x0 + x1) / 2, arriba + y0 + 3, x1 - x0, 6));
          fondo = arriba + y0; // el siguiente se apoya encima
        }
      });
  }

  // Cajas de armas (W): se abren a balazos o tocándolas (Armas.js).
  crearCajasArmas() {
    const lugares = this.posiciones('W').sort((a, b) => a.x - b.x);
    this.cajasArmas = lugares.map(({ x, abajo }, i) =>
      crearCajaArmas(this, x, abajo + HUNDIDO, CAJAS_NIVEL1[i % CAJAS_NIVEL1.length]));
    this.physics.add.overlap(this.balas, this.cajasArmas, (bala, caja) => {
      if (this.impactoBala(bala)) return; // cohete o granada: explota (Jugador.js)
      bala.destroy();
      golpearCaja(this, caja); // con una explosión chica (Armas.js)
    });
  }

  // Explosiones (cohete, granada), el escopetazo y el machete (cuerpo = true):
  // las cholitas en el radio caen (quemadas si fue una explosión, con sangre si
  // no) y las cajas se abren (Jugador.js: explotarProyectil, escopetazo, golpeCuerpo).
  danoEnArea(x, y, radio, dano, cuerpo = false) {
    this.cholitas.getChildren().forEach((c) => {
      const estado = c.getData('estado');
      if (estado !== 'ronda' && estado !== 'ataque') return;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y - CHOLITA.alto * ESCALA / 2) > radio + 20) return;
      if (cuerpo) sangrar(this, c.x, c.y - CHOLITA.alto * ESCALA / 2, c.x < x ? -1 : 1);
      this.vencerCholita(c, x, !cuerpo);
    });
    this.soldadosEnArea(x, y, radio, cuerpo); // Soldados.js
    this.cajasArmas.forEach((caja) => {
      if (!caja.active || Phaser.Math.Distance.Between(x, y, caja.x, caja.y - 40) > radio + 30) return;
      if (cuerpo) golpearCaja(this, caja);
      else abrirCaja(this, caja);
    });
  }

  crearRecompensas() {
    this.registry.set('vida', VIDA.mitades); // el nivel empieza con la vida llena (Jugador.js)
    reiniciarArmas(this);                     // y solo con la pistola (Armas.js)
    this.registry.set('cajas', {});           // cajas de armas abiertas en los interiores
    this.registry.set('rehenes', 0);
    this.registry.set('powerups', 0);
    // Cada interior trae una recompensa: rehén en la casa, power-up en la choza
    // (el edificio final no es un interior de Interior.js: no cuenta).
    this.registry.set('interiores', {});
    const recompensas = (tipo) => this.puertas.filter((p) => INTERIORES[p.interior] && INTERIORES[p.interior].recompensa.tipo === tipo).length;
    this.totalRehenes = this.posiciones('H').length + recompensas('rehen') + CUEVA.rehenes.length; // + los de la cueva
    this.totalPowerups = this.posiciones('*').length + this.posiciones('N').length + recompensas('powerup');

    // Rehenes atados: caen hasta el suelo, la rama o la losa de abajo y
    // esperan al jugador forcejeando con las sogas.
    this.crearAnimacionesNpc();
    this.rehenes = this.physics.add.group({ allowGravity: true });
    this.posiciones('H').forEach(({ x, abajo }) => {
      const rehen = this.rehenes.create(x, abajo - 10, 'npcRescate', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.5);
      rehen.body.setSize(NPC.cuerpo.ancho, NPC.cuerpo.alto).setOffset((NPC.ancho - NPC.cuerpo.ancho) / 2, NPC.alto - NPC.cuerpo.alto);
      rehen.setData('estado', 'atado');
      const sombra = this.crearSombra(SOMBRA.rehen, 9.3);
      rehen.setData('sombra', sombra);
      rehen.once('destroy', () => sombra.destroy());
      rehen.play({ key: 'npc_atado', startFrame: this.rnd.between(0, 5) }); // no todos al mismo tiempo
    });
    // En una rampa (al huir) se ignora la piedra, igual que con el jugador.
    this.physics.add.collider(this.rehenes, this.suelo, null, (r) => !r.getData('rampa'));
    this.physics.add.collider(this.rehenes, this.obstaculos);
    this.physics.add.collider(this.rehenes, this.pasarelas, null, (r, tramo) => this.puedePisar(r, tramo));

    this.crearNpcsPower();

    // Power-ups: flotan donde están marcados.
    this.powerups = this.physics.add.staticGroup();
    this.posiciones('*').forEach(({ x, abajo }) => {
      const p = this.powerups.create(x, abajo - 40, 'powerup').setScale(ESCALA * 1.5).refreshBody();
      this.tweens.add({ targets: p, y: p.y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    // Meta.
    const [meta] = this.posiciones('F');
    if (meta) this.meta = this.physics.add.staticImage(meta.x, meta.abajo + HUNDIDO, 'meta').setOrigin(0.5, 1).setScale(ESCALA).refreshBody();
  }

  // Dibujos provisionales (power-up y meta) hasta tener los sprites.
  crearTexturasProvisionales() {
    const pixeles = (clave, ancho, alto, filas, colores) => {
      if (this.textures.exists(clave)) return;
      const g = this.make.graphics({ add: false });
      filas.forEach((fila, y) => [...fila].forEach((c, x) => {
        if (colores[c] !== undefined) g.fillStyle(colores[c]).fillRect(x, y, 1, 1);
      }));
      g.generateTexture(clave, ancho, alto);
      g.destroy();
    };
    // Power-up: caja dorada con una "P" (14x14).
    pixeles('powerup', 14, 14, [
      '.kkkkkkkkkkkk.', 'kyyyyyyyyyyyyk', 'kyookkkkkooyyk', 'kyookyyyykoyyk', 'kyookyyyykoyyk',
      'kyookkkkkooyyk', 'kyookoooooooyk', 'kyookoooooooyk', 'kyookoooooooyk', 'kyooooooooooyk',
      'kyyyyyyyyyyyyk', 'kooooooooooook', 'kkkkkkkkkkkkkk', '..............'
    ], { k: 0x3a2405, y: 0xffd23f, o: 0xd08a20 });
    // Meta: poste con la bandera de Bolivia (20x40).
    const filasMeta = [];
    for (let y = 0; y < 40; y++) {
      let fila = '.k';
      if (y < 15) fila += (y < 5 ? 'r' : y < 10 ? 'a' : 'v').repeat(16) + 'k';
      fila = fila.padEnd(20, '.');
      filasMeta.push(y === 0 || y === 15 ? '.k' + 'k'.repeat(17) + '.' : fila);
    }
    pixeles('meta', 20, 40, filasMeta, { k: 0x2a1d10, r: 0xd52b1e, a: 0xf9e300, v: 0x007934 });
  }

  // ---------------------------------------------------------------------------
  // Ríos (ruta de abajo)
  // ---------------------------------------------------------------------------

  // Geometría de cada río (en píxeles de pantalla), antes de dibujar el
  // terreno: qué celdas S son lecho, la cuenca del fondo y hasta dónde llega
  // el agua contra las orillas.
  prepararRios() {
    this.celdasLecho = new Set();
    this.rios = this.tramos('A').map(({ fila, desde, hasta }, i) => {
      for (let col = desde; col <= hasta; col++) {
        for (let f = fila + 1; f < this.filas; f++) this.celdasLecho.add(`${col},${f}`);
      }
      const x0 = desde * TILE;
      const x1 = (hasta + 1) * TILE;
      const fondo = (fila + 1) * TILE + SUELO_Y;
      const superficie = fondo - RIO.profundidad;

      // Orilla de barro en las puntas que dan contra suelo plano (no rampa ni muro).
      const orillas = [];
      for (const [col, centro] of [[desde - 1, x0 + RIO.orilla.ancho], [hasta + 1, x1 - RIO.orilla.ancho]]) {
        const vecino = this.celda(col, fila);
        if (!RAMPAS[vecino] && vecino !== 'S') orillas.push(centro);
      }
      const semilla = i * 1.7;
      const lecho = (x) => {
        const t = Phaser.Math.Clamp((x - x0) / (x1 - x0), 0, 1);
        const cuenca = Math.sin(Math.PI * t);
        let y = fondo + RIO.hondo * Math.pow(cuenca, 0.8) +
          cuenca * (6 * Math.sin(x * 0.013 + semilla) + 4 * Math.sin(x * 0.037 + semilla * 2));
        orillas.forEach((c) => {
          const d = Math.abs(x - c);
          if (d < RIO.orilla.ancho) y -= RIO.orilla.alto * Math.cos((d / RIO.orilla.ancho) * Math.PI / 2) ** 2;
        });
        return y;
      };
      const rio = { x0, x1, fondo, superficie, lecho, orillas, hojas: [] };

      // El agua llega hasta donde el suelo (lecho, rampa u orilla) sale de ella.
      const centro = (x0 + x1) / 2;
      const avanzar = (paso) => {
        let x = centro;
        while (Math.abs(x - centro) < (x1 - x0) / 2 + 2 * TILE && this.alturaSuelo(x + paso, rio) > superficie + 1) x += paso;
        return x;
      };
      rio.ax0 = avanzar(-2);
      rio.ax1 = avanzar(2);
      return rio;
    });
  }

  // Altura del suelo en x cerca del río: el lecho dentro del río, si no la
  // primera rampa o piedra debajo de la superficie del agua.
  alturaSuelo(x, rio) {
    if (x >= rio.x0 && x < rio.x1) return rio.lecho(x);
    const col = Math.floor(x / TILE);
    for (let fila = Math.floor((rio.superficie - TILE) / TILE); fila < this.filas; fila++) {
      const c = this.celda(col, fila);
      if (RAMPAS[c]) return fila * TILE + RAMPAS[c].altura(x - col * TILE) + SUELO_Y;
      if (c === 'S') return fila * TILE + SUELO_Y;
    }
    return this.altoNivel;
  }

  crearRios() {
    texturaJacinto(this, 'jacinto');
    const a = (v) => v / ESCALA; // a píxeles de arte

    this.rios.forEach((rio, i) => {
      // Lecho, cuerpo del agua y rocas que asoman (TerrenoNatural.dibujarRio).
      const dibujo = dibujarRio(this, `rio${i}`, {
        x0: a(rio.x0), x1: a(rio.x1), ax0: a(rio.ax0), ax1: a(rio.ax1),
        superficie: a(rio.superficie), fondo: a(this.altoNivel),
        lecho: (x) => a(rio.lecho(x * ESCALA)), suelo: (x) => a(this.alturaSuelo(x * ESCALA, rio))
      }, `rio-${i}`);
      const pos = (img) => img.setOrigin(0).setScale(ESCALA);
      pos(this.add.image(dibujo.x * ESCALA, dibujo.y * ESCALA, `rio${i}-lecho`));
      pos(this.add.image(dibujo.x * ESCALA, dibujo.y * ESCALA, `rio${i}-agua`)).setDepth(11);
      pos(this.add.image(dibujo.x * ESCALA, dibujo.y * ESCALA, `rio${i}-rocas`)).setDepth(11.5);
      rio.rocas = dibujo.rocas.map((r) => ({ x: r.x * ESCALA, r: r.r * ESCALA }));

      // Juncos en las dos orillas, delante del jugador.
      for (const [x, espejo] of [[rio.ax0 - 16, false], [rio.ax1 + 16, true]]) {
        this.add.image(x, this.alturaSuelo(x, rio) + 8, 'juncos').setOrigin(0.5, 1).setScale(ESCALA).setDepth(13).setFlipX(espejo);
      }

      // Jacintos de agua que se mecen y hojas que bajan con la corriente.
      const ancho = rio.ax1 - rio.ax0;
      for (let k = 0; k < Math.max(2, Math.round(ancho / 380)); k++) {
        const jacinto = this.add.image(rio.ax0 + this.rnd.between(60, ancho - 60), rio.superficie + 6, 'jacinto')
          .setOrigin(0.5, 1).setScale(ESCALA).setDepth(12).setFlipX(k % 2 === 1);
        this.tweens.add({ targets: jacinto, y: '+=2', angle: 2, duration: 1200 + k * 250, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        rio.hojas.push(this.add.image(rio.ax0 + this.rnd.between(0, ancho), rio.superficie + 2, 'hojaFlotante')
          .setScale(ESCALA).setDepth(12).setFlipX(k % 2 === 1));
      }
    });

    // Superficie animada (olas, brillos y espuma): se redibuja cada cuadro.
    this.superficieAgua = this.add.graphics().setDepth(12);

    this.salpicaduras = this.add.particles(0, 0, 'gota', {
      speed: { min: 90, max: 260 }, angle: { min: 225, max: 315 }, gravityY: 900,
      lifespan: 650, scale: ESCALA, alpha: { start: 1, end: 0.3 }, emitting: false
    }).setDepth(13);
    // Espuma chica alrededor de las piernas al caminar en el agua.
    this.espuma = this.add.particles(0, 0, 'gota', {
      speed: { min: 15, max: 60 }, angle: { min: 200, max: 340 }, gravityY: 350,
      lifespan: 380, scale: { start: ESCALA * 0.7, end: 0.4 }, alpha: { start: 0.9, end: 0 }, emitting: false
    }).setDepth(13);
  }

  // Río en el que está el personaje (con los pies bajo la superficie), o null.
  rioEn(sprite) {
    const x = sprite.body.center.x;
    return this.rios.find((r) => x > r.ax0 && x < r.ax1 && sprite.body.bottom > r.superficie + 10) || null;
  }

  efectosAgua(rio, caminando) {
    const j = this.jugador;
    const enAgua = !!rio;
    const r = rio || this.ultimoRio;
    if (enAgua !== this.estabaEnAgua && r) {
      const fuerte = enAgua && j.body.velocity.y > 250;
      this.salpicaduras.explode(fuerte ? 22 : 10, j.x, r.superficie);
      this.onda(j.x, r.superficie, fuerte ? 4 : 2.5);
    }
    this.estabaEnAgua = enAgua;
    if (rio) this.ultimoRio = rio;
    if (rio && caminando && this.time.now > (this.proximaOnda || 0)) {
      this.onda(j.x + (j.flipX ? 14 : -14), rio.superficie, 2);
      this.proximaOnda = this.time.now + 260;
    }
    if (rio && caminando && this.time.now > (this.proximaEspuma || 0)) {
      this.espuma.explode(3, j.x + this.rnd.between(-12, 12), rio.superficie);
      this.proximaEspuma = this.time.now + 90;
    }
  }

  onda(x, y, tamano) {
    const anillo = this.add.ellipse(x, y + 2, 18, 5).setStrokeStyle(2, 0xdde8c0).setDepth(12);
    this.tweens.add({
      targets: anillo, scaleX: tamano * 1.6, scaleY: tamano, alpha: 0, duration: 650,
      onComplete: () => anillo.destroy()
    });
  }

  // Superficie: línea ondulada de 1 px de arte con brillos horizontales que
  // corren y espuma que titila contra las orillas y alrededor de las rocas.
  // Solo se dibujan los ríos que están en pantalla.
  animarRios(delta) {
    const g = this.superficieAgua.clear();
    const t = this.time.now;
    const cam = this.cameras.main;
    const paso = (RIO.corriente * delta) / 16;

    this.rios.forEach((rio) => {
      rio.hojas.forEach((hoja) => {
        hoja.x += paso * ESCALA;
        hoja.y = rio.superficie + 2 + Math.sin((t + hoja.x * 7) / 400) * 1.5;
        if (hoja.x > rio.ax1 - 30) hoja.x = rio.ax0 + 30;
      });
      if (rio.ax1 < cam.scrollX || rio.ax0 > cam.scrollX + cam.width) return;

      const ax0 = Math.ceil(rio.ax0 / ESCALA);
      const ax1 = Math.floor(rio.ax1 / ESCALA);
      const sup = rio.superficie / ESCALA;
      const destello = Math.floor(t / 60);
      for (let x = ax0; x < ax1; x++) {
        const ola = Math.round(Math.sin(t * 0.0025 + x * 0.21) * 0.8 + Math.sin(t * 0.0017 - x * 0.09) * 0.7);
        const y = sup + ola;
        g.fillStyle(0xc4d6aa, 0.9).fillRect(x * ESCALA, y * ESCALA, ESCALA, ESCALA);
        g.fillStyle(0x8ca06e, 0.7).fillRect(x * ESCALA, (y + 1) * ESCALA, ESCALA, ESCALA);
        // Brillos horizontales que corren con el agua.
        if ((x + Math.floor(t * 0.012)) % 29 < 4 && x % 3 !== 0) {
          g.fillStyle(0xe6eed2, 0.85).fillRect(x * ESCALA, (y + 2 + (x % 2)) * ESCALA, ESCALA, ESCALA);
        }
        // Espuma contra las orillas y alrededor de las rocas que asoman.
        const cerca = Math.min(x - ax0, ax1 - x) < 4 ||
          rio.rocas.some((r) => Math.abs(Math.abs(x * ESCALA - r.x) - r.r) < 8);
        if (cerca && ((x * 7 + destello) % 5) < 3) {
          g.fillStyle(0xf2f4e4, 0.95).fillRect(x * ESCALA, (y - (x + destello) % 2) * ESCALA, ESCALA, ESCALA);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Parallax
  // ---------------------------------------------------------------------------

  crearParalaje() {
    const { width, height } = this.scale;

    // Cielo y niebla: el fondo dibujado, fijo a la cámara; su textura se
    // desplaza en X y la imagen se mueve un poco en Y (ver actualizarParalaje).
    const recorrido = (this.altoNivel - height) * CAPAS.cielo.y;
    this.escalaCielo = (height + recorrido) / this.textures.get('selvaFondo').getSourceImage().height;
    this.cielo = this.add.tileSprite(0, 0, width / this.escalaCielo, height / this.escalaCielo + recorrido / this.escalaCielo, 'selvaFondo')
      .setOrigin(0).setScale(this.escalaCielo).setScrollFactor(0);

    // Sol detrás de las copas: resplandor en la capa del cielo.
    texturaResplandor(this, 'resplandorSol');
    this.add.image(LUZ.sol.x, LUZ.sol.y, 'resplandorSol').setScale(ESCALA * 1.5)
      .setScrollFactor(CAPAS.cielo.x, CAPAS.cielo.y).setBlendMode(Phaser.BlendModes.ADD).setAlpha(LUZ.sol.brillo);

    // Árboles de fondo: cada capa solo necesita cubrir lo que recorre. Primero
    // los gigantes (quedan detrás de los árboles comunes de su capa).
    [CAPAS.lejanos, CAPAS.medios].forEach(({ textura, x: fx, y: fy, base, separacion, gigantes, sendero }, capa) => {
      if (capa === 1) this.crearPropsFondo(); // chozas y torres lejanas, entre las dos capas
      const largo = (this.anchoNivel - width) * fx + width;
      for (let x = this.rnd.between(100, 400); x < largo + 300; x += this.rnd.between(...gigantes.separacion)) {
        this.add.image(x, base + 20, gigantes.textura, this.rnd.between(0, 2))
          .setOrigin(0.5, 1).setScale(ESCALA).setScrollFactor(fx, fy).setFlipX(this.rnd.frac() < 0.5);
      }
      let anterior = -1;
      for (let x = this.rnd.between(0, 150); x < largo + 300; x += this.rnd.between(...separacion)) {
        const frame = (anterior + this.rnd.between(1, 2)) % 3; // sin repetir seguido
        anterior = frame;
        this.add.image(x, base, textura, frame)
          .setOrigin(0.5, 1).setScale(ESCALA).setScrollFactor(fx, fy).setFlipX(this.rnd.frac() < 0.5);
      }
      // Sendero delante del pie de los árboles de esta capa.
      texturaSenderoFondo(this, `sendero${capa}`, `sendero-${capa}`, sendero.niebla);
      this.add.tileSprite(0, sendero.y, (largo + 300) / ESCALA, 100, `sendero${capa}`)
        .setOrigin(0).setScale(ESCALA).setScrollFactor(fx, fy);
    });
  }

  // Rayos de sol que entran entre las copas, con polvo que flota en la luz.
  crearLuz() {
    const { rayos } = LUZ;
    const { width } = this.scale;
    for (let i = 0; i < rayos.variantes; i++) texturaRayo(this, `rayo${i}`, `rayo-${i}`);
    texturaMota(this, 'mota');

    const largo = (this.anchoNivel - width) * rayos.x + width;
    for (let x = this.rnd.between(200, 500); x < largo; x += this.rnd.between(...rayos.separacion)) {
      // Ninguno sobre la entrada de la cueva (con la cámara frente a ella): la lavaba.
      if (this.bocaCuevaX !== undefined) {
        const enPantalla = x - (this.bocaCuevaX - width / 2) * rayos.x;
        if (enPantalla > width / 2 - 520 && enPantalla < width / 2 + 220) continue;
      }
      const rayo = this.add.image(x, rayos.arriba, `rayo${this.rnd.between(0, rayos.variantes - 1)}`)
        .setOrigin(0).setScale(ESCALA).setScrollFactor(rayos.x, rayos.y)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setAlpha(rayos.brillo[0]);
      this.tweens.add({
        targets: rayo, alpha: rayos.brillo[1], duration: this.rnd.between(2500, 4500),
        delay: this.rnd.between(0, 2000), yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });

      // Polvo: aparece y se apaga despacio dentro del rayo (zona triangular).
      const w = rayo.displayWidth;
      const h = rayo.displayHeight;
      this.add.particles(x, rayos.arriba, 'mota', {
        emitZone: { type: 'random', source: new Phaser.Geom.Triangle(w * 0.66, h * 0.08, w * 0.1, h * 0.8, w * 0.62, h * 0.8) },
        lifespan: { min: 4000, max: 7000 }, speedX: { min: -6, max: 6 }, speedY: { min: 3, max: 12 },
        scale: ESCALA, frequency: 380, blendMode: 'ADD',
        alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.9 }
      }).setScrollFactor(rayos.x, rayos.y).setDepth(9);
    }
  }

  // Entrada a la Cueva de los Guácharos en la cara izquierda del peñón
  // (CUEVA_NIVEL1, ENTRADA_CUEVA; assets/cueva/, herramientas/entrada_cueva.py).
  // Capas, de atrás para adelante:
  //   árboles detrás (parallax 0.9) y la colina de arriba (mismo ancho que la cueva)
  //   cueva_tunel   paredes, techo y piso de adentro,
  //                 visto solo por la abertura (máscara cueva_hueco)
  //   cueva_back    ladera, jamba y borde del piso (con el comienzo roto que
  //                 se mezcla con la tierra), rocas sueltas de atrás
  //   oscuridad     degradado sin bordes rectos, recortado a la abertura
  //   jugador y enemigos (se oscurecen al avanzar: actualizarEntradaCueva)
  //   cueva_front   el arco con los colmillos; lianas, rocas y pasto de adelante
  // Se camina hacia adentro y en el fondo oscuro se pasa a la escena Cueva.
  // Las capas siguen más allá del borde de la cámara: no se ve ningún corte.
  crearCueva() {
    texturasEfectos(this); // EfectosMenu.js: fx_humo, fx_chispa, fx_haz
    texturasCueva(this);   // Cueva.js: animaciones de los guácharos, lianas, helecho
    texturasEntradaCueva(this);
    const { col, columnas } = CUEVA_NIVEL1;
    const izquierda = col * TILE;
    const derecha = (col + columnas) * TILE;
    const abajo = this.sueloBajo(izquierda - TILE / 2, 0);
    const C = ENTRADA_CUEVA;
    const E = ESCALA;
    const textura = (k) => this.textures.get('entrada_' + k).getSourceImage();
    // Esquina de arriba a la izquierda de las capas de la cueva: la boca va
    // sobre el borde del peñón y el piso sobre el suelo de afuera.
    const arribaIzq = { x: izquierda - C.boca, y: abajo - C.piso };
    const enMundo = (ax, ay) => ({ x: arribaIzq.x + ax, y: arribaIzq.y + ay });
    const boca = enMundo(C.boca, C.piso);
    this.colision = this.cache.json.get('entradaColision');
    this.archivoColision = 'entrada_collision.json';
    const fondo = { x: this.colision.walls[0].x, y: abajo };
    this.entrada = { izquierda, abajo, boca: boca.x, fondo: fondo.x, tinte: false, murcielagos: false };
    this.bocaCuevaX = boca.x + 60; // crearLuz y el primer plano no ponen nada delante
    // Colisión de adentro (piso y pared del fondo): JSON editable con E.
    this.crearColision();
    // Referencia del parallax: la cámara centrada frente a la boca. Cada capa
    // con parallax queda alineada ahí y se corre a su ritmo.
    // (La cámara frente a la boca está en su tope derecho: el borde del peñón.)
    const ref = derecha - this.scale.width;
    const conParallax = (o, f, x) => o.setScrollFactor(f, 1).setX(x - ref * (1 - f));

    // --- Colina de arriba: del mismo ancho que la cueva y en su misma x (la
    // ladera sigue la de la cueva); su pie se funde sobre el borde de arriba.
    // Detrás, árboles (parallax 0.9) con el tronco tapado por la colina. ---
    const K = C.colina;
    const colina = textura('cueva_colina');
    const pieColina = arribaIzq.y + K.solape;
    K.arboles.forEach(([dx, frame, escala], i) => {
      conParallax(this.add.image(0, pieColina - colina.height + K.pieArboles, 'arbolesCerca', frame).setOrigin(0.5, 1)
        .setScale(escala).setTint(0xa8a882).setFlipX(i % 2 === 1).setDepth(1.4), K.factor, arribaIzq.x + dx);
    });
    this.add.image(arribaIzq.x, pieColina, 'entrada_cueva_colina').setOrigin(0, 1).setDepth(11.05);
    K.lianas.forEach(([dx, largo], i) => {
      const liana = this.add.image(boca.x + dx, arribaIzq.y + 30, 'cueva_liana').setOrigin(0.5, 0)
        .setScale(E * 0.8, E * largo).setTint(0x7a8a64).setDepth(11.07);
      this.tweens.add({ targets: liana, angle: { from: -3, to: 3 }, duration: 2300 + i * 350, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    // --- La cueva ---
    const hueco = this.make.image({ x: arribaIzq.x, y: arribaIzq.y, key: 'entrada_cueva_hueco', add: false }).setOrigin(0);
    const mascara = hueco.createBitmapMask();
    conParallax(this.add.image(0, arribaIzq.y, 'entrada_cueva_tunel').setOrigin(0).setDepth(1.46), C.tunel, arribaIzq.x)
      .setMask(mascara);
    this.add.image(arribaIzq.x, arribaIzq.y, 'entrada_cueva_back').setOrigin(0).setDepth(1.5);
    // Oscuridad: degradado sin bordes (transparente en la boca, 90 % al fondo,
    // difuminado arriba), solo dentro de la abertura. Debajo del jugador.
    const alto = C.piso + 16;
    const anchoOscuro = arribaIzq.x + textura('cueva_back').width - (boca.x - 10);
    this.add.image(boca.x - 10, arribaIzq.y, 'cuevaOscuridad').setOrigin(0)
      .setDisplaySize(anchoOscuro, alto).setDepth(1.7).setMask(mascara);
    // Y el suelo de adentro (la tierra bajo las losas): oscuro arriba y se
    // apaga hacia abajo, con el mismo degradado hacia el fondo.
    this.add.image(boca.x - 10, abajo + 6, 'cuevaOscuridadSuelo').setOrigin(0)
      .setDisplaySize(anchoOscuro, 90).setDepth(1.7);
    this.add.image(arribaIzq.x, arribaIzq.y, 'entrada_cueva_front').setOrigin(0).setDepth(11);

    // --- Suelo y borde: el pasto se va acabando hacia la boca ---
    // Matas cada vez más chicas y separadas, piedritas y un helecho.
    let x = arribaIzq.x - 80;
    while (x < boca.x + 18) {
      const t = Phaser.Math.Clamp((x - (arribaIzq.x - 80)) / (boca.x + 18 - (arribaIzq.x - 80)), 0, 1);
      if (this.rnd.frac() > t * 0.7) {
        const tex = this.rnd.frac() < 0.75 - t * 0.5 ? `mata${this.rnd.between(0, 2)}` : 'piedrasSueltas';
        this.add.image(x, abajo + HUNDIDO, tex).setOrigin(0.5, 1).setScale(ESCALA * (1 - t * 0.55), ESCALA * (1 - t * 0.6))
          .setFlipX(this.rnd.frac() < 0.5).setDepth(10.4);
      }
      x += 10 + t * 26 + this.rnd.between(0, 8);
    }
    this.add.ellipse(arribaIzq.x + C.boca / 2 + 10, abajo + 1, C.boca + 40, 10, 0x000000, 0.3).setDepth(1.51);
    // Sobre el borde de la ladera: helechos y piedras (apoyados en su contorno).
    C.ladera.forEach(([ax, tipo], i) => {
      const y = this.contornoArriba('entrada_cueva_back', ax);
      if (y === null) return;
      const p = enMundo(ax, y + 3);
      const img = tipo === 'helecho'
        ? this.add.image(p.x, p.y, 'cueva_helecho').setScale(E * 0.7).setTint(0xb8b090)
        : this.add.image(p.x, p.y, 'entrada_roca_3');
      img.setOrigin(0.5, 1).setFlipX(i % 2 === 1).setDepth(1.52);
    });
    // Rocas sueltas en la boca: unas detrás, otras delante del jugador.
    C.rocas.forEach(({ img, x: dx, delante }) => {
      const rx = boca.x + dx;
      const profundidad = delante ? 11.2 : 1.6;
      // A tamaño de pantalla (como la cueva), un poco en la sombra de la boca.
      const roca = this.add.image(rx, abajo + HUNDIDO, 'entrada_' + img).setOrigin(0.5, 1).setDepth(profundidad)
        .setTint(delante ? 0xe8e0d0 : 0xb8ac98);
      this.add.ellipse(rx, abajo - 1, roca.displayWidth * 0.95, 7, 0x000000, 0.4).setDepth(profundidad - 0.01);
    });

    // --- Luz y ambiente ---
    // Rayo de luz diagonal suave que entra por la boca, con polvo flotando.
    const rayo = this.add.image(boca.x - 60, abajo - 200, 'fx_haz').setOrigin(0, 0.5).setAngle(32).setScale(2.6, 1.8)
      .setTint(0xfff2c8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12).setDepth(10.55);
    this.tweens.add({ targets: rayo, alpha: 0.08, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.particles(0, 0, 'fx_chispa', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(boca.x - 10, abajo - 160, 190, 140) },
      speedX: { min: -5, max: 8 }, speedY: { min: -6, max: 6 }, lifespan: { min: 3000, max: 5000 },
      scale: { min: 0.6, max: 1 }, tint: 0xfff0c8, frequency: 240, blendMode: 'ADD',
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.5 }
    }).setDepth(10.56);
    // Ojos rojos de guácharos en lo oscuro, al fondo.
    for (let i = 0; i < 3; i++) {
      const ox = fondo.x - this.rnd.between(20, 70);
      const oy = abajo - this.rnd.between(50, 110);
      const ojos = [-3, 3].map((d) => this.add.rectangle(ox + d, oy, E, E, 0xff3a1a).setDepth(1.75).setAlpha(0));
      this.tweens.add({
        targets: ojos, alpha: { from: 0, to: 0.9 }, duration: 160, yoyo: true, hold: this.rnd.between(500, 1400),
        repeat: -1, repeatDelay: this.rnd.between(1500, 4000), delay: this.rnd.between(0, 3000)
      });
    }
    // Vaho frío que sale de la boca, despacio.
    this.add.particles(boca.x + 40, abajo - 50, 'fx_humo', {
      x: { min: -30, max: 30 }, y: { min: -20, max: 20 }, speedX: { min: -24, max: -8 }, speedY: { min: -8, max: 2 },
      lifespan: 2800, scale: { start: 1.2, end: 3.2 }, alpha: { start: 0.12, end: 0 }, tint: 0x9ab0a8, frequency: 300
    }).setDepth(1.56);
    // Gotas que caen de las estalactitas (con su salpicado y su sonido).
    this.time.addEvent({ delay: 520, loop: true, callback: () => { if (Math.random() < 0.65) this.gotaCueva(); } });

    this.efectosCueva(boca, fondo, abajo);

    // Cada tanto sale una bandada chillando de la boca.
    this.time.addEvent({ delay: 6500, loop: true, callback: () => this.bandadaCueva() });
    this.crearSonidoCueva();

    this.salidaCueva = { x0: derecha + 20, x1: derecha + 80, abajo: this.sueloBajo(derecha + TILE / 2, 0) };
    // La cueva entra en el peñón: la cámara cambia de lado recién pasándolo.
    this.penon = { izquierda: derecha, derecha, centro: derecha };
  }

  // y (en la textura) del primer píxel opaco de arriba en la columna x, o null.
  contornoArriba(clave, x) {
    const alto = this.textures.get(clave).getSourceImage().height;
    for (let y = 0; y < alto; y++) {
      if (this.textures.getPixelAlpha(x, y, clave) > 0) return y;
    }
    return null;
  }

  // Cuerpos de la entrada (assets/cueva/entrada_collision.json, px del mundo):
  // el piso en pendiente (tiras de 4 px que siguen la línea) y la pared del
  // fondo. Se rearman al salir del editor (tecla E).
  crearColision() {
    (this.cuerposEntrada || []).forEach((z) => z.destroy());
    this.cuerposEntrada = [];
    const d = this.colision;
    const agregar = (zona) => { this.suelo.add(zona); this.cuerposEntrada.push(zona); };
    d.ground.forEach((l) => {
      const a = Math.min(l.x0, l.x1);
      const b = Math.max(l.x0, l.x1);
      for (let x = a; x < b; x += 4) {
        const w = Math.min(4, b - x);
        const t = l.x1 === l.x0 ? 0 : (x + w / 2 - l.x0) / (l.x1 - l.x0);
        const y = l.y0 + (l.y1 - l.y0) * t;
        agregar(this.add.zone(x + w / 2, y + 40, w, 80));
      }
    });
    d.walls.forEach(({ x, y, w, h }) => agregar(this.add.zone(x + w / 2, y + h / 2, w, h)));
    d.platforms.forEach(({ x0, x1, y }) => {
      const z = this.add.zone((x0 + x1) / 2, y + 6, x1 - x0, 12);
      this.agregarPasarela(z);
      this.cuerposEntrada.push(z);
    });
  }

  // y del piso de la entrada en x (la línea del JSON), o null fuera de ella.
  pisoEntrada(x) {
    if (!this.colision) return null;
    let y = null;
    this.colision.ground.forEach((l) => {
      if (x < Math.min(l.x0, l.x1) || x > Math.max(l.x0, l.x1)) return;
      const t = l.x1 === l.x0 ? 0 : (x - l.x0) / (l.x1 - l.x0);
      const yl = l.y0 + (l.y1 - l.y0) * t;
      if (y === null || yl < y) y = yl;
    });
    return y;
  }

  // Cada cuadro: el sonido según la distancia, el tinte de los que entran
  // (se oscurecen según cuánto avanzan), los guácharos de la primera vez y el
  // paso a la escena Cueva al llegar al fondo oscuro.
  actualizarEntradaCueva(admin) {
    const e = this.entrada;
    if (!e) return;
    const j = this.jugador;
    // Solo en la entrada (del otro lado del peñón, donde se aparece al volver, no cuenta).
    const adentro = (x) => x > e.boca && x < e.fondo + 40;
    const avance = (x) => (adentro(x) ? Phaser.Math.Clamp((x - e.boca) / (e.fondo - e.boca), 0, 1) : 0);
    const tinte = (t) => {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(ENTRADA_CUEVA.tinte), 100, t * 100);
      return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    };
    // El jugador (si no está parpadeando rojo por un golpe).
    const tj = avance(j.body.center.x);
    if (tj > 0 && this.estado !== 'interior') {
      if (!j.isTinted || j.getData('tinteCueva') || j.tintTopLeft !== 0xff6060) {
        j.setTint(tinte(tj));
        j.setData('tinteCueva', true);
      }
    } else if (j.getData('tinteCueva')) {
      j.clearTint();
      j.setData('tinteCueva', false);
    }
    // Los enemigos también.
    this.cholitas.getChildren().forEach((c) => {
      const t = avance(c.x);
      if (t > 0) { c.setTint(tinte(t)); c.setData('tinteCueva', true); } else if (c.getData('tinteCueva')) { c.clearTint(); c.setData('tinteCueva', false); }
    });
    this.actualizarSonidoCueva(j.x);
    // La primera vez que se acerca: dos guácharos salen volando hacia la pantalla.
    if (!e.murcielagos && Math.abs(j.x - e.boca) < 420) {
      e.murcielagos = true;
      this.guacharosHaciaLaPantalla();
    }
    // Bajando la pendiente: los pies pegados al piso (si no, quedan 2-3 px en
    // el aire hasta que la gravedad lo baja).
    const piso = this.pisoEntrada(j.body.center.x);
    if (this.estado === 'control' && !admin && !this.trepando && piso !== null && j.body.velocity.y >= 0 &&
        j.body.bottom < piso && piso - j.body.bottom < 6 && this.enSueloAntes) {
      j.body.y += piso - j.body.bottom;
    }
    // Llegó al fondo oscuro: a la escena Cueva.
    if (this.estado === 'control' && !admin && j.body.right > e.fondo - 26 && adentro(j.body.center.x)) this.entrarCueva();
  }

  // Fade a negro de 400 ms y la cueva como escena aparte (aparece desde la
  // izquierda); este nivel se duerme y, al salir, se vuelve del otro lado del
  // peñón con el mismo efecto al revés.
  entrarCueva() {
    this.estado = 'interior';
    this.flechaPuerta.setVisible(false);
    cerrarSelector(this, false);
    this.registry.set('cuevaBase', { rehenes: this.registry.get('rehenes') });
    this.jugador.setVelocity(0).anims.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.launch('Cueva');
      this.scene.sleep();
    });
  }

  // Una gota cae de una estalactita (de las del JSON) y salpica en el piso.
  gotaCueva() {
    const gotas = this.colision && this.colision.gotas;
    if (!gotas || !gotas.length || this.estado === 'interior') return;
    const [x, y] = Phaser.Utils.Array.GetRandom(gotas);
    const piso = (this.pisoEntrada(x) ?? this.entrada.abajo) - 2;
    const gota = this.add.image(x, y, 'gota').setScale(ESCALA).setDepth(10.56).setAlpha(0.9);
    this.tweens.add({
      targets: gota, y: piso, duration: Math.sqrt(2 * (piso - y) / 900) * 1000, ease: 'Quad.in',
      onComplete: () => {
        gota.destroy();
        const salpica = this.add.particles(x, piso, 'gota', {
          speed: { min: 40, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 700, lifespan: 320,
          scale: { start: ESCALA * 0.7, end: 0 }, emitting: false
        }).setDepth(10.56);
        salpica.explode(5);
        this.time.delayedCall(400, () => salpica.destroy());
        const onda = this.add.ellipse(x, piso + 1, 6, 2, 0x9ab8c8, 0.6).setDepth(10.56);
        this.tweens.add({ targets: onda, scaleX: 3, alpha: 0, duration: 380, onComplete: () => onda.destroy() });
        this.sonidoGota();
      }
    });
  }

  // Dos guácharos salen de la boca y vuelan hacia la pantalla (crecen).
  guacharosHaciaLaPantalla() {
    const e = this.entrada;
    this.aviso(e.boca + 30, e.abajo - 150, '¡KRRAA!', 'rojo');
    for (let i = 0; i < 2; i++) this.aveSaliendo(i * 250, i, true);
  }

  // Sonido de la cueva (Web Audio, sin archivos): un rumor grave con eco y el
  // goteo (sonidoGota, que también suena con cada gota que cae). El volumen
  // sube al acercarse a la boca (actualizarSonidoCueva).
  crearSonidoCueva() {
    const ctx = this.sound && this.sound.context;
    if (!ctx || !ctx.createGain) return;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // Rumor: ruido marrón filtrado, en bucle.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < datos.length; i++) {
      ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      datos[i] = ultimo * 3.5;
    }
    const rumor = ctx.createBufferSource();
    rumor.buffer = buffer;
    rumor.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 380;
    const volRumor = ctx.createGain();
    volRumor.gain.value = 0.5;
    rumor.connect(filtro).connect(volRumor).connect(master);
    rumor.start();
    // Eco (para las gotas).
    const eco = ctx.createDelay(1);
    eco.delayTime.value = 0.24;
    const realimentacion = ctx.createGain();
    realimentacion.gain.value = 0.45;
    const ecoFiltro = ctx.createBiquadFilter();
    ecoFiltro.type = 'lowpass';
    ecoFiltro.frequency.value = 1800;
    eco.connect(realimentacion).connect(eco);
    eco.connect(ecoFiltro).connect(master);
    this.sonidoCueva = { ctx, master, eco };
    this.events.on('sleep', () => master.gain.setTargetAtTime(0, ctx.currentTime, 0.05));
    this.events.once('shutdown', () => {
      try { rumor.stop(); master.disconnect(); } catch (err) { /* ya estaba cortado */ }
      this.sonidoCueva = null;
    });
  }

  sonidoGota() {
    const s = this.sonidoCueva;
    if (!s || s.master.gain.value < 0.01) return;
    const { ctx, master, eco } = s;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f = 900 + Math.random() * 1400;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g);
    g.connect(master);
    g.connect(eco);
    o.start(t);
    o.stop(t + 0.16);
  }

  actualizarSonidoCueva(x) {
    const s = this.sonidoCueva;
    if (!s) return;
    const { alcance, volumen } = ENTRADA_CUEVA.sonido;
    const d = Math.abs(x - (this.entrada.boca + this.entrada.fondo) / 2);
    const v = Math.pow(Phaser.Math.Clamp(1 - d / alcance, 0, 1), 1.5) * volumen;
    s.master.gain.setTargetAtTime(v, s.ctx.currentTime, 0.15);
  }

  // Editor de la colisión de la entrada (Cueva.js: tecla E). En Nivel1 la
  // cámara deja de seguir al jugador mientras se edita y se mueve con las flechas.
  alternarEditor() {
    const entra = this.estado !== 'editor';
    Cueva.prototype.alternarEditor.call(this);
    const cam = this.cameras.main;
    if (entra) cam.stopFollow();
    else cam.startFollow(this.jugador, true, 0.1, 0.08).setFollowOffset(0, CAMARA.bajarJugador);
  }

  moverEditor() {
    const cam = this.cameras.main;
    const t = this.teclas;
    const k = this.teclasExtra;
    const dx = (t.right.isDown || k.D.isDown ? 12 : 0) - (t.left.isDown || k.A.isDown ? 12 : 0);
    const dy = (t.down.isDown ? 12 : 0) - (t.up.isDown ? 12 : 0);
    cam.setScroll(cam.scrollX + dx, cam.scrollY + dy);
    this.dibujarEditor();
  }

  // Una bandada de guácharos sale de la cueva: arrancan en lo oscuro del
  // fondo (detrás del negro, se ven apenas), cruzan el túnel por debajo del
  // arco y recién afuera de la boca suben hacia el cielo, delante de todo.
  // (Antes salían por arriba de la roca y atravesaban la ladera y la colina.)
  bandadaCueva() {
    const e = this.entrada;
    if (!e || this.estado === 'interior') return;
    const cam = this.cameras.main;
    if (e.boca < cam.worldView.left - 200 || e.boca > cam.worldView.right + 200) return; // fuera de la pantalla, no
    if (Math.abs(this.jugador.x - e.boca) < 600) {
      this.aviso(e.boca + 30, e.abajo - 150, '¡KRRAA!', 'rojo');
      this.cameras.main.shake(220, 0.002);
    }
    const n = this.rnd.between(3, 5);
    for (let i = 0; i < n; i++) this.aveSaliendo(i * 160, i, false);
  }

  // Un guácharo que sale de la cueva (ver bandadaCueva). haciaPantalla: en
  // vez de subir, crece como si viniera hacia la cámara (la primera vez).
  aveSaliendo(espera, i, haciaPantalla) {
    const e = this.entrada;
    const escala = CUEVA.guacharo.escala * 0.8;
    const y = e.abajo - this.rnd.between(70, 110);
    const ave = this.add.sprite(e.fondo - 40, y, AVE.vuelo.clave, 2).setScale(escala * 0.6).setDepth(1.65)
      .setFlipX(true).setTint(0x30303c).setAlpha(0);
    ave.play({ key: 'ave_vuela', startFrame: i % 4 });
    // 1. Por el túnel hacia la boca (sale de lo oscuro, se va aclarando).
    this.tweens.add({
      targets: ave, x: e.boca + 12, y: y + this.rnd.between(-8, 8), scale: escala, alpha: 1,
      delay: espera, duration: 900, ease: 'Sine.in',
      onUpdate: (tw) => ave.setTint(Phaser.Display.Color.GetColor(...[0x30, 0x30, 0x3c].map((v) => Math.round(v + (255 - v) * tw.progress ** 2)))),
      onComplete: () => {
        // 2. Afuera: delante de todo, sube (o viene hacia la pantalla).
        ave.clearTint().setDepth(12);
        const destino = haciaPantalla
          ? { x: ave.x - 260 - i * 120, y: ave.y - 120 + i * 80, scale: 1.4 }
          : { x: ave.x - this.rnd.between(420, 700), y: ave.y - this.rnd.between(260, 420), scale: escala };
        this.tweens.add({
          targets: ave, ...destino, duration: haciaPantalla ? 900 : this.rnd.between(2000, 2700), ease: 'Sine.in',
          onComplete: () => this.tweens.add({ targets: ave, alpha: 0, duration: 200, onComplete: () => ave.destroy() })
        });
      }
    });
  }

  // Efectos de la boca: niebla fría que se arrastra por el piso hacia afuera,
  // luciérnagas en lo oscuro, piedritas y polvo que caen del arco y un
  // parpadeo de la sombra (como si algo se moviera adentro).
  efectosCueva(boca, fondo, abajo) {
    texturasEfectos(this);
    const ancho = fondo.x - boca.x;
    // Niebla baja: sale del fondo y se derrama por la boca, a ras del piso.
    this.add.particles(0, 0, 'fx_humo', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(boca.x + ancho * 0.3, abajo - 26, ancho * 0.6, 20) },
      speedX: { min: -38, max: -16 }, speedY: { min: -4, max: 2 }, lifespan: { min: 3200, max: 4800 },
      scale: { start: 2.2, end: 4.5 }, alpha: { start: 0.2, end: 0 }, tint: 0x8a9a98, frequency: 160
    }).setDepth(10.45);
    // Luciérnagas: puntitos verdes que flotan y titilan en lo oscuro.
    this.add.particles(0, 0, 'fx_chispa', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(boca.x + 40, abajo - 150, ancho - 60, 120) },
      speedX: { min: -10, max: 10 }, speedY: { min: -8, max: 8 }, lifespan: { min: 2500, max: 4500 },
      scale: { min: 0.6, max: 1.1 }, tint: 0xb8ff70, frequency: 420, blendMode: 'ADD',
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.max(0, Math.sin(t * Math.PI * 3)) * 0.9 }
    }).setDepth(1.75);
    // Piedritas y polvo que caen del arco de vez en cuando.
    this.time.addEvent({
      delay: 2300, loop: true, callback: () => {
        if (this.estado === 'interior' || Math.random() < 0.4) return;
        const x = boca.x + this.rnd.between(-10, 140);
        const y0 = abajo - 190;
        const polvo = this.add.particles(x, y0, 'fx_humo', {
          speedX: { min: -8, max: 8 }, speedY: { min: 30, max: 70 }, lifespan: 1200,
          scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.35, end: 0 }, tint: 0xa89070, emitting: false
        }).setDepth(11.1);
        polvo.explode(6);
        this.time.delayedCall(1300, () => polvo.destroy());
        const piedra = this.add.rectangle(x, y0, 3, 3, 0x6a5a40).setDepth(11.1);
        this.tweens.add({
          targets: piedra, y: abajo - 2, angle: 180, duration: 650, ease: 'Quad.in',
          onComplete: () => { chispas(this, x, abajo - 2, 2, -90, 120, 11.1); piedra.destroy(); }
        });
      }
    });
    // La sombra de adentro "respira" (algo se mueve en el fondo).
    const sombra = this.add.ellipse(fondo.x - 60, abajo - 80, 160, 140, 0x000000, 0).setDepth(1.72);
    this.tweens.add({ targets: sombra, fillAlpha: 0.35, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  // La cámara se queda de un lado del peñón: hasta su borde derecho (antes de
  // la cueva) o desde su borde izquierdo (después).
  limitarCamaraPenon() {
    const p = this.penon;
    const lado = this.jugador.x < p.centro ? 0 : 1;
    if (lado === this.ladoPenon) return;
    this.ladoPenon = lado;
    const cam = this.cameras.main;
    if (lado === 0) cam.setBounds(0, 0, p.derecha, this.altoNivel);
    else cam.setBounds(p.izquierda, 0, this.anchoNivel - p.izquierda, this.altoNivel);
  }

  // Copias lejanas de los props: más chicas, con neblina y sin colisión.
  crearPropsFondo() {
    const F = PROPS_FONDO;
    F.lista.forEach(([prop, x], i) => {
      this.add.image(x, F.base, prop, '__BASE').setOrigin(0.5, 1).setScale(ESCALA * F.escala)
        .setScrollFactor(F.x, F.y).setAlpha(F.alfa).setTint(F.tinte).setFlipX(i % 2 === 1);
    });
    this.crearFogatas();
  }

  // Fogatas de fondo (FOGATAS_FONDO): sin cuerpo, a la escala y con la
  // neblina de la capa; el fuego sin neblina (brilla) y con un resplandor.
  crearFogatas() {
    const F = PROPS_FONDO;
    const s = ESCALA * F.escala;
    const anim = (key, textura, frames, frameRate, repeat = -1) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(textura, { frames }), frameRate, repeat });
    };
    anim('fogata_normal', 'fogata', [0, 1, 2, 3], 8);
    anim('fogata_calienta', 'fogata', [4, 5, 6, 7], 10);
    anim('fogata_fuerte', 'fogata', [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 8, 9, 10, 11, 7, 6, 5, 4], 10, 0);
    anim('fogata_humo', 'fogataHumo', [0, 1, 2, 3, 4, 5, 6, 7], 8);
    anim('rebelde_sopla', 'rebeldes', [0, 0, 1, 2, 3, 3, 3, 2, 1], 6, 1);
    anim('rebelde_atiza', 'rebeldes', [4, 5], 3);
    const capa = (o) => o.setScrollFactor(F.x, F.y).setScale(s);

    FOGATAS_FONDO.lista.forEach((x, i) => {
      const brillo = this.add.ellipse(x, F.base - 6 * s, 90 * s, 34 * s, FOGATAS_FONDO.brillo, 0.22)
        .setScrollFactor(F.x, F.y).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: brillo, alpha: 0.1, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const humo = capa(this.add.sprite(x + 2 * s, F.base - 26 * s, 'fogataHumo', 0).setOrigin(0.5, 1)).setAlpha(0.55).setTint(F.tinte);
      humo.play({ key: 'fogata_humo', startFrame: i * 3 });
      const fuego = capa(this.add.sprite(x, F.base, 'fogata', 0).setOrigin(0.5, 1)).play('fogata_normal');
      // Uno atiza a la izquierda (mirando al fuego) y el otro sopla a la derecha.
      capa(this.add.sprite(x - 38 * s, F.base, 'rebeldes', 4).setOrigin(0.5, 1).setFlipX(true))
        .setAlpha(F.alfa).setTint(F.tinte).play({ key: 'rebelde_atiza', startFrame: i });
      const sopla = capa(this.add.sprite(x + 40 * s, F.base, 'rebeldes', 0).setOrigin(0.5, 1)).setAlpha(F.alfa).setTint(F.tinte);

      // Sopla (el fuego se calienta), el fuego llega a full (se aparta mirando) y vuelve.
      const ciclo = () => {
        sopla.play('rebelde_sopla');
        fuego.play('fogata_calienta');
        sopla.once('animationcomplete', () => {
          sopla.setFrame(6);
          fuego.play('fogata_fuerte');
          this.tweens.add({ targets: brillo, scale: 1.5, duration: 300, yoyo: true, hold: 900 });
          fuego.once('animationcomplete', () => {
            fuego.play('fogata_normal');
            sopla.setFrame(0);
          });
        });
      };
      this.time.addEvent({ delay: FOGATAS_FONDO.ciclo, startAt: i * 2500, loop: true, callback: ciclo });
    });
  }

  // Primer plano: lianas y musgo colgando arriba, oscurecidos y a x3 (están
  // más cerca de la cámara), y troncos gigantes en silueta. Pasan por delante
  // del jugador. Abajo no va nada: esta capa sigue a la pantalla y no al
  // terreno, así que el pasto quedaba flotando sobre la piedra o el río.
  crearPrimerPlano() {
    const { width } = this.scale;
    const largo = (this.anchoNivel - width) * CAPAS.frente.x + width;
    const agregar = (x, y, frame, origenY) => this.add.image(x, y, 'tilesSelva', frame)
      .setOrigin(0.5, origenY).setScale(ESCALA * 1.5).setTint(0x8a8460)
      .setScrollFactor(CAPAS.frente.x, CAPAS.frente.y).setDepth(15).setFlipX(this.rnd.frac() < 0.5);

    // Troncos gigantes casi en silueta que cruzan toda la pantalla.
    for (let x = 1400; x < largo; x += this.rnd.between(...CAPAS.frente.troncos)) {
      // Ninguno delante de la boca de la cueva (con la cámara frente a ella).
      if (this.bocaCuevaX !== undefined) {
        const enPantalla = x - (this.bocaCuevaX - width / 2) * CAPAS.frente.x;
        if (enPantalla > width / 2 - 420 && enPantalla < width / 2 + 320) continue;
      }
      this.add.image(x, -200, 'gigantesFrente', this.rnd.between(0, 2))
        .setOrigin(0.5, 0).setScale(ESCALA).setScrollFactor(CAPAS.frente.x, CAPAS.frente.y)
        .setDepth(15).setFlipX(this.rnd.frac() < 0.5);
    }
    for (let x = 900; x < largo; x += this.rnd.between(700, 1200)) {
      agregar(x, -10, this.rnd.pick([T.lianas, T.lianas2, T.musgo]), 0);
    }
  }

  actualizarParalaje() {
    const cam = this.cameras.main;
    this.cielo.tilePositionX = (cam.scrollX * CAPAS.cielo.x) / this.escalaCielo;
    // Sube un poco al bajar la cámara. Arriba queda pegado al borde; lo que
    // asoma abajo (unos 30 px) siempre lo tapa el suelo del nivel.
    this.cielo.y = -cam.scrollY * CAPAS.cielo.y;
  }

  // ---------------------------------------------------------------------------
  // Jugador
  // ---------------------------------------------------------------------------

  crearJugador() {
    const textura = this.prepararJugador(); // Jugador.js: animaciones y efectos

    const [inicio] = this.posiciones('J');
    this.inicio = inicio;
    // Empieza fuera de la pantalla, a la izquierda, con los pies a la altura
    // del suelo de J (en el cuadro de 84x84 los pies están 30 px bajo el centro).
    this.jugador = this.physics.add.sprite(-80, inicio.abajo - 30 * ESCALA, textura, 0).setScale(ESCALA).setDepth(10);
    fisicaJugador(this.jugador); // Jugador.js: cuerpo, gravedad y caída
    this.jugador.body.setAllowGravity(false); // fuera del nivel no hay piso
    this.sombraJugador = this.crearSombra(SOMBRA.jugador, 9.4);

    // El suelo se ignora mientras está en una rampa (ver frenarContraMuro).
    this.physics.add.collider(this.jugador, this.suelo, null, () => !this.rampaActual);
    this.physics.add.collider(this.jugador, this.obstaculos);
    this.physics.add.collider(this.jugador, this.pasarelas,
      () => { this.sobrePasarelaEn = this.time.now; },
      (jugador, tramo) => this.puedePisar(jugador, tramo));
    this.physics.add.overlap(this.jugador, this.rehenes, (j, rehen) => this.rescatar(rehen));
    this.physics.add.overlap(this.jugador, this.powerups, (j, p) => this.recoger(p));
    this.physics.add.overlap(this.jugador, this.npcsPower, (j, npc) => this.recibirHamburguesa(npc));
    if (this.meta) this.physics.add.overlap(this.jugador, this.meta, () => this.llegarMeta());

    this.physics.world.setBoundsCollision(true, true, false, false);
    this.bajandoHasta = 0;
    this.sobrePasarelaEn = -Infinity;
    this.rampaActual = null;
    this.estabaEnAgua = false;
    this.trepando = null;
    this.enSueloAntes = false;
    // Las balas no chocan con el terreno ni con las barricadas: sus cuerpos son
    // cajas invisibles más grandes que el dibujo (escalones, rampas) y las
    // frenaban en el aire. Solo les pegan a los enemigos o llegan a su alcance.
    // Las granadas y los cohetes sí explotan contra el suelo y las barricadas.
    this.crearBalas([], [this.suelo, this.obstaculos]);
    this.xAnterior = this.jugador.body.x;
    this.estado = 'entrada';

    // Cámara: mientras entra, centrada en la altura del inicio.
    const cam = this.cameras.main;
    cam.scrollY = Phaser.Math.Clamp(inicio.abajo - 60 - this.scale.height / 2 - CAMARA.bajarJugador, 0, this.altoNivel - this.scale.height);
  }

  // Entrada estilo Metal Slug: llega caminando mientras aparece el cartel.
  animacionEntrada() {
    const { width } = this.scale;
    this.jugador.setVelocityX(JUGADOR.velocidad * 0.8).play('jugador_caminar');

    // MISIÓN 1 letra por letra y ¡COMIENZA! (Estado.js); al reaparecer, no.
    if (!this.reapareciendo) comienzaMision(this, 'MISIÓN 1');
  }

  terminarEntrada() {
    this.estado = 'control';
    this.jugador.setVelocityX(0).setCollideWorldBounds(true);
    this.jugador.body.setAllowGravity(true);
    this.jugador.anims.stop();
    this.jugador.setFrame(0);
    // La cámara sigue al jugador en X y en Y, con suavizado y zona muerta.
    // El jugador queda en el tercio de abajo: se ve la parte alta (pisos de
    // casas, torres) y, al bajar al río, la cámara baja con él.
    this.cameras.main.startFollow(this.jugador, true, 0.1, 0.08);
    this.cameras.main.setFollowOffset(0, CAMARA.bajarJugador);
    this.cameras.main.setDeadzone(200, 120);
  }

  moverJugador() {
    const j = this.jugador;
    // Aturdido (Jugador.js): ESPACIO lo libera y las demás teclas no cuentan.
    // Con TAB apretado, el selector de armas (Armas.js): tampoco se mueve.
    const aturdido = this.seguirAturdido(Phaser.Input.Keyboard.JustDown(this.teclasExtra.SPACE));
    const libre = !aturdido && !seguirSelector(this, this.teclasExtra.TAB.isDown && !this.aturdido);
    const izquierda = libre && (this.teclas.left.isDown || this.teclasExtra.A.isDown);
    const derecha = libre && (this.teclas.right.isDown || this.teclasExtra.D.isDown);
    const arriba = libre && (this.teclas.up.isDown || this.teclasExtra.W.isDown);
    const abajo = libre && (this.teclas.down.isDown || this.teclasExtra.S.isDown);
    const espacio = libre && this.teclasExtra.SPACE.isDown;
    const corre = libre && this.teclas.shift.isDown;
    const dispara = libre && (this.teclasExtra.J.isDown || this.teclasExtra.X.isDown);

    // Puertas: con el jugador delante aparece la flecha y ARRIBA entra.
    const puerta = !this.trepando && this.puertaEn(j);
    this.flechaPuerta.setVisible(!!puerta);
    if (puerta) this.flechaPuerta.setPosition((puerta.x0 + puerta.x1) / 2, puerta.arriba - 22);
    if (puerta && arriba && this.game.loop.time > this.puertaDesde && (j.body.blocked.down || j.body.touching.down)) {
      this.entrarA(puerta);
      return;
    }

    // Escaleras: ARRIBA para subir; ABAJO parado en el borde de arriba para bajar.
    const escalera = this.escaleraEn(j);
    if (this.trepando) {
      this.trepar(arriba, abajo, espacio, izquierda || derecha);
      return;
    }
    if (escalera && arriba && j.body.bottom > escalera.arriba + 6) {
      this.empezarATrepar(escalera);
      return;
    }
    if (escalera && abajo && !espacio && Math.abs(j.body.bottom - escalera.arriba) < 12) {
      this.empezarATrepar(escalera);
      return;
    }
    // Rampas: se resuelven después del paso de física de este cuadro.
    const rampaAntes = this.rampaActual;
    if (rampaAntes) this.frenarContraMuro(j, this.xAnterior);
    this.rampaActual = this.pegarARampa(j, this.enSueloAntes || !!rampaAntes);
    if (rampaAntes && !this.rampaActual) this.asentarEnPiedra(j);
    const enSuelo = j.body.blocked.down || j.body.touching.down || !!this.rampaActual;

    const sobrePasarela = this.time.now - this.sobrePasarelaEn < 100;

    // ABAJO agacha (sobre una losa o rama, en cambio, baja de ella); ARRIBA
    // mira y apunta hacia arriba (Jugador.js). Si el personaje no tiene esos
    // cuadros, fuera de una escalera y de una puerta, ARRIBA salta.
    const apunta = this.posturaJugador(enSuelo && !sobrePasarela, arriba, abajo);
    const saltar = espacio || (arriba && !apunta && !escalera && !puerta);
    const rio = this.rioEn(j);

    // Velocidad: más lenta en el agua; en rampas 85% de subida y 110% de bajada.
    const direccion = izquierda ? -1 : derecha ? 1 : 0;
    let velocidad = JUGADOR.velocidad * (rio ? RIO.lentitud : 1) * (this.agachado ? JUGADOR.agachado : corre ? JUGADOR.corrida : 1);
    if (this.rampaActual && this.rampaActual.sube && direccion) {
      velocidad *= direccion === this.rampaActual.sube ? RAMPA_VELOCIDAD.subida : RAMPA_VELOCIDAD.bajada;
    }
    // Recién golpeado por una cholita: el empujón manda, no las teclas.
    if (this.time.now > this.golpeHasta) j.setVelocityX(direccion * velocidad);
    if (direccion) j.setFlipX(direccion < 0);

    // ABAJO sobre una losa o rama (pisos de casas, ramas, puentes): se deja
    // caer a través. Si no, salta.
    if (abajo && sobrePasarela) {
      this.bajandoHasta = this.time.now + 250;
    } else if (saltar && enSuelo && !this.saltoPresionado) {
      j.setVelocityY(-JUGADOR.salto * (rio ? RIO.salto : 1));
      this.rampaActual = null;
      if (rio) this.salpicaduras.explode(14, j.x, rio.superficie);
    }
    this.saltoPresionado = saltar;

    if (dispara && this.time.now >= this.proximoDisparo) this.disparar();
    this.animarJugador(enSuelo, direccion, corre, rio ? RIO.lentitud : 1);

    this.efectosAgua(rio, !!direccion);
    this.enSueloAntes = enSuelo;
    this.xAnterior = j.body.x;

    // Por seguridad: si se sale del mundo por abajo, vuelve al inicio.
    if (j.y > this.altoNivel + 150) {
      j.setPosition(this.inicio.x, this.inicio.abajo - 100).setVelocity(0);
    }
  }

  // ---------------------------------------------------------------------------
  // Props de la aldea y escaleras
  // ---------------------------------------------------------------------------

  // Primer suelo debajo de x bajando desde desdeY: rampa, piedra o, si esa
  // piedra es el lecho de un río, el fondo del río (un río puede pasar por
  // debajo de las ruinas, así que no alcanza con mirar si x cae en un río).
  sueloBajo(x, desdeY = 0) {
    const col = Math.floor(x / TILE);
    for (let fila = Math.max(0, Math.floor(desdeY / TILE)); fila < this.filas; fila++) {
      const c = this.celda(col, fila);
      if (RAMPAS[c]) return fila * TILE + RAMPAS[c].altura(x - col * TILE) + SUELO_Y;
      if (c === 'S') {
        const rio = this.esLecho(col, fila) && this.rios.find((r) => x >= r.x0 && x < r.x1);
        return rio ? rio.lecho(x) : fila * TILE + SUELO_Y;
      }
    }
    return this.altoNivel;
  }

  // Cada prop es una imagen; encima van sus pisos (one-way), escaleras y
  // sólidos. Se apoya en el suelo más alto bajo sus pilotes (nunca flota) y
  // los pilotes que no llegan se alargan con troncos hasta la tierra o el lecho.
  crearProps() {
    this.escaleras = [];
    this.puestosEnemigo = [];
    this.puertas = [];
    PROPS_NIVEL1.forEach((pos, indice) => {
      const datos = PROPS[pos.prop];
      const s = ESCALA * (pos.escala || 1);
      const fuente = this.textures.get(pos.prop).getSourceImage();
      const ancho = fuente.width * s;
      const alto = fuente.height * s;
      const izquierda = pos.x - ancho / 2;
      const espejo = !!pos.espejo;
      // x de la imagen (sin escalar) -> x del mundo, teniendo en cuenta el espejo.
      const px = (v) => izquierda + (espejo ? fuente.width - v : v) * s;
      const rango = (x0, x1) => [Math.min(px(x0), px(x1)), Math.max(px(x0), px(x1))];
      const pilotes = (datos.pilotes || [[0, fuente.width]]).map(([x0, x1]) => rango(x0, x1));

      // Base: a la altura pedida del piso, flotando, o sobre el suelo más alto.
      let base;
      const rio = this.rios.find((r) => pos.x >= r.ax0 && pos.x < r.ax1);
      if (pos.piso !== undefined) base = pos.piso + (fuente.height - datos.pisos[0][2]) * s;
      else if (datos.flota && rio) base = rio.superficie + alto * 0.45;
      else base = Math.min(...pilotes.map(([a, b]) => this.sueloBajo((a + b) / 2))) + HUNDIDO;
      // Si el prop marca su fila de base, lo que hay debajo (escombros) queda
      // delante del suelo y la base va justo en la línea.
      const bajo = datos.base !== undefined ? (fuente.height - datos.base) * s : 0;
      const techo = base + bajo - alto;
      const py = (v) => techo + v * s;
      const profundidad = datos.detras ? 0 : 2;

      // Pilotes alargados: se repiten las últimas filas de cada pilote.
      (datos.pilotes || []).forEach(([x0, x1], i) => {
        const [a, b] = rango(x0, x1);
        const falta = this.sueloBajo((a + b) / 2, base - 4) + HUNDIDO - base;
        if (falta <= 1) return;
        const cuadro = `pilote${i}`;
        const textura = this.textures.get(pos.prop);
        if (!textura.has(cuadro)) textura.add(cuadro, 0, x0, fuente.height - 10, x1 - x0, 10);
        this.add.tileSprite(a, base - 2, (x1 - x0), (falta + 2) / s, pos.prop, cuadro)
          .setOrigin(0).setScale(s).setFlipX(espejo).setDepth(profundidad).setTint(pos.tinte || 0xffffff);
      });

      if (!datos.flota && !pos.piso) this.sombraBase(pos.x, base, ancho * 0.9, datos.detras ? 0 : 1.5, 12, 0.3);
      // '__BASE' = la imagen entera: al agregarle los cuadros de los pilotes,
      // Phaser tomaría el primero de ellos como cuadro por defecto.
      const imagen = this.add.image(pos.x, base + bajo, pos.prop, '__BASE').setOrigin(0.5, 1).setScale(s)
        .setFlipX(espejo).setDepth(profundidad).setTint(pos.tinte || 0xffffff);
      if (datos.flota) {
        this.tweens.add({ targets: imagen, y: base + 3, angle: 1.2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      // Pasto y piedras delante de la base (si está apoyado en tierra).
      if (!datos.flota && !pos.piso) this.taparBase(izquierda, base, ancho);

      (datos.pisos || []).forEach(([x0, x1, y]) => {
        const [a, b] = rango(x0, x1);
        this.agregarPasarela(this.add.zone((a + b) / 2, py(y) + 3, b - a, 6));
      });
      (datos.solidos || []).forEach(([x0, x1, y]) => {
        const [a, b] = rango(x0, x1);
        this.agregarPasarela(this.add.zone((a + b) / 2, py(y) + 3, b - a, 6));
      });
      (datos.escaleras || []).forEach(([x0, x1, y]) => {
        const [a, b] = rango(x0, x1);
        const centro = (a + b) / 2;
        this.escaleras.push({ x0: a, x1: b, centro, arriba: py(y), abajo: this.sueloBajo(centro, py(y) + 8) });
      });
      if (datos.puerta) {
        const [x0, x1, y0, y1] = datos.puerta;
        const [a, b] = rango(x0, x1);
        this.puertas.push({ id: `${pos.prop}-${indice}`, interior: datos.interior, x0: a, x1: b, arriba: py(y0), abajo: py(y1) });
      }
      if (pos.enemigo) this.puestosEnemigo.push({ x: pos.x, y: py(datos.pisos[0][2]), mira: -1 });
    });

    // Con el debug de física activo, las escaleras se marcan en celeste.
    if (this.physics.world.drawDebug) {
      const g = this.add.graphics().setDepth(30).lineStyle(2, 0x00ffff);
      this.escaleras.forEach((e) => g.strokeRect(e.x0, e.arriba, e.x1 - e.x0, e.abajo - e.arriba));
    }
  }

  // Enemigo provisional en las torres: el soldado teñido, quieto y mirando
  // hacia la entrada, con su sombra. En el suelo patrullan las cholitas.
  crearEnemigos() {
    // Soldados (Soldados.js): los de las marcas E patrullan; los de las torres vigilan.
    this.crearSoldados([
      ...this.posiciones('E').map(({ x, abajo }) => ({ x, abajo })),
      ...this.puestosEnemigo.map(({ x, y }) => ({ x, abajo: y, torre: true }))
    ]);
    this.crearCholitas();
  }

  // ---------------------------------------------------------------------------
  // Cholitas
  // ---------------------------------------------------------------------------

  crearCholitas() {
    // Dos animaciones por pollera, de la fila i del spritesheet.
    const porFila = CHOLITA.caminar + CHOLITA.ataque;
    CHOLITA.polleras.forEach((pollera, fila) => {
      const inicio = fila * porFila;
      if (this.anims.exists(`cholita_${pollera}`)) return;
      this.anims.create({
        key: `cholita_${pollera}`,
        frames: this.anims.generateFrameNumbers('cholita', { start: inicio, end: inicio + CHOLITA.caminar - 1 }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: `cholita_ataque_${pollera}`,
        frames: this.anims.generateFrameNumbers('cholita', { start: inicio + CHOLITA.caminar, end: inicio + porFila - 1 }),
        frameRate: 11
      });
      const rip = fila * CHOLITA.rip.cuadros;
      this.anims.create({
        key: `cholita_rip_${pollera}`,
        frames: this.anims.generateFrameNumbers('cholitaRip', { start: rip, end: rip + CHOLITA.rip.cuadros - 1 }),
        frameRate: 9
      });
      const quemada = fila * CHOLITA.quemada.cuadros;
      this.anims.create({
        key: `cholita_quemada_${pollera}`,
        frames: this.anims.generateFrameNumbers('cholitaQuemada', { frames: CHOLITA.quemada.secuencia.map((k) => quemada + k) }),
        frameRate: 8
      });
    });

    this.cholitas = this.physics.add.group({ allowGravity: true });
    // Las polleras se reparten mezcladas, sin repetir hasta usar todas.
    const polleras = this.rnd.shuffle([...CHOLITA.polleras]);
    this.posiciones('C').forEach(({ x, abajo }, i) => {
      const pollera = polleras[i % polleras.length];
      const c = this.cholitas.create(x, abajo - 4, 'cholita', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.6);
      c.body.setSize(CHOLITA.cuerpo.ancho, CHOLITA.cuerpo.alto)
        .setOffset((CHOLITA.ancho - CHOLITA.cuerpo.ancho) / 2, CHOLITA.alto - CHOLITA.cuerpo.alto);
      const direccion = this.rnd.pick([-1, 1]);
      c.setData({ estado: 'ronda', pollera, origen: x, direccion, rampa: null, xAnterior: c.body.x, atacaDesde: 0 });
      const sombra = this.crearSombra(SOMBRA.cholita, 9.3);
      c.setData('sombra', sombra);
      c.once('destroy', () => sombra.destroy());
      c.play({ key: `cholita_${pollera}`, startFrame: this.rnd.between(0, CHOLITA.caminar - 1) });
    });

    this.physics.add.collider(this.cholitas, this.suelo, null, (c) => !c.getData('rampa'));
    this.physics.add.collider(this.cholitas, this.obstaculos);
    this.physics.add.collider(this.cholitas, this.pasarelas, null, (c, tramo) => this.puedePisar(c, tramo));
    this.physics.add.overlap(this.jugador, this.cholitas, (j, c) => this.chocarCholita(c));
    this.physics.add.overlap(this.balas, this.cholitas, (bala, c) => {
      const estado = c.getData('estado');
      if (estado !== 'ronda' && estado !== 'ataque') return;
      if (this.impactoBala(bala)) return; // cohete o granada: explota en área (Jugador.js)
      // La llamarada del lanzallamas la prende fuego; las balas, sangre.
      const fuego = bala.getData('tipo') === 'llama';
      if (!fuego) sangrar(this, bala.x, bala.y, bala.body.velocity.x < 0 ? -1 : 1); // Efectos.js
      bala.destroy();
      this.vencerCholita(c, bala.x, fuego);
    });
  }

  // Ronda: camina de un lado a otro alrededor de su origen y da la vuelta
  // contra un muro, al final de su tramo o antes de caerse (al río, por un
  // borde). Si ve al jugador cerca y a su altura, lo corre (sin salir de su
  // zona ni tirarse por los bordes).
  moverCholitas() {
    const j = this.jugador;
    this.cholitas.getChildren().forEach((c) => {
      if (c.getData('estado') !== 'ronda') return;
      const cuerpo = c.body;
      if (c.getData('rampa')) this.frenarContraMuro(c, c.getData('xAnterior'));
      const rampa = this.pegarARampa(c, true);
      if (!rampa && c.getData('rampa')) this.asentarEnPiedra(c);
      c.setData('rampa', rampa).setData('xAnterior', cuerpo.x);

      const origen = c.getData('origen');
      let direccion = c.getData('direccion');
      const dx = j.body.center.x - cuerpo.center.x;
      const ve = this.estado === 'control' && Math.abs(dx) < CHOLITA.vista &&
        Math.abs(j.body.bottom - cuerpo.bottom) < CHOLITA.vistaAlto;
      const enSuelo = cuerpo.blocked.down || cuerpo.touching.down || !!rampa;
      if (ve && enSuelo && Math.abs(dx) < CHOLITA.alcance && this.time.now > c.getData('atacaDesde')) {
        this.atacarCholita(c, Math.sign(dx) || 1);
        return;
      }
      if (ve) {
        direccion = Math.sign(dx) || direccion;
      } else if (cuerpo.center.x < origen - CHOLITA.ronda) {
        direccion = 1;
      } else if (cuerpo.center.x > origen + CHOLITA.ronda) {
        direccion = -1;
      }
      if ((direccion < 0 && (cuerpo.blocked.left || cuerpo.touching.left)) ||
        (direccion > 0 && (cuerpo.blocked.right || cuerpo.touching.right))) direccion = -direccion;

      // Antes de dar el paso mira el suelo de adelante.
      const adelante = cuerpo.center.x + direccion * (cuerpo.width / 2 + 12);
      const borde = enSuelo && this.sueloBajo(adelante, cuerpo.bottom - 20) > cuerpo.bottom + 30;
      const fueraDeZona = Math.abs(adelante - origen) > CHOLITA.ronda * 1.6;
      let velocidad = ve ? CHOLITA.persecucion : CHOLITA.velocidad;
      if (borde || fueraDeZona) {
        if (ve) velocidad = 0;       // persiguiendo: se planta en el borde
        else direccion = -direccion; // de ronda: da la vuelta
      }
      c.setData('direccion', direccion);
      c.setFlipX(direccion < 0);
      // De cerca se planta (si no, se le mete encima al jugador) y espera para pegar.
      if (ve && Math.abs(dx) < CHOLITA.alcance) velocidad = 0;
      cuerpo.setVelocityX(direccion * velocidad);
      if (velocidad) {
        c.anims.resume();
        c.anims.timeScale = velocidad / CHOLITA.velocidad * 0.7;
      } else {
        c.anims.pause();
      }
    });
  }

  // Bolsazo: se planta mirando al jugador, levanta la bolsa y la revolea. En
  // el cuadro del golpe, si el jugador sigue al alcance y adelante, lo empuja.
  atacarCholita(c, lado) {
    const pollera = c.getData('pollera');
    c.setData('estado', 'ataque').setFlipX(lado < 0);
    c.body.setVelocityX(0);
    c.anims.timeScale = 1;
    c.play(`cholita_ataque_${pollera}`);
    const alGolpe = (anim, cuadro) => {
      if (cuadro.index - 1 !== CHOLITA.golpe || c.getData('estado') !== 'ataque') return;
      const j = this.jugador;
      const dx = j.body.center.x - c.body.center.x;
      const adelante = Math.sign(dx) === lado || Math.abs(dx) < 10;
      if (adelante && Math.abs(dx) < CHOLITA.alcance + 20 && Math.abs(j.body.bottom - c.body.bottom) < 70) {
        this.golpearJugador(c.body.center.x);
      }
    };
    c.on('animationupdate', alGolpe);
    c.once('animationcomplete', () => {
      c.off('animationupdate', alGolpe);
      if (c.getData('estado') !== 'ataque') return; // la vencieron en medio del ataque
      c.setData('estado', 'ronda').setData('atacaDesde', this.time.now + CHOLITA.pausaAtaque);
      c.play(`cholita_${pollera}`);
    });
  }

  // Si el jugador le cae encima, la cholita queda fuera de combate y él
  // rebota. Si no, el jugador sale despedido hacia atrás y parpadea un rato.
  chocarCholita(c) {
    const estado = c.getData('estado');
    if (this.estado !== 'control' || (estado !== 'ronda' && estado !== 'ataque')) return;
    const j = this.jugador;
    const desdeArriba = j.body.velocity.y > 0 && j.body.prev.y + j.body.height <= c.body.top + 14;
    if (desdeArriba) {
      j.setVelocityY(-JUGADOR.salto * 0.6);
      this.vencerCholita(c);
      return;
    }
    if (this.golpearJugador(c.body.center.x) && estado === 'ronda') {
      // Ella se queda un momento parada, mirándolo.
      const lado = Math.sign(j.body.center.x - c.body.center.x) || 1;
      c.setFlipX(lado < 0).setData('direccion', lado);
    }
  }

  // Fuera de combate: el golpe la tira para atrás (cholita_rip: pierde el
  // sombrero, cae sentada y queda tendida), y después se desvanece. Los
  // cuadros miran a la derecha y cae hacia atrás: mira hacia quien le pegó.
  // fuego: por el lanzallamas, una granada o un cohete se prende fuego, corre
  // gritando y queda hecha ceniza; si no, cae con sangre.
  vencerCholita(c, desdeX = this.jugador.x, fuego = false) {
    c.setData('estado', 'vencida');
    sumarPuntos(this, 100);
    c.body.enable = false;
    c.anims.timeScale = 1;
    this.aviso(c.x, c.y - CHOLITA.alto * ESCALA, '¡AYAYAY!', 'rojo');
    const lejos = desdeX < c.x ? 1 : -1; // hacia el lado contrario al golpe
    if (fuego) {
      // Corre para el otro lado mientras se quema (los cuadros miran a la derecha).
      c.setFlipX(lejos < 0);
      c.play(`cholita_quemada_${c.getData('pollera')}`);
      this.tweens.add({ targets: c, x: c.x + lejos * CHOLITA.quemada.corre, duration: 1100, ease: 'Sine.out' });
    } else {
      c.setFlipX(desdeX < c.x);
      c.play(`cholita_rip_${c.getData('pollera')}`);
      estallidoSangre(this, c.x, c.y - CHOLITA.alto * ESCALA * 0.45); // Efectos.js
      // Al caer se corre un poco para atrás.
      this.tweens.add({ targets: c, x: c.x + lejos * 30, duration: 450, ease: 'Quad.out' });
    }
    c.once('animationcomplete', () => {
      this.tweens.add({ targets: [c, c.getData('sombra')], alpha: 0, delay: 1400, duration: 500, onComplete: () => c.destroy() });
    });
  }

  escaleraEn(sprite) {
    const b = sprite.body;
    return this.escaleras.find((e) => b.center.x > e.x0 - 8 && b.center.x < e.x1 + 8 &&
      b.bottom > e.arriba - 14 && b.bottom < e.abajo + 6) || null;
  }

  empezarATrepar(escalera) {
    const j = this.jugador;
    this.trepando = escalera;
    this.rampaActual = null;
    this.posturaJugador(false, false, false); // se levanta para trepar
    j.body.setAllowGravity(false);
    j.body.x += escalera.centro - j.body.center.x; // se centra en la escalera
    j.setVelocity(0);
    j.anims.stop();
    if (this.cuadrosJugador.trepar) j.setFrame(this.cuadrosJugador.trepar[0]);
  }

  // Sube o baja; al llegar arriba queda parado en el piso, al llegar abajo
  // en el suelo. ESPACIO salta fuera y los costados lo sueltan.
  trepar(arriba, abajo, espacio, costado) {
    const j = this.jugador;
    const e = this.trepando;
    this.bajandoHasta = this.time.now + 120; // atraviesa los pisos one-way mientras trepa
    const terminar = () => {
      this.trepando = null;
      this.bajandoHasta = 0;
      j.body.setAllowGravity(true);
    };

    if (espacio && !this.saltoPresionado) {
      terminar();
      j.setVelocityY(-JUGADOR.salto * 0.7);
    } else if (costado) {
      terminar();
    } else if (arriba && j.body.bottom <= e.arriba + 2) {
      j.body.y += e.arriba - j.body.bottom; // llegó: se para sobre el piso
      j.setVelocityY(0);
      terminar();
    } else if (abajo && j.body.bottom >= e.abajo - 2) {
      terminar();
    } else {
      j.setVelocity(0, arriba ? -ESCALERA.velocidad : abajo ? ESCALERA.velocidad : 0);
    }
    this.saltoPresionado = espacio;

    // Sin cuadros de trepar: el paso de caminar, más lento, al moverse.
    if (this.trepando && (arriba || abajo)) {
      const propios = !!this.cuadrosJugador.trepar;
      j.anims.play(propios ? 'jugador_trepar' : 'jugador_caminar', true);
      j.anims.timeScale = propios ? 1 : 0.6;
    } else {
      j.anims.stop();
    }
    this.mostrarArmaLarga(); // Jugador.js: trepando no se ve
    this.xAnterior = j.body.x;
  }

  // ---------------------------------------------------------------------------
  // Contacto con el suelo: sombras, pasto delante de los pies y detalles
  // ---------------------------------------------------------------------------

  // Sombra fija en la base de un prop u obstáculo.
  sombraBase(x, y, ancho, profundidad, alto = SOMBRA.alto + 2, alfa = SOMBRA.alfa) {
    return this.add.ellipse(x, y - 2, ancho, alto, 0x000000, alfa).setDepth(profundidad);
  }

  // Sombra que sigue a un personaje (se actualiza cada cuadro).
  crearSombra(ancho, profundidad) {
    return this.add.ellipse(0, 0, ancho, SOMBRA.alto, 0x000000, SOMBRA.alfa).setDepth(profundidad);
  }

  // Primer apoyo debajo de los pies: suelo del mapa, pasarela u obstáculo.
  apoyoDebajo(x, pies) {
    // Adentro de la cueva el piso es la pendiente del JSON (no el mapa).
    const enCueva = this.pisoEntrada ? this.pisoEntrada(x) : null;
    let y = enCueva !== null ? enCueva : this.sueloBajo(x, pies - 10);
    const mirar = (grupo) => grupo.getChildren().forEach((zona) => {
      const b = zona.body;
      if (x >= b.left && x <= b.right && b.top >= pies - 10 && b.top < y) y = b.top;
    });
    mirar(this.pasarelas);
    mirar(this.obstaculos);
    return y;
  }

  // La sombra se pega al apoyo de abajo; se achica y se aclara con la altura
  // (al saltar). En el agua no se ve.
  actualizarSombra(sombra, sprite) {
    if (!sombra || !sprite.active) return;
    const b = sprite.body;
    const x = b.center.x;
    const suelo = this.apoyoDebajo(x, b.bottom);
    const distancia = Math.max(0, suelo - b.bottom);
    const enAgua = this.rios.some((r) => x > r.ax0 && x < r.ax1 && suelo > r.superficie);
    if (enAgua || distancia > SOMBRA.alturaMaxima) {
      sombra.setVisible(false);
      return;
    }
    const f = Phaser.Math.Clamp(1 - distancia / SOMBRA.alturaMaxima, 0.3, 1);
    sombra.setVisible(true).setPosition(x, suelo - 1).setScale(f).setAlpha(f);
  }

  // Piedritas y pasto tapando la base de las patas de un prop. Solo donde el
  // suelo está a la altura de la base: un prop puede quedar en parte sobre
  // una rampa o un borde, y ahí el pasto quedaría en el aire.
  taparBase(izquierda, base, ancho) {
    for (let x = izquierda + 6; x < izquierda + ancho - 6; x += this.rnd.between(14, 30)) {
      if (Math.abs(this.sueloBajo(x, base - 20) - base) > 6) continue;
      const textura = this.rnd.frac() < 0.6 ? `mata${this.rnd.between(0, 2)}` : 'piedrasSueltas';
      this.add.image(x, base + 4, textura).setOrigin(0.5, 1).setScale(ESCALA).setDepth(2.5).setFlipX(this.rnd.frac() < 0.5);
    }
  }

  // Camino de tierra sobre cada tramo de suelo plano a la vista: la
  // superficie (fila 8 de la textura) cae justo en la línea de colisión. Va
  // delante de la piedra y de los pilotes, detrás de props y jugador.
  crearCaminoTierra() {
    texturaCaminoTierra(this, 'caminoTierra', 'camino');
    // El hueco de la cueva cuenta como aire: la tierra sigue por debajo de ella.
    const hueco = (col, fila) => ENTRADA_CUEVA.hueco.some(([c, f]) => c === col && f === fila);
    const esSuelo = (col, fila) => {
      const arriba = hueco(col, fila - 1) ? '.' : this.celda(col, fila - 1);
      return this.celda(col, fila) === 'S' && !hueco(col, fila) && !this.esLecho(col, fila) && arriba !== 'S' && arriba !== 'A' && !RAMPAS[arriba];
    };
    for (let fila = 0; fila < this.filas; fila++) {
      for (let col = 0; col < this.columnas; col++) {
        if (!esSuelo(col, fila) || esSuelo(col - 1, fila)) continue;
        let fin = col;
        while (esSuelo(fin + 1, fila)) fin++;
        const ancho = (fin - col + 1) * TILE;
        this.add.tileSprite(col * TILE, fila * TILE + SUELO_Y - 8 * ESCALA, ancho / ESCALA, 30, 'caminoTierra')
          .setOrigin(0).setScale(ESCALA).setDepth(1).setTilePosition(col * 37, 0);
      }
    }
  }

  // Sobre cada tramo de piedra a la vista (no bajo el agua): detalles chicos
  // detrás del jugador y matas de pasto delante, que le tapan un poco los pies.
  crearDetallesSuelo() {
    const detalles = ['piedrasSueltas', 'troncoCaido', 'helechoChico', 'cajaMunicion', 'sacosChicos', 'piedrasSueltas'];
    this.cadaCelda('S', (col, fila) => {
      const arriba = this.celda(col, fila - 1);
      if (this.esLecho(col, fila) || arriba === 'S' || arriba === 'A' || RAMPAS[arriba]) return;
      const suelo = fila * TILE + SUELO_Y;
      const x0 = col * TILE;
      if (this.rnd.frac() < 0.45) {
        this.add.image(x0 + this.rnd.between(16, TILE - 16), suelo + HUNDIDO, this.rnd.pick(detalles))
          .setOrigin(0.5, 1).setScale(ESCALA).setDepth(1.8).setFlipX(this.rnd.frac() < 0.5);
      }
      for (let k = this.rnd.between(0, 2); k > 0; k--) {
        this.add.image(x0 + this.rnd.between(8, TILE - 8), suelo + 8, `mata${this.rnd.between(0, 2)}`)
          .setOrigin(0.5, 1).setScale(ESCALA).setDepth(10.5).setFlipX(this.rnd.frac() < 0.5);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Recompensas y HUD
  // ---------------------------------------------------------------------------

  crearHUD() {
    // Arriba de todo: la barra de vida (Jugador.js) empieza en y 36.
    this.hud = TextFX.hud(this, 16, 8, '', { color: 'oro', origen: 0 }).setDepth(20);
    this.actualizarHUD();
  }

  actualizarHUD() {
    this.hud.setText(`REHENES ${this.registry.get('rehenes')}/${this.totalRehenes}   ` +
      `POWER-UP ${this.registry.get('powerups')}/${this.totalPowerups}`);
  }

  // color: 'oro', 'plata' o 'rojo' (TextFX).
  aviso(x, y, texto, color = 'plata') {
    TextFX.popup(this, x, y, texto, { color }).setDepth(20);
  }

  crearAnimacionesNpc() {
    if (this.anims.exists('npc_atado')) return;
    // Atado: respira quieto y cada tanto forcejea con las sogas.
    this.anims.create({ key: 'npc_atado', frames: this.anims.generateFrameNumbers('npcRescate', { frames: [0, 1, 0, 1, 0, 1, 2, 3, 4, 3] }), frameRate: 5, repeat: -1 });
    // Liberado: se suelta las sogas, revolea el poncho y saluda.
    this.anims.create({ key: 'npc_libre', frames: this.anims.generateFrameNumbers('npcRescate', { start: 5, end: 8 }), frameRate: 8 });
    // Sale corriendo (el primer cuadro de la tira es una pose suelta: no va en el ciclo).
    this.anims.create({ key: 'npc_sale', frames: this.anims.generateFrameNumbers('npcSale', { start: 1, end: 10 }), frameRate: 14, repeat: -1 });
  }

  // Estado 1 -> 2: el jugador lo toca. Se libera, agradece, saluda y después
  // (estado 3) sale corriendo hacia la izquierda.
  rescatar(rehen) {
    if (rehen.getData('estado') !== 'atado') return;
    rehen.setData('estado', 'libre');
    this.registry.inc('rehenes');
    this.actualizarHUD();
    rescateHUD(this); // Estado.js: ¡REHÉN RESCATADO! (y puntos)
    this.aviso(rehen.x, rehen.y - NPC.alto * ESCALA, '¡GRACIAS!', 'oro');
    rehen.play('npc_libre');
    rehen.once('animationcomplete', () => {
      this.time.delayedCall(NPC.saludo, () => {
        if (!rehen.active) return;
        rehen.setData('estado', 'sale').setData('desde', this.time.now).setData('xAnterior', rehen.body.x);
        rehen.play('npc_sale');
        rehen.setVelocityX(-NPC.velocidadHuida);
      });
    });
  }

  // Estado 3: corre por el terreno hasta salir de la pantalla.
  moverRehenes() {
    this.rehenes.getChildren().forEach((rehen) => {
      if (rehen.getData('estado') === 'sale') this.correrFuera(rehen, -NPC.velocidadHuida);
    });
  }

  // Un NPC que se va: corre por el terreno (rampas incluidas), salta si un
  // muro le corta el paso y desaparece cuando sale de la pantalla o del mapa.
  // velocidad: negativa hacia la izquierda. Necesita los datos 'desde',
  // 'xAnterior' y 'rampa'.
  correrFuera(npc, velocidad) {
    const cam = this.cameras.main;
    const cuerpo = npc.body;
    if (npc.getData('rampa')) this.frenarContraMuro(npc, npc.getData('xAnterior'));
    const rampa = this.pegarARampa(npc, true);
    if (!rampa && npc.getData('rampa')) this.asentarEnPiedra(npc);
    npc.setData('rampa', rampa).setData('xAnterior', cuerpo.x);
    const enSuelo = cuerpo.blocked.down || cuerpo.touching.down || !!rampa;
    const trabado = velocidad < 0 ? cuerpo.blocked.left || cuerpo.touching.left : cuerpo.blocked.right || cuerpo.touching.right;
    if (enSuelo && trabado) cuerpo.setVelocityY(-JUGADOR.salto * 0.8);
    cuerpo.setVelocityX(velocidad);

    const fuera = cuerpo.right < cam.worldView.x - 60 || cuerpo.left > cam.worldView.right + 60 ||
      cuerpo.x <= 0 || cuerpo.right >= this.anchoNivel || cuerpo.y > this.altoNivel;
    if (fuera || this.time.now - npc.getData('desde') > 9000) npc.destroy();
  }

  // ---------------------------------------------------------------------------
  // NPC de la hamburguesa
  // ---------------------------------------------------------------------------

  crearNpcsPower() {
    Object.entries(NPC_POWER.cuadros).forEach(([nombre, frames]) => {
      const key = `power_${nombre}`;
      if (this.anims.exists(key)) return;
      const repetir = nombre === 'espera' || nombre === 'saluda' || nombre === 'corre';
      this.anims.create({
        key, frames: this.anims.generateFrameNumbers('npcPower', { frames }),
        frameRate: nombre === 'corre' ? 12 : nombre === 'espera' ? 4 : 8, repeat: repetir ? -1 : 0
      });
    });

    this.npcsPower = this.physics.add.group({ allowGravity: true });
    this.posiciones('N').forEach(({ x, abajo }) => {
      const npc = this.npcsPower.create(x, abajo - 10, 'npcPower', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(9.5);
      npc.body.setSize(NPC_POWER.cuerpo.ancho, NPC_POWER.cuerpo.alto)
        .setOffset((NPC_POWER.ancho - NPC_POWER.cuerpo.ancho) / 2, NPC_POWER.alto - NPC_POWER.cuerpo.alto);
      npc.setData('estado', 'espera');
      const sombra = this.crearSombra(SOMBRA.npcPower, 9.3);
      npc.setData('sombra', sombra);
      npc.once('destroy', () => sombra.destroy());
      npc.play('power_espera');
    });
    this.physics.add.collider(this.npcsPower, this.suelo, null, (n) => !n.getData('rampa'));
    this.physics.add.collider(this.npcsPower, this.obstaculos);
    this.physics.add.collider(this.npcsPower, this.pasarelas, null, (n, tramo) => this.puedePisar(n, tramo));
  }

  // Esperando: saluda con la mano mientras el jugador está cerca y lo mira.
  // Yéndose: corre hacia la derecha.
  moverNpcsPower() {
    const j = this.jugador;
    this.npcsPower.getChildren().forEach((npc) => {
      const estado = npc.getData('estado');
      if (estado === 'sale') {
        this.correrFuera(npc, NPC_POWER.velocidadHuida);
        return;
      }
      if (estado !== 'espera') return;
      const cerca = this.estado === 'control' && Math.abs(j.x - npc.x) < NPC_POWER.cercania &&
        Math.abs(j.body.bottom - npc.body.bottom) < 120;
      npc.anims.play(cerca ? 'power_saluda' : 'power_espera', true);
      // Los cuadros miran a la derecha: si el jugador viene de la izquierda, se da vuelta.
      if (cerca) npc.setFlipX(j.x < npc.x);
    });
  }

  // Al tocarlo: entrega la hamburguesa (suma un power-up), festeja con un
  // salto, hace la venia y desaparece (puf: humo y destello).
  recibirHamburguesa(npc) {
    if (npc.getData('estado') !== 'espera') return;
    npc.setData('estado', 'entrega');
    npc.setFlipX(this.jugador.x < npc.x);
    npc.body.setVelocityX(0);
    npc.play('power_entrega');
    // En el cuadro en que la ofrece, el jugador la recibe.
    this.time.delayedCall(450, () => {
      if (!npc.active) return;
      this.registry.inc('powerups');
      this.registry.inc('powerupsTotal');
      sumarPuntos(this, PARTIDA.puntosPowerup);
      this.actualizarHUD();
      this.curarJugador(VIDA.hamburguesa); // media barra de vida (Jugador.js)
      this.aviso(npc.x, npc.y - NPC_POWER.alto * ESCALA, '¡HAMBURGUESA! +MEDIA VIDA', 'oro');
      this.cameras.main.flash(120, 255, 200, 120);
    });
    npc.once('animationcomplete', () => {
      if (!npc.active) return;
      npc.play('power_festeja');
      // El salto lo hace la física (un tween en y pelearía con la gravedad).
      const impulso = Math.sqrt(2 * this.physics.world.gravity.y * NPC_POWER.salto);
      this.time.delayedCall(200, () => { if (npc.active) npc.body.setVelocityY(-impulso); });
      npc.once('animationcomplete', () => {
        if (!npc.active) return;
        npc.play('power_venia');
        npc.once('animationcomplete', () => {
          if (!npc.active) return;
          this.desaparecerNpc(npc);
        });
      });
    });
  }

  // Puf: nube de humo, destello y se achica hasta desaparecer.
  desaparecerNpc(npc) {
    npc.setData('estado', 'desaparece');
    npc.body.enable = false;
    const x = npc.x;
    const y = npc.y - NPC_POWER.alto * ESCALA * 0.45;
    const humo = this.add.particles(x, y, 'fx_humo', {
      speed: { min: 30, max: 110 }, lifespan: 650, scale: { start: 2.5, end: 5 },
      alpha: { start: 0.7, end: 0 }, tint: 0xe8e4d8, emitting: false
    }).setDepth(9.6);
    humo.explode(14);
    this.time.delayedCall(700, () => humo.destroy());
    chispas(this, x, y, 12, -90, 360, 9.7);
    this.tweens.add({
      targets: npc, scaleX: 0, scaleY: ESCALA * 1.3, alpha: 0, duration: 220, ease: 'Back.in',
      onComplete: () => npc.destroy()
    });
  }

  recoger(powerup) {
    this.registry.inc('powerups');
    this.registry.inc('powerupsTotal');
    sumarPuntos(this, PARTIDA.puntosPowerup);
    this.actualizarHUD();
    this.aviso(powerup.x, powerup.y - 30, '¡POWER-UP!', 'plata');
    this.cameras.main.flash(120, 255, 240, 160);
    powerup.destroy();
  }

  llegarMeta() {
    if (this.estado === 'fin') return;
    this.estado = 'fin';
    this.jugador.setVelocityX(0).anims.stop();
    const { width, height } = this.scale;
    misionCompleta(this); // Estado.js: tabla de puntaje
  }

  // Al apagar el modo admin (Admin.js) dentro de la piedra: sube hasta la
  // primera celda libre y queda parado en su piso.
  salirDeLaRoca() {
    const b = this.jugador.body;
    const col = Math.floor(b.center.x / TILE);
    let fila = Math.floor((b.bottom - SUELO_Y - 1) / TILE);
    if (!this.esSolido(col, fila)) return;
    while (fila > 0 && this.esSolido(col, fila)) fila--;
    this.jugador.body.reset(b.center.x, (fila + 1) * TILE + SUELO_Y - 30 * ESCALA);
  }

  // ---------------------------------------------------------------------------

  update(time, delta) {
    // Editor de la colisión de la entrada a la cueva (tecla E).
    if (this.estado === 'editor') { this.moverEditor(); this.actualizarParalaje(); return; }
    // Modo admin (Admin.js): noclip y la cámara sin el tope del peñón.
    const admin = this.estado === 'control' && noclipJugador(this);
    if (admin) {
      this.cameras.main.setBounds(0, 0, this.anchoNivel, this.altoNivel);
      this.ladoPenon = null;
    } else {
      this.limitarCamaraPenon();
    }
    this.animarRios(delta);
    this.actualizarParalaje();
    this.actualizarSombra(this.sombraJugador, this.jugador);
    this.rehenes.getChildren().forEach((r) => this.actualizarSombra(r.getData('sombra'), r));
    this.cholitas.getChildren().forEach((c) => {
      if (c.getData('estado') !== 'vencida') this.actualizarSombra(c.getData('sombra'), c);
    });
    this.npcsPower.getChildren().forEach((n) => this.actualizarSombra(n.getData('sombra'), n));

    const j = this.jugador;
    // La entrada termina al llegar a su lugar o si algo le corta el paso.
    if (this.estado === 'entrada' && (j.x >= this.inicio.x || j.body.blocked.right || j.body.touching.right)) {
      this.terminarEntrada();
    }
    if (this.estado === 'control' && !admin) this.moverJugador();
    else if (!admin) cerrarSelector(this, false); // si el jugador deja de moverse (meta, puerta), sin cámara lenta
    this.actualizarEntradaCueva(admin);
    this.moverRehenes();
    this.moverCholitas();
    this.moverSoldados(); // Soldados.js
    this.moverNpcsPower();
    this.moverBalas();
  }
}

// Movimiento, animación, disparos y golpes del jugador (Jugador.js).
Object.assign(Nivel1.prototype, AccionesJugador);

// Texturas chicas de la entrada a la cueva (las grandes son archivos de
// assets/cueva/, herramientas/entrada_cueva.py):
//   cuevaOscuridad  el negro de adentro: transparente en la boca, ENTRADA_CUEVA.oscuro
//                   al fondo (casi negro al final), difuminado arriba y abajo
function texturasEntradaCueva(escena) {
  if (escena.textures.exists('cuevaOscuridad')) return;
  const C = ENTRADA_CUEVA;
  const o = escena.textures.createCanvas('cuevaOscuridad', 256, 128);
  const ctx = o.getContext();
  const img = ctx.createImageData(256, 128);
  const suave = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < 128; y++) {
    const v = y / 127;
    const fy = suave(Math.min(1, v / 0.22)) * suave(Math.min(1, (1 - v) / 0.06 + 0.4));
    for (let x = 0; x < 256; x++) {
      const t = x / 255;
      const fx = 0.35 + (C.oscuro - 0.35) * suave(Math.min(1, t / 0.4)) + (1 - C.oscuro) * suave(Math.max(0, Math.min(1, (t - 0.5) / 0.3)));
      const i = (y * 256 + x) * 4;
      img.data[i] = 4;
      img.data[i + 1] = 3;
      img.data[i + 2] = 6;
      img.data[i + 3] = Math.round(255 * fx * fy);
    }
  }
  ctx.putImageData(img, 0, 0);
  o.refresh();
  // La del suelo: el mismo degradado hacia el fondo, entera arriba y nula abajo.
  const os = escena.textures.createCanvas('cuevaOscuridadSuelo', 256, 64);
  const cs = os.getContext();
  const is = cs.createImageData(256, 64);
  for (let y = 0; y < 64; y++) {
    const fy = 1 - suave(y / 63);
    for (let x = 0; x < 256; x++) {
      const t = x / 255;
      const fx = 0.35 + (C.oscuro - 0.35) * suave(Math.min(1, t / 0.4)) + (1 - C.oscuro) * suave(Math.max(0, Math.min(1, (t - 0.5) / 0.3)));
      const i = (y * 256 + x) * 4;
      is.data[i] = 4;
      is.data[i + 1] = 3;
      is.data[i + 2] = 6;
      is.data[i + 3] = Math.round(255 * fx * fy);
    }
  }
  cs.putImageData(is, 0, 0);
  os.refresh();
}
