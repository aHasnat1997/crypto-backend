import { Rocket } from "./app";
import config from "./config";

/**
 * The launchpad function initializes and launches the Rocket server.
 * 
 * - Retrieves the port from the configuration
 * - Creates a new Rocket instance
 * - Loads middleware
 * - Initiates routes and error handlers
 * - Launches the server
 * 
 * @function
 */
(function launchpad() {
  const port = config.PORT as string;
  const rocket = new Rocket();
  try {
    rocket.load();
    rocket.initiate();
    rocket.launch(port);
  } catch (error) {
    console.error(error);
  }
})();
