import { Rocket } from '../../app';
import { Request, Response } from 'express';
import { AuthService } from './AuthService';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';

export class AuthController {
  private app: Rocket;
  private service: AuthService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new AuthService(app);
  }

  async register(req: Request, res: Response) {
    const result = await this.service.register(req.body);
    successResponse(res, {
      message: 'User register in successfully.',
      data: result
    }, HTTPStatusCode.Created);
  }

  async login(req: Request, res: Response) {
    const result = await this.service.login(req.body, res);
    successResponse(res, {
      message: result,
      data: null
    }, HTTPStatusCode.Ok);
  }

  async logout(req: Request, res: Response) {
    const result = await this.service.logout(res);
    successResponse(res, {
      message: result,
      data: null
    }, HTTPStatusCode.Ok);
  }

  async me(req: Request, res: Response) {
    const result = await this.service.me(req);
    successResponse(res, {
      message: 'User info retrieve successful.',
      data: result
    }, HTTPStatusCode.Ok);
  }
}
