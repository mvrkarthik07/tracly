import { Router } from 'express';
import { createToken, verifyPassword } from '../lib/auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || !(await verifyPassword(password))) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  res.cookie('finance_token', createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ ok: true });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('finance_token', { path: '/' });
  res.json({ ok: true });
});
