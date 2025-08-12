import { Server } from "http";
import { Rocket } from "./app";
import { robustLogger } from "./utils/robustLogger";

let server: Server;
let rocket: Rocket;
let isShuttingDown = false;

/**
 * Process monitoring and diagnostics
 */
class ProcessMonitor {
  private static startTime = Date.now();
  private static lastCpuUsage = process.cpuUsage();

  static logStartupDiagnostics(): void {
    // const diagnostics = {
    //   system: {
    //     nodeVersion: process.version,
    //     platform: `${process.platform} ${process.arch}`,
    //     processId: process.pid,
    //     parentProcessId: process.ppid,
    //     workingDirectory: process.cwd(),
    //     execPath: process.execPath,
    //     argv: process.argv,
    //     environment: process.env.NODE_ENV || "development",
    //     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    //   },
    //   memory: process.memoryUsage(),
    //   versions: process.versions,
    //   features: {
    //     inspector: typeof process.debugPort === "number",
    //     asyncHooks: typeof process.emitWarning === "function",
    //   },
    //   limits: {
    //     maxHeapSize: require("v8").getHeapStatistics().heap_size_limit,
    //     maxOldSpaceSize: require("v8").getHeapStatistics().malloced_memory,
    //   },
    //   timestamp: new Date().toISOString(),
    // };
    // robustLogger.info("🔍 System Diagnostics", diagnostics);
  }

  static getCpuUsage(): { user: number; system: number } {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    return {
      user: Math.round(currentUsage.user / 1000), // Convert to milliseconds
      system: Math.round(currentUsage.system / 1000),
    };
  }

  static getDetailedMemoryUsage() {
    const memUsage = process.memoryUsage();
    const v8HeapStats = require("v8").getHeapStatistics();

    return {
      process: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
        external: Math.round(memUsage.external / 1024 / 1024) + "MB",
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) + "MB",
      },
      v8Heap: {
        totalHeapSize:
          Math.round(v8HeapStats.total_heap_size / 1024 / 1024) + "MB",
        usedHeapSize:
          Math.round(v8HeapStats.used_heap_size / 1024 / 1024) + "MB",
        heapSizeLimit:
          Math.round(v8HeapStats.heap_size_limit / 1024 / 1024) + "MB",
        numberOfNativeContexts: v8HeapStats.number_of_native_contexts,
        numberOfDetachedContexts: v8HeapStats.number_of_detached_contexts,
      },
    };
  }

  static getUptime(): { seconds: number; formatted: string } {
    const uptimeSeconds = Math.round(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      seconds: uptimeSeconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`,
    };
  }
}

/**
 * Advanced health monitoring
 */
class HealthMonitor {
  private static healthCheckInterval?: NodeJS.Timeout;
  private static performanceCheckInterval?: NodeJS.Timeout;

  static start(): void {
    // Detailed health check every 2 minutes
    this.healthCheckInterval = setInterval(() => {
      // this.performHealthCheck();
    }, 2 * 60 * 1000);

    // Performance monitoring every 30 seconds
    this.performanceCheckInterval = setInterval(() => {
      this.performPerformanceCheck();
    }, 30 * 1000);

    // robustLogger.info("💚 Health monitoring started");
  }

  static stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }
    robustLogger.info("💚 Health monitoring stopped");
  }

  private static performHealthCheck(): void {
    if (isShuttingDown) return;

    const uptime = ProcessMonitor.getUptime();
    const memory = ProcessMonitor.getDetailedMemoryUsage();
    const cpu = ProcessMonitor.getCpuUsage();

    const healthStatus = {
      status: "HEALTHY",
      uptime: uptime.formatted,
      server: {
        listening: server?.listening || false,
        connections: server ? (server as any)._connections || 0 : 0,
      },
      socketIO: {
        active: !!rocket?.socketServer?.io,
        connections: rocket?.socketServer?.io?.engine?.clientsCount || 0,
      },
      memory: memory,
      cpu: cpu,
      timestamp: new Date().toISOString(),
    };

    // Check for health issues
    const heapUsedMB = parseInt(memory.process.heapUsed);
    const rssUsedMB = parseInt(memory.process.rss);

    if (heapUsedMB > 500 || rssUsedMB > 1000) {
      healthStatus.status = "WARNING";
      robustLogger.warn("⚠️ Health Check - High Memory Usage", healthStatus);
    } else {
      robustLogger.info("💚 Health Check - System Healthy", healthStatus);
    }
  }

  private static performPerformanceCheck(): void {
    if (isShuttingDown) return;

    const eventLoopDelay = this.measureEventLoopDelay();

    if (eventLoopDelay > 100) {
      robustLogger.logPerformanceAlert("event_loop_delay", eventLoopDelay, 100);
    }

    // Check for file descriptor leaks (Unix systems)
    if (process.platform !== "win32") {
      try {
        const fs = require("fs");
        const fdCount = fs.readdirSync("/proc/" + process.pid + "/fd").length;

        if (fdCount > 1000) {
          robustLogger.logPerformanceAlert("file_descriptors", fdCount, 1000);
        }
      } catch (error) {
        // Ignore errors in fd counting
      }
    }
  }

  private static measureEventLoopDelay(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      if (delay > 10) {
        robustLogger.debug("⏱️ Event Loop Delay", {
          delay: `${delay.toFixed(2)}ms`,
        });
      }
    });
    return 0; // Simplified for this example
  }
}

/**
 * The enhanced launchpad function with comprehensive error handling
 */
(function launchpad() {
  // Set up global error tracking
  let startupErrors: Error[] = [];

  try {
    robustLogger.info("🚀 ═══════════ SERVER STARTUP INITIATED ═══════════");

    // Log system diagnostics
    ProcessMonitor.logStartupDiagnostics();

    // Create Rocket instance
    robustLogger.info("🏗️ Creating Rocket instance...");
    rocket = new Rocket();
    const port = rocket.config.PORT;

    // Validate configuration
    if (!port || isNaN(port)) {
      throw new Error(`Invalid port configuration: ${port}`);
    }

    if (!rocket.config.CLIENT_URLS || rocket.config.CLIENT_URLS.length === 0) {
      robustLogger.warn("⚠️ No client URLs configured in config");
    }

    robustLogger.info("✅ Rocket instance created successfully", port);

    // Load middleware with error handling
    robustLogger.info("⚙️ Loading middleware...");
    rocket.load();
    robustLogger.info("✅ Middleware loaded successfully");

    // Initialize routes with error handling
    robustLogger.info("🛣️ Initializing routes...");
    rocket.initiate();
    robustLogger.info("✅ Routes initialized successfully");

    // Launch the server
    robustLogger.info("🚀 Launching HTTP server...");
    server = rocket.launch(port);

    // Start health monitoring
    setTimeout(() => {
      HealthMonitor.start();
    }, 3000); // Start monitoring 3 seconds after launch

    robustLogger.info("✅ Server startup completed successfully");
  } catch (error) {
    const startupError = error as Error;
    startupErrors.push(startupError);

    robustLogger.error("💥 ═══════ STARTUP FAILURE ═══════", {
      phase: "startup",
      error: startupError.message,
      stack: startupError.stack,
      errorCount: startupErrors.length,
      timestamp: new Date().toISOString(),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        workingDir: process.cwd(),
        processId: process.pid,
      },
    });

    // Attempt graceful cleanup
    cleanup(1);
  }
})();

/**
 * Enhanced error handling with detailed logging and recovery attempts
 */
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  const errorDetails = {
    type: "unhandledRejection",
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString(),
    processInfo: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  };

  robustLogger.error("💥 Unhandled Promise Rejection", errorDetails);

  // Don't exit immediately in production, log and continue
  if (process.env.NODE_ENV === "production") {
    robustLogger.warn(
      "⚠️ Continuing execution despite unhandled rejection (production mode)"
    );
  } else {
    robustLogger.error(
      "🔄 Initiating graceful shutdown due to unhandled rejection"
    );
    gracefulShutdown("unhandledRejection");
  }
});

process.on("uncaughtException", (error: Error) => {
  const errorDetails = {
    type: "uncaughtException",
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    processInfo: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };

  robustLogger.error("💥 Uncaught Exception - Critical Error", errorDetails);

  // Always exit on uncaught exceptions
  robustLogger.error("💀 Process will exit due to uncaught exception");
  cleanup(1);
});

// Signal handlers with logging
process.on("SIGTERM", () => {
  robustLogger.info("📶 SIGTERM received - Graceful shutdown initiated");
  gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  robustLogger.info(
    "📶 SIGINT received (Ctrl+C) - Graceful shutdown initiated"
  );
  gracefulShutdown("SIGINT");
});

process.on("SIGUSR1", () => {
  robustLogger.info("📶 SIGUSR1 received - Generating diagnostic report");
  generateDiagnosticReport();
});

process.on("SIGUSR2", () => {
  robustLogger.info("📶 SIGUSR2 received - Toggling debug mode");
  toggleDebugMode();
});

/**
 * Comprehensive graceful shutdown with timeout and fallback
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    robustLogger.warn(
      "⚠️ Shutdown already in progress, ignoring signal:",
      signal
    );
    return;
  }

  isShuttingDown = true;
  const shutdownStart = Date.now();

  robustLogger.info("🔄 ═══════ GRACEFUL SHUTDOWN INITIATED ═══════", {
    signal,
    processId: process.pid,
    uptime: ProcessMonitor.getUptime().formatted,
    memoryUsage: ProcessMonitor.getDetailedMemoryUsage(),
    timestamp: new Date().toISOString(),
  });

  // Stop health monitoring
  HealthMonitor.stop();

  try {
    // Use the Rocket's graceful shutdown method
    if (rocket) {
      await Promise.race([
        rocket.gracefulShutdown(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Shutdown timeout")), 10000)
        ),
      ]);
    }

    const shutdownDuration = Date.now() - shutdownStart;

    robustLogger.info("✅ ═══════ GRACEFUL SHUTDOWN COMPLETED ═══════", {
      signal,
      duration: `${shutdownDuration}ms`,
      finalMemory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });

    cleanup(0);
  } catch (error) {
    const shutdownDuration = Date.now() - shutdownStart;

    robustLogger.error("💥 ═══════ SHUTDOWN ERROR ═══════", {
      signal,
      duration: `${shutdownDuration}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Force shutdown
    cleanup(1);
  }
}

/**
 * Final cleanup and process exit
 */
function cleanup(exitCode: number): void {
  // Force shutdown timer
  const forceShutdownTimer = setTimeout(() => {
    robustLogger.error("💀 FORCE SHUTDOWN - Process did not exit gracefully");
    process.exit(1);
  }, 5000);

  // Log final statistics
  const finalStats = {
    exitCode,
    uptime: ProcessMonitor.getUptime(),
    finalMemory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  if (exitCode === 0) {
    robustLogger.info("👋 Process exiting normally", finalStats);
  } else {
    robustLogger.error("💥 Process exiting with error", finalStats);
  }

  // Clear the force shutdown timer and exit
  clearTimeout(forceShutdownTimer);
  process.exit(exitCode);
}

/**
 * Generate comprehensive diagnostic report
 */
function generateDiagnosticReport(): void {
  const report = {
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: ProcessMonitor.getUptime(),
      memoryUsage: ProcessMonitor.getDetailedMemoryUsage(),
      cpuUsage: ProcessMonitor.getCpuUsage(),
    },
    server: {
      listening: server?.listening || false,
      address: server?.address(),
      connections: server ? (server as any)._connections || 0 : 0,
    },
    socketIO: {
      active: !!rocket?.socketServer?.io,
      connections: rocket?.socketServer?.io?.engine?.clientsCount || 0,
      rooms: rocket?.socketServer?.io
        ? Object.keys(rocket.socketServer.io.sockets.adapter.rooms).length
        : 0,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      logLevel: process.env.LOG_LEVEL,
      timezone:
        process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    system: {
      loadAverage: require("os").loadavg(),
      freeMemory: Math.round(require("os").freemem() / 1024 / 1024) + "MB",
      totalMemory: Math.round(require("os").totalmem() / 1024 / 1024) + "MB",
      cpus: require("os").cpus().length,
    },
  };

  robustLogger.info("📊 ═══════ DIAGNOSTIC REPORT ═══════", report);
}

/**
 * Toggle debug mode at runtime
 */
function toggleDebugMode(): void {
  const currentLevel = robustLogger.getLogLevel();
  const newLevel = currentLevel === "debug" ? "info" : "debug";

  // Update logger level (you might need to adjust this based on your logger setup)
  robustLogger.setLogLevel(newLevel);

  robustLogger.info(
    `🔧 Debug mode ${newLevel === "debug" ? "ENABLED" : "DISABLED"}`,
    {
      previousLevel: currentLevel,
      newLevel: newLevel,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Setup development helpers
 */
function setupDevelopmentHelpers(): void {
  if (process.env.NODE_ENV !== "production") {
    // Log memory leaks detection
    process.on("warning", (warning) => {
      robustLogger.warn("⚠️ Process Warning", {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });
    });

    // Periodic garbage collection logging
    if (global.gc) {
      const beforeGC = process.memoryUsage();
      global.gc();
      const afterGC = process.memoryUsage();
      setInterval(() => {
        robustLogger.debug("🗑️ Garbage Collection", {
          before: beforeGC,
          after: afterGC,
          freed: {
            heapUsed: beforeGC.heapUsed - afterGC.heapUsed,
            heapTotal: beforeGC.heapTotal - afterGC.heapTotal,
          },
        });
      }, 5 * 60 * 1000); // Every 5 minutes
    }

    robustLogger.info("🔧 Development helpers enabled");
  }
}

/**
 * Initialize error tracking and monitoring
 */
function initializeErrorTracking(): void {
  // Track process events
  process.on("exit", (code) => {
    robustLogger.info("🔚 Process exit", {
      code,
      uptime: ProcessMonitor.getUptime(),
      timestamp: new Date().toISOString(),
    });
  });

  process.on("beforeExit", (code) => {
    robustLogger.info("🔚 Before process exit", {
      code,
      timestamp: new Date().toISOString(),
    });
  });

  // Resource monitoring
  process.on("SIGPIPE", () => {
    robustLogger.warn("📶 SIGPIPE received - Broken pipe detected");
  });

  robustLogger.info("✅ Error tracking initialized");
}

// Initialize everything
// robustLogger.info("📋 ═══════ INITIALIZING SERVER SCRIPT ═══════", {
//   scriptPath: __filename,
//   timestamp: new Date().toISOString(),
// });

initializeErrorTracking();
setupDevelopmentHelpers();

// Log script completion
robustLogger.info("✅ Server script initialization completed");
