import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    connect(): void {
        if (this.isSocketAlive()) this.disconnect();
        this.socket = io(environment.socketUrl, { transports: ['websocket'], upgrade: false });
    }

    disconnect(): void {
        this.socket.disconnect();
    }

    on<T>(event: string, action: (data: T) => void): void {
        if (this.socket) {
            this.socket.on(event, action);
        }
    }

    send<T>(event: string, data?: T, callback?: (...args: unknown[]) => void): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }

    emit<T, R>(event: string, data?: T, callback?: (response: R) => void): void {
        if (callback) {
            this.socket.emit(event, data, callback);
        } else {
            this.socket.emit(event, data);
        }
    }
}
