import { Server } from "http";
import { Rocket } from "./app";

let server: Server;

/**
 * The launchpad function initializes and launches the Rocket server.
 * 
 * - Retrieves the port from the configuration
 * - Creates a new Rocket instance
 * - Loads middleware
 * - Initiates routes and error handlers
 * - Launches the server
 */
(function launchpad() {
  const rocket = new Rocket();
  const port = rocket.config.PORT;
  try {
    rocket.load();
    rocket.initiate();
    server = rocket.launch(port);
  } catch (error) {
    console.error(error);
  }
})();

/**
 * Handles unhandled promise rejections and uncaught exceptions.
 */
process.on('unhandledRejection', (error) => {
  console.log('unhandledRejection is detected. Server is shutting down...', error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

/**
 * Handles uncaught exceptions.
 */
process.on('uncaughtException', (error) => {
  console.log('uncaughtException occurred. Server is shutting down...', error);
  process.exit(1);
});
