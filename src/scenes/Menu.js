// =============================================================================
// Menú principal: fondo de Villa Tunari con batalla de fondo (EfectosMenu.js),
// el título cae con chispas y le pegan balazos, y un menú de opciones con una
// bala como cursor (fogonazo y casquillo al moverse).
// =============================================================================

// Puntos del fondo (assets/menu/fondo.jpeg, 1264x848) en píxeles de la imagen.
const FONDO_MENU = {
  fuego: [540, 615],      // el auto quemado en la barricada
  horizonte: 470,         // detrás de las montañas, para las explosiones
  reflectores: [[120, 848, -70], [1150, 848, -110]]
};

const OPCIONES_MENU = [
  // La fuente pixel (Press Start 2P) no trae Ó ni flechas ←→: textos sin tilde.
  { texto: 'INICIAR MISION', accion: 'jugar' },
  { texto: 'CONTROLES', accion: 'controles' }
];

class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    this.load.image('menuFondo', 'assets/menu/fondo.jpeg');
    // Generado desde titulo.png con herramientas/titulo_transparente.py
    this.load.image('menuTitulo', 'assets/menu/titulo_transparente.png');
    cargarMusica(this, 'titulo');
  }

  create() {
    const { width, height } = this.scale;
    this.opcion = 0;
    this.listo = false;
    this.panelAbierto = false;

    // Fondo: escalado para cubrir toda la pantalla (recorta lo que sobra).
    const fondo = this.add.image(width / 2, height / 2, 'menuFondo');
    fondo.setScale(Math.max(width / fondo.width, height / fondo.height));
    const aPantalla = (x, y) => [
      fondo.x + (x - fondo.width / 2) * fondo.scaleX,
      fondo.y + (y - fondo.height / 2) * fondo.scaleY
    ];

    // Batalla de fondo sobre la imagen.
    fondoBatalla(this, {
      horizonte: aPantalla(0, FONDO_MENU.horizonte)[1],
      fuegos: [[...aPantalla(...FONDO_MENU.fuego), 1.2]],
      reflectores: FONDO_MENU.reflectores.map(([x, y, a]) => [...aPantalla(x, y), a]),
      profundidad: 1
    });

    // Título: cae, golpea y después aparece el menú.
    const titulo = this.add.image(width / 2, height * 0.38, 'menuTitulo');
    titulo.setScale((width * 0.56) / titulo.width);
    golpeTitulo(this, titulo, { profundidad: 40, alTerminar: () => this.time.delayedCall(250, () => this.crearOpciones()) });

    this.configurarControles();
    tocarMusica(this, 'titulo');
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // Opciones en placas de metal; la bala marca la elegida.
  crearOpciones() {
    const { width, height } = this.scale;
    const y0 = height * 0.74;
    this.textos = OPCIONES_MENU.map((op, i) => {
      const y = y0 + i * 46;
      const placa = this.add.rectangle(width / 2, y, 360, 38, 0x14120c, 0.75).setStrokeStyle(2, 0x5a5e50).setDepth(45).setAlpha(0);
      const texto = this.add.text(width / 2, y, op.texto, {
        fontFamily: FUENTE_PIXEL, fontSize: '18px', color: '#c8c0a0', stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(46).setAlpha(0);
      // Entran deslizándose desde los costados.
      const desde = i % 2 ? width + 200 : -200;
      [placa, texto].forEach((o) => {
        const x = o.x;
        o.x = desde;
        this.tweens.add({ targets: o, x, alpha: 1, duration: 320, delay: i * 120, ease: 'Back.out' });
      });
      return { placa, texto };
    });
    this.cursor = this.add.image(0, 0, 'fx_bala').setScale(3).setDepth(47).setAlpha(0);
    this.tweens.add({ targets: this.cursor, alpha: 1, delay: 400, duration: 200 });
    this.tweens.add({ targets: this.cursor, scaleX: 3.4, duration: 260, yoyo: true, repeat: -1 });
    this.time.delayedCall(450, () => {
      this.listo = true;
      this.marcar(0, false);
    });

    this.add.text(width / 2, height - 18, 'ARRIBA/ABAJO ELEGIR    ENTER CONFIRMAR', {
      fontFamily: FUENTE_PIXEL, fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(46).setAlpha(0.7);
  }

  marcar(i, conDisparo = true) {
    this.opcion = i;
    this.textos.forEach(({ placa, texto }, k) => {
      const activa = k === i;
      texto.setColor(activa ? '#ffd23f' : '#c8c0a0').setScale(activa ? 1.08 : 1);
      placa.setStrokeStyle(2, activa ? 0xffd23f : 0x5a5e50);
    });
    const { placa } = this.textos[i];
    const x = placa.x - placa.width / 2 - 34;
    this.tweens.add({ targets: this.cursor, x, y: placa.y, duration: 90, ease: 'Quad.out' });
    if (conDisparo) {
      fogonazo(this, x - 26, placa.y, 1.4, 48, 180);
      casquillo(this, x - 20, placa.y - 4, 48);
    }
  }

  configurarControles() {
    const al = (evento, fn) => this.input.keyboard.on(evento, (e) => { if (!e.repeat) fn(); });
    const mover = (d) => {
      if (!this.listo || this.panelAbierto) return;
      this.marcar((this.opcion + d + OPCIONES_MENU.length) % OPCIONES_MENU.length);
    };
    al('keydown-UP', () => mover(-1));
    al('keydown-W', () => mover(-1));
    al('keydown-DOWN', () => mover(1));
    al('keydown-S', () => mover(1));
    al('keydown-ENTER', () => this.elegir());
    al('keydown-SPACE', () => this.elegir());
    al('keydown-ESC', () => this.cerrarPanel());
  }

  elegir() {
    if (this.panelAbierto) {
      this.cerrarPanel();
      return;
    }
    if (!this.listo) return;
    const { placa } = this.textos[this.opcion];
    // Ráfaga sobre la opción elegida.
    for (let k = 0; k < 3; k++) {
      this.time.delayedCall(k * 70, () => {
        fogonazo(this, this.cursor.x - 26, placa.y, 2, 48, 180);
        chispas(this, placa.x + Phaser.Math.Between(-150, 150), placa.y, 10, -90, 160, 48);
        casquillo(this, this.cursor.x - 20, placa.y - 4, 48);
      });
    }
    this.cameras.main.shake(120, 0.006);
    if (OPCIONES_MENU[this.opcion].accion === 'controles') {
      this.abrirPanel();
      return;
    }
    this.listo = false;
    this.cameras.main.flash(150, 255, 240, 200);
    this.time.delayedCall(250, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
    });
  }

  // Panel con los controles del juego.
  abrirPanel() {
    const { width, height } = this.scale;
    this.panelAbierto = true;
    const lineas = [
      ['FLECHAS  /  A D', 'CAMINAR'],
      ['SHIFT + CAMINAR', 'CORRER'],
      ['ARRIBA / W / ESPACIO', 'SALTAR'],
      ['J  /  X', 'DISPARAR'],
      ['ARRIBA EN ESCALERA', 'TREPAR'],
      ['ABAJO + SALTO', 'BAJAR DE UNA PLATAFORMA'],
      ['ARRIBA EN UNA PUERTA', 'ENTRAR / SALIR']
    ];
    const elementos = [
      this.add.rectangle(width / 2, height / 2, 620, 372, 0x0e0c08, 0.92).setStrokeStyle(4, 0xffd23f),
      this.add.text(width / 2, height / 2 - 154, 'CONTROLES', {
        fontFamily: FUENTE_TITULO, fontSize: '34px', color: '#ffd23f', stroke: '#2a1a05', strokeThickness: 6
      }).setOrigin(0.5),
      ...lineas.flatMap(([tecla, accion], i) => {
        const y = height / 2 - 94 + i * 36;
        const estilo = { fontFamily: FUENTE_PIXEL, fontSize: '13px', stroke: '#000000', strokeThickness: 4 };
        return [
          this.add.text(width / 2 - 270, y, tecla, { ...estilo, color: '#ffffff' }).setOrigin(0, 0.5),
          this.add.text(width / 2 + 270, y, accion, { ...estilo, color: '#c8c0a0' }).setOrigin(1, 0.5)
        ];
      }),
      this.add.text(width / 2, height / 2 + 160, 'ENTER PARA VOLVER', {
        fontFamily: FUENTE_PIXEL, fontSize: '10px', color: '#ffd23f'
      }).setOrigin(0.5)
    ];
    elementos.forEach((e) => e.setDepth(60).setAlpha(0));
    this.tweens.add({ targets: elementos, alpha: 1, duration: 160 });
    this.panel = elementos;
  }

  cerrarPanel() {
    if (!this.panelAbierto) return;
    this.panelAbierto = false;
    const panel = this.panel;
    this.tweens.add({ targets: panel, alpha: 0, duration: 140, onComplete: () => panel.forEach((e) => e.destroy()) });
  }
}
