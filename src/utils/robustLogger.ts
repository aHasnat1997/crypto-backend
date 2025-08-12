import winston from "winston";
import path from "path";
import fs from "fs";
import { Request, Response } from "express";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Color codes for console output
const colors = {
  error: "\x1b[31m", // Red
  warn: "\x1b[33m", // Yellow
  info: "\x1b[36m", // Cyan
  debug: "\x1b[35m", // Magenta
  success: "\x1b[32m", // Green
  reset: "\x1b[0m", // Reset
  bright: "\x1b[1m", // Bright
  dim: "\x1b[2m", // Dim
};

// Custom format for console logging with colors and emojis
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const emoji = getEmojiForLevel(level);
    const color = getColorForLevel(level);
    const metaStr = Object.keys(meta).length
      ? `${JSON.stringify(meta, null, 2)}`
      : "";
    const stackStr = stack ? `\n   📚 Stack: ${stack}` : "";

    return `${color}${emoji} [${timestamp}] ${level.toUpperCase()}${
      colors.reset
    }: ${message}${metaStr}${stackStr}`;
    // }: ${message}${stackStr}`;
  })
);

// JSON format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    }),

    // HTTP requests log file
    new winston.transports.File({
      filename: path.join(logsDir, "requests.log"),
      level: "http",
      format: fileFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    }),

    // Debug log file (only in development)
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.File({
            filename: path.join(logsDir, "debug.log"),
            level: "debug",
            format: fileFormat,
            maxsize: 25 * 1024 * 1024, // 25MB
            maxFiles: 3,
          }),
        ]
      : []),
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: fileFormat,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: fileFormat,
    }),
  ],
});

// Helper functions
function getEmojiForLevel(level: string): string {
  const emojis = {
    error: "🚨",
    warn: "⚠️",
    info: "ℹ️",
    http: "🌐",
    debug: "🐛",
  };
  return emojis[level as keyof typeof emojis] || "📝";
}

function getColorForLevel(level: string): string {
  const levelColors = {
    error: colors.error,
    warn: colors.warn,
    info: colors.info,
    http: colors.info,
    debug: colors.debug,
  };
  return levelColors[level as keyof typeof levelColors] || colors.reset;
}

// Performance monitoring
class PerformanceMonitor {
  private static requests: Map<
    string,
    { start: number; count: number; totalTime: number }
  > = new Map();

  static startTimer(id: string): void {
    const existing = this.requests.get(id) || {
      start: 0,
      count: 0,
      totalTime: 0,
    };
    existing.start = Date.now();
    this.requests.set(id, existing);
  }

  static endTimer(id: string): number {
    const data = this.requests.get(id);
    if (!data) return 0;

    const duration = Date.now() - data.start;
    data.count++;
    data.totalTime += duration;
    this.requests.set(id, data);
    return duration;
  }

  static getStats(id: string) {
    const data = this.requests.get(id);
    if (!data) return null;

    return {
      count: data.count,
      totalTime: data.totalTime,
      averageTime: data.totalTime / data.count,
    };
  }

  static getAllStats() {
    const stats: any = {};
    this.requests.forEach((data, id) => {
      stats[id] = {
        count: data.count,
        totalTime: data.totalTime,
        averageTime: Math.round(data.totalTime / data.count),
      };
    });
    return stats;
  }
}

// Enhanced Logger class with advanced features
export class RobustLogger {
  private static instance: RobustLogger;
  private winston = logger;
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private performanceMonitor = PerformanceMonitor;

  private constructor() {
    // this.setupPeriodicReports();
    this.logSystemInfo();
  }

  static getInstance(): RobustLogger {
    if (!RobustLogger.instance) {
      RobustLogger.instance = new RobustLogger();
    }
    return RobustLogger.instance;
  }

  // Core logging methods
  error(message: string, meta?: any): void {
    this.errorCount++;
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  http(message: string, meta?: any): void {
    this.winston.http(message, meta);
  }

  // Specialized logging methods
  logRequest(req: Request, res: Response, duration?: number): void {
    this.requestCount++;
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers["user-agent"] || "Unknown";

    const logData = {
      requestId: this.requestCount,
      method: req.method,
      url: req.originalUrl,
      clientIP,
      userAgent,
      statusCode: res.statusCode,
      duration,
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
      bodySize: req.headers["content-length"]
        ? parseInt(req.headers["content-length"])
        : undefined,
      referer: req.headers.referer,
      timestamp: new Date().toISOString(),
    };

    // Log with different levels based on status code
    if (res.statusCode >= 500) {
      this.error(
        `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`,
        logData
      );
    } else if (res.statusCode >= 400) {
      this.warn(
        `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`,
        logData
      );
    } else {
      this.http(
        `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`,
        logData
      );
    }

    // Track performance
    if (duration) {
      this.performanceMonitor.startTimer(
        `route-${req.method}-${req.route?.path || req.originalUrl}`
      );
      setTimeout(() => {
        this.performanceMonitor.endTimer(
          `route-${req.method}-${req.route?.path || req.originalUrl}`
        );
      }, duration);
    }
  }

  logDatabaseOperation(
    operation: string,
    table: string,
    duration?: number,
    error?: Error
  ): void {
    const logData = {
      operation,
      table,
      duration,
      timestamp: new Date().toISOString(),
    };

    if (error) {
      this.error(`Database Error - ${operation} on ${table}`, {
        ...logData,
        error: error.message,
        stack: error.stack,
      });
    } else if (duration && duration > 1000) {
      this.warn(
        `Slow Database Query - ${operation} on ${table} (${duration}ms)`,
        logData
      );
    } else {
      this.debug(`Database Operation - ${operation} on ${table}`, logData);
    }
  }

  logSocketEvent(event: string, socketId: string, data?: any): void {
    this.debug(`Socket Event - ${event}`, {
      event,
      socketId,
      data: data
        ? typeof data === "object"
          ? JSON.stringify(data).substring(0, 200)
          : data
        : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessEvent(event: string, userId?: string, data?: any): void {
    this.info(`Business Event - ${event}`, {
      event,
      userId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  logSecurityEvent(event: string, clientIP: string, details?: any): void {
    this.warn(`Security Event - ${event}`, {
      event,
      clientIP,
      details,
      timestamp: new Date().toISOString(),
      severity: "high",
    });
  }

  logPerformanceAlert(metric: string, value: number, threshold: number): void {
    this.warn(`Performance Alert - ${metric} exceeded threshold`, {
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
    });
  }

  // System monitoring
  private logSystemInfo(): void {
    const systemInfo = {
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      processId: process.pid,
      workingDirectory: process.cwd(),
      environment: process.env.NODE_ENV || "development",
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    // this.info("System Information", systemInfo);
  }

  private setupPeriodicReports(): void {
    // System health report every 5 minutes
    setInterval(() => {
      this.generateHealthReport();
    }, 5 * 60 * 1000);

    // Performance report every 10 minutes
    setInterval(() => {
      this.generatePerformanceReport();
    }, 10 * 60 * 1000);

    // Memory usage alert check every minute
    setInterval(() => {
      this.checkMemoryUsage();
    }, 60 * 1000);
  }

  private generateHealthReport(): void {
    const uptime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();

    const healthReport = {
      uptime: Math.round(uptime / 1000),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate:
        this.requestCount > 0
          ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + "%"
          : "0%",
      memoryUsage: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
        rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      },
      timestamp: new Date().toISOString(),
    };

    this.info("System Health Report", healthReport);
  }

  private generatePerformanceReport(): void {
    const performanceStats = this.performanceMonitor.getAllStats();

    if (Object.keys(performanceStats).length > 0) {
      this.info("Performance Report", {
        routes: performanceStats,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);

    // Alert if memory usage is high
    if (heapUsedMB > 500) {
      this.logPerformanceAlert("heap_memory", heapUsedMB, 500);
    }

    if (rssUsedMB > 1000) {
      this.logPerformanceAlert("rss_memory", rssUsedMB, 1000);
    }
  }

  getClientIP(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  // Debug helpers
  logRequestBody(req: Request, maxLength: number = 1000): void {
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = this.sanitizeData(req.body);
      const bodyStr = JSON.stringify(sanitizedBody);
      const truncatedBody =
        bodyStr.length > maxLength
          ? bodyStr.substring(0, maxLength) + "..."
          : bodyStr;

      this.debug("Request Body", {
        url: req.originalUrl,
        body: truncatedBody,
        originalSize: bodyStr.length,
      });
    }
  }

  logResponseBody(res: Response, body: any, maxLength: number = 1000): void {
    if (body) {
      const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
      const truncatedBody =
        bodyStr.length > maxLength
          ? bodyStr.substring(0, maxLength) + "..."
          : bodyStr;

      this.debug("Response Body", {
        statusCode: res.statusCode,
        body: truncatedBody,
        originalSize: bodyStr.length,
      });
    }
  }

  private sanitizeData(data: any): any {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credential",
    ];

    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  // Utility methods
  startTimer(): number {
    return Date.now();
  }

  endTimer(startTime: number): number {
    return Date.now() - startTime;
  }

  logExecutionTime<T>(fn: () => T, name: string): T {
    const start = this.startTimer();
    try {
      const result = fn();
      const duration = this.endTimer(start);
      this.debug(`Execution Time - ${name}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = this.endTimer(start);
      this.error(`Execution Error - ${name} (${duration}ms)`, { error });
      throw error;
    }
  }

  async logAsyncExecutionTime<T>(
    fn: () => Promise<T>,
    name: string
  ): Promise<T> {
    const start = this.startTimer();
    try {
      const result = await fn();
      const duration = this.endTimer(start);
      this.debug(`Async Execution Time - ${name}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = this.endTimer(start);
      this.error(`Async Execution Error - ${name} (${duration}ms)`, { error });
      throw error;
    }
  }

  getLogLevel(): string {
    return this.winston.level;
  }

  setLogLevel(level: string): void {
    this.winston.level = level;
  }
}

// Export singleton instance
export const robustLogger = RobustLogger.getInstance();
