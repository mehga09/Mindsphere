import jwt from 'jsonwebtoken';
import { Response } from 'express';

const ACCESS_SECRET = process.env.JWT_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

export const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, role }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string; role: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string; role: string };
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  // We can use cookies or just return tokens in body. 
  // For mobile/native friendly, often body is preferred, but cookies are more secure for web.
  // Using httpOnly cookies for Refresh Token is best practice.
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};
