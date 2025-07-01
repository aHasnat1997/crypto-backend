import { Router } from "express";
import { CryptoRoutes } from "../modules/crypto/users.routes";

/**
 * Express Router instance containing all application routes.
 *
 * @type {Router}
 */
export const AllRoutes: Router = Router();

/**
 * Type representing a module's route configuration.
 */
type TModulesRouters = {
  path: string;
  router: Router;
}

/**
 * Array containing configurations of all module routes.
 */
const moduleRoutes: TModulesRouters[] = [
  {
    path: '/crypto',
    router: CryptoRoutes
  }
];

// Attach each module's routes to the main AllRoutes router
moduleRoutes.forEach(r => AllRoutes.use(r.path, r.router));
