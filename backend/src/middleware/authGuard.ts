import { RequestHandler } from 'express';
import { verifyToken } from '../lib/auth';

export const authGuard: RequestHandler = (req, res, next) => {
  const token = req.cookies?.finance_token;
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
