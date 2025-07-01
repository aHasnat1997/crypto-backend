import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { AllRoutes } from './routes';
import { globalErrorHandler } from './error/globalErrorHandler';
import { HTTPStatusCode } from './utils/httpCode';
import config from './config';
import ejs from "ejs";
import path from 'path';

/**
 * Class representing the Rocket server.
 */
export class Rocket {
  private app: Express;

  /**
   * Create a Rocket instance.
   */
  constructor() {
    this.app = express();
  }

  /**
   * Load the necessary middleware for the application.
   * 
   * - Express JSON parser
   * - CORS configuration
   * - Cookie parser
   */
  load() {
    this.app.use(express.json());
    this.app.use(cors({
      origin: [
        config.CLINT_URL
      ],
      credentials: true
    }));
    this.app.use(cookieParser());
  }

  /**
   * Initiate the application with routes and error handlers.
   * 
   * - Load all API routes under '/smd/api/v1'
   * - Define home route
   * - Global error handler
   * - Handle 404 Not Found errors
   */
  initiate() {
    /**
    * Load all API routes under '/smd/api/v1'.
     */
    this.app.use('/api/v1', AllRoutes);

    /**
     * Home route.
     * 
     * @param {Request} req - Express request object.
     * @param {Response} res - Express response object.
     */
    this.app.get('/', async (req: Request, res: Response) => {
      const homeLayout = await ejs.renderFile(
        path.join(__dirname, './views/home/index.ejs'),
      );
      res.status(200).send(homeLayout);
    });

    // Global error handler
    this.app.use(globalErrorHandler);

    /**
     * Handle 404 Not Found errors.
     * 
     * @param {Request} req - Express request object.
     * @param {Response} res - Express response object.
     */
    this.app.use((req: Request, res: Response) => {
      res.status(HTTPStatusCode.NotFound).json({
        success: false,
        message: "API NOT FOUND!",
        error: {
          path: req.originalUrl,
          message: "Your requested path is not found!"
        }
      });
    });
  }

  /**
   * Launch the application on the specified port.
   * 
   * @param {number|string} port - The port number to run the server on.
   */
  launch(port: any) {
    this.app.listen(port, () => console.info('Server 🔥 on port:', port));
  }
};
