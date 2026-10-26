import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionToken = crypto.randomBytes(24).toString('hex');
  res.setHeader('Set-Cookie', `coast_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Secure`);

  return res.status(200).json({ ok: true });
}
