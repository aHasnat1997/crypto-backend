import { NextFunction, Request, Response } from "express";
import { HTTPStatusCode } from "../utils/httpCode";

/**
 * Global error handling middleware.
 *
 * @param {any} error - The error object or message.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next function.
 * @returns {Response} - JSON response with error details.
 */
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  return res.status(HTTPStatusCode.BadRequest).json({
    success: false,
    message: error.message || 'Internal Server Error',
    error
  });
};
