import { AuthController } from './AuthController';
import { Rocket } from '../../app';
import { Router } from 'express';
import handelAsyncReq from '../../utils/handelAsyncReq';

// Use type assertion to inform TS that app has authController
export function registerAuthRoutes(app: Rocket & { authController: AuthController }, router: Router) {
  const controller = app.authController;

  router.post('/auth/register', handelAsyncReq(controller.register.bind(controller)));
  router.post('/auth/login', handelAsyncReq(controller.login.bind(controller)));
  router.post('/auth/logout', handelAsyncReq(controller.logout.bind(controller)));
  router.get('/auth/me', handelAsyncReq(controller.me.bind(controller)));
}
