import { Rocket } from '../app';
import { Router } from 'express';
import { UserController } from '../modules/user/UserController';
import { registerAuthRoutes } from '../modules/auth/auth.routes';
import { registerUserRoutes } from '../modules/user/user.routes';
import { AuthController } from '../modules/auth/AuthController';
import { CryptoController } from '../modules/crypto/crypto.controller';
import { registerCryptoRoutes } from '../modules/crypto/crypto.routers';

export function initControllers(app: Rocket, router: Router) {
  try {
    (app as any).userController = new UserController(app);
    (app as any).authController = new AuthController(app);
    (app as any).cryptoController = new CryptoController(app);

    registerUserRoutes(app as Rocket & { userController: UserController }, router);
    registerAuthRoutes(app as Rocket & { authController: AuthController }, router);
    registerCryptoRoutes(app as Rocket & { cryptoController: CryptoController }, router);
  }
  catch (error) {
    console.error('Error in initControllers:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    throw error;
  }
}
