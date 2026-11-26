// =============================================================================
// Multijugador (cliente). Se conecta al servidor de servidor/servidor.js por
// WebSocket, con salas de código de 4 letras.
//
// Etapa 1 (esto): cada jugador mueve su personaje en su navegador y manda,
// ~15 veces por segundo, qué se ve de él (las partes del dibujo: el sprite,
// las piernas y el torso de Tuto, el arma) y sus disparos. Los demás lo
// dibujan (el "compañero") en la misma escena, con su nombre arriba y una
// flecha en el borde si está fuera de la pantalla. Los enemigos todavía son
// de cada uno (etapa 2: los manda el anfitrión).
//
// El lobby (CREAR SALA / UNIRSE) es HTML encima del juego: sirve igual en el
// celular (el teclado del celular para el código).
// =============================================================================

const RED = {
  ws: null,
  sala: null,          // { codigo, id, anfitrion, jugadores: [...] }
  remotos: new Map(),  // id -> { datos, estado, dibujo }
  envioCada: 66,       // ms entre estados (~15 por segundo)
  ultimoEnvio: 0,
  // Servidor: el mismo que sirve la página (npm start). En GitHub Pages no hay
  // servidor: se pasa con index.html?servidor=wss://... o se pone acá.
  servidorFijo: '',
  colores: ['#ffd23f', '#5ac8ff', '#ff6a5a', '#7ae070'],

  url() {
    const pedido = new URLSearchParams(location.search).get('servidor');
    if (pedido) return pedido;
    if (RED.servidorFijo) return RED.servidorFijo;
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  },

  conectado() {
    return RED.ws && RED.ws.readyState === 1;
  },

  enSala() {
    return RED.conectado() && !!RED.sala;
  },

  conectar() {
    if (RED.ws && RED.ws.readyState <= 1) return Promise.resolve();
    return new Promise((ok, mal) => {
      let ws;
      try { ws = new WebSocket(RED.url()); } catch (e) { mal(e); return; }
      RED.ws = ws;
      const tiempo = setTimeout(() => { ws.close(); mal(new Error('tiempo')); }, 5000);
      ws.onopen = () => { clearTimeout(tiempo); ok(); };
      ws.onerror = () => { clearTimeout(tiempo); mal(new Error('sin servidor')); };
      ws.onclose = () => {
        const estaba = !!RED.sala;
        RED.sala = null;
        RED.limpiarRemotos();
        if (estaba) RED.aviso('SE CORTÓ LA CONEXIÓN');
        LOBBY.actualizar();
      };
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        RED.recibir(m);
      };
    });
  },

  mandar(mensaje) {
    if (RED.conectado()) RED.ws.send(JSON.stringify(mensaje));
  },

  recibir(m) {
    switch (m.t) {
      case 'sala':
        RED.sala = m;
        RED.limpiarRemotos();
        LOBBY.actualizar();
        break;
      case 'entra':
        if (!RED.sala) break;
        RED.sala.jugadores.push(m.jugador);
        RED.aviso(`${m.jugador.nombre} SE UNIÓ`);
        LOBBY.actualizar();
        break;
      case 'sale': {
        if (!RED.sala) break;
        const j = RED.jugador(m.id);
        RED.sala.jugadores = RED.sala.jugadores.filter((x) => x.id !== m.id);
        RED.sala.anfitrion = m.anfitrion;
        RED.borrarRemoto(m.id);
        if (j) RED.aviso(`${j.nombre} SE FUE`);
        LOBBY.actualizar();
        break;
      }
      case 'empezar':
        // El modo lo elige el anfitrión: la campaña o la ARENA (Arena.js).
        if (window.juego) window.juego.registry.set('modo', m.modo === 'arena' ? 'arena' : 'campana');
        LOBBY.cerrar();
        RED.irASeleccion();
        break;
      case 'error':
        LOBBY.error(m.texto);
        break;
      case 'estado': {
        const r = RED.remoto(m.de);
        r.anterior = r.estado;
        r.estado = m;
        r.llego = performance.now();
        break;
      }
      case 'disparo':
        RED.disparoRemoto(m);
        break;
      case 'evento': {
        // Cosas de la escena (Arena: cajas, bidones, golpes de área, KO).
        const e = RED.escenaDeJuego();
        if (e && e.eventoRed && m.e === e.sys.settings.key) e.eventoRed(m);
        break;
      }
      default:
        break;
    }
  },

  jugador(id) {
    return RED.sala && RED.sala.jugadores.find((j) => j.id === id);
  },

  remoto(id) {
    if (!RED.remotos.has(id)) RED.remotos.set(id, { id, estado: null, dibujo: null });
    return RED.remotos.get(id);
  },

  borrarRemoto(id) {
    const r = RED.remotos.get(id);
    if (r) RED.destruirDibujo(r);
    RED.remotos.delete(id);
  },

  limpiarRemotos() {
    [...RED.remotos.keys()].forEach((id) => RED.borrarRemoto(id));
  },

  irASeleccion() {
    const juego = window.juego;
    if (!juego) return;
    juego.scene.getScenes(true).forEach((s) => { if (s.sys.settings.key !== 'CharacterSelectScene') juego.scene.stop(s.sys.settings.key); });
    juego.scene.start('CharacterSelectScene');
  },

  // ---------------------------------------------------------------------------
  // Cada cuadro del juego (después de que se movió todo)
  // ---------------------------------------------------------------------------

  escenaDeJuego() {
    const juego = window.juego;
    if (!juego) return null;
    for (const clave of ['Arena', 'MineCartScene', 'CavernaJefe', 'Tuneles', 'Subida', 'Patio', 'Nivel2', 'JefeFinal', 'Cueva', 'Interior', 'Nivel1']) {
      const s = juego.scene.getScene(clave);
      if (!s || !s.sys.isActive()) continue;
      // (El carrito no tiene sprite de jugador: dice qué partes manda con partesRed.)
      if (s.partesRed && s.carro) return s;
      if (s.jugador && s.jugador.active) return s;
    }
    return null;
  },

  cuadro(time, delta) {
    if (!RED.enSala()) return;
    const e = RED.escenaDeJuego();
    if (e) {
      RED.mandarDisparos(e);
      if (time - RED.ultimoEnvio >= RED.envioCada) {
        RED.ultimoEnvio = time;
        // La escena puede sumar lo suyo (Arena: el %, las vidas y el personaje).
        RED.mandar({ t: 'estado', ...RED.foto(e), ...(e.datosRed ? e.datosRed() : {}) });
      }
    }
    RED.remotos.forEach((r) => RED.dibujarRemoto(r, e, delta));
  },

  // Lo que se ve del jugador: cada parte del dibujo con su textura, cuadro,
  // posición, origen, espejo, escala, giro, profundidad, alfa y tinte.
  partes(e) {
    if (e.partesRed) return e.partesRed().filter((p) => p && p.active && p.visible);
    const lista = [];
    const ct = e.cuerpoModular;
    if (ct && ct.creado) ct.partes().forEach((p) => { if (p && p.visible) lista.push(p); });
    else if (e.jugador.visible) lista.push(e.jugador);
    if (e.armaLarga && e.armaLarga.active && e.armaLarga.visible) lista.push(e.armaLarga);
    // Eduardo: Juan, su compañero, también se ve en la pantalla del otro.
    const juan = e.companero && e.companero.sprite;
    if (juan && juan.active && juan.visible) lista.push(juan);
    return lista;
  },

  foto(e) {
    const j = e.jugador || e.refRed;
    const r = (v, k = 1) => Math.round(v * k) / k;
    return {
      e: e.sys.settings.key, x: r(j.x), y: r(j.y), arriba: r(j.getBounds().top),
      p: RED.partes(e).map((o) => [
        o.texture.key, o.frame.name, r(o.x - j.x), r(o.y - j.y), r(o.originX, 1000), r(o.originY, 1000),
        o.flipX ? 1 : 0, r(o.scaleX, 1000), r(o.scaleY, 1000), r(o.rotation, 100), r(o.depth, 100),
        r(o.alpha, 100), o.isTinted ? o.tintTopLeft : -1
      ])
    };
  },

  mandarDisparos(e) {
    if (!e.balas) return;
    e.balas.getChildren().forEach((b) => {
      if (b.getData('red') || !b.body) return;
      b.setData('red', true);
      RED.mandar({
        t: 'disparo', e: e.sys.settings.key, k: b.texture.key, f: b.frame.name, x: Math.round(b.x), y: Math.round(b.y),
        vx: Math.round(b.body.velocity.x), vy: Math.round(b.body.velocity.y), r: Math.round(b.rotation * 100) / 100,
        sx: b.scaleX, sy: b.scaleY, fx: b.flipX ? 1 : 0, g: b.body.allowGravity ? 1 : 0, tint: b.isTinted ? b.tintTopLeft : -1,
        // Para que lastime en la arena: tipo, arma y cuánto le queda de vida.
        tp: b.getData('tipo'), ar: b.getData('arma'), h: Math.max(0, Math.round((b.getData('hasta') || 0) - e.time.now))
      });
    });
  },

  // El compañero en mi escena: las partes como imágenes, suavizando el
  // movimiento (llegan ~15 estados por segundo y el juego va a 60).
  dibujarRemoto(r, e, delta) {
    const est = r.estado;
    if (!est || !e || est.e !== e.sys.settings.key || performance.now() - r.llego > 3000) {
      RED.destruirDibujo(r);
      return;
    }
    let d = r.dibujo;
    if (!d || d.escena !== e || !d.etiqueta.scene) {
      RED.destruirDibujo(r);
      const datos = RED.jugador(r.id) || { nombre: '?', numero: 2 };
      const color = RED.colores[(datos.numero - 1) % RED.colores.length];
      d = r.dibujo = {
        escena: e, x: est.x, y: est.y, partes: [],
        etiqueta: e.add.text(0, 0, `J${datos.numero} ${datos.nombre}\n▼`, {
          fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color, align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 1).setDepth(25),
        flecha: e.add.text(0, 0, '', {
          fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40)
      };
    }
    // Suavizado: se acerca al último estado (salta si está muy lejos).
    const k = Math.min(1, delta / 70);
    if (Math.hypot(est.x - d.x, est.y - d.y) > 220) { d.x = est.x; d.y = est.y; }
    d.x += (est.x - d.x) * k;
    d.y += (est.y - d.y) * k;
    est.p.forEach((p, i) => {
      const [clave, cuadro, ox, oy, orx, ory, fx, sx, sy, rot, prof, alfa, tinte] = p;
      let img = d.partes[i];
      if (!img) img = d.partes[i] = e.add.image(0, 0, '__WHITE');
      if (!RED.textura(e, clave, cuadro)) { img.setVisible(false); return; }
      if (img.texture.key !== clave || img.frame.name !== cuadro) img.setTexture(clave, cuadro);
      img.setVisible(true).setPosition(d.x + ox, d.y + oy).setOrigin(orx, ory).setFlipX(!!fx)
        .setScale(sx, sy).setRotation(rot).setDepth(prof - 0.3).setAlpha(alfa);
      if (tinte >= 0) img.setTint(tinte); else img.clearTint();
    });
    for (let i = est.p.length; i < d.partes.length; i++) d.partes[i].setVisible(false);
    // Sin nada que dibujar (en la arena: fuera de la pantalla, por volver), sin nombre.
    d.etiqueta.setVisible(est.p.length > 0).setPosition(d.x, d.y + (est.arriba - est.y) - 6);
    // Flecha en el borde si está fuera de la pantalla.
    const cam = e.cameras.main;
    const vista = cam.worldView;
    const fuera = d.x < vista.x - 10 ? -1 : d.x > vista.right + 10 ? 1 : 0;
    const datos = RED.jugador(r.id);
    if (fuera && datos && est.p.length > 0) {
      d.flecha.setVisible(true).setText(fuera < 0 ? `◀ J${datos.numero}` : `J${datos.numero} ▶`)
        .setPosition(fuera < 0 ? 46 : e.scale.width - 46, Phaser.Math.Clamp(d.y - vista.y - 40, 60, e.scale.height - 40));
    } else {
      d.flecha.setVisible(false);
    }
  },

  // ¿Está la textura y el cuadro? (los de los cuerpos se cortan en animacionesCuerpos)
  textura(e, clave, cuadro) {
    if (!e.textures.exists(clave)) return false;
    const t = e.textures.get(clave);
    if (t.has(cuadro)) return true;
    if (/^(tuto|manfred|eduardo|bartolina)_/.test(clave) && typeof animacionesCuerpos === 'function') {
      animacionesCuerpos(e);
      return e.textures.get(clave).has(cuadro);
    }
    if (/^juan_/.test(clave) && typeof animacionesJuan === 'function') {
      animacionesJuan(e);
      return e.textures.get(clave).has(cuadro);
    }
    return false;
  },

  destruirDibujo(r) {
    const d = r.dibujo;
    if (!d) return;
    d.partes.forEach((p) => p.destroy());
    d.etiqueta.destroy();
    d.flecha.destroy();
    r.dibujo = null;
  },

  // Las balas del compañero: solo se ven (no lastiman; etapa 2).
  disparoRemoto(m) {
    const e = RED.escenaDeJuego();
    if (!e || m.e !== e.sys.settings.key || !RED.textura(e, m.k, m.f)) return;
    if (e.disparoRemoto) { e.disparoRemoto(m); return; } // la arena: esas sí lastiman
    const b = e.add.image(m.x, m.y, m.k, m.f).setRotation(m.r).setScale(m.sx, m.sy).setFlipX(!!m.fx).setDepth(10.2);
    if (m.tint >= 0) b.setTint(m.tint);
    let vy = m.vy;
    let vida = 1400;
    const mover = (time, delta) => {
      const s = delta / 1000;
      if (m.g) vy += 800 * s;
      b.x += m.vx * s;
      b.y += vy * s;
      vida -= delta;
      if (vida <= 0 || !b.scene) { e.events.off('update', mover); if (b.scene) b.destroy(); }
    };
    e.events.on('update', mover);
    e.events.once('shutdown', () => e.events.off('update', mover));
  },

  // Aviso chico arriba de la pantalla (HTML).
  aviso(texto) {
    const a = document.createElement('div');
    a.className = 'red-aviso';
    a.textContent = texto;
    document.body.appendChild(a);
    setTimeout(() => a.classList.add('fuera'), 2200);
    setTimeout(() => a.remove(), 2800);
  }
};

// =============================================================================
// Lobby: CREAR SALA / UNIRSE con código, la lista de jugadores y EMPEZAR.
// =============================================================================

const LOBBY = {
  capa: null,
  alCerrar: null,

  // opciones: modo ('campana' o 'arena': lo manda el anfitrión al empezar) y
  // alBots(nombre): si está, aparece JUGAR CONTRA BOTS (la arena sin red).
  abrir(alCerrar, opciones = {}) {
    LOBBY.alCerrar = alCerrar;
    LOBBY.modo = opciones.modo || 'campana';
    LOBBY.alBots = opciones.alBots || null;
    if (!LOBBY.capa) LOBBY.crear();
    LOBBY.capa.querySelector('h1').textContent = LOBBY.modo === 'arena' ? 'ARENA' : 'MULTIJUGADOR';
    LOBBY.capa.querySelectorAll('.solo-bots').forEach((el) => { el.style.display = LOBBY.alBots ? '' : 'none'; });
    LOBBY.capa.style.display = 'flex';
    LOBBY.error('');
    LOBBY.actualizar();
  },

  cerrar() {
    if (LOBBY.capa) LOBBY.capa.style.display = 'none';
    const fn = LOBBY.alCerrar;
    LOBBY.alCerrar = null;
    if (fn) fn();
  },

  crear() {
    const c = document.createElement('div');
    c.id = 'red-lobby';
    c.innerHTML = `
      <div class="panel">
        <h1>MULTIJUGADOR</h1>
        <div class="paso inicio">
          <label>TU NOMBRE <input class="nombre" maxlength="12" placeholder="J1" autocomplete="off"></label>
          <button class="bots solo-bots">JUGAR CONTRA BOTS</button>
          <div class="o solo-bots">— O EN LÍNEA —</div>
          <button class="crear">CREAR SALA</button>
          <div class="o">— O —</div>
          <label>CÓDIGO DE LA SALA <input class="codigo" maxlength="4" placeholder="ABCD" autocomplete="off" autocapitalize="characters"></label>
          <button class="unir">UNIRSE</button>
        </div>
        <div class="paso sala">
          <div class="cod">SALA <b></b></div>
          <div class="ayuda">Pasale este código a tu compañero</div>
          <ul class="lista"></ul>
          <button class="empezar">EMPEZAR</button>
          <div class="espera"></div>
          <button class="salir secundario">SALIR DE LA SALA</button>
        </div>
        <div class="error"></div>
        <button class="volver secundario">VOLVER</button>
      </div>`;
    document.body.appendChild(c);
    LOBBY.capa = c;
    // Lo que se escribe acá no llega al juego (Phaser escucha la ventana).
    ['keydown', 'keyup'].forEach((t) => c.addEventListener(t, (e) => {
      e.stopPropagation();
      if (t === 'keydown' && e.key === 'Escape') LOBBY.cerrar();
    }));
    const $ = (s) => c.querySelector(s);
    const nombre = () => $('.nombre').value.trim();
    const personaje = () => (window.juego && window.juego.registry.get('personaje')) || 'manfred';
    const conectarY = async (mensaje) => {
      LOBBY.error('CONECTANDO...');
      try {
        await RED.conectar();
        LOBBY.error('');
        RED.mandar(mensaje);
      } catch {
        LOBBY.error('NO HAY SERVIDOR. Abrí el juego desde el servidor multijugador (npm start) o pasá ?servidor=...');
      }
    };
    $('.crear').onclick = () => conectarY({ t: 'crear', nombre: nombre(), personaje: personaje() });
    $('.unir').onclick = () => {
      const codigo = $('.codigo').value.trim().toUpperCase();
      if (codigo.length !== 4) { LOBBY.error('EL CÓDIGO TIENE 4 LETRAS'); return; }
      conectarY({ t: 'unir', codigo, nombre: nombre(), personaje: personaje() });
    };
    $('.codigo').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('.unir').click(); });
    $('.empezar').onclick = () => RED.mandar({ t: 'empezar', modo: LOBBY.modo });
    $('.bots').onclick = () => {
      const fn = LOBBY.alBots;
      LOBBY.alBots = null;
      LOBBY.alCerrar = null;
      LOBBY.capa.style.display = 'none';
      if (fn) fn(nombre().toUpperCase());
    };
    $('.salir').onclick = () => { RED.mandar({ t: 'salir' }); RED.sala = null; RED.limpiarRemotos(); LOBBY.actualizar(); };
    $('.volver').onclick = () => LOBBY.cerrar();
  },

  actualizar() {
    const c = LOBBY.capa;
    if (!c) return;
    const sala = RED.enSala() ? RED.sala : null;
    c.querySelector('.inicio').style.display = sala ? 'none' : 'flex';
    c.querySelector('.sala').style.display = sala ? 'flex' : 'none';
    if (!sala) return;
    c.querySelector('.cod b').textContent = sala.codigo;
    c.querySelector('.lista').innerHTML = sala.jugadores
      .sort((a, b) => a.numero - b.numero)
      .map((j) => `<li style="color:${RED.colores[(j.numero - 1) % RED.colores.length]}">J${j.numero} ${j.nombre}` +
        `${j.id === sala.id ? ' (VOS)' : ''}${j.id === sala.anfitrion ? ' <small>ANFITRIÓN</small>' : ''}</li>`).join('');
    const soyAnfitrion = sala.anfitrion === sala.id;
    const boton = c.querySelector('.empezar');
    boton.style.display = soyAnfitrion ? 'block' : 'none';
    boton.disabled = sala.jugadores.length < 2;
    c.querySelector('.espera').textContent = soyAnfitrion
      ? (sala.jugadores.length < 2 ? 'ESPERANDO A TU COMPAÑERO...' : '¡LISTOS!')
      : 'ESPERANDO QUE EL ANFITRIÓN EMPIECE...';
  },

  error(texto) {
    if (LOBBY.capa) LOBBY.capa.querySelector('.error').textContent = texto;
  }
};

// Al cerrar la pestaña o cambiar de página, se avisa enseguida (sin esperar
// al latido del servidor).
window.addEventListener('pagehide', () => { if (RED.ws) RED.ws.close(); });

// Engancha el cuadro de red al juego cuando exista (main.js crea window.juego).
(function engancharRed() {
  const esperar = setInterval(() => {
    if (!window.juego || !window.juego.events) return;
    clearInterval(esperar);
    window.juego.events.on('poststep', (time, delta) => RED.cuadro(time, delta));
  }, 200);
}());
