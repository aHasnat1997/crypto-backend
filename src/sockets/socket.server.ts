import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export class SocketServer {
  public io: SocketIOServer | null = null;

  init(server: HTTPServer) {
    this.io = new SocketIOServer(server, { cors: { origin: '*' } });
    this.io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);
      // Add your socket event handlers here
    });
  }
}
