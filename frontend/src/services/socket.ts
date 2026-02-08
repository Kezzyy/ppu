import { io, Socket } from 'socket.io-client';

// Use empty string to connect to same origin (works in production)
// Socket.IO will automatically use window.location.origin
const SOCKET_URL = '';

let socket: Socket | null = null;

export const initSocket = () => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected to backend');
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from backend');
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};
