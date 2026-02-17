import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('[Socket] Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('[Socket] Client disconnected:', socket.id);
        });

        // Listen for server-specific room joining
        socket.on('join-server', (serverId: string) => {
            console.log(`[Socket] Client ${socket.id} joined server room: ${serverId}`);
            socket.join(`server:${serverId}`);
        });

        socket.on('leave-server', (serverId: string) => {
            console.log(`[Socket] Client ${socket.id} left server room: ${serverId}`);
            socket.leave(`server:${serverId}`);
        });
    });

    console.log('[Socket] Socket.io initialized');
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
