import { Rocket } from '../../app';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';

export class AuthController {
  private app: Rocket;
  private service: AuthService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new AuthService(app);
  }

  async login(req: Request, res: Response) {
    const result = await this.service.login(req.body, res);
    successResponse(res, {
      message: 'Successfully Login',
      data: result
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

  async resetPassword(req: Request, res: Response) {
    const result = await this.service.resetPassword(req.user, req.body);
    successResponse(res, {
      message: 'User password reset successful.',
      data: result
    }, HTTPStatusCode.Ok);
  }

  async forgetPassword(req: Request, res: Response) {
    const fullClientUrl = req.protocol + '://' + req.get('host') + '/set-new-password';
    const result = await this.service.forgetPassword(fullClientUrl, req.body.email);
    successResponse(res, {
      message: 'User password reset successful.',
      data: result
    }, HTTPStatusCode.Ok);
  }

  async setNewPassword(req: Request, res: Response) {
    const result = await this.service.setNewPassword(req.body);
    successResponse(res, {
      message: 'User password reset successful.',
      data: result
    }, HTTPStatusCode.Ok);
  }
}
