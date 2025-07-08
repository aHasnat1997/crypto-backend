import { Rocket } from '../../app';
import { Request, Response } from 'express';
import { UserService } from './UserService';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';

export class UserController {
  private app: Rocket;
  private service: UserService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new UserService(app);
  }

  async create(req: Request, res: Response) {
    const data = await this.service.create(req.body);
    successResponse(res, {
      message: 'User register in successfully.',
      data
    }, HTTPStatusCode.Created);
  }

  async findAll(req: Request, res: Response) {
    const { data, meta } = await this.service.findAll(req.query);
    successResponse(res, {
      message: 'All users retrieve successfully.',
      data,
      meta
    }, HTTPStatusCode.Ok);
  }

  async findOne(req: Request, res: Response) {
    const data = await this.service.findOne(req.params.id);
    successResponse(res, {
      message: 'User info retrieve successfully.',
      data
    }, HTTPStatusCode.Ok);
  }

  async update(req: Request, res: Response) {
    const result = await this.service.update(req.params.id, req.body);
    successResponse(res, {
      message: 'User info update successfully.',
      data: result,
    }, HTTPStatusCode.Ok);
  }

  async delete(req: Request, res: Response) {
    const result = await this.service.delete(req.params.id);;
    successResponse(res, {
      message: 'User info update successfully.',
      data: result,
    }, HTTPStatusCode.Ok);
  }
}
