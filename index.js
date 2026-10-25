import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

export default function handler(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(urlObj.pathname);

  // API endpoints
  if (req.method === 'POST' && pathname === '/api/session') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ ok: true, session: 'coast-horizon-active' }));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/rooms') {
    const roomId = 'room_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const map = req.headers['x-coast-map'] === 'santa-monica' ? 'santa-monica' : 'coast';
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'coast-horizon.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const basePath = map === 'santa-monica' ? '/santa-monica/' : '/';
    const invite = `${protocol}://${hostHeader}${basePath}?room=${roomId}`;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ room: roomId, invite }));
    return;
  }

  if (pathname === '/santa-monica') {
    pathname = '/santa-monica/index.html';
  } else if (pathname === '/santa-monica/') {
    pathname = '/santa-monica/index.html';
  } else if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// If executed directly with Node:
if (process.argv[1] === __filename) {
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`Coast Horizon web server listening on port ${PORT}`);
  });
}
