import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
};

export const verifyPassword = (password: string): Promise<boolean> => {
  const hash = process.env.PASSWORD_HASH;
  if (!hash) throw new Error('PASSWORD_HASH is not configured');
  return bcrypt.compare(password, hash);
};

export const createToken = (): string => jwt.sign({ user: 'single-user' }, getJwtSecret(), { expiresIn: '30d' });

export const verifyToken = (token: string): boolean => {
  try {
    jwt.verify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
};
