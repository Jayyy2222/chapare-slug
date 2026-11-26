// =============================================================================
// Juan, el compañero de Eduardo: un chico con su bombo que lo sigue a todos
// lados (CuerpoModular.cuerpoJugador lo crea si el personaje es Eduardo).
//   camina  sigue a Eduardo un poco detrás, por el piso
//   toca    si Eduardo está quieto, toca el bombo (con notas)
//   ataca   si hay un enemigo adelante y cerca, le tira un palo que gira en
//           arco; al pegar, una estrella y daño (danoEnArea de la escena)
//   muere   si Eduardo muere, Juan sale corriendo llorando
// Hojas: assets/personajes/jugador/eduardo/juan_*.png (herramientas/
// heroes_cuerpo.py), celdas en juan.json; los pies abajo al medio.
// =============================================================================

const JUAN = {
  ruta: 'assets/personajes/jugador/eduardo/',
  hojas: ['camina', 'toca', 'ataca', 'muere', 'palo', 'estrella'],
  detras: 72,           // px detrás de Eduardo
  velocidad: 260,       // px/s a los que lo alcanza
  quieto: 700,          // ms de Eduardo quieto para ponerse a tocar
  vista: 430,           // px hasta donde ve enemigos (adelante)
  ataque: 1700,         // ms entre palos
  palo: { vuelo: 0.55, dano: 1, radio: 46 },
  profundidad: 9.85
};

// Estados en los que un enemigo ya no cuenta como blanco.
const NO_BLANCO = ['vencido', 'muerto', 'muerta', 'cae', 'escondido', 'libre', 'sale', 'oculto', 'huye'];

function cargarJuan(escena) {
  if (!escena.cache.json.exists('juanCeldas')) escena.load.json('juanCeldas', JUAN.ruta + 'juan.json');
  JUAN.hojas.forEach((h) => {
    if (!escena.textures.exists('juan_' + h)) escena.load.image('juan_' + h, `${JUAN.ruta}juan_${h}.png`);
  });
}

function animacionesJuan(escena) {
  const celdas = escena.cache.json.get('juanCeldas');
  if (!celdas) return false;
  Object.entries(celdas).forEach(([h, [w, alto, n]]) => {
    const t = escena.textures.get('juan_' + h);
    for (let i = 0; i < n; i++) if (!t.has(String(i))) t.add(String(i), 0, i * w, 0, w, alto);
  });
  const anim = (key, hoja, frames, frameRate, repeat = -1) => {
    if (!escena.anims.exists(key)) escena.anims.create({ key, frames: frames.map((f) => ({ key: 'juan_' + hoja, frame: String(f) })), frameRate, repeat });
  };
  anim('juan_camina', 'camina', [0, 1, 2, 3, 4, 5, 6, 7], 11);
  anim('juan_toca', 'toca', [0, 1, 2, 3, 4, 5], 7);
  anim('juan_ataca', 'ataca', [0, 1, 2, 3, 4, 5], 12, 0); // (el 6 es solo el palo suelto)
  anim('juan_muere', 'muere', [0, 1, 2, 3, 4, 5, 6, 7], 12);
  anim('juan_palo', 'palo', [0, 1, 2, 3, 4, 5], 18);
  return true;
}

class Companero {
  constructor(escena) {
    this.escena = escena;
    this.listo = animacionesJuan(escena);
    if (!this.listo) return;
    this.estado = 'camina';
    this.proximoAtaque = 0;
    this.quietoDesde = 0;
    this.sprite = null;
    this.palos = [];
    const actualizar = () => this.actualizar();
    escena.events.on('postupdate', actualizar);
    escena.events.once('shutdown', () => {
      escena.events.off('postupdate', actualizar);
      this.palos.forEach((p) => p.destroy());
      this.palos = [];
    });
  }

  crear() {
    const j = this.escena.jugador;
    this.sprite = this.escena.add.sprite(j.x - JUAN.detras, j.body.bottom, 'juan_camina', '0').setOrigin(0.5, 1).setDepth(JUAN.profundidad);
    this.sombra = this.escena.add.ellipse(this.sprite.x, this.sprite.y - 1, 40, 6, 0x000000, 0.3).setDepth(JUAN.profundidad - 0.05);
    this.sprite.play('juan_camina');
  }

  // El piso debajo de x (el de la escena si sabe buscarlo; si no, el de Eduardo).
  pisoEn(x) {
    const e = this.escena;
    const j = e.jugador;
    if (e.superficie) {
      const s = e.superficie(x, j.body.bottom - 40);
      if (s && isFinite(s.y) && Math.abs(s.y - j.body.bottom) < 160) return s.y;
    }
    return j.body.bottom;
  }

  // El enemigo más cerca adelante (en la dirección en que mira Eduardo).
  blanco() {
    const e = this.escena;
    const s = this.sprite;
    const lado = e.jugador.flipX ? -1 : 1;
    let mejor = null;
    let dist = JUAN.vista;
    ['soldados', 'garroteros', 'cholitas', 'mineros', 'guacharos'].forEach((nombre) => {
      const g = e[nombre];
      if (!g || !g.getChildren) return;
      g.getChildren().forEach((o) => {
        if (!o.active || !o.visible || (o.body && !o.body.enable) || NO_BLANCO.includes(o.getData('estado'))) return;
        const dx = (o.x - s.x) * lado;
        const dy = Math.abs((o.body ? o.body.center.y : o.y) - (s.y - 40));
        if (dx < 30 || dy > 220) return;
        if (dx < dist) { dist = dx; mejor = { x: o.x, y: o.body ? o.body.center.y : o.y - 40 }; }
      });
    });
    // El Tío (la caverna): al torso.
    if (e.tio && e.torso && ['persigue', 'ataca', 'dano'].includes(e.tioEstado)) {
      const r = e.torso();
      const dx = (r.centerX - s.x) * lado;
      if (dx > 0 && dx < JUAN.vista + 200) mejor = { x: r.centerX, y: r.centerY };
    }
    return mejor;
  }

  actualizar() {
    const e = this.escena;
    const j = e.jugador;
    if (!this.listo || !j || !j.active || !j.body) return;
    if (!this.sprite) this.crear();
    const s = this.sprite;
    const ahora = e.time.now;
    const dt = Math.min(e.game.loop.delta, 50) / 1000;
    this.moverPalos(dt);
    if (this.estado === 'muere') return;
    // Eduardo murió: sale corriendo llorando (hacia atrás) y se va.
    if (e.muerto) {
      this.estado = 'muere';
      s.setFlipX(true).play('juan_muere');
      e.tweens.add({ targets: [s, this.sombra], x: s.x - 420, duration: 2600, ease: 'Linear' });
      e.tweens.add({ targets: [s, this.sombra], alpha: 0, delay: 1800, duration: 800 });
      return;
    }
    s.setVisible(!e.ocultarJugador); // (en las cinemáticas que dibujan al jugador aparte, tampoco)
    const lado = j.flipX ? -1 : 1;
    const objetivo = j.x - lado * JUAN.detras;
    const dx = objetivo - s.x;
    // Muy lejos (Eduardo trepó, cayó o lo pusieron en otro lugar): aparece al lado.
    if (Math.abs(dx) > 500) s.x = objetivo;
    // Eduardo trepa: Juan va a la escalera y sube detrás de él (un poco más abajo).
    if (e.trepando) {
      this.trepar(e.trepando, dt);
      this.sombra.setVisible(false);
      return;
    }
    this.sombra.setVisible(true);
    const quieto = Math.abs(j.body.velocity.x) < 5;
    if (!quieto) this.quietoDesde = ahora;
    if (this.estado === 'ataca') {
      if (!s.anims.isPlaying) this.estado = 'camina';
    } else if (!quieto || Math.abs(dx) > 8) {
      // Camina con Eduardo: a su misma velocidad (más un poco para corregir
      // la distancia), con el paso al ritmo de lo que avanza.
      const vj = j.body.velocity.x;
      const v = vj + Phaser.Math.Clamp(dx * 4, -JUAN.velocidad, JUAN.velocidad);
      const paso = Math.abs(dx) <= 2 && !quieto ? vj : v;
      s.x += Phaser.Math.Clamp(paso * dt, -Math.abs(dx) - Math.abs(vj * dt), Math.abs(dx) + Math.abs(vj * dt));
      s.setFlipX(quieto ? dx < 0 : vj < 0);
      if (s.anims.currentAnim?.key !== 'juan_camina' || !s.anims.isPlaying) s.play('juan_camina');
      s.anims.timeScale = Phaser.Math.Clamp(Math.abs(paso) / 180, 0.6, 1.6);
      this.estado = 'camina';
    } else if (ahora - this.quietoDesde > JUAN.quieto) {
      s.anims.timeScale = 1;
      s.setFlipX(lado < 0);
      if (s.anims.currentAnim?.key !== 'juan_toca') s.play('juan_toca');
      this.estado = 'toca';
    } else {
      s.setFlipX(lado < 0);
      s.anims.stop();
      s.setTexture('juan_camina', '0');
    }
    // Ataque: si hay un enemigo adelante, tira un palo.
    if (this.estado !== 'ataca' && e.estado === 'control' && ahora > this.proximoAtaque) {
      const b = this.blanco();
      if (b) this.atacar(b);
    }
    // En su piso; si quedó en otra altura (bajó de la escalera, Eduardo subió
    // o bajó de un piso), llega de a poco (sin saltar de lugar).
    const piso = this.pisoEn(s.x);
    s.y = Math.abs(piso - s.y) < 4 ? piso : s.y + (piso - s.y) * Math.min(1, dt * 9);
    this.sombra.setPosition(s.x, s.y - 1).setAlpha(s.alpha * 0.3);
  }

  trepar(esc, dt) {
    const e = this.escena;
    const s = this.sprite;
    const j = e.jugador;
    this.estado = 'trepa';
    const x = esc.centro - 8;
    const y = Math.min(esc.abajo, j.body.bottom + 50);
    const dx = x - s.x;
    const dy = y - s.y;
    s.x += Math.sign(dx) * Math.min(Math.abs(dx), JUAN.velocidad * dt);
    // Primero llega a la escalera; después sube (o baja) con Eduardo.
    if (Math.abs(dx) < 10) s.y += Math.sign(dy) * Math.min(Math.abs(dy), JUAN.velocidad * dt);
    else s.y += (this.pisoEn(s.x) - s.y) * Math.min(1, dt * 9);
    const moviendo = Math.abs(dx) > 1 || Math.abs(dy) > 1;
    if (moviendo) {
      if (s.anims.currentAnim?.key !== 'juan_camina' || !s.anims.isPlaying) s.play('juan_camina');
      s.anims.timeScale = Math.abs(dx) > 10 ? 1 : 0.6;
    } else {
      s.anims.stop();
      s.setTexture('juan_camina', '0');
    }
    if (Math.abs(dx) > 10) s.setFlipX(dx < 0);
  }

  atacar(b) {
    const e = this.escena;
    const s = this.sprite;
    this.estado = 'ataca';
    this.proximoAtaque = e.time.now + JUAN.ataque;
    s.setFlipX(b.x < s.x).play('juan_ataca');
    // En el cuadro en que suelta el palo, sale el palo.
    e.time.delayedCall(160, () => {
      if (!s.active || this.estado === 'muere') return;
      const lado = b.x < s.x ? -1 : 1;
      const x = s.x + lado * 18;
      const y = s.y - 70;
      const t = JUAN.palo.vuelo;
      const g = 900;
      const p = e.add.sprite(x, y, 'juan_palo', '0').setDepth(10.4).setScale(1.2);
      p.play('juan_palo');
      p.setData({ vx: (b.x - x) / t, vy: (b.y - y - 0.5 * g * t * t) / t, g, hasta: e.time.now + t * 1000 + 60, bx: b.x, by: b.y });
      this.palos.push(p);
      sonarTramo(e, { archivo: 'salto.mp3', inicio: 0.6, dura: 0.12, volumen: 0.2, tono: 1.8 }, 'palo');
    });
  }

  moverPalos(dt) {
    const e = this.escena;
    this.palos = this.palos.filter((p) => {
      if (!p.active) return false;
      p.setData('vy', p.getData('vy') + p.getData('g') * dt);
      p.x += p.getData('vx') * dt;
      p.y += p.getData('vy') * dt;
      if (e.time.now < p.getData('hasta')) return true;
      // Pega: estrella y daño en el lugar.
      const est = e.add.image(p.x, p.y, 'juan_estrella', '1').setDepth(10.5).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
      e.tweens.add({ targets: est, scale: 1.3, angle: 90, alpha: 0, duration: 380, onComplete: () => est.destroy() });
      if (e.danoEnArea) e.danoEnArea(p.x, p.y, JUAN.palo.radio, JUAN.palo.dano, true);
      if (e.tio && e.explosionContraTio) e.explosionContraTio(p.x, p.y, JUAN.palo.radio, JUAN.palo.dano * 0.5);
      p.destroy();
      return false;
    });
  }
}
