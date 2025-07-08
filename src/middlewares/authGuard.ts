import { NextFunction, Request, RequestHandler, Response } from "express";
import config from "../config";
import { UserRole } from "@prisma/client";
import { TTokenPayload } from "../types/token.type";
import { Token } from "../utils/token";
import { Rocket } from "../app";

/**
 * Middleware function to guard API routes based on user roles.
 *
 * @param {...UserRole[]} accessTo - Array of user roles allowed to access the route.
 * @returns {RequestHandler} - Express middleware function.
 */
export const authGuard = (...accessTo: UserRole[]): RequestHandler =>
  /**
   * Express middleware function to authenticate and authorize users.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const app = new Rocket();
    try {
      // Get the authorization token from the request headers
      // const token = req.headers.authorization;
      const token = req.cookies?.token;
      if (!token) throw new Error('Unauthorized Access.');

      // Verify the token and decode the payload
      const userTokenDecode = Token.verify(token, config.TOKEN.TOKEN_SECRET) as TTokenPayload;

      // Find the user in the database using the decoded token's email
      const isUserExisted = await app.db.client.user.findUniqueOrThrow({
        where: {
          email: userTokenDecode.email
        }
      });

      // Check if the user's role is allowed to access the route
      const isRoleMatched = accessTo.find(r => r === isUserExisted.role);
      if (!isRoleMatched) throw new Error('Unauthorized User.');

      // Attach the user information to the request object
      req.user = isUserExisted;

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Log the error and pass it to the next middleware or error handler
      console.error(error);
      next(error);
    }
  };
