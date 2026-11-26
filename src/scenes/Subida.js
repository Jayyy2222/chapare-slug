// =============================================================================
// NIVEL 2 · LA SUBIDA AL CERRO RICO (escena Subida). Viene del patio de la
// Casa de la Moneda (Patio.js). Del caserío minero de la izquierda se baja a
// la hondonada, se pasa la barricada con la bandera del Coronel Buitre, la
// torre de vigilancia en las rocas, y se sube hasta la bocamina, abajo del
// tanque de agua. Al entrar: la escena de la entrada a la mina (los dos
// cuadros de entrada_mina.jpeg) y sigue en los túneles (Tuneles.js).
//
// subida.png (subida_mina.jpeg, herramientas/potosi_nivel2.py): el piso es
// irregular, así que las líneas de suelo del JSON van inclinadas (como en la
// Cueva). Colisión: subida_collision.json (tecla E para editar).
// =============================================================================

const SUBIDA = {
  ...POTOSI,
  colision: { clave: 'subidaColision', archivo: 'subida_collision.json' },
  ancho: 2064,
  inicio: { x: 40, desde: 200 },
  desde: 300,              // de dónde se busca el piso (el suelo es más alto que en la calle)
  llenaVida: false,
  titulo: { nombre: 'CERRO RICO', sub: 'SUMAJ ORCKO · LA SUBIDA A LA MINA', escala: 4 },
  fondo: 0x8fb8dc,
  bruma: true,
  tramos: [{ clave: 'potosiSubida', archivo: 'subida.png', x: 0 }],
  // Cada capa tapa con su parte opaca (abajo) el pie de la de atrás, y la
  // ciudad termina debajo del terreno: así no quedan franjas de cielo entre
  // capas. Debajo de todo, tierra (sueloFondo).
  parallax: [
    { clave: 'potosiCielo', archivo: 'cielo.png', factor: 0.05, y: 0 },
    { clave: 'potosiCerroRico', archivo: 'cerro_rico.png', factor: 0.12, y: 170, x: 640, solo: true },
    { clave: 'potosiCerros', archivo: 'cerros.png', factor: 0.15, y: 305 },
    { clave: 'potosiCiudad', archivo: 'ciudad.png', factor: 0.3, y: 330, tinte: 0xd8d0c8 }
  ],
  sueloFondo: { y: 455, color: 0x8e6458 },
  zonas: [{ limite: 0 }, { limite: 520 }, { limite: 1040, final: true, cartel: 'LA BOCAMINA' }],
  aberturas: {},
  enemigos: [
    { tipo: 'soldado', x: 330, zona: 0, desde: 340 },
    { tipo: 'garrotero', x: 560, zona: 0, desde: 420 },
    { tipo: 'soldado', x: 840, zona: 0, desde: 450 },
    { tipo: 'garrotero', x: 700, zona: 0, desde: 450, sale: 'aparece', retraso: 1500 },
    { tipo: 'soldado', x: 1160, zona: 1, desde: 440, torre: true },
    { tipo: 'soldado', x: 1215, zona: 1, desde: 440 },
    { tipo: 'soldado', x: 1350, zona: 1, desde: 270, torre: true },
    { tipo: 'soldado', x: 1290, zona: 1, desde: 320, torre: true },
    { tipo: 'garrotero', x: 1460, zona: 1, desde: 380, sale: 'aparece', retraso: 1200 },
    { tipo: 'soldado', x: 1860, zona: 2, desde: 190, torre: true },
    { tipo: 'garrotero', x: 1905, zona: 2, desde: 400, sale: 'mina', retraso: 500 },
    { tipo: 'soldado', x: 1650, zona: 2, desde: 390 },
    { tipo: 'garrotero', x: 1905, zona: 2, desde: 400, sale: 'mina', retraso: 2200 },
    { tipo: 'soldado', x: 1560, zona: 2, desde: 390, sale: 'aparece', retraso: 3000 }
  ],
  rehenes: [{ x: 260, desde: 340 }, { x: 1700, desde: 390 }],
  rompibles: [
    { tipo: 'caja', x: 180, desde: 340 }, { tipo: 'turril', x: 640, desde: 450 },
    { tipo: 'carreta', x: 760, desde: 450, obj: 'carreta2' }, { tipo: 'turril', x: 1420, desde: 380 },
    { tipo: 'barricada', x: 1600, desde: 390, obj: 'sacos2' }
  ],
  decor: [
    { obj: 'farol2', x: 1838, y: 318, luz: true }, { obj: 'letrero2', x: 1500, y: 330, mece: true },
    { obj: 'tejas2', x: 420, desde: 420 }, { obj: 'puesto2', x: 110, desde: 250 }, { obj: 'sacos', x: 1250, desde: 440 }
  ],
  escaleras: [{ obj: 'escalera2', x: 1782, arriba: 209, abajo: 431 }],
  // Lo de las calles que no va acá (venía con ...POTOSI): los faroles, la
  // pileta, el reflector y las banderas de la plaza, sus palomas, y las
  // barandas de los balcones (recortaban pedazos de las casas delante de los
  // enemigos de la pasarela: parecían meterse adentro).
  animados: [],
  palomasSuelo: [],
  barandas: null,
  llamas: [{ obj: 'llama2', x: 520, desde: 420 }, { obj: 'llama', x: 1520, desde: 380 }],
  palomas: [],
  humo: [[45, 134], [275, 230], [401, 304]],
  campanas: [],
  condor: true, bandadas: false, viento: true,
  lingotes: [[860, 470], [1330, 320]],
  // La bocamina (donde se entra) y los dos cuadros de la escena final:
  // origen del cuadro en pantalla, dónde camina el jugador (y de los pies).
  boca: [1880, 1950],
  mina: {
    // camino: puntos [x, y] del piso en el dibujo (los pies van por ahí);
    // escala: al principio y al final (perspectiva).
    fuera: { clave: 'potosiMinaFuera', archivo: 'mina_fuera.png', camino: [[40, 548], [150, 536], [250, 512], [320, 488], [350, 470]], escala: [1, 0.8] },
    // Adentro, por la vía: de la izquierda abajo hasta el fondo del túnel.
    dentro: { clave: 'potosiMinaDentro', archivo: 'mina_dentro.png', camino: [[90, 512], [260, 500], [420, 478], [560, 445], [650, 412], [705, 392]], escala: [1, 0.22] }
  }
};

class Subida extends Nivel2 {
  constructor() {
    super('Subida', SUBIDA);
  }

  preload() {
    super.preload();
    Object.values(SUBIDA.mina).forEach((m) => {
      if (!this.textures.exists(m.clave)) this.load.image(m.clave, POTOSI.ruta + m.archivo);
    });
  }

  // Los de la mina salen de la bocamina (de lo oscuro).
  salirEnemigo(enemigo) {
    if (enemigo.getData('sale') === 'mina' && enemigo.getData('estado') === 'escondido') {
      const [x0, x1] = this.cfg.boca;
      enemigo.setTint(0x303030);
      this.time.delayedCall(450, () => enemigo.active && enemigo.clearTint());
      // En el piso de la bocamina (no a la altura de donde estaba esperando).
      const x = (x0 + x1) / 2;
      const piso = this.superficie(x, 300).y;
      enemigo.setPosition(x, piso - 2); // (Nivel2.salirEnemigo le pone el cuerpo ahí)
    }
    super.salirEnemigo(enemigo);
  }

  alTerminar() {
    const [x0, x1] = this.cfg.boca;
    const t = TextFX.texto(this, (x0 + x1) / 2, 250, '¡A LA MINA!', { color: 'oro', escala: 2 }).setDepth(16);
    this.tweens.add({ targets: t, y: t.y + 8, duration: 400, yoyo: true, repeat: -1 });
    this.time.delayedCall(800, () => this.mostrarGo(true));
  }

  revisarSalida() {
    const [x0, x1] = this.cfg.boca;
    const b = this.jugador.body;
    if (b.center.x > x0 && b.center.x < x1 && (b.blocked.down || b.touching.down)) this.entrarMina();
  }

  // La escena final: la bocamina con la wiphala de papelitos y el farol, y
  // después el socavón. El personaje (de cuerpo entero: piernas + torso del
  // elegido) camina siguiendo el suelo del dibujo (una curva por puntos, no en
  // línea recta), se achica con la perspectiva y se oscurece al entrar a lo
  // hondo. Al final, los túneles.
  entrarMina() {
    if (this.estado === 'saliendo') return;
    this.estado = 'saliendo';
    cerrarSelector(this, false);
    this.mostrarGo(false);
    const j = this.jugador;
    j.setVelocity(0).body.setAllowGravity(false);
    this.registry.remove(this.claveBase);
    this.tweens.add({ targets: j, x: (this.cfg.boca[0] + this.cfg.boca[1]) / 2, alpha: 0, duration: 600 });
    const cam = this.cameras.main;
    cam.fadeOut(700, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      const { width, height } = this.scale;
      const fijo = (o, p) => o.setScrollFactor(0).setDepth(60 + p);
      fijo(this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0), 0);
      const M = this.cfg.mina;
      const ancho1 = this.textures.get(M.fuera.clave).getSourceImage().width;
      const x1 = Math.round((width - ancho1) / 2);
      const cielo = fijo(this.add.image(x1, 0, 'potosiCielo').setOrigin(0).setCrop(0, 0, ancho1, height), 0.1);
      const fuera = fijo(this.add.image(x1, 0, M.fuera.clave).setOrigin(0), 0.2);
      const caminante = fijo(this.caminanteMina(), 0.5);
      const cartel = TextFX.texto(this, width / 2, 40, 'LA BOCAMINA · CERRO RICO', { color: 'oro', escala: 2 }).setScrollFactor(0).setDepth(61);
      cam.fadeIn(600, 0, 0, 0);
      // Afuera: por el suelo hasta la boca, y se pierde en lo oscuro.
      this.recorrerMina(caminante, x1, M.fuera.camino, 2600, M.fuera.escala, () => {
        cam.fadeOut(700, 0, 0, 0);
        cam.once('camerafadeoutcomplete', () => {
          cielo.destroy(); fuera.destroy(); cartel.destroy();
          const ancho2 = this.textures.get(M.dentro.clave).getSourceImage().width;
          const x2 = Math.round((width - ancho2) / 2);
          fijo(this.add.image(x2, 0, M.dentro.clave).setOrigin(0), 0.2);
          caminante.setAlpha(1);
          cam.fadeIn(600, 0, 0, 0);
          // Adentro: por la vía hasta el fondo del socavón.
          this.recorrerMina(caminante, x2, M.dentro.camino, 3800, M.dentro.escala, () => {
            const sigue = this.scene.manager.keys.Tuneles;
            cam.fadeOut(600, 0, 0, 0);
            cam.once('camerafadeoutcomplete', () => {
              if (sigue) { this.scene.start('Tuneles'); return; }
              misionCompleta(this);
            });
          });
        });
      });
    });
  }

  // El personaje caminando: piernas corriendo + torso, con los pies en y 0.
  caminanteMina() {
    const p = personajeCuerpo(this); // CuerpoModular.js
    const pre = CUERPOS[p].prefijo;
    const datos = animacionesCuerpo(this, p);
    const piernas = this.add.sprite(0, 0, pre + 'piernas_run', '0');
    const torso = this.add.sprite(0, 0, pre + 'torso_aiming', '0');
    const ancla = (spr, hoja) => { const d = datos[hoja]; spr.setOrigin(d.ancla[0] / d.ancho, d.ancla[1] / d.alto); };
    ancla(piernas, 'piernas_run');
    ancla(torso, 'torso_aiming');
    const d = datos.piernas_run;
    const cintura = Math.max(...d.cuadros.map((q) => q.pies)) - d.ancla[1];
    piernas.y = -cintura;
    torso.y = -cintura;
    piernas.play(pre + 'correr');
    piernas.anims.timeScale = 0.7; // caminando
    torso.play(pre + 'torso');
    return this.add.container(0, 0, [piernas, torso]).setData('piernas', piernas);
  }

  // Recorre `camino` (puntos [x, y] del dibujo, con el piso) en `ms`: una
  // curva suave por los puntos; la escala va de escala[0] a escala[1] (la
  // perspectiva) y se oscurece al final. Con un leve balanceo al caminar.
  recorrerMina(c, x0, camino, ms, escala, alTerminar) {
    const curva = new Phaser.Curves.Spline(camino.map(([x, y]) => new Phaser.Math.Vector2(x0 + x, y)));
    const t = { v: 0 };
    const piernas = c.getData('piernas');
    this.tweens.add({
      targets: t, v: 1, duration: ms, ease: 'Sine.inOut',
      onUpdate: () => {
        const p = curva.getPoint(t.v);
        const k = Phaser.Math.Linear(escala[0], escala[1], t.v);
        c.setPosition(p.x, p.y + Math.abs(Math.sin(t.v * ms / 140)) * -2 * k).setScale(k);
        // Lo hondo: se oscurece y se desvanece al final.
        const luz = Phaser.Math.Clamp(1 - Math.max(0, t.v - 0.7) / 0.3, 0, 1);
        const tinte = Phaser.Display.Color.GetColor(Math.round(80 + 175 * luz), Math.round(70 + 185 * luz), Math.round(60 + 195 * luz));
        c.list.forEach((o) => o.setTint(tinte));
        c.setAlpha(t.v > 0.85 ? (1 - t.v) / 0.15 : 1);
        if (piernas) piernas.anims.timeScale = 0.7 * Math.max(0.5, k);
      },
      onComplete: alTerminar
    });
  }
}
