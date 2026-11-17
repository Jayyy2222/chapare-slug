// =============================================================================
// TextFX: todos los textos de BOLIVIA SLUG, al estilo arcade (Metal Slug).
//
// Fuentes bitmap: dorada ('oro'), plateada ('plata') y roja ('rojo'), más
// 'blanco' (destellos) y 'negro' (sombras y texto sobre fondos claros).
//
// - Si assets/fonts/fuentes.json nombra archivos BMFont (.png + .xml), se
//   cargan esos (ver cargarFuentesTextFX y assets/fonts/LEEME.md).
// - Mientras no estén, las fuentes se generan al vuelo desde "Press Start 2P":
//   cada letra se dibuja a 8 px, se pasa a píxeles duros, se pinta con un
//   degradé por fila (dorado arcade, plata, rojo o verde) y se le agrega un
//   contorno fino de 1 px (sin diagonales). Incluye tildes (Á É Í Ó Ú
//   Ñ Ü), ¡ ¿ ©, flechas y ► ◄, que la fuente original no trae.
//
// Reglas: siempre bitmapText, tamaño = tamaño base x escala entera, posiciones
// redondeadas, contorno negro y sombra dura (una copia negra desplazada 2 px
// abajo a la derecha, nada de sombras difuminadas).
//
// Uso: TextFX.title / menu / alert / hud / popup / texto / flecha / letras.
// Devuelven un TextoArcade (un Container con la sombra y el texto) que se usa
// como cualquier objeto: setDepth, setAlpha, setScrollFactor, tweens de x, y,
// alpha y scale, destroy. Además: setText, setOrigin, setColor, seleccionar,
// destellar.
// =============================================================================

const TEXTFX = {
  colores: ['oro', 'plata', 'rojo', 'verde', 'blanco', 'negro'],
  clave: (color) => 'textfx_' + color,
  sombra: 2,              // px de pantalla, abajo a la derecha
  // Fuente generada: letra de 8x8 + 2 filas arriba para tildes + contorno
  // fino de 1 px; avanza 9 (un px de aire entre letras).
  celda: { ancho: 10, alto: 12, avance: 9 },
  // Degradé por fila (fila 0 = arriba de la letra). Las tildes usan el primero.
  degradados: {
    // Dorado arcade (blanco cálido, amarillo oro, ámbar), plata fría, rojo ladrillo y verde.
    oro: ['#fffbe6', '#fff2a8', '#ffe466', '#ffd43a', '#f7bf28', '#e9a51e', '#d08816', '#ad6c10'],
    plata: ['#ffffff', '#f4f7fb', '#e4eaf2', '#d2dae6', '#bfc8d6', '#aab4c4', '#95a0b2', '#808b9e'],
    rojo: ['#ffd9cc', '#ffb3a0', '#f78c74', '#ec6a52', '#dc5040', '#c43c32', '#a62e28', '#86221e'],
    verde: ['#eaffd8', '#c4f7a0', '#9cee72', '#78e04e', '#5cc83a', '#46ac2e', '#358e24', '#26701a'],
    blanco: ['#ffffff'],
    negro: ['#000000']
  },

  contorno: '#1a0e04' // contorno fino de 1 px (casi negro, cálido)
};

// Letras que se generan. Las que Press Start 2P no trae se dibujan a mano.
const TEXTFX_LETRAS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
  + 'ÁÉÍÓÚÑÜáéíóúñü¡¿©·←→►◄';

// Dibujos de 7x7 (filas de arriba a abajo) para las letras que no trae la fuente.
const TEXTFX_DIBUJOS = {
  '©': ['.#####.', '#.....#', '#.###.#', '#.#...#', '#.###.#', '#.....#', '.#####.'],
  '·': ['.......', '.......', '..##...', '..##...', '.......', '.......', '.......'],
  '►': ['#......', '###....', '#####..', '#######', '#####..', '###....', '#......'],
  '◄': ['......#', '....###', '..#####', '#######', '..#####', '....###', '......#'],
  '→': ['...#...', '....#..', '.....#.', '#######', '.....#.', '....#..', '...#...'],
  '←': ['...#...', '..#....', '.#.....', '#######', '.#.....', '..#....', '...#...']
};

// Tildes: dos filas arriba de la letra (columnas 0-6).
const TEXTFX_TILDES = {
  aguda: ['....##.', '...##..'],
  dieresis: ['.......', '.##.##.'],
  enie: ['..##..#', '.#..##.']
};
const TEXTFX_ACENTUADAS = {
  'Á': ['A', 'aguda'], 'É': ['E', 'aguda'], 'Í': ['I', 'aguda'], 'Ó': ['O', 'aguda'], 'Ú': ['U', 'aguda'],
  'Ñ': ['N', 'enie'], 'Ü': ['U', 'dieresis'],
  'á': ['A', 'aguda'], 'é': ['E', 'aguda'], 'í': ['I', 'aguda'], 'ó': ['O', 'aguda'], 'ú': ['U', 'aguda'],
  'ñ': ['N', 'enie'], 'ü': ['U', 'dieresis']
};

// -----------------------------------------------------------------------------
// Carga y generación de fuentes
// -----------------------------------------------------------------------------

// Llamar en el preload de la primera escena (Menu). Lee assets/fonts/fuentes.json
// y carga los BMFont que nombre, p. ej. { "oro": "oro" } -> oro.png + oro.xml.
function cargarFuentesTextFX(escena) {
  if (escena.cache.json.exists('textfx_fuentes')) return;
  escena.load.json('textfx_fuentes', 'assets/fonts/fuentes.json');
  escena.load.once('filecomplete-json-textfx_fuentes', (_k, _t, datos) => {
    Object.entries((datos && datos.fuentes) || {}).forEach(([color, archivo]) => {
      if (!archivo || !TEXTFX.colores.includes(color)) return;
      escena.load.bitmapFont(TEXTFX.clave(color), `assets/fonts/${archivo}.png`, `assets/fonts/${archivo}.xml`);
    });
  });
}

// Deja listas las cinco fuentes (las que no vinieron como BMFont se generan).
function prepararFuentesTextFX(escena) {
  const cache = escena.cache.bitmapFont;
  if (TEXTFX.colores.every((c) => cache.exists(TEXTFX.clave(c)))) return;
  const mascaras = mascarasTextFX();
  TEXTFX.colores.forEach((color) => {
    if (!cache.exists(TEXTFX.clave(color))) generarFuenteTextFX(escena, color, mascaras);
  });
}

// Máscara 8x10 (2 filas de tilde + 8 de letra) de cada letra, con píxeles duros.
function mascarasTextFX() {
  if (mascarasTextFX.cache) return mascarasTextFX.cache;
  const lienzo = document.createElement('canvas');
  lienzo.width = 32;
  lienzo.height = 32;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  const leer = (letra) => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#fff';
    ctx.fillText(letra, 8, 8);
    const px = ctx.getImageData(0, 0, 32, 32).data;
    return (x, y) => px[(y * 32 + x) * 4 + 3] >= 128;
  };
  // La H marca dónde empieza la letra (arriba a la izquierda del cuadro de 8x8).
  const h = leer('H');
  let arriba = 32;
  let izq = 32;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (h(x, y)) { arriba = Math.min(arriba, y); izq = Math.min(izq, x); }
  if (arriba === 32) { arriba = 8; izq = 8; }

  const vacia = () => Array.from({ length: 10 }, () => new Array(8).fill(false));
  const deDibujo = (filas, dy = 2) => {
    const m = vacia();
    filas.forEach((fila, y) => [...fila].forEach((c, x) => { if (c === '#') m[y + dy][x] = true; }));
    return m;
  };
  const deFuente = (letra) => {
    const enFuente = leer(letra);
    const m = vacia();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) m[y + 2][x] = enFuente(izq + x, arriba + y);
    return m;
  };
  const mascaras = {};
  [...TEXTFX_LETRAS].forEach((letra) => {
    if (TEXTFX_DIBUJOS[letra]) mascaras[letra] = deDibujo(TEXTFX_DIBUJOS[letra]);
    else if (TEXTFX_ACENTUADAS[letra]) {
      const [base, tilde] = TEXTFX_ACENTUADAS[letra];
      const m = deFuente(base);
      TEXTFX_TILDES[tilde].forEach((fila, y) => [...fila].forEach((c, x) => { if (c === '#') m[y][x] = true; }));
      mascaras[letra] = m;
    } else if (letra === '¡' || letra === '¿') {
      // ! y ? dados vuelta (giro de 180° dentro del cuadro de 7x7).
      const original = deFuente(letra === '¡' ? '!' : '?');
      const m = vacia();
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) m[2 + 6 - y][6 - x] = original[2 + y][x];
      mascaras[letra] = m;
    } else mascaras[letra] = deFuente(letra);
  });
  mascarasTextFX.cache = mascaras;
  return mascaras;
}

function generarFuenteTextFX(escena, color, mascaras) {
  const { ancho, alto, avance } = TEXTFX.celda;
  const letras = [...TEXTFX_LETRAS];
  const porFila = 16;
  const filas = Math.ceil(letras.length / porFila);
  const clave = TEXTFX.clave(color);
  const textura = escena.textures.createCanvas(clave, porFila * ancho, filas * alto);
  const ctx = textura.getContext();
  const degradado = TEXTFX.degradados[color];
  letras.forEach((letra, i) => {
    const m = mascaras[letra];
    const ox = (i % porFila) * ancho + 1;
    const oy = Math.floor(i / porFila) * alto + 1;
    const lleno = (x, y) => y >= 0 && y < 10 && x >= 0 && x < 8 && m[y][x];
    // Contorno fino de 1 px: solo arriba, abajo y a los costados de la letra
    // (sin las diagonales: queda más liviano).
    ctx.fillStyle = TEXTFX.contorno;
    for (let y = -1; y <= 10; y++) {
      for (let x = -1; x <= 8; x++) {
        if (lleno(x, y)) continue;
        if (lleno(x - 1, y) || lleno(x + 1, y) || lleno(x, y - 1) || lleno(x, y + 1)) ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    // Relleno: degradé por fila (las filas de la tilde usan el primer color).
    for (let y = 0; y < 10; y++) {
      ctx.fillStyle = degradado[Math.min(degradado.length - 1, Math.max(0, y - 2))];
      for (let x = 0; x < 8; x++) if (m[y][x]) ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  textura.refresh();
  const fuente = Phaser.GameObjects.RetroFont.Parse(escena, {
    image: clave, width: ancho, height: alto, chars: TEXTFX_LETRAS, charsPerRow: porFila
  });
  // Las letras avanzan 9 px: un px de aire entre letras.
  Object.values(fuente.data.chars).forEach((c) => { c.xAdvance = avance; });
  escena.cache.bitmapFont.add(clave, fuente);
}

// -----------------------------------------------------------------------------
// TextoArcade: sombra negra + texto, en un Container
// -----------------------------------------------------------------------------

class TextoArcade extends Phaser.GameObjects.Container {
  constructor(escena, x, y, texto, opciones = {}) {
    super(escena, Math.round(x), Math.round(y));
    prepararFuentesTextFX(escena);
    const { color = 'plata', escala = 2, sombra = true } = opciones;
    this.color = color;
    this.escalaTexto = Math.max(1, Math.round(escala));
    const tam = (c) => escena.cache.bitmapFont.get(TEXTFX.clave(c)).data.size * this.escalaTexto;
    this.cargada = (c) => !escena.cache.bitmapFont.get(TEXTFX.clave(c)).data.retroFont;
    const s = TEXTFX.sombra;
    this.sombra = sombra
      ? escena.make.bitmapText({ x: s, y: s, font: TEXTFX.clave('negro'), text: String(texto), size: tam('negro') }, false)
      : null;
    this.texto = escena.make.bitmapText({ x: 0, y: 0, font: TEXTFX.clave(color), text: String(texto), size: tam(color) }, false);
    // Un BMFont cargado no trae versión negra: la sombra es el mismo texto teñido.
    if (this.sombra && this.cargada('negro') && this.sombra.setTintFill) this.sombra.setTintFill(0x000000);
    this.add(this.sombra ? [this.sombra, this.texto] : [this.texto]);
    this.setOrigin(opciones.origen ?? 0.5, opciones.origenY ?? opciones.origen ?? 0.5);
    escena.add.existing(this);
  }

  partes() {
    return this.sombra ? [this.sombra, this.texto] : [this.texto];
  }

  setText(texto) {
    this.partes().forEach((p) => p.setText(String(texto)));
    return this;
  }

  get text() {
    return this.texto.text;
  }

  // Ancho y alto del texto en pantalla (sin la sombra).
  get anchoTexto() {
    return this.texto.width * this.scaleX;
  }

  get altoTexto() {
    return this.texto.height * this.scaleY;
  }

  setOrigin(x = 0.5, y = x) {
    this.partes().forEach((p) => p.setOrigin(x, y));
    return this;
  }

  setColor(color) {
    if (color === this.color && !this.destellando) return this;
    this.color = color;
    if (!this.destellando) this.usarFuente(color);
    return this;
  }

  usarFuente(color) {
    const t = this.texto;
    t.setFont(TEXTFX.clave(color), t.fontSize);
    // Destello con un BMFont cargado sin versión blanca: tinte blanco.
    if (color === 'blanco' && this.cargada('blanco') && t.setTintFill) t.setTintFill(0xffffff);
    else if (t.clearTint) t.clearTint();
  }

  // Opción de menú: dorada con un rebote chico (1 -> 1.1 -> 1) o plateada.
  seleccionar(activa, conRebote = true) {
    const antes = this.color;
    this.setColor(activa ? 'oro' : 'plata');
    if (activa && conRebote && antes !== 'oro') {
      this.scene.tweens.killTweensOf(this);
      this.setScale(1);
      this.scene.tweens.add({ targets: this, scale: 1.1, duration: 90, yoyo: true, ease: 'Quad.out' });
    }
    return this;
  }

  // Destella en blanco `veces` veces y vuelve a su color.
  destellar(veces = 3, cada = 70, alTerminar) {
    this.destellando = true;
    let n = 0;
    const paso = () => {
      if (!this.active) return;
      const blanco = n % 2 === 0;
      this.usarFuente(blanco ? 'blanco' : this.color);
      n++;
      if (n < veces * 2) this.scene.time.delayedCall(cada, paso);
      else {
        this.destellando = false;
        if (alTerminar) alTerminar();
      }
    };
    paso();
    return this;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const TextFX = {
  // Texto genérico. opciones: color, escala (entera), origen, origenY, sombra.
  texto(escena, x, y, txt, opciones = {}) {
    return new TextoArcade(escena, x, y, txt, opciones);
  },

  // Títulos y carteles grandes (dorado, escala 4).
  title(escena, x, y, txt, opciones = {}) {
    return TextFX.texto(escena, x, y, txt, { color: 'oro', escala: 4, ...opciones });
  },

  // Opciones de menú (plateado; seleccionar() las pasa a dorado).
  menu(escena, x, y, txt, opciones = {}) {
    return TextFX.texto(escena, x, y, txt, { color: 'plata', escala: 2, ...opciones });
  },

  // Avisos importantes (rojo, escala 4), p. ej. MISIÓN FALLIDA.
  alert(escena, x, y, txt, opciones = {}) {
    return TextFX.texto(escena, x, y, txt, { color: 'rojo', escala: 4, ...opciones });
  },

  // Textos fijos en pantalla (no se mueven con la cámara).
  hud(escena, x, y, txt, opciones = {}) {
    return TextFX.texto(escena, x, y, txt, { color: 'plata', escala: 2, ...opciones }).setScrollFactor(0);
  },

  // Texto que sube y se desvanece solo (puntos, ¡GRACIAS!, armas...).
  popup(escena, x, y, txt, opciones = {}) {
    const { subir = 40, duracion = 1200, ...resto } = opciones;
    const t = TextFX.texto(escena, x, y, txt, { color: 'oro', escala: 2, ...resto });
    // Aparece de golpe (crece con rebote y destella), después sube y se va.
    t.setScale(0.2).setAngle(Phaser.Math.Between(-4, 4));
    escena.tweens.add({ targets: t, scale: 1, angle: 0, duration: 180, ease: 'Back.out' });
    t.destellar(1, 60);
    escena.tweens.add({
      targets: t, y: t.y - subir, duration: duracion, ease: 'Quad.out', delay: 120
    });
    escena.tweens.add({
      targets: t, alpha: 0, duration: duracion * 0.45, delay: 120 + duracion * 0.55, onComplete: () => t.destroy()
    });
    return t;
  },

  // Flecha ► que parpadea (cursor de menús).
  flecha(escena, x, y, opciones = {}) {
    const f = TextFX.texto(escena, x, y, '►', { color: 'oro', escala: 2, ...opciones });
    const reloj = escena.time.addEvent({ delay: 260, loop: true, callback: () => f.setVisible(!f.visible) });
    f.once('destroy', () => reloj.remove());
    return f;
  },

  // Texto que entra letra por letra, cayendo desde arriba con un rebote.
  // Devuelve { letras, ancho, salir(duracion) } ; alTerminar al llegar la última.
  letras(escena, x, y, txt, opciones = {}) {
    const { cada = 80, caida = 220, alTerminar, ...resto } = opciones;
    const escala = resto.escala ?? 4;
    prepararFuentesTextFX(escena);
    const datos = escena.cache.bitmapFont.get(TEXTFX.clave(resto.color || 'oro')).data;
    const paso = (datos.chars[65] ? datos.chars[65].xAdvance : datos.size) * escala;
    const caracteres = [...txt];
    const ancho = paso * caracteres.length;
    const x0 = Math.round(x - ancho / 2);
    const letras = [];
    caracteres.forEach((c, i) => {
      if (c === ' ') return;
      const l = TextFX.texto(escena, x0 + i * paso, y, c, { color: 'oro', ...resto, escala, origen: 0, origenY: 0.5 })
        .setAlpha(0);
      if (resto.fijo) l.setScrollFactor(0);
      if (resto.profundidad !== undefined) l.setDepth(resto.profundidad);
      l.y = y - 120;
      const ultima = i === caracteres.length - 1;
      escena.tweens.add({
        targets: l, y, alpha: 1, duration: caida, delay: i * cada, ease: 'Back.out',
        onComplete: () => { if (ultima && alTerminar) alTerminar(); }
      });
      letras.push(l);
    });
    return {
      letras,
      ancho,
      salir(duracion = 400) {
        escena.tweens.add({ targets: letras, alpha: 0, duration: duracion, onComplete: () => letras.forEach((l) => l.destroy()) });
      }
    };
  }
};
