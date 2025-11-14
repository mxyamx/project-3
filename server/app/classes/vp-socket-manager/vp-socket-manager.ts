import { JoinGameAck } from '@common/current-game';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

export const environment = {
    production: false,
    serverUrl: 'http://localhost:3000/api',
    socketUrl: 'ws://localhost:3000',
};

export class VpSocketManager {
    clientSocket: ClientSocket;

    connect(): Promise<void> {
        this.clientSocket = ClientIO('ws://localhost:3000', {
            transports: ['websocket'],
            upgrade: false,
            query: { isVirtual: 'true' },
        });
        return new Promise((resolve) => {
            this.clientSocket.once('connect', () => {
                resolve();
            });
        });
    }

    emit(event: string, data?: unknown, callback?: (response: unknown) => void) {
        if (this.clientSocket && this.clientSocket.connected) {
            this.clientSocket.emit(event, data, callback);
        }
    }

    joinRoom(roomId: string): void {
        if (this.clientSocket && this.clientSocket.connected) {
            this.clientSocket.emit('join-room', roomId, (response: JoinGameAck) => {});
        }
    }
}
