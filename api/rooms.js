import crypto from 'crypto';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const roomId = crypto.randomUUID().replace(/-/g, '');
  const map = req.headers['x-coast-map'] === 'santa-monica' ? 'santa-monica' : 'coast';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const basePath = map === 'santa-monica' ? '/santa-monica/' : '/';
  const invite = `${protocol}://${host}${basePath}?room=${roomId}`;

  res.status(200).json({ room: roomId, invite });
}
