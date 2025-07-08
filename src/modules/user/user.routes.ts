import { UserController } from './UserController';
import { Rocket } from '../../app';
import { Router } from 'express';
import handelAsyncReq from '../../utils/handelAsyncReq';

export function registerUserRoutes(app: Rocket & { userController: UserController }, router: Router) {
  const controller = app.userController;

  router.post('/users', handelAsyncReq(controller.create.bind(controller)));
  router.get('/users', handelAsyncReq(controller.findAll.bind(controller)));
  router.get('/users/:id', handelAsyncReq(controller.findOne.bind(controller)));
  router.put('/users/:id', handelAsyncReq(controller.update.bind(controller)));
  router.delete('/users/:id', handelAsyncReq(controller.delete.bind(controller)));
}
