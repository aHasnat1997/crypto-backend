import express, {
  Express,
  Request,
  Response,
  Router,
  NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./error/globalErrorHandler";
import { PrismaDB } from "./db/PrismaClient";
import { SocketServer } from "./sockets/socket.server";
import ejs from "ejs";
import path from "path";
import { HTTPStatusCode } from "./utils/httpCode";
import { IncomingMessage, Server } from "http";
import { MainRouter } from "./routes";
import Config, { TAppConfig } from "./config";
import { robustLogger } from "./utils/robustLogger";

export class Rocket {
  public app: Express;
  public db: PrismaDB;
  public route: Router;
  public socketServer: SocketServer;
  public server?: Server;
  public config: TAppConfig;
  private logger = robustLogger;

  constructor() {
    this.app = express();
    this.db = new PrismaDB();
    this.route = new MainRouter(this).router;
    this.socketServer = new SocketServer();
    this.config = Config;

    this.logger.info("🚀 Rocket instance created");
  }

  /**
   * Advanced request logging middleware with performance monitoring
   */
  private setupAdvancedLogging() {
    // Request correlation ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId =
        req.headers["x-correlation-id"] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      (req as any).correlationId = correlationId;
      res.setHeader("X-Correlation-ID", correlationId as string);
      next();
    });

    // Comprehensive request/response logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = this.logger.startTimer();
      const correlationId = (req as any).correlationId;

      // Log incoming request
      this.logger.info(`📥 Incoming Request`, {
        // correlationId,
        // method: req.method,
        // url: req.originalUrl,
        // clientIP: this.getClientIP(req),
        // userAgent: req.headers["user-agent"],
        // contentType: req.headers["content-type"],
        // contentLength: req.headers["content-length"],
        // referer: req.headers.referer,
        // queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
        // cookies:
        //   Object.keys(req.cookies || {}).length > 0
        //     ? Object.keys(req.cookies)
        //     : undefined,
      });

      // Log request body for debugging (in development)
      if (process.env.NODE_ENV !== "production" && req.body) {
        this.logger.logRequestBody(req, 500);
      }

      // Override response methods for logging
      const originalSend = res.send;
      const originalJson = res.json;
      let responseBody: any;
      let responseLogged = false;

      res.send = function (body) {
        if (!responseLogged) {
          responseBody = body;
          logResponse();
        }
        return originalSend.call(this, body);
      };

      res.json = function (body) {
        if (!responseLogged) {
          responseBody = body;
          logResponse();
        }
        return originalJson.call(this, body);
      };

      const logResponse = () => {
        if (responseLogged) return;
        responseLogged = true;

        const duration = robustLogger.endTimer(startTime);

        // Log the response
        robustLogger.logRequest(req, res, duration);

        // Log response body for debugging (in development)
        if (process.env.NODE_ENV !== "production" && responseBody) {
          robustLogger.logResponseBody(res, responseBody, 500);
        }

        // Performance alerts
        if (duration > 5000) {
          robustLogger.logPerformanceAlert("slow_request", duration, 5000);
        }

        // Security monitoring
        if (res.statusCode === 401 || res.statusCode === 403) {
          robustLogger.logSecurityEvent(
            "unauthorized_access",
            this.getClientIP(req),
            {
              method: req.method,
              url: req.originalUrl,
              userAgent: req.headers["user-agent"],
            }
          );
        }

        // Log completion
        robustLogger.info(`📤 Request Completed`, {
          correlationId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          success: res.statusCode < 400,
        });
      };

      // Handle cases where neither send nor json is called
      res.on("finish", () => {
        if (!responseLogged) {
          logResponse();
        }
      });

      next();
    });

    this.logger.info("✅ Advanced logging middleware configured");
  }

  /**
   * Database operation monitoring
   */
  private setupDatabaseMonitoring() {
    // This is a placeholder - you'll need to integrate with your actual Prisma setup
    // Example of how to monitor database operations:

    /*
    // If using Prisma middleware
    this.db.prisma.$use(async (params, next) => {
      const start = robustLogger.startTimer();
      
      try {
        const result = await next(params);
        const duration = robustLogger.endTimer(start);
        
        robustLogger.logDatabaseOperation(
          params.action,
          params.model || 'unknown',
          duration
        );
        
        return result;
      } catch (error) {
        const duration = robustLogger.endTimer(start);
        robustLogger.logDatabaseOperation(
          params.action,
          params.model || 'unknown',
          duration,
          error as Error
        );
        throw error;
      }
    });
    */

    this.logger.info("✅ Database monitoring configured");
  }

  /**
   * Socket.IO event monitoring
   */
  private setupSocketMonitoring() {
    // This will be called after socket initialization
    // We'll set it up in initializeSocket method
    this.logger.debug("🔌 Socket monitoring ready for initialization");
  }

  /**
   * Load the necessary middleware for the application.
   */
  load() {
    this.logger.info("⚙️ Loading application middleware...");

    // Setup advanced logging first
    this.setupAdvancedLogging();

    // Body parsing with size limits and error handling
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req, res, buffer) => {
          if (buffer.length > 10 * 1024 * 1024) {
            this.logger.logSecurityEvent(
              "large_payload",
              this.getClientIP(req),
              {
                size: buffer.length,
                url: req.url,
              }
            );
          }
        },
      })
    );

    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // CORS with detailed logging
    this.app.use(
      cors({
        origin: (origin, callback) => {
          const allowedOrigins = this.config.CLIENT_URLS;

          // Log CORS requests
          this.logger.debug("🌐 CORS Request", {
            origin,
            allowed: !origin || allowedOrigins.includes(origin),
          });

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            this.logger.logSecurityEvent("cors_violation", "unknown", {
              origin,
            });
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );

    this.app.use(cookieParser());
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(__dirname, "views"));

    // Setup monitoring systems
    this.setupDatabaseMonitoring();
    this.setupSocketMonitoring();

    this.logger.info("✅ Middleware loaded successfully");
  }

  /**
   * Initiate the application with routes and error handlers.
   */
  initiate() {
    this.logger.info("🛣️ Initializing routes and error handlers...");

    // API routes with logging
    this.app.use(
      "/api/v1",
      (req: Request, res: Response, next: NextFunction) => {
        this.logger.debug(`📍 API Route: ${req.method} ${req.originalUrl}`);
        next();
      },
      this.route
    );

    // Home route with error handling
    this.app.get("/", async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;

      try {
        this.logger.debug("🏠 Rendering home page", { correlationId });

        const homeLayout = await this.logger.logAsyncExecutionTime(
          () => ejs.renderFile(path.join(__dirname, "./views/home/index.ejs")),
          "home_template_render"
        );

        res.status(HTTPStatusCode.Ok).send(homeLayout);

        this.logger.info("✅ Home page rendered successfully", {
          correlationId,
        });
      } catch (error) {
        this.logger.error("❌ Error rendering home page", {
          correlationId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });

        res.status(500).json({
          success: false,
          message: "Error rendering home page",
          error: error instanceof Error ? error.message : "Unknown error",
          correlationId,
        });
      }
    });

    // Enhanced global error handler
    this.app.use(
      (error: any, req: Request, res: Response, next: NextFunction) => {
        const correlationId = (req as any).correlationId;

        this.logger.error("🚨 Global Error Handler", {
          // correlationId,
          // error: error.message,
          // stack: error.stack,
          // url: req.originalUrl,
          // method: req.method,
          // clientIP: this.getClientIP(req),
          // userAgent: req.headers["user-agent"],
          // timestamp: new Date().toISOString(),
        });

        // Call your existing global error handler
        globalErrorHandler(error, req, res, next);
      }
    );

    // Enhanced 404 handler
    this.app.use((req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;

      this.logger.warn("⚠️ 404 Not Found", {
        correlationId,
        method: req.method,
        url: req.originalUrl,
        clientIP: this.getClientIP(req),
        userAgent: req.headers["user-agent"],
        referer: req.headers.referer,
      });

      res.status(HTTPStatusCode.NotFound).json({
        success: false,
        message: "API NOT FOUND!",
        error: {
          path: req.originalUrl,
          message: "Your requested path is not found!",
        },
        correlationId,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.info("✅ Routes and error handlers initialized");
  }

  /**
   * Launch the application on the specified port.
   */
  launch(port: number) {
    this.logger.info(`🚀 Launching server on port ${port}...`);

    this.server = this.app.listen(port, async () => {
      if (!this.server) {
        this.logger.error("🚀 Rocket failed to start - no server instance");
        return;
      }

      const address = this.server.address();
      let host: string;

      if (typeof address === "string") {
        host = address;
      } else if (address) {
        const hostname =
          address.address === "::" ? "localhost" : address.address;
        host = `${hostname}:${address.port}`;
      } else {
        host = `localhost:${port}`;
      }

      // Log successful launch with comprehensive info
      this.logger.info("🚀 Rocket Successfully Launched! 🎉", {
        serverUrl: `http://${host}`,
        port: port,
        environment: process.env.NODE_ENV || "development",
        // processId: process.pid,
        // nodeVersion: process.version,
        // platform: `${process.platform} ${process.arch}`,
        // workingDirectory: process.cwd(),
        // clientUrls: this.config.CLIENT_URLS,
        // timestamp: new Date().toISOString(),
        // memoryUsage: process.memoryUsage(),
      });

      // Initialize socket with logging
      await this.initializeSocket();

      // Log post-launch status
      this.logPostLaunchStatus(host);
    });

    // Server error handling
    this.server.on("error", (error: any) => {
      this.logger.error("🚨 Server Error", {
        error: error.message,
        code: error.code,
        stack: error.stack,
        port: port,
      });
    });

    // Connection handling
    this.server.on("connection", (socket) => {
      this.logger.debug("🔗 New HTTP connection established", {
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort,
      });

      socket.on("error", (error) => {
        this.logger.warn("⚠️ Socket error", {
          error: error.message,
          remoteAddress: socket.remoteAddress,
        });
      });
    });

    return this.server;
  }

  /**
   * Post-launch status logging
   */
  private logPostLaunchStatus(host: string): void {
    setTimeout(() => {
      const memUsage = process.memoryUsage();

      this.logger.info("📊 Post-Launch System Status", {
        // server: {
        //   status: "RUNNING",
        //   url: `http://${host}`,
        //   uptime: `${Math.round(process.uptime())}s`,
        // },
        // database: {
        //   status: "CONNECTED", // Adjust based on your DB check
        //   // You can add actual DB connection check here
        // },
        // socketIO: {
        //   status: this.socketServer.io ? "ACTIVE" : "INACTIVE",
        //   connections: this.socketServer.io
        //     ? this.socketServer.io.engine.clientsCount
        //     : 0,
        // },
        // // memory: {
        // //   heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        // //   heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        // //   rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        // // },
        // environment: {
        //   nodeEnv: process.env.NODE_ENV || "development",
        //   nodeVersion: process.version,
        //   platform: process.platform,
        // },
      });
    }, 1000);
  }

  /**
   * Initialize Socket.IO server with comprehensive logging
   */
  private async initializeSocket() {
    if (!this.server) {
      this.logger.error(
        "❌ Cannot initialize Socket.IO - HTTP server not available"
      );
      return;
    }

    try {
      this.logger.info("🔌 Initializing Socket.IO server...");

      await this.logger.logAsyncExecutionTime(
        () => Promise.resolve(this.socketServer.init(this.server!)),
        "socket_initialization"
      );

      if (this.socketServer.io) {
        // Socket connection monitoring
        this.socketServer.io.on("connection", (socket) => {
          this.logger.info("🔌 Socket.IO Client Connected", {
            socketId: socket.id,
            clientIP: socket.handshake.address,
            userAgent: socket.handshake.headers["user-agent"],
            totalConnections: this.socketServer.io!.engine.clientsCount,
            connectedAt: new Date().toISOString(),
          });

          // Monitor socket events
          socket.onAny((eventName, ...args) => {
            this.logger.logSocketEvent(eventName, socket.id, args);
          });

          // Socket disconnection
          socket.on("disconnect", (reason) => {
            this.logger.info("🔌 Socket.IO Client Disconnected", {
              socketId: socket.id,
              reason,
              totalConnections: this.socketServer.io!.engine.clientsCount,
              disconnectedAt: new Date().toISOString(),
            });
          });

          // Socket errors
          socket.on("error", (error) => {
            this.logger.error("🚨 Socket.IO Error", {
              socketId: socket.id,
              error: error.message,
              stack: error.stack,
            });
          });
        });

        // Socket.IO server-level events
        this.socketServer.io.engine.on("connection_error", (error) => {
          this.logger.error("🚨 Socket.IO Connection Error", {
            error: error.message,
            code: error.code,
            context: error.context,
          });
        });

        this.logger.info("✅ Socket.IO server initialized successfully");
      }
    } catch (error) {
      this.logger.error("❌ Failed to initialize Socket.IO", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get client IP address utility
   */
  private getClientIP(req: Request | IncomingMessage): string {
    const headers = req.headers;
    const connection = (req as any).connection;
    const socket = (req as any).socket;

    return (
      (headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (headers["x-real-ip"] as string) ||
      connection?.remoteAddress ||
      socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Get the Socket.IO server instance from socketServer
   */
  getSocketIO() {
    return this.socketServer.io;
  }

  /**
   * Graceful shutdown with detailed logging
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.info("🔄 Starting graceful shutdown...");

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            this.logger.error("❌ Error closing HTTP server", {
              error: err.message,
            });
            reject(err);
          } else {
            this.logger.info("✅ HTTP server closed successfully");
            resolve();
          }
        });
      });
    }

    // Close Socket.IO
    if (this.socketServer?.io) {
      await new Promise<void>((resolve) => {
        this.socketServer.io!.close(() => {
          this.logger.info("✅ Socket.IO server closed successfully");
          resolve();
        });
      });
    }

    // Close database connections
    if (this.db) {
      try {
        // await this.db.disconnect(); // Uncomment if you have this method
        this.logger.info("✅ Database connections closed successfully");
      } catch (error) {
        this.logger.error("❌ Error closing database connections", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    this.logger.info("✅ Graceful shutdown completed successfully");
  }
}
