// =============================================================================
// Servidor multijugador de Chapare Slug.
//
// 1. Sirve el juego (index.html, src/, assets/) por HTTP: abriendo
//    http://<ip-de-esta-compu>:3000 desde otra compu o un celular en la misma
//    red WiFi se juega contra este servidor.
// 2. WebSocket en /ws con SALAS: uno crea una sala (código de 4 letras) y los
//    demás se unen con ese código (hasta MAX_JUGADORES). El servidor no
//    simula el juego: reenvía a los demás de la sala lo que manda cada uno
//    (su estado, sus disparos, eventos). El primero es el ANFITRIÓN: en la
//    etapa 2 manda él sobre los enemigos. Si se va, el siguiente pasa a serlo.
//
// Mensajes (JSON, campo t):
//   cliente -> servidor  crear {nombre, personaje}   unir {codigo, nombre, personaje}
//                        empezar {modo} (solo el anfitrión)  salir
//                        estado / disparo / evento    (se reenvían, con "de")
//   servidor -> cliente  sala {codigo, id, anfitrion, jugadores}
//                        entra {jugador}  sale {id, anfitrion}  empezar {modo}  error {texto}
//
// Uso:  npm install   (una vez)   y   npm start      (PORT=xxxx para otro puerto)
// =============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PUERTO = Number(process.env.PORT) || 3000;
const RAIZ = path.resolve(__dirname, '..');
const MAX_JUGADORES = 4;
const REENVIAR = new Set(['estado', 'disparo', 'evento']);
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O (se confunden con 1 y 0)

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
// Carpetas que no se sirven (código del servidor, dependencias, herramientas, git).
const PRIVADO = ['servidor', 'node_modules', 'herramientas', '.git'];

// --- HTTP: archivos del juego ------------------------------------------------
const servidor = http.createServer((pedido, respuesta) => {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(pedido.url, 'http://x').pathname);
  } catch {
    respuesta.writeHead(400).end();
    return;
  }
  if (ruta === '/salud') { respuesta.writeHead(200).end('ok'); return; }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.resolve(RAIZ, '.' + ruta);
  const relativo = path.relative(RAIZ, archivo);
  if (relativo.startsWith('..') || path.isAbsolute(relativo) || PRIVADO.includes(relativo.split(path.sep)[0])) {
    respuesta.writeHead(404).end('No encontrado');
    return;
  }
  fs.stat(archivo, (error, info) => {
    if (error || !info.isFile()) { respuesta.writeHead(404).end('No encontrado'); return; }
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': ruta.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache'
    });
    fs.createReadStream(archivo).pipe(respuesta);
  });
});

// --- WebSocket: salas --------------------------------------------------------
const salas = new Map(); // codigo -> { codigo, jugadores: Map(id -> cliente), anfitrion, empezada }
let proximoId = 1;

function nuevoCodigo() {
  let codigo;
  do {
    codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
  } while (salas.has(codigo));
  return codigo;
}

function mandar(cliente, mensaje) {
  if (cliente.ws.readyState === 1) cliente.ws.send(JSON.stringify(mensaje));
}

function aLaSala(sala, mensaje, menos = null) {
  const texto = JSON.stringify(mensaje);
  sala.jugadores.forEach((c) => { if (c !== menos && c.ws.readyState === 1) c.ws.send(texto); });
}

const publico = (c) => ({ id: c.id, nombre: c.nombre, personaje: c.personaje, numero: c.numero });

function datosSala(sala, cliente) {
  return {
    t: 'sala', codigo: sala.codigo, id: cliente.id, anfitrion: sala.anfitrion, empezada: sala.empezada,
    jugadores: [...sala.jugadores.values()].map(publico)
  };
}

function entrar(cliente, sala, mensaje) {
  // Número de jugador (J1, J2...): el primero libre.
  const usados = new Set([...sala.jugadores.values()].map((c) => c.numero));
  let numero = 1;
  while (usados.has(numero)) numero++;
  cliente.numero = numero;
  cliente.nombre = String(mensaje.nombre || '').slice(0, 12).toUpperCase() || 'J' + numero;
  cliente.personaje = mensaje.personaje === 'tuto' ? 'tuto' : 'manfred';
  cliente.sala = sala;
  sala.jugadores.set(cliente.id, cliente);
  mandar(cliente, datosSala(sala, cliente));
  aLaSala(sala, { t: 'entra', jugador: publico(cliente) }, cliente);
  console.log(`[sala ${sala.codigo}] entra ${cliente.nombre} (${sala.jugadores.size}/${MAX_JUGADORES})`);
}

function salir(cliente) {
  const sala = cliente.sala;
  if (!sala) return;
  sala.jugadores.delete(cliente.id);
  cliente.sala = null;
  if (sala.jugadores.size === 0) {
    salas.delete(sala.codigo);
    console.log(`[sala ${sala.codigo}] cerrada`);
    return;
  }
  if (sala.anfitrion === cliente.id) sala.anfitrion = sala.jugadores.keys().next().value;
  aLaSala(sala, { t: 'sale', id: cliente.id, anfitrion: sala.anfitrion });
  console.log(`[sala ${sala.codigo}] sale ${cliente.nombre}`);
}

const wss = new WebSocketServer({ server: servidor, path: '/ws', maxPayload: 64 * 1024 });

wss.on('connection', (ws) => {
  const cliente = { id: proximoId++, ws, sala: null, vivo: true };
  ws.on('pong', () => { cliente.vivo = true; });
  ws.on('message', (datos) => {
    let m;
    try { m = JSON.parse(datos); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const sala = cliente.sala;
    if (REENVIAR.has(m.t)) {
      if (!sala) return;
      m.de = cliente.id;
      aLaSala(sala, m, cliente);
      return;
    }
    switch (m.t) {
      case 'crear': {
        salir(cliente);
        const nueva = { codigo: nuevoCodigo(), jugadores: new Map(), anfitrion: cliente.id, empezada: false };
        salas.set(nueva.codigo, nueva);
        entrar(cliente, nueva, m);
        break;
      }
      case 'unir': {
        const codigo = String(m.codigo || '').trim().toUpperCase();
        const destino = salas.get(codigo);
        if (!destino) { mandar(cliente, { t: 'error', texto: 'NO EXISTE LA SALA ' + codigo }); break; }
        if (destino.jugadores.size >= MAX_JUGADORES) { mandar(cliente, { t: 'error', texto: 'LA SALA ESTÁ LLENA' }); break; }
        salir(cliente);
        entrar(cliente, destino, m);
        break;
      }
      case 'personaje': {
        if (!sala) break;
        cliente.personaje = m.personaje === 'tuto' ? 'tuto' : 'manfred';
        aLaSala(sala, { t: 'personaje', id: cliente.id, personaje: cliente.personaje }, cliente);
        break;
      }
      case 'empezar': {
        if (!sala || sala.anfitrion !== cliente.id) break;
        sala.empezada = true;
        // El modo lo elige el anfitrión: la campaña o la arena (Arena.js).
        aLaSala(sala, { t: 'empezar', modo: m.modo === 'arena' ? 'arena' : 'campana' });
        break;
      }
      case 'salir':
        salir(cliente);
        break;
      default:
        break;
    }
  });
  ws.on('close', () => salir(cliente));
  ws.on('error', () => {});
});

// Latido: corta las conexiones muertas (celular que se quedó sin señal).
setInterval(() => {
  wss.clients.forEach((ws) => {
    const c = [...salas.values()].flatMap((s) => [...s.jugadores.values()]).find((x) => x.ws === ws);
    if (c && !c.vivo) { ws.terminate(); return; }
    if (c) c.vivo = false;
    ws.ping();
  });
}, 10000);

servidor.listen(PUERTO, () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('Chapare Slug: servidor multijugador listo');
  console.log(`  En esta compu:          http://localhost:${PUERTO}`);
  ips.forEach((ip) => console.log(`  Otra compu o celular:   http://${ip}:${PUERTO}   (misma red WiFi)`));
});
