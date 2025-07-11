import { Router } from 'express';
import { Rocket } from '../app';
import { UserController } from '../modules/user/user.controller';
import { registerAuthRoutes } from '../modules/auth/auth.routes';
import { registerUserRoutes } from '../modules/user/user.routes';
import { AuthController } from '../modules/auth/auth.controller';
import { CryptoController } from '../modules/crypto/crypto.controller';
import { registerCryptoRoutes } from '../modules/crypto/crypto.routers';
import { AllocationController } from '../modules/allocation/allocation.controller';
import { registerAllocationRoutes } from '../modules/allocation/allocation.routers';

export class MainRouter {
  public router: Router;

  constructor(app: Rocket) {
    this.router = Router();
    this.initControllers(app, this.router);
  }

  private initControllers(app: Rocket, router: Router) {
    try {
      (app as any).userController = new UserController(app);
      (app as any).authController = new AuthController(app);
      (app as any).cryptoController = new CryptoController(app);
      (app as any).allocationController = new AllocationController(app);

      registerUserRoutes(app as Rocket & { userController: UserController }, router);
      registerAuthRoutes(app as Rocket & { authController: AuthController }, router);
      registerCryptoRoutes(app as Rocket & { cryptoController: CryptoController }, router);
      registerAllocationRoutes(app as Rocket & { allocationController: AllocationController }, router);
    } catch (error) {
      console.error('Error in initControllers:', error);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      throw error;
    }
  }
}
