// =============================================================================
// Controles táctiles (celular y tablet): una capa HTML encima del juego con
// una cruz a la izquierda y botones a la derecha. Cada botón "aprieta" la
// misma tecla que en la compu (manda eventos de teclado a la ventana), así
// funcionan igual en todas las escenas: menú, selector, niveles, pausa, GAME
// OVER y la mecánica de "presiona varias veces".
//
//   cruz      flechas (caminar, agacharse, mirar arriba, trepar, menús)
//   FUEGO     J (mantener: dispara seguido)
//   SALTO     ESPACIO (también confirma en los menús)
//   ARMA      TAB (mantener y elegir con la cruz, como en la compu)
//   OK        ENTER       II  ESC (pausa)
//
// Solo aparece en pantallas táctiles (o con index.html?tactil=1 para probar).
// Al primer toque pide pantalla completa y la pantalla acostada (en Android;
// en iPhone conviene "Agregar a pantalla de inicio").
// =============================================================================

const TACTIL = {
  teclas: {
    ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
    Space: 32, KeyJ: 74, Tab: 9, Escape: 27, Enter: 13
  },
  nombres: { Space: ' ', KeyJ: 'j', Tab: 'Tab', Escape: 'Escape', Enter: 'Enter' },
  zonaMuerta: 0.28 // de la cruz: cuánto hay que correr el dedo para que cuente
};

(function controlesTactiles() {
  const pedido = new URLSearchParams(location.search).get('tactil');
  const tactil = pedido === '1' || (pedido !== '0' &&
    (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches);
  if (!tactil) return;
  document.documentElement.classList.add('tactil');

  // --- Teclas virtuales -----------------------------------------------------
  const apretadas = new Set();
  function tecla(code, abajo) {
    if (abajo === apretadas.has(code)) return;
    if (abajo) apretadas.add(code); else apretadas.delete(code);
    const ev = new KeyboardEvent(abajo ? 'keydown' : 'keyup', {
      key: TACTIL.nombres[code] || code, code, bubbles: true, cancelable: true
    });
    // Phaser lee keyCode (no se puede pasar en el constructor).
    Object.defineProperty(ev, 'keyCode', { get: () => TACTIL.teclas[code] });
    Object.defineProperty(ev, 'which', { get: () => TACTIL.teclas[code] });
    window.dispatchEvent(ev);
    if (abajo && navigator.vibrate) navigator.vibrate(8);
  }
  // Si la app pasa a segundo plano, se sueltan todas.
  const soltarTodo = () => [...apretadas].forEach((c) => tecla(c, false));
  window.addEventListener('blur', soltarTodo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) soltarTodo(); });

  // --- Capa con los controles ----------------------------------------------
  const capa = document.createElement('div');
  capa.id = 'tactil';
  capa.innerHTML = `
    <div class="cruz"><div class="perilla"></div>
      <span class="f arriba">▲</span><span class="f abajo">▼</span><span class="f izq">◀</span><span class="f der">▶</span>
    </div>
    <div class="boton fuego" data-tecla="KeyJ">FUEGO</div>
    <div class="boton salto" data-tecla="Space">SALTO</div>
    <div class="boton chico arma" data-tecla="Tab">ARMA</div>
    <div class="boton mini ok" data-tecla="Enter">OK</div>
    <div class="boton mini pausa" data-tecla="Escape">II</div>
    <div class="girar"><div class="icono">📱</div>GIRA EL CELULAR<br>PARA JUGAR</div>`;
  document.body.appendChild(capa);

  // Botones: cada dedo que lo toca lo mantiene apretado hasta que se levanta.
  capa.querySelectorAll('.boton').forEach((b) => {
    const code = b.dataset.tecla;
    const dedos = new Set();
    const actualizar = () => { b.classList.toggle('activo', dedos.size > 0); tecla(code, dedos.size > 0); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      dedos.add(e.pointerId);
      actualizar();
    });
    const fuera = (e) => { dedos.delete(e.pointerId); actualizar(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => b.addEventListener(t, fuera));
  });

  // Cruz: la dirección sale de dónde está el dedo respecto del centro (sirve
  // en diagonal: arriba + derecha, abajo + izquierda...).
  const cruz = capa.querySelector('.cruz');
  const perilla = capa.querySelector('.perilla');
  let dedoCruz = null;
  function moverCruz(e) {
    const r = cruz.getBoundingClientRect();
    const radio = r.width / 2;
    let dx = (e.clientX - (r.left + radio)) / radio;
    let dy = (e.clientY - (r.top + radio)) / radio;
    const largo = Math.hypot(dx, dy);
    if (largo > 1) { dx /= largo; dy /= largo; }
    perilla.style.transform = `translate(${dx * radio * 0.45}px, ${dy * radio * 0.45}px)`;
    const z = TACTIL.zonaMuerta;
    // La diagonal pide más inclinación en el eje chico (no se agacha sin querer).
    const eje = Math.abs(dx) > Math.abs(dy) * 2.2 ? 'x' : Math.abs(dy) > Math.abs(dx) * 2.2 ? 'y' : 'xy';
    const dir = {
      ArrowLeft: dx < -z && eje !== 'y', ArrowRight: dx > z && eje !== 'y',
      ArrowUp: dy < -z && eje !== 'x', ArrowDown: dy > z && eje !== 'x'
    };
    Object.entries(dir).forEach(([code, si]) => tecla(code, si));
    cruz.querySelectorAll('.f').forEach((f) => f.classList.remove('activo'));
    if (dir.ArrowLeft) cruz.querySelector('.izq').classList.add('activo');
    if (dir.ArrowRight) cruz.querySelector('.der').classList.add('activo');
    if (dir.ArrowUp) cruz.querySelector('.arriba').classList.add('activo');
    if (dir.ArrowDown) cruz.querySelector('.abajo').classList.add('activo');
  }
  function soltarCruz() {
    dedoCruz = null;
    perilla.style.transform = '';
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach((c) => tecla(c, false));
    cruz.querySelectorAll('.f').forEach((f) => f.classList.remove('activo'));
  }
  cruz.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (dedoCruz !== null) return;
    dedoCruz = e.pointerId;
    cruz.setPointerCapture(e.pointerId);
    moverCruz(e);
  });
  cruz.addEventListener('pointermove', (e) => { if (e.pointerId === dedoCruz) moverCruz(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => cruz.addEventListener(t, (e) => {
    if (e.pointerId === dedoCruz) soltarCruz();
  }));

  // Pantalla completa y acostada al primer toque (donde el navegador deja).
  const completa = () => {
    const el = document.documentElement;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    if (pedir && !document.fullscreenElement && !document.webkitFullscreenElement) {
      Promise.resolve(pedir.call(el, { navigationUI: 'hide' })).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  };
  window.addEventListener('pointerdown', completa, { once: true });
  // Sin menú del navegador al mantener apretado ni zoom con dos dedos.
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}());
