import { Response } from "express";

// Success response type
type THandlesResponse<T> = {
  success?: boolean;
  statusCode?: number;
  message: string;
  meta?: {};
  data: T | T[] | null;
}

/**
 * Handle all success responses.
 *
 * @template T
 * @param {Response} res - Express response object.
 * @param {THandlesResponse<T>} data - Response data.
 * @param {number} [statusCode=200] - HTTP status code.
 * @returns {void}
 */
const successResponse = <T>(res: Response, data: THandlesResponse<T>, statusCode?: number): void => {
  const code = statusCode || 200;
  res.status(code).json({
    success: true,
    statusCode: code,
    message: data.message,
    meta: data.meta,
    data: data.data
  });
}

export default successResponse;
