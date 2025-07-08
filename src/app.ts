import express, { Express, Request, Response, Router } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './error/globalErrorHandler';
import { PrismaDB } from './db/PrismaClient';
import { SocketServer } from './sockets/SocketServer';
import ejs from 'ejs';
import path from 'path';
import { HTTPStatusCode } from './utils/httpCode';
import { Server } from 'http';
import { MainRouter } from './routes';
import Config, { TAppConfig } from './config';

export class Rocket {
  public app: Express;
  public db: PrismaDB;
  public route: Router;
  public socketServer: SocketServer;
  public server?: Server;
  public config: TAppConfig;

  constructor() {
    this.app = express();
    this.db = new PrismaDB();
    this.route = new MainRouter(this).router;
    this.socketServer = new SocketServer();
    this.config = Config;
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
      origin: [this.config.CLIENT_URL],
      credentials: true
    }));
    this.app.use(cookieParser());
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
  }

  /**
   * Initiate the application with routes and error handlers.
   * 
   * - Load all API routes under '/api/v1'
   * - Define home route
   * - Global error handler
   * - Handle 404 Not Found errors
   */
  initiate() {
    this.app.use('/api/v1', this.route);

    this.app.get('/', async (req: Request, res: Response) => {
      const homeLayout = await ejs.renderFile(
        path.join(__dirname, './views/home/index.ejs')
      );
      res.status(HTTPStatusCode.Ok).send(homeLayout);
    });

    this.app.use(globalErrorHandler);

    this.app.use((req: Request, res: Response) => {
      res.status(HTTPStatusCode.NotFound).json({
        success: false,
        message: 'API NOT FOUND!',
        error: { path: req.originalUrl, message: 'Your requested path is not found!' }
      });
    });
  }

  /**
   * Launch the application on the specified port.
   * 
   * @param {number|string} port - The port number to run the server on.
   */
  launch(port: number) {
    this.server = this.app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
    return this.server;
  }
}
