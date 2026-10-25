import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// In-memory room store for multiplayer
const rooms = new Map();

function getOrCreateRoom(roomId, map = 'coast') {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      map: map,
      host: null,
      guest: null,
      startAt: 0,
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId);
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoints
  if (req.method === 'POST' && pathname === '/api/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, session: 'coast-horizon-active' }));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/rooms') {
    const roomId = crypto.randomUUID().replace(/-/g, '');
    const map = req.headers['x-coast-map'] === 'santa-monica' ? 'santa-monica' : 'coast';
    getOrCreateRoom(roomId, map);
    const hostHeader = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const basePath = map === 'santa-monica' ? '/santa-monica/' : '/';
    const invite = `${protocol}://${hostHeader}${basePath}?room=${roomId}`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ room: roomId, invite }));
    return;
  }

  // Static file serving
  const ROOT_DIR = path.join(__dirname, '..');
  let filePath = path.join(ROOT_DIR, pathname);
  if (pathname.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }

  // Prevent path traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for directory without trailing slash
      const tryIndex = path.join(filePath, 'index.html');
      if (fs.existsSync(tryIndex)) {
        filePath = tryIndex;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url, `http://${request.headers.host}`);
  const match = urlObj.pathname.match(/^\/ws\/([a-f0-9]{32})/);
  if (!match) {
    socket.destroy();
    return;
  }

  const roomId = match[1];
  const tab = urlObj.searchParams.get('tab') || 'default';

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, roomId, tab);
  });
});

wss.on('connection', (ws, request, roomId, tab) => {
  const room = getOrCreateRoom(roomId);

  let role = null;
  if (!room.host || room.host.ws.readyState !== WebSocket.OPEN) {
    role = 'host';
    room.host = { ws, name: 'user1', ready: false, tab };
  } else if (!room.guest || room.guest.ws.readyState !== WebSocket.OPEN) {
    role = 'guest';
    room.guest = { ws, name: 'user2', ready: false, tab };
  } else {
    // Room full
    ws.send(JSON.stringify({ type: 'error', code: 'full' }));
    ws.close(4003, 'Room full');
    return;
  }

  // Send Welcome packet
  const initialSpawnX = role === 'guest' ? -1.8 : 1.8;
  ws.send(
    JSON.stringify({
      type: 'welcome',
      role,
      name: role === 'host' ? room.host.name : room.guest.name,
      map: room.map,
      health: 100,
      fuel: 100,
      distance: 0,
      race: { completed: 0, checkpoint: 0 },
      pose: { x: initialSpawnX, z: 0, h: 0, v: 0, roll: 0, pitch: 0, yaw: 0 },
      startAt: room.startAt,
      worldTime: Date.now(),
    })
  );

  function broadcastRoster() {
    const players = [];
    if (room.host && room.host.ws.readyState === WebSocket.OPEN) {
      players.push({
        role: 'host',
        name: room.host.name,
        ready: room.host.ready,
        pose: { x: 1.8, z: 0, h: 0, v: 0 },
      });
    }
    if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
      players.push({
        role: 'guest',
        name: room.guest.name,
        ready: room.guest.ready,
        pose: { x: -1.8, z: 0, h: 0, v: 0 },
      });
    }

    const rosterMsg = JSON.stringify({
      type: 'roster',
      players,
      startAt: room.startAt,
    });

    if (room.host?.ws.readyState === WebSocket.OPEN) room.host.ws.send(rosterMsg);
    if (room.guest?.ws.readyState === WebSocket.OPEN) room.guest.ws.send(rosterMsg);
  }

  broadcastRoster();

  ws.on('message', (data) => {
    const raw = data.toString();
    if (raw === '__ping') {
      ws.send('__pong');
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const peer = role === 'host' ? room.guest : room.host;

    if (msg.type === 'profile') {
      if (role === 'host' && room.host) room.host.name = msg.name || 'user1';
      if (role === 'guest' && room.guest) room.guest.name = msg.name || 'user2';
      broadcastRoster();
    } else if (msg.type === 'ready') {
      if (role === 'host' && room.host) room.host.ready = !!msg.value;
      if (role === 'guest' && room.guest) room.guest.ready = !!msg.value;

      if (room.host?.ready && room.guest?.ready) {
        room.startAt = Date.now() + 3200; // 3 second countdown
      } else if (!msg.value) {
        room.startAt = 0;
      }
      broadcastRoster();
    } else if (msg.type === 'pose') {
      // Forward telemetry to peer
      if (peer && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({ ...msg, role }));
      }
    } else if (msg.type === 'exit') {
      ws.send(JSON.stringify({ type: 'exited' }));
      ws.close();
    } else {
      // Relay any gameplay event (impact, fuel, boost, repair, reset, restart)
      if (peer && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({ ...msg, role }));
      }
    }
  });

  ws.on('close', () => {
    const peer = role === 'host' ? room.guest : room.host;
    const leaverName = role === 'host' ? room.host?.name : room.guest?.name;

    if (role === 'host') room.host = null;
    if (role === 'guest') room.guest = null;
    room.startAt = 0;

    if (peer && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify({ type: 'playerLeft', name: leaverName }));
      broadcastRoster();
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` 🏎️  COAST HORIZON - GAME SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(` > Local:        http://localhost:${PORT}/`);
  console.log(` > Santa Monica: http://localhost:${PORT}/santa-monica/`);
  console.log(` > Multiplayer:  Active with live WebSocket rooms`);
  console.log(`======================================================\n`);
});
