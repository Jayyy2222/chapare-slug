// =============================================================================
// Terreno natural dibujado por procedimiento (pixel art), para el Nivel 1.
//
// - dibujarPendiente(): escalones de losas rotas, escombros, tierra con raíces,
//   pasto, helechos, musgo y lianas sobre una pendiente. Solo es dibujo: la
//   colisión sigue siendo la línea suave de RAMPAS en Nivel1.js. Los bloques
//   sobresalen unos píxeles por arriba y por abajo de esa línea a propósito.
// - dibujarCueva(): raíces colgando, grietas, manchas de musgo y piedras
//   salientes sobre la pared oscura de la ruta de abajo.
//
// Todo se pinta en píxeles de arte (la mitad de la pantalla) en un canvas y se
// muestra a x2. Cada pendiente o cueva usa su propia semilla, así ninguna se
// repite, pero el nivel se ve igual cada vez que se carga.
// =============================================================================

// Paleta sacada del tileset cálido (piedra del muro) y de los árboles.
const PALETA_TERRENO = {
  contorno: [36, 23, 0],
  junta: [50, 35, 4],
  piedra: [[70, 56, 15], [91, 75, 25], [114, 95, 37], [139, 120, 56], [168, 149, 80]],
  tierra: [[40, 27, 10], [58, 40, 18], [78, 56, 28], [100, 74, 40]],
  musgo: [[56, 74, 20], [84, 106, 32], [118, 140, 50], [156, 172, 74]],
  corteza: [[46, 30, 10], [72, 50, 22], [102, 74, 36], [134, 104, 58]],
  cueva: [[26, 22, 12], [38, 32, 18], [54, 46, 26], [72, 62, 36]]
};

// Lienzo de píxeles con generador aleatorio propio.
class LienzoPixel {
  constructor(ancho, alto, semilla) {
    this.ancho = Math.ceil(ancho);
    this.alto = Math.ceil(alto);
    this.datos = new Uint8ClampedArray(this.ancho * this.alto * 4);
    this.rnd = new Phaser.Math.RandomDataGenerator([String(semilla)]);
    this.ruido = new Map();
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
  }

  pintar(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.dentro(x, y)) return;
    const i = (y * this.ancho + x) * 4;
    this.datos[i] = color[0];
    this.datos[i + 1] = color[1];
    this.datos[i + 2] = color[2];
    this.datos[i + 3] = 255;
  }

  ocupado(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    return this.dentro(x, y) && this.datos[(y * this.ancho + x) * 4 + 3] > 0;
  }

  // Ruido fijo por bloque (manchas del tamaño elegido), entre -1 y 1.
  grano(x, y, bloque = 2) {
    const clave = `${Math.floor(x / bloque)},${Math.floor(y / bloque)},${bloque}`;
    if (!this.ruido.has(clave)) this.ruido.set(clave, this.rnd.frac() * 2 - 1);
    return this.ruido.get(clave);
  }

  // Sube el canvas como textura de Phaser.
  aTextura(escena, clave) {
    if (escena.textures.exists(clave)) escena.textures.remove(clave);
    const textura = escena.textures.createCanvas(clave, this.ancho, this.alto);
    const ctx = textura.getContext();
    const imagen = ctx.createImageData(this.ancho, this.alto);
    imagen.data.set(this.datos);
    ctx.putImageData(imagen, 0, 0);
    textura.refresh();
    return textura;
  }
}

function tonoTerreno(paleta, valor) {
  return paleta[Phaser.Math.Clamp(Math.floor(valor * paleta.length), 0, paleta.length - 1)];
}

// --- Piezas sueltas -----------------------------------------------------------

// Losa de piedra como las del suelo: biselada, esquinas redondeadas, alguna
// esquina rota, grieta, musgo arriba que chorrea por el frente. inclinacion =
// cuántos píxeles baja el borde derecho respecto del izquierdo (-2..2).
function losa(l, x0, y0, ancho, alto, inclinacion) {
  const P = PALETA_TERRENO;
  const rota = l.rnd.between(0, 3);           // esquina desportillada
  const tamRota = l.rnd.between(2, 5);
  const fuera = (i, j) => {
    const esquina = (i === 0 || i === ancho - 1) && (j === 0 || j === alto - 1);
    const ci = rota % 2 === 0 ? i : ancho - 1 - i;
    const cj = rota < 2 ? j : alto - 1 - j;
    return esquina || ci + cj < tamRota;
  };
  const caeEn = (i) => Math.round((inclinacion * i) / ancho);

  for (let i = 0; i < ancho; i++) {
    for (let j = 0; j < alto; j++) {
      if (fuera(i, j)) continue;
      const borde = i === 0 || j === 0 || i === ancho - 1 || j === alto - 1 ||
        fuera(i - 1, j) || fuera(i + 1, j) || fuera(i, j - 1) || fuera(i, j + 1);
      let color;
      if (borde) {
        color = P.contorno;
      } else if (j === 1 || i === 1) {
        color = P.piedra[l.grano(x0 + i, y0 + j, 1) > 0.3 ? 4 : 3];   // bisel claro
      } else if (j === alto - 2 || i === ancho - 2) {
        color = P.piedra[0];                                          // bisel oscuro
      } else {
        // Manchas grandes más oscuras + moteado fino, como el muro.
        let v = 0.55 + l.grano(x0 + i, y0 + j, 6) * 0.22 + l.grano(x0 + i, y0 + j, 1) * 0.12;
        color = tonoTerreno(P.piedra.slice(0, 4), v);
      }
      l.pintar(x0 + i, y0 + j + caeEn(i), color);
    }
  }

  // Grieta: línea quebrada oscura con un brillo al lado.
  if (ancho > 9 && l.rnd.frac() < 0.75) {
    let gx = x0 + l.rnd.between(3, ancho - 4);
    let gy = y0 + 2;
    for (let k = 0; k < l.rnd.between(4, alto - 2); k++) {
      l.pintar(gx, gy + caeEn(gx - x0), P.junta);
      l.pintar(gx + 1, gy + caeEn(gx - x0), P.piedra[3]);
      gy += 1;
      gx += l.rnd.pick([-1, 0, 0, 1]);
      if (gx <= x0 + 1 || gx >= x0 + ancho - 2) break;
    }
  }

  // Musgo encima y chorreando por el frente.
  for (let i = 1; i < ancho - 1; i++) {
    if (fuera(i, 0) || l.grano(x0 + i, y0, 3) < -0.4) continue;
    const y = y0 + caeEn(i);
    l.pintar(x0 + i, y, P.musgo[l.grano(x0 + i, y0, 1) > 0 ? 3 : 2]);
    l.pintar(x0 + i, y + 1, P.musgo[1]);
    if (l.rnd.frac() < 0.18) {
      const largo = l.rnd.between(2, Math.min(7, alto - 2));
      for (let k = 2; k < largo; k++) l.pintar(x0 + i, y + k, P.musgo[k < 4 ? 1 : 0]);
    }
  }
}

// Piedra suelta irregular (polígono con radios al azar, no un círculo).
function piedrita(l, cx, cy, radio, paleta = PALETA_TERRENO.piedra) {
  const P = PALETA_TERRENO;
  const puntas = 7;
  const radios = Array.from({ length: puntas }, () => radio * (0.55 + l.rnd.frac() * 0.6));
  const radioEn = (a) => {
    const t = ((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * puntas;
    const i = Math.floor(t);
    return Phaser.Math.Linear(radios[i % puntas], radios[(i + 1) % puntas], t - i);
  };
  for (let y = Math.floor(cy - radio - 1); y <= cy + radio + 1; y++) {
    for (let x = Math.floor(cx - radio - 1); x <= cx + radio + 1; x++) {
      const dx = x - cx;
      const dy = (y - cy) * 1.3;               // un poco achatada
      const d = Math.hypot(dx, dy);
      const r = radioEn(Math.atan2(dy, dx));
      if (d > r + 1) continue;
      if (d > r) {
        l.pintar(x, y, P.contorno);
      } else {
        const luz = 0.5 + 0.45 * (-0.6 * dx - 0.8 * dy) / (r + 0.01);
        l.pintar(x, y, tonoTerreno(paleta, luz));
      }
    }
  }
}

// Raíz gruesa: tubo sombreado a lo largo de una curva cuadrática.
function raizGruesa(l, p0, p1, p2, grosor, paleta = PALETA_TERRENO.corteza) {
  const largo = Math.ceil(Phaser.Math.Distance.Between(p0[0], p0[1], p1[0], p1[1]) +
    Phaser.Math.Distance.Between(p1[0], p1[1], p2[0], p2[1])) * 2;
  for (let k = 0; k <= largo; k++) {
    const t = k / largo;
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const g = Math.max(0.8, grosor * (1 - t * 0.7));
    for (let s = -g; s <= g; s += 0.5) {
      const color = Math.abs(s) > g - 0.7 ? PALETA_TERRENO.contorno
        : tonoTerreno(paleta, 0.75 - (s + g) / (2 * g) * 0.6 + l.grano(x, y + s, 2) * 0.1);
      l.pintar(x, y + s, color);
    }
  }
}

function mataPasto(l, x, base, alto) {
  const P = PALETA_TERRENO;
  for (let k = -2; k <= 2; k++) {
    const h = Math.max(1, alto - Math.abs(k) * 1.5 + l.rnd.frac() * 2 - 1);
    for (let j = 0; j < h; j++) l.pintar(x + k + j * 0.15 * k, base - j, P.musgo[Math.min(3, 1 + (j >> 1))]);
  }
}

function helechoPequeno(l, x, base) {
  const P = PALETA_TERRENO;
  for (const lado of [-1, 1]) {
    for (let j = 0; j < 8; j++) {
      const px = x + lado * j;
      const py = base - 5 - j * 0.6 + j * j * 0.1;
      l.pintar(px, py, P.musgo[2]);
      if (j % 2 === 0) l.pintar(px, py - 1, P.musgo[3]);
    }
  }
  for (let j = 0; j < 6; j++) l.pintar(x, base - j, P.musgo[1]);
}

function lianaColgante(l, x, y, largo) {
  const P = PALETA_TERRENO;
  for (let k = 0; k < largo; k++) {
    const px = x + Math.round(Math.sin(k / 4 + x) * 1);
    l.pintar(px, y + k, P.musgo[k % 3 === 0 ? 0 : 1]);
    if (k % 5 === 2) l.pintar(px + (k % 10 < 5 ? 1 : -1), y + k, P.musgo[2]);
  }
}

// --- Pendiente completa -------------------------------------------------------

// tramo: { x0, x1 } en píxeles de arte, superficie(x) -> y de la línea de
// colisión (arte) y fondo(x) -> y del borde inferior de la celda de rampa.
// Devuelve { textura, x, y } con la posición (arte) del canvas.
function dibujarPendiente(escena, clave, tramo, semilla) {
  const MARGEN_X = 22;
  const MARGEN_ARRIBA = 26;
  const MARGEN_ABAJO = 10;
  const { x0, x1, superficie, fondo } = tramo;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let x = x0; x <= x1; x++) {
    yMin = Math.min(yMin, superficie(Math.min(x, x1 - 0.01)));
    yMax = Math.max(yMax, fondo(Math.min(x, x1 - 0.01)));
  }
  const ox = x0 - MARGEN_X;
  const oy = Math.floor(yMin) - MARGEN_ARRIBA;
  const l = new LienzoPixel(x1 - x0 + MARGEN_X * 2, yMax - oy + MARGEN_ABAJO, semilla);
  const P = PALETA_TERRENO;
  const sup = (x) => superficie(Phaser.Math.Clamp(x, x0, x1 - 0.01)) - oy; // en coords del lienzo
  const pendiente = Math.abs(superficie(x0 + 1) - superficie(x0));          // 1 = 45°, 0.5 = suave
  const L = (x) => x - ox;                                                  // x del lienzo

  // 1. Tierra oscura bajo la línea, con vetas y piedritas enterradas.
  for (let x = x0; x < x1; x++) {
    const s = Math.ceil(superficie(x + 0.5));
    for (let y = s; y < fondo(x + 0.5); y++) {
      let v = 0.62 - Math.min(y - s, 48) / 48 * 0.3 + l.grano(x, y, 4) * 0.18 + l.grano(x, y, 1) * 0.1;
      if (Math.floor(y + l.grano(x, 0, 6) * 3) % 7 === 0) v -= 0.18;
      l.pintar(L(x), y - oy, tonoTerreno(P.tierra, v));
    }
  }
  for (let i = 0; i < (x1 - x0) / 6; i++) {
    const x = l.rnd.between(x0, x1 - 1);
    const y = l.rnd.between(Math.ceil(superficie(x + 0.5)) + 4, fondo(x + 0.5) - 2);
    piedrita(l, L(x), y - oy, l.rnd.between(1, 3), P.piedra.slice(0, 3));
  }

  // 2. Raíces gruesas que cruzan la tierra y salen por los costados.
  const ancho = x1 - x0;
  for (let i = 0; i < Math.max(3, Math.round(ancho / 22)); i++) {
    const desdeIzq = l.rnd.frac() < 0.5;
    const xa = desdeIzq ? -l.rnd.between(2, 12) : ancho + l.rnd.between(2, 12);
    const xb = l.rnd.between(Math.floor(ancho * 0.2), Math.floor(ancho * 0.8));
    const ya = sup(x0 + Phaser.Math.Clamp(xa, 0, ancho)) + l.rnd.between(6, 22);
    const yb = sup(x0 + xb) + l.rnd.between(14, 34);
    raizGruesa(l, [MARGEN_X + xa, ya], [MARGEN_X + (xa + xb) / 2, (ya + yb) / 2 - l.rnd.between(-8, 8)],
      [MARGEN_X + xb, yb], l.rnd.between(2, 4));
  }

  // 3. Escalones de losas rotas siguiendo la línea. La parte de arriba de cada
  //    losa es pareja (con algo de inclinación) y queda a la altura media de la
  //    línea en su ancho: sobresale por el lado alto y deja tierra por el bajo.
  const anchoMin = pendiente > 0.75 ? 9 : 12;
  const anchoMax = pendiente > 0.75 ? 18 : 24;
  const losas = [];
  const arriba = [];                 // solo la fila de arriba lleva pasto y escombros
  for (let x = x0 - 4; x < x1 + 2;) {
    const w = l.rnd.between(anchoMin, anchoMax);
    const media = (sup(x) + sup(x + w)) / 2;
    let y = Math.round(media + l.rnd.between(-1, 2));
    let h = l.rnd.between(11, 20);
    const primera = { x: L(x), y, w, h, incl: l.rnd.between(-2, 2) };
    losas.push(primera);
    arriba.push(primera);
    // Más losas apiladas hacia abajo, cada vez menos probables y corridas: la
    // tierra solo se ve en los huecos entre ellas.
    const piso = fondo(Phaser.Math.Clamp(x + w / 2, x0, x1 - 1)) - oy;
    for (let fila = 1, prob = 0.85; y + h < piso - 4 && l.rnd.frac() < prob; fila++, prob -= 0.2) {
      y += h + (l.rnd.frac() < 0.35 ? 2 : 0);
      h = l.rnd.between(9, 16);
      const ww = l.rnd.between(Math.max(7, w - 6), w + 4);
      losas.push({ x: L(x) + l.rnd.between(-4, 4), y, w: ww, h, incl: l.rnd.between(-1, 1) });
    }
    x += w + (l.rnd.frac() < 0.3 ? 1 : 0); // a veces un hueco oscuro entre losas
  }
  // Primero las de abajo, para que las de arriba las tapen.
  losas.sort((a, b) => b.y - a.y).forEach((b) => losa(l, b.x, b.y, b.w, b.h, b.incl));

  // 4. Escombros: piedritas caídas al pie de cada escalón.
  arriba.forEach((b, i) => {
    if (i % 2 || l.rnd.frac() < 0.35) return;
    const bajo = superficie(x0 + 1) > superficie(x0) ? b.x + b.w : b.x; // lado bajo de la losa
    piedrita(l, bajo + l.rnd.between(-2, 2), b.y - 1, l.rnd.between(2, 3));
  });

  // 5. Pasto, helechos y lianas en los bordes de arriba.
  arriba.forEach((b) => {
    if (l.rnd.frac() < 0.4) mataPasto(l, b.x + l.rnd.between(2, b.w - 2), b.y, l.rnd.between(2, 5));
    if (l.rnd.frac() < 0.1) helechoPequeno(l, b.x + b.w / 2, b.y + 1);
    if (l.rnd.frac() < 0.12) lianaColgante(l, b.x + l.rnd.between(2, b.w - 2), b.y + b.h - 2, l.rnd.between(6, 16));
  });

  // 6. Transiciones: piedras sueltas y pasto encima de la unión con el suelo plano.
  for (const xBorde of [x0, x1]) {
    const yBorde = superficie(Phaser.Math.Clamp(xBorde, x0, x1 - 0.01)) - oy;
    for (let k = 0; k < 4; k++) {
      piedrita(l, L(xBorde) + l.rnd.between(-14, 14), yBorde - l.rnd.between(0, 2), l.rnd.between(2, 4));
    }
    for (let k = 0; k < 3; k++) mataPasto(l, L(xBorde) + l.rnd.between(-16, 16), yBorde + 1, l.rnd.between(3, 6));
  }

  return { textura: l.aTextura(escena, clave), x: ox, y: oy };
}

// --- Pared de cueva -----------------------------------------------------------

// region: { x0, y0, x1, y1 } en píxeles de arte (y0 = techo de la cueva).
function dibujarCueva(escena, clave, region, semilla) {
  const P = PALETA_TERRENO;
  const ancho = region.x1 - region.x0;
  const alto = region.y1 - region.y0;
  const l = new LienzoPixel(ancho, alto, semilla);

  // Manchas de musgo (tramadas, para que se vea la piedra debajo).
  for (let i = 0; i < Math.round(ancho / 22); i++) {
    const cx = l.rnd.between(0, ancho);
    const cy = l.rnd.between(8, alto - 8);
    const r = l.rnd.between(4, 11);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r * 1.4; x <= cx + r * 1.4; x++) {
        const d = Math.hypot((x - cx) / 1.4, y - cy) + l.grano(x, y, 2) * 2;
        if (d < r && (x + y) % 2 === 0) l.pintar(x, y, P.musgo[d < r * 0.5 ? 1 : 0]);
      }
    }
  }

  // Grietas grandes: líneas quebradas con ramas, oscuras y con un borde claro.
  for (let i = 0; i < Math.round(ancho / 45) + 1; i++) {
    const grieta = (x, y, largo, dx) => {
      for (let k = 0; k < largo; k++) {
        // Grieta de 2-3 px: centro negro, borde oscuro y un filo claro a la derecha.
        const ancho = k < largo * 0.6 ? 2 : 1;
        for (let s = 0; s < ancho; s++) l.pintar(x + s, y, [8, 6, 2]);
        l.pintar(x - 1, y, [20, 15, 6]);
        l.pintar(x + ancho, y, P.cueva[3]);
        y += 1;
        x += l.rnd.pick([-1, 0, 0, 1]) + (k % 4 === 0 ? dx : 0);
        if (k > 6 && l.rnd.frac() < 0.06) grieta(x, y, Math.floor(largo / 2), -dx);
      }
    };
    grieta(l.rnd.between(4, ancho - 4), l.rnd.between(0, alto / 3), l.rnd.between(30, 70), l.rnd.pick([-1, 1]));
  }

  // Piedras salientes de la pared.
  for (let i = 0; i < Math.round(ancho / 30); i++) {
    piedrita(l, l.rnd.between(6, ancho - 6), l.rnd.between(10, alto - 10), l.rnd.between(4, 8),
      [P.cueva[1], P.cueva[2], P.cueva[3], P.piedra[0], P.piedra[1]]);
  }

  // Raíces que cuelgan del techo, con pelitos a los costados.
  for (let i = 0; i < Math.round(ancho / 14); i++) {
    let x = l.rnd.between(2, ancho - 2);
    const largo = l.rnd.between(14, Math.min(70, alto - 6));
    const grosor = l.rnd.frac() < 0.3 ? 2 : 1;
    for (let k = 0; k < largo; k++) {
      const g = k < largo * 0.5 ? grosor : 1;
      const color = P.corteza[k < largo * 0.3 ? 2 : 1];
      for (let s = 0; s < g; s++) l.pintar(x + s, k, color);
      l.pintar(x + g, k, P.contorno);
      if (k % 6 === 3 && l.rnd.frac() < 0.6) {
        const lado = l.rnd.pick([-1, 1]);
        l.pintar(x + lado * 2, k + 1, P.corteza[1]);
        l.pintar(x + lado * 3, k + 2, P.corteza[0]);
      }
      if (k % 5 === 0) x += l.rnd.pick([-1, 0, 0, 1]);
    }
  }

  return { textura: l.aTextura(escena, clave), x: region.x0, y: region.y0 };
}

// --- Río ----------------------------------------------------------------------

const PALETA_RIO = {
  barro: [[30, 22, 10], [42, 31, 15], [56, 42, 21], [72, 55, 29]],
  barroMojado: [[34, 26, 12], [46, 35, 17], [60, 46, 24]],
  canto: [[54, 56, 44], [80, 82, 64], [110, 110, 86], [142, 140, 110]],
  agua: [[108, 116, 62], [88, 102, 54], [68, 86, 46], [50, 68, 40], [38, 54, 34]],
  alfaAgua: 160 // ~0.63: se ve el lecho a través del agua
};

// Todo en píxeles de arte. rio = { x0, x1 (celdas del río), ax0, ax1 (hasta
// donde llega el agua), superficie, lecho(x), suelo(x) (suelo en las orillas),
// fondo (y del borde inferior del mundo) }.
// Devuelve las texturas del lecho (detrás del agua), del cuerpo del agua y de
// las rocas que asoman, con su posición, y la lista de rocas para la espuma.
function dibujarRio(escena, clave, rio, semilla) {
  const P = PALETA_TERRENO;
  const R = PALETA_RIO;
  const ox = Math.floor(rio.ax0) - 44;
  const oy = Math.floor(rio.superficie) - 80;
  const ancho = Math.ceil(rio.ax1) + 44 - ox;
  const alto = rio.fondo - oy;
  const lecho = new LienzoPixel(ancho, alto, semilla);
  const L = (x) => x - ox;
  const T = (y) => y - oy;
  const sueloEn = (x) => (x >= rio.x0 && x < rio.x1 ? rio.lecho(x) : rio.suelo(x));

  // 1. Barro del fondo con forma de cuenca: más oscuro cuanto más hondo.
  for (let x = rio.x0; x < rio.x1; x++) {
    const s = Math.round(rio.lecho(x + 0.5));
    for (let y = s; y < rio.fondo; y++) {
      const d = y - s;
      let v = 0.7 - Math.min(d, 40) / 40 * 0.45 + lecho.grano(x, y, 3) * 0.15 + lecho.grano(x, y, 1) * 0.08;
      if (d < 2) v += 0.2; // capa fina de limo arriba
      lecho.pintar(L(x), T(y), tonoTerreno(R.barro, v));
    }
  }

  // 2. Raíces de los árboles de la orilla que se meten en el agua.
  for (const lado of [-1, 1]) {
    const borde = lado < 0 ? rio.ax0 : rio.ax1;
    for (let i = 0; i < 2; i++) {
      const xa = borde - lado * lecho.rnd.between(6, 26);
      const xb = borde + lado * lecho.rnd.between(18, 48);
      const ya = sueloEn(xa) + lecho.rnd.between(1, 5);
      const yb = sueloEn(xb) - 1;
      raizGruesa(lecho, [L(xa), T(ya)], [L((xa + xb) / 2), T(Math.max(ya, yb) + 6)], [L(xb), T(yb)], lecho.rnd.between(2, 3));
    }
  }

  // 3. Cantos rodados semienterrados, de tamaños distintos, algunos con musgo.
  const rocas = [];
  for (let i = 0; i < (rio.x1 - rio.x0) / 9; i++) {
    const x = lecho.rnd.between(rio.x0 + 4, rio.x1 - 4);
    const r = lecho.rnd.between(2, 7);
    const y = rio.lecho(x) + r * 0.35;
    piedrita(lecho, L(x), T(y), r, R.canto);
    if (lecho.rnd.frac() < 0.4) {
      for (let k = -r + 2; k < r - 1; k++) lecho.pintar(L(x + k), T(y - r * 0.75 + Math.abs(k) * 0.3), P.musgo[1]);
    }
  }

  // 4. Orillas: tierra mojada más oscura cerca del agua, piedras sueltas,
  //    pasto alto. Se pinta encima del dibujo de la rampa o del suelo vecino.
  for (const lado of [-1, 1]) {
    const borde = lado < 0 ? rio.ax0 : rio.ax1;
    for (let k = -6; k < 40; k++) {
      const x = borde - lado * k;
      const s = Math.round(sueloEn(x));
      if (s < rio.superficie - 16) continue; // lejos del agua: tierra seca
      for (let d = 0; d < 5; d++) {
        if (lecho.grano(x, s + d, 2) > 0.55) continue;
        lecho.pintar(L(x), T(s + d), tonoTerreno(R.barroMojado, 0.7 - d * 0.15 + lecho.grano(x, s, 1) * 0.1));
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = borde - lado * lecho.rnd.between(-2, 30);
      piedrita(lecho, L(x), T(sueloEn(x)) - 1, lecho.rnd.between(2, 3), R.canto);
    }
    for (let i = 0; i < 5; i++) {
      const x = borde - lado * lecho.rnd.between(4, 36);
      if (sueloEn(x) < rio.superficie) mataPasto(lecho, L(x), T(sueloEn(x)), lecho.rnd.between(6, 11));
    }
  }

  // 5. Cuerpo del agua: solo entre las orillas y desde la superficie hasta el
  //    lecho (sigue la cuenca), turbio y más oscuro en lo hondo.
  const agua = new LienzoPixel(ancho, alto, semilla + '-agua');
  const datos = agua.datos;
  const hondo = Math.max(...Array.from({ length: Math.ceil(rio.ax1 - rio.ax0) }, (_, i) => sueloEn(rio.ax0 + i) - rio.superficie));
  for (let x = Math.ceil(rio.ax0); x < rio.ax1; x++) {
    const fondo = Math.round(sueloEn(x + 0.5)) + 1;
    for (let y = Math.round(rio.superficie) + 1; y < fondo; y++) {
      const f = (y - rio.superficie) / Math.max(8, hondo);
      let i = Math.floor(f * (R.agua.length - 1) + (BAYER4[y % 4][x % 4] / 16) * 0.9);
      if (y - rio.superficie < 2) i = 0;
      agua.pintar(L(x), T(y), R.agua[Phaser.Math.Clamp(i, 0, R.agua.length - 1)]);
      datos[(T(y) * agua.ancho + L(x)) * 4 + 3] = R.alfaAgua;
    }
  }

  // 6. Rocas grandes que asoman del agua (delante del agua, con espuma alrededor).
  const piedras = new LienzoPixel(ancho, alto, semilla + '-rocas');
  for (const t of [0.32, 0.71]) {
    const x = Math.round(rio.x0 + (rio.x1 - rio.x0) * t + piedras.rnd.between(-10, 10));
    if (x < rio.ax0 + 16 || x > rio.ax1 - 16) continue;
    const r = piedras.rnd.between(9, 13);
    const y = rio.superficie + r * 0.35;
    piedrita(piedras, L(x), T(y), r, R.canto);
    for (let k = -r + 3; k < r - 2; k++) piedras.pintar(L(x + k), T(y - r * 0.74 + Math.abs(k) * 0.25), P.musgo[2]);
    // Parte mojada (bajo la línea del agua) más oscura.
    for (let yy = Math.round(rio.superficie); yy < y + r; yy++) {
      for (let xx = x - r; xx <= x + r; xx++) {
        const i = (T(yy) * piedras.ancho + L(xx)) * 4;
        if (piedras.ocupado(L(xx), T(yy))) { piedras.datos[i] *= 0.7; piedras.datos[i + 1] *= 0.75; piedras.datos[i + 2] *= 0.75; }
      }
    }
    rocas.push({ x, r });
  }

  return {
    x: ox, y: oy, rocas,
    lecho: lecho.aTextura(escena, clave + '-lecho'),
    agua: agua.aTextura(escena, clave + '-agua'),
    piedras: piedras.aTextura(escena, clave + '-rocas')
  };
}

const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Jacinto de agua: roseta de hojas brillantes con una espiga de flores lilas (18x12).
function texturaJacinto(escena, clave) {
  if (escena.textures.exists(clave)) return;
  const l = new LienzoPixel(18, 12, 'jacinto');
  const P = PALETA_TERRENO;
  for (const [cx, cy, rx, ry] of [[4, 8, 4, 2.5], [13, 8, 4, 2.5], [9, 9, 4.5, 2.5], [6, 6, 3, 2.5], [12, 6, 3, 2.5]]) {
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 18; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) l.pintar(x, y, d < 0.3 && y < cy ? P.musgo[3] : y < cy ? P.musgo[2] : P.musgo[1]);
      }
    }
  }
  for (let y = 0; y < 5; y++) {
    l.pintar(9, y, y % 2 ? [150, 110, 190] : [196, 166, 226]);
    l.pintar(8 + (y % 2) * 2, y + 1, [150, 110, 190]);
  }
  l.pintar(9, 2, [240, 210, 90]);
  // Contorno.
  const lleno = (x, y) => l.ocupado(x, y);
  const borde = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 18; x++) {
    if (!lleno(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => lleno(x + dx, y + dy))) borde.push([x, y]);
  }
  borde.forEach(([x, y]) => l.pintar(x, y, P.contorno));
  l.aTextura(escena, clave);
}

// --- Luz del sol --------------------------------------------------------------

const LUZ_SOL = [255, 226, 150];

// Rayo de sol que entra entre las copas: angosto arriba, ancho abajo, inclinado
// (el sol está arriba a la derecha). La intensidad se cuantiza en pocos niveles
// con tramado ordenado, para que se vea pixel art y no un degradé liso.
// Se usa con mezcla ADD: el alfa de cada píxel es cuánto ilumina.
function texturaRayo(escena, clave, semilla, ancho = 140, alto = 420) {
  if (escena.textures.exists(clave)) return;
  const l = new LienzoPixel(ancho, alto, semilla);
  const arriba = [ancho * 0.62, ancho * 0.62 + l.rnd.between(10, 18)];  // borde superior [izq, der]
  const abajo = [l.rnd.between(18, 36), ancho * 0.62 + l.rnd.between(-6, 8)];
  const niveles = [0, 30, 64, 110, 150];
  const fase = l.rnd.frac() * 6;
  for (let y = 0; y < alto; y++) {
    const t = y / alto;
    const xi = Phaser.Math.Linear(arriba[0], abajo[0], t);
    const xd = Phaser.Math.Linear(arriba[1], abajo[1], t);
    // Aparece suave arriba (sale de las copas) y se apaga hacia abajo.
    const vertical = Math.min(1, t / 0.12) * (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
    for (let x = Math.floor(xi) - 2; x <= xd + 2; x++) {
      const u = (x - xi) / (xd - xi);
      if (u < -0.08 || u > 1.08) continue;
      const centro = 1 - Math.abs(u * 2 - 1) ** 1.6;
      // Franjas a lo largo del rayo (luz que pasa entre hojas).
      const franjas = 0.75 + 0.25 * Math.sin(u * 14 + fase + t * 2);
      const v = Math.max(0, centro) * franjas * vertical * (niveles.length - 1);
      const nivel = Math.floor(v + BAYER4[y % 4][x % 4] / 16);
      if (nivel <= 0) continue;
      const i = (y * l.ancho + x) * 4;
      if (x < 0 || x >= l.ancho) continue;
      l.datos[i] = LUZ_SOL[0];
      l.datos[i + 1] = LUZ_SOL[1];
      l.datos[i + 2] = LUZ_SOL[2];
      l.datos[i + 3] = niveles[Math.min(nivel, niveles.length - 1)];
    }
  }
  l.aTextura(escena, clave);
}

// Resplandor del sol detrás de las copas: anillos tramados (para mezcla ADD).
function texturaResplandor(escena, clave, radio = 90) {
  if (escena.textures.exists(clave)) return;
  const l = new LienzoPixel(radio * 2, radio * 2, 'sol');
  const niveles = [0, 18, 36, 60, 96, 150];
  for (let y = 0; y < radio * 2; y++) {
    for (let x = 0; x < radio * 2; x++) {
      const d = Math.hypot(x - radio, y - radio) / radio;
      if (d >= 1) continue;
      const v = (1 - d) ** 1.8 * (niveles.length - 1);
      const nivel = Math.min(niveles.length - 1, Math.floor(v + BAYER4[y % 4][x % 4] / 16));
      if (nivel <= 0) continue;
      const i = (y * l.ancho + x) * 4;
      l.datos[i] = 255;
      l.datos[i + 1] = 240;
      l.datos[i + 2] = 190;
      l.datos[i + 3] = niveles[nivel];
    }
  }
  l.aTextura(escena, clave);
}

// Mota de polvo que flota en la luz (1 píxel de arte).
function texturaMota(escena, clave) {
  if (escena.textures.exists(clave)) return;
  const l = new LienzoPixel(1, 1, 'mota');
  l.pintar(0, 0, [255, 244, 200]);
  l.aTextura(escena, clave);
}

// --- Detalles chicos del suelo ------------------------------------------------

// Contorno oscuro alrededor de lo pintado.
function contornear(l) {
  const borde = [];
  for (let y = 0; y < l.alto; y++) {
    for (let x = 0; x < l.ancho; x++) {
      if (!l.ocupado(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => l.ocupado(x + dx, y + dy))) borde.push([x, y]);
    }
  }
  borde.forEach(([x, y]) => l.pintar(x, y, PALETA_TERRENO.contorno));
}

// Texturas chicas (px de arte) para poblar el suelo. Las matas de pasto se
// usan también delante de los pies del jugador.
function texturasDetallesSuelo(escena) {
  if (escena.textures.exists('mata0')) return;
  const P = PALETA_TERRENO;

  // Matas de pasto: hojas finas de distinto alto.
  for (let v = 0; v < 3; v++) {
    const l = new LienzoPixel(22, 14, 'mata' + v);
    for (let i = 0; i < 9 + v * 2; i++) {
      const x0 = l.rnd.between(2, 19);
      const alto = l.rnd.between(5, 13);
      const curva = l.rnd.between(-3, 3);
      for (let k = 0; k < alto; k++) l.pintar(x0 + Math.round((curva * k * k) / (alto * alto)), 13 - k, P.musgo[k > alto * 0.6 ? 3 : k > 2 ? 2 : 1]);
    }
    l.aTextura(escena, 'mata' + v);
  }

  // Piedras sueltas.
  let l = new LienzoPixel(26, 9, 'piedras');
  piedrita(l, 6, 5, 4);
  piedrita(l, 14, 6, 3);
  piedrita(l, 20, 6, 2);
  l.aTextura(escena, 'piedrasSueltas');

  // Tronco caído con musgo arriba y el corte con anillos.
  l = new LienzoPixel(32, 11, 'tronco');
  for (let x = 1; x < 29; x++) {
    for (let y = 2; y < 10; y++) l.pintar(x, y, tonoTerreno(P.corteza, 0.8 - (y - 2) / 8 * 0.6 + l.grano(x, y, 2) * 0.1));
    if (l.grano(x, 0, 3) > -0.2) l.pintar(x, 2, P.musgo[2]);
  }
  for (let y = 2; y < 10; y++) for (let x = 28; x < 31; x++) l.pintar(x, y, (y + x) % 3 ? [150, 118, 70] : [112, 84, 46]);
  contornear(l);
  l.aTextura(escena, 'troncoCaido');

  // Helecho.
  l = new LienzoPixel(24, 14, 'helecho');
  helechoPequeno(l, 12, 14);
  l.aTextura(escena, 'helechoChico');

  // Caja de munición: verde oliva, franja amarilla y manijas.
  l = new LienzoPixel(18, 11, 'municion');
  for (let x = 1; x < 17; x++) {
    for (let y = 2; y < 10; y++) l.pintar(x, y, y === 2 ? [118, 128, 70] : y > 7 ? [58, 64, 34] : [88, 98, 52]);
  }
  for (let x = 4; x < 14; x++) l.pintar(x, 5, [214, 182, 60]);
  l.pintar(2, 1, [70, 70, 60]); l.pintar(15, 1, [70, 70, 60]);
  contornear(l);
  l.aTextura(escena, 'cajaMunicion');

  // Sacos de arena chicos (dos abajo y uno arriba).
  l = new LienzoPixel(28, 15, 'sacos');
  for (const [cx, cy] of [[8, 10], [19, 10], [13, 5]]) {
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 6; x <= cx + 6; x++) {
        if (((x - cx) / 6) ** 2 + ((y - cy) / 3.2) ** 2 <= 1) l.pintar(x, y, y < cy - 1 ? [178, 162, 112] : y > cy + 1 ? [118, 104, 66] : [150, 136, 90]);
      }
    }
  }
  contornear(l);
  l.aTextura(escena, 'sacosChicos');
}

// --- Caminos de tierra ----------------------------------------------------------

const PALETA_CAMINO = {
  tierra: [[70, 48, 24], [96, 68, 36], [122, 90, 50], [150, 116, 70], [176, 144, 94]],
  huella: [[58, 40, 20], [80, 56, 30]],
  maleza: [[34, 44, 16], [50, 64, 22], [70, 88, 30], [96, 116, 42]]
};

// Camino de tierra para el suelo jugable (se repite a lo ancho: ancho px de arte).
// Filas 0-7: pasto que asoma; fila 8: superficie (va en la línea de colisión);
// después tierra con dos huellas de rueda y piedritas; abajo borde irregular
// con contorno sobre la piedra del muro.
function texturaCaminoTierra(escena, clave, semilla, ancho = 256) {
  if (escena.textures.exists(clave)) return;
  const C = PALETA_CAMINO;
  const alto = 30;
  const l = new LienzoPixel(ancho, alto, semilla);
  const periodo = (x, k) => Math.sin((x / ancho) * Math.PI * 2 * k);
  for (let x = 0; x < ancho; x++) {
    const sup = 8 + Math.round(periodo(x, 3) * 0.8 + periodo(x, 7) * 0.5);
    const fondo = 24 + Math.round(periodo(x, 5) * 2 + periodo(x, 11) * 1.5);
    for (let y = sup; y < fondo; y++) {
      const d = y - sup;
      let v = 0.75 - d / 16 * 0.4 + l.grano(x, y, 3) * 0.15 + l.grano(x, y, 1) * 0.08;
      // Huellas de rueda: dos franjas más oscuras y hundidas.
      const huella1 = Math.abs(y - (sup + 4 + periodo(x, 2))) < 1;
      const huella2 = Math.abs(y - (sup + 9 + periodo(x, 2))) < 1;
      if (huella1 || huella2) {
        l.pintar(x, y, C.huella[l.grano(x, y, 2) > 0 ? 1 : 0]);
        continue;
      }
      if (d === 0) v += 0.2; // borde de arriba iluminado
      l.pintar(x, y, tonoTerreno(C.tierra, v));
    }
    l.pintar(x, fondo, PALETA_TERRENO.contorno);
    // Pasto en el borde de arriba, con matas más altas de vez en cuando.
    if (l.grano(x, 0, 2) > -0.3) {
      const altoPasto = l.grano(x, 1, 5) > 0.5 ? l.rnd.between(4, 7) : l.rnd.between(1, 3);
      for (let k = 0; k < altoPasto; k++) l.pintar(x, sup - k, C.maleza[Math.min(3, 1 + (k >> 1))]);
    }
  }
  // Piedritas y algún charco seco.
  for (let i = 0; i < ancho / 14; i++) {
    const x = l.rnd.between(2, ancho - 3);
    const y = l.rnd.between(11, 20);
    l.pintar(x, y, [150, 140, 120]);
    l.pintar(x + 1, y, [110, 100, 84]);
    l.pintar(x, y + 1, [90, 80, 64]);
  }
  l.aTextura(escena, clave);
}

// Franja de fondo para las capas de parallax: maleza irregular arriba, un
// sendero de tierra que se ve entre los árboles y monte bajo más oscuro
// abajo. niebla (0..1) la mezcla con el color de la bruma de esa capa.
function texturaSenderoFondo(escena, clave, semilla, niebla, ancho = 256, alto = 100) {
  if (escena.textures.exists(clave)) return;
  const C = PALETA_CAMINO;
  const bruma = [196, 184, 116];
  const mezclar = (c) => c.map((v, i) => Math.round(v * (1 - niebla) + bruma[i] * niebla));
  const l = new LienzoPixel(ancho, alto, semilla);
  const periodo = (x, k) => Math.sin((x / ancho) * Math.PI * 2 * k);
  for (let x = 0; x < ancho; x++) {
    // Borde de arriba: matas y helechos de alturas distintas.
    const tope = 10 - Math.round(Math.max(0, periodo(x, 4) * 4 + periodo(x, 9) * 3 + l.grano(x, 0, 3) * 3));
    const senderoArriba = 16 + Math.round(periodo(x, 2) * 2);
    const senderoAbajo = senderoArriba + 12 + Math.round(periodo(x, 3) * 2);
    for (let y = Math.max(0, tope); y < alto; y++) {
      let color;
      if (y >= senderoArriba && y < senderoAbajo) {
        const v = 0.7 - (y - senderoArriba) / 14 * 0.3 + l.grano(x, y, 3) * 0.12;
        color = Math.abs(y - (senderoArriba + 5)) < 1 ? C.huella[1] : tonoTerreno(C.tierra, v);
      } else {
        const v = (y < senderoArriba ? 0.75 : 0.55 - (y - senderoAbajo) / alto * 0.6) + l.grano(x, y, 2) * 0.18;
        color = tonoTerreno(C.maleza, v);
      }
      l.pintar(x, y, mezclar(color));
    }
  }
  l.aTextura(escena, clave);
}
