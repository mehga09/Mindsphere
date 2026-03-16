import { prisma } from '../db';
import { RegisterDto, LoginDto } from '@mindsphere/shared';
import { hash, verify } from 'argon2';
import { generateTokens, verifyRefreshToken } from '../utils/auth';
import { Role } from '@prisma/client';

export class AuthService {
  async register(data: RegisterDto) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hash(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: Role.LEARNER, // Default role
      },
    });

    const tokens = generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(data: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await verify(user.password, data.password);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const tokens = generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async refresh(refreshToken: string) {
    // Verify token signature
    const payload = verifyRefreshToken(refreshToken);
    
    // Check in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    // Reuse Detection
    if (storedToken.isRevoked) {
      // Security: Revoke all tokens for this user family? 
      // For now just fail.
      throw new Error('Token revoked');
    }

    // Revoke used token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true }
    });

    // Generate new pair
    const tokens = generateTokens(storedToken.userId, storedToken.user.role);
    await this.storeRefreshToken(storedToken.userId, tokens.refreshToken);

    return { tokens };
  }

  async logout(refreshToken: string) {
     await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { isRevoked: true }
    });
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
