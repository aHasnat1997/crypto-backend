import { NextFunction, Request, RequestHandler, Response } from "express";
import { Token } from "../utils/token";
import config from "../config";
import { UserRole } from "@prisma/client";
import { TTokenPayload } from "../types/token.type";
import prisma from "../db";

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
    try {
      // Get the authorization token from the request headers
      const token = req.headers.authorization;
      if (!token) throw new Error('Unauthorized Access.');

      // Verify the token and decode the payload
      const userTokenDecode = Token.verify(token, config.TOKEN.ACCESS_TOKEN_SECRET) as TTokenPayload;

      // Find the user in the database using the decoded token's email
      const isUserExisted = await prisma.users.findUniqueOrThrow({
        where: {
          email: userTokenDecode.email,
          isActive: true,
          isDeleted: false
        },
        include: {
          admins: true,
          projectManagers: true,
          engineers: true,
          clients: true
        }
      });

      // Check if the user's role is allowed to access the route
      const isRoleMatched = accessTo.find(r => r === isUserExisted.role);
      if (!isRoleMatched) throw new Error('Unauthorized User.');

      const { admins, clients, ...rest } = isUserExisted;
      let restData = {};

      if (clients === null) {
        restData = { ...admins }
      }
      else if (admins === null) {
        restData = { ...clients }
      }

      // Attach the user information to the request object
      req.user = {
        ...rest,
        profile: {
          ...restData
        }
      };

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Log the error and pass it to the next middleware or error handler
      console.error(error);
      next(error);
    }
  };
