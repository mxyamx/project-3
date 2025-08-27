import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

export const environment = {
    production: false,
    serverUrl: 'http://localhost:3000/api',
    socketUrl: 'ws://localhost:3000',
};

export class VpSocketManager {
    clientSocket: ClientSocket;

    constructor() {
        this.connect();
    }

    connect() {
        this.clientSocket = ClientIO('ws://localhost:3000', { transports: ['websocket'], upgrade: false });
    }

    emit(event: string, data?: unknown, callback?: (response: unknown) => void) {
        if (this.clientSocket && this.clientSocket.connected) {
            this.clientSocket.emit(event, data, callback);
        }
    }

    joinRoom(roomId: string): void {
        if (this.clientSocket && this.clientSocket.connected) {
            this.clientSocket.emit('join-room', roomId);
        }
    }
}
