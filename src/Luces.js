// =============================================================================
// Luces del final de las entradas: el "momento del héroe" en la pose final.
// El fondo se hace sombra (un
// foco: oscuro alrededor y la luz sobre el personaje), un destello al empezar,
// estrellitas relucientes que aparecen y giran a su alrededor y, si el
// sprite lo permite (WebGL), un brillo que le cruza el cuerpo y un halo que
// late. Solo al final de cada entrada: Manfred saludando
// (Nivel1.entradaHelicoptero), Tuto señalando (IntroLevel.js) y la entrada
// corta de salto (Nivel1.aterrizarEntrada).
//
//   momentoHeroe(escena, sprite, opciones)
//     sprite: lo que queda iluminado (o { x, y, scrollFactorX, scrollFactorY,
//             depth, displayHeight } si son varias partes, p. ej. el cuerpo
//             modular)
//     opciones: dura (ms con la luz), sombra (alfa del oscuro), radio (escala
//               del foco), profundidad (la del oscuro: debajo del héroe),
//               estrellas (cuántas), brillo (shine y halo en el sprite)
// =============================================================================

const LUCES = {
  foco: 256,             // radio de la textura del foco (px); se ve `escalaFoco` veces más grande
  escalaFoco: 5.8,       // así: luz hasta ~90 px del héroe, sombra llena a ~220 px y cubre toda la pantalla
  sombra: 0.6,
  entra: 220, sale: 450, // ms del oscuro
  estrellas: 7,
  colorHalo: 0xfff2b0
};

function texturasLuces(escena) {
  const lienzo = (clave, w, h, dibujar) => {
    if (escena.textures.exists(clave)) return;
    const t = escena.textures.createCanvas(clave, w, h);
    dibujar(t.getContext(), w, h);
    t.refresh();
  };
  // Foco: transparente en el centro y oscuro alrededor (también en las
  // esquinas: el degradado se rellena en todo el cuadrado).
  const r = LUCES.foco;
  lienzo('luz_foco', r * 2, r * 2, (c) => {
    const g = c.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(8,6,20,0)');
    g.addColorStop(0.06, 'rgba(8,6,20,0)');
    g.addColorStop(0.15, 'rgba(8,6,20,0.75)');
    g.addColorStop(0.3, 'rgba(8,6,20,0.92)');
    g.addColorStop(1, 'rgba(8,6,20,0.92)');
    c.fillStyle = g;
    c.fillRect(0, 0, r * 2, r * 2);
  });
  // Estrella de 4 puntas con su resplandor.
  lienzo('luz_estrella', 31, 31, (c, w) => {
    const m = (w - 1) / 2;
    const halo = c.createRadialGradient(m, m, 0, m, m, m);
    halo.addColorStop(0, 'rgba(255,250,220,0.9)'); halo.addColorStop(0.3, 'rgba(255,230,150,0.35)'); halo.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = halo; c.fillRect(0, 0, w, w);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(m, 0); c.lineTo(m + 2, m - 2); c.lineTo(w, m); c.lineTo(m + 2, m + 2);
    c.lineTo(m, w); c.lineTo(m - 2, m + 2); c.lineTo(0, m); c.lineTo(m - 2, m - 2);
    c.closePath(); c.fill();
  });
}

function momentoHeroe(escena, sprite, opciones = {}) {
  const {
    dura = 1200, sombra = LUCES.sombra, radio = 1, profundidad = (sprite.depth || 10) - 0.25,
    estrellas = LUCES.estrellas, brillo = true, alto = sprite.displayHeight || 120
  } = opciones;
  texturasLuces(escena);
  const cam = escena.cameras.main;
  const fx = sprite.scrollFactorX ?? 1, fy = sprite.scrollFactorY ?? 1;
  const enPantalla = () => ({ x: sprite.x - cam.scrollX * fx, y: sprite.y - alto * 0.5 - cam.scrollY * fy });
  const objetos = [];

  // El fondo se hace sombra: el foco sigue al héroe y cubre toda la pantalla.
  const p = enPantalla();
  const foco = escena.add.image(p.x, p.y, 'luz_foco').setScrollFactor(0).setDepth(profundidad).setAlpha(0)
    .setScale(radio * LUCES.escalaFoco);
  objetos.push(foco);
  const seguir = () => { if (!foco.active) return; const q = enPantalla(); foco.setPosition(q.x, q.y); };
  escena.events.on('update', seguir);
  escena.tweens.add({ targets: foco, alpha: sombra, duration: LUCES.entra, ease: 'Sine.out' });
  escena.tweens.add({ targets: foco, alpha: 0, delay: dura, duration: LUCES.sale, ease: 'Sine.in' });

  // Destello al empezar.
  const flash = escena.add.rectangle(0, 0, escena.scale.width, escena.scale.height, 0xfff8e0).setOrigin(0)
    .setScrollFactor(0).setDepth(39).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
  escena.tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });

  // Estrellitas relucientes alrededor (van con el héroe: mismo scroll).
  for (let i = 0; i < estrellas; i++) {
    escena.time.delayedCall(80 + i * (dura * 0.8 / Math.max(1, estrellas)), () => {
      const ancho = (sprite.displayWidth || 60) * 0.6;
      const e = escena.add.image(sprite.x + Phaser.Math.Between(-ancho, ancho), sprite.y - Phaser.Math.Between(alto * 0.15, alto * 1.05), 'luz_estrella')
        .setScrollFactor(fx, fy).setDepth((sprite.depth || 10) + 0.05).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAngle(Phaser.Math.Between(0, 45));
      escena.tweens.add({
        targets: e, scale: Phaser.Math.FloatBetween(0.8, 1.5), angle: e.angle + 90, duration: 260, yoyo: true, ease: 'Sine.inOut',
        onComplete: () => e.destroy()
      });
    });
  }

  // Brillo que cruza el cuerpo y halo que late (solo con WebGL y un sprite de verdad).
  let shine = null, halo = null;
  if (brillo && sprite.preFX && escena.renderer.type === Phaser.WEBGL) {
    shine = sprite.preFX.addShine(1.4, 0.35, 3);
    halo = sprite.preFX.addGlow(LUCES.colorHalo, 0, 0, false, 0.1, 10);
    escena.tweens.add({ targets: halo, outerStrength: 3, duration: 260, yoyo: true, repeat: Math.max(0, Math.floor(dura / 520) - 1) });
  }

  const terminar = () => {
    escena.events.off('update', seguir);
    objetos.forEach((o) => o.active && o.destroy());
    if (sprite.active && sprite.preFX) {
      if (shine) sprite.preFX.remove(shine);
      if (halo) sprite.preFX.remove(halo);
    }
  };
  escena.time.delayedCall(dura + LUCES.sale + 30, terminar);
  escena.events.once('shutdown', terminar);
}
