import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Handles all asynchronous functions in Express routes.
 *
 * @param {RequestHandler} fn - The asynchronous function to handle.
 * @returns {RequestHandler} - A function that resolves or rejects the promise.
 */
const handelAsyncReq = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next))
      .catch(error => next(error));
  };
}

export default handelAsyncReq;
