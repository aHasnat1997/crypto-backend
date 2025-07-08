import { JwtPayload } from 'jsonwebtoken';
import { TTokenPayload } from '../utils/token';

/**
 * Augment the Express Request interface to include user authentication information.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * User authentication payload attached to the request.
       * 
       * @type {TTokenPayload | JwtPayload | null}
       */
      user: TTokenPayload | JwtPayload | null;
    }
  }
};
