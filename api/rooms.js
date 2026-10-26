import crypto from 'crypto';

export default function handler(req, res) {
  // Little Coast room generation endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate 16-byte random hex room ID (32 chars), matching Little Coast
  const room = crypto.randomBytes(16).toString('hex');
  const sessionToken = crypto.randomBytes(24).toString('hex');

  // Compute invite URL based on request headers
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'coast-horizon.vercel.app';
  const invite = `${proto}://${host}/?room=${room}`;

  // Set the coast_session cookie like Little Coast does
  res.setHeader('Set-Cookie', `coast_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Secure`);

  return res.status(201).json({
    room,
    invite
  });
}
