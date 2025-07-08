import { Rocket } from '../../app';
import bcrypt from 'bcryptjs';
import { Response, Request } from 'express';
import { UserRole } from '@prisma/client';
import { Token } from '../../utils/token';
import { TTokenPayload } from '../../types/token.type';

export class AuthService {
  private app: Rocket;
  constructor(app: Rocket) {
    this.app = app;
  }

  async register(data: { email: string; password: string; fullName: string; role: UserRole }) {
    const { email, password, fullName, role } = data;
    const existing = await this.app.db.client.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Email already exists');
    }
    const hashed = await bcrypt.hash(password, this.app.config.BCRYPT_SALT_ROUNDS);
    const user = await this.app.db.client.user.create({
      data: { email, password: hashed, fullName, role },
      select: { email: true, fullName: true }
    });
    return user;
  }

  async login(data: { email: string; password: string }, res: Response) {
    const { email, password } = data;
    const user = await this.app.db.client.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error('Invalid credentials')
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Password Incorrect.')
    }
    const tokenPayload: TTokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    }
    const token = Token.sign(
      tokenPayload,
      this.app.config.TOKEN.TOKEN_SECRET,
      this.app.config.TOKEN.TOKEN_EXPIRES_TIME
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return 'Successfully Login';
  }

  async logout(res: Response) {
    res.clearCookie('token');
    return 'Successfully Logout'
  }

  async me(req: Request) {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = Token.verify(token, this.app.config.TOKEN.TOKEN_SECRET) as { id: string };
    const user = await this.app.db.client.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, fullName: true }
    });
    if (!user) return null;
    return user;
  }
}
