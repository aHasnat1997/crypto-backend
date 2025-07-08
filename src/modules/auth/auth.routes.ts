import { AuthController } from './AuthController';
import { Rocket } from '../../app';
import { Router } from 'express';
import handelAsyncReq from '../../utils/handelAsyncReq';
import validateRequest from '../../middlewares/validateRequest';
import { AuthValidation } from './auth.validation';
import { authGuard } from '../../middlewares/authGuard';

// Use type assertion to inform TS that app has authController
export function registerAuthRoutes(app: Rocket & { authController: AuthController }, router: Router) {
  const controller = app.authController;

  router.post(
    '/auth/register',
    validateRequest(AuthValidation.registrationSchema),
    handelAsyncReq(controller.register.bind(controller))
  );

  router.post(
    '/auth/login',
    validateRequest(AuthValidation.loginSchema),
    handelAsyncReq(controller.login.bind(controller))
  );

  router.post(
    '/auth/logout',
    handelAsyncReq(controller.logout.bind(controller))
  );

  router.get(
    '/auth/me',
    authGuard('ADMIN', 'USER'),
    handelAsyncReq(controller.me.bind(controller))
  );
}
