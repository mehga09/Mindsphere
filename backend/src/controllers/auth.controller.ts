import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '@mindsphere/shared';
import { setAuthCookies } from '../utils/auth';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await authService.register(data);
    
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.status(201).json({ user: result.user, tokens: result.tokens });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await authService.login(data);

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.json({ user: result.user, tokens: result.tokens });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) throw new Error('RefreshToken required');

    const result = await authService.refresh(refreshToken);
    
    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.json(result.tokens);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
