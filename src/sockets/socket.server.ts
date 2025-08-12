import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { robustLogger } from "../utils/robustLogger";

export class SocketServer {
  public io: SocketIOServer | null = null;

  /**
   * Initialize the Socket.IO server with HTTP server
   * @param server - HTTP server instance
   */
  init(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Optional: Configure other Socket.IO options
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    robustLogger.info("Socket.IO server initialized successfully");
  }

  /**
   * Setup all socket event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      robustLogger.info("Socket connected:", socket.id);

      // Handle authentication
      this.handleAuthentication(socket);

      // Handle messaging
      this.handleMessaging(socket);

      // Handle room management
      this.handleRooms(socket);

      // Handle crypto data subscription
      this.handleCryptoSubscription(socket);

      // Handle disconnection
      socket.on("disconnect", (reason: string) => {
        robustLogger.info(
          `Socket disconnected: ${socket.id}, reason: ${reason}`
        );
        this.handleDisconnection(socket, reason);
      });

      // Handle errors
      socket.on("error", (error: Error) => {
        robustLogger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   *  Add a new method for crypto subscription handling
   */
  private handleCryptoSubscription(socket: Socket) {
    // Join crypto updates room
    socket.on("subscribe_crypto_updates", () => {
      if (!socket.data.authenticated) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      socket.join("crypto_updates");
      socket.emit("subscribed_crypto_updates", {
        message: "Successfully subscribed to crypto updates",
      });

      robustLogger.info(`Socket ${socket.id} subscribed to crypto updates`);
    });

    // Leave crypto updates room
    socket.on("unsubscribe_crypto_updates", () => {
      socket.leave("crypto_updates");
      socket.emit("unsubscribed_crypto_updates", {
        message: "Successfully unsubscribed from crypto updates",
      });

      robustLogger.info(`Socket ${socket.id} unsubscribed from crypto updates`);
    });
  }

  /**
   * Handle user authentication
   */
  private handleAuthentication(socket: Socket) {
    socket.on("auth", (data: { token?: string; userId?: string }) => {
      try {
        // Add your authentication logic here
        // For example: verify JWT token, check database, etc.

        if (data.token && data.userId) {
          // Mock authentication - replace with your logic
          socket.data.authenticated = true;
          socket.data.userId = data.userId;

          // Join user to their personal room
          socket.join(`user_${data.userId}`);

          socket.emit("auth_success", {
            message: "Authentication successful",
            userId: data.userId,
          });

          robustLogger.info(`User ${data.userId} authenticated successfully`);
        } else {
          socket.emit("auth_error", { message: "Invalid credentials" });
        }
      } catch (error) {
        robustLogger.error("Authentication error:", error);
        socket.emit("auth_error", { message: "Authentication failed" });
      }
    });
  }

  /**
   * Handle messaging events
   */
  private handleMessaging(socket: Socket) {
    // Handle sending messages
    socket.on(
      "send_message",
      (data: {
        message: string;
        room?: string;
        to?: string;
        type?: string;
      }) => {
        if (!socket.data.authenticated) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        const messageData = {
          from: socket.data.userId,
          message: data.message,
          type: data.type || "text",
          timestamp: new Date().toISOString(),
          id: socket.id,
        };

        if (data.room) {
          // Send to specific room
          socket.to(data.room).emit("receive_message", {
            ...messageData,
            room: data.room,
          });
        } else if (data.to) {
          // Send private message
          socket.to(`user_${data.to}`).emit("receive_message", {
            ...messageData,
            private: true,
          });
        } else {
          // Broadcast to all
          socket.broadcast.emit("receive_message", messageData);
        }

        // Acknowledge message sent
        socket.emit("message_sent", { success: true, messageId: socket.id });
      }
    );

    // Handle typing indicators
    socket.on("typing_start", (data: { room?: string }) => {
      if (!socket.data.authenticated) return;

      const typingData = {
        userId: socket.data.userId,
        typing: true,
      };

      if (data.room) {
        socket.to(data.room).emit("user_typing", typingData);
      } else {
        socket.broadcast.emit("user_typing", typingData);
      }
    });

    socket.on("typing_stop", (data: { room?: string }) => {
      if (!socket.data.authenticated) return;

      const typingData = {
        userId: socket.data.userId,
        typing: false,
      };

      if (data.room) {
        socket.to(data.room).emit("user_typing", typingData);
      } else {
        socket.broadcast.emit("user_typing", typingData);
      }
    });
  }

  /**
   * Handle room management
   */
  private handleRooms(socket: Socket) {
    // Join room
    socket.on("join_room", (data: { room: string }) => {
      if (!socket.data.authenticated) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      socket.join(data.room);
      socket.emit("joined_room", { room: data.room });

      // Notify others in the room
      socket.to(data.room).emit("user_joined", {
        userId: socket.data.userId,
        room: data.room,
      });

      robustLogger.info(`User ${socket.data.userId} joined room ${data.room}`);
    });

    // Leave room
    socket.on("leave_room", (data: { room: string }) => {
      socket.leave(data.room);
      socket.emit("left_room", { room: data.room });

      // Notify others in the room
      socket.to(data.room).emit("user_left", {
        userId: socket.data.userId,
        room: data.room,
      });

      robustLogger.info(`User ${socket.data.userId} left room ${data.room}`);
    });

    // Get room info
    socket.on("get_room_info", async (data: { room: string }) => {
      if (!this.io) return;

      try {
        const sockets = await this.io.in(data.room).fetchSockets();
        const users = sockets
          .filter((s) => s.data.authenticated)
          .map((s) => ({
            userId: s.data.userId,
            socketId: s.id,
          }));

        socket.emit("room_info", {
          room: data.room,
          userCount: users.length,
          users: users,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to get room info" });
      }
    });
  }

  /**
   * Handle disconnection cleanup
   */
  private handleDisconnection(socket: Socket, reason: string) {
    if (socket.data.authenticated && socket.data.userId) {
      // Notify all rooms and users that this user went offline
      socket.broadcast.emit("user_offline", {
        userId: socket.data.userId,
        reason: reason,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Send message to specific room
   */
  sendToRoom(room: string, event: string, data: any) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * Send message to multiple users
   */
  sendToUsers(userIds: string[], event: string, data: any) {
    if (this.io) {
      userIds.forEach((userId) => {
        this.io!.to(`user_${userId}`).emit(event, data);
      });
    }
  }

  /**
   * Get total connected clients count
   */
  getConnectedClientsCount(): number {
    return this.io?.sockets.sockets.size || 0;
  }

  /**
   * Get authenticated users count
   */
  getAuthenticatedUsersCount(): number {
    if (!this.io) return 0;

    let count = 0;
    this.io.sockets.sockets.forEach((socket) => {
      if (socket.data.authenticated) count++;
    });
    return count;
  }

  /**
   * Get clients in a specific room
   */
  async getClientsInRoom(room: string): Promise<string[]> {
    if (!this.io) return [];

    try {
      const sockets = await this.io.in(room).fetchSockets();
      return sockets.map((socket) => socket.id);
    } catch (error) {
      robustLogger.error("Error getting clients in room:", error);
      return [];
    }
  }

  /**
   * Get users in a specific room
   */
  async getUsersInRoom(
    room: string
  ): Promise<Array<{ userId: string; socketId: string }>> {
    if (!this.io) return [];

    try {
      const sockets = await this.io.in(room).fetchSockets();
      return sockets
        .filter((socket) => socket.data.authenticated)
        .map((socket) => ({
          userId: socket.data.userId,
          socketId: socket.id,
        }));
    } catch (error) {
      robustLogger.error("Error getting users in room:", error);
      return [];
    }
  }

  /**
   * Disconnect a specific user
   */
  disconnectUser(userId: string, reason?: string) {
    if (!this.io) return;

    this.io.sockets.sockets.forEach((socket) => {
      if (socket.data.userId === userId) {
        socket.disconnect(true);
        robustLogger.info(
          `User ${userId} disconnected: ${reason || "Admin action"}`
        );
      }
    });
  }

  /**
   * Check if Socket.IO server is initialized
   */
  isInitialized(): boolean {
    return this.io !== null;
  }
}
